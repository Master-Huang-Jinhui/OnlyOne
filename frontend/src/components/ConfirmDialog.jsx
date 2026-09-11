import { useState, useCallback, createContext, useContext } from 'react'
import { Button } from './ui'

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({
    open: false,
    title: '确认操作',
    message: '',
    confirmText: '确定',
    cancelText: '取消',
    variant: 'primary',
    resolve: null
  })

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setState({
        open: true,
        title: typeof options === 'string' ? '确认操作' : options.title || '确认操作',
        message: typeof options === 'string' ? options : options.message || '',
        confirmText: typeof options === 'string' ? '确定' : options.confirmText || '确定',
        cancelText: typeof options === 'string' ? '取消' : options.cancelText || '取消',
        variant: typeof options === 'string' ? 'primary' : options.variant || 'primary',
        resolve
      })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    state.resolve?.(true)
    setState(s => ({ ...s, open: false }))
  }, [state.resolve])

  const handleCancel = useCallback(() => {
    state.resolve?.(false)
    setState(s => ({ ...s, open: false }))
  }, [state.resolve])

  const variantColors = {
    primary: 'bg-primary-600 hover:bg-primary-700',
    danger: 'bg-red-500 hover:bg-red-600',
    success: 'bg-green-500 hover:bg-green-600',
    warning: 'bg-yellow-500 hover:bg-yellow-600'
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={handleCancel} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md animate-fade-in">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${state.variant === 'danger' ? 'bg-red-100' : state.variant === 'warning' ? 'bg-yellow-100' : state.variant === 'success' ? 'bg-green-100' : 'bg-primary-100'}`}>
                  <span className="text-xl">{state.variant === 'danger' ? '⚠️' : state.variant === 'warning' ? '⚡' : state.variant === 'success' ? '✅' : '❓'}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">{state.title}</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{state.message}</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end gap-3">
              <Button variant="outline" onClick={handleCancel}>
                {state.cancelText}
              </Button>
              <Button className={variantColors[state.variant] || variantColors.primary} onClick={handleConfirm}>
                {state.confirmText}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    console.warn('useConfirm must be used within ConfirmProvider, falling back to native confirm')
    return async (options) => {
      const message = typeof options === 'string' ? options : options?.message || '确认操作？'
      return window.confirm(message)
    }
  }
  return ctx
}
