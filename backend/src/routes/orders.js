const express = require('express');
const db = require('../db');
const { auth, managerAccess } = require('../middleware/auth');
const { auditLog } = require('../utils/audit');

// ============================================================
// 【功能路线图 - 订单模块】详见 FEATURE_ROADMAP.md
// TODO[P1] KDS厨房显示系统：新建 /kds 页面，订单按商品分类分区域显示，超时预警，点击推进状态
// TODO[P1] 实时库存扣减：下单成功时根据商品配方(recipe)自动扣减goods表库存，库存不足预警
// TODO[P1] CRM客户匹配：下单时按手机号自动匹配/创建customers表记录，累加消费总额和订单数
// TODO[P2] 分账/并桌/转桌：员工端支持AA分账、两桌合并、订单转桌
// TODO[P2] 多种支付方式：订单添加payment_method字段（现金/刷卡/Apple Pay等）
// TODO[P2] 预订/预点：支持顾客指定取餐时间的预订单
// ============================================================

const router = express.Router();

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

  // 订单号每天从001开始，格式：MMDD-NNN（如 0907-001），跨天不重复
  const todayCount = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE date(created_at) = date('now','localtime')").get().cnt;
  const seq = String(todayCount + 1).padStart(3, '0');
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const order_no = `${pad(d.getMonth()+1)}${pad(d.getDate())}-${seq}`;
  const pickup_number = seq;

  // 如果是堂吃且有关联餐桌，自动获取当前会话绑定订单
  let resolvedTableSession = table_session || null;
  if (table_id && !resolvedTableSession) {
    const table = db.prepare('SELECT current_session FROM tables WHERE id = ?').get(table_id);
    if (table) resolvedTableSession = table.current_session;
  }

  db.prepare(`INSERT INTO orders (order_no, items, subtotal, tax, delivery_fee, total, dining_type, customer_name, customer_phone, customer_address, note, status, guest_id, table_id, table_session, pickup_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`).run(
    order_no, JSON.stringify(orderItems), subtotal, tax, delivery_fee, total, dining_type, customer_name, customer_phone, customer_address, note, guest_id || null, table_id || null, resolvedTableSession, pickup_number
  );

  // 如果是堂吃且有关联餐桌，自动占用
  if (table_id && (dining_type === 'dine_in' || dining_type === 'dinein')) {
    db.prepare('UPDATE tables SET status = ? WHERE id = ?').run('occupied', table_id);
  }

  // 自动扣减库存（根据商品配料）
  try {
    const getIngredients = db.prepare('SELECT * FROM product_ingredients WHERE product_id = ?');
    const updateStock = db.prepare('UPDATE goods SET current_stock = current_stock - ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?');
    const insertTx = db.prepare('INSERT INTO inventory_transactions (goods_id, goods_name, type, quantity, unit, reference_type, reference_id, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

    for (const item of orderItems) {
      const ingredients = getIngredients.all(item.id);
      for (const ing of ingredients) {
        const deductQty = ing.quantity * item.quantity;
        updateStock.run(deductQty, ing.goods_id);
        insertTx.run(ing.goods_id, ing.goods_name, 'out', deductQty, ing.unit, 'order', null, `订单${order_no}-${item.name}`);
      }
    }
  } catch (e) {
    console.error('[库存扣减] 失败:', e.message);
  }

  res.json({ order_no, total, subtotal, tax, delivery_fee, pickup_number });
});

