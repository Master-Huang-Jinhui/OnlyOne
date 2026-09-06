import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { api } from '../../lib/api'
import { Button, Input, Textarea, Select, Empty, toast } from '../../components/ui'

export default function Checkout() {
  const navigate = useNavigate()
  const { items, subtotal, clear, addToHistory, getTagInfo, getItemUnitPrice } = useCart()
  const [settings, setSettings] = useState({})
  const [business, setBusiness] = useState({ open: true })
  const [diningType, setDiningType] = useState('takeout')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [orderResult, setOrderResult] = useState(null)

  useEffect(() => {
    api.getSettings().then(setSettings).catch(() => {})
    api.getTodayBusiness().then(setBusiness).catch(() => {})
  }, [])

  const taxRate = parseFloat(settings.tax_rate || '0.08875')
  const tax = Math.round(subtotal * taxRate * 100) / 100
  const freeDeliveryMin = parseFloat(settings.free_delivery_min || '30')
  const deliveryFee = diningType === 'delivery' ? (subtotal >= freeDeliveryMin ? 0 : parseFloat(settings.delivery_fee || '3.99')) : 0
  const total = Math.round((subtotal + tax + deliveryFee) * 100) / 100

  const handleSubmit = async () => {
    if (!business.open) { toast('今日门店休息，无法下单', 'error'); return }
    if (!customerName || !customerPhone) { toast('请填写姓名和电话', 'error'); return }
    if (diningType === 'delivery' && !customerAddress) { toast('请填写配送地址', 'error'); return }
    setSubmitting(true)
    try {
      const result = await api.createOrder({
        items: items.map(i => ({ id: i.id, quantity: i.quantity, price: getItemUnitPrice(i), note: (i.notes || []).join(', ') })),
        dining_type: diningType, customer_name: customerName, customer_phone: customerPhone,
        customer_address: diningType === 'delivery' ? customerAddress : '', note
      })
      setOrderResult(result)
      addToHistory()
      clear()
      toast('下单成功！')
    } catch (e) { toast(e.message, 'error') } finally { setSubmitting(false) }
  }

  if (orderResult) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-lg max-w-md w-full mx-4 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">下单成功</h2>
          <p className="text-gray-500 mb-6">订单号：{orderResult.order_no}</p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
            <div className="flex justify-between text-sm text-gray-600 mb-1"><span>商品小计</span><span>${orderResult.subtotal?.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm text-gray-600 mb-1"><span>税费</span><span>${orderResult.tax?.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm text-gray-600 mb-1"><span>配送费</span><span>${orderResult.delivery_fee?.toFixed(2)}</span></div>
            <div className="border-t pt-2 mt-2 flex justify-between font-bold"><span>合计</span><span className="text-primary-600">${orderResult.total?.toFixed(2)}</span></div>
          </div>
          <p className="text-sm text-gray-400 mb-6">请到店出示订单号取餐 / 等待配送</p>
          <div className="flex gap-3">
            <Link to="/" className="flex-1"><Button variant="outline" className="w-full">返回首页</Button></Link>
            <Link to="/menu" className="flex-1"><Button className="w-full">继续点餐</Button></Link>
          </div>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Empty text="购物车是空的" icon="🛒" />
        <Link to="/menu"><Button className="mt-4">去点餐</Button></Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center">
          <Link to="/menu" className="text-gray-600 hover:text-primary-600 text-sm">← 返回菜单</Link>
          <h1 className="text-lg font-bold text-gray-800 ml-4">结算</h1>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {!business.open && (<div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6"><p className="text-red-600 font-medium">⚠️ 今日门店休息，暂不接受下单</p></div>)}

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">取餐方式</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'dinein', label: '堂吃', icon: '🍽️', desc: '店内用餐' },
              { value: 'takeout', label: '自取', icon: '🥡', desc: '到店取餐' },
              { value: 'delivery', label: '配送', icon: '🛵', desc: '送货上门' }
            ].map(opt => (
              <button key={opt.value} onClick={() => setDiningType(opt.value)}
                className={`p-4 rounded-xl border-2 text-center transition-all ${diningType === opt.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="text-2xl mb-1">{opt.icon}</div>
                <div className="font-medium text-sm text-gray-800">{opt.label}</div>
                <div className="text-xs text-gray-400">{opt.desc}</div>
              </button>
            ))}
          </div>
          {diningType === 'delivery' && (<p className="text-xs text-gray-400 mt-3">配送范围 {settings.delivery_range_miles || 3} 英里内，满 ${freeDeliveryMin} 免配送费，否则配送费 ${settings.delivery_fee || '3.99'}</p>)}
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">联系信息</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="姓名 *" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="您的姓名" />
              <Input label="电话 *" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="联系电话" />
            </div>
            {diningType === 'delivery' && (<Input label="配送地址 *" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} placeholder="详细配送地址" />)}
            <Textarea label="订单备注" value={note} onChange={e => setNote(e.target.value)} placeholder="特殊要求，如少辣、不要葱等" rows={3} />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">订单明细</h3>
          <div className="space-y-3 mb-4">
            {items.map((item, i) => {
              const tagsExtra = (item.notes || []).reduce((sum, t) => sum + (getTagInfo(t).extra_price || 0), 0)
              return (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-700">
                    {item.name} × {item.quantity}
                    {item.notes && item.notes.length > 0 && (
                      <span className="flex flex-wrap gap-1 mt-1">
                        {item.notes.map((t, j) => (<span key={j} className="inline-block bg-primary-50 text-primary-700 rounded-full px-1.5 py-0.5 text-[10px]">{t}</span>))}
                      </span>
                    )}
                  </span>
                  <span className="text-gray-600">${((item.price + tagsExtra) * item.quantity).toFixed(2)}</span>
                </div>
              )
            })}
          </div>
          <div className="border-t pt-3 space-y-2">
            <div className="flex justify-between text-sm text-gray-600"><span>商品小计</span><span>${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm text-gray-600"><span>税费 ({(taxRate * 100).toFixed(3)}%)</span><span>${tax.toFixed(2)}</span></div>
            {diningType === 'delivery' && (<div className="flex justify-between text-sm text-gray-600"><span>配送费 {deliveryFee === 0 && <span className="text-green-600">(已免)</span>}</span><span>${deliveryFee.toFixed(2)}</span></div>)}
            <div className="flex justify-between font-bold text-lg pt-2 border-t"><span>合计</span><span className="text-primary-600">${total.toFixed(2)}</span></div>
          </div>
        </div>

        <div className="flex gap-4">
          <Link to="/menu"><Button variant="outline">返回菜单</Button></Link>
          <Button className="flex-1" onClick={handleSubmit} disabled={submitting || !business.open}>{submitting ? '提交中...' : '提交订单'}</Button>
        </div>
      </div>
    </div>
  )
}
