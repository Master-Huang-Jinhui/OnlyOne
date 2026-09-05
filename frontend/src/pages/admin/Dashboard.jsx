import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Card, Button, StatCard, Input, Textarea, Select, Badge, Empty, toast } from '../../components/ui'

export default function Dashboard() {
  const [stats, setStats] = useState({})
  const [platforms, setPlatforms] = useState([])
  const [memos, setMemos] = useState([])
  const [memoForm, setMemoForm] = useState({ title: '', content: '', priority: 'normal' })
  const [showMemoForm, setShowMemoForm] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = () => {
    api.getOrderStats().then(data => setStats(data || {})).catch(() => {})
    api.getPlatforms().then(data => setPlatforms(Array.isArray(data) ? data : [])).catch(() => {})
    api.getMemos().then(data => setMemos(Array.isArray(data) ? data : [])).catch(() => {})
  }

  const addMemo = async () => {
    if (!memoForm.title) { toast('请输入标题', 'error'); return }
    try { await api.createMemo(memoForm); toast('已添加'); setMemoForm({ title: '', content: '', priority: 'normal' }); setShowMemoForm(false); loadData() }
    catch (e) { toast(e.message, 'error') }
  }

  const deleteMemo = async (id) => {
    if (!confirm('确定删除？')) return
    await api.deleteMemo(id); loadData()
  }

  const priorityMap = { high: { label: '高', variant: 'danger' }, normal: { label: '普通', variant: 'default' } }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">仪表盘</h2>
        <p className="text-sm text-gray-400 mt-1">OnlyOne 平台管理概览</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="今日订单" value={stats.today_orders || 0} icon="📋" color="primary" />
        <StatCard title="今日营收" value={`$${(stats.today_revenue || 0).toFixed(2)}`} icon="💰" color="success" />
        <StatCard title="平台数量" value={platforms.length} icon="🛵" color="info" />
        <StatCard title="待处理订单" value={stats.pending_orders || 0} icon="⏳" color="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-bold text-gray-800">外卖平台</h3>
            <span className="text-xs text-gray-400">{platforms.length} 个平台</span>
          </div>
          <div className="p-4 space-y-3">
            {platforms.length === 0 ? <Empty text="暂无平台，去平台管理添加" icon="🛵" /> : platforms.slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-xl">{p.logo ? <img src={p.logo} className="w-full h-full object-cover rounded-lg" /> : '🛵'}</div>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.phone || '-'}</p>
                  </div>
                </div>
                <Badge variant={p.enabled ? 'success' : 'default'}>{p.enabled ? '启用' : '停用'}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-bold text-gray-800">备忘录 & 重点事项</h3>
            <Button size="sm" onClick={() => setShowMemoForm(!showMemoForm)}>{showMemoForm ? '取消' : '+ 添加'}</Button>
          </div>
          {showMemoForm && (
            <div className="p-4 border-b bg-gray-50 space-y-3">
              <Input placeholder="标题" value={memoForm.title} onChange={e => setMemoForm({ ...memoForm, title: e.target.value })} />
              <Textarea placeholder="内容" rows={2} value={memoForm.content} onChange={e => setMemoForm({ ...memoForm, content: e.target.value })} />
              <div className="flex gap-2">
                <Select value={memoForm.priority} onChange={e => setMemoForm({ ...memoForm, priority: e.target.value })} className="w-32" options={[{ value: 'normal', label: '普通' }, { value: 'high', label: '重点' }]} />
                <Button onClick={addMemo}>保存</Button>
              </div>
            </div>
          )}
          <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
            {memos.length === 0 ? <Empty text="暂无备忘录" icon="📝" /> : memos.map(m => (
              <div key={m.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-800 text-sm">{m.title}</p>
                    <Badge variant={priorityMap[m.priority]?.variant || 'default'}>{priorityMap[m.priority]?.label || '普通'}</Badge>
                  </div>
                  {m.content && <p className="text-xs text-gray-500">{m.content}</p>}
                  <p className="text-xs text-gray-400 mt-1">{m.created_at}</p>
                </div>
                <button onClick={() => deleteMemo(m.id)} className="text-red-400 hover:text-red-600 ml-2">×</button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
