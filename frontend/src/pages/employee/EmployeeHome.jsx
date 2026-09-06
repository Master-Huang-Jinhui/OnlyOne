import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { Dialog, Input, Button, toast } from '../../components/ui'

export default function EmployeeHome() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [attendance, setAttendance] = useState(null)
  const [pwdDialog, setPwdDialog] = useState(false)
  const [pwdForm, setPwdForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    api.getTodayAttendance().then(setAttendance).catch(() => {})
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleClockIn = async () => {
    try {
      const res = await api.clockIn()
      toast(res.message || '上班打卡成功')
      setAttendance(prev => ({ ...prev, clock_in: res.clock_in }))
    } catch (e) { toast(e.message, 'error') }
  }

  const handleClockOut = async () => {
    try {
      const res = await api.clockOut()
      toast(res.message || '下班打卡成功')
      setAttendance(prev => ({ ...prev, clock_out: res.clock_out }))
    } catch (e) { toast(e.message, 'error') }
  }

  const handleChangePassword = async () => {
    if (!pwdForm.oldPassword || !pwdForm.newPassword) { toast('请填写完整', 'error'); return }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) { toast('两次密码不一致', 'error'); return }
    try {
      await api.changePassword(pwdForm.oldPassword, pwdForm.newPassword)
      toast('密码修改成功')
      setPwdDialog(false)
      setPwdForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
    } catch (e) { toast(e.message, 'error') }
  }

  const dateStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
  const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false })
  const hasClockedIn = !!attendance?.clock_in
  const hasClockedOut = !!attendance?.clock_out

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 flex flex-col">
      {/* 顶部栏 */}
      <header className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center text-white text-xl shadow-md">
            🍵
          </div>
          <span className="text-xl font-bold text-gray-800 tracking-wide">OnlyOne</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setPwdDialog(true)} className="text-sm text-gray-500 hover:text-primary-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/60">
            修改密码
          </button>
          <button onClick={logout} className="text-sm text-gray-500 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/60">
            退出
          </button>
        </div>
      </header>

      {/* 主内容 */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 -mt-16">
        {/* 时间日期 */}
        <div className="text-center mb-8">
          <p className="text-5xl font-light text-gray-700 tracking-wider tabular-nums">{timeStr}</p>
          <p className="text-base text-gray-400 mt-3">{dateStr}</p>
        </div>

        {/* 欢迎语 */}
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2 text-center">
          欢迎回来
        </h1>
        <p className="text-xl text-gray-500 mb-12">{user?.name || user?.username}</p>

        {/* 打卡状态 */}
        <div className="flex items-center gap-6 mb-10 text-sm">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${hasClockedIn ? 'bg-green-500' : 'bg-gray-300'}`}></span>
            <span className="text-gray-500">上班 {attendance?.clock_in || '--:--:--'}</span>
          </div>
          <div className="w-px h-4 bg-gray-200"></div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${hasClockedOut ? 'bg-green-500' : 'bg-gray-300'}`}></span>
            <span className="text-gray-500">下班 {attendance?.clock_out || '--:--:--'}</span>
          </div>
        </div>

        {/* 两个大按钮 */}
        <div className="flex flex-col sm:flex-row gap-5 w-full max-w-lg">
          {/* 打卡按钮 */}
          <button
            onClick={hasClockedIn && !hasClockedOut ? handleClockOut : (!hasClockedIn ? handleClockIn : undefined)}
            disabled={hasClockedOut}
            className={`flex-1 py-8 px-8 rounded-2xl text-white font-bold text-xl shadow-lg transition-all duration-300 flex flex-col items-center gap-2 ${
              hasClockedOut
                ? 'bg-gray-300 cursor-not-allowed shadow-none'
                : hasClockedIn
                  ? 'bg-gradient-to-br from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 hover:shadow-xl hover:-translate-y-0.5'
                  : 'bg-gradient-to-br from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 hover:shadow-xl hover:-translate-y-0.5'
            }`}
          >
            <span className="text-3xl">{hasClockedOut ? '✅' : hasClockedIn ? '🏃' : '⏰'}</span>
            <span>{hasClockedOut ? '今日已打卡' : hasClockedIn ? '下班打卡' : '上班打卡'}</span>
          </button>

          {/* 堂吃按钮 */}
          <button
            onClick={() => navigate('/employee/order')}
            className="flex-1 py-8 px-8 rounded-2xl bg-white border-2 border-primary-200 text-primary-600 font-bold text-xl shadow-md hover:border-primary-400 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col items-center gap-2"
          >
            <span className="text-3xl">🍽️</span>
            <span>开始点餐</span>
          </button>
        </div>
      </main>

      {/* 底部 */}
      <footer className="text-center py-6 text-xs text-gray-300">
        Only One BBQ & Tea · 员工工作台
      </footer>

      {/* 修改密码对话框 */}
      <Dialog open={pwdDialog} onClose={() => setPwdDialog(false)} title="修改密码" width="max-w-sm">
        <div className="space-y-4">
          <Input label="当前密码" type="password" value={pwdForm.oldPassword} onChange={e => setPwdForm({ ...pwdForm, oldPassword: e.target.value })} />
          <Input label="新密码" type="password" value={pwdForm.newPassword} onChange={e => setPwdForm({ ...pwdForm, newPassword: e.target.value })} />
          <Input label="确认新密码" type="password" value={pwdForm.confirmPassword} onChange={e => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })} />
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setPwdDialog(false)}>取消</Button>
            <Button className="flex-1" onClick={handleChangePassword}>确认修改</Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
