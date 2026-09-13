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
    description TEXT,
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

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

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
    // 通用
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
    // 前台导航
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
    // 后台菜单
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
    // 仪表盘
    { key: 'dashboard.todayOrders', page: 'dashboard', desc: '今日订单', trans: { zh: '今日订单', en: 'Today Orders', es: 'Pedidos de Hoy' } },
    { key: 'dashboard.todayRevenue', page: 'dashboard', desc: '今日营收', trans: { zh: '今日营收', en: "Today's Revenue", es: 'Ingresos de Hoy' } },
    { key: 'dashboard.pendingOrders', page: 'dashboard', desc: '待处理订单', trans: { zh: '待处理订单', en: 'Pending Orders', es: 'Pedidos Pendientes' } },
    { key: 'dashboard.weekOrders', page: 'dashboard', desc: '本周订单', trans: { zh: '本周订单', en: 'Week Orders', es: 'Pedidos de la Semana' } },
    { key: 'dashboard.welcome', page: 'dashboard', desc: '欢迎回来', trans: { zh: '欢迎回来', en: 'Welcome back', es: 'Bienvenido de nuevo' } },
    // 员工端
    { key: 'employee.order', page: 'employee', desc: '点餐', trans: { zh: '点餐', en: 'Order', es: 'Pedido' } },
    { key: 'employee.clock', page: 'employee', desc: '打卡', trans: { zh: '打卡', en: 'Clock In', es: 'Fichar' } },
    { key: 'employee.dinein', page: 'employee', desc: '堂吃', trans: { zh: '堂吃', en: 'Dine In', es: 'Comer Aquí' } },
    { key: 'employee.takeout', page: 'employee', desc: '打包', trans: { zh: '打包', en: 'Takeout', es: 'Para Llevar' } },
    { key: 'employee.delivery', page: 'employee', desc: '配送', trans: { zh: '配送', en: 'Delivery', es: 'Entrega' } },
    { key: 'employee.cart', page: 'employee', desc: '购物车', trans: { zh: '购物车', en: 'Cart', es: 'Carrito' } },
    { key: 'employee.checkout', page: 'employee', desc: '结算', trans: { zh: '结算', en: 'Checkout', es: 'Pagar' } },
    { key: 'employee.orderSuccess', page: 'employee', desc: '下单成功', trans: { zh: '下单成功', en: 'Order Placed', es: 'Pedido Realizado' } },
    { key: 'employee.welcome', page: 'employee', desc: '欢迎', trans: { zh: '欢迎', en: 'Welcome', es: 'Bienvenido' } },
    // 订单状态
    { key: 'order.pending', page: 'order', desc: '待处理', trans: { zh: '待处理', en: 'Pending', es: 'Pendiente' } },
    { key: 'order.preparing', page: 'order', desc: '制作中', trans: { zh: '制作中', en: 'Preparing', es: 'Preparando' } },
    { key: 'order.ready', page: 'order', desc: '待取餐', trans: { zh: '待取餐', en: 'Ready', es: 'Listo' } },
    { key: 'order.completed', page: 'order', desc: '已完成', trans: { zh: '已完成', en: 'Completed', es: 'Completado' } },
    { key: 'order.cancelled', page: 'order', desc: '已取消', trans: { zh: '已取消', en: 'Cancelled', es: 'Cancelado' } },
    // 登录
    { key: 'login.title', page: 'login', desc: '登录', trans: { zh: '登录', en: 'Login', es: 'Iniciar Sesión' } },
    { key: 'login.username', page: 'login', desc: '用户名', trans: { zh: '用户名', en: 'Username', es: 'Usuario' } },
    { key: 'login.password', page: 'login', desc: '密码', trans: { zh: '密码', en: 'Password', es: 'Contraseña' } },
    { key: 'login.submit', page: 'login', desc: '登录按钮', trans: { zh: '登录', en: 'Sign In', es: 'Entrar' } },
    { key: 'login.logout', page: 'login', desc: '退出登录', trans: { zh: '退出登录', en: 'Logout', es: 'Cerrar Sesión' } },
    { key: 'login.changePassword', page: 'login', desc: '修改密码', trans: { zh: '修改密码', en: 'Change Password', es: 'Cambiar Contraseña' } },
    { key: 'home.newArrivals', page: 'home', desc: '限时尝鲜', trans: { zh: '限时尝鲜', en: 'Limited Time', es: 'Tiempo Limitado' } },
    { key: 'home.newInProgress', page: 'home', desc: '新品研发中', trans: { zh: '新品研发中', en: 'New Products Coming Soon', es: 'Nuevos Productos Pronto' } },
    { key: 'home.newInProgressDesc', page: 'home', desc: '新品研发中描述', trans: { zh: '我们的厨师团队正在精心研制全新美味，每一款都经过反复调试与改良。敬请期待，惊喜即将登场！', en: 'Our chef team is carefully developing new delicious flavors, each经过反复调试与改良。Stay tuned, surprises coming soon!', es: 'Nuestro equipo de chefs está desarrollando nuevos sabores deliciosos. ¡Mantente atento, sorpresas pronto!' } },
    { key: 'home.selectedTea', page: 'home', desc: '精选好茶', trans: { zh: '精选好茶', en: 'Selected Teas', es: 'Tés Seleccionados' } },
    { key: 'home.ourPhilosophy', page: 'home', desc: '我们的理念', trans: { zh: '我们的理念', en: 'Our Philosophy', es: 'Nuestra Filosofía' } },
    { key: 'home.interactive', page: 'home', desc: '互动体验', trans: { zh: '互动体验', en: 'Interactive Experience', es: 'Experiencia Interactiva' } },
    { key: 'home.milkTeaBirth', page: 'home', desc: '一杯奶茶的诞生', trans: { zh: '一杯奶茶的诞生', en: 'Birth of a Milk Tea', es: 'Nacimiento de un Té con Leche' } },
    { key: 'home.milkTeaBirthDesc', page: 'home', desc: '奶茶制作描述', trans: { zh: '点击按钮，亲手体验奶茶制作的每一步', en: 'Click buttons to experience every step of milk tea making', es: 'Haz clic en los botones para experimentar cada paso de la preparación del té con leche' } },
    { key: 'home.deliciousNow', page: 'home', desc: '美味即刻拥有', trans: { zh: '美味即刻拥有', en: 'Delicious Now', es: 'Delicioso Ahora' } },
    { key: 'home.viewFullMenu', page: 'home', desc: '查看完整菜单', trans: { zh: '查看完整菜单 →', en: 'View Full Menu →', es: 'Ver Menú Completo →' } },
    { key: 'home.recommend', page: 'home', desc: '推荐', trans: { zh: '推荐', en: 'Recommend', es: 'Recomendado' } },
    { key: 'home.addToCart', page: 'home', desc: '加入购物车', trans: { zh: '加入购物车', en: 'Add to Cart', es: 'Añadir al Carrito' } },
    { key: 'home.closed', page: 'home', desc: '休息中', trans: { zh: '休息中', en: 'Closed', es: 'Cerrado' } },
    { key: 'home.address', page: 'home', desc: '地址', trans: { zh: '地址', en: 'Address', es: 'Dirección' } },
    { key: 'home.phone', page: 'home', desc: '电话', trans: { zh: '电话', en: 'Phone', es: 'Teléfono' } },
    { key: 'home.welcomeCall', page: 'home', desc: '欢迎来电咨询', trans: { zh: '欢迎来电咨询', en: 'Welcome to Call', es: 'Bienvenido a Llamar' } },
    { key: 'home.businessHours', page: 'home', desc: '营业时间', trans: { zh: '营业时间', en: 'Business Hours', es: 'Horario de Atención' } },
    { key: 'home.openToday', page: 'home', desc: '今日营业', trans: { zh: '今日营业', en: 'Open Today', es: 'Abierto Hoy' } },
    { key: 'home.closedToday', page: 'home', desc: '今日休息', trans: { zh: '今日休息', en: 'Closed Today', es: 'Cerrado Hoy' } },
    { key: 'admin.logout', page: 'admin', desc: '退出', trans: { zh: '退出', en: 'Logout', es: 'Cerrar sesión' } },
    { key: 'cart.addNote', page: 'cart', desc: '加备注', trans: { zh: '加备注', en: 'Add Note', es: 'Añadir nota' } },
    { key: 'cart.addNoteTitle', page: 'cart', desc: '添加备注标题', trans: { zh: '添加备注', en: 'Add Note', es: 'Añadir nota' } },
    { key: 'cart.checkout', page: 'cart', desc: '去结算', trans: { zh: '去结算', en: 'Checkout', es: 'Ir a pagar' } },
    { key: 'cart.clearCart', page: 'cart', desc: '清空购物车', trans: { zh: '清空购物车', en: 'Clear Cart', es: 'Vaciar carrito' } },
    { key: 'cart.clearNote', page: 'cart', desc: '清除备注', trans: { zh: '清除', en: 'Clear', es: 'Limpiar' } },
    { key: 'cart.continueOrdering', page: 'cart', desc: '继续点餐', trans: { zh: '继续点餐', en: 'Continue Ordering', es: 'Seguir ordenando' } },
    { key: 'cart.editNote', page: 'cart', desc: '修改备注', trans: { zh: '修改备注', en: 'Edit Note', es: 'Editar nota' } },
    { key: 'cart.empty', page: 'cart', desc: '购物车为空', trans: { zh: '购物车是空的', en: 'Cart is empty', es: 'El carrito está vacío' } },
    { key: 'cart.feesNote', page: 'cart', desc: '费用说明', trans: { zh: '税费和配送费将在结算时计算', en: 'Tax and delivery fees calculated at checkout', es: 'Impuestos y envío calculados al pagar' } },
    { key: 'cart.goOrder', page: 'cart', desc: '去点餐', trans: { zh: '去点餐', en: 'Order Now', es: 'Ordenar' } },
    { key: 'cart.noteHint', page: 'cart', desc: '备注提示', trans: { zh: '提示：不同备注的同款商品会分开计算，不会合并数量', en: 'Note: same product with different notes will be counted separately', es: 'Nota: el mismo producto con notas diferentes se contará por separado' } },
    { key: 'cart.notePlaceholder', page: 'cart', desc: '备注占位符', trans: { zh: '例如：少冰、半糖、不要香菜...', en: 'e.g., less ice, half sugar, no cilantro...', es: 'p. ej., menos hielo, medio azúcar, sin cilantro...' } },
    { key: 'cart.productLabel', page: 'cart', desc: '商品标签', trans: { zh: '商品', en: 'Product', es: 'Producto' } },
    { key: 'cart.subtotal', page: 'cart', desc: '商品小计', trans: { zh: '商品小计', en: 'Subtotal', es: 'Subtotal' } },
    { key: 'cart.title', page: 'cart', desc: '购物车标题', trans: { zh: '购物车', en: 'Cart', es: 'Carrito' } },
    { key: 'cart.total', page: 'cart', desc: '合计', trans: { zh: '合计', en: 'Total', es: 'Total' } },
    { key: 'checkout.addressLabel', page: 'checkout', desc: '地址标签', trans: { zh: '配送地址 *', en: 'Delivery Address *', es: 'Dirección de entrega *' } },
    { key: 'checkout.addressPlaceholder', page: 'checkout', desc: '地址占位符', trans: { zh: '详细配送地址', en: 'Detailed delivery address', es: 'Dirección detallada' } },
    { key: 'checkout.backHome', page: 'checkout', desc: '返回首页', trans: { zh: '返回首页', en: 'Back to Home', es: 'Volver al inicio' } },
    { key: 'checkout.backToMenu', page: 'checkout', desc: '返回菜单', trans: { zh: '返回菜单', en: 'Back to Menu', es: 'Volver al menú' } },
    { key: 'checkout.closedToast', page: 'checkout', desc: '休息无法下单', trans: { zh: '今日门店休息，无法下单', en: 'Closed today, cannot order', es: 'Cerrado hoy, no se puede ordenar' } },
    { key: 'checkout.closedWarning', page: 'checkout', desc: '门店休息警告', trans: { zh: '今日门店休息，暂不接受下单', en: 'Closed today, no orders accepted', es: 'Cerrado hoy, no se aceptan pedidos' } },
    { key: 'checkout.contactInfo', page: 'checkout', desc: '联系信息', trans: { zh: '联系信息', en: 'Contact Info', es: 'Información de contacto' } },
    { key: 'checkout.delivery', page: 'checkout', desc: '配送', trans: { zh: '配送', en: 'Delivery', es: 'Entrega' } },
    { key: 'checkout.deliveryDesc', page: 'checkout', desc: '配送描述', trans: { zh: '送货上门', en: 'Delivered to your door', es: 'Entrega a domicilio' } },
    { key: 'checkout.deliveryFee', page: 'checkout', desc: '配送费', trans: { zh: '配送费', en: 'Delivery Fee', es: 'Envío' } },
    { key: 'checkout.deliveryRangePrefix', page: 'checkout', desc: '配送范围前缀', trans: { zh: '配送范围', en: 'Delivery within', es: 'Entrega dentro de' } },
    { key: 'checkout.enterAddress', page: 'checkout', desc: '请填配送地址', trans: { zh: '请填写配送地址', en: 'Please enter delivery address', es: 'Por favor ingrese la dirección de entrega' } },
    { key: 'checkout.enterNamePhone', page: 'checkout', desc: '请填姓名电话', trans: { zh: '请填写姓名和电话', en: 'Please enter name and phone', es: 'Por favor ingrese nombre y teléfono' } },
    { key: 'checkout.freeDelivery', page: 'checkout', desc: '免配送费', trans: { zh: '免配送费', en: '', es: '' } },
    { key: 'checkout.freeDeliveryOver', page: 'checkout', desc: '满额前缀', trans: { zh: '满', en: 'Free delivery over', es: 'Envío gratis con pedido superior a' } },
    { key: 'checkout.freeFee', page: 'checkout', desc: '已免', trans: { zh: '已免', en: 'Free', es: 'Gratis' } },
    { key: 'checkout.milesWithin', page: 'checkout', desc: '英里内', trans: { zh: '英里内', en: 'miles', es: 'millas' } },
    { key: 'checkout.nameLabel', page: 'checkout', desc: '姓名标签', trans: { zh: '姓名 *', en: 'Name *', es: 'Nombre *' } },
    { key: 'checkout.namePlaceholder', page: 'checkout', desc: '姓名占位符', trans: { zh: '您的姓名', en: 'Your name', es: 'Su nombre' } },
    { key: 'checkout.noteLabel', page: 'checkout', desc: '订单备注标签', trans: { zh: '订单备注', en: 'Order Notes', es: 'Notas del pedido' } },
    { key: 'checkout.notePlaceholder', page: 'checkout', desc: '订单备注占位符', trans: { zh: '特殊要求，如少辣、不要葱等', en: 'Special requests, e.g., less spicy, no scallions', es: 'Solicitudes especiales, p. ej., menos picante, sin cebollín' } },
    { key: 'checkout.orderDetails', page: 'checkout', desc: '订单明细', trans: { zh: '订单明细', en: 'Order Details', es: 'Detalles del pedido' } },
    { key: 'checkout.orderNo', page: 'checkout', desc: '订单号', trans: { zh: '订单号', en: 'Order No.', es: 'Nº de pedido' } },
    { key: 'checkout.orderSuccess', page: 'checkout', desc: '下单成功标题', trans: { zh: '下单成功', en: 'Order Successful', es: 'Pedido exitoso' } },
    { key: 'checkout.orderSuccessToast', page: 'checkout', desc: '下单成功提示', trans: { zh: '下单成功！', en: 'Order placed successfully!', es: '¡Pedido realizado!' } },
    { key: 'checkout.otherwiseFee', page: 'checkout', desc: '否则配送费', trans: { zh: '否则配送费', en: 'otherwise delivery fee', es: 'de lo contrario, envío de' } },
    { key: 'checkout.phoneLabel', page: 'checkout', desc: '电话标签', trans: { zh: '电话 *', en: 'Phone *', es: 'Teléfono *' } },
    { key: 'checkout.phonePlaceholder', page: 'checkout', desc: '电话占位符', trans: { zh: '联系电话', en: 'Contact phone', es: 'Teléfono de contacto' } },
    { key: 'checkout.pickupMethod', page: 'checkout', desc: '取餐方式', trans: { zh: '取餐方式', en: 'Pickup Method', es: 'Método de recogida' } },
    { key: 'checkout.pickupNote', page: 'checkout', desc: '取餐提示', trans: { zh: '请到店出示订单号取餐 / 等待配送', en: 'Please show order number for pickup / wait for delivery', es: 'Muestre el número de pedido para recoger / espere la entrega' } },
    { key: 'checkout.submit', page: 'checkout', desc: '提交订单', trans: { zh: '提交订单', en: 'Submit Order', es: 'Enviar pedido' } },
    { key: 'checkout.submitting', page: 'checkout', desc: '提交中', trans: { zh: '提交中...', en: 'Submitting...', es: 'Enviando...' } },
    { key: 'checkout.subtotal', page: 'checkout', desc: '商品小计', trans: { zh: '商品小计', en: 'Subtotal', es: 'Subtotal' } },
    { key: 'checkout.takeout', page: 'checkout', desc: '自取', trans: { zh: '自取', en: 'Pickup', es: 'Recoger' } },
    { key: 'checkout.takeoutDesc', page: 'checkout', desc: '自取描述', trans: { zh: '到店取餐', en: 'Pick up in store', es: 'Recoger en tienda' } },
    { key: 'checkout.tax', page: 'checkout', desc: '税费', trans: { zh: '税费', en: 'Tax', es: 'Impuestos' } },
    { key: 'checkout.total', page: 'checkout', desc: '合计', trans: { zh: '合计', en: 'Total', es: 'Total' } },
    { key: 'checkout.viewOrderStatus', page: 'checkout', desc: '查看订单状态', trans: { zh: '查看订单状态', en: 'View Order Status', es: 'Ver estado del pedido' } },
    { key: 'common.addSuccess', page: 'common', desc: '添加成功提示', trans: { zh: '添加成功', en: 'Added successfully', es: 'Agregado correctamente' } },
    { key: 'common.address', page: 'common', desc: '配送地址', trans: { zh: '配送地址', en: 'Delivery Address', es: 'Dirección de entrega' } },
    { key: 'common.all', page: 'common', desc: '全部', trans: { zh: '全部', en: 'All', es: 'Todos' } },
    { key: 'common.customer', page: 'common', desc: '顾客', trans: { zh: '顾客', en: 'Customer', es: 'Cliente' } },
    { key: 'common.deliveryFee', page: 'common', desc: '配送费', trans: { zh: '配送费', en: 'Delivery Fee', es: 'Tarifa de entrega' } },
    { key: 'common.disable', page: 'common', desc: '禁用按钮', trans: { zh: '禁用', en: 'Disable', es: 'Desactivar' } },
    { key: 'common.disabled', page: 'common', desc: '停用状态', trans: { zh: '停用', en: 'Disabled', es: 'Inactivo' } },
    { key: 'common.enable', page: 'common', desc: '启用按钮', trans: { zh: '启用', en: 'Enable', es: 'Activar' } },
    { key: 'common.enabled', page: 'common', desc: '启用状态', trans: { zh: '启用', en: 'Enabled', es: 'Activo' } },
    { key: 'common.fillAll', page: 'common', desc: '请填写完整', trans: { zh: '请填写完整', en: 'Please fill in all fields', es: 'Por favor complete todos los campos' } },
    { key: 'common.itemsUnit', page: 'common', desc: '件数单位', trans: { zh: '件', en: 'items', es: 'artículos' } },
    { key: 'common.jump', page: 'common', desc: '跳转链接文字', trans: { zh: '跳转', en: 'Go', es: 'Ir' } },
    { key: 'common.nextPage', page: 'common', desc: '下一页按钮', trans: { zh: '下一页', en: 'Next', es: 'Siguiente' } },
    { key: 'common.noData', page: 'common', desc: '暂无数据', trans: { zh: '暂无数据', en: 'No Data', es: 'Sin Datos' } },
    { key: 'common.notes', page: 'common', desc: '备注', trans: { zh: '备注', en: 'Notes', es: 'Notas' } },
    { key: 'common.other', page: 'common', desc: '其他', trans: { zh: '其他', en: 'Other', es: 'Otro' } },
    { key: 'common.pageLabel', page: 'common', desc: '第（页码前缀）', trans: { zh: '第', en: 'Page', es: 'Página' } },
    { key: 'common.pageUnit', page: 'common', desc: '页（页码单位）', trans: { zh: '页', en: '', es: '' } },
    { key: 'common.phone', page: 'common', desc: '电话', trans: { zh: '电话', en: 'Phone', es: 'Teléfono' } },
    { key: 'common.prevPage', page: 'common', desc: '上一页按钮', trans: { zh: '上一页', en: 'Previous', es: 'Anterior' } },
    { key: 'common.records', page: 'common', desc: '条（记录单位）', trans: { zh: '条', en: 'records', es: 'registros' } },
    { key: 'common.revenue', page: 'common', desc: '营收', trans: { zh: '营收', en: 'Revenue', es: 'Ingresos' } },
    { key: 'common.selectAll', page: 'common', desc: '全选', trans: { zh: '全选', en: 'Select All', es: 'Seleccionar Todo' } },
    { key: 'common.statusUpdated', page: 'common', desc: '状态已更新提示', trans: { zh: '状态已更新', en: 'Status updated', es: 'Estado actualizado' } },
    { key: 'common.subtotal', page: 'common', desc: '小计', trans: { zh: '小计', en: 'Subtotal', es: 'Subtotal' } },
    { key: 'common.tax', page: 'common', desc: '税费', trans: { zh: '税费', en: 'Tax', es: 'Impuesto' } },
    { key: 'common.today', page: 'common', desc: '今日', trans: { zh: '今日', en: 'Today', es: 'Hoy' } },
    { key: 'common.total', page: 'common', desc: '合计', trans: { zh: '合计', en: 'Total', es: 'Total' } },
    { key: 'common.totalLabel', page: 'common', desc: '共（总数前缀）', trans: { zh: '共', en: 'Total', es: 'Total' } },
    { key: 'common.type', page: 'common', desc: '类型', trans: { zh: '类型', en: 'Type', es: 'Tipo' } },
    { key: 'dining.delivery', page: 'common', desc: '配送', trans: { zh: '配送', en: 'Delivery', es: 'Entrega a domicilio' } },
    { key: 'dining.dinein', page: 'common', desc: '堂吃', trans: { zh: '堂吃', en: 'Dine-in', es: 'Comer en sitio' } },
    { key: 'dining.takeout', page: 'common', desc: '自取', trans: { zh: '自取', en: 'Takeout', es: 'Para llevar' } },
    { key: 'unit.items', page: 'common', desc: '项', trans: { zh: '项', en: 'items', es: 'ítems' } },
    { key: 'unit.orders', page: 'common', desc: '单', trans: { zh: '单', en: 'orders', es: 'pedidos' } },
    { key: 'confirm.title', page: 'confirm', desc: '确认对话框默认标题', trans: { zh: '确认操作', en: 'Confirm Action', es: 'Confirmar acción' } },
    { key: 'content.aboutEn', page: 'content', desc: '关于我们英文', trans: { zh: 'About Us (English)', en: 'About Us (English)', es: 'Sobre nosotros (Inglés)' } },
    { key: 'content.aboutZh', page: 'content', desc: '关于我们中文', trans: { zh: '关于我们（中文）', en: 'About Us (Chinese)', es: 'Sobre nosotros (Chino)' } },
    { key: 'content.addCarousel', page: 'content', desc: '添加轮播', trans: { zh: '添加轮播', en: 'Add Carousel', es: 'Agregar carrusel' } },
    { key: 'content.addNewProduct', page: 'content', desc: '添加新品', trans: { zh: '添加新品', en: 'Add New Product', es: 'Agregar nuevo producto' } },
    { key: 'content.addSection', page: 'content', desc: '添加板块', trans: { zh: '添加板块', en: 'Add Section', es: 'Agregar sección' } },
    { key: 'content.addTea', page: 'content', desc: '添加茶品', trans: { zh: '添加茶品', en: 'Add Tea', es: 'Agregar té' } },
    { key: 'content.added', page: 'content', desc: '添加成功', trans: { zh: '添加成功', en: 'Added successfully', es: 'Agregado correctamente' } },
    { key: 'content.brandStoryEn', page: 'content', desc: '品牌故事英文', trans: { zh: 'Brand Story (English)', en: 'Brand Story (English)', es: 'Historia de la marca (Inglés)' } },
    { key: 'content.brandStoryZh', page: 'content', desc: '品牌故事中文', trans: { zh: '品牌故事（中文）', en: 'Brand Story (Chinese)', es: 'Historia de la marca (Chino)' } },
    { key: 'content.confirmDeleteMsg', page: 'content', desc: '确定删除', trans: { zh: '确定删除？', en: 'Are you sure?', es: '¿Está seguro?' } },
    { key: 'content.confirmDeleteNewMsg', page: 'content', desc: '确定删除新品', trans: { zh: '确定删除该新品？', en: 'Are you sure you want to delete this new product?', es: '¿Está seguro de eliminar este nuevo producto?' } },
    { key: 'content.confirmDeleteNewTitle', page: 'content', desc: '删除新品', trans: { zh: '删除新品', en: 'Delete New Product', es: 'Eliminar nuevo producto' } },
    { key: 'content.confirmDeleteSectionMsg', page: 'content', desc: '确定删除板块', trans: { zh: '确定删除该板块？', en: 'Are you sure you want to delete this section?', es: '¿Está seguro de eliminar esta sección?' } },
    { key: 'content.confirmDeleteSectionTitle', page: 'content', desc: '删除板块', trans: { zh: '删除板块', en: 'Delete Section', es: 'Eliminar sección' } },
    { key: 'content.confirmDeleteTitle', page: 'content', desc: '删除确认', trans: { zh: '删除确认', en: 'Confirm Delete', es: 'Confirmar eliminación' } },
    { key: 'content.contentCol', page: 'content', desc: '内容列', trans: { zh: '内容', en: 'Content', es: 'Contenido' } },
    { key: 'content.craftHint', page: 'content', desc: '工艺提示', trans: { zh: '四点介绍：原叶现萃、鲜果鲜做、甜度可控、现点现做', en: 'Four key points: Fresh leaf extraction, fresh fruit, adjustable sweetness, made to order', es: 'Cuatro puntos clave: extracción de hoja fresca, fruta fresca, dulzor ajustable, hecho al momento' } },
    { key: 'content.craftName', page: 'content', desc: '工艺名称', trans: { zh: '名称', en: 'Name', es: 'Nombre' } },
    { key: 'content.deleted', page: 'content', desc: '已删除', trans: { zh: '已删除', en: 'Deleted', es: 'Eliminado' } },
    { key: 'content.desc', page: 'content', desc: '内容管理说明', trans: { zh: '管理前台页面的轮播图、品牌故事、茶品溯源等内容，中英双语', en: 'Manage frontend content: carousel, brand story, tea sourcing, etc. Bilingual Chinese/English.', es: 'Gestionar contenido del frontend: carrusel, historia de marca, origen del té, etc. Bilingüe chino/inglés.' } },
    { key: 'content.descCol', page: 'content', desc: '描述列', trans: { zh: '描述', en: 'Description', es: 'Descripción' } },
    { key: 'content.descEnLabel', page: 'content', desc: '英文描述', trans: { zh: '英文描述', en: 'English Description', es: 'Descripción en inglés' } },
    { key: 'content.descLabel', page: 'content', desc: '描述', trans: { zh: '描述', en: 'Description', es: 'Descripción' } },
    { key: 'content.editCarousel', page: 'content', desc: '编辑轮播', trans: { zh: '编辑轮播', en: 'Edit Carousel', es: 'Editar carrusel' } },
    { key: 'content.editNewProduct', page: 'content', desc: '编辑新品', trans: { zh: '编辑新品', en: 'Edit New Product', es: 'Editar nuevo producto' } },
    { key: 'content.editSection', page: 'content', desc: '编辑板块', trans: { zh: '编辑板块', en: 'Edit Section', es: 'Editar sección' } },
    { key: 'content.frontDisplay', page: 'content', desc: '前台显示', trans: { zh: '前台显示', en: 'Show on frontend', es: 'Mostrar en el frontend' } },
    { key: 'content.hide', page: 'content', desc: '隐藏', trans: { zh: '隐藏', en: 'Hide', es: 'Ocultar' } },
    { key: 'content.iconImg', page: 'content', desc: '图标图片', trans: { zh: '图标图片', en: 'Icon Image', es: 'Imagen de ícono' } },
    { key: 'content.iconLabel', page: 'content', desc: '图标', trans: { zh: '图标 (emoji)', en: 'Icon (emoji)', es: 'Ícono (emoji)' } },
    { key: 'content.imgCol', page: 'content', desc: '图片列', trans: { zh: '图片', en: 'Image', es: 'Imagen' } },
    { key: 'content.imgLabel', page: 'content', desc: '图片', trans: { zh: '图片', en: 'Image', es: 'Imagen' } },
    { key: 'content.imgOrUpload', page: 'content', desc: '图片或上传', trans: { zh: 'https://... 或点击上传', en: 'https://... or click to upload', es: 'https://... o haga clic para subir' } },
    { key: 'content.imgPosition', page: 'content', desc: '图片位置', trans: { zh: '图片位置', en: 'Image Position', es: 'Posición de la imagen' } },
    { key: 'content.imgTooLarge', page: 'content', desc: '图片过大', trans: { zh: '图片不能超过 10MB', en: 'Image cannot exceed 10MB', es: 'La imagen no puede exceder 10MB' } },
    { key: 'content.imgUploaded', page: 'content', desc: '图片上传成功', trans: { zh: '图片上传成功', en: 'Image uploaded successfully', es: 'Imagen subida correctamente' } },
    { key: 'content.imgUrlLabel', page: 'content', desc: '图片URL', trans: { zh: '图片 URL', en: 'Image URL', es: 'URL de imagen' } },
    { key: 'content.layoutCol', page: 'content', desc: '布局列', trans: { zh: '布局', en: 'Layout', es: 'Diseño' } },
    { key: 'content.leftImgRightText', page: 'content', desc: '左图右文', trans: { zh: '左图右文', en: 'Left image, right text', es: 'Imagen izquierda, texto derecho' } },
    { key: 'content.linkCol', page: 'content', desc: '链接列', trans: { zh: '链接', en: 'Link', es: 'Enlace' } },
    { key: 'content.linkLabel', page: 'content', desc: '跳转链接', trans: { zh: '跳转链接', en: 'Redirect Link', es: 'Enlace de redirección' } },
    { key: 'content.nameCol', page: 'content', desc: '名称列', trans: { zh: '名称', en: 'Name', es: 'Nombre' } },
    { key: 'content.nameEnLabel', page: 'content', desc: '英文名', trans: { zh: '英文名', en: 'English Name', es: 'Nombre en inglés' } },
    { key: 'content.nameLabel', page: 'content', desc: '名称', trans: { zh: '名称', en: 'Name', es: 'Nombre' } },
    { key: 'content.newHint', page: 'content', desc: '新品提示', trans: { zh: '前台首页品牌故事上方展示，无新品时显示"新品研发中"', en: 'Shown above brand story on homepage. Shows "New products in development" when empty.', es: 'Se muestra sobre la historia de marca en la página de inicio. Muestra "Nuevos productos en desarrollo" cuando está vacío.' } },
    { key: 'content.newProductDescEn', page: 'content', desc: '新品描述英文', trans: { zh: '描述（英文）', en: 'Description (English)', es: 'Descripción (Inglés)' } },
    { key: 'content.newProductDescPlaceholder', page: 'content', desc: '新品描述占位符', trans: { zh: '新品的详细介绍', en: 'Detailed new product description', es: 'Descripción detallada del nuevo producto' } },
    { key: 'content.newProductDescZh', page: 'content', desc: '新品描述中文', trans: { zh: '描述（中文）', en: 'Description (Chinese)', es: 'Descripción (Chino)' } },
    { key: 'content.newProductNameEn', page: 'content', desc: '新品名称英文', trans: { zh: '名称（英文）', en: 'Name (English)', es: 'Nombre (Inglés)' } },
    { key: 'content.newProductNamePlaceholder', page: 'content', desc: '新品名称占位符', trans: { zh: '如：西瓜冰沙柠檬茶', en: 'e.g., Watermelon Slush Lemon Tea', es: 'Ej.: Té helado de sandía con limón' } },
    { key: 'content.newProductNameRequired', page: 'content', desc: '新品名称必填', trans: { zh: '请填写新品名称', en: 'New product name is required', es: 'El nombre del nuevo producto es obligatorio' } },
    { key: 'content.newProductNameZh', page: 'content', desc: '新品名称中文', trans: { zh: '名称（中文）*', en: 'Name (Chinese) *', es: 'Nombre (Chino) *' } },
    { key: 'content.noImg', page: 'content', desc: '无图', trans: { zh: '无图', en: 'No image', es: 'Sin imagen' } },
    { key: 'content.optional', page: 'content', desc: '可选', trans: { zh: '可选', en: 'Optional', es: 'Opcional' } },
    { key: 'content.preview', page: 'content', desc: '预览', trans: { zh: '预览', en: 'Preview', es: 'Vista previa' } },
    { key: 'content.previewCol', page: 'content', desc: '预览列', trans: { zh: '预览', en: 'Preview', es: 'Vista previa' } },
    { key: 'content.rightImgLeftText', page: 'content', desc: '右图左文', trans: { zh: '右图左文', en: 'Right image, left text', es: 'Imagen derecha, texto izquierdo' } },
    { key: 'content.saved', page: 'content', desc: '保存成功', trans: { zh: '保存成功', en: 'Saved successfully', es: 'Guardado correctamente' } },
    { key: 'content.sectionContentEn', page: 'content', desc: '板块内容英文', trans: { zh: '内容（英文）', en: 'Content (English)', es: 'Contenido (Inglés)' } },
    { key: 'content.sectionContentPlaceholder', page: 'content', desc: '板块内容占位符', trans: { zh: '板块的详细内容', en: 'Detailed section content', es: 'Contenido detallado de la sección' } },
    { key: 'content.sectionContentZh', page: 'content', desc: '板块内容中文', trans: { zh: '内容（中文）', en: 'Content (Chinese)', es: 'Contenido (Chino)' } },
    { key: 'content.sectionHint', page: 'content', desc: '板块提示', trans: { zh: '添加额外的内容板块，会显示在前台首页菜单上方', en: 'Add extra content sections that appear above the menu on the homepage', es: 'Agregue secciones de contenido adicionales que aparecen sobre el menú en la página de inicio' } },
    { key: 'content.sectionTitleEn', page: 'content', desc: '板块标题英文', trans: { zh: '标题（英文）', en: 'Title (English)', es: 'Título (Inglés)' } },
    { key: 'content.sectionTitlePlaceholder', page: 'content', desc: '板块标题占位符', trans: { zh: '如：营业时间', en: 'e.g., Business Hours', es: 'Ej.: Horario de atención' } },
    { key: 'content.sectionTitleRequired', page: 'content', desc: '板块标题必填', trans: { zh: '请填写板块标题', en: 'Section title is required', es: 'El título de la sección es obligatorio' } },
    { key: 'content.sectionTitleZh', page: 'content', desc: '板块标题中文', trans: { zh: '标题（中文）*', en: 'Title (Chinese) *', es: 'Título (Chino) *' } },
    { key: 'content.selectImg', page: 'content', desc: '选择图片', trans: { zh: '选择图片', en: 'Select Image', es: 'Seleccionar imagen' } },
    { key: 'content.show', page: 'content', desc: '显示', trans: { zh: '显示', en: 'Show', es: 'Mostrar' } },
    { key: 'content.sortCol', page: 'content', desc: '排序列', trans: { zh: '排序', en: 'Sort', es: 'Orden' } },
    { key: 'content.tabAbout', page: 'content', desc: '关于区块', trans: { zh: '关于区块', en: 'About Section', es: 'Sección sobre nosotros' } },
    { key: 'content.tabBrand', page: 'content', desc: '品牌故事', trans: { zh: '品牌故事', en: 'Brand Story', es: 'Historia de la marca' } },
    { key: 'content.tabCarousel', page: 'content', desc: '轮播图', trans: { zh: '轮播图', en: 'Carousel', es: 'Carrusel' } },
    { key: 'content.tabCraft', page: 'content', desc: '奶茶工艺', trans: { zh: '奶茶工艺', en: 'Tea Craft', es: 'Arte del té' } },
    { key: 'content.tabNew', page: 'content', desc: '新品上市', trans: { zh: '新品上市', en: 'New Arrivals', es: 'Novedades' } },
    { key: 'content.tabSections', page: 'content', desc: '自定义板块', trans: { zh: '自定义板块', en: 'Custom Sections', es: 'Secciones personalizadas' } },
    { key: 'content.tabTea', page: 'content', desc: '茶品溯源', trans: { zh: '茶品溯源', en: 'Tea Sourcing', es: 'Origen del té' } },
    { key: 'content.teaHint', page: 'content', desc: '茶品提示', trans: { zh: '前台自动三栏排列，可添加任意数量茶品', en: 'Automatically arranged in 3 columns on frontend. Add any number of teas.', es: 'Se organiza automáticamente en 3 columnas en el frontend. Agregue cualquier cantidad de tés.' } },
    { key: 'content.titleCol', page: 'content', desc: '标题列', trans: { zh: '标题', en: 'Title', es: 'Título' } },
    { key: 'content.titleLabel', page: 'content', desc: '标题', trans: { zh: '标题', en: 'Title', es: 'Título' } },
    { key: 'content.updated', page: 'content', desc: '更新成功', trans: { zh: '更新成功', en: 'Updated successfully', es: 'Actualizado correctamente' } },
    { key: 'content.upload', page: 'content', desc: '上传', trans: { zh: '上传', en: 'Upload', es: 'Subir' } },
    { key: 'content.uploadHint', page: 'content', desc: '上传提示', trans: { zh: '点击"选择图片"从电脑上传，或手动填写网络图片地址', en: 'Click "Select Image" to upload from computer, or enter an image URL manually', es: 'Haga clic en "Seleccionar imagen" para subir desde la computadora, o ingrese una URL de imagen manualmente' } },
    { key: 'content.uploading', page: 'content', desc: '上传中', trans: { zh: '上传中...', en: 'Uploading...', es: 'Subiendo...' } },
    { key: 'coupons.allStatus', page: 'coupons', desc: '全部状态', trans: { zh: '全部状态', en: 'All statuses', es: 'Todos los estados' } },
    { key: 'coupons.claimed', page: 'coupons', desc: '已领取', trans: { zh: '已领取', en: 'Claimed', es: 'Reclamados' } },
    { key: 'coupons.claimedColon', page: 'coupons', desc: '已领取冒号', trans: { zh: '已领取：', en: 'Claimed: ', es: 'Reclamados: ' } },
    { key: 'coupons.colCoupon', page: 'coupons', desc: '优惠券列', trans: { zh: '优惠券', en: 'Coupon', es: 'Cupón' } },
    { key: 'coupons.createBtn', page: 'coupons', desc: '创建优惠券按钮', trans: { zh: '+ 创建优惠券', en: '+ Create coupon', es: '+ Crear cupón' } },
    { key: 'coupons.createTitle', page: 'coupons', desc: '创建优惠券', trans: { zh: '创建优惠券', en: 'Create coupon', es: 'Crear cupón' } },
    { key: 'coupons.created', page: 'coupons', desc: '优惠券创建成功', trans: { zh: '优惠券创建成功', en: 'Coupon created', es: 'Cupón creado' } },
    { key: 'coupons.createdTime', page: 'coupons', desc: '创建时间冒号', trans: { zh: '创建时间：', en: 'Created: ', es: 'Creado: ' } },
    { key: 'coupons.deleteMsgPrefix', page: 'coupons', desc: '删除优惠券前缀', trans: { zh: '确定删除优惠券“', en: 'Delete coupon "', es: 'Eliminar cupón "' } },
    { key: 'coupons.deleteMsgSuffix', page: 'coupons', desc: '删除优惠券后缀', trans: { zh: '”吗？', en: '"?', es: '"?' } },
    { key: 'coupons.deleteTitle', page: 'coupons', desc: '删除优惠券', trans: { zh: '删除优惠券', en: 'Delete coupon', es: 'Eliminar cupón' } },
    { key: 'coupons.deleted', page: 'coupons', desc: '优惠券已删除', trans: { zh: '优惠券已删除', en: 'Coupon deleted', es: 'Cupón eliminado' } },
    { key: 'coupons.detail', page: 'coupons', desc: '详情', trans: { zh: '详情', en: 'Detail', es: 'Detalle' } },
    { key: 'coupons.detailTitle', page: 'coupons', desc: '优惠券详情', trans: { zh: '优惠券详情', en: 'Coupon detail', es: 'Detalle del cupón' } },
    { key: 'coupons.discountAmountLabel', page: 'coupons', desc: '减免金额标签', trans: { zh: '减免金额 ($) *', en: 'Discount amount ($) *', es: 'Importe de descuento ($) *' } },
    { key: 'coupons.editTitle', page: 'coupons', desc: '编辑优惠券', trans: { zh: '编辑优惠券', en: 'Edit coupon', es: 'Editar cupón' } },
    { key: 'coupons.endDate', page: 'coupons', desc: '结束日期', trans: { zh: '结束日期', en: 'End date', es: 'Fecha de fin' } },
    { key: 'coupons.expired', page: 'coupons', desc: '已过期', trans: { zh: '已过期', en: 'Expired', es: 'Caducados' } },
    { key: 'coupons.faceValue', page: 'coupons', desc: '面值', trans: { zh: '面值', en: 'Value', es: 'Valor' } },
    { key: 'coupons.maxDiscountLabel', page: 'coupons', desc: '最高优惠标签', trans: { zh: '最高优惠 ($)', en: 'Max discount ($)', es: 'Descuento máximo ($)' } },
    { key: 'coupons.maxDiscountPh', page: 'coupons', desc: '最高优惠占位', trans: { zh: '折扣券可选', en: 'Optional for percentage', es: 'Opcional para porcentaje' } },
    { key: 'coupons.minSpendLabel', page: 'coupons', desc: '最低消费标签', trans: { zh: '最低消费 ($)', en: 'Min. spend ($)', es: 'Consumo mínimo ($)' } },
    { key: 'coupons.minSpendPrefix', page: 'coupons', desc: '最低消费前缀', trans: { zh: '最低消费', en: 'Min. spend', es: 'Consumo mínimo' } },
    { key: 'coupons.nameLabel', page: 'coupons', desc: '优惠券名称标签', trans: { zh: '优惠券名称 *', en: 'Coupon name *', es: 'Nombre del cupón *' } },
    { key: 'coupons.namePh', page: 'coupons', desc: '优惠券名称占位', trans: { zh: '如：新客立减5元', en: 'e.g. New customer $5 off', es: 'p. ej. Nuevo cliente $5 de descuento' } },
    { key: 'coupons.noCoupons', page: 'coupons', desc: '暂无优惠券', trans: { zh: '暂无优惠券，点击右上角创建', en: 'No coupons, click top right to create', es: 'Sin cupones, haga clic arriba a la derecha' } },
    { key: 'coupons.offShelf', page: 'coupons', desc: '已下架', trans: { zh: '已下架', en: 'Off shelf', es: 'Desactivado' } },
    { key: 'coupons.offShelfBtn', page: 'coupons', desc: '下架按钮', trans: { zh: '下架', en: 'Off shelf', es: 'Desactivar' } },
    { key: 'coupons.onShelf', page: 'coupons', desc: '已上架', trans: { zh: '已上架', en: 'On shelf', es: 'Activado' } },
    { key: 'coupons.onShelfBtn', page: 'coupons', desc: '上架按钮', trans: { zh: '上架', en: 'On shelf', es: 'Activar' } },
    { key: 'coupons.pageSuffix', page: 'coupons', desc: '分页页', trans: { zh: '页', en: '', es: '' } },
    { key: 'coupons.percentLabel', page: 'coupons', desc: '折扣标签', trans: { zh: '折扣 (%) *', en: 'Discount (%) *', es: 'Descuento (%) *' } },
    { key: 'coupons.permanent', page: 'coupons', desc: '永久', trans: { zh: '永久', en: 'Permanent', es: 'Permanente' } },
    { key: 'coupons.required', page: 'coupons', desc: '名称类型面值必填', trans: { zh: '名称、类型、面值必填', en: 'Name, type and value are required', es: 'Nombre, tipo y valor obligatorios' } },
    { key: 'coupons.sort', page: 'coupons', desc: '排序', trans: { zh: '排序', en: 'Sort', es: 'Ordenar' } },
    { key: 'coupons.startDate', page: 'coupons', desc: '开始日期', trans: { zh: '开始日期', en: 'Start date', es: 'Fecha de inicio' } },
    { key: 'coupons.statusColon', page: 'coupons', desc: '状态冒号', trans: { zh: '状态：', en: 'Status: ', es: 'Estado: ' } },
    { key: 'coupons.stockColon', page: 'coupons', desc: '库存冒号', trans: { zh: '库存：', en: 'Stock: ', es: 'Stock: ' } },
    { key: 'coupons.stockLabel', page: 'coupons', desc: '发放数量标签', trans: { zh: '发放数量（空=不限）', en: 'Stock (empty=unlimited)', es: 'Cantidad (vacío=ilimitado)' } },
    { key: 'coupons.subtitle', page: 'coupons', desc: '优惠券副标题', trans: { zh: '创建和管理优惠券，支持满减券和折扣券', en: 'Create and manage fixed and percentage coupons', es: 'Crear y gestionar cupones fijos y porcentuales' } },
    { key: 'coupons.title', page: 'coupons', desc: '优惠券管理', trans: { zh: '🎟️ 优惠券管理', en: '🎟️ Coupon management', es: '🎟️ Gestión de cupones' } },
    { key: 'coupons.totalCoupons', page: 'coupons', desc: '优惠券总数', trans: { zh: '优惠券总数', en: 'Total coupons', es: 'Total de cupones' } },
    { key: 'coupons.totalMiddle', page: 'coupons', desc: '分页条第', trans: { zh: '条，第', en: 'items, page', es: 'ítems, página' } },
    { key: 'coupons.totalPrefix', page: 'coupons', desc: '分页共', trans: { zh: '共', en: 'Total', es: 'Total' } },
    { key: 'coupons.typeColon', page: 'coupons', desc: '类型冒号', trans: { zh: '类型：', en: 'Type: ', es: 'Tipo: ' } },
    { key: 'coupons.typeFixed', page: 'coupons', desc: '满减券', trans: { zh: '满减券', en: 'Fixed discount', es: 'Descuento fijo' } },
    { key: 'coupons.typeFixedFull', page: 'coupons', desc: '满减券完整', trans: { zh: '满减券（固定金额）', en: 'Fixed discount (fixed amount)', es: 'Descuento fijo (cantidad fija)' } },
    { key: 'coupons.typeLabel', page: 'coupons', desc: '类型标签', trans: { zh: '类型 *', en: 'Type *', es: 'Tipo *' } },
    { key: 'coupons.typePercent', page: 'coupons', desc: '折扣券', trans: { zh: '折扣券', en: 'Percentage discount', es: 'Porcentaje' } },
    { key: 'coupons.typePercentFull', page: 'coupons', desc: '折扣券完整', trans: { zh: '折扣券（百分比）', en: 'Percentage discount (percent)', es: 'Descuento porcentual (%)' } },
    { key: 'coupons.unlimited', page: 'coupons', desc: '不限', trans: { zh: '不限', en: 'Unlimited', es: 'Ilimitado' } },
    { key: 'coupons.updated', page: 'coupons', desc: '优惠券已更新', trans: { zh: '优惠券已更新', en: 'Coupon updated', es: 'Cupón actualizado' } },
    { key: 'coupons.used', page: 'coupons', desc: '已使用', trans: { zh: '已使用', en: 'Used', es: 'Usados' } },
    { key: 'coupons.usedColon', page: 'coupons', desc: '已使用冒号', trans: { zh: '已使用：', en: 'Used: ', es: 'Usados: ' } },
    { key: 'coupons.validAfterPrefix', page: 'coupons', desc: '领取后前缀', trans: { zh: '领取后', en: 'after claim ', es: 'tras reclamar ' } },
    { key: 'coupons.validAfterSuffix', page: 'coupons', desc: '天', trans: { zh: '天', en: 'days', es: 'días' } },
    { key: 'coupons.validDaysLabel', page: 'coupons', desc: '有效天数标签', trans: { zh: '领取后有效天数', en: 'Valid days after claim', es: 'Días de validez tras reclamar' } },
    { key: 'coupons.validDaysPh', page: 'coupons', desc: '有效天数占位', trans: { zh: '如：7', en: 'e.g. 7', es: 'p. ej. 7' } },
    { key: 'coupons.validPeriod', page: 'coupons', desc: '有效期', trans: { zh: '有效期', en: 'Valid period', es: 'Validez' } },
    { key: 'coupons.validPeriodColon', page: 'coupons', desc: '有效期冒号', trans: { zh: '有效期：', en: 'Valid: ', es: 'Validez: ' } },
    { key: 'dashboard.addMemo', page: 'dashboard', desc: '添加备忘对话框标题', trans: { zh: '添加备忘 / 重点事项', en: 'Add Memo / Priority', es: 'Agregar Nota / Prioridad' } },
    { key: 'dashboard.allOrders', page: 'dashboard', desc: '全部订单链接', trans: { zh: '全部订单 →', en: 'All Orders →', es: 'Todos los pedidos →' } },
    { key: 'dashboard.andMore', page: 'dashboard', desc: '等（更多项前缀）', trans: { zh: '等', en: 'and', es: 'y' } },
    { key: 'dashboard.clickViewStats', page: 'dashboard', desc: '查看统计链接', trans: { zh: '点击查看完整统计 →', en: 'Click for full stats →', es: 'Ver estadísticas completas →' } },
    { key: 'dashboard.confirmPickup', page: 'dashboard', desc: '确认取餐按钮', trans: { zh: '确认取餐', en: 'Confirm Pickup', es: 'Confirmar Recogida' } },
    { key: 'dashboard.enterTitle', page: 'dashboard', desc: '请输入标题错误', trans: { zh: '请输入标题', en: 'Please enter a title', es: 'Por favor ingrese un título' } },
    { key: 'dashboard.highPriority', page: 'dashboard', desc: '高优标签', trans: { zh: '高优', en: 'High', es: 'Alta' } },
    { key: 'dashboard.important', page: 'dashboard', desc: '重点标签', trans: { zh: '重点', en: 'Important', es: 'Importante' } },
    { key: 'dashboard.manage', page: 'dashboard', desc: '管理按钮', trans: { zh: '管理', en: 'Manage', es: 'Gestionar' } },
    { key: 'dashboard.memo', page: 'dashboard', desc: '备忘标签', trans: { zh: '备忘', en: 'Memo', es: 'Nota' } },
    { key: 'dashboard.memoContent', page: 'dashboard', desc: '备忘内容标签', trans: { zh: '内容', en: 'Content', es: 'Contenido' } },
    { key: 'dashboard.memoContentPlaceholder', page: 'dashboard', desc: '备忘内容占位符', trans: { zh: '详细内容（可选）', en: 'Details (optional)', es: 'Detalles (opcional)' } },
    { key: 'dashboard.memoPriority', page: 'dashboard', desc: '优先级标签', trans: { zh: '优先级', en: 'Priority', es: 'Prioridad' } },
    { key: 'dashboard.memoTitle', page: 'dashboard', desc: '备忘标题标签', trans: { zh: '标题 *', en: 'Title *', es: 'Título *' } },
    { key: 'dashboard.memoTitlePlaceholder', page: 'dashboard', desc: '备忘标题占位符', trans: { zh: '备忘标题', en: 'Memo title', es: 'Título de la nota' } },
    { key: 'dashboard.memoType', page: 'dashboard', desc: '备忘类型标签', trans: { zh: '类型', en: 'Type', es: 'Tipo' } },
    { key: 'dashboard.memoTypeImportant', page: 'dashboard', desc: '重点事项类型选项', trans: { zh: '重点事项', en: 'Priority', es: 'Prioridad' } },
    { key: 'dashboard.memoTypeMemo', page: 'dashboard', desc: '备忘录类型选项', trans: { zh: '备忘录', en: 'Memo', es: 'Nota' } },
    { key: 'dashboard.memos', page: 'dashboard', desc: '备忘录区块标题', trans: { zh: '备忘录 / 重点事项', en: 'Memos / Priorities', es: 'Notas / Prioridades' } },
    { key: 'dashboard.newOrderPrefix', page: 'dashboard', desc: '新订单通知前缀', trans: { zh: '🔔 有新订单！当前', en: '🔔 New order! Currently', es: '🔔 ¡Nuevo pedido! Actualmente' } },
    { key: 'dashboard.newOrderSuffix', page: 'dashboard', desc: '新订单通知后缀', trans: { zh: '个待处理', en: 'pending', es: 'pendientes' } },
    { key: 'dashboard.noMemos', page: 'dashboard', desc: '无备忘提示', trans: { zh: '暂无备忘', en: 'No memos yet', es: 'Sin notas' } },
    { key: 'dashboard.noPendingOrders', page: 'dashboard', desc: '无待处理订单提示', trans: { zh: '今日暂无待处理订单', en: 'No pending orders today', es: 'Sin pedidos pendientes hoy' } },
    { key: 'dashboard.noPhone', page: 'dashboard', desc: '无电话提示', trans: { zh: '无电话', en: 'No phone', es: 'Sin teléfono' } },
    { key: 'dashboard.noPlatforms', page: 'dashboard', desc: '无平台提示', trans: { zh: '暂无平台，去添加吧', en: 'No platforms yet. Add one!', es: 'Sin plataformas. ¡Agregue una!' } },
    { key: 'dashboard.noSalesData', page: 'dashboard', desc: '无销售数据提示', trans: { zh: '暂无销售数据', en: 'No sales data yet', es: 'Sin datos de ventas' } },
    { key: 'dashboard.ordersUnit', page: 'dashboard', desc: '单数单位', trans: { zh: '单', en: 'orders', es: 'pedidos' } },
    { key: 'dashboard.priorityHigh', page: 'dashboard', desc: '高优先级选项', trans: { zh: '高优先级', en: 'High', es: 'Alta' } },
    { key: 'dashboard.priorityNormal', page: 'dashboard', desc: '普通优先级选项', trans: { zh: '普通', en: 'Normal', es: 'Normal' } },
    { key: 'dashboard.servingsUnit', page: 'dashboard', desc: '份数单位', trans: { zh: '份', en: 'servings', es: 'porciones' } },
    { key: 'dashboard.takeoutPlatforms', page: 'dashboard', desc: '外卖平台标题', trans: { zh: '外卖平台', en: 'Delivery Platforms', es: 'Plataformas de Entrega' } },
    { key: 'dashboard.topProducts', page: 'dashboard', desc: '热销TOP5标题', trans: { zh: '菜品热销 TOP5', en: 'Top 5 Selling Items', es: 'Top 5 Más Vendidos' } },
    { key: 'employee.activeOrders', page: 'employee', desc: '个进行中', trans: { zh: '个进行中', en: 'active', es: 'activos' } },
    { key: 'employee.addToCart', page: 'employee', desc: '加入购物车', trans: { zh: '加入购物车', en: 'Add to Cart', es: 'Añadir al carrito' } },
    { key: 'employee.addingOrder', page: 'employee', desc: '加单中', trans: { zh: '加单中', en: 'Adding to order', es: 'Agregando al pedido' } },
    { key: 'employee.allProducts', page: 'employee', desc: '全部商品', trans: { zh: '全部商品', en: 'All Items', es: 'Todos los productos' } },
    { key: 'employee.appendOrder', page: 'employee', desc: '加单', trans: { zh: '加单', en: 'Add to Order', es: 'Añadir al pedido' } },
    { key: 'employee.appendSuccess', page: 'employee', desc: '加单成功', trans: { zh: '加单成功', en: 'Order Added', es: 'Pedido añadido' } },
    { key: 'employee.appendedToOrder', page: 'employee', desc: '已追加到订单', trans: { zh: '已追加到订单', en: 'Appended to order', es: 'Añadido al pedido' } },
    { key: 'employee.backHome', page: 'employee', desc: '返回首页', trans: { zh: '返回首页', en: 'Back to Home', es: 'Volver al inicio' } },
    { key: 'employee.cancelOrder', page: 'employee', desc: '取消订单', trans: { zh: '取消订单', en: 'Cancel Order', es: 'Cancelar pedido' } },
    { key: 'employee.cancelOrderMessage', page: 'employee', desc: '确定取消此订单？', trans: { zh: '确定取消此订单？', en: 'Are you sure you want to cancel this order?', es: '¿Está seguro de cancelar este pedido?' } },
    { key: 'employee.cancelOrderTitle', page: 'employee', desc: '取消订单', trans: { zh: '取消订单', en: 'Cancel Order', es: 'Cancelar pedido' } },
    { key: 'employee.cartEmpty', page: 'employee', desc: '购物车为空', trans: { zh: '购物车为空', en: 'Cart is empty', es: 'El carrito está vacío' } },
    { key: 'employee.cartEmptyHint', page: 'employee', desc: '点击左侧商品添加', trans: { zh: '点击左侧商品添加', en: 'Tap items on the left to add', es: 'Toque los artículos a la izquierda para agregar' } },
    { key: 'employee.cashCheckoutDrawer', page: 'employee', desc: '现金结账并弹钱箱', trans: { zh: '现金结账并弹钱箱', en: 'Cash & Open Drawer', es: 'Efectivo y abrir caja' } },
    { key: 'employee.changePassword', page: 'employee', desc: '修改密码', trans: { zh: '修改密码', en: 'Change Password', es: 'Cambiar contraseña' } },
    { key: 'employee.checkingOut', page: 'employee', desc: '结账中...', trans: { zh: '结账中...', en: 'Checking out...', es: 'Procesando pago...' } },
    { key: 'employee.checkoutSuccess', page: 'employee', desc: '结账成功', trans: { zh: '结账成功', en: 'Checkout successful', es: 'Cobro exitoso' } },
    { key: 'employee.clearCart', page: 'employee', desc: '清空', trans: { zh: '清空', en: 'Clear', es: 'Vaciar' } },
    { key: 'employee.clickToOrderHint', page: 'employee', desc: '点击下方按钮开始点餐', trans: { zh: '点击下方按钮开始点餐', en: 'Tap the button below to start ordering', es: 'Toque el botón para comenzar a ordenar' } },
    { key: 'employee.clockIn', page: 'employee', desc: '上班打卡', trans: { zh: '上班打卡', en: 'Clock In', es: 'Registrar entrada' } },
    { key: 'employee.clockInSuccess', page: 'employee', desc: '上班打卡成功', trans: { zh: '上班打卡成功', en: 'Clocked in successfully', es: 'Entrada registrada correctamente' } },
    { key: 'employee.clockOut', page: 'employee', desc: '下班打卡', trans: { zh: '下班打卡', en: 'Clock Out', es: 'Registrar salida' } },
    { key: 'employee.clockOutSuccess', page: 'employee', desc: '下班打卡成功', trans: { zh: '下班打卡成功', en: 'Clocked out successfully', es: 'Salida registrada correctamente' } },
    { key: 'employee.confirmChange', page: 'employee', desc: '确认修改', trans: { zh: '确认修改', en: 'Confirm Change', es: 'Confirmar cambio' } },
    { key: 'employee.confirmCheckout', page: 'employee', desc: '确认结账', trans: { zh: '确认结账', en: 'Confirm Checkout', es: 'Confirmar pago' } },
    { key: 'employee.confirmOrder', page: 'employee', desc: '确认下单', trans: { zh: '确认下单', en: 'Confirm Order', es: 'Confirmar pedido' } },
    { key: 'employee.confirmPassword', page: 'employee', desc: '确认新密码', trans: { zh: '确认新密码', en: 'Confirm New Password', es: 'Confirmar nueva contraseña' } },
    { key: 'employee.confirmTakeoutOrder', page: 'employee', desc: '确认下单（打包）', trans: { zh: '确认下单（打包）', en: 'Confirm Takeout Order', es: 'Confirmar pedido para llevar' } },
    { key: 'employee.continueAppend', page: 'employee', desc: '继续加单', trans: { zh: '继续加单', en: 'Continue Adding', es: 'Seguir agregando' } },
    { key: 'employee.continueOrdering', page: 'employee', desc: '继续点餐', trans: { zh: '继续点餐', en: 'Keep Ordering', es: 'Seguir ordenando' } },
    { key: 'employee.currentPassword', page: 'employee', desc: '当前密码', trans: { zh: '当前密码', en: 'Current Password', es: 'Contraseña actual' } },
    { key: 'employee.customNotePlaceholder', page: 'employee', desc: '自定义备注（如：少放盐、打包等）', trans: { zh: '自定义备注（如：少放盐、打包等）', en: 'Custom note (e.g. less salt, for takeout)', es: 'Nota personalizada (p. ej. menos sal, para llevar)' } },
    { key: 'employee.customerName', page: 'employee', desc: '顾客姓名', trans: { zh: '顾客姓名', en: 'Customer Name', es: 'Nombre del cliente' } },
    { key: 'employee.dineIn', page: 'employee', desc: '堂吃', trans: { zh: '堂吃', en: 'Dine-in', es: 'En restaurante' } },
    { key: 'employee.dineInOrder', page: 'employee', desc: '堂吃点餐', trans: { zh: '堂吃点餐', en: 'Dine-in Order', es: 'Pedido en restaurante' } },
    { key: 'employee.diningAddOrder', page: 'employee', desc: '用餐中 · 点击加单', trans: { zh: '用餐中 · 点击加单', en: 'Dining · Click to add order', es: 'Comiendo · Haga clic para agregar' } },
    { key: 'employee.diningMethod', page: 'employee', desc: '取餐方式', trans: { zh: '取餐方式', en: 'Service Type', es: 'Tipo de servicio' } },
    { key: 'employee.earliestClockIn', page: 'employee', desc: '最早上班', trans: { zh: '最早上班', en: 'First Clock-in', es: 'Primera entrada' } },
    { key: 'employee.editAppend', page: 'employee', desc: '编辑 / 加单', trans: { zh: '编辑 / 加单', en: 'Edit / Add Items', es: 'Editar / Agregar' } },
    { key: 'employee.editFlavor', page: 'employee', desc: '修改口味', trans: { zh: '修改口味', en: 'Edit Flavor', es: 'Editar sabor' } },
    { key: 'employee.enterCustomerName', page: 'employee', desc: '请填写顾客姓名', trans: { zh: '请填写顾客姓名', en: 'Please enter customer name', es: 'Ingrese el nombre del cliente' } },
    { key: 'employee.enterCustomerPhone', page: 'employee', desc: '请填写手机号码', trans: { zh: '请填写手机号码', en: 'Please enter phone number', es: 'Ingrese el número de teléfono' } },
    { key: 'employee.enterName', page: 'employee', desc: '请输入姓名', trans: { zh: '请输入姓名', en: 'Enter name', es: 'Ingrese el nombre' } },
    { key: 'employee.enterPhoneHint', page: 'employee', desc: '请输入手机号（取餐叫号用）', trans: { zh: '请输入手机号（取餐叫号用）', en: 'Enter phone number (for pickup calls)', es: 'Ingrese el teléfono (para llamadas de retiro)' } },
    { key: 'employee.goCheckout', page: 'employee', desc: '去结帐', trans: { zh: '去结帐', en: 'Go to Checkout', es: 'Ir al pago' } },
    { key: 'employee.inProgress', page: 'employee', desc: '进行中', trans: { zh: '进行中', en: 'In Progress', es: 'En progreso' } },
    { key: 'employee.itemDetails', page: 'employee', desc: '商品明细', trans: { zh: '商品明细', en: 'Item Details', es: 'Detalles de artículos' } },
    { key: 'employee.itemsSubtotal', page: 'employee', desc: '商品小计', trans: { zh: '商品小计', en: 'Items Subtotal', es: 'Subtotal de artículos' } },
    { key: 'employee.latestClockOut', page: 'employee', desc: '最晚下班', trans: { zh: '最晚下班', en: 'Last Clock-out', es: 'Última salida' } },
    { key: 'employee.newOrderAlert', page: 'employee', desc: '有新订单！当前', trans: { zh: '有新订单！当前', en: 'New order! Currently', es: '¡Nuevo pedido! Actualmente' } },
    { key: 'employee.newPassword', page: 'employee', desc: '新密码', trans: { zh: '新密码', en: 'New Password', es: 'Nueva contraseña' } },
    { key: 'employee.noActiveOrders', page: 'employee', desc: '没有进行中的订单', trans: { zh: '没有进行中的订单', en: 'No active orders', es: 'Sin pedidos activos' } },
    { key: 'employee.noFlavorOptions', page: 'employee', desc: '暂无口味选项', trans: { zh: '暂无口味选项', en: 'No flavor options', es: 'Sin opciones de sabor' } },
    { key: 'employee.noItemsToSubmit', page: 'employee', desc: '没有需要提交的商品', trans: { zh: '没有需要提交的商品', en: 'No items to submit', es: 'No hay artículos para enviar' } },
    { key: 'employee.noOrders', page: 'employee', desc: '暂无订单', trans: { zh: '暂无订单', en: 'No orders', es: 'Sin pedidos' } },
    { key: 'employee.noProductsInCategory', page: 'employee', desc: '该分类下暂无商品', trans: { zh: '该分类下暂无商品', en: 'No items in this category', es: 'No hay productos en esta categoría' } },
    { key: 'employee.noTableActiveOrders', page: 'employee', desc: '该桌暂无进行中的订单', trans: { zh: '该桌暂无进行中的订单', en: 'No active orders for this table', es: 'Sin pedidos activos para esta mesa' } },
    { key: 'employee.noTableInfo', page: 'employee', desc: '无法获取桌子信息', trans: { zh: '无法获取桌子信息', en: 'Cannot get table info', es: 'No se puede obtener información de la mesa' } },
    { key: 'employee.noTables', page: 'employee', desc: '暂无餐桌，请先在后台添加', trans: { zh: '暂无餐桌，请先在后台添加', en: 'No tables yet. Please add tables in admin.', es: 'No hay mesas. Agregue mesas en administración.' } },
    { key: 'employee.orderCount', page: 'employee', desc: '订单数', trans: { zh: '订单数', en: 'Order Count', es: 'Cantidad de pedidos' } },
    { key: 'employee.orderDetail', page: 'employee', desc: '订单详情', trans: { zh: '订单详情', en: 'Order Details', es: 'Detalles del pedido' } },
    { key: 'employee.orderFlow', page: 'employee', desc: '订单流程', trans: { zh: '订单流程', en: 'Order Flow', es: 'Flujo del pedido' } },
    { key: 'employee.orderManagement', page: 'employee', desc: '订单管理', trans: { zh: '订单管理', en: 'Order Management', es: 'Gestión de pedidos' } },
    { key: 'employee.orderNo', page: 'employee', desc: '订单号', trans: { zh: '订单号', en: 'Order No.', es: 'N.º de pedido' } },
    { key: 'employee.orderQuery', page: 'employee', desc: '订单查询', trans: { zh: '订单查询', en: 'Order Lookup', es: 'Buscar pedido' } },
    { key: 'employee.orderQueryHint', page: 'employee', desc: '查看确认今日订单', trans: { zh: '查看确认今日订单', en: 'View today\'s orders', es: 'Ver pedidos de hoy' } },
    { key: 'employee.orderSuccessNo', page: 'employee', desc: '点餐成功，订单号：', trans: { zh: '点餐成功，订单号：', en: 'Order placed. Order No.: ', es: 'Pedido realizado. N.º de pedido: ' } },
    { key: 'employee.ordered', page: 'employee', desc: '已下单', trans: { zh: '已下单', en: 'Ordered', es: 'Pedido' } },
    { key: 'employee.passwordChanged', page: 'employee', desc: '密码修改成功', trans: { zh: '密码修改成功', en: 'Password changed successfully', es: 'Contraseña cambiada correctamente' } },
    { key: 'employee.passwordMismatch', page: 'employee', desc: '两次密码不一致', trans: { zh: '两次密码不一致', en: 'Passwords do not match', es: 'Las contraseñas no coinciden' } },
    { key: 'employee.pendingSubmit', page: 'employee', desc: '待下单', trans: { zh: '待下单', en: 'To Submit', es: 'Por enviar' } },
    { key: 'employee.pickupHint', page: 'employee', desc: '请凭此号取餐', trans: { zh: '请凭此号取餐', en: 'Please show this number to pick up', es: 'Muestre este número para recoger' } },
    { key: 'employee.pickupNo', page: 'employee', desc: '取餐号', trans: { zh: '取餐号', en: 'Pickup No.', es: 'N.º de retiro' } },
    { key: 'employee.pieces', page: 'employee', desc: '件', trans: { zh: '件', en: 'items', es: 'artículos' } },
    { key: 'employee.placeOrder', page: 'employee', desc: '下单', trans: { zh: '下单', en: 'Place Order', es: 'Realizar pedido' } },
    { key: 'employee.selectFlavor', page: 'employee', desc: '选口味', trans: { zh: '选口味', en: 'Select Flavor', es: 'Seleccionar sabor' } },
    { key: 'employee.selectPaymentMethod', page: 'employee', desc: '选择付款方式', trans: { zh: '选择付款方式', en: 'Select Payment Method', es: 'Seleccionar método de pago' } },
    { key: 'employee.selectTable', page: 'employee', desc: '选择餐桌', trans: { zh: '选择餐桌', en: 'Select Table', es: 'Seleccionar mesa' } },
    { key: 'employee.selectTableHint', page: 'employee', desc: '选择桌号后点餐', trans: { zh: '选择桌号后点餐', en: 'Select table to order', es: 'Seleccione mesa para ordenar' } },
    { key: 'employee.selected', page: 'employee', desc: '已选', trans: { zh: '已选', en: 'Selected', es: 'Seleccionado' } },
    { key: 'employee.singleChoice', page: 'employee', desc: '（单选）', trans: { zh: '（单选）', en: '(single choice)', es: '(opción única)' } },
    { key: 'employee.statusUpdated', page: 'employee', desc: '状态已更新', trans: { zh: '状态已更新', en: 'Status updated', es: 'Estado actualizado' } },
    { key: 'employee.table', page: 'employee', desc: '桌', trans: { zh: '桌', en: 'Table', es: 'Mesa' } },
    { key: 'employee.tableNo', page: 'employee', desc: '桌号', trans: { zh: '桌号', en: 'Table No.', es: 'N.º de mesa' } },
    { key: 'employee.takeoutCustomerInfo', page: 'employee', desc: '打包顾客信息', trans: { zh: '打包顾客信息', en: 'Takeout Customer Info', es: 'Info del cliente para llevar' } },
    { key: 'employee.takeoutHint', page: 'employee', desc: '凭取餐号取餐', trans: { zh: '凭取餐号取餐', en: 'Pick up with your number', es: 'Recoja con su número' } },
    { key: 'employee.takeoutOrder', page: 'employee', desc: '打包点餐', trans: { zh: '打包点餐', en: 'Takeout Order', es: 'Pedido para llevar' } },
    { key: 'employee.takeoutPickup', page: 'employee', desc: '打包取餐', trans: { zh: '打包取餐', en: 'Takeout Pickup', es: 'Retiro para llevar' } },
    { key: 'employee.terminal', page: 'employee', desc: '员工工作台', trans: { zh: '员工工作台', en: 'Employee Terminal', es: 'Terminal de empleado' } },
    { key: 'employee.title', page: 'employee', desc: 'Only One 员工点餐', trans: { zh: 'Only One 员工点餐', en: 'Only One Staff Order', es: 'Only One Pedido del personal' } },
    { key: 'employee.totalDue', page: 'employee', desc: '应付总额', trans: { zh: '应付总额', en: 'Amount Due', es: 'Total a pagar' } },
    { key: 'employee.viewDetail', page: 'employee', desc: '查看详情', trans: { zh: '查看详情', en: 'View Details', es: 'Ver detalles' } },
    { key: 'flavors.addCategory', page: 'flavors', desc: '新增大类', trans: { zh: '新增大类', en: 'Add Category', es: 'Nueva categoría' } },
    { key: 'flavors.addTag', page: 'flavors', desc: '标签', trans: { zh: '标签', en: 'Tag', es: 'Etiqueta' } },
    { key: 'flavors.addTagTitle', page: 'flavors', desc: '新增标签', trans: { zh: '新增标签', en: 'Add Tag', es: 'Nueva etiqueta' } },
    { key: 'flavors.applicableProducts', page: 'flavors', desc: '适用商品分类', trans: { zh: '适用商品分类（不选表示全部分类适用）', en: 'Applicable product categories (none selected means all categories)', es: 'Categorías de productos aplicables (ninguna seleccionada significa todas)' } },
    { key: 'flavors.catAdded', page: 'flavors', desc: '分类已添加', trans: { zh: '分类已添加', en: 'Category added', es: 'Categoría agregada' } },
    { key: 'flavors.catDeleted', page: 'flavors', desc: '分类已删除', trans: { zh: '分类已删除', en: 'Category deleted', es: 'Categoría eliminada' } },
    { key: 'flavors.catDisabled', page: 'flavors', desc: '已禁用该分类', trans: { zh: '已禁用该分类', en: 'Category disabled', es: 'Categoría deshabilitada' } },
    { key: 'flavors.catEnabled', page: 'flavors', desc: '已启用该分类', trans: { zh: '已启用该分类', en: 'Category enabled', es: 'Categoría habilitada' } },
    { key: 'flavors.catNameLabel', page: 'flavors', desc: '大类名称', trans: { zh: '大类名称 *', en: 'Category Name *', es: 'Nombre de categoría *' } },
    { key: 'flavors.catNamePlaceholder', page: 'flavors', desc: '大类名称占位符', trans: { zh: '如：冰度、辣度、甜度', en: 'e.g., Ice level, Spice level, Sweetness', es: 'Ej.: Nivel de hielo, Nivel de picante, Dulzor' } },
    { key: 'flavors.catNameRequired', page: 'flavors', desc: '分类名称必填', trans: { zh: '请填写分类名称', en: 'Category name is required', es: 'El nombre de la categoría es obligatorio' } },
    { key: 'flavors.catUpdated', page: 'flavors', desc: '分类已更新', trans: { zh: '分类已更新', en: 'Category updated', es: 'Categoría actualizada' } },
    { key: 'flavors.confirmDeleteCatEnd', page: 'flavors', desc: '确定删除分类结尾', trans: { zh: '"吗？该分类下没有标签才能删除。', en: '"? Category must have no tags to be deleted.', es: '"? La categoría no debe tener etiquetas para poder eliminarla.' } },
    { key: 'flavors.confirmDeleteCatStart', page: 'flavors', desc: '确定删除分类开始', trans: { zh: '确定删除分类"', en: 'Delete category "', es: '¿Eliminar categoría "' } },
    { key: 'flavors.confirmDeleteCatTitle', page: 'flavors', desc: '删除分类', trans: { zh: '删除分类', en: 'Delete Category', es: 'Eliminar categoría' } },
    { key: 'flavors.confirmDeleteTagEnd', page: 'flavors', desc: '确定删除标签结尾', trans: { zh: '"吗？', en: '"?', es: '"?' } },
    { key: 'flavors.confirmDeleteTagStart', page: 'flavors', desc: '确定删除标签开始', trans: { zh: '确定删除标签"', en: 'Delete tag "', es: '¿Eliminar etiqueta "' } },
    { key: 'flavors.confirmDeleteTagTitle', page: 'flavors', desc: '删除标签', trans: { zh: '删除标签', en: 'Delete Tag', es: 'Eliminar etiqueta' } },
    { key: 'flavors.defaultCol', page: 'flavors', desc: '默认列', trans: { zh: '默认', en: 'Default', es: 'Por defecto' } },
    { key: 'flavors.defaultHint', page: 'flavors', desc: '默认选中提示', trans: { zh: '默认选中（商品加入购物车时自动带上）', en: 'Default selected (auto-added when item is added to cart)', es: 'Seleccionado por defecto (se agrega automáticamente al añadir al carrito)' } },
    { key: 'flavors.defaultSelected', page: 'flavors', desc: '默认选中', trans: { zh: '默认选中', en: 'Default selected', es: 'Seleccionado por defecto' } },
    { key: 'flavors.desc', page: 'flavors', desc: '口味管理说明', trans: { zh: '管理口味大类和小类，可单独启用/禁用', en: 'Manage flavor categories and tags, enable/disable individually', es: 'Gestionar categorías y etiquetas de sabores, habilitar/deshabilitar individualmente' } },
    { key: 'flavors.disabled', page: 'flavors', desc: '禁用', trans: { zh: '禁用', en: 'Disabled', es: 'Deshabilitado' } },
    { key: 'flavors.disabledOff', page: 'flavors', desc: '已禁用', trans: { zh: '已禁用', en: 'Disabled', es: 'Deshabilitado' } },
    { key: 'flavors.editCategory', page: 'flavors', desc: '编辑大类', trans: { zh: '编辑大类', en: 'Edit Category', es: 'Editar categoría' } },
    { key: 'flavors.editTagTitle', page: 'flavors', desc: '编辑标签', trans: { zh: '编辑标签', en: 'Edit Tag', es: 'Editar etiqueta' } },
    { key: 'flavors.empty', page: 'flavors', desc: '暂无口味分类', trans: { zh: '暂无口味分类，点击右上角添加', en: 'No flavor categories yet, click top right to add', es: 'No hay categorías de sabores, haga clic arriba a la derecha para agregar' } },
    { key: 'flavors.enableCatHint', page: 'flavors', desc: '启用分类提示', trans: { zh: '启用该分类（禁用后前台不显示）', en: 'Enable this category (hidden on frontend when disabled)', es: 'Habilitar esta categoría (oculta en el frontend al deshabilitar)' } },
    { key: 'flavors.enableTagHint', page: 'flavors', desc: '启用标签提示', trans: { zh: '启用该标签（禁用后前台不显示）', en: 'Enable this tag (hidden on frontend when disabled)', es: 'Habilitar esta etiqueta (oculta en el frontend al deshabilitar)' } },
    { key: 'flavors.enabled', page: 'flavors', desc: '启用', trans: { zh: '启用', en: 'Enabled', es: 'Habilitado' } },
    { key: 'flavors.enabledOn', page: 'flavors', desc: '启用中', trans: { zh: '启用中', en: 'Active', es: 'Activo' } },
    { key: 'flavors.extraPriceCol', page: 'flavors', desc: '加价列', trans: { zh: '加价', en: 'Extra Price', es: 'Precio extra' } },
    { key: 'flavors.extraPriceLabel', page: 'flavors', desc: '额外加价', trans: { zh: '额外加价 ($)', en: 'Extra Price ($)', es: 'Precio extra ($)' } },
    { key: 'flavors.extraPricePlaceholder', page: 'flavors', desc: '额外加价占位符', trans: { zh: '0 表示不加价', en: '0 means no extra charge', es: '0 significa sin cargo extra' } },
    { key: 'flavors.noTags', page: 'flavors', desc: '暂无标签', trans: { zh: '该分类下暂无标签，点击右上角 + 标签 添加', en: 'No tags in this category, click + Tag above to add', es: 'Sin etiquetas en esta categoría, haga clic en + Etiqueta arriba para agregar' } },
    { key: 'flavors.parentCat', page: 'flavors', desc: '所属大类', trans: { zh: '所属大类：', en: 'Parent category:', es: 'Categoría principal:' } },
    { key: 'flavors.sortCol', page: 'flavors', desc: '排序列', trans: { zh: '排序', en: 'Sort', es: 'Orden' } },
    { key: 'flavors.tagAdded', page: 'flavors', desc: '标签已添加', trans: { zh: '标签已添加', en: 'Tag added', es: 'Etiqueta agregada' } },
    { key: 'flavors.tagCol', page: 'flavors', desc: '标签列', trans: { zh: '标签', en: 'Tag', es: 'Etiqueta' } },
    { key: 'flavors.tagDeleted', page: 'flavors', desc: '标签已删除', trans: { zh: '标签已删除', en: 'Tag deleted', es: 'Etiqueta eliminada' } },
    { key: 'flavors.tagDisabled', page: 'flavors', desc: '已禁用该标签', trans: { zh: '已禁用该标签', en: 'Tag disabled', es: 'Etiqueta deshabilitada' } },
    { key: 'flavors.tagEnabled', page: 'flavors', desc: '已启用该标签', trans: { zh: '已启用该标签', en: 'Tag enabled', es: 'Etiqueta habilitada' } },
    { key: 'flavors.tagNameLabel', page: 'flavors', desc: '标签名称', trans: { zh: '标签名称 *', en: 'Tag Name *', es: 'Nombre de etiqueta *' } },
    { key: 'flavors.tagNamePlaceholder', page: 'flavors', desc: '标签名称占位符', trans: { zh: '如：少冰、去冰、正常冰', en: 'e.g., Less ice, No ice, Regular ice', es: 'Ej.: Menos hielo, Sin hielo, Hielo normal' } },
    { key: 'flavors.tagNameRequired', page: 'flavors', desc: '标签名称必填', trans: { zh: '请填写标签名称', en: 'Tag name is required', es: 'El nombre de la etiqueta es obligatorio' } },
    { key: 'flavors.tagUpdated', page: 'flavors', desc: '标签已更新', trans: { zh: '标签已更新', en: 'Tag updated', es: 'Etiqueta actualizada' } },
    { key: 'flavors.tagsUnit', page: 'flavors', desc: '个标签', trans: { zh: '个标签', en: 'tags', es: 'etiquetas' } },
    { key: 'forms.addFieldBtn', page: 'forms', desc: '添加字段按钮', trans: { zh: '+ 添加字段', en: '+ Add field', es: '+ Añadir campo' } },
    { key: 'forms.colName', page: 'forms', desc: '表单名称列', trans: { zh: '表单名称', en: 'Form name', es: 'Nombre del formulario' } },
    { key: 'forms.createBtn', page: 'forms', desc: '创建表单按钮', trans: { zh: '+ 创建表单', en: '+ Create form', es: '+ Crear formulario' } },
    { key: 'forms.createTitle', page: 'forms', desc: '创建表单', trans: { zh: '创建表单', en: 'Create form', es: 'Crear formulario' } },
    { key: 'forms.created', page: 'forms', desc: '创建成功', trans: { zh: '创建成功', en: 'Created successfully', es: 'Creado correctamente' } },
    { key: 'forms.createdTime', page: 'forms', desc: '创建时间列', trans: { zh: '创建时间', en: 'Created at', es: 'Creado el' } },
    { key: 'forms.deleteMessage', page: 'forms', desc: '确定删除该表单及所有提交记录', trans: { zh: '确定删除该表单及所有提交记录？', en: 'Delete this form and all submissions?', es: '¿Eliminar este formulario y todos los envíos?' } },
    { key: 'forms.deleteTitle', page: 'forms', desc: '删除表单', trans: { zh: '删除表单', en: 'Delete form', es: 'Eliminar formulario' } },
    { key: 'forms.deleted', page: 'forms', desc: '已删除', trans: { zh: '已删除', en: 'Deleted', es: 'Eliminado' } },
    { key: 'forms.descLabel', page: 'forms', desc: '描述标签', trans: { zh: '描述', en: 'Description', es: 'Descripción' } },
    { key: 'forms.disabled', page: 'forms', desc: '停用', trans: { zh: '停用', en: 'Disabled', es: 'Desactivado' } },
    { key: 'forms.editTitle', page: 'forms', desc: '编辑表单', trans: { zh: '编辑表单', en: 'Edit form', es: 'Editar formulario' } },
    { key: 'forms.enableForm', page: 'forms', desc: '启用表单', trans: { zh: '启用表单', en: 'Enable form', es: 'Activar formulario' } },
    { key: 'forms.enabled', page: 'forms', desc: '启用', trans: { zh: '启用', en: 'Enabled', es: 'Activado' } },
    { key: 'forms.fieldCount', page: 'forms', desc: '字段数列', trans: { zh: '字段数', en: 'Fields', es: 'Campos' } },
    { key: 'forms.fieldLabel', page: 'forms', desc: '字段标签占位', trans: { zh: '字段标签', en: 'Field label', es: 'Etiqueta del campo' } },
    { key: 'forms.fieldsLabel', page: 'forms', desc: '表单字段', trans: { zh: '表单字段', en: 'Form fields', es: 'Campos del formulario' } },
    { key: 'forms.fieldsUnit', page: 'forms', desc: '个字段', trans: { zh: '个字段', en: 'fields', es: 'campos' } },
    { key: 'forms.fillAgain', page: 'forms', desc: '再填一份', trans: { zh: '再填一份', en: 'Fill another', es: 'Completar otro' } },
    { key: 'forms.fillPrefix', page: 'forms', desc: '必填提示前缀', trans: { zh: '请填写「', en: 'Please fill in "', es: 'Por favor complete "' } },
    { key: 'forms.fillSuffix', page: 'forms', desc: '必填提示后缀', trans: { zh: '」', en: '"', es: '"' } },
    { key: 'forms.nameLabel', page: 'forms', desc: '表单名称标签', trans: { zh: '表单名称 *', en: 'Form name *', es: 'Nombre del formulario *' } },
    { key: 'forms.nameRequired', page: 'forms', desc: '表单名称必填', trans: { zh: '表单名称必填', en: 'Form name is required', es: 'El nombre del formulario es obligatorio' } },
    { key: 'forms.noFields', page: 'forms', desc: '暂无字段', trans: { zh: '暂无字段，点击上方添加', en: 'No fields, click above to add', es: 'Sin campos, haga clic arriba para añadir' } },
    { key: 'forms.noFieldsPublic', page: 'forms', desc: '公开页暂无字段', trans: { zh: '该表单暂无字段', en: 'This form has no fields', es: 'Este formulario no tiene campos' } },
    { key: 'forms.noSubmissions', page: 'forms', desc: '暂无提交记录', trans: { zh: '暂无提交记录', en: 'No submissions', es: 'Sin envíos' } },
    { key: 'forms.options', page: 'forms', desc: '选项逗号分隔', trans: { zh: '选项（逗号分隔）', en: 'Options (comma separated)', es: 'Opciones (separadas por comas)' } },
    { key: 'forms.placeholder', page: 'forms', desc: '占位提示文字', trans: { zh: '占位提示文字', en: 'Placeholder', es: 'Marcador de posición' } },
    { key: 'forms.pleaseSelect', page: 'forms', desc: '请选择', trans: { zh: '请选择', en: 'Please select', es: 'Por favor seleccione' } },
    { key: 'forms.required', page: 'forms', desc: '必填', trans: { zh: '必填', en: 'Required', es: 'Obligatorio' } },
    { key: 'forms.submissions', page: 'forms', desc: '提交记录按钮', trans: { zh: '提交记录', en: 'Submissions', es: 'Envíos' } },
    { key: 'forms.submissionsTitle', page: 'forms', desc: '提交记录对话框', trans: { zh: '表单提交记录', en: 'Form submissions', es: 'Envíos del formulario' } },
    { key: 'forms.submit', page: 'forms', desc: '提交按钮', trans: { zh: '提交', en: 'Submit', es: 'Enviar' } },
    { key: 'forms.submitSuccess', page: 'forms', desc: '提交成功toast', trans: { zh: '提交成功', en: 'Submitted successfully', es: 'Enviado correctamente' } },
    { key: 'forms.submittedDesc', page: 'forms', desc: '提交成功描述', trans: { zh: '感谢您的填写，我们已收到您的信息', en: 'Thank you, we have received your information', es: 'Gracias, hemos recibido su información' } },
    { key: 'forms.submittedTitle', page: 'forms', desc: '提交成功标题', trans: { zh: '提交成功', en: 'Submitted successfully', es: 'Enviado correctamente' } },
    { key: 'forms.submitting', page: 'forms', desc: '提交中', trans: { zh: '提交中...', en: 'Submitting...', es: 'Enviando...' } },
    { key: 'forms.subtitle', page: 'forms', desc: '表单页副标题', trans: { zh: '自定义表单，支持文本、下拉、日期、时间等主流字段', en: 'Custom forms with text, dropdown, date, time and more', es: 'Formularios personalizados con texto, lista, fecha, hora, etc.' } },
    { key: 'forms.title', page: 'forms', desc: '表单管理', trans: { zh: '表单管理', en: 'Form management', es: 'Gestión de formularios' } },
    { key: 'forms.type.checkbox', page: 'forms', desc: '多选', trans: { zh: '多选', en: 'Multiple choice', es: 'Opción múltiple' } },
    { key: 'forms.type.date', page: 'forms', desc: '日期', trans: { zh: '日期', en: 'Date', es: 'Fecha' } },
    { key: 'forms.type.datetime', page: 'forms', desc: '日期时间', trans: { zh: '日期时间', en: 'Date & time', es: 'Fecha y hora' } },
    { key: 'forms.type.email', page: 'forms', desc: '邮箱', trans: { zh: '邮箱', en: 'Email', es: 'Correo electrónico' } },
    { key: 'forms.type.number', page: 'forms', desc: '数字', trans: { zh: '数字', en: 'Number', es: 'Número' } },
    { key: 'forms.type.radio', page: 'forms', desc: '单选', trans: { zh: '单选', en: 'Single choice', es: 'Opción única' } },
    { key: 'forms.type.select', page: 'forms', desc: '下拉选择', trans: { zh: '下拉选择', en: 'Dropdown', es: 'Lista desplegable' } },
    { key: 'forms.type.switch', page: 'forms', desc: '开关', trans: { zh: '开关', en: 'Switch', es: 'Interruptor' } },
    { key: 'forms.type.tel', page: 'forms', desc: '电话', trans: { zh: '电话', en: 'Phone', es: 'Teléfono' } },
    { key: 'forms.type.text', page: 'forms', desc: '单行文本', trans: { zh: '单行文本', en: 'Single-line text', es: 'Texto de una línea' } },
    { key: 'forms.type.textarea', page: 'forms', desc: '多行文本', trans: { zh: '多行文本', en: 'Multi-line text', es: 'Texto de varias líneas' } },
    { key: 'forms.type.time', page: 'forms', desc: '时间', trans: { zh: '时间', en: 'Time', es: 'Hora' } },
    { key: 'forms.updated', page: 'forms', desc: '更新成功', trans: { zh: '更新成功', en: 'Updated successfully', es: 'Actualizado correctamente' } },
    { key: 'home.aboutParagraph', page: 'home', desc: '关于段落', trans: { zh: 'Only One BBQ & Tea 致力于为顾客提供最优质的烧烤和新式茶饮体验。我们坚持选用新鲜食材，现点现做，让每一位顾客都能品尝到最地道的美味。', en: 'Only One BBQ & Tea is dedicated to providing the finest BBQ and modern tea experience. We insist on fresh ingredients, made to order, so every guest can taste the most authentic flavors.', es: 'Only One BBQ & Tea se dedica a ofrecer la mejor experiencia de BBQ y té moderno. Utilizamos ingredientes frescos, hechos al momento, para que cada cliente disfrute de los sabores más auténticos.' } },
    { key: 'home.flushingStore', page: 'home', desc: '品牌故事标题默认', trans: { zh: '法拉盛门店', en: 'Flushing Location', es: 'Sucursal Flushing' } },
    { key: 'home.flushingStoreDesc', page: 'home', desc: '品牌故事默认描述', trans: { zh: '法拉盛门店，烧烤 + 新式茶饮定位', en: 'Flushing location, BBQ & modern tea', es: 'Sucursal Flushing, BBQ y té moderno' } },
    { key: 'home.language', page: 'home', desc: '语言选择按钮默认', trans: { zh: '语言', en: 'Language', es: 'Idioma' } },
    { key: 'home.managementSystem', page: 'home', desc: '页脚系统名', trans: { zh: '一站式管理系统', en: 'All-in-one Management System', es: 'Sistema de Gestión Integral' } },
    { key: 'home.newBadge', page: 'home', desc: '新品角标', trans: { zh: '新品', en: 'NEW', es: 'NUEVO' } },
    { key: 'home.tagline', page: 'home', desc: '轮播副标题', trans: { zh: '烧烤 + 新式茶饮 · 法拉盛', en: 'BBQ & Modern Tea · Flushing', es: 'BBQ y Té Moderno · Flushing' } },
    { key: 'inventory.addGoodsBtn', page: 'inventory', desc: '新增货物按钮', trans: { zh: '+ 新增货物', en: '+ Add item', es: '+ Añadir artículo' } },
    { key: 'inventory.addGoodsTitle', page: 'inventory', desc: '新增货物', trans: { zh: '新增货物', en: 'Add item', es: 'Añadir artículo' } },
    { key: 'inventory.addItem', page: 'inventory', desc: '添加一项', trans: { zh: '+ 添加一项', en: '+ Add item', es: '+ Añadir artículo' } },
    { key: 'inventory.added', page: 'inventory', desc: '货物已添加', trans: { zh: '货物已添加', en: 'Item added', es: 'Artículo añadido' } },
    { key: 'inventory.avgPrice', page: 'inventory', desc: '平均进价', trans: { zh: '平均进价', en: 'Avg. cost', es: 'Coste medio' } },
    { key: 'inventory.avgPriceLabel', page: 'inventory', desc: '平均进价标签', trans: { zh: '平均进价 ($)', en: 'Avg. cost ($)', es: 'Coste medio ($)' } },
    { key: 'inventory.category', page: 'inventory', desc: '分类', trans: { zh: '分类', en: 'Category', es: 'Categoría' } },
    { key: 'inventory.colName', page: 'inventory', desc: '货物名称列', trans: { zh: '货物名称', en: 'Item name', es: 'Nombre del artículo' } },
    { key: 'inventory.currentStock', page: 'inventory', desc: '当前库存', trans: { zh: '当前库存', en: 'Current stock', es: 'Stock actual' } },
    { key: 'inventory.deleteMsgPrefix', page: 'inventory', desc: '删除货物前缀', trans: { zh: '确定删除货物“', en: 'Delete item "', es: 'Eliminar artículo "' } },
    { key: 'inventory.deleteMsgSuffix', page: 'inventory', desc: '删除货物后缀', trans: { zh: '”吗？', en: '"?', es: '"?' } },
    { key: 'inventory.deleteOrderMsgPrefix', page: 'inventory', desc: '删除进货单前缀', trans: { zh: '确定删除进货单“', en: 'Delete purchase order "', es: 'Eliminar orden de compra "' } },
    { key: 'inventory.deleteOrderMsgSuffix', page: 'inventory', desc: '删除进货单后缀', trans: { zh: '”吗？', en: '"?', es: '"?' } },
    { key: 'inventory.deleteOrderTitle', page: 'inventory', desc: '删除进货单', trans: { zh: '删除进货单', en: 'Delete purchase order', es: 'Eliminar orden de compra' } },
    { key: 'inventory.deleteTitle', page: 'inventory', desc: '删除货物', trans: { zh: '删除货物', en: 'Delete item', es: 'Eliminar artículo' } },
    { key: 'inventory.deleted', page: 'inventory', desc: '货物已删除', trans: { zh: '货物已删除', en: 'Item deleted', es: 'Artículo eliminado' } },
    { key: 'inventory.deliveryFee', page: 'inventory', desc: '配送费', trans: { zh: '配送费 ($)', en: 'Delivery fee ($)', es: 'Gastos de envío ($)' } },
    { key: 'inventory.discount', page: 'inventory', desc: '折扣', trans: { zh: '折扣 ($)', en: 'Discount ($)', es: 'Descuento ($)' } },
    { key: 'inventory.editGoodsTitle', page: 'inventory', desc: '编辑货物', trans: { zh: '编辑货物', en: 'Edit item', es: 'Editar artículo' } },
    { key: 'inventory.editOrderTitle', page: 'inventory', desc: '编辑进货单', trans: { zh: '编辑进货单', en: 'Edit purchase order', es: 'Editar orden de compra' } },
    { key: 'inventory.grandTotal', page: 'inventory', desc: '合计', trans: { zh: '合计', en: 'Grand total', es: 'Total' } },
    { key: 'inventory.itemCountPrefix', page: 'inventory', desc: '项货物前缀', trans: { zh: '共', en: 'Total', es: 'Total' } },
    { key: 'inventory.itemCountSuffix', page: 'inventory', desc: '项货物后缀', trans: { zh: '项货物', en: 'items', es: 'artículos' } },
    { key: 'inventory.itemRequired', page: 'inventory', desc: '至少添加一项', trans: { zh: '至少添加一项货物', en: 'Add at least one item', es: 'Añada al menos un artículo' } },
    { key: 'inventory.itemsDetail', page: 'inventory', desc: '货物明细', trans: { zh: '货物明细', en: 'Item details', es: 'Detalle de artículos' } },
    { key: 'inventory.nameEn', page: 'inventory', desc: '英文名', trans: { zh: '英文名', en: 'English name', es: 'Nombre en inglés' } },
    { key: 'inventory.nameLabel', page: 'inventory', desc: '货物名称标签', trans: { zh: '货物名称 *', en: 'Item name *', es: 'Nombre del artículo *' } },
    { key: 'inventory.namePh', page: 'inventory', desc: '货物名称占位', trans: { zh: '货物名称', en: 'Item name', es: 'Nombre del artículo' } },
    { key: 'inventory.nameRequired', page: 'inventory', desc: '货物名称必填', trans: { zh: '货物名称必填', en: 'Item name required', es: 'Nombre del artículo obligatorio' } },
    { key: 'inventory.newOrderBtn', page: 'inventory', desc: '新建进货单按钮', trans: { zh: '+ 新建进货单', en: '+ New purchase order', es: '+ Nueva orden de compra' } },
    { key: 'inventory.newOrderTitle', page: 'inventory', desc: '新建进货单', trans: { zh: '新建进货单', en: 'New purchase order', es: 'Nueva orden de compra' } },
    { key: 'inventory.noGoods', page: 'inventory', desc: '暂无货物', trans: { zh: '暂无货物，点击右上角添加', en: 'No items, click top right to add', es: 'Sin artículos, haga clic arriba a la derecha' } },
    { key: 'inventory.noOrders', page: 'inventory', desc: '暂无进货单', trans: { zh: '暂无进货单，点击右上角新建', en: 'No orders, click top right to create', es: 'Sin órdenes, haga clic arriba a la derecha' } },
    { key: 'inventory.note', page: 'inventory', desc: '备注', trans: { zh: '备注', en: 'Note', es: 'Nota' } },
    { key: 'inventory.ocrBtn', page: 'inventory', desc: '拍照识别按钮', trans: { zh: '📷 拍照识别', en: '📷 Photo recognition', es: '📷 Reconocer con foto' } },
    { key: 'inventory.ocrFailed', page: 'inventory', desc: 'OCR失败', trans: { zh: '识别失败：', en: 'Recognition failed: ', es: 'Error de reconocimiento: ' } },
    { key: 'inventory.ocrNoResult', page: 'inventory', desc: 'OCR无结果', trans: { zh: '未识别到货物明细，请手动填写', en: 'No items recognized, please fill manually', es: 'No se reconocieron artículos, complete manualmente' } },
    { key: 'inventory.ocrProgress', page: 'inventory', desc: '识别中', trans: { zh: '识别中', en: 'Recognizing', es: 'Reconociendo' } },
    { key: 'inventory.ocrRunning', page: 'inventory', desc: '识别运行中', trans: { zh: '正在识别图片文字，请稍候...', en: 'Recognizing text, please wait...', es: 'Reconociendo texto, espere...' } },
    { key: 'inventory.ocrSuccessPrefix', page: 'inventory', desc: 'OCR成功前缀', trans: { zh: '识别成功，已填充', en: 'Recognized, filled', es: 'Reconocido, rellenado' } },
    { key: 'inventory.ocrSuccessSuffix', page: 'inventory', desc: 'OCR成功后缀', trans: { zh: '项货物，请核对', en: 'items, please verify', es: 'artículos, verifique' } },
    { key: 'inventory.orderCountPrefix', page: 'inventory', desc: '进货单数前缀', trans: { zh: '共', en: 'Total', es: 'Total' } },
    { key: 'inventory.orderCountSuffix', page: 'inventory', desc: '进货单数后缀', trans: { zh: '张进货单', en: 'purchase orders', es: 'órdenes de compra' } },
    { key: 'inventory.orderCreated', page: 'inventory', desc: '进货单已创建', trans: { zh: '进货单已创建', en: 'Purchase order created', es: 'Orden de compra creada' } },
    { key: 'inventory.orderDate', page: 'inventory', desc: '日期', trans: { zh: '日期', en: 'Date', es: 'Fecha' } },
    { key: 'inventory.orderDeleted', page: 'inventory', desc: '进货单已删除', trans: { zh: '进货单已删除', en: 'Purchase order deleted', es: 'Orden de compra eliminada' } },
    { key: 'inventory.orderDetailTitle', page: 'inventory', desc: '进货单详情', trans: { zh: '进货单详情', en: 'Purchase order detail', es: 'Detalle de orden de compra' } },
    { key: 'inventory.orderNo', page: 'inventory', desc: '订单号', trans: { zh: '订单号', en: 'Order no.', es: 'Nº de pedido' } },
    { key: 'inventory.orderUpdated', page: 'inventory', desc: '进货单已更新', trans: { zh: '进货单已更新', en: 'Purchase order updated', es: 'Orden de compra actualizada' } },
    { key: 'inventory.payCOD', page: 'inventory', desc: '货到付款', trans: { zh: '货到付款', en: 'Cash on delivery', es: 'Contra reembolso' } },
    { key: 'inventory.payCash', page: 'inventory', desc: '现金', trans: { zh: '现金', en: 'Cash', es: 'Efectivo' } },
    { key: 'inventory.payCheck', page: 'inventory', desc: '支票', trans: { zh: '支票', en: 'Check', es: 'Cheque' } },
    { key: 'inventory.payTransfer', page: 'inventory', desc: '银行转账', trans: { zh: '银行转账', en: 'Bank transfer', es: 'Transferencia bancaria' } },
    { key: 'inventory.paymentMethod', page: 'inventory', desc: '付款方式', trans: { zh: '付款方式', en: 'Payment method', es: 'Método de pago' } },
    { key: 'inventory.searchPh', page: 'inventory', desc: '搜索占位', trans: { zh: '搜索货物名称/供应商...', en: 'Search item name/supplier...', es: 'Buscar artículo/proveedor...' } },
    { key: 'inventory.selectGoods', page: 'inventory', desc: '选择已有货物', trans: { zh: '选择已有货物...', en: 'Select existing item...', es: 'Seleccionar artículo existente...' } },
    { key: 'inventory.stockShort', page: 'inventory', desc: '库存缩写', trans: { zh: '库存', en: 'stock', es: 'stock' } },
    { key: 'inventory.subtitle', page: 'inventory', desc: '货物管理副标题', trans: { zh: '管理货物库存和进货单', en: 'Manage stock and purchase orders', es: 'Gestionar stock y órdenes de compra' } },
    { key: 'inventory.subtotal', page: 'inventory', desc: '货物小计', trans: { zh: '货物小计', en: 'Item subtotal', es: 'Subtotal de artículos' } },
    { key: 'inventory.supplier', page: 'inventory', desc: '供应商', trans: { zh: '供应商', en: 'Supplier', es: 'Proveedor' } },
    { key: 'inventory.supplierLabel', page: 'inventory', desc: '供应商标签', trans: { zh: '供应商 *', en: 'Supplier *', es: 'Proveedor *' } },
    { key: 'inventory.supplierRequired', page: 'inventory', desc: '供应商必填', trans: { zh: '供应商必填', en: 'Supplier required', es: 'Proveedor obligatorio' } },
    { key: 'inventory.tabGoods', page: 'inventory', desc: '货物列表标签', trans: { zh: '货物列表', en: 'Items list', es: 'Lista de artículos' } },
    { key: 'inventory.tabOrders', page: 'inventory', desc: '进货单标签', trans: { zh: '进货单', en: 'Purchase orders', es: 'Órdenes de compra' } },
    { key: 'inventory.title', page: 'inventory', desc: '货物管理', trans: { zh: '货物管理', en: 'Inventory management', es: 'Gestión de inventario' } },
    { key: 'inventory.totalAmount', page: 'inventory', desc: '总金额', trans: { zh: '总金额', en: 'Total amount', es: 'Importe total' } },
    { key: 'inventory.totalLabel', page: 'inventory', desc: '合计', trans: { zh: '合计: ', en: 'Total: ', es: 'Total: ' } },
    { key: 'inventory.unit', page: 'inventory', desc: '单位', trans: { zh: '单位', en: 'Unit', es: 'Unidad' } },
    { key: 'inventory.unitPh', page: 'inventory', desc: '单位占位', trans: { zh: '个/箱/包/磅', en: 'pcs/box/bag/lb', es: 'uds/caja/bolsa/lb' } },
    { key: 'inventory.unitPrice', page: 'inventory', desc: '单价', trans: { zh: '单价', en: 'Unit price', es: 'Precio unitario' } },
    { key: 'inventory.updated', page: 'inventory', desc: '货物已更新', trans: { zh: '货物已更新', en: 'Item updated', es: 'Artículo actualizado' } },
    { key: 'inventory.view', page: 'inventory', desc: '查看', trans: { zh: '查看', en: 'View', es: 'Ver' } },
    { key: 'kds.autoOff', page: 'kds', desc: '已暂停', trans: { zh: '已暂停', en: 'Paused', es: 'En pausa' } },
    { key: 'kds.autoOn', page: 'kds', desc: '自动刷新中', trans: { zh: '自动刷新中', en: 'Auto refresh on', es: 'Actualización automática' } },
    { key: 'kds.confirmOutput', page: 'kds', desc: '确认出餐', trans: { zh: '确认出餐', en: 'Confirm output', es: 'Confirmar entrega' } },
    { key: 'kds.confirmOutputBtn', page: 'kds', desc: '确认出餐按钮', trans: { zh: '确认出餐', en: 'Confirm output', es: 'Confirmar entrega' } },
    { key: 'kds.customer', page: 'kds', desc: '顾客', trans: { zh: '顾客: ', en: 'Customer: ', es: 'Cliente: ' } },
    { key: 'kds.customerColon', page: 'kds', desc: '顾客冒号', trans: { zh: '顾客: ', en: 'Customer: ', es: 'Cliente: ' } },
    { key: 'kds.delivery', page: 'kds', desc: '配送', trans: { zh: '配送', en: 'Delivery', es: 'Entrega a domicilio' } },
    { key: 'kds.deliveryFee', page: 'kds', desc: '配送费', trans: { zh: '配送费: ', en: 'Delivery fee: ', es: 'Gastos de envío: ' } },
    { key: 'kds.dinein', page: 'kds', desc: '堂吃', trans: { zh: '堂吃', en: 'Dine-in', es: 'Comer en el local' } },
    { key: 'kds.noOrders', page: 'kds', desc: '暂无待处理订单', trans: { zh: '暂无待处理订单', en: 'No pending orders', es: 'Sin pedidos pendientes' } },
    { key: 'kds.noOrdersHint', page: 'kds', desc: '新订单提示', trans: { zh: '新订单会自动显示在这里', en: 'New orders will appear here', es: 'Los nuevos pedidos aparecerán aquí' } },
    { key: 'kds.noteColon', page: 'kds', desc: '备注冒号', trans: { zh: '备注: ', en: 'Note: ', es: 'Nota: ' } },
    { key: 'kds.orderNo', page: 'kds', desc: '订单号', trans: { zh: '订单号: ', en: 'Order no.: ', es: 'Nº de pedido: ' } },
    { key: 'kds.outputDone', page: 'kds', desc: '已出餐', trans: { zh: '已出餐', en: 'Delivered', es: 'Entregado' } },
    { key: 'kds.outputMsgPrefix', page: 'kds', desc: '出餐前缀', trans: { zh: '确定订单', en: 'Confirm order ', es: 'Confirmar pedido ' } },
    { key: 'kds.outputMsgSuffix', page: 'kds', desc: '出餐后缀', trans: { zh: '已出餐？', en: ' delivered?', es: ' ¿entregado?' } },
    { key: 'kds.overtime', page: 'kds', desc: '已超时', trans: { zh: '⚠️ 已超时', en: '⚠️ Overdue', es: '⚠️ Tardanza' } },
    { key: 'kds.pending', page: 'kds', desc: '待制作', trans: { zh: '待制作', en: 'Pending', es: 'Pendiente' } },
    { key: 'kds.phoneColon', page: 'kds', desc: '电话冒号', trans: { zh: '电话: ', en: 'Phone: ', es: 'Teléfono: ' } },
    { key: 'kds.pickupNo', page: 'kds', desc: '取餐号', trans: { zh: '取餐号: ', en: 'Pickup no.: ', es: 'Nº de recogida: ' } },
    { key: 'kds.pickupNoTitle', page: 'kds', desc: '取餐号标题', trans: { zh: '取餐号', en: 'Pickup no.', es: 'Nº de recogida' } },
    { key: 'kds.popupBlocked', page: 'kds', desc: '请允许弹窗打印', trans: { zh: '请允许弹出窗口以打印小票', en: 'Please allow popups to print receipt', es: 'Permita ventanas emergentes para imprimir el recibo' } },
    { key: 'kds.prepDone', page: 'kds', desc: '制作完成', trans: { zh: '制作完成', en: 'Preparation done', es: 'Preparación lista' } },
    { key: 'kds.preparing', page: 'kds', desc: '制作中', trans: { zh: '制作中', en: 'Preparing', es: 'Preparando' } },
    { key: 'kds.ready', page: 'kds', desc: '待取餐', trans: { zh: '待取餐', en: 'Ready', es: 'Listo' } },
    { key: 'kds.receiptBtn', page: 'kds', desc: '小票按钮', trans: { zh: '🖨️ 小票', en: '🖨️ Receipt', es: '🖨️ Recibo' } },
    { key: 'kds.receiptTitle', page: 'kds', desc: '小票标题', trans: { zh: '小票', en: 'Receipt', es: 'Recibo' } },
    { key: 'kds.refresh', page: 'kds', desc: '刷新', trans: { zh: '刷新', en: 'Refresh', es: 'Actualizar' } },
    { key: 'kds.startPrep', page: 'kds', desc: '开始制作', trans: { zh: '开始制作', en: 'Start preparing', es: 'Empezar a preparar' } },
    { key: 'kds.statusUpdated', page: 'kds', desc: '状态已更新', trans: { zh: '状态已更新', en: 'Status updated', es: 'Estado actualizado' } },
    { key: 'kds.subtotal', page: 'kds', desc: '小计', trans: { zh: '小计: ', en: 'Subtotal: ', es: 'Subtotal: ' } },
    { key: 'kds.takeout', page: 'kds', desc: '自取', trans: { zh: '自取', en: 'Pickup', es: 'Recoger' } },
    { key: 'kds.tax', page: 'kds', desc: '税费', trans: { zh: '税费: ', en: 'Tax: ', es: 'Impuestos: ' } },
    { key: 'kds.thanks', page: 'kds', desc: '谢谢惠顾', trans: { zh: '谢谢惠顾，欢迎下次光临！', en: 'Thank you, come again!', es: '¡Gracias, vuelva pronto!' } },
    { key: 'kds.time', page: 'kds', desc: '时间', trans: { zh: '时间: ', en: 'Time: ', es: 'Hora: ' } },
    { key: 'kds.title', page: 'kds', desc: '厨房显示系统', trans: { zh: '厨房显示系统 KDS', en: 'Kitchen Display System KDS', es: 'Sistema de pantalla de cocina KDS' } },
    { key: 'kds.todayCompleted', page: 'kds', desc: '今日完成', trans: { zh: '今日完成', en: 'Completed today', es: 'Completados hoy' } },
    { key: 'kds.total', page: 'kds', desc: '合计', trans: { zh: '合计: ', en: 'Total: ', es: 'Total: ' } },
    { key: 'kds.type', page: 'kds', desc: '类型', trans: { zh: '类型: ', en: 'Type: ', es: 'Tipo: ' } },
    { key: 'kds.waitPrefix', page: 'kds', desc: '等待前缀', trans: { zh: '等待', en: 'wait ', es: 'espera ' } },
    { key: 'layout.adminTitle', page: 'layout', desc: '侧边栏品牌名', trans: { zh: 'OnlyOne 管理', en: 'OnlyOne Admin', es: 'OnlyOne Admin' } },
    { key: 'layout.switchToDay', page: 'layout', desc: '切换日间模式提示', trans: { zh: '切换到日间模式', en: 'Switch to light mode', es: 'Cambiar a modo claro' } },
    { key: 'layout.switchToNight', page: 'layout', desc: '切换夜间模式提示', trans: { zh: '切换到夜间模式', en: 'Switch to dark mode', es: 'Cambiar a modo oscuro' } },
    { key: 'layout.viewFrontend', page: 'layout', desc: '查看前台链接', trans: { zh: '查看前台', en: 'View Storefront', es: 'Ver Tienda' } },
    { key: 'role.admin', page: 'layout', desc: '超级管理员角色名', trans: { zh: '超级管理员', en: 'Super Admin', es: 'Superadministrador' } },
    { key: 'role.manager', page: 'layout', desc: '管理员角色名', trans: { zh: '管理员', en: 'Manager', es: 'Gerente' } },
    { key: 'role.user', page: 'layout', desc: '普通用户角色名', trans: { zh: '用户', en: 'User', es: 'Usuario' } },
    { key: 'login.adminHint', page: 'login', desc: '管理员登录提示', trans: { zh: '管理员登录进入管理后台', en: 'Admins: log in to access the admin panel', es: 'Administradores: inicie sesión para el panel de administración' } },
    { key: 'login.backToFrontend', page: 'login', desc: '返回前台链接', trans: { zh: '返回前台', en: 'Back to storefront', es: 'Volver a la tienda' } },
    { key: 'login.button', page: 'login', desc: '登录按钮', trans: { zh: '登 录', en: 'Login', es: 'Iniciar Sesión' } },
    { key: 'login.defaultAccount', page: 'login', desc: '默认账号提示', trans: { zh: '默认账号：admin / admin', en: 'Default account: admin / admin', es: 'Cuenta predeterminada: admin / admin' } },
    { key: 'login.employeeHint', page: 'login', desc: '员工登录提示', trans: { zh: '员工登录进入点餐界面', en: 'Employees: log in to access ordering', es: 'Empleados: inicie sesión para tomar pedidos' } },
    { key: 'login.enterCredentials', page: 'login', desc: '请输入账号和密码', trans: { zh: '请输入账号和密码', en: 'Please enter username and password', es: 'Por favor ingrese usuario y contraseña' } },
    { key: 'login.enterPassword', page: 'login', desc: '密码输入框占位符', trans: { zh: '请输入密码', en: 'Enter password', es: 'Ingrese contraseña' } },
    { key: 'login.enterUsername', page: 'login', desc: '账号输入框占位符', trans: { zh: '请输入账号', en: 'Enter username', es: 'Ingrese usuario' } },
    { key: 'login.logging', page: 'login', desc: '登录中按钮文字', trans: { zh: '登录中...', en: 'Logging in...', es: 'Iniciando sesión...' } },
    { key: 'login.subtitle', page: 'login', desc: '登录页副标题', trans: { zh: '一站式管理系统', en: 'All-in-one Management System', es: 'Sistema de Gestión Integral' } },
    { key: 'login.success', page: 'login', desc: '登录成功提示', trans: { zh: '登录成功', en: 'Login successful', es: 'Inicio de sesión exitoso' } },
    { key: 'members.addBtn', page: 'members', desc: '新增会员按钮', trans: { zh: '+ 新增会员', en: '+ Add member', es: '+ Añadir socio' } },
    { key: 'members.addTitle', page: 'members', desc: '新增会员', trans: { zh: '新增会员', en: 'Add member', es: 'Añadir socio' } },
    { key: 'members.added', page: 'members', desc: '会员添加成功', trans: { zh: '会员添加成功', en: 'Member added', es: 'Socio añadido' } },
    { key: 'members.allLevels', page: 'members', desc: '全部等级', trans: { zh: '全部等级', en: 'All levels', es: 'Todos los niveles' } },
    { key: 'members.birthday', page: 'members', desc: '生日', trans: { zh: '生日', en: 'Birthday', es: 'Cumpleaños' } },
    { key: 'members.birthdayColon', page: 'members', desc: '生日冒号', trans: { zh: '生日：', en: 'Birthday: ', es: 'Cumpleaños: ' } },
    { key: 'members.colMember', page: 'members', desc: '会员列', trans: { zh: '会员', en: 'Member', es: 'Socio' } },
    { key: 'members.confirmAdjust', page: 'members', desc: '确认调整', trans: { zh: '确认调整', en: 'Confirm adjust', es: 'Confirmar ajuste' } },
    { key: 'members.couponExpired', page: 'members', desc: '已过期', trans: { zh: '已过期', en: 'Expired', es: 'Caducado' } },
    { key: 'members.couponUnused', page: 'members', desc: '未使用', trans: { zh: '未使用', en: 'Unused', es: 'No usado' } },
    { key: 'members.couponUsed', page: 'members', desc: '已使用', trans: { zh: '已使用', en: 'Used', es: 'Usado' } },
    { key: 'members.couponsTitle', page: 'members', desc: '优惠券标题', trans: { zh: '优惠券', en: 'Coupons', es: 'Cupones' } },
    { key: 'members.deleteMsgPrefix', page: 'members', desc: '删除会员前缀', trans: { zh: '确定删除会员“', en: 'Delete member "', es: 'Eliminar socio "' } },
    { key: 'members.deleteMsgSuffix', page: 'members', desc: '删除会员后缀', trans: { zh: '”吗？', en: '"?', es: '"?' } },
    { key: 'members.deleteTitle', page: 'members', desc: '删除会员', trans: { zh: '删除会员', en: 'Delete member', es: 'Eliminar socio' } },
    { key: 'members.deleted', page: 'members', desc: '会员已删除', trans: { zh: '会员已删除', en: 'Member deleted', es: 'Socio eliminado' } },
    { key: 'members.detail', page: 'members', desc: '详情', trans: { zh: '详情', en: 'Detail', es: 'Detalle' } },
    { key: 'members.detailTitle', page: 'members', desc: '会员详情', trans: { zh: '会员详情', en: 'Member detail', es: 'Detalle del socio' } },
    { key: 'members.editTitle', page: 'members', desc: '编辑会员', trans: { zh: '编辑会员', en: 'Edit member', es: 'Editar socio' } },
    { key: 'members.email', page: 'members', desc: '邮箱', trans: { zh: '邮箱', en: 'Email', es: 'Correo' } },
    { key: 'members.emailColon', page: 'members', desc: '邮箱冒号', trans: { zh: '邮箱：', en: 'Email: ', es: 'Correo: ' } },
    { key: 'members.level', page: 'members', desc: '等级', trans: { zh: '等级', en: 'Level', es: 'Nivel' } },
    { key: 'members.levelColon', page: 'members', desc: '等级冒号', trans: { zh: '等级：', en: 'Level: ', es: 'Nivel: ' } },
    { key: 'members.levelDiamond', page: 'members', desc: '钻石会员', trans: { zh: '钻石会员', en: 'Diamond member', es: 'Socio diamante' } },
    { key: 'members.levelDist', page: 'members', desc: '等级分布', trans: { zh: '等级分布', en: 'Level distribution', es: 'Distribución de niveles' } },
    { key: 'members.levelGold', page: 'members', desc: '金卡会员', trans: { zh: '金卡会员', en: 'Gold member', es: 'Socio oro' } },
    { key: 'members.levelNormal', page: 'members', desc: '普通会员', trans: { zh: '普通会员', en: 'Regular member', es: 'Socio regular' } },
    { key: 'members.levelSilver', page: 'members', desc: '银卡会员', trans: { zh: '银卡会员', en: 'Silver member', es: 'Socio plata' } },
    { key: 'members.nameLabel', page: 'members', desc: '姓名标签', trans: { zh: '姓名 *', en: 'Name *', es: 'Nombre *' } },
    { key: 'members.namePhoneRequired', page: 'members', desc: '姓名手机必填', trans: { zh: '姓名和手机号必填', en: 'Name and phone are required', es: 'Nombre y teléfono obligatorios' } },
    { key: 'members.nextPage', page: 'members', desc: '下一页', trans: { zh: '下一页', en: 'Next', es: 'Siguiente' } },
    { key: 'members.noCoupons', page: 'members', desc: '暂无优惠券', trans: { zh: '暂无优惠券', en: 'No coupons', es: 'Sin cupones' } },
    { key: 'members.noMembers', page: 'members', desc: '暂无会员', trans: { zh: '暂无会员，点击右上角添加', en: 'No members, click top right to add', es: 'Sin socios, haga clic arriba a la derecha' } },
    { key: 'members.noOrders', page: 'members', desc: '暂无订单', trans: { zh: '暂无订单', en: 'No orders', es: 'Sin pedidos' } },
    { key: 'members.noteColon', page: 'members', desc: '备注冒号', trans: { zh: '备注：', en: 'Note: ', es: 'Nota: ' } },
    { key: 'members.pageSuffix', page: 'members', desc: '分页页', trans: { zh: '页', en: '', es: '' } },
    { key: 'members.phoneColon', page: 'members', desc: '手机号冒号', trans: { zh: '手机号：', en: 'Phone: ', es: 'Teléfono: ' } },
    { key: 'members.phoneLabel', page: 'members', desc: '手机号标签', trans: { zh: '手机号 *', en: 'Phone *', es: 'Teléfono *' } },
    { key: 'members.points', page: 'members', desc: '积分', trans: { zh: '积分', en: 'Points', es: 'Puntos' } },
    { key: 'members.pointsAdjustTitle', page: 'members', desc: '积分调整', trans: { zh: '积分调整', en: 'Adjust points', es: 'Ajustar puntos' } },
    { key: 'members.pointsAdjusted', page: 'members', desc: '积分已调整', trans: { zh: '积分已调整', en: 'Points adjusted', es: 'Puntos ajustados' } },
    { key: 'members.pointsBtn', page: 'members', desc: '积分按钮', trans: { zh: '积分', en: 'Points', es: 'Puntos' } },
    { key: 'members.pointsColon', page: 'members', desc: '积分冒号', trans: { zh: '积分：', en: 'Points: ', es: 'Puntos: ' } },
    { key: 'members.pointsPh', page: 'members', desc: '积分占位', trans: { zh: '如：100 或 -50', en: 'e.g. 100 or -50', es: 'p. ej. 100 o -50' } },
    { key: 'members.pointsQtyLabel', page: 'members', desc: '积分数量标签', trans: { zh: '积分数量（正数增加，负数扣减）', en: 'Points (positive adds, negative subtracts)', es: 'Puntos (positivo suma, negativo resta)' } },
    { key: 'members.pointsRequired', page: 'members', desc: '请输入积分', trans: { zh: '请输入积分数量', en: 'Enter points amount', es: 'Ingrese la cantidad de puntos' } },
    { key: 'members.prevPage', page: 'members', desc: '上一页', trans: { zh: '上一页', en: 'Previous', es: 'Anterior' } },
    { key: 'members.reason', page: 'members', desc: '原因', trans: { zh: '原因', en: 'Reason', es: 'Motivo' } },
    { key: 'members.reasonPh', page: 'members', desc: '原因占位', trans: { zh: '如：消费赠送、活动奖励', en: 'e.g. purchase gift, promotion reward', es: 'p. ej. regalo por compra, promoción' } },
    { key: 'members.recentOrders', page: 'members', desc: '最近订单', trans: { zh: '最近订单', en: 'Recent orders', es: 'Pedidos recientes' } },
    { key: 'members.registerTime', page: 'members', desc: '注册时间', trans: { zh: '注册时间', en: 'Registered', es: 'Registrado' } },
    { key: 'members.registered', page: 'members', desc: '注册冒号', trans: { zh: '注册：', en: 'Registered: ', es: 'Registrado: ' } },
    { key: 'members.searchPh', page: 'members', desc: '搜索占位', trans: { zh: '搜索姓名/手机号...', en: 'Search name/phone...', es: 'Buscar nombre/teléfono...' } },
    { key: 'members.subtitle', page: 'members', desc: '会员副标题', trans: { zh: '管理会员信息、积分、等级和优惠券', en: 'Manage members, points, levels and coupons', es: 'Gestionar socios, puntos, niveles y cupones' } },
    { key: 'members.title', page: 'members', desc: '会员管理', trans: { zh: '👑 会员管理', en: '👑 Member management', es: '👑 Gestión de socios' } },
    { key: 'members.todayNew', page: 'members', desc: '今日新增', trans: { zh: '今日新增', en: 'New today', es: 'Nuevos hoy' } },
    { key: 'members.totalMembers', page: 'members', desc: '会员总数', trans: { zh: '会员总数', en: 'Total members', es: 'Total de socios' } },
    { key: 'members.totalMiddle', page: 'members', desc: '分页条第', trans: { zh: '条，第', en: 'items, page', es: 'ítems, página' } },
    { key: 'members.totalPoints', page: 'members', desc: '积分总数', trans: { zh: '积分总数', en: 'Total points', es: 'Total de puntos' } },
    { key: 'members.totalPrefix', page: 'members', desc: '分页共', trans: { zh: '共', en: 'Total', es: 'Total' } },
    { key: 'members.totalSpent', page: 'members', desc: '累计消费', trans: { zh: '累计消费', en: 'Total spent', es: 'Gasto total' } },
    { key: 'members.totalSpentColon', page: 'members', desc: '累计消费冒号', trans: { zh: '累计消费：', en: 'Total spent: ', es: 'Gasto total: ' } },
    { key: 'members.updated', page: 'members', desc: '会员信息已更新', trans: { zh: '会员信息已更新', en: 'Member updated', es: 'Socio actualizado' } },
    { key: 'menu.add', page: 'menu', desc: '加入按钮', trans: { zh: '+ 加入', en: '+ Add', es: '+ Añadir' } },
    { key: 'menu.addedToCart', page: 'menu', desc: '已加入购物车提示', trans: { zh: '已加入购物车', en: 'Added to cart', es: 'Añadido al carrito' } },
    { key: 'menu.all', page: 'menu', desc: '全部分类', trans: { zh: '全部', en: 'All', es: 'Todo' } },
    { key: 'menu.backToCart', page: 'menu', desc: '返回购物车', trans: { zh: '返回购物车', en: 'Back to Cart', es: 'Volver al carrito' } },
    { key: 'menu.backToHome', page: 'menu', desc: '返回首页', trans: { zh: '返回首页', en: 'Back to Home', es: 'Volver al Inicio' } },
    { key: 'menu.cartEmpty', page: 'menu', desc: '购物车为空提示', trans: { zh: '购物车是空的', en: 'Cart is empty', es: 'El carrito está vacío' } },
    { key: 'menu.cartTitle', page: 'menu', desc: '购物车标题', trans: { zh: '购物车', en: 'Cart', es: 'Carrito' } },
    { key: 'menu.checkout', page: 'menu', desc: '去结算', trans: { zh: '去结算', en: 'Checkout', es: 'Ir a pagar' } },
    { key: 'menu.clear', page: 'menu', desc: '清空', trans: { zh: '清空', en: 'Clear', es: 'Limpiar' } },
    { key: 'menu.closedBtn', page: 'menu', desc: '休息中按钮', trans: { zh: '休息中', en: 'Closed', es: 'Cerrado' } },
    { key: 'menu.closedWarning', page: 'menu', desc: '门店休息警告', trans: { zh: '今日门店休息，暂不接受下单', en: 'Closed today, no orders accepted', es: 'Cerrado hoy, no se aceptan pedidos' } },
    { key: 'menu.customNotePlaceholder', page: 'menu', desc: '自定义备注占位符', trans: { zh: '自定义备注（如：少放盐、打包等）', en: 'Custom note (e.g., less salt, to go)', es: 'Nota personalizada (p. ej., menos sal, para llevar)' } },
    { key: 'menu.editFlavor', page: 'menu', desc: '改口味', trans: { zh: '改口味', en: 'Edit Flavor', es: 'Editar sabor' } },
    { key: 'menu.history', page: 'menu', desc: '历史记录', trans: { zh: '历史记录', en: 'History', es: 'Historial' } },
    { key: 'menu.itemsPrefix', page: 'menu', desc: '商品数量前缀', trans: { zh: '共', en: '', es: '' } },
    { key: 'menu.itemsSuffix', page: 'menu', desc: '商品数量后缀', trans: { zh: '件商品', en: 'items', es: 'artículos' } },
    { key: 'menu.noHistory', page: 'menu', desc: '无历史订单', trans: { zh: '暂无历史订单', en: 'No order history', es: 'Sin historial de pedidos' } },
    { key: 'menu.noProductsInCategory', page: 'menu', desc: '分类无商品', trans: { zh: '该分类暂无商品', en: 'No products in this category', es: 'No hay productos en esta categoría' } },
    { key: 'menu.reorder', page: 'menu', desc: '再来一单', trans: { zh: '再来一单', en: 'Reorder', es: 'Repetir pedido' } },
    { key: 'menu.selectFlavor', page: 'menu', desc: '选口味', trans: { zh: '选口味', en: 'Select Flavor', es: 'Seleccionar sabor' } },
    { key: 'menu.selectFlavorTitle', page: 'menu', desc: '口味选择标题', trans: { zh: '选择口味', en: 'Select Flavor', es: 'Seleccionar sabor' } },
    { key: 'menu.selected', page: 'menu', desc: '已选前缀', trans: { zh: '已选', en: 'Selected', es: 'Seleccionado' } },
    { key: 'menu.selectedUnit', page: 'menu', desc: '已选单位', trans: { zh: '项', en: 'items', es: 'ítems' } },
    { key: 'menu.singleChoice', page: 'menu', desc: '单选标记', trans: { zh: '（单选）', en: '(Single choice)', es: '(Opción única)' } },
    { key: 'menu.total', page: 'menu', desc: '合计', trans: { zh: '合计', en: 'Total', es: 'Total' } },
    { key: 'menus.addMenu', page: 'menus', desc: '添加菜单', trans: { zh: '添加菜单', en: 'Add Menu', es: 'Agregar menú' } },
    { key: 'menus.addSubmenu', page: 'menus', desc: '加子菜单', trans: { zh: '加子菜单', en: 'Add Sub-menu', es: 'Agregar submenú' } },
    { key: 'menus.added', page: 'menus', desc: '添加成功', trans: { zh: '添加成功', en: 'Added successfully', es: 'Agregado correctamente' } },
    { key: 'menus.confirmDeleteMsg', page: 'menus', desc: '确定删除菜单', trans: { zh: '确定删除？子菜单也会被删除', en: 'Are you sure? Sub-menus will also be deleted.', es: '¿Está seguro? Los submenús también se eliminarán.' } },
    { key: 'menus.confirmDeleteTitle', page: 'menus', desc: '删除菜单', trans: { zh: '删除菜单', en: 'Delete Menu', es: 'Eliminar menú' } },
    { key: 'menus.deleted', page: 'menus', desc: '已删除', trans: { zh: '已删除', en: 'Deleted', es: 'Eliminado' } },
    { key: 'menus.desc', page: 'menus', desc: '菜单管理说明', trans: { zh: '管理后台侧边栏菜单，支持一级二级菜单', en: 'Manage backend sidebar menus, supports 1st and 2nd level menus', es: 'Gestionar menús de la barra lateral del backend, soporta menús de 1er y 2do nivel' } },
    { key: 'menus.disabled', page: 'menus', desc: '停用', trans: { zh: '停用', en: 'Disabled', es: 'Deshabilitado' } },
    { key: 'menus.editMenu', page: 'menus', desc: '编辑菜单', trans: { zh: '编辑菜单', en: 'Edit Menu', es: 'Editar menú' } },
    { key: 'menus.empty', page: 'menus', desc: '暂无菜单', trans: { zh: '暂无菜单', en: 'No menus yet', es: 'No hay menús' } },
    { key: 'menus.enableLabel', page: 'menus', desc: '启用', trans: { zh: '启用', en: 'Enable', es: 'Habilitar' } },
    { key: 'menus.enabled', page: 'menus', desc: '启用', trans: { zh: '启用', en: 'Enabled', es: 'Habilitado' } },
    { key: 'menus.iconLabel', page: 'menus', desc: '图标', trans: { zh: '图标（emoji）', en: 'Icon (emoji)', es: 'Ícono (emoji)' } },
    { key: 'menus.level1', page: 'menus', desc: '一级', trans: { zh: '一级', en: 'Level 1', es: 'Nivel 1' } },
    { key: 'menus.level2', page: 'menus', desc: '二级', trans: { zh: '二级', en: 'Level 2', es: 'Nivel 2' } },
    { key: 'menus.levelCol', page: 'menus', desc: '层级列', trans: { zh: '层级', en: 'Level', es: 'Nivel' } },
    { key: 'menus.nameCol', page: 'menus', desc: '菜单名称列', trans: { zh: '菜单名称', en: 'Menu Name', es: 'Nombre del menú' } },
    { key: 'menus.nameLabel', page: 'menus', desc: '菜单名称', trans: { zh: '菜单名称 *', en: 'Menu Name *', es: 'Nombre del menú *' } },
    { key: 'menus.nameRequired', page: 'menus', desc: '菜单名称必填', trans: { zh: '菜单名称必填', en: 'Menu name is required', es: 'El nombre del menú es obligatorio' } },
    { key: 'menus.parentMenu', page: 'menus', desc: '上级菜单', trans: { zh: '上级菜单', en: 'Parent Menu', es: 'Menú principal' } },
    { key: 'menus.pathCol', page: 'menus', desc: '路径列', trans: { zh: '路径', en: 'Path', es: 'Ruta' } },
    { key: 'menus.routePath', page: 'menus', desc: '路由路径', trans: { zh: '路由路径', en: 'Route Path', es: 'Ruta' } },
    { key: 'menus.sortCol', page: 'menus', desc: '排序列', trans: { zh: '排序', en: 'Sort', es: 'Orden' } },
    { key: 'menus.topLevel', page: 'menus', desc: '一级菜单', trans: { zh: '一级菜单（无上级）', en: 'Top-level menu (no parent)', es: 'Menú de nivel superior (sin principal)' } },
    { key: 'menus.updated', page: 'menus', desc: '更新成功', trans: { zh: '更新成功', en: 'Updated successfully', es: 'Actualizado correctamente' } },
    { key: 'milkTea.addIce', page: 'milkTea', desc: '加冰块按钮', trans: { zh: '+ 加冰块', en: '+ Add Ice', es: '+ Añadir hielo' } },
    { key: 'milkTea.addMilk', page: 'milkTea', desc: '加牛奶按钮', trans: { zh: '+ 加牛奶', en: '+ Add Milk', es: '+ Añadir leche' } },
    { key: 'milkTea.blackTea', page: 'milkTea', desc: '红茶', trans: { zh: '红茶', en: 'Black Tea', es: 'Té negro' } },
    { key: 'milkTea.coconut', page: 'milkTea', desc: '椰果', trans: { zh: '椰果', en: 'Coconut Jelly', es: 'Gelatina de coco' } },
    { key: 'milkTea.currentFormula', page: 'milkTea', desc: '当前配方', trans: { zh: '当前配方', en: 'Current Formula', es: 'Fórmula actual' } },
    { key: 'milkTea.finish', page: 'milkTea', desc: '封顶完成', trans: { zh: '封顶完成', en: 'Finish & Seal', es: 'Terminar' } },
    { key: 'milkTea.greenTea', page: 'milkTea', desc: '绿茶', trans: { zh: '绿茶', en: 'Green Tea', es: 'Té verde' } },
    { key: 'milkTea.ice', page: 'milkTea', desc: '冰', trans: { zh: '冰', en: 'Ice', es: 'Hielo' } },
    { key: 'milkTea.iceAdded', page: 'milkTea', desc: '已加冰块', trans: { zh: '✓ 已加冰块', en: '✓ Ice Added', es: '✓ Hielo añadido' } },
    { key: 'milkTea.interactive', page: 'milkTea', desc: '互动体验标签', trans: { zh: '互动体验', en: 'Interactive Experience', es: 'Experiencia interactiva' } },
    { key: 'milkTea.milk', page: 'milkTea', desc: '牛奶', trans: { zh: '牛奶', en: 'Milk', es: 'Leche' } },
    { key: 'milkTea.milkAdded', page: 'milkTea', desc: '已加牛奶', trans: { zh: '✓ 已加牛奶', en: '✓ Milk Added', es: '✓ Leche añadida' } },
    { key: 'milkTea.oolong', page: 'milkTea', desc: '乌龙茶', trans: { zh: '乌龙茶', en: 'Oolong Tea', es: 'Té Oolong' } },
    { key: 'milkTea.pearl', page: 'milkTea', desc: '珍珠', trans: { zh: '珍珠', en: 'Pearls', es: 'Perlas' } },
    { key: 'milkTea.pudding', page: 'milkTea', desc: '布丁', trans: { zh: '布丁', en: 'Pudding', es: 'Pudín' } },
    { key: 'milkTea.reset', page: 'milkTea', desc: '重新制作', trans: { zh: '重新制作', en: 'Start Over', es: 'Reiniciar' } },
    { key: 'milkTea.selectToStart', page: 'milkTea', desc: '选择茶底开始', trans: { zh: '选择茶底开始制作', en: 'Select a tea base to start', es: 'Seleccione una base de té para empezar' } },
    { key: 'milkTea.step1', page: 'milkTea', desc: '步骤1', trans: { zh: '选择茶底', en: 'Choose Tea Base', es: 'Elegir base de té' } },
    { key: 'milkTea.step2', page: 'milkTea', desc: '步骤2', trans: { zh: '加牛奶', en: 'Add Milk', es: 'Añadir leche' } },
    { key: 'milkTea.step3', page: 'milkTea', desc: '步骤3', trans: { zh: '加小料', en: 'Add Toppings', es: 'Añadir ingredientes' } },
    { key: 'milkTea.step4', page: 'milkTea', desc: '步骤4', trans: { zh: '加冰块', en: 'Add Ice', es: 'Añadir hielo' } },
    { key: 'milkTea.subtitle', page: 'milkTea', desc: '互动副标题', trans: { zh: '点击配料，亲手调一杯属于你的奶茶', en: 'Tap ingredients to craft your own milk tea', es: 'Toca los ingredientes para crear tu propio té con leche' } },
    { key: 'milkTea.tiGuanYin', page: 'milkTea', desc: '铁观音', trans: { zh: '铁观音', en: 'Tie Guan Yin', es: 'Tie Guan Yin' } },
    { key: 'milkTea.title', page: 'milkTea', desc: '一杯奶茶的诞生', trans: { zh: '一杯奶茶的诞生', en: 'The Birth of a Milk Tea', es: 'El nacimiento de un té con leche' } },
    { key: 'order.markReady', page: 'order', desc: '制作完成按钮', trans: { zh: '制作完成', en: 'Mark Ready', es: 'Marcar Listo' } },
    { key: 'order.startPreparing', page: 'order', desc: '开始制作按钮', trans: { zh: '开始制作', en: 'Start Preparing', es: 'Empezar a Preparar' } },
    { key: 'orderStatus.cancelledMsg', page: 'orderStatus', desc: '已取消提示', trans: { zh: '该订单已取消，如有疑问请联系店家', en: 'This order has been cancelled, please contact the store for questions', es: 'Este pedido ha sido cancelado, contáctenos si tiene preguntas' } },
    { key: 'orderStatus.completedMsg', page: 'orderStatus', desc: '已完成消息', trans: { zh: '感谢您的惠顾，期待下次光临！', en: 'Thank you for visiting, see you next time!', es: '¡Gracias por su visita, esperamos verle pronto!' } },
    { key: 'orderStatus.currentTable', page: 'orderStatus', desc: '当前餐桌', trans: { zh: '当前餐桌', en: 'Current Table', es: 'Mesa actual' } },
    { key: 'orderStatus.customerName', page: 'orderStatus', desc: '客人姓名', trans: { zh: '客人姓名', en: 'Customer Name', es: 'Nombre del cliente' } },
    { key: 'orderStatus.customerPhone', page: 'orderStatus', desc: '联系电话', trans: { zh: '联系电话', en: 'Contact Phone', es: 'Teléfono de contacto' } },
    { key: 'orderStatus.delivery', page: 'orderStatus', desc: '配送', trans: { zh: '配送', en: 'Delivery', es: 'Entrega' } },
    { key: 'orderStatus.deliveryAddress', page: 'orderStatus', desc: '配送地址', trans: { zh: '配送地址', en: 'Delivery Address', es: 'Dirección de entrega' } },
    { key: 'orderStatus.dineIn', page: 'orderStatus', desc: '堂吃', trans: { zh: '堂吃', en: 'Dine In', es: 'Consumir en el local' } },
    { key: 'orderStatus.enterOrderNo', page: 'orderStatus', desc: '请输入订单号', trans: { zh: '请输入订单号', en: 'Please enter order number', es: 'Ingrese el número de pedido' } },
    { key: 'orderStatus.itemFallback', page: 'orderStatus', desc: '商品默认名', trans: { zh: '商品', en: 'Item', es: 'Artículo' } },
    { key: 'orderStatus.itemsDetail', page: 'orderStatus', desc: '商品明细', trans: { zh: '商品明细', en: 'Order Items', es: 'Detalle de productos' } },
    { key: 'orderStatus.myOrders', page: 'orderStatus', desc: '我的订单', trans: { zh: '我的订单', en: 'My Orders', es: 'Mis pedidos' } },
    { key: 'orderStatus.noOrders', page: 'orderStatus', desc: '没有订单', trans: { zh: '还没有订单', en: 'No orders yet', es: 'Sin pedidos aún' } },
    { key: 'orderStatus.noOrdersHint', page: 'orderStatus', desc: '无订单提示', trans: { zh: '本设备和当前餐桌的订单会显示在这里', en: 'Orders from this device and current table will appear here', es: 'Los pedidos de este dispositivo y mesa actual aparecerán aquí' } },
    { key: 'orderStatus.note', page: 'orderStatus', desc: '备注', trans: { zh: '备注', en: 'Note', es: 'Nota' } },
    { key: 'orderStatus.orderNoPlaceholder', page: 'orderStatus', desc: '订单号占位符', trans: { zh: '输入订单号', en: 'Enter order number', es: 'Ingrese número de pedido' } },
    { key: 'orderStatus.orderTime', page: 'orderStatus', desc: '下单时间', trans: { zh: '下单时间', en: 'Order Time', es: 'Hora del pedido' } },
    { key: 'orderStatus.ordersCount', page: 'orderStatus', desc: '订单数量单位', trans: { zh: '笔', en: 'orders', es: 'pedidos' } },
    { key: 'orderStatus.pendingMsg', page: 'orderStatus', desc: '待确认消息', trans: { zh: '订单已提交，店家正在确认，请稍候...', en: 'Order submitted, the store is confirming, please wait...', es: 'Pedido enviado, la tienda está confirmando, espere...' } },
    { key: 'orderStatus.pickupInfo', page: 'orderStatus', desc: '取餐信息', trans: { zh: '取餐信息', en: 'Pickup Info', es: 'Información de recogida' } },
    { key: 'orderStatus.preparingMsg', page: 'orderStatus', desc: '制作中消息', trans: { zh: '正在为您精心制作，请耐心等待...', en: 'Preparing your order with care, please wait...', es: 'Preparando su pedido con cuidado, espere...' } },
    { key: 'orderStatus.readyDeliveryMsg', page: 'orderStatus', desc: '配送中消息', trans: { zh: '骑手正在配送中，请注意接听电话', en: 'Rider is on the way, please answer your phone', es: 'El repartidor está en camino, atienda su teléfono' } },
    { key: 'orderStatus.readyPickupMsg', page: 'orderStatus', desc: '待取餐消息', trans: { zh: '您的餐品已做好，请到柜台出示订单号取餐', en: 'Your order is ready, please show order number at counter', es: 'Su pedido está listo, muestre el número de pedido en el mostrador' } },
    { key: 'orderStatus.refresh', page: 'orderStatus', desc: '刷新', trans: { zh: '刷新', en: 'Refresh', es: 'Actualizar' } },
    { key: 'orderStatus.searchByOrderNo', page: 'orderStatus', desc: '按订单号查询', trans: { zh: '按订单号查询', en: 'Search by Order No.', es: 'Buscar por Nº de pedido' } },
    { key: 'orderStatus.searchHint', page: 'orderStatus', desc: '查询提示', trans: { zh: '换了设备？用订单号也能查到你的订单', en: 'Switched devices? You can still find your order by order number', es: '¿Cambió de dispositivo? Puede encontrar su pedido con el número de pedido' } },
    { key: 'orderStatus.stepOrdered', page: 'orderStatus', desc: '步骤-下单成功', trans: { zh: '下单成功', en: 'Order Placed', es: 'Pedido realizado' } },
    { key: 'orderStatus.takeout', page: 'orderStatus', desc: '自取', trans: { zh: '自取', en: 'Pickup', es: 'Recoger' } },
    { key: 'orderStatuses.activeFilter', page: 'orderStatuses', desc: '进行中筛选', trans: { zh: '进行中筛选', en: 'Active filter', es: 'Filtro en curso' } },
    { key: 'orderStatuses.addStatusBtn', page: 'orderStatuses', desc: '添加状态按钮', trans: { zh: '+ 添加状态', en: '+ Add status', es: '+ Añadir estado' } },
    { key: 'orderStatuses.addTitle', page: 'orderStatuses', desc: '添加订单状态', trans: { zh: '添加订单状态', en: 'Add order status', es: 'Añadir estado de pedido' } },
    { key: 'orderStatuses.added', page: 'orderStatuses', desc: '添加成功', trans: { zh: '添加成功', en: 'Added successfully', es: 'Añadido correctamente' } },
    { key: 'orderStatuses.baseStatus', page: 'orderStatuses', desc: '底层状态', trans: { zh: '底层状态', en: 'Base status', es: 'Estado base' } },
    { key: 'orderStatuses.baseStatusLabel', page: 'orderStatuses', desc: '底层状态标签', trans: { zh: '底层状态', en: 'Base status', es: 'Estado base' } },
    { key: 'orderStatuses.buttonText', page: 'orderStatuses', desc: '按钮文字', trans: { zh: '按钮文字', en: 'Button text', es: 'Texto del botón' } },
    { key: 'orderStatuses.color', page: 'orderStatuses', desc: '颜色', trans: { zh: '颜色', en: 'Color', es: 'Color' } },
    { key: 'orderStatuses.colorBlue', page: 'orderStatuses', desc: '蓝色', trans: { zh: '蓝色', en: 'Blue', es: 'Azul' } },
    { key: 'orderStatuses.colorGray', page: 'orderStatuses', desc: '灰色', trans: { zh: '灰色', en: 'Gray', es: 'Gris' } },
    { key: 'orderStatuses.colorGreen', page: 'orderStatuses', desc: '绿色', trans: { zh: '绿色', en: 'Green', es: 'Verde' } },
    { key: 'orderStatuses.colorLabel', page: 'orderStatuses', desc: '标签颜色', trans: { zh: '标签颜色', en: 'Tag color', es: 'Color de etiqueta' } },
    { key: 'orderStatuses.colorOrange', page: 'orderStatuses', desc: '橙色', trans: { zh: '橙色', en: 'Orange', es: 'Naranja' } },
    { key: 'orderStatuses.colorRed', page: 'orderStatuses', desc: '红色', trans: { zh: '红色', en: 'Red', es: 'Rojo' } },
    { key: 'orderStatuses.countActive', page: 'orderStatuses', desc: '计入进行中', trans: { zh: '计入“进行中”筛选', en: 'Count as "active"', es: 'Contar como "en curso"' } },
    { key: 'orderStatuses.deleteMsgPrefix', page: 'orderStatuses', desc: '删除状态前缀', trans: { zh: '确定删除状态“', en: 'Delete status "', es: 'Eliminar estado "' } },
    { key: 'orderStatuses.deleteMsgSuffix', page: 'orderStatuses', desc: '删除状态后缀', trans: { zh: '”吗？', en: '"?', es: '"?' } },
    { key: 'orderStatuses.deleteTitle', page: 'orderStatuses', desc: '删除状态', trans: { zh: '删除状态', en: 'Delete status', es: 'Eliminar estado' } },
    { key: 'orderStatuses.deleted', page: 'orderStatuses', desc: '删除成功', trans: { zh: '删除成功', en: 'Deleted successfully', es: 'Eliminado correctamente' } },
    { key: 'orderStatuses.delivery', page: 'orderStatuses', desc: '配送', trans: { zh: '配送', en: 'Delivery', es: 'Entrega a domicilio' } },
    { key: 'orderStatuses.dinein', page: 'orderStatuses', desc: '堂吃', trans: { zh: '堂吃', en: 'Dine-in', es: 'Comer en el local' } },
    { key: 'orderStatuses.diningType', page: 'orderStatuses', desc: '订单类型', trans: { zh: '订单类型', en: 'Order type', es: 'Tipo de pedido' } },
    { key: 'orderStatuses.displayName', page: 'orderStatuses', desc: '显示名称', trans: { zh: '显示名称', en: 'Display name', es: 'Nombre visible' } },
    { key: 'orderStatuses.displayNameLabel', page: 'orderStatuses', desc: '显示名称标签', trans: { zh: '显示名称 *', en: 'Display name *', es: 'Nombre visible *' } },
    { key: 'orderStatuses.displayPh', page: 'orderStatuses', desc: '显示名称占位', trans: { zh: '如：进行中、待取餐、已完成', en: 'e.g. In progress, Ready, Completed', es: 'p. ej. En curso, Listo, Completado' } },
    { key: 'orderStatuses.editTitle', page: 'orderStatuses', desc: '编辑订单状态', trans: { zh: '编辑订单状态', en: 'Edit order status', es: 'Editar estado de pedido' } },
    { key: 'orderStatuses.enabled', page: 'orderStatuses', desc: '启用', trans: { zh: '启用', en: 'Enabled', es: 'Activado' } },
    { key: 'orderStatuses.enabledLabel', page: 'orderStatuses', desc: '启用标签', trans: { zh: '启用', en: 'Enabled', es: 'Activar' } },
    { key: 'orderStatuses.nextLabel', page: 'orderStatuses', desc: '推进按钮文字', trans: { zh: '推进按钮文字', en: 'Advance button text', es: 'Texto del botón de avance' } },
    { key: 'orderStatuses.nextPh', page: 'orderStatuses', desc: '推进按钮占位', trans: { zh: '如：制作完成、确认取餐', en: 'e.g. Done preparing, Confirm pickup', es: 'p. ej. Preparación lista, Confirmar recogida' } },
    { key: 'orderStatuses.nextStatus', page: 'orderStatuses', desc: '下一状态', trans: { zh: '下一状态', en: 'Next status', es: 'Siguiente estado' } },
    { key: 'orderStatuses.nextStatusLabel', page: 'orderStatuses', desc: '下一状态标签', trans: { zh: '下一状态（推进流转）', en: 'Next status (flow)', es: 'Siguiente estado (flujo)' } },
    { key: 'orderStatuses.no', page: 'orderStatuses', desc: '否', trans: { zh: '否', en: 'No', es: 'No' } },
    { key: 'orderStatuses.noNext', page: 'orderStatuses', desc: '无终态', trans: { zh: '无（终态）', en: 'None (terminal)', es: 'Ninguno (terminal)' } },
    { key: 'orderStatuses.noStatus', page: 'orderStatuses', desc: '暂无状态配置', trans: { zh: '暂无状态配置', en: 'No status configs', es: 'Sin configuración de estados' } },
    { key: 'orderStatuses.required', page: 'orderStatuses', desc: '状态标识名称必填', trans: { zh: '状态标识和名称必填', en: 'Status key and label are required', es: 'Clave y nombre del estado obligatorios' } },
    { key: 'orderStatuses.saved', page: 'orderStatuses', desc: '保存成功', trans: { zh: '保存成功', en: 'Saved successfully', es: 'Guardado correctamente' } },
    { key: 'orderStatuses.sort', page: 'orderStatuses', desc: '排序', trans: { zh: '排序', en: 'Sort', es: 'Ordenar' } },
    { key: 'orderStatuses.subtitle', page: 'orderStatuses', desc: '订单状态副标题', trans: { zh: '管理不同订单类型的状态显示、颜色和流转，禁用后该状态不会在前台显示', en: 'Manage status display, colors and flow per order type', es: 'Gestionar visualización, colores y flujo de estados por tipo de pedido' } },
    { key: 'orderStatuses.takeout', page: 'orderStatuses', desc: '打包自取', trans: { zh: '打包/自取', en: 'Takeout/Pickup', es: 'Para llevar/Recoger' } },
    { key: 'orderStatuses.title', page: 'orderStatuses', desc: '订单状态管理', trans: { zh: '订单状态管理', en: 'Order status management', es: 'Gestión de estados de pedido' } },
    { key: 'orderStatuses.yes', page: 'orderStatuses', desc: '是', trans: { zh: '是', en: 'Yes', es: 'Sí' } },
    { key: 'orders.all', page: 'orders', desc: '全部快捷按钮', trans: { zh: '全部', en: 'All', es: 'Todo' } },
    { key: 'orders.allStatus', page: 'orders', desc: '全部状态筛选', trans: { zh: '全部', en: 'All', es: 'Todos' } },
    { key: 'orders.cancelOrder', page: 'orders', desc: '取消订单按钮', trans: { zh: '取消订单', en: 'Cancel Order', es: 'Cancelar Pedido' } },
    { key: 'orders.confirmCancelOrder', page: 'orders', desc: '取消订单确认', trans: { zh: '确定取消此订单？', en: 'Are you sure you want to cancel this order?', es: '¿Está seguro de cancelar este pedido?' } },
    { key: 'orders.confirmComplete', page: 'orders', desc: '确认完成按钮', trans: { zh: '确认完成', en: 'Confirm Complete', es: 'Confirmar Completado' } },
    { key: 'orders.customer', page: 'orders', desc: '顾客列头', trans: { zh: '顾客', en: 'Customer', es: 'Cliente' } },
    { key: 'orders.deliveryAddress', page: 'orders', desc: '配送地址字段标签', trans: { zh: '配送地址', en: 'Delivery Address', es: 'Dirección de Entrega' } },
    { key: 'orders.deliveryFee', page: 'orders', desc: '配送费', trans: { zh: '配送费', en: 'Delivery Fee', es: 'Tarifa de Entrega' } },
    { key: 'orders.diningType', page: 'orders', desc: '取餐方式列头', trans: { zh: '取餐方式', en: 'Dining Type', es: 'Tipo de Entrega' } },
    { key: 'orders.endDate', page: 'orders', desc: '结束时间标签', trans: { zh: '结束时间', en: 'End Time', es: 'Hora de Fin' } },
    { key: 'orders.grandTotal', page: 'orders', desc: '合计', trans: { zh: '合计', en: 'Total', es: 'Total' } },
    { key: 'orders.items', page: 'orders', desc: '商品列头', trans: { zh: '商品', en: 'Items', es: 'Artículos' } },
    { key: 'orders.itemsDetail', page: 'orders', desc: '商品明细标题', trans: { zh: '商品明细', en: 'Item Details', es: 'Detalle de Artículos' } },
    { key: 'orders.itemsUnit', page: 'orders', desc: '件数单位', trans: { zh: '件', en: 'items', es: 'artículos' } },
    { key: 'orders.noData', page: 'orders', desc: '无订单提示', trans: { zh: '该时间段暂无订单', en: 'No orders in this period', es: 'Sin pedidos en este período' } },
    { key: 'orders.note', page: 'orders', desc: '备注字段标签', trans: { zh: '备注', en: 'Note', es: 'Nota' } },
    { key: 'orders.orderDetail', page: 'orders', desc: '订单详情标题', trans: { zh: '订单详情', en: 'Order Details', es: 'Detalles del Pedido' } },
    { key: 'orders.orderNo', page: 'orders', desc: '订单号列头', trans: { zh: '订单号', en: 'Order No.', es: 'N.º de Pedido' } },
    { key: 'orders.orderTime', page: 'orders', desc: '下单时间字段标签', trans: { zh: '下单时间', en: 'Order Time', es: 'Hora del Pedido' } },
    { key: 'orders.perPage', page: 'orders', desc: '每页条数后缀', trans: { zh: '条/页', en: 'per page', es: 'por página' } },
    { key: 'orders.phone', page: 'orders', desc: '电话字段标签', trans: { zh: '电话', en: 'Phone', es: 'Teléfono' } },
    { key: 'orders.query', page: 'orders', desc: '查询按钮', trans: { zh: '查询', en: 'Search', es: 'Buscar' } },
    { key: 'orders.startDate', page: 'orders', desc: '开始时间标签', trans: { zh: '开始时间', en: 'Start Time', es: 'Hora de Inicio' } },
    { key: 'orders.status', page: 'orders', desc: '状态列头', trans: { zh: '状态', en: 'Status', es: 'Estado' } },
    { key: 'orders.subtitle', page: 'orders', desc: '订单管理副标题', trans: { zh: '按日期查询订单，支持按订单号/金额/时间排序', en: 'Search orders by date, sortable by order no./amount/time', es: 'Busque pedidos por fecha, ordene por n.º/monto/hora' } },
    { key: 'orders.subtotal', page: 'orders', desc: '小计', trans: { zh: '小计', en: 'Subtotal', es: 'Subtotal' } },
    { key: 'orders.tax', page: 'orders', desc: '税费', trans: { zh: '税费', en: 'Tax', es: 'Impuesto' } },
    { key: 'orders.thisWeek', page: 'orders', desc: '本周快捷按钮', trans: { zh: '本周', en: 'This Week', es: 'Esta Semana' } },
    { key: 'orders.title', page: 'orders', desc: '订单管理标题', trans: { zh: '订单管理', en: 'Order Management', es: 'Gestión de Pedidos' } },
    { key: 'orders.today', page: 'orders', desc: '今日快捷按钮', trans: { zh: '今日', en: 'Today', es: 'Hoy' } },
    { key: 'orders.total', page: 'orders', desc: '金额列头', trans: { zh: '金额', en: 'Amount', es: 'Monto' } },
    { key: 'orders.totalCount', page: 'orders', desc: '订单总数统计', trans: { zh: '订单总数', en: 'Total Orders', es: 'Total de Pedidos' } },
    { key: 'orders.totalRevenue', page: 'orders', desc: '总金额统计', trans: { zh: '总金额', en: 'Total Revenue', es: 'Ingresos Totales' } },
    { key: 'payment.applePay', page: 'payment', desc: 'Apple Pay', trans: { zh: 'Apple Pay', en: 'Apple Pay', es: 'Apple Pay' } },
    { key: 'payment.applePayDesc', page: 'payment', desc: '非接触支付', trans: { zh: '非接触支付', en: 'Contactless payment', es: 'Pago sin contacto' } },
    { key: 'payment.card', page: 'payment', desc: '刷卡', trans: { zh: '刷卡', en: 'Card', es: 'Tarjeta' } },
    { key: 'payment.cardDesc', page: 'payment', desc: 'Tap to Pay', trans: { zh: 'Tap to Pay', en: 'Tap to Pay', es: 'Tap to Pay' } },
    { key: 'payment.cash', page: 'payment', desc: '现金', trans: { zh: '现金', en: 'Cash', es: 'Efectivo' } },
    { key: 'payment.cashDesc', page: 'payment', desc: '自动弹钱箱', trans: { zh: '自动弹钱箱', en: 'Opens cash drawer', es: 'Abre caja registradora' } },
    { key: 'payment.platform', page: 'payment', desc: '外卖平台', trans: { zh: '外卖平台', en: 'Delivery Platform', es: 'Plataforma de entrega' } },
    { key: 'payment.platformDesc', page: 'payment', desc: 'Uber/DoorDash等', trans: { zh: 'Uber/DoorDash等', en: 'Uber Eats/DoorDash etc.', es: 'Uber Eats/DoorDash etc.' } },
    { key: 'perms.allPerms', page: 'perms', desc: '全部权限', trans: { zh: '全部权限', en: 'All Permissions', es: 'Todos los permisos' } },
    { key: 'perms.allRoles', page: 'perms', desc: '全部角色', trans: { zh: '全部角色', en: 'All Roles', es: 'Todos los roles' } },
    { key: 'perms.appliedAll', page: 'perms', desc: '已全选', trans: { zh: '已全选', en: 'All selected', es: 'Todo seleccionado' } },
    { key: 'perms.appliedNone', page: 'perms', desc: '已全不选', trans: { zh: '已全不选（默认全部可见）', en: 'None selected (all visible by default)', es: 'Ninguno seleccionado (todo visible por defecto)' } },
    { key: 'perms.assignPerm', page: 'perms', desc: '分配权限', trans: { zh: '分配权限', en: 'Assign Permissions', es: 'Asignar permisos' } },
    { key: 'perms.checkMenusHint', page: 'perms', desc: '勾选菜单提示', trans: { zh: '勾选该用户可见的后台菜单，未勾选的菜单将不在侧边栏显示。', en: 'Check the backend menus visible to this user. Unchecked menus will not appear in the sidebar.', es: 'Marque los menús del backend visibles para este usuario. Los menús no marcados no aparecerán en la barra lateral.' } },
    { key: 'perms.desc', page: 'perms', desc: '权限管理说明', trans: { zh: '给管理员(manager)分配可见的后台菜单，超级管理员(admin)默认拥有全部权限。不勾选任何菜单则默认可见全部。', en: 'Assign visible backend menus to managers. Super admins have all permissions by default. No selection means all menus visible.', es: 'Asigne menús visibles del backend a los gerentes. Los superadmins tienen todos los permisos por defecto. Sin selección, todos los menús son visibles.' } },
    { key: 'perms.disabled', page: 'perms', desc: '禁用', trans: { zh: '禁用', en: 'Disabled', es: 'Deshabilitado' } },
    { key: 'perms.editPerm', page: 'perms', desc: '修改权限', trans: { zh: '修改权限', en: 'Edit Permissions', es: 'Editar permisos' } },
    { key: 'perms.employee', page: 'perms', desc: '员工', trans: { zh: '员工', en: 'Employee', es: 'Empleado' } },
    { key: 'perms.empty', page: 'perms', desc: '暂无需要配置权限的用户', trans: { zh: '暂无需要配置权限的用户', en: 'No users need permission configuration', es: 'No hay usuarios que necesiten configuración de permisos' } },
    { key: 'perms.invert', page: 'perms', desc: '反选', trans: { zh: '反选', en: 'Invert', es: 'Invertir' } },
    { key: 'perms.manager', page: 'perms', desc: '管理员', trans: { zh: '管理员', en: 'Manager', es: 'Gerente' } },
    { key: 'perms.menu', page: 'perms', desc: '菜单', trans: { zh: '菜单', en: 'Menu', es: 'Menú' } },
    { key: 'perms.menusCol', page: 'perms', desc: '已配置菜单列', trans: { zh: '已配置菜单', en: 'Configured Menus', es: 'Menús configurados' } },
    { key: 'perms.menusUnit', page: 'perms', desc: '个菜单', trans: { zh: '个菜单', en: 'menus', es: 'menús' } },
    { key: 'perms.noMatch', page: 'perms', desc: '没有匹配的用户', trans: { zh: '没有匹配的用户', en: 'No matching users', es: 'No hay usuarios coincidentes' } },
    { key: 'perms.noPermsDefault', page: 'perms', desc: '无权限默认提示', trans: { zh: '（不选则默认全部可见）', en: '(Not selecting means all visible by default)', es: '(No seleccionar significa todo visible por defecto)' } },
    { key: 'perms.normal', page: 'perms', desc: '正常', trans: { zh: '正常', en: 'Active', es: 'Activo' } },
    { key: 'perms.notConfigured', page: 'perms', desc: '未配置', trans: { zh: '未配置（默认全部可见）', en: 'Not configured (all visible by default)', es: 'No configurado (todo visible por defecto)' } },
    { key: 'perms.notConfiguredShort', page: 'perms', desc: '未配置短', trans: { zh: '未配置', en: 'Not configured', es: 'No configurado' } },
    { key: 'perms.partialPerms', page: 'perms', desc: '部分权限', trans: { zh: '部分权限', en: 'Partial Permissions', es: 'Permisos parciales' } },
    { key: 'perms.permSaved', page: 'perms', desc: '权限保存成功', trans: { zh: '权限保存成功', en: 'Permissions saved successfully', es: 'Permisos guardados correctamente' } },
    { key: 'perms.permStatusCol', page: 'perms', desc: '权限状态列', trans: { zh: '权限状态', en: 'Permission Status', es: 'Estado de permisos' } },
    { key: 'perms.quickTemplates', page: 'perms', desc: '快速模板', trans: { zh: '快速模板（点击应用）', en: 'Quick templates (click to apply)', es: 'Plantillas rápidas (clic para aplicar)' } },
    { key: 'perms.regularUser', page: 'perms', desc: '普通用户', trans: { zh: '普通用户', en: 'Regular User', es: 'Usuario regular' } },
    { key: 'perms.roleCol', page: 'perms', desc: '角色列', trans: { zh: '角色', en: 'Role', es: 'Rol' } },
    { key: 'perms.savePerm', page: 'perms', desc: '保存权限', trans: { zh: '保存权限', en: 'Save Permissions', es: 'Guardar permisos' } },
    { key: 'perms.searchPlaceholder', page: 'perms', desc: '搜索占位符', trans: { zh: '搜索账号 / 姓名...', en: 'Search account / name...', es: 'Buscar cuenta / nombre...' } },
    { key: 'perms.selectAll', page: 'perms', desc: '全选', trans: { zh: '全选', en: 'Select All', es: 'Seleccionar todo' } },
    { key: 'perms.selectNone', page: 'perms', desc: '全不选', trans: { zh: '全不选', en: 'Select None', es: 'Deseleccionar todo' } },
    { key: 'perms.selectedMenus', page: 'perms', desc: '已选菜单', trans: { zh: '已选菜单', en: 'Selected Menus', es: 'Menús seleccionados' } },
    { key: 'perms.selectedMenusCount', page: 'perms', desc: '已选择', trans: { zh: '已选择', en: 'Selected', es: 'Seleccionados' } },
    { key: 'perms.submenu', page: 'perms', desc: '子菜单', trans: { zh: '子菜单', en: 'submenus', es: 'submenús' } },
    { key: 'perms.templateApplied', page: 'perms', desc: '已应用模板', trans: { zh: '已应用模板：', en: 'Template applied: ', es: 'Plantilla aplicada: ' } },
    { key: 'perms.totalLabel', page: 'perms', desc: '共', trans: { zh: '共', en: 'Total', es: 'Total' } },
    { key: 'perms.totalUnit', page: 'perms', desc: '个用户待配置', trans: { zh: '个用户待配置', en: 'users to configure', es: 'usuarios por configurar' } },
    { key: 'perms.tplCashier', page: 'perms', desc: '收银员模板', trans: { zh: '收银员（订单+商品）', en: 'Cashier (Orders + Products)', es: 'Cajero (Pedidos + Productos)' } },
    { key: 'perms.tplCashierDesc', page: 'perms', desc: '收银员模板描述', trans: { zh: '只能管理订单和商品', en: 'Can only manage orders and products', es: 'Solo puede gestionar pedidos y productos' } },
    { key: 'perms.tplContent', page: 'perms', desc: '内容运营模板', trans: { zh: '内容运营（内容+平台）', en: 'Content (Content + Platforms)', es: 'Contenido (Contenido + Plataformas)' } },
    { key: 'perms.tplContentDesc', page: 'perms', desc: '内容运营模板描述', trans: { zh: '管理前台内容和外卖平台', en: 'Manage frontend content and delivery platforms', es: 'Gestionar contenido del frontend y plataformas de entrega' } },
    { key: 'perms.tplKeeper', page: 'perms', desc: '库管员模板', trans: { zh: '库管员（货物+统计）', en: 'Keeper (Goods + Stats)', es: 'Almacenista (Mercancías + Estadísticas)' } },
    { key: 'perms.tplKeeperDesc', page: 'perms', desc: '库管员模板描述', trans: { zh: '管理货物库存和销售统计', en: 'Manage inventory and sales stats', es: 'Gestionar inventario y estadísticas de ventas' } },
    { key: 'perms.tplOwner', page: 'perms', desc: '店长模板', trans: { zh: '店长（全部权限）', en: 'Manager (All permissions)', es: 'Gerente (Todos los permisos)' } },
    { key: 'perms.tplOwnerDesc', page: 'perms', desc: '店长模板描述', trans: { zh: '拥有后台全部菜单权限', en: 'Has all backend menu permissions', es: 'Tiene todos los permisos de menú del backend' } },
    { key: 'perms.tplReadonly', page: 'perms', desc: '只读模板', trans: { zh: '只读权限（查看全部）', en: 'Read-only (View all)', es: 'Solo lectura (Ver todo)' } },
    { key: 'perms.tplReadonlyDesc', page: 'perms', desc: '只读模板描述', trans: { zh: '可查看所有页面但不能修改', en: 'Can view all pages but cannot modify', es: 'Puede ver todas las páginas pero no modificar' } },
    { key: 'perms.userCol', page: 'perms', desc: '用户列', trans: { zh: '用户', en: 'User', es: 'Usuario' } },
    { key: 'platforms.accountCol', page: 'platforms', desc: '账号列', trans: { zh: '账号', en: 'Account', es: 'Cuenta' } },
    { key: 'platforms.accountLabel', page: 'platforms', desc: '账号', trans: { zh: '账号', en: 'Account', es: 'Cuenta' } },
    { key: 'platforms.accountPlaceholder', page: 'platforms', desc: '账号占位符', trans: { zh: '登录账号', en: 'Login account', es: 'Cuenta de inicio de sesión' } },
    { key: 'platforms.addPlatform', page: 'platforms', desc: '添加平台', trans: { zh: '添加平台', en: 'Add Platform', es: 'Agregar plataforma' } },
    { key: 'platforms.added', page: 'platforms', desc: '添加成功', trans: { zh: '添加成功', en: 'Added successfully', es: 'Agregado correctamente' } },
    { key: 'platforms.confirmDeleteMsg', page: 'platforms', desc: '确定删除该平台？', trans: { zh: '确定删除该平台？', en: 'Are you sure you want to delete this platform?', es: '¿Está seguro de eliminar esta plataforma?' } },
    { key: 'platforms.confirmDeleteTitle', page: 'platforms', desc: '删除平台', trans: { zh: '删除平台', en: 'Delete Platform', es: 'Eliminar plataforma' } },
    { key: 'platforms.deleted', page: 'platforms', desc: '已删除', trans: { zh: '已删除', en: 'Deleted', es: 'Eliminado' } },
    { key: 'platforms.desc', page: 'platforms', desc: '平台管理说明', trans: { zh: '管理所有外卖平台的跳转、账号和每周状态', en: 'Manage all delivery platform links, accounts, and weekly status', es: 'Gestionar enlaces, cuentas y estado semanal de todas las plataformas de entrega' } },
    { key: 'platforms.disabled', page: 'platforms', desc: '停用', trans: { zh: '停用', en: 'Disabled', es: 'Deshabilitado' } },
    { key: 'platforms.editPlatform', page: 'platforms', desc: '编辑平台', trans: { zh: '编辑平台', en: 'Edit Platform', es: 'Editar plataforma' } },
    { key: 'platforms.empty', page: 'platforms', desc: '暂无平台', trans: { zh: '暂无平台，点击右上角添加', en: 'No platforms yet, click top right to add', es: 'No hay plataformas, haga clic arriba a la derecha para agregar' } },
    { key: 'platforms.enableLabel', page: 'platforms', desc: '启用该平台', trans: { zh: '启用该平台', en: 'Enable this platform', es: 'Habilitar esta plataforma' } },
    { key: 'platforms.enabled', page: 'platforms', desc: '启用', trans: { zh: '启用', en: 'Enabled', es: 'Habilitado' } },
    { key: 'platforms.hide', page: 'platforms', desc: '隐藏', trans: { zh: '隐藏', en: 'Hide', es: 'Ocultar' } },
    { key: 'platforms.jump', page: 'platforms', desc: '跳转', trans: { zh: '跳转', en: 'Jump', es: 'Ir' } },
    { key: 'platforms.jumpCol', page: 'platforms', desc: '跳转列', trans: { zh: '跳转', en: 'Jump', es: 'Enlace' } },
    { key: 'platforms.logoLabel', page: 'platforms', desc: 'Logo URL', trans: { zh: 'Logo URL', en: 'Logo URL', es: 'URL del logo' } },
    { key: 'platforms.logoPlaceholder', page: 'platforms', desc: 'Logo占位符', trans: { zh: '图片链接', en: 'Image URL', es: 'URL de imagen' } },
    { key: 'platforms.nameLabel', page: 'platforms', desc: '平台名称', trans: { zh: '平台名称 *', en: 'Platform Name *', es: 'Nombre de la plataforma *' } },
    { key: 'platforms.namePlaceholder', page: 'platforms', desc: '平台名称占位符', trans: { zh: '如：DoorDash', en: 'e.g., DoorDash', es: 'Ej.: DoorDash' } },
    { key: 'platforms.nameRequired', page: 'platforms', desc: '平台名称必填', trans: { zh: '平台名称必填', en: 'Platform name is required', es: 'El nombre de la plataforma es obligatorio' } },
    { key: 'platforms.noPhone', page: 'platforms', desc: '无电话', trans: { zh: '无电话', en: 'No phone', es: 'Sin teléfono' } },
    { key: 'platforms.notSet', page: 'platforms', desc: '未设置', trans: { zh: '未设置', en: 'Not set', es: 'No configurado' } },
    { key: 'platforms.noteCol', page: 'platforms', desc: '备注列', trans: { zh: '备注', en: 'Notes', es: 'Notas' } },
    { key: 'platforms.noteLabel', page: 'platforms', desc: '备注', trans: { zh: '备注', en: 'Notes', es: 'Notas' } },
    { key: 'platforms.notePlaceholder', page: 'platforms', desc: '备注占位符', trans: { zh: '其他备注信息', en: 'Other notes', es: 'Otras notas' } },
    { key: 'platforms.passwordLabel', page: 'platforms', desc: '密码', trans: { zh: '密码', en: 'Password', es: 'Contraseña' } },
    { key: 'platforms.passwordPlaceholder', page: 'platforms', desc: '密码占位符', trans: { zh: '登录密码', en: 'Login password', es: 'Contraseña de inicio de sesión' } },
    { key: 'platforms.phoneLabel', page: 'platforms', desc: '联系电话', trans: { zh: '联系电话', en: 'Contact Phone', es: 'Teléfono de contacto' } },
    { key: 'platforms.phonePlaceholder', page: 'platforms', desc: '联系电话占位符', trans: { zh: '平台客服电话', en: 'Platform support phone', es: 'Teléfono de soporte de la plataforma' } },
    { key: 'platforms.platformCol', page: 'platforms', desc: '平台列', trans: { zh: '平台', en: 'Platform', es: 'Plataforma' } },
    { key: 'platforms.show', page: 'platforms', desc: '显示', trans: { zh: '显示', en: 'Show', es: 'Mostrar' } },
    { key: 'platforms.sortLabel', page: 'platforms', desc: '排序', trans: { zh: '排序', en: 'Sort Order', es: 'Orden' } },
    { key: 'platforms.updated', page: 'platforms', desc: '更新成功', trans: { zh: '更新成功', en: 'Updated successfully', es: 'Actualizado correctamente' } },
    { key: 'platforms.urlLabel', page: 'platforms', desc: '跳转URL', trans: { zh: '跳转 URL', en: 'Redirect URL', es: 'URL de redirección' } },
    { key: 'productStats.adviceHotEnd', page: 'productStats', desc: '备货建议结尾', trans: { zh: '等，请保证库存。', en: ' etc., please keep stocked.', es: ' etc., mantenga stock.' } },
    { key: 'productStats.adviceHotStart', page: 'productStats', desc: '热销品建议开头', trans: { zh: '热销品', en: 'Hot items', es: 'Populares' } },
    { key: 'productStats.apply', page: 'productStats', desc: '应用', trans: { zh: '应用', en: 'Apply', es: 'Aplicar' } },
    { key: 'productStats.autoFilled', page: 'productStats', desc: '已自动填充', trans: { zh: '已自动填充最新记录', en: 'Auto-filled latest record', es: 'Registro más reciente autocompletado' } },
    { key: 'productStats.batchResult', page: 'productStats', desc: '批量计算结果', trans: { zh: '📊 批量计算结果', en: '📊 Batch results', es: '📊 Resultados por lotes' } },
    { key: 'productStats.colId', page: 'productStats', desc: 'ID列', trans: { zh: 'ID', en: 'ID', es: 'ID' } },
    { key: 'productStats.cold', page: 'productStats', desc: '滞销', trans: { zh: '🪫 滞销', en: '🪫 Slow sellers', es: '🪫 Sin ventas' } },
    { key: 'productStats.coldTab', page: 'productStats', desc: '零销量标签', trans: { zh: '🪫 零销量商品', en: '🪫 Zero sales', es: '🪫 Sin ventas' } },
    { key: 'productStats.costInput', page: 'productStats', desc: '成本输入', trans: { zh: '📝 成本输入', en: '📝 Cost input', es: '📝 Entrada de coste' } },
    { key: 'productStats.dataRequired', page: 'productStats', desc: '请填写成本数据', trans: { zh: '请先填写完整成本数据', en: 'Please complete cost data', es: 'Complete los datos de coste' } },
    { key: 'productStats.dishName', page: 'productStats', desc: '菜品名称', trans: { zh: '菜品名称', en: 'Dish name', es: 'Nombre del plato' } },
    { key: 'productStats.dishPh', page: 'productStats', desc: '菜品占位', trans: { zh: '菜品名称...', en: 'Dish name...', es: 'Nombre del plato...' } },
    { key: 'productStats.downloadTpl', page: 'productStats', desc: '下载模板', trans: { zh: '📥 下载 Excel 模板', en: '📥 Download Excel template', es: '📥 Descargar plantilla Excel' } },
    { key: 'productStats.enterKeyword', page: 'productStats', desc: '输入关键词', trans: { zh: '输入关键词搜索', en: 'Enter keyword to search', es: 'Ingrese una palabra clave' } },
    { key: 'productStats.example', page: 'productStats', desc: '示例', trans: { zh: '💡 示例：羊肉 $50 买 5 磅，一磅出 4 串，每串卖 $3.99', en: '💡 Example: lamb $50 for 5 lb, 4 skewers/lb, $3.99 each', es: '💡 Ejemplo: cordero $50 por 5 lb, 4 brochetas/lb, $3.99 cada una' } },
    { key: 'productStats.exportExcel', page: 'productStats', desc: '导出Excel', trans: { zh: '💾 导出 Excel', en: '💾 Export Excel', es: '💾 Exportar Excel' } },
    { key: 'productStats.exportResult', page: 'productStats', desc: '导出结果', trans: { zh: '💾 导出计算结果', en: '💾 Export results', es: '💾 Exportar resultados' } },
    { key: 'productStats.exported', page: 'productStats', desc: '结果已导出', trans: { zh: '结果已导出', en: 'Results exported', es: 'Resultados exportados' } },
    { key: 'productStats.fillHint', page: 'productStats', desc: '填写左侧提示', trans: { zh: '填写左侧字段后自动计算', en: 'Fill left fields to auto-calculate', es: 'Complete los campos izquierdos para calcular' } },
    { key: 'productStats.hasRecord', page: 'productStats', desc: '有记录', trans: { zh: '🕐 有记录', en: '🕐 Has record', es: '🕐 Con registro' } },
    { key: 'productStats.hot', page: 'productStats', desc: '热销', trans: { zh: '🔥 热销', en: '🔥 Hot', es: '🔥 Populares' } },
    { key: 'productStats.hotRatio', page: 'productStats', desc: '热销占比', trans: { zh: '📊 热销占比：', en: '📊 Hot ratio: ', es: '📊 Proporción populares: ' } },
    { key: 'productStats.hotTab', page: 'productStats', desc: '热销商品标签', trans: { zh: '🔥 热销商品', en: '🔥 Hot items', es: '🔥 Productos populares' } },
    { key: 'productStats.importBtn', page: 'productStats', desc: '导入Excel按钮', trans: { zh: '📤 导入 Excel 批量计算', en: '📤 Import Excel batch', es: '📤 Importar Excel por lotes' } },
    { key: 'productStats.imported', page: 'productStats', desc: '导入成功', trans: { zh: '导入成功', en: 'Imported successfully', es: 'Importado correctamente' } },
    { key: 'productStats.importedInfoPrefix', page: 'productStats', desc: '已导入前缀', trans: { zh: '已导入：', en: 'Imported: ', es: 'Importado: ' } },
    { key: 'productStats.importedInfoSuffix', page: 'productStats', desc: '已导入后缀', trans: { zh: '条', en: 'entries', es: 'entradas' } },
    { key: 'productStats.importing', page: 'productStats', desc: '导入中', trans: { zh: '导入中...', en: 'Importing...', es: 'Importando...' } },
    { key: 'productStats.itemsUnit', page: 'productStats', desc: '条', trans: { zh: '条', en: 'items', es: 'ítems' } },
    { key: 'productStats.joiner', page: 'productStats', desc: '顿号', trans: { zh: '、', en: ', ', es: ', ' } },
    { key: 'productStats.linkDish', page: 'productStats', desc: '关联菜品', trans: { zh: '关联菜品（搜索自动填充）', en: 'Link dish (search auto-fills)', es: 'Vincular plato (búsqueda autocompleta)' } },
    { key: 'productStats.manualCalc', page: 'productStats', desc: '手动计算', trans: { zh: '手动计算', en: 'Manual calculation', es: 'Cálculo manual' } },
    { key: 'productStats.noData', page: 'productStats', desc: '暂无数据', trans: { zh: '暂无数据', en: 'No data', es: 'Sin datos' } },
    { key: 'productStats.noExport', page: 'productStats', desc: '没有可导出数据', trans: { zh: '没有可导出的数据', en: 'No data to export', es: 'No hay datos para exportar' } },
    { key: 'productStats.noHot', page: 'productStats', desc: '暂无热销品', trans: { zh: '暂无热销品。', en: 'No hot items.', es: 'Sin productos populares.' } },
    { key: 'productStats.noMatch', page: 'productStats', desc: '无匹配', trans: { zh: '无匹配，可手动输入', en: 'No match, type manually', es: 'Sin coincidencias, escriba manualmente' } },
    { key: 'productStats.normal', page: 'productStats', desc: '平销', trans: { zh: '📈 平销', en: '📈 Normal', es: '📈 Normales' } },
    { key: 'productStats.normalTab', page: 'productStats', desc: '平销商品标签', trans: { zh: '📈 平销商品', en: '📈 Normal items', es: '📈 Productos normales' } },
    { key: 'productStats.notFound', page: 'productStats', desc: '未找到', trans: { zh: '未找到', en: 'Not found', es: 'No encontrado' } },
    { key: 'productStats.offShelf', page: 'productStats', desc: '已下架', trans: { zh: '已下架', en: 'Off shelf', es: 'Desactivado' } },
    { key: 'productStats.onShelf', page: 'productStats', desc: '上架中', trans: { zh: '上架中', en: 'On shelf', es: 'Activo' } },
    { key: 'productStats.orderCount', page: 'productStats', desc: '订单次数', trans: { zh: '订单次数', en: 'Order count', es: 'Nº de pedidos' } },
    { key: 'productStats.pageEnd', page: 'productStats', desc: '页尾', trans: { zh: '页', en: '', es: '' } },
    { key: 'productStats.pageLabel', page: 'productStats', desc: '第页', trans: { zh: '第', en: 'Page ', es: 'Página ' } },
    { key: 'productStats.perPage', page: 'productStats', desc: '每页', trans: { zh: '每页', en: 'Per page', es: 'Por página' } },
    { key: 'productStats.portionCost', page: 'productStats', desc: '每份成本', trans: { zh: '每份成本', en: 'Cost per serving', es: 'Coste por ración' } },
    { key: 'productStats.portionProfit', page: 'productStats', desc: '每份利润', trans: { zh: '每份利润', en: 'Profit per serving', es: 'Beneficio por ración' } },
    { key: 'productStats.portionsPrefix', page: 'productStats', desc: '每前缀', trans: { zh: '每', en: 'per ', es: 'por ' } },
    { key: 'productStats.portionsSuffix', page: 'productStats', desc: '出几份', trans: { zh: '出几份', en: 'servings per', es: 'raciones por' } },
    { key: 'productStats.portionsUnit', page: 'productStats', desc: '份', trans: { zh: '份', en: 'servings', es: 'raciones' } },
    { key: 'productStats.profitAnalysis', page: 'productStats', desc: '利润分析', trans: { zh: '📊 利润分析', en: '📊 Profit analysis', es: '📊 Análisis de beneficios' } },
    { key: 'productStats.profitRate', page: 'productStats', desc: '利润率', trans: { zh: '利润率', en: 'Profit rate', es: 'Margen de beneficio' } },
    { key: 'productStats.profitTab', page: 'productStats', desc: '利润计算器标签', trans: { zh: '💰 利润计算器', en: '💰 Profit calculator', es: '💰 Calculadora de beneficios' } },
    { key: 'productStats.purchaseCost', page: 'productStats', desc: '采购成本', trans: { zh: '采购成本', en: 'Purchase cost', es: 'Coste de compra' } },
    { key: 'productStats.purchaseQty', page: 'productStats', desc: '采购总量', trans: { zh: '采购总量', en: 'Purchase quantity', es: 'Cantidad comprada' } },
    { key: 'productStats.purchaseTotal', page: 'productStats', desc: '采购总价', trans: { zh: '采购总价 ($)', en: 'Purchase total ($)', es: 'Compra total ($)' } },
    { key: 'productStats.purchaseUnit', page: 'productStats', desc: '采购单位', trans: { zh: '采购单位', en: 'Purchase unit', es: 'Unidad de compra' } },
    { key: 'productStats.rDish', page: 'productStats', desc: '菜品列', trans: { zh: '菜品', en: 'Dish', es: 'Plato' } },
    { key: 'productStats.rPortionCost', page: 'productStats', desc: '份成本列', trans: { zh: '份成本', en: 'Cost/serving', es: 'Coste/ración' } },
    { key: 'productStats.rPortionProfit', page: 'productStats', desc: '份利润列', trans: { zh: '份利润', en: 'Profit/serving', es: 'Beneficio/ración' } },
    { key: 'productStats.rPortions', page: 'productStats', desc: '出份列', trans: { zh: '出份', en: 'Servings', es: 'Raciones' } },
    { key: 'productStats.rProfitRate', page: 'productStats', desc: '利润率列', trans: { zh: '利润率', en: 'Profit rate', es: 'Margen' } },
    { key: 'productStats.rPurchasePrice', page: 'productStats', desc: '采购价列', trans: { zh: '采购价', en: 'Purchase price', es: 'Precio compra' } },
    { key: 'productStats.rPurchaseQty', page: 'productStats', desc: '采购量列', trans: { zh: '采购量', en: 'Purchase qty', es: 'Cantidad' } },
    { key: 'productStats.rSellPrice', page: 'productStats', desc: '售价列', trans: { zh: '售价', en: 'Sell price', es: 'Precio venta' } },
    { key: 'productStats.rTotalProfit', page: 'productStats', desc: '总利润列', trans: { zh: '总利润', en: 'Total profit', es: 'Beneficio total' } },
    { key: 'productStats.rUnit', page: 'productStats', desc: '单位列', trans: { zh: '单位', en: 'Unit', es: 'Unidad' } },
    { key: 'productStats.recordSaved', page: 'productStats', desc: '记录已保存', trans: { zh: '记录已保存', en: 'Record saved', es: 'Registro guardado' } },
    { key: 'productStats.saveRecord', page: 'productStats', desc: '保存成本记录', trans: { zh: '💾 保存此成本记录', en: '💾 Save this cost record', es: '💾 Guardar este registro' } },
    { key: 'productStats.searchLabel', page: 'productStats', desc: '搜索标签', trans: { zh: '搜索：', en: 'Search: ', es: 'Buscar: ' } },
    { key: 'productStats.searchPh', page: 'productStats', desc: '搜索占位', trans: { zh: '输入菜品名称搜索...', en: 'Enter dish name to search...', es: 'Ingrese el nombre del plato...' } },
    { key: 'productStats.searching', page: 'productStats', desc: '搜索中', trans: { zh: '搜索中...', en: 'Searching...', es: 'Buscando...' } },
    { key: 'productStats.sellPrice', page: 'productStats', desc: '每份售价', trans: { zh: '每份售价 ($)', en: 'Sell price per serving ($)', es: 'Precio por ración ($)' } },
    { key: 'productStats.soldCost', page: 'productStats', desc: '已耗成本', trans: { zh: '已耗成本：', en: 'Cost used: ', es: 'Coste usado: ' } },
    { key: 'productStats.soldProfit', page: 'productStats', desc: '已赚利润', trans: { zh: '已赚利润：', en: 'Profit earned: ', es: 'Beneficio obtenido: ' } },
    { key: 'productStats.soldProfitTitle', page: 'productStats', desc: '已售利润', trans: { zh: '✅ 已售利润', en: '✅ Sold profit', es: '✅ Beneficio vendido' } },
    { key: 'productStats.soldQty', page: 'productStats', desc: '已售出', trans: { zh: '已售出：', en: 'Sold: ', es: 'Vendido: ' } },
    { key: 'productStats.soldRevenue', page: 'productStats', desc: '已营收', trans: { zh: '已营收：', en: 'Revenue: ', es: 'Ingresos: ' } },
    { key: 'productStats.stockAdvice', page: 'productStats', desc: '备货建议', trans: { zh: '💡 备货建议：', en: '💡 Stock advice: ', es: '💡 Consejo de stock: ' } },
    { key: 'productStats.subtitle', page: 'productStats', desc: '销售统计副标题', trans: { zh: '统计各菜品订单出现次数与总销量', en: 'Track order frequency and total sales', es: 'Frecuencia de pedidos y ventas totales' } },
    { key: 'productStats.summary', page: 'productStats', desc: '统计总结', trans: { zh: '📋 统计总结', en: '📋 Summary', es: '📋 Resumen' } },
    { key: 'productStats.tag', page: 'productStats', desc: '标签', trans: { zh: '标签', en: 'Tag', es: 'Etiqueta' } },
    { key: 'productStats.templateDownloaded', page: 'productStats', desc: '模板已下载', trans: { zh: '模板已下载', en: 'Template downloaded', es: 'Plantilla descargada' } },
    { key: 'productStats.thresholdLabel', page: 'productStats', desc: '热销阈值', trans: { zh: '热销阈值：订单≥', en: 'Hot threshold: orders≥', es: 'Umbral populares: pedidos≥' } },
    { key: 'productStats.timesUnit', page: 'productStats', desc: '次', trans: { zh: '次', en: 'times', es: 'veces' } },
    { key: 'productStats.title', page: 'productStats', desc: '菜品销售统计', trans: { zh: '菜品销售统计', en: 'Dish sales stats', es: 'Estadísticas de ventas' } },
    { key: 'productStats.totalPortions', page: 'productStats', desc: '总可出份数', trans: { zh: '总可出份数', en: 'Total servings', es: 'Raciones totales' } },
    { key: 'productStats.totalPrefix', page: 'productStats', desc: '共', trans: { zh: '共', en: 'Total', es: 'Total' } },
    { key: 'productStats.totalProducts', page: 'productStats', desc: '商品总数', trans: { zh: '商品总数', en: 'Total products', es: 'Total de productos' } },
    { key: 'productStats.totalProfit', page: 'productStats', desc: '全部卖完利润', trans: { zh: '全部卖完利润', en: 'Profit if all sold', es: 'Beneficio si se vende todo' } },
    { key: 'productStats.totalRevenue', page: 'productStats', desc: '全部卖完营收', trans: { zh: '全部卖完营收', en: 'Revenue if all sold', es: 'Ingresos si se vende todo' } },
    { key: 'productStats.totalSold', page: 'productStats', desc: '总售出', trans: { zh: '总售出', en: 'Total sold', es: 'Total vendido' } },
    { key: 'productStats.totalSuffix', page: 'productStats', desc: '条', trans: { zh: '条', en: 'items', es: 'ítems' } },
    { key: 'productStats.unit', page: 'productStats', desc: '单位', trans: { zh: '单位', en: 'unit', es: 'unidad' } },
    { key: 'productStats.unitBox', page: 'productStats', desc: '箱', trans: { zh: '箱', en: 'box', es: 'caja' } },
    { key: 'productStats.unitCost', page: 'productStats', desc: '每单位成本', trans: { zh: '每单位成本', en: 'Cost per unit', es: 'Coste por unidad' } },
    { key: 'productStats.unitLb', page: 'productStats', desc: '磅', trans: { zh: '磅 (lb)', en: 'lb', es: 'lb' } },
    { key: 'productStats.unitPack', page: 'productStats', desc: '包', trans: { zh: '包', en: 'pack', es: 'paquete' } },
    { key: 'productStats.unitPc', page: 'productStats', desc: '个', trans: { zh: '个', en: 'pcs', es: 'uds' } },
    { key: 'productStats.unitPrice', page: 'productStats', desc: '单价', trans: { zh: '单价', en: 'Unit price', es: 'Precio unitario' } },
    { key: 'products.addCategory', page: 'products', desc: '新增分类按钮', trans: { zh: '新增分类', en: 'Add Category', es: 'Agregar Categoría' } },
    { key: 'products.addIngredient', page: 'products', desc: '添加配料按钮', trans: { zh: '添加配料', en: 'Add Ingredient', es: 'Agregar Ingrediente' } },
    { key: 'products.addProduct', page: 'products', desc: '添加商品按钮', trans: { zh: '商品', en: 'Product', es: 'Producto' } },
    { key: 'products.addProductTitle', page: 'products', desc: '新增商品对话框标题', trans: { zh: '新增商品', en: 'Add Product', es: 'Agregar Producto' } },
    { key: 'products.batchMovePrefix', page: 'products', desc: '批量移动前缀', trans: { zh: '批量移动 (', en: 'Batch Move (', es: 'Movimiento Masivo (' } },
    { key: 'products.batchMoveTitle', page: 'products', desc: '批量移动标题前缀', trans: { zh: '批量移动', en: 'Batch Move', es: 'Movimiento Masivo' } },
    { key: 'products.batchMoveTitleSuffix', page: 'products', desc: '批量移动标题后缀', trans: { zh: '个商品', en: 'products', es: 'productos' } },
    { key: 'products.cancelImport', page: 'products', desc: '取消导入按钮', trans: { zh: '取消导入', en: 'Cancel Import', es: 'Cancelar Importación' } },
    { key: 'products.category', page: 'products', desc: '分类标签', trans: { zh: '分类', en: 'Category', es: 'Categoría' } },
    { key: 'products.categoryAdded', page: 'products', desc: '分类已添加', trans: { zh: '分类已添加', en: 'Category added', es: 'Categoría agregada' } },
    { key: 'products.categoryDeleted', page: 'products', desc: '分类已删除', trans: { zh: '分类已删除', en: 'Category deleted', es: 'Categoría eliminada' } },
    { key: 'products.categoryDisabled', page: 'products', desc: '已禁用该分类', trans: { zh: '已禁用该分类', en: 'Category disabled', es: 'Categoría desactivada' } },
    { key: 'products.categoryEnabled', page: 'products', desc: '已启用该分类', trans: { zh: '已启用该分类', en: 'Category enabled', es: 'Categoría activada' } },
    { key: 'products.categoryName', page: 'products', desc: '分类名称标签', trans: { zh: '分类名称 *', en: 'Category Name *', es: 'Nombre de Categoría *' } },
    { key: 'products.categoryNamePlaceholder', page: 'products', desc: '分类名称占位符', trans: { zh: '如：烧烤、奶茶、小吃', en: 'e.g. BBQ, Milk Tea, Snacks', es: 'Ej: BBQ, Té con Leche, Botanas' } },
    { key: 'products.categoryUpdated', page: 'products', desc: '分类已更新', trans: { zh: '分类已更新', en: 'Category updated', es: 'Categoría actualizada' } },
    { key: 'products.confirmMove', page: 'products', desc: '确认移动按钮', trans: { zh: '确认移动', en: 'Confirm Move', es: 'Confirmar Movimiento' } },
    { key: 'products.deleteCategory', page: 'products', desc: '删除分类标题', trans: { zh: '删除分类', en: 'Delete Category', es: 'Eliminar Categoría' } },
    { key: 'products.deleteCategoryMessage', page: 'products', desc: '删除分类确认前缀', trans: { zh: '确定删除分类', en: 'Delete category', es: '¿Eliminar la categoría' } },
    { key: 'products.deleteCategorySuffix', page: 'products', desc: '删除分类确认后缀', trans: { zh: '吗？分类下商品将变为未分类。', en: '? Products in this category will become uncategorized.', es: '? Los productos pasarán a Sin Categoría.' } },
    { key: 'products.deleteProduct', page: 'products', desc: '删除商品标题', trans: { zh: '删除商品', en: 'Delete Product', es: 'Eliminar Producto' } },
    { key: 'products.deleteProductMessage', page: 'products', desc: '删除商品确认前缀', trans: { zh: '确定删除商品', en: 'Delete product', es: '¿Eliminar el producto' } },
    { key: 'products.deleteProductSuffix', page: 'products', desc: '删除商品确认后缀', trans: { zh: '吗？', en: '?', es: '?' } },
    { key: 'products.description', page: 'products', desc: '描述标签', trans: { zh: '描述', en: 'Description', es: 'Descripción' } },
    { key: 'products.disabled', page: 'products', desc: '已禁用标签', trans: { zh: '已禁用', en: 'Disabled', es: 'Desactivada' } },
    { key: 'products.downloadTemplate', page: 'products', desc: '下载模板按钮', trans: { zh: '下载模板', en: 'Download Template', es: 'Descargar Plantilla' } },
    { key: 'products.duplicateCountPrefix', page: 'products', desc: '重复数量前缀', trans: { zh: '发现', en: 'Found', es: 'Se encontraron' } },
    { key: 'products.duplicateCountSuffix', page: 'products', desc: '重复数量后缀', trans: { zh: '个重复商品：', en: 'duplicate products:', es: 'productos duplicados:' } },
    { key: 'products.duplicateMessagePrefix', page: 'products', desc: '重复确认消息前缀', trans: { zh: '是否跳过重复项，继续导入其余', en: 'Skip duplicates and continue importing the remaining', es: '¿Omitir duplicados e importar el resto?' } },
    { key: 'products.duplicateMessageSuffix', page: 'products', desc: '重复确认消息后缀', trans: { zh: '条？', en: 'items?', es: 'artículos?' } },
    { key: 'products.duplicateTitle', page: 'products', desc: '发现重复商品标题', trans: { zh: '发现重复商品', en: 'Duplicate Products Found', es: 'Productos Duplicados' } },
    { key: 'products.editCategory', page: 'products', desc: '编辑分类按钮', trans: { zh: '编辑分类', en: 'Edit Category', es: 'Editar Categoría' } },
    { key: 'products.editProductTitle', page: 'products', desc: '编辑商品对话框标题', trans: { zh: '编辑商品', en: 'Edit Product', es: 'Editar Producto' } },
    { key: 'products.enableCategoryHint', page: 'products', desc: '启用分类提示', trans: { zh: '启用该分类（禁用后前台不显示）', en: 'Enable this category (hidden from storefront when disabled)', es: 'Activar esta categoría (oculta en la tienda si se desactiva)' } },
    { key: 'products.enabled', page: 'products', desc: '启用中标签', trans: { zh: '启用中', en: 'Active', es: 'Activa' } },
    { key: 'products.englishDescription', page: 'products', desc: '英文描述标签', trans: { zh: '英文描述', en: 'English Description', es: 'Descripción en Inglés' } },
    { key: 'products.englishName', page: 'products', desc: '英文名标签', trans: { zh: '英文名', en: 'English Name', es: 'Nombre en Inglés' } },
    { key: 'products.englishNamePlaceholder', page: 'products', desc: '英文名占位符', trans: { zh: '如：BBQ、Milk Tea', en: 'e.g. BBQ, Milk Tea', es: 'Ej: BBQ, Milk Tea' } },
    { key: 'products.enterCategoryName', page: 'products', desc: '请填写分类名称', trans: { zh: '请填写分类名称', en: 'Please enter category name', es: 'Por favor ingrese el nombre de la categoría' } },
    { key: 'products.export', page: 'products', desc: '导出按钮', trans: { zh: '导出', en: 'Export', es: 'Exportar' } },
    { key: 'products.imageUrlPlaceholder', page: 'products', desc: '图片URL占位符', trans: { zh: 'https://... 或 /uploads/images/xxx.jpg', en: 'https://... or /uploads/images/xxx.jpg', es: 'https://... o /uploads/images/xxx.jpg' } },
    { key: 'products.import', page: 'products', desc: '导入按钮', trans: { zh: '导入', en: 'Import', es: 'Importar' } },
    { key: 'products.importFailed', page: 'products', desc: '导入失败', trans: { zh: '导入失败', en: 'Import failed', es: 'Error de importación' } },
    { key: 'products.importSkippedPrefix', page: 'products', desc: '跳过重复前缀', trans: { zh: '，跳过重复', en: ', skipped', es: ', omitidos' } },
    { key: 'products.importSuccessMid', page: 'products', desc: '导入成功中间文本', trans: { zh: '条，失败', en: 'items, failed', es: 'artículos, fallaron' } },
    { key: 'products.importSuccessPrefix', page: 'products', desc: '导入成功前缀', trans: { zh: '导入成功：', en: 'Import successful: ', es: 'Importación exitosa: ' } },
    { key: 'products.ingredientExample', page: 'products', desc: '配料示例说明', trans: { zh: '💡 例：一杯奶茶用 0.05 磅茶叶、0.2 杯牛奶，下单后自动扣减对应库存', en: '💡 e.g. One milk tea uses 0.05 lb tea leaves, 0.2 cups milk. Inventory auto-deducted on order.', es: '💡 Ej: Un té con leche usa 0.05 lb de té, 0.2 tazas de leche. Inventario descontado automáticamente.' } },
    { key: 'products.ingredientManagement', page: 'products', desc: '配料管理标题', trans: { zh: '🧂 配料管理（下单自动扣减库存）', en: '🧂 Ingredient Management (auto-deduct inventory on order)', es: '🧂 Gestión de Ingredientes (descontar inventario al ordenar)' } },
    { key: 'products.move', page: 'products', desc: '移动按钮', trans: { zh: '移动', en: 'Move', es: 'Mover' } },
    { key: 'products.moveProductTitle', page: 'products', desc: '移动商品标题', trans: { zh: '移动商品到分类', en: 'Move Product to Category', es: 'Mover Producto a Categoría' } },
    { key: 'products.movedMiddle', page: 'products', desc: '已移动中间文本', trans: { zh: '个商品到「', en: 'products to "', es: 'productos a "' } },
    { key: 'products.movedPrefix', page: 'products', desc: '已移动前缀', trans: { zh: '已移动', en: 'Moved', es: 'Movidos' } },
    { key: 'products.namePriceRequired', page: 'products', desc: '名称价格必填错误', trans: { zh: '名称和价格必填', en: 'Name and price are required', es: 'Nombre y precio son obligatorios' } },
    { key: 'products.noCategories', page: 'products', desc: '无分类提示', trans: { zh: '暂无商品分类，点击右上角添加', en: 'No categories yet. Click top-right to add.', es: 'Sin categorías. Haga clic arriba para agregar.' } },
    { key: 'products.noIngredients', page: 'products', desc: '无配料提示', trans: { zh: '暂无配料，点击上方按钮添加', en: 'No ingredients yet. Click above to add.', es: 'Sin ingredientes. Haga clic arriba para agregar.' } },
    { key: 'products.noMatchPrefix', page: 'products', desc: '无匹配商品前缀', trans: { zh: '没有找到与', en: 'No products matching', es: 'Sin productos que coincidan con' } },
    { key: 'products.noMatchSuffix', page: 'products', desc: '无匹配商品后缀', trans: { zh: '匹配的商品', en: '', es: '' } },
    { key: 'products.noProductsInCategory', page: 'products', desc: '分类下无商品提示', trans: { zh: '该分类下暂无商品，点击右上角 + 商品 添加', en: 'No products in this category. Click + Product to add.', es: 'Sin productos en esta categoría. Haga clic en + Producto.' } },
    { key: 'products.offShelf', page: 'products', desc: '已下架', trans: { zh: '已下架', en: 'Taken off shelf', es: 'Retirado' } },
    { key: 'products.offShelfShort', page: 'products', desc: '下架状态短文本', trans: { zh: '下架', en: 'Off Shelf', es: 'Retirado' } },
    { key: 'products.onSale', page: 'products', desc: '在售状态', trans: { zh: '在售', en: 'On Sale', es: 'Disponible' } },
    { key: 'products.onShelf', page: 'products', desc: '已上架', trans: { zh: '已上架', en: 'Put on shelf', es: 'Publicado' } },
    { key: 'products.onShelfShort', page: 'products', desc: '上架按钮', trans: { zh: '上架', en: 'Put on Sale', es: 'Publicar' } },
    { key: 'products.preview', page: 'products', desc: '图片预览alt', trans: { zh: '预览', en: 'Preview', es: 'Vista previa' } },
    { key: 'products.price', page: 'products', desc: '价格列头', trans: { zh: '价格', en: 'Price', es: 'Precio' } },
    { key: 'products.priceRequired', page: 'products', desc: '价格标签', trans: { zh: '价格 * ($)', en: 'Price * ($)', es: 'Precio * ($)' } },
    { key: 'products.product', page: 'products', desc: '商品列头', trans: { zh: '商品', en: 'Product', es: 'Producto' } },
    { key: 'products.productAdded', page: 'products', desc: '商品已添加', trans: { zh: '商品已添加', en: 'Product added', es: 'Producto agregado' } },
    { key: 'products.productDeleted', page: 'products', desc: '商品已删除', trans: { zh: '商品已删除', en: 'Product deleted', es: 'Producto eliminado' } },
    { key: 'products.productImage', page: 'products', desc: '商品图片标签', trans: { zh: '商品图片', en: 'Product Image', es: 'Imagen del Producto' } },
    { key: 'products.productLabel', page: 'products', desc: '商品标签', trans: { zh: '商品：', en: 'Product: ', es: 'Producto: ' } },
    { key: 'products.productName', page: 'products', desc: '商品名称标签', trans: { zh: '商品名称 *', en: 'Product Name *', es: 'Nombre del Producto *' } },
    { key: 'products.productUpdated', page: 'products', desc: '商品已更新', trans: { zh: '商品已更新', en: 'Product updated', es: 'Producto actualizado' } },
    { key: 'products.productsCountSuffix', page: 'products', desc: '商品数量后缀', trans: { zh: '个商品', en: 'products', es: 'productos' } },
    { key: 'products.quantity', page: 'products', desc: '用量占位符', trans: { zh: '用量', en: 'Qty', es: 'Cant.' } },
    { key: 'products.recommend', page: 'products', desc: '推荐列头/标签', trans: { zh: '推荐', en: 'Recommend', es: 'Recomendado' } },
    { key: 'products.recommendProduct', page: 'products', desc: '推荐商品复选框', trans: { zh: '推荐商品', en: 'Recommend Product', es: 'Producto Recomendado' } },
    { key: 'products.recordsUnit', page: 'products', desc: '记录条数单位', trans: { zh: '条', en: 'items', es: 'artículos' } },
    { key: 'products.rowPrefix', page: 'products', desc: '重复行号前缀', trans: { zh: '第', en: 'Row', es: 'Fila' } },
    { key: 'products.rowSuffix', page: 'products', desc: '重复行号后缀', trans: { zh: '行：', en: ':', es: ':' } },
    { key: 'products.searchPlaceholder', page: 'products', desc: '搜索占位符', trans: { zh: '搜索商品名称/描述...', en: 'Search by product name/description...', es: 'Buscar por nombre/descripción...' } },
    { key: 'products.selectGoods', page: 'products', desc: '选择货物占位符', trans: { zh: '选择货物...', en: 'Select goods...', es: 'Seleccionar producto...' } },
    { key: 'products.selectProductsFirst', page: 'products', desc: '请先选择商品', trans: { zh: '请先选择商品', en: 'Please select products first', es: 'Por favor seleccione productos' } },
    { key: 'products.skipAndContinue', page: 'products', desc: '跳过并继续按钮', trans: { zh: '跳过并继续', en: 'Skip & Continue', es: 'Omitir y Continuar' } },
    { key: 'products.sortOrder', page: 'products', desc: '排序列头', trans: { zh: '排序', en: 'Sort', es: 'Orden' } },
    { key: 'products.subtitle', page: 'products', desc: '商品管理副标题', trans: { zh: '按分类管理商品，点击分类展开查看商品列表', en: 'Manage products by category. Click a category to expand.', es: 'Gestione productos por categoría. Haga clic para expandir.' } },
    { key: 'products.targetCategory', page: 'products', desc: '目标分类标签', trans: { zh: '目标分类', en: 'Target Category', es: 'Categoría Destino' } },
    { key: 'products.title', page: 'products', desc: '商品管理标题', trans: { zh: '商品管理', en: 'Product Management', es: 'Gestión de Productos' } },
    { key: 'products.uncategorized', page: 'products', desc: '未分类', trans: { zh: '未分类', en: 'Uncategorized', es: 'Sin Categoría' } },
    { key: 'products.uploadImage', page: 'products', desc: '上传图片按钮', trans: { zh: '上传图片', en: 'Upload Image', es: 'Subir Imagen' } },
    { key: 'products.uploadSuccess', page: 'products', desc: '图片上传成功', trans: { zh: '图片上传成功', en: 'Image uploaded successfully', es: 'Imagen subida correctamente' } },
    { key: 'queue.allTypes', page: 'queue', desc: '全部类型', trans: { zh: '全部类型', en: 'All types', es: 'Todos los tipos' } },
    { key: 'queue.anonymous', page: 'queue', desc: '匿名顾客', trans: { zh: '匿名顾客', en: 'Anonymous customer', es: 'Cliente anónimo' } },
    { key: 'queue.anonymousShort', page: 'queue', desc: '匿名', trans: { zh: '匿名', en: 'Anonymous', es: 'Anónimo' } },
    { key: 'queue.autoRefresh', page: 'queue', desc: '自动刷新', trans: { zh: '自动刷新 (5秒)', en: 'Auto refresh (5s)', es: 'Actualización automática (5 s)' } },
    { key: 'queue.avgWait', page: 'queue', desc: '平均等待', trans: { zh: '平均等待', en: 'Avg. wait', es: 'Espera media' } },
    { key: 'queue.callBtn', page: 'queue', desc: '叫号按钮', trans: { zh: '叫号', en: 'Call', es: 'Llamar' } },
    { key: 'queue.callNext', page: 'queue', desc: '叫下一个', trans: { zh: '🔔 叫下一个', en: '🔔 Call next', es: '🔔 Llamar al siguiente' } },
    { key: 'queue.calling', page: 'queue', desc: '正在叫号', trans: { zh: '正在叫号', en: 'Calling', es: 'Llamando' } },
    { key: 'queue.callingStatus', page: 'queue', desc: '叫号中', trans: { zh: '叫号中', en: 'Calling', es: 'Llamando' } },
    { key: 'queue.completeBtn', page: 'queue', desc: '完成按钮', trans: { zh: '✓ 完成', en: '✓ Done', es: '✓ Completar' } },
    { key: 'queue.completeMsgPrefix', page: 'queue', desc: '确认完成前缀', trans: { zh: '确认', en: 'Confirm ', es: 'Confirmar ' } },
    { key: 'queue.completeMsgSuffix', page: 'queue', desc: '完成后缀', trans: { zh: '已完成？', en: ' completed?', es: ' ¿completado?' } },
    { key: 'queue.completeTitle', page: 'queue', desc: '确认完成', trans: { zh: '确认完成', en: 'Confirm complete', es: 'Confirmar completar' } },
    { key: 'queue.completed', page: 'queue', desc: '已完成', trans: { zh: '已完成', en: 'Completed', es: 'Completado' } },
    { key: 'queue.confirmTake', page: 'queue', desc: '确认取号', trans: { zh: '确认取号', en: 'Confirm take', es: 'Confirmar turno' } },
    { key: 'queue.currentCall', page: 'queue', desc: '当前叫号', trans: { zh: '当前叫号', en: 'Now calling', es: 'Llamando ahora' } },
    { key: 'queue.customerName', page: 'queue', desc: '顾客姓名', trans: { zh: '顾客姓名', en: 'Customer name', es: 'Nombre del cliente' } },
    { key: 'queue.dinein', page: 'queue', desc: '堂吃', trans: { zh: '堂吃', en: 'Dine-in', es: 'Comer en el local' } },
    { key: 'queue.minutes', page: 'queue', desc: '分钟', trans: { zh: '分钟', en: 'minutes', es: 'minutos' } },
    { key: 'queue.noRecords', page: 'queue', desc: '暂无记录', trans: { zh: '暂无记录', en: 'No records', es: 'Sin registros' } },
    { key: 'queue.noWaiting', page: 'queue', desc: '暂无等待', trans: { zh: '暂无等待中的排队号', en: 'No waiting numbers', es: 'Sin turnos en espera' } },
    { key: 'queue.note', page: 'queue', desc: '备注', trans: { zh: '备注', en: 'Note', es: 'Nota' } },
    { key: 'queue.optional', page: 'queue', desc: '选填', trans: { zh: '选填', en: 'Optional', es: 'Opcional' } },
    { key: 'queue.partySize', page: 'queue', desc: '人数', trans: { zh: '人数', en: 'People', es: 'Personas' } },
    { key: 'queue.peopleUnit', page: 'queue', desc: '人', trans: { zh: '人', en: 'people', es: 'personas' } },
    { key: 'queue.recallBtn', page: 'queue', desc: '再叫一次', trans: { zh: '🔔 再叫一次', en: '🔔 Call again', es: '🔔 Repetir' } },
    { key: 'queue.recallPrefix', page: 'queue', desc: '再次叫号前缀', trans: { zh: '再次叫号', en: 'Recall', es: 'Repetir llamada' } },
    { key: 'queue.recallTimes', page: 'queue', desc: '第几次', trans: { zh: '第', en: '', es: 'Nº' } },
    { key: 'queue.recallTimesSuffix', page: 'queue', desc: '次', trans: { zh: '次', en: 'times', es: 'veces' } },
    { key: 'queue.skipBtn', page: 'queue', desc: '跳过按钮', trans: { zh: '⏭ 跳过', en: '⏭ Skip', es: '⏭ Omitir' } },
    { key: 'queue.skipBtnShort', page: 'queue', desc: '跳过短', trans: { zh: '跳过', en: 'Skip', es: 'Omitir' } },
    { key: 'queue.skipMsgPrefix', page: 'queue', desc: '确认跳过前缀', trans: { zh: '确认跳过', en: 'Confirm skip ', es: 'Confirmar omitir ' } },
    { key: 'queue.skipMsgSuffix', page: 'queue', desc: '跳过后缀', trans: { zh: '？', en: '?', es: '?' } },
    { key: 'queue.skipTitle', page: 'queue', desc: '确认跳过', trans: { zh: '确认跳过', en: 'Confirm skip', es: 'Confirmar omitir' } },
    { key: 'queue.skipped', page: 'queue', desc: '已跳过', trans: { zh: '已跳过', en: 'Skipped', es: 'Omitido' } },
    { key: 'queue.subtitle', page: 'queue', desc: '排队副标题', trans: { zh: '管理顾客排队，支持堂吃和外带两种类型', en: 'Manage customer queue, dine-in and takeout', es: 'Gestionar cola de clientes, comedor y para llevar' } },
    { key: 'queue.takeBtn', page: 'queue', desc: '取号按钮', trans: { zh: '+ 取号', en: '+ Take number', es: '+ Tomar turno' } },
    { key: 'queue.takeSuccess', page: 'queue', desc: '取号成功', trans: { zh: '取号成功：', en: 'Number taken: ', es: 'Turno tomado: ' } },
    { key: 'queue.takeTitle', page: 'queue', desc: '取号标题', trans: { zh: '取号', en: 'Take number', es: 'Tomar turno' } },
    { key: 'queue.takeout', page: 'queue', desc: '外带', trans: { zh: '外带', en: 'Takeout', es: 'Para llevar' } },
    { key: 'queue.title', page: 'queue', desc: '排队叫号', trans: { zh: '📢 排队叫号', en: '📢 Queue calling', es: '📢 Sistema de turnos' } },
    { key: 'queue.todayRecords', page: 'queue', desc: '今日记录', trans: { zh: '📋 今日记录', en: '📋 Today\'s records', es: '📋 Registros de hoy' } },
    { key: 'queue.typeLabel', page: 'queue', desc: '类型标签', trans: { zh: '类型 *', en: 'Type *', es: 'Tipo *' } },
    { key: 'queue.typeRequired', page: 'queue', desc: '请选择类型', trans: { zh: '请选择类型', en: 'Please select type', es: 'Por favor seleccione el tipo' } },
    { key: 'queue.waiting', page: 'queue', desc: '等待中', trans: { zh: '等待中', en: 'Waiting', es: 'Esperando' } },
    { key: 'queue.waitingPrefix', page: 'queue', desc: '等待前缀', trans: { zh: '等待', en: 'wait ', es: 'espera ' } },
    { key: 'queue.waitingTitle', page: 'queue', desc: '等待中标题', trans: { zh: '⏳ 等待中', en: '⏳ Waiting', es: '⏳ Esperando' } },
    { key: 'reports.avgOrder', page: 'reports', desc: '平均客单价', trans: { zh: '平均客单价', en: 'Avg. order value', es: 'Ticket medio' } },
    { key: 'reports.categorySales', page: 'reports', desc: '品类销售分析', trans: { zh: '🍔 品类销售分析', en: '🍔 Category sales', es: '🍔 Ventas por categoría' } },
    { key: 'reports.hourlyAnalysis', page: 'reports', desc: '时段分析', trans: { zh: '⏰ 时段分析（按小时订单量）', en: '⏰ Hourly analysis', es: '⏰ Análisis por hora' } },
    { key: 'reports.noData', page: 'reports', desc: '暂无数据', trans: { zh: '暂无数据', en: 'No data', es: 'Sin datos' } },
    { key: 'reports.orderType', page: 'reports', desc: '订单类型分布', trans: { zh: '🍽️ 订单类型分布', en: '🍽️ Order type distribution', es: '🍽️ Distribución por tipo' } },
    { key: 'reports.ordersUnit', page: 'reports', desc: '单', trans: { zh: '单', en: 'orders', es: 'pedidos' } },
    { key: 'reports.range14', page: 'reports', desc: '最近14天', trans: { zh: '最近14天', en: 'Last 14 days', es: 'Últimos 14 días' } },
    { key: 'reports.range30', page: 'reports', desc: '最近30天', trans: { zh: '最近30天', en: 'Last 30 days', es: 'Últimos 30 días' } },
    { key: 'reports.range7', page: 'reports', desc: '最近7天', trans: { zh: '最近7天', en: 'Last 7 days', es: 'Últimos 7 días' } },
    { key: 'reports.range90', page: 'reports', desc: '最近90天', trans: { zh: '最近90天', en: 'Last 90 days', es: 'Últimos 90 días' } },
    { key: 'reports.refresh', page: 'reports', desc: '刷新', trans: { zh: '🔄 刷新', en: '🔄 Refresh', es: '🔄 Actualizar' } },
    { key: 'reports.salesTrend', page: 'reports', desc: '销售趋势', trans: { zh: '📊 销售趋势', en: '📊 Sales trend', es: '📊 Tendencia de ventas' } },
    { key: 'reports.servingsUnit', page: 'reports', desc: '份', trans: { zh: '份', en: 'servings', es: 'raciones' } },
    { key: 'reports.subtitle', page: 'reports', desc: '报表副标题', trans: { zh: '多维度数据分析，助力经营决策', en: 'Multi-dimensional data analysis', es: 'Análisis de datos multidimensional' } },
    { key: 'reports.title', page: 'reports', desc: '深度报表', trans: { zh: '📈 深度报表', en: '📈 Reports', es: '📈 Informes' } },
    { key: 'reports.to', page: 'reports', desc: '至', trans: { zh: '至', en: 'to', es: 'a' } },
    { key: 'reports.todayPrefix', page: 'reports', desc: '今日前缀', trans: { zh: '今日', en: 'Today ', es: 'Hoy ' } },
    { key: 'reports.topProducts', page: 'reports', desc: 'TOP10热销', trans: { zh: '🏆 TOP 10 热销商品', en: '🏆 TOP 10 products', es: '🏆 TOP 10 productos' } },
    { key: 'reports.totalOrders', page: 'reports', desc: '总订单数', trans: { zh: '总订单数', en: 'Total orders', es: 'Total de pedidos' } },
    { key: 'reports.totalQty', page: 'reports', desc: '总销量份', trans: { zh: '总销量（份）', en: 'Total sales (servings)', es: 'Ventas totales (raciones)' } },
    { key: 'reports.totalRevenue', page: 'reports', desc: '总营收', trans: { zh: '总营收', en: 'Total revenue', es: 'Ingresos totales' } },
    { key: 'roles.added', page: 'roles', desc: '添加成功', trans: { zh: '添加成功', en: 'Added successfully', es: 'Agregado correctamente' } },
    { key: 'roles.allPermsFixed', page: 'roles', desc: '全部权限（系统固定）', trans: { zh: '全部权限（系统固定）', en: 'All permissions (system-fixed)', es: 'Todos los permisos (fijo por sistema)' } },
    { key: 'roles.checkMenusHint', page: 'roles', desc: '勾选菜单提示', trans: { zh: '勾选该角色可见的后台菜单，未勾选的菜单将不在侧边栏显示。', en: 'Check the backend menus visible to this role. Unchecked menus will not appear in the sidebar.', es: 'Marque los menús del backend visibles para este rol. Los menús no marcados no aparecerán en la barra lateral.' } },
    { key: 'roles.configPerm', page: 'roles', desc: '配置权限', trans: { zh: '配置权限', en: 'Configure Permissions', es: 'Configurar permisos' } },
    { key: 'roles.confirmDelete', page: 'roles', desc: '确定删除角色「', trans: { zh: '确定删除角色「', en: 'Are you sure you want to delete role "', es: '¿Está seguro de eliminar el rol "' } },
    { key: 'roles.confirmDeleteEnd', page: 'roles', desc: '」？', trans: { zh: '」？', en: '"?', es: '"?' } },
    { key: 'roles.countUnit', page: 'roles', desc: '个', trans: { zh: '个', en: '', es: '' } },
    { key: 'roles.custom', page: 'roles', desc: '自定义', trans: { zh: '自定义', en: 'Custom', es: 'Personalizado' } },
    { key: 'roles.deleted', page: 'roles', desc: '已删除', trans: { zh: '已删除', en: 'Deleted', es: 'Eliminado' } },
    { key: 'roles.desc', page: 'roles', desc: '角色管理说明', trans: { zh: '创建角色并配置菜单权限，给用户分配角色后自动继承该角色的所有权限。系统内置角色不可删除。', en: 'Create roles and configure menu permissions. Users inherit all permissions from their assigned role. System roles cannot be deleted.', es: 'Cree roles y configure permisos de menú. Los usuarios heredan todos los permisos de su rol asignado. Los roles del sistema no se pueden eliminar.' } },
    { key: 'roles.descCol', page: 'roles', desc: '描述', trans: { zh: '描述', en: 'Description', es: 'Descripción' } },
    { key: 'roles.descLabel', page: 'roles', desc: '描述', trans: { zh: '描述', en: 'Description', es: 'Descripción' } },
    { key: 'roles.descPlaceholder', page: 'roles', desc: '描述占位符', trans: { zh: '角色职责说明', en: 'Role responsibilities', es: 'Responsabilidades del rol' } },
    { key: 'roles.editRole', page: 'roles', desc: '编辑角色', trans: { zh: '编辑角色', en: 'Edit Role', es: 'Editar rol' } },
    { key: 'roles.empty', page: 'roles', desc: '暂无角色', trans: { zh: '暂无角色', en: 'No roles yet', es: 'No hay roles' } },
    { key: 'roles.invert', page: 'roles', desc: '反选', trans: { zh: '反选', en: 'Invert', es: 'Invertir' } },
    { key: 'roles.menu', page: 'roles', desc: '菜单', trans: { zh: '菜单', en: 'Menu', es: 'Menú' } },
    { key: 'roles.menusCol', page: 'roles', desc: '已配置菜单', trans: { zh: '已配置菜单', en: 'Configured Menus', es: 'Menús configurados' } },
    { key: 'roles.menusUnit', page: 'roles', desc: '个菜单', trans: { zh: '个菜单', en: 'menus', es: 'menús' } },
    { key: 'roles.nameCol', page: 'roles', desc: '角色名称', trans: { zh: '角色名称', en: 'Role Name', es: 'Nombre del rol' } },
    { key: 'roles.nameLabel', page: 'roles', desc: '角色名称 *', trans: { zh: '角色名称 *', en: 'Role Name *', es: 'Nombre del rol *' } },
    { key: 'roles.namePlaceholder', page: 'roles', desc: '角色名称占位符', trans: { zh: '如：厨房师傅、收银员', en: 'e.g., Chef, Cashier', es: 'Ej.: Cocinero, Cajero' } },
    { key: 'roles.nameRequired', page: 'roles', desc: '角色名称必填', trans: { zh: '角色名称必填', en: 'Role name is required', es: 'El nombre del rol es obligatorio' } },
    { key: 'roles.newRole', page: 'roles', desc: '新建角色', trans: { zh: '新建角色', en: 'New Role', es: 'Nuevo rol' } },
    { key: 'roles.noDesc', page: 'roles', desc: '暂无描述', trans: { zh: '暂无描述', en: 'No description', es: 'Sin descripción' } },
    { key: 'roles.noPerms', page: 'roles', desc: '无权限（请配置）', trans: { zh: '无权限（请配置）', en: 'No permissions (please configure)', es: 'Sin permisos (configurar)' } },
    { key: 'roles.noPermsHint', page: 'roles', desc: '无权限提示', trans: { zh: '（不选则无任何权限）', en: '(No permissions if none selected)', es: '(Sin permisos si no se selecciona ninguno)' } },
    { key: 'roles.permSaved', page: 'roles', desc: '权限保存成功', trans: { zh: '权限保存成功', en: 'Permissions saved successfully', es: 'Permisos guardados correctamente' } },
    { key: 'roles.quickTemplates', page: 'roles', desc: '快速模板', trans: { zh: '⚡ 快速模板（点击应用，可在此基础上微调）', en: '⚡ Quick templates (click to apply, fine-tune afterwards)', es: '⚡ Plantillas rápidas (clic para aplicar, ajustar después)' } },
    { key: 'roles.savePerm', page: 'roles', desc: '保存权限', trans: { zh: '保存权限', en: 'Save Permissions', es: 'Guardar permisos' } },
    { key: 'roles.selectAll', page: 'roles', desc: '全选', trans: { zh: '全选', en: 'Select All', es: 'Seleccionar todo' } },
    { key: 'roles.selectNone', page: 'roles', desc: '全不选', trans: { zh: '全不选', en: 'Select None', es: 'Deseleccionar todo' } },
    { key: 'roles.selectedMenus', page: 'roles', desc: '已选菜单', trans: { zh: '已选菜单', en: 'Selected Menus', es: 'Menús seleccionados' } },
    { key: 'roles.selectedMenusCount', page: 'roles', desc: '已选择', trans: { zh: '已选择', en: 'Selected', es: 'Seleccionados' } },
    { key: 'roles.sortCol', page: 'roles', desc: '排序', trans: { zh: '排序', en: 'Sort', es: 'Orden' } },
    { key: 'roles.sortLabel', page: 'roles', desc: '排序', trans: { zh: '排序', en: 'Sort Order', es: 'Orden' } },
    { key: 'roles.submenu', page: 'roles', desc: '子菜单', trans: { zh: '子菜单', en: 'submenus', es: 'submenús' } },
    { key: 'roles.systemBuiltin', page: 'roles', desc: '系统内置', trans: { zh: '系统内置', en: 'System', es: 'Sistema' } },
    { key: 'roles.systemFixedPerm', page: 'roles', desc: '系统固定权限提示', trans: { zh: '系统内置角色（超级管理员/管理员/员工/普通用户）的权限由系统固定，不可在此修改。', en: 'Permissions for system roles (Super Admin/Manager/Employee/User) are fixed by the system and cannot be modified here.', es: 'Los permisos de los roles del sistema (Superadmin/Gerente/Empleado/Usuario) son fijos y no se pueden modificar aquí.' } },
    { key: 'roles.systemFixedPermHint', page: 'roles', desc: '系统固定权限提示2', trans: { zh: '如需自定义权限，请新建一个自定义角色。', en: 'To customize permissions, please create a new custom role.', es: 'Para personalizar los permisos, cree un nuevo rol personalizado.' } },
    { key: 'roles.systemHint', page: 'roles', desc: '系统角色提示', trans: { zh: '系统内置角色仅可修改描述和排序，名称和权限不可修改。', en: 'System roles can only have their description and sort order modified. Name and permissions are fixed.', es: 'Los roles del sistema solo pueden modificar la descripción y el orden. El nombre y los permisos son fijos.' } },
    { key: 'roles.systemNotDeletable', page: 'roles', desc: '系统内置角色不可删除', trans: { zh: '系统内置角色不可删除', en: 'System roles cannot be deleted', es: 'Los roles del sistema no se pueden eliminar' } },
    { key: 'roles.tplAdmin', page: 'roles', desc: '管理员', trans: { zh: '管理员', en: 'Admin', es: 'Administrador' } },
    { key: 'roles.tplAdminDesc', page: 'roles', desc: '日常运营管理', trans: { zh: '日常运营管理', en: 'Daily operations management', es: 'Gestión de operaciones diarias' } },
    { key: 'roles.tplApplied', page: 'roles', desc: '已应用「', trans: { zh: '已应用「', en: 'Applied template "', es: 'Plantilla aplicada "' } },
    { key: 'roles.tplAppliedEnd', page: 'roles', desc: '」模板，选中', trans: { zh: '」模板，选中', en: '", selected', es: '", seleccionados' } },
    { key: 'roles.tplCashier', page: 'roles', desc: '收银员', trans: { zh: '收银员', en: 'Cashier', es: 'Cajero' } },
    { key: 'roles.tplCashierDesc', page: 'roles', desc: '订单+收款+餐桌', trans: { zh: '订单+收款+餐桌', en: 'Orders + Payment + Tables', es: 'Pedidos + Cobro + Mesas' } },
    { key: 'roles.tplChef', page: 'roles', desc: '后厨师傅', trans: { zh: '后厨师傅', en: 'Kitchen Chef', es: 'Cocinero' } },
    { key: 'roles.tplChefDesc', page: 'roles', desc: '厨房显示+出餐', trans: { zh: '厨房显示+出餐', en: 'Kitchen display + Food output', es: 'Pantalla de cocina + Salida de platos' } },
    { key: 'roles.tplContent', page: 'roles', desc: '内容运营', trans: { zh: '内容运营', en: 'Content Operator', es: 'Operador de contenido' } },
    { key: 'roles.tplContentDesc', page: 'roles', desc: '内容+平台+表单', trans: { zh: '内容+平台+表单', en: 'Content + Platforms + Forms', es: 'Contenido + Plataformas + Formularios' } },
    { key: 'roles.tplKeeper', page: 'roles', desc: '库管员', trans: { zh: '库管员', en: 'Inventory Keeper', es: 'Almacenista' } },
    { key: 'roles.tplKeeperDesc', page: 'roles', desc: '货物+库存+统计', trans: { zh: '货物+库存+统计', en: 'Goods + Inventory + Stats', es: 'Mercancías + Inventario + Estadísticas' } },
    { key: 'roles.tplManager', page: 'roles', desc: '经理', trans: { zh: '经理', en: 'Manager', es: 'Gerente' } },
    { key: 'roles.tplManagerDesc', page: 'roles', desc: '运营+营销+报表', trans: { zh: '运营+营销+报表', en: 'Operations + Marketing + Reports', es: 'Operaciones + Marketing + Reportes' } },
    { key: 'roles.tplOwner', page: 'roles', desc: '老板/店长', trans: { zh: '老板/店长', en: 'Owner/Manager', es: 'Propietario/Gerente' } },
    { key: 'roles.tplOwnerDesc', page: 'roles', desc: '全部权限', trans: { zh: '全部权限', en: 'All permissions', es: 'Todos los permisos' } },
    { key: 'roles.tplReadonly', page: 'roles', desc: '只读权限', trans: { zh: '只读权限', en: 'Read-only', es: 'Solo lectura' } },
    { key: 'roles.tplReadonlyDesc', page: 'roles', desc: '查看全部菜单', trans: { zh: '查看全部菜单', en: 'View all menus', es: 'Ver todos los menús' } },
    { key: 'roles.tplWaiter', page: 'roles', desc: '服务员', trans: { zh: '服务员', en: 'Waiter', es: 'Mesero' } },
    { key: 'roles.tplWaiterDesc', page: 'roles', desc: '点餐+餐桌服务', trans: { zh: '点餐+餐桌服务', en: 'Ordering + Table service', es: 'Pedidos + Servicio de mesa' } },
    { key: 'roles.typeCol', page: 'roles', desc: '类型', trans: { zh: '类型', en: 'Type', es: 'Tipo' } },
    { key: 'roles.updated', page: 'roles', desc: '更新成功', trans: { zh: '更新成功', en: 'Updated successfully', es: 'Actualizado correctamente' } },
    { key: 'roles.usersCol', page: 'roles', desc: '用户数', trans: { zh: '用户数', en: 'Users', es: 'Usuarios' } },
    { key: 'settings.address', page: 'settings', desc: '地址', trans: { zh: '地址', en: 'Address', es: 'Dirección' } },
    { key: 'settings.bizDayStart', page: 'settings', desc: '营业日结算时间', trans: { zh: '营业日结算时间', en: 'Business Day Cutoff', es: 'Corte del día comercial' } },
    { key: 'settings.bizDayStartDefault', page: 'settings', desc: '默认时间', trans: { zh: '默认 04:00（凌晨4点）', en: 'Default 04:00 (4 AM)', es: 'Por defecto 04:00 (4 AM)' } },
    { key: 'settings.bizDayStartDesc', page: 'settings', desc: '营业日结算时间说明', trans: { zh: '每天这个时间点之前的订单算前一天的营业日，之后算新的一天。比如设为04:00，则凌晨4点前的订单算前一天。', en: 'Orders before this time count as the previous business day, after counts as the new day. e.g. set to 04:00, orders before 4 AM count as the previous day.', es: 'Los pedidos antes de esta hora cuentan para el día anterior, después cuentan para el nuevo día. Ej.: 04:00, pedidos antes de las 4 AM cuentan para el día anterior.' } },
    { key: 'settings.closed', page: 'settings', desc: '休息', trans: { zh: '休息', en: 'Closed', es: 'Cerrado' } },
    { key: 'settings.copied', page: 'settings', desc: '地址已复制', trans: { zh: '地址已复制', en: 'Address copied', es: 'Dirección copiada' } },
    { key: 'settings.copy', page: 'settings', desc: '复制', trans: { zh: '复制', en: 'Copy', es: 'Copiar' } },
    { key: 'settings.currentAddress', page: 'settings', desc: '当前地址', trans: { zh: '当前地址：', en: 'Current address:', es: 'Dirección actual:' } },
    { key: 'settings.deliveryFee', page: 'settings', desc: '配送费', trans: { zh: '配送费（$）', en: 'Delivery Fee ($)', es: 'Tarifa de entrega ($)' } },
    { key: 'settings.deliveryRange', page: 'settings', desc: '配送范围', trans: { zh: '配送范围（英里）', en: 'Delivery Range (miles)', es: 'Rango de entrega (millas)' } },
    { key: 'settings.deliveryRules', page: 'settings', desc: '配送规则', trans: { zh: '配送规则', en: 'Delivery Rules', es: 'Reglas de entrega' } },
    { key: 'settings.desc', page: 'settings', desc: '设置说明', trans: { zh: '店铺信息、营业时间、税率、配送等', en: 'Store info, business hours, tax rate, delivery, etc.', es: 'Información de la tienda, horarios, tasa de impuestos, entrega, etc.' } },
    { key: 'settings.freeDeliveryMin', page: 'settings', desc: '免配送费门槛', trans: { zh: '满多少免配送费（$）', en: 'Free delivery over ($)', es: 'Entrega gratis desde ($)' } },
    { key: 'settings.fri', page: 'settings', desc: '周五', trans: { zh: '周五', en: 'Fri', es: 'Vie' } },
    { key: 'settings.generateQr', page: 'settings', desc: '生成二维码', trans: { zh: '生成二维码', en: 'Generate QR Code', es: 'Generar código QR' } },
    { key: 'settings.hoursHint', page: 'settings', desc: '营业时间提示', trans: { zh: '每天可独立开关营业并设置起止时间，周二默认休息', en: 'Each day can be independently opened/closed with custom times. Tuesday is closed by default.', es: 'Cada día se puede abrir/cerrar independientemente con horarios personalizados. Martes cerrado por defecto.' } },
    { key: 'settings.mon', page: 'settings', desc: '周一', trans: { zh: '周一', en: 'Mon', es: 'Lun' } },
    { key: 'settings.note1', page: 'settings', desc: '注意1', trans: { zh: '电脑主机必须保持开机，服务必须在运行', en: 'The computer must stay on and the service running', es: 'La computadora debe permanecer encendida y el servicio corriendo' } },
    { key: 'settings.note2', page: 'settings', desc: '注意2', trans: { zh: 'Windows 需要允许防火墙专用/公用网络访问', en: 'Windows firewall must allow private/public network access', es: 'El firewall de Windows debe permitir acceso a red privada/pública' } },
    { key: 'settings.note3', page: 'settings', desc: '注意3', trans: { zh: '顾客手机必须连接同一 WiFi', en: 'Customer phones must be on the same WiFi', es: 'Los teléfonos de los clientes deben estar en la misma WiFi' } },
    { key: 'settings.noteTitle', page: 'settings', desc: '注意', trans: { zh: '注意：', en: 'Note:', es: 'Nota:' } },
    { key: 'settings.open', page: 'settings', desc: '营业中', trans: { zh: '营业中', en: 'Open', es: 'Abierto' } },
    { key: 'settings.phone', page: 'settings', desc: '联系电话', trans: { zh: '联系电话', en: 'Contact Phone', es: 'Teléfono de contacto' } },
    { key: 'settings.qrAddressLabel', page: 'settings', desc: '局域网地址', trans: { zh: '局域网地址（留空自动获取当前地址）', en: 'LAN address (leave blank to auto-detect)', es: 'Dirección LAN (dejar vacío para autodetectar)' } },
    { key: 'settings.qrDesc', page: 'settings', desc: '堂吃二维码说明', trans: { zh: '生成门店访问二维码，打印贴餐桌，顾客扫码直接访问菜单首页。需在同一 WiFi 局域网下访问。', en: 'Generate a store access QR code, print and place on tables. Customers scan to access the menu. Must be on the same WiFi network.', es: 'Genere un código QR de acceso a la tienda, imprímalo y colóquelo en las mesas. Los clientes escanean para acceder al menú. Deben estar en la misma red WiFi.' } },
    { key: 'settings.qrTitle', page: 'settings', desc: '堂吃二维码标题', trans: { zh: '堂吃二维码', en: 'Dine-in QR Code', es: 'Código QR para comer' } },
    { key: 'settings.sat', page: 'settings', desc: '周六', trans: { zh: '周六', en: 'Sat', es: 'Sáb' } },
    { key: 'settings.saveSettings', page: 'settings', desc: '保存设置', trans: { zh: '保存设置', en: 'Save Settings', es: 'Guardar ajustes' } },
    { key: 'settings.saved', page: 'settings', desc: '保存成功', trans: { zh: '保存成功', en: 'Saved successfully', es: 'Guardado correctamente' } },
    { key: 'settings.saving', page: 'settings', desc: '保存中', trans: { zh: '保存中...', en: 'Saving...', es: 'Guardando...' } },
    { key: 'settings.storeName', page: 'settings', desc: '店铺名称', trans: { zh: '店铺名称', en: 'Store Name', es: 'Nombre de la tienda' } },
    { key: 'settings.storeNameEn', page: 'settings', desc: '英文名', trans: { zh: '英文名', en: 'English Name', es: 'Nombre en inglés' } },
    { key: 'settings.sun', page: 'settings', desc: '周日', trans: { zh: '周日', en: 'Sun', es: 'Dom' } },
    { key: 'settings.tabBasic', page: 'settings', desc: '店铺信息', trans: { zh: '店铺信息', en: 'Store Info', es: 'Información de la tienda' } },
    { key: 'settings.tabHours', page: 'settings', desc: '营业时间', trans: { zh: '营业时间', en: 'Business Hours', es: 'Horario de atención' } },
    { key: 'settings.tabQr', page: 'settings', desc: '堂吃二维码', trans: { zh: '堂吃二维码', en: 'Dine-in QR Code', es: 'Código QR para comer en casa' } },
    { key: 'settings.tabTax', page: 'settings', desc: '税率与配送', trans: { zh: '税率与配送', en: 'Tax & Delivery', es: 'Impuestos y entrega' } },
    { key: 'settings.taxRate', page: 'settings', desc: '税率', trans: { zh: '税率（默认 8.8875%）', en: 'Tax Rate (default 8.8875%)', es: 'Tasa de impuestos (por defecto 8.8875%)' } },
    { key: 'settings.thu', page: 'settings', desc: '周四', trans: { zh: '周四', en: 'Thu', es: 'Jue' } },
    { key: 'settings.to', page: 'settings', desc: '至', trans: { zh: '至', en: 'to', es: 'a' } },
    { key: 'settings.tue', page: 'settings', desc: '周二', trans: { zh: '周二', en: 'Tue', es: 'Mar' } },
    { key: 'settings.wed', page: 'settings', desc: '周三', trans: { zh: '周三', en: 'Wed', es: 'Mié' } },
    { key: 'tables.addResBtn', page: 'tables', desc: '添加预订按钮', trans: { zh: '+ 添加预订', en: '+ Add reservation', es: '+ Añadir reserva' } },
    { key: 'tables.addResTitle', page: 'tables', desc: '添加预订', trans: { zh: '添加预订', en: 'Add reservation', es: 'Añadir reserva' } },
    { key: 'tables.addTableBtn', page: 'tables', desc: '添加餐桌按钮', trans: { zh: '+ 添加餐桌', en: '+ Add table', es: '+ Añadir mesa' } },
    { key: 'tables.addTableTitle', page: 'tables', desc: '添加餐桌', trans: { zh: '添加餐桌', en: 'Add table', es: 'Añadir mesa' } },
    { key: 'tables.added', page: 'tables', desc: '添加成功', trans: { zh: '添加成功', en: 'Added successfully', es: 'Añadido correctamente' } },
    { key: 'tables.all', page: 'tables', desc: '全部', trans: { zh: '全部', en: 'All', es: 'Todas' } },
    { key: 'tables.avgTurnover', page: 'tables', desc: '平均翻台率', trans: { zh: '平均翻台率', en: 'Avg. turnover rate', es: 'Rotación media' } },
    { key: 'tables.batchAdd', page: 'tables', desc: '批量添加', trans: { zh: '批量添加', en: 'Batch add', es: 'Añadir por lotes' } },
    { key: 'tables.batchAddBtn', page: 'tables', desc: '批量添加按钮', trans: { zh: '批量添加', en: 'Batch add', es: 'Añadir por lotes' } },
    { key: 'tables.batchAdded', page: 'tables', desc: '成功添加', trans: { zh: '成功添加', en: 'Successfully added', es: 'Añadido correctamente' } },
    { key: 'tables.batchDesc', page: 'tables', desc: '批量添加说明', trans: { zh: '按前缀+序号批量生成，如前缀A、起始1、数量10 = A1~A10', en: 'Generate by prefix+number, e.g. prefix A, start 1, count 10 = A1~A10', es: 'Generar por prefijo+número, p. ej. prefijo A, inicio 1, cantidad 10 = A1~A10' } },
    { key: 'tables.batchTitle', page: 'tables', desc: '批量添加餐桌', trans: { zh: '批量添加餐桌', en: 'Batch add tables', es: 'Añadir mesas por lotes' } },
    { key: 'tables.cancelEdit', page: 'tables', desc: '取消编辑', trans: { zh: '取消编辑', en: 'Cancel edit', es: 'Cancelar edición' } },
    { key: 'tables.cleanDone', page: 'tables', desc: '清理完成', trans: { zh: '清理完成，已设为空闲', en: 'Cleaning done, set to idle', es: 'Limpieza completa, marcada como libre' } },
    { key: 'tables.clearMsgPrefix', page: 'tables', desc: '确定清桌前缀', trans: { zh: '确定清桌', en: 'Confirm clear', es: 'Confirmar limpiar' } },
    { key: 'tables.clearMsgSuffix', page: 'tables', desc: '清桌确认后缀', trans: { zh: '？清桌后当前订单将合并结算，下一桌扫码是全新的。', en: '? The current order will be merged and settled; the next scan starts fresh.', es: '? La orden actual se liquidará junto; el próximo escaneo empezará de cero.' } },
    { key: 'tables.clearTable', page: 'tables', desc: '清桌', trans: { zh: '清桌', en: 'Clear table', es: 'Limpiar mesa' } },
    { key: 'tables.clearTitle', page: 'tables', desc: '清桌确认', trans: { zh: '清桌确认', en: 'Clear table confirm', es: 'Confirmar limpiar mesa' } },
    { key: 'tables.cleared', page: 'tables', desc: '已清桌', trans: { zh: '已清桌，状态：清理中', en: 'Table cleared, status: cleaning', es: 'Mesa limpiada, estado: limpiando' } },
    { key: 'tables.completedOrders', page: 'tables', desc: '已完成订单', trans: { zh: '已完成订单', en: 'Completed orders', es: 'Pedidos completados' } },
    { key: 'tables.confirmMerge', page: 'tables', desc: '确认并桌', trans: { zh: '确认并桌', en: 'Confirm merge', es: 'Confirmar fusión' } },
    { key: 'tables.confirmTransfer', page: 'tables', desc: '确认转桌', trans: { zh: '确认转桌', en: 'Confirm transfer', es: 'Confirmar transferencia' } },
    { key: 'tables.copyLink', page: 'tables', desc: '复制链接', trans: { zh: '复制链接', en: 'Copy link', es: 'Copiar enlace' } },
    { key: 'tables.currentOrders', page: 'tables', desc: '当前订单', trans: { zh: '当前订单', en: 'Current orders', es: 'Órdenes actuales' } },
    { key: 'tables.currentSpend', page: 'tables', desc: '当前消费', trans: { zh: '当前消费', en: 'Current spend', es: 'Consumo actual' } },
    { key: 'tables.currentUrl', page: 'tables', desc: '当前地址', trans: { zh: '当前地址：', en: 'Current URL: ', es: 'URL actual: ' } },
    { key: 'tables.customer', page: 'tables', desc: '客户', trans: { zh: '客户', en: 'Customer', es: 'Cliente' } },
    { key: 'tables.customerNameLabel', page: 'tables', desc: '客户姓名标签', trans: { zh: '客户姓名 *', en: 'Customer name *', es: 'Nombre del cliente *' } },
    { key: 'tables.customerNameRequired', page: 'tables', desc: '客户姓名必填', trans: { zh: '客户姓名必填', en: 'Customer name is required', es: 'El nombre del cliente es obligatorio' } },
    { key: 'tables.deleteResMsg', page: 'tables', desc: '确定删除此预订', trans: { zh: '确定删除此预订？', en: 'Delete this reservation?', es: '¿Eliminar esta reserva?' } },
    { key: 'tables.deleteResTitle', page: 'tables', desc: '删除预订', trans: { zh: '删除预订', en: 'Delete reservation', es: 'Eliminar reserva' } },
    { key: 'tables.deleteShort', page: 'tables', desc: '删', trans: { zh: '删', en: 'Del', es: 'Eliminar' } },
    { key: 'tables.deleteTableMsgPrefix', page: 'tables', desc: '确定删除餐桌前缀', trans: { zh: '确定删除餐桌', en: 'Confirm delete table', es: 'Confirmar eliminar mesa' } },
    { key: 'tables.deleteTableMsgSuffix', page: 'tables', desc: '删除餐桌后缀', trans: { zh: '？', en: '?', es: '?' } },
    { key: 'tables.deleteTableTitle', page: 'tables', desc: '删除餐桌', trans: { zh: '删除餐桌', en: 'Delete table', es: 'Eliminar mesa' } },
    { key: 'tables.deleteZoneMsgPrefix', page: 'tables', desc: '确定删除分区前缀', trans: { zh: '确定删除分区', en: 'Confirm delete zone', es: 'Confirmar eliminar zona' } },
    { key: 'tables.deleteZoneMsgSuffix', page: 'tables', desc: '删除分区后缀', trans: { zh: '？该分区下的桌子将移到“大厅”', en: '? Tables in this zone will be moved to "Lobby"', es: '? Las mesas de esta zona se moverán al "Salón"' } },
    { key: 'tables.deleteZoneTitle', page: 'tables', desc: '删除分区', trans: { zh: '删除分区', en: 'Delete zone', es: 'Eliminar zona' } },
    { key: 'tables.deleted', page: 'tables', desc: '已删除', trans: { zh: '已删除', en: 'Deleted', es: 'Eliminado' } },
    { key: 'tables.diningDuration', page: 'tables', desc: '用餐时长', trans: { zh: '用餐时长', en: 'Dining duration', es: 'Duración de la comida' } },
    { key: 'tables.done', page: 'tables', desc: '完成', trans: { zh: '完成', en: 'Done', es: 'Completar' } },
    { key: 'tables.editResTitle', page: 'tables', desc: '编辑预订', trans: { zh: '编辑预订', en: 'Edit reservation', es: 'Editar reserva' } },
    { key: 'tables.editTableTitle', page: 'tables', desc: '编辑餐桌', trans: { zh: '编辑餐桌', en: 'Edit table', es: 'Editar mesa' } },
    { key: 'tables.existingZones', page: 'tables', desc: '现有分区', trans: { zh: '现有分区', en: 'Existing zones', es: 'Zonas existentes' } },
    { key: 'tables.hours', page: 'tables', desc: '小时', trans: { zh: '小时', en: 'hours', es: 'horas' } },
    { key: 'tables.linkCopied', page: 'tables', desc: '链接已复制', trans: { zh: '链接已复制', en: 'Link copied', es: 'Enlace copiado' } },
    { key: 'tables.maintain', page: 'tables', desc: '维护', trans: { zh: '维护', en: 'Maintain', es: 'Mantener' } },
    { key: 'tables.merge', page: 'tables', desc: '并桌', trans: { zh: '并桌', en: 'Merge', es: 'Fusionar' } },
    { key: 'tables.mergeDescPrefix', page: 'tables', desc: '并桌说明前缀', trans: { zh: '将目标桌的订单合并到', en: 'Merge the target table\'s order into', es: 'Fusionar la orden de la mesa destino en' } },
    { key: 'tables.mergeDescSuffix', page: 'tables', desc: '并桌说明后缀', trans: { zh: '桌，目标桌将重置为空闲', en: 'table; target table will reset to idle', es: 'mesa; la mesa destino se reiniciará' } },
    { key: 'tables.mergeRequired', page: 'tables', desc: '请选择并桌', trans: { zh: '请选择并桌', en: 'Please select table to merge', es: 'Por favor seleccione la mesa a fusionar' } },
    { key: 'tables.mergeTargetLabel', page: 'tables', desc: '并桌标签', trans: { zh: '并桌 *', en: 'Merge *', es: 'Fusionar *' } },
    { key: 'tables.mergeTitle', page: 'tables', desc: '并桌标题', trans: { zh: '并桌', en: 'Merge tables', es: 'Fusionar mesas' } },
    { key: 'tables.merged', page: 'tables', desc: '并桌成功', trans: { zh: '并桌成功', en: 'Tables merged', es: 'Mesas fusionadas' } },
    { key: 'tables.minCharge', page: 'tables', desc: '最低消费', trans: { zh: '最低消费', en: 'Min. charge', es: 'Consumo mínimo' } },
    { key: 'tables.minChargeLabel', page: 'tables', desc: '最低消费标签', trans: { zh: '最低消费 ($)', en: 'Min. charge ($)', es: 'Consumo mínimo ($)' } },
    { key: 'tables.minShort', page: 'tables', desc: '分', trans: { zh: '分', en: 'min', es: 'min' } },
    { key: 'tables.minutes', page: 'tables', desc: '分钟', trans: { zh: '分钟', en: 'minutes', es: 'minutos' } },
    { key: 'tables.noRes', page: 'tables', desc: '暂无预订', trans: { zh: '暂无预订', en: 'No reservations', es: 'Sin reservas' } },
    { key: 'tables.noTables', page: 'tables', desc: '该分区没有餐桌', trans: { zh: '该分区还没有餐桌，点击右上角添加', en: 'No tables in this zone, click top right to add', es: 'No hay mesas en esta zona, haga clic arriba a la derecha' } },
    { key: 'tables.note', page: 'tables', desc: '备注', trans: { zh: '备注', en: 'Note', es: 'Nota' } },
    { key: 'tables.notePh', page: 'tables', desc: '备注占位', trans: { zh: '如：靠窗、儿童椅、坏椅子等', en: 'e.g. window seat, high chair, broken chair', es: 'p. ej. junto a la ventana, silla para niños, silla rota' } },
    { key: 'tables.ordersUnit', page: 'tables', desc: '笔', trans: { zh: '笔', en: 'orders', es: 'pedidos' } },
    { key: 'tables.partySize', page: 'tables', desc: '人数', trans: { zh: '人数', en: 'People', es: 'Personas' } },
    { key: 'tables.peopleUnit', page: 'tables', desc: '人', trans: { zh: '人', en: 'people', es: 'personas' } },
    { key: 'tables.phone', page: 'tables', desc: '电话', trans: { zh: '电话', en: 'Phone', es: 'Teléfono' } },
    { key: 'tables.prefix', page: 'tables', desc: '前缀', trans: { zh: '前缀', en: 'Prefix', es: 'Prefijo' } },
    { key: 'tables.prefixPh', page: 'tables', desc: '前缀占位', trans: { zh: '如 A, B, C', en: 'e.g. A, B, C', es: 'p. ej. A, B, C' } },
    { key: 'tables.preview', page: 'tables', desc: '预览', trans: { zh: '预览', en: 'Preview', es: 'Vista previa' } },
    { key: 'tables.qrCode', page: 'tables', desc: '二维码', trans: { zh: '二维码', en: 'QR code', es: 'Código QR' } },
    { key: 'tables.qrCustom', page: 'tables', desc: '自定义扫码地址', trans: { zh: '自定义扫码地址（可选，用于局域网IP等）', en: 'Custom QR URL (optional, e.g. LAN IP)', es: 'URL QR personalizada (opcional, p. ej. IP de LAN)' } },
    { key: 'tables.qrDefaultPh', page: 'tables', desc: '留空使用默认', trans: { zh: '留空使用默认地址', en: 'Leave blank for default URL', es: 'Dejar vacío para la URL predeterminada' } },
    { key: 'tables.qrDescPrefix', page: 'tables', desc: '二维码说明前缀', trans: { zh: '顾客扫码后直接进入菜单页，自动关联餐桌', en: 'Customers scan to open the menu, auto-linked to the table', es: 'Los clientes escanean para abrir el menú, vinculado automáticamente a la mesa' } },
    { key: 'tables.qrHint', page: 'tables', desc: '二维码提示', trans: { zh: '右键图片可保存打印，贴在餐桌上', en: 'Right-click the image to save and print', es: 'Clic derecho para guardar e imprimir' } },
    { key: 'tables.qrSaved', page: 'tables', desc: '二维码地址已保存', trans: { zh: '二维码地址已保存', en: 'QR URL saved', es: 'URL del QR guardada' } },
    { key: 'tables.qrTitlePrefix', page: 'tables', desc: '二维码标题前缀', trans: { zh: '餐桌', en: 'Table', es: 'Mesa' } },
    { key: 'tables.qrTitleSuffix', page: 'tables', desc: '二维码标题后缀', trans: { zh: '二维码', en: 'QR code', es: 'Código QR' } },
    { key: 'tables.resArrived', page: 'tables', desc: '已到店', trans: { zh: '已到店', en: 'Arrived', es: 'Llegó' } },
    { key: 'tables.resCancelled', page: 'tables', desc: '已取消', trans: { zh: '已取消', en: 'Cancelled', es: 'Cancelada' } },
    { key: 'tables.resDate', page: 'tables', desc: '日期列', trans: { zh: '日期', en: 'Date', es: 'Fecha' } },
    { key: 'tables.resDateLabel', page: 'tables', desc: '预订日期标签', trans: { zh: '预订日期 *', en: 'Reservation date *', es: 'Fecha de reserva *' } },
    { key: 'tables.resDateTimeRequired', page: 'tables', desc: '预订日期时间必填', trans: { zh: '预订日期和时间必填', en: 'Reservation date and time are required', es: 'La fecha y hora de reserva son obligatorias' } },
    { key: 'tables.resSubtitle', page: 'tables', desc: '预订副标题', trans: { zh: '管理客户预订，到店后可直接开桌', en: 'Manage customer reservations', es: 'Gestionar reservas de clientes' } },
    { key: 'tables.resSuccess', page: 'tables', desc: '预订成功', trans: { zh: '预订成功', en: 'Reserved successfully', es: 'Reserva realizada' } },
    { key: 'tables.resTimeLabel', page: 'tables', desc: '预订时间标签', trans: { zh: '预订时间 *', en: 'Reservation time *', es: 'Hora de reserva *' } },
    { key: 'tables.resWaiting', page: 'tables', desc: '待到店', trans: { zh: '待到店', en: 'Waiting', es: 'Esperando' } },
    { key: 'tables.restore', page: 'tables', desc: '恢复', trans: { zh: '恢复', en: 'Restore', es: 'Restaurar' } },
    { key: 'tables.restored', page: 'tables', desc: '已恢复使用', trans: { zh: '已恢复使用', en: 'Restored', es: 'Restaurado' } },
    { key: 'tables.saved', page: 'tables', desc: '保存成功', trans: { zh: '保存成功', en: 'Saved successfully', es: 'Guardado correctamente' } },
    { key: 'tables.seats', page: 'tables', desc: '座位数', trans: { zh: '座位数', en: 'Seats', es: 'Asientos' } },
    { key: 'tables.seatsUnit', page: 'tables', desc: '人桌', trans: { zh: '人桌', en: 'seats', es: 'asientos' } },
    { key: 'tables.setMaintenance', page: 'tables', desc: '已设为维护中', trans: { zh: '已设为维护中', en: 'Set to maintenance', es: 'Marcada en mantenimiento' } },
    { key: 'tables.skippedExist', page: 'tables', desc: '桌已存在跳过', trans: { zh: '桌已存在跳过', en: 'tables already exist, skipped', es: 'mesas ya existen, omitidas' } },
    { key: 'tables.sort', page: 'tables', desc: '排序', trans: { zh: '排序', en: 'Sort', es: 'Ordenar' } },
    { key: 'tables.startNum', page: 'tables', desc: '起始序号', trans: { zh: '起始序号', en: 'Start number', es: 'Número inicial' } },
    { key: 'tables.statusCleaning', page: 'tables', desc: '清理中', trans: { zh: '清理中', en: 'Cleaning', es: 'Limpiando' } },
    { key: 'tables.statusIdle', page: 'tables', desc: '空闲', trans: { zh: '空闲', en: 'Idle', es: 'Libre' } },
    { key: 'tables.statusMaintenance', page: 'tables', desc: '维护中', trans: { zh: '维护中', en: 'Maintenance', es: 'En mantenimiento' } },
    { key: 'tables.statusOccupied', page: 'tables', desc: '用餐中', trans: { zh: '用餐中', en: 'Dining', es: 'Ocupado' } },
    { key: 'tables.statusReserved', page: 'tables', desc: '已预订', trans: { zh: '已预订', en: 'Reserved', es: 'Reservado' } },
    { key: 'tables.subtitle', page: 'tables', desc: '餐桌副标题', trans: { zh: '管理堂吃餐桌、分区、预订、扫码点餐二维码、清桌、转桌并桌', en: 'Manage dine-in tables, zones, reservations, QR codes, clearing, transferring and merging', es: 'Gestionar mesas, zonas, reservas, códigos QR, limpiar, transferir y fusionar' } },
    { key: 'tables.tabReservations', page: 'tables', desc: '预订管理标签', trans: { zh: '预订管理', en: 'Reservations', es: 'Reservas' } },
    { key: 'tables.tabStats', page: 'tables', desc: '翻台统计标签', trans: { zh: '翻台统计', en: 'Turnover stats', es: 'Estadísticas de rotación' } },
    { key: 'tables.tabTables', page: 'tables', desc: '餐桌管理标签', trans: { zh: '餐桌管理', en: 'Tables', es: 'Mesas' } },
    { key: 'tables.tableNo', page: 'tables', desc: '桌号', trans: { zh: '桌号', en: 'Table no.', es: 'Nº de mesa' } },
    { key: 'tables.tableNoLabel', page: 'tables', desc: '桌号标签', trans: { zh: '桌号 *', en: 'Table no. *', es: 'Nº de mesa *' } },
    { key: 'tables.tableNoPh', page: 'tables', desc: '桌号占位', trans: { zh: '如 A1, B2', en: 'e.g. A1, B2', es: 'p. ej. A1, B2' } },
    { key: 'tables.tableNoPh2', page: 'tables', desc: '桌号占位2', trans: { zh: '如 A1', en: 'e.g. A1', es: 'p. ej. A1' } },
    { key: 'tables.tableNoRequired', page: 'tables', desc: '请输入桌号', trans: { zh: '请输入桌号', en: 'Please enter table number', es: 'Por favor ingrese el número de mesa' } },
    { key: 'tables.tablesUnit', page: 'tables', desc: '桌', trans: { zh: '桌', en: 'tables', es: 'mesas' } },
    { key: 'tables.targetRequired', page: 'tables', desc: '请选择目标桌', trans: { zh: '请选择目标桌', en: 'Please select target table', es: 'Por favor seleccione la mesa de destino' } },
    { key: 'tables.targetTable', page: 'tables', desc: '目标桌', trans: { zh: '目标桌 *', en: 'Target table *', es: 'Mesa de destino *' } },
    { key: 'tables.timesPerTable', page: 'tables', desc: '次/桌', trans: { zh: '次/桌', en: 'times/table', es: 'veces/mesa' } },
    { key: 'tables.timesUnit', page: 'tables', desc: '次', trans: { zh: '次', en: 'times', es: 'veces' } },
    { key: 'tables.title', page: 'tables', desc: '餐桌管理', trans: { zh: '餐桌管理', en: 'Table management', es: 'Gestión de mesas' } },
    { key: 'tables.totalRevenue', page: 'tables', desc: '总营收', trans: { zh: '总营收', en: 'Total revenue', es: 'Ingresos totales' } },
    { key: 'tables.totalTables', page: 'tables', desc: '总桌数', trans: { zh: '总桌数', en: 'Total tables', es: 'Total de mesas' } },
    { key: 'tables.totalTurnovers', page: 'tables', desc: '总翻台次数', trans: { zh: '总翻台次数', en: 'Total turnovers', es: 'Total de rotaciones' } },
    { key: 'tables.transfer', page: 'tables', desc: '转桌', trans: { zh: '转桌', en: 'Transfer', es: 'Transferir' } },
    { key: 'tables.transferDescPrefix', page: 'tables', desc: '转桌说明前缀', trans: { zh: '将', en: 'Transfer', es: 'Transferir' } },
    { key: 'tables.transferDescSuffix', page: 'tables', desc: '转桌说明后缀', trans: { zh: '桌的订单和会话转移到目标桌，源桌将重置为空闲', en: 'table\'s order and session to the target table; source table will reset to idle', es: 'la orden y sesión de la mesa a la mesa de destino; la mesa origen se reiniciará' } },
    { key: 'tables.transferTitle', page: 'tables', desc: '转桌标题', trans: { zh: '转桌', en: 'Transfer table', es: 'Transferir mesa' } },
    { key: 'tables.transferred', page: 'tables', desc: '转桌成功', trans: { zh: '转桌成功', en: 'Table transferred', es: 'Mesa transferida' } },
    { key: 'tables.zone', page: 'tables', desc: '分区', trans: { zh: '分区', en: 'Zone', es: 'Zona' } },
    { key: 'tables.zoneManage', page: 'tables', desc: '分区管理', trans: { zh: '分区管理', en: 'Zone management', es: 'Gestión de zonas' } },
    { key: 'tables.zoneManageTitle', page: 'tables', desc: '桌位分区管理', trans: { zh: '桌位分区管理', en: 'Table zone management', es: 'Gestión de zonas de mesas' } },
    { key: 'tables.zoneNameRequired', page: 'tables', desc: '分区名称必填', trans: { zh: '分区名称必填', en: 'Zone name is required', es: 'El nombre de la zona es obligatorio' } },
    { key: 'tables.zonePh', page: 'tables', desc: '分区名称占位', trans: { zh: '分区名称，如：大厅、包间、户外', en: 'Zone name, e.g. Lobby, Private room, Outdoor', es: 'Nombre de zona, p. ej. Salón, privada, exterior' } },
    { key: 'translations.addBtn', page: 'translations', desc: '添加翻译按钮', trans: { zh: '+ 添加翻译', en: '+ Add translation', es: '+ Añadir traducción' } },
    { key: 'translations.addTitle', page: 'translations', desc: '添加翻译', trans: { zh: '添加翻译', en: 'Add translation', es: 'Añadir traducción' } },
    { key: 'translations.added', page: 'translations', desc: '添加成功', trans: { zh: '添加成功', en: 'Added successfully', es: 'Añadido correctamente' } },
    { key: 'translations.all', page: 'translations', desc: '全部', trans: { zh: '全部', en: 'All', es: 'Todas' } },
    { key: 'translations.colKey', page: 'translations', desc: 'Key列', trans: { zh: 'Key', en: 'Key', es: 'Clave' } },
    { key: 'translations.deleteMsgPrefix', page: 'translations', desc: '删除翻译前缀', trans: { zh: '确定删除翻译「', en: 'Delete translation 「', es: 'Eliminar traducción 「' } },
    { key: 'translations.deleteMsgSuffix', page: 'translations', desc: '删除翻译后缀', trans: { zh: '」？', en: '」?', es: '」?' } },
    { key: 'translations.deleted', page: 'translations', desc: '已删除', trans: { zh: '已删除', en: 'Deleted', es: 'Eliminado' } },
    { key: 'translations.descLabel', page: 'translations', desc: '说明标签', trans: { zh: '说明', en: 'Description', es: 'Descripción' } },
    { key: 'translations.editTitle', page: 'translations', desc: '编辑翻译', trans: { zh: '编辑翻译', en: 'Edit translation', es: 'Editar traducción' } },
    { key: 'translations.en', page: 'translations', desc: 'English列', trans: { zh: 'English', en: 'English', es: 'Inglés' } },
    { key: 'translations.enLabel', page: 'translations', desc: '英文标签', trans: { zh: 'English (en)', en: 'English (en)', es: 'Inglés (en)' } },
    { key: 'translations.enPh', page: 'translations', desc: '英文占位', trans: { zh: 'Save', en: 'Save', es: 'Guardar' } },
    { key: 'translations.es', page: 'translations', desc: 'Español列', trans: { zh: 'Español', en: 'Spanish', es: 'Español' } },
    { key: 'translations.esLabel', page: 'translations', desc: '西班牙文标签', trans: { zh: 'Español (es)', en: 'Spanish (es)', es: 'Español (es)' } },
    { key: 'translations.esPh', page: 'translations', desc: '西班牙文占位', trans: { zh: 'Guardar（可选）', en: 'Save (optional)', es: 'Guardar (opcional)' } },
    { key: 'translations.keyLabel', page: 'translations', desc: 'Key标签', trans: { zh: 'Key *', en: 'Key *', es: 'Clave *' } },
    { key: 'translations.keyPh', page: 'translations', desc: 'Key占位', trans: { zh: '如：common.save', en: 'e.g. common.save', es: 'p. ej. common.save' } },
    { key: 'translations.keyRequired', page: 'translations', desc: 'key必填', trans: { zh: 'key 必填', en: 'key is required', es: 'la clave es obligatoria' } },
    { key: 'translations.noTranslations', page: 'translations', desc: '暂无翻译', trans: { zh: '暂无翻译', en: 'No translations', es: 'Sin traducciones' } },
    { key: 'translations.optional', page: 'translations', desc: '可选', trans: { zh: '可选', en: 'Optional', es: 'Opcional' } },
    { key: 'translations.page', page: 'translations', desc: '页面', trans: { zh: '页面', en: 'Page', es: 'Página' } },
    { key: 'translations.pageLabel', page: 'translations', desc: '页面分类标签', trans: { zh: '页面分类', en: 'Page category', es: 'Categoría de página' } },
    { key: 'translations.pagePh', page: 'translations', desc: '页面占位', trans: { zh: 'common/admin/employee', en: 'common/admin/employee', es: 'common/admin/employee' } },
    { key: 'translations.subtitlePrefix', page: 'translations', desc: '副标题前缀', trans: { zh: '管理系统所有文本的多语言翻译，共', en: 'Manage all system text translations, total ', es: 'Gestionar todas las traducciones del sistema, total ' } },
    { key: 'translations.subtitleSuffix', page: 'translations', desc: '副标题后缀', trans: { zh: '条', en: 'entries', es: 'entradas' } },
    { key: 'translations.title', page: 'translations', desc: '多语言字典', trans: { zh: '多语言字典', en: 'Language dictionary', es: 'Diccionario de idiomas' } },
    { key: 'translations.updated', page: 'translations', desc: '更新成功', trans: { zh: '更新成功', en: 'Updated successfully', es: 'Actualizado correctamente' } },
    { key: 'translations.zh', page: 'translations', desc: '中文', trans: { zh: '中文', en: 'Chinese', es: 'Chino' } },
    { key: 'translations.zhLabel', page: 'translations', desc: '中文标签', trans: { zh: '中文 (zh)', en: 'Chinese (zh)', es: 'Chino (zh)' } },
    { key: 'translations.zhPh', page: 'translations', desc: '中文占位', trans: { zh: '保存', en: 'Save', es: 'Guardar' } },
    { key: 'users.account', page: 'users', desc: '账号', trans: { zh: '账号', en: 'Account', es: 'Cuenta' } },
    { key: 'users.accountLabel', page: 'users', desc: '账号 *', trans: { zh: '账号 *', en: 'Account *', es: 'Cuenta *' } },
    { key: 'users.accountRequired', page: 'users', desc: '账号必填', trans: { zh: '账号必填', en: 'Account is required', es: 'La cuenta es obligatoria' } },
    { key: 'users.accountStatus', page: 'users', desc: '账号状态', trans: { zh: '账号状态', en: 'Account Status', es: 'Estado de la cuenta' } },
    { key: 'users.accountStatusDesc', page: 'users', desc: '禁用后该用户无法登录', trans: { zh: '禁用后该用户无法登录', en: 'Once disabled, the user cannot log in', es: 'Al deshabilitarlo, el usuario no podrá iniciar sesión' } },
    { key: 'users.addUserTitle', page: 'users', desc: '添加用户', trans: { zh: '添加用户', en: 'Add User', es: 'Agregar usuario' } },
    { key: 'users.addedSuccess', page: 'users', desc: '添加成功', trans: { zh: '添加成功', en: 'Added successfully', es: 'Agregado correctamente' } },
    { key: 'users.allStatus', page: 'users', desc: '全部状态', trans: { zh: '全部状态', en: 'All Status', es: 'Todos los estados' } },
    { key: 'users.batchDelete', page: 'users', desc: '批量删除', trans: { zh: '批量删除', en: 'Batch Delete', es: 'Eliminar en lote' } },
    { key: 'users.batchDeleteSuccess', page: 'users', desc: '批量删除成功', trans: { zh: '批量删除成功', en: 'Batch delete successful', es: 'Eliminación en lote exitosa' } },
    { key: 'users.batchDeleteTitle', page: 'users', desc: '批量删除', trans: { zh: '批量删除', en: 'Batch Delete', es: 'Eliminar en lote' } },
    { key: 'users.batchDisable', page: 'users', desc: '批量禁用', trans: { zh: '批量禁用', en: 'Batch Disable', es: 'Deshabilitar en lote' } },
    { key: 'users.batchDisableSuccess', page: 'users', desc: '批量禁用成功', trans: { zh: '批量禁用成功', en: 'Batch disable successful', es: 'Deshabilitación en lote exitosa' } },
    { key: 'users.batchDisableTitle', page: 'users', desc: '批量禁用', trans: { zh: '批量禁用', en: 'Batch Disable', es: 'Deshabilitar en lote' } },
    { key: 'users.cancelSelect', page: 'users', desc: '取消选择', trans: { zh: '取消选择', en: 'Cancel Selection', es: 'Cancelar selección' } },
    { key: 'users.confirmBatchDeleteEnd', page: 'users', desc: '个用户？此操作不可恢复！', trans: { zh: '个用户？此操作不可恢复！', en: 'users? This action cannot be undone!', es: 'usuarios? ¡Esta acción no se puede deshacer!' } },
    { key: 'users.confirmBatchDeleteStart', page: 'users', desc: '确定删除选中的', trans: { zh: '确定删除选中的', en: 'Delete selected', es: 'Eliminar seleccionados' } },
    { key: 'users.confirmBatchDisableEnd', page: 'users', desc: '个用户？', trans: { zh: '个用户？', en: 'users?', es: 'usuarios?' } },
    { key: 'users.confirmBatchDisableStart', page: 'users', desc: '确定禁用选中的', trans: { zh: '确定禁用选中的', en: 'Disable selected', es: 'Deshabilitar seleccionados' } },
    { key: 'users.confirmDeleteMsg', page: 'users', desc: '确定删除该用户？此操作不可恢复。', trans: { zh: '确定删除该用户？此操作不可恢复。', en: 'Are you sure you want to delete this user? This action cannot be undone.', es: '¿Está seguro de eliminar este usuario? Esta acción no se puede deshacer.' } },
    { key: 'users.confirmDeleteTitle', page: 'users', desc: '删除用户', trans: { zh: '删除用户', en: 'Delete User', es: 'Eliminar usuario' } },
    { key: 'users.confirmReset', page: 'users', desc: '确认重置', trans: { zh: '确认重置', en: 'Confirm Reset', es: 'Confirmar restablecimiento' } },
    { key: 'users.createdAt', page: 'users', desc: '创建时间', trans: { zh: '创建时间', en: 'Created At', es: 'Fecha de creación' } },
    { key: 'users.customSuffix', page: 'users', desc: '（自定义）', trans: { zh: '（自定义）', en: ' (custom)', es: ' (personalizado)' } },
    { key: 'users.deletedToast', page: 'users', desc: '已删除', trans: { zh: '已删除', en: 'Deleted', es: 'Eliminado' } },
    { key: 'users.desc', page: 'users', desc: '用户管理说明', trans: { zh: 'admin 超级管理员 / manager 管理员(可分配权限) / employee 员工 / user 普通用户', en: 'admin Super Admin / manager Manager (assignable permissions) / employee Staff / user Regular User', es: 'admin Superadmin / manager Gerente (permisos asignables) / employee Empleado / usuario Usuario regular' } },
    { key: 'users.disabled', page: 'users', desc: '已禁用', trans: { zh: '已禁用', en: 'Disabled', es: 'Deshabilitado' } },
    { key: 'users.disabledStatus', page: 'users', desc: '禁用状态', trans: { zh: '禁用', en: 'Disabled', es: 'Deshabilitado' } },
    { key: 'users.disabledToast', page: 'users', desc: '已禁用', trans: { zh: '已禁用', en: 'Disabled', es: 'Deshabilitado' } },
    { key: 'users.displayName', page: 'users', desc: '显示名称', trans: { zh: '显示名称', en: 'Display name', es: 'Nombre para mostrar' } },
    { key: 'users.editUser', page: 'users', desc: '编辑用户', trans: { zh: '编辑用户', en: 'Edit User', es: 'Editar usuario' } },
    { key: 'users.email', page: 'users', desc: '邮箱', trans: { zh: '邮箱', en: 'Email', es: 'Correo electrónico' } },
    { key: 'users.emailAddr', page: 'users', desc: '邮箱地址', trans: { zh: '邮箱地址', en: 'Email address', es: 'Dirección de correo' } },
    { key: 'users.employee', page: 'users', desc: '员工', trans: { zh: '员工', en: 'Employee', es: 'Empleado' } },
    { key: 'users.empty', page: 'users', desc: '暂无用户', trans: { zh: '暂无用户', en: 'No users yet', es: 'No hay usuarios' } },
    { key: 'users.enable', page: 'users', desc: '启用', trans: { zh: '启用', en: 'Enable', es: 'Habilitar' } },
    { key: 'users.enabledToast', page: 'users', desc: '已启用', trans: { zh: '已启用', en: 'Enabled', es: 'Habilitado' } },
    { key: 'users.itemsUnit', page: 'users', desc: '项', trans: { zh: '项', en: 'items', es: 'ítems' } },
    { key: 'users.loginAccount', page: 'users', desc: '登录账号', trans: { zh: '登录账号', en: 'Login account', es: 'Cuenta de inicio de sesión' } },
    { key: 'users.manager', page: 'users', desc: '管理员', trans: { zh: '管理员', en: 'Manager', es: 'Gerente' } },
    { key: 'users.min6Chars', page: 'users', desc: '至少6位', trans: { zh: '至少6位', en: 'At least 6 characters', es: 'Al menos 6 caracteres' } },
    { key: 'users.mobile', page: 'users', desc: '手机号码', trans: { zh: '手机号码', en: 'Mobile number', es: 'Número de móvil' } },
    { key: 'users.nameLabel', page: 'users', desc: '姓名', trans: { zh: '姓名', en: 'Name', es: 'Nombre' } },
    { key: 'users.newPasswordBlank', page: 'users', desc: '新密码（留空不修改）', trans: { zh: '新密码（留空不修改）', en: 'New password (leave blank to keep)', es: 'Nueva contraseña (dejar vacío para mantener)' } },
    { key: 'users.newPasswordLabel', page: 'users', desc: '新密码 *', trans: { zh: '新密码 *', en: 'New Password *', es: 'Nueva contraseña *' } },
    { key: 'users.nextPage', page: 'users', desc: '下一页', trans: { zh: '下一页', en: 'Next', es: 'Siguiente' } },
    { key: 'users.noMatch', page: 'users', desc: '没有匹配的用户', trans: { zh: '没有匹配的用户', en: 'No matching users', es: 'No hay usuarios coincidentes' } },
    { key: 'users.normal', page: 'users', desc: '正常', trans: { zh: '正常', en: 'Active', es: 'Activo' } },
    { key: 'users.paginationItems', page: 'users', desc: '条，第', trans: { zh: '条，第', en: 'items, page', es: 'ítems, página' } },
    { key: 'users.paginationPage', page: 'users', desc: '页', trans: { zh: '页', en: 'of', es: 'de' } },
    { key: 'users.paginationTotal', page: 'users', desc: '共', trans: { zh: '共', en: 'Total', es: 'Total' } },
    { key: 'users.passwordLabel', page: 'users', desc: '密码 *', trans: { zh: '密码 *', en: 'Password *', es: 'Contraseña *' } },
    { key: 'users.passwordMin6', page: 'users', desc: '密码至少6位', trans: { zh: '密码至少6位', en: 'Password must be at least 6 characters', es: 'La contraseña debe tener al menos 6 caracteres' } },
    { key: 'users.passwordRequired', page: 'users', desc: '密码必填', trans: { zh: '密码必填', en: 'Password is required', es: 'La contraseña es obligatoria' } },
    { key: 'users.passwordResetSuccess', page: 'users', desc: '密码重置成功', trans: { zh: '密码重置成功', en: 'Password reset successfully', es: 'Contraseña restablecida correctamente' } },
    { key: 'users.perPage', page: 'users', desc: '每页条数', trans: { zh: '条/页', en: 'per page', es: 'por página' } },
    { key: 'users.phone', page: 'users', desc: '电话', trans: { zh: '电话', en: 'Phone', es: 'Teléfono' } },
    { key: 'users.pleaseSelectFirst', page: 'users', desc: '请先选择用户', trans: { zh: '请先选择用户', en: 'Please select users first', es: 'Por favor seleccione usuarios primero' } },
    { key: 'users.pleaseSelectRole', page: 'users', desc: '请选择角色', trans: { zh: '请选择角色', en: 'Please select a role', es: 'Por favor seleccione un rol' } },
    { key: 'users.prevPage', page: 'users', desc: '上一页', trans: { zh: '上一页', en: 'Previous', es: 'Anterior' } },
    { key: 'users.regularUser', page: 'users', desc: '普通用户', trans: { zh: '普通用户', en: 'Regular User', es: 'Usuario regular' } },
    { key: 'users.resetPassword', page: 'users', desc: '重置密码', trans: { zh: '重置密码', en: 'Reset Password', es: 'Restablecer contraseña' } },
    { key: 'users.resetPasswordDesc1', page: 'users', desc: '为用户', trans: { zh: '为用户', en: 'Set a new password for', es: 'Establecer nueva contraseña para' } },
    { key: 'users.resetPasswordDesc2', page: 'users', desc: '设置新密码，用户下次登录需使用新密码。', trans: { zh: '设置新密码，用户下次登录需使用新密码。', en: 'The user will need to use the new password next time they log in.', es: 'El usuario deberá usar la nueva contraseña la próxima vez que inicie sesión.' } },
    { key: 'users.resetPasswordTitle', page: 'users', desc: '重置密码', trans: { zh: '重置密码', en: 'Reset Password', es: 'Restablecer contraseña' } },
    { key: 'users.role', page: 'users', desc: '角色', trans: { zh: '角色', en: 'Role', es: 'Rol' } },
    { key: 'users.roleLabel', page: 'users', desc: '角色 *', trans: { zh: '角色 *', en: 'Role *', es: 'Rol *' } },
    { key: 'users.searchPlaceholder', page: 'users', desc: '搜索占位符', trans: { zh: '搜索账号 / 姓名 / 电话 / 邮箱...', en: 'Search account / name / phone / email...', es: 'Buscar cuenta / nombre / teléfono / correo...' } },
    { key: 'users.selectRolePlaceholder', page: 'users', desc: '请选择角色', trans: { zh: '请选择角色', en: 'Select a role', es: 'Seleccione un rol' } },
    { key: 'users.selectedItems', page: 'users', desc: '已选', trans: { zh: '已选', en: 'Selected', es: 'Seleccionados' } },
    { key: 'users.superAdmin', page: 'users', desc: '超级管理员', trans: { zh: '超级管理员', en: 'Super Admin', es: 'Superadministrador' } },
    { key: 'users.systemAdmin', page: 'users', desc: '超级管理员（系统）', trans: { zh: '超级管理员（系统）', en: 'Super Admin (System)', es: 'Superadministrador (Sistema)' } },
    { key: 'users.systemEmployee', page: 'users', desc: '员工（系统）', trans: { zh: '员工（系统）', en: 'Employee (System)', es: 'Empleado (Sistema)' } },
    { key: 'users.systemManager', page: 'users', desc: '管理员（系统）', trans: { zh: '管理员（系统）', en: 'Manager (System)', es: 'Gerente (Sistema)' } },
    { key: 'users.systemUser', page: 'users', desc: '普通用户（系统）', trans: { zh: '普通用户（系统）', en: 'Regular User (System)', es: 'Usuario regular (Sistema)' } },
    { key: 'users.totalUsers', page: 'users', desc: '总用户', trans: { zh: '总用户', en: 'Total Users', es: 'Usuarios totales' } },
    { key: 'users.updatedSuccess', page: 'users', desc: '更新成功', trans: { zh: '更新成功', en: 'Updated successfully', es: 'Actualizado correctamente' } },
    { key: 'users.userSuffix', page: 'users', desc: '用户后缀', trans: { zh: '用户', en: 'User', es: 'Usuario' } },
    { key: 'variant.clear', page: 'variant', desc: '清空', trans: { zh: '清空', en: 'Clear', es: 'Limpiar' } },
    { key: 'variant.ice', page: 'variant', desc: '冰度标签', trans: { zh: '冰度', en: 'Ice Level', es: 'Nivel de hielo' } },
    { key: 'variant.iceHot', page: 'variant', desc: '热饮', trans: { zh: '热饮', en: 'Hot', es: 'Caliente' } },
    { key: 'variant.iceLess', page: 'variant', desc: '少冰', trans: { zh: '少冰', en: 'Less Ice', es: 'Menos hielo' } },
    { key: 'variant.iceMore', page: 'variant', desc: '多冰', trans: { zh: '多冰', en: 'Extra Ice', es: 'Más hielo' } },
    { key: 'variant.iceNo', page: 'variant', desc: '去冰', trans: { zh: '去冰', en: 'No Ice', es: 'Sin hielo' } },
    { key: 'variant.iceNormal', page: 'variant', desc: '正常冰', trans: { zh: '正常冰', en: 'Normal Ice', es: 'Hielo normal' } },
    { key: 'variant.noCilantro', page: 'variant', desc: '不要香菜', trans: { zh: '不要香菜', en: 'No Cilantro', es: 'Sin cilantro' } },
    { key: 'variant.noGarlic', page: 'variant', desc: '不要蒜', trans: { zh: '不要蒜', en: 'No Garlic', es: 'Sin ajo' } },
    { key: 'variant.noScallion', page: 'variant', desc: '不要葱', trans: { zh: '不要葱', en: 'No Scallions', es: 'Sin cebollín' } },
    { key: 'variant.others', page: 'variant', desc: '其他标签', trans: { zh: '其他', en: 'Others', es: 'Otros' } },
    { key: 'variant.selectFlavor', page: 'variant', desc: '选择口味标题', trans: { zh: '选择口味', en: 'Select Flavor', es: 'Seleccionar sabor' } },
    { key: 'variant.spicy', page: 'variant', desc: '辣度标签', trans: { zh: '辣度', en: 'Spicy Level', es: 'Nivel de picante' } },
    { key: 'variant.spicyLess', page: 'variant', desc: '少辣', trans: { zh: '少辣', en: 'Less Spicy', es: 'Menos picante' } },
    { key: 'variant.spicyMedium', page: 'variant', desc: '中辣', trans: { zh: '中辣', en: 'Medium', es: 'Medio picante' } },
    { key: 'variant.spicyMild', page: 'variant', desc: '微辣', trans: { zh: '微辣', en: 'Mild', es: 'Ligeramente picante' } },
    { key: 'variant.spicyNone', page: 'variant', desc: '不辣', trans: { zh: '不辣', en: 'Not Spicy', es: 'Sin picante' } },
    { key: 'variant.spicyVery', page: 'variant', desc: '特辣', trans: { zh: '特辣', en: 'Extra Spicy', es: 'Muy picante' } },
    { key: 'variant.sugar', page: 'variant', desc: '甜度标签', trans: { zh: '甜度', en: 'Sweetness', es: 'Nivel de azúcar' } },
    { key: 'variant.sugarFull', page: 'variant', desc: '全糖', trans: { zh: '全糖', en: 'Full Sugar', es: 'Azúcar completa' } },
    { key: 'variant.sugarHalf', page: 'variant', desc: '半糖', trans: { zh: '半糖', en: 'Half Sugar', es: 'Medio azúcar' } },
    { key: 'variant.sugarLess', page: 'variant', desc: '少糖', trans: { zh: '少糖', en: 'Less Sugar', es: 'Menos azúcar' } },
    { key: 'variant.sugarNone', page: 'variant', desc: '无糖', trans: { zh: '无糖', en: 'No Sugar', es: 'Sin azúcar' } },
    { key: 'variant.sugarNormal', page: 'variant', desc: '正常糖', trans: { zh: '正常糖', en: 'Normal Sugar', es: 'Azúcar normal' } },
    { key: 'variant.toGo', page: 'variant', desc: '打包', trans: { zh: '打包', en: 'To Go', es: 'Para llevar' } },
    { key: 'variant.toppingCoconut', page: 'variant', desc: '加椰果', trans: { zh: '加椰果', en: 'Add Coconut Jelly', es: 'Añadir gelatina de coco' } },
    { key: 'variant.toppingPearl', page: 'variant', desc: '加珍珠', trans: { zh: '加珍珠', en: 'Add Pearls', es: 'Añadir perlas' } },
    { key: 'variant.toppingPudding', page: 'variant', desc: '加布丁', trans: { zh: '加布丁', en: 'Add Pudding', es: 'Añadir pudín' } },
    { key: 'variant.toppingTaro', page: 'variant', desc: '加芋圆', trans: { zh: '加芋圆', en: 'Add Taro Balls', es: 'Añadir bolas de taro' } },
    { key: 'variant.toppings', page: 'variant', desc: '配料标签', trans: { zh: '配料', en: 'Toppings', es: 'Ingredientes' } },
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
} catch (e) { /* 忽略 */ }

