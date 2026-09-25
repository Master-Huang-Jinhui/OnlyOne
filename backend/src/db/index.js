const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function img(u) { return `https://images.unsplash.com/${u}?w=400&h=300&fit=crop&q=80`; }

db.exec(`
  CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT 'user', role_id INTEGER, name TEXT, phone TEXT, email TEXT, permissions TEXT DEFAULT '{}', enabled INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now','localtime')));
  CREATE TABLE IF NOT EXISTS roles (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, description, permissions TEXT DEFAULT '{}', is_system INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now','localtime')));
  CREATE TABLE IF NOT EXISTS platforms (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, logo TEXT, url TEXT, account TEXT, password TEXT, phone TEXT, note TEXT, enabled INTEGER DEFAULT 1, weekly_status TEXT DEFAULT '{}', sort_order INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now','localtime')));
  CREATE TABLE IF NOT EXISTS platform_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, platform_id INTEGER, month TEXT NOT NULL, file_path TEXT NOT NULL, original_name TEXT, total_sales REAL DEFAULT 0, order_count INTEGER DEFAULT 0, platform_fee REAL DEFAULT 0, net_revenue REAL DEFAULT 0, note TEXT, created_at TEXT DEFAULT (datetime('now','localtime')), FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE SET NULL);
  CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, name_en TEXT, sort_order INTEGER DEFAULT 0, enabled INTEGER DEFAULT 1);
  CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, name_en TEXT, category_id INTEGER, price REAL NOT NULL DEFAULT 0, description TEXT, description_en TEXT, image TEXT, available INTEGER DEFAULT 1, is_recommend INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now','localtime')));
  CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, order_no TEXT UNIQUE NOT NULL, items TEXT NOT NULL, subtotal REAL NOT NULL DEFAULT 0, tax REAL NOT NULL DEFAULT 0, delivery_fee REAL NOT NULL DEFAULT 0, total REAL NOT NULL DEFAULT 0, status TEXT DEFAULT 'pending', dining_type TEXT DEFAULT 'takeout', table_id INTEGER, customer_name TEXT, customer_phone TEXT, address TEXT, note TEXT, payment_method TEXT, pickup_number INTEGER, created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime')));
  CREATE TABLE IF NOT EXISTS tables (id INTEGER PRIMARY KEY AUTOINCREMENT, table_no TEXT UNIQUE NOT NULL, zone_id INTEGER, seats INTEGER DEFAULT 4, status TEXT DEFAULT 'empty', maintenance INTEGER DEFAULT 0, qr_code TEXT, sort_order INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now','localtime')));
  CREATE TABLE IF NOT EXISTS table_zones (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, sort_order INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now','localtime')));
  CREATE TABLE IF NOT EXISTS table_reservations (id INTEGER PRIMARY KEY AUTOINCREMENT, table_id INTEGER, customer_name TEXT, customer_phone TEXT, reservation_time TEXT, guests INTEGER DEFAULT 2, status TEXT DEFAULT 'pending', note TEXT, created_at TEXT DEFAULT (datetime('now','localtime')), FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL);
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
  CREATE TABLE IF NOT EXISTS menus (id INTEGER PRIMARY KEY AUTOINCREMENT, parent_id INTEGER DEFAULT 0, name TEXT NOT NULL, icon TEXT, path TEXT, sort_order INTEGER DEFAULT 0, enabled INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now','localtime')));
  CREATE TABLE IF NOT EXISTS forms (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT, fields TEXT, status TEXT DEFAULT 'published', created_at TEXT DEFAULT (datetime('now','localtime')));
  CREATE TABLE IF NOT EXISTS form_submissions (id INTEGER PRIMARY KEY AUTOINCREMENT, form_id INTEGER NOT NULL, data TEXT, submitted_at TEXT DEFAULT (datetime('now','localtime')), FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS content_blocks (id INTEGER PRIMARY KEY AUTOINCREMENT, block_key TEXT UNIQUE NOT NULL, title TEXT, title_en TEXT, content TEXT, content_en TEXT, image TEXT, sort_order INTEGER DEFAULT 0, updated_at TEXT DEFAULT (datetime('now','localtime')));
  CREATE TABLE IF NOT EXISTS carousel (id INTEGER PRIMARY KEY AUTOINCREMENT, image TEXT NOT NULL, title TEXT, title_en TEXT, link TEXT, sort_order INTEGER DEFAULT 0, enabled INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now','localtime')));
  CREATE TABLE IF NOT EXISTS memos (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT DEFAULT 'general', title TEXT NOT NULL, content TEXT, priority INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now','localtime')));
  CREATE TABLE IF NOT EXISTS content_sections (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, title_en TEXT, content TEXT, content_en TEXT, icon TEXT, image TEXT, layout TEXT DEFAULT 'text', sort_order INTEGER DEFAULT 0, enabled INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now','localtime')));
  CREATE TABLE IF NOT EXISTS new_products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, name_en TEXT, description TEXT, description_en TEXT, image TEXT, sort_order INTEGER DEFAULT 0, enabled INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now','localtime')));
  CREATE TABLE IF NOT EXISTS flavor_categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, sort_order INTEGER DEFAULT 0, enabled INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now','localtime')));
  CREATE TABLE IF NOT EXISTS flavor_tags (id INTEGER PRIMARY KEY AUTOINCREMENT, category_id INTEGER, category TEXT, name TEXT NOT NULL, name_en TEXT, price REAL DEFAULT 0, sort_order INTEGER DEFAULT 0, enabled INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now','localtime')));
  CREATE TABLE IF NOT EXISTS order_statuses (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, name_en TEXT, dining_type TEXT DEFAULT 'all', sort_order INTEGER DEFAULT 0, enabled INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now','localtime')));
  CREATE TABLE IF NOT EXISTS attendance (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, type TEXT NOT NULL, timestamp TEXT DEFAULT (datetime('now','localtime')), note TEXT, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL);
  CREATE TABLE IF NOT EXISTS members (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, phone TEXT UNIQUE NOT NULL, email TEXT, points INTEGER DEFAULT 0, total_spent REAL DEFAULT 0, join_date TEXT DEFAULT (datetime('now','localtime')), note TEXT, created_at TEXT DEFAULT (datetime('now','localtime')));
  CREATE TABLE IF NOT EXISTS coupons (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, code TEXT UNIQUE, type TEXT DEFAULT 'percentage', value REAL NOT NULL, min_order REAL DEFAULT 0, expiry_date TEXT, usage_limit INTEGER DEFAULT 0, used_count INTEGER DEFAULT 0, enabled INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now','localtime')));
  CREATE TABLE IF NOT EXISTS member_coupons (id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER, coupon_id INTEGER, status TEXT DEFAULT 'unused', claimed_at TEXT DEFAULT (datetime('now','localtime')), used_at TEXT, FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE, FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS points_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER, points INTEGER NOT NULL, type TEXT, note TEXT, created_at TEXT DEFAULT (datetime('now','localtime')), FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS queue_numbers (id INTEGER PRIMARY KEY AUTOINCREMENT, number INTEGER NOT NULL, type TEXT DEFAULT 'dinein', phone TEXT, status TEXT DEFAULT 'waiting', called_count INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now','localtime')), called_at TEXT);
  CREATE TABLE IF NOT EXISTS translations (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT UNIQUE NOT NULL, page TEXT, description TEXT, translations TEXT, created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime')));
`);

