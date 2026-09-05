const express = require('express');
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach(r => {
    try { settings[r.key] = JSON.parse(r.value); } catch { settings[r.key] = r.value; }
  });
  res.json(settings);
});

router.get('/:key', (req, res) => {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(req.params.key);
  if (!row) return res.status(404).json({ error: '设置不存在' });
  try { res.json(JSON.parse(row.value)); } catch { res.json(row.value); }
});

router.put('/', auth, adminOnly, (req, res) => {
  const updates = req.body;
  const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  const tx = db.transaction((items) => {
    for (const [key, value] of Object.entries(items)) {
      upsert.run(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    }
  });
  tx(updates);
  res.json({ success: true });
});

router.get('/business/today', (req, res) => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const now = new Date();
  const today = days[now.getDay()];
  const hoursStr = db.prepare('SELECT value FROM settings WHERE key = ?').get('business_hours')?.value;
  const hours = JSON.parse(hoursStr || '{}');
  const todayHours = hours[today] || { open: false };
  res.json({ day: today, ...todayHours });
});

module.exports = router;
