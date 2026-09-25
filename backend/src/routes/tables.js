const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { auth, managerAccess } = require('../middleware/auth');

const router = express.Router();

router.post('/zones/list', auth, managerAccess, (req, res) => {
  const zones = db.prepare('SELECT * FROM table_zones ORDER BY sort_order, name').all();
  res.json(zones);
});

router.post('/zones', auth, managerAccess, (req, res) => {
  const { name, sort_order = 0 } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: '分区名称必填' });
  const exists = db.prepare('SELECT id FROM table_zones WHERE name = ?').get(name.trim());
  if (exists) return res.status(400).json({ error: '该分区已存在' });
  const result = db.prepare('INSERT INTO table_zones (name, sort_order) VALUES (?, ?)').run(name.trim(), sort_order);
  res.json({ id: result.lastInsertRowid });
});

router.post('/zones/update/:id', auth, managerAccess, (req, res) => {
  const { name, sort_order } = req.body;
  const zone = db.prepare('SELECT * FROM table_zones WHERE id = ?').get(req.params.id);
  if (!zone) return res.status(404).json({ error: '分区不存在' });
  if (name && name.trim() !== zone.name) {
    const exists = db.prepare('SELECT id FROM table_zones WHERE name = ? AND id != ?').get(name.trim(), req.params.id);
    if (exists) return res.status(400).json({ error: '该分区已存在' });
  }
  db.prepare('UPDATE table_zones SET name = ?, sort_order = ? WHERE id = ?').run(
    name ? name.trim() : zone.name,
    sort_order !== undefined ? sort_order : zone.sort_order,
    req.params.id
  );
  res.json({ success: true });
});

