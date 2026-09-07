import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menus, setMenus] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)

  useEffect(() => {
    api.getMenus().then(data => {
      let menuList = Array.isArray(data) ? data : []
      if (user?.role === 'manager') {
        try {
          const perms = JSON.parse(user.permissions || '{}')
          const allowedIds = perms.menus || []
          if (allowedIds.length > 0) {
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

  const SidebarContent = ({ onNavigate, showCollapse }) => (
    <>
      <div className="h-16 flex items-center justify-between px-4 border-b flex-shrink-0">
        <Link to="/admin" className="flex items-center gap-2" onClick={onNavigate}>
          <span className="text-xl">🍵</span>
          {!desktopCollapsed && <span className="font-bold text-gray-800 text-sm">OnlyOne 管理</span>}
        </Link>
        {showCollapse && (
          <button
            onClick={() => setDesktopCollapsed(!desktopCollapsed)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            {desktopCollapsed ? '▶' : '◀'}
          </button>
        )}
        {!showCollapse && (
          <button onClick={closeSidebar} className="text-gray-400 hover:text-gray-600 p-1">
            ✕
          </button>
        )}
      </div>
      <nav className="flex-1 py-4 overflow-y-auto">
        {(menus || []).map(menu => (
          <NavLink
            key={menu.id}
            to={menu.path}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
              }`
            }
          >
            <span className="text-lg">{menu.icon || '📄'}</span>
            {!desktopCollapsed && <span>{menu.name}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t flex-shrink-0">
        <Link to="/" target="_blank" className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 mb-3" onClick={onNavigate}>
          <span>🌐</span>{!desktopCollapsed && <span>查看前台</span>}
        </Link>
        <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-500 w-full">
          <span>🚪</span>{!desktopCollapsed && <span>退出登录</span>}
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 桌面端侧边栏（固定不动） */}
      <aside className={`hidden lg:flex flex-col bg-white border-r border-gray-200 transition-all duration-200 sticky top-0 h-screen ${desktopCollapsed ? 'w-16' : 'w-60'}`}>
        <SidebarContent showCollapse={true} />
      </aside>

      {/* 手机端侧边栏抽屉 */}
      {sidebarOpen && (
        <>
          <div
            onClick={closeSidebar}
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          />
          <aside className="fixed inset-y-0 left-0 w-60 bg-white border-r border-gray-200 z-50 flex flex-col lg:hidden shadow-xl">
            <SidebarContent onNavigate={closeSidebar} showCollapse={false} />
          </aside>
        </>
      )}

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-2xl text-gray-600 lg:hidden p-1 -ml-1"
            >
              ☰
            </button>
            <h1 className="text-lg font-semibold text-gray-800">OnlyOne 平台管理</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 hidden sm:inline">{user?.name || user?.username}</span>
            <span className={`px-2 py-0.5 rounded text-xs ${user?.role === 'admin' ? 'bg-primary-100 text-primary-700' : user?.role === 'manager' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {user?.role === 'admin' ? '超级管理员' : user?.role === 'manager' ? '管理员' : '用户'}
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
