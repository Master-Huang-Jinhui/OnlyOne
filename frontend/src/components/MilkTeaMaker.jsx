import { useState } from 'react'

const steps = [
  { title: '准备好空杯', desc: '干净的奶茶杯已就位', btn: '开始泡茶' },
  { title: '第一步：泡茶', desc: '原叶现萃，茶汤琥珀色', btn: '加入牛奶' },
  { title: '第二步：加牛奶', desc: '鲜奶与茶汤融合', btn: '加入小料' },
  { title: '第三步：加小料', desc: 'Q弹珍珠落入杯底', btn: '完成制作' },
  { title: '制作完成！', desc: '插上吸管，享用美味奶茶', btn: '重新开始' }
]

export default function MilkTeaMaker() {
  const [step, setStep] = useState(0)

  const handleNext = () => {
    if (step >= 4) {
      setStep(0)
    } else {
      setStep(step + 1)
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-64 flex items-end justify-center">
        {step >= 1 && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-3">
            <span className="text-2xl steam-1">💨</span>
            <span className="text-2xl steam-2">💨</span>
            <span className="text-2xl steam-3">💨</span>
          </div>
        )}

        <div className="absolute top-8 w-28 h-4 bg-white rounded-t-lg border-2 border-gray-200 z-20" />
        <div className="absolute top-6 w-20 h-3 bg-white rounded-t-lg border-2 border-b-0 border-gray-200 z-20" />

        {step >= 4 && (
          <div className="absolute top-0 w-3 h-24 bg-pink-400 rounded-full z-30 straw-animate"
            style={{ left: '55%', transform: 'rotate(10deg)' }} />
        )}

        <div className="relative w-24 h-44 bg-white/60 backdrop-blur rounded-b-3xl border-2 border-gray-200 overflow-hidden z-10">
          <div className="absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-out"
            style={{
              height: step === 0 ? '0%' : step === 1 ? '60%' : '75%',
              background: step === 0 ? 'transparent'
                : step === 1 ? 'linear-gradient(to top, #8B4513, #D2691E)'
                : step >= 2 ? 'linear-gradient(to top, #C4A484, #DEB887)'
                : 'transparent'
            }}>
            {step === 2 && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-full milk-pour"
                style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(255,255,255,0))' }} />
            )}
            {step >= 1 && (
              <div className="absolute top-0 left-0 right-0 h-2 tea-wave"
                style={{ background: 'rgba(255,255,255,0.3)' }} />
            )}
          </div>

          {step >= 1 && step < 2 && (
            <>
              <span className="absolute text-xs leaf-fall-1" style={{ top: '20%', left: '20%' }}>🍃</span>
              <span className="absolute text-xs leaf-fall-2" style={{ top: '35%', left: '60%' }}>🌿</span>
              <span className="absolute text-xs leaf-fall-3" style={{ top: '50%', left: '35%' }}>🍂</span>
            </>
          )}

          {step >= 3 && (
            <>
              <div className="absolute w-3 h-3 bg-gray-900 rounded-full pearl-bounce-1" style={{ bottom: '5%', left: '25%' }} />
              <div className="absolute w-3 h-3 bg-gray-900 rounded-full pearl-bounce-2" style={{ bottom: '5%', left: '45%' }} />
              <div className="absolute w-3 h-3 bg-gray-900 rounded-full pearl-bounce-3" style={{ bottom: '5%', left: '65%' }} />
              <div className="absolute w-3 h-3 bg-gray-900 rounded-full pearl-bounce-4" style={{ bottom: '12%', left: '35%' }} />
              <div className="absolute w-3 h-3 bg-gray-900 rounded-full pearl-bounce-5" style={{ bottom: '12%', left: '55%' }} />
            </>
          )}

          {step === 3 && (
            <>
              <span className="absolute text-sm pearl-drop-1" style={{ top: '-10%', left: '30%' }}>⚫</span>
              <span className="absolute text-sm pearl-drop-2" style={{ top: '-10%', left: '50%' }}>⚫</span>
              <span className="absolute text-sm pearl-drop-3" style={{ top: '-10%', left: '70%' }}>⚫</span>
            </>
          )}
        </div>

        <div className="absolute -bottom-2 w-20 h-3 bg-gray-300/50 rounded-full blur-sm" />
      </div>

      <div className="flex gap-2 mt-6 mb-4">
        {steps.map((_, i) => (
          <div key={i}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              i < step ? 'bg-primary-500' : i === step ? 'bg-primary-500 scale-125' : 'bg-gray-200'
            }`} />
        ))}
      </div>

      <h3 className="text-lg font-bold text-gray-800 mb-1">{steps[step].title}</h3>
      <p className="text-sm text-gray-500 mb-4">{steps[step].desc}</p>

      <button onClick={handleNext}
        className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors active:scale-95">
        {steps[step].btn}
      </button>
    </div>
  )
}
