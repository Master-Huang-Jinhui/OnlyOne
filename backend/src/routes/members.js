const express = require('express')
const router = express.Router()
const db = require('../db')
const { auth } = require('../middleware/auth')

// 根据累计消费计算会员等级
function calcLevel(totalSpent) {
  if (totalSpent >= 1000) return { level: '钻石会员', discount: 0.9, points_rate: 2 }
  if (totalSpent >= 500) return { level: '金卡会员', discount: 0.95, points_rate: 1.5 }
  if (totalSpent >= 200) return { level: '银卡会员', discount: 0.98, points_rate: 1.2 }
  return { level: '普通会员', discount: 1, points_rate: 1 }
}

// 会员列表（分页+模糊搜索）
router.post('/list', auth, (req, res) => {
  const { keyword, level, page = 1, page_size = 20 } = req.body || {}
  let where = 'WHERE 1=1'
  const params = []
  if (keyword) {
    where += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)'
    const kw = `%${keyword}%`
    params.push(kw, kw, kw)
  }
  if (level) { where += ' AND level = ?'; params.push(level) }
  const offset = (page - 1) * page_size
  const total = db.prepare(`SELECT COUNT(*) as cnt FROM members ${where}`).get(...params).cnt
  const rows = db.prepare(`SELECT * FROM members ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, page_size, offset)
  // 附加等级信息
  const members = rows.map(m => ({ ...m, ...calcLevel(m.total_spent || 0) }))
  res.json({ members, total, page, page_size })
})

// 全部会员（下拉用）
router.post('/all', auth, (req, res) => {
  const members = db.prepare('SELECT id, name, phone, points, total_spent FROM members ORDER BY name').all()
  res.json(members.map(m => ({ ...m, ...calcLevel(m.total_spent || 0) })))
})

// 会员详情
router.post('/detail/:id', auth, (req, res) => {
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id)
  if (!member) return res.status(404).json({ error: '会员不存在' })
  const orders = db.prepare('SELECT id, order_no, total, status, created_at FROM orders WHERE customer_phone = ? OR customer_name = ? ORDER BY created_at DESC LIMIT 20').all(member.phone, member.name)
  // member_coupons 表实际列名是 claimed_at（不是 obtained_at）
  const coupons = db.prepare(`SELECT mc.*, c.name, c.type, c.value, c.min_order FROM member_coupons mc JOIN coupons c ON mc.coupon_id = c.id WHERE mc.member_id = ? ORDER BY mc.claimed_at DESC`).all(member.id)
  res.json({ ...member, ...calcLevel(member.total_spent || 0), orders, coupons })
})

// 按手机号查找会员
router.post('/find-by-phone', auth, (req, res) => {
  const { phone } = req.body || {}
  if (!phone) return res.status(400).json({ error: '手机号必填' })
  const member = db.prepare('SELECT * FROM members WHERE phone = ?').get(phone)
  if (!member) return res.json(null)
  const coupons = db.prepare(`SELECT mc.id as member_coupon_id, c.* FROM member_coupons mc JOIN coupons c ON mc.coupon_id = c.id WHERE mc.member_id = ? AND mc.status = 'unused'`).all(member.id)
  res.json({ ...member, ...calcLevel(member.total_spent || 0), available_coupons: coupons })
})

// 新增会员
router.post('/', auth, (req, res) => {
  const { name, phone, email, birthday, note } = req.body || {}
  if (!name || !phone) return res.status(400).json({ error: '姓名和手机号必填' })
  const exists = db.prepare('SELECT id FROM members WHERE phone = ?').get(phone)
  if (exists) return res.status(400).json({ error: '该手机号已注册会员' })
  const result = db.prepare(`INSERT INTO members (name, phone, email, birthday, note, points, total_spent) VALUES (?, ?, ?, ?, ?, 0, 0)`).run(name, phone, email || '', birthday || '', note || '')
  res.json({ id: result.lastInsertRowid, message: '会员添加成功' })
})

// 更新会员
router.post('/update/:id', auth, (req, res) => {
  const { name, phone, email, birthday, note } = req.body || {}
  const member = db.prepare('SELECT id FROM members WHERE id = ?').get(req.params.id)
  if (!member) return res.status(404).json({ error: '会员不存在' })
  if (phone) {
    const exists = db.prepare('SELECT id FROM members WHERE phone = ? AND id != ?').get(phone, req.params.id)
    if (exists) return res.status(400).json({ error: '该手机号已被其他会员使用' })
  }
  db.prepare(`UPDATE members SET name = COALESCE(?, name), phone = COALESCE(?, phone), email = COALESCE(?, email), birthday = COALESCE(?, birthday), note = COALESCE(?, note) WHERE id = ?`).run(name, phone, email, birthday, note, req.params.id)
  res.json({ message: '会员信息已更新' })
})

// 删除会员
router.post('/delete/:id', auth, (req, res) => {
  db.prepare('DELETE FROM members WHERE id = ?').run(req.params.id)
  db.prepare('DELETE FROM member_coupons WHERE member_id = ?').run(req.params.id)
  res.json({ message: '会员已删除' })
})

// 调整积分
router.post('/points/adjust', auth, (req, res) => {
  const { member_id, points, reason } = req.body || {}
  if (!member_id || !points) return res.status(400).json({ error: '会员ID和积分数量必填' })
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(member_id)
  if (!member) return res.status(404).json({ error: '会员不存在' })
  const newPoints = Math.max(0, (member.points || 0) + parseInt(points))
  db.prepare('UPDATE members SET points = ? WHERE id = ?').run(newPoints, member_id)
  db.prepare(`INSERT INTO points_logs (member_id, points, balance, reason, created_at) VALUES (?, ?, ?, ?, datetime('now','localtime'))`).run(member_id, points, newPoints, reason || '')
  res.json({ message: '积分已调整', points: newPoints })
})

// 积分日志
router.post('/points/logs', auth, (req, res) => {
  const { member_id, page = 1, page_size = 20 } = req.body || {}
  if (!member_id) return res.status(400).json({ error: '会员ID必填' })
  const offset = (page - 1) * page_size
  const total = db.prepare('SELECT COUNT(*) as cnt FROM points_logs WHERE member_id = ?').get(member_id).cnt
  const logs = db.prepare('SELECT * FROM points_logs WHERE member_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(member_id, page_size, offset)
  res.json({ logs, total, page, page_size })
})

// 会员统计
router.post('/stats', auth, (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as cnt FROM members').get().cnt
  const todayNew = db.prepare("SELECT COUNT(*) as cnt FROM members WHERE date(created_at) = date('now','localtime')").get().cnt
  const totalPoints = db.prepare('SELECT COALESCE(SUM(points),0) as total FROM members').get().total
  // 按 total_spent 动态计算等级分布
  const rows = db.prepare('SELECT total_spent FROM members').all()
  const byLevel = {}
  rows.forEach(r => {
    const lv = calcLevel(r.total_spent || 0).level
    byLevel[lv] = (byLevel[lv] || 0) + 1
  })
  res.json({ total, todayNew, totalPoints, byLevel })
})

module.exports = router
