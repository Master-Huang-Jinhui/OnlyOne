import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'

const LanguageContext = createContext(null)

export const SUPPORTED_LANGUAGES = [
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
]

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('language') || 'zh'
  })
  const [translations, setTranslations] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getTranslations()
        setTranslations(data || {})
      } catch (e) {
        console.error('加载翻译失败:', e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const setLanguage = useCallback((lang) => {
    setLanguageState(lang)
    localStorage.setItem('language', lang)
  }, [])

  const t = useCallback((key, fallback) => {
    const trans = translations[key]
    if (trans && trans[language]) {
      return trans[language]
    }
    return fallback || key
  }, [translations, language])

  const refreshTranslations = useCallback(async () => {
    try {
      const data = await api.getTranslations()
      setTranslations(data || {})
    } catch (e) {
      console.error('刷新翻译失败:', e.message)
    }
  }, [])

  const value = {
    language,
    setLanguage,
    t,
    translations,
    loading,
    refreshTranslations,
    supportedLanguages: SUPPORTED_LANGUAGES
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}

export function useT() {
  const { t } = useLanguage()
  return t
}
