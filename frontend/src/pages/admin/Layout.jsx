import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { api } from '../../lib/api'
import LanguageSwitcher from '../../components/LanguageSwitcher'

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const [menus, setMenus] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState([])

  const toggleMenu = (id) => {
    setExpandedMenus(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }
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
    api.getAllMenus().then(data => {
      let menuList = Array.isArray(data) ? data : []
      // 只显示启用的菜单
      menuList = menuList.filter(m => m.enabled === 1 || m.enabled === true)
      // 非超级管理员都需要过滤菜单（基于角色权限或用户个人权限）
      if (user?.role !== 'admin') {
        try {
          const perms = user.permissions || {}
          // 只有配置了 menus 字段才过滤（空数组表示无权限）
          // 未配置 menus 字段的老数据保持全部可见
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
      // 默认展开所有有子菜单的一级菜单
      const toNum = (v) => v == null ? 0 : Number(v)
      const parentIds = menuList.filter(m => toNum(m.parent_id) === 0 && menuList.some(child => toNum(child.parent_id) === toNum(m.id))).map(m => m.id)
      setExpandedMenus(parentIds)
    }).catch(() => {})
  }, [user])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className={`flex min-h-screen bg-gray-50 ${darkMode ? 'dark-admin' : ''}`}>
      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
        />
      )}

      {/* 侧边栏 - 手机端fixed抽屉，桌面端sticky固定 */}
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
          {(() => {
            // 构建树形菜单（兼容 parent_id 为 0/NULL/字符串/数字）
            const toNum = (v) => v == null ? 0 : Number(v)
            const parents = menus.filter(m => toNum(m.parent_id) === 0).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
            const childrenOf = (pid) => menus.filter(m => toNum(m.parent_id) === toNum(pid) && toNum(m.parent_id) !== 0).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

            return parents.map(menu => {
              const children = childrenOf(menu.id)
              const hasChildren = children.length > 0

              // 有子菜单的一级菜单：只展开/收起，不跳转
              if (hasChildren) {
                return (
                  <div key={menu.id} className="mb-1">
                    <button
                      onClick={() => toggleMenu(menu.id)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-lg">{menu.icon || '📄'}</span>
                      {!desktopCollapsed && (
                        <>
                          <span className="flex-1 text-left">{menu.name}</span>
                          <span className="text-xs text-gray-400">{expandedMenus.includes(menu.id) ? '▼' : '▶'}</span>
                        </>
                      )}
                    </button>
                    {/* 子菜单 */}
                    {expandedMenus.includes(menu.id) && !desktopCollapsed && (
                      <div className="mt-1">
                        {children.map(child => (
                          <NavLink
                            key={child.id}
                            to={child.path}
                            onClick={closeSidebar}
                            className={({ isActive }) =>
                              `flex items-center gap-2 pl-12 pr-4 py-2 mx-2 rounded-lg text-sm transition-colors ${
                                isActive ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-500 hover:bg-gray-50'
                              }`
                            }
                          >
                            <span className="text-xs">└</span>
                            <span>{child.name}</span>
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }

              // 没有子菜单的一级菜单：直接跳转
              return (
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
                  {!desktopCollapsed && <span>{menu.name}</span>}
                </NavLink>
              )
            })
          })()}
        </nav>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 min-w-0">
        {/* 顶部栏 - 手机端显示汉堡按钮 */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-2xl text-gray-600 lg:hidden p-1"
            >
              ☰
            </button>
            <h1 className="text-lg font-semibold text-gray-800">
              {user?.name || user?.username}
              <span className="text-gray-300 mx-2">·</span>
              <span className="text-sm font-normal text-gray-500">{user?.role === 'admin' ? t('role.admin', '超级管理员') : user?.role === 'manager' ? t('role.manager', '管理员') : t('role.user', '用户')}</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="text-sm text-gray-500 hover:text-primary-600 flex items-center gap-1 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={darkMode ? t('layout.switchToDay', '切换到日间模式') : t('layout.switchToNight', '切换到夜间模式')}
            >
              <span className="text-lg">{darkMode ? '☀️' : '🌙'}</span>
            </button>
            <Link to="/" target="_blank" className="text-sm text-gray-500 hover:text-primary-600 flex items-center gap-1">
              <span>🌐</span>{t('layout.viewFrontend', '查看前台')}
            </Link>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-500 flex items-center gap-1">
              <span>🚪</span>{t('login.logout', '退出登录')}
            </button>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
