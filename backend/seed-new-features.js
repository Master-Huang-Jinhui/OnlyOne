/**
 * 新功能测试数据生成脚本
 * 运行方式：cd backend && node seed-new-features.js
 * 
 * 生成数据：
 * - 5个会员（不同等级：普通/银卡/金卡/钻石）
 * - 4个优惠券（满减券/折扣券）
 * - 6个今日排队号（堂吃/外带，不同状态）
 * - 会员积分记录
 * - 会员领取的优惠券
 */

const Database = require('better-sqlite3')
const path = require('path')

const db = new Database(path.join(__dirname, 'data.db'))

// 确保新表存在（如果后端还没启动过，先创建表）
db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT DEFAULT '',
    birthday TEXT,
    note TEXT DEFAULT '',
    points INTEGER DEFAULT 0,
    level TEXT DEFAULT '普通会员',
    total_spent REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'fixed',
    value REAL NOT NULL,
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
    expire_date TEXT,
    obtained_at TEXT DEFAULT (datetime('now','localtime')),
    used_at TEXT,
    order_id INTEGER,
    FOREIGN KEY (member_id) REFERENCES members(id),
    FOREIGN KEY (coupon_id) REFERENCES coupons(id)
  );

  CREATE TABLE IF NOT EXISTS points_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    points INTEGER NOT NULL,
    balance INTEGER DEFAULT 0,
    reason TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (member_id) REFERENCES members(id)
  );

  CREATE TABLE IF NOT EXISTS queue_numbers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'dinein',
    customer_name TEXT DEFAULT '',
    note TEXT DEFAULT '',
    people_count INTEGER DEFAULT 1,
    status TEXT DEFAULT 'waiting',
    created_at TEXT DEFAULT (datetime('now','localtime')),
    called_at TEXT,
    completed_at TEXT
  );
