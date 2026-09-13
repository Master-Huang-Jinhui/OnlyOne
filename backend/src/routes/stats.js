const express = require('express')
const router = express.Router()
const db = require('../db')
const { auth, managerAccess } = require('../middleware/auth')

// 概览统计
router.post('/overview', auth, managerAccess, (req, res) => {
  const { start_date, end_date } = req.body || {}
  let dateWhere = "WHERE status != 'cancelled'"
  const params = []
  if (start_date) { dateWhere += ' AND date(created_at) >= ?'; params.push(start_date) }
  if (end_date) { dateWhere += ' AND date(created_at) <= ?'; params.push(end_date) }

  const totalOrders = db.prepare(`SELECT COUNT(*) as cnt FROM orders ${dateWhere}`).get(...params).cnt
  const totalRevenue = db.prepare(`SELECT COALESCE(SUM(total),0) as sum FROM orders ${dateWhere}`).get(...params).sum
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0

  let totalQty = 0
  const orders = db.prepare(`SELECT items FROM orders ${dateWhere}`).all(...params)
  orders.forEach(o => {
    try { JSON.parse(o.items || '[]').forEach(it => { totalQty += parseInt(it.quantity) || 0 }) } catch {}
  })

  const today = new Date().toISOString().split('T')[0]
  const todayOrders = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE date(created_at) = ? AND status != 'cancelled'").get(today).cnt
  const todayRevenue = db.prepare("SELECT COALESCE(SUM(total),0) as sum FROM orders WHERE date(created_at) = ? AND status != 'cancelled'").get(today).sum

  res.json({ totalOrders, totalRevenue, avgOrder, totalQty, todayOrders, todayRevenue })
})

// 销售趋势（按天）
router.post('/trend', auth, managerAccess, (req, res) => {
  const { start_date, end_date, days = 7 } = req.body || {}
  let dateWhere = "WHERE status != 'cancelled'"
  const params = []
  if (start_date) { dateWhere += ' AND date(created_at) >= ?'; params.push(start_date) }
  if (end_date) { dateWhere += ' AND date(created_at) <= ?'; params.push(end_date) }
  if (!start_date && !end_date) {
    dateWhere += " AND date(created_at) >= date('now', ?)"
    params.push(`-${days - 1} days`)
  }

  const data = db.prepare(`
    SELECT date(created_at) as date, COUNT(*) as orders, COALESCE(SUM(total),0) as revenue
    FROM orders ${dateWhere}
    GROUP BY date(created_at)
    ORDER BY date ASC
  `).all(...params)

  // 填充缺失日期
  const result = []
  const start = start_date ? new Date(start_date) : new Date(Date.now() - (days - 1) * 86400000)
  const end = end_date ? new Date(end_date) : new Date()
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    const found = data.find(x => x.date === dateStr)
    result.push({ date: dateStr, orders: found?.orders || 0, revenue: found?.revenue || 0 })
  }
  res.json(result)
})

// 品类销售分析
router.post('/category/sales', auth, managerAccess, (req, res) => {
  const { start_date, end_date } = req.body || {}
  let dateWhere = "WHERE o.status != 'cancelled'"
  const params = []
  if (start_date) { dateWhere += ' AND date(o.created_at) >= ?'; params.push(start_date) }
  if (end_date) { dateWhere += ' AND date(o.created_at) <= ?'; params.push(end_date) }

  const orders = db.prepare(`SELECT o.items FROM orders o ${dateWhere}`).all(...params)
  const products = db.prepare('SELECT id, category_id FROM products').all()
  const categories = db.prepare('SELECT id, name, name_en FROM categories').all()

  const catMap = {}
  const prodCat = {}
  for (const p of products) prodCat[p.id] = p

  for (const o of orders) {
    try {
      const items = JSON.parse(o.items || '[]')
      for (const it of items) {
        const p = prodCat[it.id]
        if (!p) continue
        const catId = p.category_id || 0
        if (!catMap[catId]) {
          const cat = categories.find(c => c.id === catId)
          catMap[catId] = { category_id: catId, category_name: cat?.name || '未分类', category_name_en: cat?.name_en || 'Uncategorized', quantity: 0, revenue: 0, order_count: 0 }
        }
        catMap[catId].quantity += parseInt(it.quantity) || 0
        catMap[catId].revenue += (parseFloat(it.price) || 0) * (parseInt(it.quantity) || 0)
      }
    } catch {}
  }
  const result = Object.values(catMap).sort((a, b) => b.revenue - a.revenue)
  const totalRevenue = result.reduce((s, c) => s + c.revenue, 0)
  result.forEach(c => { c.percentage = totalRevenue > 0 ? (c.revenue / totalRevenue * 100).toFixed(1) : 0 })
  res.json(result)
})

