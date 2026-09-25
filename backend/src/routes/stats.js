const express = require('express')
const router = express.Router()
const db = require('../db')
const { auth, managerAccess } = require('../middleware/auth')

// 仪表盘概览
router.post('/overview', auth, managerAccess, (req, res) => {
  const { start_date, end_date } = req.body || {}
  let w = "WHERE status != 'cancelled'"; const p = []
  if (start_date) { w += ' AND date(created_at) >= ?'; p.push(start_date) }
  if (end_date) { w += ' AND date(created_at) <= ?'; p.push(end_date) }
  const totalOrders = db.prepare(`SELECT COUNT(*) c FROM orders ${w}`).get(...p).c
  const totalRevenue = db.prepare(`SELECT COALESCE(SUM(total),0) s FROM orders ${w}`).get(...p).s
  let totalQty = 0
  db.prepare(`SELECT items FROM orders ${w}`).all(...p).forEach(o => { try { JSON.parse(o.items||'[]').forEach(it => totalQty += +it.quantity||0) } catch {} })
  const t = new Date().toISOString().split('T')[0]
  const todayO = db.prepare("SELECT COUNT(*) c FROM orders WHERE date(created_at)=? AND status!='cancelled'").get(t).c
  const todayR = db.prepare("SELECT COALESCE(SUM(total),0) s FROM orders WHERE date(created_at)=? AND status!='cancelled'").get(t).s
  res.json({ totalOrders, totalRevenue, avgOrder: totalOrders>0?totalRevenue/totalOrders:0, totalQty, todayOrders: todayO, todayRevenue: todayR })
})

