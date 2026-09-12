const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// 计算当前营业日的开始时间（比如凌晨4点，则4点前算前一天的营业日）
function getBusinessDayStart() {
  const setting = db.prepare("SELECT value FROM settings WHERE key = 'business_day_start'").get();
  const startStr = setting?.value || '04:00';
  const [startHour, startMinute] = startStr.split(':').map(Number);
  
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(startHour, startMinute, 0, 0);
  
  // 如果当前时间早于今天的营业日开始时间，则营业日从昨天开始
  if (now < todayStart) {
    todayStart.setDate(todayStart.getDate() - 1);
  }
  
  // 格式化为 SQLite datetime 格式
  const pad = (n) => String(n).padStart(2, '0');
  return `${todayStart.getFullYear()}-${pad(todayStart.getMonth() + 1)}-${pad(todayStart.getDate())} ${pad(todayStart.getHours())}:${pad(todayStart.getMinutes())}:00`;
}

// KDS 待制作订单列表（pending + preparing 状态，只显示当前营业日的订单，按时间正序，最早下单的先做）
router.post('/pending', auth, (req, res) => {
  const businessDayStart = getBusinessDayStart();
  const orders = db.prepare(`
    SELECT o.id, o.order_no, o.items, o.dining_type, o.customer_name, o.note, o.status, o.created_at, o.table_id, o.table_session,
           t.table_no as table_name, t.zone as table_position
    FROM orders o
    LEFT JOIN tables t ON o.table_id = t.id
    WHERE o.status IN ('pending', 'preparing')
      AND o.created_at >= ?
    ORDER BY 
      CASE o.status WHEN 'pending' THEN 0 ELSE 1 END,
      o.created_at ASC
  `).all(businessDayStart);

  const result = orders.map(o => {
    let items = [];
    try { items = JSON.parse(o.items); } catch (e) {}
    const waitMinutes = Math.floor((Date.now() - new Date(o.created_at.replace(' ', 'T')).getTime()) / 60000);
    return {
      ...o,
      items,
      total_quantity: items.reduce((sum, item) => sum + (item.quantity || 0), 0),
      wait_minutes: waitMinutes,
      is_overdue: waitMinutes > 120
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

// KDS 统计（待做数量、制作中数量、今日完成数量，只统计当前营业日的订单）
router.post('/stats', auth, (req, res) => {
  const businessDayStart = getBusinessDayStart();
  const pending = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE status = 'pending' AND created_at >= ?").get(businessDayStart).cnt;
  const preparing = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE status = 'preparing' AND created_at >= ?").get(businessDayStart).cnt;
  const ready = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE status = 'ready' AND created_at >= ?").get(businessDayStart).cnt;
  const todayCompleted = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE status = 'completed' AND created_at >= ?").get(businessDayStart).cnt;

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