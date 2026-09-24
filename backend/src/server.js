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
app.use('/api/combos', require('./routes/combos'));
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

const uploadsDir = path.join(__dirname, '..', 'uploads');

// 简单CSV解析：处理引号包裹的字段
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (ch !== '\r') field += ch;
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.length > 1 || (r[0] && r[0].trim()));
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// CSV文件拦截：解析CSV并渲染成漂亮的HTML表格
app.use('/uploads', (req, res, next) => {
  if (!req.path.endsWith('.csv')) return next();
  const filePath = path.join(uploadsDir, req.path);
  if (!fs.existsSync(filePath)) return next();
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const rows = parseCSV(content);
    if (rows.length === 0) return next();

    const maxCols = Math.max(...rows.map(r => r.length));
    const header = rows[0];
    const dataRows = rows.slice(1);

    let thead = '<tr>';
    for (let c = 0; c < maxCols; c++) {
      thead += '<th>' + escapeHtml(header[c] || '') + '</th>';
    }
    thead += '</tr>';

    let tbody = '';
    dataRows.forEach((row, ri) => {
      tbody += '<tr' + (ri % 2 ? ' class="alt"' : '') + '>';
      for (let c = 0; c < maxCols; c++) {
        tbody += '<td>' + escapeHtml(row[c] || '') + '</td>';
      }
      tbody += '</tr>';
    });

    const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
      + '<title>CSV报表 - ' + escapeHtml(path.basename(req.path)) + '</title><style>'
      + '*{box-sizing:border-box;margin:0;padding:0}'
      + 'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f1f5f9;color:#1e293b}'
      + '.topbar{background:#1e293b;color:#fff;padding:14px 24px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:10}'
      + '.topbar h1{font-size:15px;font-weight:600}'
      + '.topbar .meta{font-size:12px;opacity:.7}'
      + '.table-wrap{overflow:auto;max-height:calc(100vh - 50px)}'
      + 'table{border-collapse:collapse;width:100%;font-size:12px;white-space:nowrap}'
      + 'thead th{background:#e2e8f0;position:sticky;top:0;padding:8px 12px;text-align:left;font-weight:600;border-bottom:2px solid #cbd5e1;z-index:5}'
      + 'tbody td{padding:6px 12px;border-bottom:1px solid #e2e8f0}'
      + 'tbody tr:hover{background:#f0f9ff}'
      + 'tbody tr.alt{background:#f8fafc}'
      + '</style></head><body>'
      + '<div class="topbar"><h1>CSV 报表</h1><span class="meta">' + dataRows.length + ' 行数据 · ' + maxCols + ' 列</span></div>'
      + '<div class="table-wrap"><table><thead>' + thead + '</thead><tbody>' + tbody + '</tbody></table></div>'
      + '</body></html>';

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) { next(e); }
});

app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res, filePath) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (filePath.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
    } else if (filePath.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Content-Disposition', 'inline');
    } else {
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