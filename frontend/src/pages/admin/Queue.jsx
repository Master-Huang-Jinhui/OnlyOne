import { useState, useEffect, useCallback } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Badge, Dialog, Input, Select, Empty, toast } from '../../components/ui'

export default function Queue() {
  const [queues, setQueues] = useState([])
  const [stats, setStats] = useState({ waiting: 0, calling: 0, completed: 0, skipped: 0, total: 0, avg_wait_minutes: 0 })
  const [typeFilter, setTypeFilter] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [takeDialog, setTakeDialog] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [listData, statsData] = await Promise.all([
        api.getQueueList({ type: typeFilter }),
        api.getQueueStats()
      ])
      setQueues(Array.isArray(listData) ? listData : [])
      setStats(statsData || { waiting: 0, calling: 0, completed: 0, skipped: 0, total: 0, avg_wait_minutes: 0 })
    } catch (e) { console.error('排队加载失败:', e.message) }
    setLoading(false)
  }, [typeFilter])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!autoRefresh) return
    const timer = setInterval(load, 5000)
    return () => clearInterval(timer)
  }, [autoRefresh, load])

  const takeNumber = async () => {
    const { type, customer_name, people_count, note } = takeDialog
    if (!type) { toast('请选择类型', 'error'); return }
    try {
      const data = await api.takeQueueNumber({ type, customer_name: customer_name || '', people_count: parseInt(people_count) || 1, note: note || '' })
      toast(`取号成功：${data.number}`)
      setTakeDialog(null)
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const callNumber = async (q) => {
    try { await api.callQueueNumber(q.id); toast(`正在叫号 ${q.number}`); load() } catch (e) { toast(e.message, 'error') }
  }

  const recallNumber = async (q) => {
    try {
      const data = await api.recallQueueNumber(q.id)
      toast(`再次叫号 ${q.number}（第${data.recall_count}次）`)
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const completeNumber = async (q) => {
    if (!window.confirm(`确认 ${q.number} 已完成？`)) return
    try { await api.completeQueueNumber(q.id); toast('已完成'); load() } catch (e) { toast(e.message, 'error') }
  }

  const skipNumber = async (q) => {
    if (!window.confirm(`确认跳过 ${q.number}？`)) return
    try { await api.skipQueueNumber(q.id); toast('已跳过'); load() } catch (e) { toast(e.message, 'error') }
  }

  const callNext = async () => {
    try {
      const data = await api.callNextQueue(typeFilter)
      toast(`正在叫号 ${data.number}`)
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const waitingList = queues.filter(q => q.status === 'waiting')
  const callingList = queues.filter(q => q.status === 'calling')
  const completedList = queues.filter(q => q.status === 'completed' || q.status === 'skipped')

  const typeLabel = (type) => type === 'dinein' ? '堂吃' : '外带'
  const statusBadge = (status) => {
    const map = { waiting: { label: '等待中', variant: 'warning' }, calling: { label: '叫号中', variant: 'primary' }, completed: { label: '已完成', variant: 'success' }, skipped: { label: '已跳过', variant: 'default' } }
    const s = map[status] || { label: status, variant: 'default' }
    return <Badge variant={s.variant}>{s.label}</Badge>
  }

  const calcWait = (q) => {
    if (!q.created_at) return 0
    const start = new Date(q.created_at.replace(' ', 'T'))
    const now = new Date()
    return Math.max(0, Math.floor((now - start) / 60000))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">📢 排队叫号</h2>
          <p className="text-sm text-gray-400 mt-1">管理顾客排队，支持堂吃和外带两种类型</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} className="w-4 h-4" />
            自动刷新 (5秒)
          </label>
          <Button onClick={() => setTakeDialog({ type: 'dinein', customer_name: '', people_count: 2, note: '' })}>+ 取号</Button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <Card className="p-4 bg-yellow-50">
          <p className="text-sm text-yellow-600">等待中</p>
          <p className="text-3xl font-bold text-yellow-700 mt-1">{stats.waiting}</p>
        </Card>
        <Card className="p-4 bg-blue-50">
          <p className="text-sm text-blue-600">叫号中</p>
          <p className="text-3xl font-bold text-blue-700 mt-1">{stats.calling}</p>
        </Card>
        <Card className="p-4 bg-green-50">
          <p className="text-sm text-green-600">已完成</p>
          <p className="text-3xl font-bold text-green-700 mt-1">{stats.completed}</p>
        </Card>
        <Card className="p-4 bg-gray-50">
          <p className="text-sm text-gray-600">已跳过</p>
          <p className="text-3xl font-bold text-gray-700 mt-1">{stats.skipped}</p>
        </Card>
        <Card className="p-4 bg-purple-50">
          <p className="text-sm text-purple-600">平均等待</p>
          <p className="text-3xl font-bold text-purple-700 mt-1">{stats.avg_wait_minutes}<span className="text-lg">分钟</span></p>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          options={[{ value: '', label: '全部类型' }, { value: 'dinein', label: '堂吃' }, { value: 'takeout', label: '外带' }]} />
        {waitingList.length > 0 && (
          <Button variant="primary" onClick={callNext}>🔔 叫下一个</Button>
        )}
      </div>

      {callingList.length > 0 && (
        <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">当前叫号</p>
              <p className="text-5xl font-bold mt-2 animate-pulse">{callingList[0].number}</p>
              <p className="text-sm opacity-80 mt-2">{typeLabel(callingList[0].type)} · {callingList[0].customer_name || '匿名顾客'} · {callingList[0].people_count}人</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="bg-white/20 border-white/40 text-white hover:bg-white/30" onClick={() => recallNumber(callingList[0])}>🔔 再叫一次</Button>
              <Button variant="outline" className="bg-white/20 border-white/40 text-white hover:bg-white/30" onClick={() => completeNumber(callingList[0])}>✓ 完成</Button>
              <Button variant="outline" className="bg-white/20 border-white/40 text-white hover:bg-white/30" onClick={() => skipNumber(callingList[0])}>⏭ 跳过</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between px-5 py-3 bg-yellow-50 border-b">
            <h3 className="font-bold text-yellow-700">⏳ 等待中 ({waitingList.length})</h3>
          </div>
          <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
            {waitingList.length === 0 ? (
              <Empty text="暂无等待中的排队号" icon="⏳" />
            ) : waitingList.map((q, idx) => (
              <div key={q.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-yellow-700">{idx + 1}</span>
                  <div>
                    <p className="font-bold text-gray-800">{q.number}</p>
                    <p className="text-xs text-gray-500">{typeLabel(q.type)} · {q.customer_name || '匿名'} · {q.people_count}人 · 等待{calcWait(q)}分钟</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => callNumber(q)}>叫号</Button>
                  <Button size="sm" variant="outline" onClick={() => skipNumber(q)}>跳过</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b">
            <h3 className="font-bold text-gray-700">📋 今日记录 ({completedList.length})</h3>
          </div>
          <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
            {completedList.length === 0 ? (
              <Empty text="暂无记录" icon="📋" />
            ) : completedList.map(q => (
              <div key={q.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-700">{q.number}</span>
                  <span className="text-xs text-gray-500">{typeLabel(q.type)} · {q.customer_name || '匿名'}</span>
                </div>
                {statusBadge(q.status)}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Dialog open={!!takeDialog} onClose={() => setTakeDialog(null)} title="取号" width="max-w-sm">
        {takeDialog && (
          <div className="space-y-4">
            <Select label="类型 *" value={takeDialog.type} onChange={e => setTakeDialog({ ...takeDialog, type: e.target.value })}
              options={[{ value: 'dinein', label: '堂吃' }, { value: 'takeout', label: '外带' }]} />
            <Input label="顾客姓名" value={takeDialog.customer_name} onChange={e => setTakeDialog({ ...takeDialog, customer_name: e.target.value })} placeholder="选填" />
            <Input label="人数" type="number" min="1" value={takeDialog.people_count} onChange={e => setTakeDialog({ ...takeDialog, people_count: e.target.value })} />
            <Input label="备注" value={takeDialog.note} onChange={e => setTakeDialog({ ...takeDialog, note: e.target.value })} placeholder="选填" />
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setTakeDialog(null)}>取消</Button>
              <Button className="flex-1" onClick={takeNumber}>确认取号</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}