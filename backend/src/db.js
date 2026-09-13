const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 初始化表结构
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
    guest_id TEXT,
    table_id INTEGER,
    table_session TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS tables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_no TEXT UNIQUE NOT NULL,
    zone TEXT DEFAULT '大厅',
    seats INTEGER DEFAULT 4,
    status TEXT DEFAULT 'idle',
    current_session TEXT,
    sort_order INTEGER DEFAULT 0,
    min_charge REAL DEFAULT 0,
    waiter_id INTEGER,
    waiter_name TEXT,
    note TEXT DEFAULT '',
    opened_at TEXT,
    qr_custom_url TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS table_zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS table_reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_id INTEGER,
    table_no TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    reserve_date TEXT NOT NULL,
    reserve_time TEXT NOT NULL,
    party_size INTEGER DEFAULT 2,
    note TEXT DEFAULT '',
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
    description,
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
  CREATE TABLE IF NOT EXISTS content_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    title_en TEXT,
    content TEXT,
    content_en TEXT,
    icon TEXT DEFAULT '📌',
    image TEXT,
    layout TEXT DEFAULT 'left',
    sort_order INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS new_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    description_en TEXT,
    image TEXT,
    sort_order INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS role_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    menu_id INTEGER,
    can_view INTEGER DEFAULT 1,
    can_edit INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS flavor_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    category_ids TEXT
  );
  CREATE TABLE IF NOT EXISTS flavor_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    category TEXT NOT NULL DEFAULT '其他',
    name TEXT NOT NULL,
    extra_price REAL DEFAULT 0,
    is_default INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS order_statuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    status_key TEXT NOT NULL,
    dining_type TEXT NOT NULL DEFAULT 'all',
    label TEXT NOT NULL,
    color TEXT DEFAULT 'default',
    sort_order INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 0,
    next_status TEXT,
    next_label TEXT
  );
  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    user_name TEXT,
    date TEXT NOT NULL,
    clock_in TEXT,
    clock_out TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT,
    birthday TEXT,
    points INTEGER DEFAULT 0,
    level TEXT DEFAULT '普通会员',
    total_spent REAL DEFAULT 0,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'fixed',
    value REAL NOT NULL DEFAULT 0,
    min_amount REAL DEFAULT 0,
    max_discount REAL,
    valid_days INTEGER,
    stock INTEGER,
    used_count INTEGER DEFAULT 0,
    start_date TEXT,
    end_date TEXT,
    enabled INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS member_coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    coupon_id INTEGER NOT NULL,
    status TEXT DEFAULT 'unused',
    order_id INTEGER,
    expire_date TEXT,
    obtained_at TEXT DEFAULT (datetime('now','localtime')),
    used_at TEXT
  );
  CREATE TABLE IF NOT EXISTS points_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    points INTEGER NOT NULL,
    balance INTEGER DEFAULT 0,
    reason TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS queue_numbers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number TEXT NOT NULL,
    type TEXT DEFAULT 'dinein',
    customer_name TEXT,
    people_count INTEGER DEFAULT 1,
    note TEXT,
    status TEXT DEFAULT 'waiting',
    created_at TEXT DEFAULT (datetime('now','localtime')),
    called_at TEXT,
    completed_at TEXT
  );
  CREATE TABLE IF NOT EXISTS translations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    page TEXT DEFAULT 'common',
    description TEXT DEFAULT '',
    translations TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  );
