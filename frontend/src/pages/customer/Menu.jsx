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
    api.getCategories().then(setCategories).catch(() => {})
    api.getProducts().then(setProducts).catch(() => {})
    api.getTodayBusiness().then(setBusiness).catch(() => {})
  }, [])

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
          <h1 className="text-lg font-bold text-gray-800">菜单</h1>
          <Link to="/cart" className="relative p-2 text-gray-600 hover:text-primary-600">
            <span className="text-xl">🛒</span>
            {totalCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{totalCount}</span>}
          </Link>
        </div>
      </div>

      {!business.open && (
        <div className="bg-yellow-50 border-b border-yellow-200 text-center py-3">
          <p className="text-yellow-700 text-sm">⚠️ 今日门店休息，暂不接受下单</p>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeCategory === 'all' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'}`}
          >
            全部
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeCategory == cat.id ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <Empty text="该分类暂无商品" icon="🍽️" />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(product => (
              <div key={product.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-lg transition-all group">
                <div className="h-40 bg-gradient-to-br from-primary-50 to-blue-100 flex items-center justify-center relative">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <span className="text-5xl">🍜</span>
                  )}
                  {product.is_recommend && <Badge variant="danger" className="absolute top-3 left-3">推荐</Badge>}
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-gray-800 mb-1">{product.name}</h3>
                  {product.name_en && <p className="text-xs text-gray-400 mb-2">{product.name_en}</p>}
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{product.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-primary-600">${product.price?.toFixed(2)}</span>
                    <Button size="sm" onClick={() => handleAdd(product)} disabled={!business.open}>
                      {business.open ? '加入购物车' : '休息中'}
                    </Button>
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