// 自动清理重复的菜单记录（path 相同的只保留 id 最小的）
try {
  db.prepare(`
    DELETE FROM menus 
    WHERE id NOT IN (
      SELECT MIN(id) FROM menus 
      WHERE path IS NOT NULL AND path != ''
      GROUP BY path
    )
  `).run();
} catch (e) { /* 忽略去重错误 */ }

// 插入默认 admin 用户
const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!adminExists) {
  const hash = bcrypt.hashSync('admin', 10);
  db.prepare(`INSERT INTO users (username, password, role, name, permissions) VALUES (?, ?, 'admin', '超级管理员', '{}')`).run('admin', hash);
}

// 插入默认设置
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

// 插入默认菜单
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

// 插入示例分类和商品
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

// 插入默认口味标签
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
    // 辣度
    ['辣度', '不辣', 0, 0, 1],
    ['辣度', '微辣', 0, 0, 2],
    ['辣度', '少辣', 0, 0, 3],
    ['辣度', '中辣', 0, 0, 4],
    ['辣度', '特辣', 0, 0, 5],
    // 冰度
    ['冰度', '去冰', 1, 0, 1],
    ['冰度', '少冰', 0, 0, 2],
    ['冰度', '正常冰', 0, 1, 3],
    ['冰度', '多冰', 0, 0, 4],
    ['冰度', '热饮', 0, 0, 5],
    // 甜度
    ['甜度', '无糖', 0, 0, 1],
    ['甜度', '半糖', 0, 0, 2],
    ['甜度', '少糖', 0, 0, 3],
    ['甜度', '正常糖', 0, 1, 4],
    ['甜度', '全糖', 0, 0, 5],
    // 配料
    ['配料', '加珍珠', 0.75, 0, 1],
    ['配料', '加椰果', 0.75, 0, 2],
    ['配料', '加布丁', 0.75, 0, 3],
    ['配料', '加芋圆', 1, 0, 4],
    // 其他
    ['其他', '不要葱', 0, 0, 1],
    ['其他', '不要香菜', 0, 0, 2],
    ['其他', '不要蒜', 0, 0, 3],
    ['其他', '打包', 0, 0, 4]
  ];
  flavors.forEach(f => insertFlavor.run(catIds[f[0]], f[0], f[1], f[2], f[3], f[4]));
}

