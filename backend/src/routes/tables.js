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
  db.prepare("UPDATE tables SET zone = '大厅' WHERE zone = ?").run(zone.name);
  db.prepare('DELETE FROM table_zones WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/by-no/:tableNo', (req, res) => {
  const table = db.prepare('SELECT * FROM tables WHERE table_no = ?').get(req.params.tableNo);
  if (!table) return res.status(404).json({ error: '餐桌不存在' });
  res.json(table);
});

router.post('/public', (req, res) => {
  const tables = db.prepare("SELECT id, table_no, zone, seats, status, sort_order FROM tables WHERE status != 'maintenance' ORDER BY sort_order, table_no").all();
  res.json(tables);
});

router.post('/list', auth, managerAccess, (req, res) => {
  const { zone, status } = req.query;
  let sql = `SELECT t.*, (SELECT COUNT(*) FROM orders o WHERE o.table_id = t.id AND o.table_session = t.current_session AND o.status != 'cancelled') as active_orders, (SELECT COALESCE(SUM(o.total),0) FROM orders o WHERE o.table_id = t.id AND o.table_session = t.current_session AND o.status != 'cancelled') as active_total FROM tables t WHERE 1=1`;
  const params = [];
  if (zone) { sql += ' AND t.zone = ?'; params.push(zone); }
  if (status) { sql += ' AND t.status = ?'; params.push(status); }
  sql += ' ORDER BY t.zone, t.sort_order, t.table_no';
  const tables = db.prepare(sql).all(...params);
  res.json(tables);
});

router.post('/', auth, managerAccess, (req, res) => {
  const { table_no, zone = '大厅', seats = 4, sort_order = 0, min_charge = 0, note = '' } = req.body;
  if (!table_no || !table_no.trim()) return res.status(400).json({ error: '请输入桌号' });
  const exists = db.prepare('SELECT id FROM tables WHERE table_no = ?').get(table_no.trim());
  if (exists) return res.status(400).json({ error: '该桌号已存在' });
  const result = db.prepare('INSERT INTO tables (table_no, zone, seats, status, current_session, sort_order, min_charge, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    table_no.trim(), zone, seats, 'idle', crypto.randomUUID(), sort_order, min_charge, note
  );
  res.json({ id: result.lastInsertRowid, table_no: table_no.trim() });
});

router.post('/batch', auth, managerAccess, (req, res) => {
  const { prefix = 'A', start = 1, count = 10, zone = '大厅', seats = 4 } = req.body;
  const created = [];
  const errors = [];
  for (let i = 0; i < count; i++) {
    const tableNo = `${prefix}${start + i}`;
    const exists = db.prepare('SELECT id FROM tables WHERE table_no = ?').get(tableNo);
    if (exists) { errors.push(tableNo); continue; }
    const result = db.prepare('INSERT INTO tables (table_no, zone, seats, status, current_session, sort_order) VALUES (?, ?, ?, ?, ?, ?)').run(
      tableNo, zone, seats, 'idle', crypto.randomUUID(), start + i
    );
    created.push({ id: result.lastInsertRowid, table_no: tableNo });
  }
  res.json({ created, errors, created_count: created.length, error_count: errors.length });
});

