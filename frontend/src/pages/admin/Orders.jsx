import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { useLanguage } from '../../context/LanguageContext'
import { Card, Button, Table, Badge, Dialog, Select, Empty, toast } from '../../components/ui'
import { useConfirm } from '../../components/ConfirmDialog'
import { formatDateTime, formatTime, formatDate, formatClockTime, formatRelative, formatDateTimeCN } from '../../utils/format'

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const now = () => {
  const d = new Date()
  return `${today()}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function Orders() {
  const confirm = useConfirm()
  const { t } = useLanguage()
  const [searchParams, setSearchParams] = useSearchParams()

  const statusMap = {
    pending: { label: t('order.pending', '进行中'), variant: 'warning', next: 'preparing', nextLabel: t('order.startPreparing', '开始制作') },
    preparing: { label: t('order.preparing', '制作中'), variant: 'primary', next: 'ready', nextLabel: t('order.markReady', '制作完成') },
    ready: { label: t('order.ready', '待取餐/配送中'), variant: 'primary', next: 'completed', nextLabel: t('orders.confirmComplete', '确认完成') },
    completed: { label: t('order.completed', '已完成'), variant: 'success', next: null, nextLabel: null },
    cancelled: { label: t('order.cancelled', '已取消'), variant: 'danger', next: null, nextLabel: null }
  }

  const diningMap = { dinein: t('dining.dinein', '堂吃'), takeout: t('dining.takeout', '自取'), delivery: t('dining.delivery', '配送') }
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

  useEffect(() => {
    const orderId = searchParams.get('orderId')
    if (orderId) {
      setStartDate('')
      setEndDate('')
      setStatusFilter('')
      api.getOrderById(orderId).then(order => {
        if (order) setDetail(order)
      }).catch(() => {})
      load({ startDate: '', endDate: '', statusFilter: '', page: 1 })
      searchParams.delete('orderId')
      setSearchParams(searchParams, { replace: true })
    } else {
      load()
    }
  }, [])

  const load = (overrides = {}) => {
    const curStatus = overrides.statusFilter !== undefined ? overrides.statusFilter : statusFilter
    const curStart = overrides.startDate !== undefined ? overrides.startDate : startDate
    const curEnd = overrides.endDate !== undefined ? overrides.endDate : endDate
    const curSortBy = overrides.sortBy || sortBy
    const curSortOrder = overrides.sortOrder || sortOrder
    const curPage = overrides.page !== undefined ? overrides.page : page
    const curPageSize = overrides.pageSize !== undefined ? overrides.pageSize : pageSize
    const params = { sort_by: curSortBy, sort_order: curSortOrder, page: curPage, page_size: curPageSize }
    if (curStatus) params.status = curStatus
    if (curStart) params.start_date = curStart
    if (curEnd) params.end_date = curEnd
    api.getOrders(params).then(data => {
      if (data && Array.isArray(data.orders)) {
        setOrders(data.orders)
        setSummary({ total: data.total || 0, revenue: data.revenue || 0 })
      } else {
        setOrders(Array.isArray(data) ? data : [])
      }
    }).catch(() => {})
  }

  const handleSearch = () => { setPage(1); load({ page: 1 }) }

  const handleSort = (field) => {
    let newSortBy = field
    let newSortOrder = 'desc'
    if (sortBy === field) {
      newSortOrder = sortOrder === 'asc' ? 'desc' : 'asc'
    }
    setSortBy(newSortBy)
    setSortOrder(newSortOrder)
    load({ sortBy: newSortBy, sortOrder: newSortOrder })
  }

  const sortIcon = (field) => {
    if (sortBy !== field) return <span className="text-gray-300 ml-1">⇅</span>
    return <span className="text-primary-600 ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
  }

  const updateStatus = async (id, status) => {
    await api.updateOrderStatus(id, status)
    toast(t('common.statusUpdated', '状态已更新'))
    load()
    if (detail?.id === id) setDetail({ ...detail, status })
  }

  const setToday = () => { const s = today() + 'T00:00'; const e = now(); setStartDate(s); setEndDate(e); setPage(1); load({ startDate: s, endDate: e, page: 1 }) }
  const setThisWeek = () => {
    const d = new Date()
    const day = d.getDay() || 7
    const monday = new Date(d)
    monday.setDate(d.getDate() - day + 1)
    const fmt = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
    const start = fmt(monday) + 'T00:00'
    const end = now()
    setStartDate(start)
    setEndDate(end)
    setPage(1)
    load({ startDate: start, endDate: end, page: 1 })
  }
  const setAll = () => { setStartDate(''); setEndDate(''); setPage(1); load({ startDate: '', endDate: '', page: 1 }) }

  const columns = [
    { header: <button onClick={() => handleSort('order_no')} className="hover:text-primary-600">{t('orders.orderNo', '订单号')}{sortIcon('order_no')}</button>, render: o => <button onClick={() => setDetail(o)} className="text-primary-600 hover:underline font-mono text-sm">{o.order_no}</button> },
    { header: t('orders.items', '商品'), render: o => (<div className="max-w-[200px]">{o.items.slice(0, 2).map((it, i) => <p key={i} className="text-xs text-gray-600 truncate">{it.name} ×{it.quantity}</p>)}{o.items.length > 2 && <p className="text-xs text-gray-400">+{o.items.length - 2} {t('orders.itemsUnit', '件')}</p>}</div>) },
    { header: t('orders.customer', '顾客'), render: o => <div><p className="text-sm text-gray-700">{o.customer_name || '-'}</p><p className="text-xs text-gray-400">{o.customer_phone || '-'}</p></div> },
    { header: t('orders.diningType', '取餐方式'), render: o => <Badge variant="default">{diningMap[o.dining_type] || o.dining_type}</Badge> },
    { header: <button onClick={() => handleSort('total')} className="hover:text-primary-600">{t('orders.total', '金额')}{sortIcon('total')}</button>, render: o => <span className="font-medium text-primary-600">${parseFloat(o.total).toFixed(2)}</span> },
    { header: t('orders.status', '状态'), render: o => <Badge variant={statusMap[o.status]?.variant || 'default'}>{statusMap[o.status]?.label || o.status}</Badge> },
    { header: <button onClick={() => handleSort('created_at')} className="hover:text-primary-600">{t('common.time', '时间')}{sortIcon('created_at')}</button>, render: o => <span className="text-xs text-gray-400">{formatDateTime(o.created_at)}</span> }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t('orders.title', '订单管理')}</h2>
          <p className="text-sm text-gray-400 mt-1">{t('orders.subtitle', '按日期查询订单，支持按订单号/金额/时间排序')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">{t('orders.totalCount', '订单总数')}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{summary.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">{t('orders.totalRevenue', '总金额')}</p>
          <p className="text-2xl font-bold text-primary-600 mt-1">${parseFloat(summary.revenue).toFixed(2)}</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('orders.startDate', '开始时间')}</label>
            <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('orders.endDate', '结束时间')}</label>
            <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400" />
          </div>
          <Button onClick={handleSearch}>{t('orders.query', '查询')}</Button>
          <div className="flex gap-2 ml-auto">
            <button onClick={setToday} className="px-3 py-2 text-sm text-gray-600 hover:text-primary-600 border border-gray-200 rounded-lg">{t('orders.today', '今日')}</button>
            <button onClick={setThisWeek} className="px-3 py-2 text-sm text-gray-600 hover:text-primary-600 border border-gray-200 rounded-lg">{t('orders.thisWeek', '本周')}</button>
            <button onClick={setAll} className="px-3 py-2 text-sm text-gray-600 hover:text-primary-600 border border-gray-200 rounded-lg">{t('orders.all', '全部')}</button>
          </div>
        </div>
      </Card>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => { setStatusFilter(''); setPage(1); load({ statusFilter: '', page: 1 }) }} className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === '' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>{t('orders.allStatus', '全部')}</button>
        {Object.entries(statusMap).map(([key, val]) => (
          <button key={key} onClick={() => { setStatusFilter(key); setPage(1); load({ statusFilter: key, page: 1 }) }} className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === key ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>{val.label}</button>
        ))}
      </div>

      <Card>
        {orders.length === 0 ? (
          <Empty text={t('orders.noData', '该时间段暂无订单')} icon="📋" />
        ) : (
          <>
            <Table columns={columns} data={orders} actions={o => (
              <Select value={o.status} onChange={e => updateStatus(o.id, e.target.value)} options={Object.entries(statusMap).map(([k, v]) => ({ value: k, label: v.label }))} />
            )} />
            <div className="flex items-center justify-between px-5 py-3 border-t bg-gray-50">
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span>{t('common.totalLabel', '共')} {summary.total} {t('common.records', '条')}</span>
                <select value={pageSize} onChange={e => { const size = parseInt(e.target.value); setPageSize(size); setPage(1); load({ pageSize: size, page: 1 }) }} className="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none">
                  <option value={10}>10 {t('orders.perPage', '条/页')}</option>
                  <option value={20}>20 {t('orders.perPage', '条/页')}</option>
                  <option value={50}>50 {t('orders.perPage', '条/页')}</option>
                  <option value={100}>100 {t('orders.perPage', '条/页')}</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { const p = Math.max(1, page - 1); setPage(p); load({ page: p }) }} disabled={page <= 1} className="px-3 py-1 text-sm border border-gray-200 rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white">{t('common.prevPage', '上一页')}</button>
                <span className="text-sm text-gray-600">{t('common.pageLabel', '第')} {page} / {Math.max(1, Math.ceil(summary.total / pageSize))} {t('common.pageUnit', '页')}</span>
                <button onClick={() => { const p = page + 1; setPage(p); load({ page: p }) }} disabled={page >= Math.ceil(summary.total / pageSize)} className="px-3 py-1 text-sm border border-gray-200 rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white">{t('common.nextPage', '下一页')}</button>
              </div>
            </div>
          </>
        )}
      </Card>

      <Dialog open={!!detail} onClose={() => setDetail(null)} title={`${t('orders.orderDetail', '订单详情')} - ${detail?.order_no || ''}`} width="max-w-lg">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-400">{t('orders.diningType', '取餐方式')}</p><p className="font-medium">{diningMap[detail.dining_type]}</p></div>
              <div><p className="text-gray-400">{t('common.status', '状态')}</p><Badge variant={statusMap[detail.status]?.variant}>{statusMap[detail.status]?.label}</Badge></div>
              <div><p className="text-gray-400">{t('orders.customer', '顾客')}</p><p className="font-medium">{detail.customer_name || '-'}</p></div>
              <div><p className="text-gray-400">{t('orders.phone', '电话')}</p><p className="font-medium">{detail.customer_phone || '-'}</p></div>
              {detail.dining_type === 'delivery' && <div className="col-span-2"><p className="text-gray-400">{t('orders.deliveryAddress', '配送地址')}</p><p className="font-medium">{detail.customer_address}</p></div>}
              {detail.note && <div className="col-span-2"><p className="text-gray-400">{t('orders.note', '备注')}</p><p className="font-medium">{detail.note}</p></div>}
              <div className="col-span-2"><p className="text-gray-400">{t('orders.orderTime', '下单时间')}</p><p className="font-medium">{formatDateTime(detail.created_at)}</p></div>
            </div>
            <div className="border-t pt-4">
              <p className="text-sm text-gray-400 mb-2">{t('orders.itemsDetail', '商品明细')}</p>
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
              <div className="flex justify-between text-sm text-gray-600"><span>{t('orders.subtotal', '小计')}</span><span>${parseFloat(detail.subtotal).toFixed(2)}</span></div>
              <div className="flex justify-between text-sm text-gray-600"><span>{t('orders.tax', '税费')}</span><span>${parseFloat(detail.tax).toFixed(2)}</span></div>
              <div className="flex justify-between text-sm text-gray-600"><span>{t('orders.deliveryFee', '配送费')}</span><span>${parseFloat(detail.delivery_fee).toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t"><span>{t('orders.grandTotal', '合计')}</span><span className="text-primary-600">${parseFloat(detail.total).toFixed(2)}</span></div>
            </div>
            <div className="flex gap-2 pt-2 flex-wrap">
              {statusMap[detail.status]?.next && (
                <Button size="sm" onClick={() => updateStatus(detail.id, statusMap[detail.status].next)}>{statusMap[detail.status].nextLabel}</Button>
              )}
              {detail.status === 'pending' && (
                <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={async () => { if (await confirm({ title: t('orders.cancelOrder', '取消订单'), message: t('orders.confirmCancelOrder', '确定取消此订单？'), variant: 'danger' })) updateStatus(detail.id, 'cancelled') }}>{t('orders.cancelOrder', '取消订单')}</Button>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}