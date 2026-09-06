import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { Button, Input, toast } from '../../components/ui'

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
  dine_in: '🍽️ 堂吃',
  dinein: '🍽️ 堂吃',
  takeout: '🥡 自取',
  pickup: '🥡 自取',
  delivery: '🛵 配送'
}

function normalizePhone(phone) {
  return phone.replace(/\D/g, '')
}

function formatPhone(phone) {
  const clean = normalizePhone(phone)
  if (clean.length === 10) {
    return `(${clean.slice(0,3)}) ${clean.slice(3,6)}-${clean.slice(6)}`
  }
  return phone
}

function isValidPhone(phone) {
  const clean = normalizePhone(phone)
  return clean.length === 10
}

export default function OrderStatus() {
  const [searchParams] = useSearchParams()
  const [searchType, setSearchType] = useState('order_no')
  const [searchValue, setSearchValue] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [orderList, setOrderList] = useState(null)
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [view, setView] = useState('search')

  useEffect(() => {
    const autoOrder = searchParams.get('order')
    if (autoOrder) {
      setSearchType('order_no')
      setSearchValue(autoOrder)
      handleSearch(autoOrder, 'order_no')
    }
  }, [])

  const handlePhoneChange = (e) => {
    const val = e.target.value
    setSearchValue(val)
    if (val && !isValidPhone(val)) {
      setPhoneError('请输入10位手机号码')
    } else {
      setPhoneError('')
    }
  }

  const handleSearch = async (value, type) => {
    const queryType = type || searchType
    const queryValue = value || searchValue

    if (!queryValue.trim()) {
      toast(queryType === 'order_no' ? '请输入订单号' : queryType === 'phone' ? '请输入手机号' : '请输入姓名', 'error')
      return
    }

    if (queryType === 'phone' && !isValidPhone(queryValue)) {
      setPhoneError('请输入10位手机号码')
      toast('手机号格式不正确', 'error')
      return
    }

    setLoading(true)
    setSearched(true)
    setOrder(null)
    setOrderList(null)

    try {
      if (queryType === 'order_no') {
        const data = await api.getOrderByNo(queryValue.trim().toUpperCase())
        setOrder(data)
        setView('detail')
      } else {
        const data = await api.searchOrders(queryType, queryValue.trim())
        setOrderList(data.orders || [])
        setView('list')
      }
    } catch (e) {
      toast(e.message, 'error')
      setView('search')
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetail = async (orderNo) => {
    setLoading(true)
    try {
      const data = await api.getOrderByNo(orderNo)
      setOrder(data)
      setView('detail')
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setOrder(null)
    setView(orderList ? 'list' : 'search')
  }

  const handleNewSearch = () => {
    setOrder(null)
    setOrderList(null)
    setSearchValue('')
    setPhoneError('')
    setSearched(false)
    setView('search')
  }

  const status = order ? statusMap[order.status] || statusMap.pending : null
  const currentStep = status?.step || 0

  const searchTypes = [
    { key: 'order_no', label: '订单号', placeholder: '如：OO20240101001', icon: '📋' },
    { key: 'phone', label: '手机号', placeholder: '如：(123) 456-7890', icon: '📱' },
    { key: 'name', label: '姓名', placeholder: '请输入下单时的姓名', icon: '👤' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl">🍵</span>
            <span className="font-bold text-primary-700">Only One</span>
          </Link>
          {view !== 'search' && (
            <button onClick={handleNewSearch} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              重新查询
            </button>
          )}
          {view === 'search' && (
            <Link to="/menu" className="text-sm text-primary-600 hover:text-primary-700 font-medium">继续点餐</Link>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {view === 'search' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <h1 className="text-xl font-bold text-gray-800 mb-1">查询订单</h1>
            <p className="text-sm text-gray-400 mb-6">选择查询方式，输入信息查看订单状态</p>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {searchTypes.map(t => (
                <button key={t.key} onClick={() => { setSearchType(t.key); setSearchValue(''); setPhoneError('') }}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    searchType === t.key ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <div className="text-xl mb-1">{t.icon}</div>
                  <div className={`text-sm font-medium ${searchType === t.key ? 'text-primary-700' : 'text-gray-600'}`}>{t.label}</div>
                </button>
              ))}
            </div>

            <div className="mb-4">
              <Input
                value={searchValue}
                onChange={searchType === 'phone' ? handlePhoneChange : e => setSearchValue(e.target.value)}
                placeholder={searchTypes.find(t => t.key === searchType)?.placeholder}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
              {searchType === 'phone' && phoneError && (
                <p className="text-xs text-red-500 mt-1">{phoneError}</p>
              )}
              {searchType === 'phone' && !phoneError && (
                <p className="text-xs text-gray-400 mt-1">请输入10位美国手机号码，用于查询您的订单</p>
              )}
            </div>

            <Button className="w-full" onClick={() => handleSearch()} disabled={loading || (searchType === 'phone' && !!phoneError)}>
              {loading ? '查询中...' : '查询订单'}
            </Button>
          </div>
        )}

        {view === 'list' && orderList && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-800 mb-1">
                查询结果
                <span className="text-sm font-normal text-gray-400 ml-2">共 {orderList.length} 个订单</span>
              </h2>
              <p className="text-sm text-gray-400">点击订单查看详情</p>
            </div>

            {orderList.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">未找到订单</h3>
                <p className="text-sm text-gray-400">请检查输入信息是否正确，或联系店家确认</p>
              </div>
            ) : (
              orderList.map(o => {
                const s = statusMap[o.status] || statusMap.pending
                return (
                  <div key={o.id} onClick={() => handleViewDetail(o.order_no)}
                    className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-primary-200">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">订单号</p>
                        <p className="font-bold text-gray-800">{o.order_no}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-white text-xs font-medium ${s.color}`}>{s.label}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3 text-gray-500">
                        <span>{diningTypeMap[o.dining_type] || o.dining_type}</span>
                        <span>👤 {o.customer_name || '-'}</span>
                      </div>
                      <span className="font-bold text-primary-600">${o.total?.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {o.created_at ? new Date(o.created_at).toLocaleString('zh-CN') : '-'}
                    </p>
                  </div>
                )
              })
            )}
          </div>
        )}

        {view === 'detail' && order && status && (
          <div className="space-y-4">
            {view === 'detail' && orderList && orderList.length > 1 && (
              <button onClick={handleBack} className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                ← 返回订单列表
              </button>
            )}

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs text-gray-400 mb-1">订单号</p>
                  <p className="text-lg font-bold text-gray-800">{order.order_no}</p>
                </div>
                <div className={`px-4 py-2 rounded-full text-white text-sm font-medium ${status.color}`}>
                  {status.label}
                </div>
              </div>

              {order.status !== 'cancelled' && (
                <div className="relative">
                  <div className="flex justify-between">
                    {steps.map((step, i) => (
                      <div key={step.key} className="flex flex-col items-center relative z-10">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${
                          i < currentStep ? 'bg-primary-500 text-white' :
                          i === currentStep - 1 ? 'bg-primary-500 text-white ring-4 ring-primary-100' :
                          'bg-gray-100 text-gray-400'
                        }`}>
                          {i < currentStep ? '✓' : step.icon}
                        </div>
                        <p className={`text-xs mt-2 ${i < currentStep ? 'text-primary-600 font-medium' : 'text-gray-400'}`}>
                          {step.label}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="absolute top-5 left-[12.5%] right-[12.5%] h-0.5 bg-gray-100 -z-0">
                    <div className="h-full bg-primary-500 transition-all duration-500"
                      style={{ width: `${Math.max(0, (currentStep - 1) / 3 * 100)}%` }} />
                  </div>
                </div>
              )}

              {order.status === 'cancelled' && (
                <div className="bg-red-50 text-red-600 text-sm rounded-lg p-4 text-center">
                  该订单已取消，如有疑问请联系店家
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4">取餐信息</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">取餐方式</span>
                  <span className="font-medium text-gray-800">{diningTypeMap[order.dining_type] || order.dining_type}</span>
                </div>
                {order.customer_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">客人姓名</span>
                    <span className="font-medium text-gray-800">{order.customer_name}</span>
                  </div>
                )}
                {order.customer_phone && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">联系电话</span>
                    <span className="font-medium text-gray-800">{formatPhone(order.customer_phone)}</span>
                  </div>
                )}
                {order.dining_type === 'delivery' && order.customer_address && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">配送地址</span>
                    <span className="font-medium text-gray-800 text-right max-w-[60%]">{order.customer_address}</span>
                  </div>
                )}
                {order.note && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">备注</span>
                    <span className="font-medium text-gray-800 text-right max-w-[60%]">{order.note}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">下单时间</span>
                  <span className="font-medium text-gray-800">{order.created_at ? new Date(order.created_at).toLocaleString('zh-CN') : '-'}</span>
                </div>
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
                <div className="flex justify-between text-gray-500">
                  <span>商品小计</span><span>${order.subtotal?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>税费 (8.875%)</span><span>${order.tax?.toFixed(2)}</span>
                </div>
                {order.delivery_fee > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>配送费</span><span>${order.delivery_fee?.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-100">
                  <span>合计</span><span className="text-primary-600">${order.total?.toFixed(2)}</span>
                </div>
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

        {view === 'search' && !loading && !searched && (
          <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">查询您的订单</h3>
            <p className="text-sm text-gray-400 mb-6">在上方选择查询方式，输入信息即可查看订单状态</p>
            <div className="flex gap-3 justify-center">
              <Link to="/"><Button variant="outline">返回首页</Button></Link>
              <Link to="/menu"><Button>去点餐</Button></Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
