const express = require('express');
const db = require('../db');
const { auth, managerAccess } = require('../middleware/auth');

const router = express.Router();

const parseCategoryIds = (str) => {
  if (!str) return [];
  try { return JSON.parse(str); } catch (e) { return []; }
};

const isApplicable = (flavorCat, productCategoryId) => {
  if (!productCategoryId) return true;
  const ids = parseCategoryIds(flavorCat.category_ids);
  return ids.length > 0 && ids.includes(parseInt(productCategoryId));
};

// 获取所有启用的大类（前台用，带小类），支持按商品分类过滤
router.get('/', (req, res) => {
  const { product_category_id } = req.query;
  let categories = db.prepare('SELECT * FROM flavor_categories WHERE enabled = 1 ORDER BY sort_order, id').all();
  if (product_category_id) {
    categories = categories.filter(cat => isApplicable(cat, product_category_id));
  }
  const catIds = categories.map(c => c.id);
  let tags = [];
  if (catIds.length > 0) {
    const placeholders = catIds.map(() => '?').join(',');
    tags = db.prepare(`SELECT * FROM flavor_tags WHERE enabled = 1 AND category_id IN (${placeholders}) ORDER BY sort_order, id`).all(...catIds);
  }
  const result = categories.map(cat => ({
    ...cat,
    category_ids: parseCategoryIds(cat.category_ids),
    tags: tags.filter(t => t.category_id === cat.id)
  }));
  res.json(result);
});

// 获取所有大类（后台用，含禁用的，带小类）
router.get('/all', auth, managerAccess, (req, res) => {
  const categories = db.prepare('SELECT * FROM flavor_categories ORDER BY sort_order, id').all();
  const tags = db.prepare('SELECT * FROM flavor_tags ORDER BY sort_order, id').all();
  const result = categories.map(cat => ({
    ...cat,
    category_ids: parseCategoryIds(cat.category_ids),
    tags: tags.filter(t => t.category_id === cat.id)
  }));
  res.json(result);
});

// 新增大类
router.post('/', auth, managerAccess, (req, res) => {
  const { name, sort_order = 0, enabled = 1, category_ids = [] } = req.body;
  if (!name) return res.status(400).json({ error: '请填写分类名称' });
  const exists = db.prepare('SELECT id FROM flavor_categories WHERE name = ?').get(name);
  if (exists) return res.status(400).json({ error: '该分类已存在' });
  const catIdsStr = JSON.stringify(Array.isArray(category_ids) ? category_ids : []);
  const r = db.prepare('INSERT INTO flavor_categories (name, sort_order, enabled, category_ids) VALUES (?, ?, ?, ?)').run(name, sort_order, enabled, catIdsStr);
  res.json({ id: r.lastInsertRowid, name, sort_order, enabled, category_ids });
});

// 编辑大类
router.put('/:id', auth, managerAccess, (req, res) => {
  const { name, sort_order, enabled, category_ids } = req.body;
  const cat = db.prepare('SELECT * FROM flavor_categories WHERE id = ?').get(req.params.id);
  if (!cat) return res.status(404).json({ error: '分类不存在' });
  const catIdsStr = category_ids !== undefined ? JSON.stringify(Array.isArray(category_ids) ? category_ids : []) : cat.category_ids;
  db.prepare('UPDATE flavor_categories SET name = ?, sort_order = ?, enabled = ?, category_ids = ? WHERE id = ?').run(
    name || cat.name,
    sort_order !== undefined ? sort_order : cat.sort_order,
    enabled !== undefined ? enabled : cat.enabled,
    catIdsStr,
    req.params.id
  );
  if (name && name !== cat.name) {
    db.prepare('UPDATE flavor_tags SET category = ? WHERE category_id = ?').run(name, req.params.id);
  }
  res.json({ success: true });
});

// 删除大类
router.delete('/:id', auth, managerAccess, (req, res) => {
  const tagCount = db.prepare('SELECT COUNT(*) as cnt FROM flavor_tags WHERE category_id = ?').get(req.params.id).cnt;
  if (tagCount > 0) return res.status(400).json({ error: `该分类下还有 ${tagCount} 个口味标签，请先删除或转移` });
  db.prepare('DELETE FROM flavor_categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
