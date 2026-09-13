import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '../context/LanguageContext'

export default function LanguageSwitcher({ size = 'sm' }) {
  const { language, setLanguage, supportedLanguages } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const current = supportedLanguages.find(l => l.code === language) || supportedLanguages[0]

  const sizeClasses = size === 'sm' 
    ? 'px-2 py-1 text-xs' 
    : 'px-3 py-1.5 text-sm'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 ${sizeClasses} rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all text-gray-600`}
      >
        <span>{current.flag}</span>
        <span className="font-medium">{current.name}</span>
        <span className="text-gray-400 text-xs">▼</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
          {supportedLanguages.map(lang => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code)
                setOpen(false)
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                language === lang.code ? 'text-primary-600 bg-primary-50 font-medium' : 'text-gray-600'
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
              {language === lang.code && <span className="ml-auto text-primary-500">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}