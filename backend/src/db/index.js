const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ========== 生成SVG图片：渐变背景+大emoji ==========
function foodImg(emoji, color1, color2) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stop-color="${color1}"/><stop offset="100%" stop-color="${color2}"/>
</linearGradient></defs>
<rect width="400" height="300" fill="url(#g)"/>
<text x="200" y="175" font-size="100" text-anchor="middle">${emoji}</text>
</svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

// ========== 表结构定义 ==========
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
    role TEXT DEFAULT 'user', role_id INTEGER, name TEXT, phone TEXT, email TEXT,
    permissions TEXT DEFAULT '{}', enabled INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, description, permissions TEXT DEFAULT '{}',
    is_system INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS platforms (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, logo TEXT, url TEXT, account TEXT, password TEXT,
    phone TEXT, note TEXT, enabled INTEGER DEFAULT 1, weekly_status TEXT DEFAULT '{}', sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS platform_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT, platform_id INTEGER, month TEXT NOT NULL, file_path TEXT NOT NULL,
    original_name TEXT, total_sales REAL DEFAULT 0, order_count INTEGER DEFAULT 0, platform_fee REAL DEFAULT 0,
    net_revenue REAL DEFAULT 0, note TEXT, created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE SET NULL
  );
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, name_en TEXT, sort_order INTEGER DEFAULT 0, enabled INTEGER DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, name_en TEXT, category_id INTEGER, price REAL NOT NULL DEFAULT 0,
    description TEXT, description_en TEXT, image TEXT, available INTEGER DEFAULT 1, is_recommend INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT, order_no TEXT UNIQUE NOT NULL, items TEXT NOT NULL,
    subtotal REAL NOT NULL DEFAULT 0, tax REAL NOT NULL DEFAULT 0, delivery_fee REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0, status TEXT DEFAULT 'pending', dining_type TEXT DEFAULT 'takeout',
    table_id INTEGER, customer_name TEXT, customer_phone TEXT, address TEXT, note TEXT,
    payment_method TEXT, pickup_number INTEGER,
    created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS tables (
    id INTEGER PRIMARY KEY AUTOINCREMENT, table_no TEXT UNIQUE NOT NULL, zone_id INTEGER, seats INTEGER DEFAULT 4,
    status TEXT DEFAULT 'empty', maintenance INTEGER DEFAULT 0, qr_code TEXT, sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS table_zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS table_reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT, table_id INTEGER, customer_name TEXT, customer_phone TEXT,
    reservation_time TEXT, guests INTEGER DEFAULT 2, status TEXT DEFAULT 'pending', note TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL
  );
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
  CREATE TABLE IF NOT EXISTS menus (
    id INTEGER PRIMARY KEY AUTOINCREMENT, parent_id INTEGER DEFAULT 0, name TEXT NOT NULL, icon TEXT, path TEXT,
    sort_order INTEGER DEFAULT 0, enabled INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS forms (
    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT, fields TEXT,
    status TEXT DEFAULT 'published', created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS form_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, form_id INTEGER NOT NULL, data TEXT,
    submitted_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS content_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT, block_key TEXT UNIQUE NOT NULL, title TEXT, title_en TEXT,
    content TEXT, content_en TEXT, image TEXT, sort_order INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS carousel (
    id INTEGER PRIMARY KEY AUTOINCREMENT, image TEXT NOT NULL, title TEXT, title_en TEXT, link TEXT,
    sort_order INTEGER DEFAULT 0, enabled INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS memos (
    id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT DEFAULT 'general', title TEXT NOT NULL, content TEXT,
    priority INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS content_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, title_en TEXT, content TEXT, content_en TEXT,
    icon TEXT, image TEXT, layout TEXT DEFAULT 'text', sort_order INTEGER DEFAULT 0, enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS new_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, name_en TEXT, description TEXT, description_en TEXT,
    image TEXT, sort_order INTEGER DEFAULT 0, enabled INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS flavor_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, sort_order INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS flavor_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT, category_id INTEGER, category TEXT, name TEXT NOT NULL, name_en TEXT,
    sort_order INTEGER DEFAULT 0, enabled INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS order_statuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, name_en TEXT, dining_type TEXT DEFAULT 'all',
    sort_order INTEGER DEFAULT 0, enabled INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, type TEXT NOT NULL,
    timestamp TEXT DEFAULT (datetime('now','localtime')), note TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, phone TEXT UNIQUE NOT NULL, email TEXT,
    points INTEGER DEFAULT 0, total_spent REAL DEFAULT 0, join_date TEXT DEFAULT (datetime('now','localtime')),
    note TEXT, created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, code TEXT UNIQUE, type TEXT DEFAULT 'percentage',
    value REAL NOT NULL, min_order REAL DEFAULT 0, expiry_date TEXT, usage_limit INTEGER DEFAULT 0,
    used_count INTEGER DEFAULT 0, enabled INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS member_coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER, coupon_id INTEGER, status TEXT DEFAULT 'unused',
    claimed_at TEXT DEFAULT (datetime('now','localtime')), used_at TEXT,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS points_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER, points INTEGER NOT NULL, type TEXT, note TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS queue_numbers (
    id INTEGER PRIMARY KEY AUTOINCREMENT, number INTEGER NOT NULL, type TEXT DEFAULT 'dinein', phone TEXT,
    status TEXT DEFAULT 'waiting', called_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime')), called_at TEXT
  );
  CREATE TABLE IF NOT EXISTS translations (
    id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT UNIQUE NOT NULL, page TEXT, description TEXT, translations TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime'))
  );
`);

// ========== 自动迁移 ==========
try { db.prepare('ALTER TABLE platform_reports ADD COLUMN refund_count INTEGER DEFAULT 0').run(); } catch (e) {}
try { db.prepare('ALTER TABLE platform_reports ADD COLUMN refund_amount REAL DEFAULT 0').run(); } catch (e) {}
try { db.prepare("ALTER TABLE categories ADD COLUMN created_at TEXT DEFAULT (datetime('now','localtime'))").run(); } catch (e) {}
try { db.prepare("ALTER TABLE categories ADD COLUMN updated_at TEXT DEFAULT (datetime('now','localtime'))").run(); } catch (e) {}
const auditCols = [
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
];
auditCols.forEach(([tbl, col]) => { try { db.prepare(`ALTER TABLE ${tbl} ADD COLUMN ${col} TEXT DEFAULT ''`).run(); } catch (e) {} });
['commission_rate REAL DEFAULT 0',"payout_schedule TEXT DEFAULT 'weekly'","delivery_type TEXT DEFAULT 'platform'",
 'min_order REAL DEFAULT 0','delivery_radius REAL DEFAULT 0',"contact_person TEXT DEFAULT ''",
 'rating REAL DEFAULT 0',"launch_date TEXT DEFAULT ''"].forEach(col => {
  try { db.prepare(`ALTER TABLE platforms ADD COLUMN ${col}`).run(); } catch (e) {}
});

// ========== 菜单数据 v3：带图片 ==========
try {
  const flag = db.prepare("SELECT value FROM settings WHERE key = 'menu_reset_v3'").get();
  if (!flag) {
    console.log('[菜单] v3 重置：带菜品图片...');
    db.prepare('DELETE FROM products').run();
    db.prepare('DELETE FROM categories').run();

    const insertCat = db.prepare('INSERT INTO categories (name, name_en, sort_order, enabled) VALUES (?, ?, ?, 1)');
    const catIds = {};
    [['主食','Rice, Noodle and Soup',1],['甜品','Dessert',2],['饮料','Drinks',3],['酒','Beer & Wine',4]].forEach(([n,en,s]) => {
      catIds[n] = insertCat.run(n, en, s).lastInsertRowid;
    });

    // [中文名, 英文名, 价格, emoji, 渐变色1, 渐变色2]
    const staples = [
      ['蛋炒饭','Egg Fried Rice',9.95,'🍳','#fef3c7','#fde68a'],
      ['菜炒饭','Veggie Fried Rice',10.95,'🥬','#d1fae5','#a7f3d0'],
      ['鸡炒饭','Chicken Fried Rice',11.95,'🍗','#fef3c7','#fcd34d'],
      ['虾炒饭','Shrimp Fried Rice',13.95,'🍤','#fee2e2','#fca5a5'],
      ['蛋炒面','Egg Fried Noodle',12.95,'🍜','#fef9c3','#fde047'],
      ['菜炒面','Veggie Fried Noodle',13.95,'🥗','#d9f99d','#bef264'],
      ['鸡炒面','Chicken Fried Noodle',13.95,'🍗','#fed7aa','#fdba74'],
      ['虾炒面','Shrimp Fried Noodle',15.95,'🍤','#fecaca','#f87171'],
      ['海鲜炒面','Seafood Fried Noodle',15.95,'🦐','#cffafe','#67e8f9'],
      ['水饺汤','Pork Dumpling Soup',9.50,'🥟','#fef9c3','#fde68a'],
      ['馄饨汤','Wonton Soup',9.50,'🥣','#fef3c7','#fcd34d'],
      ['馄饨汤面','Wonton Noodle Soup',12.95,'🍜','#fef9c3','#fde047'],
    ];
    const desserts = [
      ['芝士蛋糕','NY Cheese Cake',7.95,'🍰','#fce7f3','#f9a8d4'],
      ['红丝绒蛋糕','Red Velvet Cake',7.95,'🧁','#fee2e2','#ef4444'],
      ['八宝饭','Eight-Treasure Rice',7.95,'🍚','#fef3c7','#fbbf24'],
      ['长乐冰饭','Changle Iced Sticky Rice',8.95,'🍧','#e0f2fe','#7dd3fc'],
      ['奶茶冰饭','Milk Tea Iced Sticky Rice',9.95,'🧋','#fde8d7','#d4a574'],
      ['多彩流心酒酿丸子','Rainbow Mochi Sweet Soup',12.95,'🍡','#fce7f3','#c084fc'],
    ];
    const drinks = [
      ['水','Water',2.00,'💧','#e0f2fe','#38bdf8'],
      ['苏打','Soda',3.00,'🥤','#dbeafe','#60a5fa'],
      ['椰奶','Coconut Milk',3.00,'🥥','#f5f5f4','#d6d3d1'],
      ['荔枝水','Lychee Drink',3.00,'🍹','#fce7f3','#f472b6'],
      ['北冰洋','Arctic Ocean Soda',3.00,'🧃','#fef3c7','#f59e0b'],
      ['王老吉','Wong Lo Kat Tea',3.00,'🫖','#dcfce7','#4ade80'],
      ['牛奶','Milk',4.00,'🥛','#f0f9ff','#bae6fd'],
    ];
    const beers = [
      ['百威/科罗娜/百威淡啤','Bud Light / Corona / Budweiser',3.00,'🍺','#fef9c3','#eab308'],
      ['喜力','Heineken',4.00,'🍺','#dcfce7','#22c55e'],
      ['札幌啤酒','Sapporo',5.00,'🍶','#fee2e2','#ef4444'],
    ];

    const ins = db.prepare('INSERT INTO products (name, name_en, category_id, price, image, available, sort_order) VALUES (?, ?, ?, ?, ?, 1, ?)');
    let s = 1;
    staples.forEach(([n,en,p,e,c1,c2]) => ins.run(n, en, catIds['主食'], p, foodImg(e,c1,c2), s++));
    s = 1; desserts.forEach(([n,en,p,e,c1,c2]) => ins.run(n, en, catIds['甜品'], p, foodImg(e,c1,c2), s++));
    s = 1; drinks.forEach(([n,en,p,e,c1,c2]) => ins.run(n, en, catIds['饮料'], p, foodImg(e,c1,c2), s++));
    s = 1; beers.forEach(([n,en,p,e,c1,c2]) => ins.run(n, en, catIds['酒'], p, foodImg(e,c1,c2), s++));

    db.prepare("INSERT INTO settings (key, value) VALUES ('menu_reset_v3', 'done')").run();
    console.log(`[菜单] v3完成：主食${staples.length}+甜品${desserts.length}+饮料${drinks.length}+酒${beers.length}道，全部带图`);
  }
} catch (e) {
  console.error('[菜单] v3重置失败:', e.message);
}

// ========== 运行各模块初始化数据 ==========
require('./seeds/users')(db);
require('./seeds/menus')(db);
require('./seeds/platforms')(db);

module.exports = db;
