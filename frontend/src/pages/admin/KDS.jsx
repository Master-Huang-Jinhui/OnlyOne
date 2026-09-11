import { useState, useEffect, useCallback } from 'react'
import { api } from '../../lib/api'
import { Button, toast } from '../../components/ui'

export default function KDS() {
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState({ pending: 0, preparing: 0, ready: 0, todayCompleted: 0 })
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const load = useCallback(async () => {
    try {
      const [pendingData, statsData] = await Promise.all([
        api.getKDSPendingOrders(),
        api.getKDSStats()
      ])
      setOrders(Array.isArray(pendingData) ? pendingData : [])
      setStats(statsData || { pending: 0, preparing: 0, ready: 0, todayCompleted: 0 })
    } catch (e) {
      console.error('KDS加载失败:', e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!autoRefresh) return
    const timer = setInterval(() => {
      load()
    }, 10000)
    return () => clearInterval(timer)
  }, [autoRefresh, load])

  const handleAdvance = async (order) => {
    try {
      const result = await api.advanceKDSOrder(order.id)
      toast(result.label || '状态已更新')
      load()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const handleComplete = async (order) => {
    if (!confirm(`确定订单 ${order.order_no} 已出餐？`)) return
    try {
      await api.completeKDSOrder(order.id)
      toast('已出餐')
      load()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const handlePrint = async (order) => {
    try {
      const receipt = await api.getReceipt(order.id)
      printReceipt(receipt)
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const printReceipt = (data) => {
    const printWindow = window.open('', '_blank', 'width=300,height=600')
    if (!printWindow) {
      toast('请允许弹出窗口以打印小票', 'error')
      return
    }

    const diningTypeLabel = {
      dinein: '堂吃', dine_in: '堂吃',
      takeout: '自取',
      delivery: '配送'
    }[data.dining_type] || data.dining_type

    const itemsHtml = data.items.map(item => `
      <div style="display:flex;justify-content:space-between;border-bottom:1px dashed #ccc;padding:4px 0;font-size:12px;">
        <span>${item.quantity}x ${item.name}</span>
        <span>$${(item.price * item.quantity).toFixed(2)}</span>
      </div>
      ${item.note ? `<div style="font-size:11px;color:#666;padding-left:10px;">备注: ${item.note}</div>` : ''}
    `).join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>小票 ${data.order_no}</title>
        <style>
          body { font-family: monospace; padding: 10px; width: 280px; margin: 0 auto; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .row { display: flex; justify-content: space-between; }
          .dashed { border-top: 1px dashed #ccc; margin: 8px 0; }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size:14px;">${data.store_name}</div>
        ${data.address ? `<div class="center" style="font-size:11px;">${data.address}</div>` : ''}
        ${data.phone ? `<div class="center" style="font-size:11px;">电话: ${data.phone}</div>` : ''}
        <div class="dashed"></div>
        <div class="row"><span>订单号:</span><span class="bold">${data.order_no}</span></div>
        <div class="row"><span>类型:</span><span>${diningTypeLabel}</span></div>
        ${data.pickup_number ? `<div class="row"><span>取餐号:</span><span class="bold" style="font-size:16px;">${data.pickup_number}</span></div>` : ''}
        ${data.customer_name ? `<div class="row"><span>顾客:</span><span>${data.customer_name}</span></div>` : ''}
        ${data.customer_phone ? `<div class="row"><span>电话:</span><span>${data.customer_phone}</span></div>` : ''}
        <div class="row"><span>时间:</span><span>${data.created_at}</span></div>
        <div class="dashed"></div>
        ${itemsHtml}
        <div class="dashed"></div>
        <div class="row"><span>小计:</span><span>$${data.subtotal.toFixed(2)}</span></div>
        <div class="row"><span>税费:</span><span>$${data.tax.toFixed(2)}</span></div>
        ${data.delivery_fee > 0 ? `<div class="row"><span>配送费:</span><span>$${data.delivery_fee.toFixed(2)}</span></div>` : ''}
        <div class="row bold" style="font-size:14px;"><span>合计:</span><span>$${data.total.toFixed(2)}</span></div>
        ${data.note ? `<div class="dashed"></div><div style="font-size:12px;">备注: ${data.note}</div>` : ''}
        <div class="dashed"></div>
        <div class="center" style="font-size:11px;">谢谢惠顾，欢迎下次光临！</div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  const getStatusColor = (status) => {
    if (status === 'pending') return 'bg-red-50 border-red-200'
    if (status === 'preparing') return 'bg-amber-50 border-amber-200'
    if (status === 'ready') return 'bg-green-50 border-green-200'
    return 'bg-white border-gray-200'
  }

  const getStatusBadge = (status) => {
    if (status === 'pending') return { text: '待制作', color: 'bg-red-500 text-white' }
    if (status === 'preparing') return { text: '制作中', color: 'bg-amber-500 text-white' }
    if (status === 'ready') return { text: '待取餐', color: 'bg-green-500 text-white' }
    return { text: status, color: 'bg-gray-500 text-white' }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🍳</span>
              <h1 className="text-xl font-bold text-gray-800">厨房显示系统 KDS</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-500">{stats.pending}</div>
                  <div className="text-xs text-gray-500">待制作</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-500">{stats.preparing}</div>
                  <div className="text-xs text-gray-500">制作中</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">{stats.ready}</div>
                  <div className="text-xs text-gray-500">待取餐</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-700">{stats.todayCompleted}</div>
                  <div className="text-xs text-gray-500">今日完成</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${autoRefresh ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                >
                  {autoRefresh ? '自动刷新中' : '已暂停'}
                </button>
                <Button size="sm" variant="outline" onClick={load}>刷新</Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {loading ? (
          <div className="text-center py-20 text-gray-400">加载中...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎉</div>
            <p className="text-gray-500 text-lg">暂无待处理订单</p>
            <p className="text-gray-400 text-sm mt-1">新订单会自动显示在这里</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {orders.map(order => {
              const badge = getStatusBadge(order.status)
              return (
                <div
                  key={order.id}
                  className={`rounded-xl border-2 shadow-sm overflow-hidden ${getStatusColor(order.status)}`}
                >
                  <div className="px-4 py-3 border-b border-gray-100 bg-white/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-lg font-bold text-gray-800">#{order.order_no}</span>
                        {order.pickup_number && (
                          <span className="ml-2 text-sm text-gray-500">取餐号 {order.pickup_number}</span>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                        {badge.text}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">
                        {order.dining_type === 'dinein' || order.dining_type === 'dine_in'
                          ? (order.table_name || order.table_position || '堂吃')
                          : order.dining_type === 'takeout' ? '自取' : '配送'}
                      </span>
                      <span className={`text-xs font-medium ${order.wait_minutes > 15 ? 'text-red-500' : order.wait_minutes > 8 ? 'text-amber-500' : 'text-gray-500'}`}>
                        等待 {order.wait_minutes} 分钟
                      </span>
                    </div>
                    {order.customer_name && (
                      <div className="text-xs text-gray-600 mt-1">顾客: {order.customer_name}</div>
                    )}
                  </div>

                  <div className="px-4 py-3 max-h-48 overflow-y-auto">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 py-1.5 border-b border-gray-100 last:border-0">
                        <span className="bg-primary-100 text-primary-700 text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0">
                          {item.quantity}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-800 truncate">{item.name}</div>
                          {item.note && (
                            <div className="text-xs text-amber-600 mt-0.5">📝 {item.note}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {order.note && (
                    <div className="px-4 py-2 bg-amber-50 border-t border-amber-100">
                      <p className="text-xs text-amber-700">📌 {order.note}</p>
                    </div>
                  )}

                  <div className="px-4 py-3 bg-white border-t border-gray-100 flex gap-2">
                    {order.status === 'pending' && (
                      <Button className="flex-1" onClick={() => handleAdvance(order)}>
                        开始制作
                      </Button>
                    )}
                    {order.status === 'preparing' && (
                      <Button className="flex-1" onClick={() => handleAdvance(order)}>
                        制作完成
                      </Button>
                    )}
                    {order.status === 'ready' && (order.dining_type !== 'dinein' && order.dining_type !== 'dine_in') && (
                      <Button className="flex-1" variant="success" onClick={() => handleComplete(order)}>
                        确认出餐
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handlePrint(order)}>
                      🖨️ 小票
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}