`);

// 初始化默认翻译数据
try {
  const defaultTranslations = [
    { key: 'common.confirm', page: 'common', desc: '确认', trans: { zh: '确认', en: 'Confirm', es: 'Confirmar' } },
    { key: 'common.cancel', page: 'common', desc: '取消', trans: { zh: '取消', en: 'Cancel', es: 'Cancelar' } },
    { key: 'common.save', page: 'common', desc: '保存', trans: { zh: '保存', en: 'Save', es: 'Guardar' } },
    { key: 'common.delete', page: 'common', desc: '删除', trans: { zh: '删除', en: 'Delete', es: 'Eliminar' } },
    { key: 'common.edit', page: 'common', desc: '编辑', trans: { zh: '编辑', en: 'Edit', es: 'Editar' } },
    { key: 'common.add', page: 'common', desc: '新增', trans: { zh: '新增', en: 'Add', es: 'Añadir' } },
    { key: 'common.search', page: 'common', desc: '搜索', trans: { zh: '搜索', en: 'Search', es: 'Buscar' } },
    { key: 'common.reset', page: 'common', desc: '重置', trans: { zh: '重置', en: 'Reset', es: 'Restablecer' } },
    { key: 'common.loading', page: 'common', desc: '加载中', trans: { zh: '加载中...', en: 'Loading...', es: 'Cargando...' } },
    { key: 'common.action', page: 'common', desc: '操作', trans: { zh: '操作', en: 'Action', es: 'Acción' } },
    { key: 'common.status', page: 'common', desc: '状态', trans: { zh: '状态', en: 'Status', es: 'Estado' } },
    { key: 'common.time', page: 'common', desc: '时间', trans: { zh: '时间', en: 'Time', es: 'Tiempo' } },
    { key: 'common.amount', page: 'common', desc: '金额', trans: { zh: '金额', en: 'Amount', es: 'Cantidad' } },
    { key: 'common.quantity', page: 'common', desc: '数量', trans: { zh: '数量', en: 'Quantity', es: 'Cantidad' } },
    { key: 'common.success', page: 'common', desc: '成功', trans: { zh: '成功', en: 'Success', es: 'Éxito' } },
    { key: 'common.error', page: 'common', desc: '错误', trans: { zh: '错误', en: 'Error', es: 'Error' } },
    { key: 'common.back', page: 'common', desc: '返回', trans: { zh: '返回', en: 'Back', es: 'Volver' } },
    { key: 'common.submit', page: 'common', desc: '提交', trans: { zh: '提交', en: 'Submit', es: 'Enviar' } },
    { key: 'common.close', page: 'common', desc: '关闭', trans: { zh: '关闭', en: 'Close', es: 'Cerrar' } },
    { key: 'nav.home', page: 'nav', desc: '首页', trans: { zh: '首页', en: 'Home', es: 'Inicio' } },
    { key: 'nav.menu', page: 'nav', desc: '菜单', trans: { zh: '菜单', en: 'Menu', es: 'Menú' } },
    { key: 'nav.about', page: 'nav', desc: '关于', trans: { zh: '关于', en: 'About', es: 'Sobre' } },
    { key: 'nav.contact', page: 'nav', desc: '联系', trans: { zh: '联系', en: 'Contact', es: 'Contacto' } },
    { key: 'nav.new', page: 'nav', desc: '新品', trans: { zh: '新品', en: 'New', es: 'Nuevo' } },
    { key: 'nav.brand', page: 'nav', desc: '品牌', trans: { zh: '品牌', en: 'Brand', es: 'Marca' } },
    { key: 'nav.tea', page: 'nav', desc: '茶品', trans: { zh: '茶品', en: 'Tea', es: 'Té' } },
    { key: 'nav.craft', page: 'nav', desc: '工艺', trans: { zh: '工艺', en: 'Craft', es: 'Artesanía' } },
    { key: 'nav.order', page: 'nav', desc: '查订单', trans: { zh: '查订单', en: 'Track Order', es: 'Seguir Pedido' } },
    { key: 'nav.admin', page: 'nav', desc: '管理登录', trans: { zh: '管理登录', en: 'Admin Login', es: 'Admin' } },
    { key: 'admin.dashboard', page: 'admin', desc: '仪表盘', trans: { zh: '仪表盘', en: 'Dashboard', es: 'Panel' } },
    { key: 'admin.orders', page: 'admin', desc: '订单管理', trans: { zh: '订单管理', en: 'Orders', es: 'Pedidos' } },
    { key: 'admin.products', page: 'admin', desc: '商品管理', trans: { zh: '商品管理', en: 'Products', es: 'Productos' } },
    { key: 'admin.users', page: 'admin', desc: '用户管理', trans: { zh: '用户管理', en: 'Users', es: 'Usuarios' } },
    { key: 'admin.settings', page: 'admin', desc: '系统设置', trans: { zh: '系统设置', en: 'Settings', es: 'Ajustes' } },
    { key: 'admin.platforms', page: 'admin', desc: '外卖平台', trans: { zh: '外卖平台', en: 'Platforms', es: 'Plataformas' } },
    { key: 'admin.flavors', page: 'admin', desc: '口味管理', trans: { zh: '口味管理', en: 'Flavors', es: 'Sabores' } },
    { key: 'admin.permissions', page: 'admin', desc: '权限管理', trans: { zh: '权限管理', en: 'Permissions', es: 'Permisos' } },
    { key: 'admin.menus', page: 'admin', desc: '菜单管理', trans: { zh: '菜单管理', en: 'Menu Manager', es: 'Gestor de Menú' } },
    { key: 'admin.forms', page: 'admin', desc: '表单管理', trans: { zh: '表单管理', en: 'Forms', es: 'Formularios' } },
    { key: 'admin.content', page: 'admin', desc: '内容管理', trans: { zh: '内容管理', en: 'Content', es: 'Contenido' } },
    { key: 'admin.tables', page: 'admin', desc: '餐桌管理', trans: { zh: '餐桌管理', en: 'Tables', es: 'Mesas' } },
    { key: 'admin.roles', page: 'admin', desc: '角色管理', trans: { zh: '角色管理', en: 'Roles', es: 'Roles' } },
    { key: 'admin.inventory', page: 'admin', desc: '货物管理', trans: { zh: '货物管理', en: 'Inventory', es: 'Inventario' } },
    { key: 'admin.stats', page: 'admin', desc: '销售统计', trans: { zh: '销售统计', en: 'Statistics', es: 'Estadísticas' } },
    { key: 'admin.members', page: 'admin', desc: '会员管理', trans: { zh: '会员管理', en: 'Members', es: 'Miembros' } },
    { key: 'admin.coupons', page: 'admin', desc: '优惠券', trans: { zh: '优惠券', en: 'Coupons', es: 'Cupones' } },
    { key: 'admin.queue', page: 'admin', desc: '排队叫号', trans: { zh: '排队叫号', en: 'Queue', es: 'Cola' } },
    { key: 'admin.kds', page: 'admin', desc: '厨房显示', trans: { zh: '厨房显示', en: 'Kitchen Display', es: 'Cocina' } },
    { key: 'admin.reports', page: 'admin', desc: '深度报表', trans: { zh: '深度报表', en: 'Reports', es: 'Reportes' } },
    { key: 'admin.orderStatuses', page: 'admin', desc: '订单状态管理', trans: { zh: '订单状态管理', en: 'Order Statuses', es: 'Estados de Pedido' } },
    { key: 'dashboard.todayOrders', page: 'dashboard', desc: '今日订单', trans: { zh: '今日订单', en: 'Today Orders', es: 'Pedidos de Hoy' } },
    { key: 'dashboard.todayRevenue', page: 'dashboard', desc: '今日营收', trans: { zh: '今日营收', en: "Today's Revenue", es: 'Ingresos de Hoy' } },
    { key: 'dashboard.pendingOrders', page: 'dashboard', desc: '待处理订单', trans: { zh: '待处理订单', en: 'Pending Orders', es: 'Pedidos Pendientes' } },
    { key: 'dashboard.weekOrders', page: 'dashboard', desc: '本周订单', trans: { zh: '本周订单', en: 'Week Orders', es: 'Pedidos de la Semana' } },
    { key: 'dashboard.welcome', page: 'dashboard', desc: '欢迎回来', trans: { zh: '欢迎回来', en: 'Welcome back', es: 'Bienvenido de nuevo' } },
    { key: 'employee.order', page: 'employee', desc: '点餐', trans: { zh: '点餐', en: 'Order', es: 'Pedido' } },
    { key: 'employee.clock', page: 'employee', desc: '打卡', trans: { zh: '打卡', en: 'Clock In', es: 'Fichar' } },
    { key: 'employee.dinein', page: 'employee', desc: '堂吃', trans: { zh: '堂吃', en: 'Dine In', es: 'Comer Aquí' } },
    { key: 'employee.takeout', page: 'employee', desc: '打包', trans: { zh: '打包', en: 'Takeout', es: 'Para Llevar' } },
    { key: 'employee.delivery', page: 'employee', desc: '配送', trans: { zh: '配送', en: 'Delivery', es: 'Entrega' } },
    { key: 'employee.cart', page: 'employee', desc: '购物车', trans: { zh: '购物车', en: 'Cart', es: 'Carrito' } },
    { key: 'employee.checkout', page: 'employee', desc: '结算', trans: { zh: '结算', en: 'Checkout', es: 'Pagar' } },
    { key: 'employee.orderSuccess', page: 'employee', desc: '下单成功', trans: { zh: '下单成功', en: 'Order Placed', es: 'Pedido Realizado' } },
    { key: 'employee.welcome', page: 'employee', desc: '欢迎', trans: { zh: '欢迎', en: 'Welcome', es: 'Bienvenido' } },
    { key: 'order.pending', page: 'order', desc: '待处理', trans: { zh: '待处理', en: 'Pending', es: 'Pendiente' } },
    { key: 'order.preparing', page: 'order', desc: '制作中', trans: { zh: '制作中', en: 'Preparing', es: 'Preparando' } },
    { key: 'order.ready', page: 'order', desc: '待取餐', trans: { zh: '待取餐', en: 'Ready', es: 'Listo' } },
    { key: 'order.completed', page: 'order', desc: '已完成', trans: { zh: '已完成', en: 'Completed', es: 'Completado' } },
    { key: 'order.cancelled', page: 'order', desc: '已取消', trans: { zh: '已取消', en: 'Cancelled', es: 'Cancelado' } },
    { key: 'login.title', page: 'login', desc: '登录', trans: { zh: '登录', en: 'Login', es: 'Iniciar Sesión' } },
    { key: 'login.username', page: 'login', desc: '用户名', trans: { zh: '用户名', en: 'Username', es: 'Usuario' } },
    { key: 'login.password', page: 'login', desc: '密码', trans: { zh: '密码', en: 'Password', es: 'Contraseña' } },
    { key: 'login.submit', page: 'login', desc: '登录按钮', trans: { zh: '登录', en: 'Sign In', es: 'Entrar' } },
    { key: 'login.logout', page: 'login', desc: '退出登录', trans: { zh: '退出登录', en: 'Logout', es: 'Cerrar Sesión' } },
    { key: 'login.changePassword', page: 'login', desc: '修改密码', trans: { zh: '修改密码', en: 'Change Password', es: 'Cambiar Contraseña' } }
  ];
  const insertTranslation = db.prepare('INSERT OR IGNORE INTO translations (key, page, description, translations) VALUES (?, ?, ?, ?)');
  defaultTranslations.forEach(t => {
    insertTranslation.run(t.key, t.page, t.desc, JSON.stringify(t.trans));
  });
  console.log(`[初始化] 已插入 ${defaultTranslations.length} 条默认翻译数据`);
} catch (e) {
  console.error('[初始化] 默认翻译数据插入失败:', e.message);
}

// 兼容旧数据库：添加订单时间流程字段
try {
  const cols = db.prepare("PRAGMA table_info(orders)").all();
  if (!cols.find(c => c.name === 'start_time')) db.prepare("ALTER TABLE orders ADD COLUMN start_time TEXT").run();
  if (!cols.find(c => c.name === 'ready_time')) db.prepare("ALTER TABLE orders ADD COLUMN ready_time TEXT").run();
  if (!cols.find(c => c.name === 'complete_time')) db.prepare("ALTER TABLE orders ADD COLUMN complete_time TEXT").run();
} catch (e) {}

try {
  db.prepare(`DELETE FROM menus WHERE id NOT IN (SELECT MIN(id) FROM menus WHERE path IS NOT NULL AND path != '' GROUP BY path)`).run();
} catch (e) {}

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
  'language': 'zh',
  'business_day_start': '04:00'
};

const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
for (const [key, value] of Object.entries(defaultSettings)) {
  insertSetting.run(key, value);
}

const defaultMenus = [
  { parent_id: 0, name: '外卖平台', icon: '🛵', path: '/admin/platforms', sort_order: 1 },
  { parent_id: 0, name: '商品管理', icon: '🍔', path: '/admin/products', sort_order: 2 },
  { parent_id: 0, name: '口味管理', icon: '🌶️', path: '/admin/flavors', sort_order: 3 },
  { parent_id: 0, name: '订单管理', icon: '📋', path: '/admin/orders', sort_order: 4 },
  { parent_id: 0, name: '用户管理', icon: '👥', path: '/admin/users', sort_order: 5 },
  { parent_id: 0, name: '权限管理', icon: '🔐', path: '/admin/permissions', sort_order: 6 },
  { parent_id: 0, name: '菜单管理', icon: '📑', path: '/admin/menus', sort_order: 7 },
  { parent_id: 0, name: '表单管理', icon: '📝', path: '/admin/forms', sort_order: 8 },
  { parent_id: 0, name: '内容管理', icon: '🖼️', path: '/admin/content', sort_order: 9 },
  { parent_id: 0, name: '系统设置', icon: '⚙️', path: '/admin/settings', sort_order: 10 }
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
    ['小食', 'Snacks', 4],
    ['其他', 'Others', 5]
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
    ['炸薯条', 'French Fries', 4, 3.49, '金黄酥脆', 1, 0],
    ['感谢支持，祝你发大财', 'Thank You for Your Support', 5, 1.00, '感谢您的支持，祝您财源广进，生意兴隆！', 1, 0]
  ];
  products.forEach(p => insertProd.run(...p));
}

const flavorCount = db.prepare('SELECT COUNT(*) as cnt FROM flavor_tags').get().cnt;
if (flavorCount === 0) {
  const insertCat = db.prepare('INSERT INTO flavor_categories (name, sort_order, enabled) VALUES (?, ?, 1)');
  const insertFlavor = db.prepare('INSERT INTO flavor_tags (category_id, category, name, extra_price, is_default, sort_order, enabled) VALUES (?, ?, ?, ?, ?, ?, 1)');
  const categories = [
    { name: '辣度', sort: 1 },
    { name: '冰度', sort: 2 },
    { name: '甜度', sort: 3 },
    { name: '配料', sort: 4 },
    { name: '其他', sort: 5 }
  ];
  const catIds = {};
  categories.forEach(c => { const r = insertCat.run(c.name, c.sort); catIds[c.name] = r.lastInsertRowid; });
  const flavors = [
    ['辣度', '不辣', 0, 0, 1], ['辣度', '微辣', 0, 0, 2], ['辣度', '少辣', 0, 0, 3], ['辣度', '中辣', 0, 0, 4], ['辣度', '特辣', 0, 0, 5],
    ['冰度', '去冰', 1, 0, 1], ['冰度', '少冰', 0, 0, 2], ['冰度', '正常冰', 0, 1, 3], ['冰度', '多冰', 0, 0, 4], ['冰度', '热饮', 0, 0, 5],
    ['甜度', '无糖', 0, 0, 1], ['甜度', '半糖', 0, 0, 2], ['甜度', '少糖', 0, 0, 3], ['甜度', '正常糖', 0, 1, 4], ['甜度', '全糖', 0, 0, 5],
    ['配料', '加珍珠', 0.75, 0, 1], ['配料', '加椰果', 0.75, 0, 2], ['配料', '加布丁', 0.75, 0, 3], ['配料', '加芋圆', 1, 0, 4],
    ['其他', '不要葱', 0, 0, 1], ['其他', '不要香菜', 0, 0, 2], ['其他', '不要蒜', 0, 0, 3], ['其他', '打包', 0, 0, 4]
  ];
  flavors.forEach(f => insertFlavor.run(catIds[f[0]], f[0], f[1], f[2], f[3], f[4]));
}

const orderStatusCount = db.prepare('SELECT COUNT(*) as cnt FROM order_statuses').get().cnt;
if (orderStatusCount === 0) {
  const insertStatus = db.prepare('INSERT INTO order_statuses (status_key, dining_type, label, color, sort_order, enabled, is_active, next_status, next_label) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const defaultStatuses = [
    ['pending', 'dinein', '进行中', 'primary', 1, 1, 1, 'completed', '完成结账'],
    ['preparing', 'dinein', '进行中', 'primary', 2, 1, 1, 'completed', '完成结账'],
    ['ready', 'dinein', '进行中', 'primary', 3, 1, 1, 'completed', '完成结账'],
    ['completed', 'dinein', '已完成', 'success', 4, 1, 0, null, null],
    ['cancelled', 'dinein', '已取消', 'danger', 5, 1, 0, null, null],
    ['pending', 'takeout', '进行中', 'warning', 1, 1, 1, 'ready', '制作完成'],
    ['preparing', 'takeout', '进行中', 'warning', 2, 1, 1, 'ready', '制作完成'],
    ['ready', 'takeout', '待取餐', 'primary', 3, 1, 1, 'completed', '确认取餐'],
    ['completed', 'takeout', '已完成', 'success', 4, 1, 0, null, null],
    ['cancelled', 'takeout', '已取消', 'danger', 5, 1, 0, null, null],
    ['pending', 'delivery', '进行中', 'warning', 1, 1, 1, 'ready', '开始配送'],
    ['preparing', 'delivery', '进行中', 'warning', 2, 1, 1, 'ready', '开始配送'],
    ['ready', 'delivery', '配送中', 'primary', 3, 1, 1, 'completed', '配送完成'],
    ['completed', 'delivery', '已完成', 'success', 4, 1, 0, null, null],
    ['cancelled', 'delivery', '已取消', 'danger', 5, 1, 0, null, null]
  ];
  defaultStatuses.forEach(s => insertStatus.run(...s));
}

const carouselCount = db.prepare('SELECT COUNT(*) as cnt FROM carousel').get().cnt;
if (carouselCount === 0) {
  const insertCarousel = db.prepare('INSERT INTO carousel (image, title, sort_order, enabled) VALUES (?, ?, ?, 1)');
  insertCarousel.run('', '招牌奶茶 限时优惠', 1);
  insertCarousel.run('', '新品上市 香芋冰沙', 2);
  insertCarousel.run('', '烧烤串串 鲜香四溢', 3);
}

const tagColumns = db.prepare("PRAGMA table_info(flavor_tags)").all();
if (!tagColumns.find(c => c.name === 'category_id')) {
  db.prepare('ALTER TABLE flavor_tags ADD COLUMN category_id INTEGER').run();
}

const flavorCatColumns = db.prepare("PRAGMA table_info(flavor_categories)").all();
if (!flavorCatColumns.find(c => c.name === 'category_ids')) {
  db.prepare('ALTER TABLE flavor_categories ADD COLUMN category_ids TEXT').run();
}

const sectionColumns = db.prepare("PRAGMA table_info(content_sections)").all();
if (!sectionColumns.find(c => c.name === 'image')) {
  db.prepare('ALTER TABLE content_sections ADD COLUMN image TEXT').run();
}
if (!sectionColumns.find(c => c.name === 'layout')) {
  db.prepare('ALTER TABLE content_sections ADD COLUMN layout TEXT DEFAULT \'left\'').run();
}

const orderColumns = db.prepare("PRAGMA table_info(orders)").all();
if (!orderColumns.find(c => c.name === 'guest_id')) {
  db.prepare('ALTER TABLE orders ADD COLUMN guest_id TEXT').run();
}
if (!orderColumns.find(c => c.name === 'table_id')) {
  db.prepare('ALTER TABLE orders ADD COLUMN table_id INTEGER').run();
}
if (!orderColumns.find(c => c.name === 'table_session')) {
  db.prepare('ALTER TABLE orders ADD COLUMN table_session TEXT').run();
}
if (!orderColumns.find(c => c.name === 'pickup_number')) {
  db.prepare('ALTER TABLE orders ADD COLUMN pickup_number TEXT').run();
}

const tableColumns = db.prepare("PRAGMA table_info(tables)").all();
if (!tableColumns.find(c => c.name === 'zone')) db.prepare("ALTER TABLE tables ADD COLUMN zone TEXT DEFAULT '大厅'").run();
if (!tableColumns.find(c => c.name === 'seats')) db.prepare("ALTER TABLE tables ADD COLUMN seats INTEGER DEFAULT 4").run();
if (!tableColumns.find(c => c.name === 'min_charge')) db.prepare("ALTER TABLE tables ADD COLUMN min_charge REAL DEFAULT 0").run();
if (!tableColumns.find(c => c.name === 'waiter_id')) db.prepare("ALTER TABLE tables ADD COLUMN waiter_id INTEGER").run();
if (!tableColumns.find(c => c.name === 'waiter_name')) db.prepare("ALTER TABLE tables ADD COLUMN waiter_name TEXT").run();
if (!tableColumns.find(c => c.name === 'note')) db.prepare("ALTER TABLE tables ADD COLUMN note TEXT DEFAULT ''").run();
if (!tableColumns.find(c => c.name === 'opened_at')) db.prepare("ALTER TABLE tables ADD COLUMN opened_at TEXT").run();
if (!tableColumns.find(c => c.name === 'qr_custom_url')) db.prepare("ALTER TABLE tables ADD COLUMN qr_custom_url TEXT").run();

try {
  const dirtyOrders = db.prepare("SELECT id, table_id FROM orders WHERE table_id IS NOT NULL AND (table_session IS NULL OR table_session = '')").all();
  let fixedCount = 0;
  dirtyOrders.forEach(order => {
    const table = db.prepare('SELECT current_session FROM tables WHERE id = ?').get(order.table_id);
    if (table?.current_session) {
      db.prepare('UPDATE orders SET table_session = ? WHERE id = ?').run(table.current_session, order.id);
      fixedCount++;
    }
  });
  if (fixedCount > 0) console.log(`[数据迁移] 修正了 ${fixedCount} 条订单的 table_session 脏数据`);
} catch (e) {
  console.error('[数据迁移] 修正 table_session 脏数据失败:', e.message);
}

const tableCount = db.prepare('SELECT COUNT(*) as cnt FROM tables').get().cnt;
if (tableCount === 0) {
  const crypto = require('crypto');
  const insertTable = db.prepare('INSERT INTO tables (table_no, zone, seats, status, current_session, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
  const defaultTables = [
    { no: 'A1', zone: '大厅', seats: 4 }, { no: 'A2', zone: '大厅', seats: 4 },
    { no: 'A3', zone: '大厅', seats: 4 }, { no: 'A4', zone: '大厅', seats: 4 },
    { no: 'B1', zone: '包间', seats: 6 }, { no: 'B2', zone: '包间', seats: 8 },
    { no: 'C1', zone: '户外', seats: 2 }, { no: 'C2', zone: '户外', seats: 2 }
  ];
  defaultTables.forEach((t, i) => {
    insertTable.run(t.no, t.zone, t.seats, 'idle', crypto.randomUUID(), i + 1);
  });
}

const defaultZones = ['大厅', '包间', '户外', '吧台'];
defaultZones.forEach((name, i) => {
  const exists = db.prepare('SELECT id FROM table_zones WHERE name = ?').get(name);
  if (!exists) {
    db.prepare('INSERT INTO table_zones (name, sort_order) VALUES (?, ?)').run(name, i + 1);
  }
});

const otherCat = db.prepare("SELECT id FROM categories WHERE name = '其他'").get();
if (!otherCat) {
  db.prepare('INSERT INTO categories (name, name_en, sort_order, enabled) VALUES (?, ?, ?, 1)').run('其他', 'Others', 5);
}

const thankProduct = db.prepare("SELECT id FROM products WHERE name = '感谢支持，祝你发大财'").get();
if (!thankProduct) {
  const otherCatId = db.prepare("SELECT id FROM categories WHERE name = '其他'").get()?.id;
  if (otherCatId) {
    db.prepare(`INSERT INTO products (name, name_en, category_id, price, description, available, is_recommend, sort_order) VALUES (?, ?, ?, ?, ?, 1, 0, 99)`).run(
      '感谢支持，祝你发大财', 'Thank You for Your Support', otherCatId, 1.00, '感谢您的支持，祝您财源广进，生意兴隆！'
    );
  }
}

const extraMenus = [
  { name: '口味管理', icon: '🌶️', path: '/admin/flavors', sort: 3 },
  { name: '订单状态管理', icon: '🔄', path: '/admin/order-statuses', sort: 3 },
  { name: '货物管理', icon: '📦', path: '/admin/inventory', sort: 4 },
  { name: '厨房显示', icon: '🍳', path: '/admin/kds', sort: 3 },
  { name: '销售统计', icon: '📊', path: '/admin/stats/product', sort: 4 },
  { name: '会员管理', icon: '👑', path: '/admin/members', sort: 5 },
  { name: '优惠券', icon: '🎟️', path: '/admin/coupons', sort: 5 },
  { name: '排队叫号', icon: '📢', path: '/admin/queue', sort: 5 },
  { name: '深度报表', icon: '📈', path: '/admin/reports', sort: 6 },
  { name: '餐桌管理', icon: '🪑', path: '/admin/tables', sort: 4 },
  { name: '角色管理', icon: '🎭', path: '/admin/roles', sort: 5 }
];
extraMenus.forEach(m => {
  const exists = db.prepare('SELECT id FROM menus WHERE path = ?').get(m.path);
  if (!exists) {
    db.prepare('INSERT INTO menus (parent_id, name, icon, path, sort_order, enabled) VALUES (0, ?, ?, ?, ?, 1)').run(m.name, m.icon, m.path, m.sort);
  }
});

const defaultPlatforms = [
  { name: 'Uber Eats', account: 'only16201@hotmail.com', password: '121227jJ162', url: 'https://merchants.ubereats.com', note: 'Uber Eats 商家后台', sort_order: 1 },
  { name: 'DoorDash', account: 'only16201@hotmail.com', password: '162-01Sanford', url: 'https://merchant.doordash.com', note: 'DoorDash 商家后台', sort_order: 2 },
  { name: 'Grubhub', account: 'Only16201@hotmail.com', password: '162Meiling@', url: 'https://restaurant.grubhub.com', note: 'Grubhub 商家后台', sort_order: 3 },
  { name: 'Google', account: 'only16201@hotmail.com', password: '121227jJ162', url: 'https://business.google.com', note: 'Google 商家后台', sort_order: 4 },
  { name: 'HungerPanda', account: '', password: '', url: 'https://www.hungrypanda.com', note: '熊猫外卖', sort_order: 5 },
  { name: '小灰云', account: 'OnlyOneBBQandTea', password: '121227jJ162', url: '', note: '小灰云系统', sort_order: 6 },
  { name: 'Yelp', account: '', password: '', phone: '6307763590', url: 'https://www.yelp.com', note: '菜单更改需联系客服', sort_order: 7 },
  { name: 'BeyondMenu', account: '', password: '', phone: '6307763590', url: 'https://www.beyondmenu.com', note: '菜单更改需联系客服', sort_order: 8 }
];
const insertPlatform = db.prepare('INSERT INTO platforms (name, logo, url, account, password, phone, note, enabled, weekly_status, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)');
const updatePlatformAccount = db.prepare("UPDATE platforms SET account = ?, password = ?, url = COALESCE(NULLIF(url, ''), ?), phone = COALESCE(NULLIF(phone, ''), ?), note = COALESCE(NULLIF(note, ''), ?) WHERE name = ? AND (account IS NULL OR account = '')");
defaultPlatforms.forEach(p => {
  const exists = db.prepare('SELECT id FROM platforms WHERE name = ?').get(p.name);
  if (!exists) {
    insertPlatform.run(p.name, '', p.url || '', p.account || '', p.password || '', p.phone || '', p.note || '', '{}', p.sort_order);
  } else {
    updatePlatformAccount.run(p.account || '', p.password || '', p.url || '', p.phone || '', p.note || '', p.name);
  }
});

const existingCats = db.prepare('SELECT DISTINCT category FROM flavor_tags WHERE category_id IS NULL').all();
if (existingCats.length > 0) {
  const insertCat = db.prepare('INSERT OR IGNORE INTO flavor_categories (name, sort_order, enabled) VALUES (?, ?, 1)');
  const getCatId = db.prepare('SELECT id FROM flavor_categories WHERE name = ?');
  const updateTag = db.prepare('UPDATE flavor_tags SET category_id = ? WHERE category = ? AND category_id IS NULL');
  existingCats.forEach((c, i) => {
    insertCat.run(c.category, i + 1);
    const cat = getCatId.get(c.category);
    if (cat) updateTag.run(cat.id, c.category);
  });
}

const userCols = db.prepare("PRAGMA table_info(users)").all();
if (!userCols.find(c => c.name === 'role_id')) {
  db.exec('ALTER TABLE users ADD COLUMN role_id INTEGER');
}

const defaultRoles = [
  { name: '超级管理员', description: '拥有系统全部权限，不可删除', is_system: 1, sort_order: 1 },
  { name: '管理员', description: '可分配后台菜单权限', is_system: 1, sort_order: 2 },
  { name: '员工', description: '员工端点餐、打卡', is_system: 1, sort_order: 3 },
  { name: '普通用户', description: '前台顾客端点餐', is_system: 1, sort_order: 4 },
  { name: '厨房师傅', description: '查看订单、制作状态、出餐管理', is_system: 0, sort_order: 5 },
  { name: '收银员', description: '订单管理、收款、订单状态更新', is_system: 0, sort_order: 6 }
];
const insertRole = db.prepare('INSERT OR IGNORE INTO roles (name, description, permissions, is_system, sort_order) VALUES (?, ?, ?, ?, ?)');
defaultRoles.forEach(r => {
  insertRole.run(r.name, r.description, '{}', r.is_system, r.sort_order);
});

const allMenuIds = db.prepare('SELECT id, path FROM menus WHERE enabled = 1').all();
const kitchenAllowedPaths = ['/admin/orders', '/admin/order-statuses'];
const cashierAllowedPaths = ['/admin/orders', '/admin/order-statuses', '/admin/tables'];
const kitchenRole = db.prepare("SELECT id FROM roles WHERE name = '厨房师傅'").get();
const cashierRole = db.prepare("SELECT id FROM roles WHERE name = '收银员'").get();
if (kitchenRole) {
  const kitchenMenuIds = allMenuIds.filter(m => kitchenAllowedPaths.includes(m.path)).map(m => m.id);
  db.prepare('UPDATE roles SET permissions = ? WHERE id = ?').run(JSON.stringify({ menus: kitchenMenuIds }), kitchenRole.id);
}
if (cashierRole) {
  const cashierMenuIds = allMenuIds.filter(m => cashierAllowedPaths.includes(m.path)).map(m => m.id);
  db.prepare('UPDATE roles SET permissions = ? WHERE id = ?').run(JSON.stringify({ menus: cashierMenuIds }), cashierRole.id);
}

module.exports = db;