`)

console.log('=== 开始生成新功能测试数据 ===\n')

// ========== 1. 会员数据 ==========
console.log('1. 生成会员数据...')

const members = [
  { name: '张三', phone: '9175550001', email: 'zhangsan@example.com', birthday: '1990-05-15', note: '常客，喜欢辣', points: 120, level: '普通会员', total_spent: 156.50 },
  { name: '李四', phone: '9175550002', email: 'lisi@example.com', birthday: '1988-08-22', note: '不要香菜', points: 350, level: '银卡会员', total_spent: 289.00 },
  { name: '王五', phone: '9175550003', email: 'wangwu@example.com', birthday: '1995-03-10', note: '', points: 680, level: '金卡会员', total_spent: 567.80 },
  { name: '赵六', phone: '9175550004', email: 'zhaoliu@example.com', birthday: '1992-11-28', note: 'VIP客户，生日送饮料', points: 1520, level: '钻石会员', total_spent: 1280.00 },
  { name: '陈小美', phone: '9175550005', email: 'chenxm@example.com', birthday: '2000-01-01', note: '新客户', points: 15, level: '普通会员', total_spent: 45.00 }
]

const insertMember = db.prepare(`
  INSERT OR IGNORE INTO members (name, phone, email, birthday, note, points, level, total_spent, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'))
`)

members.forEach(m => {
  const result = insertMember.run(m.name, m.phone, m.email, m.birthday, m.note, m.points, m.level, m.total_spent)
  if (result.changes > 0) {
    console.log(`  ✓ 会员: ${m.name} (${m.level})`)
  }
})

// ========== 2. 优惠券数据 ==========
console.log('\n2. 生成优惠券数据...')

const coupons = [
  { name: '新客立减5美元', type: 'fixed', value: 5, min_amount: 20, max_discount: null, valid_days: 30, stock: 100, used_count: 23, start_date: null, end_date: null, enabled: 1, sort_order: 1 },
  { name: '满50减10美元', type: 'fixed', value: 10, min_amount: 50, max_discount: null, valid_days: 7, stock: 50, used_count: 12, start_date: null, end_date: null, enabled: 1, sort_order: 2 },
  { name: '全场9折优惠券', type: 'percent', value: 10, min_amount: 30, max_discount: 15, valid_days: 14, stock: 200, used_count: 45, start_date: null, end_date: null, enabled: 1, sort_order: 3 },
  { name: '会员专享8.5折', type: 'percent', value: 15, min_amount: 80, max_discount: 25, valid_days: null, stock: null, used_count: 8, start_date: '2026-09-01', end_date: '2026-12-31', enabled: 1, sort_order: 4 }
]

const insertCoupon = db.prepare(`
  INSERT OR IGNORE INTO coupons (name, type, value, min_amount, max_discount, valid_days, stock, used_count, start_date, end_date, enabled, sort_order, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'))
`)

coupons.forEach(c => {
  const result = insertCoupon.run(c.name, c.type, c.value, c.min_amount, c.max_discount, c.valid_days, c.stock, c.used_count, c.start_date, c.end_date, c.enabled, c.sort_order)
  if (result.changes > 0) {
    console.log(`  ✓ 优惠券: ${c.name} (${c.type === 'fixed' ? '$' + c.value : c.value + '%'})`)
  }
})

// ========== 3. 会员领取优惠券 ==========
console.log('\n3. 生成会员领取记录...')

const memberIds = db.prepare('SELECT id, name FROM members ORDER BY id').all()
const couponIds = db.prepare('SELECT id, name FROM coupons ORDER BY id').all()

const insertMemberCoupon = db.prepare(`
  INSERT OR IGNORE INTO member_coupons (member_id, coupon_id, status, expire_date, obtained_at)
  VALUES (?, ?, 'unused', date('now','localtime','+30 days'), datetime('now','localtime'))
`)

if (memberIds.length >= 3 && couponIds.length >= 2) {
  const pairs = [
    [memberIds[0].id, couponIds[0].id],
    [memberIds[1].id, couponIds[1].id],
    [memberIds[2].id, couponIds[2].id],
    [memberIds[3].id, couponIds[0].id],
    [memberIds[3].id, couponIds[3].id]
  ]
  pairs.forEach(([mid, cid]) => {
    insertMemberCoupon.run(mid, cid)
  })
  console.log(`  ✓ 生成 ${pairs.length} 条会员领取记录`)
}

// ========== 4. 积分记录 ==========
console.log('\n4. 生成积分变动记录...')

const insertPointsLog = db.prepare(`
  INSERT OR IGNORE INTO points_logs (member_id, points, balance, reason, created_at)
  VALUES (?, ?, ?, ?, datetime('now','localtime'))
`)

if (memberIds.length >= 3) {
  const logs = [
    [memberIds[0].id, 50, 120, '消费赠送'],
    [memberIds[1].id, 100, 350, '消费赠送'],
    [memberIds[2].id, 200, 680, '消费赠送'],
    [memberIds[3].id, 500, 1520, '消费赠送'],
    [memberIds[3].id, -200, 1020, '积分兑换']
  ]
  logs.forEach(([mid, pts, bal, reason]) => {
    insertPointsLog.run(mid, pts, bal, reason)
  })
  console.log(`  ✓ 生成 ${logs.length} 条积分记录`)
}

// ========== 5. 排队叫号数据 ==========
console.log('\n5. 生成今日排队号...')

const insertQueue = db.prepare(`
  INSERT OR IGNORE INTO queue_numbers (number, type, customer_name, note, people_count, status, created_at, called_at, completed_at)
  VALUES (?, ?, ?, ?, ?, ?, datetime('now','localtime','-25 minutes'), datetime('now','localtime','-20 minutes'), datetime('now','localtime','-10 minutes'))
`)

const insertQueueWaiting = db.prepare(`
  INSERT OR IGNORE INTO queue_numbers (number, type, customer_name, note, people_count, status, created_at)
  VALUES (?, ?, ?, ?, ?, 'waiting', datetime('now','localtime','-5 minutes'))
`)

const insertQueueCalling = db.prepare(`
  INSERT OR IGNORE INTO queue_numbers (number, type, customer_name, note, people_count, status, created_at, called_at)
  VALUES (?, ?, ?, ?, ?, 'calling', datetime('now','localtime','-15 minutes'), datetime('now','localtime','-10 minutes'))
`)

// 已完成的排队号
const completedQueues = [
  ['A001', 'dinein', '张先生一家', '靠窗位置', 4, 'completed'],
  ['A002', 'dinein', '李女士', '', 2, 'completed'],
  ['B001', 'takeout', '王先生', '少辣', 1, 'completed'],
  ['B002', 'takeout', '赵先生', '', 3, 'completed']
]

completedQueues.forEach(q => {
  const result = insertQueue.run(q[0], q[1], q[2], q[3], q[4], q[5])
  if (result.changes > 0) console.log(`  ✓ 已完成: ${q[0]} (${q[1] === 'dinein' ? '堂吃' : '外带'})`)
})

// 等待中的排队号
const waitingQueues = [
  ['A003', 'dinein', '陈先生', '需要宝宝椅', 3],
  ['A004', 'dinein', '刘女士', '', 2],
  ['B003', 'takeout', '周先生', '不要葱', 1]
]

waitingQueues.forEach(q => {
  const result = insertQueueWaiting.run(q[0], q[1], q[2], q[3], q[4])
  if (result.changes > 0) console.log(`  ✓ 等待中: ${q[0]} (${q[1] === 'dinein' ? '堂吃' : '外带'})`)
})

// 叫号中的排队号
const callingQueues = [
  ['A005', 'dinein', '吴先生', '', 4]
]

callingQueues.forEach(q => {
  const result = insertQueueCalling.run(q[0], q[1], q[2], q[3], q[4])
  if (result.changes > 0) console.log(`  ✓ 叫号中: ${q[0]} (${q[1] === 'dinein' ? '堂吃' : '外带'})`)
})

// ========== 统计 ==========
console.log('\n=== 数据生成完成 ===')
const memberCount = db.prepare('SELECT COUNT(*) as cnt FROM members').get().cnt
const couponCount = db.prepare('SELECT COUNT(*) as cnt FROM coupons').get().cnt
const queueCount = db.prepare("SELECT COUNT(*) as cnt FROM queue_numbers WHERE date(created_at) = date('now','localtime')").get().cnt
const pointsLogCount = db.prepare('SELECT COUNT(*) as cnt FROM points_logs').get().cnt
const memberCouponCount = db.prepare('SELECT COUNT(*) as cnt FROM member_coupons').get().cnt

console.log(`
  会员总数: ${memberCount}
  优惠券总数: ${couponCount}
  今日排队号: ${queueCount}
  积分记录: ${pointsLogCount}
  会员领取记录: ${memberCouponCount}
`)

db.close()
console.log('\n数据库已关闭。可以启动后端查看效果了！')