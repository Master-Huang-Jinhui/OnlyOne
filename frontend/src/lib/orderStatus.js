// 按订单类型区分的订单状态映射
// 底层状态：pending, preparing, ready, completed, cancelled
// 不同订单类型显示不同的状态文字和流转

// 堂吃：进行中（pending/preparing/ready 合并显示）、已完成、已取消
// 打包：进行中（pending/preparing 合并显示）、待取餐（ready）、已完成、已取消
// 配送：进行中（pending/preparing 合并显示）、配送中（ready）、已完成、已取消

const DINING_LABELS = {
  dinein: '堂吃',
  takeout: '自取',
  delivery: '配送'
}

// 获取状态显示文字
export function getStatusLabel(diningType, status) {
  if (status === 'completed') return '已完成'
  if (status === 'cancelled') return '已取消'

  if (diningType === 'dinein') {
    // 堂吃：pending/preparing/ready 都显示为"进行中"
    return '进行中'
  }

  if (diningType === 'takeout') {
    if (status === 'ready') return '待取餐'
    return '进行中' // pending/preparing
  }

  if (diningType === 'delivery') {
    if (status === 'ready') return '配送中'
    return '进行中' // pending/preparing
  }

  // 默认
  const defaultMap = { pending: '待处理', preparing: '制作中', ready: '待取餐' }
  return defaultMap[status] || status
}

// 获取状态标签颜色 variant
export function getStatusVariant(diningType, status) {
  if (status === 'completed') return 'success'
  if (status === 'cancelled') return 'danger'

  if (diningType === 'dinein') {
    return 'primary' // 进行中
  }

  if (diningType === 'takeout') {
    if (status === 'ready') return 'primary'
    return 'warning' // 进行中
  }

  if (diningType === 'delivery') {
    if (status === 'ready') return 'primary'
    return 'warning' // 进行中
  }

  const defaultMap = { pending: 'warning', preparing: 'primary', ready: 'primary' }
  return defaultMap[status] || 'default'
}

// 获取下一个状态（推进进程）
export function getNextStatus(diningType, status) {
  if (status === 'completed' || status === 'cancelled') return null

  if (diningType === 'dinein') {
    // 堂吃：进行中直接到已完成
    if (status === 'pending' || status === 'preparing' || status === 'ready') {
      return 'completed'
    }
    return null
  }

  if (diningType === 'takeout') {
    // 打包：进行中 → 待取餐 → 已完成
    if (status === 'pending' || status === 'preparing') return 'ready'
    if (status === 'ready') return 'completed'
    return null
  }

  if (diningType === 'delivery') {
    // 配送：进行中 → 配送中 → 已完成
    if (status === 'pending' || status === 'preparing') return 'ready'
    if (status === 'ready') return 'completed'
    return null
  }

  // 默认
  const defaultNext = { pending: 'preparing', preparing: 'ready', ready: 'completed' }
  return defaultNext[status] || null
}

// 获取下一个状态的按钮文字
export function getNextLabel(diningType, status) {
  const next = getNextStatus(diningType, status)
  if (!next) return null

  if (diningType === 'dinein') {
    if (next === 'completed') return '完成结账'
  }

  if (diningType === 'takeout') {
    if (next === 'ready') return '制作完成'
    if (next === 'completed') return '确认取餐'
  }

  if (diningType === 'delivery') {
    if (next === 'ready') return '开始配送'
    if (next === 'completed') return '配送完成'
  }

  const defaultLabels = { preparing: '开始制作', ready: '制作完成', completed: '确认完成' }
  return defaultLabels[next] || '推进'
}

// 获取订单类型的筛选标签列表
export function getStatusFilters(diningType) {
  if (diningType === 'dinein') {
    return [
      { key: '', label: '全部' },
      { key: 'active', label: '进行中' },
      { key: 'completed', label: '已完成' },
      { key: 'cancelled', label: '已取消' }
    ]
  }

  if (diningType === 'takeout') {
    return [
      { key: '', label: '全部' },
      { key: 'active', label: '进行中' },
      { key: 'ready', label: '待取餐' },
      { key: 'completed', label: '已完成' },
      { key: 'cancelled', label: '已取消' }
    ]
  }

  if (diningType === 'delivery') {
    return [
      { key: '', label: '全部' },
      { key: 'active', label: '进行中' },
      { key: 'ready', label: '配送中' },
      { key: 'completed', label: '已完成' },
      { key: 'cancelled', label: '已取消' }
    ]
  }

  return [
    { key: '', label: '全部' },
    { key: 'pending', label: '待处理' },
    { key: 'preparing', label: '制作中' },
    { key: 'ready', label: '待取餐' },
    { key: 'completed', label: '已完成' },
    { key: 'cancelled', label: '已取消' }
  ]
}

// 判断订单是否属于"进行中"筛选（active）
export function isActiveStatus(status) {
  return status === 'pending' || status === 'preparing' || status === 'ready'
}

// 获取订单类型显示文字
export function getDiningLabel(diningType) {
  return DINING_LABELS[diningType] || diningType
}

// 获取订单流程步骤（用于详情页时间线）
export function getOrderSteps(diningType) {
  if (diningType === 'dinein') {
    return [
      { label: '开桌点餐', icon: '📝', field: 'created_at' },
      { label: '用餐中', icon: '🍽️', field: 'start_time' },
      { label: '结账完成', icon: '🎉', field: 'complete_time' }
    ]
  }

  if (diningType === 'takeout') {
    return [
      { label: '下单', icon: '📝', field: 'created_at' },
      { label: '开始制作', icon: '👨‍🍳', field: 'start_time' },
      { label: '待取餐', icon: '✅', field: 'ready_time' },
      { label: '取餐完成', icon: '🎉', field: 'complete_time' }
    ]
  }

  if (diningType === 'delivery') {
    return [
      { label: '下单', icon: '📝', field: 'created_at' },
      { label: '开始制作', icon: '👨‍🍳', field: 'start_time' },
      { label: '配送中', icon: '🚗', field: 'ready_time' },
      { label: '配送完成', icon: '🎉', field: 'complete_time' }
    ]
  }

  return [
    { label: '下单', icon: '📝', field: 'created_at' },
    { label: '开始制作', icon: '👨‍🍳', field: 'start_time' },
    { label: '制作完成', icon: '✅', field: 'ready_time' },
    { label: '完成', icon: '🎉', field: 'complete_time' }
  ]
}
