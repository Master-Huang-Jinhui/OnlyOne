import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Table, Badge, Dialog, Select, Empty, toast } from '../../components/ui'

const statusMap = {
  pending: { label: '待处理', variant: 'warning' },
  preparing: { label: '制作中', variant: 'primary' },
  ready: { label: '待取餐', variant: 'primary' },
  completed: { label: '已完成', variant: 'success' },
  cancelled: { label: '已取消', variant: 'danger' }
}

const diningMap = { dinein: '堂吃', takeout: '自取', delivery: '配送' }

// 获取今天的日期字符串 YYYY-MM-DD
const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [summary, setSummary] = useState({ total: 0, revenue: 0 })
  const [statusFilter, setStatusFilter] = useState('')
  const [startDate, setStartDate] = useState(today())
  const [endDate, setEndDate] = useState(today())
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [detail, setDetail] = useState(null)

  useEffect(() => { load() }, [])

  const load = () => {
    const params = { sort_by: sortBy, sort_order: sortOrder }
    if (statusFilter) params.status = statusFilter
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate
    api.getOrders(params).then(data => {
      if (data && Array.isArray(data.orders)) {
        setOrders(data.orders)
        setSummary({ total: data.total || 0, revenue: data.revenue || 0 })
      } else {
        setOrders(Array.isArray(data) ? data : [])
      }
    }).catch(() => {})
  }

  const handleSearch = () => load()

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
    setTimeout(load, 0)
  }

  const sortIcon = (field) => {
    if (sortBy !== field) return <span className="text-gray-300 ml-1">⇅</span>
    return <span className="text-primary-600 ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
  }

  const updateStatus = async (id, status) => {
    await api.updateOrderStatus(id, status)
    toast('状态已更新')
    load()
    if (detail?.id === id) setDetail({ ...detail, status })
  }

  const setToday = () => { setStartDate(today()); setEndDate(today()) }
  const setThisWeek = () => {
    const d = new Date()
    const day = d.getDay() || 7
    const monday = new Date(d)
    monday.setDate(d.getDate() - day + 1)
    const fmt = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
    setStartDate(fmt(monday))
    setEndDate(today())
  }
  const setAll = () => { setStartDate(''); setEndDate('') }

  const columns = [
    {
      header: <button onClick={() => handleSort('order_no')} className="hover:text-primary-600">订单号{sortIcon('order_no')}</button>,
      render: o => <button onClick={() => setDetail(o)} className="text-primary-600 hover:underline font-mono text-sm">{o.order_no}</button>
    },
    {
      header: '商品',
      render: o => (
        <div className="max-w-[200px]">
          {o.items.slice(0, 2).map((it, i) => <p key={i} className="text-xs text-gray-600 truncate">{it.name} ×{it.quantity}</p>)}
          {o.items.length > 2 && <p className="text-xs text-gray-400">+{o.items.length - 2} 件</p>}
        </div>
      )
    },
    { header: '顾客', render: o => <div><p className="text-sm text-gray-700">{o.customer_name || '-'}</p><p className="text-xs text-gray-400">{o.customer_phone || '-'}</p></div> },
    { header: '取餐方式', render: o => <Badge variant="default">{diningMap[o.dining_type] || o.dining_type}</Badge> },
    {
      header: <button onClick={() => handleSort('total')} className="hover:text-primary-600">金额{sortIcon('total')}</button>,
      render: o => <span className="font-medium text-primary-600">${parseFloat(o.total).toFixed(2)}</span>
    },
    { header: '状态', render: o => <Badge variant={statusMap[o.status]?.variant || 'default'}>{statusMap[o.status]?.label || o.status}</Badge> },
    {
      header: <button onClick={() => handleSort('created_at')} className="hover:text-primary-600">时间{sortIcon('created_at')}</button>,
      render: o => <span className="text-xs text-gray-400">{o.created_at}</span>
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">订单管理</h2>
          <p className="text-sm text-gray-400 mt-1">按日期查询订单，支持按订单号/金额/时间排序</p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">订单总数</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{summary.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">总金额</p>
          <p className="text-2xl font-bold text-primary-600 mt-1">${parseFloat(summary.revenue).toFixed(2)}</p>
        </Card>
      </div>

      {/* 日期查询 */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">开始日期</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">结束日期</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400" />
          </div>
          <Button onClick={handleSearch}>查询</Button>
          <div className="flex gap-2 ml-auto">
            <button onClick={setToday} className="px-3 py-2 text-sm text-gray-600 hover:text-primary-600 border border-gray-200 rounded-lg">今日</button>
            <button onClick={setThisWeek} className="px-3 py-2 text-sm text-gray-600 hover:text-primary-600 border border-gray-200 rounded-lg">本周</button>
            <button onClick={setAll} className="px-3 py-2 text-sm text-gray-600 hover:text-primary-600 border border-gray-200 rounded-lg">全部</button>
          </div>
        </div>
      </Card>

      {/* 状态筛选 */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => { setStatusFilter(''); setTimeout(load, 0) }} className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === '' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>全部</button>
        {Object.entries(statusMap).map(([key, val]) => (
          <button key={key} onClick={() => { setStatusFilter(key); setTimeout(load, 0) }} className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === key ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            {val.label}
          </button>
        ))}
      </div>

      <Card>
        {orders.length === 0 ? (
          <Empty text="该时间段暂无订单" icon="📋" />
        ) : (
          <Table columns={columns} data={orders} actions={o => (
            <Select value={o.status} onChange={e => updateStatus(o.id, e.target.value)}
              options={Object.entries(statusMap).map(([k, v]) => ({ value: k, label: v.label }))} />
          )} />
        )}
      </Card>

      {/* 订单详情 */}
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
                {detail.items.map((it, i) => (
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
