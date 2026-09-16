import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../lib/api'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  // 生成购物车项唯一ID
  const genId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5)

  const [flavorTags, setFlavorTags] = useState([])
  const [flavorCache, setFlavorCache] = useState({})

  // 初始化：从后端加载口味标签，失败时用默认值兜底
  useEffect(() => {
    api.getFlavorTags()
      .then(data => setFlavorTags(data.tags || []))
      .catch(() => {
        setFlavorTags([
          { category: '冰度', name: '正常冰', extra_price: 0, is_default: 1 },
          { category: '甜度', name: '正常糖', extra_price: 0, is_default: 1 }
        ])
      })
  }, [])

  // 按分类加载口味标签（带缓存）
  const loadFlavors = async (categoryId) => {
    if (flavorCache[categoryId]) {
      setFlavorTags(flavorCache[categoryId].tags || [])
      return flavorCache[categoryId]
    }
    try {
      const data = await api.getFlavorTags(categoryId)
      setFlavorTags(data.tags || [])
      setFlavorCache(prev => ({ ...prev, [categoryId]: data }))
      return data
    } catch (e) { return { tags: [], grouped: {} } }
  }

  // 根据标签名获取标签详情（含加价）
  const getTagInfo = (tagName) => flavorTags.find(t => t.name === tagName) || { name: tagName, extra_price: 0, category: '自定义' }
  // 计算一组口味标签的加价总和
  const calcTagsExtraPrice = (tags = []) => tags.reduce((sum, t) => sum + (getTagInfo(t).extra_price || 0), 0)
  // 获取所有默认选中的口味标签名
  const defaultTags = flavorTags.filter(t => t.is_default).map(t => t.name)

  // 迁移旧版购物车数据格式（cartId/notes字段兼容）
  const migrateItems = (items) => {
    if (!Array.isArray(items)) return []
    return items.map(item => {
      if (item.cartId && Array.isArray(item.notes)) return item
      const notes = item.note ? [item.note] : []
      return { ...item, cartId: item.cartId || genId(), notes }
    })
  }

  // 从localStorage读取购物车（兼容旧格式）
  const [items, setItems] = useState(() => {
    try { return migrateItems(JSON.parse(localStorage.getItem('cart') || '[]')) } catch { return [] }
  })

  // 购物车变化时自动持久化到localStorage
  useEffect(() => { localStorage.setItem('cart', JSON.stringify(items)) }, [items])

  // 订单历史（最近20条）
  const [history, setHistory] = useState(() => { try { return JSON.parse(localStorage.getItem('order_history') || '[]') } catch { return [] } })
  useEffect(() => { localStorage.setItem('order_history', JSON.stringify(history)) }, [history])

  // 计算单个商品的实际单价（含口味加价）
  const getItemUnitPrice = (item) => item.price + calcTagsExtraPrice(item.notes || [])

  // 添加商品到购物车（同商品同口味则合并数量）
  const addItem = (product, notes = null) => {
    const itemNotes = notes || [...defaultTags]
    setItems(prev => {
      const existing = prev.find(i => {
        if (i.id !== product.id) return false
        return [...(i.notes || [])].sort().join(',') === [...itemNotes].sort().join(',')
      })
      if (existing) {
        return prev.map(i => i.cartId === existing.cartId ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, {
        cartId: genId(), id: product.id, name: product.name, name_en: product.name_en,
        price: product.price, image: product.image, quantity: 1, notes: itemNotes, category_id: product.category_id
      }]
    })
  }

  // 修改商品数量（数量为0时移除）
  const updateQuantity = (cartId, quantity) => {
    if (quantity <= 0) { removeItem(cartId); return }
    setItems(prev => prev.map(i => i.cartId === cartId ? { ...i, quantity } : i))
  }

  // 修改商品口味（若与购物车中另一商品完全相同则合并）
  const updateNotes = (cartId, notes) => {
    setItems(prev => {
      const item = prev.find(i => i.cartId === cartId)
      if (!item) return prev
      const existingSame = prev.find(i => {
        if (i.id !== item.id || i.cartId === cartId) return false
        return [...(i.notes || [])].sort().join(',') === [...notes].sort().join(',')
      })
      if (existingSame) {
        return prev.filter(i => i.cartId !== cartId).map(i => i.cartId === existingSame.cartId ? { ...i, quantity: i.quantity + item.quantity } : i)
      }
      return prev.map(i => i.cartId === cartId ? { ...i, notes } : i)
    })
  }

  // 清除商品所有口味选择
  const clearNotes = (cartId) => updateNotes(cartId, [])
  // 从购物车移除指定商品
  const removeItem = (cartId) => setItems(prev => prev.filter(i => i.cartId !== cartId))
  // 清空购物车
  const clear = () => setItems([])

  // 提交订单后将当前购物车存入历史记录
  const addToHistory = () => {
    if (items.length === 0) return
    setHistory(prev => [{ id: genId(), date: new Date().toLocaleString('zh-CN'), items: items.map(i => ({ ...i })), total: subtotal }, ...prev].slice(0, 20))
  }

  // 从历史记录重新下单
  const reorderFromHistory = (recordId) => {
    const record = history.find(r => r.id === recordId)
    if (!record) return
    record.items.forEach(item => addItem({ id: item.id, name: item.name, name_en: item.name_en, price: item.price, image: item.image }, item.notes || []))
  }

  // 清空订单历史
  const clearHistory = () => setHistory([])

  // 购物车小计（含口味加价）
  const subtotal = items.reduce((sum, i) => sum + getItemUnitPrice(i) * i.quantity, 0)
  // 购物车商品总件数
  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <CartContext.Provider value={{
      items, addItem, updateQuantity, updateNotes, clearNotes, removeItem, clear,
      subtotal, totalCount, history, addToHistory, reorderFromHistory, clearHistory,
      getItemUnitPrice, flavorTags, defaultTags, getTagInfo, calcTagsExtraPrice, loadFlavors
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() { return useContext(CartContext) }
