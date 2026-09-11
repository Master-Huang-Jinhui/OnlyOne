/**
 * 清理脏数据 + 为每个角色创建测试用户
 * 运行方式：cd backend && node reset-users.js
 */
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const db = new Database('data.db');

console.log('=== 开始清理和创建测试用户 ===\n');

// 1. 删除旧用户（保留 admin）
const deleteResult = db.prepare("DELETE FROM users WHERE username != 'admin'").run();
console.log(`1. 删除旧用户: ${deleteResult.changes} 个（保留 admin）`);

// 2. 重置 admin 密码为 admin
const adminHash = bcrypt.hashSync('admin', 10);
db.prepare("UPDATE users SET password = ?, name = '超级管理员', role = 'admin', role_id = 1, enabled = 1 WHERE username = 'admin'").run(adminHash);
console.log('2. 重置 admin 密码为 admin');

// 3. 定义测试用户
const testUsers = [
  { username: 'manager',  name: '张经理',   role: 'manager',  role_id: 2, password: '123456', phone: '13800000001', email: 'manager@onlyone.com' },
  { username: 'employee', name: '李员工',   role: 'employee', role_id: 3, password: '123456', phone: '13800000002', email: 'employee@onlyone.com' },
  { username: 'customer', name: '陈顾客',   role: 'user',     role_id: 4, password: '123456', phone: '13800000003', email: 'customer@onlyone.com' },
  { username: 'kitchen',  name: '王师傅',   role: 'employee', role_id: 5, password: '123456', phone: '13800000004', email: 'kitchen@onlyone.com' },
  { username: 'cashier',  name: '赵收银',   role: 'employee', role_id: 6, password: '123456', phone: '13800000005', email: 'cashier@onlyone.com' },
];

const insertUser = db.prepare(`
  INSERT INTO users (username, password, name, role, role_id, phone, email, permissions, enabled, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, '{}', 1, datetime('now','localtime'))
`);

console.log('\n3. 创建测试用户:');
testUsers.forEach(u => {
  const hash = bcrypt.hashSync(u.password, 10);
  insertUser.run(u.username, hash, u.name, u.role, u.role_id, u.phone, u.email);
  console.log(`   ✅ ${u.username} / ${u.password} - ${u.name} (角色ID: ${u.role_id})`);
});

// 4. 为自定义角色配置菜单权限
console.log('\n4. 配置角色菜单权限:');

// 厨房师傅：订单管理（查看）
const kitchenMenus = [3];
db.prepare("UPDATE roles SET permissions = ? WHERE id = 5").run(JSON.stringify({ menus: kitchenMenus }));
console.log('   ✅ 厨房师傅: 订单管理（查看）');

// 收银员：订单管理 + 餐桌管理 + 订单状态管理
const cashierMenus = [3, 11, 13];
db.prepare("UPDATE roles SET permissions = ? WHERE id = 6").run(JSON.stringify({ menus: cashierMenus }));
console.log('   ✅ 收银员: 订单管理 + 订单状态管理 + 餐桌管理');

// 5. 验证结果
console.log('\n5. 验证结果:');
const users = db.prepare('SELECT id, username, name, role, role_id, enabled FROM users ORDER BY id').all();
users.forEach(u => {
  const roleName = db.prepare('SELECT name FROM roles WHERE id = ?').get(u.role_id)?.name || '-';
  console.log(`   #${u.id} ${u.username} - ${u.name} [${u.role}] role_id=${u.role_id}(${roleName}) ${u.enabled ? '启用' : '禁用'}`);
});

console.log('\n=== 完成 ===');
console.log('\n测试账号汇总:');
console.log('  超级管理员: admin / admin');
console.log('  管理员:     manager / 123456');
console.log('  员工:       employee / 123456');
console.log('  顾客:       customer / 123456');
console.log('  厨房师傅:   kitchen / 123456');
console.log('  收银员:     cashier / 123456');

db.close();
