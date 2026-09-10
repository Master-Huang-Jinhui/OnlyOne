const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth, managerAccess } = require('../middleware/auth');

const router = express.Router();

// 确保上传目录存在
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置 multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 用时间戳 + 随机数 + 原扩展名，避免重名
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  }
});

// 允许的 MIME 类型
const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

// 允许的文件扩展名（白名单）
const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

// 禁止的可执行文件扩展名（黑名单，双重保险）
const blockedExtensions = [
  '.php', '.php3', '.php4', '.php5', '.phtml', '.pl', '.py', '.cgi',
  '.asp', '.aspx', '.jsp', '.js', '.jsx', '.ts', '.tsx',
  '.exe', '.bat', '.cmd', '.com', '.sh', '.bash', '.zsh',
  '.html', '.htm', '.shtml', '.xhtml',
  '.sql', '.db', '.sqlite', '.sqlite3',
  '.jar', '.war', '.ear', '.class',
  '.ps1', '.psm1', '.vbs', '.vbe', '.wsf', '.wsh',
  '.msc', '.msi', '.msp', '.mst',
  '.apk', '.ipa', '.app', '.dmg', '.iso',
  '.reg', '.inf', '.ini', '.cfg', '.conf',
  '.htaccess', '.htpasswd', '.env',
  '.svgz' // 压缩 SVG 可能藏脚本
];

// 文件类型过滤（MIME + 扩展名双重校验）
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  // 1. 检查扩展名黑名单
  if (blockedExtensions.includes(ext)) {
    return cb(new Error('不允许上传该类型文件'));
  }

  // 2. 检查 MIME 类型白名单
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('只支持 JPG、PNG、GIF、WebP、SVG 格式的图片'));
  }

  // 3. 检查扩展名白名单（防止 MIME 伪造）
  if (!allowedExtensions.includes(ext)) {
    return cb(new Error('文件扩展名不合法'));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB 限制
});

// 上传图片
router.post('/image', auth, managerAccess, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: '请选择要上传的图片' });
    }
    // 返回可访问的 URL
    const url = `/uploads/images/${req.file.filename}`;
    res.json({ url, filename: req.file.filename, size: req.file.size });
  });
});

module.exports = router;
