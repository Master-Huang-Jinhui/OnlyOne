import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { Dialog, Button, Input, toast } from '../../components/ui'

export default function EmployeeOrder() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const orderType = searchParams.get('type') || 'takeout' // dinein / takeout
  const tableId = searchParams.get('tableId')
  const tableNo = searchParams.get('tableNo') || ''

  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [activeCat, setActiveCat] = useState(0)
  const [cart, setCart] = useState([])
  const [success, setSuccess] = useState(null)
  const [taxRate, setTaxRate] = useState(0.08875)
  const [pwdDialog, setPwdDialog] = useState(false)
  const [pwdForm, setPwdForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  // 口味相关
  const [flavorTags, setFlavorTags] = useState([])
  const [flavorGrouped, setFlavorGrouped] = useState({})
  const [tagsDialog, setTagsDialog] = useState(null)
  const [selectedTags, setSelectedTags] = useState([])
  const [customNote, setCustomNote] = useState('')
  const [editCartItemId, setEditCartItemId] = useState(null)
  // 打包顾客信息
  const [orderInfoDialog, setOrderInfoDialog] = useState(false)
  const [orderInfo, setOrderInfo] = useState({ name: '', phone: '' })
  // 结账
  const [checkoutDialog, setCheckoutDialog] = useState(false)
  const [checkoutData, setCheckoutData] = useState({ orders: [], total: 0, count: 0 })

  useEffect(() => {
    api.getCategories().then(data => setCategories(Array.isArray(data) ? data : [])).catch(() => {})
    api.getProducts().then(data => setProducts(Array.isArray(data) ? data : [])).catch(() => {})
    api.getSettings().then(s => setTaxRate(parseFloat(s?.tax_rate || 0.08875))).catch(() => {})
    api.getFlavorTags().then(data => {
      setFlavorTags(data.tags || [])
      setFlavorGrouped(data.grouped || {})
    }).catch(() => {})
  }, [])

  const filteredProducts = useMemo(() => activeCat === 0 ? products : products.filter(p => p.category_id === activeCat), [activeCat, products])

  const catCounts = useMemo(() => {
    const map = { 0: products.length }
    categories.forEach(c => { map[c.id] = products.filter(p => p.category_id === c.id).length })
    return map
  }, [categories, products])

  // 口味工具函数
  const getTagInfo = (tagName) => flavorTags.find(t => t.name === tagName) || { name: tagName, extra_price: 0, category: '自定义' }
  const calcTagsExtraPrice = (tags = []) => tags.reduce((sum, t) => sum + (getTagInfo(t).extra_price || 0), 0)
  const defaultTags = flavorTags.filter(t => t.is_default).map(t => t.name)
  const getItemUnitPrice = (item) => parseFloat(item.price) + calcTagsExtraPrice(item.notes || [])

  // 点击商品：直接用默认口味添加
  const handleProductClick = (product) => {
    addToCart(product, [...defaultTags])
  }

  const addToCart = (product, notes) => {
    const itemNotes = notes && notes.length > 0 ? notes : [...defaultTags]
    setCart(prev => {
      const existing = prev.find(i => {
        if (i.id !== product.id) return false
        return [...(i.notes || [])].sort().join(',') === [...itemNotes].sort().join(',')
      })
      if (existing) {
        return prev.map(i => i.cartItemId === existing.cartItemId ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, {
        cartItemId: Date.now() + Math.random(),
        id: product.id, name: product.name, price: product.price,
        image: product.image, quantity: 1, notes: itemNotes
      }]
    })
  }

  const confirmTags = () => {
    const finalTags = customNote.trim() ? [...selectedTags, customNote.trim()] : selectedTags
    if (editCartItemId) {
      updateNotes(editCartItemId, finalTags)
      setEditCartItemId(null)
    } else if (tagsDialog) {
      addToCart(tagsDialog, finalTags)
    }
    setTagsDialog(null)
    setSelectedTags([])
    setCustomNote('')
  }

  const openEditTags = (item) => {
    setTagsDialog({ id: item.id, name: item.name, price: item.price })
    setSelectedTags([...(item.notes || [])])
    setCustomNote('')
    setEditCartItemId(item.cartItemId)
  }

  const updateQty = (cartItemId, delta) => {
    setCart(prev => prev.map(i => {
      if (i.cartItemId === cartItemId) {
        const qty = Math.max(0, i.quantity + delta)
        return qty === 0 ? null : { ...i, quantity: qty }
      }
      return i
    }).filter(Boolean))
  }

  const updateNotes = (cartItemId, notes) => {
    setCart(prev => {
      const item = prev.find(i => i.cartItemId === cartItemId)
      if (!item) return prev
      const existingSame = prev.find(i => {
        if (i.id !== item.id || i.cartItemId === cartItemId) return false
        return [...(i.notes || [])].sort().join(',') === [...notes].sort().join(',')
      })
      if (existingSame) {
        return prev.filter(i => i.cartItemId !== cartItemId)
          .map(i => i.cartItemId === existingSame.cartItemId ? { ...i, quantity: i.quantity + item.quantity } : i)
      }
      return prev.map(i => i.cartItemId === cartItemId ? { ...i, notes } : i)
    })
  }

  const removeItem = (cartItemId) => setCart(prev => prev.filter(i => i.cartItemId !== cartItemId))
  const clearCart = () => setCart([])

  const subtotal = cart.reduce((sum, i) => sum + getItemUnitPrice(i) * i.quantity, 0)
  const tax = Math.round(subtotal * taxRate * 100) / 100
  const total = Math.round((subtotal + tax) * 100) / 100
  const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0)

  const doSubmitOrder = async (customerName = '', customerPhone = '') => {
    try {
      const res = await api.createOrder({
        items: cart.map(i => ({
          id: i.id, quantity: i.quantity, price: getItemUnitPrice(i),
          note: (i.notes || []).join(', ')
        })),
        dining_type: orderType === 'dinein' ? 'dine_in' : 'takeout',
        customer_name: customerName || (orderType === 'dinein' ? `堂吃-${tableNo}` : ''),
        customer_phone: customerPhone,
        table_id: tableId ? parseInt(tableId) : null,
        note: `员工: ${user?.username || ''}`
      })
      setSuccess(res)
      setCart([])
      setOrderInfo({ name: '', phone: '' })
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const submitOrder = () => {
    if (cart.length === 0) { toast('购物车为空', 'error'); return }
    if (orderType === 'dinein') {
      doSubmitOrder()
    } else {
      // 打包需要顾客姓名和手机号
      setOrderInfoDialog(true)
    }
  }

  const confirmOrderInfo = () => {
    if (!orderInfo.name.trim()) { toast('请填写顾客姓名', 'error'); return }
    if (!orderInfo.phone.trim()) { toast('请填写手机号码', 'error'); return }
    setOrderInfoDialog(false)
    doSubmitOrder(orderInfo.name.trim(), orderInfo.phone.trim())
  }

  const handleCheckout = async () => {
    if (!tableId) { toast('无法获取桌子信息', 'error'); return }
    try {
      const data = await api.getTableOrders(tableId)
      setCheckoutData(data)
      setCheckoutDialog(true)
    } catch (e) { toast(e.message, 'error') }
  }

  const confirmCheckout = async () => {
    if (!tableId) return
    try {
      await api.clearTable(tableId)
      toast('结账成功，桌子已清空')
      setCheckoutDialog(false)
      navigate('/employee')
    } catch (e) { toast(e.message, 'error') }
  }

  const handleChangePassword = async () => {
    if (!pwdForm.oldPassword || !pwdForm.newPassword) { toast('请填写完整', 'error'); return }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) { toast('两次密码不一致', 'error'); return }
    try {
      await api.changePassword(pwdForm.oldPassword, pwdForm.newPassword)
      toast('密码修改成功')
      setPwdDialog(false)
      setPwdForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
    } catch (e) { toast(e.message, 'error') }
  }

  const singleChoiceCategories = ['辣度', '冰度', '甜度']

  const toggleTag = (tagName, category) => {
    setSelectedTags(prev => {
      if (singleChoiceCategories.includes(category)) {
        const sameCategoryTags = flavorTags.filter(t => t.category === category).map(t => t.name)
        const filtered = prev.filter(t => !sameCategoryTags.includes(t))
        if (filtered.includes(tagName)) return filtered
        return [...filtered, tagName]
      }
      return prev.includes(tagName) ? prev.filter(t => t !== tagName) : [...prev, tagName]
    })
  }

  const modeLabel = orderType === 'dinein' ? `堂吃 · ${tableNo}桌` : '打包取餐'
  const modeColor = orderType === 'dinein' ? 'bg-primary-100 text-primary-700' : 'bg-amber-100 text-amber-700'

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
          {/* 当前点餐模式标签 */}
          <span className={`ml-2 px-3 py-1 rounded-full text-xs font-bold ${modeColor}`}>
            {modeLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPwdDialog(true)} className="text-sm text-gray-500 hover:text-primary-600 px-3 py-2 rounded-lg hover:bg-gray-100 transition">修改密码</button>
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
                const inCartQty = cart.reduce((sum, i) => i.id === product.id ? sum + i.quantity : sum, 0)
                return (
                  <div
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className="bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition cursor-pointer active:scale-95 relative group"
                  >
                    {inCartQty > 0 && (
                      <div className="absolute -top-2 -right-2 min-w-[24px] h-6 bg-primary-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow z-10 px-1.5">
                        {inCartQty}
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
                  <div key={item.cartItemId} className="bg-gray-50 rounded-lg p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-800 truncate">{item.name}</p>
                        <p className="text-xs text-primary-600 mt-0.5">${getItemUnitPrice(item).toFixed(2)}</p>
                      </div>
                      <button onClick={() => removeItem(item.cartItemId)} className="text-gray-300 hover:text-red-500 text-sm flex-shrink-0">✕</button>
                    </div>
                    {/* 口味标签 */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(item.notes || []).length > 0 ? (
                        item.notes.map(tagName => {
                          const info = getTagInfo(tagName)
                          return (
                            <button
                              key={tagName}
                              onClick={() => openEditTags(item)}
                              className={`px-2 py-0.5 text-xs rounded-full ${
                                info.extra_price > 0 ? 'bg-orange-100 text-orange-700' : 'bg-primary-100 text-primary-700'
                              } hover:opacity-80 transition`}
                            >
                              {tagName}{info.extra_price > 0 && ` +$${info.extra_price.toFixed(2)}`}
                            </button>
                          )
                        })
                      ) : (
                        <button onClick={() => openEditTags(item)} className="px-2 py-0.5 text-xs rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300 transition">
                          + 选口味
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(item.cartItemId, -1)} className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-sm hover:bg-gray-300">-</button>
                        <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                        <button onClick={() => updateQty(item.cartItemId, 1)} className="w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm hover:bg-primary-700">+</button>
                      </div>
                      <span className="text-sm font-bold text-gray-800">${(getItemUnitPrice(item) * item.quantity).toFixed(2)}</span>
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
              <div className="flex justify-between font-bold text-base pt-2 border-t"><span>合计</span><span className="text-primary-600">${total.toFixed(2)}</span></div>
            </div>
            {orderType === 'dinein' ? (
              <div className="flex gap-2">
                <Button
                  onClick={submitOrder}
                  disabled={cart.length === 0}
                  className={`flex-1 py-3 text-base font-bold ${cart.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  下单
                </Button>
                <Button
                  onClick={handleCheckout}
                  variant="outline"
                  className="flex-1 py-3 text-base font-bold border-primary-300 text-primary-600 hover:bg-primary-50"
                >
                  结帐
                </Button>
              </div>
            ) : (
              <Button
                onClick={submitOrder}
                disabled={cart.length === 0}
                className={`w-full py-3 text-base font-bold ${cart.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                确认下单（打包）
              </Button>
            )}
          </div>
        </aside>
      </div>

      {/* 口味选择对话框 */}
      <Dialog open={!!tagsDialog} onClose={() => { setTagsDialog(null); setSelectedTags([]); setEditCartItemId(null) }} title={editCartItemId ? '修改口味' : '选择口味'} width="max-w-md">
        {tagsDialog && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-800">{tagsDialog.name}</p>
                <p className="text-sm text-primary-600">${parseFloat(tagsDialog.price).toFixed(2)}</p>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-3">
              {Object.entries(flavorGrouped).map(([category, tags]) => (
                <div key={category}>
                  <p className="text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                    {category}
                    {singleChoiceCategories.includes(category) && <span className="ml-2 normal-case font-normal">（单选）</span>}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map(tag => {
                      const selected = selectedTags.includes(tag.name)
                      return (
                        <button
                          key={tag.id}
                          onClick={() => toggleTag(tag.name, category)}
                          className={`px-3 py-1.5 rounded-lg text-sm transition border ${
                            selected
                              ? 'bg-primary-600 text-white border-primary-600 shadow'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
                          }`}
                        >
                          {tag.name}
                          {tag.extra_price > 0 && (
                            <span className={selected ? 'text-primary-100 ml-1' : 'text-gray-400 ml-1'}>+${tag.extra_price.toFixed(2)}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  {category === '其他' && (
                    <input
                      type="text"
                      value={customNote}
                      onChange={e => setCustomNote(e.target.value)}
                      placeholder="自定义备注（如：少放盐、打包等）"
                      className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  )}
                </div>
              ))}
              {Object.keys(flavorGrouped).length === 0 && (
                <p className="text-center text-gray-400 text-sm py-4">暂无口味选项</p>
              )}
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="text-sm">
                <span className="text-gray-500">已选 {selectedTags.length} 项</span>
                <span className="text-primary-600 ml-3">+${calcTagsExtraPrice(selectedTags).toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setTagsDialog(null); setSelectedTags([]); setEditCartItemId(null) }}>取消</Button>
                <Button onClick={confirmTags}>{editCartItemId ? '确认修改' : '加入购物车'}</Button>
              </div>
            </div>
          </div>
        )}
      </Dialog>

      {/* 打包顾客信息对话框 */}
      <Dialog open={orderInfoDialog} onClose={() => setOrderInfoDialog(false)} title="打包顾客信息" width="max-w-sm">
        <div className="space-y-4">
          <Input label="顾客姓名" value={orderInfo.name} onChange={e => setOrderInfo({ ...orderInfo, name: e.target.value })} placeholder="请输入姓名" />
          <Input label="手机号码" value={orderInfo.phone} onChange={e => setOrderInfo({ ...orderInfo, phone: e.target.value })} placeholder="请输入手机号（取餐叫号用）" />
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setOrderInfoDialog(false)}>取消</Button>
            <Button className="flex-1" onClick={confirmOrderInfo}>确认下单</Button>
          </div>
        </div>
      </Dialog>

      {/* 结账对话框 */}
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
          {checkoutData.orders.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-2">
              {checkoutData.orders.map(o => (
                <div key={o.id} className="flex justify-between items-center text-sm bg-white border border-gray-100 rounded-lg px-3 py-2">
                  <div>
                    <span className="font-mono text-primary-600">{o.order_no}</span>
                    <span className="text-xs text-gray-400 ml-2">{o.created_at}</span>
                  </div>
                  <span className="font-medium">${parseFloat(o.total).toFixed(2)}</span>
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

      {/* 下单成功 - 小票弹窗 */}
      <Dialog open={!!success} onClose={() => setSuccess(null)} title="下单成功" width="max-w-sm">
        {success && (
          <div className="py-4">
            {/* 取餐号 */}
            <div className="text-center mb-4">
              <p className="text-sm text-gray-400 mb-1">{orderType === 'dinein' ? '桌号' : '取餐号'}</p>
              <p className="text-5xl font-mono font-bold text-primary-600 tracking-wider">
                {orderType === 'dinein' ? tableNo : success.pickup_number}
              </p>
              {orderType === 'takeout' && <p className="text-xs text-gray-400 mt-2">请凭此号取餐</p>}
            </div>

            {/* 订单信息 */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
              <div className="flex justify-between text-gray-500 mb-1">
                <span>订单号</span>
                <span className="font-mono text-xs">{success.order_no}</span>
              </div>
              <div className="flex justify-between text-gray-500 mb-1">
                <span>类型</span>
                <span>{orderType === 'dinein' ? `堂吃 · ${tableNo}桌` : '打包取餐'}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t mt-2">
                <span>合计</span>
                <span className="text-primary-600">${parseFloat(success.total).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setSuccess(null); navigate('/employee') }}>返回首页</Button>
              <Button className="flex-1" onClick={() => setSuccess(null)}>继续点餐</Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* 修改密码对话框 */}
      <Dialog open={pwdDialog} onClose={() => setPwdDialog(false)} title="修改密码" width="max-w-sm">
        <div className="space-y-4">
          <Input label="当前密码" type="password" value={pwdForm.oldPassword} onChange={e => setPwdForm({ ...pwdForm, oldPassword: e.target.value })} />
          <Input label="新密码" type="password" value={pwdForm.newPassword} onChange={e => setPwdForm({ ...pwdForm, newPassword: e.target.value })} />
          <Input label="确认新密码" type="password" value={pwdForm.confirmPassword} onChange={e => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })} />
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setPwdDialog(false)}>取消</Button>
            <Button className="flex-1" onClick={handleChangePassword}>确认修改</Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