try { db.prepare('ALTER TABLE platform_reports ADD COLUMN refund_count INTEGER DEFAULT 0').run(); } catch (e) {}
try { db.prepare('ALTER TABLE platform_reports ADD COLUMN refund_amount REAL DEFAULT 0').run(); } catch (e) {}
try { db.prepare("ALTER TABLE categories ADD COLUMN created_at TEXT DEFAULT (datetime('now','localtime'))").run(); } catch (e) {}
try { db.prepare("ALTER TABLE categories ADD COLUMN updated_at TEXT DEFAULT (datetime('now','localtime'))").run(); } catch (e) {}
try { db.prepare("ALTER TABLE flavor_tags ADD COLUMN price REAL DEFAULT 0").run(); } catch (e) {}
try { db.prepare("ALTER TABLE flavor_tags ADD COLUMN name_en TEXT DEFAULT ''").run(); } catch (e) {}
try { db.prepare("ALTER TABLE flavor_categories ADD COLUMN name_en TEXT DEFAULT ''").run(); } catch (e) {}
try { db.prepare("ALTER TABLE flavor_categories ADD COLUMN category_ids TEXT DEFAULT '[]'").run(); } catch (e) {}
// members 表补充缺失列
try { db.prepare("ALTER TABLE members ADD COLUMN birthday TEXT DEFAULT ''").run(); } catch (e) {}
try { db.prepare("ALTER TABLE members ADD COLUMN level TEXT DEFAULT '普通会员'").run(); } catch (e) {}
// points_logs 表补充缺失列
try { db.prepare("ALTER TABLE points_logs ADD COLUMN balance INTEGER DEFAULT 0").run(); } catch (e) {}
try { db.prepare("ALTER TABLE points_logs ADD COLUMN reason TEXT DEFAULT ''").run(); } catch (e) {}
[
  ['orders','created_by'],['orders','created_by_name'],['orders','updated_by'],['orders','updated_by_name'],
  ['products','created_by'],['products','created_by_name'],['products','updated_by'],['products','updated_by_name'],
  ['categories','created_by'],['categories','created_by_name'],['categories','updated_by'],['categories','updated_by_name'],
  ['platform_reports','created_by'],['platform_reports','created_by_name'],
  ['platforms','created_by'],['platforms','created_by_name'],['platforms','updated_by'],['platforms','updated_by_name'],
  ['memos','created_by'],['memos','created_by_name'],['members','created_by'],['members','created_by_name'],
  ['coupons','created_by'],['coupons','created_by_name'],
  ['tables','created_by'],['tables','created_by_name'],['tables','updated_by'],['tables','updated_by_name'],
  ['carousel','created_by'],['carousel','created_by_name'],['carousel','updated_by'],['carousel','updated_by_name'],
  ['flavor_tags','created_by'],['flavor_tags','created_by_name'],
  ['order_statuses','created_by'],['order_statuses','created_by_name'],
].forEach(([t,c]) => { try { db.prepare(`ALTER TABLE ${t} ADD COLUMN ${c} TEXT DEFAULT ''`).run(); } catch (e) {} });
['commission_rate REAL DEFAULT 0',"payout_schedule TEXT DEFAULT 'weekly'","delivery_type TEXT DEFAULT 'platform'",'min_order REAL DEFAULT 0','delivery_radius REAL DEFAULT 0',"contact_person TEXT DEFAULT ''",'rating REAL DEFAULT 0',"launch_date TEXT DEFAULT ''"].forEach(c => { try { db.prepare(`ALTER TABLE platforms ADD COLUMN ${c}`).run(); } catch (e) {} });

