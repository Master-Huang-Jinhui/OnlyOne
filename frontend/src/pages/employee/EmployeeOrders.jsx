import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { Card, Button, Badge, Dialog, Empty, toast } from '../../components/ui'

const statusMap = {
  pending: { label: '待处理', variant: 'warning', next: 'preparing', nextLabel: '开始制作' },
  preparing: { label: '制作中', variant: 'primary', next: 'ready', nextLabel: '制作完成' },
  ready: { label: '待取餐', variant: 'primary', next: 'completed', nextLabel: '确认取餐' },
  completed: { label: '已完成', variant: 'success', next: null, nextLabel: null },
  cancelled: { label: '已取消', variant: 'danger', next: null, nextLabel: null }
}

const diningMap = { dinein: '堂吃', takeout: '自取', delivery: '配送' }

export default function EmployeeOrders() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [summary, setSummary] = useState({ total: 0, revenue: 0 })
  const [statusFilter, setStatusFilter] = useState('')
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [statusFilter])

  const load = () => {
    setLoading(true)
    api.getEmployeeTodayOrders(statusFilter).then(data => {
      setOrders(data?.orders || [])
      setSummary({ total: data?.total || 0, revenue: data?.revenue || 0 })
    }).catch(() => {}).finally(() => setLoading(false))
  }

  const updateStatus = async (id, status) => {
    try {
      await api.updateEmployeeOrderStatus(id, status)
      toast('状态已更新')
      load()
      if (detail?.id === id) setDetail({ ...detail, status })
    } catch (e) { toast(e.message, 'error') }
  }

  const statusButtons = [
    { key: '', label: '全部' },
    { key: 'pending', label: '待处理' },
    { key: 'preparing', label: '制作中' },
    { key: 'ready', label: '待取餐' },
    { key: 'completed', label: '已完成' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/employee')} className="text-gray-500 hover:text-primary-600 text-sm flex items-center gap-1">
              ← 返回
            </button>
            <h1 className="text-lg font-bold text-gray-800">订单管理</h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">今日 <span className="font-bold text-gray-800">{summary.total}</span> 单</span>
            <span className="text-gray-500">营收 <span className="font-bold text-primary-600">${summary.revenue.toFixed(2)}</span></span>
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
              {btn.key === 'pending' && orders.filter(o => o.status === 'pending').length > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full inline-flex items-center justify-center">
                  {orders.filter(o => o.status === 'pending').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">加载中...</div>
        ) : orders.length === 0 ? (
          <Empty text="暂无订单" icon="📋" />
        ) : (
          <div className="space-y-3">
            {orders.map(order => {
              const st = statusMap[order.status] || statusMap.pending
              return (
                <Card key={order.id} className="overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-gray-800 text-lg">{order.order_no}</span>
                        <Badge variant={st.variant}>{st.label}</Badge>
                        <Badge variant="default">{diningMap[order.dining_type] || order.dining_type}</Badge>
                        {order.pickup_number && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">取餐号 {order.pickup_number}</span>}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary-600 text-lg">${parseFloat(order.total).toFixed(2)}</p>
                        <p className="text-xs text-gray-400">{order.created_at?.slice(11, 16)}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {order.items?.slice(0, 4).map((it, i) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {it.name} ×{it.quantity}
                        </span>
                      ))}
                      {order.items?.length > 4 && <span className="text-xs text-gray-400 py-1">+{order.items.length - 4} 件</span>}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                      {order.customer_name && <span>👤 {order.customer_name}</span>}
                      {order.customer_phone && <span>📞 {order.customer_phone}</span>}
                      {order.dining_type === 'delivery' && order.customer_address && <span className="truncate max-w-[200px]">📍 {order.customer_address}</span>}
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                      <Button size="sm" variant="outline" onClick={() => setDetail(order)}>查看详情</Button>
                      {st.next && (
                        <Button size="sm" onClick={() => updateStatus(order.id, st.next)}>
                          {st.nextLabel}
                        </Button>
                      )}
                      {order.status === 'pending' && (
                        <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => { if (confirm('确定取消此订单？')) updateStatus(order.id, 'cancelled') }}>
                          取消订单
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

      <Dialog open={!!detail} onClose={() => setDetail(null)} title={`订单详情 - ${detail?.order_no || ''}`} width="max-w-lg">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-400">取餐方式</p><p className="font-medium">{diningMap[detail.dining_type]}</p></div>
              <div><p className="text-gray-400">状态</p><Badge variant={statusMap[detail.status]?.variant}>{statusMap[detail.status]?.label}</Badge></div>
              <div><p className="text-gray-400">顾客</p><p className="font-medium">{detail.customer_name || '-'}</p></div>
              <div><p className="text-gray-400">电话</p><p className="font-medium">{detail.customer_phone || '-'}</p></div>
              {detail.dining_type === 'delivery' && <div className="col-span-2"><p className="text-gray-400">配送地址</p><p className="font-medium">{detail.customer_address}</p></div>}
              {detail.note && <div className="col-span-2"><p className="text-gray-400">备注</p><p className="font-medium">{detail.note}</p></div>}
              <div className="col-span-2"><p className="text-gray-400">下单时间</p><p className="font-medium">{detail.created_at}</p></div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-400 mb-2">商品明细</p>
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
              <div className="flex justify-between text-sm text-gray-600"><span>小计</span><span>${parseFloat(detail.subtotal).toFixed(2)}</span></div>
              <div className="flex justify-between text-sm text-gray-600"><span>税费</span><span>${parseFloat(detail.tax).toFixed(2)}</span></div>
              <div className="flex justify-between text-sm text-gray-600"><span>配送费</span><span>${parseFloat(detail.delivery_fee).toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t"><span>合计</span><span className="text-primary-600">${parseFloat(detail.total).toFixed(2)}</span></div>
            </div>

            <div className="flex gap-2 pt-2 flex-wrap">
              {Object.entries(statusMap).map(([k, v]) => (
                <Button key={k} size="sm" variant={detail.status === k ? 'primary' : 'outline'} onClick={() => updateStatus(detail.id, k)}>{v.label}</Button>
              ))}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
