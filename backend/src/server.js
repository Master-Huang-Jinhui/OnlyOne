const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { sanitizeInput } = require('./middleware/sanitize');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      if (!process.env[key.trim()]) process.env[key.trim()] = value;
    }
  });
}

const db = require('./db');
const { accessLog, errorLog, cleanupOldLogs } = require('./logger');
const { startAutoBackup } = require('./backup');
const { encrypt, isEncrypted } = require('./utils/crypto');
const { auditLog } = require('./utils/audit');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', true);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS：允许本地和局域网来源（用hostname字符串判断，避免正则转义问题）
const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  try {
    const u = new URL(origin);
    const h = u.hostname;
    if (h === 'localhost' || h === '127.0.0.1') return true;
    if (h.startsWith('10.')) return true;
    if (h.startsWith('192.168.')) return true;
    if (h.startsWith('172.')) {
      const parts = h.split('.');
      if (parts.length === 4) {
        const second = parseInt(parts[1], 10);
        if (second >= 16 && second <= 31) return true;
      }
    }
    return false;
  } catch { return false; }
};

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      console.log(`[CORS 拦截] 拒绝来源: ${origin}`);
      callback(new Error('不允许的来源'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeInput);
app.use(accessLog);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/roles', require('./routes/roles'));
app.use('/api/platforms', require('./routes/platforms'));
app.use('/api/platform-reports', require('./routes/platformReports'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/forms', require('./routes/forms'));
app.use('/api/menus', require('./routes/menus'));
app.use('/api/content', require('./routes/content'));
app.use('/api/memos', require('./routes/memos'));
app.use('/api/flavor-tags', require('./routes/flavorTags'));
app.use('/api/flavor-categories', require('./routes/flavorCategories'));
app.use('/api/order-statuses', require('./routes/orderStatuses'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/tables', require('./routes/tables'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/kds', require('./routes/kds'));
app.use('/api/members', require('./routes/members'));
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/queue', require('./routes/queue'));
app.use('/api/translations', require('./routes/translations'));

// 静态文件服务：uploads目录下的图片、报表等文件
// PDF和CSV设置inline内联预览，不施加严格CSP以免浏览器查看器被阻止
const uploadsDir = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res, filePath) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (filePath.endsWith('.pdf')) {
      // PDF报表：允许浏览器直接内联预览
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
    } else if (filePath.endsWith('.csv')) {
      // CSV报表：用text/plain让浏览器内联显示（text/csv会被浏览器强制下载）
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', 'inline');
    } else if (filePath.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Content-Disposition', 'inline');
    } else {
      // 图片等其他文件：保持严格CSP
      res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'");
    }
  },
  fallthrough: true,
}));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.get('/table', (req, res) => {
  const tableNo = req.query.s || req.query.table || '';
  if (!tableNo) return res.redirect('/menu');
  console.log(`[餐桌扫码] 桌号: ${tableNo}, IP: ${req.ip}, 时间: ${new Date().toLocaleString()}`);
  res.redirect(302, `/menu?table=${encodeURIComponent(tableNo)}`);
});

app.get('/go', (req, res) => {
  let target = '';
  const platformId = req.query.platform || req.query.id;
  if (platformId) {
    const p = db.prepare('SELECT url, name FROM platforms WHERE id = ?').get(Number(platformId));
    if (p && p.url) target = p.url;
    if (p) console.log(`[平台跳转] 平台: ${p.name}, IP: ${req.ip}, 时间: ${new Date().toLocaleString()}`);
  }
  const carouselId = req.query.carousel;
  if (!target && carouselId) {
    const c = db.prepare('SELECT link, title FROM carousel WHERE id = ?').get(Number(carouselId));
    if (c && c.link) target = c.link;
    if (c) console.log(`[轮播跳转] 标题: ${c.title || '未命名'}, IP: ${req.ip}, 时间: ${new Date().toLocaleString()}`);
  }
  if (!target) target = req.query.url || req.query.target || '';
  if (!target) return res.redirect('/');
  if (!target.startsWith('http://') && !target.startsWith('https://')) return res.status(400).send('无效的跳转链接');
  if (!platformId && !carouselId) console.log(`[外部跳转] 目标: ${target}, IP: ${req.ip}, 时间: ${new Date().toLocaleString()}`);
  res.redirect(302, target);
});

const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API 不存在' });
  res.sendFile(path.join(frontendDist, 'index.html'));
});

app.use((err, req, res, next) => {
  errorLog(err, req);
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  const message = status === 500 ? '服务器内部错误' : err.message;
  res.status(status).json({ error: message });
});

startAutoBackup();

if (!process.env.JWT_SECRET) {
  console.warn('========================================');
  console.warn('  ⚠️  安全警告：JWT_SECRET 使用默认值');
  console.warn('  请在 backend/.env 中设置 JWT_SECRET');
  console.warn('========================================');
}
if (!process.env.ENCRYPTION_KEY) {
  console.warn('  ⚠️  安全警告：ENCRYPTION_KEY 使用默认值');
  console.warn('  请在 backend/.env 中设置 ENCRYPTION_KEY（至少32字符）');
}

try {
  const platforms = db.prepare("SELECT id, name, password FROM platforms WHERE password IS NOT NULL AND password != ''").all();
  let migratedCount = 0;
  platforms.forEach(p => {
    if (p.password && !isEncrypted(p.password)) {
      const encrypted = encrypt(p.password);
      db.prepare('UPDATE platforms SET password = ? WHERE id = ?').run(encrypted, p.id);
      migratedCount++;
      console.log(`[迁移] 平台 "${p.name}" 密码已加密`);
    }
  });
  if (migratedCount > 0) {
    console.log(`[迁移] 共加密 ${migratedCount} 个平台密码`);
  }
} catch (e) {
  console.error('[迁移] 平台密码加密迁移失败:', e.message);
}

cleanupOldLogs();
setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000);

function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

app.listen(PORT, '0.0.0.0', () => {
  console.log('========================================');
  console.log('  Only One 一站式管理系统 已启动');
  console.log('========================================');
  console.log(`  本机访问:   http://localhost:${PORT}`);
  const ips = getLocalIPs();
  ips.forEach(ip => {
    console.log(`  局域网访问: http://${ip}:${PORT}`);
  });
  console.log('========================================');
  console.log('  默认账号: admin  密码: admin');
  console.log('  安全: 登录速率限制 + JWT认证 + SQL注入防护');
  console.log('  备份: 每天凌晨3点自动备份，保留7天');
  console.log('  日志: logs/ 目录，保留30天');
  console.log('  按 Ctrl+C 停止服务');
  console.log('========================================');
});
