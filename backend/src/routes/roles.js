const express = require('express');
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(auth, adminOnly);

// 角色列表
router.post('/list', (req, res) => {
  const roles = db.prepare('SELECT * FROM roles ORDER BY sort_order, id').all();
  roles.forEach(r => {
    r.permissions = JSON.parse(r.permissions || '{}');
    // 统计该角色下的用户数
    const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE role_id = ?').get(r.id);
    r.user_count = userCount.cnt;
  });
  res.json(roles);
});

// 创建角色
router.post('/', (req, res) => {
  const { name, description, permissions = {}, sort_order = 0 } = req.body;
  if (!name) return res.status(400).json({ error: '角色名称必填' });
  const exists = db.prepare('SELECT id FROM roles WHERE name = ?').get(name);
  if (exists) return res.status(400).json({ error: '角色名称已存在' });
  const result = db.prepare('INSERT INTO roles (name, description, permissions, is_system, sort_order) VALUES (?, ?, ?, 0, ?)').run(
    name, description, JSON.stringify(permissions), sort_order
  );
  res.json({ id: result.lastInsertRowid });
});

// 更新角色
router.post('/update/:id', (req, res) => {
  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(req.params.id);
  if (!role) return res.status(404).json({ error: '角色不存在' });
  if (role.is_system) {
    // 系统角色只能修改描述和排序，不能改名称和权限
    const { description, sort_order } = req.body;
    const fields = [];
    const values = [];
    if (description !== undefined) { fields.push('description = ?'); values.push(description); }
    if (sort_order !== undefined) { fields.push('sort_order = ?'); values.push(sort_order); }
    if (fields.length > 0) {
      values.push(req.params.id);
      db.prepare(`UPDATE roles SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }
    return res.json({ success: true, message: '系统角色仅可修改描述和排序' });
  }
  const { name, description, permissions, sort_order } = req.body;
  const fields = [];
  const values = [];
  if (name !== undefined) { fields.push('name = ?'); values.push(name); }
  if (description !== undefined) { fields.push('description = ?'); values.push(description); }
  if (permissions !== undefined) { fields.push('permissions = ?'); values.push(JSON.stringify(permissions)); }
  if (sort_order !== undefined) { fields.push('sort_order = ?'); values.push(sort_order); }
  if (fields.length === 0) return res.status(400).json({ error: '没有要更新的字段' });
  values.push(req.params.id);
  db.prepare(`UPDATE roles SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ success: true });
});

// 删除角色
router.post('/delete/:id', (req, res) => {
  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(req.params.id);
  if (!role) return res.status(404).json({ error: '角色不存在' });
  if (role.is_system) return res.status(400).json({ error: '系统内置角色不可删除' });
  const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE role_id = ?').get(req.params.id);
  if (userCount.cnt > 0) return res.status(400).json({ error: `该角色下还有 ${userCount.cnt} 个用户，请先调整用户角色` });
  db.prepare('DELETE FROM roles WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// 获取角色详情（含权限）
router.post('/detail/:id', (req, res) => {
  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(req.params.id);
  if (!role) return res.status(404).json({ error: '角色不存在' });
  role.permissions = JSON.parse(role.permissions || '{}');
  res.json(role);
});

module.exports = router;