const express = require('express');
const db = require('../db');
const { auth, managerAccess } = require('../middleware/auth');

const router = express.Router();

// 获取所有启用的订单状态（前台/员工端用），支持按订单类型过滤
router.get('/', (req, res) => {
  const { dining_type } = req.query;
  let sql = 'SELECT * FROM order_statuses WHERE enabled = 1';
  const params = [];
  if (dining_type) {
    sql += ' AND dining_type = ?';
    params.push(dining_type);
  }
  sql += ' ORDER BY dining_type, sort_order, id';
  const statuses = db.prepare(sql).all(...params);
  res.json(statuses);
});

// 获取所有订单状态（后台管理用，含禁用的）
router.get('/all', auth, managerAccess, (req, res) => {
  const statuses = db.prepare('SELECT * FROM order_statuses ORDER BY dining_type, sort_order, id').all();
  res.json(statuses);
});

// 新增订单状态
router.post('/', auth, managerAccess, (req, res) => {
  const { status_key, dining_type = 'all', label, color = 'default', sort_order = 0, enabled = 1, is_active = 0, next_status = null, next_label = null } = req.body;
  if (!status_key || !label) return res.status(400).json({ error: '状态标识和名称必填' });
  const result = db.prepare(
    'INSERT INTO order_statuses (status_key, dining_type, label, color, sort_order, enabled, is_active, next_status, next_label) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(status_key, dining_type, label, color, sort_order, enabled ? 1 : 0, is_active ? 1 : 0, next_status, next_label);
  res.json({ id: result.lastInsertRowid });
});

// 更新订单状态
router.put('/:id', auth, managerAccess, (req, res) => {
  const { status_key, dining_type, label, color, sort_order, enabled, is_active, next_status, next_label } = req.body;
  const fields = [];
  const values = [];
  if (status_key !== undefined) { fields.push('status_key = ?'); values.push(status_key); }
  if (dining_type !== undefined) { fields.push('dining_type = ?'); values.push(dining_type); }
  if (label !== undefined) { fields.push('label = ?'); values.push(label); }
  if (color !== undefined) { fields.push('color = ?'); values.push(color); }
  if (sort_order !== undefined) { fields.push('sort_order = ?'); values.push(sort_order); }
  if (enabled !== undefined) { fields.push('enabled = ?'); values.push(enabled ? 1 : 0); }
  if (is_active !== undefined) { fields.push('is_active = ?'); values.push(is_active ? 1 : 0); }
  if (next_status !== undefined) { fields.push('next_status = ?'); values.push(next_status); }
  if (next_label !== undefined) { fields.push('next_label = ?'); values.push(next_label); }
  if (fields.length === 0) return res.status(400).json({ error: '没有要更新的字段' });
  values.push(req.params.id);
  db.prepare(`UPDATE order_statuses SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ success: true });
});

// 删除订单状态
router.delete('/:id', auth, managerAccess, (req, res) => {
  db.prepare('DELETE FROM order_statuses WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
