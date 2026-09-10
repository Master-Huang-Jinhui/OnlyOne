import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Button, Input, Dialog, toast, Badge, Select, Textarea } from '../../components/ui'

const STATUS_MAP = {
  idle: { label: '空闲', color: 'green', bg: 'bg-green-50', border: 'border-green-200' },
  occupied: { label: '用餐中', color: 'orange', bg: 'bg-orange-50', border: 'border-orange-200' },
  reserved: { label: '已预订', color: 'blue', bg: 'bg-blue-50', border: 'border-blue-200' },
  cleaning: { label: '清理中', color: 'yellow', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  maintenance: { label: '维护中', color: 'gray', bg: 'bg-gray-100', border: 'border-gray-300' }
}

export default function Tables() {
  const [tables, setTables] = useState([])
  const [zones, setZones] = useState([])
  const [activeZone, setActiveZone] = useState('全部')
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('tables')

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

  const [reservations, setReservations] = useState([])
  const [showResAdd, setShowResAdd] = useState(false)
  const [editingRes, setEditingRes] = useState(null)
  const [resForm, setResForm] = useState({ table_no: '', customer_name: '', customer_phone: '', reserve_date: '', reserve_time: '', party_size: 2, note: '' })

  const [turnoverStats, setTurnoverStats] = useState(null)

  const load = () => {
    setLoading(true)
    const params = activeZone !== '全部' ? { zone: activeZone } : {}
    api.getTables(params).then(setTables).catch(e => toast(e.message, 'error')).finally(() => setLoading(false))
    api.getTableZones().then(setZones).catch(() => {})
  }

  const loadReservations = () => {
    api.getReservations().then(setReservations).catch(() => {})
  }

  const loadStats = () => {
    api.getTableTurnoverStats().then(setTurnoverStats).catch(() => {})
  }

  useEffect(() => { load() }, [activeZone])
  useEffect(() => { if (tab === 'reservations') loadReservations() }, [tab])
  useEffect(() => { if (tab === 'stats') loadStats() }, [tab])

  const handleSave = () => {
    if (!form.table_no.trim()) { toast('请输入桌号', 'error'); return }
    if (editing) {
      api.updateTable(editing.id, form).then(() => { toast('保存成功'); setShowAdd(false); setEditing(null); load() }).catch(e => toast(e.message, 'error'))
    } else {
      api.createTable(form).then(() => { toast('添加成功'); setShowAdd(false); load() }).catch(e => toast(e.message, 'error'))
    }
  }

  const handleBatch = () => {
    api.batchCreateTables(batchForm).then(data => {
      toast(`成功添加 ${data.created_count} 桌${data.error_count > 0 ? `，${data.error_count} 桌已存在跳过` : ''}`)
      setShowBatch(false)
      load()
    }).catch(e => toast(e.message, 'error'))
  }

  const handleClear = (table) => {
    if (!confirm(`确定清桌 ${table.table_no}？清桌后当前订单将合并结算，下一桌扫码是全新的。`)) return
    api.clearTable(table.id).then(() => { toast('已清桌，状态：清理中'); load() }).catch(e => toast(e.message, 'error'))
  }

  const handleCleanDone = (table) => {
    api.cleanDoneTable(table.id).then(() => { toast('清理完成，已设为空闲'); load() }).catch(e => toast(e.message, 'error'))
  }

  const handleDelete = (table) => {
    if (!confirm(`确定删除餐桌 ${table.table_no}？`)) return
    api.deleteTable(table.id).then(() => { toast('已删除'); load() }).catch(e => toast(e.message, 'error'))
  }

  const handleMaintenance = (table) => {
    const isMaint = table.status === 'maintenance'
    api.setTableMaintenance(table.id, !isMaint).then(() => { toast(isMaint ? '已恢复使用' : '已设为维护中'); load() }).catch(e => toast(e.message, 'error'))
  }

  const handleTransfer = () => {
    if (!transferTo) { toast('请选择目标桌', 'error'); return }
    api.transferTable({ from_table_id: transferFrom.id, to_table_id: parseInt(transferTo) }).then(() => {
      toast('转桌成功'); setShowTransfer(false); setTransferFrom(null); setTransferTo(''); load()
    }).catch(e => toast(e.message, 'error'))
  }

  const handleMerge = () => {
    if (!mergeTarget) { toast('请选择并桌', 'error'); return }
    api.mergeTables({ main_table_id: mergeMain.id, merge_table_id: parseInt(mergeTarget) }).then(() => {
      toast('并桌成功'); setShowMerge(false); setMergeMain(null); setMergeTarget(''); load()
    }).catch(e => toast(e.message, 'error'))
  }

  const saveQrCustomUrl = () => {
    if (!qrTable) return
    api.updateTable(qrTable.id, { qr_custom_url: qrCustomUrl }).then(() => {
      toast('二维码地址已保存')
      qrTable.qr_custom_url = qrCustomUrl
      setQrTable({ ...qrTable })
    }).catch(e => toast(e.message, 'error'))
  }

  const getQrUrl = (table) => {
    if (table.qr_custom_url) return table.qr_custom_url
    const base = window.location.origin
    return `${base}/table?s=${encodeURIComponent(table.table_no)}`
  }

  const handleZoneSave = () => {
    if (!zoneForm.name.trim()) { toast('分区名称必填', 'error'); return }
    if (editingZone) {
      api.updateTableZone(editingZone.id, zoneForm).then(() => { toast('保存成功'); setShowZoneManage(false); setEditingZone(null); load() }).catch(e => toast(e.message, 'error'))
    } else {
      api.createTableZone(zoneForm).then(() => { toast('添加成功'); setZoneForm({ name: '', sort_order: 0 }); load() }).catch(e => toast(e.message, 'error'))
    }
  }

  const handleZoneDelete = (zone) => {
    if (!confirm(`确定删除分区 ${zone.name}？该分区下的桌子将移到"大厅"`)) return
    api.deleteTableZone(zone.id).then(() => { toast('已删除'); load() }).catch(e => toast(e.message, 'error'))
  }

  const handleResSave = () => {
    if (!resForm.customer_name.trim()) { toast('客户姓名必填', 'error'); return }
    if (!resForm.reserve_date || !resForm.reserve_time) { toast('预订日期和时间必填', 'error'); return }
    if (editingRes) {
      api.updateReservation(editingRes.id, resForm).then(() => { toast('保存成功'); setShowResAdd(false); setEditingRes(null); loadReservations() }).catch(e => toast(e.message, 'error'))
    } else {
      api.createReservation(resForm).then(() => { toast('预订成功'); setShowResAdd(false); loadReservations() }).catch(e => toast(e.message, 'error'))
    }
  }

  const handleResDelete = (res) => {
    if (!confirm('确定删除此预订？')) return
    api.deleteReservation(res.id).then(() => { toast('已删除'); loadReservations() }).catch(e => toast(e.message, 'error'))
  }

  const formatOpenedTime = (openedAt) => {
    if (!openedAt) return '-'
    const start = new Date(openedAt.replace(' ', 'T'))
    const now = new Date()
    const diff = Math.floor((now - start) / 60000)
    if (diff < 60) return `${diff}分钟`
    return `${Math.floor(diff / 60)}小时${diff % 60}分`
  }

  const allZones = ['全部', ...zones.map(z => z.name)]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">餐桌管理</h1>
          <p className="text-sm text-gray-400 mt-1">管理堂吃餐桌、分区、预订、扫码点餐二维码、清桌、转桌并桌</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {[
          { key: 'tables', label: '餐桌管理' },
          { key: 'reservations', label: '预订管理' },
          { key: 'stats', label: '翻台统计' }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t.key ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'tables' && (
        <>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex gap-2 flex-wrap">
              {allZones.map(z => (
                <button
                  key={z}
                  onClick={() => setActiveZone(z)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${activeZone === z ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {z}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowZoneManage(true)}>分区管理</Button>
              <Button variant="outline" size="sm" onClick={() => setShowBatch(true)}>批量添加</Button>
              <Button size="sm" onClick={() => { setForm({ table_no: '', zone: activeZone === '全部' ? '大厅' : activeZone, seats: 4, sort_order: tables.length + 1, min_charge: 0, note: '' }); setEditing(null); setShowAdd(true) }}>+ 添加餐桌</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tables.map(t => {
              const st = STATUS_MAP[t.status] || STATUS_MAP.idle
              return (
                <div key={t.id} className={`rounded-xl p-5 shadow-sm border-2 ${st.bg} ${st.border}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">{t.table_no}</h3>
                      <span className="text-xs text-gray-400">{t.zone} · {t.seats}人桌</span>
                    </div>
                    <Badge color={st.color}>{st.label}</Badge>
                  </div>
                  <div className="text-sm text-gray-500 space-y-1 mb-4">
                    <div className="flex justify-between"><span>当前订单</span><span className="font-medium text-gray-700">{t.active_orders || 0} 笔</span></div>
                    <div className="flex justify-between"><span>当前消费</span><span className="font-medium text-primary-600">${(t.active_total || 0).toFixed(2)}</span></div>
                    {t.status === 'occupied' && <div className="flex justify-between"><span>用餐时长</span><span className="font-medium text-orange-600">{formatOpenedTime(t.opened_at)}</span></div>}
                    {t.min_charge > 0 && <div className="flex justify-between"><span>最低消费</span><span className="font-medium">${t.min_charge.toFixed(2)}</span></div>}
                    {t.note && <div className="text-xs text-gray-400 bg-white/50 rounded p-1.5">📝 {t.note}</div>}
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setQrTable(t)}>二维码</Button>
                    <Button size="sm" variant="outline" onClick={() => { setForm({ table_no: t.table_no, zone: t.zone, seats: t.seats, sort_order: t.sort_order, min_charge: t.min_charge || 0, note: t.note || '' }); setEditing(t); setShowAdd(true) }}>编辑</Button>
                    {t.status === 'occupied' && <Button size="sm" variant="outline" color="blue" onClick={() => { setTransferFrom(t); setShowTransfer(true) }}>转桌</Button>}
                    {t.status === 'occupied' && <Button size="sm" variant="outline" color="purple" onClick={() => { setMergeMain(t); setShowMerge(true) }}>并桌</Button>}
                    {t.status === 'cleaning' && <Button size="sm" variant="outline" color="green" onClick={() => handleCleanDone(t)}>完成</Button>}
                    {t.status !== 'cleaning' && t.status !== 'maintenance' && <Button size="sm" variant="outline" color="orange" onClick={() => handleClear(t)}>清桌</Button>}
                    <Button size="sm" variant="outline" color={t.status === 'maintenance' ? 'green' : 'gray'} onClick={() => handleMaintenance(t)}>{t.status === 'maintenance' ? '恢复' : '维护'}</Button>
                    <Button size="sm" variant="outline" color="red" onClick={() => handleDelete(t)}>删</Button>
                  </div>
                </div>
              )
            })}
          </div>

          {tables.length === 0 && !loading && (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-3">🪑</div>
              <p>该分区还没有餐桌，点击右上角添加</p>
            </div>
          )}
        </>
      )}

      {tab === 'reservations' && (
        <div>
          <div className="flex justify-between mb-4">
            <p className="text-sm text-gray-500">管理客户预订，到店后可直接开桌</p>
            <Button size="sm" onClick={() => { setResForm({ table_no: '', customer_name: '', customer_phone: '', reserve_date: '', reserve_time: '', party_size: 2, note: '' }); setEditingRes(null); setShowResAdd(true) }}>+ 添加预订</Button>
          </div>
          {reservations.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-3">📅</div>
              <p>暂无预订</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">日期</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">时间</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">桌号</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">客户</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">电话</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">人数</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">备注</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">状态</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">操作</th>
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
                      <td className="px-4 py-3">{r.party_size}人</td>
                      <td className="px-4 py-3 text-gray-400 max-w-[150px] truncate">{r.note || '-'}</td>
                      <td className="px-4 py-3"><Badge color={r.status === 'completed' ? 'green' : r.status === 'cancelled' ? 'gray' : 'blue'}>{r.status === 'completed' ? '已到店' : r.status === 'cancelled' ? '已取消' : '待到店'}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => { setResForm({ ...r }); setEditingRes(r); setShowResAdd(true) }}>编辑</Button>
                          <Button size="sm" variant="outline" color="red" onClick={() => handleResDelete(r)}>删</Button>
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

      {tab === 'stats' && (
        <div>
          {turnoverStats && (
            <>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl p-5 shadow-sm">
                  <p className="text-sm text-gray-400 mb-1">总桌数</p>
                  <p className="text-2xl font-bold text-gray-800">{turnoverStats.total_tables}</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm">
                  <p className="text-sm text-gray-400 mb-1">总翻台次数</p>
                  <p className="text-2xl font-bold text-primary-600">{turnoverStats.total_turnovers}</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm">
                  <p className="text-sm text-gray-400 mb-1">平均翻台率</p>
                  <p className="text-2xl font-bold text-green-600">{turnoverStats.avg_turnover} 次/桌</p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">桌号</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">分区</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">已完成订单</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">总营收</th>
                    </tr>
                  </thead>
                  <tbody>
                    {turnoverStats.stats.map(s => (
                      <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{s.table_no}</td>
                        <td className="px-4 py-3">{s.zone}</td>
                        <td className="px-4 py-3">{s.completed_orders} 次</td>
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

      <Dialog open={showAdd} onClose={() => { setShowAdd(false); setEditing(null) }} title={editing ? '编辑餐桌' : '添加餐桌'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">桌号 *</label>
              <Input value={form.table_no} onChange={e => setForm({ ...form, table_no: e.target.value })} placeholder="如 A1, B2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">分区</label>
              <Select value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value })} options={zones.map(z => ({ value: z.name, label: z.name }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">座位数</label>
              <Input type="number" value={form.seats} onChange={e => setForm({ ...form, seats: parseInt(e.target.value) || 4 })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
              <Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">最低消费 ($)</label>
              <Input type="number" step="0.01" value={form.min_charge} onChange={e => setForm({ ...form, min_charge: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
            <Textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="如：靠窗、儿童椅、坏椅子等" rows={2} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleSave}>{editing ? '保存' : '添加'}</Button>
            <Button variant="outline" className="flex-1" onClick={() => { setShowAdd(false); setEditing(null) }}>取消</Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={showBatch} onClose={() => setShowBatch(false)} title="批量添加餐桌">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">按前缀+序号批量生成，如前缀A、起始1、数量10 = A1~A10</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">前缀</label>
              <Input value={batchForm.prefix} onChange={e => setBatchForm({ ...batchForm, prefix: e.target.value })} placeholder="如 A, B, C" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">起始序号</label>
              <Input type="number" value={batchForm.start} onChange={e => setBatchForm({ ...batchForm, start: parseInt(e.target.value) || 1 })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">数量</label>
              <Input type="number" value={batchForm.count} onChange={e => setBatchForm({ ...batchForm, count: parseInt(e.target.value) || 10 })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">分区</label>
              <Select value={batchForm.zone} onChange={e => setBatchForm({ ...batchForm, zone: e.target.value })} options={zones.map(z => ({ value: z.name, label: z.name }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">座位数</label>
              <Input type="number" value={batchForm.seats} onChange={e => setBatchForm({ ...batchForm, seats: parseInt(e.target.value) || 4 })} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleBatch}>批量添加</Button>
            <Button variant="outline" className="flex-1" onClick={() => setShowBatch(false)}>取消</Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={!!qrTable} onClose={() => setQrTable(null)} title={`餐桌 ${qrTable?.table_no} 二维码`} width="max-w-md">
        {qrTable && (
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-4">顾客扫码后直接进入菜单页，自动关联餐桌 {qrTable.table_no}</p>
            <div className="bg-white p-4 rounded-xl inline-block border border-gray-200 mb-4">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(getQrUrl(qrTable))}`} alt="二维码" className="w-60 h-60" />
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-left">
              <p className="text-xs text-gray-400 mb-1">自定义扫码地址（可选，用于局域网IP等）</p>
              <div className="flex gap-2">
                <Input size="sm" value={qrCustomUrl} onChange={e => setQrCustomUrl(e.target.value)} placeholder="留空使用默认地址" />
                <Button size="sm" variant="outline" onClick={saveQrCustomUrl}>保存</Button>
              </div>
              <p className="text-xs text-gray-400 mt-2 break-all">当前地址：{getQrUrl(qrTable)}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { navigator.clipboard.writeText(getQrUrl(qrTable)); toast('链接已复制') }}>复制链接</Button>
              <Button className="flex-1" onClick={() => window.open(getQrUrl(qrTable), '_blank')}>预览</Button>
            </div>
            <p className="text-xs text-gray-400 mt-3">右键图片可保存打印，贴在餐桌上</p>
          </div>
        )}
      </Dialog>

      <Dialog open={showTransfer} onClose={() => { setShowTransfer(false); setTransferFrom(null) }} title="转桌">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">将 <span className="font-medium text-primary-600">{transferFrom?.table_no}</span> 桌的订单和会话转移到目标桌，源桌将重置为空闲</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">目标桌 *</label>
            <Select value={transferTo} onChange={e => setTransferTo(e.target.value)} options={tables.filter(t => t.id !== transferFrom?.id && t.status !== 'occupied' && t.status !== 'maintenance').map(t => ({ value: t.id, label: `${t.table_no} (${t.zone} · ${t.seats}人)` }))} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleTransfer}>确认转桌</Button>
            <Button variant="outline" className="flex-1" onClick={() => { setShowTransfer(false); setTransferFrom(null) }}>取消</Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={showMerge} onClose={() => { setShowMerge(false); setMergeMain(null) }} title="并桌">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">将目标桌的订单合并到 <span className="font-medium text-primary-600">{mergeMain?.table_no}</span> 桌，目标桌将重置为空闲</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">并桌 *</label>
            <Select value={mergeTarget} onChange={e => setMergeTarget(e.target.value)} options={tables.filter(t => t.id !== mergeMain?.id && t.status === 'occupied').map(t => ({ value: t.id, label: `${t.table_no} (${t.zone} · $${(t.active_total || 0).toFixed(2)})` }))} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleMerge}>确认并桌</Button>
            <Button variant="outline" className="flex-1" onClick={() => { setShowMerge(false); setMergeMain(null) }}>取消</Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={showZoneManage} onClose={() => { setShowZoneManage(false); setEditingZone(null) }} title="桌位分区管理">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input className="flex-1" value={zoneForm.name} onChange={e => setZoneForm({ ...zoneForm, name: e.target.value })} placeholder="分区名称，如：大厅、包间、户外" />
            <Input type="number" className="w-24" value={zoneForm.sort_order} onChange={e => setZoneForm({ ...zoneForm, sort_order: parseInt(e.target.value) || 0 })} placeholder="排序" />
            <Button onClick={handleZoneSave}>{editingZone ? '保存' : '添加'}</Button>
            {editingZone && <Button variant="outline" onClick={() => { setEditingZone(null); setZoneForm({ name: '', sort_order: 0 }) }}>取消编辑</Button>}
          </div>
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">现有分区</p>
            <div className="space-y-2">
              {zones.map(z => (
                <div key={z.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <span className="font-medium">{z.name}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditingZone(z); setZoneForm({ name: z.name, sort_order: z.sort_order }) }}>编辑</Button>
                    <Button size="sm" variant="outline" color="red" onClick={() => handleZoneDelete(z)}>删除</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Dialog>

      <Dialog open={showResAdd} onClose={() => { setShowResAdd(false); setEditingRes(null) }} title={editingRes ? '编辑预订' : '添加预订'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">客户姓名 *</label>
              <Input value={resForm.customer_name} onChange={e => setResForm({ ...resForm, customer_name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">电话</label>
              <Input value={resForm.customer_phone} onChange={e => setResForm({ ...resForm, customer_phone: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">预订日期 *</label>
              <Input type="date" value={resForm.reserve_date} onChange={e => setResForm({ ...resForm, reserve_date: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">预订时间 *</label>
              <Input type="time" value={resForm.reserve_time} onChange={e => setResForm({ ...resForm, reserve_time: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">桌号</label>
              <Input value={resForm.table_no} onChange={e => setResForm({ ...resForm, table_no: e.target.value })} placeholder="如 A1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">人数</label>
              <Input type="number" value={resForm.party_size} onChange={e => setResForm({ ...resForm, party_size: parseInt(e.target.value) || 2 })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
            <Textarea value={resForm.note} onChange={e => setResForm({ ...resForm, note: e.target.value })} rows={2} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleResSave}>{editingRes ? '保存' : '添加'}</Button>
            <Button variant="outline" className="flex-1" onClick={() => { setShowResAdd(false); setEditingRes(null) }}>取消</Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
