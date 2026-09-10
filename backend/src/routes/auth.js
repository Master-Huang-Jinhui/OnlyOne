const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, auth } = require('../middleware/auth');
const { loginRateLimit, resetLoginAttempts } = require('../middleware/rateLimit');
const { auditLog } = require('../utils/audit');

const router = express.Router();

router.post('/login', loginRateLimit, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '请输入账号和密码' });
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    auditLog(req, 'LOGIN_FAILED', `登录失败：账号不存在 (${username})`, { username });
    return res.status(401).json({ error: '账号不存在' });
  }
  if (!user.enabled) {
    auditLog(req, 'LOGIN_FAILED', `登录失败：账号已禁用 (${username})`, { username, userId: user.id });
    return res.status(403).json({ error: '账号已被禁用' });
  }
  if (!bcrypt.compareSync(password, user.password)) {
    auditLog(req, 'LOGIN_FAILED', `登录失败：密码错误 (${username})`, { username, userId: user.id });
    return res.status(401).json({ error: '密码错误' });
  }
  resetLoginAttempts(req);
  const token = signToken(user);
  auditLog(req, 'LOGIN_SUCCESS', `登录成功：${username} (${user.role})`, { username, userId: user.id, role: user.role });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.name, permissions: JSON.parse(user.permissions || '{}') } });
});

router.post('/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, username, role, name, phone, email, permissions, enabled FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  user.permissions = JSON.parse(user.permissions || '{}');
  res.json(user);
});

router.post('/change-password', auth, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(oldPassword, user.password)) return res.status(400).json({ error: '原密码错误' });
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.user.id);
  res.json({ success: true });
});

module.exports = router;
