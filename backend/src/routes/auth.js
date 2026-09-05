const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, auth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '请输入账号和密码' });
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(401).json({ error: '账号不存在' });
  if (!user.enabled) return res.status(403).json({ error: '账号已被禁用' });
  if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: '密码错误' });
  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role, name: user.name, permissions: JSON.parse(user.permissions || '{}') }
  });
});

router.get('/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, username, role, name, phone, email, permissions, enabled FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  user.permissions = JSON.parse(user.permissions || '{}');
  res.json(user);
});

router.put('/change-password', auth, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(oldPassword, user.password)) return res.status(400).json({ error: '原密码错误' });
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.user.id);
  res.json({ success: true });
});

module.exports = router;
