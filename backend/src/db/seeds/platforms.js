// 外卖平台初始化数据
module.exports = function(db) {
  const defaultPlatforms = [
    { name: 'Uber Eats', url: 'https://www.ubereats.com', account: 'only16201@hotmail.com', password: '121227jJ162', phone: '', note: '', sort_order: 1 },
    { name: 'DoorDash', url: 'https://www.doordash.com', account: 'only16201@hotmail.com', password: '162-01Sanford', phone: '', note: '', sort_order: 2 },
    { name: 'Grubhub', url: 'https://www.grubhub.com', account: 'Only16201@hotmail.com', password: '162Meiling@', phone: '', note: '', sort_order: 3 },
    { name: 'Google', url: 'https://maps.google.com', account: 'only16201@hotmail.com', password: '121227jJ162', phone: '', note: '', sort_order: 4 },
    { name: 'HungerPanda', url: '', account: '', password: '', phone: '', note: '', sort_order: 5 },
    { name: '小灰云', url: '', account: 'OnlyOneBBQandTea', password: '121227jJ162', phone: '', note: '', sort_order: 6 },
    { name: 'Yelp', url: 'https://www.yelp.com', account: '', password: '', phone: '6307763590', note: '', sort_order: 7 },
    { name: 'BeyondMenu', url: 'https://www.beyondmenu.com', account: '', password: '', phone: '6307763590', note: '', sort_order: 8 }
  ];

  const insertPlatform = db.prepare('INSERT INTO platforms (name, logo, url, account, password, phone, note, enabled, weekly_status, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)');
  const updatePlatformAccount = db.prepare("UPDATE platforms SET account = ?, password = ?, url = COALESCE(NULLIF(url, ''), ?), phone = COALESCE(NULLIF(phone, ''), ?), note = COALESCE(NULLIF(note, ''), ?) WHERE name = ? AND (account IS NULL OR account = '')");

  defaultPlatforms.forEach(p => {
    const exists = db.prepare('SELECT id FROM platforms WHERE name = ?').get(p.name);
    if (!exists) {
      insertPlatform.run(p.name, '', p.url || '', p.account || '', p.password || '', p.phone || '', p.note || '', '{}', p.sort_order);
    } else {
      // 补全空账号密码
      updatePlatformAccount.run(p.account || '', p.password || '', p.url || '', p.phone || '', p.note || '', p.name);
    }
  });
}
