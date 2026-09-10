const express = require('express');
const db = require('../db');
const { auth, managerAccess, adminOnly } = require('../middleware/auth');
const { encrypt, decrypt, isEncrypted } = require('../utils/crypto');
const { auditLog } = require('../utils/audit');

const router = express.Router();

router.post('/list', auth, (req, res) => {
  const platforms = db.prepare('SELECT * FROM platforms ORDER BY sort_order, id').all();
  platforms.forEach(p => {
    p.weekly_status = JSON.parse(p.weekly_status || '{}');
    if (req.user.role === 'admin') {
      p.password = decrypt(p.password);
    } else {
      p.password = p.password ? '***' : '';
    }
  });
  res.json(platforms);
});

router.post('/public', (req, res) => {
  const platforms = db.prepare('SELECT id, name, logo, url, phone, note FROM platforms WHERE enabled = 1 ORDER BY sort_order, id').all();
  res.json(platforms);
});

router.post('/', auth, managerAccess, (req, res) => {
  const { name, logo, url, account, password, phone, note, enabled = 1, weekly_status = {}, sort_order = 0 } = req.body;
  if (!name) return res.status(400).json({ error: '平台名称必填' });
  const encryptedPassword = password ? encrypt(password) : '';
  const result = db.prepare(`INSERT INTO platforms (name, logo, url, account, password, phone, note, enabled, weekly_status, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    name, logo, url, account, encryptedPassword, phone, note, enabled ? 1 : 0, JSON.stringify(weekly_status), sort_order
  );
  auditLog(req, 'CREATE_PLATFORM', `创建平台: ${name}`, { platformId: result.lastInsertRowid, name });
  res.json({ id: result.lastInsertRowid });
});

router.post('/update/:id', auth, managerAccess, (req, res) => {
  const fields = [];
  const values = [];
  const allowed = ['name', 'logo', 'url', 'account', 'password', 'phone', 'note', 'enabled', 'weekly_status', 'sort_order'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      fields.push(`${key} = ?`);
      if (key === 'password') {
        if (req.body[key] === '***') { fields.pop(); continue; }
        values.push(encrypt(req.body[key]));
      } else if (key === 'weekly_status') {
        values.push(JSON.stringify(req.body[key]));
      } else if (key === 'enabled') {
        values.push(req.body[key] ? 1 : 0);
      } else {
        values.push(req.body[key]);
      }
    }
  }
  if (fields.length === 0) return res.status(400).json({ error: '没有要更新的字段' });
  values.push(req.params.id);
  db.prepare(`UPDATE platforms SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  const platform = db.prepare('SELECT name FROM platforms WHERE id = ?').get(req.params.id);
  auditLog(req, 'UPDATE_PLATFORM', `更新平台: ${platform?.name || req.params.id}`, { platformId: req.params.id, fields: fields.map(f => f.split(' ')[0]) });
  res.json({ success: true });
});

router.post('/delete/:id', auth, adminOnly, (req, res) => {
  const platform = db.prepare('SELECT name FROM platforms WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM platforms WHERE id = ?').run(req.params.id);
  auditLog(req, 'DELETE_PLATFORM', `删除平台: ${platform?.name || req.params.id}`, { platformId: req.params.id });
  res.json({ success: true });
});

module.exports = router;
