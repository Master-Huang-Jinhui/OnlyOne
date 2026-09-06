import { createContext, useContext, useState, useEffect } from 'react'
import { calcTagsExtraPrice } from '../lib/flavorTags'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const genId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5)

  const migrateItems = (items) => {
    if (!Array.isArray(items)) return []
    return items.map(item => {
      if (item.cartId && Array.isArray(item.notes)) return item
      const notes = item.note ? [item.note] : []
      return { ...item, cartId: item.cartId || genId(), notes }
    })
  }

  const [items, setItems] = useState(() => {
    try { return migrateItems(JSON.parse(localStorage.getItem('cart') || '[]')) } catch { return [] }
  })

  useEffect(() => { localStorage.setItem('cart', JSON.stringify(items)) }, [items])

  const [history, setHistory] = useState(() => { try { return JSON.parse(localStorage.getItem('order_history') || '[]') } catch { return [] } })
  useEffect(() => { localStorage.setItem('order_history', JSON.stringify(history)) }, [history])

  const getItemUnitPrice = (item) => item.price + calcTagsExtraPrice(item.notes || [])

  const addItem = (product) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id && (!i.notes || i.notes.length === 0))
      if (existing) return prev.map(i => i.cartId === existing.cartId ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { cartId: genId(), id: product.id, name: product.name, name_en: product.name_en, price: product.price, image: product.image, quantity: 1, notes: [] }]
    })
  }

  const updateQuantity = (cartId, quantity) => {
    if (quantity <= 0) { removeItem(cartId); return }
    setItems(prev => prev.map(i => i.cartId === cartId ? { ...i, quantity } : i))
  }

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

  const clearNotes = (cartId) => updateNotes(cartId, [])
  const removeItem = (cartId) => setItems(prev => prev.filter(i => i.cartId !== cartId))
  const clear = () => setItems([])

  const addToHistory = () => {
    if (items.length === 0) return
    setHistory(prev => [{ id: genId(), date: new Date().toLocaleString('zh-CN'), items: items.map(i => ({ ...i })), total: subtotal }, ...prev].slice(0, 20))
  }

  const reorderFromHistory = (recordId) => {
    const record = history.find(r => r.id === recordId)
    if (!record) return
    record.items.forEach(item => addItem({ id: item.id, name: item.name, name_en: item.name_en, price: item.price, image: item.image }))
  }

  const clearHistory = () => setHistory([])

  const subtotal = items.reduce((sum, i) => sum + getItemUnitPrice(i) * i.quantity, 0)
  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, addItem, updateQuantity, updateNotes, clearNotes, removeItem, clear, subtotal, totalCount, history, addToHistory, reorderFromHistory, clearHistory, getItemUnitPrice }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() { return useContext(CartContext) }
