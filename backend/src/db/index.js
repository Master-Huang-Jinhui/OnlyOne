const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ========== 表结构定义 ==========
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    role_id INTEGER,
    name TEXT,
    phone TEXT,
    email TEXT,
    permissions TEXT DEFAULT '{}',
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description,
    permissions TEXT DEFAULT '{}',
    is_system INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS platforms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    logo TEXT,
    url TEXT,
    account TEXT,
    password TEXT,
    phone TEXT,
    note TEXT,
    enabled INTEGER DEFAULT 1,
    weekly_status TEXT DEFAULT '{}',
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS platform_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform_id INTEGER,
    month TEXT NOT NULL,
    file_path TEXT NOT NULL,
    original_name TEXT,
    total_sales REAL DEFAULT 0,
    order_count INTEGER DEFAULT 0,
    platform_fee REAL DEFAULT 0,
    net_revenue REAL DEFAULT 0,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_en TEXT,
    sort_order INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_en TEXT,
    category_id INTEGER,
    price REAL NOT NULL DEFAULT 0,
    description TEXT,
    description_en TEXT,
    image TEXT,
    available INTEGER DEFAULT 1,
    is_recommend INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT UNIQUE NOT NULL,
    items TEXT NOT NULL,
    subtotal REAL NOT NULL DEFAULT 0,
    tax REAL NOT NULL DEFAULT 0,
    delivery_fee REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    dining_type TEXT DEFAULT 'takeout',
    table_id INTEGER,
    customer_name TEXT,
    customer_phone TEXT,
    address TEXT,
    note TEXT,
    payment_method TEXT,
    pickup_number INTEGER,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS tables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_no TEXT UNIQUE NOT NULL,
    zone_id INTEGER,
    seats INTEGER DEFAULT 4,
    status TEXT DEFAULT 'empty',
    maintenance INTEGER DEFAULT 0,
    qr_code TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS table_zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS table_reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_id INTEGER,
    customer_name TEXT,
    customer_phone TEXT,
    reservation_time TEXT,
    guests INTEGER DEFAULT 2,
    status TEXT DEFAULT 'pending',
    note TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);

  CREATE TABLE IF NOT EXISTS menus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id INTEGER DEFAULT 0,
    name TEXT NOT NULL,
    icon TEXT,
    path TEXT,
    sort_order INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS forms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    fields TEXT,
    status TEXT DEFAULT 'published',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS form_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    form_id INTEGER NOT NULL,
    data TEXT,
    submitted_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS content_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    block_key TEXT UNIQUE NOT NULL,
    title TEXT,
    title_en TEXT,
    content TEXT,
    content_en TEXT,
    image TEXT,
    sort_order INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS carousel (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image TEXT NOT NULL,
    title TEXT,
    title_en TEXT,
    link TEXT,
    sort_order INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS memos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT DEFAULT 'general',
    title TEXT NOT NULL,
    content TEXT,
    priority INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS content_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    title_en TEXT,
    content TEXT,
    content_en TEXT,
    icon TEXT,
    image TEXT,
    layout TEXT DEFAULT 'text',
    sort_order INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS new_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    description_en TEXT,
    image TEXT,
    sort_order INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS flavor_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS flavor_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    category TEXT,
    name TEXT NOT NULL,
    name_en TEXT,
    sort_order INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS order_statuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_en TEXT,
    dining_type TEXT DEFAULT 'all',
    sort_order INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT NOT NULL,
    timestamp TEXT DEFAULT (datetime('now','localtime')),
    note TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    phone TEXT UNIQUE NOT NULL,
    email TEXT,
    points INTEGER DEFAULT 0,
    total_spent REAL DEFAULT 0,
    join_date TEXT DEFAULT (datetime('now','localtime')),
    note TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    type TEXT DEFAULT 'percentage',
    value REAL NOT NULL,
    min_order REAL DEFAULT 0,
    expiry_date TEXT,
    usage_limit INTEGER DEFAULT 0,
    used_count INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS member_coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER,
    coupon_id INTEGER,
    status TEXT DEFAULT 'unused',
    claimed_at TEXT DEFAULT (datetime('now','localtime')),
    used_at TEXT,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS points_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER,
    points INTEGER NOT NULL,
    type TEXT,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS queue_numbers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number INTEGER NOT NULL,
    type TEXT DEFAULT 'dinein',
    phone TEXT,
    status TEXT DEFAULT 'waiting',
    called_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    called_at TEXT
  );

  CREATE TABLE IF NOT EXISTS translations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    page TEXT,
    description TEXT,
    translations TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  );