// 插入默认订单状态配置
const orderStatusCount = db.prepare('SELECT COUNT(*) as cnt FROM order_statuses').get().cnt;
if (orderStatusCount === 0) {
  const insertStatus = db.prepare('INSERT INTO order_statuses (status_key, dining_type, label, color, sort_order, enabled, is_active, next_status, next_label) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const defaultStatuses = [
    // 堂吃
    ['pending', 'dinein', '进行中', 'primary', 1, 1, 1, 'completed', '完成结账'],
    ['preparing', 'dinein', '进行中', 'primary', 2, 1, 1, 'completed', '完成结账'],
    ['ready', 'dinein', '进行中', 'primary', 3, 1, 1, 'completed', '完成结账'],
    ['completed', 'dinein', '已完成', 'success', 4, 1, 0, null, null],
    ['cancelled', 'dinein', '已取消', 'danger', 5, 1, 0, null, null],
    // 打包
    ['pending', 'takeout', '进行中', 'warning', 1, 1, 1, 'ready', '制作完成'],
    ['preparing', 'takeout', '进行中', 'warning', 2, 1, 1, 'ready', '制作完成'],
    ['ready', 'takeout', '待取餐', 'primary', 3, 1, 1, 'completed', '确认取餐'],
    ['completed', 'takeout', '已完成', 'success', 4, 1, 0, null, null],
    ['cancelled', 'takeout', '已取消', 'danger', 5, 1, 0, null, null],
    // 配送
    ['pending', 'delivery', '进行中', 'warning', 1, 1, 1, 'ready', '开始配送'],
    ['preparing', 'delivery', '进行中', 'warning', 2, 1, 1, 'ready', '开始配送'],
    ['ready', 'delivery', '配送中', 'primary', 3, 1, 1, 'completed', '配送完成'],
    ['completed', 'delivery', '已完成', 'success', 4, 1, 0, null, null],
    ['cancelled', 'delivery', '已取消', 'danger', 5, 1, 0, null, null]
  ];
  defaultStatuses.forEach(s => insertStatus.run(...s));
}

