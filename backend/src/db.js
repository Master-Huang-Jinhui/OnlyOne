const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    name TEXT,
    phone TEXT,
    email TEXT,
    permissions TEXT DEFAULT '{}',
    enabled INTEGER DEFAULT 1,
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
    dining_type TEXT DEFAULT 'takeout',
    customer_name TEXT,
    customer_phone TEXT,
    customer_address TEXT,
    note TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
  CREATE TABLE IF NOT EXISTS menus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id INTEGER DEFAULT 0,
    name TEXT NOT NULL,
    icon TEXT,
    path TEXT,
    sort_order INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS forms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    fields TEXT DEFAULT '[]',
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS form_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    form_id INTEGER,
    data TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS content_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    block_key TEXT UNIQUE,
    title TEXT,
    title_en TEXT,
    content TEXT,
    content_en TEXT,
    images TEXT DEFAULT '[]',
    sort_order INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS carousel (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image TEXT,
    title TEXT,
    link TEXT,
    sort_order INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS memos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT,
    type TEXT DEFAULT 'memo',
    priority TEXT DEFAULT 'normal',
    completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS role_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    menu_id INTEGER,
    can_view INTEGER DEFAULT 1,
    can_edit INTEGER DEFAULT 0
  );
`);

const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!adminExists) {
  const hash = bcrypt.hashSync('admin', 10);
  db.prepare(`INSERT INTO users (username, password, role, name, permissions) VALUES (?, ?, 'admin', '超级管理员', '{}')`).run('admin', hash);
}

const defaultSettings = {
  'store_name': 'Only One BBQ & Tea',
  'store_name_en': 'Only One BBQ & Tea',
  'tax_rate': '0.08875',
  'phone': '',
  'address': '162-01 Sanford Ave, Flushing, NY',
  'delivery_range_miles': '3',
  'free_delivery_min': '30',
  'delivery_fee': '3.99',
  'business_hours': JSON.stringify({
    monday: { open: true, open_time: '10:00', close_time: '21:00' },
    tuesday: { open: false, open_time: '10:00', close_time: '21:00' },
    wednesday: { open: true, open_time: '10:00', close_time: '21:00' },
    thursday: { open: true, open_time: '10:00', close_time: '21:00' },
    friday: { open: true, open_time: '10:00', close_time: '21:00' },
    saturday: { open: true, open_time: '10:00', close_time: '21:00' },
    sunday: { open: true, open_time: '10:00', close_time: '21:00' }
  }),
  'brand_story': '法拉盛门店，烧烤 + 新式茶饮定位',
  'brand_story_en': 'Flushing store, BBQ + modern tea drinks',
  'tea_sourcing': JSON.stringify([
    { name: '乌龙茶', name_en: 'Oolong Tea', desc: '醇厚回甘', desc_en: 'Rich and smooth' },
    { name: '绿茶', name_en: 'Green Tea', desc: '清新自然', desc_en: 'Fresh and natural' },
    { name: '红茶', name_en: 'Black Tea', desc: '香浓顺滑', desc_en: 'Fragrant and smooth' }
  ]),
  'craft_philosophy': JSON.stringify([
    { name: '原叶现萃', name_en: 'Fresh Brewed' },
    { name: '鲜果鲜做', name_en: 'Fresh Fruit' },
    { name: '甜度可控', name_en: 'Adjustable Sweetness' },
    { name: '现点现做', name_en: 'Made to Order' }
  ]),
  'about_text': '关于我们',
  'about_text_en': 'About Us',
  'language': 'zh'
};

const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
for (const [key, value] of Object.entries(defaultSettings)) {
  insertSetting.run(key, value);
}

const defaultMenus = [
  { parent_id: 0, name: '外卖平台', icon: '🛵', path: '/admin/platforms', sort_order: 1 },
  { parent_id: 0, name: '商品管理', icon: '🍔', path: '/admin/products', sort_order: 2 },
  { parent_id: 0, name: '订单管理', icon: '📋', path: '/admin/orders', sort_order: 3 },
  { parent_id: 0, name: '用户管理', icon: '👥', path: '/admin/users', sort_order: 4 },
  { parent_id: 0, name: '权限管理', icon: '🔐', path: '/admin/permissions', sort_order: 5 },
  { parent_id: 0, name: '菜单管理', icon: '📑', path: '/admin/menus', sort_order: 6 },
  { parent_id: 0, name: '表单管理', icon: '📝', path: '/admin/forms', sort_order: 7 },
  { parent_id: 0, name: '内容管理', icon: '🖼️', path: '/admin/content', sort_order: 8 },
  { parent_id: 0, name: '系统设置', icon: '⚙️', path: '/admin/settings', sort_order: 9 }
];

const menuCount = db.prepare('SELECT COUNT(*) as cnt FROM menus').get().cnt;
if (menuCount === 0) {
  const insertMenu = db.prepare('INSERT INTO menus (parent_id, name, icon, path, sort_order) VALUES (?, ?, ?, ?, ?)');
  for (const m of defaultMenus) {
    insertMenu.run(m.parent_id, m.name, m.icon, m.path, m.sort_order);
  }
}

const catCount = db.prepare('SELECT COUNT(*) as cnt FROM categories').get().cnt;
if (catCount === 0) {
  const insertCat = db.prepare('INSERT INTO categories (name, name_en, sort_order) VALUES (?, ?, ?)');
  const cats = [
    ['招牌奶茶', 'Signature Milk Tea', 1],
    ['鲜果茶', 'Fresh Fruit Tea', 2],
    ['烧烤串', 'BBQ Skewers', 3],
    ['小食', 'Snacks', 4]
  ];
  cats.forEach(c => insertCat.run(...c));
  const insertProd = db.prepare(`INSERT INTO products (name, name_en, category_id, price, description, available, is_recommend, sort_order) VALUES (?, ?, ?, ?, ?, 1, ?, ?)`);
  const products = [
    ['黑糖珍珠奶茶', 'Brown Sugar Boba Milk Tea', 1, 5.99, '香浓黑糖搭配Q弹珍珠', 1, 1],
    ['香芋冰沙', 'Taro Smoothie', 1, 6.49, '绵密香芋，冰爽解暑', 1, 1],
    ['长乐冰饭', 'Changle Ice Rice', 2, 7.99, '福州传统甜品，配料丰富', 1, 0],
    ['烤羊肉串', 'Lamb Skewer', 3, 3.99, '新疆风味，鲜嫩多汁', 1, 1],
    ['烤牛肉串', 'Beef Skewer', 3, 4.49, '秘制酱料，香气四溢', 1, 0],
    ['烤鸡翅', 'Grilled Chicken Wings', 3, 5.99, '外焦里嫩，回味无穷', 1, 0],
    ['炸薯条', 'French Fries', 4, 3.49, '金黄酥脆', 1, 0]
  ];
  products.forEach(p => insertProd.run(...p));
}

const carouselCount = db.prepare('SELECT COUNT(*) as cnt FROM carousel').get().cnt;
if (carouselCount === 0) {
  const insertCarousel = db.prepare('INSERT INTO carousel (image, title, sort_order, enabled) VALUES (?, ?, ?, 1)');
  insertCarousel.run('', '招牌奶茶 限时优惠', 1);
  insertCarousel.run('', '新品上市 香芋冰沙', 2);
  insertCarousel.run('', '烧烤串串 鲜香四溢', 3);
}

module.exports = db;