// ========== 菜单 v8：按菜单大标题分分类 ==========
try {
  const flag = db.prepare("SELECT value FROM settings WHERE key = 'menu_reset_v8'").get();
  if (!flag) {
    console.log('[菜单] v8 重置：按菜单大标题分分类...');
    db.prepare('DELETE FROM products').run();
    db.prepare('DELETE FROM categories').run();

    const insCat = db.prepare('INSERT INTO categories (name, name_en, sort_order, enabled) VALUES (?, ?, ?, 1)');
    const C = {};
    [
      ['主食','Rice, Noodle and Soup',1],
      ['甜品','Dessert',2],
      ['基础饮料','Basic Drinks & Beer',3],
      ['咖啡','Coffee',4],
      ['纯茶','Just Tea',5],
      ['奶盖茶','Milk Tea w. Cheese',6],
      ['奶茶','Milk Tea',7],
      ['冰沙','Smoothie',8],
      ['黑糖系列','Brown Sugar Series',9],
      ['脏奶','Dirty Milk',10],
      ['果茶','Fruit Tea',11],
      ['清爽一夏','Cool Summer',12],
    ].forEach(([n,en,s]) => { C[n] = insCat.run(n, en, s).lastInsertRowid; });

    const data = {
      '主食': [
        ['蛋炒饭','Egg Fried Rice',9.95,'photo-1603133872878-684f208fb84b'],
        ['菜炒饭','Veggie Fried Rice',10.95,'photo-1512058564366-18510be2db19'],
        ['鸡炒饭','Chicken Fried Rice',11.95,'photo-1512058564366-18510be2db19'],
        ['虾炒饭','Shrimp Fried Rice',13.95,'photo-1563379926898-05f4575a45d8'],
        ['蛋炒面','Egg Fried Noodle',12.95,'photo-1585032226651-759b368d7246'],
        ['菜炒面','Veggie Fried Noodle',13.95,'photo-1552611052-33e04de081de'],
        ['鸡炒面','Chicken Fried Noodle',13.95,'photo-1585032226651-759b368d7246'],
        ['虾炒面','Shrimp Fried Noodle',15.95,'photo-1563379926898-05f4575a45d8'],
        ['海鲜炒面','Seafood Fried Noodle',15.95,'photo-1559314809-0c5e6f6c6f6e'],
        ['水饺汤','Pork Dumpling Soup',9.50,'photo-1496116218417-1a781b1c416c'],
        ['馄饨汤','Wonton Soup',9.50,'photo-1496116218417-1a781b1c416c'],
        ['馄饨汤面','Wonton Noodle Soup',12.95,'photo-1552611052-33e04de081de'],
      ],
      '甜品': [
        ['芝士蛋糕','NY Cheese Cake',7.95,'photo-1578985545062-69928b1d9587'],
        ['红丝绒蛋糕','Red Velvet Cake',7.95,'photo-1616541823729-00b0a0bea6b3'],
        ['八宝饭','Eight-Treasure Rice',7.95,'photo-1563379926898-05f4575a45d8'],
        ['长乐冰饭','Changle Iced Sticky Rice',8.95,'photo-1563805042-7684c019e1cb'],
        ['奶茶冰饭','Milk Tea Iced Sticky Rice',9.95,'photo-1558857563-b39609b3b971'],
        ['多彩流心酒酿丸子','Rainbow Mochi Sweet Soup',12.95,'photo-1563805042-7684c019e1cb'],
      ],
      '基础饮料': [
        ['水','Water',2.00,'photo-1548839140-29a749e1cf4d'],
        ['苏打','Soda',3.00,'photo-1581636625402-caf42e72075d'],
        ['椰奶','Coconut Milk',3.00,'photo-1580325388158-9b1f0a0e3e0e'],
        ['荔枝水','Lychee Drink',3.00,'photo-1547516516-2e04aeae4be5'],
        ['北冰洋','Arctic Ocean Soda',3.00,'photo-1581636625402-caf42e72075d'],
        ['王老吉','Wong Lo Kat Tea',3.00,'photo-1571934811356-5cc061b6821f'],
        ['牛奶','Milk',4.00,'photo-1550583724-b2692b85b150'],
        ['百威/科罗娜/百威淡啤','Bud Light / Corona / Budweiser',3.00,'photo-1608270586620-248524c67de9'],
        ['喜力','Heineken',4.00,'photo-1566633392876-42538741c45e'],
        ['札幌啤酒','Sapporo',5.00,'photo-1557880144-256792ec7f72'],
      ],
      '咖啡': [
        ['咖啡拿铁','Coffee Latte',5.95,'photo-1509042239860-f550ce710b93'],
      ],
      '纯茶': [
        ['金骏眉','Jin Jun Mei Black Tea',5.95,'photo-1571934811356-5cc061b6821f'],
        ['茉莉绿茶','Jasmine Green Tea',5.95,'photo-1571934811356-5cc061b6821f'],
        ['Premium Tea','Premium Tea',5.95,'photo-1571934811356-5cc061b6821f'],
      ],
      '奶盖茶': [
        ['金骏眉奶盖','Cheese Foam Jin Jun Mei',6.25,'photo-1558857563-b39609b3b971'],
        ['茉莉绿茶奶盖','Cheese Foam Jasmine Green Tea',6.25,'photo-1558857563-b39609b3b971'],
      ],
      '奶茶': [
        ['奶茶','Milk Tea',6.50,'photo-1558857563-b39609b3b971'],
        ['黑糖奶茶','Brown Sugar Milk Tea',6.75,'photo-1558857563-b39609b3b971'],
        ['焦糖奶茶','Caramel Milk Tea',6.75,'photo-1558857563-b39609b3b971'],
        ['黑糖珍珠奶茶','Brown Sugar Boba Milk Tea',7.50,'photo-1558857563-b39609b3b971'],
        ['骏眉鲜乳','Jin Jun Mei Fresh Milk',7.55,'photo-1558857563-b39609b3b971'],
        ['茉莉绿茶鲜乳','Jasmine Green Fresh Milk',7.55,'photo-1558857563-b39609b3b971'],
        ['黑糖布雷鲜乳','Brown Sugar Creme Fresh Milk',7.55,'photo-1558857563-b39609b3b971'],
      ],
      '冰沙': [
        ['红豆冰沙','Red Bean Smoothie',7.00,'photo-1505252204118-eb8f36170f90'],
        ['芭乐冰沙','Guava Smoothie',7.00,'photo-1505252204118-eb8f36170f90'],
        ['抹茶冰沙','Matcha Smoothie',7.00,'photo-1505252204118-eb8f36170f90'],
        ['芒果冰沙','Mango Smoothie',7.25,'photo-1505252204118-eb8f36170f90'],
        ['草莓冰沙','Strawberry Smoothie',7.25,'photo-1505252204118-eb8f36170f90'],
        ['香蕉冰沙','Banana Smoothie',7.00,'photo-1505252204118-eb8f36170f90'],
        ['牛油果冰沙','Avocado Smoothie',7.75,'photo-1505252204118-eb8f36170f90'],
        ['蛋糕芒果冰沙','Mango Cake Smoothie',7.75,'photo-1505252204118-eb8f36170f90'],
      ],
      '黑糖系列': [
        ['手抄黑糖','Hand Fried Black Sugar Dirty Milk',7.50,'photo-1558857563-b39609b3b971'],
        ['黑糖出抹','Black Sugar Matcha Milk',7.50,'photo-1558857563-b39609b3b971'],
        ['黑糖拿铁','Black Sugar Golden Tea Latte',7.50,'photo-1558857563-b39609b3b971'],
        ['黑糖花生冰淇淋','Brown Sugar Peanut W/ Ice Cream',7.95,'photo-1558857563-b39609b3b971'],
        ['黑糖芝麻冰淇淋','Brown Sugar Black Sesame W/ Ice Cream',7.95,'photo-1558857563-b39609b3b971'],
        ['黑糖谷物冰淇淋','Brown Sugar Mixed Grain W/ Ice Cream',7.95,'photo-15588857563-b39609b3b971'],
        ['黑糖奥利奥冰淇淋','Brown Sugar Oreo W/ Ice Cream',7.95,'photo-15588857563-b39609b3b971'],
      ],
      '脏奶': [
        ['芒果脏奶','Fresh Mango Dirty Milk',7.25,'photo-1546173159-31efbc943d6c'],
        ['草莓脏奶','Strawberry Dirty Milk',7.25,'photo-1546173159-31efbc943d6c'],
        ['凤梨脏奶','Pineapple Dirty Milk',7.25,'photo-1546173159-31efbc943d6c'],
        ['火龙果香蕉脏奶','Dragon Fruit Banana Dirty Milk',8.25,'photo-1546173159-31efbc943d6c'],
        ['香芋脏奶','Taro Dirty Milk',7.25,'photo-1546173159-31efbc943d6c'],
      ],
      '果茶': [
        ['超级红柚','Red Grapefruit Green Tea',6.95,'photo-1546173159-31efbc943d6c'],
        ['百香果绿茶','Passion Fruit Green Tea',6.95,'photo-1546173159-31efbc943d6c'],
        ['蜜桃绿茶','Peach Green Tea',6.95,'photo-1546173159-31efbc943d6c'],
        ['芒果绿茶','Mango Green Tea',6.95,'photo-1546173159-31efbc943d6c'],
      ],
      '清爽一夏': [
        ['水蜜桃青柠','Honey Peach Limeade',7.50,'photo-1546173159-31efbc943d6c'],
        ['百香果青柠','Passion Fruit Limeade',7.50,'photo-1546173159-31efbc943d6c'],
        ['芒果青柠','Mango Limeade',7.50,'photo-1546173159-31efbc943d6c'],
        ['西柚青柠','Grapefruit Limeade',7.50,'photo-1546173159-31efbc943d6c'],
        ['凤梨青柠','Pineapple Limeade',7.50,'photo-1546173159-31efbc943d6c'],
        ['手捣青柠','Hand Pounded Limeade',7.50,'photo-1546173159-31efbc943d6c'],
      ],
    };

    const ins = db.prepare('INSERT INTO products (name, name_en, category_id, price, image, available, sort_order) VALUES (?, ?, ?, ?, ?, 1, ?)');
    let total = 0;
    for (const [catName, items] of Object.entries(data)) {
      let s = 1;
      items.forEach(([n,en,p,pid]) => { ins.run(n, en, C[catName], p, img(pid), s++); total++; });
    }

    db.prepare('DELETE FROM flavor_tags').run();
    db.prepare('DELETE FROM flavor_categories').run();
    const fcId = db.prepare("INSERT INTO flavor_categories (name, sort_order, enabled) VALUES ('小料 Toppings', 1, 1)").lastInsertRowid;
    const insTag = db.prepare('INSERT INTO flavor_tags (category_id, category, name, name_en, price, sort_order, enabled) VALUES (?, ?, ?, ?, ?, ?, 1)');
    [['红豆','Red Bean',0.75],['布丁','Pudding',0.75],['珍珠','Tapioca',0.75],['荔枝椰果','Lychee Jelly',0.75],['芒果椰果','Mango Jelly',0.75],['爆爆珠','Popping Ball',0.75],['玛奇朵奶霜','Macchiato Cream',1.25],['奶盖','Cheese Foam',1.25],['奥利奥碎','Oreo Crumbs',1.25],['冰淇淋','Ice Cream',1.50]].forEach(([n,en,p],i) => insTag.run(fcId,'小料',n,en,p,i+1));

    db.prepare("INSERT INTO settings (key, value) VALUES ('menu_reset_v8', 'done')").run();
    console.log(`[菜单] v8完成：${Object.keys(C).length}个分类，共${total}道菜`);
  }
} catch (e) { console.error('[菜单] v8失败:', e.message); }

