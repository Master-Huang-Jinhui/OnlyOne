import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useLanguage } from '../../context/LanguageContext'
import { Button, Input, Empty, toast } from '../../components/ui'

export default function Checkout() {
  const navigate = useNavigate()
  const { t, language } = useLanguage()
  const { items, subtotal, totalCount, clear } = useCart()
  const [orderType, setOrderType] = useState('pickup')
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const deliveryFee = orderType === 'delivery' ? 3.00 : 0
  const tax = subtotal * 0.08875
  const total = subtotal + deliveryFee + tax

  const handleSubmit = async () => {
    if (!customerName.trim()) { toast(t('checkout.nameRequired', '请输入姓名'), 'error'); return }
    if (!phone.trim()) { toast(t('checkout.phoneRequired', '请输入电话'), 'error'); return }
    if (orderType === 'delivery' && !address.trim()) { toast(t('checkout.addressRequired', '配送需要填写地址'), 'error'); return }

    setSubmitting(true)
    try {
      const { api } = await import('../../lib/api')
      const res = await api.createOrder({
        order_type: orderType,
        customer_name: customerName,
        phone,
        address: orderType === 'delivery' ? address : '',
        notes,
        items: items.map(i => ({
          product_id: i.id,
          name: i.name,
          name_en: i.name_en || '',
          price: i.price,
          quantity: i.quantity,
          note: i.note || ''
        }))
      })
      clear()
      toast(t('checkout.orderSuccess', '下单成功！'), 'success')
      navigate(`/order-status?order_id=${res.order_id || res.id}`)
    } catch (e) {
      toast(e.message || t('checkout.orderFailed', '下单失败，请重试'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 flex flex-col items-center justify-center">
        <Empty text={t('checkout.emptyCart', '购物车是空的')} icon="🛒" />
        <Button className="mt-4" onClick={() => navigate('/menu')}>{t('checkout.goMenu', '去点餐')}</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('checkout.title', '结算')}</h1>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">{t('checkout.orderType', '取餐方式')}</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setOrderType('pickup')}
              className={`p-4 rounded-xl border-2 text-center transition-all ${orderType === 'pickup' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="text-2xl mb-1">🏪</div>
              <p className="font-medium text-gray-800">{t('checkout.pickup', '自取')}</p>
              <p className="text-xs text-gray-400 mt-1">{t('checkout.pickupDesc', '到店取餐，免配送费')}</p>
            </button>
            <button
              onClick={() => setOrderType('delivery')}
              className={`p-4 rounded-xl border-2 text-center transition-all ${orderType === 'delivery' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="text-2xl mb-1">🛵</div>
              <p className="font-medium text-gray-800">{t('checkout.delivery', '配送')}</p>
              <p className="text-xs text-gray-400 mt-1">{t('checkout.deliveryDesc', '配送费 $3.00')}</p>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">{t('checkout.customerInfo', '顾客信息')}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">{t('checkout.name', '姓名')} *</label>
              <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder={t('checkout.namePlaceholder', '请输入姓名')} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">{t('checkout.phone', '电话')} *</label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder={t('checkout.phonePlaceholder', '请输入电话')} />
            </div>
            {orderType === 'delivery' && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t('checkout.address', '地址')} *</label>
                <Input value={address} onChange={e => setAddress(e.target.value)} placeholder={t('checkout.addressPlaceholder', '请输入配送地址')} />
              </div>
            )}
            <div>
              <label className="block text-sm text-gray-600 mb-1">{t('checkout.notes', '备注')}</label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('checkout.notesPlaceholder', '如有特殊要求请填写')} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">{t('checkout.orderDetail', '订单明细')} ({totalCount})</h2>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.cartId} className="flex justify-between items-center text-sm">
                <div className="flex-1">
                  <span className="text-gray-800">{language === 'en' ? (item.name_en || item.name) : item.name}</span>
                  <span className="text-gray-400 ml-2">×{item.quantity}</span>
                  {item.note && <p className="text-xs text-yellow-600 mt-0.5">📝 {item.note}</p>}
                </div>
                <span className="font-medium text-gray-700">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t mt-4 pt-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>{t('checkout.subtotal', '商品小计')}</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {orderType === 'delivery' && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>{t('checkout.deliveryFee', '配送费')}</span>
                <span>${deliveryFee.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-600">
              <span>{t('checkout.tax', '税费 (8.875%)')}</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>{t('checkout.total', '合计')}</span>
              <span className="text-primary-600">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <Button variant="outline" onClick={() => navigate('/cart')}>{t('checkout.back', '返回购物车')}</Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
            {submitting ? t('checkout.submitting', '提交中...') : t('checkout.confirmOrder', '确认下单')}
          </Button>
        </div>
      </div>
    </div>
  )
}