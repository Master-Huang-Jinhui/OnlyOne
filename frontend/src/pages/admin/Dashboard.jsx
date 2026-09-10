import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { playOrderSound, vibrate } from '../../lib/notification'
import { Card, CardContent, StatCard, Badge, Button, Dialog, Input, Textarea, Select, Empty, toast } from '../../components/ui'

// ============================================================
// 【功能路线图 - 仪表盘】详见 FEATURE_ROADMAP.md
// TODO[P1] KDS入口：添加"厨房显示"按钮跳转 /kds 全屏厨显页面
// TODO[P1] 销售趋势图：近7天/30天销售额折线图，高峰时段热力图
// TODO[P1] 库存预警卡片：显示库存不足的货物列表
// TODO[P1] 数据备份：添加"立即备份"按钮，每日自动备份data.db
// TODO[P2] 品类销售占比饼图，人工成本占比
// ============================================================

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({})
  const [platforms, setPlatforms] = useState([])
  const [memos, setMemos] = useState([])
  const [pendingOrders, setPendingOrders] = useState([])
  const [pendingTotal, setPendingTotal] = useState(0)
  const [pendingPage, setPendingPage] = useState(1)
  const [pendingPageSize] = useState(5)
  const [memoDialog, setMemoDialog] = useState(false)
  const [memoForm, setMemoForm] = useState({ title: '', content: '', type: 'memo', priority: 'normal' })
  const [detail, setDetail] = useState(null)
  const [topProducts, setTopProducts] = useState([])
  const lastPendingCount = useRef(0)
  const isFirstLoad = useRef(true)

  const statusMap = {
    pending: { label: '待处理', variant: 'warning', next: 'preparing', nextLabel: '开始制作' },
    preparing: { label: '制作中', variant: 'primary', next: 'ready', nextLabel: '制作完成' },
    ready: { label: '待取餐', variant: 'primary', next: 'completed', nextLabel: '确认取餐' },
    completed: { label: '已完成', variant: 'success', next: null, nextLabel: null },
    cancelled: { label: '已取消', variant: 'danger', next: null, nextLabel: null }
  }
  const diningMap = { dinein: '堂吃', takeout: '自取', delivery: '配送' }

  const updateOrderStatus = async (id, status) => {
    try {
      await api.updateOrderStatus(id, status)
      toast('状态已更新')
      setDetail(null)
      loadPendingOrders(1)
    } catch (e) { toast(e.message, 'error') }
  }

  const todayStart = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T00:00`
  }
  const nowStr = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const loadPendingOrders = (page = pendingPage) => {
    api.getOrders({ status: 'pending', page, page_size: pendingPageSize, sort_by: 'created_at', sort_order: 'desc', start_date: todayStart(), end_date: nowStr() })
      .then(data => {
        const orders = data?.orders || []
        const total = data?.total || 0
        setPendingOrders(orders)
        setPendingTotal(total)
        if (!isFirstLoad.current && total > lastPendingCount.current) {
          playOrderSound()
          vibrate()
          toast(`🔔 有新订单！当前 ${total} 个待处理`, 'success')
        }
        lastPendingCount.current = total
        isFirstLoad.current = false
      }).catch(() => {})
  }

  useEffect(() => {
    loadData()
    const timer = setInterval(() => {
      loadPendingOrders(1)
      api.getOrderStats().then(data => setStats(data || {})).catch(() => {})
    }, 15000)
    return () => clearInterval(timer)
  }, [])

  const loadData = () => {
    api.getOrderStats().then(data => setStats(data || {})).catch(() => {})
    api.getPlatforms().then(data => setPlatforms(Array.isArray(data) ? data : [])).catch(() => {})
    api.getMemos().then(data => setMemos(Array.isArray(data) ? data : [])).catch(() => {})
    api.getTopProducts().then(data => setTopProducts(Array.isArray(data) ? data : [])).catch(() => {})
    loadPendingOrders(1)
  }

  const handlePendingPageChange = (page) => {
    setPendingPage(page)
    loadPendingOrders(page)
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

  const toggleMemo = async (memo) => {
    await api.updateMemo(memo.id, { completed: !memo.completed })
    loadData()
  }

  const deleteMemo = async (id) => {
    await api.deleteMemo(id)
    loadData()
  }

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

      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/admin/stats/product')}>
        <div className="px-5 py-4 border-b flex items-center justify-between bg-gradient-to-r from-red-50 to-orange-50">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <h3 className="font-semibold text-gray-800">菜品热销 TOP5</h3>
          </div>
          <span className="text-xs text-gray-400">点击查看完整统计 →</span>
        </div>
        <div className="p-4">
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">暂无销售数据</p>
          ) : (
            <div className="space-y-2">
              {topProducts.map((p, i) => (
                <div key={p.product_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-orange-300 text-white' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</span>
                  <span className="flex-1 font-medium text-gray-800 text-sm">{p.name}</span>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-gray-500">{p.order_count} 单</span>
                    <span className="text-primary-600 font-bold">{p.total_sold} 份</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">备忘录 / 重点事项</h3>
          <Button size="sm" onClick={() => setMemoDialog(true)}>+ 添加</Button>
        </div>
        <CardContent>
          {memos.length === 0 ? (
            <Empty text="暂无备忘" icon="📝" />
          ) : (
            <div className="grid md:grid-cols-2 gap-2">
              {memos.slice(0, 6).map(m => (
                <div key={m.id} className={`flex items-start gap-3 p-3 rounded-lg ${m.completed ? 'bg-gray-50 opacity-60' : m.priority === 'high' ? 'bg-red-50 border border-red-100' : 'bg-gray-50'}`}>
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

      <Card>
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-800">今日待处理订单</h3>
            {pendingTotal > 0 && <Badge variant="warning">{pendingTotal}</Badge>}
          </div>
          <Link to="/admin/orders"><Button variant="ghost" size="sm">全部订单 →</Button></Link>
        </div>
        <CardContent>
          {pendingOrders.length === 0 ? (
            <Empty text="今日暂无待处理订单" icon="✅" />
          ) : (
            <div className="space-y-2">
              {pendingOrders.map(o => (
                <button
                  key={o.id}
                  onClick={() => setDetail(o)}
                  className="w-full flex items-center justify-between p-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge variant="warning">待处理</Badge>
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-medium text-gray-800">{o.order_no}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {o.items?.slice(0, 3).map(it => it.name).join('、')}{o.items?.length > 3 ? ` 等${o.items.length}件` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="font-bold text-primary-600">${parseFloat(o.total).toFixed(2)}</p>
                      <p className="text-xs text-gray-400">{o.customer_name || '堂吃'}</p>
                    </div>
                    <span className="text-gray-300">→</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
        {pendingTotal > pendingPageSize && (
          <div className="flex items-center justify-between px-5 py-3 border-t bg-gray-50">
            <span className="text-sm text-gray-500">共 {pendingTotal} 条</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePendingPageChange(pendingPage - 1)}
                disabled={pendingPage <= 1}
                className="px-3 py-1 text-sm border border-gray-200 rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white"
              >上一页</button>
              <span className="text-sm text-gray-600">第 {pendingPage} / {Math.max(1, Math.ceil(pendingTotal / pendingPageSize))} 页</span>
              <button
                onClick={() => handlePendingPageChange(pendingPage + 1)}
                disabled={pendingPage >= Math.ceil(pendingTotal / pendingPageSize)}
                className="px-3 py-1 text-sm border border-gray-200 rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white"
              >下一页</button>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">外卖平台</h3>
          <Link to="/admin/platforms"><Button variant="ghost" size="sm">管理 →</Button></Link>
        </div>
        <CardContent>
          {platforms.length === 0 ? (
            <Empty text="暂无平台，去添加吧" icon="🛵" />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {platforms.slice(0, 6).map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-xl border">
                      {p.logo ? <img src={p.logo} alt="" className="w-full h-full object-cover rounded-lg" /> : '🛵'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.phone || '无电话'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={p.enabled ? 'success' : 'default'}>{p.enabled ? '启用' : '停用'}</Badge>
                    {p.url && <a href={`/go?platform=${p.id}`} target="_blank" rel="noreferrer" className="text-primary-500 text-sm hover:underline">跳转</a>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={memoDialog}
        onClose={() => setMemoDialog(false)}
        title="添加备忘 / 重点事项"
        footer={<><Button variant="outline" onClick={() => setMemoDialog(false)}>取消</Button><Button onClick={addMemo}>保存</Button></>}
      >
        <div className="space-y-4">
          <Input label="标题 *" value={memoForm.title} onChange={e => setMemoForm({ ...memoForm, title: e.target.value })} placeholder="备忘标题" />
          <Textarea label="内容" value={memoForm.content} onChange={e => setMemoForm({ ...memoForm, content: e.target.value })} placeholder="详细内容（可选）" rows={3} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="类型" value={memoForm.type} onChange={e => setMemoForm({ ...memoForm, type: e.target.value })} options={[{ value: 'memo', label: '备忘录' }, { value: 'important', label: '重点事项' }]} />
            <Select label="优先级" value={memoForm.priority} onChange={e => setMemoForm({ ...memoForm, priority: e.target.value })} options={[{ value: 'normal', label: '普通' }, { value: 'high', label: '高优先级' }]} />
          </div>
        </div>
      </Dialog>

      <Dialog open={!!detail} onClose={() => setDetail(null)} title={`订单详情 - ${detail?.order_no || ''}`} width="max-w-lg">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-400">取餐方式</p><p className="font-medium">{diningMap[detail.dining_type]}</p></div>
              <div><p className="text-gray-400">状态</p><Badge variant={statusMap[detail.status]?.variant}>{statusMap[detail.status]?.label}</Badge></div>
              <div><p className="text-gray-400">顾客</p><p className="font-medium">{detail.customer_name || '-'}</p></div>
              <div><p className="text-gray-400">电话</p><p className="font-medium">{detail.customer_phone || '-'}</p></div>
              {detail.dining_type === 'delivery' && <div className="col-span-2"><p className="text-gray-400">配送地址</p><p className="font-medium">{detail.customer_address}</p></div>}
              {detail.note && <div className="col-span-2"><p className="text-gray-400">备注</p><p className="font-medium">{detail.note}</p></div>}
              <div className="col-span-2"><p className="text-gray-400">下单时间</p><p className="font-medium">{detail.created_at}</p></div>
            </div>
            <div className="border-t pt-4">
              <p className="text-sm text-gray-400 mb-2">商品明细</p>
              <div className="space-y-2">
                {detail.items?.map((it, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-700">{it.name} × {it.quantity}{it.note && <span className="text-xs text-yellow-600 ml-1">({it.note})</span>}</span>
                    <span className="text-gray-600">${(it.price * it.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t pt-4 space-y-1">
              <div className="flex justify-between text-sm text-gray-600"><span>小计</span><span>${parseFloat(detail.subtotal).toFixed(2)}</span></div>
              <div className="flex justify-between text-sm text-gray-600"><span>税费</span><span>${parseFloat(detail.tax).toFixed(2)}</span></div>
              <div className="flex justify-between text-sm text-gray-600"><span>配送费</span><span>${parseFloat(detail.delivery_fee).toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t"><span>合计</span><span className="text-primary-600">${parseFloat(detail.total).toFixed(2)}</span></div>
            </div>
            <div className="flex gap-2 pt-2 flex-wrap">
              {statusMap[detail.status]?.next && (
                <Button size="sm" onClick={() => updateOrderStatus(detail.id, statusMap[detail.status].next)}>
                  {statusMap[detail.status].nextLabel}
                </Button>
              )}
              {detail.status === 'pending' && (
                <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => { if (confirm('确定取消此订单？')) updateOrderStatus(detail.id, 'cancelled') }}>
                  取消订单
                </Button>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
