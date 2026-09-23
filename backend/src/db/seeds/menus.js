// 菜单初始化数据
module.exports = function(db) {
  // 清理重复菜单
  db.prepare(`DELETE FROM menus WHERE id NOT IN (SELECT MIN(id) FROM menus WHERE path IS NOT NULL AND path != '' GROUP BY path)`).run();

  // 默认菜单
  const defaultMenus = [
    { parent_id: 0, name: '仪表盘', icon: '📊', path: '/admin', sort_order: 1 },
    { parent_id: 0, name: '外卖管理', icon: '🛵', path: '', sort_order: 2 },
    { parent_id: 0, name: '商品管理', icon: '🍔', path: '/admin/products', sort_order: 3 },
    { parent_id: 0, name: '订单管理', icon: '📋', path: '/admin/orders', sort_order: 4 },
    { parent_id: 0, name: '餐桌管理', icon: '🪑', path: '/admin/tables', sort_order: 5 },
    { parent_id: 0, name: '口味管理', icon: '🌶️', path: '/admin/flavors', sort_order: 6 },
    { parent_id: 0, name: '订单状态', icon: '🔄', path: '/admin/order-statuses', sort_order: 7 },
    { parent_id: 0, name: '销售统计', icon: '📈', path: '/admin/stats/product', sort_order: 8 },
    { parent_id: 0, name: '深度报表', icon: '📊', path: '/admin/reports', sort_order: 9 },
    { parent_id: 0, name: '货物管理', icon: '📦', path: '/admin/inventory', sort_order: 10 },
    { parent_id: 0, name: '内容管理', icon: '📝', path: '/admin/content', sort_order: 11 },
    { parent_id: 0, name: '厨房显示', icon: '🍳', path: '/admin/kds', sort_order: 12 },
    { parent_id: 0, name: '排队叫号', icon: '🔔', path: '/admin/queue', sort_order: 13 },
    { parent_id: 0, name: '会员管理', icon: '👥', path: '/admin/members', sort_order: 14 },
    { parent_id: 0, name: '优惠券', icon: '🎟️', path: '/admin/coupons', sort_order: 15 },
    { parent_id: 0, name: '表单管理', icon: '📄', path: '/admin/forms', sort_order: 16 },
    { parent_id: 0, name: '菜单管理', icon: '📑', path: '/admin/menus', sort_order: 17 },
    { parent_id: 0, name: '用户管理', icon: '👤', path: '/admin/users', sort_order: 18 },
    { parent_id: 0, name: '角色管理', icon: '🔐', path: '/admin/roles', sort_order: 19 },
    { parent_id: 0, name: '权限管理', icon: '🛡️', path: '/admin/permissions', sort_order: 20 },
    { parent_id: 0, name: '翻译管理', icon: '🌐', path: '/admin/translations', sort_order: 21 },
    { parent_id: 0, name: '系统设置', icon: '⚙️', path: '/admin/settings', sort_order: 22 }
  ];

  const menuCount = db.prepare('SELECT COUNT(*) as cnt FROM menus').get().cnt;
  if (menuCount === 0) {
    const insertMenu = db.prepare('INSERT INTO menus (parent_id, name, icon, path, sort_order, enabled) VALUES (?, ?, ?, ?, ?, 1)');
    defaultMenus.forEach(m => insertMenu.run(m.parent_id, m.name, m.icon, m.path, m.sort_order));
  }

  // 确保外卖平台和外卖报表子菜单存在
  const platformMenu = db.prepare("SELECT id FROM menus WHERE name = '外卖管理' AND parent_id = 0").get();
  if (platformMenu) {
    const insertSubMenu = db.prepare('INSERT INTO menus (parent_id, name, icon, path, sort_order, enabled) VALUES (?, ?, ?, ?, ?, 1)');
    const exists = db.prepare('SELECT id FROM menus WHERE path = ?').get('/admin/platforms');
    if (!exists) insertSubMenu.run(platformMenu.id, '外卖平台', '🛵', '/admin/platforms', 1);
    const exists2 = db.prepare('SELECT id FROM menus WHERE path = ?').get('/admin/platform-reports');
    if (!exists2) insertSubMenu.run(platformMenu.id, '外卖报表', '📊', '/admin/platform-reports', 2);
  }
}