// 插入示例轮播图
const carouselCount = db.prepare('SELECT COUNT(*) as cnt FROM carousel').get().cnt;
if (carouselCount === 0) {
  const insertCarousel = db.prepare('INSERT INTO carousel (image, title, sort_order, enabled) VALUES (?, ?, ?, 1)');
  insertCarousel.run('', '招牌奶茶 限时优惠', 1);
  insertCarousel.run('', '新品上市 香芋冰沙', 2);
  insertCarousel.run('', '烧烤串串 鲜香四溢', 3);
}

// ===== 数据迁移（已存在数据库自动补充新增数据）=====

// 给旧版 flavor_tags 表添加 category_id 列
const tagColumns = db.prepare("PRAGMA table_info(flavor_tags)").all();
if (!tagColumns.find(c => c.name === 'category_id')) {
  db.prepare('ALTER TABLE flavor_tags ADD COLUMN category_id INTEGER').run();
}

// 给旧版 flavor_categories 表添加 category_ids 列
const flavorCatColumns = db.prepare("PRAGMA table_info(flavor_categories)").all();
if (!flavorCatColumns.find(c => c.name === 'category_ids')) {
  db.prepare('ALTER TABLE flavor_categories ADD COLUMN category_ids TEXT').run();
}

// 给旧版 content_sections 表添加 image 和 layout 列
const sectionColumns = db.prepare("PRAGMA table_info(content_sections)").all();
if (!sectionColumns.find(c => c.name === 'image')) {
  db.prepare('ALTER TABLE content_sections ADD COLUMN image TEXT').run();
}
if (!sectionColumns.find(c => c.name === 'layout')) {
  db.prepare('ALTER TABLE content_sections ADD COLUMN layout TEXT DEFAULT \'left\'').run();
}

