const express = require('express')
const router = express.Router()
const db = require('../db')
const auth = require('../middleware/auth')

function genQueueNumber(type) {
  const prefix = type === 'dinein' ? 'A' : 'B'
  const today = new Date().toISOString().split('T')[0]
  const count = db.prepare("SELECT COUNT(*) as cnt FROM queue_numbers WHERE type = ? AND date(created_at) = ?").get(type, today).cnt
  return `${prefix}${String(count + 1).padStart(3, '0')}`
}

router.post('/list', auth, (req, res) => {
  const { status, type, date } = req.body || {}
  let where = 'WHERE 1=1'
  const params = []
  if (status) { where += ' AND status = ?'; params.push(status) }
  if (type) { where += ' AND type = ?'; params.push(type) }
  if (date) { where += ' AND date(created_at) = ?'; params.push(date) }
  else { where += " AND date(created_at) = date('now','localtime')" }
  const queues = db.prepare(`SELECT * FROM queue_numbers ${where} ORDER BY CASE status WHEN 'waiting' THEN 1 WHEN 'calling' THEN 0 ELSE 2 END, created_at ASC`).all(...params)
  res.json(queues)
})

router.post('/current', (req, res) => {
  const { type } = req.body || {}
  let where = "WHERE status = 'calling'"
  const params = []
  if (type) { where += ' AND type = ?'; params.push(type) }
  const current = db.prepare(`SELECT * FROM queue_numbers ${where} ORDER BY called_at DESC LIMIT 5`).all(...params)
  const waitingCount = db.prepare(`SELECT COUNT(*) as cnt FROM queue_numbers WHERE status = 'waiting' ${type ? 'AND type = ?' : ''} AND date(created_at) = date('now','localtime')`).get(...(type ? [type] : [])).cnt
  res.json({ current, waiting_count: waitingCount })
})

router.post('/take', auth, (req, res) => {
  const { type = 'dinein', customer_name = '', note = '', people_count = 1 } = req.body || {}
  if (!['dinein', 'takeout'].includes(type)) return res.status(400).json({ error: '类型只能是 dinein 或 takeout' })
  const number = genQueueNumber(type)
  const result = db.prepare(`INSERT INTO queue_numbers (number, type, customer_name, note, people_count, status, created_at) VALUES (?, ?, ?, ?, ?, 'waiting', datetime('now','localtime'))`).run(number, type, customer_name, note, people_count)
  res.json({ id: result.lastInsertRowid, number, message: '取号成功' })
})

router.post('/call/:id', auth, (req, res) => {
  const queue = db.prepare('SELECT * FROM queue_numbers WHERE id = ?').get(req.params.id)
  if (!queue) return res.status(404).json({ error: '排队号不存在' })
  if (queue.status !== 'waiting') return res.status(400).json({ error: '该排队号状态不是等待中' })
  db.prepare("UPDATE queue_numbers SET status = 'waiting' WHERE status = 'calling' AND type = ?").run(queue.type)
  db.prepare("UPDATE queue_numbers SET status = 'calling', called_at = datetime('now','localtime') WHERE id = ?").run(req.params.id)
  res.json({ message: `正在叫号 ${queue.number}` })
})

router.post('/complete/:id', auth, (req, res) => {
  const queue = db.prepare('SELECT * FROM queue_numbers WHERE id = ?').get(req.params.id)
  if (!queue) return res.status(404).json({ error: '排队号不存在' })
  db.prepare("UPDATE queue_numbers SET status = 'completed', completed_at = datetime('now','localtime') WHERE id = ?").run(req.params.id)
  res.json({ message: '已完成' })
})

router.post('/skip/:id', auth, (req, res) => {
  const queue = db.prepare('SELECT * FROM queue_numbers WHERE id = ?').get(req.params.id)
  if (!queue) return res.status(404).json({ error: '排队号不存在' })
  db.prepare("UPDATE queue_numbers SET status = 'skipped', completed_at = datetime('now','localtime') WHERE id = ?").run(req.params.id)
  res.json({ message: '已跳过' })
})

router.post('/next', auth, (req, res) => {
  const { type } = req.body || {}
  let where = "WHERE status = 'waiting'"
  const params = []
  if (type) { where += ' AND type = ?'; params.push(type) }
  const next = db.prepare(`SELECT * FROM queue_numbers ${where} ORDER BY created_at ASC LIMIT 1`).get(...params)
  if (!next) return res.status(400).json({ error: '没有等待中的排队号' })
  db.prepare("UPDATE queue_numbers SET status = 'waiting' WHERE status = 'calling' AND type = ?").run(next.type)
  db.prepare("UPDATE queue_numbers SET status = 'calling', called_at = datetime('now','localtime') WHERE id = ?").run(next.id)
  res.json({ ...next, status: 'calling', message: `正在叫号 ${next.number}` })
})

router.post('/stats', auth, (req, res) => {
  const today = new Date().toISOString().split('T')[0]
  const waiting = db.prepare("SELECT COUNT(*) as cnt FROM queue_numbers WHERE status = 'waiting' AND date(created_at) = ?").get(today).cnt
  const calling = db.prepare("SELECT COUNT(*) as cnt FROM queue_numbers WHERE status = 'calling' AND date(created_at) = ?").get(today).cnt
  const completed = db.prepare("SELECT COUNT(*) as cnt FROM queue_numbers WHERE status = 'completed' AND date(created_at) = ?").get(today).cnt
  const skipped = db.prepare("SELECT COUNT(*) as cnt FROM queue_numbers WHERE status = 'skipped' AND date(created_at) = ?").get(today).cnt
  const total = db.prepare("SELECT COUNT(*) as cnt FROM queue_numbers WHERE date(created_at) = ?").get(today).cnt
  const avgWait = db.prepare(`SELECT AVG((julianday(called_at) - julianday(created_at)) * 24 * 60) as avg_minutes FROM queue_numbers WHERE called_at IS NOT NULL AND date(created_at) = ?`).get(today).avg_minutes
  res.json({ waiting, calling, completed, skipped, total, avg_wait_minutes: avgWait ? Math.round(avgWait) : 0 })
})

module.exports = router