const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { auth, managerAccess } = require('../middleware/auth');

const router = express.Router();

router.get('/by-no/:tableNo', (req, res) => {
  const table = db.prepare('SELECT * FROM tables WHERE table_no = ?').get(req.params.tableNo);
  if (!table) return res.status(404).json({ error: '餐桌不存在' });
  res.json(table);
});

router.get('/public', (req, res) => {
  const tables = db.prepare('SELECT id, table_no, status, sort_order FROM tables ORDER BY sort_order, table_no').all();
  res.json(tables);
});

router.get('/', auth, managerAccess, (req, res) => {
  const tables = db.prepare(`
    SELECT t.*, 
      (SELECT COUNT(*) FROM orders o WHERE o.table_id = t.id AND o.table_session = t.current_session AND o.status != 'cancelled') as active_orders,
      (SELECT COALESCE(SUM(o.total),0) FROM orders o WHERE o.table_id = t.id AND o.table_session = t.current_session AND o.status != 'cancelled') as active_total
    FROM tables t ORDER BY t.sort_order, t.table_no
  `).all();
  res.json(tables);
});

router.post('/', auth, managerAccess, (req, res) => {
  const { table_no, sort_order = 0 } = req.body;
  if (!table_no || !table_no.trim()) { return res.status(400).json({ error: '请输入桌号' }); }
  const exists = db.prepare('SELECT id FROM tables WHERE table_no = ?').get(table_no.trim());
  if (exists) return res.status(400).json({ error: '该桌号已存在' });
  const result = db.prepare('INSERT INTO tables (table_no, status, current_session, sort_order) VALUES (?, ?, ?, ?)').run(
    table_no.trim(), 'idle', crypto.randomUUID(), sort_order
  );
  res.json({ id: result.lastInsertRowid, table_no: table_no.trim() });
});

router.put('/:id', auth, managerAccess, (req, res) => {
  const { table_no, sort_order } = req.body;
  const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.id);
  if (!table) return res.status(404).json({ error: '餐桌不存在' });
  if (table_no && table_no.trim() !== table.table_no) {
    const exists = db.prepare('SELECT id FROM tables WHERE table_no = ? AND id != ?').get(table_no.trim(), req.params.id);
    if (exists) return res.status(400).json({ error: '该桌号已存在' });
  }
  db.prepare('UPDATE tables SET table_no = ?, sort_order = ? WHERE id = ?').run(
    table_no ? table_no.trim() : table.table_no,
    sort_order !== undefined ? sort_order : table.sort_order,
    req.params.id
  );
  res.json({ success: true });
});

router.delete('/:id', auth, managerAccess, (req, res) => {
  db.prepare('DELETE FROM tables WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/:id/clear', auth, (req, res) => {
  const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.id);
  if (!table) return res.status(404).json({ error: '餐桌不存在' });
  const newSession = crypto.randomUUID();
  db.prepare('UPDATE tables SET current_session = ?, status = ? WHERE id = ?').run(newSession, 'idle', req.params.id);
  res.json({ success: true, new_session: newSession });
});

router.post('/:id/occupy', auth, (req, res) => {
  const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.id);
  if (!table) return res.status(404).json({ error: '餐桌不存在' });
  db.prepare('UPDATE tables SET status = ? WHERE id = ?').run('occupied', req.params.id);
  res.json({ success: true });
});

module.exports = router;