// 给旧版 orders 表添加 guest_id / table_id / table_session 列
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

// 给旧版 tables 表添加新字段
const tableColumns = db.prepare("PRAGMA table_info(tables)").all();
if (!tableColumns.find(c => c.name === 'zone')) db.prepare("ALTER TABLE tables ADD COLUMN zone TEXT DEFAULT '大厅'").run();
if (!tableColumns.find(c => c.name === 'seats')) db.prepare("ALTER TABLE tables ADD COLUMN seats INTEGER DEFAULT 4").run();
if (!tableColumns.find(c => c.name === 'min_charge')) db.prepare("ALTER TABLE tables ADD COLUMN min_charge REAL DEFAULT 0").run();
if (!tableColumns.find(c => c.name === 'waiter_id')) db.prepare("ALTER TABLE tables ADD COLUMN waiter_id INTEGER").run();
if (!tableColumns.find(c => c.name === 'waiter_name')) db.prepare("ALTER TABLE tables ADD COLUMN waiter_name TEXT").run();
if (!tableColumns.find(c => c.name === 'note')) db.prepare("ALTER TABLE tables ADD COLUMN note TEXT DEFAULT ''").run();
if (!tableColumns.find(c => c.name === 'opened_at')) db.prepare("ALTER TABLE tables ADD COLUMN opened_at TEXT").run();
if (!tableColumns.find(c => c.name === 'qr_custom_url')) db.prepare("ALTER TABLE tables ADD COLUMN qr_custom_url TEXT").run();

