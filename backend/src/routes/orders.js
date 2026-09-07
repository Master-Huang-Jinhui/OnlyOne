const express = require('express');
const db = require('../db');
const { auth, managerAccess } = require('../middleware/auth');

const router = express.Router();

// 生成订单号
function genOrderNo() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${rand}`;
}

// 创建订单（前台公开）
router.post('/', (req, res) => {
  const { items, dining_type = 'takeout', customer_name, customer_phone, customer_address, note, guest_id, table_id, table_session } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: '购物车为空' });
  }

  // 计算金额
  let subtotal = 0;
  const orderItems = [];
  for (const item of items) {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.id);
    if (!product) continue;
    const qty = Math.max(1, parseInt(item.quantity) || 1);
    // 优先用前台传过来的单价（含口味标签加价），没有则用商品原价
    const unitPrice = item.price !== undefined ? parseFloat(item.price) : product.price;
    const itemTotal = unitPrice * qty;
    subtotal += itemTotal;
    orderItems.push({
      id: product.id,
      name: product.name,
      name_en: product.name_en,
      price: unitPrice,
      quantity: qty,
      note: item.note || '',
      subtotal: itemTotal
    });
  }

  if (orderItems.length === 0) return res.status(400).json({ error: '没有有效商品' });

  // 税率
  const taxRate = parseFloat(db.prepare('SELECT value FROM settings WHERE key = ?').get('tax_rate')?.value || '0.08875');
  const tax = Math.round(subtotal * taxRate * 100) / 100;

  // 配送费
  let delivery_fee = 0;
  if (dining_type === 'delivery') {
    const freeMin = parseFloat(db.prepare('SELECT value FROM settings WHERE key = ?').get('free_delivery_min')?.value || '30');
    const fee = parseFloat(db.prepare('SELECT value FROM settings WHERE key = ?').get('delivery_fee')?.value || '3.99');
    delivery_fee = subtotal >= freeMin ? 0 : fee;
  }

  const total = Math.round((subtotal + tax + delivery_fee) * 100) / 100;
  const order_no = genOrderNo();

  // 生成取餐号：每天从001开始递增
  const todayCount = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE date(created_at) = date('now','localtime')").get().cnt;
  const pickup_number = String(todayCount + 1).padStart(3, '0');

  db.prepare(`INSERT INTO orders (order_no, items, subtotal, tax, delivery_fee, total, dining_type, customer_name, customer_phone, customer_address, note, status, guest_id, table_id, table_session, pickup_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`).run(
    order_no, JSON.stringify(orderItems), subtotal, tax, delivery_fee, total, dining_type, customer_name, customer_phone, customer_address, note, guest_id || null, table_id || null, table_session || null, pickup_number
  );

  // 如果是堂吃且有关联餐桌，自动占用
  if (table_id && (dining_type === 'dine_in' || dining_type === 'dinein')) {
    db.prepare('UPDATE tables SET status = ? WHERE id = ?').run('occupied', table_id);
  }

  res.json({ order_no, total, subtotal, tax, delivery_fee, pickup_number });
});

// 订单列表（后台）
router.get('/', auth, managerAccess, (req, res) => {
  const { status, start_date, end_date, sort_by = 'created_at', sort_order = 'desc', limit = 200, offset = 0 } = req.query;
  let sql = 'SELECT * FROM orders WHERE 1=1';
  const params = [];

  // 状态筛选
  if (status) { sql += ' AND status = ?'; params.push(status); }

  // 时间范围筛选（支持日期 YYYY-MM-DD 和日期时间 YYYY-MM-DDTHH:MM）
  if (start_date) {
    const start = start_date.replace('T', ' ');
    sql += ' AND created_at >= ?'; params.push(start.length === 16 ? start + ':00' : start);
  }
  if (end_date) {
    const end = end_date.replace('T', ' ');
    if (end.length === 10) { sql += ' AND created_at <= ?'; params.push(end + ' 23:59:59'); }
    else { sql += ' AND created_at <= ?'; params.push(end.length === 16 ? end + ':00' : end); }
  }

  // 排序（白名单防止注入）
  const allowedSortBy = ['order_no', 'total', 'created_at', 'id'];
  const allowedSortOrder = ['asc', 'desc'];
  const sortBy = allowedSortBy.includes(sort_by) ? sort_by : 'created_at';
  const sortOrder = allowedSortOrder.includes(sort_order) ? sort_order : 'desc';
  sql += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

  sql += ' LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const orders = db.prepare(sql).all(...params);
  orders.forEach(o => o.items = JSON.parse(o.items || '[]'));

  // 同时返回统计信息
  let countSql = 'SELECT COUNT(*) as cnt, COALESCE(SUM(total),0) as revenue FROM orders WHERE 1=1';
  const countParams = [];
  if (status) { countSql += ' AND status = ?'; countParams.push(status); }
  if (start_date) { const start = start_date.replace('T', ' '); countSql += ' AND created_at >= ?'; countParams.push(start.length === 16 ? start + ':00' : start); }
  if (end_date) { const end = end_date.replace('T', ' '); if (end.length === 10) { countSql += ' AND created_at <= ?'; countParams.push(end + ' 23:59:59'); } else { countSql += ' AND created_at <= ?'; countParams.push(end.length === 16 ? end + ':00' : end); } }
  const summary = db.prepare(countSql).get(...countParams);

  res.json({ orders, total: summary.cnt, revenue: summary.revenue });
});

// 订单统计
router.get('/stats', auth, managerAccess, (req, res) => {
  const today = db.prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(total),0) as revenue FROM orders WHERE date(created_at) = date('now','localtime')").get();
  const pending = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE status = 'pending'").get();