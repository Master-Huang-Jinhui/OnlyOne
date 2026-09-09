const express = require('express');
const db = require('../db');
const { auth, managerAccess } = require('../middleware/auth');

const router = express.Router();

db.exec(`CREATE TABLE IF NOT EXISTS goods (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, name_en TEXT DEFAULT '', unit TEXT DEFAULT '个', current_stock REAL DEFAULT 0, avg_price REAL DEFAULT 0, supplier TEXT DEFAULT '', category TEXT DEFAULT '', note TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime'))); CREATE TABLE IF NOT EXISTS purchase_orders (id INTEGER PRIMARY KEY AUTOINCREMENT, order_no TEXT, supplier TEXT NOT NULL, order_date TEXT NOT NULL, total_amount REAL DEFAULT 0, delivery_fee REAL DEFAULT 0, discount REAL DEFAULT 0, payment_method TEXT DEFAULT 'COD', note TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now','localtime'))); CREATE TABLE IF NOT EXISTS purchase_order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, purchase_order_id INTEGER NOT NULL, goods_id INTEGER, goods_name TEXT NOT NULL, quantity REAL NOT NULL DEFAULT 0, unit TEXT DEFAULT '个', unit_price REAL NOT NULL DEFAULT 0, subtotal REAL DEFAULT 0, FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE)`);

router.post('/goods/list', auth, managerAccess, (req, res) => {
  const { keyword, category } = req.query;
  let sql = 'SELECT * FROM goods WHERE 1=1';
  const params = [];
  if (keyword) { sql += ' AND (name LIKE ? OR name_en LIKE ? OR supplier LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`); }
  if (category) { sql += ' AND category = ?'; params.push(category); }
  sql += ' ORDER BY name';
  res.json(db.prepare(sql).all(...params));
});

router.post('/goods/detail/:id', auth, managerAccess, (req, res) => {
  const goods = db.prepare('SELECT * FROM goods WHERE id = ?').get(req.params.id);
  if (!goods) return res.status(404).json({ error: '货物不存在' });
  res.json(goods);
});

router.post('/goods', auth, managerAccess, (req, res) => {
  const { name, name_en = '', unit = '个', current_stock = 0, avg_price = 0, supplier = '', category = '', note = '' } = req.body;
  if (!name) return res.status(400).json({ error: '货物名称必填' });
  const result = db.prepare(`INSERT INTO goods (name, name_en, unit, current_stock, avg_price, supplier, category, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(name, name_en, unit, current_stock, avg_price, supplier, category, note);
  res.json({ id: result.lastInsertRowid });
});

router.post('/goods/update/:id', auth, managerAccess, (req, res) => {
  const allowed = ['name', 'name_en', 'unit', 'current_stock', 'avg_price', 'supplier', 'category', 'note'];
  const fields = [];
  const values = [];
  for (const key of allowed) { if (req.body[key] !== undefined) { fields.push(`${key} = ?`); values.push(req.body[key]); } }
  fields.push(`updated_at = datetime('now','localtime')`);
  if (fields.length === 0) return res.status(400).json({ error: '没有要更新的字段' });
  values.push(req.params.id);
  db.prepare(`UPDATE goods SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ success: true });
});

