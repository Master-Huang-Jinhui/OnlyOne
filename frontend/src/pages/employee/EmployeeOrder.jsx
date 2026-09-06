import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { Card, Button, Badge, Dialog, toast } from '../../components/ui'

const diningOptions = [
  { value: 'dinein', label: '堂吃', icon: '🍽️' },
  { value: 'takeout', label: '带走', icon: '🥡' },
  { value: 'delivery', label: '配送', icon: '🛵' }
]

export default function EmployeeOrder() {
  const { user, logout } = useAuth()
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [activeCat, setActiveCat] = useState(0)
  const [cart, setCart] = useState([])
  const [diningType, setDiningType] = useState('takeout')
  const [showCart, setShowCart] = useState(false)
  const [success, setSuccess] = useState(null)
  const [taxRate, setTaxRate] = useState(0.08875)

  useEffect(() => {
    api.getCategories().then(data => setCategories(Array.isArray(data) ? data : [])).catch(() => {})
    api.getAllProducts().then(data => setProducts(Array.isArray(data) ? data.filter(p => p.available) : [])).catch(() => {})
    api.getSettings().then(s => setTaxRate(parseFloat(s?.tax_rate || 0.08875))).catch(() => {})
  }, [])

  const filteredProducts = activeCat === 0 ? products : products.filter(p => p.category_id === activeCat)

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { ...product, quantity: 1, note: '' }]
    })
    toast(`已添加 ${product.name}`)
  }

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const qty = Math.max(0, i.quantity + delta)
        return qty === 0 ? null : { ...i, quantity: qty }
      }
      return i
    }).filter(Boolean))
  }

  const updateNote = (id, note) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, note } : i))
  }

  const removeItem = (id) => setCart(prev => prev.filter(i => i.id !== id))
  const clearCart = () => setCart([])

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const tax = Math.round(subtotal * taxRate * 100) / 100
  const deliveryFee = diningType === 'delivery' ? (subtotal >= 30 ? 0 : 3.99) : 0
  const total = Math.round((subtotal + tax + deliveryFee) * 100) / 100
  const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0)

  const submitOrder = async () => {
    if (cart.length === 0) {
      toast('购物车为空', 'error')
      return
    }
    try {
      const res = await api.createOrder({
        items: cart.map(i => ({ id: i.id, quantity: i.quantity, price: i.price, note: i.note })),
        dining_type: diningType,
        customer_name: user?.name || user?.username || '员工下单',
        customer_phone: '',
        note: `员工: ${user?.username || ''}`
      })
      setSuccess(res)
      setCart([])
      setShowCart(false)
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🍵</span>
            <div>
              <h1 className="text-lg font-bold text-gray-800">Only One 员工点餐</h1>
              <p className="text-xs text-gray-400">{user?.name || user?.username} · {diningOptions.find(d => d.value === diningType)?.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={logout} className="text-sm text-gray-500 hover:text-red-500">退出</button>
          </div>
        </div>

        {/* 取餐方式切换 */}
        <div className="max-w-6xl mx-auto px-4 pb-3 flex gap-2">
          {diningOptions.map(opt => (
            <button key={opt.value} onClick={() => setDiningType(opt.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                diningType === opt.value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              <span>{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 pb-24">
        {/* 分类标签 */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
          <button onClick={() => setActiveCat(0)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${activeCat === 0 ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            全部
          </button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setActiveCat(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${activeCat === cat.id ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
              {cat.name}
            </button>
          ))}
        </div>

        {/* 商品列表 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map(product => (
            <Card key={product.id} className="p-4 hover:shadow-md transition cursor-pointer" >
              <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center text-4xl">
                {product.image ? <img src={product.image} alt={product.name} className="w-full h-full object-cover rounded-lg" /> : '🍽️'}
              </div>
              <h3 className="font-medium text-gray-800 text-sm truncate">{product.name}</h3>
              <p className="text-xs text-gray-400 truncate mt-1">{product.description}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-primary-600 font-bold">${parseFloat(product.price).toFixed(2)}</span>
                <button onClick={() => addToCart(product)} className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center hover:bg-primary-700 text-lg">+</button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* 底部购物车栏 */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => setShowCart(true)} className="flex items-center gap-3">
              <div className="relative">
                <span className="text-2xl">🛒</span>
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{totalItems}</span>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-800">${total.toFixed(2)}</p>
                <p className="text-xs text-gray-400">查看购物车</p>
              </div>
            </button>
            <Button onClick={submitOrder} className="px-8">下单</Button>
          </div>
        </div>
      )}

      {/* 购物车抽屉 */}
      <Dialog open={showCart} onClose={() => setShowCart(false)} title="购物车" width="max-w-md">
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {cart.map(item => (
            <div key={item.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-sm text-gray-800">{item.name}</p>
                <p className="text-xs text-primary-600 mt-1">${parseFloat(item.price).toFixed(2)}</p>
                <input
                  type="text"
                  placeholder="备注（可选）"
                  value={item.note}
                  onChange={e => updateNote(item.id, e.target.value)}
                  className="mt-2 w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-primary-400"
                />
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-gray-600">-</button>
                  <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                  <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 bg-primary-600 text-white rounded-full flex items-center justify-center">+</button>
                </div>
                <button onClick={() => removeItem(item.id)} className="text-xs text-red-400 hover:text-red-600">删除</button>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t mt-4 pt-4 space-y-2">
          <div className="flex justify-between text-sm text-gray-600"><span>小计</span><span>${subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm text-gray-600"><span>税费</span><span>${tax.toFixed(2)}</span></div>
          {deliveryFee > 0 && <div className="flex justify-between text-sm text-gray-600"><span>配送费</span><span>${deliveryFee.toFixed(2)}</span></div>}
          <div className="flex justify-between font-bold text-lg pt-2 border-t"><span>合计</span><span className="text-primary-600">${total.toFixed(2)}</span></div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={clearCart} className="flex-1">清空</Button>
          <Button onClick={submitOrder} className="flex-1">确认下单</Button>
        </div>
      </Dialog>

      {/* 下单成功 */}
      <Dialog open={!!success} onClose={() => setSuccess(null)} title="下单成功" width="max-w-sm">
        {success && (
          <div className="text-center py-6">
            <div className="text-5xl mb-4">✅</div>
            <p className="text-lg font-bold text-gray-800 mb-2">订单已创建</p>
            <p className="text-sm text-gray-500 mb-4">订单号</p>
            <p className="text-xl font-mono font-bold text-primary-600 mb-4">{success.order_no}</p>
            <p className="text-2xl font-bold text-gray-800 mb-6">${parseFloat(success.total).toFixed(2)}</p>
            <Button onClick={() => setSuccess(null)} className="w-full">继续点餐</Button>
          </div>
        )}
      </Dialog>
    </div>
  )
}
