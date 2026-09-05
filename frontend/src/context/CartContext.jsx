import { createContext, useContext, useState, useEffect } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cart') || '[]')
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items))
  }, [items])

  const addItem = (product) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id && !i.note)
      if (existing) {
        return prev.map(i => i.id === product.id && !i.note ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { id: product.id, name: product.name, name_en: product.name_en, price: product.price, image: product.image, quantity: 1, note: '' }]
    })
  }

  const updateQuantity = (id, quantity, note = '') => {
    if (quantity <= 0) {
      removeItem(id, note)
      return
    }
    setItems(prev => prev.map(i => (i.id === id && i.note === note) ? { ...i, quantity } : i))
  }

  const updateNote = (id, note) => {
    setItems(prev => {
      const item = prev.find(i => i.id === id)
      if (!item) return prev
      const existingWithNote = prev.find(i => i.id === id && i.note === note && i !== item)
      if (existingWithNote) {
        return prev
          .filter(i => i !== item)
          .map(i => i === existingWithNote ? { ...i, quantity: i.quantity + item.quantity } : i)
      }
      return prev.map(i => i.id === id ? { ...i, note } : i)
    })
  }

  const clearNote = (id) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, note: '' } : i))
  }

  const removeItem = (id, note = '') => {
    setItems(prev => prev.filter(i => !(i.id === id && i.note === note)))
  }

  const clear = () => setItems([])

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, addItem, updateQuantity, updateNote, clearNote, removeItem, clear, subtotal, totalCount }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
