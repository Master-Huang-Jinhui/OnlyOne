const express = require('express');
const db = require('../db');
const { auth, managerAccess } = require('../middleware/auth');
const { auditLog } = require('../utils/audit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');

const router = express.Router();

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../uploads/reports');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'report-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = /csv|pdf/
    const ext = path.extname(file.originalname).toLowerCase().slice(1)
    if (allowed.test(ext)) cb(null, true)
    else cb(new Error('只支持 CSV 或 PDF 文件'))
  }
}); // 支持 CSV 和 PDF

// 从 PDF 文本中提取关键数据
function extractDataFromText(text) {
  const result = {};
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  // 找第 i 行后面最近的一个金额数字（支持负数括号格式 $(15.41)）
  const findNextAmount = (startIdx) => {
    for (let i = startIdx; i < Math.min(startIdx + 5, lines.length); i++) {
      // 匹配 $88.01 或 $(15.41) 或 (15.41)
      let m = lines[i].match(/\$\(([0-9,]+\.\d{2})\)/);
      if (m) return -parseFloat(m[1].replace(/,/g, ''));
      m = lines[i].match(/\$?\(?([0-9,]+\.\d{2})\)?/);
      if (m && /\$|\(/.test(lines[i])) return parseFloat(m[1].replace(/,/g, ''));
    }
    return null;
  };
  
  // 找第 i 行后面最近的一个纯数字
  const findNextNumber = (startIdx) => {
    for (let i = startIdx; i < Math.min(startIdx + 5, lines.length); i++) {
      const m = lines[i].match(/^(\d+)$/) || lines[i].match(/[^0-9.](\d+)[^0-9.]/);
      if (m) return parseInt(m[1]);
    }
    return null;
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();
    
    // ===== 总销售额 =====
    // Grubhub: "Restaurant sales for 2 orders" 右边 $88.01
    if (!result.total_sales && /restaurant sales|gross sales|total sales|total revenue/i.test(lower)) {
      // 先在同一行找金额
      let m = line.match(/\$\(([0-9,]+\.\d{2})\)/) || line.match(/\$?([0-9,]+\.\d{2})/);
      if (m && /\$/.test(line)) {
        result.total_sales = parseFloat(m[1].replace(/,/g, ''));
      } else {
        const amount = findNextAmount(i);
        if (amount) result.total_sales = amount;
      }
    }
    
    // ===== 订单数 =====
    // Grubhub: "Restaurant sales for 2 orders" 里的 2
    if (!result.order_count) {
      const m = line.match(/for\s+(\d+)\s+orders/i);
      if (m) {
        result.order_count = parseInt(m[1]);
      } else if (/^(orders?|total orders?|number of orders)/i.test(lower)) {
        const num = findNextNumber(i);
        if (num && num > 0 && num < 10000) result.order_count = num;
      }
    }
    
    // ===== 平台总手续费 =====
    // Grubhub: "Grubhub order services" 右边 $(15.41)
    if (!result.platform_fee && /grubhub order services|platform fee|total fees|service fees|commission/i.test(lower)) {
      let m = line.match(/\$\(([0-9,]+\.\d{2})\)/) || line.match(/\$?\(?([0-9,]+\.\d{2})\)?/);
      if (m && (/\$|\(/.test(line))) {
        result.platform_fee = Math.abs(parseFloat(m[1].replace(/,/g, '')));
      } else {
        const amount = findNextAmount(i);
        if (amount) result.platform_fee = Math.abs(amount);
      }
    }
    
    // ===== 净收入 / 打款 =====
    // Grubhub: "Balance" 右边 $72.60
    if (!result.net_revenue && /balance|net revenue|payout|total payout|net earnings|total payments to you/i.test(lower)) {
      let m = line.match(/\$\(([0-9,]+\.\d{2})\)/) || line.match(/\$?([0-9,]+\.\d{2})/);
      if (m && /\$/.test(line)) {
        result.net_revenue = parseFloat(m[1].replace(/,/g, ''));
      } else {
        const amount = findNextAmount(i);
        if (amount) result.net_revenue = amount;
      }
    }
    
    // ===== 月份 =====
    // Grubhub: "Your June statement" 或 "June 2026"
    if (!result.month) {
      const monthNames = {
        january: '01', february: '02', march: '03', april: '04',
        may: '05', june: '06', july: '07', august: '08',
        september: '09', october: '10', november: '11', december: '12'
      };
      const m = line.match(/(your\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)\s+(statement|20\d{2})/i);
      if (m) {
        const monthName = m[2].toLowerCase();
        let year = new Date().getFullYear();
        const yearMatch = line.match(/20(\d{2})/);
        if (yearMatch) year = parseInt('20' + yearMatch[1]);
        result.month = `${year}-${monthNames[monthName]}`;
      }
    }
  }
  
  return result;
}

// 获取报表列表
router.get('/', auth, (req, res) => {
  const reports = db.prepare(`
    SELECT r.*, p.name as platform_name 
    FROM platform_reports r 
    LEFT JOIN platforms p ON r.platform_id = p.id 
    ORDER BY r.month DESC, r.created_at DESC
  `).all();
  res.json({ reports });
});

// 上传报表
router.post('/upload', auth, managerAccess, upload.single('file'), async (req, res) => {
  const { platform_id, month, total_sales, order_count, platform_fee, net_revenue } = req.body;
  if (!platform_id) return res.status(400).json({ error: '请选择平台' });
  if (!req.file) return res.status(400).json({ error: '请上传报表文件' });

  let finalTotalSales = parseFloat(total_sales) || 0;
  let finalOrderCount = parseInt(order_count) || 0;
  let finalPlatformFee = parseFloat(platform_fee) || 0;
  let finalNetRevenue = parseFloat(net_revenue) || 0;
  let finalMonth = month;
  let extractedNote = '';

  // 如果是 PDF，自动解析提取
  if (path.extname(req.file.originalname).toLowerCase() === '.pdf') {
    try {
      const dataBuffer = fs.readFileSync(req.file.path);
      const pdfData = await pdfParse(dataBuffer);
      const extracted = extractDataFromText(pdfData.text);
      
      // 用户没填的字段用解析出来的补
      if (!total_sales && extracted.total_sales) finalTotalSales = extracted.total_sales;
      if (!order_count && extracted.order_count) finalOrderCount = extracted.order_count;
      if (!platform_fee && extracted.platform_fee) finalPlatformFee = extracted.platform_fee;
      if (!net_revenue && extracted.net_revenue) finalNetRevenue = extracted.net_revenue;
      if (!finalMonth && extracted.month) finalMonth = extracted.month;
      
      extractedNote = '（自动提取）';
    } catch (e) {
      console.error('PDF 解析失败:', e);
    }
  }

  // 月份最后兜底
  if (!finalMonth) {
    const now = new Date();
    finalMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  const result = db.prepare(`
    INSERT INTO platform_reports (platform_id, month, file_path, original_name, total_sales, order_count, platform_fee, net_revenue, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    platform_id,
    finalMonth,
    req.file.path,
    req.file.originalname,
    finalTotalSales,
    finalOrderCount,
    finalPlatformFee,
    finalNetRevenue,
    req.body.note ? req.body.note + extractedNote : extractedNote
  );

  auditLog(req, 'UPLOAD_REPORT', `上传报表: ${finalMonth} 平台ID ${platform_id}`, { reportId: result.lastInsertRowid });
  res.json({ 
    id: result.lastInsertRowid, 
    message: '报表上传成功',
    extracted: {
      total_sales: finalTotalSales,
      order_count: finalOrderCount,
      platform_fee: finalPlatformFee,
      net_revenue: finalNetRevenue
    }
  });
});

// 删除报表
router.delete('/:id', auth, managerAccess, (req, res) => {
  const report = db.prepare('SELECT * FROM platform_reports WHERE id = ?').get(req.params.id);
  if (!report) return res.status(404).json({ error: '报表不存在' });

  // 删除文件
  if (fs.existsSync(report.file_path)) fs.unlinkSync(report.file_path);

  db.prepare('DELETE FROM platform_reports WHERE id = ?').run(req.params.id);
  auditLog(req, 'DELETE_REPORT', `删除报表: ${report.month}`, { reportId: req.params.id });
  res.json({ success: true });
});

module.exports = router;