router.post('/update/:id', auth, managerAccess, (req, res) => {
  const allowed = ['table_no', 'zone', 'seats', 'sort_order', 'min_charge', 'waiter_id', 'waiter_name', 'note', 'qr_custom_url', 'status'];
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
  if (fields.length === 0) return res.status(400).json({ error: '没有要更新的字段' });
  values.push(req.params.id);
  db.prepare(`UPDATE tables SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ success: true });
});

router.post('/delete/:id', auth, managerAccess, (req, res) => {
  db.prepare('DELETE FROM tables WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/:id/open', auth, (req, res) => {
  const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.id);
  if (!table) return res.status(404).json({ error: '餐桌不存在' });
  if (table.status === 'occupied') return res.status(400).json({ error: '该桌已占用' });
  if (table.status === 'maintenance') return res.status(400).json({ error: '该桌维护中' });
  db.prepare("UPDATE tables SET status = 'occupied', opened_at = datetime('now','localtime') WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

router.post('/:id/clear', auth, (req, res) => {
  const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.id);
  if (!table) return res.status(404).json({ error: '餐桌不存在' });
  const orders = db.prepare("SELECT * FROM orders WHERE table_id = ? AND status != 'cancelled' ORDER BY created_at ASC").all(req.params.id);
  if (orders.length > 0) {
    const allItems = [];
    let total = 0;
    orders.forEach(order => {
      try {
        const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
        items.forEach(item => { allItems.push(item); total += parseFloat(item.price) * item.quantity; });
      } catch (e) {}
    });
    const firstOrder = orders[0];
    db.prepare('UPDATE orders SET items = ?, total = ?, status = ? WHERE id = ?').run(JSON.stringify(allItems), total.toFixed(2), 'completed', firstOrder.id);
    const otherOrderIds = orders.slice(1).map(o => o.id);
    if (otherOrderIds.length > 0) {
      const placeholders = otherOrderIds.map(() => '?').join(',');
      db.prepare(`DELETE FROM orders WHERE id IN (${placeholders})`).run(...otherOrderIds);
    }
  }
  const newSession = crypto.randomUUID();
  db.prepare("UPDATE tables SET current_session = ?, status = 'cleaning', opened_at = NULL WHERE id = ?").run(newSession, req.params.id);
  res.json({ success: true, new_session: newSession });
});

router.post('/:id/clean-done', auth, (req, res) => {
  db.prepare("UPDATE tables SET status = 'idle' WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

router.post('/:id/occupy', auth, (req, res) => {
  const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.id);
  if (!table) return res.status(404).json({ error: '餐桌不存在' });
  db.prepare("UPDATE tables SET status = 'occupied', opened_at = COALESCE(opened_at, datetime('now','localtime')) WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

router.post('/:id/maintenance', auth, managerAccess, (req, res) => {
  const { maintenance } = req.body;
  db.prepare("UPDATE tables SET status = ? WHERE id = ?").run(maintenance ? 'maintenance' : 'idle', req.params.id);
  res.json({ success: true });
});

router.post('/transfer', auth, (req, res) => {
  const { from_table_id, to_table_id } = req.body;
  if (!from_table_id || !to_table_id) return res.status(400).json({ error: '请选择源桌和目标桌' });
  const fromTable = db.prepare('SELECT * FROM tables WHERE id = ?').get(from_table_id);
  const toTable = db.prepare('SELECT * FROM tables WHERE id = ?').get(to_table_id);
  if (!fromTable || !toTable) return res.status(404).json({ error: '餐桌不存在' });
  if (toTable.status === 'occupied') return res.status(400).json({ error: '目标桌已占用' });
  const session = fromTable.current_session;
  db.prepare('UPDATE orders SET table_id = ? WHERE table_id = ? AND table_session = ?').run(to_table_id, from_table_id, session);
  db.prepare("UPDATE tables SET current_session = ?, status = 'occupied', opened_at = ? WHERE id = ?").run(session, fromTable.opened_at, to_table_id);
  const newSession = crypto.randomUUID();
  db.prepare("UPDATE tables SET current_session = ?, status = 'idle', opened_at = NULL WHERE id = ?").run(newSession, from_table_id);
  res.json({ success: true });
});

router.post('/merge', auth, (req, res) => {
  const { main_table_id, merge_table_id } = req.body;
  if (!main_table_id || !merge_table_id) return res.status(400).json({ error: '请选择主桌和并桌' });
  const mainTable = db.prepare('SELECT * FROM tables WHERE id = ?').get(main_table_id);
  const mergeTable = db.prepare('SELECT * FROM tables WHERE id = ?').get(merge_table_id);
  if (!mainTable || !mergeTable) return res.status(404).json({ error: '餐桌不存在' });
  db.prepare('UPDATE orders SET table_id = ?, table_session = ? WHERE table_id = ? AND table_session = ?').run(main_table_id, mainTable.current_session, merge_table_id, mergeTable.current_session);
  const newSession = crypto.randomUUID();
  db.prepare("UPDATE tables SET current_session = ?, status = 'idle', opened_at = NULL WHERE id = ?").run(newSession, merge_table_id);
  res.json({ success: true });
});

router.post('/reservations/list', auth, managerAccess, (req, res) => {
  const { date, status } = req.query;
  let sql = 'SELECT * FROM table_reservations WHERE 1=1';
  const params = [];
  if (date) { sql += ' AND reserve_date = ?'; params.push(date); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY reserve_date, reserve_time';
  const reservations = db.prepare(sql).all(...params);
  res.json(reservations);
});

router.post('/reservations', auth, managerAccess, (req, res) => {
  const { table_id, table_no, customer_name, customer_phone, reserve_date, reserve_time, party_size = 2, note = '' } = req.body;
  if (!reserve_date || !reserve_time) return res.status(400).json({ error: '预订日期和时间必填' });
  if (!customer_name) return res.status(400).json({ error: '客户姓名必填' });
  const result = db.prepare(`INSERT INTO table_reservations (table_id, table_no, customer_name, customer_phone, reserve_date, reserve_time, party_size, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    table_id || null, table_no || '', customer_name, customer_phone || '', reserve_date, reserve_time, party_size, note
  );
  res.json({ id: result.lastInsertRowid });
});

router.post('/reservations/update/:id', auth, managerAccess, (req, res) => {
  const allowed = ['table_id', 'table_no', 'customer_name', 'customer_phone', 'reserve_date', 'reserve_time', 'party_size', 'note', 'status'];
  const reservation = db.prepare('SELECT * FROM table_reservations WHERE id = ?').get(req.params.id);
  if (!reservation) return res.status(404).json({ error: '预订不存在' });
  const fields = [];
  const values = [];
  for (const key of allowed) {
    if (req.body[key] !== undefined) { fields.push(`${key} = ?`); values.push(req.body[key]); }
  }
  if (fields.length === 0) return res.status(400).json({ error: '没有要更新的字段' });
  values.push(req.params.id);
  db.prepare(`UPDATE table_reservations SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ success: true });
});

router.post('/reservations/delete/:id', auth, managerAccess, (req, res) => {
  db.prepare('DELETE FROM table_reservations WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/stats/turnover', auth, managerAccess, (req, res) => {
  const { start_date, end_date } = req.query;
  let dateFilter = '';
  const params = [];
  if (start_date) { dateFilter += ' AND date(created_at) >= ?'; params.push(start_date); }
  if (end_date) { dateFilter += ' AND date(created_at) <= ?'; params.push(end_date); }
  const stats = db.prepare(`SELECT t.id, t.table_no, t.zone, COUNT(o.id) as completed_orders, COALESCE(SUM(o.total), 0) as total_revenue FROM tables t LEFT JOIN orders o ON o.table_id = t.id AND o.status = 'completed' ${dateFilter} GROUP BY t.id ORDER BY completed_orders DESC, total_revenue DESC`).all(...params);
  const totalTables = stats.length;
  const totalTurnovers = stats.reduce((sum, s) => sum + s.completed_orders, 0);
  const avgTurnover = totalTables > 0 ? (totalTurnovers / totalTables).toFixed(2) : 0;
  res.json({ stats, total_tables: totalTables, total_turnovers: totalTurnovers, avg_turnover: avgTurnover });
});

module.exports = router;
