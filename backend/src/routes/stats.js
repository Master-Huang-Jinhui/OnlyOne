const express = require('express');
const db = require('../db');
const { auth, managerAccess } = require('../middleware/auth');
const XLSX = require('xlsx');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// 确保上传目录存在
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

// 利润计算
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

// 统计所有菜品销量（从 orders.items JSON 聚合）
function calcProductStats() {
  const products = db.prepare('SELECT id, name, name_en, category_id, price, available FROM products').all();
  const orders = db.prepare("SELECT items FROM orders WHERE status != 'cancelled'").all();

  const statsMap = {};
  for (const p of products) {
    statsMap[p.id] = { product_id: p.id, name: p.name, category_id: p.category_id, price: p.price, available: p.available, order_count: 0, total_sold: 0 };
  }

  for (const o of orders) {
    let items = [];
    try { items = JSON.parse(o.items || '[]'); } catch { continue; }
    const seenInOrder = new Set();
    for (const it of items) {
      const pid = it.id;
      if (!statsMap[pid]) continue;
      if (!seenInOrder.has(pid)) {
        statsMap[pid].order_count++;
        seenInOrder.add(pid);
      }
      statsMap[pid].total_sold += parseInt(it.quantity) || 0;
    }
  }

  return Object.values(statsMap).sort((a, b) => b.order_count - a.order_count || b.total_sold - a.total_sold);
}

// 全部菜品统计
router.get('/products', auth, managerAccess, (req, res) => {
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

// TOP5 热销（首页卡片用）
router.get('/products/top5', auth, managerAccess, (req, res) => {
  const list = calcProductStats().filter(i => i.order_count > 0).slice(0, 5);
  res.json(list);
});

// ===== 利润计算器 Excel 导入导出 =====

// 下载 Excel 模板
router.get('/profit/template', auth, managerAccess, (req, res) => {
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

// 导入 Excel 批量计算
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
      if (!calc) {
        errors.push(`第 ${i + 1} 行（${name}）：数据不完整或无效`);
        continue;
      }
      results.push({ ...row, ...calc });
    }

    res.json({
      filename: req.file.filename,
      filepath: `/uploads/profit/${req.file.filename}`,
      total: results.length,
      errors,
      results
    });
  } catch (e) {
    res.status(500).json({ error: '解析 Excel 失败：' + e.message });
  }
});

// 导出计算结果为 Excel
router.post('/profit/export', auth, managerAccess, (req, res) => {
  const data = req.body.results || [];
  if (data.length === 0) return res.status(400).json({ error: '没有可导出的数据' });

  const headers = ['菜品名称', '采购总价($)', '采购总量', '采购单位', '每单位出几份', '每份售价($)', '每单位成本($)', '每份成本($)', '每份利润($)', '利润率(%)', '总可出份数', '全部卖完营收($)', '全部卖完利润($)', '回本次数'];
  const rows = data.map(d => [
    d.name, d.purchasePrice, d.purchaseQty, d.unit, d.portionPerUnit, d.sellPrice,
    Number(d.unitCost?.toFixed(2)), Number(d.portionCost?.toFixed(3)), Number(d.portionProfit?.toFixed(2)),
    Number(d.profitRate?.toFixed(1)), Number(d.totalPortions?.toFixed(1)),
    Number(d.totalRevenue?.toFixed(2)), Number(d.totalProfit?.toFixed(2)), d.breakEven
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = headers.map(() => ({ wch: 14 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '利润计算结果');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="profit_result.xlsx"');
  res.send(buf);
});

module.exports = router;
