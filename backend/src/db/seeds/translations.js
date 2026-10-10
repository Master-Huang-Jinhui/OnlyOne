// 翻译种子数据（幂等插入，重启后端自动补全缺失的词条）
// 只插入表中不存在的 key，不会覆盖后台已修改的翻译
module.exports = function (db) {
  const items = [
    ['platforms.online', '在线', 'Online'],
    ['platforms.offline', '下线', 'Offline'],
    ['platforms.goOnline', '上线', 'Go Online'],
    ['platforms.goOffline', '下线', 'Go Offline'],
    ['platforms.onlineStatusCol', '在线状态', 'Online Status'],
    ['platforms.updatedAt', '更新时间', 'Updated'],
    ['platforms.statusUpdatedOnline', '平台已上线', 'Platform is now online'],
    ['platforms.statusUpdatedOffline', '平台已下线', 'Platform is now offline'],
    ['platforms.onlineStatusLabel', '在线状态（上线/下线）', 'Online status (Online/Offline)'],
  ];
  const stmt = db.prepare('INSERT INTO translations (key, zh, en) VALUES (?, ?, ?)');
  const exists = db.prepare('SELECT COUNT(*) AS c FROM translations WHERE key = ?');
  items.forEach(([key, zh, en]) => {
    if (exists.get(key).c === 0) {
      stmt.run(key, zh, en);
    }
  });
};
