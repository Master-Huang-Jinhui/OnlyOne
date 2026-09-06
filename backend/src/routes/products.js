const express = require('express');
const db = require('../db');
const { auth, managerAccess } = require('../middleware/auth');

const router = express.Router();

router.get('/categories', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories WHERE enabled = 1 ORDER BY sort_order, id').all();
  res.json(categories);
});

router.get('/categories/all', auth, managerAccess, (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order, id').all();
  res.json(categories);
});

router.post('/categories', auth, managerAccess, (req, res) => {
  const { name, name_en, sort_order = 0 } = req.body;
  if (!name) return res.status(400).json({ error: '分类名称必填' });
  const result = db.prepare('INSERT INTO categories (name, name_en, sort_order) VALUES (?, ?, ?)').run(name, name_en, sort_order);
  res.json({ id: result.lastInsertRowid });
});

router.put('/categories/:id', auth, managerAccess, (req, res) => {
  const { name, name_en, sort_order, enabled } = req.body;
  const fields = [];
  const values = [];
  if (name !== undefined) { fields.push('name = ?'); values.push(name); }
  if (name_en !== undefined) { fields.push('name_en = ?'); values.push(name_en); }
  if (sort_order !== undefined) { fields.push('sort_order = ?'); values.push(sort_order); }
  if (enabled !== undefined) { fields.push('enabled = ?'); values.push(enabled ? 1 : 0); }
  values.push(req.params.id);
  db.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ success: true });
});

router.delete('/categories/:id', auth, managerAccess, (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.get('/', (req, res) => {
  const { category_id } = req.query;
  let sql = 'SELECT p.*, c.name as category_name, c.name_en as category_name_en FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.available = 1';
  const params = [];
  if (category_id) { sql += ' AND p.category_id = ?'; params.push(category_id); }
  sql += ' ORDER BY p.sort_order, p.id';
  const products = db.prepare(sql).all(...params);
  res.json(products);
});

router.get('/all', auth, managerAccess, (req, res) => {
  const products = db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.sort_order, p.id').all();
  res.json(products);
});

router.get('/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: '商品不存在' });
  res.json(product);
});

router.post('/', auth, managerAccess, (req, res) => {
  const { name, name_en, category_id, price, description, description_en, image, available = 1, is_recommend = 0, sort_order = 0 } = req.body;
  if (!name || price === undefined) return res.status(400).json({ error: '商品名称和价格必填' });
  const result = db.prepare(`INSERT INTO products (name, name_en, category_id, price, description, description_en, image, available, is_recommend, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    name, name_en, category_id, price, description, description_en, image, available ? 1 : 0, is_recommend ? 1 : 0, sort_order
  );
  res.json({ id: result.lastInsertRowid });
});

router.put('/:id', auth, managerAccess, (req, res) => {
  const allowed = ['name', 'name_en', 'category_id', 'price', 'description', 'description_en', 'image', 'available', 'is_recommend', 'sort_order'];
  const fields = [];
  const values = [];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(['available', 'is_recommend'].includes(key) ? (req.body[key] ? 1 : 0) : req.body[key]);
    }
  }
  if (fields.length === 0) return res.status(400).json({ error: '没有要更新的字段' });
  values.push(req.params.id);
  db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ success: true });
});

router.delete('/:id', auth, managerAccess, (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
