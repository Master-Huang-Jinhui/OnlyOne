const express = require('express');
const db = require('../db');
const { auth, managerAccess } = require('../middleware/auth');

const router = express.Router();

// 统计所有菜品销量（从 orders.items JSON 聚合）
function calcProductStats() {
  const products = db.prepare('SELECT id, name, name_en, category_id, price, available FROM products').all();
  const orders = db.prepare("SELECT items FROM orders WHERE status != 'cancelled'").all();

  const statsMap = {};
  for (const p of products) {
    statsMap[p.id] = { product_id: p.id, name: p.name, category_id: p.category_id, price: p.price, available: p.available, order_count: 0, total_sold: 0 };
  }

  for (const o of orders) {
    let items = [];
    try { items = JSON.parse(o.items || '[]'); } catch { continue; }
    const seenInOrder = new Set();
    for (const it of items) {
      const pid = it.id;
      if (!statsMap[pid]) continue;
      if (!seenInOrder.has(pid)) {
        statsMap[pid].order_count++;
        seenInOrder.add(pid);
      }
      statsMap[pid].total_sold += parseInt(it.quantity) || 0;
    }
  }

  return Object.values(statsMap).sort((a, b) => b.order_count - a.order_count || b.total_sold - a.total_sold);
}

// 全部菜品统计
router.get('/products', auth, managerAccess, (req, res) => {
  const list = calcProductStats();
  const hotThreshold = parseInt(req.query.threshold) || 15;
  const result = list.map(item => {
    let tag = 'cold';
    if (item.order_count >= hotThreshold) tag = 'hot';
    else if (item.order_count >= 1) tag = 'normal';
    return { ...item, tag, tagText: tag === 'hot' ? '🔥 热销' : tag === 'normal' ? '📈 平销' : '🪫 滞销' };
  });
  res.json(result);
});

// TOP5 热销（首页卡片用）
router.get('/products/top5', auth, managerAccess, (req, res) => {
  const list = calcProductStats().filter(i => i.order_count > 0).slice(0, 5);
  res.json(list);
});

module.exports = router;