// 修正脏数据：把 table_session 为 NULL 的订单绑定到对应桌子的 current_session
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

// 补充默认餐桌（A1-A4, B1-B4）
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

// 补充默认桌位分区
const defaultZones = ['大厅', '包间', '户外', '吧台'];
defaultZones.forEach((name, i) => {
  const exists = db.prepare('SELECT id FROM table_zones WHERE name = ?').get(name);
  if (!exists) {
    db.prepare('INSERT INTO table_zones (name, sort_order) VALUES (?, ?)').run(name, i + 1);
  }
});

// 补充"其他"分类
const otherCat = db.prepare("SELECT id FROM categories WHERE name = '其他'").get();
if (!otherCat) {
  db.prepare('INSERT INTO categories (name, name_en, sort_order, enabled) VALUES (?, ?, ?, 1)').run('其他', 'Others', 5);
}

// 补充"感谢支持，祝你发大财"商品
const thankProduct = db.prepare("SELECT id FROM products WHERE name = '感谢支持，祝你发大财'").get();
if (!thankProduct) {
  const otherCatId = db.prepare("SELECT id FROM categories WHERE name = '其他'").get()?.id;
  if (otherCatId) {
    db.prepare(`INSERT INTO products (name, name_en, category_id, price, description, available, is_recommend, sort_order) VALUES (?, ?, ?, ?, ?, 1, 0, 99)`).run(
      '感谢支持，祝你发大财', 'Thank You for Your Support', otherCatId, 1.00, '感谢您的支持，祝您财源广进，生意兴隆！'
    );
  }
}

