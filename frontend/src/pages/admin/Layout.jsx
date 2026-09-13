import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { api } from '../../lib/api'
import LanguageSwitcher from '../../components/LanguageSwitcher'

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const { t, language } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const [menus, setMenus] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState({})
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode')
      if (saved !== null) return saved === 'true'
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })

  useEffect(() => {
    localStorage.setItem('darkMode', String(darkMode))
  }, [darkMode])

  useEffect(() => {
    api.getMenus().then(data => {
      let menuList = Array.isArray(data) ? data : []
      if (user?.role !== 'admin') {
        try {
          const perms = user.permissions || {}
          if (perms.menus !== undefined) {
            const allowedIds = perms.menus || []
            const allowed = menuList.filter(m => allowedIds.includes(m.id))
            const parentIds = [...new Set(allowed.filter(m => m.parent_id && m.parent_id !== 0).map(m => m.parent_id))]
            const parents = menuList.filter(m => parentIds.includes(m.id))
            menuList = [...new Map([...parents, ...allowed].map(m => [m.id, m])).values()]
          }
        } catch {}
      }
      setMenus(menuList)
    }).catch(() => {})
  }, [user])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className={`flex min-h-screen bg-gray-50 ${darkMode ? 'dark-admin' : ''}`}>
      {sidebarOpen && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
        />
      )}

      <aside className={`
        fixed top-0 left-0 h-full bg-white border-r border-gray-200 flex flex-col z-50
        transition-transform duration-300 lg:transition-none
        lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:z-auto
        ${desktopCollapsed ? 'lg:w-16' : 'lg:w-60'}
        w-60
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-16 flex items-center justify-between px-4 border-b">
          <Link to="/admin" className="flex items-center gap-2" onClick={closeSidebar}>
            <span className="text-xl">🍵</span>
            {!desktopCollapsed && <span className="font-bold text-gray-800 text-sm">{t('layout.adminTitle', 'OnlyOne 管理')}</span>}
          </Link>
          <button
            onClick={() => setDesktopCollapsed(!desktopCollapsed)}
            className="text-gray-400 hover:text-gray-600 p-1 hidden lg:block"
          >
            {desktopCollapsed ? '▶' : '◀'}
          </button>
          <button
            onClick={closeSidebar}
            className="text-gray-400 hover:text-gray-600 p-1 lg:hidden"
          >
            ✕
          </button>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          {(menus || []).map(menu => (
            <NavLink
              key={menu.id}
              to={menu.path}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <span className="text-lg">{menu.icon || '📄'}</span>
              {!desktopCollapsed && <span>{language === 'en' ? (menu.name_en || menu.name) : menu.name}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700 p-2"
            >
              ☰
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-800">
                {user?.role === 'admin' ? t('layout.superAdmin', '超级管理员') : user?.role === 'manager' ? t('layout.manager', '管理员') : user?.role === 'employee' ? t('layout.employee', '员工') : t('layout.user', '用户')}
              </h1>
              {user?.name && <p className="text-xs text-gray-400">{user.name}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="text-gray-500 hover:text-gray-700 p-2 text-lg"
              title={t('layout.darkMode', '夜间模式')}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <Link to="/" target="_blank" className="text-sm text-gray-500 hover:text-primary-600 hidden sm:block">
              {t('layout.viewStore', '查看前台')}
            </Link>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-500">
              {t('layout.logout', '退出')}
            </button>
          </div>
        </header>

        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
