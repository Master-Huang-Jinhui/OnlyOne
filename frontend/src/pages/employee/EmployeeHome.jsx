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
  const [tableDialog, setTableDialog] = useState(false)
  const [tables, setTables] = useState([])

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

  // 打开堂吃选桌对话框
  const openDineIn = async () => {
    try {
      const data = await api.getPublicTables()
      setTables(Array.isArray(data) ? data : [])
      setTableDialog(true)
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  // 选择桌子后进入点餐
  const selectTable = (table) => {
    setTableDialog(false)
    navigate(`/employee/order?type=dinein&tableId=${table.id}&tableNo=${encodeURIComponent(table.table_no)}`)
  }

  // 打包直接进入点餐
  const goTakeout = () => {
    navigate('/employee/order?type=takeout')
  }

  const dateStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
  const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false })

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 flex flex-col">
      {/* 顶部栏 */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5">
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
        <p className="text-xl text-gray-500 mb-10">{user?.name || user?.username}</p>

        {/* 打卡状态 */}
        <div className="flex items-center gap-8 mb-10 text-sm bg-white/70 px-6 py-3 rounded-xl shadow-sm">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${attendance?.clock_in ? 'bg-green-500' : 'bg-gray-300'}`}></span>
            <span className="text-gray-600">最早上班 <span className="font-mono font-medium text-gray-800">{attendance?.clock_in || '--:--:--'}</span></span>
          </div>
          <div className="w-px h-4 bg-gray-200"></div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${attendance?.clock_out ? 'bg-green-500' : 'bg-gray-300'}`}></span>
            <span className="text-gray-600">最晚下班 <span className="font-mono font-medium text-gray-800">{attendance?.clock_out || '--:--:--'}</span></span>
          </div>
        </div>

        {/* 功能按钮：打卡 + 点餐方式 */}
        <div className="w-full max-w-3xl">
          {/* 第一行：打卡 */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <button
              onClick={handleClockIn}
              className="flex-1 py-6 px-6 rounded-2xl bg-gradient-to-br from-green-400 to-green-500 text-white font-bold text-lg shadow-lg hover:from-green-500 hover:to-green-600 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col items-center gap-2"
            >
              <span className="text-3xl">⏰</span>
              <span>上班打卡</span>
            </button>
            <button
              onClick={handleClockOut}
              className="flex-1 py-6 px-6 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-500 text-white font-bold text-lg shadow-lg hover:from-orange-500 hover:to-orange-600 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col items-center gap-2"
            >
              <span className="text-3xl">🏃</span>
              <span>下班打卡</span>
            </button>
          </div>

          {/* 第二行：点餐方式 */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={openDineIn}
              className="flex-1 py-7 px-6 rounded-2xl bg-white border-2 border-primary-200 text-primary-600 font-bold text-lg shadow-md hover:border-primary-400 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col items-center gap-2"
            >
              <span className="text-3xl">🍽️</span>
              <span>堂吃点餐</span>
              <span className="text-xs font-normal text-gray-400">选择桌号后点餐</span>
            </button>
            <button
              onClick={goTakeout}
              className="flex-1 py-7 px-6 rounded-2xl bg-white border-2 border-amber-200 text-amber-600 font-bold text-lg shadow-md hover:border-amber-400 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col items-center gap-2"
            >
              <span className="text-3xl">🥡</span>
              <span>打包点餐</span>
              <span className="text-xs font-normal text-gray-400">凭取餐号取餐</span>
            </button>
          </div>
        </div>
      </main>

      {/* 底部 */}
      <footer className="text-center py-6 text-xs text-gray-300">
        Only One BBQ & Tea · 员工工作台
      </footer>

      {/* 选择桌子对话框 */}
      <Dialog open={tableDialog} onClose={() => setTableDialog(false)} title="选择餐桌" width="max-w-md">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-80 overflow-y-auto">
          {tables.length === 0 && <p className="col-span-full text-center text-gray-400 py-8">暂无餐桌，请先在后台添加</p>}
          {tables.map(table => (
            <button
              key={table.id}
              onClick={() => selectTable(table)}
              className={`py-4 rounded-xl border-2 font-bold text-lg transition-all ${
                table.status === 'occupied'
                  ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white border-primary-200 text-primary-600 hover:border-primary-400 hover:bg-primary-50 hover:shadow-md'
              }`}
              disabled={table.status === 'occupied'}
            >
              {table.table_no}
              {table.status === 'occupied' && <p className="text-xs font-normal mt-1">占用中</p>}
            </button>
          ))}
        </div>
      </Dialog>

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