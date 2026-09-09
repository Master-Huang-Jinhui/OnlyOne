const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const fs = require('fs');

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

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', true);
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(accessLog);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/platforms', require('./routes/platforms'));
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

const uploadsDir = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsDir));

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
  if (!/^https?:\/\//i.test(target)) return res.status(400).send('无效的跳转链接');
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