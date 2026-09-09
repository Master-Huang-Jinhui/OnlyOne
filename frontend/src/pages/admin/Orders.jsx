import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { Card, Button, Table, Badge, Dialog, Select, Empty, toast } from '../../components/ui'

const statusMap = {
  pending: { label: '进行中', variant: 'warning', next: 'preparing', nextLabel: '开始制作' },
  preparing: { label: '制作中', variant: 'primary', next: 'ready', nextLabel: '制作完成' },
  ready: { label: '待取餐/配送中', variant: 'primary', next: 'completed', nextLabel: '确认完成' },
  completed: { label: '已完成', variant: 'success', next: null, nextLabel: null },
  cancelled: { label: '已取消', variant: 'danger', next: null, nextLabel: null }
}

const diningMap = { dinein: '堂吃', takeout: '自取', delivery: '配送' }

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const now = () => { const d = new Date(); return `${today()}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }

export default function Orders() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [orders, setOrders] = useState([])
  const [summary, setSummary] = useState({ total: 0, revenue: 0 })
  const [statusFilter, setStatusFilter] = useState('')
  const [startDate, setStartDate] = useState(today() + 'T00:00')
  const [endDate, setEndDate] = useState(now())
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [detail, setDetail] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [keyword, setKeyword] = useState('')

  useEffect(() => {
    const orderId = searchParams.get('orderId')
    if (orderId) {
      setStartDate(''); setEndDate(''); setStatusFilter('')
      api.getOrderById(orderId).then(order => { if (order) setDetail(order) }).catch(() => {})
      load({ startDate: '', endDate: '', statusFilter: '', page: 1 })
      searchParams.delete('orderId'); setSearchParams(searchParams, { replace: true })
    } else { load() }
  }, [])

  const load = (overrides = {}) => {
    const curStatus = overrides.statusFilter !== undefined ? overrides.statusFilter : statusFilter
    const curStart = overrides.startDate !== undefined ? overrides.startDate : startDate
    const curEnd = overrides.endDate !== undefined ? overrides.endDate : endDate
    const curSortBy = overrides.sortBy || sortBy
    const curSortOrder = overrides.sortOrder || sortOrder
    const curPage = overrides.page !== undefined ? overrides.page : page
    const curPageSize = overrides.pageSize !== undefined ? overrides.pageSize : pageSize
    const curKeyword = overrides.keyword !== undefined ? overrides.keyword : keyword
    const params = { sort_by: curSortBy, sort_order: curSortOrder, page: curPage, page_size: curPageSize }
    if (curStatus) params.status = curStatus
    if (curStart) params.start_date = curStart
    if (curEnd) params.end_date = curEnd
    if (curKeyword) params.keyword = curKeyword
    api.getOrders(params).then(data => {
      if (data && Array.isArray(data.orders)) { setOrders(data.orders); setSummary({ total: data.total || 0, revenue: data.revenue || 0 }) }
      else { setOrders(Array.isArray(data) ? data : []) }
    }).catch(() => {})
  }

  const handleSearch = () => { setPage(1); load({ page: 1 }) }
  const handleSort = (field) => {
    let newSortBy = field, newSortOrder = 'desc'
    if (sortBy === field) newSortOrder = sortOrder === 'asc' ? 'desc' : 'asc'
    setSortBy(newSortBy); setSortOrder(newSortOrder)
    load({ sortBy: newSortBy, sortOrder: newSortOrder })
  }
  const sortIcon = (field) => { if (sortBy !== field) return <span className="text-gray-300 ml-1">⇅</span>; return <span className="text-primary-600 ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span> }
  const updateStatus = async (id, status) => { await api.updateOrderStatus(id, status); toast('状态已更新'); load(); if (detail?.id === id) setDetail({ ...detail, status }) }
  const setToday = () => { const s = today() + 'T00:00'; const e = now(); setStartDate(s); setEndDate(e); setPage(1); load({ startDate: s, endDate: e, page: 1 }) }
  const setThisWeek = () => {
    const d = new Date(); const day = d.getDay() || 7; const monday = new Date(d); monday.setDate(d.getDate() - day + 1)
    const fmt = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
    const start = fmt(monday) + 'T00:00'; const end = now()
    setStartDate(start); setEndDate(end); setPage(1); load({ startDate: start, endDate: end, page: 1 })
  }
  const setAll = () => { setStartDate(''); setEndDate(''); setPage(1); load({ startDate: '', endDate: '', page: 1 }) }

  const columns = [
    { header: <button onClick={() => handleSort('order_no')} className="hover:text-primary-600">订单号{sortIcon('order_no')}</button>, render: o => <button onClick={() => setDetail(o)} className="text-primary-600 hover:underline font-mono text-sm">{o.order_no}</button> },
    { header: '商品', render: o => (<div className="max-w-[200px]">{o.items.slice(0, 2).map((it, i) => <p key={i} className="text-xs text-gray-600 truncate">{it.name} ×{it.quantity}</p>)}{o.items.length > 2 && <p className="text-xs text-gray-400">+{o.items.length - 2} 件</p>}</div>) },
    { header: '顾客', render: o => <div><p className="text-sm text-gray-700">{o.customer_name || '-'}</p><p className="text-xs text-gray-400">{o.customer_phone || '-'}</p></div> },
    { header: '取餐方式', render: o => <Badge variant="default">{diningMap[o.dining_type] || o.dining_type}</Badge> },
    { header: <button onClick={() => handleSort('total')} className="hover:text-primary-600">金额{sortIcon('total')}</button>, render: o => <span className="font-medium text-primary-600">${parseFloat(o.total).toFixed(2)}</span> },
    { header: '状态', render: o => <Badge variant={statusMap[o.status]?.variant || 'default'}>{statusMap[o.status]?.label || o.status}</Badge> },
    { header: <button onClick={() => handleSort('created_at')} className="hover:text-primary-600">时间{sortIcon('created_at')}</button>, render: o => <span className="text-xs text-gray-400">{o.created_at}</span> }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">订单管理</h2><p className="text-sm text-gray-400 mt-1">按日期查询订单，支持按订单号/金额/时间排序</p></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4"><p className="text-sm text-gray-500">订单总数</p><p className="text-2xl font-bold text-gray-800 mt-1">{summary.total}</p></Card>
        <Card className="p-4"><p className="text-sm text-gray-500">总金额</p><p className="text-2xl font-bold text-primary-600 mt-1">${parseFloat(summary.revenue).toFixed(2)}</p></Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div><label className="block text-xs text-gray-500 mb-1">开始时间</label><input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400" /></div>
          <div><label className="block text-xs text-gray-500 mb-1">结束时间</label><input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400" /></div>
          <Button onClick={handleSearch}>查询</Button>
          <div className="flex items-center gap-2">
            <input type="text" value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSearch() }} placeholder="搜索订单号/顾客名/电话" className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-56 focus:outline-none focus:border-primary-400" />
          </div>
          <div className="flex gap-2 ml-auto">
            <button onClick={setToday} className="px-3 py-2 text-sm text-gray-600 hover:text-primary-600 border border-gray-200 rounded-lg">今日</button>
            <button onClick={setThisWeek} className="px-3 py-2 text-sm text-gray-600 hover:text-primary-600 border border-gray-200 rounded-lg">本周</button>
            <button onClick={setAll} className="px-3 py-2 text-sm text-gray-600 hover:text-primary-600 border border-gray-200 rounded-lg">全部</button>
          </div>
        </div>
      </Card>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => { setStatusFilter(''); setPage(1); load({ statusFilter: '', page: 1 }) }} className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === '' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>全部</button>
        {Object.entries(statusMap).map(([key, val]) => (
          <button key={key} onClick={() => { setStatusFilter(key); setPage(1); load({ statusFilter: key, page: 1 }) }} className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === key ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>{val.label}</button>
        ))}
      </div>

      <Card>
        {orders.length === 0 ? (
          <Empty text="该时间段暂无订单" icon="📋" />
        ) : (
          <>
            <Table columns={columns} data={orders} actions={o => (<Select value={o.status} onChange={e => updateStatus(o.id, e.target.value)} options={Object.entries(statusMap).map(([k, v]) => ({ value: k, label: v.label }))} />)} />
            <div className="flex items-center justify-between px-5 py-3 border-t bg-gray-50">
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span>共 {summary.total} 条</span>
                <select value={pageSize} onChange={e => { const size = parseInt(e.target.value); setPageSize(size); setPage(1); load({ pageSize: size, page: 1 }) }} className="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none">
                  <option value={10}>10条/页</option><option value={20}>20条/页</option><option value={50}>50条/页</option><option value={100}>100条/页</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { const p = Math.max(1, page - 1); setPage(p); load({ page: p }) }} disabled={page <= 1} className="px-3 py-1 text-sm border border-gray-200 rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white">上一页</button>
                <span className="text-sm text-gray-600">第 {page} / {Math.max(1, Math.ceil(summary.total / pageSize))} 页</span>
                <button onClick={() => { const p = page + 1; setPage(p); load({ page: p }) }} disabled={page >= Math.ceil(summary.total / pageSize)} className="px-3 py-1 text-sm border border-gray-200 rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white">下一页</button>
              </div>
            </div>
          </>
        )}
      </Card>

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
              {statusMap[detail.status]?.next && (<Button size="sm" onClick={() => updateStatus(detail.id, statusMap[detail.status].next)}>{statusMap[detail.status].nextLabel}</Button>)}
              {detail.status === 'pending' && (<Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => { if (confirm('确定取消此订单？')) updateStatus(detail.id, 'cancelled') }}>取消订单</Button>)}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
