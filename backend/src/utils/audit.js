// 操作审计日志：记录关键操作（谁在什么时候做了什么）
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function getLogFileName() {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return path.join(LOG_DIR, `audit_${dateStr}.log`);
}

function formatTime() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
}

/**
 * 记录审计日志
 * @param {Object} req - Express 请求对象
 * @param {string} action - 操作类型
 * @param {string} description - 操作描述
 * @param {Object} details - 额外详情
 */
function auditLog(req, action, description, details = {}) {
  const user = req.user || {};
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const userId = user.id || 'anonymous';
  const username = user.username || 'anonymous';
  const userRole = user.role || 'unknown';

  // 过滤敏感信息
  const safeDetails = {};
  for (const [key, value] of Object.entries(details)) {
    if (['password', 'token', 'secret', 'authorization'].includes(key.toLowerCase())) {
      safeDetails[key] = '***';
    } else {
      safeDetails[key] = value;
    }
  }

  const logEntry = {
    time: formatTime(),
    ip,
    userId,
    username,
    userRole,
    action,
    description,
    details: safeDetails,
    method: req.method,
    url: req.originalUrl,
  };

  const line = JSON.stringify(logEntry);
  console.log(`[审计] ${username}(${userRole}) ${action}: ${description}`);

  try {
    ensureLogDir();
    fs.appendFileSync(getLogFileName(), line + '\n');
  } catch (e) {
    console.error('[审计] 日志写入失败:', e.message);
  }
}

module.exports = { auditLog };
