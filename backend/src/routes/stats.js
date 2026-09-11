const express = require('express');
const db = require('../db');
const { auth, managerAccess } = require('../middleware/auth');
const XLSX = require('xlsx');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'profit');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    cb(null, `${ts}_${file.originalname}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

db.exec(`CREATE TABLE IF NOT EXISTS profit_records (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER, product_name TEXT NOT NULL, purchase_price REAL NOT NULL DEFAULT 0, purchase_qty REAL NOT NULL DEFAULT 0, unit TEXT DEFAULT '磅', portion_per_unit REAL NOT NULL DEFAULT 0, sell_price REAL NOT NULL DEFAULT 0, created_at TEXT DEFAULT (datetime('now','localtime')))`);

function saveProfitRecord(row) {
  db.prepare(`INSERT INTO profit_records (product_id, product_name, purchase_price, purchase_qty, unit, portion_per_unit, sell_price) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(row.productId || null, row.name, row.purchasePrice, row.purchaseQty, row.unit || '磅', row.portionPerUnit, row.sellPrice);
}

function calcProfit(row) {
  const price = parseFloat(row.purchasePrice) || 0;
  const qty = parseFloat(row.purchaseQty) || 0;
  const portion = parseFloat(row.portionPerUnit) || 0;
  const sell = parseFloat(row.sellPrice) || 0;
  if (price <= 0 || qty <= 0 || portion <= 0 || sell <= 0) return null;
  const unitCost = price / qty;
  const portionCost = unitCost / portion;
  const portionProfit = sell - portionCost;
  const profitRate = (portionProfit / sell) * 100;
  const totalPortions = qty * portion;
  const totalRevenue = totalPortions * sell;
  const totalProfit = totalRevenue - price;
  const breakEven = portionProfit > 0 ? Math.ceil(price / portionProfit) : 0;
  return { unitCost, portionCost, portionProfit, profitRate, totalPortions, totalRevenue, totalProfit, breakEven };
}

function calcProductStats() {
  const products = db.prepare('SELECT id, name, name_en, category_id, price, available FROM products').all();
  const orders = db.prepare("SELECT items FROM orders WHERE status != 'cancelled'").all();
  const statsMap = {};
  for (const p of products) { statsMap[p.id] = { product_id: p.id, name: p.name, category_id: p.category_id, price: p.price, available: p.available, order_count: 0, total_sold: 0 }; }
  for (const o of orders) {
    let items = [];
    try { items = JSON.parse(o.items || '[]'); } catch { continue; }
    const seenInOrder = new Set();
    for (const it of items) {
      const pid = it.id;
      if (!statsMap[pid]) continue;
      if (!seenInOrder.has(pid)) { statsMap[pid].order_count++; seenInOrder.add(pid); }
      statsMap[pid].total_sold += parseInt(it.quantity) || 0;
    }
  }
  return Object.values(statsMap).sort((a, b) => b.order_count - a.order_count || b.total_sold - a.total_sold);
}

router.post('/products', auth, managerAccess, (req, res) => {
  const list = calcProductStats();
  const hotThreshold = parseInt(req.query.threshold) || 15;
  const result = list.map(item => {
    let tag = 'cold';
    if (item.order_count >= hotThreshold) tag = 'hot';
    else if (item.order_count >= 1) tag = 'normal';
    return { ...item, tag, tagText: tag === 'hot' ? '🔥 热销' : tag === 'normal' ? '📈 平销' : '🪫 滞销' };
  });
  res.json(result);
});

router.post('/products/top5', auth, managerAccess, (req, res) => {
  const list = calcProductStats().filter(i => i.order_count > 0).slice(0, 5);
  res.json(list);
});

