const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth } = require('../middleware/auth');

// 初始化组合套餐表
db.prepare(`CREATE TABLE IF NOT EXISTS combos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  name_en TEXT DEFAULT '',
  price REAL NOT NULL DEFAULT 0,
  items TEXT DEFAULT '[]',
  description TEXT DEFAULT '',
  description_en TEXT DEFAULT '',
  image TEXT DEFAULT '',
  available INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT DEFAULT (datetime('now', 'localtime'))
)`).run();

// 补充操作人字段
try { db.prepare("ALTER TABLE combos ADD COLUMN created_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE combos ADD COLUMN created_by_name TEXT DEFAULT ''").run(); } catch (e) {}
try { db.prepare("ALTER TABLE combos ADD COLUMN updated_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE combos ADD COLUMN updated_by_name TEXT DEFAULT ''").run(); } catch (e) {}

// 自动在侧边栏菜单中注册"组合套餐"入口
try {
  const existing = db.prepare("SELECT id FROM menus WHERE path = '/admin/combos' OR path = 'combos'").get();
  if (!existing) {
    let menuParent = db.prepare("SELECT id FROM menus WHERE path = '/admin/menus' OR path = 'menus' ORDER BY id LIMIT 1").get();
    if (!menuParent) {
      const productMenu = db.prepare("SELECT parent_id FROM menus WHERE path LIKE '%products%' ORDER BY id LIMIT 1").get();
      if (productMenu) menuParent = { id: productMenu.parent_id };
    }
    const parentId = menuParent ? menuParent.id : 0;
    const maxSort = db.prepare("SELECT MAX(sort_order) as maxSort FROM menus WHERE parent_id = ?").get(parentId);
    db.prepare(`INSERT INTO menus (parent_id, name, icon, path, sort_order, enabled)
      VALUES (?, ?, ?, ?, ?, 1)`)
      .run(parentId, '组合套餐', '🍱', '/admin/combos', (maxSort?.maxSort || 0) + 1);
    console.log('[组合套餐] 菜单已自动注册到侧边栏 (parent_id=' + parentId + ')');
  }
} catch (e) {
  console.error('[组合套餐] 菜单注册失败:', e.message);
}

// 获取所有组合套餐（管理后台用）
router.post('/list', auth, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM combos ORDER BY sort_order ASC, id DESC').all();
    res.json(rows.map(r => ({ ...r, items: JSON.parse(r.items || '[]') })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 获取上架的组合套餐（前台顾客用）
router.get('/all', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM combos WHERE available = 1 ORDER BY sort_order ASC, id DESC').all();
    res.json(rows.map(r => ({ ...r, items: JSON.parse(r.items || '[]') })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 获取单个组合套餐详情
router.post('/detail/:id', auth, (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM combos WHERE id = ?').get(Number(req.params.id));
    if (!row) return res.status(404).json({ error: '套餐不存在' });
    res.json({ ...row, items: JSON.parse(row.items || '[]') });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 创建组合套餐
router.post('/', auth, (req, res) => {
  try {
    const { name, name_en, price, items, description, description_en, image, available, sort_order } = req.body;
    if (!name || price === undefined) return res.status(400).json({ error: '名称和价格必填' });
    const result = db.prepare(`INSERT INTO combos (name, name_en, price, items, description, description_en, image, available, sort_order, created_by, created_by_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      name, name_en || '', parseFloat(price) || 0,
      JSON.stringify(items || []), description || '', description_en || '',
      image || '', available ? 1 : 0, sort_order || 0,
      req.user.id, req.user.name || req.user.username
    );
    res.json({ id: result.lastInsertRowid, message: '套餐已创建' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 更新组合套餐
router.post('/update/:id', auth, (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, name_en, price, items, description, description_en, image, available, sort_order } = req.body;
    db.prepare(`UPDATE combos SET name=?, name_en=?, price=?, items=?, description=?, description_en=?, image=?, available=?, sort_order=?, updated_at=datetime('now','localtime'), updated_by=?, updated_by_name=? WHERE id=?`).run(
      name, name_en || '', parseFloat(price) || 0,
      JSON.stringify(items || []), description || '', description_en || '',
      image || '', available ? 1 : 0, sort_order || 0,
      req.user.id, req.user.name || req.user.username, id
    );
    res.json({ message: '套餐已更新' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 删除组合套餐
router.post('/delete/:id', auth, (req, res) => {
  try {
    db.prepare('DELETE FROM combos WHERE id = ?').run(Number(req.params.id));
    res.json({ message: '套餐已删除' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
