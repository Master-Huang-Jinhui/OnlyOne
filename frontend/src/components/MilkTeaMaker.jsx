import { useState, useEffect, useRef } from 'react'
import lottie from 'lottie-web'

const teaPresets = {
  '绿茶': { key: 'green', emoji: '🍵', color: '#7CB342' },
  '红茶': { key: 'black', emoji: '☕', color: '#8B4513' },
  '乌龙茶': { key: 'oolong', emoji: '🍃', color: '#B8860B' },
  '茉莉花茶': { key: 'jasmine', emoji: '🌸', color: '#F8BBD9' },
  '铁观音': { key: 'tieguanyin', emoji: '🌿', color: '#66BB6A' },
  '普洱茶': { key: 'puer', emoji: '🫖', color: '#5D4037' },
  '大麦茶': { key: 'barley', emoji: '🌾', color: '#A1887F' }
}

const defaultTeas = [
  { name: '绿茶', name_en: 'Green Tea' },
  { name: '红茶', name_en: 'Black Tea' },
  { name: '乌龙茶', name_en: 'Oolong Tea' }
]

const toppingOptions = [
  { key: 'pearl', label: '珍珠', emoji: '⚫', color: '#1a1a1a', shape: 'round' },
  { key: 'pudding', label: '布丁', emoji: '🍮', color: '#F4D03F', shape: 'square' },
  { key: 'coconut', label: '椰果', emoji: '🥥', color: 'rgba(255,255,255,0.85)', shape: 'square' }
]

const FRAME = {
  EMPTY: 0,
  TEA_POURED: 40,
  MILK_ADDED: 75,
  SEALED: 118
}