router.post('/profit/template', auth, managerAccess, (req, res) => {
  const headers = ['菜品名称', '采购总价($)', '采购总量', '采购单位', '每单位出几份', '每份售价($)'];
  const example = ['烤羊肉串', 50, 5, '磅', 4, 3.99];
  const example2 = ['黑糖珍珠奶茶', 30, 2, '升', 10, 5.99];
  const ws = XLSX.utils.aoa_to_sheet([headers, example, example2]);
  ws['!cols'] = [{ wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '利润计算模板');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="profit_template.xlsx"');
  res.send(buf);
});

router.post('/profit/import', auth, managerAccess, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请上传 Excel 文件' });
  try {
    const wb = XLSX.readFile(req.file.path);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (rows.length < 2) return res.status(400).json({ error: 'Excel 没有数据行' });
    const results = [];
    const errors = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length === 0 || !r[0]) continue;
      const name = String(r[0] || '').trim();
      const purchasePrice = parseFloat(r[1]) || 0;
      const purchaseQty = parseFloat(r[2]) || 0;
      const unit = String(r[3] || '磅').trim();
      const portionPerUnit = parseFloat(r[4]) || 0;
      const sellPrice = parseFloat(r[5]) || 0;
      const row = { name, purchasePrice, purchaseQty, unit, portionPerUnit, sellPrice };
      const calc = calcProfit(row);
      if (!calc) { errors.push(`第 ${i + 1} 行（${name}）：数据不完整或无效`); continue; }
      const result = { ...row, ...calc };
      results.push(result);
      try { saveProfitRecord(row); } catch (e) {}
    }
    res.json({ filename: req.file.filename, filepath: `/uploads/profit/${req.file.filename}`, total: results.length, errors, results });
  } catch (e) {
    res.status(500).json({ error: '解析 Excel 失败：' + e.message });
  }
});

