const express = require('express');
const db = require('../db');
const { auth, managerAccess } = require('../middleware/auth');

const router = express.Router();

router.post('/list', auth, (req, res) => {
  const menus = db.prepare('SELECT * FROM menus WHERE enabled = 1 ORDER BY sort_order, id').all();
  const tree = menus.filter(m => m.parent_id === 0).map(parent => ({ ...parent, children: menus.filter(m => m.parent_id === parent.id) }));
  res.json(tree);
});

router.post('/all', auth, managerAccess, (req, res) => {
  const menus = db.prepare('SELECT * FROM menus ORDER BY sort_order, id').all();
  res.json(menus);
});

router.post('/', auth, managerAccess, (req, res) => {
  const { parent_id = 0, name, icon, path, sort_order = 0, enabled = 1 } = req.body;
  if (!name) return res.status(400).json({ error: '菜单名称必填' });
  const exist = db.prepare('SELECT id FROM menus WHERE parent_id = ? AND name = ? AND path = ?').get(parent_id, name, path || '');
  if (exist) return res.status(400).json({ error: '同级已存在相同名称和路径的菜单' });
  const result = db.prepare('INSERT INTO menus (parent_id, name, icon, path, sort_order, enabled) VALUES (?, ?, ?, ?, ?, ?)').run(parent_id, name, icon, path, sort_order, enabled ? 1 : 0);
  res.json({ id: result.lastInsertRowid });
});

router.post('/update/:id', auth, managerAccess, (req, res) => {
  const allowed = ['parent_id', 'name', 'icon', 'path', 'sort_order', 'enabled'];
  const fields = [];
  const values = [];
  for (const key of allowed) {
    if (req.body[key] !== undefined) { fields.push(`${key} = ?`); values.push(key === 'enabled' ? (req.body[key] ? 1 : 0) : req.body[key]); }
  }
  if (fields.length === 0) return res.status(400).json({ error: '没有要更新的字段' });
  values.push(req.params.id);
  db.prepare(`UPDATE menus SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ success: true });
});

router.post('/delete/:id', auth, managerAccess, (req, res) => {
  db.prepare('DELETE FROM menus WHERE id = ?').run(req.params.id);
  db.prepare('DELETE FROM menus WHERE parent_id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
