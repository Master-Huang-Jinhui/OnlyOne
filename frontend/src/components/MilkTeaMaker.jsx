import { useState } from 'react'

const teaPresets = {
  '绿茶': { key: 'green', emoji: '🍵', color: 'linear-gradient(to top, #7CB342, #AED581)' },
  '红茶': { key: 'black', emoji: '☕', color: 'linear-gradient(to top, #8B4513, #D2691E)' },
  '乌龙茶': { key: 'oolong', emoji: '🍃', color: 'linear-gradient(to top, #B8860B, #DAA520)' },
  '茉莉花茶': { key: 'jasmine', emoji: '🌸', color: 'linear-gradient(to top, #F8BBD9, #FCE4EC)' },
  '铁观音': { key: 'tieguanyin', emoji: '🌿', color: 'linear-gradient(to top, #66BB6A, #A5D6A7)' },
  '普洱茶': { key: 'puer', emoji: '🫖', color: 'linear-gradient(to top, #5D4037, #8D6E63)' },
  '大麦茶': { key: 'barley', emoji: '🌾', color: 'linear-gradient(to top, #A1887F, #D7CCC8)' }
}

const defaultTeas = [
  { name: '绿茶', name_en: 'Green Tea' },
  { name: '红茶', name_en: 'Black Tea' },
  { name: '乌龙茶', name_en: 'Oolong Tea' }
]

const toppingOptions = [
  { key: 'pearl', label: '珍珠', emoji: '⚫', color: '#1a1a1a', shape: 'round' },
  { key: 'pudding', label: '布丁', emoji: '🍮', color: '#F4D03F', shape: 'square' },
  { key: 'coconut', label: '椰果', emoji: '🥥', color: 'rgba(255,255,255,0.8)', shape: 'square' }
]

export default function MilkTeaMaker({ teas }) {
  const teaList = (teas && teas.length > 0 ? teas : defaultTeas)
  const teaOptions = teaList.map((t, i) => {
    const preset = teaPresets[t.name] || {
      key: `tea_${i}`,
      emoji: '🍵',
      color: `linear-gradient(to top, hsl(${(i * 47) % 360}, 50%, 45%), hsl(${(i * 47) % 360}, 50%, 65%))`
    }
    return { ...preset, label: t.name, image: t.image }
  })
  const [tea, setTea] = useState(null)
  const [milk, setMilk] = useState(false)
  const [toppings, setToppings] = useState([])
  const [ice, setIce] = useState(false)
  const [sealed, setSealed] = useState(false)

  const toggleTopping = (key) => {
    if (sealed) return
    setToppings(prev => prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key])
  }

  const handleSeal = () => {
    if (!tea) return
    setSealed(true)
  }

  const reset = () => {
    setTea(null); setMilk(false); setToppings([]); setIce(false); setSealed(false)
  }

  const selectedTea = teaOptions.find(t => t.key === tea)
  const liquidColor = milk && tea
    ? 'linear-gradient(to top, #C4A484, #DEB887)'
    : selectedTea?.color || 'transparent'
  const liquidHeight = tea ? (milk ? '80%' : '65%') : '0%'

  const toppingPositions = {
    pearl: [{ bottom: '6%', left: '22%' }, { bottom: '6%', left: '42%' }, { bottom: '6%', left: '62%' }, { bottom: '14%', left: '32%' }, { bottom: '14%', left: '52%' }],
    pudding: [{ bottom: '8%', left: '28%' }, { bottom: '8%', left: '55%' }, { bottom: '18%', left: '40%' }],
    coconut: [{ bottom: '10%', left: '25%' }, { bottom: '10%', left: '50%' }, { bottom: '10%', left: '70%' }]
  }

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-8">
      <div className="relative w-48 h-64 flex items-end justify-center shrink-0">
        {tea && !sealed && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-3">
            <span className="text-2xl steam-1">💨</span>
            <span className="text-2xl steam-2">💨</span>
            <span className="text-2xl steam-3">💨</span>
          </div>
        )}

        {sealed && (
          <>
            <div className="absolute top-8 w-28 h-4 bg-white rounded-t-lg border-2 border-gray-200 z-20 seal-animate" />
            <div className="absolute top-6 w-20 h-3 bg-white rounded-t-lg border-2 border-b-0 border-gray-200 z-20" />
          </>
        )}

        {sealed && (
          <div className="absolute top-0 w-3 h-24 bg-pink-400 rounded-full z-30 straw-animate"
            style={{ left: '55%', transform: 'rotate(10deg)' }} />
        )}

        <div className="relative w-24 h-44 bg-white/60 backdrop-blur rounded-b-3xl border-2 border-gray-200 overflow-hidden z-10">
          <div className="absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-out"
            style={{ height: liquidHeight, background: liquidColor }}>
            {tea && <div className="absolute top-0 left-0 right-0 h-2 tea-wave" style={{ background: 'rgba(255,255,255,0.3)' }} />}
            {milk && tea && !sealed && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-full milk-pour"
                style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.6), rgba(255,255,255,0))' }} />
            )}
          </div>

          {tea && !milk && !sealed && (
            <>
              <span className="absolute text-xs leaf-fall-1" style={{ top: '25%', left: '20%' }}>🍃</span>
              <span className="absolute text-xs leaf-fall-2" style={{ top: '40%', left: '60%' }}>🌿</span>
              <span className="absolute text-xs leaf-fall-3" style={{ top: '55%', left: '35%' }}>🍂</span>
            </>
          )}

          {toppings.map(tkey => {
            const opt = toppingOptions.find(o => o.key === tkey)
            const positions = toppingPositions[tkey] || []
            return positions.map((pos, i) => (
              <div key={`${tkey}-${i}`}
                className={`absolute ${opt.shape === 'round' ? 'rounded-full' : 'rounded'} pearl-bounce-${(i % 5) + 1}`}
                style={{
                  width: opt.shape === 'round' ? '12px' : '10px',
                  height: opt.shape === 'round' ? '12px' : '10px',
                  background: opt.color,
                  ...pos,
                  animationDelay: `${i * 0.1}s`
                }} />
            ))
          })}

          {ice && tea && (
            <>
              <div className="absolute w-4 h-4 bg-white/70 rounded-sm ice-float-1" style={{ top: '20%', left: '20%' }} />
              <div className="absolute w-3 h-3 bg-white/60 rounded-sm ice-float-2" style={{ top: '25%', left: '55%' }} />
              <div className="absolute w-4 h-4 bg-white/70 rounded-sm ice-float-3" style={{ top: '18%', left: '70%' }} />
            </>
          )}
        </div>

        <div className="absolute -bottom-2 w-20 h-3 bg-gray-300/50 rounded-full blur-sm" />
      </div>

      <div className="flex-1 max-w-xs w-full space-y-4">
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">第一步：选择茶底</p>
          <div className="flex gap-2 flex-wrap">
            {teaOptions.map(t => (
              <button key={t.key} onClick={() => !sealed && setTea(t.key)}
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
          <button onClick={() => !sealed && setMilk(!milk)} disabled={sealed || !tea}
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
          <button onClick={() => !sealed && setIce(!ice)} disabled={sealed || !tea}
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
