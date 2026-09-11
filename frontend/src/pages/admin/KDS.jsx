import { useState, useEffect, useCallback } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Badge, Empty, toast } from '../../components/ui'

export default function KDS() {
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState({ pending: 0, preparing: 0, ready: 0, todayCompleted: 0 })
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pendingData, statsData] = await Promise.all([
        api.getKDSPendingOrders(),
        api.getKDSStats()
      ])
      setOrders(Array.isArray(pendingData) ? pendingData : [])
      setStats(statsData || { pending: 0, preparing: 0, ready: 0, todayCompleted: 0 })
    } catch (e) {
      console.error('KDS加载失败:', e.message)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!autoRefresh) return
    const timer = setInterval(load, 10000)
    return () => clearInterval(timer)
  }, [autoRefresh, load])

  const handleAdvance = async (order) => {
    try {
      await api.advanceKDSOrder(order.id)
      toast('订单状态已更新')
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const handleComplete = async (order) => {
    if (order.dining_type === 'dinein') {
      toast('堂吃订单请到收银台结账后完成', 'error')
      return
    }
    if (!window.confirm(`确认订单 ${order.order_no} 已完成出餐？`)) return
    try {
      await api.completeKDSOrder(order.id)
      toast('订单已完成')
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const handlePrintReceipt = async (order) => {
    try {
      const receipt = await api.getReceipt(order.id)
      const win = window.open('', '_blank', 'width=320,height=600')
      if (!win) { toast('请允许弹出窗口以打印小票', 'error'); return }
      const itemsHtml = (receipt.items || []).map(item => `
        <div style="display:flex;justify-content:space-between;font-size:12px;margin:2px 0;">
          <span>${item.quantity}x ${item.name}</span>
          <span>$${(item.price * item.quantity).toFixed(2)}</span>
        </div>
        ${item.note ? `<div style="font-size:10px;color:#666;padding-left:12px;">备注: ${item.note}</div>` : ''}
      `).join('')
      win.document.write(`
        <html><head><title>小票 ${receipt.order_no}</title>
        <style>
          body{font-family:monospace;width:280px;margin:0 auto;padding:10px;}
          .center{text-align:center;}
          .bold{font-weight:bold;}
          .line{border-top:1px dashed #000;margin:8px 0;}
          .row{display:flex;justify-content:space-between;font-size:12px;}
        </style></head><body>
          <div class="center bold" style="font-size:14px;">${receipt.store_name || 'Only One BBQ & Tea'}</div>
          <div class="center" style="font-size:11px;">${receipt.address || ''}</div>
          <div class="line"></div>
          <div class="row"><span>订单号:</span><span class="bold">${receipt.order_no}</span></div>
          <div class="row"><span>取餐号:</span><span class="bold">${receipt.pickup_number || '-'}</span></div>
          <div class="row"><span>类型:</span><span>${receipt.dining_type_label || ''}</span></div>
          <div class="row"><span>时间:</span><span>${receipt.created_at || ''}</span></div>
          ${receipt.customer_name ? `<div class="row"><span>顾客:</span><span>${receipt.customer_name}</span></div>` : ''}
          ${receipt.customer_phone ? `<div class="row"><span>电话:</span><span>${receipt.customer_phone}</span></div>` : ''}
          <div class="line"></div>
          ${itemsHtml}
          <div class="line"></div>
          <div class="row"><span>小计:</span><span>$${parseFloat(receipt.subtotal || 0).toFixed(2)}</span></div>
          <div class="row"><span>税费:</span><span>$${parseFloat(receipt.tax || 0).toFixed(2)}</span></div>
          ${receipt.delivery_fee > 0 ? `<div class="row"><span>配送费:</span><span>$${parseFloat(receipt.delivery_fee).toFixed(2)}</span></div>` : ''}
          <div class="row bold"><span>合计:</span><span>$${parseFloat(receipt.total || 0).toFixed(2)}</span></div>
          ${receipt.note ? `<div class="line"></div><div style="font-size:11px;">备注: ${receipt.note}</div>` : ''}
          <div class="line"></div>
          <div class="center" style="font-size:11px;">感谢您的惠顾，欢迎下次光临！</div>
          <div class="center" style="font-size:10px;margin-top:4px;">Only One BBQ & Tea</div>
        </body></html>
      `)
      win.document.close()
      setTimeout(() => { win.print(); win.close() }, 500)
    } catch (e) { toast(e.message, 'error') }
  }

  const getStatusBadge = (order) => {
    const map = {
      pending: { label: '待做', variant: 'warning' },
      preparing: { label: '制作中', variant: 'primary' },
      ready: { label: '待取餐', variant: 'success' }
    }
    const s = map[order.status] || { label: order.status, variant: 'default' }
    return <Badge variant={s.variant}>{s.label}</Badge>
  }

  const getDiningTypeLabel = (type) => {
    const map = { dinein: '堂吃', takeout: '外带', delivery: '配送' }
    return map[type] || type
  }

  const statCards = [
    { label: '待做', value: stats.pending, color: 'text-yellow-600 bg-yellow-50' },
    { label: '制作中', value: stats.preparing, color: 'text-blue-600 bg-blue-50' },
    { label: '待取餐', value: stats.ready, color: 'text-green-600 bg-green-50' },
    { label: '今日完成', value: stats.todayCompleted, color: 'text-gray-600 bg-gray-50' }
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">🍳 厨房显示系统 (KDS)</h2>
          <p className="text-sm text-gray-400 mt-1">实时显示待做订单，点击按钮推进制作状态</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} className="w-4 h-4" />
            自动刷新 (10秒)
          </label>
          <Button variant="outline" onClick={load} disabled={loading}>
            {loading ? '刷新中...' : '🔄 刷新'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <Card key={i} className={`${s.color} p-4`}>
            <p className="text-sm opacity-75">{s.label}</p>
            <p className="text-3xl font-bold mt-1">{s.value}</p>
          </Card>
        ))}
      </div>

      {orders.length === 0 ? (
        <Card className="p-12">
          <Empty text="暂无待做订单，休息一下吧 ☕" icon="🍳" />
        </Card>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map(order => (
            <Card key={order.id} className={`overflow-hidden ${order.status === 'pending' ? 'border-l-4 border-l-yellow-400' : order.status === 'preparing' ? 'border-l-4 border-l-blue-400' : 'border-l-4 border-l-green-400'}`}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-lg font-bold text-gray-800">#{order.order_no}</span>
                    {order.pickup_number && <span className="ml-2 text-sm bg-primary-100 text-primary-700 px-2 py-0.5 rounded">取餐 {order.pickup_number}</span>}
                  </div>
                  {getStatusBadge(order)}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                  <Badge variant="outline">{getDiningTypeLabel(order.dining_type)}</Badge>
                  <span>⏱ {order.wait_minutes || 0}分钟</span>
                  {order.customer_name && <span>👤 {order.customer_name}</span>}
                </div>
                <div className="space-y-1 mb-3 max-h-40 overflow-y-auto">
                  {(order.items || []).map((item, idx) => (
                    <div key={idx} className="flex items-start justify-between text-sm">
                      <div className="flex-1">
                        <span className="font-medium text-gray-700">{item.quantity}x {item.name}</span>
                        {item.note && <p className="text-xs text-gray-400 ml-4">📝 {item.note}</p>}
                      </div>
                      <span className="text-gray-500 ml-2">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                {order.note && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3 text-xs text-yellow-700">
                    📝 订单备注: {order.note}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {order.status === 'pending' && (
                    <Button size="sm" className="flex-1" onClick={() => handleAdvance(order)}>开始制作</Button>
                  )}
                  {order.status === 'preparing' && (
                    <Button size="sm" className="flex-1" onClick={() => handleAdvance(order)}>制作完成</Button>
                  )}
                  {order.status === 'ready' && order.dining_type !== 'dinein' && (
                    <Button size="sm" variant="success" className="flex-1" onClick={() => handleComplete(order)}>确认出餐</Button>
                  )}
                  {order.status === 'ready' && order.dining_type === 'dinein' && (
                    <span className="flex-1 text-center text-xs text-gray-400">堂吃订单待结账</span>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handlePrintReceipt(order)}>🖨 小票</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}