// ========== 默认口味大类种子（幂等：已存在则跳过） ==========
try {
  const defaultFlavors = [
    { name: '冰度', name_en: 'Ice Level', sort: 1, tags: [
      ['正常冰', 'Regular Ice', 0, 1], ['少冰', 'Less Ice', 0, 0], ['去冰', 'No Ice', 0, 0],
    ]},
    { name: '甜度', name_en: 'Sweetness', sort: 2, tags: [
      ['正常糖', 'Regular Sugar', 0, 1], ['少糖', 'Less Sugar', 0, 0], ['无糖', 'No Sugar', 0, 0],
    ]},
    { name: '辣度', name_en: 'Spiciness', sort: 3, tags: [
      ['不辣', 'Non-spicy', 0, 1], ['微辣', 'Mild', 0, 0], ['中辣', 'Medium', 0, 0], ['大辣', 'Spicy', 0, 0],
    ]},
  ];
  for (const fc of defaultFlavors) {
    const existing = db.prepare('SELECT id FROM flavor_categories WHERE name = ?').get(fc.name);
    if (!existing) {
      const catId = db.prepare('INSERT INTO flavor_categories (name, name_en, sort_order, enabled, category_ids) VALUES (?, ?, ?, 1, ?)').run(fc.name, fc.name_en, fc.sort, '[]').lastInsertRowid;
      fc.tags.forEach(([tn, ten, price, isDef], i) => {
        db.prepare('INSERT INTO flavor_tags (category_id, category, name, name_en, price, is_default, sort_order, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, 1)')
          .run(catId, fc.name, tn, ten, price, isDef, i + 1);
      });
      console.log(`[口味] 已添加默认大类：${fc.name} (${fc.name_en})，${fc.tags.length}个标签`);
    }
  }
} catch (e) { console.error('[口味] 默认种子失败:', e.message); }

