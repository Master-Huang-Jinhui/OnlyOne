const express = require('express');
const db = require('../db');
const { auth, managerAccess } = require('../middleware/auth');
const { auditLog } = require('../utils/audit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

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
router.post('/upload', auth, managerAccess, upload.single('file'), (req, res) => {
  const { platform_id, month } = req.body;
  if (!platform_id || !month) return res.status(400).json({ error: '请选择平台和月份' });
  if (!req.file) return res.status(400).json({ error: '请上传CSV文件' });

  const result = db.prepare(`
    INSERT INTO platform_reports (platform_id, month, file_path, original_name, total_sales, order_count, platform_fee, net_revenue)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    platform_id,
    month,
    req.file.path,
    req.file.originalname,
    0, 0, 0, 0 // 后续CSV解析填充
  );

  auditLog(req, 'UPLOAD_REPORT', `上传报表: ${month} 平台ID ${platform_id}`, { reportId: result.lastInsertRowid });
  res.json({ id: result.lastInsertRowid, message: '报表上传成功' });
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
