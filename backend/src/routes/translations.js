const express = require('express');
const db = require('../db');
const { auth, managerAccess } = require('../middleware/auth');

const router = express.Router();

// 获取所有翻译（公开，前端加载用）
router.get('/', (req, res) => {
  try {
    const { page } = req.query;
    let sql = 'SELECT * FROM translations';
    const params = [];
    if (page) {
      sql += ' WHERE page = ?';
      params.push(page);
    }
    sql += ' ORDER BY page, key';
    const list = db.prepare(sql).all(...params);
    const result = {};
    list.forEach(item => {
      try {
        result[item.key] = {
          ...JSON.parse(item.translations || '{}'),
          _page: item.page,
          _desc: item.description
        };
      } catch (e) {
        result[item.key] = {};
      }
    });
    res.json(result);
  } catch (e) {
    console.error('获取翻译失败:', e.message);
    res.json({});
  }
});

// 获取支持的语言列表（从所有翻译中提取）
router.get('/languages', (req, res) => {
  try {
    const list = db.prepare('SELECT translations FROM translations').all();
    const languages = new Set();
    list.forEach(item => {
      try {
        const trans = JSON.parse(item.translations || '{}');
        Object.keys(trans).forEach(lang => languages.add(lang));
      } catch (e) {}
    });
    const langNames = {
      zh: '中文',
      en: 'English',
      es: 'Español',
      fr: 'Français',
      ja: '日本語',
      ko: '한국어'
    };
    const result = Array.from(languages).map(code => ({
      code,
      name: langNames[code] || code
    }));
    res.json(result);
  } catch (e) {
    console.error('获取语言列表失败:', e.message);
    res.json([{ code: 'zh', name: '中文' }, { code: 'en', name: 'English' }]);
  }
});

// 按页面分组获取（后台管理用）
router.get('/admin', auth, managerAccess, (req, res) => {
  const list = db.prepare('SELECT * FROM translations ORDER BY page, key').all();
  const byPage = {};
  list.forEach(item => {
    if (!byPage[item.page]) byPage[item.page] = [];
    byPage[item.page].push({
      id: item.id,
      key: item.key,
      page: item.page,
      description: item.description,
      translations: JSON.parse(item.translations || '{}')
    });
  });
  res.json({ byPage, total: list.length });
});

// 添加翻译
router.post('/', auth, managerAccess, (req, res) => {
  const { key, page = 'common', description = '', translations = {} } = req.body;
  if (!key) return res.status(400).json({ error: 'key 必填' });
  
  const exists = db.prepare('SELECT id FROM translations WHERE key = ?').get(key);
  if (exists) return res.status(400).json({ error: '该key已存在' });
  
  db.prepare('INSERT INTO translations (key, page, description, translations) VALUES (?, ?, ?, ?)').run(
    key, page, description, JSON.stringify(translations)
  );
  res.json({ success: true });
});

// 修改翻译
router.put('/:id', auth, managerAccess, (req, res) => {
  const { key, page, description, translations } = req.body;
  const item = db.prepare('SELECT * FROM translations WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: '翻译不存在' });
  
  const updates = [];
  const params = [];
  if (key !== undefined) { updates.push('key = ?'); params.push(key); }
  if (page !== undefined) { updates.push('page = ?'); params.push(page); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (translations !== undefined) { updates.push('translations = ?'); params.push(JSON.stringify(translations)); }
  updates.push("updated_at = datetime('now','localtime')");
  params.push(req.params.id);
  
  db.prepare(`UPDATE translations SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ success: true });
});

// 删除翻译
router.delete('/:id', auth, managerAccess, (req, res) => {
  db.prepare('DELETE FROM translations WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// 批量导入翻译
router.post('/import', auth, managerAccess, (req, res) => {
  const { items = [] } = req.body;
  let count = 0;
  const upsert = db.prepare(`
    INSERT INTO translations (key, page, description, translations) VALUES (?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET translations = excluded.translations, page = excluded.page, description = excluded.description, updated_at = datetime('now','localtime')
  `);
  items.forEach(item => {
    if (item.key) {
      upsert.run(item.key, item.page || 'common', item.description || '', JSON.stringify(item.translations || {}));
      count++;
    }
  });
  res.json({ success: true, imported: count });
});

module.exports = router;