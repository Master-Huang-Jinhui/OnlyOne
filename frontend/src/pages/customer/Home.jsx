import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { useCart } from '../../context/CartContext'
import { useLanguage } from '../../context/LanguageContext'
import { Button, Badge } from '../../components/ui'
import MilkTeaMaker from '../../components/MilkTeaMaker'

export default function Home() {
  const navigate = useNavigate()
  const { addItem, totalCount } = useCart()
  const { language, setLanguage, supportedLanguages, t } = useLanguage()
  const [carousel, setCarousel] = useState([])
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [settings, setSettings] = useState({})
  const [activeSection, setActiveSection] = useState('brand')
  const [currentSlide, setCurrentSlide] = useState(0)
  const [business, setBusiness] = useState({ open: true })
  const [contentSections, setContentSections] = useState([])
  const [newProducts, setNewProducts] = useState([])
  const [langMenuOpen, setLangMenuOpen] = useState(false)

  const teaSourcing = settings.tea_sourcing || [
    { name: '乌龙茶', name_en: 'Oolong Tea', desc: '醇厚回甘', desc_en: 'Rich and smooth' },
    { name: '绿茶', name_en: 'Green Tea', desc: '清新自然', desc_en: 'Fresh and natural' },
    { name: '红茶', name_en: 'Black Tea', desc: '香浓顺滑', desc_en: 'Fragrant and smooth' }
  ]
  const enabledTeas = teaSourcing.filter(t => t.enabled !== false)
  const showTea = settings.show_tea_sourcing !== false && enabledTeas.length > 0

  const sections = [
    { id: 'new', label: t('nav.new') },
    { id: 'brand', label: t('nav.brand') },
    ...(showTea ? [{ id: 'tea', label: t('nav.tea') }] : []),
    { id: 'craft', label: t('nav.craft') },
    { id: 'about', label: t('nav.about') },
    { id: 'menu', label: t('nav.menu') },
    { id: 'contact', label: t('nav.contact') }
  ]

  useEffect(() => {
    api.getCarousel().then(setCarousel).catch(() => {})
    api.getProducts().then(setProducts).catch(() => {})
    api.getCategories().then(setCategories).catch(() => {})
    api.getSettings().then(setSettings).catch(() => {})
    api.getTodayBusiness().then(setBusiness).catch(() => {})
    api.getContentSections().then(data => setContentSections(Array.isArray(data) ? data : [])).catch(() => {})
    api.getNewProducts().then(data => setNewProducts(Array.isArray(data) ? data : [])).catch(() => {})
  }, [])

  // 轮播自动播放
  useEffect(() => {
    if (carousel.length <= 1) return
    const timer = setInterval(() => setCurrentSlide(p => (p + 1) % carousel.length), 4000)
    return () => clearInterval(timer)
  }, [carousel.length])

  // 滚动监听
  useEffect(() => {
    // 区块导航高亮（只处理进入）
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      { threshold: 0.3 }
    )
    sections.forEach(s => {
      const el = document.getElementById(s.id)
      if (el) sectionObserver.observe(el)
    })

    // 淡入淡出动画（进入显示，离开隐藏）
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
          } else {
            entry.target.classList.remove('visible')
          }
        })
      },
      { threshold: 0.15 }
    )
    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el))

    return () => {
      sectionObserver.disconnect()
      revealObserver.disconnect()
    }
  }, [products])

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleAddToCart = (product) => {
    addItem(product)
    navigate('/cart')
  }

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
            {sections.map(s => (
              <button key={s.id} onClick={() => scrollTo(s.id)} className="text-gray-600 hover:text-primary-600 transition-colors">{s.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {/* 语言切换 */}
            <div className="relative">
              <button onClick={() => setLangMenuOpen(!langMenuOpen)} className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary-600 font-medium px-2 py-1 rounded hover:bg-gray-100">
                <span>{supportedLanguages.find(l => l.code === language)?.flag || '🌐'}</span>
                <span className="hidden sm:inline">{supportedLanguages.find(l => l.code === language)?.name || t('home.language', '语言')}</span>
                <span className="text-xs">▾</span>
              </button>
              {langMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setLangMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[120px] z-50">
                    {supportedLanguages.map(lang => (
                      <button key={lang.code} onClick={() => { setLanguage(lang.code); setLangMenuOpen(false) }} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${language === lang.code ? 'text-primary-600 font-medium bg-primary-50' : 'text-gray-700'}`}>
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                        {language === lang.code && <span className="ml-auto">✓</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <Link to="/order-status" className="text-sm text-gray-600 hover:text-primary-600 font-medium hidden sm:block">{t('nav.order')}</Link>
            <Link to="/cart" className="relative p-2 text-gray-600 hover:text-primary-600">
              <span className="text-xl">🛒</span>
              {totalCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{totalCount}</span>}
            </Link>
            <Link to="/login" className="text-sm text-primary-600 hover:text-primary-700 font-medium">{t('nav.admin')}</Link>
          </div>
        </div>
      </nav>

      {/* 悬浮侧边导航 */}
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
            <div key={i} onClick={() => item.link && window.open(`/go?carousel=${item.id}`, '_blank')} className={`absolute inset-0 transition-opacity duration-1000 ${i === currentSlide ? 'opacity-100' : 'opacity-0'} ${item.link ? 'cursor-pointer' : ''}`}>
              {item.image ? (
                <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🍵🔥</div>
                    <h2 className="text-3xl md:text-5xl font-bold text-primary-800 mb-3">{item.title || 'Only One BBQ & Tea'}</h2>
                    <p className="text-lg text-primary-600">{t('home.tagline', '烧烤 + 新式茶饮 · 法拉盛')}</p>
                  </div>
                </div>
              )}
            </div>
          )) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">🍵🔥</div>
                <h2 className="text-3xl md:text-5xl font-bold text-primary-800 mb-3">Only One BBQ & Tea</h2>
                <p className="text-lg text-primary-600">{t('home.tagline', '烧烤 + 新式茶饮 · 法拉盛')}</p>
              </div>
            </div>
          )}
          {/* 轮播指示器 */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {carousel.map((_, i) => (
              <button key={i} onClick={() => setCurrentSlide(i)} className={`w-2.5 h-2.5 rounded-full transition-all ${i === currentSlide ? 'bg-primary-600 w-8' : 'bg-white/60'}`} />
            ))}
          </div>
        </div>
      </section>

      {/* 品牌故事 */}
      {/* 新品上市 */}
      <section id="new" className="py-16 bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10 reveal">
            <Badge variant="primary" className="mb-4">{t('nav.new')}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800">{t('home.newArrivals')}</h2>
          </div>
          {newProducts.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {newProducts.map((p, i) => (
                <div key={p.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all reveal group" style={{ transitionDelay: `${i * 80}ms` }}>
                  <div className="h-48 bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center relative overflow-hidden">
                    {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <span className="text-6xl">🆕</span>}
                    <span className="absolute top-3 left-3 bg-red-500 text-white text-xs px-3 py-1 rounded-full font-medium">{t('home.newBadge', 'NEW')}</span>
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-gray-800 mb-1">{p.name}</h3>
                    {p.name_en && <p className="text-xs text-gray-400 mb-2 tracking-wider">{p.name_en}</p>}
                    {p.description && <p className="text-sm text-gray-500 leading-relaxed">{p.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👨‍🍳</div>
              <h3 className="text-xl font-bold text-gray-700 mb-2">{t('home.newInProgress')}</h3>
              <p className="text-gray-500 max-w-md mx-auto">{t('home.newInProgressDesc')}</p>
            </div>
          )}
        </div>
      </section>

      <section id="brand" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center reveal">
          <Badge variant="primary" className="mb-4">{t('nav.brand')}</Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">{settings.brand_story ? settings.brand_story.split('，')[0] : t('home.flushingStore', '法拉盛门店')}</h2>
          <p className="text-lg text-gray-600 leading-relaxed">{settings.brand_story || t('home.flushingStoreDesc', '法拉盛门店，烧烤 + 新式茶饮定位')}</p>
          {settings.brand_story_en && <p className="text-md text-gray-400 mt-3 italic">{settings.brand_story_en}</p>}
        </div>
      </section>

      {showTea && (
      <section id="tea" className="py-20 bg-gradient-to-b from-blue-50/50 to-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12 reveal">
            <Badge variant="primary" className="mb-4">{t('nav.tea')}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800">{t('home.selectedTea')}</h2>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            {enabledTeas.map((tea, i) => (
              <div key={i} className="w-full sm:w-[calc(50%-1rem)] md:w-[calc(33.333%-1.34rem)] bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow reveal text-center" style={{ transitionDelay: `${(i % 3) * 100}ms` }}>
                <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center text-3xl mb-4 mx-auto overflow-hidden">
                  {tea.image ? <img src={tea.image} alt={tea.name} className="w-full h-full object-cover" /> : ['🍂', '🌿', '🍃', '🌱', '🍵'][i % 5]}
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{tea.name}</h3>
                <p className="text-sm text-gray-400 mb-3">{tea.name_en}</p>
                <p className="text-gray-600">{tea.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* 奶茶工艺理念 */}
      <section id="craft" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12 reveal">
            <Badge variant="primary" className="mb-4">{t('nav.craft')}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800">{t('home.ourPhilosophy')}</h2>
          </div>
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

      {/* 奶茶制作互动体验 */}
      <section className="py-20 bg-gradient-to-br from-primary-50 via-white to-blue-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="reveal">
            <Badge variant="primary" className="mb-4">{t('home.interactive')}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">{t('home.milkTeaBirth')}</h2>
            <p className="text-gray-500 mb-10">{t('home.milkTeaBirthDesc')}</p>
          </div>
          <div className="reveal bg-white/70 backdrop-blur rounded-3xl p-8 shadow-lg border border-primary-100">
            <MilkTeaMaker teas={enabledTeas} />
          </div>
        </div>
      </section>

      {/* 关于区块 */}
      <section id="about" className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 text-center reveal">
          <Badge variant="primary" className="mb-4">{t('nav.about')}</Badge>
          <h2 className="text-3xl font-bold text-gray-800 mb-6">{settings.about_text || t('nav.about')}</h2>
          <p className="text-gray-600 leading-relaxed">
            {t('home.aboutParagraph', 'Only One BBQ & Tea 致力于为顾客提供最优质的烧烤和新式茶饮体验。我们坚持选用新鲜食材，现点现做，让每一位顾客都能品尝到最地道的美味。')}
          </p>
        </div>
      </section>

      {/* 自定义内容板块 */}
      {contentSections.map((section, idx) => (
        <section key={section.id} className={`py-20 ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'} section-hover`}>
          <div className="max-w-6xl mx-auto px-4">
            <div className={`flex flex-col md:flex-row items-center gap-10 ${section.layout === 'right' ? 'md:flex-row-reverse' : ''}`}>
              {/* 图片区域 */}
              {section.image ? (
                <div className="w-full md:w-1/2 relative group">
                  <div className="relative overflow-hidden rounded-2xl shadow-xl aspect-[4/3]">
                    <img src={section.image} alt={section.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>
                  {/* 奶茶制作过程动画 - 悬停显示 */}
                  <div className="tea-animation absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                    <div className="relative w-32 h-40">
                      {/* 杯子 */}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-24 bg-white/90 rounded-b-3xl rounded-t-lg border-2 border-white/50 overflow-hidden shadow-lg">
                        {/* 奶茶液体 */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-amber-700 to-amber-500 tea-fill" />
                        {/* 珍珠 */}
                        <div className="absolute bottom-1 left-2 w-2 h-2 bg-gray-800 rounded-full pearl-1" />
                        <div className="absolute bottom-2 left-5 w-2 h-2 bg-gray-800 rounded-full pearl-2" />
                        <div className="absolute bottom-1 right-3 w-2 h-2 bg-gray-800 rounded-full pearl-3" />
                        <div className="absolute bottom-3 right-5 w-2 h-2 bg-gray-800 rounded-full pearl-4" />
                      </div>
                      {/* 杯盖 */}
                      <div className="absolute bottom-[92px] left-1/2 -translate-x-1/2 w-24 h-3 bg-white rounded-full shadow" />
                      {/* 吸管 */}
                      <div className="absolute bottom-[85px] left-1/2 translate-x-2 w-2 h-16 bg-pink-400 rounded-full transform rotate-12 straw" />
                      {/* 蒸汽 */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 flex gap-2">
                        <span className="steam-1">💨</span>
                        <span className="steam-2">💨</span>
                        <span className="steam-3">💨</span>
                      </div>
                      {/* 飘落的茶叶 */}
                      <span className="leaf-1 absolute top-0 left-4 text-lg">🍃</span>
                      <span className="leaf-2 absolute top-0 right-4 text-lg">🍂</span>
                      <span className="leaf-3 absolute top-4 left-8 text-sm">🌿</span>
                      {/* 水滴 */}
                      <span className="drop-1 absolute top-8 left-1/2 text-sm">💧</span>
                      <span className="drop-2 absolute top-12 left-1/3 text-xs">💧</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full md:w-1/2 flex items-center justify-center">
                  <div className="text-8xl">{section.icon || '📌'}</div>
                </div>
              )}
              {/* 文字区域 */}
              <div className="w-full md:w-1/2 text-center md:text-left reveal">
                {section.icon && !section.image && <div className="text-4xl mb-4">{section.icon}</div>}
                <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">{section.title}</h2>
                {section.title_en && <p className="text-sm text-gray-400 mb-6 tracking-wider uppercase">{section.title_en}</p>}
                {section.content && <p className="text-gray-600 leading-relaxed whitespace-pre-line text-lg">{section.content}</p>}
                {section.content_en && <p className="text-gray-400 text-sm leading-relaxed mt-4">{section.content_en}</p>}
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* 商品菜单 */}
      <section id="menu" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12 reveal">
            <Badge variant="primary" className="mb-4">{t('nav.menu')}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">{t('home.deliciousNow')}</h2>
            <Link to="/menu">
              <Button variant="outline">{t('home.viewFullMenu')}</Button>
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
                  {product.is_recommend && <span className="absolute top-3 left-3 bg-red-500 text-white text-xs px-2 py-1 rounded-full">{t('home.recommend')}</span>}
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-gray-800 mb-1">{product.name}</h3>
                  {product.name_en && <p className="text-xs text-gray-400 mb-2">{product.name_en}</p>}
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{product.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-primary-600">${product.price?.toFixed(2)}</span>
                    <Button size="sm" onClick={() => handleAddToCart(product)} disabled={!business.open}>
                      {business.open ? t('home.addToCart') : t('home.closed')}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 联系 */}
      <section id="contact" className="py-20 bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center reveal">
          <h2 className="text-3xl font-bold mb-8">{t('nav.contact')}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="text-3xl mb-3">📍</div>
              <h3 className="font-semibold mb-2">{t('home.address')}</h3>
              <p className="text-primary-100 text-sm">{settings.address || '162-01 Sanford Ave, Flushing, NY'}</p>
            </div>
            <div>
              <div className="text-3xl mb-3">📞</div>
              <h3 className="font-semibold mb-2">{t('home.phone')}</h3>
              <p className="text-primary-100 text-sm">{settings.phone || t('home.welcomeCall')}</p>
            </div>
            <div>
              <div className="text-3xl mb-3">🕐</div>
              <h3 className="font-semibold mb-2">{t('home.businessHours')}</h3>
              <p className="text-primary-100 text-sm">
                {business.open ? `${t('home.openToday')} ${business.open_time} - ${business.close_time}` : t('home.closedToday')}
              </p>
            </div>
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
          <p className="text-xs mt-2 text-gray-500">{t('home.managementSystem', '一站式管理系统')}</p>
        </div>
      </footer>
    </div>
  )
}