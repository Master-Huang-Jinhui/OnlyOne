const express = require('express');
const db = require('../db');
const { auth, managerAccess } = require('../middleware/auth');

const router = express.Router();

router.post('/', (req, res) => {
  const { items, dining_type = 'takeout', customer_name, customer_phone, customer_address, note, guest_id, table_id, table_session } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: '购物车为空' });
  let subtotal = 0;
  const orderItems = [];
  for (const item of items) {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.id);
    if (!product) continue;
    const qty = Math.max(1, parseInt(item.quantity) || 1);
    const unitPrice = item.price !== undefined ? parseFloat(item.price) : product.price;
    const itemTotal = unitPrice * qty;
    subtotal += itemTotal;
    orderItems.push({ id: product.id, name: product.name, name_en: product.name_en, price: unitPrice, quantity: qty, note: item.note || '', subtotal: itemTotal });
  }
  if (orderItems.length === 0) return res.status(400).json({ error: '没有有效商品' });
  const taxRate = parseFloat(db.prepare('SELECT value FROM settings WHERE key = ?').get('tax_rate')?.value || '0.08875');
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  let delivery_fee = 0;
  if (dining_type === 'delivery') {
    const freeMin = parseFloat(db.prepare('SELECT value FROM settings WHERE key = ?').get('free_delivery_min')?.value || '30');
    const fee = parseFloat(db.prepare('SELECT value FROM settings WHERE key = ?').get('delivery_fee')?.value || '3.99');
    delivery_fee = subtotal >= freeMin ? 0 : fee;
  }
  const total = Math.round((subtotal + tax + delivery_fee) * 100) / 100;
  const todayCount = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE date(created_at) = date('now','localtime')").get().cnt;
  const seq = String(todayCount + 1).padStart(3, '0');
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const order_no = `${pad(d.getMonth()+1)}${pad(d.getDate())}-${seq}`;
  const pickup_number = seq;
  db.prepare(`INSERT INTO orders (order_no, items, subtotal, tax, delivery_fee, total, dining_type, customer_name, customer_phone, customer_address, note, status, guest_id, table_id, table_session, pickup_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`).run(order_no, JSON.stringify(orderItems), subtotal, tax, delivery_fee, total, dining_type, customer_name, customer_phone, customer_address, note, guest_id || null, table_id || null, table_session || null, pickup_number);
  if (table_id && (dining_type === 'dine_in' || dining_type === 'dinein')) db.prepare('UPDATE tables SET status = ? WHERE id = ?').run('occupied', table_id);
  res.json({ order_no, total, subtotal, tax, delivery_fee, pickup_number });
});

router.get('/', auth, managerAccess, (req, res) => {
  const { status, start_date, end_date, sort_by = 'created_at', sort_order = 'desc', page = 1, page_size = 20, keyword } = req.query;
  const limit = Math.min(Math.max(parseInt(page_size) || 20, 1), 100);
  const offset = (Math.max(1, parseInt(page) || 1) - 1) * limit;
  let sql = 'SELECT * FROM orders WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (keyword && keyword.trim()) { const kw = '%' + keyword.trim() + '%'; sql += ' AND (order_no LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)'; params.push(kw, kw, kw); }
  if (start_date) { const start = start_date.replace('T', ' '); sql += ' AND created_at >= ?'; params.push(start.length === 16 ? start + ':00' : start); }
  if (end_date) { const end = end_date.replace('T', ' '); if (end.length === 10) { sql += ' AND created_at <= ?'; params.push(end + ' 23:59:59'); } else { sql += ' AND created_at <= ?'; params.push(end.length === 16 ? end + ':00' : end); } }
  const allowedSortBy = ['order_no', 'total', 'created_at', 'id'];
  const allowedSortOrder = ['asc', 'desc'];
  const sortBy = allowedSortBy.includes(sort_by) ? sort_by : 'created_at';
  const sortOrder = allowedSortOrder.includes(sort_order) ? sort_order : 'desc';
  sql += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
  sql += ' LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  const orders = db.prepare(sql).all(...params);
  orders.forEach(o => o.items = JSON.parse(o.items || '[]'));
  let countSql = 'SELECT COUNT(*) as cnt, COALESCE(SUM(total),0) as revenue FROM orders WHERE 1=1';
  const countParams = [];
  if (status) { countSql += ' AND status = ?'; countParams.push(status); }
  if (keyword && keyword.trim()) { const kw = '%' + keyword.trim() + '%'; countSql += ' AND (order_no LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)'; countParams.push(kw, kw, kw); }
  if (start_date) { const start = start_date.replace('T', ' '); countSql += ' AND created_at >= ?'; countParams.push(start.length === 16 ? start + ':00' : start); }
  if (end_date) { const end = end_date.replace('T', ' '); if (end.length === 10) { countSql += ' AND created_at <= ?'; countParams.push(end + ' 23:59:59'); } else { countSql += ' AND created_at <= ?'; countParams.push(end.length === 16 ? end + ':00' : end); } }
  const summary = db.prepare(countSql).get(...countParams);
  res.json({ orders, total: summary.cnt, revenue: summary.revenue });
});

router.get('/stats', auth, managerAccess, (req, res) => {
  const today = db.prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(total),0) as revenue FROM orders WHERE date(created_at) = date('now','localtime')").get();
  const pending = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE status = 'pending'").get();
  const week = db.prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(total),0) as revenue FROM orders WHERE created_at >= datetime('now','localtime','-7 days')").get();
  res.json({ today_count: today.cnt, today_revenue: today.revenue, pending_count: pending.cnt, week_count: week.cnt, week_revenue: week.revenue });
});

