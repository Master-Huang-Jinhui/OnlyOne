import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { getGuestId, getTableInfo, initTableFromUrl } from '../../lib/guest'
import { Button, toast } from '../../components/ui'

const statusMap = {
  pending: { label: '待确认', color: 'bg-yellow-500', step: 1 },
  preparing: { label: '制作中', color: 'bg-blue-500', step: 2 },
  ready: { label: '待取餐', color: 'bg-green-500', step: 3 },
  completed: { label: '已完成', color: 'bg-gray-500', step: 4 },
  cancelled: { label: '已取消', color: 'bg-red-500', step: 0 }
}

const steps = [
  { key: 'pending', label: '下单成功', icon: '📝' },
  { key: 'preparing', label: '制作中', icon: '👨‍🍳' },
  { key: 'ready', label: '待取餐', icon: '🍵' },
  { key: 'completed', label: '已完成', icon: '✅' }
]

const diningTypeMap = {
  dine_in: '🍽️ 堂吃', dinein: '🍽️ 堂吃',
  takeout: '🥡 自取', pickup: '🥡 自取',
  delivery: '🛵 配送'
}

function formatPhone(phone) {
  const clean = (phone || '').replace(/\D/g, '')
  if (clean.length === 10) return `(${clean.slice(0,3)}) ${clean.slice(3,6)}-${clean.slice(6)}`
  return phone
}

