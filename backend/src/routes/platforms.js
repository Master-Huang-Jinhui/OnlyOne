const express = require('express');
const db = require('../db');
const { auth, managerAccess, adminOnly } = require('../middleware/auth');
const { encrypt, decrypt, isEncrypted } = require('../utils/crypto');
const { auditLog } = require('../utils/audit');

const router = express.Router();

// 所有允许更新的平台字段
const PLATFORM_FIELDS = ['name', 'logo', 'url', 'account', 'password', 'phone', 'note', 'enabled', 'weekly_status', 'sort_order',
  'commission_rate', 'payout_schedule', 'delivery_type', 'min_order', 'delivery_radius', 'contact_person', 'rating', 'launch_date',
  'online_status'];

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
  const { name, logo, url, account, password, phone, note, enabled = 1, weekly_status = {}, sort_order = 0,
    commission_rate = 0, payout_schedule = 'weekly', delivery_type = 'platform', min_order = 0,
    delivery_radius = 0, contact_person = '', rating = 0, launch_date = '' } = req.body;
  if (!name) return res.status(400).json({ error: '平台名称必填' });
  const encryptedPassword = password ? encrypt(password) : '';
  const result = db.prepare(`INSERT INTO platforms (name, logo, url, account, password, phone, note, enabled, weekly_status, sort_order,
    commission_rate, payout_schedule, delivery_type, min_order, delivery_radius, contact_person, rating, launch_date
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    name, logo, url, account, encryptedPassword, phone, note, enabled ? 1 : 0, JSON.stringify(weekly_status), sort_order,
    commission_rate, payout_schedule, delivery_type, min_order, delivery_radius, contact_person, rating, launch_date
  );
  auditLog(req, 'CREATE_PLATFORM', `创建平台: ${name}`, { platformId: result.lastInsertRowid, name });
  res.json({ id: result.lastInsertRowid });
});

router.post('/update/:id', auth, managerAccess, (req, res) => {
  const fields = [];
  const values = [];
  for (const key of PLATFORM_FIELDS) {
    if (req.body[key] !== undefined) {
      fields.push(`${key} = ?`);
      if (key === 'password') {
        if (req.body[key] === '***') { fields.pop(); continue; }
        values.push(encrypt(req.body[key]));
      } else if (key === 'weekly_status') {
        values.push(JSON.stringify(req.body[key]));
      } else if (key === 'enabled' || key === 'online_status') {
        values.push(req.body[key] ? 1 : 0);
      } else {
        values.push(req.body[key]);
      }
    }
  }
  // 切换在线状态时自动记录切换时间
  if (req.body.online_status !== undefined) {
    fields.push("online_updated_at = datetime('now','localtime')");
  }
  if (fields.length === 0) return res.status(400).json({ error: '没有要更新的字段' });
  values.push(req.params.id);
  db.prepare(`UPDATE platforms SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  const platform = db.prepare('SELECT name FROM platforms WHERE id = ?').get(req.params.id);
  auditLog(req, 'UPDATE_PLATFORM', `更新平台: ${platform?.name || req.params.id}`, { platformId: req.params.id, fields: fields.map(f => f.split(' ')[0]) });
  res.json({ success: true });
});

// 快捷切换平台在线状态（上线/下线），自动记录切换时间
router.post('/status/:id', auth, managerAccess, (req, res) => {
  const id = req.params.id;
  const online = req.body.online ? 1 : 0;
  const platform = db.prepare('SELECT id, name FROM platforms WHERE id = ?').get(id);
  if (!platform) return res.status(404).json({ error: '平台不存在' });
  db.prepare("UPDATE platforms SET online_status = ?, online_updated_at = datetime('now','localtime') WHERE id = ?").run(online, id);
  auditLog(req, 'UPDATE_PLATFORM_STATUS', `${online ? '上线' : '下线'}平台: ${platform.name}`, { platformId: id, online });
  const updated = db.prepare('SELECT online_updated_at FROM platforms WHERE id = ?').get(id);
  res.json({ success: true, online, updated_at: updated.online_updated_at });
});

router.post('/delete/:id', auth, adminOnly, (req, res) => {
  const platform = db.prepare('SELECT name FROM platforms WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM platforms WHERE id = ?').run(req.params.id);
  auditLog(req, 'DELETE_PLATFORM', `删除平台: ${platform?.name || req.params.id}`, { platformId: req.params.id });
  res.json({ success: true });
});

module.exports = router;
