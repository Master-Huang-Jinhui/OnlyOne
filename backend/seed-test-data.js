/**
 * Only One 系统测试数据生成脚本
 * 为所有24张表生成4-7条不同的测试数据
 * 运行: node backend/seed-test-data.js
 */
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.db');
const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

console.log('=== 开始生成测试数据 ===\n');

function randomDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysAgo));
  d.setHours(10 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function randomOrderNo(prefix) {
  const d = new Date();
  const dateStr = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  return `${prefix}${dateStr}${String(Math.floor(Math.random()*900)+100)}`;
}

console.log('[1/24] users...');
const userData = [
  { username: 'manager1', password: '123456', role: 'manager', name: '张经理', phone: '6461234567', email: 'manager@onlyone.com' },
  { username: 'employee1', password: '123456', role: 'employee', name: '李员工', phone: '6462345678', email: 'emp1@onlyone.com' },
  { username: 'employee2', password: '123456', role: 'employee', name: '王员工', phone: '6463456789', email: 'emp2@onlyone.com' },
  { username: 'customer1', password: '123456', role: 'user', name: '陈顾客', phone: '6464567890', email: 'cust1@example.com' },
  { username: 'customer2', password: '123456', role: 'user', name: '刘顾客', phone: '6465678901', email: 'cust2@example.com' },
];
const insertUser = db.prepare('INSERT OR IGNORE INTO users (username, password, role, name, phone, email, permissions, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, 1)');
userData.forEach(u => {
  const hash = bcrypt.hashSync(u.password, 10);
  insertUser.run(u.username, hash, u.role, u.name, u.phone, u.email, '{}');
});
console.log(`  插入 ${userData.length} 个用户`);

console.log('[2/24] platforms...');
const extraPlatforms = [
  { name: 'Seamless', account: 'only16201@hotmail.com', password: 'test123', url: 'https://www.seamless.com', note: 'Seamless 商家后台', sort_order: 9 },
  { name: 'Chowbus', account: 'onlyone@test.com', password: 'chowbus123', url: 'https://www.chowbus.com', note: '中餐外卖平台', sort_order: 10 },
];
const insertPlatform = db.prepare('INSERT OR IGNORE INTO platforms (name, logo, url, account, password, phone, note, enabled, weekly_status, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)');
extraPlatforms.forEach(p => insertPlatform.run(p.name, '', p.url, p.account, p.password, '', p.note, '{}', p.sort_order));
console.log(`  补充 ${extraPlatforms.length} 个平台`);

console.log('[3/24] categories...');
const extraCats = [
  { name: '特调饮品', name_en: 'Special Drinks', sort_order: 6 },
  { name: '套餐组合', name_en: 'Combo Sets', sort_order: 7 },
];
const insertCat = db.prepare('INSERT OR IGNORE INTO categories (name, name_en, sort_order, enabled) VALUES (?, ?, ?, 1)');
extraCats.forEach(c => insertCat.run(c.name, c.name_en, c.sort_order));
console.log(`  补充 ${extraCats.length} 个分类`);

console.log('[4/24] products...');
const catIds = db.prepare('SELECT id, name FROM categories').all();
const catMap = {};
catIds.forEach(c => catMap[c.name] = c.id);
const extraProducts = [
  { name: '芒果冰沙', name_en: 'Mango Smoothie', cat: '特调饮品', price: 6.99, desc: '新鲜芒果打制，香甜浓郁', recommend: 1, sort: 1 },
  { name: '草莓奶昔', name_en: 'Strawberry Milkshake', cat: '特调饮品', price: 6.49, desc: '新鲜草莓搭配牛奶', recommend: 0, sort: 2 },
  { name: '烤鱿鱼须', name_en: 'Grilled Squid Tentacles', cat: '烧烤串', price: 5.99, desc: 'Q弹有嚼劲，秘制酱料', recommend: 1, sort: 3 },
  { name: '烤茄子', name_en: 'Grilled Eggplant', cat: '烧烤串', price: 4.99, desc: '蒜蓉茄子，软糯入味', recommend: 0, sort: 4 },
  { name: '奶茶+烧烤套餐', name_en: 'Milk Tea + BBQ Combo', cat: '套餐组合', price: 12.99, desc: '任选奶茶1杯+烧烤3串', recommend: 1, sort: 1 },
  { name: '双人欢享套餐', name_en: 'Double Delight Combo', cat: '套餐组合', price: 24.99, desc: '奶茶2杯+烧烤6串+小食2份', recommend: 0, sort: 2 },
];
const insertProd = db.prepare('INSERT OR IGNORE INTO products (name, name_en, category_id, price, description, available, is_recommend, sort_order) VALUES (?, ?, ?, ?, ?, 1, ?, ?)');
extraProducts.forEach(p => insertProd.run(p.name, p.name_en, catMap[p.cat] || 1, p.price, p.desc, p.recommend, p.sort));
console.log(`  补充 ${extraProducts.length} 个商品`);

console.log('[5/24] orders...');
const tableIds = db.prepare('SELECT id, table_no FROM tables').all();
const orderData = [
  { dining_type: 'takeout', status: 'pending', name: '张三', phone: '6461112222', address: '', note: '少冰', total: 15.98, items: JSON.stringify([{name:'黑糖珍珠奶茶',qty:2,price:5.99}]) },
  { dining_type: 'takeout', status: 'preparing', name: '李四', phone: '6462223333', address: '', note: '不要珍珠', total: 10.48, items: JSON.stringify([{name:'香芋冰沙',qty:1,price:6.49},{name:'炸薯条',qty:1,price:3.99}]) },
  { dining_type: 'takeout', status: 'ready', name: '王五', phone: '6463334444', address: '', note: '', total: 8.98, items: JSON.stringify([{name:'烤羊肉串',qty:2,price:3.99},{name:'烤牛肉串',qty:1,price:4.49}]) },
  { dining_type: 'delivery', status: 'pending', name: '赵六', phone: '6464445555', address: '162-01 Sanford Ave, Apt 2F', note: '放门口', total: 22.97, items: JSON.stringify([{name:'奶茶+烧烤套餐',qty:1,price:12.99},{name:'芒果冰沙',qty:1,price:6.99},{name:'感谢支持',qty:1,price:1.00}]) },
  { dining_type: 'dinein', status: 'completed', name: '', phone: '', address: '', note: 'A1桌', total: 35.96, table_id: tableIds[0]?.id, items: JSON.stringify([{name:'双人欢享套餐',qty:1,price:24.99},{name:'草莓奶昔',qty:1,price:6.49},{name:'长乐冰饭',qty:1,price:7.99}]) },
  { dining_type: 'dinein', status: 'cancelled', name: '', phone: '', address: '', note: '客人取消', total: 5.99, table_id: tableIds[1]?.id, items: JSON.stringify([{name:'黑糖珍珠奶茶',qty:1,price:5.99}]) },
];
const insertOrder = db.prepare(`INSERT OR IGNORE INTO orders (order_no, items, subtotal, tax, delivery_fee, total, dining_type, customer_name, customer_phone, customer_address, note, status, table_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
orderData.forEach((o, i) => {
  const prefix = o.dining_type === 'dinein' ? 'D' : o.dining_type === 'delivery' ? 'E' : 'T';
  const subtotal = o.total / 1.08875;
  const tax = o.total - subtotal;
  const deliveryFee = o.dining_type === 'delivery' ? 3.99 : 0;
  insertOrder.run(randomOrderNo(prefix), o.items, subtotal.toFixed(2), tax.toFixed(2), deliveryFee, o.total, o.dining_type, o.name, o.phone, o.address, o.note, o.status, o.table_id || null, randomDate(7));
});
console.log(`  插入 ${orderData.length} 个订单`);

console.log('[6/24] tables...');
if (tableIds.length >= 4) {
  db.prepare("UPDATE tables SET status = 'occupied' WHERE id = ?").run(tableIds[2].id);
  db.prepare("UPDATE tables SET status = 'occupied' WHERE id = ?").run(tableIds[3].id);
}
console.log(`  更新了2个桌子状态为占用`);

console.log('[7/24] memos...');
const memoData = [
  { title: '周五进货', content: '需要进货：珍珠、牛奶、羊肉', type: 'memo', priority: 'high', completed: 0 },
  { title: '设备维护', content: '奶茶机需要清洗，检查冰箱温度', type: 'memo', priority: 'medium', completed: 0 },
  { title: '员工排班', content: '下周排班表需要更新', type: 'memo', priority: 'normal', completed: 1 },
  { title: '新品试做', content: '西瓜冰沙柠檬茶试做，调整甜度', type: 'todo', priority: 'high', completed: 0 },
  { title: '清洁卫生', content: '后厨深度清洁，检查油烟机', type: 'todo', priority: 'medium', completed: 1 },
];
const insertMemo = db.prepare('INSERT OR IGNORE INTO memos (title, content, type, priority, completed, created_at) VALUES (?, ?, ?, ?, ?, ?)');
memoData.forEach(m => insertMemo.run(m.title, m.content, m.type, m.priority, m.completed, randomDate(14)));
console.log(`  插入 ${memoData.length} 个备忘录`);

console.log('[8/24] forms...');
const formData = [
  { name: '员工入职表', description: '新员工入职信息登记', fields: JSON.stringify([{label:'姓名',type:'text',required:true},{label:'电话',type:'tel',required:true},{label:'地址',type:'textarea'},{label:'入职日期',type:'date'}]) },
  { name: '食材采购申请', description: '后厨食材采购申请表单', fields: JSON.stringify([{label:'食材名称',type:'text',required:true},{label:'数量',type:'number',required:true},{label:'单位',type:'select',options:['斤','磅','个','箱']},{label:'预计价格',type:'number'},{label:'备注',type:'textarea'}]) },
  { name: '顾客反馈表', description: '顾客意见和建议收集', fields: JSON.stringify([{label:'姓名',type:'text'},{label:'联系方式',type:'tel'},{label:'满意度',type:'select',options:['非常满意','满意','一般','不满意']},{label:'建议',type:'textarea',required:true}]) },
  { name: '设备报修单', description: '店内设备故障报修', fields: JSON.stringify([{label:'设备名称',type:'text',required:true},{label:'故障描述',type:'textarea',required:true},{label:'报修人',type:'text'},{label:'紧急程度',type:'select',options:['紧急','一般','不急']}]) },
];
const insertForm = db.prepare('INSERT OR IGNORE INTO forms (name, description, fields, enabled, created_at) VALUES (?, ?, ?, 1, ?)');
formData.forEach(f => insertForm.run(f.name, f.description, f.fields, randomDate(30)));
console.log(`  插入 ${formData.length} 个表单`);

console.log('[9/24] form_submissions...');
const formIds = db.prepare('SELECT id, name FROM forms').all();
const submissionData = [
  { form_idx: 0, data: JSON.stringify({姓名:'测试员工A',电话:'6461111111',地址:'法拉盛',入职日期:'2026-09-01'}) },
  { form_idx: 1, data: JSON.stringify({食材名称:'珍珠',数量:5,单位:'斤',预计价格:25,备注:'黑糖珍珠'}) },
  { form_idx: 2, data: JSON.stringify({姓名:'顾客A',联系方式:'6462222222',满意度:'满意',建议:'奶茶甜度可以再调整'}) },
  { form_idx: 3, data: JSON.stringify({设备名称:'制冰机',故障描述:'制冰速度变慢',报修人:'李员工',紧急程度:'一般'}) },
  { form_idx: 0, data: JSON.stringify({姓名:'测试员工B',电话:'6463333333',地址:'皇后区',入职日期:'2026-09-05'}) },
];
const insertSubmission = db.prepare('INSERT OR IGNORE INTO form_submissions (form_id, data, created_at) VALUES (?, ?, ?)');
submissionData.forEach(s => {
  if (formIds[s.form_idx]) insertSubmission.run(formIds[s.form_idx].id, s.data, randomDate(10));
});
console.log(`  插入 ${submissionData.length} 个表单提交`);

console.log('[10/24] content_sections...');
const sectionData = [
  { title: '品牌故事', title_en: 'Brand Story', content: 'Only One BBQ & Tea 创立于纽约法拉盛，致力于为顾客提供最正宗的烧烤和新式茶饮。我们坚持使用新鲜食材，现点现做。', content_en: 'Founded in Flushing, NY, Only One BBQ & Tea is dedicated to serving authentic BBQ and modern tea drinks.', icon: '📖', layout: 'left', sort: 1 },
  { title: '茶品溯源', title_en: 'Tea Sourcing', content: '我们精选来自世界各地的优质茶叶，从乌龙茶到绿茶，每一杯都经过严格把控。', content_en: 'We select premium tea leaves from around the world.', icon: '🍃', layout: 'right', sort: 2 },
  { title: '奶茶工艺', title_en: 'Craft Philosophy', content: '原叶现萃、鲜果鲜做、甜度可控、现点现做，这是我们的四大承诺。', content_en: 'Fresh brewed, fresh fruit, adjustable sweetness, made to order.', icon: '⚗️', layout: 'left', sort: 3 },
  { title: '关于我们', title_en: 'About Us', content: '地址：162-01 Sanford Ave, Flushing, NY。营业时间：周一至周日 10:00-21:00（周二休息）。', content_en: 'Address: 162-01 Sanford Ave, Flushing, NY.', icon: '📍', layout: 'right', sort: 4 },
];
const insertSection = db.prepare('INSERT OR IGNORE INTO content_sections (title, title_en, content, content_en, icon, layout, sort_order, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, 1)');
sectionData.forEach(s => insertSection.run(s.title, s.title_en, s.content, s.content_en, s.icon, s.layout, s.sort));
console.log(`  插入 ${sectionData.length} 个内容板块`);

console.log('[11/24] new_products...');
const newProdData = [
  { name: '西瓜冰沙柠檬茶', name_en: 'Watermelon Smoothie Lemon Tea', description: '夏日限定，清爽解暑', description_en: 'Summer limited edition', sort: 1 },
  { name: '泰式奶茶', name_en: 'Thai Milk Tea', description: '正宗泰式风味，香浓顺滑', description_en: 'Authentic Thai flavor', sort: 2 },
  { name: '烤秋刀鱼', name_en: 'Grilled Saury', description: '外焦里嫩，鲜香四溢', description_en: 'Crispy outside, tender inside', sort: 3 },
];
const insertNewProd = db.prepare('INSERT OR IGNORE INTO new_products (name, name_en, description, description_en, sort_order, enabled) VALUES (?, ?, ?, ?, ?, 1)');
newProdData.forEach(p => insertNewProd.run(p.name, p.name_en, p.description, p.description_en, p.sort));
console.log(`  插入 ${newProdData.length} 个新品`);

console.log('[12/24] content_blocks...');
const blockData = [
  { block_key: 'custom_block_1', title: '自定义板块1', title_en: 'Custom Block 1', content: '这是一个自定义内容板块，可以在后台编辑。', content_en: 'This is a custom content block.', sort: 1 },
  { block_key: 'custom_block_2', title: '营业时间', title_en: 'Business Hours', content: '周一至周日 10:00-21:00，周二休息', content_en: 'Mon-Sun 10AM-9PM, Tue closed', sort: 2 },
  { block_key: 'custom_block_3', title: '联系方式', title_en: 'Contact', content: '电话：630-776-3590，地址：162-01 Sanford Ave', content_en: 'Phone: 630-776-3590', sort: 3 },
  { block_key: 'custom_block_4', title: '招聘信息', title_en: 'We are Hiring', content: '现招聘服务员和后厨，有意者请进店咨询', content_en: 'Now hiring servers and kitchen staff', sort: 4 },
];
const insertBlock = db.prepare('INSERT OR IGNORE INTO content_blocks (block_key, title, title_en, content, content_en, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
blockData.forEach(b => insertBlock.run(b.block_key, b.title, b.title_en, b.content, b.content_en, b.sort));
console.log(`  插入 ${blockData.length} 个内容块`);

console.log('[13/24] attendance...');
const empUsers = db.prepare("SELECT id, name FROM users WHERE role = 'employee'").all();
const attendanceData = [];
for (let i = 0; i < 6; i++) {
  const emp = empUsers[i % empUsers.length];
  const d = new Date();
  d.setDate(d.getDate() - i);
  const dateStr = d.toISOString().slice(0, 10);
  const clockIn = `0${9 + (i % 2)}:${String(Math.floor(Math.random()*30)+10).padStart(2,'0')}:00`;
  const clockOut = i % 3 === 0 ? null : `${20 + (i % 2)}:${String(Math.floor(Math.random()*30)+10).padStart(2,'0')}:00`;
  attendanceData.push({ user_id: emp?.id, user_name: emp?.name, date: dateStr, clock_in: clockIn, clock_out: clockOut });
}
const insertAttendance = db.prepare('INSERT OR IGNORE INTO attendance (user_id, user_name, date, clock_in, clock_out, created_at) VALUES (?, ?, ?, ?, ?, ?)');
attendanceData.forEach(a => insertAttendance.run(a.user_id, a.user_name, a.date, a.clock_in, a.clock_out, randomDate(7)));
console.log(`  插入 ${attendanceData.length} 条打卡记录`);

console.log('[14/24] goods...');
const goodsData = [
  { name: '珍珠', name_en: 'Tapioca Pearls', unit: '磅', current_stock: 25, avg_price: 3.5, supplier: '美国中餐超市', category: '原料' },
  { name: '牛奶', name_en: 'Milk', unit: '加仑', current_stock: 8, avg_price: 4.2, supplier: 'Costco', category: '原料' },
  { name: '羊肉', name_en: 'Lamb', unit: '磅', current_stock: 15, avg_price: 8.9, supplier: '华人肉铺', category: '肉类' },
  { name: '红茶茶叶', name_en: 'Black Tea Leaves', unit: '磅', current_stock: 5, avg_price: 12.0, supplier: '茶叶批发商', category: '茶叶' },
  { name: '一次性杯子', name_en: 'Disposable Cups', unit: '箱', current_stock: 12, avg_price: 25.0, supplier: 'Amazon', category: '包装' },
  { name: '吸管', name_en: 'Straws', unit: '箱', current_stock: 6, avg_price: 15.0, supplier: 'Amazon', category: '包装' },
];
const insertGoods = db.prepare('INSERT OR IGNORE INTO goods (name, name_en, unit, current_stock, avg_price, supplier, category, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
goodsData.forEach(g => insertGoods.run(g.name, g.name_en, g.unit, g.current_stock, g.avg_price, g.supplier, g.category, '', randomDate(30), randomDate(7)));
console.log(`  插入 ${goodsData.length} 个货物`);

console.log('[15/24] purchase_orders...');
const poData = [
  { supplier: '美国中餐超市', order_date: '2026-09-05', total_amount: 85.5, delivery_fee: 0, discount: 5, payment_method: 'COD', note: '每周固定采购' },
  { supplier: 'Costco', order_date: '2026-09-03', total_amount: 120.0, delivery_fee: 0, discount: 0, payment_method: 'Card', note: '牛奶和日用品' },
  { supplier: '华人肉铺', order_date: '2026-09-06', total_amount: 156.8, delivery_fee: 10, discount: 0, payment_method: 'COD', note: '羊肉和牛肉' },
  { supplier: 'Amazon', order_date: '2026-09-01', total_amount: 65.0, delivery_fee: 0, discount: 0, payment_method: 'Card', note: '杯子和吸管' },
];
const insertPO = db.prepare('INSERT OR IGNORE INTO purchase_orders (order_no, supplier, order_date, total_amount, delivery_fee, discount, payment_method, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
poData.forEach((p, i) => insertPO.run(`PO${20260900 + i}`, p.supplier, p.order_date, p.total_amount, p.delivery_fee, p.discount, p.payment_method, p.note, randomDate(10)));
console.log(`  插入 ${poData.length} 个采购单`);

console.log('[16/24] purchase_order_items...');
const goodsList = db.prepare('SELECT id, name FROM goods').all();
const poList = db.prepare('SELECT id FROM purchase_orders').all();
const poiData = [
  { po_idx: 0, goods_idx: 0, qty: 10, price: 3.5 },
  { po_idx: 0, goods_idx: 3, qty: 2, price: 12.0 },
  { po_idx: 1, goods_idx: 1, qty: 5, price: 4.2 },
  { po_idx: 2, goods_idx: 2, qty: 12, price: 8.9 },
  { po_idx: 3, goods_idx: 4, qty: 2, price: 25.0 },
  { po_idx: 3, goods_idx: 5, qty: 1, price: 15.0 },
  { po_idx: 0, goods_idx: 5, qty: 1, price: 15.0 },
  { po_idx: 1, goods_idx: 4, qty: 1, price: 25.0 },
];
const insertPOI = db.prepare('INSERT OR IGNORE INTO purchase_order_items (purchase_order_id, goods_id, goods_name, quantity, unit, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)');
poiData.forEach(item => {
  if (poList[item.po_idx] && goodsList[item.goods_idx]) {
    const g = goodsList[item.goods_idx];
    insertPOI.run(poList[item.po_idx].id, g.id, g.name, item.qty, '个', item.price, (item.qty * item.price).toFixed(2));
  }
});
console.log(`  插入 ${poiData.length} 个采购单项`);

console.log('[17/24] profit_records...');
const productList = db.prepare('SELECT id, name, price FROM products LIMIT 8').all();
const profitData = [
  { product_idx: 0, purchase_price: 1.2, purchase_qty: 1, unit: '杯', portion: 1, sell_price: 5.99 },
  { product_idx: 1, purchase_price: 1.5, purchase_qty: 1, unit: '杯', portion: 1, sell_price: 6.49 },
  { product_idx: 3, purchase_price: 1.8, purchase_qty: 1, unit: '串', portion: 1, sell_price: 3.99 },
  { product_idx: 4, purchase_price: 2.0, purchase_qty: 1, unit: '串', portion: 1, sell_price: 4.49 },
  { product_idx: 5, purchase_price: 2.5, purchase_qty: 1, unit: '份', portion: 1, sell_price: 5.99 },
];
const insertProfit = db.prepare('INSERT OR IGNORE INTO profit_records (product_id, product_name, purchase_price, purchase_qty, unit, portion_per_unit, sell_price, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
profitData.forEach(p => {
  if (productList[p.product_idx]) {
    const prod = productList[p.product_idx];
    insertProfit.run(prod.id, prod.name, p.purchase_price, p.purchase_qty, p.unit, p.portion, p.sell_price || prod.price, randomDate(14));
  }
});
console.log(`  插入 ${profitData.length} 条商品利润记录`);

console.log('[18/24] role_permissions...');
const managerUser = db.prepare("SELECT id FROM users WHERE role = 'manager'").get();
const menuList = db.prepare('SELECT id, name FROM menus LIMIT 8').all();
if (managerUser && menuList.length > 0) {
  const insertRP = db.prepare('INSERT OR IGNORE INTO role_permissions (user_id, menu_id, can_view, can_edit) VALUES (?, ?, ?, ?)');
  menuList.slice(0, 5).forEach((m, i) => {
    insertRP.run(managerUser.id, m.id, 1, i < 3 ? 1 : 0);
  });
  console.log(`  插入 5 条角色权限`);
} else {
  console.log('  跳过（无manager用户或菜单）');
}

console.log('[19/24] carousel...');
const extraCarousel = [
  { image: '', title: '新品上市 泰式奶茶', link: '', sort: 4, enabled: 1 },
  { image: '', title: '双人套餐 限时优惠', link: '', sort: 5, enabled: 1 },
];
const insertCarousel = db.prepare('INSERT OR IGNORE INTO carousel (image, title, link, sort_order, enabled) VALUES (?, ?, ?, ?, ?)');
extraCarousel.forEach(c => insertCarousel.run(c.image, c.title, c.link, c.sort, c.enabled));
console.log(`  补充 ${extraCarousel.length} 个轮播图`);

console.log('\n=== 测试数据生成完成 ===');
console.log('共涉及 19 张表的数据插入/更新');
console.log('现有表总数: 24张');

db.close();
