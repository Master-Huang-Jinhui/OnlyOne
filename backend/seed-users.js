// 生成测试用户脚本
// 运行方式: cd backend && node seed-users.js

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'data.db'));

console.log('=== 生成测试用户 ===\n');

// 1. 删除旧测试用户（保留 admin）
db.prepare("DELETE FROM users WHERE username != 'admin'").run();
console.log('1. 已清理旧测试用户（保留 admin）');

// 2. 获取角色列表
const roles = db.prepare('SELECT id, name FROM roles').all();
const getRoleIdByName = (name) => roles.find(r => r.name === name)?.id;

// 3. 定义测试用户
const testUsers = [
  { username: 'manager', password: '123456', role: 'manager', role_name: '管理员', name: '张经理', phone: '13800138001', email: 'manager@onlyone.com' },
  { username: 'employee', password: '123456', role: 'employee', role_name: '员工', name: '李员工', phone: '13800138002', email: 'employee@onlyone.com' },
  { username: 'customer', password: '123456', role: 'user', role_name: '普通用户', name: '陈顾客', phone: '13800138003', email: 'customer@onlyone.com' },
  { username: 'kitchen', password: '123456', role: 'manager', role_name: '厨房师傅', name: '王师傅', phone: '13800138004', email: 'kitchen@onlyone.com' },
  { username: 'cashier', password: '123456', role: 'manager', role_name: '收银员', name: '赵收银', phone: '13800138005', email: 'cashier@onlyone.com' }
];

// 4. 插入测试用户
const insert = db.prepare(`INSERT INTO users (username, password, role, role_id, name, phone, email, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`);

testUsers.forEach(u => {
  const hashed = bcrypt.hashSync(u.password, 10);
  const roleId = getRoleIdByName(u.role_name);
  if (roleId) {
    insert.run(u.username, hashed, u.role, roleId, u.name, u.phone, u.email);
    console.log(`   ✓ ${u.username} / ${u.password} (${u.name}) -> ${u.role_name}`);
  } else {
    console.log(`   ✗ ${u.username} 跳过（未找到角色: ${u.role_name}）`);
  }
});

// 5. 验证结果
console.log('\n=== 验证结果 ===');
const users = db.prepare('SELECT id, username, role, role_id, name FROM users ORDER BY id').all();
users.forEach(u => {
  const role = roles.find(r => r.id === u.role_id);
  console.log(`  #${u.id} ${u.username} | ${u.name} | ${role?.name || '未知'}`);
});

console.log('\n=== 完成！===');
console.log('账号列表：');
console.log('  admin / admin       - 超级管理员');
console.log('  manager / 123456    - 管理员');
console.log('  employee / 123456   - 员工（员工端）');
console.log('  customer / 123456   - 普通用户（前台）');
console.log('  kitchen / 123456    - 厨房师傅');
console.log('  cashier / 123456    - 收银员');

db.close();
