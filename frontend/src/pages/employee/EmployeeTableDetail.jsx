import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { Dialog, Button, toast } from '../../components/ui'

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

  const handleCheckout = async () => {
    if (!tableId) { toast('无法获取桌子信息', 'error'); return }
    try {
      const data = await api.getTableOrders(tableId)
      setCheckoutData(data)
      setCheckoutDialog(true)
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const confirmCheckout = async () => {
    if (!tableId) return
    try {
      await api.clearTable(tableId)
      toast('结账成功，桌子已清空')
      setCheckoutDialog(false)
      navigate('/employee')
    } catch (e) {
      toast(e.message, 'error')
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
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <span className="text-5xl mb-3">📋</span>
            <p className="text-lg">该桌暂无进行中的订单</p>
            <p className="text-sm mt-1">点击下方按钮开始点餐</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {orders.map((order, oIdx) => (
              <div key={order.id} className={`bg-white rounded-xl shadow-sm overflow-hidden ${oIdx > 0 ? 'mt-4' : ''}`}>
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-primary-600">{order.order_no}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      order.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
                      order.status === 'ready' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {order.status === 'pending' ? '待处理' :
                       order.status === 'preparing' ? '制作中' :
                       order.status === 'ready' ? '待取餐' :
                       order.status === 'completed' ? '已完成' : '已取消'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">{order.created_at}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {(typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || [])).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-800">{item.name}</p>
                        {item.note && <p className="text-xs text-gray-400 mt-0.5">{item.note}</p>}
                      </div>
                      <div className="flex items-center gap-4 ml-4">
                        <span className="text-sm text-gray-500">${parseFloat(item.price).toFixed(2)}</span>
                        <span className="text-sm text-gray-500 w-8 text-center">x{item.quantity}</span>
                        <span className="text-sm font-medium text-gray-700 w-16 text-right">${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end px-4 py-2 bg-gray-50 border-t">
                  <span className="text-sm text-gray-500">小计：<span className="font-medium text-gray-700">${parseFloat(order.total).toFixed(2)}</span></span>
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
          {checkoutData.orders?.length > 0 && (
            <div className="max-h-64 overflow-y-auto space-y-3">
              {checkoutData.orders.map(o => (
                <div key={o.id} className="bg-white border border-gray-100 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-dashed border-gray-100">
                    <div>
                      <span className="font-mono text-primary-600 text-sm">{o.order_no}</span>
                      <span className="text-xs text-gray-400 ml-2">{o.created_at}</span>
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
            <Button variant="outline" className="flex-1" onClick={() => setCheckoutDialog(false)}>取消</Button>
            <Button className="flex-1" onClick={confirmCheckout}>确认结账并清桌</Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
