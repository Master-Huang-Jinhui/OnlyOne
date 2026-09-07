// 简单的访问日志 + 错误日志（写入文件，无需额外依赖）
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function getLogFileName(prefix) {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return path.join(LOG_DIR, `${prefix}_${dateStr}.log`);
}

function formatTime() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
}

// 访问日志中间件
function accessLog(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const line = `[${formatTime()}] ${ip} ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;
    console.log(line);
    try {
      ensureLogDir();
      fs.appendFileSync(getLogFileName('access'), line + '\n');
    } catch (e) { /* 忽略日志写入错误 */ }
  });
  next();
}

// 错误日志
function errorLog(err, req) {
  const line = `[${formatTime()}] ERROR: ${err.message}\n${err.stack}\n${req ? `URL: ${req.method} ${req.originalUrl}\nIP: ${req.ip}\n` : ''}`;
  console.error(line);
  try {
    ensureLogDir();
    fs.appendFileSync(getLogFileName('error'), line + '\n');
  } catch (e) { /* 忽略 */ }
}

// 清理超过30天的日志文件
function cleanupOldLogs() {
  try {
    ensureLogDir();
    const files = fs.readdirSync(LOG_DIR).filter(f => f.endsWith('.log'));
    const now = Date.now();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    files.forEach(f => {
      const filePath = path.join(LOG_DIR, f);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > THIRTY_DAYS) {
        fs.unlinkSync(filePath);
        console.log(`[日志] 已删除旧日志: ${f}`);
      }
    });
  } catch (e) { /* 忽略 */ }
}

module.exports = { accessLog, errorLog, cleanupOldLogs };