// 订单列表（后台）
router.post('/list', auth, managerAccess, (req, res) => {
  const { status, start_date, end_date, sort_by = 'created_at', sort_order = 'desc', page = 1, page_size = 20, keyword } = req.query;
  const limit = Math.min(Math.max(parseInt(page_size) || 20, 1), 100);
  const offset = (Math.max(1, parseInt(page) || 1) - 1) * limit;
  let sql = 'SELECT * FROM orders WHERE 1=1';
  const params = [];

  if (status) { sql += ' AND status = ?'; params.push(status); }

  if (keyword && keyword.trim()) {
    const kw = '%' + keyword.trim() + '%';
    sql += ' AND (order_no LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)';
    params.push(kw, kw, kw);
  }

  if (start_date && end_date) {
    sql += ' AND date(created_at) BETWEEN ? AND ?';
    params.push(start_date, end_date);
  } else if (start_date) {
    sql += ' AND date(created_at) >= ?';
    params.push(start_date);
  } else if (end_date) {
    sql += ' AND date(created_at) <= ?';
    params.push(end_date);
  }

  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as cnt');
  const total = db.prepare(countSql).get(...params).cnt;

  sql += ` ORDER BY ${sort_by} ${sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'} LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const orders = db.prepare(sql).all(...params);
  orders.forEach(o => {
    try { o.items = JSON.parse(o.items || '[]'); } catch (e) { o.items = []; }
  });

  // 统计（基于全量筛选结果）
  const statsSql = sql.replace(/ORDER BY.*LIMIT.*OFFSET.*/, '');
  const statsParams = params.slice(0, -2);
  const stats = db.prepare(`SELECT COUNT(*) as total_orders, COALESCE(SUM(total),0) as total_revenue, COALESCE(SUM(subtotal),0) as total_subtotal, COALESCE(SUM(tax),0) as total_tax FROM (${statsSql})`).get(...statsParams);

  res.json({ orders, total, page: parseInt(page), page_size: limit, stats });
});

// 订单详情（后台）
router.post('/detail/:orderNo', auth, managerAccess, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE order_no = ?').get(req.params.orderNo);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  try { order.items = JSON.parse(order.items || '[]'); } catch (e) { order.items = []; }
  res.json(order);
});

// 订单详情（前台公开，按订单号查询）
router.post('/public/:orderNo', (req, res) => {
  const order = db.prepare('SELECT id, order_no, items, subtotal, tax, delivery_fee, total, dining_type, customer_name, status, created_at, pickup_number, table_id, table_session, payment_method, paid_at FROM orders WHERE order_no = ?').get(req.params.orderNo);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  try { order.items = JSON.parse(order.items || '[]'); } catch (e) { order.items = []; }
  res.json(order);
});

// 更新订单状态（后台）
router.post('/:id/status', auth, managerAccess, (req, res) => {
  const { status } = req.body;
  const allowed = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ error: '无效状态' });
  const order = db.prepare('SELECT id, status FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  
  const timeField = status === 'preparing' ? 'start_time' : status === 'ready' ? 'ready_time' : status === 'completed' ? 'complete_time' : null;
  if (timeField) {
    db.prepare(`UPDATE orders SET status = ?, ${timeField} = COALESCE(${timeField}, datetime('now','localtime')) WHERE id = ?`).run(status, req.params.id);
  } else {
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  }
  auditLog(req.user?.id, 'order_status', `订单${order.order_no}状态改为${status}`);
  res.json({ success: true });
});

// 仪表盘统计
router.post('/dashboard/stats', auth, managerAccess, (req, res) => {
  const today = db.prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(total),0) as revenue FROM orders WHERE date(created_at) = date('now','localtime')").get();
  const pending = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE status = 'pending'").get();
  const preparing = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE status = 'preparing'").get();
  const week = db.prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(total),0) as revenue FROM orders WHERE date(created_at) >= date('now','localtime','-6 days')").get();
  res.json({ today: { count: today.cnt, revenue: today.revenue }, pending: pending.cnt, preparing: preparing.cnt, week: { count: week.cnt, revenue: week.revenue } });
});

// 待处理订单（仪表盘）
router.post('/pending/list', auth, managerAccess, (req, res) => {
  const { status, page = 1, page_size = 10 } = req.body || {};
  const limit = Math.min(Math.max(parseInt(page_size) || 10, 1), 50);
  const offset = (Math.max(1, parseInt(page) || 1) - 1) * limit;
  let sql = "SELECT * FROM orders WHERE status IN ('pending','preparing','ready') AND date(created_at) = date('now','localtime')";
  const params = [];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  const orders = db.prepare(sql).all(...params);
  orders.forEach(o => { try { o.items = JSON.parse(o.items || '[]'); } catch (e) { o.items = []; } });
  const countSql = sql.replace(/ORDER BY.*LIMIT.*OFFSET.*/, '').replace('SELECT *', 'SELECT COUNT(*) as cnt');
  const total = db.prepare(countSql).get(...params.slice(0, -2)).cnt;
  res.json({ orders, total, page: parseInt(page), page_size: limit });
});

// 员工端：餐桌订单列表
router.post('/table/:tableId/orders', auth, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders WHERE table_id = ? ORDER BY created_at ASC').all(req.params.tableId);
  orders.forEach(o => { try { o.items = JSON.parse(o.items || '[]'); } catch (e) { o.items = []; } });
  const activeOrders = orders.filter(o => o.status !== 'cancelled' && o.status !== 'completed');
  const total = activeOrders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
  res.json({ orders, total, active_count: activeOrders.length });
});

// 员工端：更新订单状态
router.post('/employee/:id/status', auth, (req, res) => {
  const { status } = req.body;
  const allowed = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ error: '无效状态' });
  const timeField = status === 'preparing' ? 'start_time' : status === 'ready' ? 'ready_time' : status === 'completed' ? 'complete_time' : null;
  let result;
  if (timeField) {
    result = db.prepare(`UPDATE orders SET status = ?, ${timeField} = COALESCE(${timeField}, datetime('now','localtime')) WHERE id = ?`).run(status, req.params.id);
  } else {
    result = db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  }
  if (result.changes === 0) return res.status(404).json({ error: '订单不存在' });
  res.json({ success: true });
});

// 员工端：向已有订单追加商品（加单）
router.post('/employee/:id/append', auth, (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: '追加商品为空' });
  }
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  if (order.status === 'cancelled' || order.status === 'completed') {
    return res.status(400).json({ error: '该订单已结束，无法追加' });
  }

  const existingItems = JSON.parse(order.items || '[]');
  let appendSubtotal = 0;
  const newItems = [];
  for (const item of items) {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.id);
    if (!product) continue;
    const qty = Math.max(1, parseInt(item.quantity) || 1);
    const unitPrice = item.price !== undefined ? parseFloat(item.price) : product.price;
    const itemTotal = unitPrice * qty;
    appendSubtotal += itemTotal;
    // 尝试合并到已有商品（同商品同口味）
    const existing = existingItems.find(i => i.id === product.id && (i.note || '') === (item.note || ''));
    if (existing) {
      existing.quantity += qty;
      existing.subtotal = existing.price * existing.quantity;
    } else {
      newItems.push({
        id: product.id, name: product.name, name_en: product.name_en,
        price: unitPrice, quantity: qty, note: item.note || '', subtotal: itemTotal
      });
    }
  }
  const allItems = [...existingItems, ...newItems];
  const subtotal = allItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const taxRate = parseFloat(db.prepare('SELECT value FROM settings WHERE key = ?').get('tax_rate')?.value || '0.08875');
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const delivery_fee = parseFloat(order.delivery_fee || 0);
  const total = Math.round((subtotal + tax + delivery_fee) * 100) / 100;

  db.prepare('UPDATE orders SET items = ?, subtotal = ?, tax = ?, total = ? WHERE id = ?').run(
    JSON.stringify(allItems), subtotal, tax, total, req.params.id
  );
  res.json({ success: true, order_no: order.order_no, total, append_total: appendSubtotal });
});

// 结账（更新状态为已完成，记录付款方式）
router.post('/checkout/:id', auth, (req, res) => {
  const { payment_method = 'cash', note = '' } = req.body;
  const validMethods = ['cash', 'card', 'apple_pay', 'platform', 'other'];
  if (!validMethods.includes(payment_method)) {
    return res.status(400).json({ error: '无效付款方式' });
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  if (order.status === 'cancelled') return res.status(400).json({ error: '已取消订单无法结账' });
  if (order.status === 'completed') return res.status(400).json({ error: '订单已结账' });

  db.prepare(`UPDATE orders SET status = 'completed', payment_method = ?, paid_at = datetime('now','localtime'), complete_time = COALESCE(complete_time, datetime('now','localtime')) WHERE id = ?`).run(payment_method, order.id);

  // 如果是堂吃订单，结账后自动清桌
  if (order.table_id && (order.dining_type === 'dine_in' || order.dining_type === 'dinein')) {
    db.prepare("UPDATE tables SET status = 'available', current_session = NULL WHERE id = ?").run(order.table_id);
  }

  auditLog(req.user?.id, 'checkout', `订单${order.order_no}结账，付款方式：${payment_method}，金额：$${order.total}`);
  res.json({ success: true, order_no: order.order_no, total: order.total, payment_method });
});

// 打开钱箱（返回ESC/POS指令，前端通过打印触发）
router.post('/cash-drawer/open', auth, (req, res) => {
  // ESC/POS 钱箱打开指令：ESC p m t1 t2
  // 27 112 0 50 250 (脉冲50ms*2=100ms)
  const pulse = Buffer.from([27, 112, 0, 50, 250]);
  res.json({ 
    success: true, 
    command: pulse.toString('base64'),
    message: '钱箱指令已生成，请通过打印机打印触发'
  });
});

// 付款统计（按付款方式汇总）
router.post('/payment-stats', auth, managerAccess, (req, res) => {
  const { start_date, end_date } = req.body || {};
  let dateFilter = "date(created_at) = date('now','localtime')";
  const params = [];
  
  if (start_date && end_date) {
    dateFilter = 'date(created_at) BETWEEN ? AND ?';
    params.push(start_date, end_date);
  } else if (start_date) {
    dateFilter = 'date(created_at) >= ?';
    params.push(start_date);
  }

  const methods = ['cash', 'card', 'apple_pay', 'platform', 'other'];
  const result = {};
  let totalAmount = 0;
  let totalCount = 0;

  for (const method of methods) {
    const row = db.prepare(`SELECT COUNT(*) as cnt, COALESCE(SUM(total),0) as amount FROM orders WHERE status = 'completed' AND payment_method = ? AND ${dateFilter}`).get(method, ...params);
    result[method] = { count: row.cnt, amount: row.amount };
    totalAmount += row.amount;
    totalCount += row.cnt;
  }

  // 未指定付款方式的已完成订单
  const unpaid = db.prepare(`SELECT COUNT(*) as cnt, COALESCE(SUM(total),0) as amount FROM orders WHERE status = 'completed' AND payment_method IS NULL AND ${dateFilter}`).get(...params);
  result['unpaid'] = { count: unpaid.cnt, amount: unpaid.amount };
  totalAmount += unpaid.amount;
  totalCount += unpaid.cnt;

  res.json({ 
    methods: result, 
    total: { count: totalCount, amount: totalAmount } 
  });
});

module.exports = router;