import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { useLanguage } from '../../context/LanguageContext'
import { Button, Input, Dialog, toast, Badge, Select, Textarea } from '../../components/ui'
import { useConfirm } from '../../components/ConfirmDialog'

export default function Tables() {
  // 餐桌管理：餐桌CRUD + 分区管理 + 预订管理 + 翻台统计 + 二维码 + 清桌/转桌/并桌/维护
  const { t } = useLanguage()
  const confirm = useConfirm()
  const [tables, setTables] = useState([])
  const [zones, setZones] = useState([])
  const [activeZone, setActiveZone] = useState('全部')
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('tables') // tables | reservations | stats

  const STATUS_MAP = {
    idle: { label: t('tables.statusIdle', '空闲'), color: 'green', bg: 'bg-green-50', border: 'border-green-200' },
    occupied: { label: t('tables.statusOccupied', '用餐中'), color: 'orange', bg: 'bg-orange-50', border: 'border-orange-200' },
    reserved: { label: t('tables.statusReserved', '已预订'), color: 'blue', bg: 'bg-blue-50', border: 'border-blue-200' },
    cleaning: { label: t('tables.statusCleaning', '清理中'), color: 'yellow', bg: 'bg-yellow-50', border: 'border-yellow-200' },
    maintenance: { label: t('tables.statusMaintenance', '维护中'), color: 'gray', bg: 'bg-gray-100', border: 'border-gray-300' }
  }

  // 弹窗状态
  const [showAdd, setShowAdd] = useState(false)
  const [showBatch, setShowBatch] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ table_no: '', zone: '大厅', seats: 4, sort_order: 0, min_charge: 0, note: '' })
  const [batchForm, setBatchForm] = useState({ prefix: 'A', start: 1, count: 10, zone: '大厅', seats: 4 })
  const [qrTable, setQrTable] = useState(null)
  const [qrCustomUrl, setQrCustomUrl] = useState('')
  const [showTransfer, setShowTransfer] = useState(false)
  const [transferFrom, setTransferFrom] = useState(null)
  const [transferTo, setTransferTo] = useState('')
  const [showMerge, setShowMerge] = useState(false)
  const [mergeMain, setMergeMain] = useState(null)
  const [mergeTarget, setMergeTarget] = useState('')
  const [showZoneManage, setShowZoneManage] = useState(false)
  const [zoneForm, setZoneForm] = useState({ name: '', sort_order: 0 })
  const [editingZone, setEditingZone] = useState(null)

  // 预订相关
  const [reservations, setReservations] = useState([])
  const [showResAdd, setShowResAdd] = useState(false)
  const [editingRes, setEditingRes] = useState(null)
  const [resForm, setResForm] = useState({ table_no: '', customer_name: '', customer_phone: '', reserve_date: '', reserve_time: '', party_size: 2, note: '' })

  // 统计
  const [turnoverStats, setTurnoverStats] = useState(null)

  // 加载餐桌列表和分区列表
  const load = () => {
    setLoading(true)
    const params = activeZone !== '全部' ? { zone: activeZone } : {}
    api.getTables(params).then(setTables).catch(e => toast(e.message, 'error')).finally(() => setLoading(false))
    api.getTableZones().then(setZones).catch(() => {})
  }

  // 加载预订列表
  const loadReservations = () => {
    api.getReservations().then(setReservations).catch(() => {})
  }

  // 加载翻台统计数据
  const loadStats = () => {
    api.getTableTurnoverStats().then(setTurnoverStats).catch(() => {})
  }

  useEffect(() => { load() }, [activeZone])
  useEffect(() => { if (tab === 'reservations') loadReservations() }, [tab])
  useEffect(() => { if (tab === 'stats') loadStats() }, [tab])

  // 保存餐桌（新增或编辑）
  const handleSave = () => {
    if (!form.table_no.trim()) { toast(t('tables.tableNoRequired', '请输入桌号'), 'error'); return }
    if (editing) {
      api.updateTable(editing.id, form).then(() => { toast(t('tables.saved', '保存成功')); setShowAdd(false); setEditing(null); load() }).catch(e => toast(e.message, 'error'))
    } else {
      api.createTable(form).then(() => { toast(t('tables.added', '添加成功')); setShowAdd(false); load() }).catch(e => toast(e.message, 'error'))
    }
  }

  // 批量生成餐桌（前缀+序号范围）
  const handleBatch = () => {
    api.batchCreateTables(batchForm).then(data => {
      toast(`${t('tables.batchAdded', '成功添加')} ${data.created_count} ${t('tables.tablesUnit', '桌')}${data.error_count > 0 ? `，${data.error_count} ${t('tables.skippedExist', '桌已存在跳过')}` : ''}`)
      setShowBatch(false)
      load()
    }).catch(e => toast(e.message, 'error'))
  }

  // 清桌（合并结算当前订单，桌变为清理中）
  const handleClear = async (table) => {
    if (!await confirm({ title: t('tables.clearTitle', '清桌确认'), message: `${t('tables.clearMsgPrefix', '确定清桌')} ${table.table_no}${t('tables.clearMsgSuffix', '？清桌后当前订单将合并结算，下一桌扫码是全新的。')}`, variant: 'warning' })) return
    api.clearTable(table.id).then(() => { toast(t('tables.cleared', '已清桌，状态：清理中')); load() }).catch(e => toast(e.message, 'error'))
  }

  // 清理完成：桌变为空闲
  const handleCleanDone = (table) => {
    api.cleanDoneTable(table.id).then(() => { toast(t('tables.cleanDone', '清理完成，已设为空闲')); load() }).catch(e => toast(e.message, 'error'))
  }

  // 删除餐桌（需确认）
  const handleDelete = async (table) => {
    if (!await confirm({ title: t('tables.deleteTableTitle', '删除餐桌'), message: `${t('tables.deleteTableMsgPrefix', '确定删除餐桌')} ${table.table_no}${t('tables.deleteTableMsgSuffix', '？')}`, variant: 'danger' })) return
    api.deleteTable(table.id).then(() => { toast(t('tables.deleted', '已删除')); load() }).catch(e => toast(e.message, 'error'))
  }

  // 切换餐桌维护状态
  const handleMaintenance = (table) => {
    const isMaint = table.status === 'maintenance'
    api.setTableMaintenance(table.id, !isMaint).then(() => { toast(isMaint ? t('tables.restored', '已恢复使用') : t('tables.setMaintenance', '已设为维护中')); load() }).catch(e => toast(e.message, 'error'))
  }

  // 转桌：将订单和会话从源桌转移到目标桌
  const handleTransfer = () => {
    if (!transferTo) { toast(t('tables.targetRequired', '请选择目标桌'), 'error'); return }
    api.transferTable({ from_table_id: transferFrom.id, to_table_id: parseInt(transferTo) }).then(() => {
      toast(t('tables.transferred', '转桌成功')); setShowTransfer(false); setTransferFrom(null); setTransferTo(''); load()
    }).catch(e => toast(e.message, 'error'))
  }

  // 并桌：将目标桌订单合并到主桌
  const handleMerge = () => {
    if (!mergeTarget) { toast(t('tables.mergeRequired', '请选择并桌'), 'error'); return }
    api.mergeTables({ main_table_id: mergeMain.id, merge_table_id: parseInt(mergeTarget) }).then(() => {
      toast(t('tables.merged', '并桌成功')); setShowMerge(false); setMergeMain(null); setMergeTarget(''); load()
    }).catch(e => toast(e.message, 'error'))
  }

  // 保存餐桌自定义扫码URL
  const saveQrCustomUrl = () => {
    if (!qrTable) return
    api.updateTable(qrTable.id, { qr_custom_url: qrCustomUrl }).then(() => {
      toast(t('tables.qrSaved', '二维码地址已保存'))
      qrTable.qr_custom_url = qrCustomUrl
      setQrTable({ ...qrTable })
    }).catch(e => toast(e.message, 'error'))
  }

  // 获取餐桌扫码点餐链接（优先自定义URL）
  const getQrUrl = (table) => {
    if (table.qr_custom_url) return table.qr_custom_url
    const base = window.location.origin
    return `${base}/table?s=${encodeURIComponent(table.table_no)}`
  }

  // 保存分区（新增或编辑）
  const handleZoneSave = () => {
    if (!zoneForm.name.trim()) { toast(t('tables.zoneNameRequired', '分区名称必填'), 'error'); return }
    if (editingZone) {
      api.updateTableZone(editingZone.id, zoneForm).then(() => { toast(t('tables.saved', '保存成功')); setShowZoneManage(false); setEditingZone(null); load() }).catch(e => toast(e.message, 'error'))
    } else {
      api.createTableZone(zoneForm).then(() => { toast(t('tables.added', '添加成功')); setZoneForm({ name: '', sort_order: 0 }); load() }).catch(e => toast(e.message, 'error'))
    }
  }

  // 删除分区（桌位移到大厅）
  const handleZoneDelete = async (zone) => {
    if (!await confirm({ title: t('tables.deleteZoneTitle', '删除分区'), message: `${t('tables.deleteZoneMsgPrefix', '确定删除分区')} ${zone.name}${t('tables.deleteZoneMsgSuffix', '？该分区下的桌子将移到"大厅"')}`, variant: 'danger' })) return
    api.deleteTableZone(zone.id).then(() => { toast(t('tables.deleted', '已删除')); load() }).catch(e => toast(e.message, 'error'))
  }

  // 保存预订（新增或编辑）
  const handleResSave = () => {
    if (!resForm.customer_name.trim()) { toast(t('tables.customerNameRequired', '客户姓名必填'), 'error'); return }
    if (!resForm.reserve_date || !resForm.reserve_time) { toast(t('tables.resDateTimeRequired', '预订日期和时间必填'), 'error'); return }
    if (editingRes) {
      api.updateReservation(editingRes.id, resForm).then(() => { toast(t('tables.saved', '保存成功')); setShowResAdd(false); setEditingRes(null); loadReservations() }).catch(e => toast(e.message, 'error'))
    } else {
      api.createReservation(resForm).then(() => { toast(t('tables.resSuccess', '预订成功')); setShowResAdd(false); loadReservations() }).catch(e => toast(e.message, 'error'))
    }
  }

  // 删除预订（需确认）
  const handleResDelete = async (res) => {
    if (!await confirm({ title: t('tables.deleteResTitle', '删除预订'), message: t('tables.deleteResMsg', '确定删除此预订？'), variant: 'danger' })) return
    api.deleteReservation(res.id).then(() => { toast(t('tables.deleted', '已删除')); loadReservations() }).catch(e => toast(e.message, 'error'))
  }

  // 格式化用餐时长为"X小时Y分"
  const formatOpenedTime = (openedAt) => {
    if (!openedAt) return '-'
    const start = new Date(openedAt.replace(' ', 'T'))
    const now = new Date()
    const diff = Math.floor((now - start) / 60000)
    if (diff < 60) return `${diff}${t('tables.minutes', '分钟')}`
    return `${Math.floor(diff / 60)}${t('tables.hours', '小时')}${diff % 60}${t('tables.minShort', '分')}`
  }

  const allZones = ['全部', ...zones.map(z => z.name)]

  const tabItems = [
    { key: 'tables', label: t('tables.tabTables', '餐桌管理') },
    { key: 'reservations', label: t('tables.tabReservations', '预订管理') },
    { key: 'stats', label: t('tables.tabStats', '翻台统计') }
  ]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t('tables.title', '餐桌管理')}</h1>
          <p className="text-sm text-gray-400 mt-1">{t('tables.subtitle', '管理堂吃餐桌、分区、预订、扫码点餐二维码、清桌、转桌并桌')}</p>
        </div>
      </div>

      {/* Tab切换 */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {tabItems.map(tabItem => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === tabItem.key ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {/* 餐桌管理Tab */}
      {tab === 'tables' && (
        <>
          {/* 分区标签 + 操作按钮 */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex gap-2 flex-wrap">
              {allZones.map(z => (
                <button
                  key={z}
                  onClick={() => setActiveZone(z)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${activeZone === z ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {z === '全部' ? t('tables.all', '全部') : z}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowZoneManage(true)}>{t('tables.zoneManage', '分区管理')}</Button>
              <Button variant="outline" size="sm" onClick={() => setShowBatch(true)}>{t('tables.batchAdd', '批量添加')}</Button>
              <Button size="sm" onClick={() => { setForm({ table_no: '', zone: activeZone === '全部' ? '大厅' : activeZone, seats: 4, sort_order: tables.length + 1, min_charge: 0, note: '' }); setEditing(null); setShowAdd(true) }}>{t('tables.addTableBtn', '+ 添加餐桌')}</Button>
            </div>
          </div>

          {/* 餐桌卡片网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tables.map(table => {
              const st = STATUS_MAP[table.status] || STATUS_MAP.idle
              return (
                <div key={table.id} className={`rounded-xl p-5 shadow-sm border-2 ${st.bg} ${st.border}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">{table.table_no}</h3>
                      <span className="text-xs text-gray-400">{table.zone} · {table.seats}{t('tables.seatsUnit', '人桌')}</span>
                    </div>
                    <Badge color={st.color}>{st.label}</Badge>
                  </div>
                  <div className="text-sm text-gray-500 space-y-1 mb-4">
                    <div className="flex justify-between"><span>{t('tables.currentOrders', '当前订单')}</span><span className="font-medium text-gray-700">{table.active_orders || 0} {t('tables.ordersUnit', '笔')}</span></div>
                    <div className="flex justify-between"><span>{t('tables.currentSpend', '当前消费')}</span><span className="font-medium text-primary-600">${(table.active_total || 0).toFixed(2)}</span></div>
                    {table.status === 'occupied' && <div className="flex justify-between"><span>{t('tables.diningDuration', '用餐时长')}</span><span className="font-medium text-orange-600">{formatOpenedTime(table.opened_at)}</span></div>}
                    {table.min_charge > 0 && <div className="flex justify-between"><span>{t('tables.minCharge', '最低消费')}</span><span className="font-medium">${table.min_charge.toFixed(2)}</span></div>}
                    {table.note && <div className="text-xs text-gray-400 bg-white/50 rounded p-1.5">📝 {table.note}</div>}
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setQrTable(table)}>{t('tables.qrCode', '二维码')}</Button>
                    <Button size="sm" variant="outline" onClick={() => { setForm({ table_no: table.table_no, zone: table.zone, seats: table.seats, sort_order: table.sort_order, min_charge: table.min_charge || 0, note: table.note || '' }); setEditing(table); setShowAdd(true) }}>{t('common.edit', '编辑')}</Button>
                    {table.status === 'occupied' && <Button size="sm" variant="outline" color="blue" onClick={() => { setTransferFrom(table); setShowTransfer(true) }}>{t('tables.transfer', '转桌')}</Button>}
                    {table.status === 'occupied' && <Button size="sm" variant="outline" color="purple" onClick={() => { setMergeMain(table); setShowMerge(true) }}>{t('tables.merge', '并桌')}</Button>}
                    {table.status === 'cleaning' && <Button size="sm" variant="outline" color="green" onClick={() => handleCleanDone(table)}>{t('tables.done', '完成')}</Button>}
                    {table.status !== 'cleaning' && table.status !== 'maintenance' && <Button size="sm" variant="outline" color="orange" onClick={() => handleClear(table)}>{t('tables.clearTable', '清桌')}</Button>}
                    <Button size="sm" variant="outline" color={table.status === 'maintenance' ? 'green' : 'gray'} onClick={() => handleMaintenance(table)}>{table.status === 'maintenance' ? t('tables.restore', '恢复') : t('tables.maintain', '维护')}</Button>
                    <Button size="sm" variant="outline" color="red" onClick={() => handleDelete(table)}>{t('tables.deleteShort', '删')}</Button>
                  </div>
                </div>
              )
            })}
          </div>

          {tables.length === 0 && !loading && (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-3">🪑</div>
              <p>{t('tables.noTables', '该分区还没有餐桌，点击右上角添加')}</p>
            </div>
          )}
        </>
      )}

      {/* 预订管理Tab */}
      {tab === 'reservations' && (
        <div>
          <div className="flex justify-between mb-4">
            <p className="text-sm text-gray-500">{t('tables.resSubtitle', '管理客户预订，到店后可直接开桌')}</p>
            <Button size="sm" onClick={() => { setResForm({ table_no: '', customer_name: '', customer_phone: '', reserve_date: '', reserve_time: '', party_size: 2, note: '' }); setEditingRes(null); setShowResAdd(true) }}>{t('tables.addResBtn', '+ 添加预订')}</Button>
          </div>
          {reservations.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-3">📅</div>
              <p>{t('tables.noRes', '暂无预订')}</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">{t('tables.resDate', '日期')}</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">{t('common.time', '时间')}</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">{t('tables.tableNo', '桌号')}</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">{t('tables.customer', '客户')}</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">{t('tables.phone', '电话')}</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">{t('tables.partySize', '人数')}</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">{t('tables.note', '备注')}</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">{t('common.status', '状态')}</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">{t('common.action', '操作')}</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map(r => (
                    <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">{r.reserve_date}</td>
                      <td className="px-4 py-3">{r.reserve_time}</td>
                      <td className="px-4 py-3 font-medium">{r.table_no || '-'}</td>
                      <td className="px-4 py-3">{r.customer_name}</td>
                      <td className="px-4 py-3">{r.customer_phone || '-'}</td>
                      <td className="px-4 py-3">{r.party_size}{t('tables.peopleUnit', '人')}</td>
                      <td className="px-4 py-3 text-gray-400 max-w-[150px] truncate">{r.note || '-'}</td>
                      <td className="px-4 py-3"><Badge color={r.status === 'completed' ? 'green' : r.status === 'cancelled' ? 'gray' : 'blue'}>{r.status === 'completed' ? t('tables.resArrived', '已到店') : r.status === 'cancelled' ? t('tables.resCancelled', '已取消') : t('tables.resWaiting', '待到店')}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => { setResForm({ ...r }); setEditingRes(r); setShowResAdd(true) }}>{t('common.edit', '编辑')}</Button>
                          <Button size="sm" variant="outline" color="red" onClick={() => handleResDelete(r)}>{t('tables.deleteShort', '删')}</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 翻台统计Tab */}
      {tab === 'stats' && (
        <div>
          {turnoverStats && (
            <>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl p-5 shadow-sm">
                  <p className="text-sm text-gray-400 mb-1">{t('tables.totalTables', '总桌数')}</p>
                  <p className="text-2xl font-bold text-gray-800">{turnoverStats.total_tables}</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm">
                  <p className="text-sm text-gray-400 mb-1">{t('tables.totalTurnovers', '总翻台次数')}</p>
                  <p className="text-2xl font-bold text-primary-600">{turnoverStats.total_turnovers}</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm">
                  <p className="text-sm text-gray-400 mb-1">{t('tables.avgTurnover', '平均翻台率')}</p>
                  <p className="text-2xl font-bold text-green-600">{turnoverStats.avg_turnover} {t('tables.timesPerTable', '次/桌')}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">{t('tables.tableNo', '桌号')}</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">{t('tables.zone', '分区')}</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">{t('tables.completedOrders', '已完成订单')}</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">{t('tables.totalRevenue', '总营收')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {turnoverStats.stats.map(s => (
                      <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{s.table_no}</td>
                        <td className="px-4 py-3">{s.zone}</td>
                        <td className="px-4 py-3">{s.completed_orders} {t('tables.timesUnit', '次')}</td>
                        <td className="px-4 py-3 font-medium text-primary-600">${s.total_revenue.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* 添加/编辑餐桌弹窗 */}
      <Dialog open={showAdd} onClose={() => { setShowAdd(false); setEditing(null) }} title={editing ? t('tables.editTableTitle', '编辑餐桌') : t('tables.addTableTitle', '添加餐桌')}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('tables.tableNoLabel', '桌号 *')}</label>
              <Input value={form.table_no} onChange={e => setForm({ ...form, table_no: e.target.value })} placeholder={t('tables.tableNoPh', '如 A1, B2')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('tables.zone', '分区')}</label>
              <Select value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value })} options={zones.map(z => ({ value: z.name, label: z.name }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('tables.seats', '座位数')}</label>
              <Input type="number" value={form.seats} onChange={e => setForm({ ...form, seats: parseInt(e.target.value) || 4 })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('tables.sort', '排序')}</label>
              <Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('tables.minChargeLabel', '最低消费 ($)')}</label>
              <Input type="number" step="0.01" value={form.min_charge} onChange={e => setForm({ ...form, min_charge: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('tables.note', '备注')}</label>
            <Textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder={t('tables.notePh', '如：靠窗、儿童椅、坏椅子等')} rows={2} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleSave}>{editing ? t('common.save', '保存') : t('common.add', '添加')}</Button>
            <Button variant="outline" className="flex-1" onClick={() => { setShowAdd(false); setEditing(null) }}>{t('common.cancel', '取消')}</Button>
          </div>
        </div>
      </Dialog>

      {/* 批量添加弹窗 */}
      <Dialog open={showBatch} onClose={() => setShowBatch(false)} title={t('tables.batchTitle', '批量添加餐桌')}>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{t('tables.batchDesc', '按前缀+序号批量生成，如前缀A、起始1、数量10 = A1~A10')}</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('tables.prefix', '前缀')}</label>
              <Input value={batchForm.prefix} onChange={e => setBatchForm({ ...batchForm, prefix: e.target.value })} placeholder={t('tables.prefixPh', '如 A, B, C')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('tables.startNum', '起始序号')}</label>
              <Input type="number" value={batchForm.start} onChange={e => setBatchForm({ ...batchForm, start: parseInt(e.target.value) || 1 })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.quantity', '数量')}</label>
              <Input type="number" value={batchForm.count} onChange={e => setBatchForm({ ...batchForm, count: parseInt(e.target.value) || 10 })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('tables.zone', '分区')}</label>
              <Select value={batchForm.zone} onChange={e => setBatchForm({ ...batchForm, zone: e.target.value })} options={zones.map(z => ({ value: z.name, label: z.name }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('tables.seats', '座位数')}</label>
              <Input type="number" value={batchForm.seats} onChange={e => setBatchForm({ ...batchForm, seats: parseInt(e.target.value) || 4 })} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleBatch}>{t('tables.batchAddBtn', '批量添加')}</Button>
            <Button variant="outline" className="flex-1" onClick={() => setShowBatch(false)}>{t('common.cancel', '取消')}</Button>
          </div>
        </div>
      </Dialog>

      {/* 二维码弹窗 */}
      <Dialog open={!!qrTable} onClose={() => setQrTable(null)} title={`${t('tables.qrTitlePrefix', '餐桌')} ${qrTable?.table_no} ${t('tables.qrTitleSuffix', '二维码')}`} width="max-w-md">
        {qrTable && (
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-4">{t('tables.qrDescPrefix', '顾客扫码后直接进入菜单页，自动关联餐桌')} {qrTable.table_no}</p>
            <div className="bg-white p-4 rounded-xl inline-block border border-gray-200 mb-4">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(getQrUrl(qrTable))}`} alt={t('tables.qrCode', '二维码')} className="w-60 h-60" />
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-left">
              <p className="text-xs text-gray-400 mb-1">{t('tables.qrCustom', '自定义扫码地址（可选，用于局域网IP等）')}</p>
              <div className="flex gap-2">
                <Input size="sm" value={qrCustomUrl} onChange={e => setQrCustomUrl(e.target.value)} placeholder={t('tables.qrDefaultPh', '留空使用默认地址')} />
                <Button size="sm" variant="outline" onClick={saveQrCustomUrl}>{t('common.save', '保存')}</Button>
              </div>
              <p className="text-xs text-gray-400 mt-2 break-all">{t('tables.currentUrl', '当前地址：')}{getQrUrl(qrTable)}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { navigator.clipboard.writeText(getQrUrl(qrTable)); toast(t('tables.linkCopied', '链接已复制')) }}>{t('tables.copyLink', '复制链接')}</Button>
              <Button className="flex-1" onClick={() => window.open(getQrUrl(qrTable), '_blank')}>{t('tables.preview', '预览')}</Button>
            </div>
            <p className="text-xs text-gray-400 mt-3">{t('tables.qrHint', '右键图片可保存打印，贴在餐桌上')}</p>
          </div>
        )}
      </Dialog>

      {/* 转桌弹窗 */}
      <Dialog open={showTransfer} onClose={() => { setShowTransfer(false); setTransferFrom(null) }} title={t('tables.transferTitle', '转桌')}>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{t('tables.transferDescPrefix', '将')} <span className="font-medium text-primary-600">{transferFrom?.table_no}</span> {t('tables.transferDescSuffix', '桌的订单和会话转移到目标桌，源桌将重置为空闲')}</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('tables.targetTable', '目标桌 *')}</label>
            <Select value={transferTo} onChange={e => setTransferTo(e.target.value)} options={tables.filter(tbl => tbl.id !== transferFrom?.id && tbl.status !== 'occupied' && tbl.status !== 'maintenance').map(tbl => ({ value: tbl.id, label: `${tbl.table_no} (${tbl.zone} · ${tbl.seats}${t('tables.peopleUnit', '人')})` }))} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleTransfer}>{t('tables.confirmTransfer', '确认转桌')}</Button>
            <Button variant="outline" className="flex-1" onClick={() => { setShowTransfer(false); setTransferFrom(null) }}>{t('common.cancel', '取消')}</Button>
          </div>
        </div>
      </Dialog>

      {/* 并桌弹窗 */}
      <Dialog open={showMerge} onClose={() => { setShowMerge(false); setMergeMain(null) }} title={t('tables.mergeTitle', '并桌')}>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{t('tables.mergeDescPrefix', '将目标桌的订单合并到')} <span className="font-medium text-primary-600">{mergeMain?.table_no}</span> {t('tables.mergeDescSuffix', '桌，目标桌将重置为空闲')}</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('tables.mergeTargetLabel', '并桌 *')}</label>
            <Select value={mergeTarget} onChange={e => setMergeTarget(e.target.value)} options={tables.filter(t => t.id !== mergeMain?.id && t.status === 'occupied').map(t => ({ value: t.id, label: `${t.table_no} (${t.zone} · $${(t.active_total || 0).toFixed(2)})` }))} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleMerge}>{t('tables.confirmMerge', '确认并桌')}</Button>
            <Button variant="outline" className="flex-1" onClick={() => { setShowMerge(false); setMergeMain(null) }}>{t('common.cancel', '取消')}</Button>
          </div>
        </div>
      </Dialog>

      {/* 分区管理弹窗 */}
      <Dialog open={showZoneManage} onClose={() => { setShowZoneManage(false); setEditingZone(null) }} title={t('tables.zoneManageTitle', '桌位分区管理')}>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input className="flex-1" value={zoneForm.name} onChange={e => setZoneForm({ ...zoneForm, name: e.target.value })} placeholder={t('tables.zonePh', '分区名称，如：大厅、包间、户外')} />
            <Input type="number" className="w-24" value={zoneForm.sort_order} onChange={e => setZoneForm({ ...zoneForm, sort_order: parseInt(e.target.value) || 0 })} placeholder={t('tables.sort', '排序')} />
            <Button onClick={handleZoneSave}>{editingZone ? t('common.save', '保存') : t('common.add', '添加')}</Button>
            {editingZone && <Button variant="outline" onClick={() => { setEditingZone(null); setZoneForm({ name: '', sort_order: 0 }) }}>{t('tables.cancelEdit', '取消编辑')}</Button>}
          </div>
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">{t('tables.existingZones', '现有分区')}</p>
            <div className="space-y-2">
              {zones.map(z => (
                <div key={z.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <span className="font-medium">{z.name}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditingZone(z); setZoneForm({ name: z.name, sort_order: z.sort_order }) }}>{t('common.edit', '编辑')}</Button>
                    <Button size="sm" variant="outline" color="red" onClick={() => handleZoneDelete(z)}>{t('common.delete', '删除')}</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Dialog>

      {/* 添加/编辑预订弹窗 */}
      <Dialog open={showResAdd} onClose={() => { setShowResAdd(false); setEditingRes(null) }} title={editingRes ? t('tables.editResTitle', '编辑预订') : t('tables.addResTitle', '添加预订')}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('tables.customerNameLabel', '客户姓名 *')}</label>
              <Input value={resForm.customer_name} onChange={e => setResForm({ ...resForm, customer_name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('tables.phone', '电话')}</label>
              <Input value={resForm.customer_phone} onChange={e => setResForm({ ...resForm, customer_phone: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('tables.resDateLabel', '预订日期 *')}</label>
              <Input type="date" value={resForm.reserve_date} onChange={e => setResForm({ ...resForm, reserve_date: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('tables.resTimeLabel', '预订时间 *')}</label>
              <Input type="time" value={resForm.reserve_time} onChange={e => setResForm({ ...resForm, reserve_time: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('tables.tableNo', '桌号')}</label>
              <Input value={resForm.table_no} onChange={e => setResForm({ ...resForm, table_no: e.target.value })} placeholder={t('tables.tableNoPh2', '如 A1')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('tables.partySize', '人数')}</label>
              <Input type="number" value={resForm.party_size} onChange={e => setResForm({ ...resForm, party_size: parseInt(e.target.value) || 2 })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('tables.note', '备注')}</label>
            <Textarea value={resForm.note} onChange={e => setResForm({ ...resForm, note: e.target.value })} rows={2} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleResSave}>{editingRes ? t('common.save', '保存') : t('common.add', '添加')}</Button>
            <Button variant="outline" className="flex-1" onClick={() => { setShowResAdd(false); setEditingRes(null) }}>{t('common.cancel', '取消')}</Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}