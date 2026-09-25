// 数据库连接和初始化
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../data.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ========== 建表 ==========
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'staff',
    role_id INTEGER,
    phone TEXT,
    avatar TEXT,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    permissions TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS platforms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT,
    logo TEXT,
    username TEXT,
    password TEXT,
    category TEXT,
    sort_order INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    weekly_status TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS platform_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform_id INTEGER NOT NULL,
    month TEXT NOT NULL,
    file_path TEXT,
    original_name TEXT,
    total_sales REAL DEFAULT 0,
    order_count INTEGER DEFAULT 0,
    platform_fee REAL DEFAULT 0,
    net_revenue REAL DEFAULT 0,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_en TEXT,
    parent_id INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    name TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    description_en TEXT,
    price REAL NOT NULL,
    image TEXT,
    sort_order INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    is_new INTEGER DEFAULT 0,
    spicy_level INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT UNIQUE NOT NULL,
    items TEXT,
    subtotal REAL DEFAULT 0,
    tax REAL DEFAULT 0,
    delivery_fee REAL DEFAULT 0,
    total REAL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    dining_type TEXT DEFAULT 'dine_in',
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
    note TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS menus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id INTEGER DEFAULT 0,
    name TEXT NOT NULL,
    name_en TEXT,
    icon TEXT,
    path TEXT,
    sort_order INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS forms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    title_en TEXT,
    description TEXT,
    fields TEXT DEFAULT '[]',
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS form_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    form_id INTEGER,
    data TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS content_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section TEXT,
    title TEXT,
    title_en TEXT,
    content TEXT,
    content_en TEXT,
    image TEXT,
    link TEXT,
    sort_order INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime'))
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
    title TEXT NOT NULL,
    content TEXT,
    priority INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS order_statuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_en TEXT,
    color TEXT DEFAULT '#409EFF',
    sort_order INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    phone TEXT UNIQUE,
    points INTEGER DEFAULT 0,
    total_spent REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    discount_type TEXT DEFAULT 'fixed',
    value REAL NOT NULL,
    min_spend REAL DEFAULT 0,
    valid_days INTEGER DEFAULT 30,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS member_coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER,
    coupon_id INTEGER,
    status TEXT DEFAULT 'unused',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS points_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER,
    points INTEGER NOT NULL,
    type TEXT,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS queue_numbers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number INTEGER NOT NULL,
    phone TEXT,
    people_count INTEGER DEFAULT 2,
    status TEXT DEFAULT 'waiting',
    called_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS translations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL,
    zh TEXT,
    en TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS goods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    unit TEXT DEFAULT '个',
    price REAL DEFAULT 0,
    category TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS purchase_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier TEXT,
    total_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    note TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS purchase_order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_order_id INTEGER,
    goods_name TEXT,
    quantity REAL DEFAULT 0,
    unit_price REAL DEFAULT 0,
    total_price REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS product_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    goods_id INTEGER,
    usage_amount REAL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS inventory_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goods_id INTEGER,
    type TEXT DEFAULT 'in',
    quantity REAL DEFAULT 0,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    check_in TEXT,
    check_out TEXT,
    date TEXT,
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

  CREATE TABLE IF NOT EXISTS profit_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month TEXT NOT NULL,
    total_revenue REAL DEFAULT 0,
    total_cost REAL DEFAULT 0,
    total_profit REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
`);

// ========== 自动迁移：新增列 ==========
try {
  db.prepare('ALTER TABLE platform_reports ADD COLUMN refund_count INTEGER DEFAULT 0').run();
} catch (e) {}
try {
  db.prepare('ALTER TABLE platform_reports ADD COLUMN refund_amount REAL DEFAULT 0').run();
} catch (e) {}
// tables表补字段
try { db.prepare('ALTER TABLE tables ADD COLUMN note TEXT').run(); } catch (e) {}
try { db.prepare('ALTER TABLE tables ADD COLUMN min_charge REAL DEFAULT 0').run(); } catch (e) {}
try { db.prepare('ALTER TABLE tables ADD COLUMN waiter_id INTEGER').run(); } catch (e) {}
try { db.prepare('ALTER TABLE tables ADD COLUMN waiter_name TEXT').run(); } catch (e) {}
try { db.prepare('ALTER TABLE tables ADD COLUMN qr_custom_url TEXT').run(); } catch (e) {}
try { db.prepare('ALTER TABLE tables ADD COLUMN current_session TEXT').run(); } catch (e) {}
// orders表补table_session
try { db.prepare('ALTER TABLE orders ADD COLUMN table_session TEXT').run(); } catch (e) {}

// ========== 运行各模块初始化数据 ==========
require('./seeds/users')(db);
require('./seeds/menus')(db);
require('./seeds/platforms')(db);

module.exports = db;
