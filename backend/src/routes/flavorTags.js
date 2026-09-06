const express = require('express');
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// 获取所有启用的口味标签（前台用，只返回启用大类下的启用小类）
router.get('/', (req, res) => {
  const tags = db.prepare(`
    SELECT ft.* FROM flavor_tags ft
    JOIN flavor_categories fc ON ft.category_id = fc.id
    WHERE ft.enabled = 1 AND fc.enabled = 1
    ORDER BY fc.sort_order, ft.sort_order, ft.id
  `).all();
  // 按分类分组
  const grouped = {};
  tags.forEach(tag => {
    if (!grouped[tag.category]) grouped[tag.category] = [];
    grouped[tag.category].push(tag);
  });
  res.json({ tags, grouped });
});

// 获取所有口味标签（后台管理用，含禁用的）
router.get('/all', auth, adminOnly, (req, res) => {
  const tags = db.prepare('SELECT * FROM flavor_tags ORDER BY category_id, sort_order, id').all();
  res.json(tags);
});

// 新增口味标签
router.post('/', auth, adminOnly, (req, res) => {
  const { category_id, category = '其他', name, extra_price = 0, is_default = 0, sort_order = 0, enabled = 1 } = req.body;
  if (!name) return res.status(400).json({ error: '标签名称必填' });
  let catName = category;
  let catId = category_id;
  if (category_id) {
    const cat = db.prepare('SELECT * FROM flavor_categories WHERE id = ?').get(category_id);
    if (cat) catName = cat.name;
  }
  const result = db.prepare(
    'INSERT INTO flavor_tags (category_id, category, name, extra_price, is_default, sort_order, enabled) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(catId || null, catName, name, parseFloat(extra_price) || 0, is_default ? 1 : 0, sort_order, enabled ? 1 : 0);
  res.json({ id: result.lastInsertRowid });
});

// 更新口味标签
router.put('/:id', auth, adminOnly, (req, res) => {
  const { category_id, category, name, extra_price, is_default, sort_order, enabled } = req.body;
  const fields = [];
  const values = [];
  if (category_id !== undefined) {
    fields.push('category_id = ?');
    values.push(category_id || null);
    // 同步更新 category 冗余字段
    if (category_id) {
      const cat = db.prepare('SELECT name FROM flavor_categories WHERE id = ?').get(category_id);
      if (cat) {
        fields.push('category = ?');
        values.push(cat.name);
      }
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

// 删除口味标签
router.delete('/:id', auth, adminOnly, (req, res) => {
  db.prepare('DELETE FROM flavor_tags WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
