const express = require('express');
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');
const router = express.Router();
router.get('/categories', (req, res) => res.json(db.prepare('SELECT * FROM categories WHERE enabled = 1 ORDER BY sort_order, id').all()));
router.get('/categories/all', auth, adminOnly, (req, res) => res.json(db.prepare('SELECT * FROM categories ORDER BY sort_order, id').all()));
router.post('/categories', auth, adminOnly, (req, res) => {
  const { name, name_en, sort_order = 0 } = req.body;
  if (!name) return res.status(400).json({ error: '分类名称必填' });
  const r = db.prepare('INSERT INTO categories (name, name_en, sort_order) VALUES (?, ?, ?)').run(name, name_en, sort_order);
  res.json({ id: r.lastInsertRowid });
});
router.put('/categories/:id', auth, adminOnly, (req, res) => {
  const { name, name_en, sort_order, enabled } = req.body;
  const f = [], v = [];
  if (name !== undefined) { f.push('name = ?'); v.push(name); }
  if (name_en !== undefined) { f.push('name_en = ?'); v.push(name_en); }
  if (sort_order !== undefined) { f.push('sort_order = ?'); v.push(sort_order); }
  if (enabled !== undefined) { f.push('enabled = ?'); v.push(enabled ? 1 : 0); }
  v.push(req.params.id);
  db.prepare('UPDATE categories SET ' + f.join(', ') + ' WHERE id = ?').run(...v);
  res.json({ success: true });
});
router.delete('/categories/:id', auth, adminOnly, (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});
router.get('/', (req, res) => {
  const { category_id } = req.query;
  let sql = 'SELECT p.*, c.name as category_name, c.name_en as category_name_en FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.available = 1';
  const params = [];
  if (category_id) { sql += ' AND p.category_id = ?'; params.push(category_id); }
  sql += ' ORDER BY p.sort_order, p.id';
  res.json(db.prepare(sql).all(...params));
});
router.get('/all', auth, adminOnly, (req, res) => {
  res.json(db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.sort_order, p.id').all());
});
router.get('/:id', (req, res) => {
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: '商品不存在' });
  res.json(p);
});
router.post('/', auth, adminOnly, (req, res) => {
  const { name, name_en, category_id, price, description, description_en, image, available = 1, is_recommend = 0, sort_order = 0 } = req.body;
  if (!name || price === undefined) return res.status(400).json({ error: '商品名称和价格必填' });
  const r = db.prepare('INSERT INTO products (name, name_en, category_id, price, description, description_en, image, available, is_recommend, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(name, name_en, category_id, price, description, description_en, image, available ? 1 : 0, is_recommend ? 1 : 0, sort_order);
  res.json({ id: r.lastInsertRowid });
});
router.put('/:id', auth, adminOnly, (req, res) => {
  const allowed = ['name', 'name_en', 'category_id', 'price', 'description', 'description_en', 'image', 'available', 'is_recommend', 'sort_order'];
  const f = [], v = [];
  for (const key of allowed) {
    if (req.body[key] !== undefined) { f.push(key + ' = ?'); v.push(['available', 'is_recommend'].includes(key) ? (req.body[key] ? 1 : 0) : req.body[key]); }
  }
  if (f.length === 0) return res.status(400).json({ error: '没有要更新的字段' });
  v.push(req.params.id);
  db.prepare('UPDATE products SET ' + f.join(', ') + ' WHERE id = ?').run(...v);
  res.json({ success: true });
});
router.delete('/:id', auth, adminOnly, (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});
module.exports = router;