// 时段分析（按小时）
router.post('/hourly/sales', auth, managerAccess, (req, res) => {
  const { start_date, end_date } = req.body || {}
  let dateWhere = "WHERE status != 'cancelled'"
  const params = []
  if (start_date) { dateWhere += ' AND date(created_at) >= ?'; params.push(start_date) }
  if (end_date) { dateWhere += ' AND date(created_at) <= ?'; params.push(end_date) }

  const data = db.prepare(`
    SELECT CAST(strftime('%H', created_at) as INTEGER) as hour, 
    COUNT(*) as orders, COALESCE(SUM(total),0) as revenue
    FROM orders ${dateWhere}
    GROUP BY hour
    ORDER BY hour ASC
  `).all(...params)
  const full = []
  for (let h = 0; h < 24; h++) {
    const found = data.find(d => d.hour === h)
    full.push({ hour: h, orders: found?.orders || 0, revenue: found?.revenue || 0 })
  }
  res.json(full)
})

// 订单类型分析
router.post('/dining-type/sales', auth, managerAccess, (req, res) => {
  const { start_date, end_date } = req.body || {}
  let dateWhere = "WHERE status != 'cancelled'"
  const params = []
  if (start_date) { dateWhere += ' AND date(created_at) >= ?'; params.push(start_date) }
  if (end_date) { dateWhere += ' AND date(created_at) <= ?'; params.push(end_date) }

  const data = db.prepare(`
    SELECT dining_type, COUNT(*) as orders, COALESCE(SUM(total),0) as revenue,
    COALESCE(AVG(total),0) as avg_order
    FROM orders ${dateWhere}
    GROUP BY dining_type
  `).all(...params)
  const labelMap = { dinein: '堂吃', dine_in: '堂吃', takeout: '外带', delivery: '配送' }
  const labelEnMap = { dinein: 'Dine-in', dine_in: 'Dine-in', takeout: 'Takeout', delivery: 'Delivery' }
  const result = data.map(d => ({ ...d, label: labelMap[d.dining_type] || d.dining_type, label_en: labelEnMap[d.dining_type] || d.dining_type }))
  res.json(result)
})

// TOP商品排行
router.post('/top/products', auth, managerAccess, (req, res) => {
  const { start_date, end_date, limit = 10 } = req.body || {}
  let dateWhere = "WHERE o.status != 'cancelled'"
  const params = []
  if (start_date) { dateWhere += ' AND date(o.created_at) >= ?'; params.push(start_date) }
  if (end_date) { dateWhere += ' AND date(o.created_at) <= ?'; params.push(end_date) }

  const orders = db.prepare(`SELECT o.items FROM orders o ${dateWhere}`).all(...params)
  const productMap = {}
  orders.forEach(o => {
    try {
      JSON.parse(o.items || '[]').forEach(it => {
        if (!productMap[it.id]) productMap[it.id] = { product_id: it.id, name: it.name, name_en: it.name_en || '', quantity: 0, revenue: 0 }
        productMap[it.id].quantity += parseInt(it.quantity) || 0
        productMap[it.id].revenue += (parseFloat(it.price) || 0) * (parseInt(it.quantity) || 0)
      })
    } catch {}
  })
  const result = Object.values(productMap).sort((a, b) => b.quantity - a.quantity).slice(0, limit)
  res.json(result)
})

module.exports = router
