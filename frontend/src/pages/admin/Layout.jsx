import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'

export default function AdminLayout() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [menus, setMenus] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    api.getMenus().then(data => {
      if (!isAdmin) { setMenus(data.filter(m => m.path === '/admin/platforms')) }
      else { setMenus(data) }
    }).catch(() => {})
  }, [isAdmin])

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className={`${sidebarOpen ? 'w-60' : 'w-16'} bg-white border-r border-gray-200 flex flex-col transition-all duration-200 fixed h-full z-40`}>
        <div className="h-16 flex items-center justify-between px-4 border-b">
          {sidebarOpen && (
            <Link to="/admin" className="flex items-center gap-2">
              <span className="text-xl">🍵</span>
              <span className="font-bold text-gray-800 text-sm">OnlyOne 管理</span>
            </Link>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-400 hover:text-gray-600 p-1">{sidebarOpen ? '◀' : '▶'}</button>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          {menus.map(menu => (
            <NavLink key={menu.id} to={menu.path}
              className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
              <span className="text-lg">{menu.icon || '📄'}</span>
              {sidebarOpen && <span>{menu.name}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t">
          <Link to="/" target="_blank" className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 mb-3">
            <span>🌐</span>{sidebarOpen && <span>查看前台</span>}
          </Link>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-500 w-full">
            <span>🚪</span>{sidebarOpen && <span>退出登录</span>}
          </button>
        </div>
      </aside>

      <div className={`flex-1 ${sidebarOpen ? 'ml-60' : 'ml-16'} transition-all duration-200`}>
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-30">
          <div><h1 className="text-lg font-semibold text-gray-800">OnlyOne 平台管理</h1></div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{user?.name || user?.username}</span>
            <span className={`px-2 py-0.5 rounded text-xs ${isAdmin ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}>{isAdmin ? '管理员' : '用户'}</span>
          </div>
        </header>
        <main className="p-6"><Outlet /></main>
      </div>
    </div>
  )
}
