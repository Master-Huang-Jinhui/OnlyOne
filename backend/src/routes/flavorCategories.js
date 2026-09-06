const express = require('express');
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// 获取所有启用的大类（前台用，带小类）
router.get('/', (req, res) => {
  const categories = db.prepare('SELECT * FROM flavor_categories WHERE enabled = 1 ORDER BY sort_order, id').all();
  const tags = db.prepare('SELECT * FROM flavor_tags WHERE enabled = 1 ORDER BY sort_order, id').all();
  const result = categories.map(cat => ({
    ...cat,
    tags: tags.filter(t => t.category_id === cat.id)
  }));
  res.json(result);
});

// 获取所有大类（后台用，含禁用的，带小类）
router.get('/all', auth, adminOnly, (req, res) => {
  const categories = db.prepare('SELECT * FROM flavor_categories ORDER BY sort_order, id').all();
  const tags = db.prepare('SELECT * FROM flavor_tags ORDER BY sort_order, id').all();
  const result = categories.map(cat => ({
    ...cat,
    tags: tags.filter(t => t.category_id === cat.id)
  }));
  res.json(result);
});

// 新增大类
router.post('/', auth, adminOnly, (req, res) => {
  const { name, sort_order = 0, enabled = 1 } = req.body;
  if (!name) return res.status(400).json({ error: '请填写分类名称' });
  const exists = db.prepare('SELECT id FROM flavor_categories WHERE name = ?').get(name);
  if (exists) return res.status(400).json({ error: '该分类已存在' });
  const r = db.prepare('INSERT INTO flavor_categories (name, sort_order, enabled) VALUES (?, ?, ?)').run(name, sort_order, enabled);
  res.json({ id: r.lastInsertRowid, name, sort_order, enabled });
});

// 编辑大类
router.put('/:id', auth, adminOnly, (req, res) => {
  const { name, sort_order, enabled } = req.body;
  const cat = db.prepare('SELECT * FROM flavor_categories WHERE id = ?').get(req.params.id);
  if (!cat) return res.status(404).json({ error: '分类不存在' });
  db.prepare('UPDATE flavor_categories SET name = ?, sort_order = ?, enabled = ? WHERE id = ?').run(
    name || cat.name,
    sort_order !== undefined ? sort_order : cat.sort_order,
    enabled !== undefined ? enabled : cat.enabled,
    req.params.id
  );
  // 同步更新 flavor_tags 的 category 字段（冗余字段）
  if (name && name !== cat.name) {
    db.prepare('UPDATE flavor_tags SET category = ? WHERE category_id = ?').run(name, req.params.id);
  }
  res.json({ success: true });
});

// 删除大类
router.delete('/:id', auth, adminOnly, (req, res) => {
  const tagCount = db.prepare('SELECT COUNT(*) as cnt FROM flavor_tags WHERE category_id = ?').get(req.params.id).cnt;
  if (tagCount > 0) return res.status(400).json({ error: `该分类下还有 ${tagCount} 个口味标签，请先删除或转移` });
  db.prepare('DELETE FROM flavor_categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