`);

// ========== 自动迁移：新增列 ==========
try { db.prepare('ALTER TABLE platform_reports ADD COLUMN refund_count INTEGER DEFAULT 0').run(); } catch (e) {}
try { db.prepare('ALTER TABLE platform_reports ADD COLUMN refund_amount REAL DEFAULT 0').run(); } catch (e) {}
try { db.prepare("ALTER TABLE categories ADD COLUMN created_at TEXT DEFAULT (datetime('now','localtime'))").run(); } catch (e) {}
try { db.prepare("ALTER TABLE categories ADD COLUMN updated_at TEXT DEFAULT (datetime('now','localtime'))").run(); } catch (e) {}
try { db.prepare("ALTER TABLE orders ADD COLUMN created_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE orders ADD COLUMN created_by_name TEXT DEFAULT ''").run(); } catch (e) {}
try { db.prepare("ALTER TABLE orders ADD COLUMN updated_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE orders ADD COLUMN updated_by_name TEXT DEFAULT ''").run(); } catch (e) {}
try { db.prepare("ALTER TABLE products ADD COLUMN created_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE products ADD COLUMN created_by_name TEXT DEFAULT ''").run(); } catch (e) {}
try { db.prepare("ALTER TABLE products ADD COLUMN updated_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE products ADD COLUMN updated_by_name TEXT DEFAULT ''").run(); } catch (e) {}
try { db.prepare("ALTER TABLE categories ADD COLUMN created_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE categories ADD COLUMN created_by_name TEXT DEFAULT ''").run(); } catch (e) {}
try { db.prepare("ALTER TABLE categories ADD COLUMN updated_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE categories ADD COLUMN updated_by_name TEXT DEFAULT ''").run(); } catch (e) {}
try { db.prepare("ALTER TABLE platform_reports ADD COLUMN created_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE platform_reports ADD COLUMN created_by_name TEXT DEFAULT ''").run(); } catch (e) {}
try { db.prepare("ALTER TABLE platforms ADD COLUMN created_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE platforms ADD COLUMN created_by_name TEXT DEFAULT ''").run(); } catch (e) {}
try { db.prepare("ALTER TABLE platforms ADD COLUMN updated_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE platforms ADD COLUMN updated_by_name TEXT DEFAULT ''").run(); } catch (e) {}
try { db.prepare("ALTER TABLE memos ADD COLUMN created_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE memos ADD COLUMN created_by_name TEXT DEFAULT ''").run(); } catch (e) {}
try { db.prepare("ALTER TABLE members ADD COLUMN created_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE members ADD COLUMN created_by_name TEXT DEFAULT ''").run(); } catch (e) {}
try { db.prepare("ALTER TABLE coupons ADD COLUMN created_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE coupons ADD COLUMN created_by_name TEXT DEFAULT ''").run(); } catch (e) {}
try { db.prepare("ALTER TABLE tables ADD COLUMN created_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE tables ADD COLUMN created_by_name TEXT DEFAULT ''").run(); } catch (e) {}
try { db.prepare("ALTER TABLE tables ADD COLUMN updated_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE tables ADD COLUMN updated_by_name TEXT DEFAULT ''").run(); } catch (e) {}
try { db.prepare("ALTER TABLE carousel ADD COLUMN created_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE carousel ADD COLUMN created_by_name TEXT DEFAULT ''").run(); } catch (e) {}
try { db.prepare("ALTER TABLE carousel ADD COLUMN updated_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE carousel ADD COLUMN updated_by_name TEXT DEFAULT ''").run(); } catch (e) {}
try { db.prepare("ALTER TABLE flavor_tags ADD COLUMN created_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE flavor_tags ADD COLUMN created_by_name TEXT DEFAULT ''").run(); } catch (e) {}
try { db.prepare("ALTER TABLE order_statuses ADD COLUMN created_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE order_statuses ADD COLUMN created_by_name TEXT DEFAULT ''").run(); } catch (e) {}

// ========== 外卖平台扩展字段迁移 ==========
try { db.prepare("ALTER TABLE platforms ADD COLUMN commission_rate REAL DEFAULT 0").run(); } catch (e) {}
try { db.prepare("ALTER TABLE platforms ADD COLUMN payout_schedule TEXT DEFAULT 'weekly'").run(); } catch (e) {}
try { db.prepare("ALTER TABLE platforms ADD COLUMN delivery_type TEXT DEFAULT 'platform'").run(); } catch (e) {}
try { db.prepare("ALTER TABLE platforms ADD COLUMN min_order REAL DEFAULT 0").run(); } catch (e) {}
try { db.prepare("ALTER TABLE platforms ADD COLUMN delivery_radius REAL DEFAULT 0").run(); } catch (e) {}
try { db.prepare("ALTER TABLE platforms ADD COLUMN contact_person TEXT DEFAULT ''").run(); } catch (e) {}
try { db.prepare("ALTER TABLE platforms ADD COLUMN rating REAL DEFAULT 0").run(); } catch (e) {}
try { db.prepare("ALTER TABLE platforms ADD COLUMN launch_date TEXT DEFAULT ''").run(); } catch (e) {}

// ========== 菜单数据重置：清空旧菜品，只保留4个分类 ==========
try {
  // 用标记判断是否已重置过，避免每次重启都清空
  const resetFlag = db.prepare("SELECT value FROM settings WHERE key = 'menu_reset_v1'").get();
  if (!resetFlag) {
    console.log('[菜单] 开始重置菜品数据...');
    // 删除所有旧菜品
    db.prepare('DELETE FROM products').run();
    // 删除所有旧分类
    db.prepare('DELETE FROM categories').run();

    // 创建4个分类
    const cats = [
      ['主食', 'Rice & Noodles', 1],
      ['甜品', 'Dessert', 2],
      ['饮料', 'Drinks', 3],
      ['酒', 'Beer & Wine', 4],
    ];
    const insertCat = db.prepare('INSERT INTO categories (name, name_en, sort_order, enabled) VALUES (?, ?, ?, 1)');
    const catIds = {};
    cats.forEach(([name, nameEn, sort]) => {
      const r = insertCat.run(name, nameEn, sort);
      catIds[name] = r.lastInsertRowid;
    });

    // 主食
    const staples = [
      ['蛋炒饭', 'Egg Fried Rice', 9.95],
      ['菜炒饭', 'Veggie Fried Rice', 10.95],
      ['鸡炒饭', 'Chicken Fried Rice', 11.95],
      ['虾炒饭', 'Shrimp Fried Rice', 13.95],
      ['蛋炒面', 'Egg Fried Noodle', 12.95],
      ['菜炒面', 'Veggie Fried Noodle', 13.95],
      ['鸡炒面', 'Chicken Fried Noodle', 13.95],
      ['虾炒面', 'Shrimp Fried Noodle', 15.95],
      ['海鲜炒面', 'Seafood Fried Noodle', 15.95],
    ];

    // 甜品
    const desserts = [
      ['芝士蛋糕', 'NY Cheese Cake', 7.95],
      ['红丝绒蛋糕', 'Red Velvet Cake', 7.95],
      ['八宝饭', 'Eight-Treasure Rice', 7.95],
      ['长乐冰饭', 'Changle Iced Sticky Rice', 8.95],
      ['奶茶冰饭', 'Milk Tea Iced Sticky Rice', 9.95],
      ['多彩流心酒酿丸子', 'Rainbow Mochi Sweet Soup', 12.95],
    ];

    // 饮料
    const drinks = [
      ['水', 'Water', 2.00],
      ['苏打', 'Soda (Coke/Diet Coke/Orange/Sprite/Ginger Ale/Seltzer)', 3.00],
      ['椰奶', 'Coconut Milk', 3.00],
      ['荔枝水', 'Lychee Drink', 3.00],
      ['北冰洋', 'Arctic Ocean Soda', 3.00],
      ['王老吉', 'Wong Lo Kat Herbal Tea', 3.00],
      ['牛奶', 'Milk', 4.00],
    ];

    // 酒
    const beers = [
      ['百威淡啤/科罗娜/百威', 'Bud Light / Corona / Budweiser', 3.00],
      ['喜力', 'Heineken', 4.00],
      ['札幌啤酒', 'Sapporo', 5.00],
    ];

    const insertProduct = db.prepare('INSERT INTO products (name, name_en, category_id, price, available, sort_order) VALUES (?, ?, ?, ?, 1, ?)');

    let s = 1;
    staples.forEach(([n, en, p]) => insertProduct.run(n, en, catIds['主食'], p, s++));
    s = 1;
    desserts.forEach(([n, en, p]) => insertProduct.run(n, en, catIds['甜品'], p, s++));
    s = 1;
    drinks.forEach(([n, en, p]) => insertProduct.run(n, en, catIds['饮料'], p, s++));
    s = 1;
    beers.forEach(([n, en, p]) => insertProduct.run(n, en, catIds['酒'], p, s++));

    // 写入标记，下次重启不再重复清空
    db.prepare("INSERT INTO settings (key, value) VALUES ('menu_reset_v1', 'done')").run();
    console.log('[菜单] 重置完成：主食' + staples.length + '道、甜品' + desserts.length + '道、饮料' + drinks.length + '道、酒' + beers.length + '道');
  }
} catch (e) {
  console.error('[菜单] 重置失败:', e.message);
}

// ========== 运行各模块初始化数据 ==========
require('./seeds/users')(db);
require('./seeds/menus')(db);
require('./seeds/platforms')(db);

module.exports = db;
