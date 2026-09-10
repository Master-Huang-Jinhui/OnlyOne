const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, auth } = require('../middleware/auth');
const { loginRateLimit, resetLoginAttempts } = require('../middleware/rateLimit');
const { auditLog } = require('../utils/audit');

const router = express.Router();

// 登录（带速率限制：每分钟最多10次，超过锁定10分钟）
router.post('/login', loginRateLimit, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '请输入账号和密码' });
  }
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
  // 登录成功，清除该IP的速率限制计数
  resetLoginAttempts(req);
  const token = signToken(user);
  auditLog(req, 'LOGIN_SUCCESS', `登录成功：${username} (${user.role})`, { username, userId: user.id, role: user.role });

  // 合并角色权限和用户个人权限（用户权限优先覆盖）
  let mergedPermissions = JSON.parse(user.permissions || '{}');
  let roleInfo = null;
  if (user.role_id) {
    const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(user.role_id);
    if (role) {
      roleInfo = { id: role.id, name: role.name, description: role.description };
      const rolePerms = JSON.parse(role.permissions || '{}');
      // 如果用户没有单独配置权限，使用角色权限
      if (!mergedPermissions.menus || mergedPermissions.menus.length === 0) {
        mergedPermissions = rolePerms;
      }
    }
  }

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      role_id: user.role_id,
      role_info: roleInfo,
      name: user.name,
      permissions: mergedPermissions
    }
  });
});

// 获取当前用户信息
router.post('/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, username, role, role_id, name, phone, email, permissions, enabled FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  let mergedPermissions = JSON.parse(user.permissions || '{}');
  let roleInfo = null;
  if (user.role_id) {
    const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(user.role_id);
    if (role) {
      roleInfo = { id: role.id, name: role.name, description: role.description };
      const rolePerms = JSON.parse(role.permissions || '{}');
      if (!mergedPermissions.menus || mergedPermissions.menus.length === 0) {
        mergedPermissions = rolePerms;
      }
    }
  }
  user.permissions = mergedPermissions;
  user.role_info = roleInfo;
  res.json(user);
});

// 修改密码
router.post('/change-password', auth, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(oldPassword, user.password)) {
    return res.status(400).json({ error: '原密码错误' });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.user.id);
  res.json({ success: true });
});

module.exports = router;