export default function OrderStatus() {
  const [searchParams] = useSearchParams()
  const [orderNoInput, setOrderNoInput] = useState('')
  const [myOrders, setMyOrders] = useState([])
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState('mine')
  const [tableInfo, setTableInfo] = useState(null)

  useEffect(() => {
    initTableFromUrl().then(t => {
      if (t) setTableInfo({ id: t.id, table_no: t.table_no, current_session: t.current_session })
    })
    loadMyOrders()
    const autoOrder = searchParams.get('order')
    if (autoOrder) { setOrderNoInput(autoOrder); handleSearchByNo(autoOrder) }
  }, [])

  const loadMyOrders = async () => {
    setLoading(true)
    try {
      const guestId = getGuestId()
      const table = getTableInfo()
      const data = await api.getMyOrders(guestId, table?.id, table?.current_session)
      setMyOrders(data.orders || [])
    } catch (e) { console.error('加载我的订单失败', e) }
    finally { setLoading(false) }
  }

  const handleSearchByNo = async (no) => {
    const orderNo = (no || orderNoInput).trim().toUpperCase()
    if (!orderNo) { toast('请输入订单号', 'error'); return }
    setLoading(true)
    try {
      const data = await api.getOrderByNo(orderNo)
      setOrder(data); setView('detail')
    } catch (e) { toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  const handleViewDetail = async (orderNo) => {
    setLoading(true)
    try { const data = await api.getOrderByNo(orderNo); setOrder(data); setView('detail') }
    catch (e) { toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  const handleBack = () => { setOrder(null); setView('mine'); loadMyOrders() }

  const status = order ? statusMap[order.status] || statusMap.pending : null
  const currentStep = status?.step || 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl">🍵</span>
            <span className="font-bold text-primary-700">Only One</span>
          </Link>
          {view === 'detail' ? (
            <button onClick={handleBack} className="text-sm text-primary-600 hover:text-primary-700 font-medium">← 返回</button>
          ) : (
            <Link to="/menu" className="text-sm text-primary-600 hover:text-primary-700 font-medium">继续点餐</Link>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {view === 'mine' && (
          <>
            {tableInfo && (
              <div className="bg-primary-50 rounded-xl p-3 mb-4 flex items-center justify-between">
                <span className="text-sm text-primary-700">🪑 当前餐桌：<strong>{tableInfo.table_no}</strong></span>
                <button onClick={loadMyOrders} className="text-xs text-primary-600 hover:text-primary-700">刷新</button>
              </div>
            )}

            <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
              <h2 className="font-bold text-gray-800 mb-3">🔍 按订单号查询</h2>
              <div className="flex gap-2">
                <input type="text" value={orderNoInput} onChange={e => setOrderNoInput(e.target.value)}
                  placeholder="输入订单号" onKeyDown={e => e.key === 'Enter' && handleSearchByNo()}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100" />
                <Button onClick={() => handleSearchByNo()} disabled={loading}>查询</Button>
              </div>
              <p className="text-xs text-gray-400 mt-2">换了设备？用订单号也能查到你的订单</p>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-800">📋 我的订单</h2>
                <span className="text-xs text-gray-400">{myOrders.length} 笔</span>
              </div>
              {loading ? (
                <div className="text-center py-8 text-gray-400 text-sm">加载中...</div>
              ) : myOrders.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-5xl mb-3">🛒</div>
                  <p className="text-gray-500 text-sm mb-1">还没有订单</p>
                  <p className="text-gray-400 text-xs mb-4">本设备和当前餐桌的订单会显示在这里</p>
                  <Link to="/menu"><Button>去点餐</Button></Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {myOrders.map(o => {
                    const s = statusMap[o.status] || statusMap.pending
                    return (
                      <div key={o.id} onClick={() => handleViewDetail(o.order_no)}
                        className="p-4 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50/30 transition-all cursor-pointer">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-800 text-sm">{o.order_no}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-white text-xs ${s.color}`}>{s.label}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{diningTypeMap[o.dining_type] || o.dining_type}</span>
                          <span className="font-bold text-primary-600">${o.total?.toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5">{o.created_at ? new Date(o.created_at).toLocaleString('zh-CN') : '-'}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {view === 'detail' && order && status && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs text-gray-400 mb-1">订单号</p>
                  <p className="text-lg font-bold text-gray-800">{order.order_no}</p>
                </div>
                <div className={`px-4 py-2 rounded-full text-white text-sm font-medium ${status.color}`}>{status.label}</div>
              </div>
              {order.status !== 'cancelled' && (
                <div className="relative">
                  <div className="flex justify-between">
                    {steps.map((step, i) => (
                      <div key={step.key} className="flex flex-col items-center relative z-10">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${
                          i < currentStep ? 'bg-primary-500 text-white' :
                          i === currentStep - 1 ? 'bg-primary-500 text-white ring-4 ring-primary-100' : 'bg-gray-100 text-gray-400'
                        }`}>{i < currentStep ? '✓' : step.icon}</div>
                        <p className={`text-xs mt-2 ${i < currentStep ? 'text-primary-600 font-medium' : 'text-gray-400'}`}>{step.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="absolute top-5 left-[12.5%] right-[12.5%] h-0.5 bg-gray-100 -z-0">
                    <div className="h-full bg-primary-500 transition-all duration-500" style={{ width: `${Math.max(0, (currentStep - 1) / 3 * 100)}%` }} />
                  </div>
                </div>
              )}
              {order.status === 'cancelled' && (
                <div className="bg-red-50 text-red-600 text-sm rounded-lg p-4 text-center">该订单已取消，如有疑问请联系店家</div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4">取餐信息</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">取餐方式</span><span className="font-medium text-gray-800">{diningTypeMap[order.dining_type] || order.dining_type}</span></div>
                {order.customer_name && <div className="flex justify-between"><span className="text-gray-500">客人姓名</span><span className="font-medium text-gray-800">{order.customer_name}</span></div>}
                {order.customer_phone && <div className="flex justify-between"><span className="text-gray-500">联系电话</span><span className="font-medium text-gray-800">{formatPhone(order.customer_phone)}</span></div>}
                {order.dining_type === 'delivery' && order.customer_address && <div className="flex justify-between"><span className="text-gray-500">配送地址</span><span className="font-medium text-gray-800 text-right max-w-[60%]">{order.customer_address}</span></div>}
                {order.note && <div className="flex justify-between"><span className="text-gray-500">备注</span><span className="font-medium text-gray-800 text-right max-w-[60%]">{order.note}</span></div>}
                <div className="flex justify-between"><span className="text-gray-500">下单时间</span><span className="font-medium text-gray-800">{order.created_at ? new Date(order.created_at).toLocaleString('zh-CN') : '-'}</span></div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4">商品明细</h3>
              <div className="space-y-3">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-start pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{item.name || item.product_name || `商品${i + 1}`}</p>
                      <p className="text-xs text-gray-400">x{item.quantity}</p>
                      {item.note && <p className="text-xs text-primary-500 mt-1">📝 {item.note}</p>}
                    </div>
                    <span className="font-medium text-gray-800">${((item.price || 0) * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm">
                <div className="flex justify-between text-gray-500"><span>商品小计</span><span>${order.subtotal?.toFixed(2)}</span></div>
                <div className="flex justify-between text-gray-500"><span>税费</span><span>${order.tax?.toFixed(2)}</span></div>
                {order.delivery_fee > 0 && <div className="flex justify-between text-gray-500"><span>配送费</span><span>${order.delivery_fee?.toFixed(2)}</span></div>}
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-100"><span>合计</span><span className="text-primary-600">${order.total?.toFixed(2)}</span></div>
              </div>
            </div>

            <div className="bg-primary-50 rounded-2xl p-4 text-center">
              <p className="text-sm text-primary-700">
                {order.status === 'pending' && '⏳ 订单已提交，店家正在确认，请稍候...'}
                {order.status === 'preparing' && '👨‍🍳 正在为您精心制作，请耐心等待...'}
                {order.status === 'ready' && (order.dining_type === 'delivery' ? '🛵 骑手正在配送中，请注意接听电话' : '🍵 您的餐品已做好，请到柜台出示订单号取餐')}
                {order.status === 'completed' && '✅ 感谢您的惠顾，期待下次光临！'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