// 仪表盘：热销 TOP5（前端仪表盘调用此路径）
router.post('/products/top5', auth, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT o.items FROM orders o
      WHERE o.status NOT IN ('cancelled','completed')
    `).all()
    const pm = {}
    rows.forEach(o => {
      try {
        JSON.parse(o.items || '[]').forEach(it => {
          const id = it.id || it.product_id
          if (!id) return
          if (!pm[id]) pm[id] = { product_id: id, name: it.name || '', name_en: it.name_en || '', image: it.image || '', quantity: 0, revenue: 0 }
          pm[id].quantity += +it.quantity || 0
          pm[id].revenue += (+it.price || 0) * (+it.quantity || 0)
        })
      } catch {}
    })
    res.json(Object.values(pm).sort((a, b) => b.quantity - a.quantity).slice(0, 5))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/trend', auth, managerAccess, (req, res) => {
  const { start_date, end_date, days=7 } = req.body||{}
  let w = "WHERE status != 'cancelled'"; const p = []
  if (start_date) { w+=' AND date(created_at)>=?'; p.push(start_date) }
  if (end_date) { w+=' AND date(created_at)<=?'; p.push(end_date) }
  if (!start_date&&!end_date) { w+=" AND date(created_at)>=date('now',?)"; p.push(`-${days-1} days`) }
  const data = db.prepare(`SELECT date(created_at) d, COUNT(*) o, COALESCE(SUM(total),0) r FROM orders ${w} GROUP BY date(created_at) ORDER BY d`).all(...p)
  const r = []; const s = start_date?new Date(start_date):new Date(Date.now()-(days-1)*86400000); const e = end_date?new Date(end_date):new Date()
  for(let d=new Date(s);d<=e;d.setDate(d.getDate()+1)){ const ds=d.toISOString().split('T')[0]; const f=data.find(x=>x.d===ds); r.push({date:ds,orders:f?.o||0,revenue:f?.r||0}) }
  res.json(r)
})

router.post('/category/sales', auth, managerAccess, (req, res) => {
  const { start_date, end_date } = req.body||{}
  let w = "WHERE o.status!='cancelled'"; const p = []
  if (start_date) { w+=' AND date(o.created_at)>=?'; p.push(start_date) }
  if (end_date) { w+=' AND date(o.created_at)<=?'; p.push(end_date) }
  const orders = db.prepare(`SELECT o.items FROM orders o ${w}`).all(...p)
  const prods = db.prepare('SELECT id,category_id FROM products').all()
  const cats = db.prepare('SELECT id,name,name_en FROM categories').all()
  const pm={}; const cm={}
  prods.forEach(x=>pm[x.id]=x)
  const catMap={}
  orders.forEach(o=>{ try{ JSON.parse(o.items||'[]').forEach(it=>{ const pr=pm[it.id]; if(!pr) return; const cid=pr.category_id||0; if(!catMap[cid]){ const c=cats.find(x=>x.id===cid); catMap[cid]={category_id:cid,category_name:c?.name||'未分类',category_name_en:c?.name_en||'Uncategorized',quantity:0,revenue:0} } catMap[cid].quantity+=+it.quantity||0; catMap[cid].revenue+=(+it.price||0)*(+it.quantity||0) }) }catch{} })
  const result=Object.values(catMap).sort((a,b)=>b.revenue-a.revenue); const tr=result.reduce((s,c)=>s+c.revenue,0)
  result.forEach(c=>c.percentage=tr>0?(c.revenue/tr*100).toFixed(1):0)
  res.json(result)
})

router.post('/hourly/sales', auth, managerAccess, (req, res) => {
  const { start_date, end_date } = req.body||{}
  let w = "WHERE status!='cancelled'"; const p = []
  if (start_date) { w+=' AND date(created_at)>=?'; p.push(start_date) }
  if (end_date) { w+=' AND date(created_at)<=?'; p.push(end_date) }
  const data = db.prepare(`SELECT CAST(strftime('%H',created_at) as INT) h, COUNT(*) o, COALESCE(SUM(total),0) r FROM orders ${w} GROUP BY h ORDER BY h`).all(...p)
  const f=[]; for(let h=0;h<24;h++){ const x=data.find(d=>d.h===h); f.push({hour:h,orders:x?.o||0,revenue:x?.r||0}) }
  res.json(f)
})

router.post('/dining-type/sales', auth, managerAccess, (req, res) => {
  const { start_date, end_date } = req.body||{}
  let w = "WHERE status!='cancelled'"; const p = []
  if (start_date) { w+=' AND date(created_at)>=?'; p.push(start_date) }
  if (end_date) { w+=' AND date(created_at)<=?'; p.push(end_date) }
  const data = db.prepare(`SELECT dining_type, COUNT(*) o, COALESCE(SUM(total),0) r, COALESCE(AVG(total),0) a FROM orders ${w} GROUP BY dining_type`).all(...p)
  const lm={dinein:'堂吃',dine_in:'堂吃',takeout:'外带',delivery:'配送'}
  const em={dinein:'Dine-in',dine_in:'Dine-in',takeout:'Takeout',delivery:'Delivery'}
  res.json(data.map(d=>({...d,label:lm[d.dining_type]||d.dining_type,label_en:em[d.dining_type]||d.dining_type})))
})

router.post('/top/products', auth, managerAccess, (req, res) => {
  const { start_date, end_date, limit=10 } = req.body||{}
  let w = "WHERE o.status!='cancelled'"; const p = []
  if (start_date) { w+=' AND date(o.created_at)>=?'; p.push(start_date) }
  if (end_date) { w+=' AND date(o.created_at)<=?'; p.push(end_date) }
  const orders = db.prepare(`SELECT o.items FROM orders o ${w}`).all(...p)
  const pm={}
  orders.forEach(o=>{ try{ JSON.parse(o.items||'[]').forEach(it=>{ if(!pm[it.id]) pm[it.id]={product_id:it.id,name:it.name,name_en:it.name_en||'',quantity:0,revenue:0}; pm[it.id].quantity+=+it.quantity||0; pm[it.id].revenue+=(+it.price||0)*(+it.quantity||0) }) }catch{} })
  res.json(Object.values(pm).sort((a,b)=>b.quantity-a.quantity).slice(0,limit))
})

// 外卖菜品报表
router.post('/delivery-products', auth, managerAccess, (req, res) => {
  const { start_date, end_date } = req.body||{}
  let w = "WHERE o.status!='cancelled' AND o.dining_type IN ('delivery','takeout')"; const p = []
  if (start_date) { w+=' AND date(o.created_at)>=?'; p.push(start_date) }
  if (end_date) { w+=' AND date(o.created_at)<=?'; p.push(end_date) }
  const orders = db.prepare(`SELECT o.items FROM orders o ${w}`).all(...p)
  const prods = db.prepare('SELECT id,category_id FROM products').all()
  const cats = db.prepare('SELECT id,name,name_en FROM categories').all()
  const pm={}; const cm={}
  prods.forEach(x=>pm[x.id]=x); cats.forEach(x=>cm[x.id]=x)
  const ps={}; let tq=0, tr=0
  orders.forEach(o=>{ try{ JSON.parse(o.items||'[]').forEach(it=>{
    const q=+it.quantity||0; const r=(+it.price||0)*q; tq+=q; tr+=r
    if(!ps[it.id]){ const pr=pm[it.id]; const c=pr?cm[pr.category_id]:null; ps[it.id]={product_id:it.id,name:it.name,name_en:it.name_en||'',category_id:pr?.category_id||0,category_name:c?.name||'未分类',category_name_en:c?.name_en||'Uncategorized',quantity:0,revenue:0,order_count:0} }
    ps[it.id].quantity+=q; ps[it.id].revenue+=r; ps[it.id].order_count+=1
  }) }catch{} })
  const list=Object.values(ps).sort((a,b)=>b.quantity-a.quantity)
  list.forEach(x=>{ x.quantity_pct=tq>0?(x.quantity/tq*100).toFixed(1):0; x.revenue_pct=tr>0?(x.revenue/tr*100).toFixed(1):0 })
  const cs={}
  list.forEach(x=>{ if(!cs[x.category_id]) cs[x.category_id]={category_id:x.category_id,category_name:x.category_name,category_name_en:x.category_name_en,quantity:0,revenue:0,product_count:0}; cs[x.category_id].quantity+=x.quantity; cs[x.category_id].revenue+=x.revenue; cs[x.category_id].product_count+=1 })
  res.json({ summary:{totalOrders:orders.length,totalQty:tq,totalRevenue:tr,avgOrderValue:orders.length>0?(tr/orders.length).toFixed(2):0}, products:list, categories:Object.values(cs).sort((a,b)=>b.revenue-a.revenue) })
})

module.exports = router
