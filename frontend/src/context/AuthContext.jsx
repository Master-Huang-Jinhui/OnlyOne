import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // 应用启动时检查本地token，自动登录
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      api.getMe().then(setUser).catch(() => {
        localStorage.removeItem('token')
      }).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  // 用户登录，保存token到localStorage
  const login = async (username, password) => {
    const res = await api.login(username, password)
    localStorage.setItem('token', res.token)
    setUser(res.user)
    return res.user
  }

  // 退出登录，清除token和用户状态
  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  // 是否为超级管理员
  const isAdmin = user?.role === 'admin'
  // 是否为员工（含管理员）
  const isEmployee = user?.role === 'employee' || user?.role === 'admin'

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin, isEmployee }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
