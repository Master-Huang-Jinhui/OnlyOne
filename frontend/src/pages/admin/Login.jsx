import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Button, Input, toast } from '../../components/ui'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username || !password) {
      toast('请输入账号和密码', 'error')
      return
    }
    setLoading(true)
    try {
      const user = await login(username, password)
      toast('登录成功')
      if (user.role === 'admin') navigate('/admin')
      else if (user.role === 'employee') navigate('/employee')
      else navigate('/')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <div className="text-5xl mb-3">🍵</div>
            <h1 className="text-2xl font-bold text-gray-800">Only One 平台管理</h1>
            <p className="text-gray-400 text-sm mt-1">一站式管理系统</p>
          </Link>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="账号"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="请输入账号"
              autoComplete="username"
            />
            <Input
              label="密码"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="请输入密码"
              autoComplete="current-password"
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '登录中...' : '登 录'}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-gray-400 space-y-1">
            <p>管理员登录进入管理后台</p>
            <p>员工登录进入点餐界面</p>
            <p className="text-xs">默认账号：admin / admin</p>
            <Link to="/" className="text-primary-500 hover:text-primary-600 mt-2 inline-block">← 返回前台</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
