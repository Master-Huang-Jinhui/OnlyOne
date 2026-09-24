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

// ========== categories 表补充时间字段 ==========
try { db.prepare("ALTER TABLE categories ADD COLUMN created_at TEXT DEFAULT (datetime('now','localtime'))").run(); } catch (e) {}
try { db.prepare("ALTER TABLE categories ADD COLUMN updated_at TEXT DEFAULT (datetime('now','localtime'))").run(); } catch (e) {}

// ========== 操作人字段迁移：created_by / created_by_name / updated_by / updated_by_name ==========
// 订单：谁下的单、谁改的状态
try { db.prepare("ALTER TABLE orders ADD COLUMN created_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE orders ADD COLUMN created_by_name TEXT DEFAULT ''").run(); } catch (e) {}
try { db.prepare("ALTER TABLE orders ADD COLUMN updated_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE orders ADD COLUMN updated_by_name TEXT DEFAULT ''").run(); } catch (e) {}
// 商品
try { db.prepare("ALTER TABLE products ADD COLUMN created_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE products ADD COLUMN created_by_name TEXT DEFAULT ''").run(); } catch (e) {}
try { db.prepare("ALTER TABLE products ADD COLUMN updated_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE products ADD COLUMN updated_by_name TEXT DEFAULT ''").run(); } catch (e) {}
// 分类
try { db.prepare("ALTER TABLE categories ADD COLUMN created_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE categories ADD COLUMN created_by_name TEXT DEFAULT ''").run(); } catch (e) {}
try { db.prepare("ALTER TABLE categories ADD COLUMN updated_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE categories ADD COLUMN updated_by_name TEXT DEFAULT ''").run(); } catch (e) {}
// 外卖报表
try { db.prepare("ALTER TABLE platform_reports ADD COLUMN created_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE platform_reports ADD COLUMN created_by_name TEXT DEFAULT ''").run(); } catch (e) {}
// 外卖平台
try { db.prepare("ALTER TABLE platforms ADD COLUMN created_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE platforms ADD COLUMN created_by_name TEXT DEFAULT ''").run(); } catch (e) {}
try { db.prepare("ALTER TABLE platforms ADD COLUMN updated_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE platforms ADD COLUMN updated_by_name TEXT DEFAULT ''").run(); } catch (e) {}
// 备忘录
try { db.prepare("ALTER TABLE memos ADD COLUMN created_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE memos ADD COLUMN created_by_name TEXT DEFAULT ''").run(); } catch (e) {}
// 会员
try { db.prepare("ALTER TABLE members ADD COLUMN created_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE members ADD COLUMN created_by_name TEXT DEFAULT ''").run(); } catch (e) {}
// 优惠券
try { db.prepare("ALTER TABLE coupons ADD COLUMN created_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE coupons ADD COLUMN created_by_name TEXT DEFAULT ''").run(); } catch (e) {}
// 桌台
try { db.prepare("ALTER TABLE tables ADD COLUMN created_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE tables ADD COLUMN created_by_name TEXT DEFAULT ''").run(); } catch (e) {}
try { db.prepare("ALTER TABLE tables ADD COLUMN updated_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE tables ADD COLUMN updated_by_name TEXT DEFAULT ''").run(); } catch (e) {}
// 轮播图
try { db.prepare("ALTER TABLE carousel ADD COLUMN created_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE carousel ADD COLUMN created_by_name TEXT DEFAULT ''").run(); } catch (e) {}
try { db.prepare("ALTER TABLE carousel ADD COLUMN updated_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE carousel ADD COLUMN updated_by_name TEXT DEFAULT ''").run(); } catch (e) {}
// 口味标签
try { db.prepare("ALTER TABLE flavor_tags ADD COLUMN created_by INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE flavor_tags ADD COLUMN created_by_name TEXT DEFAULT ''").run(); } catch (e) {}
// 订单状态
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

// ========== 运行各模块初始化数据 ==========
require('./seeds/users')(db);
require('./seeds/menus')(db);
require('./seeds/platforms')(db);

module.exports = db;
