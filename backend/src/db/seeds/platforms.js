// 外卖平台初始化数据
module.exports = function(db) {
  const defaultPlatforms = [
    { name: 'Uber Eats', logo: 'https://cdn.simpleicons.org/ubereats', url: 'https://restaurant.uber.com/', account: 'only16201@hotmail.com', password: '121227jJ162', phone: '', note: '', sort_order: 1,
      commission_rate: 30, payout_schedule: 'weekly', delivery_type: 'platform', min_order: 0, delivery_radius: 3, contact_person: '', rating: 0, launch_date: '' },
    { name: 'DoorDash', logo: 'https://cdn.simpleicons.org/doordash', url: 'https://director.doordash.com/', account: 'only16201@hotmail.com', password: '162-01Sanford', phone: '', note: '', sort_order: 2,
      commission_rate: 30, payout_schedule: 'weekly', delivery_type: 'platform', min_order: 0, delivery_radius: 3, contact_person: '', rating: 0, launch_date: '' },
    { name: 'Grubhub', logo: 'https://cdn.simpleicons.org/grubhub', url: 'https://restaurant.grubhub.com/dashboard/', account: 'Only16201@hotmail.com', password: '162Meiling@', phone: '', note: '', sort_order: 3,
      commission_rate: 32.5, payout_schedule: 'weekly', delivery_type: 'platform', min_order: 0, delivery_radius: 3, contact_person: '', rating: 0, launch_date: '' },
    { name: 'Google', logo: 'https://cdn.simpleicons.org/google', url: 'https://business.google.com/', account: 'only16201@hotmail.com', password: '121227jJ162', phone: '', note: '', sort_order: 4,
      commission_rate: 0, payout_schedule: 'weekly', delivery_type: 'self', min_order: 0, delivery_radius: 3, contact_person: '', rating: 0, launch_date: '' },
    { name: 'HungerPanda', logo: 'https://www.hungrypanda.co/assets/images/logo-400.png', url: 'https://merchant-usa.hungrypanda.co/login', account: '', password: '', phone: '', note: '熊猫外卖', sort_order: 5,
      commission_rate: 25, payout_schedule: 'weekly', delivery_type: 'platform', min_order: 0, delivery_radius: 3, contact_person: '', rating: 0, launch_date: '' },
    { name: '小灰云', logo: 'https://www.led-cloud.com/static/img/xiaohuiyun.png', url: 'https://www.led-cloud.com/#/Account/Login', account: 'OnlyOneBBQandTea', password: '121227jJ162', phone: '', note: '', sort_order: 6,
      commission_rate: 0, payout_schedule: 'monthly', delivery_type: 'self', min_order: 0, delivery_radius: 0, contact_person: '', rating: 0, launch_date: '' },
    { name: 'Yelp', logo: 'https://cdn.simpleicons.org/yelp', url: 'https://www.yelp.com/account/summary', account: '', password: '', phone: '6307763590', note: '', sort_order: 7,
      commission_rate: 0, payout_schedule: 'weekly', delivery_type: 'self', min_order: 0, delivery_radius: 3, contact_person: '', rating: 0, launch_date: '' },
    { name: 'BeyondMenu', logo: 'https://get.beyondmenu.com/_emdash/api/media/file/01KR2A23NBP8X7B17APP7BT17B.svg', url: 'https://www.beyondmenu.com/', account: '', password: '', phone: '6307763590', note: '', sort_order: 8,
      commission_rate: 0, payout_schedule: 'monthly', delivery_type: 'self', min_order: 0, delivery_radius: 0, contact_person: '', rating: 0, launch_date: '' }
  ];

  // 18列对应18个?，全部用参数传入，避免硬编码数量不对
  const insertPlatform = db.prepare(`INSERT INTO platforms (
    name, logo, url, account, password, phone, note, enabled, weekly_status, sort_order,
    commission_rate, payout_schedule, delivery_type, min_order, delivery_radius, contact_person, rating, launch_date
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const updatePlatformAccount = db.prepare("UPDATE platforms SET account = ?, password = ?, url = COALESCE(NULLIF(url, ''), ?), phone = COALESCE(NULLIF(phone, ''), ?), note = COALESCE(NULLIF(note, ''), ?) WHERE name = ? AND (account IS NULL OR account = '')");
  const updatePlatformUrlAndLogo = db.prepare("UPDATE platforms SET url = ?, logo = ? WHERE name = ?");

  defaultPlatforms.forEach(p => {
    const exists = db.prepare('SELECT id FROM platforms WHERE name = ?').get(p.name);
    if (!exists) {
      insertPlatform.run(
        p.name, p.logo || '', p.url || '', p.account || '', p.password || '', p.phone || '', p.note || '',
        1, '{}', p.sort_order,
        p.commission_rate || 0, p.payout_schedule || 'weekly', p.delivery_type || 'platform', p.min_order || 0,
        p.delivery_radius || 0, p.contact_person || '', p.rating || 0, p.launch_date || ''
      );
    } else {
      updatePlatformAccount.run(p.account || '', p.password || '', p.url || '', p.phone || '', p.note || '', p.name);
      updatePlatformUrlAndLogo.run(p.url || '', p.logo || '', p.name);
    }
  });
}
