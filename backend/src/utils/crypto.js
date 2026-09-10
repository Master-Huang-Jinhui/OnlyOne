// AES-256-GCM 加密工具（用于平台密码等敏感数据加密存储）
// 使用 Node.js 内置 crypto，无需额外依赖
const crypto = require('crypto');

// 加密密钥从环境变量读取，没有则用默认值（生产环境务必修改）
const ENCRYPTION_KEY = (process.env.ENCRYPTION_KEY || 'onlyone-encryption-key-32chars-min!!').padEnd(32, '0').slice(0, 32);
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * 加密明文
 * @param {string} plaintext - 要加密的字符串
 * @returns {string} 加密后的字符串（iv:authTag:ciphertext，base64编码）
 */
function encrypt(plaintext) {
  if (!plaintext) return '';
  if (typeof plaintext !== 'string') plaintext = String(plaintext);

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY), iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * 解密密文
 * @param {string} encryptedData - 加密后的字符串
 * @returns {string} 解密后的明文，如果解密失败返回空字符串
 */
function decrypt(encryptedData) {
  if (!encryptedData) return '';
  if (typeof encryptedData !== 'string') return '';

  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    // 不是加密格式，可能是旧的明文数据，直接返回
    return encryptedData;
  }

  try {
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const ciphertext = parts[2];

    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    console.error('[加密] 解密失败:', e.message);
    return '';
  }
}

/**
 * 检查数据是否是加密格式
 */
function isEncrypted(data) {
  if (!data || typeof data !== 'string') return false;
  return data.split(':').length === 3;
}

module.exports = { encrypt, decrypt, isEncrypted };
