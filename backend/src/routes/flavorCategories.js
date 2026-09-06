const express = require('express');
const db = require('../db');
const { auth, managerAccess } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const categories = db.prepare('SELECT * FROM flavor_categories WHERE enabled = 1 ORDER BY sort_order, id').all();
  const tags = db.prepare('SELECT * FROM flavor_tags WHERE enabled = 1 ORDER BY sort_order, id').all();
  const result = categories.map(cat => ({
    ...cat,
    tags: tags.filter(t => t.category_id === cat.id)
  }));
  res.json(result);
});

router.get('/all', auth, managerAccess, (req, res) => {
  const categories = db.prepare('SELECT * FROM flavor_categories ORDER BY sort_order, id').all();
  const tags = db.prepare('SELECT * FROM flavor_tags ORDER BY sort_order, id').all();
  const result = categories.map(cat => ({
    ...cat,
    tags: tags.filter(t => t.category_id === cat.id)
  }));
  res.json(result);
});

router.post('/', auth, managerAccess, (req, res) => {
  const { name, sort_order = 0, enabled = 1 } = req.body;
  if (!name) return res.status(400).json({ error: '请填写分类名称' });
  const exists = db.prepare('SELECT id FROM flavor_categories WHERE name = ?').get(name);
  if (exists) return res.status(400).json({ error: '该分类已存在' });
  const r = db.prepare('INSERT INTO flavor_categories (name, sort_order, enabled) VALUES (?, ?, ?)').run(name, sort_order, enabled);
  res.json({ id: r.lastInsertRowid, name, sort_order, enabled });
});

router.put('/:id', auth, managerAccess, (req, res) => {
  const { name, sort_order, enabled } = req.body;
  const cat = db.prepare('SELECT * FROM flavor_categories WHERE id = ?').get(req.params.id);
  if (!cat) return res.status(404).json({ error: '分类不存在' });
  db.prepare('UPDATE flavor_categories SET name = ?, sort_order = ?, enabled = ? WHERE id = ?').run(
    name || cat.name,
    sort_order !== undefined ? sort_order : cat.sort_order,
    enabled !== undefined ? enabled : cat.enabled,
    req.params.id
  );
  if (name && name !== cat.name) {
    db.prepare('UPDATE flavor_tags SET category = ? WHERE category_id = ?').run(name, req.params.id);
  }
  res.json({ success: true });
});

router.delete('/:id', auth, managerAccess, (req, res) => {
  const tagCount = db.prepare('SELECT COUNT(*) as cnt FROM flavor_tags WHERE category_id = ?').get(req.params.id).cnt;
  if (tagCount > 0) return res.status(400).json({ error: `该分类下还有 ${tagCount} 个口味标签，请先删除或转移` });
  db.prepare('DELETE FROM flavor_categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
