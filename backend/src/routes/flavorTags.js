const express = require('express');
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const tags = db.prepare('SELECT * FROM flavor_tags WHERE enabled = 1 ORDER BY category, sort_order, id').all();
  const grouped = {};
  tags.forEach(tag => {
    if (!grouped[tag.category]) grouped[tag.category] = [];
    grouped[tag.category].push(tag);
  });
  res.json({ tags, grouped });
});

router.get('/all', auth, adminOnly, (req, res) => {
  const tags = db.prepare('SELECT * FROM flavor_tags ORDER BY category, sort_order, id').all();
  res.json(tags);
});

router.post('/', auth, adminOnly, (req, res) => {
  const { category = '其他', name, extra_price = 0, is_default = 0, sort_order = 0, enabled = 1 } = req.body;
  if (!name) return res.status(400).json({ error: '标签名称必填' });
  const result = db.prepare(
    'INSERT INTO flavor_tags (category, name, extra_price, is_default, sort_order, enabled) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(category, name, parseFloat(extra_price) || 0, is_default ? 1 : 0, sort_order, enabled ? 1 : 0);
  res.json({ id: result.lastInsertRowid });
});

router.put('/:id', auth, adminOnly, (req, res) => {
  const { category, name, extra_price, is_default, sort_order, enabled } = req.body;
  const fields = [];
  const values = [];
  if (category !== undefined) { fields.push('category = ?'); values.push(category); }
  if (name !== undefined) { fields.push('name = ?'); values.push(name); }
  if (extra_price !== undefined) { fields.push('extra_price = ?'); values.push(parseFloat(extra_price) || 0); }
  if (is_default !== undefined) { fields.push('is_default = ?'); values.push(is_default ? 1 : 0); }
  if (sort_order !== undefined) { fields.push('sort_order = ?'); values.push(sort_order); }
  if (enabled !== undefined) { fields.push('enabled = ?'); values.push(enabled ? 1 : 0); }
  if (fields.length === 0) return res.status(400).json({ error: '没有要更新的字段' });
  values.push(req.params.id);
  db.prepare(`UPDATE flavor_tags SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ success: true });
});

router.delete('/:id', auth, adminOnly, (req, res) => {
  db.prepare('DELETE FROM flavor_tags WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
