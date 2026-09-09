const express = require('express');
const db = require('../db');
const { auth, managerAccess } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const { product_category_id } = req.query;
  let categories = db.prepare('SELECT * FROM flavor_categories WHERE enabled = 1 ORDER BY sort_order, id').all();
  if (product_category_id) {
    categories = categories.filter(cat => {
      if (!cat.category_ids) return true;
      try { const ids = JSON.parse(cat.category_ids); return ids.length === 0 || ids.includes(parseInt(product_category_id)); } catch (e) { return true; }
    });
  }
  const catIds = categories.map(c => c.id);
  let tags = [];
  if (catIds.length > 0) {
    const placeholders = catIds.map(() => '?').join(',');
    tags = db.prepare(`SELECT ft.* FROM flavor_tags ft WHERE ft.enabled = 1 AND ft.category_id IN (${placeholders}) ORDER BY ft.sort_order, ft.id`).all(...catIds);
  }
  const grouped = {};
  tags.forEach(tag => {
    if (!grouped[tag.category]) grouped[tag.category] = [];
    grouped[tag.category].push(tag);
  });
  res.json({ tags, grouped });
});

router.get('/all', auth, managerAccess, (req, res) => {
  const tags = db.prepare('SELECT * FROM flavor_tags ORDER BY category_id, sort_order, id').all();
  res.json(tags);
});

router.post('/', auth, managerAccess, (req, res) => {
  const { category_id, category = '其他', name, extra_price = 0, is_default = 0, sort_order = 0, enabled = 1 } = req.body;
  if (!name) return res.status(400).json({ error: '标签名称必填' });
  let catName = category;
  let catId = category_id;
  if (category_id) {
    const cat = db.prepare('SELECT * FROM flavor_categories WHERE id = ?').get(category_id);
    if (cat) catName = cat.name;
  }
  const result = db.prepare('INSERT INTO flavor_tags (category_id, category, name, extra_price, is_default, sort_order, enabled) VALUES (?, ?, ?, ?, ?, ?, ?)').run(catId || null, catName, name, parseFloat(extra_price) || 0, is_default ? 1 : 0, sort_order, enabled ? 1 : 0);
  res.json({ id: result.lastInsertRowid });
});

router.put('/:id', auth, managerAccess, (req, res) => {
  const { category_id, category, name, extra_price, is_default, sort_order, enabled } = req.body;
  const fields = [];
  const values = [];
  if (category_id !== undefined) {
    fields.push('category_id = ?');
    values.push(category_id || null);
    if (category_id) {
      const cat = db.prepare('SELECT name FROM flavor_categories WHERE id = ?').get(category_id);
      if (cat) { fields.push('category = ?'); values.push(cat.name); }
    }
  }
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

router.delete('/:id', auth, managerAccess, (req, res) => {
  db.prepare('DELETE FROM flavor_tags WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;