import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { useCart } from '../../context/CartContext'
import { Button, Badge, Empty, toast } from '../../components/ui'

export default function Menu() {
  const { addItem, totalCount } = useCart()
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [business, setBusiness] = useState({ open: true })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [cats, prods, info] = await Promise.all([
        api.getAllCategories(),
        api.getAllProducts(),
        api.getBusinessInfo()
      ])
      setCategories(Array.isArray(cats) ? cats : [])
      setProducts(Array.isArray(prods) ? prods.filter(p => p.available) : [])
      setBusiness(info || { open: true })
    } catch (e) {
      console.error('加载菜单失败', e)
    }
  }

  const filtered = activeCategory === 'all' ? products : products.filter(p => p.category_id == activeCategory)

  const handleAdd = (product) => {
    if (!business.open) return
    addItem(product)
    toast(`已添加 ${product.name}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="bg-white border-b sticky top-16 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="text-gray-600 hover:text-primary-600 text-sm">← 返回首页</Link>
          <Link to="/cart" className="relative flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-full text-sm hover:bg-primary-700 transition-colors">
            <span>🛒 购物车</span>
            {totalCount > 0 && <span className="bg-white text-primary-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{totalCount}</span>}
          </Link>
        </div>
      </div>

      {!business.open && (
        <div className="bg-red-50 border-b border-red-200 py-3">
          <p className="text-center text-red-600 text-sm">⏰ 店铺今日休息，暂不接单</p>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          <button onClick={() => setActiveCategory('all')} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${activeCategory === 'all' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>全部</button>
          {categories.map(c => (
            <button key={c.id} onClick={() => setActiveCategory(c.id)} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${activeCategory == c.id ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>{c.name}</button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <Empty text="暂无商品" icon="🍜" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(product => (
              <div key={product.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow border border-gray-100">
                <div className="h-48 bg-gradient-to-br from-primary-50 to-blue-100 relative">
                  {product.image ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-6xl">🍜</div>}
                  {product.is_recommend && <Badge className="absolute top-3 left-3">推荐</Badge>}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-800 text-lg">{product.name}</h3>
                  {product.name_en && <p className="text-xs text-gray-400 mt-0.5">{product.name_en}</p>}
                  {product.description && <p className="text-sm text-gray-500 mt-2 line-clamp-2">{product.description}</p>}
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xl font-bold text-primary-600">${product.price?.toFixed(2)}</span>
                    <Button size="sm" onClick={() => handleAdd(product)} disabled={!business.open}>+ 加入</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
