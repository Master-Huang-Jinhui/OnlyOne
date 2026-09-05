const express = require('express');
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

function genOrderNo() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${rand}`;
}

router.post('/', (req, res) => {
  const { items, dining_type = 'takeout', customer_name, customer_phone, customer_address, note } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: '购物车为空' });
  let subtotal = 0;
  const orderItems = [];
  for (const item of items) {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.id);
    if (!product) continue;
    const qty = Math.max(1, parseInt(item.quantity) || 1);
    subtotal += product.price * qty;
    orderItems.push({ id: product.id, name: product.name, name_en: product.name_en, price: product.price, quantity: qty, note: item.note || '', subtotal: product.price * qty });
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
  const order_no = genOrderNo();
  db.prepare(`INSERT INTO orders (order_no, items, subtotal, tax, delivery_fee, total, dining_type, customer_name, customer_phone, customer_address, note, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`).run(
    order_no, JSON.stringify(orderItems), subtotal, tax, delivery_fee, total, dining_type, customer_name, customer_phone, customer_address, note
  );
  res.json({ order_no, total, subtotal, tax, delivery_fee });
});

router.get('/', auth, adminOnly, (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;
  let sql = 'SELECT * FROM orders';
  const params = [];
  if (status) { sql += ' WHERE status = ?'; params.push(status); }
  sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  const orders = db.prepare(sql).all(...params);
  orders.forEach(o => o.items = JSON.parse(o.items || '[]'));
  res.json(orders);
});

router.get('/stats', auth, adminOnly, (req, res) => {
  const today = db.prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(total),0) as revenue FROM orders WHERE date(created_at) = date('now','localtime')").get();
  const pending = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE status = 'pending'").get();
  const week = db.prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(total),0) as revenue FROM orders WHERE created_at >= datetime('now','localtime','-7 days')").get();
  res.json({ today_count: today.cnt, today_revenue: today.revenue, pending_count: pending.cnt, week_count: week.cnt, week_revenue: week.revenue });
});

router.put('/:id/status', auth, adminOnly, (req, res) => {
  const { status } = req.body;
  const allowed = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ error: '无效状态' });
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

router.get('/:id', auth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  order.items = JSON.parse(order.items || '[]');
  res.json(order);
});

module.exports = router;
