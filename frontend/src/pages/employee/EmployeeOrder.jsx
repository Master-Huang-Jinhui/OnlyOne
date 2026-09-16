import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { Dialog, Button, Input, toast } from '../../components/ui'
import { formatDateTime, formatTime, formatDate, formatClockTime, formatRelative, formatDateTimeCN } from '../../utils/format'

export default function EmployeeOrder() {
  // 员工点餐页：左侧商品分类+商品网格，右侧购物车（待下单/已下单分组），底部下单/结账
  const { user, logout } = useAuth()
  const { t } = useLanguage()
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
  const [flavorCache, setFlavorCache] = useState({})
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
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [checkingOut, setCheckingOut] = useState(false)
  // 当前活跃订单（堂吃加单用）
  const [currentOrderId, setCurrentOrderId] = useState(null)
  const [currentOrderNo, setCurrentOrderNo] = useState('')

  useEffect(() => {
    api.getCategories().then(data => setCategories(Array.isArray(data) ? data : [])).catch(() => {})
    api.getProducts().then(data => setProducts(Array.isArray(data) ? data : [])).catch(() => {})
    api.getSettings().then(s => setTaxRate(parseFloat(s?.tax_rate || 0.08875))).catch(() => {})
    // 堂吃模式：加载该桌子所有未取消订单的商品
    if (orderType === 'dinein' && tableId) {
      api.getTableOrders(tableId).then(data => {
        const orders = Array.isArray(data?.orders) ? data.orders : []
        const activeOrders = orders.filter(o => o.status !== 'cancelled' && o.status !== 'completed')
        if (activeOrders.length > 0) {
          const allCartItems = []
          activeOrders.forEach(order => {
            try {
              const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || [])
              items.forEach((item, idx) => {
                allCartItems.push({
                  cartItemId: `loaded-${order.id}-${idx}`,
                  id: item.id,
                  name: item.name,
                  price: item.price,
                  image: item.image,
                  quantity: item.quantity,
                  notes: item.note ? item.note.split(', ').filter(Boolean) : [],
                  ordered: true,
                  category_id: item.category_id,
                  order_id: order.id,
                  order_no: order.order_no,
                  order_time: order.created_at
                })
              })
            } catch (e) { /* 解析失败忽略 */ }
          })
          if (allCartItems.length > 0) {
            setCart(allCartItems)
          }
          // 加单时追加到最新的未完成订单
          const latestOrder = activeOrders[activeOrders.length - 1]
          if (latestOrder && latestOrder.status !== 'completed') {
            setCurrentOrderId(latestOrder.id)
            setCurrentOrderNo(latestOrder.order_no)
          }
        }
      }).catch(() => {})
    }
  }, [])

  // 加载分类口味标签（带缓存）
  const loadFlavors = async (categoryId) => {
    if (flavorCache[categoryId]) {
      setFlavorTags(flavorCache[categoryId].tags || [])
      setFlavorGrouped(flavorCache[categoryId].grouped || {})
      return flavorCache[categoryId]
    }
    try {
      const data = await api.getFlavorTags(categoryId)
      setFlavorTags(data.tags || [])
      setFlavorGrouped(data.grouped || {})
      setFlavorCache(prev => ({ ...prev, [categoryId]: data }))
      return data
    } catch (e) { return { tags: [], grouped: {} } }
  }

  const filteredProducts = useMemo(() => activeCat === 0 ? products : products.filter(p => p.category_id === activeCat), [activeCat, products])

  const catCounts = useMemo(() => {
    const map = { 0: products.length }
    categories.forEach(c => { map[c.id] = products.filter(p => p.category_id === c.id).length })
    return map
  }, [categories, products])

  // 口味工具函数
  const getTagInfo = (tagName) => flavorTags.find(t => t.name === tagName) || { name: tagName, extra_price: 0, category: '自定义' }
  const calcTagsExtraPrice = (tags = []) => tags.reduce((sum, t) => sum + (getTagInfo(t).extra_price || 0), 0)
  const getItemUnitPrice = (item) => parseFloat(item.price) + calcTagsExtraPrice(item.notes || [])

  // 点击商品：自动加载默认口味并加入购物车
  const handleProductClick = async (product) => {
    const data = await loadFlavors(product.category_id)
    const defaults = (data.tags || []).filter(t => t.is_default).map(t => t.name)
    addToCart(product, defaults)
  }

  // 添加商品到购物车（同商品同口味合并数量）
  const addToCart = (product, notes) => {
    const itemNotes = notes && notes.length > 0 ? notes : []
    setCart(prev => {
      const existing = prev.find(i => {
        if (i.id !== product.id || i.ordered) return false
        return [...(i.notes || [])].sort().join(',') === [...itemNotes].sort().join(',')
      })
      if (existing) {
        return prev.map(i => i.cartItemId === existing.cartItemId ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, {
        cartItemId: Date.now() + Math.random(),
        id: product.id, name: product.name, price: product.price,
        image: product.image, quantity: 1, notes: itemNotes, ordered: false, category_id: product.category_id
      }]
    })
  }

  // 确认口味选择（编辑已有项或新加入购物车）
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

  // 打开编辑口味弹窗
  const openEditTags = async (item) => {
    await loadFlavors(item.category_id)
    setTagsDialog({ id: item.id, name: item.name, price: item.price })
    setSelectedTags([...(item.notes || [])])
    setCustomNote('')
    setEditCartItemId(item.cartItemId)
  }

  // 修改购物车商品数量（数量为0时移除）
  const updateQty = (cartItemId, delta) => {
    setCart(prev => prev.map(i => {
      if (i.cartItemId === cartItemId) {
        const qty = Math.max(0, i.quantity + delta)
        return qty === 0 ? null : { ...i, quantity: qty }
      }
      return i
    }).filter(Boolean))
  }

  // 更新商品口味（若与购物车中另一商品完全相同则合并）
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
  const clearCart = () => setCart(prev => prev.filter(i => i.ordered))
  const pendingItems = cart.filter(i => !i.ordered)
  const orderedItems = cart.filter(i => i.ordered)

  // 按订单分组已下单商品（用于购物车显示）
  const orderedByOrder = useMemo(() => {
    const groups = {}
    orderedItems.forEach(item => {
      const key = item.order_id || 'unknown'
      if (!groups[key]) {
        groups[key] = { order_id: item.order_id, order_no: item.order_no, order_time: item.order_time, items: [] }
      }
      groups[key].items.push(item)
    })
    return Object.values(groups).sort((a, b) => (a.order_time || '').localeCompare(b.order_time || ''))
  }, [orderedItems])

  // 底部合计：已下单 + 待下单 的总金额
  const allSubtotal = cart.reduce((sum, i) => sum + getItemUnitPrice(i) * i.quantity, 0)
  const subtotal = pendingItems.reduce((sum, i) => sum + getItemUnitPrice(i) * i.quantity, 0)
  const tax = Math.round(allSubtotal * taxRate * 100) / 100
  const total = Math.round((allSubtotal + tax) * 100) / 100
  const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0)

  // 提交订单：堂吃直接提交，打包先填顾客姓名电话；堂吃加单时追加到已有订单
  const doSubmitOrder = async (customerName = '', customerPhone = '') => {
    try {
      const itemsToSubmit = cart.filter(i => !i.ordered)
      if (itemsToSubmit.length === 0) { toast(t('employee.noItemsToSubmit', '没有需要提交的商品'), 'error'); return }
      const orderItems = itemsToSubmit.map(i => ({
        id: i.id, quantity: i.quantity, price: getItemUnitPrice(i),
        note: (i.notes || []).join(', ')
      }))
      let res
      if (currentOrderId) {
        const appendRes = await api.appendOrder(currentOrderId, orderItems)
        res = { order_no: currentOrderNo, total: appendRes.total, pickup_number: '' }
        toast(`${t('employee.appendedToOrder', '已追加到订单')} ${currentOrderNo}`)
      } else {
        res = await api.createOrder({
          items: orderItems,
          dining_type: orderType === 'dinein' ? 'dine_in' : 'takeout',
          customer_name: customerName || (orderType === 'dinein' ? `堂吃-${tableNo}` : ''),
          customer_phone: customerPhone,
          table_id: tableId ? parseInt(tableId) : null,
          note: `员工: ${user?.username || ''}`
        })
        if (orderType === 'dinein' && res.order_no) {
          try {
            const detail = await api.getOrderByNo(res.order_no)
            if (detail?.id) {
              setCurrentOrderId(detail.id)
              setCurrentOrderNo(res.order_no)
            }
          } catch (e) { /* 忽略 */ }
        }
      }
      // 下单/加单成功后，提示点餐成功，然后返回到员工主页
      const now = new Date()
      const pad = n => String(n).padStart(2, '0')
      const orderTime = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
      setCart(prev => prev.map(i => i.ordered ? i : { ...i, ordered: true, order_id: currentOrderId, order_no: currentOrderNo || res.order_no, order_time: orderTime }))
      setOrderInfo({ name: '', phone: '' })
      navigate('/employee')
      setTimeout(() => { toast(`${t('employee.orderSuccessNo', '点餐成功，订单号：')}${res.order_no}`) }, 200)
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  // 点击"下单"按钮的入口（堂吃直接提交，打包弹顾客信息弹窗）
  const submitOrder = () => {
    if (pendingItems.length === 0) { toast(t('employee.noItemsToSubmit', '没有需要提交的商品'), 'error'); return }
    if (orderType === 'dinein') {
      doSubmitOrder()
    } else {
      setOrderInfoDialog(true)
    }
  }

  // 确认打包顾客信息后提交订单
  const confirmOrderInfo = () => {
    if (!orderInfo.name.trim()) { toast(t('employee.enterCustomerName', '请填写顾客姓名'), 'error'); return }
    if (!orderInfo.phone.trim()) { toast(t('employee.enterCustomerPhone', '请填写手机号码'), 'error'); return }
    setOrderInfoDialog(false)
    doSubmitOrder(orderInfo.name.trim(), orderInfo.phone.trim())
  }

  // 下单并直接结账（堂吃流程：先下单再弹结账框；无待下单菜品则直接结账）
  const doSubmitAndCheckout = async () => {
    try {
      const itemsToSubmit = cart.filter(i => !i.ordered)
      if (itemsToSubmit.length === 0) {
        // 没有待下单菜品，直接结账
        handleCheckout()
        return
      }
      const orderItems = itemsToSubmit.map(i => ({
        id: i.id, quantity: i.quantity, price: getItemUnitPrice(i),
        note: (i.notes || []).join(', ')
      }))
      let res
      if (currentOrderId) {
        const appendRes = await api.appendOrder(currentOrderId, orderItems)
        res = { order_no: currentOrderNo, total: appendRes.total, pickup_number: '' }
      } else {
        res = await api.createOrder({
          items: orderItems,
          dining_type: orderType === 'dinein' ? 'dine_in' : 'takeout',
          customer_name: orderType === 'dinein' ? `堂吃-${tableNo}` : '',
          customer_phone: '',
          table_id: tableId ? parseInt(tableId) : null,
          note: `员工: ${user?.username || ''}`
        })
        if (orderType === 'dinein' && res.order_no) {
          try {
            const detail = await api.getOrderByNo(res.order_no)
            if (detail?.id) {
              setCurrentOrderId(detail.id)
              setCurrentOrderNo(res.order_no)
            }
          } catch (e) { /* 忽略 */ }
        }
      }
      toast(`${t('employee.orderSuccessNo', '点餐成功，订单号：')}${res.order_no}`)
      // 把待下单商品标记为已下单
      const now = new Date()
      const pad = n => String(n).padStart(2, '0')
      const orderTime = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
      setCart(prev => prev.map(i => i.ordered ? i : {
        ...i, ordered: true,
        order_id: currentOrderId,
        order_no: currentOrderNo || res.order_no,
        order_time: orderTime
      }))
      // 延迟一下让状态更新，然后直接结账
      setTimeout(() => {
        handleCheckout()
      }, 500)
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  // 打开结账弹窗：拉取该桌所有未完成订单并汇总金额
  const handleCheckout = async () => {
    if (!tableId) { toast(t('employee.noTableInfo', '无法获取桌子信息'), 'error'); return }
    try {
      const data = await api.getTableOrders(tableId)
      const allOrders = Array.isArray(data?.orders) ? data.orders : []
      const activeOrders = allOrders.filter(o => o.status !== 'cancelled' && o.status !== 'completed')
      const checkoutTotal = activeOrders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0)
      setCheckoutData({ orders: activeOrders, total: checkoutTotal, count: activeOrders.length })
      setCheckoutDialog(true)
    } catch (e) { toast(e.message, 'error') }
  }

  // 确认结账：逐个订单结账，现金支付自动弹钱箱（通过打印机ESC/POS指令），完成后返回员工主页
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
            // 通过打印触发钱箱（创建隐藏iframe打印ESC/POS指令）
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
      
      const pmLabel = paymentMethod === 'cash' ? t('payment.cash', '现金') : paymentMethod === 'card' ? t('payment.card', '刷卡') : paymentMethod === 'apple_pay' ? t('payment.applePay', 'Apple Pay') : paymentMethod === 'platform' ? t('payment.platform', '外卖平台') : t('common.other', '其他')
      toast(`${t('employee.checkoutSuccess', '结账成功')}（${pmLabel}），共 $${parseFloat(checkoutData.total).toFixed(2)}`)
      setCheckoutDialog(false)
      setCurrentOrderId(null)
      setCurrentOrderNo('')
      setCart([])
      setPaymentMethod('cash')
      navigate('/employee')
    } catch (e) { 
      toast(e.message, 'error') 
    } finally {
      setCheckingOut(false)
    }
  }

  // 修改密码（校验两次密码一致）
  const handleChangePassword = async () => {
    if (!pwdForm.oldPassword || !pwdForm.newPassword) { toast(t('common.fillAll', '请填写完整'), 'error'); return }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) { toast(t('employee.passwordMismatch', '两次密码不一致'), 'error'); return }
    try {
      await api.changePassword(pwdForm.oldPassword, pwdForm.newPassword)
      toast(t('employee.passwordChanged', '密码修改成功'))
      setPwdDialog(false)
      setPwdForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
    } catch (e) { toast(e.message, 'error') }
  }

  const singleChoiceCategories = ['辣度', '冰度', '甜度']

  // 切换口味标签选中状态（辣度/冰度/甜度为单选，其余多选）
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

  const modeLabel = orderType === 'dinein' ? `${t('employee.dineIn', '堂吃')} · ${tableNo}${t('employee.table', '桌')}` : t('employee.takeout', '打包取餐')
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
            <h1 className="text-base font-bold text-gray-800">{t('employee.title', 'Only One 员工点餐')}</h1>
            <p className="text-xs text-gray-400">{user?.name || user?.username}</p>
          </div>
          <span className={`ml-2 px-3 py-1 rounded-full text-xs font-bold ${modeColor}`}>
            {modeLabel}
          </span>
          {currentOrderNo && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
              {t('employee.addingOrder', '加单中')} · {currentOrderNo}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPwdDialog(true)} className="text-sm text-gray-500 hover:text-primary-600 px-3 py-2 rounded-lg hover:bg-gray-100 transition">{t('employee.changePassword', '修改密码')}</button>
          <button onClick={logout} className="text-sm text-gray-500 hover:text-red-500 px-3 py-2 rounded-lg hover:bg-gray-100 transition">{t('admin.logout', '退出')}</button>
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
            <span className="text-sm">{t('employee.allProducts', '全部商品')}</span>
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
              <p>{t('employee.noProductsInCategory', '该分类下暂无商品')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
              {filteredProducts.map(product => {
                const inCartQty = cart.reduce((sum, i) => i.id === product.id && !i.ordered ? sum + i.quantity : sum, 0)
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
            <h2 className="font-bold text-gray-800">{t('employee.cart', '购物车')}</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{totalItems} {t('employee.pieces', '件')}</span>
              {pendingItems.length > 0 && <button onClick={clearCart} className="text-xs text-red-400 hover:text-red-600">{t('employee.clearCart', '清空')}</button>}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-300">
                <span className="text-4xl mb-2">🛒</span>
                <p className="text-sm">{t('employee.cartEmpty', '购物车为空')}</p>
                <p className="text-xs mt-1">{t('employee.cartEmptyHint', '点击左侧商品添加')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingItems.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 mb-1.5 px-1">{t('employee.pendingSubmit', '待下单')}</p>
                    {pendingItems.map(item => (
                      <div key={item.cartItemId} className="bg-gray-50 rounded-lg p-2.5 mb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-800 truncate">{item.name}</p>
                            <p className="text-xs text-primary-600 mt-0.5">${getItemUnitPrice(item).toFixed(2)}</p>
                          </div>
                          <button onClick={() => removeItem(item.cartItemId)} className="text-gray-300 hover:text-red-500 text-sm flex-shrink-0">✕</button>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(item.notes || []).length > 0 ? (
                            item.notes.map(tagName => {
                              const info = getTagInfo(tagName)
                              return (
                                <button key={tagName} onClick={() => openEditTags(item)} className={`px-2 py-0.5 text-xs rounded-full ${info.extra_price > 0 ? 'bg-orange-100 text-orange-700' : 'bg-primary-100 text-primary-700'} hover:opacity-80 transition`}>
                                  {tagName}{info.extra_price > 0 && ` +$${info.extra_price.toFixed(2)}`}
                                </button>
                              )
                            })
                          ) : (
                            <button onClick={() => openEditTags(item)} className="px-2 py-0.5 text-xs rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300 transition">+ {t('employee.selectFlavor', '选口味')}</button>
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
                {orderedItems.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 mb-1.5 px-1">{t('employee.ordered', '已下单')}（{orderedByOrder.length} {t('unit.orders', '单')}）</p>
                    {orderedByOrder.map((group, gIdx) => {
                      const groupTotal = group.items.reduce((sum, i) => sum + getItemUnitPrice(i) * i.quantity, 0)
                      const timeStr = group.order_time ? group.order_time.substring(11, 16) : ''
                      return (
                        <div key={group.order_id || gIdx} className={`${gIdx > 0 ? 'border-t border-dashed border-gray-200 pt-2 mt-2' : ''}`}>
                          <div className="flex items-center justify-between px-1 mb-1.5">
                            <span className="text-xs font-mono text-gray-500">{group.order_no || t('employee.order', '订单')}</span>
                            <span className="text-xs text-gray-400">{timeStr}</span>
                          </div>
                          {group.items.map(item => (
                            <div key={item.cartItemId} className="bg-gray-100 rounded-lg p-2.5 mb-1.5 opacity-70">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm text-gray-500 truncate">{item.name}</p>
                                  <p className="text-xs text-gray-400 mt-0.5">${getItemUnitPrice(item).toFixed(2)}</p>
                                </div>
                                <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full flex-shrink-0">{t('employee.ordered', '已下单')}</span>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {(item.notes || []).length > 0 && item.notes.map(tagName => {
                                  const info = getTagInfo(tagName)
                                  return (
                                    <span key={tagName} className={`px-2 py-0.5 text-xs rounded-full ${info.extra_price > 0 ? 'bg-orange-50 text-orange-400' : 'bg-gray-200 text-gray-400'}`}>
                                      {tagName}{info.extra_price > 0 && ` +$${info.extra_price.toFixed(2)}`}
                                    </span>
                                  )
                                })}
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-sm text-gray-400">x{item.quantity}</span>
                                <span className="text-sm font-medium text-gray-400">${(getItemUnitPrice(item) * item.quantity).toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                          <div className="flex justify-end px-1 mt-1">
                            <span className="text-xs text-gray-400">{t('common.subtotal', '小计')}：<span className="font-medium text-gray-500">${groupTotal.toFixed(2)}</span></span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t p-4 flex-shrink-0 bg-gray-50">
            <div className="space-y-1.5 mb-3">
              {orderedItems.length > 0 && (
                <div className="flex justify-between text-sm text-gray-500"><span>{t('employee.ordered', '已下单')}</span><span>${orderedItems.reduce((sum, i) => sum + getItemUnitPrice(i) * i.quantity, 0).toFixed(2)}</span></div>
              )}
              {pendingItems.length > 0 && (
                <div className="flex justify-between text-sm text-gray-500"><span>{t('employee.pendingSubmit', '待下单')}</span><span>${subtotal.toFixed(2)}</span></div>
              )}
              <div className="flex justify-between text-sm text-gray-500"><span>{t('common.tax', '税费')}</span><span>${tax.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-base pt-2 border-t"><span>{t('common.total', '合计')}</span><span className="text-primary-600">${total.toFixed(2)}</span></div>
            </div>
            {orderType === 'dinein' ? (
              <div className="flex gap-2">
                <Button
                  onClick={submitOrder}
                  disabled={pendingItems.length === 0}
                  className={`flex-1 py-3 text-base font-bold ${pendingItems.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {currentOrderId ? t('employee.appendOrder', '加单') : t('employee.placeOrder', '下单')}
                </Button>
                <Button
                  onClick={doSubmitAndCheckout}
                  variant="outline"
                  className="flex-1 py-3 text-base font-bold border-primary-300 text-primary-600 hover:bg-primary-50"
                >
                  {t('employee.checkout', '结帐')}
                </Button>
              </div>
            ) : (
              <Button
                onClick={submitOrder}
                disabled={pendingItems.length === 0}
                className={`w-full py-3 text-base font-bold ${pendingItems.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {t('employee.confirmTakeoutOrder', '确认下单（打包）')}
              </Button>
            )}
          </div>
        </aside>
      </div>

      {/* 口味选择对话框 */}
      <Dialog open={!!tagsDialog} onClose={() => { setTagsDialog(null); setSelectedTags([]); setEditCartItemId(null) }} title={editCartItemId ? t('employee.editFlavor', '修改口味') : t('employee.selectFlavor', '选择口味')} width="max-w-md">
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
                    {singleChoiceCategories.includes(category) && <span className="ml-2 normal-case font-normal">{t('employee.singleChoice', '（单选）')}</span>}
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
                      placeholder={t('employee.customNotePlaceholder', '自定义备注（如：少放盐、打包等）')}
                      className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  )}
                </div>
              ))}
              {Object.keys(flavorGrouped).length === 0 && (
                <p className="text-center text-gray-400 text-sm py-4">{t('employee.noFlavorOptions', '暂无口味选项')}</p>
              )}
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="text-sm">
                <span className="text-gray-500">{t('employee.selected', '已选')} {selectedTags.length} {t('unit.items', '项')}</span>
                <span className="text-primary-600 ml-3">+${calcTagsExtraPrice(selectedTags).toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setTagsDialog(null); setSelectedTags([]); setEditCartItemId(null) }}>{t('common.cancel', '取消')}</Button>
                <Button onClick={confirmTags}>{editCartItemId ? t('employee.confirmChange', '确认修改') : t('employee.addToCart', '加入购物车')}</Button>
              </div>
            </div>
          </div>
        )}
      </Dialog>

      {/* 打包顾客信息对话框 */}
      <Dialog open={orderInfoDialog} onClose={() => setOrderInfoDialog(false)} title={t('employee.takeoutCustomerInfo', '打包顾客信息')} width="max-w-sm">
        <div className="space-y-4">
          <Input label={t('employee.customerName', '顾客姓名')} value={orderInfo.name} onChange={e => setOrderInfo({ ...orderInfo, name: e.target.value })} placeholder={t('employee.enterName', '请输入姓名')} />
          <Input label={t('common.phone', '手机号码')} value={orderInfo.phone} onChange={e => setOrderInfo({ ...orderInfo, phone: e.target.value })} placeholder={t('employee.enterPhoneHint', '请输入手机号（取餐叫号用）')} />
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setOrderInfoDialog(false)}>{t('common.cancel', '取消')}</Button>
            <Button className="flex-1" onClick={confirmOrderInfo}>{t('employee.confirmOrder', '确认下单')}</Button>
          </div>
        </div>
      </Dialog>

      {/* 结账对话框 */}
      <Dialog open={checkoutDialog} onClose={() => setCheckoutDialog(false)} title={`${t('employee.checkout', '结账')} · ${tableNo}${t('employee.table', '桌')}`} width="max-w-md">
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between text-sm text-gray-500 mb-2">
              <span>{t('employee.orderCount', '订单数')}</span>
              <span className="font-medium">{checkoutData.count} {t('unit.orders', '单')}</span>
            </div>
            <div className="flex justify-between font-bold text-xl pt-2 border-t">
              <span>{t('employee.totalDue', '应付总额')}</span>
              <span className="text-primary-600">${parseFloat(checkoutData.total).toFixed(2)}</span>
            </div>
          </div>
          
          {/* 付款方式选择 */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">{t('employee.selectPaymentMethod', '选择付款方式')}</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'cash', label: `💵 ${t('payment.cash', '现金')}`, desc: t('payment.cashDesc', '自动弹钱箱') },
                { value: 'card', label: `💳 ${t('payment.card', '刷卡')}`, desc: t('payment.cardDesc', 'Tap to Pay') },
                { value: 'apple_pay', label: `🍎 ${t('payment.applePay', 'Apple Pay')}`, desc: t('payment.applePayDesc', '非接触支付') },
                { value: 'platform', label: `📱 ${t('payment.platform', '外卖平台')}`, desc: t('payment.platformDesc', 'Uber/DoorDash等') },
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
          {checkoutData.orders.length > 0 && (
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
            <Button variant="outline" className="flex-1" onClick={() => setCheckoutDialog(false)} disabled={checkingOut}>{t('common.cancel', '取消')}</Button>
            <Button className="flex-1" onClick={confirmCheckout} disabled={checkingOut || checkoutData.orders.length === 0}>
              {checkingOut ? t('employee.checkingOut', '结账中...') : paymentMethod === 'cash' ? t('employee.cashCheckoutDrawer', '现金结账并弹钱箱') : t('employee.confirmCheckout', '确认结账')}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* 下单成功 - 小票弹窗 */}
      <Dialog open={!!success} onClose={() => setSuccess(null)} title={currentOrderId ? t('employee.appendSuccess', '加单成功') : t('employee.orderSuccess', '下单成功')} width="max-w-sm">
        {success && (
          <div className="py-4">
            {/* 取餐号 */}
            <div className="text-center mb-4">
              <p className="text-sm text-gray-400 mb-1">{orderType === 'dinein' ? t('employee.tableNo', '桌号') : t('employee.pickupNo', '取餐号')}</p>
              <p className="text-5xl font-mono font-bold text-primary-600 tracking-wider">
                {orderType === 'dinein' ? tableNo : success.pickup_number}
              </p>
              {orderType === 'takeout' && <p className="text-xs text-gray-400 mt-2">{t('employee.pickupHint', '请凭此号取餐')}</p>}
              {orderType === 'dinein' && currentOrderNo && <p className="text-xs text-gray-400 mt-2">{t('employee.orderNo', '订单号')}：{currentOrderNo}</p>}
            </div>

            {/* 订单信息 */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
              <div className="flex justify-between text-gray-500 mb-1">
                <span>{t('employee.orderNo', '订单号')}</span>
                <span className="font-mono text-xs">{success.order_no}</span>
              </div>
              <div className="flex justify-between text-gray-500 mb-1">
                <span>{t('common.type', '类型')}</span>
                <span>{orderType === 'dinein' ? `${t('employee.dineIn', '堂吃')} · ${tableNo}${t('employee.table', '桌')}` : t('employee.takeoutPickup', '打包取餐')}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t mt-2">
                <span>{t('common.total', '合计')}</span>
                <span className="text-primary-600">${parseFloat(success.total).toFixed(2)}</span>
              </div>
            </div>

            {orderType === 'dinein' ? (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setSuccess(null)}>{t('employee.continueAppend', '继续加单')}</Button>
                <Button className="flex-1" onClick={() => { setSuccess(null); doSubmitAndCheckout() }}>{t('employee.goCheckout', '去结帐')}</Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setSuccess(null); navigate('/employee') }}>{t('employee.backHome', '返回首页')}</Button>
                <Button className="flex-1" onClick={() => setSuccess(null)}>{t('employee.continueOrdering', '继续点餐')}</Button>
              </div>
            )}
          </div>
        )}
      </Dialog>

      {/* 修改密码对话框 */}
      <Dialog open={pwdDialog} onClose={() => setPwdDialog(false)} title={t('employee.changePassword', '修改密码')} width="max-w-sm">
        <div className="space-y-4">
          <Input label={t('employee.currentPassword', '当前密码')} type="password" value={pwdForm.oldPassword} onChange={e => setPwdForm({ ...pwdForm, oldPassword: e.target.value })} />
          <Input label={t('employee.newPassword', '新密码')} type="password" value={pwdForm.newPassword} onChange={e => setPwdForm({ ...pwdForm, newPassword: e.target.value })} />
          <Input label={t('employee.confirmPassword', '确认新密码')} type="password" value={pwdForm.confirmPassword} onChange={e => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })} />
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setPwdDialog(false)}>{t('common.cancel', '取消')}</Button>
            <Button className="flex-1" onClick={handleChangePassword}>{t('employee.confirmChange', '确认修改')}</Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
