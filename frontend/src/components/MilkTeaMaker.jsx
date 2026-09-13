import { useState } from 'react'
import './MilkTeaMaker.css'
import { useLanguage } from '../context/LanguageContext'

const defaultTeaOptions = [
  { name: '乌龙茶', color: '#a97542', labelKey: 'milkTea.oolong' },
  { name: '绿茶', color: '#9fb555', labelKey: 'milkTea.greenTea' },
  { name: '红茶', color: '#b04d2a', labelKey: 'milkTea.blackTea' },
  { name: '铁观音', color: '#6b5a44', labelKey: 'milkTea.tiGuanYin' }
]

const toppingOptions = [
  { name: '珍珠', emoji: '●', color: '#2b2b2b', labelKey: 'milkTea.pearl' },
  { name: '布丁', emoji: '🍮', color: '#f2c063', labelKey: 'milkTea.pudding' },
  { name: '椰果', emoji: '▢', color: '#c9eec7', labelKey: 'milkTea.coconut' }
]

const teaColorPalette = ['#a97542', '#9fb555', '#b04d2a', '#6b5a44', '#7c3aed', '#0891b2', '#be185d', '#65a30d']

export default function MilkTeaMaker({ teas }) {
  const { t, language } = useLanguage()
  const teaOptions = teas && teas.length > 0
    ? teas.map((tea, i) => ({ name: tea.name || tea, color: tea.color || teaColorPalette[i % teaColorPalette.length], label: language === 'en' ? (tea.name_en || tea.name || tea) : (tea.name || tea) }))
    : defaultTeaOptions.map(opt => ({ ...opt, label: t(opt.labelKey, opt.name) }))
  const renderedToppingOptions = toppingOptions.map(opt => ({ ...opt, label: t(opt.labelKey, opt.name) }))
  const [teaBase, setTeaBase] = useState('')
  const [hasMilk, setHasMilk] = useState(false)
  const [toppings, setToppings] = useState([])
  const [hasIce, setHasIce] = useState(false)
  const [isFinish, setIsFinish] = useState(false)

  const toggleTopping = (name) => {
    if (toppings.includes(name)) {
      setToppings(toppings.filter(item => item.name !== name))
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
    if (teaBase) {
      const current = teaOptions.find(o => o.name === teaBase)
      parts.push(current?.label || teaBase)
    }
    if (hasMilk) parts.push(t('milkTea.milk', '牛奶'))
    if (toppings.length > 0) {
      const labels = toppings.map(n => {
        const opt = toppingOptions.find(o => o.name === n)
        return opt ? t(opt.labelKey, n) : n
      })
      parts.push(labels.join('/'))
    }
    if (hasIce) parts.push(t('milkTea.ice', '冰'))
    return parts.length ? parts.join(' · ') : t('milkTea.selectToStart', '选择茶底开始制作')
  }

  const currentTea = teaOptions.find(t => t.name === teaBase)

  return (
    <section className="milk-tea-maker">
      <div className="mtm-header">
        <span className="mtm-tag">{t('milkTea.interactive', '互动体验')}</span>
        <h2>{t('milkTea.title', '一杯奶茶的诞生')}</h2>
        <p>{t('milkTea.subtitle', '点击配料，亲手调一杯属于你的奶茶')}</p>
      </div>

      <div className="mtm-body">
        {/* 左侧舞台 */}
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
            <span className="formula-label">{t('milkTea.currentFormula', '当前配方')}</span>
            <span className="formula-text">{getFormulaText()}</span>
          </div>
        </div>

        {/* 右侧步骤面板 */}
        <div className="mtm-panel">
          <div className="step-card">
            <div className="step-title">
              <span className="step-num">1</span>
              <span>{t('milkTea.step1', '选择茶底')}</span>
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
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="step-card">
            <div className="step-title">
              <span className="step-num">2</span>
              <span>{t('milkTea.step2', '加牛奶')}</span>
            </div>
            <button
              className={`pill-btn milk-btn ${hasMilk ? 'active' : ''}`}
              onClick={() => setHasMilk(!hasMilk)}
            >
              {hasMilk ? t('milkTea.milkAdded', '✓ 已加牛奶') : t('milkTea.addMilk', '+ 加牛奶')}
            </button>
          </div>

          <div className="step-card">
            <div className="step-title">
              <span className="step-num">3</span>
              <span>{t('milkTea.step3', '加小料')}</span>
            </div>
            <div className="button-row">
              {renderedToppingOptions.map(item => (
                <button
                  key={item.name}
                  className={`pill-btn topping-btn ${toppings.includes(item.name) ? 'active' : ''}`}
                  onClick={() => toggleTopping(item.name)}
                >
                  <span className="btn-icon" style={{ color: item.color }}>{item.emoji}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="step-card">
            <div className="step-title">
              <span className="step-num">4</span>
              <span>{t('milkTea.step4', '加冰块')}</span>
            </div>
            <button
              className={`pill-btn ice-btn ${hasIce ? 'active' : ''}`}
              onClick={() => setHasIce(!hasIce)}
            >
              {hasIce ? t('milkTea.iceAdded', '✓ 已加冰块') : t('milkTea.addIce', '+ 加冰块')}
            </button>
          </div>

          <div className="action-row">
            <button className="primary-btn" onClick={finish}>{t('milkTea.finish', '封顶完成')}</button>
            <button className="ghost-btn" onClick={resetAll}>{t('milkTea.reset', '重新制作')}</button>
          </div>
        </div>
      </div>
    </section>
  )
}