const express = require('express');
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');
const router = express.Router();
router.get('/', auth, (req, res) => {
  const menus = db.prepare('SELECT * FROM menus WHERE enabled = 1 ORDER BY sort_order, id').all();
  const tree = menus.filter(m => m.parent_id === 0).map(parent => ({ ...parent, children: menus.filter(m => m.parent_id === parent.id) }));
  res.json(tree);
});
router.get('/all', auth, adminOnly, (req, res) => {
  res.json(db.prepare('SELECT * FROM menus ORDER BY sort_order, id').all());
});
router.post('/', auth, adminOnly, (req, res) => {
  const { parent_id = 0, name, icon, path, sort_order = 0, enabled = 1 } = req.body;
  if (!name) return res.status(400).json({ error: '菜单名称必填' });
  const r = db.prepare('INSERT INTO menus (parent_id, name, icon, path, sort_order, enabled) VALUES (?, ?, ?, ?, ?, ?)').run(parent_id, name, icon, path, sort_order, enabled ? 1 : 0);
  res.json({ id: r.lastInsertRowid });
});
router.put('/:id', auth, adminOnly, (req, res) => {
  const allowed = ['parent_id', 'name', 'icon', 'path', 'sort_order', 'enabled'];
  const f = [], v = [];
  for (const key of allowed) {
    if (req.body[key] !== undefined) { f.push(key + ' = ?'); v.push(key === 'enabled' ? (req.body[key] ? 1 : 0) : req.body[key]); }
  }
  if (f.length === 0) return res.status(400).json({ error: '没有要更新的字段' });
  v.push(req.params.id);
  db.prepare('UPDATE menus SET ' + f.join(', ') + ' WHERE id = ?').run(...v);
  res.json({ success: true });
});
router.delete('/:id', auth, adminOnly, (req, res) => {
  db.prepare('DELETE FROM menus WHERE id = ?').run(req.params.id);
  db.prepare('DELETE FROM menus WHERE parent_id = ?').run(req.params.id);
  res.json({ success: true });
});
module.exports = router;
