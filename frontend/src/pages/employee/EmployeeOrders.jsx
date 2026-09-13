import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { playOrderSound, vibrate } from '../../lib/notification'
import { useLanguage } from '../../context/LanguageContext'
import { Card, Button, Badge, Dialog, Empty, toast } from '../../components/ui'
import { useConfirm } from '../../components/ConfirmDialog'
import { getStatusLabel, getStatusVariant, getNextStatus, getNextLabel, isActiveStatus, getDiningLabel, getOrderSteps } from '../../lib/orderStatus'
import { formatDateTime, formatTime, formatDate, formatClockTime, formatRelative, formatDateTimeCN } from '../../utils/format'

export default function EmployeeOrders() {
  const confirm = useConfirm()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [summary, setSummary] = useState({ total: 0, revenue: 0 })
  const [statusFilter, setStatusFilter] = useState('active')
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const lastPendingCount = useRef(0)
  const isFirstLoad = useRef(true)

  useEffect(() => {
    load()
    const timer = setInterval(() => {
      api.getEmployeeTodayOrders(statusFilter).then(data => {
        const list = data?.orders || []
        setOrders(list)
        setSummary({ total: data?.total || 0, revenue: data?.revenue || 0 })
        const pendingCount = list.filter(o => isActiveStatus(o.status)).length
        if (!isFirstLoad.current && pendingCount > lastPendingCount.current) {
          playOrderSound()
          vibrate()
          toast(`🔔 ${t('employee.newOrderAlert', '有新订单！当前')} ${pendingCount} ${t('employee.activeOrders', '个进行中')}`, 'success')
        }
        lastPendingCount.current = pendingCount
        isFirstLoad.current = false
      }).catch(() => {})
    }, 15000)
    return () => clearInterval(timer)
  }, [statusFilter])

  const load = () => {
    setLoading(true)
    api.getEmployeeTodayOrders(statusFilter).then(data => {
      const list = data?.orders || []
      setOrders(list)
      setSummary({ total: data?.total || 0, revenue: data?.revenue || 0 })
      lastPendingCount.current = list.filter(o => isActiveStatus(o.status)).length
      isFirstLoad.current = false
    }).catch(() => {}).finally(() => setLoading(false))
  }

  const updateStatus = async (id, status) => {
    try {
      await api.updateEmployeeOrderStatus(id, status)
      toast(t('employee.statusUpdated', '状态已更新'))
      load()
      if (detail?.id === id) setDetail({ ...detail, status })
    } catch (e) { toast(e.message, 'error') }
  }

  const statusButtons = [
    { key: '', label: t('common.all', '全部') },
    { key: 'active', label: t('employee.inProgress', '进行中') },
    { key: 'completed', label: t('order.completed', '已完成') },
    { key: 'cancelled', label: t('order.cancelled', '已取消') }
  ]

  const filteredOrders = orders.filter(o => {
    if (!statusFilter) return true
    if (statusFilter === 'active') return isActiveStatus(o.status)
    return o.status === statusFilter
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/employee')} className="text-gray-500 hover:text-primary-600 text-sm flex items-center gap-1">
              {t('common.back', '← 返回')}
            </button>
            <h1 className="text-lg font-bold text-gray-800">{t('employee.orderManagement', '订单管理')}</h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">{t('common.today', '今日')} <span className="font-bold text-gray-800">{summary.total}</span> {t('unit.orders', '单')}</span>
            <span className="text-gray-500">{t('common.revenue', '营收')} <span className="font-bold text-primary-600">${summary.revenue.toFixed(2)}</span></span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex gap-2 flex-wrap mb-6">
          {statusButtons.map(btn => (
            <button
              key={btn.key}
              onClick={() => setStatusFilter(btn.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                statusFilter === btn.key
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'
              }`}
            >
              {btn.label}
              {btn.key === 'active' && orders.filter(o => isActiveStatus(o.status)).length > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full inline-flex items-center justify-center">
                  {orders.filter(o => isActiveStatus(o.status)).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">{t('common.loading', '加载中...')}</div>
        ) : orders.length === 0 ? (
          <Empty text={t('employee.noOrders', '暂无订单')} icon="📋" />
        ) : (
          <div className="space-y-3">
            {filteredOrders.map(order => {
              const nextStatus = getNextStatus(order.dining_type, order.status)
              const nextLabel = getNextLabel(order.dining_type, order.status)
              return (
                <Card key={order.id} className="overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-gray-800 text-lg">{order.order_no}</span>
                        <Badge variant={getStatusVariant(order.dining_type, order.status)}>{getStatusLabel(order.dining_type, order.status)}</Badge>
                        <Badge variant="default">{getDiningLabel(order.dining_type)}</Badge>
                        {order.pickup_number && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{t('employee.pickupNo', '取餐号')} {order.pickup_number}</span>}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary-600 text-lg">${parseFloat(order.total).toFixed(2)}</p>
                        <p className="text-xs text-gray-400">{formatTime(order.created_at)}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {order.items?.slice(0, 4).map((it, i) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {it.name} ×{it.quantity}
                        </span>
                      ))}
                      {order.items?.length > 4 && <span className="text-xs text-gray-400 py-1">+{order.items.length - 4} {t('employee.pieces', '件')}</span>}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                      {order.customer_name && <span>👤 {order.customer_name}</span>}
                      {order.customer_phone && <span>📞 {order.customer_phone}</span>}
                      {order.dining_type === 'delivery' && order.customer_address && <span className="truncate max-w-[200px]">📍 {order.customer_address}</span>}
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                      <Button size="sm" variant="outline" onClick={() => setDetail(order)}>{t('employee.viewDetail', '查看详情')}</Button>
                      {nextStatus && (
                        <Button size="sm" onClick={() => updateStatus(order.id, nextStatus)}>
                          {nextLabel}
                        </Button>
                      )}
                      {isActiveStatus(order.status) && (
                        <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={async () => { if (await confirm({ title: t('employee.cancelOrderTitle', '取消订单'), message: t('employee.cancelOrderMessage', '确定取消此订单？'), variant: 'danger' })) updateStatus(order.id, 'cancelled') }}>
                          {t('employee.cancelOrder', '取消订单')}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={!!detail} onClose={() => setDetail(null)} title={`${t('employee.orderDetail', '订单详情')} - ${detail?.order_no || ''}`} width="max-w-lg">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-400">{t('employee.diningMethod', '取餐方式')}</p><p className="font-medium">{getDiningLabel(detail.dining_type)}</p></div>
              <div><p className="text-gray-400">{t('common.status', '状态')}</p><Badge variant={getStatusVariant(detail.dining_type, detail.status)}>{getStatusLabel(detail.dining_type, detail.status)}</Badge></div>
              <div><p className="text-gray-400">{t('common.customer', '顾客')}</p><p className="font-medium">{detail.customer_name || '-'}</p></div>
              <div><p className="text-gray-400">{t('common.phone', '电话')}</p><p className="font-medium">{detail.customer_phone || '-'}</p></div>
              {detail.dining_type === 'delivery' && <div className="col-span-2"><p className="text-gray-400">{t('common.address', '配送地址')}</p><p className="font-medium">{detail.customer_address}</p></div>}
              {detail.note && <div className="col-span-2"><p className="text-gray-400">{t('common.notes', '备注')}</p><p className="font-medium">{detail.note}</p></div>}
              <div className="col-span-2">
                <p className="text-gray-400 mb-2">{t('employee.orderFlow', '订单流程')}</p>
                <div className="space-y-2">
                  {getOrderSteps(detail.dining_type).map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${detail[step.field] ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400'}`}>{step.icon}</div>
                      <span className={`text-sm w-20 ${detail[step.field] ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>{step.label}</span>
                      <span className={`text-xs ${detail[step.field] ? 'text-gray-500' : 'text-gray-300'}`}>{detail[step.field] ? formatTime(detail[step.field]) : t('order.pending', '待处理')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-400 mb-2">{t('employee.itemDetails', '商品明细')}</p>
              <div className="space-y-2">
                {detail.items?.map((it, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-700">{it.name} × {it.quantity}{it.note && <span className="text-xs text-yellow-600 ml-1">({it.note})</span>}</span>
                    <span className="text-gray-600">${(it.price * it.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4 space-y-1">
              <div className="flex justify-between text-sm text-gray-600"><span>{t('common.subtotal', '小计')}</span><span>${parseFloat(detail.subtotal).toFixed(2)}</span></div>
              <div className="flex justify-between text-sm text-gray-600"><span>{t('common.tax', '税费')}</span><span>${parseFloat(detail.tax).toFixed(2)}</span></div>
              <div className="flex justify-between text-sm text-gray-600"><span>{t('common.deliveryFee', '配送费')}</span><span>${parseFloat(detail.delivery_fee).toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t"><span>{t('common.total', '合计')}</span><span className="text-primary-600">${parseFloat(detail.total).toFixed(2)}</span></div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}