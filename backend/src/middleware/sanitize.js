// 输入清洗中间件：防止 XSS，对用户输入的字符串进行转义
// 只清洗 req.body 和 req.query 中的字符串值，不影响数字、布尔、数组、对象

const xssEscape = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// 递归清洗对象中的字符串
const sanitizeValue = (value, depth = 0) => {
  if (depth > 5) return value; // 防止深层递归
  if (typeof value === 'string') {
    // 不清洗 JSON 字符串（以 { 或 [ 开头的可能是序列化数据）
    if (value.trim().startsWith('{') || value.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(value);
        return JSON.stringify(sanitizeValue(parsed, depth + 1));
      } catch {
        return xssEscape(value);
      }
    }
    return xssEscape(value);
  }
  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item, depth + 1));
  }
  if (value !== null && typeof value === 'object') {
    const result = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = sanitizeValue(val, depth + 1);
    }
    return result;
  }
  return value;
};

// 全局输入清洗中间件
const sanitizeInput = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    // 密码字段不清洗（避免特殊字符被转义导致登录失败）
    const sensitiveFields = ['password', 'oldPassword', 'newPassword'];
    const sensitiveValues = {};
    sensitiveFields.forEach(field => {
      if (req.body[field] !== undefined) {
        sensitiveValues[field] = req.body[field];
      }
    });
    req.body = sanitizeValue(req.body);
    // 恢复密码字段原始值
    Object.assign(req.body, sensitiveValues);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query);
  }
  next();
};

module.exports = { sanitizeInput, xssEscape };
