import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Table, Badge, Dialog, Select, Empty, toast } from '../../components/ui'

const statusMap = {
  pending: { label: '待处理', variant: 'warning' },
  preparing: { label: '制作中', variant: 'primary' },
  ready: { label: '待取餐', variant: 'info' },
  completed: { label: '已完成', variant: 'success' },
  cancelled: { label: '已取消', variant: 'default' }
}

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('all')
  const [detail, setDetail] = useState(null)

  useEffect(() => { load() }, [filter])

  const load = () => api.getOrders(filter).then(data => setOrders(Array.isArray(data) ? data : [])).catch(() => {})

  const updateStatus = async (id, status) => {
    try { await api.updateOrderStatus(id, status); toast('状态更新成功'); load(); if (detail?.id === id) setDetail({ ...detail, status }) }
    catch (e) { toast(e.message, 'error') }
  }

  const getTotal = (order) => {
    const items = order.items || []
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const tax = subtotal * (order.tax_rate || 0.08875)
    const delivery = order.delivery_fee || 0
    return (subtotal + tax + delivery).toFixed(2)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">订单管理</h2>
          <p className="text-sm text-gray-400 mt-1">查看和管理所有订单</p>
        </div>
        <Select value={filter} onChange={e => setFilter(e.target.value)} className="w-40" options={[
          { value: 'all', label: '全部订单' },
          { value: 'pending', label: '待处理' },
          { value: 'preparing', label: '制作中' },
          { value: 'ready', label: '待取餐' },
          { value: 'completed', label: '已完成' },
          { value: 'cancelled', label: '已取消' }
        ]} />
      </div>

      <Card>
        {orders.length === 0 ? <Empty text="暂无订单" icon="📋" /> : (
          <Table columns={[
            { header: '订单号', render: o => <span className="font-medium text-gray-800">#{o.id}</span> },
            { header: '顾客', render: o => <div><p className="text-gray-800">{o.customer_name || '匿名'}</p><p className="text-xs text-gray-400">{o.phone || '-'}</p></div> },
            { header: '取餐方式', render: o => <Badge>{o.dining_type === 'dine_in' ? '堂吃' : o.dining_type === 'pickup' ? '自取' : '配送'}</Badge> },
            { header: '金额', render: o => <span className="font-medium text-primary-600">${getTotal(o)}</span> },
            { header: '状态', render: o => <Badge variant={statusMap[o.status]?.variant || 'default'}>{statusMap[o.status]?.label || o.status}</Badge> },
            { header: '时间', render: o => <span className="text-xs text-gray-400">{o.created_at}</span> }
          ]} data={orders} actions={o => (
            <div className="flex gap-2">
              <button onClick={() => setDetail(o)} className="text-primary-500 hover:text-primary-700 text-sm">详情</button>
              {o.status === 'pending' && <button onClick={() => updateStatus(o.id, 'preparing')} className="text-blue-500 hover:text-blue-700 text-sm">接单</button>}
              {o.status === 'preparing' && <button onClick={() => updateStatus(o.id, 'ready')} className="text-green-500 hover:text-green-700 text-sm">完成</button>}
              {['pending', 'preparing'].includes(o.status) && <button onClick={() => updateStatus(o.id, 'cancelled')} className="text-red-400 hover:text-red-600 text-sm">取消</button>}
            </div>
          )} />
        )}
      </Card>

      <Dialog open={!!detail} onClose={() => setDetail(null)} title={`订单 #${detail?.id || ''}`} width="max-w-lg">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-400">顾客</p><p className="font-medium">{detail.customer_name || '匿名'}</p></div>
              <div><p className="text-gray-400">电话</p><p className="font-medium">{detail.phone || '-'}</p></div>
              <div><p className="text-gray-400">取餐方式</p><p className="font-medium">{detail.dining_type === 'dine_in' ? '堂吃' : detail.dining_type === 'pickup' ? '自取' : '配送'}</p></div>
              <div><p className="text-gray-400">状态</p><Badge variant={statusMap[detail.status]?.variant || 'default'}>{statusMap[detail.status]?.label || detail.status}</Badge></div>
            </div>
            {detail.address && <div className="text-sm"><p className="text-gray-400">配送地址</p><p className="font-medium">{detail.address}</p></div>}
            <div className="border-t pt-4">
              <p className="text-sm text-gray-400 mb-2">商品明细</p>
              <div className="space-y-2">
                {(detail.items || []).map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{item.name} × {item.quantity}</span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t mt-3 pt-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">小计</span><span>${(detail.items || []).reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">税费</span><span>${((detail.items || []).reduce((s, i) => s + i.price * i.quantity, 0) * (detail.tax_rate || 0.08875)).toFixed(2)}</span></div>
                {detail.delivery_fee > 0 && <div className="flex justify-between"><span className="text-gray-400">配送费</span><span>${detail.delivery_fee.toFixed(2)}</span></div>}
                <div className="flex justify-between font-bold text-base pt-1"><span>合计</span><span className="text-primary-600">${getTotal(detail)}</span></div>
              </div>
            </div>
            {detail.notes && <div className="text-sm"><p className="text-gray-400">备注</p><p>{detail.notes}</p></div>}
          </div>
        )}
      </Dialog>
    </div>
  )
}
