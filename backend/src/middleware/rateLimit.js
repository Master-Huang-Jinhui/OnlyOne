// 简单的内存速率限制中间件（按 IP 统计，无需额外依赖）
const loginAttempts = new Map();

const WINDOW_MS = 60 * 1000; // 1分钟窗口
const MAX_ATTEMPTS = 10; // 每分钟最多10次
const LOCK_MS = 10 * 60 * 1000; // 锁定10分钟

function getClientIp(req) {
  return req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
}

function loginRateLimit(req, res, next) {
  const ip = getClientIp(req);
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (record && record.lockedUntil && now < record.lockedUntil) {
    const remain = Math.ceil((record.lockedUntil - now) / 1000);
    return res.status(429).json({ error: `尝试次数过多，请 ${remain} 秒后再试` });
  }

  if (!record || now - record.windowStart > WINDOW_MS) {
    loginAttempts.set(ip, { windowStart: now, count: 1, lockedUntil: 0 });
  } else {
    record.count++;
    if (record.count > MAX_ATTEMPTS) {
      record.lockedUntil = now + LOCK_MS;
      loginAttempts.set(ip, record);
      return res.status(429).json({ error: '尝试次数过多，请10分钟后再试' });
    }
    loginAttempts.set(ip, record);
  }

  next();
}

// 登录成功后清除该IP的计数
function resetLoginAttempts(req) {
  const ip = getClientIp(req);
  loginAttempts.delete(ip);
}

// 定期清理过期记录（每小时清理一次）
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of loginAttempts.entries()) {
    if (now - record.windowStart > WINDOW_MS && (!record.lockedUntil || now > record.lockedUntil)) {
      loginAttempts.delete(ip);
    }
  }
}, 60 * 60 * 1000);

module.exports = { loginRateLimit, resetLoginAttempts };
