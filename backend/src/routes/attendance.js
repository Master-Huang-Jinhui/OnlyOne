const express = require('express')
const router = express.Router()
const db = require('../db')
const { auth } = require('../middleware/auth')

function getLocalDate() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function getLocalTime() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
}

router.post('/today', auth, (req, res) => {
  const today = getLocalDate()
  const record = db.prepare(`SELECT MIN(clock_in) as clock_in, MAX(clock_out) as clock_out FROM attendance WHERE user_id = ? AND date = ?`).get(req.user.id, today)
  res.json({ date: today, clock_in: record?.clock_in || null, clock_out: record?.clock_out || null })
})

router.post('/clock-in', auth, (req, res) => {
  const today = getLocalDate()
  const now = getLocalTime()
  db.prepare('INSERT INTO attendance (user_id, user_name, date, clock_in) VALUES (?, ?, ?, ?)').run(req.user.id, req.user.name || req.user.username, today, now)
  const earliest = db.prepare('SELECT MIN(clock_in) as t FROM attendance WHERE user_id = ? AND date = ?').get(req.user.id, today)
  res.json({ success: true, clock_in: earliest.t, message: '上班打卡成功' })
})

router.post('/clock-out', auth, (req, res) => {
  const today = getLocalDate()
  const now = getLocalTime()
  const hasClockIn = db.prepare('SELECT COUNT(*) as cnt FROM attendance WHERE user_id = ? AND date = ? AND clock_in IS NOT NULL').get(req.user.id, today)
  if (hasClockIn.cnt === 0) return res.status(400).json({ error: '请先上班打卡' })
  const pending = db.prepare('SELECT id FROM attendance WHERE user_id = ? AND date = ? AND clock_in IS NOT NULL AND clock_out IS NULL ORDER BY id DESC LIMIT 1').get(req.user.id, today)
  if (pending) { db.prepare('UPDATE attendance SET clock_out = ? WHERE id = ?').run(now, pending.id) }
  else { db.prepare('INSERT INTO attendance (user_id, user_name, date, clock_in, clock_out) VALUES (?, ?, ?, ?, ?)').run(req.user.id, req.user.name || req.user.username, today, now, now) }
  const latest = db.prepare('SELECT MAX(clock_out) as t FROM attendance WHERE user_id = ? AND date = ?').get(req.user.id, today)
  res.json({ success: true, clock_out: latest.t, message: '下班打卡成功' })
})

router.post('/list', auth, (req, res) => {
  const { date, user_id } = req.query
  let sql = 'SELECT * FROM attendance WHERE 1=1'
  const params = []
  if (date) { sql += ' AND date = ?'; params.push(date) }
  if (user_id) { sql += ' AND user_id = ?'; params.push(user_id) }
  sql += ' ORDER BY date DESC, id DESC LIMIT 100'
  const records = db.prepare(sql).all(...params)
  res.json(records)
})

module.exports = router
