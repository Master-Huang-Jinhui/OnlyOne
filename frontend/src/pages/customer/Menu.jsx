import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { useCart } from '../../context/CartContext'
import { Button, Badge, Empty, Input, toast } from '../../components/ui'

export default function Menu() {
  const navigate = useNavigate()
  const { items, addItem, updateQuantity, updateNote, removeItem, clear, subtotal, totalCount, history, reorderFromHistory } = useCart()
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [business, setBusiness] = useState({ open: true })
  const [cartOpen, setCartOpen] = useState(false)
  const [noteDialog, setNoteDialog] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {})
    api.getProducts().then(setProducts).catch(() => {})
    api.getTodayBusiness().then(setBusiness).catch(() => {})
  }, [])

  const filtered = activeCategory === 'all' ? products : products.filter(p => p.category_id == activeCategory)
  const getItemCount = (productId) => items.filter(i => i.id === productId && !i.note).reduce((sum, i) => sum + i.quantity, 0)

  const handleAdd = (product) => { if (!business.open) return; addItem(product) }
  const openNoteDialog = (item) => { setNoteDialog(item); setNoteText(item.note || '') }
  const saveNote = () => { if (noteDialog) updateNote(noteDialog.cartId, noteText); setNoteDialog(null) }

  const handleCheckout = () => {
    if (items.length === 0) { toast('购物车是空的', 'error'); return }
    setCartOpen(false)
    navigate('/checkout')
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16 pb-20">
      <div className="bg-white border-b sticky top-16 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="text-gray-600 hover:text-primary-600 text-sm">← 返回首页</Link>
          <h1 className="text-lg font-bold text-gray-800">菜单</h1>
          <button onClick={() => setCartOpen(true)} className="relative p-2 text-gray-600 hover:text-primary-600">
            <span className="text-xl">🛒</span>
            {totalCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{totalCount}</span>}
          </button>
        </div>
      </div>

      {!business.open && (
        <div className="bg-yellow-50 border-b border-yellow-200 text-center py-3">
          <p className="text-yellow-700 text-sm">⚠️ 今日门店休息，暂不接受下单</p>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
          <button onClick={() => setActiveCategory('all')} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeCategory === 'all' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'}`}>全部</button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeCategory == cat.id ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'}`}>{cat.name}</button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <Empty text="该分类暂无商品" icon="🍽️" />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(product => {
              const count = getItemCount(product.id)
              return (
                <div key={product.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-lg transition-all group relative">
                  {count > 0 && (
                    <div className="absolute top-3 right-3 z-10 bg-primary-600 text-white text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center shadow-lg">{count}</div>
                  )}
                  <div className="h-40 bg-gradient-to-br from-primary-50 to-blue-100 flex items-center justify-center relative">
                    {product.image ? <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <span className="text-5xl">🍜</span>}
                    {product.is_recommend && <Badge variant="danger" className="absolute top-3 left-3">推荐</Badge>}
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-gray-800 mb-1">{product.name}</h3>
                    {product.name_en && <p className="text-xs text-gray-400 mb-2">{product.name_en}</p>}
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">{product.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-primary-600">${product.price?.toFixed(2)}</span>
                      <Button size="sm" onClick={() => handleAdd(product)} disabled={!business.open}>{business.open ? '+ 加入' : '休息中'}</Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {totalCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <button onClick={() => setCartOpen(true)} className="flex items-center gap-3 flex-1">
              <div className="relative">
                <span className="text-2xl">🛒</span>
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{totalCount}</span>
              </div>
              <div className="text-left">
                <p className="text-sm text-gray-500">共 {totalCount} 件商品</p>
                <p className="font-bold text-primary-600">${subtotal.toFixed(2)}</p>
              </div>
            </button>
            <Button onClick={handleCheckout} className="px-8">去结算</Button>
          </div>
        </div>
      )}

      {cartOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCartOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">购物车 ({totalCount})</h2>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowHistory(!showHistory)} className="text-sm text-primary-600 hover:text-primary-700">{showHistory ? '返回购物车' : '历史记录'}</button>
                <button onClick={() => setCartOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {showHistory ? (
                <div className="space-y-4">
                  {history.length === 0 ? <Empty text="暂无历史订单" icon="📋" /> : history.map(record => (
                    <div key={record.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400">{record.date}</span>
                        <span className="text-sm font-bold text-primary-600">${record.total.toFixed(2)}</span>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">{record.items.map((item, i) => <span key={i}>{item.name}×{item.quantity}{i < record.items.length - 1 ? '、' : ''}</span>)}</div>
                      <Button size="sm" variant="outline" onClick={() => { reorderFromHistory(record.id); toast('已加入购物车') }}>再来一单</Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {items.length === 0 ? <Empty text="购物车是空的" icon="🛒" /> : items.map(item => (
                    <div key={item.cartId} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-gray-800 text-sm">{item.name}</p>
                          {item.note && <span className="inline-block mt-1 text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded">📝 {item.note}</span>}
                        </div>
                        <span className="font-bold text-primary-600 text-sm">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQuantity(item.cartId, item.quantity - 1)} className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 flex items-center justify-center text-sm">−</button>
                          <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.cartId, item.quantity + 1)} className="w-6 h-6 rounded-full bg-primary-100 hover:bg-primary-200 text-primary-600 flex items-center justify-center text-sm">+</button>
                        </div>
                        <div className="flex gap-2 text-xs">
                          <button onClick={() => openNoteDialog(item)} className="text-primary-600 hover:text-primary-700">{item.note ? '改备注' : '加备注'}</button>
                          <button onClick={() => removeItem(item.cartId)} className="text-red-400 hover:text-red-600">删除</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!showHistory && items.length > 0 && (
              <div className="p-4 border-t bg-white">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-600">合计</span>
                  <span className="text-xl font-bold text-primary-600">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={clear} className="flex-1">清空</Button>
                  <Button onClick={handleCheckout} className="flex-1">去结算</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {noteDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setNoteDialog(null)} />
          <div className="relative bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-gray-800 mb-1">添加备注</h3>
            <p className="text-sm text-gray-500 mb-4">商品：{noteDialog.name}</p>
            <Input placeholder="例如：少冰、半糖、不要香菜..." value={noteText} onChange={e => setNoteText(e.target.value)} />
            <p className="text-xs text-gray-400 mt-2">不同备注的同款商品会分开计算</p>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => setNoteDialog(null)} className="flex-1">取消</Button>
              <Button onClick={saveNote} className="flex-1">保存</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
