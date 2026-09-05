const express = require('express');
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');
const router = express.Router();
router.get('/', auth, (req, res) => {
  const forms = db.prepare('SELECT * FROM forms ORDER BY id DESC').all();
  forms.forEach(f => f.fields = JSON.parse(f.fields || '[]'));
  res.json(forms);
});
router.get('/public/:id', (req, res) => {
  const form = db.prepare('SELECT * FROM forms WHERE id = ? AND enabled = 1').get(req.params.id);
  if (!form) return res.status(404).json({ error: '表单不存在' });
  form.fields = JSON.parse(form.fields || '[]');
  res.json(form);
});
router.post('/', auth, adminOnly, (req, res) => {
  const { name, description, fields = [], enabled = 1 } = req.body;
  if (!name) return res.status(400).json({ error: '表单名称必填' });
  const r = db.prepare('INSERT INTO forms (name, description, fields, enabled) VALUES (?, ?, ?, ?)').run(name, description, JSON.stringify(fields), enabled ? 1 : 0);
  res.json({ id: r.lastInsertRowid });
});
router.put('/:id', auth, adminOnly, (req, res) => {
  const { name, description, fields, enabled } = req.body;
  const f = [], v = [];
  if (name !== undefined) { f.push('name = ?'); v.push(name); }
  if (description !== undefined) { f.push('description = ?'); v.push(description); }
  if (fields !== undefined) { f.push('fields = ?'); v.push(JSON.stringify(fields)); }
  if (enabled !== undefined) { f.push('enabled = ?'); v.push(enabled ? 1 : 0); }
  if (f.length === 0) return res.status(400).json({ error: '没有要更新的字段' });
  v.push(req.params.id);
  db.prepare('UPDATE forms SET ' + f.join(', ') + ' WHERE id = ?').run(...v);
  res.json({ success: true });
});
router.delete('/:id', auth, adminOnly, (req, res) => {
  db.prepare('DELETE FROM forms WHERE id = ?').run(req.params.id);
  db.prepare('DELETE FROM form_submissions WHERE form_id = ?').run(req.params.id);
  res.json({ success: true });
});
router.post('/:id/submit', (req, res) => {
  const form = db.prepare('SELECT * FROM forms WHERE id = ?').get(req.params.id);
  if (!form) return res.status(404).json({ error: '表单不存在' });
  db.prepare('INSERT INTO form_submissions (form_id, data) VALUES (?, ?)').run(req.params.id, JSON.stringify(req.body || {}));
  res.json({ success: true });
});
router.get('/:id/submissions', auth, adminOnly, (req, res) => {
  const subs = db.prepare('SELECT * FROM form_submissions WHERE form_id = ? ORDER BY id DESC').all();
  subs.forEach(s => s.data = JSON.parse(s.data || '{}'));
  res.json(subs);
});
module.exports = router;
