// 外卖平台初始化数据
module.exports = function(db) {
  const defaultPlatforms = [
    { name: 'Uber Eats', logo: 'https://cdn.simpleicons.org/ubereats', url: 'https://www.ubereats.com', account: 'only16201@hotmail.com', password: '121227jJ162', phone: '', note: '', sort_order: 1 },
    { name: 'DoorDash', logo: 'https://cdn.simpleicons.org/doordash', url: 'https://www.doordash.com', account: 'only16201@hotmail.com', password: '162-01Sanford', phone: '', note: '', sort_order: 2 },
    { name: 'Grubhub', logo: 'https://cdn.simpleicons.org/grubhub', url: 'https://www.grubhub.com', account: 'Only16201@hotmail.com', password: '162Meiling@', phone: '', note: '', sort_order: 3 },
    { name: 'Google', logo: 'https://cdn.simpleicons.org/google', url: 'https://maps.google.com', account: 'only16201@hotmail.com', password: '121227jJ162', phone: '', note: '', sort_order: 4 },
    { name: 'HungerPanda', logo: '', url: '', account: '', password: '', phone: '', note: '熊猫外卖', sort_order: 5 },
    { name: '小灰云', logo: '', url: '', account: 'OnlyOneBBQandTea', password: '121227jJ162', phone: '', note: '', sort_order: 6 },
    { name: 'Yelp', logo: 'https://cdn.simpleicons.org/yelp', url: 'https://www.yelp.com', account: '', password: '', phone: '6307763590', note: '', sort_order: 7 },
    { name: 'BeyondMenu', logo: '', url: 'https://www.beyondmenu.com', account: '', password: '', phone: '6307763590', note: '', sort_order: 8 }
  ];

  const insertPlatform = db.prepare('INSERT INTO platforms (name, logo, url, account, password, phone, note, enabled, weekly_status, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)');
  const updatePlatformAccount = db.prepare("UPDATE platforms SET account = ?, password = ?, url = COALESCE(NULLIF(url, ''), ?), phone = COALESCE(NULLIF(phone, ''), ?), note = COALESCE(NULLIF(note, ''), ?) WHERE name = ? AND (account IS NULL OR account = '')");
  const updatePlatformLogo = db.prepare("UPDATE platforms SET logo = ? WHERE name = ? AND (logo IS NULL OR logo = '')");

  defaultPlatforms.forEach(p => {
    const exists = db.prepare('SELECT id FROM platforms WHERE name = ?').get(p.name);
    if (!exists) {
      insertPlatform.run(p.name, p.logo || '', p.url || '', p.account || '', p.password || '', p.phone || '', p.note || '', '{}', p.sort_order);
    } else {
      // 补全空账号密码
      updatePlatformAccount.run(p.account || '', p.password || '', p.url || '', p.phone || '', p.note || '', p.name);
      // 补全空 Logo
      if (p.logo) updatePlatformLogo.run(p.logo, p.name);
    }
  });
}
