import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'

// 语言上下文：全局中英文切换
const LanguageContext = createContext(null)

// 支持的语言列表（可后续扩展其他语言）
export const SUPPORTED_LANGUAGES = [
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
]

// 语言Provider组件：包裹整个应用，提供语言切换和翻译函数
export function LanguageProvider({ children }) {
  // 从localStorage读取上次选择的语言，默认中文
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('language') || 'zh'
  })
  // 翻译字典（从后端API加载）
  const [translations, setTranslations] = useState({})
  const [loading, setLoading] = useState(true)

  // 组件挂载时从后端加载所有翻译条目
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

  // 切换语言并持久化到localStorage
  const setLanguage = useCallback((lang) => {
    setLanguageState(lang)
    localStorage.setItem('language', lang)
  }, [])

  // 翻译函数：根据key查找当前语言的翻译，找不到则返回fallback
  const t = useCallback((key, fallback) => {
    const trans = translations[key]
    if (trans && trans[language]) {
      return trans[language]
    }
    return fallback || key
  }, [translations, language])

  // 手动刷新翻译字典（后台修改翻译后调用）
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

// Hook：获取语言上下文（必须在LanguageProvider内使用）
export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}

// Hook：仅获取翻译函数t（简化版）
export function useT() {
  const { t } = useLanguage()
  return t
}
