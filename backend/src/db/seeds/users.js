// 用户和角色初始化数据
const bcrypt = require('bcryptjs');

module.exports = function(db) {
  // 创建默认管理员
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    const hash = bcrypt.hashSync('admin', 10);
    db.prepare(`INSERT INTO users (username, password, role, name, permissions) VALUES (?, ?, 'admin', '超级管理员', '{}')`).run('admin', hash);
  }

  // 默认角色
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
}
