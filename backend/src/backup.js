// 数据库自动备份：每天凌晨3点备份，保留最近7天
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data.db');
const BACKUP_DIR = path.join(__dirname, '..', 'backup');
const MAX_BACKUPS = 7;

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function doBackup() {
  try {
    ensureBackupDir();
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const backupFile = path.join(BACKUP_DIR, `data_${dateStr}.db`);

    if (fs.existsSync(DB_PATH)) {
      fs.copyFileSync(DB_PATH, backupFile);
      console.log(`[备份] 数据库已备份: ${backupFile}`);
    }

    // 清理超过7天的备份
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('data_') && f.endsWith('.db'))
      .sort()
      .reverse();

    if (files.length > MAX_BACKUPS) {
      files.slice(MAX_BACKUPS).forEach(f => {
        fs.unlinkSync(path.join(BACKUP_DIR, f));
        console.log(`[备份] 已删除旧备份: ${f}`);
      });
    }
  } catch (e) {
    console.error('[备份] 备份失败:', e.message);
  }
}

function startAutoBackup() {
  ensureBackupDir();

  // 计算到今天凌晨3点的毫秒数
  function getMsUntil3AM() {
    const now = new Date();
    const target = new Date(now);
    target.setHours(3, 0, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    return target - now;
  }

  // 启动时先做一次备份（如果今天还没备份过）
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const todayBackup = path.join(BACKUP_DIR, `data_${dateStr}.db`);
  if (!fs.existsSync(todayBackup)) {
    doBackup();
  }

  // 每天凌晨3点自动备份
  setTimeout(() => {
    doBackup();
    setInterval(doBackup, 24 * 60 * 60 * 1000);
  }, getMsUntil3AM());

  console.log('[备份] 自动备份已启动，每天凌晨3点执行，保留最近7天');
}

module.exports = { startAutoBackup, doBackup };
