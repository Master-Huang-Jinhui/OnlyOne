const express = require('express')
const router = express.Router()
const db = require('../db')
const auth = require('../middleware/auth')

router.post('/list', auth, (req, res) => {
  const { status, page = 1, page_size = 20 } = req.body || {}
  let where = 'WHERE 1=1'
  const params = []
  if (status === 'active') { where += " AND enabled = 1 AND (end_date IS NULL OR end_date >= date('now','localtime'))" }
  else if (status === 'expired') { where += " AND end_date < date('now','localtime')" }
  else if (status === 'disabled') { where += ' AND enabled = 0' }
  const offset = (page - 1) * page_size
  const total = db.prepare(`SELECT COUNT(*) as cnt FROM coupons ${where}`).get(...params).cnt
  const coupons = db.prepare(`SELECT * FROM coupons ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, page_size, offset)
  res.json({ coupons, total, page, page_size })
})

router.post('/available', (req, res) => {
  const coupons = db.prepare(`SELECT * FROM coupons WHERE enabled = 1 AND (end_date IS NULL OR end_date >= date('now','localtime')) AND (stock IS NULL OR stock > used_count) ORDER BY sort_order, created_at DESC`).all()
  res.json(coupons)
})

router.post('/detail/:id', auth, (req, res) => {
  const coupon = db.prepare('SELECT * FROM coupons WHERE id = ?').get(req.params.id)
  if (!coupon) return res.status(404).json({ error: '优惠券不存在' })
  const received = db.prepare('SELECT COUNT(*) as cnt FROM member_coupons WHERE coupon_id = ?').get(req.params.id).cnt
  const used = db.prepare("SELECT COUNT(*) as cnt FROM member_coupons WHERE coupon_id = ? AND status = 'used'").get(req.params.id).cnt
  res.json({ ...coupon, received_count: received, used_count: used })
})

router.post('/', auth, (req, res) => {
  const { name, type, value, min_amount = 0, max_discount = null, valid_days = null, stock = null, start_date = null, end_date = null, sort_order = 0 } = req.body || {}
  if (!name || !type || !value) return res.status(400).json({ error: '名称、类型、面值必填' })
  if (!['fixed', 'percent'].includes(type)) return res.status(400).json({ error: '类型只能是 fixed 或 percent' })
  const result = db.prepare(`INSERT INTO coupons (name, type, value, min_amount, max_discount, valid_days, stock, used_count, start_date, end_date, enabled, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 1, ?)`).run(name, type, value, min_amount, max_discount, valid_days, stock, start_date, end_date, sort_order)
  res.json({ id: result.lastInsertRowid, message: '优惠券创建成功' })
})

router.post('/update/:id', auth, (req, res) => {
  const coupon = db.prepare('SELECT id FROM coupons WHERE id = ?').get(req.params.id)
  if (!coupon) return res.status(404).json({ error: '优惠券不存在' })
  const { name, type, value, min_amount, max_discount, valid_days, stock, start_date, end_date, enabled, sort_order } = req.body || {}
  db.prepare(`UPDATE coupons SET name = COALESCE(?, name), type = COALESCE(?, type), value = COALESCE(?, value), min_amount = COALESCE(?, min_amount), max_discount = COALESCE(?, max_discount), valid_days = COALESCE(?, valid_days), stock = COALESCE(?, stock), start_date = COALESCE(?, start_date), end_date = COALESCE(?, end_date), enabled = COALESCE(?, enabled), sort_order = COALESCE(?, sort_order) WHERE id = ?`).run(name, type, value, min_amount, max_discount, valid_days, stock, start_date, end_date, enabled, sort_order, req.params.id)
  res.json({ message: '优惠券已更新' })
})

router.post('/delete/:id', auth, (req, res) => {
  db.prepare('DELETE FROM coupons WHERE id = ?').run(req.params.id)
  db.prepare('DELETE FROM member_coupons WHERE coupon_id = ?').run(req.params.id)
  res.json({ message: '优惠券已删除' })
})

router.post('/claim', auth, (req, res) => {
  const { member_id, coupon_id } = req.body || {}
  if (!member_id || !coupon_id) return res.status(400).json({ error: '会员ID和优惠券ID必填' })
  const member = db.prepare('SELECT id FROM members WHERE id = ?').get(member_id)
  if (!member) return res.status(404).json({ error: '会员不存在' })
  const coupon = db.prepare('SELECT * FROM coupons WHERE id = ?').get(coupon_id)
  if (!coupon) return res.status(404).json({ error: '优惠券不存在' })
  if (!coupon.enabled) return res.status(400).json({ error: '优惠券已下架' })
  if (coupon.stock && coupon.used_count >= coupon.stock) return res.status(400).json({ error: '优惠券已领完' })
  const already = db.prepare("SELECT id FROM member_coupons WHERE member_id = ? AND coupon_id = ? AND status = 'unused'").get(member_id, coupon_id)
  if (already) return res.status(400).json({ error: '您已领取该优惠券' })
  const expireDate = coupon.valid_days ? new Date(Date.now() + coupon.valid_days * 86400000).toISOString().split('T')[0] : coupon.end_date
  const result = db.prepare(`INSERT INTO member_coupons (member_id, coupon_id, status, expire_date, obtained_at) VALUES (?, ?, 'unused', ?, datetime('now','localtime'))`).run(member_id, coupon_id, expireDate)
  db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?').run(coupon_id)
  res.json({ id: result.lastInsertRowid, message: '领取成功' })
})

router.post('/member/list', auth, (req, res) => {
  const { member_id, status } = req.body || {}
  if (!member_id) return res.status(400).json({ error: '会员ID必填' })
  let where = 'WHERE mc.member_id = ?'
  const params = [member_id]
  if (status) { where += ' AND mc.status = ?'; params.push(status) }
  const coupons = db.prepare(`SELECT mc.*, c.name, c.type, c.value, c.min_amount, c.max_discount FROM member_coupons mc JOIN coupons c ON mc.coupon_id = c.id ${where} ORDER BY mc.obtained_at DESC`).all(...params)
  res.json(coupons)
})

router.post('/use', auth, (req, res) => {
  const { member_coupon_id, order_id } = req.body || {}
  if (!member_coupon_id) return res.status(400).json({ error: '会员优惠券ID必填' })
  const mc = db.prepare('SELECT * FROM member_coupons WHERE id = ?').get(member_coupon_id)
  if (!mc) return res.status(404).json({ error: '优惠券不存在' })
  if (mc.status !== 'unused') return res.status(400).json({ error: '优惠券已使用或已过期' })
  db.prepare(`UPDATE member_coupons SET status = 'used', used_at = datetime('now','localtime'), order_id = ? WHERE id = ?`).run(order_id || null, member_coupon_id)
  res.json({ message: '优惠券已使用' })
})

router.post('/stats', auth, (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as cnt FROM coupons').get().cnt
  const active = db.prepare("SELECT COUNT(*) as cnt FROM coupons WHERE enabled = 1 AND (end_date IS NULL OR end_date >= date('now','localtime'))").get().cnt
  const totalClaimed = db.prepare('SELECT COUNT(*) as cnt FROM member_coupons').get().cnt
  const totalUsed = db.prepare("SELECT COUNT(*) as cnt FROM member_coupons WHERE status = 'used'").get().cnt
  res.json({ total, active, totalClaimed, totalUsed })
})

module.exports = router