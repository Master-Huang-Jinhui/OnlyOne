import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { useCart } from '../../context/CartContext'
import { Button, Badge } from '../../components/ui'

const sections = [
  { id: 'brand', label: '品牌' }, { id: 'tea', label: '茶品' }, { id: 'craft', label: '工艺' },
  { id: 'about', label: '关于' }, { id: 'menu', label: '菜单' }, { id: 'contact', label: '联系' }
]

export default function Home() {
  const navigate = useNavigate()
  const { addItem, totalCount } = useCart()
  const [carousel, setCarousel] = useState([])
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [settings, setSettings] = useState({})
  const [activeSection, setActiveSection] = useState('brand')
  const [currentSlide, setCurrentSlide] = useState(0)
  const [business, setBusiness] = useState({ open: true })
  const [contentSections, setContentSections] = useState([])

  useEffect(() => {
    api.getCarousel().then(setCarousel).catch(() => {})
    api.getProducts().then(setProducts).catch(() => {})
    api.getCategories().then(setCategories).catch(() => {})
    api.getSettings().then(setSettings).catch(() => {})
    api.getTodayBusiness().then(setBusiness).catch(() => {})
    api.getContentSections().then(data => setContentSections(Array.isArray(data) ? data : [])).catch(() => {})
  }, [])

  // 轮播自动播放
  useEffect(() => {
    if (carousel.length <= 1) return
    const timer = setInterval(() => setCurrentSlide(p => (p + 1) % carousel.length), 4000)
    return () => clearInterval(timer)
  }, [carousel.length])

  // 滚动监听
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) { entry.target.classList.add('visible'); setActiveSection(entry.target.id) }
        })
      },
      { threshold: 0.3 }
    )
    sections.forEach(s => { const el = document.getElementById(s.id); if (el) observer.observe(el) })
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [products])

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleAddToCart = (product) => {
    addItem(product)
    navigate('/cart')
  }

  const teaSourcing = settings.tea_sourcing || [
    { name: '乌龙茶', name_en: 'Oolong Tea', desc: '醇厚回甘', desc_en: 'Rich and smooth' },
    { name: '绿茶', name_en: 'Green Tea', desc: '清新自然', desc_en: 'Fresh and natural' },
    { name: '红茶', name_en: 'Black Tea', desc: '香浓顺滑', desc_en: 'Fragrant and smooth' }
  ]

  const craftPhilosophy = settings.craft_philosophy || [
    { name: '原叶现萃', name_en: 'Fresh Brewed' },
    { name: '鲜果鲜做', name_en: 'Fresh Fruit' },
    { name: '甜度可控', name_en: 'Adjustable Sweetness' },
    { name: '现点现做', name_en: 'Made to Order' }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* 导航栏 */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🍵</span>
            <span className="text-xl font-bold text-primary-700">Only One</span>
            <span className="text-xs text-gray-400 hidden sm:block">BBQ & Tea</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm">
            {sections.map(s => (<button key={s.id} onClick={() => scrollTo(s.id)} className="text-gray-600 hover:text-primary-600">{s.label}</button>))}
          </div>
          <div className="flex items-center gap-3">
            <Link to="/cart" className="relative p-2 text-gray-600 hover:text-primary-600">
              <span className="text-xl">🛒</span>
              {totalCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{totalCount}</span>}
            </Link>
            <Link to="/login" className="text-sm text-primary-600 hover:text-primary-700 font-medium">管理登录</Link>
          </div>
        </div>
      </nav>

      {/* 右侧悬浮导航 */}
      <div className="float-nav">
        {sections.map(s => (
          <div key={s.id} className={`float-nav-dot ${activeSection === s.id ? 'active' : ''}`} onClick={() => scrollTo(s.id)}>
            <span className="tooltip">{s.label}</span>
          </div>
        ))}
      </div>

      {/* 轮播图 */}
      <section className="pt-16">
        <div className="relative w-full h-[400px] md:h-[500px] overflow-hidden bg-gradient-to-br from-primary-100 via-blue-50 to-white">
          {carousel.length > 0 ? carousel.map((item, i) => (
            <div key={i} className={`absolute inset-0 transition-opacity duration-1000 ${i === currentSlide ? 'opacity-100' : 'opacity-0'}`}>
              {item.image ? <img src={item.image} alt={item.title} className="w-full h-full object-cover" /> : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🍵🔥</div>
                    <h2 className="text-3xl md:text-5xl font-bold text-primary-800 mb-3">{item.title || 'Only One BBQ & Tea'}</h2>
                    <p className="text-lg text-primary-600">烧烤 + 新式茶饮 · 法拉盛</p>
                  </div>
                </div>
              )}
            </div>
          )) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">🍵🔥</div>
                <h2 className="text-3xl md:text-5xl font-bold text-primary-800 mb-3">Only One BBQ & Tea</h2>
                <p className="text-lg text-primary-600">烧烤 + 新式茶饮 · 法拉盛</p>
              </div>
            </div>
          )}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {carousel.map((_, i) => (<button key={i} onClick={() => setCurrentSlide(i)} className={`w-2.5 h-2.5 rounded-full transition-all ${i === currentSlide ? 'bg-primary-600 w-8' : 'bg-white/60'}`} />))}
          </div>
        </div>
      </section>

      {/* 品牌故事 */}
      <section id="brand" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center reveal">
          <Badge variant="primary" className="mb-4">品牌故事</Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">{settings.brand_story ? settings.brand_story.split('，')[0] : '法拉盛门店'}</h2>
          <p className="text-lg text-gray-600 leading-relaxed">{settings.brand_story || '法拉盛门店，烧烤 + 新式茶饮定位'}</p>
          {settings.brand_story_en && <p className="text-md text-gray-400 mt-3 italic">{settings.brand_story_en}</p>}
        </div>
      </section>

      {/* 茶品溯源 */}
      <section id="tea" className="py-20 bg-gradient-to-b from-blue-50/50 to-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12 reveal"><Badge variant="primary" className="mb-4">茶品溯源</Badge><h2 className="text-3xl md:text-4xl font-bold text-gray-800">精选好茶</h2></div>
          <div className="grid md:grid-cols-3 gap-8">
            {teaSourcing.map((tea, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow reveal" style={{ transitionDelay: `${i * 100}ms` }}>
                <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center text-3xl mb-4">{i === 0 ? '🍂' : i === 1 ? '🌿' : '🍃'}</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{tea.name}</h3>
                <p className="text-sm text-gray-400 mb-3">{tea.name_en}</p>
                <p className="text-gray-600">{tea.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 奶茶工艺理念 */}
      <section id="craft" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12 reveal"><Badge variant="primary" className="mb-4">奶茶工艺</Badge><h2 className="text-3xl md:text-4xl font-bold text-gray-800">我们的理念</h2></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {craftPhilosophy.map((item, i) => (
              <div key={i} className="text-center p-6 rounded-xl bg-gradient-to-br from-primary-50 to-blue-50 reveal" style={{ transitionDelay: `${i * 100}ms` }}>
                <div className="text-4xl mb-3">{i === 0 ? '🫖' : i === 1 ? '🍓' : i === 2 ? '📏' : '⚡'}</div>
                <h3 className="font-bold text-gray-800 mb-1">{item.name}</h3>
                <p className="text-xs text-gray-400">{item.name_en}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 关于区块 */}
      <section id="about" className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 text-center reveal">
          <Badge variant="primary" className="mb-4">关于我们</Badge>
          <h2 className="text-3xl font-bold text-gray-800 mb-6">{settings.about_text || '关于我们'}</h2>
          <p className="text-gray-600 leading-relaxed">Only One BBQ & Tea 致力于为顾客提供最优质的烧烤和新式茶饮体验。我们坚持选用新鲜食材，现点现做，让每一位顾客都能品尝到最地道的美味。</p>
        </div>
      </section>

      {/* 自定义内容板块 */}
      {contentSections.map((section, idx) => (
        <section key={section.id} className={`py-20 ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
          <div className="max-w-4xl mx-auto px-4 text-center reveal">
            <div className="text-4xl mb-4">{section.icon || '📌'}</div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">{section.title}</h2>
            {section.title_en && <p className="text-sm text-gray-400 mb-6 tracking-wider uppercase">{section.title_en}</p>}
            {section.content && <p className="text-gray-600 leading-relaxed whitespace-pre-line max-w-2xl mx-auto">{section.content}</p>}
            {section.content_en && <p className="text-gray-400 text-sm leading-relaxed mt-4 max-w-2xl mx-auto">{section.content_en}</p>}
          </div>
        </section>
      ))}

      {/* 商品菜单 */}
      <section id="menu" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12 reveal">
            <Badge variant="primary" className="mb-4">精选菜单</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">美味即刻拥有</h2>
            <Link to="/menu">
              <Button variant="outline">查看完整菜单 →</Button>
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.slice(0, 6).map((product, i) => (
              <div key={product.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-lg transition-all reveal group" style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="h-44 bg-gradient-to-br from-primary-50 to-blue-100 flex items-center justify-center relative overflow-hidden">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <span className="text-5xl">🍜</span>
                  )}
                  {product.is_recommend && <span className="absolute top-3 left-3 bg-red-500 text-white text-xs px-2 py-1 rounded-full">推荐</span>}
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-gray-800 mb-1">{product.name}</h3>
                  {product.name_en && <p className="text-xs text-gray-400 mb-2">{product.name_en}</p>}
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{product.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-primary-600">${product.price?.toFixed(2)}</span>
                    <Button size="sm" onClick={() => handleAddToCart(product)} disabled={!business.open}>{business.open ? '加入购物车' : '休息中'}</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 联系我们 */}
      <section id="contact" className="py-20 bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center reveal">
          <h2 className="text-3xl font-bold mb-8">联系我们</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div><div className="text-3xl mb-3">📍</div><h3 className="font-semibold mb-2">地址</h3><p className="text-primary-100 text-sm">{settings.address || '162-01 Sanford Ave, Flushing, NY'}</p></div>
            <div><div className="text-3xl mb-3">📞</div><h3 className="font-semibold mb-2">电话</h3><p className="text-primary-100 text-sm">{settings.phone || '欢迎来电咨询'}</p></div>
            <div><div className="text-3xl mb-3">🕐</div><h3 className="font-semibold mb-2">营业时间</h3><p className="text-primary-100 text-sm">{business.open ? `今日营业 ${business.open_time} - ${business.close_time}` : '今日休息'}</p></div>
          </div>
        </div>
      </section>

      {/* 页脚 */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-2xl">🍵</span>
            <span className="text-lg font-bold text-white">Only One BBQ & Tea</span>
          </div>
          <p className="text-sm">© 2024 Only One BBQ & Tea. All rights reserved.</p>
          <p className="text-xs mt-2 text-gray-500">一站式管理系统</p>
        </div>
      </footer>
    </div>
  )
}