export default function MilkTeaMaker({ teas }) {
  const teaList = (teas && teas.length > 0 ? teas : defaultTeas)
  const teaOptions = teaList.map((t, i) => {
    const preset = teaPresets[t.name] || {
      key: `tea_${i}`,
      emoji: t.image ? '' : '🍵',
      color: `hsl(${(i * 47) % 360}, 50%, 45%)`
    }
    return { ...preset, label: t.name, image: t.image }
  })

  const [tea, setTea] = useState(null)
  const [milk, setMilk] = useState(false)
  const [toppings, setToppings] = useState([])
  const [ice, setIce] = useState(false)
  const [sealed, setSealed] = useState(false)
  const [lottieReady, setLottieReady] = useState(false)

  const containerRef = useRef(null)
  const animRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return
    const anim = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      path: '/lottie/milk-tea.json'
    })
    animRef.current = anim
    anim.addEventListener('DOMLoaded', () => setLottieReady(true))
    return () => { anim.destroy(); animRef.current = null }
  }, [])

  const playTo = (frame) => {
    if (!animRef.current) return
    animRef.current.goToAndPlay(frame, true)
  }

  const goTo = (frame) => {
    if (!animRef.current) return
    animRef.current.goToAndStop(frame, true)
  }

  const selectTea = (key) => {
    if (sealed) return
    setTea(key)
    playTo(FRAME.TEA_POURED)
  }

  const toggleMilk = () => {
    if (sealed || !tea) return
    const next = !milk
    setMilk(next)
    if (next) {
      playTo(FRAME.MILK_ADDED)
    } else {
      goTo(FRAME.TEA_POURED)
    }
  }

  const toggleTopping = (key) => {
    if (sealed) return
    setToppings(prev => prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key])
  }

  const toggleIce = () => {
    if (sealed || !tea) return
    setIce(!ice)
  }

  const handleSeal = () => {
    if (!tea) return
    setSealed(true)
    playTo(FRAME.SEALED)
  }

  const reset = () => {
    setTea(null); setMilk(false); setToppings([]); setIce(false); setSealed(false)
    goTo(FRAME.EMPTY)
  }

  const selectedTea = teaOptions.find(t => t.key === tea)

  const toppingPositions = {
    pearl: [{ bottom: '18%', left: '28%' }, { bottom: '18%', left: '42%' }, { bottom: '18%', left: '56%' }, { bottom: '24%', left: '35%' }, { bottom: '24%', left: '49%' }],
    pudding: [{ bottom: '20%', left: '32%' }, { bottom: '20%', left: '52%' }, { bottom: '26%', left: '42%' }],
    coconut: [{ bottom: '22%', left: '30%' }, { bottom: '22%', left: '46%' }, { bottom: '22%', left: '60%' }]
  }

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-8">
      <div className="relative w-56 h-72 flex items-center justify-center shrink-0">
        {tea && !sealed && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-3 z-20 pointer-events-none">
            <span className="text-2xl steam-1 opacity-60">💨</span>
            <span className="text-2xl steam-2 opacity-60">💨</span>
            <span className="text-2xl steam-3 opacity-60">💨</span>
          </div>
        )}

        <div ref={containerRef} className="w-full h-full" style={{ transform: 'scale(1.1)' }} />

        {tea && (
          <div className="absolute inset-0 pointer-events-none">
            {toppings.map(tkey => {
              const opt = toppingOptions.find(o => o.key === tkey)
              const positions = toppingPositions[tkey] || []
              return positions.map((pos, i) => (
                <div key={`${tkey}-${i}`}
                  className={`absolute ${opt.shape === 'round' ? 'rounded-full' : 'rounded'} pearl-bounce-${(i % 5) + 1}`}
                  style={{
                    width: opt.shape === 'round' ? '11px' : '9px',
                    height: opt.shape === 'round' ? '11px' : '9px',
                    background: opt.color,
                    boxShadow: opt.shape === 'round' ? 'inset -1px -1px 2px rgba(0,0,0,0.3)' : 'none',
                    ...pos,
                    animationDelay: `${i * 0.1}s`,
                    zIndex: 5
                  }} />
              ))
            })}

            {ice && (
              <>
                <div className="absolute w-4 h-4 bg-white/75 rounded-sm ice-float-1" style={{ top: '38%', left: '32%', zIndex: 6, boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.8)' }} />
                <div className="absolute w-3 h-3 bg-white/65 rounded-sm ice-float-2" style={{ top: '42%', left: '52%', zIndex: 6 }} />
                <div className="absolute w-4 h-4 bg-white/75 rounded-sm ice-float-3" style={{ top: '36%', left: '60%', zIndex: 6 }} />
              </>
            )}
          </div>
        )}

        {!lottieReady && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
            加载动画中...
          </div>
        )}
      </div>

      <div className="flex-1 max-w-xs w-full space-y-4">
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">第一步：选择茶底</p>
          <div className="flex gap-2 flex-wrap">
            {teaOptions.map(t => (
              <button key={t.key} onClick={() => selectTea(t.key)}
                disabled={sealed}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
                  tea === t.key ? 'bg-primary-600 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
                } ${sealed ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}>
                {t.image ? <img src={t.image} alt={t.label} className="w-4 h-4 rounded-full object-cover" /> : t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">第二步：加牛奶</p>
          <button onClick={toggleMilk} disabled={sealed || !tea}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              milk ? 'bg-blue-500 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
            } ${(sealed || !tea) ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}>
            🥛 {milk ? '已加牛奶' : '加入牛奶'}
          </button>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">第三步：加小料（可多选）</p>
          <div className="flex gap-2 flex-wrap">
            {toppingOptions.map(t => (
              <button key={t.key} onClick={() => toggleTopping(t.key)} disabled={sealed || !tea}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  toppings.includes(t.key) ? 'bg-amber-500 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:border-amber-300'
                } ${(sealed || !tea) ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}>
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">第四步：加冰块</p>
          <button onClick={toggleIce} disabled={sealed || !tea}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              ice ? 'bg-cyan-500 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:border-cyan-300'
            } ${(sealed || !tea) ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}>
            🧊 {ice ? '已加冰块' : '加入冰块'}
          </button>
        </div>

        <div className="flex gap-2 pt-2">
          {!sealed ? (
            <button onClick={handleSeal} disabled={!tea}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                tea ? 'bg-primary-600 hover:bg-primary-700 text-white active:scale-95' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}>
              ✅ 封顶完成
            </button>
          ) : (
            <button onClick={reset}
              className="flex-1 px-4 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors active:scale-95">
              🔄 重新制作
            </button>
          )}
        </div>

        {tea && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
            <p className="font-medium text-gray-700 mb-1">当前配方：</p>
            <p>{selectedTea?.label}{milk ? ' + 牛奶' : ''}{toppings.length > 0 ? ` + ${toppings.map(k => toppingOptions.find(o => o.key === k)?.label).join('/')}` : ''}{ice ? ' + 冰' : ''}</p>
            {sealed && <p className="text-green-600 font-medium mt-1">🎉 制作完成，请享用！</p>}
          </div>
        )}
      </div>
    </div>
  )
}