router.put('/:id/status', auth, managerAccess, (req, res) => {
  const { status } = req.body;
  const allowed = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ error: '无效状态' });
  const timeField = status === 'preparing' ? 'start_time' : status === 'ready' ? 'ready_time' : status === 'completed' ? 'complete_time' : null;
  if (timeField) db.prepare(`UPDATE orders SET status = ?, ${timeField} = COALESCE(${timeField}, datetime('now','localtime')) WHERE id = ?`).run(status, req.params.id);
  else db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

router.get('/lookup/:orderNo', (req, res) => {
  const order = db.prepare('SELECT id, order_no, items, subtotal, tax, delivery_fee, total, dining_type, customer_name, customer_phone, customer_address, note, status, created_at FROM orders WHERE order_no = ?').get(req.params.orderNo);
  if (!order) return res.status(404).json({ error: '订单不存在，请检查订单号' });
  order.items = JSON.parse(order.items || '[]');
  res.json(order);
});

router.get('/search', (req, res) => {
  const { keyword } = req.query;
  if (!keyword || !keyword.trim()) return res.status(400).json({ error: '请输入订单号、手机号或姓名' });
  const kw = keyword.trim();
  const cleanPhone = kw.replace(/\D/g, '');
  const sql = `SELECT id, order_no, total, dining_type, customer_name, customer_phone, status, created_at FROM orders WHERE order_no LIKE ? OR REPLACE(REPLACE(REPLACE(REPLACE(customer_phone, '-', ''), '(', ''), ')', ''), ' ', '') LIKE ? OR customer_name LIKE ? ORDER BY created_at DESC LIMIT 50`;
  const orders = db.prepare(sql).all(`%${kw}%`, `%${cleanPhone}%`, `%${kw}%`);
  res.json({ orders, count: orders.length });
});

router.get('/mine', (req, res) => {
  const { guest_id, table_id, table_session } = req.query;
  if (!guest_id && !table_id) return res.status(400).json({ error: '缺少设备标识或餐桌标识' });
  let sql = `SELECT id, order_no, total, dining_type, customer_name, status, created_at FROM orders WHERE status != 'cancelled' AND (`;
  const conditions = [];
  const params = [];
  if (guest_id) { conditions.push('guest_id = ?'); params.push(guest_id); }
  if (table_id && table_session) { conditions.push('(table_id = ? AND table_session = ?)'); params.push(table_id, table_session); }
  if (conditions.length === 0) return res.status(400).json({ error: '缺少有效查询条件' });
  sql += conditions.join(' OR ') + ') ORDER BY created_at DESC LIMIT 50';
  const orders = db.prepare(sql).all(...params);
  res.json({ orders, count: orders.length });
});

router.get('/table/:tableId', auth, (req, res) => {
  const orders = db.prepare("SELECT id, order_no, total, status, created_at FROM orders WHERE table_id = ? AND status != 'cancelled' ORDER BY created_at").all(req.params.tableId);
  const total = orders.reduce((sum, o) => sum + parseFloat(o.total), 0);
  res.json({ orders, total, count: orders.length });
});

router.get('/:id', auth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  order.items = JSON.parse(order.items || '[]');
  res.json(order);
});

router.get('/employee/today', auth, (req, res) => {
  const { status } = req.query;
  let sql = "SELECT * FROM orders WHERE date(created_at) = date('now','localtime')";
  const params = [];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY created_at DESC LIMIT 100';
  const orders = db.prepare(sql).all(...params);
  orders.forEach(o => o.items = JSON.parse(o.items || '[]'));
  const summary = db.prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(total),0) as revenue FROM orders WHERE date(created_at) = date('now','localtime')").get();
  res.json({ orders, total: summary.cnt, revenue: summary.revenue });
});

router.put('/employee/:id/status', auth, (req, res) => {
  const { status } = req.body;
  const allowed = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ error: '无效状态' });
  const timeField = status === 'preparing' ? 'start_time' : status === 'ready' ? 'ready_time' : status === 'completed' ? 'complete_time' : null;
  let result;
  if (timeField) result = db.prepare(`UPDATE orders SET status = ?, ${timeField} = COALESCE(${timeField}, datetime('now','localtime')) WHERE id = ?`).run(status, req.params.id);
  else result = db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: '订单不存在' });
  res.json({ success: true });
});

router.put('/employee/:id/append', auth, (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: '追加商品为空' });
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  if (order.status === 'cancelled' || order.status === 'completed') return res.status(400).json({ error: '该订单已结束，无法追加' });
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
    const existing = existingItems.find(i => i.id === product.id && (i.note || '') === (item.note || ''));
    if (existing) { existing.quantity += qty; existing.subtotal = existing.price * existing.quantity; }
    else newItems.push({ id: product.id, name: product.name, name_en: product.name_en, price: unitPrice, quantity: qty, note: item.note || '', subtotal: itemTotal });
  }
  const allItems = [...existingItems, ...newItems];
  const subtotal = allItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const taxRate = parseFloat(db.prepare('SELECT value FROM settings WHERE key = ?').get('tax_rate')?.value || '0.08875');
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const delivery_fee = parseFloat(order.delivery_fee || 0);
  const total = Math.round((subtotal + tax + delivery_fee) * 100) / 100;
  db.prepare('UPDATE orders SET items = ?, subtotal = ?, tax = ?, total = ? WHERE id = ?').run(JSON.stringify(allItems), subtotal, tax, total, req.params.id);
  res.json({ success: true, order_no: order.order_no, total, append_total: appendSubtotal });
});

module.exports = router;
