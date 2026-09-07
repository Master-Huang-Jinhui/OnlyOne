import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { Dialog, Button, toast } from '../../components/ui'

const diningOptions = [
  { value: 'dinein', label: '堂吃', icon: '🍽️' },
  { value: 'takeout', label: '带走', icon: '🥡' },
  { value: 'delivery', label: '配送', icon: '🛵' }
]

export default function EmployeeOrder() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [activeCat, setActiveCat] = useState(0)
  const [cart, setCart] = useState([])
  const [diningType, setDiningType] = useState('dinein')
  const [success, setSuccess] = useState(null)
  const [taxRate, setTaxRate] = useState(0.08875)

  useEffect(() => {
    api.getCategories().then(data => setCategories(Array.isArray(data) ? data : [])).catch(() => {})
    api.getProducts().then(data => setProducts(Array.isArray(data) ? data : [])).catch(() => {})
    api.getSettings().then(s => setTaxRate(parseFloat(s?.tax_rate || 0.08875))).catch(() => {})
  }, [])

  const filteredProducts = useMemo(() => activeCat === 0 ? products : products.filter(p => p.category_id === activeCat), [activeCat, products])

  const catCounts = useMemo(() => {
    const map = { 0: products.length }
    categories.forEach(c => { map[c.id] = products.filter(p => p.category_id === c.id).length })
    return map
  }, [categories, products])

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { ...product, quantity: 1, note: '' }]
    })
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
    if (cart.length === 0) { toast('购物车为空', 'error'); return }
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
    } catch (err) {
      toast(err.message, 'error')
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
            <h1 className="text-base font-bold text-gray-800">Only One 员工点餐</h1>
            <p className="text-xs text-gray-400">{user?.name || user?.username}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {diningOptions.map(opt => (
            <button key={opt.value} onClick={() => setDiningType(opt.value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
                diningType === opt.value ? 'bg-primary-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              <span>{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
          <div className="w-px h-6 bg-gray-200 mx-1"></div>
          <button onClick={logout} className="text-sm text-gray-500 hover:text-red-500 px-3 py-2 rounded-lg hover:bg-gray-100 transition">退出</button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-40 bg-white border-r flex flex-col flex-shrink-0 overflow-y-auto">
          <button
            onClick={() => setActiveCat(0)}
            className={`flex items-center justify-between px-4 py-3.5 text-left border-b transition ${
              activeCat === 0 ? 'bg-primary-50 text-primary-700 border-l-4 border-l-primary-600 font-semibold' : 'text-gray-600 hover:bg-gray-50 border-l-4 border-l-transparent'
            }`}
          >
            <span className="text-sm">全部商品</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${activeCat === 0 ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{catCounts[0] || 0}</span>
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat.id)}
              className={`flex items-center justify-between px-4 py-3.5 text-left border-b transition ${
                activeCat === cat.id ? 'bg-primary-50 text-primary-700 border-l-4 border-l-primary-600 font-semibold' : 'text-gray-600 hover:bg-gray-50 border-l-4 border-l-transparent'
              }`}
            >
              <span className="text-sm">{cat.name}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${activeCat === cat.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{catCounts[cat.id] || 0}</span>
            </button>
          ))}
        </aside>

        <main className="flex-1 overflow-y-auto p-4">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <span className="text-5xl mb-3">🍽️</span>
              <p>该分类下暂无商品</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
              {filteredProducts.map(product => {
                const inCart = cart.find(i => i.id === product.id)
                return (
                  <div
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition cursor-pointer active:scale-95 relative group"
                  >
                    {inCart && (
                      <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-primary-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow z-10">
                        {inCart.quantity}
                      </div>
                    )}
                    <div className="aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center text-4xl overflow-hidden">
                      {product.image ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" /> : '🍽️'}
                    </div>
                    <h3 className="font-medium text-gray-800 text-sm truncate">{product.name}</h3>
                    {product.description && <p className="text-xs text-gray-400 truncate mt-0.5">{product.description}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-primary-600 font-bold">${parseFloat(product.price).toFixed(2)}</span>
                      <div className="w-7 h-7 bg-primary-600 text-white rounded-full flex items-center justify-center text-lg group-hover:bg-primary-700 transition">+</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>

        <aside className="w-80 bg-white border-l flex flex-col flex-shrink-0">
          <div className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0">
            <h2 className="font-bold text-gray-800">购物车</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{totalItems} 件</span>
              {cart.length > 0 && <button onClick={clearCart} className="text-xs text-red-400 hover:text-red-600">清空</button>}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-300">
                <span className="text-4xl mb-2">🛒</span>
                <p className="text-sm">购物车为空</p>
                <p className="text-xs mt-1">点击左侧商品添加</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map(item => (
                  <div key={item.id} className="bg-gray-50 rounded-lg p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-800 truncate">{item.name}</p>
                        <p className="text-xs text-primary-600 mt-0.5">${parseFloat(item.price).toFixed(2)}</p>
                      </div>
                      <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500 text-sm flex-shrink-0">✕</button>
                    </div>
                    <input
                      type="text"
                      placeholder="备注（可选）"
                      value={item.note}
                      onChange={e => updateNote(item.id, e.target.value)}
                      className="mt-2 w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-primary-400 bg-white"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-sm hover:bg-gray-300">-</button>
                        <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm hover:bg-primary-700">+</button>
                      </div>
                      <span className="text-sm font-bold text-gray-800">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t p-4 flex-shrink-0 bg-gray-50">
            <div className="space-y-1.5 mb-3">
              <div className="flex justify-between text-sm text-gray-500"><span>小计</span><span>${subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm text-gray-500"><span>税费</span><span>${tax.toFixed(2)}</span></div>
              {deliveryFee > 0 && <div className="flex justify-between text-sm text-gray-500"><span>配送费</span><span>${deliveryFee.toFixed(2)}</span></div>}
              <div className="flex justify-between font-bold text-base pt-2 border-t"><span>合计</span><span className="text-primary-600">${total.toFixed(2)}</span></div>
            </div>
            <Button
              onClick={submitOrder}
              disabled={cart.length === 0}
              className={`w-full py-3 text-base font-bold ${cart.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              确认下单
            </Button>
          </div>
        </aside>
      </div>

      <Dialog open={!!success} onClose={() => setSuccess(null)} title="下单成功" width="max-w-sm">
        {success && (
          <div className="text-center py-6">
            <div className="text-5xl mb-4">✅</div>
            <p className="text-lg font-bold text-gray-800 mb-2">订单已创建</p>
            <p className="text-sm text-gray-500 mb-2">订单号</p>
            <p className="text-xl font-mono font-bold text-primary-600 mb-4">{success.order_no}</p>
            <p className="text-2xl font-bold text-gray-800 mb-6">${parseFloat(success.total).toFixed(2)}</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setSuccess(null); navigate('/employee') }}>返回首页</Button>
              <Button className="flex-1" onClick={() => setSuccess(null)}>继续点餐</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