router.post('/zones/delete/:id', auth, managerAccess, (req, res) => {
  const zone = db.prepare('SELECT * FROM table_zones WHERE id = ?').get(req.params.id);
  if (!zone) return res.status(404).json({ error: '分区不存在' });
  db.prepare('UPDATE tables SET zone_id = NULL WHERE zone_id = ?').run(req.params.id);
  db.prepare('DELETE FROM table_zones WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/by-no/:tableNo', (req, res) => {
  const table = db.prepare('SELECT t.*, z.name as zone_name FROM tables t LEFT JOIN table_zones z ON t.zone_id = z.id WHERE t.table_no = ?').get(req.params.tableNo);
  if (!table) return res.status(404).json({ error: '餐桌不存在' });
  res.json(table);
});

router.post('/public', (req, res) => {
  const tables = db.prepare("SELECT t.id, t.table_no, z.name as zone_name, t.seats, t.status, t.sort_order FROM tables t LEFT JOIN table_zones z ON t.zone_id = z.id WHERE t.maintenance = 0 ORDER BY t.sort_order, t.table_no").all();
  res.json(tables);
});

router.post('/list', auth, managerAccess, (req, res) => {
  let sql = `SELECT t.*, z.name as zone_name,
    (SELECT COUNT(*) FROM orders o WHERE o.table_id = t.id AND o.status NOT IN ('cancelled', 'completed')) as active_orders,
    (SELECT COALESCE(SUM(o.total),0) FROM orders o WHERE o.table_id = t.id AND o.status NOT IN ('cancelled', 'completed')) as active_total
    FROM tables t
    LEFT JOIN table_zones z ON t.zone_id = z.id
    WHERE 1=1`;
  const params = [];
  const { zone, status } = req.query;
  if (zone) { sql += ' AND t.zone_id = ?'; params.push(zone); }
  if (status) { sql += ' AND t.status = ?'; params.push(status); }
  sql += ' ORDER BY t.sort_order, t.table_no';
  const tables = db.prepare(sql).all(...params);
  res.json(tables);
});

router.post('/', auth, managerAccess, (req, res) => {
  const { table_no, zone_name = '大厅', seats = 4, sort_order = 0, min_charge = 0, note = '' } = req.body;
  if (!table_no || !table_no.trim()) return res.status(400).json({ error: '请输入桌号' });
  const exists = db.prepare('SELECT id FROM tables WHERE table_no = ?').get(table_no.trim());
  if (exists) return res.status(400).json({ error: '该桌号已存在' });
  // 找或创建分区
  let zone = db.prepare('SELECT id FROM table_zones WHERE name = ?').get(zone_name);
  if (!zone) {
    const zr = db.prepare('INSERT INTO table_zones (name, sort_order) VALUES (?, 0)').run(zone_name);
    zone = { id: zr.lastInsertRowid };
  }
  const result = db.prepare('INSERT INTO tables (table_no, zone_id, seats, status, sort_order, min_charge, note) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    table_no.trim(), zone.id, seats, 'empty', sort_order, min_charge, note
  );
  res.json({ id: result.lastInsertRowid, table_no: table_no.trim() });
});

router.post('/batch', auth, managerAccess, (req, res) => {
  const { prefix = 'A', start = 1, count = 10, zone_name = '大厅', seats = 4 } = req.body;
  let zone = db.prepare('SELECT id FROM table_zones WHERE name = ?').get(zone_name);
  if (!zone) {
    const zr = db.prepare('INSERT INTO table_zones (name, sort_order) VALUES (?, 0)').run(zone_name);
    zone = { id: zr.lastInsertRowid };
  }
  const created = [];
  const errors = [];
  for (let i = 0; i < count; i++) {
    const tableNo = `${prefix}${start + i}`;
    const exists = db.prepare('SELECT id FROM tables WHERE table_no = ?').get(tableNo);
    if (exists) { errors.push(tableNo); continue; }
    const result = db.prepare('INSERT INTO tables (table_no, zone_id, seats, status, sort_order) VALUES (?, ?, ?, ?, ?)').run(
      tableNo, zone.id, seats, 'empty', start + i
    );
    created.push({ id: result.lastInsertRowid, table_no: tableNo });
  }
  res.json({ created, errors, created_count: created.length, error_count: errors.length });
});

router.post('/update/:id', auth, managerAccess, (req, res) => {
  const allowed = ['table_no', 'seats', 'sort_order', 'min_charge', 'note', 'status', 'maintenance'];
  const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.id);
  if (!table) return res.status(404).json({ error: '餐桌不存在' });
  if (req.body.table_no && req.body.table_no.trim() !== table.table_no) {
    const exists = db.prepare('SELECT id FROM tables WHERE table_no = ? AND id != ?').get(req.body.table_no.trim(), req.params.id);
    if (exists) return res.status(400).json({ error: '该桌号已存在' });
  }
  const fields = [];
  const values = [];
  for (const key of allowed) {
    if (req.body[key] !== undefined) { fields.push(`${key} = ?`); values.push(req.body[key]); }
  }
  if (req.body.zone_name) {
    let zone = db.prepare('SELECT id FROM table_zones WHERE name = ?').get(req.body.zone_name);
    if (!zone) {
      const zr = db.prepare('INSERT INTO table_zones (name, sort_order) VALUES (?, 0)').run(req.body.zone_name);
      zone = { id: zr.lastInsertRowid };
    }
    fields.push('zone_id = ?'); values.push(zone.id);
  }
  if (fields.length === 0) return res.status(400).json({ error: '没有要更新的字段' });
  values.push(req.params.id);
  db.prepare(`UPDATE tables SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ success: true });
});

router.post('/delete/:id', auth, managerAccess, (req, res) => {
  db.prepare('DELETE FROM tables WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/:id/clear', auth, managerAccess, (req, res) => {
  db.prepare("UPDATE tables SET status = 'empty' WHERE id = ?").run(req.params.id);
  db.prepare("UPDATE orders SET status = 'completed' WHERE table_id = ? AND status NOT IN ('cancelled', 'completed')").run(req.params.id);
  res.json({ success: true });
});

router.post('/:id/clean-done', auth, managerAccess, (req, res) => {
  db.prepare("UPDATE tables SET status = 'empty' WHERE id = ? AND status = 'cleaning'").run(req.params.id);
  res.json({ success: true });
});

router.post('/:id/occupy', auth, managerAccess, (req, res) => {
  db.prepare("UPDATE tables SET status = 'occupied' WHERE id = ? AND status = 'empty'").run(req.params.id);
  res.json({ success: true });
});

router.post('/:id/open', auth, managerAccess, (req, res) => {
  db.prepare("UPDATE tables SET status = 'occupied' WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

router.post('/:id/maintenance', auth, managerAccess, (req, res) => {
  db.prepare('UPDATE tables SET maintenance = ? WHERE id = ?').run(req.body.maintenance ? 1 : 0, req.params.id);
  res.json({ success: true });
});

router.post('/transfer', auth, managerAccess, (req, res) => {
  const { from_table_id, to_table_id } = req.body;
  db.prepare("UPDATE orders SET table_id = ? WHERE table_id = ? AND status NOT IN ('cancelled', 'completed')").run(to_table_id, from_table_id);
  db.prepare("UPDATE tables SET status = 'empty' WHERE id = ?").run(from_table_id);
  res.json({ success: true });
});

router.post('/merge', auth, managerAccess, (req, res) => {
  const { table_ids, target_table_id } = req.body;
  table_ids.forEach(id => {
    db.prepare("UPDATE orders SET table_id = ? WHERE table_id = ? AND status NOT IN ('cancelled', 'completed')").run(target_table_id, id);
    db.prepare("UPDATE tables SET status = 'empty' WHERE id = ?").run(id);
  });
  res.json({ success: true });
});

router.post('/reservations/list', auth, managerAccess, (req, res) => {
  const reservations = db.prepare('SELECT r.*, t.table_no FROM table_reservations r LEFT JOIN tables t ON r.table_id = t.id ORDER BY r.reservation_time DESC').all();
  res.json(reservations);
});

router.post('/reservations', auth, managerAccess, (req, res) => {
  const { table_id, customer_name, customer_phone, reservation_time, note } = req.body;
  const result = db.prepare('INSERT INTO table_reservations (table_id, customer_name, customer_phone, reservation_time, note) VALUES (?, ?, ?, ?, ?)').run(table_id, customer_name, customer_phone, reservation_time, note);
  res.json({ id: result.lastInsertRowid });
});

router.post('/reservations/update/:id', auth, managerAccess, (req, res) => {
  db.prepare('UPDATE table_reservations SET ? WHERE id = ?').run(req.body, req.params.id);
  res.json({ success: true });
});

router.post('/reservations/delete/:id', auth, managerAccess, (req, res) => {
  db.prepare('DELETE FROM table_reservations WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.get('/stats/turnover', auth, managerAccess, (req, res) => {
  const stats = db.prepare(`
    SELECT t.table_no, COUNT(o.id) as order_count, COALESCE(SUM(o.total),0) as total_revenue
    FROM tables t
    LEFT JOIN orders o ON t.id = o.table_id AND o.status = 'completed'
    GROUP BY t.id
    ORDER BY total_revenue DESC
  `).all();
  res.json(stats);
});

module.exports = router;
