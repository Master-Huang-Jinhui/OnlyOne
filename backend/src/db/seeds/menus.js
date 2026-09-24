// 菜单初始化数据
module.exports = function(db) {
  db.prepare(`DELETE FROM menus`).run();

  const parentMenus = [
    { id: 1, name: '仪表盘', icon: '📊', path: '/admin', sort_order: 1 },
    { id: 2, name: '订单中心', icon: '📦', path: '', sort_order: 2 },
    { id: 3, name: '菜单管理', icon: '📋', path: '', sort_order: 3 },
    { id: 4, name: '外卖管理', icon: '🛵', path: '', sort_order: 4 },
    { id: 5, name: '会员与员工', icon: '👥', path: '', sort_order: 5 },
    { id: 6, name: '财务与报表', icon: '💰', path: '', sort_order: 6 },
    { id: 7, name: '系统设置', icon: '⚙️', path: '', sort_order: 7 },
  ];

  const subMenus = [
    { parent_id: 2, name: '全部订单', icon: '📋', path: '/admin/orders', sort_order: 1 },
    { parent_id: 2, name: '堂吃桌台', icon: '🪑', path: '/admin/tables', sort_order: 2 },
    { parent_id: 2, name: '排队叫号', icon: '🔔', path: '/admin/queue', sort_order: 3 },
    { parent_id: 2, name: '厨房显示', icon: '🍳', path: '/admin/kds', sort_order: 4 },
    { parent_id: 2, name: '订单状态配置', icon: '🔄', path: '/admin/order-statuses', sort_order: 5 },

    { parent_id: 3, name: '菜品列表', icon: '🍔', path: '/admin/products', sort_order: 1 },
    { parent_id: 3, name: '口味规格', icon: '🌶️', path: '/admin/flavors', sort_order: 2 },
    { parent_id: 3, name: '组合套餐', icon: '🍱', path: '/admin/combos', sort_order: 3 },

    { parent_id: 4, name: '外卖平台', icon: '🔗', path: '/admin/platforms', sort_order: 1 },
    { parent_id: 4, name: '外卖报表', icon: '📊', path: '/admin/platform-reports', sort_order: 2 },
    { parent_id: 4, name: '外卖菜品报表', icon: '🥡', path: '/admin/delivery-product-stats', sort_order: 3 },

    { parent_id: 5, name: '会员列表', icon: '👥', path: '/admin/members', sort_order: 1 },
    { parent_id: 5, name: '优惠券', icon: '🎟️', path: '/admin/coupons', sort_order: 2 },
    { parent_id: 5, name: '员工列表', icon: '👤', path: '/admin/users', sort_order: 3 },
    { parent_id: 5, name: '角色权限', icon: '🔐', path: '/admin/roles', sort_order: 4 },

    { parent_id: 6, name: '销售统计', icon: '📈', path: '/admin/stats/product', sort_order: 1 },
    { parent_id: 6, name: '深度报表', icon: '📊', path: '/admin/reports', sort_order: 2 },
    { parent_id: 6, name: '货物进货', icon: '📦', path: '/admin/inventory', sort_order: 3 },

    { parent_id: 7, name: '首页内容', icon: '📝', path: '/admin/content', sort_order: 1 },
    { parent_id: 7, name: '菜单配置', icon: '📑', path: '/admin/menus', sort_order: 2 },
    { parent_id: 7, name: '表单管理', icon: '📄', path: '/admin/forms', sort_order: 3 },
    { parent_id: 7, name: '翻译管理', icon: '🌐', path: '/admin/translations', sort_order: 4 },
    { parent_id: 7, name: '系统设置', icon: '⚙️', path: '/admin/settings', sort_order: 5 },
  ];

  const insertParent = db.prepare('INSERT INTO menus (id, parent_id, name, icon, path, sort_order, enabled) VALUES (?, 0, ?, ?, ?, ?, 1)');
  parentMenus.forEach(m => insertParent.run(m.id, m.name, m.icon, m.path, m.sort_order));
  const insertSub = db.prepare('INSERT INTO menus (parent_id, name, icon, path, sort_order, enabled) VALUES (?, ?, ?, ?, ?, 1)');
  subMenus.forEach(m => insertSub.run(m.parent_id, m.name, m.icon, m.path, m.sort_order));
}
