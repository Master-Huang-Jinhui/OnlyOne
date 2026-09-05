const express = require('express');
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// 备忘录列表
router.get('/', (req, res) => {
  const { type } = req.query;
  let sql = 'SELECT * FROM memos';
  const params = [];
  if (type) { sql += ' WHERE type = ?'; params.push(type); }
  sql += " ORDER BY completed, CASE priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END, id DESC";
  const memos = db.prepare(sql).all(...params);
  res.json(memos);
});

// 创建备忘录
router.post('/', adminOnly, (req, res) => {
  const { title, content, type = 'memo', priority = 'normal' } = req.body;
  if (!title) return res.status(400).json({ error: '标题必填' });
  const result = db.prepare('INSERT INTO memos (title, content, type, priority) VALUES (?, ?, ?, ?)').run(title, content, type, priority);
  res.json({ id: result.lastInsertRowid });
});

// 更新备忘录
router.put('/:id', adminOnly, (req, res) => {
  const { title, content, type, priority, completed } = req.body;
  const fields = [];
  const values = [];
  if (title !== undefined) { fields.push('title = ?'); values.push(title); }
  if (content !== undefined) { fields.push('content = ?'); values.push(content); }
  if (type !== undefined) { fields.push('type = ?'); values.push(type); }
  if (priority !== undefined) { fields.push('priority = ?'); values.push(priority); }
  if (completed !== undefined) { fields.push('completed = ?'); values.push(completed ? 1 : 0); }
  if (fields.length === 0) return res.status(400).json({ error: '没有要更新的字段' });
  values.push(req.params.id);
  db.prepare(`UPDATE memos SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ success: true });
});

// 删除备忘录
router.delete('/:id', adminOnly, (req, res) => {
  db.prepare('DELETE FROM memos WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
