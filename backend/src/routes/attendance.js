const express = require('express')
const router = express.Router()
const db = require('../db')
const { auth } = require('../middleware/auth')

// 获取今日打卡状态
router.get('/today', auth, (req, res) => {
  const today = new Date().toISOString().slice(0, 10)
  const record = db.prepare('SELECT * FROM attendance WHERE user_id = ? AND date = ?').get(req.user.id, today)
  res.json(record || { date: today, clock_in: null, clock_out: null })
})

// 上班打卡
router.post('/clock-in', auth, (req, res) => {
  const today = new Date().toISOString().slice(0, 10)
  const now = new Date().toTimeString().slice(0, 8)
  const existing = db.prepare('SELECT * FROM attendance WHERE user_id = ? AND date = ?').get(req.user.id, today)
  if (existing && existing.clock_in) {
    return res.status(400).json({ error: '今日已上班打卡' })
  }
  if (existing) {
    db.prepare('UPDATE attendance SET clock_in = ? WHERE id = ?').run(now, existing.id)
  } else {
    db.prepare('INSERT INTO attendance (user_id, user_name, date, clock_in) VALUES (?, ?, ?, ?)').run(
      req.user.id, req.user.name || req.user.username, today, now
    )
  }
  res.json({ success: true, clock_in: now, message: '上班打卡成功' })
})

// 下班打卡
router.post('/clock-out', auth, (req, res) => {
  const today = new Date().toISOString().slice(0, 10)
  const now = new Date().toTimeString().slice(0, 8)
  const existing = db.prepare('SELECT * FROM attendance WHERE user_id = ? AND date = ?').get(req.user.id, today)
  if (!existing || !existing.clock_in) {
    return res.status(400).json({ error: '请先上班打卡' })
  }
  if (existing.clock_out) {
    return res.status(400).json({ error: '今日已下班打卡' })
  }
  db.prepare('UPDATE attendance SET clock_out = ? WHERE id = ?').run(now, existing.id)
  res.json({ success: true, clock_out: now, message: '下班打卡成功' })
})

// 获取打卡记录列表（管理员查看）
router.get('/', auth, (req, res) => {
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
