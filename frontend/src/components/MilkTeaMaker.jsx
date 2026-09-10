import { useState } from 'react'
import './MilkTeaMaker.css'

const defaultTeaOptions = [
  { name: '乌龙茶', color: '#a97542' },
  { name: '绿茶', color: '#9fb555' },
  { name: '红茶', color: '#b04d2a' },
  { name: '铁观音', color: '#6b5a44' }
]

const toppingOptions = [
  { name: '珍珠', emoji: '●', color: '#2b2b2b' },
  { name: '布丁', emoji: '🍮', color: '#f2c063' },
  { name: '椰果', emoji: '▢', color: '#c9eec7' }
]

const teaColorPalette = ['#a97542', '#9fb555', '#b04d2a', '#6b5a44', '#7c3aed', '#0891b2', '#be185d', '#65a30d']

export default function MilkTeaMaker({ teas }) {
  const teaOptions = teas && teas.length > 0
    ? teas.map((t, i) => ({ name: t.name || t, color: t.color || teaColorPalette[i % teaColorPalette.length] }))
    : defaultTeaOptions
  const [teaBase, setTeaBase] = useState('')
  const [hasMilk, setHasMilk] = useState(false)
  const [toppings, setToppings] = useState([])
  const [hasIce, setHasIce] = useState(false)
  const [isFinish, setIsFinish] = useState(false)

  const toggleTopping = (name) => {
    if (toppings.includes(name)) {
      setToppings(toppings.filter(item => item !== name))
    } else {
      setToppings([...toppings, name])
    }
  }

  const resetAll = () => {
    setTeaBase('')
    setHasMilk(false)
    setToppings([])
    setHasIce(false)
    setIsFinish(false)
  }

  const finish = () => {
    if (!teaBase) return
    setIsFinish(true)
  }

  const getFormulaText = () => {
    const parts = []
    if (teaBase) parts.push(teaBase)
    if (hasMilk) parts.push('牛奶')
    if (toppings.length > 0) parts.push(toppings.join('/'))
    if (hasIce) parts.push('冰')
    return parts.length ? parts.join(' · ') : '选择茶底开始制作'
  }

  const currentTea = teaOptions.find(t => t.name === teaBase)

  return (
    <section className="milk-tea-maker">
      <div className="mtm-header">
        <span className="mtm-tag">互动体验</span>
        <h2>一杯奶茶的诞生</h2>
        <p>点击配料，亲手调一杯属于你的奶茶</p>
      </div>

      <div className="mtm-body">
        <div className="mtm-stage">
          <div className="mtm-scene">
            {teaBase && (
              <div className="liquid-stream tea-stream" style={{ background: currentTea?.color }} />
            )}
            {hasMilk && <div className="liquid-stream milk-stream" />}

            <div className="cup-area">
              <div className="cup-shadow" />
              <div className="cup">
                <div className="cup-glass">
                  <div
                    className="layer tea-layer"
                    style={{ background: currentTea?.color, opacity: teaBase ? 1 : 0 }}
                  />
                  <div className="layer milk-layer" style={{ opacity: hasMilk ? 1 : 0 }} />

                  {hasIce && (
                    <div className="ice-group">
                      <span className="ice-cube">🧊</span>
                      <span className="ice-cube">🧊</span>
                      <span className="ice-cube">🧊</span>
                    </div>
                  )}

                  <div className="topping-layer">
                    {toppings.includes('珍珠') && (
                      <div className="pearl-group">
                        <span className="pearl">●</span>
                        <span className="pearl">●</span>
                        <span className="pearl">●</span>
                      </div>
                    )}
                    {toppings.includes('布丁') && <span className="topping-icon">🍮</span>}
                    {toppings.includes('椰果') && <span className="topping-icon coconut">▢▢▢</span>}
                  </div>
                </div>

                <div className={`cup-lid ${isFinish ? 'drop' : ''}`} />
                <div className={`straw ${isFinish ? 'insert' : ''}`} />
              </div>
            </div>

            {isFinish && (
              <div className="steam-group">
                <span className="steam" />
                <span className="steam s2" />
                <span className="steam s3" />
              </div>
            )}
          </div>

          <div className="formula-card">
            <span className="formula-label">当前配方</span>
            <span className="formula-text">{getFormulaText()}</span>
          </div>
        </div>

        <div className="mtm-panel">
          <div className="step-card">
            <div className="step-title">
              <span className="step-num">1</span>
              <span>选择茶底</span>
            </div>
            <div className="button-row">
              {teaOptions.map(item => (
                <button
                  key={item.name}
                  className={`pill-btn tea-btn ${teaBase === item.name ? 'active' : ''}`}
                  style={{
                    borderColor: teaBase === item.name ? item.color : '#e5e7eb',
                    background: teaBase === item.name ? item.color : '#fff',
                    color: teaBase === item.name ? '#fff' : '#374151'
                  }}
                  onClick={() => setTeaBase(item.name)}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          <div className="step-card">
            <div className="step-title">
              <span className="step-num">2</span>
              <span>加牛奶</span>
            </div>
            <button
              className={`pill-btn milk-btn ${hasMilk ? 'active' : ''}`}
              onClick={() => setHasMilk(!hasMilk)}
            >
              {hasMilk ? '✓ 已加牛奶' : '+ 加牛奶'}
            </button>
          </div>

          <div className="step-card">
            <div className="step-title">
              <span className="step-num">3</span>
              <span>加小料</span>
            </div>
            <div className="button-row">
              {toppingOptions.map(item => (
                <button
                  key={item.name}
                  className={`pill-btn topping-btn ${toppings.includes(item.name) ? 'active' : ''}`}
                  onClick={() => toggleTopping(item.name)}
                >
                  <span className="btn-icon" style={{ color: item.color }}>{item.emoji}</span>
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          <div className="step-card">
            <div className="step-title">
              <span className="step-num">4</span>
              <span>加冰块</span>
            </div>
            <button
              className={`pill-btn ice-btn ${hasIce ? 'active' : ''}`}
              onClick={() => setHasIce(!hasIce)}
            >
              {hasIce ? '✓ 已加冰块' : '+ 加冰块'}
            </button>
          </div>

          <div className="action-row">
            <button className="primary-btn" onClick={finish}>封顶完成</button>
            <button className="ghost-btn" onClick={resetAll}>重新制作</button>
          </div>
        </div>
      </div>
    </section>
  )
}
