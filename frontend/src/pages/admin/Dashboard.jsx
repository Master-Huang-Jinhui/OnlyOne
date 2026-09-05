import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { Card, CardContent, StatCard, Badge, Button, Dialog, Input, Textarea, Select, Empty, toast } from '../../components/ui'

export default function Dashboard() {
  const [stats, setStats] = useState({})
  const [platforms, setPlatforms] = useState([])
  const [memos, setMemos] = useState([])
  const [memoDialog, setMemoDialog] = useState(false)
  const [memoForm, setMemoForm] = useState({ title: '', content: '', type: 'memo', priority: 'normal' })

  useEffect(() => { loadData() }, [])

  const loadData = () => {
    api.getOrderStats().then(setStats).catch(() => {})
    api.getPlatforms().then(setPlatforms).catch(() => {})
    api.getMemos().then(setMemos).catch(() => {})
  }

  const addMemo = async () => {
    if (!memoForm.title) { toast('请输入标题', 'error'); return }
    try {
      await api.createMemo(memoForm)
      toast('添加成功')
      setMemoDialog(false)
      setMemoForm({ title: '', content: '', type: 'memo', priority: 'normal' })
      loadData()
    } catch (e) { toast(e.message, 'error') }
  }

  const toggleMemo = async (memo) => { await api.updateMemo(memo.id, { completed: !memo.completed }); loadData() }
  const deleteMemo = async (id) => { await api.deleteMemo(id); loadData() }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">仪表盘</h2>
        <span className="text-sm text-gray-400">欢迎回来 👋</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="今日订单" value={stats.today_count || 0} icon="📋" color="blue" />
        <StatCard title="今日营收" value={`$${(stats.today_revenue || 0).toFixed(2)}`} icon="💰" color="green" />
        <StatCard title="待处理订单" value={stats.pending_count || 0} icon="⏳" color="yellow" />
        <StatCard title="本周订单" value={stats.week_count || 0} icon="📊" color="purple" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">外卖平台</h3>
            <Link to="/admin/platforms"><Button variant="ghost" size="sm">管理 →</Button></Link>
          </div>
          <CardContent>
            {platforms.length === 0 ? <Empty text="暂无平台，去添加吧" icon="🛵" /> : (
              <div className="space-y-3">
                {platforms.slice(0, 5).map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-xl border overflow-hidden">
                        {p.logo ? <img src={p.logo} alt="" className="w-full h-full object-cover rounded-lg" /> : '🛵'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.phone || '无电话'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={p.enabled ? 'success' : 'default'}>{p.enabled ? '启用' : '停用'}</Badge>
                      {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="text-primary-500 text-sm hover:underline">跳转</a>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">备忘录 / 重点事项</h3>
            <Button size="sm" onClick={() => setMemoDialog(true)}>+ 添加</Button>
          </div>
          <CardContent>
            {memos.length === 0 ? <Empty text="暂无备忘" icon="📝" /> : (
              <div className="space-y-2">
                {memos.slice(0, 8).map(m => (
                  <div key={m.id} className={`flex items-start gap-3 p-3 rounded-lg ${m.completed ? 'bg-gray-50 opacity-60' : 'bg-gray-50'}`}>
                    <input type="checkbox" checked={!!m.completed} onChange={() => toggleMemo(m)} className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium text-sm ${m.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>{m.title}</p>
                        <Badge variant={m.priority === 'high' ? 'danger' : m.type === 'important' ? 'warning' : 'default'}>
                          {m.priority === 'high' ? '高优' : m.type === 'important' ? '重点' : '备忘'}
                        </Badge>
                      </div>
                      {m.content && <p className="text-xs text-gray-400 mt-1">{m.content}</p>}
                    </div>
                    <button onClick={() => deleteMemo(m.id)} className="text-gray-300 hover:text-red-500 text-sm">×</button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={memoDialog} onClose={() => setMemoDialog(false)} title="添加备忘 / 重点事项"
        footer={<><Button variant="outline" onClick={() => setMemoDialog(false)}>取消</Button><Button onClick={addMemo}>保存</Button></>}>
        <div className="space-y-4">
          <Input label="标题 *" value={memoForm.title} onChange={e => setMemoForm({ ...memoForm, title: e.target.value })} placeholder="备忘标题" />
          <Textarea label="内容" value={memoForm.content} onChange={e => setMemoForm({ ...memoForm, content: e.target.value })} placeholder="详细内容（可选）" rows={3} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="类型" value={memoForm.type} onChange={e => setMemoForm({ ...memoForm, type: e.target.value })}
              options={[{ value: 'memo', label: '备忘录' }, { value: 'important', label: '重点事项' }]} />
            <Select label="优先级" value={memoForm.priority} onChange={e => setMemoForm({ ...memoForm, priority: e.target.value })}
              options={[{ value: 'normal', label: '普通' }, { value: 'high', label: '高优先级' }]} />
          </div>
        </div>
      </Dialog>
    </div>
  )
}
