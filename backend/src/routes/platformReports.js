const express = require('express');
const db = require('../db');
const { auth, managerAccess } = require('../middleware/auth');
const { auditLog } = require('../utils/audit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const xlsx = require('xlsx');

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
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /csv|pdf/
    const ext = path.extname(file.originalname).toLowerCase().slice(1)
    if (allowed.test(ext)) cb(null, true)
    else cb(new Error('只支持 CSV 或 PDF 文件'))
  }
});

// 从 PDF 文本中提取关键数据
function extractDataFromText(text) {
  const result = {};
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const fullText = text.toLowerCase();
  
  if (fullText.includes('grubhub') || fullText.includes('seamless')) {
    result.platform_name = 'Grubhub';
  } else if (fullText.includes('uber eats') || fullText.includes('uber technologies') || fullText.includes('ubereats')) {
    result.platform_name = 'Uber Eats';
  } else if (fullText.includes('doordash') || fullText.includes('door dash')) {
    result.platform_name = 'DoorDash';
  } else if (fullText.includes('postmates')) {
    result.platform_name = 'Postmates';
  } else if (fullText.includes('chownow') || fullText.includes('chow now')) {
    result.platform_name = 'ChowNow';
  }
  
  const findNextAmount = (startIdx) => {
    for (let i = startIdx; i < Math.min(startIdx + 5, lines.length); i++) {
      let m = lines[i].match(/\$\(([0-9,]+\.\d{2})\)/);
      if (m) return -parseFloat(m[1].replace(/,/g, ''));
      m = lines[i].match(/\$?\(?([0-9,]+\.\d{2})\)?/);
      if (m && /\$|\(/.test(lines[i])) return parseFloat(m[1].replace(/,/g, ''));
    }
    return null;
  };
  
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
    
    if (!result.total_sales && /restaurant sales|gross sales|total sales|total revenue/i.test(lower)) {
      let m = line.match(/\$\(([0-9,]+\.\d{2})\)/) || line.match(/\$?([0-9,]+\.\d{2})/);
      if (m && /\$/.test(line)) {
        result.total_sales = parseFloat(m[1].replace(/,/g, ''));
      } else {
        const amount = findNextAmount(i);
        if (amount) result.total_sales = amount;
      }
    }
    
    if (!result.order_count) {
      const m = line.match(/for\s+(\d+)\s+orders/i);
      if (m) {
        result.order_count = parseInt(m[1]);
      } else if (/^(orders?|total orders?|number of orders)/i.test(lower)) {
        const num = findNextNumber(i);
        if (num && num > 0 && num < 10000) result.order_count = num;
      }
    }
    
    if (!result.platform_fee && /grubhub order services|platform fee|total fees|service fees|commission/i.test(lower)) {
      let m = line.match(/\$\(([0-9,]+\.\d{2})\)/) || line.match(/\$?\(?([0-9,]+\.\d{2})\)?/);
      if (m && (/\$|\(/.test(line))) {
        result.platform_fee = Math.abs(parseFloat(m[1].replace(/,/g, '')));
      } else {
        const amount = findNextAmount(i);
        if (amount) result.platform_fee = Math.abs(amount);
      }
    }
    
    if (!result.net_revenue && /balance|net revenue|payout|total payout|net earnings|total payments to you/i.test(lower)) {
      let m = line.match(/\$\(([0-9,]+\.\d{2})\)/) || line.match(/\$?([0-9,]+\.\d{2})/);
      if (m && /\$/.test(line)) {
        result.net_revenue = parseFloat(m[1].replace(/,/g, ''));
      } else {
        const amount = findNextAmount(i);
        if (amount) result.net_revenue = amount;
      }
    }
    
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

// 解析CSV报表
function parseCSVReport(filePath, fileName) {
  const result = {};
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet);
  
  if (rows.length === 0) return result;
  
  const firstRow = rows[0];
  const headers = Object.keys(firstRow);
  
  if (fileName.toLowerCase().includes('doordash') || headers.some(h => h.toLowerCase().includes('doordash'))) {
    result.platform_name = 'DoorDash';
  } else if (fileName.toLowerCase().includes('ubereats') || fileName.toLowerCase().includes('uber eats')) {
    result.platform_name = 'Uber Eats';
  } else if (fileName.toLowerCase().includes('grubhub')) {
    result.platform_name = 'Grubhub';
  }
  
  const findCol = (keywords) => {
    return headers.find(h => keywords.some(k => h.toLowerCase().includes(k)));
  };
  
  const subtotalCol = findCol(['subtotal', 'sub total', 'restaurant sales', 'gross sales']);
  const netCol = findCol(['net total', 'net revenue', 'balance', 'payout', 'total payout']);
  const typeCol = findCol(['transaction type', 'order type', 'type']);
  const timeCol = findCol(['timestamp', 'date', 'time', 'payout date']);
  
  let totalSales = 0;
  let orderCount = 0;
  let refundCount = 0;
  let refundAmount = 0;
  let totalNet = 0;
  
  for (const row of rows) {
    const rowType = typeCol ? String(row[typeCol]).toLowerCase() : '';
    
    if (netCol) {
      const val = parseFloat(String(row[netCol]).replace(/[$,]/g, ''));
      if (!isNaN(val)) totalNet += val;
    }
    
    if (rowType === 'order') {
      orderCount++;
      if (subtotalCol) {
        const val = parseFloat(String(row[subtotalCol]).replace(/[$,]/g, ''));
        if (!isNaN(val)) totalSales += val;
      }
    } else if (rowType.includes('error') || rowType.includes('refund') || rowType.includes('chargeback')) {
      refundCount++;
      if (netCol) {
        const val = parseFloat(String(row[netCol]).replace(/[$,]/g, ''));
        if (!isNaN(val) && val < 0) refundAmount += Math.abs(val);
      }
    }
  }
  
  let totalFees = totalSales - refundAmount - totalNet;
  if (totalFees < 0) totalFees = 0;
  
  if (totalSales > 0) result.total_sales = Math.round(totalSales * 100) / 100;
  if (orderCount > 0) result.order_count = orderCount;
  if (refundCount > 0) result.refund_count = refundCount;
  if (refundAmount > 0) result.refund_amount = Math.round(refundAmount * 100) / 100;
  if (totalFees > 0) result.platform_fee = Math.round(totalFees * 100) / 100;
  result.net_revenue = Math.round(totalNet * 100) / 100;
  
  const monthMatch = fileName.match(/(\d{4})-(\d{2})-\d{2}_\d{4}-\d{2}-\d{2}/);
  if (monthMatch) {
    result.month = `${monthMatch[1]}-${monthMatch[2]}`;
  } else if (timeCol && rows[0][timeCol]) {
    const dateStr = String(rows[0][timeCol]);
    const m = dateStr.match(/(\d{4})-(\d{2})-\d{2}/);
    if (m) result.month = `${m[1]}-${m[2]}`;
  }
  
  return result;
}

router.get('/', auth, (req, res) => {
  const reports = db.prepare(`
    SELECT r.*, p.name as platform_name 
    FROM platform_reports r 
    LEFT JOIN platforms p ON r.platform_id = p.id 
    ORDER BY r.month DESC, r.created_at DESC
  `).all();
  res.json({ reports });
});

router.post('/upload', auth, managerAccess, upload.single('file'), async (req, res) => {
  const { platform_id, month, total_sales, order_count, platform_fee, net_revenue } = req.body;
  if (!req.file) return res.status(400).json({ error: '请上传报表文件' });

  let finalTotalSales = parseFloat(total_sales) || 0;
  let finalOrderCount = parseInt(order_count) || 0;
  let finalPlatformFee = parseFloat(platform_fee) || 0;
  let finalNetRevenue = parseFloat(net_revenue) || 0;
  let finalRefundCount = 0;
  let finalRefundAmount = 0;
  let finalMonth = month;
  let finalPlatformId = platform_id ? parseInt(platform_id) : null;
  let extractedNote = '';

  const ext = path.extname(req.file.originalname).toLowerCase();
  
  if (ext === '.pdf') {
    try {
      const dataBuffer = fs.readFileSync(req.file.path);
      const pdfData = await pdfParse(dataBuffer);
      const extracted = extractDataFromText(pdfData.text);
      
      if (!total_sales && extracted.total_sales) finalTotalSales = extracted.total_sales;
      if (!order_count && extracted.order_count) finalOrderCount = extracted.order_count;
      if (!platform_fee && extracted.platform_fee) finalPlatformFee = extracted.platform_fee;
      if (!net_revenue && extracted.net_revenue) finalNetRevenue = extracted.net_revenue;
      if (!finalMonth && extracted.month) finalMonth = extracted.month;
      
      if (!finalPlatformId && extracted.platform_name) {
        const platform = db.prepare('SELECT id FROM platforms WHERE name = ?').get(extracted.platform_name);
        if (platform) {
          finalPlatformId = platform.id;
          extractedNote = '（自动识别平台）';
        }
      }
      
      extractedNote = extractedNote || '（自动提取）';
    } catch (e) {
      console.error('PDF 解析失败:', e);
    }
  }
  
  else if (ext === '.csv') {
    try {
      const extracted = parseCSVReport(req.file.path, req.file.originalname);
      
      if (!total_sales && extracted.total_sales) finalTotalSales = extracted.total_sales;
      if (!order_count && extracted.order_count) finalOrderCount = extracted.order_count;
      if (extracted.refund_count) finalRefundCount = extracted.refund_count;
      if (extracted.refund_amount) finalRefundAmount = extracted.refund_amount;
      if (!platform_fee && extracted.platform_fee) finalPlatformFee = extracted.platform_fee;
      if (!net_revenue && extracted.net_revenue) finalNetRevenue = extracted.net_revenue;
      if (!finalMonth && extracted.month) finalMonth = extracted.month;
      
      if (!finalPlatformId && extracted.platform_name) {
        const platform = db.prepare('SELECT id FROM platforms WHERE name = ?').get(extracted.platform_name);
        if (platform) {
          finalPlatformId = platform.id;
          extractedNote = '（自动识别平台）';
        }
      }
      
      extractedNote = extractedNote || '（自动提取）';
    } catch (e) {
      console.error('CSV 解析失败:', e);
    }
  }

  if (!finalPlatformId) return res.status(400).json({ error: '请选择外卖平台（或上传包含平台名称的报表文件）' });
  
  if (!finalMonth) {
    const now = new Date();
    finalMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  const result = db.prepare(`
    INSERT INTO platform_reports (platform_id, month, file_path, original_name, total_sales, order_count, refund_count, refund_amount, platform_fee, net_revenue, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    finalPlatformId,
    finalMonth,
    `/uploads/reports/${path.basename(req.file.path)}`,
    req.file.originalname,
    finalTotalSales,
    finalOrderCount,
    finalRefundCount,
    finalRefundAmount,
    finalPlatformFee,
    finalNetRevenue,
    req.body.note ? req.body.note + extractedNote : extractedNote
  );

  auditLog(req, 'UPLOAD_REPORT', `上传报表: ${finalMonth} 平台ID ${finalPlatformId}`, { reportId: result.lastInsertRowid });
  res.json({ 
    id: result.lastInsertRowid, 
    message: '报表上传成功',
    extracted: {
      total_sales: finalTotalSales,
      order_count: finalOrderCount,
      refund_count: finalRefundCount,
      refund_amount: finalRefundAmount,
      platform_fee: finalPlatformFee,
      net_revenue: finalNetRevenue
    }
  });
});

router.delete('/:id', auth, managerAccess, (req, res) => {
  const report = db.prepare('SELECT * FROM platform_reports WHERE id = ?').get(req.params.id);
  if (!report) return res.status(404).json({ error: '报表不存在' });

  const absolutePath = path.join(__dirname, '../../', report.file_path);
  if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);

  db.prepare('DELETE FROM platform_reports WHERE id = ?').run(req.params.id);
  auditLog(req, 'DELETE_REPORT', `删除报表: ${report.month}`, { reportId: req.params.id });
  res.json({ success: true });
});

module.exports = router;
