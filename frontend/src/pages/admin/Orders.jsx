import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Table, Badge, Dialog, Select, toast } from '../../components/ui'

const statusMap = {
  pending: { label: '待处理', variant: 'warning' },
  preparing: { label: '制作中', variant: 'primary' },
  ready: { label: '待取餐', variant: 'primary' },
  completed: { label: '已完成', variant: 'success' },
  cancelled: { label: '已取消', variant: 'danger' }
}
const diningMap = { dinein: '堂吃', takeout: '自取', delivery: '配送' }

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('')
  const [detail, setDetail] = useState(null)

  useEffect(() => { load() }, [filter])
  const load = () => api.getOrders(filter).then(setOrders).catch(() => {})

  const updateStatus = async (id, status) => {
    await api.updateOrderStatus(id, status)
    toast('状态已更新'); load()
    if (detail && detail.id === id) setDetail({ ...detail, status })
  }

  const columns = [
    { header: '订单号', render: o => <button onClick={() => setDetail(o)} className="text-primary-600 hover:underline font-mono text-sm">{o.order_no}</button> },
    { header: '商品', render: o => (
      <div className="max-w-[200px]">
        {o.items.slice(0, 2).map((it, i) => <p key={i} className="text-xs text-gray-600 truncate">{it.name} x{it.quantity}</p>)}
        {o.items.length > 2 && <p className="text-xs text-gray-400">+{o.items.length - 2} 件</p>}
      </div>
    )},
    { header: '顾客', render: o => <div><p className="text-sm text-gray-700">{o.customer_name || '-'}</p><p className="text-xs text-gray-400">{o.customer_phone || '-'}</p></div> },
    { header: '取餐方式', render: o => <Badge variant="default">{diningMap[o.dining_type] || o.dining_type}</Badge> },
    { header: '金额', render: o => <span className="font-medium text-primary-600">${parseFloat(o.total).toFixed(2)}</span> },
    { header: '状态', render: o => <Badge variant={statusMap[o.status] ? statusMap[o.status].variant : 'default'}>{statusMap[o.status] ? statusMap[o.status].label : o.status}</Badge> },
    { header: '时间', render: o => <span className="text-xs text-gray-400">{o.created_at}</span> }
  ]

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold text-gray-800">订单管理</h2><p className="text-sm text-gray-400 mt-1">查看和处理所有订单</p></div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter('')} className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === '' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>全部</button>
        {Object.entries(statusMap).map(([key, val]) => (
          <button key={key} onClick={() => setFilter(key)} className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === key ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>{val.label}</button>
        ))}
      </div>

      <Card>
        <Table columns={columns} data={orders} actions={o => (
          <Select value={o.status} onChange={e => updateStatus(o.id, e.target.value)}
            options={Object.entries(statusMap).map(([k, v]) => ({ value: k, label: v.label }))} />
        )} />
      </Card>

      <Dialog open={!!detail} onClose={() => setDetail(null)} title={`订单详情 - ${detail ? detail.order_no : ''}`} width="max-w-lg">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-400">取餐方式</p><p className="font-medium">{diningMap[detail.dining_type]}</p></div>
              <div><p className="text-gray-400">状态</p><Badge variant={statusMap[detail.status] ? statusMap[detail.status].variant : 'default'}>{statusMap[detail.status] ? statusMap[detail.status].label : ''}</Badge></div>
              <div><p className="text-gray-400">顾客</p><p className="font-medium">{detail.customer_name || '-'}</p></div>
              <div><p className="text-gray-400">电话</p><p className="font-medium">{detail.customer_phone || '-'}</p></div>
              {detail.dining_type === 'delivery' && <div className="col-span-2"><p className="text-gray-400">配送地址</p><p className="font-medium">{detail.customer_address}</p></div>}
              {detail.note && <div className="col-span-2"><p className="text-gray-400">备注</p><p className="font-medium">{detail.note}</p></div>}
            </div>
            <div className="border-t pt-4">
              <p className="text-sm text-gray-400 mb-2">商品明细</p>
              <div className="space-y-2">
                {detail.items.map((it, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-700">{it.name} x {it.quantity}{it.note && <span className="text-xs text-yellow-600 ml-1">({it.note})</span>}</span>
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
