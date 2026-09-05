const express = require('express');
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');
const router = express.Router();
router.use(auth);
router.get('/', (req, res) => {
  const { type } = req.query;
  let sql = 'SELECT * FROM memos';
  const params = [];
  if (type) { sql += ' WHERE type = ?'; params.push(type); }
  sql += ' ORDER BY completed, CASE priority WHEN "high" THEN 0 WHEN "normal" THEN 1 ELSE 2 END, id DESC';
  res.json(db.prepare(sql).all(...params));
});
router.post('/', adminOnly, (req, res) => {
  const { title, content, type = 'memo', priority = 'normal' } = req.body;
  if (!title) return res.status(400).json({ error: '标题必填' });
  const r = db.prepare('INSERT INTO memos (title, content, type, priority) VALUES (?, ?, ?, ?)').run(title, content, type, priority);
  res.json({ id: r.lastInsertRowid });
});
router.put('/:id', adminOnly, (req, res) => {
  const { title, content, type, priority, completed } = req.body;
  const f = [], v = [];
  if (title !== undefined) { f.push('title = ?'); v.push(title); }
  if (content !== undefined) { f.push('content = ?'); v.push(content); }
  if (type !== undefined) { f.push('type = ?'); v.push(type); }
  if (priority !== undefined) { f.push('priority = ?'); v.push(priority); }
  if (completed !== undefined) { f.push('completed = ?'); v.push(completed ? 1 : 0); }
  if (f.length === 0) return res.status(400).json({ error: '没有要更新的字段' });
  v.push(req.params.id);
  db.prepare('UPDATE memos SET ' + f.join(', ') + ' WHERE id = ?').run(...v);
  res.json({ success: true });
});
router.delete('/:id', adminOnly, (req, res) => {
  db.prepare('DELETE FROM memos WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});
module.exports = router;