// ========== 翻译种子（幂等：已存在则跳过，不覆盖用户自定义） ==========
try {
  const t = (key, page, zh, en, desc = '') => ({ key, page, desc, translations: { zh, en } });
  const seed = [
    t('nav.dashboard','sidebar','仪表盘','Dashboard'),
    t('nav.order_center','sidebar','订单中心','Order Center'),
    t('nav.all_orders','sidebar','全部订单','All Orders'),
    t('nav.dinein_tables','sidebar','堂吃桌台','Dine-in Tables'),
    t('nav.queue','sidebar','排队叫号','Queue'),
    t('nav.kitchen','sidebar','厨房显示','Kitchen Display'),
    t('nav.order_status','sidebar','订单状态配置','Order Status Config'),
    t('nav.menu','sidebar','菜单管理','Menu Management'),
    t('nav.products','sidebar','菜品列表','Product List'),
    t('nav.flavors','sidebar','口味规格','Flavor Specs'),
    t('nav.combos','sidebar','组合套餐','Combos'),
    t('nav.delivery','sidebar','外卖管理','Delivery'),
    t('nav.platforms','sidebar','外卖平台','Platforms'),
    t('nav.platform_reports','sidebar','外卖报表','Reports'),
    t('nav.product_reports','sidebar','外卖菜品报表','Product Reports'),
    t('nav.members_staff','sidebar','会员与员工','Members & Staff'),
    t('nav.members','sidebar','会员列表','Members'),
    t('nav.coupons','sidebar','优惠券','Coupons'),
    t('nav.staff','sidebar','员工列表','Staff'),
    t('nav.roles','sidebar','角色权限','Roles & Permissions'),
    t('nav.finance','sidebar','财务与报表','Finance & Reports'),
    t('nav.sales','sidebar','销售统计','Sales Stats'),
    t('nav.deep_reports','sidebar','深度报表','Deep Reports'),
    t('nav.inventory','sidebar','货物进货','Inventory'),
    t('nav.settings','sidebar','系统设置','Settings'),
    t('nav.homepage','sidebar','首页内容','Homepage Content'),
    t('nav.menu_config','sidebar','菜单配置','Menu Config'),
    t('nav.forms','sidebar','表单管理','Form Management'),
    t('nav.translations','sidebar','翻译管理','Translations'),
    t('top.welcome','topbar','欢迎回来','Welcome back'),
    t('top.view_frontend','topbar','查看前台','View Frontend'),
    t('top.logout','topbar','退出登录','Logout'),
    t('top.super_admin','topbar','超级管理员','Super Admin'),
    t('dash.today_orders','dashboard','今日订单',"Today's Orders"),
    t('dash.today_revenue','dashboard','今日营收',"Today's Revenue"),
    t('dash.pending_orders','dashboard','待处理订单','Pending Orders'),
    t('dash.week_orders','dashboard','本周订单',"This Week's Orders"),
    t('dash.top5','dashboard','菜品热销 TOP5','Top 5 Products'),
    t('dash.view_full','dashboard','点击查看完整统计','View Full Stats'),
    t('dash.no_sales','dashboard','暂无销售数据','No Sales Data'),
    t('dash.memos','dashboard','备忘录/重点事项','Memos / Important Notes'),
    t('dash.add','dashboard','添加','Add'),
    t('dash.no_memos','dashboard','暂无备忘','No Memos'),
    t('dash.today_pending','dashboard','今日待处理订单',"Today's Pending Orders"),
    t('dash.all_orders','dashboard','全部订单','All Orders'),
    t('dash.no_pending','dashboard','今日暂无待处理订单','No Pending Orders Today'),
    t('dash.platforms','dashboard','外卖平台','Delivery Platforms'),
    t('dash.manage','dashboard','管理','Manage'),
    t('dash.no_phone','dashboard','无电话','No Phone'),
    t('common.save','common','保存','Save'),
    t('common.cancel','common','取消','Cancel'),
    t('common.delete','common','删除','Delete'),
    t('common.edit','common','编辑','Edit'),
    t('common.add','common','添加','Add'),
    t('common.search','common','搜索','Search'),
    t('common.confirm','common','确认','Confirm'),
    t('common.close','common','关闭','Close'),
    t('common.submit','common','提交','Submit'),
    t('common.export','common','导出','Export'),
    t('common.import','common','导入','Import'),
    t('common.enabled','common','启用','Enabled'),
    t('common.disabled','common','禁用','Disabled'),
    t('common.status','common','状态','Status'),
    t('common.name','common','名称','Name'),
    t('common.price','common','价格','Price'),
    t('common.action','common','操作','Action'),
    t('common.created_at','common','创建时间','Created At'),
    t('common.updated_at','common','更新时间','Updated At'),
    t('common.remark','common','备注','Note'),
    t('common.tip','common','提示','Notice'),
    t('common.success','common','成功','Success'),
    t('common.error','common','错误','Error'),
    t('common.no_data','common','暂无数据','No Data'),
    t('common.loading','common','加载中...','Loading...'),
  ];
  const ins = db.prepare('INSERT OR IGNORE INTO translations (key, page, description, translations) VALUES (?, ?, ?, ?)');
  let n = 0;
  seed.forEach(item => {
    ins.run(item.key, item.page, item.desc, JSON.stringify(item.translations));
    n++;
  });
  console.log(`[翻译] 已检查 ${n} 条默认翻译（已存在的不覆盖）`);
} catch (e) { console.error('[翻译] 种子失败:', e.message); }

require('./seeds/users')(db);
require('./seeds/menus')(db);
require('./seeds/platforms')(db);

module.exports = db;
