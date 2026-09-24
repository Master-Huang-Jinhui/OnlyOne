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

  // 口味标签中英映射表（中文名 -> {name_en, category_en}），运行时累积
  const [tagMap, setTagMap] = useState({})
  const [catMap, setCatMap] = useState({})

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {})
    api.getProducts().then(setProducts).catch(() => {})
    api.getTodayBusiness().then(setBusiness).catch(() => {})
    initTableFromUrl()
  }, [])

  // 把口味数据中的英文信息收录到映射表，供前台显示用
  const ingestFlavorData = (data) => {
    if (!data) return
    const tags = data.tags || []
    const newTagMap = {}
    const newCatMap = {}
    tags.forEach(tag => {
      if (tag.name) newTagMap[tag.name] = tag
      if (tag.category) newCatMap[tag.category] = tag.category_en || ''
    })
    // 大类信息从 data.grouped 或 categories 拿不到 name_en，这里由 flavorCategories list 补充
    if (data.categories) {
      data.categories.forEach(cat => {
        if (cat.name) newCatMap[cat.name] = cat.name_en || ''
      })
    }
    setTagMap(prev => ({ ...prev, ...newTagMap }))
    setCatMap(prev => ({ ...prev, ...newCatMap }))
  }

  // 根据当前语言返回口味标签显示名
  const dispTag = (name) => {
    if (language === 'en' && tagMap[name]?.name_en) return tagMap[name].name_en
    return name
  }
  // 根据当前语言返回口味大类显示名
  const dispCat = (name) => {
    if (language === 'en' && catMap[name]) return catMap[name]
    return name
  }

  const filtered = activeCategory === 'all' ? products : products.filter(p => p.category_id == activeCategory)

  const getItemCount = (productId) => {
    return items.filter(i => i.id === productId).reduce((sum, i) => sum + i.quantity, 0)
  }

  const handleAdd = async (product) => {
    if (!business.open) return
    try {
      const data = await api.getFlavorTags(product.category_id)
      ingestFlavorData(data)
      const defaults = (data.tags || []).filter(x => x.is_default).map(x => x.name)
      addItem(product, defaults)
    } catch {
      addItem(product, [])
    }
    toast(`${language === 'en' ? product.name_en || product.name : product.name} ${language === 'en' ? 'added to cart' : '已加入购物车'}`, 'success')
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
      ingestFlavorData(data)
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
      toast(language === 'en' ? `Changed ${splitQty} items to new flavor` : `已将 ${splitQty} 份改为新口味`, 'success')
    } else {
      updateNotes(dialogItem.cartId, finalTags)
    }
    setDialogItem(null)
    setDialogTags([])
    setCustomNote('')
  }

  const handleCheckout = () => {
    if (items.length === 0) { toast(language === 'en' ? 'Cart is empty' : '购物车是空的', 'error'); return }
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
            {dispTag(tagName)}
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
          <Link to="/" className="text-gray-600 hover:text-primary-600 text-sm">{language === 'en' ? '← Back' : '← 返回首页'}</Link>
          <h1 className="text-lg font-bold text-gray-800">{language === 'en' ? 'Menu' : '菜单'}</h1>
          <button onClick={() => setCartOpen(true)} className="relative p-2 text-gray-600 hover:text-primary-600">
            <span className="text-xl">🛒</span>
            {totalCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{totalCount}</span>}
          </button>
        </div>
      </div>

      {!business.open && (
        <div className="bg-yellow-50 border-b border-yellow-200 text-center py-3">
          <p className="text-yellow-700 text-sm">{language === 'en' ? '⚠️ Closed today, no orders accepted' : '⚠️ 今日门店休息，暂不接受下单'}</p>
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
              {language === 'en' ? 'All' : '全部'}
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
                {language === 'en' ? (cat.name_en || cat.name) : cat.name}
              </button>
            ))}
          </nav>
        </aside>

        {/* 商品区 */}
        <main className="flex-1 min-w-0">
          {/* 移动端横滑分类 */}
          <div className="lg:hidden sticky top-14 z-20 bg-white border-b overflow-x-auto">
            <div className="flex gap-2 p-3">
              <button onClick={() => setActiveCategory('all')} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${activeCategory === 'all' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>{language === 'en' ? 'All' : '全部'}</button>
              {categories.map(cat => (
                <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${activeCategory == cat.id ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>{language === 'en' ? (cat.name_en || cat.name) : cat.name}</button>
              ))}
            </div>
          </div>

          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(product => {
              const count = getItemCount(product.id)
              const imgError = imgErrors[product.id]
              return (
                <div key={product.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="h-40 bg-gray-100 relative">
                    <img
                      src={imgError ? FALLBACK_IMG : (product.image || FALLBACK_IMG)}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={() => setImgErrors(prev => ({ ...prev, [product.id]: true }))}
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-gray-800 mb-0.5">{language === 'en' ? (product.name_en || product.name) : product.name}</h3>
                    {language !== 'en' && product.name_en && <p className="text-xs text-gray-400 mb-2">{product.name_en}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-primary-600 font-bold">${Number(product.price).toFixed(2)}</span>
                      {count === 0 ? (
                        <Button size="sm" onClick={() => handleAdd(product)} disabled={!business.open}>{language === 'en' ? 'Add' : '加入'}</Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleCardMinus(product)} className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200">−</button>
                          <span className="font-bold text-gray-800 w-5 text-center">{count}</span>
                          <Button size="sm" onClick={() => handleAdd(product)} disabled={!business.open}>+</Button>
                        </div>
                      )}
                    </div>
                    {count > 0 && (
                      <button onClick={() => openTagsDialog(items.find(i => i.id === product.id))} className="text-xs text-primary-600 mt-2 hover:underline">
                        {language === 'en' ? 'Customize flavors' : '选择/修改口味'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </main>
      </div>

      {/* 购物车抽屉 */}
      {cartOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-bold text-lg">{language === 'en' ? 'Your Cart' : '购物车'}</h3>
              <button onClick={() => setCartOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-4 space-y-4">
              {items.length === 0 ? (
                <Empty text={language === 'en' ? 'Cart is empty' : '购物车是空的'} icon="🛒" />
              ) : items.map(item => (
                <div key={item.cartId} className="flex gap-3 pb-4 border-b">
                  <img src={imgErrors[item.id] ? FALLBACK_IMG : (item.image || FALLBACK_IMG)} className="w-16 h-16 rounded-lg object-cover" onError={() => setImgErrors(prev => ({ ...prev, [item.id]: true }))} />
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 text-sm">{language === 'en' ? (item.name_en || item.name) : item.name}</p>
                    {renderTags(item.notes || [], true)}
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQuantity(item.cartId, item.quantity - 1)} className="w-6 h-6 rounded-full bg-gray-100 text-gray-600">−</button>
                        <span className="text-sm">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.cartId, item.quantity + 1)} className="w-6 h-6 rounded-full bg-primary-600 text-white">+</button>
                      </div>
                      <span className="text-primary-600 font-bold">${(getItemUnitPrice(item) * item.quantity).toFixed(2)}</span>
                    </div>
                    <button onClick={() => openTagsDialog(item)} className="text-xs text-primary-600 mt-1 hover:underline">{language === 'en' ? 'Edit flavors' : '修改口味'}</button>
                  </div>
                </div>
              ))}
            </div>
            {items.length > 0 && (
              <div className="p-4 border-t sticky bottom-0 bg-white">
                <div className="flex justify-between mb-3">
                  <span className="text-gray-500">{language === 'en' ? 'Subtotal' : '小计'}</span>
                  <span className="font-bold text-lg">${subtotal.toFixed(2)}</span>
                </div>
                <Button className="w-full" onClick={handleCheckout}>{language === 'en' ? 'Checkout' : '去结算'}</Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 历史订单 */}
      {showHistory && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowHistory(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-lg">{language === 'en' ? 'Order History' : '历史订单'}</h3>
              <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-4 space-y-3">
              {(!history || history.length === 0) ? (
                <Empty text={language === 'en' ? 'No orders yet' : '暂无历史订单'} icon="📋" />
              ) : history.map(record => (
                <div key={record.id} className="border rounded-lg p-3">
                  <p className="text-xs text-gray-400">{record.time}</p>
                  <div className="text-sm text-gray-600 mb-2">{record.items.map((item, i) => <span key={i}>{item.name}×{item.quantity}{i < record.items.length - 1 ? '、' : ''}</span>)}</div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold">${record.total.toFixed(2)}</span>
                    <Button size="sm" variant="outline" onClick={() => { reorderFromHistory(record); setShowHistory(false); toast(language === 'en' ? 'Added to cart' : '已重新加入购物车', 'success') }}>{language === 'en' ? 'Reorder' : '再来一单'}</Button>
                  </div>
                </div>
              ))}
            </div>
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
                <h3 className="font-bold text-gray-800">{language === 'en' ? 'Choose Flavors' : '选择口味'}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{language === 'en' ? (dialogItem.name_en || dialogItem.name) : dialogItem.name} ×{dialogItem.quantity}</p>
              </div>
              <button onClick={() => setDialogItem(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {dialogItem.quantity > 1 && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-gray-700 mb-2">{language === 'en' ? `Change how many to new flavor? (${dialogItem.quantity} total)` : `改几份为新口味？（共${dialogItem.quantity}份）`}</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSplitQty(Math.max(1, splitQty - 1))} className="w-7 h-7 rounded-full bg-white border border-gray-200 hover:border-primary-400 text-gray-600">−</button>
                    <span className="w-8 text-center font-bold text-primary-600">{splitQty}</span>
                    <button onClick={() => setSplitQty(Math.min(dialogItem.quantity, splitQty + 1))} className="w-7 h-7 rounded-full bg-primary-600 text-white">+</button>
                    <span className="text-xs text-gray-400 ml-2">{language === 'en' ? `${dialogItem.quantity - splitQty} keep original` : `剩下${dialogItem.quantity - splitQty}份保留原口味`}</span>
                  </div>
                </div>
              )}

              {Object.entries(dialogTagsByCategory).map(([category, tags]) => (
                <div key={category}>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    {dispCat(category)}
                    {singleChoiceCategories.includes(category) && <span className="text-xs text-gray-400 ml-2 font-normal">（{language === 'en' ? 'single select' : '单选'}）</span>}
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
                          {dispTag(tag.name)}
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
                  placeholder={language === 'en' ? 'Custom note (e.g. no cilantro)' : '自定义备注（如：少冰、不要香菜等）'}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="p-4 border-t bg-white">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-gray-500">{language === 'en' ? `Selected ${selectedTags.length}` : `已选 ${selectedTags.length} 项`}</span>
                <span className="text-sm text-primary-600">+${calcTagsExtraPrice(selectedTags).toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedTags([])} className="flex-1">{language === 'en' ? 'Clear' : '清空'}</Button>
                <Button onClick={saveTags} className="flex-1">{language === 'en' ? 'Confirm' : '确认'}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