router.post('/goods/delete/:id', auth, managerAccess, (req, res) => {
  db.prepare('DELETE FROM goods WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/orders/list', auth, managerAccess, (req, res) => {
  const { start_date, end_date, supplier, keyword } = req.query;
  let sql = 'SELECT * FROM purchase_orders WHERE 1=1';
  const params = [];
  if (start_date) { sql += ' AND order_date >= ?'; params.push(start_date); }
  if (end_date) { sql += ' AND order_date <= ?'; params.push(end_date); }
  if (supplier) { sql += ' AND supplier LIKE ?'; params.push(`%${supplier}%`); }
  if (keyword) { sql += ' AND (order_no LIKE ? OR note LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
  sql += ' ORDER BY order_date DESC, id DESC';
  const orders = db.prepare(sql).all(...params);
  res.json(orders);
});

router.post('/orders/detail/:id', auth, managerAccess, (req, res) => {
  const order = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: '进货单不存在' });
  const items = db.prepare('SELECT * FROM purchase_order_items WHERE purchase_order_id = ? ORDER BY id').all(req.params.id);
  res.json({ ...order, items });
});

router.post('/orders', auth, managerAccess, (req, res) => {
  const { order_no = '', supplier, order_date, delivery_fee = 0, discount = 0, payment_method = 'COD', note = '', items = [] } = req.body;
  if (!supplier || !order_date) return res.status(400).json({ error: '供应商和日期必填' });
  let total_amount = 0;
  for (const item of items) { const qty = parseFloat(item.quantity) || 0; const price = parseFloat(item.unit_price) || 0; total_amount += qty * price; }
  total_amount = total_amount + (parseFloat(delivery_fee) || 0) - (parseFloat(discount) || 0);
  const tx = db.transaction(() => {
    const result = db.prepare(`INSERT INTO purchase_orders (order_no, supplier, order_date, total_amount, delivery_fee, discount, payment_method, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(order_no, supplier, order_date, total_amount, delivery_fee, discount, payment_method, note);
    const orderId = result.lastInsertRowid;
    const insertItem = db.prepare(`INSERT INTO purchase_order_items (purchase_order_id, goods_id, goods_name, quantity, unit, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const updateGoods = db.prepare(`UPDATE goods SET current_stock = current_stock + ?, avg_price = CASE WHEN avg_price = 0 THEN ? ELSE (avg_price + ?) / 2 END, updated_at = datetime('now','localtime') WHERE id = ?`);
    const insertGoods = db.prepare(`INSERT INTO goods (name, unit, current_stock, avg_price, supplier) VALUES (?, ?, ?, ?, ?)`);
    for (const item of items) {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      const subtotal = qty * price;
      let goodsId = item.goods_id || null;
      if (!goodsId && item.goods_name) {
        const existing = db.prepare('SELECT id FROM goods WHERE name = ? LIMIT 1').get(item.goods_name);
        if (existing) { goodsId = existing.id; } else { const r = insertGoods.run(item.goods_name, item.unit || '个', qty, price, supplier); goodsId = r.lastInsertRowid; }
      }
      insertItem.run(orderId, goodsId, item.goods_name, qty, item.unit || '个', price, subtotal);
      if (goodsId) { updateGoods.run(qty, price, price, goodsId); }
    }
    return orderId;
  });
  const orderId = tx();
  res.json({ id: orderId, total_amount });
});

router.post('/orders/update/:id', auth, managerAccess, (req, res) => {
  const { order_no, supplier, order_date, delivery_fee, discount, payment_method, note, items } = req.body;
  const existing = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '进货单不存在' });
  const tx = db.transaction(() => {
    const fields = [];
    const values = [];
    if (order_no !== undefined) { fields.push('order_no = ?'); values.push(order_no); }
    if (supplier !== undefined) { fields.push('supplier = ?'); values.push(supplier); }
    if (order_date !== undefined) { fields.push('order_date = ?'); values.push(order_date); }
    if (delivery_fee !== undefined) { fields.push('delivery_fee = ?'); values.push(delivery_fee); }
    if (discount !== undefined) { fields.push('discount = ?'); values.push(discount); }
    if (payment_method !== undefined) { fields.push('payment_method = ?'); values.push(payment_method); }
    if (note !== undefined) { fields.push('note = ?'); values.push(note); }
    let total_amount = 0;
    if (items) { for (const item of items) { total_amount += (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0); } }
    const finalDelivery = delivery_fee !== undefined ? parseFloat(delivery_fee) : existing.delivery_fee;
    const finalDiscount = discount !== undefined ? parseFloat(discount) : existing.discount;
    total_amount = total_amount + finalDelivery - finalDiscount;
    fields.push('total_amount = ?'); values.push(total_amount);
    values.push(req.params.id);
    db.prepare(`UPDATE purchase_orders SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    if (items) {
      db.prepare('DELETE FROM purchase_order_items WHERE purchase_order_id = ?').run(req.params.id);
      const insertItem = db.prepare(`INSERT INTO purchase_order_items (purchase_order_id, goods_id, goods_name, quantity, unit, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)`);
      for (const item of items) { const qty = parseFloat(item.quantity) || 0; const price = parseFloat(item.unit_price) || 0; insertItem.run(req.params.id, item.goods_id || null, item.goods_name, qty, item.unit || '个', price, qty * price); }
    }
  });
  tx();
  res.json({ success: true });
});

router.post('/orders/delete/:id', auth, managerAccess, (req, res) => {
  db.prepare('DELETE FROM purchase_order_items WHERE purchase_order_id = ?').run(req.params.id);
  db.prepare('DELETE FROM purchase_orders WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
