import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { Dialog, Button, toast } from '../../components/ui'
import { getStatusLabel, getStatusVariant, getDiningLabel } from '../../lib/orderStatus'
import { formatDateTime, formatTime, formatDate, formatClockTime, formatRelative, formatDateTimeCN } from '../../utils/format'

export default function EmployeeTableDetail() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tableId = searchParams.get('tableId')
  const tableNo = searchParams.get('tableNo') || ''
  const [orders, setOrders] = useState([])
  const [total, setTotal] = useState(0)
  const [taxRate, setTaxRate] = useState(0.08875)
  const [checkoutDialog, setCheckoutDialog] = useState(false)
  const [checkoutData, setCheckoutData] = useState({ orders: [], total: 0, count: 0 })
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [checkingOut, setCheckingOut] = useState(false)

  useEffect(() => {
    api.getSettings().then(s => setTaxRate(parseFloat(s?.tax_rate || 0.08875))).catch(() => {})
    loadOrders()
  }, [])

  const loadOrders = async () => {
    if (!tableId) return
    try {
      const data = await api.getTableOrders(tableId)
      const allOrders = Array.isArray(data?.orders) ? data.orders : []
      const activeOrders = allOrders.filter(o => o.status !== 'cancelled' && o.status !== 'completed')
      setOrders(activeOrders)
      setTotal(data?.total || 0)
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const allItems = orders.reduce((acc, order) => {
    try {
      const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || [])
      items.forEach(item => acc.push({ ...item, order_no: order.order_no, order_time: order.created_at }))
    } catch (e) {}
    return acc
  }, [])

  const subtotal = allItems.reduce((sum, i) => sum + parseFloat(i.price) * i.quantity, 0)
  const tax = Math.round(subtotal * taxRate * 100) / 100
  const totalWithTax = Math.round((subtotal + tax) * 100) / 100

  const goEdit = () => {
    navigate(`/employee/order?type=dinein&tableId=${tableId}&tableNo=${encodeURIComponent(tableNo)}`)
  }

  const handleCheckout = () => {
    if (!tableId) { toast('无法获取桌子信息', 'error'); return }
    if (orders.length === 0) { toast('没有进行中的订单', 'error'); return }
    const checkoutTotal = orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0)
    setCheckoutData({ orders, total: checkoutTotal, count: orders.length })
    setCheckoutDialog(true)
  }

  const confirmCheckout = async () => {
    if (!tableId || checkoutData.orders.length === 0) return
    setCheckingOut(true)
    try {
      // 逐个订单结账
      for (const order of checkoutData.orders) {
        await api.checkoutOrder(order.id, paymentMethod)
      }
      
      // 现金结账自动打开钱箱
      if (paymentMethod === 'cash') {
        try {
          const result = await api.openCashDrawer()
          if (result?.command) {
            const pulse = atob(result.command)
            const printWindow = window.open('', '_blank', 'width=1,height=1')
            if (printWindow) {
              printWindow.document.write('<pre>' + pulse + '</pre>')
              printWindow.document.close()
              printWindow.print()
              setTimeout(() => printWindow.close(), 500)
            }
          }
        } catch (e) {
          console.log('钱箱打开失败（需连接打印机）:', e.message)
        }
      }
      
      toast(`结账成功（${paymentMethod === 'cash' ? '现金' : paymentMethod === 'card' ? '刷卡' : paymentMethod === 'apple_pay' ? 'Apple Pay' : '外卖平台'}），共 $${parseFloat(checkoutData.total).toFixed(2)}`)
      setCheckoutDialog(false)
      setPaymentMethod('cash')
      navigate('/employee')
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setCheckingOut(false)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      <header className="flex items-center justify-between px-4 py-2.5 bg-white border-b shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/employee')} className="flex items-center gap-2 text-gray-600 hover:text-primary-600 transition-colors">
            <span className="text-lg">←</span>
            <span className="text-2xl">🍵</span>
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-800">{tableNo}桌 · 订单详情</h1>
            <p className="text-xs text-gray-400">{user?.name || user?.username}</p>
          </div>
          {orders.length > 0 && (
            <span className="ml-2 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
              {orders.length} 单进行中
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/employee')} className="text-sm text-gray-500 hover:text-red-500 px-3 py-2 rounded-lg hover:bg-gray-100 transition">
            退出
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {orders.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="text-lg font-medium">暂无进行中的订单</p>
            <p className="text-sm mt-1">点击下方「编辑 / 加单」开始点餐</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {orders.map(order => (
              <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-primary-600 font-bold">{order.order_no}</span>
                    <span className="text-xs text-gray-400">{formatDateTime(order.created_at)}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getStatusVariant(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </div>
                <div className="p-4 space-y-2">
                  {(order.items || []).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <div className="flex-1 min-w-0">
                        <span className="text-gray-700 font-medium">{item.name}</span>
                        {item.note && <span className="text-xs text-gray-400 ml-1">({item.note})</span>}
                      </div>
                      <div className="flex items-center gap-3 text-gray-500">
                        <span className="text-xs">${parseFloat(item.price).toFixed(2)}</span>
                        <span className="text-xs">x{item.quantity}</span>
                        <span className="text-xs font-medium text-gray-700 w-14 text-right">${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2 bg-gray-50 border-t flex justify-between items-center">
                  <span className="text-xs text-gray-400">小计</span>
                  <span className="font-bold text-primary-600">${parseFloat(order.total).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t p-4 flex-shrink-0 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="space-y-1.5 mb-4">
            <div className="flex justify-between text-sm text-gray-500">
              <span>商品小计</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>税费</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>合计</span>
              <span className="text-primary-600">${totalWithTax.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={goEdit} className="flex-1 py-3 text-base font-bold">
              ✏️ 编辑 / 加单
            </Button>
            <Button onClick={handleCheckout} variant="outline" className="flex-1 py-3 text-base font-bold border-primary-300 text-primary-600 hover:bg-primary-50" disabled={orders.length === 0}>
              💰 结账
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={checkoutDialog} onClose={() => setCheckoutDialog(false)} title={`结账 · ${tableNo}桌`} width="max-w-md">
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between text-sm text-gray-500 mb-2">
              <span>订单数</span>
              <span className="font-medium">{checkoutData.count} 单</span>
            </div>
            <div className="flex justify-between font-bold text-xl pt-2 border-t">
              <span>应付总额</span>
              <span className="text-primary-600">${parseFloat(checkoutData.total).toFixed(2)}</span>
            </div>
          </div>
          
          {/* 付款方式选择 */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">选择付款方式</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'cash', label: '💵 现金', desc: '自动弹钱箱' },
                { value: 'card', label: '💳 刷卡', desc: 'Tap to Pay' },
                { value: 'apple_pay', label: '🍎 Apple Pay', desc: '非接触支付' },
                { value: 'platform', label: '📱 外卖平台', desc: 'Uber/DoorDash等' },
              ].map(method => (
                <button
                  key={method.value}
                  onClick={() => setPaymentMethod(method.value)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    paymentMethod === method.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <p className={`font-medium text-sm ${paymentMethod === method.value ? 'text-primary-700' : 'text-gray-700'}`}>{method.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{method.desc}</p>
                </button>
              ))}
            </div>
          </div>
          {checkoutData.orders?.length > 0 && (
            <div className="max-h-64 overflow-y-auto space-y-3">
              {checkoutData.orders.map(o => (
                <div key={o.id} className="bg-white border border-gray-100 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-dashed border-gray-100">
                    <div>
                      <span className="font-mono text-primary-600 text-sm">{o.order_no}</span>
                      <span className="text-xs text-gray-400 ml-2">{formatDateTime(o.created_at)}</span>
                    </div>
                    <span className="text-sm font-medium">${parseFloat(o.total).toFixed(2)}</span>
                  </div>
                  <div className="space-y-1">
                    {(o.items || []).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <div className="flex-1 min-w-0">
                          <span className="text-gray-700">{item.name}</span>
                          {item.note && <span className="text-xs text-gray-400 ml-1">({item.note})</span>}
                        </div>
                        <div className="flex items-center gap-3 text-gray-500">
                          <span className="text-xs">${parseFloat(item.price).toFixed(2)}</span>
                          <span className="text-xs">x{item.quantity}</span>
                          <span className="text-xs font-medium text-gray-600 w-14 text-right">${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setCheckoutDialog(false)} disabled={checkingOut}>取消</Button>
            <Button className="flex-1" onClick={confirmCheckout} disabled={checkingOut || checkoutData.orders.length === 0}>
              {checkingOut ? '结账中...' : paymentMethod === 'cash' ? '现金结账并弹钱箱' : '确认结账'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}