// 补充"口味管理"菜单
const flavorMenu = db.prepare("SELECT id FROM menus WHERE path = '/admin/flavors'").get();
if (!flavorMenu) {
  db.prepare('INSERT INTO menus (parent_id, name, icon, path, sort_order, enabled) VALUES (0, ?, ?, ?, 3, 1)').run('口味管理', '🌶️', '/admin/flavors');
}

// 补充"订单状态管理"菜单
const orderStatusMenu = db.prepare("SELECT id FROM menus WHERE path = '/admin/order-statuses'").get();
if (!orderStatusMenu) {
  db.prepare('INSERT INTO menus (parent_id, name, icon, path, sort_order, enabled) VALUES (0, ?, ?, ?, 3, 1)').run('订单状态管理', '🔄', '/admin/order-statuses');
}

// 补充"货物管理"菜单
const inventoryMenu = db.prepare("SELECT id FROM menus WHERE path = '/admin/inventory'").get();
if (!inventoryMenu) {
  db.prepare('INSERT INTO menus (parent_id, name, icon, path, sort_order, enabled) VALUES (0, ?, ?, ?, 4, 1)').run('货物管理', '📦', '/admin/inventory');
}

// 补充"厨房显示系统(KDS)"菜单
const kdsMenu = db.prepare("SELECT id FROM menus WHERE path = '/admin/kds'").get();
if (!kdsMenu) {
  db.prepare('INSERT INTO menus (parent_id, name, icon, path, sort_order, enabled) VALUES (0, ?, ?, ?, 3, 1)').run('厨房显示', '🍳', '/admin/kds');
}

