const express = require('express');
const db = require('../db');
const { auth, managerAccess } = require('../middleware/auth');

const router = express.Router();

// ===== 轮播图 =====
// 获取启用的轮播图列表（前台公开）
router.post('/carousel/list', (req, res) => {
  const items = db.prepare('SELECT * FROM carousel WHERE enabled = 1 ORDER BY sort_order, id').all();
  res.json(items);
});

// 获取所有轮播图（含禁用，后台管理用）
router.post('/carousel/all', auth, managerAccess, (req, res) => {
  const items = db.prepare('SELECT * FROM carousel ORDER BY sort_order, id').all();
  res.json(items);
});

// 新增轮播图
router.post('/carousel', auth, managerAccess, (req, res) => {
  const { image, title, link, sort_order = 0, enabled = 1 } = req.body;
  const result = db.prepare('INSERT INTO carousel (image, title, link, sort_order, enabled) VALUES (?, ?, ?, ?, ?)').run(
    image, title, link, sort_order, enabled ? 1 : 0
  );
  res.json({ id: result.lastInsertRowid });
});

// 更新轮播图
router.post('/carousel/update/:id', auth, managerAccess, (req, res) => {
  const allowed = ['image', 'title', 'link', 'sort_order', 'enabled'];
  const fields = [];
  const values = [];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(key === 'enabled' ? (req.body[key] ? 1 : 0) : req.body[key]);
    }
  }
  values.push(req.params.id);
  db.prepare(`UPDATE carousel SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ success: true });
});

// 删除轮播图
router.post('/carousel/delete/:id', auth, managerAccess, (req, res) => {
  db.prepare('DELETE FROM carousel WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== 内容区块 =====
// 获取所有内容区块（前台公开）
router.post('/blocks', (req, res) => {
  const blocks = db.prepare('SELECT * FROM content_blocks ORDER BY sort_order, id').all();
  blocks.forEach(b => b.images = JSON.parse(b.images || '[]'));
  res.json(blocks);
});

// 根据 block_key 获取单个内容区块详情
router.post('/blocks/detail/:key', (req, res) => {
  const block = db.prepare('SELECT * FROM content_blocks WHERE block_key = ?').get(req.params.key);
  if (!block) return res.status(404).json({ error: '内容不存在' });
  block.images = JSON.parse(block.images || '[]');
  res.json(block);
});

// 保存内容区块（存在则更新，不存在则插入）
router.post('/blocks/:key', auth, managerAccess, (req, res) => {
  const { title, title_en, content, content_en, images, sort_order } = req.body;
  const existing = db.prepare('SELECT id FROM content_blocks WHERE block_key = ?').get(req.params.key);
  if (existing) {
    const fields = [];
    const values = [];
    if (title !== undefined) { fields.push('title = ?'); values.push(title); }
    if (title_en !== undefined) { fields.push('title_en = ?'); values.push(title_en); }
    if (content !== undefined) { fields.push('content = ?'); values.push(content); }
    if (content_en !== undefined) { fields.push('content_en = ?'); values.push(content_en); }
    if (images !== undefined) { fields.push('images = ?'); values.push(JSON.stringify(images)); }
    if (sort_order !== undefined) { fields.push('sort_order = ?'); values.push(sort_order); }
    fields.push("updated_at = datetime('now','localtime')");
    values.push(req.params.key);
    db.prepare(`UPDATE content_blocks SET ${fields.join(', ')} WHERE block_key = ?`).run(...values);
  } else {
    db.prepare(`INSERT INTO content_blocks (block_key, title, title_en, content, content_en, images, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      req.params.key, title || '', title_en || '', content || '', content_en || '', JSON.stringify(images || []), sort_order || 0
    );
  }
  res.json({ success: true });
});

// ===== 自定义内容板块 =====
// 获取启用的自定义板块列表（前台公开）
router.post('/sections/list', (req, res) => {
  const sections = db.prepare('SELECT * FROM content_sections WHERE enabled = 1 ORDER BY sort_order, id').all();
  res.json(sections);
});

// 获取所有自定义板块（含禁用，后台管理用）
router.post('/sections/all', auth, managerAccess, (req, res) => {
  const sections = db.prepare('SELECT * FROM content_sections ORDER BY sort_order, id').all();
  res.json(sections);
});

// 新增自定义板块
router.post('/sections', auth, managerAccess, (req, res) => {
  const { title, title_en = '', content = '', content_en = '', icon = '📌', image = '', layout = 'left', sort_order = 0, enabled = 1 } = req.body;
  if (!title) return res.status(400).json({ error: '请填写板块标题' });
  const result = db.prepare('INSERT INTO content_sections (title, title_en, content, content_en, icon, image, layout, sort_order, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    title, title_en, content, content_en, icon, image, layout, sort_order, enabled ? 1 : 0
  );
  res.json({ id: result.lastInsertRowid });
});

// 更新自定义板块
router.post('/sections/update/:id', auth, managerAccess, (req, res) => {
  const allowed = ['title', 'title_en', 'content', 'content_en', 'icon', 'image', 'layout', 'sort_order', 'enabled'];
  const fields = [];
  const values = [];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(key === 'enabled' ? (req.body[key] ? 1 : 0) : req.body[key]);
    }
  }
  if (fields.length === 0) return res.status(400).json({ error: '没有要更新的字段' });
  values.push(req.params.id);
  db.prepare(`UPDATE content_sections SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ success: true });
});

// 删除自定义板块
router.post('/sections/delete/:id', auth, managerAccess, (req, res) => {
  db.prepare('DELETE FROM content_sections WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== 新品上市 =====
// 获取启用的新品列表（前台公开）
router.post('/new-products/list', (req, res) => {
  const items = db.prepare('SELECT * FROM new_products WHERE enabled = 1 ORDER BY sort_order, id').all();
  res.json(items);
});

// 获取所有新品（含禁用，后台管理用）
router.post('/new-products/all', auth, managerAccess, (req, res) => {
  const items = db.prepare('SELECT * FROM new_products ORDER BY sort_order, id').all();
  res.json(items);
});

// 新增新品
router.post('/new-products', auth, managerAccess, (req, res) => {
  const { name, name_en = '', description = '', description_en = '', image = '', sort_order = 0, enabled = 1 } = req.body;
  if (!name) return res.status(400).json({ error: '请填写新品名称' });
  const result = db.prepare('INSERT INTO new_products (name, name_en, description, description_en, image, sort_order, enabled) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    name, name_en, description, description_en, image, sort_order, enabled ? 1 : 0
  );
  res.json({ id: result.lastInsertRowid });
});

// 更新新品
router.post('/new-products/update/:id', auth, managerAccess, (req, res) => {
  const allowed = ['name', 'name_en', 'description', 'description_en', 'image', 'sort_order', 'enabled'];
  const fields = [];
  const values = [];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(key === 'enabled' ? (req.body[key] ? 1 : 0) : req.body[key]);
    }
  }
  if (fields.length === 0) return res.status(400).json({ error: '没有要更新的字段' });
  values.push(req.params.id);
  db.prepare(`UPDATE new_products SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ success: true });
});

// 删除新品
router.post('/new-products/delete/:id', auth, managerAccess, (req, res) => {
  db.prepare('DELETE FROM new_products WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
