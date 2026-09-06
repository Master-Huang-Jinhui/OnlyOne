const express = require('express');
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// 轮播图
router.get('/carousel', (req, res) => {
  const list = db.prepare('SELECT * FROM carousel WHERE enabled = 1 ORDER BY sort_order, id').all();
  res.json(list);
});

router.get('/carousel/all', auth, adminOnly, (req, res) => {
  const list = db.prepare('SELECT * FROM carousel ORDER BY sort_order, id').all();
  res.json(list);
});

router.post('/carousel', auth, adminOnly, (req, res) => {
  const { image = '', title = '', link = '', sort_order = 0, enabled = 1 } = req.body;
  const result = db.prepare('INSERT INTO carousel (image, title, link, sort_order, enabled) VALUES (?, ?, ?, ?, ?)').run(
    image, title, link, sort_order, enabled ? 1 : 0
  );
  res.json({ id: result.lastInsertRowid });
});

router.put('/carousel/:id', auth, adminOnly, (req, res) => {
  const allowed = ['image', 'title', 'link', 'sort_order', 'enabled'];
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
  db.prepare(`UPDATE carousel SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ success: true });
});

router.delete('/carousel/:id', auth, adminOnly, (req, res) => {
  db.prepare('DELETE FROM carousel WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// 内容块（品牌故事、茶品溯源等）
router.get('/blocks', (req, res) => {
  const blocks = db.prepare('SELECT * FROM content_blocks ORDER BY sort_order, id').all();
  const result = {};
  blocks.forEach(b => { result[b.block_key] = b; });
  res.json(result);
});

router.put('/blocks/:key', auth, adminOnly, (req, res) => {
  const { title, title_en, content, content_en, images } = req.body;
  const existing = db.prepare('SELECT * FROM content_blocks WHERE block_key = ?').get(req.params.key);
  if (existing) {
    db.prepare('UPDATE content_blocks SET title = ?, title_en = ?, content = ?, content_en = ?, images = ?, updated_at = datetime("now","localtime") WHERE block_key = ?').run(
      title ?? existing.title, title_en ?? existing.title_en, content ?? existing.content, content_en ?? existing.content_en, images ? JSON.stringify(images) : existing.images, req.params.key
    );
  } else {
    db.prepare('INSERT INTO content_blocks (block_key, title, title_en, content, content_en, images, sort_order) VALUES (?, ?, ?, ?, ?, ?, 0)').run(
      req.params.key, title || '', title_en || '', content || '', content_en || '', images ? JSON.stringify(images) : '[]'
    );
  }
  res.json({ success: true });
});

// 自定义内容板块
router.get('/sections', (req, res) => {
  const sections = db.prepare('SELECT * FROM content_sections WHERE enabled = 1 ORDER BY sort_order, id').all();
  res.json(sections);
});

router.get('/sections/all', auth, adminOnly, (req, res) => {
  const sections = db.prepare('SELECT * FROM content_sections ORDER BY sort_order, id').all();
  res.json(sections);
});

router.post('/sections', auth, adminOnly, (req, res) => {
  const { title, title_en = '', content = '', content_en = '', icon = '📌', image = '', layout = 'left', sort_order = 0, enabled = 1 } = req.body;
  if (!title) return res.status(400).json({ error: '请填写板块标题' });
  const result = db.prepare('INSERT INTO content_sections (title, title_en, content, content_en, icon, image, layout, sort_order, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    title, title_en, content, content_en, icon, image, layout, sort_order, enabled ? 1 : 0
  );
  res.json({ id: result.lastInsertRowid });
});

router.put('/sections/:id', auth, adminOnly, (req, res) => {
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

router.delete('/sections/:id', auth, adminOnly, (req, res) => {
  db.prepare('DELETE FROM content_sections WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
