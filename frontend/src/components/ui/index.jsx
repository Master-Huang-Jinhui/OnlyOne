import { useState, useEffect } from 'react'

export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const variants = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
    outline: 'border border-gray-300 hover:bg-gray-50 text-gray-700',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    ghost: 'hover:bg-gray-100 text-gray-600',
    success: 'bg-green-500 hover:bg-green-600 text-white'
  }
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' }
  return (
    <button className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}

export function Input({ label, error, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <input className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${error ? 'border-red-400' : 'border-gray-300'} ${className}`} {...props} />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}

export function Textarea({ label, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <textarea className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none ${className}`} {...props} />
    </div>
  )
}

export function Select({ label, options = [], className = '', ...props }) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <select className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white ${className}`} {...props}>
        {options.map((opt, i) => (<option key={i} value={opt.value}>{opt.label}</option>))}
      </select>
    </div>
  )
}

export function Card({ children, className = '' }) {
  return <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>{children}</div>
}
export function CardHeader({ children, className = '' }) {
  return <div className={`px-5 py-4 border-b border-gray-100 ${className}`}>{children}</div>
}
export function CardTitle({ children, className = '' }) {
  return <h3 className={`text-lg font-semibold text-gray-800 ${className}`}>{children}</h3>
}
export function CardContent({ children, className = '' }) {
  return <div className={`p-5 ${className}`}>{children}</div>
}

export function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    primary: 'bg-primary-100 text-primary-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700'
  }
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>{children}</span>
}

export function Dialog({ open, onClose, title, children, footer, width = 'max-w-lg' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative bg-white rounded-xl shadow-xl w-full ${width} max-h-[90vh] flex flex-col animate-fade-in`}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-5 py-4 border-t flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  )
}

export function Table({ columns = [], data = [], actions }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {columns.map((col, i) => (<th key={i} className="text-left px-4 py-3 font-medium text-gray-600">{col.header}</th>))}
            {actions && <th className="text-left px-4 py-3 font-medium text-gray-600">操作</th>}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-8 text-gray-400">暂无数据</td></tr>
          ) : data.map((row, i) => (
            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
              {columns.map((col, j) => (<td key={j} className="px-4 py-3 text-gray-700">{col.render ? col.render(row) : row[col.key]}</td>))}
              {actions && <td className="px-4 py-3">{actions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Switch({ checked, onChange, label }) {
  return (
    <label className="inline-flex items-center cursor-pointer gap-2">
      <div className={`relative w-10 rounded-full transition-colors ${checked ? 'bg-primary-600' : 'bg-gray-300'}`} style={{ height: '22px' }} onClick={() => onChange(!checked)}>
        <div className={`absolute top-0.5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} style={{ width: '18px', height: '18px' }} />
      </div>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  )
}

export function Tabs({ tabs = [], active, onChange }) {
  return (
    <div className="flex gap-1 border-b border-gray-200 mb-4">
      {tabs.map(tab => (
        <button key={tab.key} onClick={() => onChange(tab.key)}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${active === tab.key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          {tab.label}
        </button>
      ))}
    </div>
  )
}

let toastFn = null
export function setToastFn(fn) { toastFn = fn }
export function toast(message, type = 'success') {
  if (toastFn) toastFn(message, type)
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([])
  useEffect(() => {
    setToastFn((message, type) => {
      const id = Date.now()
      setToasts(prev => [...prev, { id, message, type }])
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
    })
  }, [])
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className={`px-4 py-3 rounded-lg shadow-lg text-sm text-white animate-fade-in ${t.type === 'success' ? 'bg-green-500' : t.type === 'error' ? 'bg-red-500' : 'bg-gray-800'}`}>
          {t.message}
        </div>
      ))}
    </div>
  )
}

export function Empty({ text = '暂无数据', icon = '📭' }) {
  return <div className="text-center py-12 text-gray-400"><div className="text-4xl mb-2">{icon}</div><p>{text}</p></div>
}

export function StatCard({ title, value, icon, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600'
  }
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${colors[color]}`}>{icon}</div>
      </div>
    </Card>
  )
}
