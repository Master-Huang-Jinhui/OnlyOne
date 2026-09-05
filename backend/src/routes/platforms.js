const express = require('express');
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, (req, res) => {
  const platforms = db.prepare('SELECT * FROM platforms ORDER BY sort_order, id').all();
  platforms.forEach(p => p.weekly_status = JSON.parse(p.weekly_status || '{}'));
  res.json(platforms);
});

router.get('/public', (req, res) => {
  const platforms = db.prepare('SELECT id, name, logo, url, phone, note FROM platforms WHERE enabled = 1 ORDER BY sort_order, id').all();
  res.json(platforms);
});

router.post('/', auth, adminOnly, (req, res) => {
  const { name, logo, url, account, password, phone, note, enabled = 1, weekly_status = {}, sort_order = 0 } = req.body;
  if (!name) return res.status(400).json({ error: '平台名称必填' });
  const result = db.prepare(`INSERT INTO platforms (name, logo, url, account, password, phone, note, enabled, weekly_status, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    name, logo, url, account, password, phone, note, enabled ? 1 : 0, JSON.stringify(weekly_status), sort_order
  );
  res.json({ id: result.lastInsertRowid });
});

router.put('/:id', auth, adminOnly, (req, res) => {
  const fields = [];
  const values = [];
  const allowed = ['name', 'logo', 'url', 'account', 'password', 'phone', 'note', 'enabled', 'weekly_status', 'sort_order'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(key === 'weekly_status' ? JSON.stringify(req.body[key]) : (key === 'enabled' ? (req.body[key] ? 1 : 0) : req.body[key]));
    }
  }
  if (fields.length === 0) return res.status(400).json({ error: '没有要更新的字段' });
  values.push(req.params.id);
  db.prepare(`UPDATE platforms SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ success: true });
});

router.delete('/:id', auth, adminOnly, (req, res) => {
  db.prepare('DELETE FROM platforms WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
