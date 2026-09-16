import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { api } from '../../lib/api'
import { Dialog, Input, Button, toast } from '../../components/ui'
import LanguageSwitcher from '../../components/LanguageSwitcher'

export default function EmployeeHome() {
  // 员工主页：时钟显示 + 打卡 + 堂吃/打包点餐入口 + 订单查询 + 修改密码
  const { user, logout } = useAuth()
  const { t, language } = useLanguage()
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

  // 上班打卡
  const handleClockIn = async () => {
    try {
      const res = await api.clockIn()
      toast(res.message || t('employee.clockInSuccess', '上班打卡成功'))
      setAttendance(prev => ({ ...prev, clock_in: res.clock_in }))
    } catch (e) { toast(e.message, 'error') }
  }

  // 下班打卡
  const handleClockOut = async () => {
    try {
      const res = await api.clockOut()
      toast(res.message || t('employee.clockOutSuccess', '下班打卡成功'))
      setAttendance(prev => ({ ...prev, clock_out: res.clock_out }))
    } catch (e) { toast(e.message, 'error') }
  }

  // 修改密码（校验两次密码一致）
  const handleChangePassword = async () => {
    if (!pwdForm.oldPassword || !pwdForm.newPassword) { toast(t('common.fillAll', '请填写完整'), 'error'); return }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) { toast(t('employee.passwordMismatch', '两次密码不一致'), 'error'); return }
    try {
      await api.changePassword(pwdForm.oldPassword, pwdForm.newPassword)
      toast(t('employee.passwordChanged', '密码修改成功'))
      setPwdDialog(false)
      setPwdForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
    } catch (e) { toast(e.message, 'error') }
  }

  // 打开堂吃餐桌选择弹窗
  const openDineIn = async () => {
    try {
      const data = await api.getPublicTables()
      setTables(Array.isArray(data) ? data : [])
      setTableDialog(true)
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  // 选择餐桌：已占用则进入详情加单，未占用则进入点餐页
  const selectTable = (table) => {
    setTableDialog(false)
    if (table.status === 'occupied') {
      navigate(`/employee/table-detail?tableId=${table.id}&tableNo=${encodeURIComponent(table.table_no)}`)
    } else {
      navigate(`/employee/order?type=dinein&tableId=${table.id}&tableNo=${encodeURIComponent(table.table_no)}`)
    }
  }

  const goTakeout = () => {
    navigate('/employee/order?type=takeout')
  }

  const localeMap = { zh: 'zh-CN', en: 'en-US', es: 'es-ES' }
  const dateStr = now.toLocaleDateString(localeMap[language] || 'zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
  const timeStr = now.toLocaleTimeString(localeMap[language] || 'zh-CN', { hour12: false })

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 flex flex-col">
      <header className="relative z-10 flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center text-white text-xl shadow-md">
            🍵
          </div>
          <span className="text-xl font-bold text-gray-800 tracking-wide">OnlyOne</span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <button onClick={() => setPwdDialog(true)} className="text-sm text-gray-500 hover:text-primary-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/60">
            {t('employee.changePassword', '修改密码')}
          </button>
          <button onClick={logout} className="text-sm text-gray-500 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/60">
            {t('admin.logout', '退出')}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-8 -mt-16">
        <div className="text-center mb-8">
          <p className="text-5xl font-light text-gray-700 tracking-wider tabular-nums">{timeStr}</p>
          <p className="text-base text-gray-400 mt-3">{dateStr}</p>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2 text-center">
          {t('employee.welcome', '欢迎回来')}
        </h1>
        <p className="text-xl text-gray-500 mb-10">{user?.name || user?.username}</p>

        <div className="flex items-center gap-8 mb-10 text-sm bg-white/70 px-6 py-3 rounded-xl shadow-sm">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${attendance?.clock_in ? 'bg-green-500' : 'bg-gray-300'}`}></span>
            <span className="text-gray-600">{t('employee.earliestClockIn', '最早上班')} <span className="font-mono font-medium text-gray-800">{attendance?.clock_in || '--:--:--'}</span></span>
          </div>
          <div className="w-px h-4 bg-gray-200"></div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${attendance?.clock_out ? 'bg-green-500' : 'bg-gray-300'}`}></span>
            <span className="text-gray-600">{t('employee.latestClockOut', '最晚下班')} <span className="font-mono font-medium text-gray-800">{attendance?.clock_out || '--:--:--'}</span></span>
          </div>
        </div>

        <div className="w-full max-w-3xl">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <button
              onClick={openDineIn}
              className="flex-1 py-7 px-6 rounded-2xl bg-white border-2 border-primary-200 text-primary-600 font-bold text-lg shadow-md hover:border-primary-400 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col items-center gap-2"
            >
              <span className="text-3xl">🍽️</span>
              <span>{t('employee.dineInOrder', '堂吃点餐')}</span>
              <span className="text-xs font-normal text-gray-400">{t('employee.selectTableHint', '选择桌号后点餐')}</span>
            </button>
            <button
              onClick={goTakeout}
              className="flex-1 py-7 px-6 rounded-2xl bg-white border-2 border-amber-200 text-amber-600 font-bold text-lg shadow-md hover:border-amber-400 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col items-center gap-2"
            >
              <span className="text-3xl">🥡</span>
              <span>{t('employee.takeoutOrder', '打包点餐')}</span>
              <span className="text-xs font-normal text-gray-400">{t('employee.takeoutHint', '凭取餐号取餐')}</span>
            </button>
            <button
              onClick={() => navigate('/employee/orders')}
              className="flex-1 py-7 px-6 rounded-2xl bg-white border-2 border-purple-200 text-purple-600 font-bold text-lg shadow-md hover:border-purple-400 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col items-center gap-2"
            >
              <span className="text-3xl">📋</span>
              <span>{t('employee.orderQuery', '订单查询')}</span>
              <span className="text-xs font-normal text-gray-400">{t('employee.orderQueryHint', '查看确认今日订单')}</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleClockIn}
              className="flex-1 py-6 px-6 rounded-2xl bg-gradient-to-br from-green-400 to-green-500 text-white font-bold text-lg shadow-lg hover:from-green-500 hover:to-green-600 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col items-center gap-2"
            >
              <span className="text-3xl">⏰</span>
              <span>{t('employee.clockIn', '上班打卡')}</span>
            </button>
            <button
              onClick={handleClockOut}
              className="flex-1 py-6 px-6 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-500 text-white font-bold text-lg shadow-lg hover:from-orange-500 hover:to-orange-600 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col items-center gap-2"
            >
              <span className="text-3xl">🏃</span>
              <span>{t('employee.clockOut', '下班打卡')}</span>
            </button>
          </div>
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-gray-300">
        Only One BBQ & Tea · {t('employee.terminal', '员工工作台')}
      </footer>

      <Dialog open={tableDialog} onClose={() => setTableDialog(false)} title={t('employee.selectTable', '选择餐桌')} width="max-w-md">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-80 overflow-y-auto">
          {tables.length === 0 && <p className="col-span-full text-center text-gray-400 py-8">{t('employee.noTables', '暂无餐桌，请先在后台添加')}</p>}
          {tables.map(table => (
            <button
              key={table.id}
              onClick={() => selectTable(table)}
              className={`py-4 rounded-xl border-2 font-bold text-lg transition-all ${
                table.status === 'occupied'
                  ? 'bg-orange-50 border-orange-300 text-orange-600 hover:border-orange-400 hover:bg-orange-100 hover:shadow-md'
                  : 'bg-white border-primary-200 text-primary-600 hover:border-primary-400 hover:bg-primary-50 hover:shadow-md'
              }`}
            >
              {table.table_no}
              {table.status === 'occupied' && <p className="text-xs font-normal mt-1">{t('employee.diningAddOrder', '用餐中 · 点击加单')}</p>}
            </button>
          ))}
        </div>
      </Dialog>

      <Dialog open={pwdDialog} onClose={() => setPwdDialog(false)} title={t('employee.changePassword', '修改密码')} width="max-w-sm">
        <div className="space-y-4">
          <Input label={t('employee.currentPassword', '当前密码')} type="password" value={pwdForm.oldPassword} onChange={e => setPwdForm({ ...pwdForm, oldPassword: e.target.value })} />
          <Input label={t('employee.newPassword', '新密码')} type="password" value={pwdForm.newPassword} onChange={e => setPwdForm({ ...pwdForm, newPassword: e.target.value })} />
          <Input label={t('employee.confirmPassword', '确认新密码')} type="password" value={pwdForm.confirmPassword} onChange={e => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })} />
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setPwdDialog(false)}>{t('common.cancel', '取消')}</Button>
            <Button className="flex-1" onClick={handleChangePassword}>{t('employee.confirmChange', '确认修改')}</Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
