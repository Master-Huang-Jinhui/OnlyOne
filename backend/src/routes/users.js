const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(auth, adminOnly);

router.get('/', (req, res) => {
  const users = db.prepare('SELECT id, username, role, name, phone, email, permissions, enabled, created_at FROM users ORDER BY id').all();
  users.forEach(u => u.permissions = JSON.parse(u.permissions || '{}'));
  res.json(users);
});

router.post('/', (req, res) => {
  const { username, password, role = 'user', name, phone, email, permissions = {} } = req.body;
  if (!username || !password) return res.status(400).json({ error: '账号和密码必填' });
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return res.status(400).json({ error: '账号已存在' });
  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`INSERT INTO users (username, password, role, name, phone, email, permissions) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    username, hash, role, name, phone, email, JSON.stringify(permissions)
  );
  res.json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { role, name, phone, email, permissions, enabled, password } = req.body;
  const fields = [];
  const values = [];
  if (role !== undefined) { fields.push('role = ?'); values.push(role); }
  if (name !== undefined) { fields.push('name = ?'); values.push(name); }
  if (phone !== undefined) { fields.push('phone = ?'); values.push(phone); }
  if (email !== undefined) { fields.push('email = ?'); values.push(email); }
  if (permissions !== undefined) { fields.push('permissions = ?'); values.push(JSON.stringify(permissions)); }
  if (enabled !== undefined) { fields.push('enabled = ?'); values.push(enabled ? 1 : 0); }
  if (password) { fields.push('password = ?'); values.push(bcrypt.hashSync(password, 10)); }
  if (fields.length === 0) return res.status(400).json({ error: '没有要更新的字段' });
  values.push(req.params.id);
  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  if (req.params.id == req.user.id) return res.status(400).json({ error: '不能删除自己' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
