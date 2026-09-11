const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// KDS 待制作订单列表（pending + preparing 状态，按时间正序，最早下单的先做）
router.post('/pending', auth, (req, res) => {
  const orders = db.prepare(`
    SELECT o.id, o.order_no, o.items, o.dining_type, o.customer_name, o.note, o.status, o.created_at, o.table_id, o.table_session,
           t.name as table_name, t.position as table_position
    FROM orders o
    LEFT JOIN tables t ON o.table_id = t.id
    WHERE o.status IN ('pending', 'preparing')
    ORDER BY 
      CASE o.status WHEN 'pending' THEN 0 ELSE 1 END,
      o.created_at ASC
  `).all();

  const result = orders.map(o => {
    let items = [];
    try { items = JSON.parse(o.items); } catch (e) {}
    return {
      ...o,
      items,
      total_quantity: items.reduce((sum, item) => sum + (item.quantity || 0), 0),
      wait_minutes: Math.floor((Date.now() - new Date(o.created_at.replace(' ', 'T')).getTime()) / 60000)
    };
  });

  res.json(result);
});

// KDS 推进订单状态（pending → preparing → ready）
router.post('/advance/:id', auth, (req, res) => {
  const order = db.prepare('SELECT id, status FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });

  let nextStatus = null;
  let nextLabel = '';

  if (order.status === 'pending') {
    nextStatus = 'preparing';
    nextLabel = '开始制作';
  } else if (order.status === 'preparing') {
    nextStatus = 'ready';
    nextLabel = '制作完成';
  } else {
    return res.status(400).json({ error: '当前状态无法推进' });
  }

  const timeField = nextStatus === 'preparing' ? 'start_time' : nextStatus === 'ready' ? 'ready_time' : null;
  if (timeField) {
    db.prepare(`UPDATE orders SET status = ?, ${timeField} = datetime('now','localtime') WHERE id = ?`).run(nextStatus, order.id);
  } else {
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(nextStatus, order.id);
  }

  res.json({ success: true, status: nextStatus, label: nextLabel });
});

// KDS 标记订单为已完成（出餐）
router.post('/complete/:id', auth, (req, res) => {
  const order = db.prepare('SELECT id, status, dining_type FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });

  // 堂吃订单不能在KDS完成，需要到收银台结账
  if (order.dining_type === 'dinein' || order.dining_type === 'dine_in') {
    return res.status(400).json({ error: '堂吃订单请到收银台结账' });
  }

  db.prepare(`UPDATE orders SET status = 'completed', complete_time = datetime('now','localtime') WHERE id = ?`).run(order.id);
  res.json({ success: true });
});

// KDS 统计（待做数量、制作中数量、今日完成数量）
router.post('/stats', auth, (req, res) => {
  const pending = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE status = 'pending'").get().cnt;
  const preparing = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE status = 'preparing'").get().cnt;
  const ready = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE status = 'ready'").get().cnt;
  const todayCompleted = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE status = 'completed' AND date(created_at) = date('now','localtime')").get().cnt;

  res.json({ pending, preparing, ready, todayCompleted });
});

// 小票打印数据
router.post('/receipt/:id', auth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });

  let items = [];
  try { items = JSON.parse(order.items); } catch (e) {}

  const storeName = db.prepare("SELECT value FROM settings WHERE key = 'store_name'").get()?.value || 'Only One BBQ & Tea';
  const phone = db.prepare("SELECT value FROM settings WHERE key = 'phone'").get()?.value || '';
  const address = db.prepare("SELECT value FROM settings WHERE key = 'address'").get()?.value || '';

  res.json({
    order_no: order.order_no,
    store_name: storeName,
    phone,
    address,
    dining_type: order.dining_type,
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    customer_address: order.customer_address,
    note: order.note,
    items,
    subtotal: order.subtotal,
    tax: order.tax,
    delivery_fee: order.delivery_fee,
    total: order.total,
    created_at: order.created_at,
    pickup_number: order.pickup_number
  });
});

module.exports = router;