// 补充"菜品销售统计"菜单
const statsMenu = db.prepare("SELECT id FROM menus WHERE path = '/admin/stats/product'").get();
if (!statsMenu) {
  db.prepare('INSERT INTO menus (parent_id, name, icon, path, sort_order, enabled) VALUES (0, ?, ?, ?, 4, 1)').run('销售统计', '📊', '/admin/stats/product');
}

// 补充"会员管理"菜单
const memberMenu = db.prepare("SELECT id FROM menus WHERE path = '/admin/members'").get();
if (!memberMenu) {
  db.prepare('INSERT INTO menus (parent_id, name, icon, path, sort_order, enabled) VALUES (0, ?, ?, ?, 5, 1)').run('会员管理', '👑', '/admin/members');
}

// 补充"优惠券管理"菜单
const couponMenu = db.prepare("SELECT id FROM menus WHERE path = '/admin/coupons'").get();
if (!couponMenu) {
  db.prepare('INSERT INTO menus (parent_id, name, icon, path, sort_order, enabled) VALUES (0, ?, ?, ?, 5, 1)').run('优惠券', '🎟️', '/admin/coupons');
}

// 补充"排队叫号"菜单
const queueMenu = db.prepare("SELECT id FROM menus WHERE path = '/admin/queue'").get();
if (!queueMenu) {
  db.prepare('INSERT INTO menus (parent_id, name, icon, path, sort_order, enabled) VALUES (0, ?, ?, ?, 5, 1)').run('排队叫号', '📢', '/admin/queue');
}

// 补充"深度报表"菜单
const reportMenu = db.prepare("SELECT id FROM menus WHERE path = '/admin/reports'").get();
if (!reportMenu) {
  db.prepare('INSERT INTO menus (parent_id, name, icon, path, sort_order, enabled) VALUES (0, ?, ?, ?, 6, 1)').run('深度报表', '📈', '/admin/reports');
}

// 补充默认外卖平台
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

// 补充"餐桌管理"菜单
const tableMenu = db.prepare("SELECT id FROM menus WHERE path = '/admin/tables'").get();
if (!tableMenu) {
  db.prepare('INSERT INTO menus (parent_id, name, icon, path, sort_order, enabled) VALUES (0, ?, ?, ?, 4, 1)').run('餐桌管理', '🪑', '/admin/tables');
}

// 补充"角色管理"菜单
const rolesMenu = db.prepare("SELECT id FROM menus WHERE path = '/admin/roles'").get();
if (!rolesMenu) {
  db.prepare('INSERT INTO menus (parent_id, name, icon, path, sort_order, enabled) VALUES (0, ?, ?, ?, 5, 1)').run('角色管理', '🎭', '/admin/roles');
}

// 迁移口味分类：把 flavor_tags.category 字符串转成 flavor_categories 记录
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

// 给users表添加role_id字段（兼容旧数据库）
const userCols = db.prepare("PRAGMA table_info(users)").all();
if (!userCols.find(c => c.name === 'role_id')) {
  db.exec('ALTER TABLE users ADD COLUMN role_id INTEGER');
}

// 初始化默认角色
const defaultRoles = [
  { name: '超级管理员', description: '拥有系统全部权限，不可删除', role_key: 'admin', is_system: 1, sort_order: 1 },
  { name: '管理员', description: '可分配后台菜单权限', role_key: 'manager', is_system: 1, sort_order: 2 },
  { name: '员工', description: '员工端点餐、打卡', role_key: 'employee', is_system: 1, sort_order: 3 },
  { name: '普通用户', description: '前台顾客端点餐', role_key: 'user', is_system: 1, sort_order: 4 },
  { name: '厨房师傅', description: '查看订单、制作状态、出餐管理', role_key: 'kitchen', is_system: 0, sort_order: 5 },
  { name: '收银员', description: '订单管理、收款、订单状态更新', role_key: 'cashier', is_system: 0, sort_order: 6 }
];
const insertRole = db.prepare('INSERT OR IGNORE INTO roles (name, description, permissions, is_system, sort_order) VALUES (?, ?, ?, ?, ?)');
defaultRoles.forEach(r => {
  insertRole.run(r.name, r.description, '{}', r.is_system, r.sort_order);
});

// 给厨房师傅和收银员设置默认菜单权限
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