router.post('/profit/export', auth, managerAccess, (req, res) => {
  const data = req.body.results || [];
  if (data.length === 0) return res.status(400).json({ error: '没有可导出的数据' });
  const headers = ['菜品名称', '采购总价($)', '采购总量', '采购单位', '每单位出几份', '每份售价($)', '每单位成本($)', '每份成本($)', '每份利润($)', '利润率(%)', '总可出份数', '全部卖完营收($)', '全部卖完利润($)', '回本次数'];
  const rows = data.map(d => [d.name, d.purchasePrice, d.purchaseQty, d.unit, d.portionPerUnit, d.sellPrice, Number(d.unitCost?.toFixed(2)), Number(d.portionCost?.toFixed(3)), Number(d.portionProfit?.toFixed(2)), Number(d.profitRate?.toFixed(1)), Number(d.totalPortions?.toFixed(1)), Number(d.totalRevenue?.toFixed(2)), Number(d.totalProfit?.toFixed(2)), d.breakEven]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = headers.map(() => ({ wch: 14 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '利润计算结果');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="profit_result.xlsx"');
  res.send(buf);
});

router.post('/profit/history/search', auth, managerAccess, (req, res) => {
  const keyword = (req.query.keyword || '').trim();
  if (!keyword) return res.json([]);
  const historyProducts = db.prepare(`SELECT DISTINCT product_id, product_name as name, MAX(created_at) as last_used FROM profit_records WHERE product_name LIKE ? GROUP BY product_id, product_name ORDER BY last_used DESC LIMIT 20`).all(`%${keyword}%`);
  const historyNames = new Set(historyProducts.map(h => h.name));
  const products = db.prepare(`SELECT id as product_id, name, NULL as last_used FROM products WHERE name LIKE ? AND name NOT IN (${historyNames.size > 0 ? historyNames.map(() => '?').join(',') : "''"}) LIMIT 20`).all(`%${keyword}%`, ...historyNames);
  res.json([...historyProducts, ...products]);
});

router.post('/profit/history/latest', auth, managerAccess, (req, res) => {
  const productId = req.query.product_id;
  const productName = req.query.product_name;
  let record;
  if (productId) { record = db.prepare(`SELECT * FROM profit_records WHERE product_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`).get(productId); }
  else if (productName) { record = db.prepare(`SELECT * FROM profit_records WHERE product_name = ? ORDER BY created_at DESC, id DESC LIMIT 1`).get(productName); }
  if (!record) return res.json(null);
  res.json({ productId: record.product_id, name: record.product_name, purchasePrice: record.purchase_price, purchaseQty: record.purchase_qty, unit: record.unit, portionPerUnit: record.portion_per_unit, sellPrice: record.sell_price, createdAt: record.created_at });
});

router.post('/profit/save', auth, managerAccess, (req, res) => {
  const { productId, name, purchasePrice, purchaseQty, unit, portionPerUnit, sellPrice } = req.body;
  if (!name || !purchasePrice || !purchaseQty || !portionPerUnit || !sellPrice) return res.status(400).json({ error: '请填写完整的成本数据' });
  try { saveProfitRecord({ productId, name, purchasePrice, purchaseQty, unit, portionPerUnit, sellPrice }); res.json({ success: true, message: '记录已保存' }); }
  catch (e) { res.status(500).json({ error: '保存失败：' + e.message }); }
});

router.post('/overview', auth, managerAccess, (req, res) => {
  const { start_date, end_date } = req.body || {}
  let dateWhere = "WHERE status != 'cancelled'"
  const params = []
  if (start_date) { dateWhere += ' AND date(created_at) >= ?'; params.push(start_date) }
  if (end_date) { dateWhere += ' AND date(created_at) <= ?'; params.push(end_date) }
  const totalOrders = db.prepare(`SELECT COUNT(*) as cnt FROM orders ${dateWhere}`).get(...params).cnt
  const totalRevenue = db.prepare(`SELECT COALESCE(SUM(total),0) as total FROM orders ${dateWhere}`).get(...params).total
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const totalItems = db.prepare(`SELECT items FROM orders ${dateWhere}`).all(...params)
  let totalQty = 0
  for (const o of totalItems) { try { const items = JSON.parse(o.items || '[]'); totalQty += items.reduce((s, i) => s + (parseInt(i.quantity) || 0), 0) } catch {} }
  const todayOrders = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE date(created_at) = date('now','localtime') AND status != 'cancelled'").get().cnt
  const todayRevenue = db.prepare("SELECT COALESCE(SUM(total),0) as total FROM orders WHERE date(created_at) = date('now','localtime') AND status != 'cancelled'").get().total
  res.json({ totalOrders, totalRevenue, avgOrder, totalQty, todayOrders, todayRevenue })
})

router.post('/sales/trend', auth, managerAccess, (req, res) => {
  const { days = 7, start_date, end_date } = req.body || {}
  let dateWhere = "WHERE status != 'cancelled'"
  const params = []
  if (start_date) { dateWhere += ' AND date(created_at) >= ?'; params.push(start_date) }
  if (end_date) { dateWhere += ' AND date(created_at) <= ?'; params.push(end_date) }
  else { dateWhere += " AND date(created_at) >= date('now','localtime', ?)"; params.push(`-${days - 1} days`) }
  const data = db.prepare(`SELECT date(created_at) as date, COUNT(*) as orders, COALESCE(SUM(total),0) as revenue FROM orders ${dateWhere} GROUP BY date(created_at) ORDER BY date ASC`).all(...params)
  res.json(data)
})

router.post('/category/sales', auth, managerAccess, (req, res) => {
  const { start_date, end_date } = req.body || {}
  let dateWhere = "WHERE o.status != 'cancelled'"
  const params = []
  if (start_date) { dateWhere += ' AND date(o.created_at) >= ?'; params.push(start_date) }
  if (end_date) { dateWhere += ' AND date(o.created_at) <= ?'; params.push(end_date) }
  const orders = db.prepare(`SELECT o.items FROM orders o ${dateWhere}`).all(...params)
  const catMap = {}
  const categories = db.prepare('SELECT id, name FROM categories').all()
  const products = db.prepare('SELECT id, category_id, name, price FROM products').all()
  const prodCat = {}
  for (const p of products) prodCat[p.id] = p
  for (const o of orders) {
    try {
      const items = JSON.parse(o.items || '[]')
      for (const it of items) {
        const p = prodCat[it.id]
        if (!p) continue
        const catId = p.category_id || 0
        if (!catMap[catId]) { const cat = categories.find(c => c.id === catId); catMap[catId] = { category_id: catId, category_name: cat?.name || '未分类', quantity: 0, revenue: 0, order_count: 0 } }
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

router.post('/hourly/sales', auth, managerAccess, (req, res) => {
  const { start_date, end_date } = req.body || {}
  let dateWhere = "WHERE status != 'cancelled'"
  const params = []
  if (start_date) { dateWhere += ' AND date(created_at) >= ?'; params.push(start_date) }
  if (end_date) { dateWhere += ' AND date(created_at) <= ?'; params.push(end_date) }
  const data = db.prepare(`SELECT CAST(strftime('%H', created_at) as INTEGER) as hour, COUNT(*) as orders, COALESCE(SUM(total),0) as revenue FROM orders ${dateWhere} GROUP BY hour ORDER BY hour ASC`).all(...params)
  const full = []
  for (let h = 0; h < 24; h++) { const found = data.find(d => d.hour === h); full.push({ hour: h, orders: found?.orders || 0, revenue: found?.revenue || 0 }) }
  res.json(full)
})

router.post('/dining-type/sales', auth, managerAccess, (req, res) => {
  const { start_date, end_date } = req.body || {}
  let dateWhere = "WHERE status != 'cancelled'"
  const params = []
  if (start_date) { dateWhere += ' AND date(created_at) >= ?'; params.push(start_date) }
  if (end_date) { dateWhere += ' AND date(created_at) <= ?'; params.push(end_date) }
  const data = db.prepare(`SELECT dining_type, COUNT(*) as orders, COALESCE(SUM(total),0) as revenue, COALESCE(AVG(total),0) as avg_order FROM orders ${dateWhere} GROUP BY dining_type`).all(...params)
  const labelMap = { dinein: '堂吃', takeout: '外带', delivery: '配送' }
  const result = data.map(d => ({ ...d, label: labelMap[d.dining_type] || d.dining_type }))
  res.json(result)
})

router.post('/top/products', auth, managerAccess, (req, res) => {
  const { limit = 10, start_date, end_date } = req.body || {}
  let dateWhere = "WHERE o.status != 'cancelled'"
  const params = []
  if (start_date) { dateWhere += ' AND date(o.created_at) >= ?'; params.push(start_date) }
  if (end_date) { dateWhere += ' AND date(o.created_at) <= ?'; params.push(end_date) }
  const orders = db.prepare(`SELECT o.items FROM orders o ${dateWhere}`).all(...params)
  const prodMap = {}
  const products = db.prepare('SELECT id, name, name_en, price, category_id FROM products').all()
  const prodInfo = {}
  for (const p of products) prodInfo[p.id] = p
  for (const o of orders) {
    try {
      const items = JSON.parse(o.items || '[]')
      for (const it of items) {
        if (!prodMap[it.id]) prodMap[it.id] = { product_id: it.id, quantity: 0, revenue: 0, order_count: 0 }
        prodMap[it.id].quantity += parseInt(it.quantity) || 0
        prodMap[it.id].revenue += (parseFloat(it.price) || 0) * (parseInt(it.quantity) || 0)
      }
    } catch {}
  }
  const result = Object.values(prodMap).map(p => ({ ...p, name: prodInfo[p.product_id]?.name || '未知', name_en: prodInfo[p.product_id]?.name_en || '', price: prodInfo[p.product_id]?.price || 0 })).sort((a, b) => b.quantity - a.quantity).slice(0, limit)
  res.json(result)
})

router.post('/profit/analysis', auth, managerAccess, (req, res) => {
  const { start_date, end_date } = req.body || {}
  let dateWhere = "WHERE o.status != 'cancelled'"
  const params = []
  if (start_date) { dateWhere += ' AND date(o.created_at) >= ?'; params.push(start_date) }
  if (end_date) { dateWhere += ' AND date(o.created_at) <= ?'; params.push(end_date) }
  const orders = db.prepare(`SELECT o.items, o.total FROM orders o ${dateWhere}`).all(...params)
  const totalRevenue = orders.reduce((s, o) => s + (parseFloat(o.total) || 0), 0)
  const totalOrders = orders.length
  const prodSales = {}
  for (const o of orders) {
    try {
      const items = JSON.parse(o.items || '[]')
      for (const it of items) {
        if (!prodSales[it.id]) prodSales[it.id] = { quantity: 0, revenue: 0 }
        prodSales[it.id].quantity += parseInt(it.quantity) || 0
        prodSales[it.id].revenue += (parseFloat(it.price) || 0) * (parseInt(it.quantity) || 0)
      }
    } catch {}
  }
  const products = db.prepare('SELECT id, name, price FROM products').all()
  const result = products.map(p => ({ product_id: p.id, name: p.name, price: p.price, quantity: prodSales[p.id]?.quantity || 0, revenue: prodSales[p.id]?.revenue || 0, cost: 0, profit: prodSales[p.id]?.revenue || 0 })).filter(r => r.quantity > 0).sort((a, b) => b.revenue - a.revenue)
  res.json({ totalRevenue, totalOrders, products: result, totalCost: 0, totalProfit: totalRevenue })
})

module.exports = router;