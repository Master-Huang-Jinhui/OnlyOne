import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { initTableFromUrl } from '../../lib/guest'
import { useCart } from '../../context/CartContext'
import { useLanguage } from '../../context/LanguageContext'
import { Button, Badge, Empty, toast } from '../../components/ui'

const FALLBACK_IMG = 'data:image/svg+xml,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
<rect width="400" height="300" fill="#f1f5f9"/>
<text x="200" y="170" font-size="80" text-anchor="middle">🍽️</text>
</svg>`)

export default function Menu() {
  const navigate = useNavigate()
  const { t, language } = useLanguage()
  const { items, addItem, updateQuantity, updateNotes, removeItem, subtotal, totalCount, history, reorderFromHistory, getItemUnitPrice, getTagInfo, calcTagsExtraPrice, addSplitFlavor } = useCart()
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [business, setBusiness] = useState({ open: true })
  const [cartOpen, setCartOpen] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [imgErrors, setImgErrors] = useState({})

  const [dialogItem, setDialogItem] = useState(null)
  const [dialogTags, setDialogTags] = useState([])
  const [selectedTags, setSelectedTags] = useState([])
  const [customNote, setCustomNote] = useState('')
  const [splitQty, setSplitQty] = useState(1)

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {})
    api.getProducts().then(setProducts).catch(() => {})
    api.getTodayBusiness().then(setBusiness).catch(() => {})
    initTableFromUrl()
  }, [])

  const filtered = activeCategory === 'all' ? products : products.filter(p => p.category_id == activeCategory)

  const getItemCount = (productId) => {
    return items.filter(i => i.id === productId).reduce((sum, i) => sum + i.quantity, 0)
  }

  const handleAdd = async (product) => {
    if (!business.open) return
    try {
      const data = await api.getFlavorTags(product.category_id)
      const defaults = (data.tags || []).filter(x => x.is_default).map(x => x.name)
      addItem(product, defaults)
    } catch {
      addItem(product, [])
    }
    toast(`${product.name} 已加入购物车`, 'success')
  }

  const handleCardMinus = (product) => {
    const matching = items.filter(i => i.id === product.id)
    if (matching.length === 0) return
    const first = matching[0]
    if (first.quantity <= 1) removeItem(first.cartId)
    else updateQuantity(first.cartId, first.quantity - 1)
  }

  const openTagsDialog = async (item) => {
    try {
      const data = await api.getFlavorTags(item.category_id)
      setDialogTags(data.tags || [])
    } catch {
      setDialogTags([])
    }
    setDialogItem(item)
    setSelectedTags([...(item.notes || [])])
    setCustomNote('')
    setSplitQty(1)
  }

  const singleChoiceCategories = ['辣度', '冰度', '甜度']

  const toggleTag = (tagName, category) => {
    setSelectedTags(prev => {
      if (singleChoiceCategories.includes(category)) {
        const sameCatTags = dialogTags.filter(x => x.category === category).map(x => x.name)
        const filtered = prev.filter(t => !sameCatTags.includes(t))
        if (filtered.includes(tagName)) return filtered
        return [...filtered, tagName]
      }
      return prev.includes(tagName) ? prev.filter(t => t !== tagName) : [...prev, tagName]
    })
  }

  const saveTags = () => {
    if (!dialogItem) return
    const finalTags = customNote.trim() ? [...selectedTags, customNote.trim()] : selectedTags
    const qty = dialogItem.quantity
    if (qty > 1 && splitQty < qty) {
      addSplitFlavor(dialogItem.cartId, splitQty, finalTags)
      toast(`已将 ${splitQty} 份改为新口味`, 'success')
    } else {
      updateNotes(dialogItem.cartId, finalTags)
    }
    setDialogItem(null)
    setDialogTags([])
    setCustomNote('')
  }

  const handleCheckout = () => {
    if (items.length === 0) { toast('购物车是空的', 'error'); return }
    setCartOpen(false)
    navigate('/checkout')
  }

  const dialogTagsByCategory = useMemo(() => {
    const groups = {}
    dialogTags.forEach(tag => {
      if (!groups[tag.category]) groups[tag.category] = []
      groups[tag.category].push(tag)
    })
    return groups
  }, [dialogTags])

  const renderTags = (tags = [], small = false) => (
    <div className={`flex flex-wrap gap-1 ${small ? 'mt-1' : 'mt-2'}`}>
      {tags.map((tagName, i) => {
        const info = getTagInfo(tagName)
        return (
          <span key={i} className={`inline-flex items-center gap-0.5 bg-primary-50 text-primary-700 rounded-full ${small ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'}`}>
            {tagName}
            {info.extra_price > 0 && <span className="text-primary-500">+${info.extra_price.toFixed(2)}</span>}
          </span>
        )
      })}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* 顶部栏 */}
      <div className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
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

      {/* 主体：左侧分类栏 + 右侧商品 */}
      <div className="max-w-7xl mx-auto flex gap-0">
        {/* 桌面端左侧固定分类栏 */}
        <aside className="hidden lg:block w-48 shrink-0 border-r border-gray-200 bg-white sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
          <nav className="py-4">
            <button
              onClick={() => setActiveCategory('all')}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                activeCategory === 'all'
                  ? 'bg-primary-50 text-primary-600 font-bold border-r-2 border-primary-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              全部
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  activeCategory == cat.id
                    ? 'bg-primary-50 text-primary-600 font-bold border-r-2 border-primary-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </nav>
        </aside>

        {/* 右侧商品区 */}
        <main className="flex-1 px-4 py-6 min-w-0">
          {/* 移动端/平板：横滑分类标签 */}
          <div className="lg:hidden flex gap-2 overflow-x-auto pb-2 mb-4">
            <button onClick={() => setActiveCategory('all')} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${activeCategory === 'all' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>全部</button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${activeCategory == cat.id ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>{cat.name}</button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <Empty text="该分类暂无商品" icon="🍽️" />
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map(product => {
                const count = getItemCount(product.id)
                return (
                  <div key={product.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-lg transition-all group">
                    <div className="h-40 bg-gray-100 relative overflow-hidden">
                      <img
                        src={imgErrors[product.id] ? FALLBACK_IMG : (product.image || FALLBACK_IMG)}
                        alt={product.name}
                        onError={() => setImgErrors(prev => ({ ...prev, [product.id]: true }))}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      {product.is_recommend && <Badge variant="danger" className="absolute top-2 left-2">推荐</Badge>}
                      {count > 0 && (
                        <div className="absolute top-2 right-2 bg-primary-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow">×{count}</div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-gray-800 mb-0.5">{language === 'en' ? (product.name_en || product.name) : product.name}</h3>
                      {language !== 'en' && product.name_en && <p className="text-xs text-gray-400 mb-2">{product.name_en}</p>}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-lg font-bold text-primary-600">${product.price?.toFixed(2)}</span>
                        {count === 0 ? (
                          <Button size="sm" onClick={() => handleAdd(product)} disabled={!business.open}>
                            {business.open ? '+ 加入' : '休息中'}
                          </Button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleCardMinus(product)} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-bold">−</button>
                            <span className="w-6 text-center font-bold text-primary-600">{count}</span>
                            <button onClick={() => handleAdd(product)} className="w-7 h-7 rounded-full bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center font-bold">+</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>

      {/* 底部购物车栏 */}
      {totalCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <button onClick={() => setCartOpen(true)} className="flex items-center gap-3 flex-1">
              <div className="relative">
                <span className="text-2xl">🛒</span>
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{totalCount}</span>
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-500">共 {totalCount} 件商品 · 点此查看</p>
                <p className="font-bold text-primary-600">${subtotal.toFixed(2)}</p>
              </div>
            </button>
            <Button onClick={handleCheckout} className="px-8">去结算</Button>
          </div>
        </div>
      )}

      {/* 购物车抽屉 */}
      {cartOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCartOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">购物车 ({totalCount})</h2>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowHistory(!showHistory)} className="text-sm text-primary-600">
                  {showHistory ? '返回购物车' : '历史订单'}
                </button>
                <button onClick={() => setCartOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {showHistory ? (
                <div className="space-y-3">
                  {history.length === 0 ? <Empty text="暂无历史订单" icon="📋" /> : history.map(record => (
                    <div key={record.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">{record.date}</span>
                        <span className="text-sm font-bold text-primary-600">${record.total.toFixed(2)}</span>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">{record.items.map((item, i) => <span key={i}>{item.name}×{item.quantity}{i < record.items.length - 1 ? '、' : ''}</span>)}</div>
                      <Button size="sm" variant="outline" onClick={() => { reorderFromHistory(record.id); toast('已加入购物车', 'success') }}>再来一单</Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {items.length === 0 ? <Empty text="购物车是空的" icon="🛒" /> : items.map(item => {
                    const unitPrice = getItemUnitPrice(item)
                    return (
                      <div key={item.cartId} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex-1">
                            <p className="font-medium text-gray-800 text-sm">{item.name}</p>
                            {item.notes && item.notes.length > 0 && renderTags(item.notes, true)}
                          </div>
                          <span className="font-bold text-primary-600 text-sm">${(unitPrice * item.quantity).toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <button onClick={() => updateQuantity(item.cartId, item.quantity - 1)} className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 flex items-center justify-center text-sm">−</button>
                            <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.cartId, item.quantity + 1)} className="w-6 h-6 rounded-full bg-primary-100 hover:bg-primary-200 text-primary-600 flex items-center justify-center text-sm">+</button>
                          </div>
                          <div className="flex gap-2 text-xs">
                            <button onClick={() => openTagsDialog(item)} className="text-primary-600 hover:text-primary-700">
                              {item.notes && item.notes.length > 0 ? '改口味' : '选口味'}
                            </button>
                            <button onClick={() => removeItem(item.cartId)} className="text-red-400 hover:text-red-600">删除</button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {!showHistory && items.length > 0 && (
              <div className="p-4 border-t bg-white space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">合计</span>
                  <span className="text-xl font-bold text-primary-600">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setCartOpen(false); toast('继续点餐', 'info') }} className="flex-1">继续点餐</Button>
                  <Button onClick={handleCheckout} className="flex-1">去结算</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 口味弹窗 */}
      {dialogItem && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDialogItem(null)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800">选择口味</h3>
                <p className="text-xs text-gray-400 mt-0.5">{dialogItem.name} ×{dialogItem.quantity}</p>
              </div>
              <button onClick={() => setDialogItem(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {dialogItem.quantity > 1 && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-gray-700 mb-2">改几份为新口味？（共{dialogItem.quantity}份）</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSplitQty(Math.max(1, splitQty - 1))} className="w-7 h-7 rounded-full bg-white border border-gray-200 hover:border-primary-400 text-gray-600">−</button>
                    <span className="w-8 text-center font-bold text-primary-600">{splitQty}</span>
                    <button onClick={() => setSplitQty(Math.min(dialogItem.quantity, splitQty + 1))} className="w-7 h-7 rounded-full bg-primary-600 text-white">+</button>
                    <span className="text-xs text-gray-400 ml-2">剩下{dialogItem.quantity - splitQty}份保留原口味</span>
                  </div>
                </div>
              )}

              {Object.entries(dialogTagsByCategory).map(([category, tags]) => (
                <div key={category}>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    {category}
                    {singleChoiceCategories.includes(category) && <span className="text-xs text-gray-400 ml-2 font-normal">（单选）</span>}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => {
                      const selected = selectedTags.includes(tag.name)
                      return (
                        <button
                          key={tag.name}
                          onClick={() => toggleTag(tag.name, category)}
                          className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                            selected
                              ? 'bg-primary-600 text-white border-primary-600'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
                          }`}
                        >
                          {tag.name}
                          {tag.extra_price > 0 && <span className={selected ? 'text-primary-100 ml-1' : 'text-gray-400 ml-1'}>+${tag.extra_price.toFixed(2)}</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
              <div>
                <input
                  type="text"
                  value={customNote}
                  onChange={e => setCustomNote(e.target.value)}
                  placeholder="自定义备注（如：少冰、不要香菜等）"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="p-4 border-t bg-white">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-gray-500">已选 {selectedTags.length} 项</span>
                <span className="text-sm text-primary-600">+${calcTagsExtraPrice(selectedTags).toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedTags([])} className="flex-1">清空</Button>
                <Button onClick={saveTags} className="flex-1">确认</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
