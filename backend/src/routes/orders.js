const express = require('express');
const db = require('../db');
const { auth, managerAccess } = require('../middleware/auth');
const { auditLog } = require('../utils/audit');

// ============================================================
// 【功能路线图 - 订单模块】详见 FEATURE_ROADMAP.md
// TODO[P1] KDS厨房显示系统：新建 /kds 页面，订单按商品分类分区域显示，超时预警，点击推进状态
// TODO[P1] 实时库存扣减：下单成功时根据商品配方(recipe)自动扣减goods表库存，库存不足预警
// TODO[P1] CRM客户匹配：下单时按手机号自动匹配/创建customers表记录，累加消费总额和订单数
// TODO[P2] 分账/并桌/转桌：员工端支持AA分账、两桌合并、订单转桌
// TODO[P2] 多种支付方式：订单添加payment_method字段（现金/刷卡/Apple Pay等）
// TODO[P2] 预订/预点：支持顾客指定取餐时间的预订单
// ============================================================

const router = express.Router();