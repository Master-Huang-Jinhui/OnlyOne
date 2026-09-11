import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Table, Badge, Dialog, Input, Textarea, Select, Empty, toast } from '../../components/ui'

export default function Members() {
  const [members, setMembers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [dialog, setDialog] = useState(null)
  const [detail, setDetail] = useState(null)
  const [pointsDialog, setPointsDialog] = useState(null)
  const [stats, setStats] = useState({ total: 0, todayNew: 0, totalPoints: 0, byLevel: [] })

  useEffect(() => { load(); loadStats() }, [])

  const load = () => {
    api.getMembers({ keyword: keyword.trim(), level: levelFilter, page, page_size: pageSize }).then(data => {
      setMembers(data.members || [])
      setTotal(data.total || 0)
    }).catch(() => {})
  }

  const loadStats = () => {
    api.getMemberStats().then(data => setStats(data)).catch(() => {})
  }

  const save = async () => {
    const { mode, data } = dialog
    if (!data.name.trim() || !data.phone.trim()) { toast('姓名和手机号必填', 'error'); return }
    try {
      if (mode === 'add') { await api.createMember(data); toast('会员添加成功') }
      else { await api.updateMember(data.id, data); toast('会员信息已更新') }
      setDialog(null); load(); loadStats()
    } catch (e) { toast(e.message, 'error') }
  }

  const remove = async (m) => {
    if (!window.confirm(`确定删除会员"${m.name}"吗？`)) return
    try { await api.deleteMember(m.id); toast('会员已删除'); load(); loadStats() } catch (e) { toast(e.message, 'error') }
  }

  const viewDetail = async (m) => {
    try {
      const data = await api.getMemberDetail(m.id)
      setDetail(data)
    } catch (e) { toast(e.message, 'error') }
  }

  const adjustPoints = async () => {
    const { member_id, points, reason } = pointsDialog
    if (!points) { toast('请输入积分数量', 'error'); return }
    try {
      await api.adjustMemberPoints({ member_id, points: parseInt(points), reason })
      toast('积分已调整')
      setPointsDialog(null); load()
      if (detail) viewDetail(detail)
    } catch (e) { toast(e.message, 'error') }
  }

  const levelColor = (level) => {
    const map = { '普通会员': 'default', '银卡会员': 'primary', '金卡会员': 'warning', '钻石会员': 'danger' }
    return map[level] || 'default'
  }

  const columns = [
    { header: '会员', render: m => (
      <div>
        <p className="font-medium text-gray-800">{m.name}</p>
        <p className="text-xs text-gray-400">{m.phone}</p>
      </div>
    )},
    { header: '等级', render: m => <Badge variant={levelColor(m.level)}>{m.level}</Badge> },
    { header: '积分', render: m => <span className="font-medium text-primary-600">{m.points}</span> },
    { header: '累计消费', render: m => <span>${parseFloat(m.total_spent || 0).toFixed(2)}</span> },
    { header: '生日', render: m => m.birthday || '-' },
    { header: '注册时间', render: m => <span className="text-xs text-gray-400">{m.created_at}</span> }
  ]

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">👑 会员管理</h2>
          <p className="text-sm text-gray-400 mt-1">管理会员信息、积分、等级和优惠券</p>
        </div>
        <Button onClick={() => setDialog({ mode: 'add', data: { name: '', phone: '', email: '', birthday: '', note: '' } })}>+ 新增会员</Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 bg-blue-50">
          <p className="text-sm text-blue-600">会员总数</p>
          <p className="text-3xl font-bold text-blue-700 mt-1">{stats.total}</p>
        </Card>
        <Card className="p-4 bg-green-50">
          <p className="text-sm text-green-600">今日新增</p>
          <p className="text-3xl font-bold text-green-700 mt-1">{stats.todayNew}</p>
        </Card>
        <Card className="p-4 bg-yellow-50">
          <p className="text-sm text-yellow-600">积分总数</p>
          <p className="text-3xl font-bold text-yellow-700 mt-1">{stats.totalPoints}</p>
        </Card>
        <Card className="p-4 bg-purple-50">
          <p className="text-sm text-purple-600">等级分布</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            {stats.byLevel?.map((l, i) => (
              <span key={i} className="text-xs bg-white px-2 py-1 rounded">{l.level}: {l.cnt}</span>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            type="text"
            value={keyword}
            onChange={e => { setKeyword(e.target.value); setPage(1) }}
            placeholder="搜索姓名/手机号..."
            className="w-64 pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        </div>
        <Select value={levelFilter} onChange={e => { setLevelFilter(e.target.value); setPage(1) }}
          options={[{ value: '', label: '全部等级' }, { value: '普通会员', label: '普通会员' }, { value: '银卡会员', label: '银卡会员' }, { value: '金卡会员', label: '金卡会员' }, { value: '钻石会员', label: '钻石会员' }]} />
      </div>

      <Card>
        {members.length === 0 ? (
          <Empty text="暂无会员，点击右上角添加" icon="👑" />
        ) : (
          <>
            <Table
              columns={columns}
              data={members}
              actions={m => (
                <div className="flex items-center gap-3">
                  <button onClick={() => viewDetail(m)} className="text-xs text-blue-600 hover:text-blue-700">详情</button>
                  <button onClick={() => setPointsDialog({ member_id: m.id, member_name: m.name, points: '', reason: '' })} className="text-xs text-yellow-600 hover:text-yellow-700">积分</button>
                  <button onClick={() => setDialog({ mode: 'edit', data: { ...m } })} className="text-xs text-primary-600 hover:text-primary-700">编辑</button>
                  <button onClick={() => remove(m)} className="text-xs text-red-400 hover:text-red-600">删除</button>
                </div>
              )}
            />
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t">
                <span className="text-sm text-gray-400">共 {total} 条，第 {page}/{totalPages} 页</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => { setPage(p => p - 1); load() }}>上一页</Button>
                  <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => { setPage(p => p + 1); load() }}>下一页</Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <Dialog open={!!dialog} onClose={() => setDialog(null)} title={dialog?.mode === 'add' ? '新增会员' : '编辑会员'} width="max-w-md">
        {dialog && (
          <div className="space-y-4">
            <Input label="姓名 *" value={dialog.data.name} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, name: e.target.value } })} />
            <Input label="手机号 *" value={dialog.data.phone} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, phone: e.target.value } })} />
            <Input label="邮箱" value={dialog.data.email || ''} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, email: e.target.value } })} />
            <Input label="生日" type="date" value={dialog.data.birthday || ''} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, birthday: e.target.value } })} />
            <Textarea label="备注" value={dialog.data.note || ''} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, note: e.target.value } })} rows={2} />
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setDialog(null)}>取消</Button>
              <Button className="flex-1" onClick={save}>保存</Button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog open={!!pointsDialog} onClose={() => setPointsDialog(null)} title={`积分调整 - ${pointsDialog?.member_name}`} width="max-w-sm">
        {pointsDialog && (
          <div className="space-y-4">
            <Input label="积分数量（正数增加，负数扣减）" type="number" value={pointsDialog.points} onChange={e => setPointsDialog({ ...pointsDialog, points: e.target.value })} placeholder="如：100 或 -50" />
            <Input label="原因" value={pointsDialog.reason} onChange={e => setPointsDialog({ ...pointsDialog, reason: e.target.value })} placeholder="如：消费赠送、活动奖励" />
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setPointsDialog(null)}>取消</Button>
              <Button className="flex-1" onClick={adjustPoints}>确认调整</Button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog open={!!detail} onClose={() => setDetail(null)} title={`会员详情 - ${detail?.name}`} width="max-w-2xl">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><span className="text-gray-400">手机号：</span>{detail.phone}</div>
              <div><span className="text-gray-400">等级：</span><Badge variant={levelColor(detail.level)}>{detail.level}</Badge></div>
              <div><span className="text-gray-400">积分：</span><span className="font-medium text-primary-600">{detail.points}</span></div>
              <div><span className="text-gray-400">累计消费：</span>${parseFloat(detail.total_spent || 0).toFixed(2)}</div>
              <div><span className="text-gray-400">生日：</span>{detail.birthday || '-'}</div>
              <div><span className="text-gray-400">注册：</span>{detail.created_at}</div>
            </div>
            {detail.email && <div className="text-sm"><span className="text-gray-400">邮箱：</span>{detail.email}</div>}
            {detail.note && <div className="text-sm"><span className="text-gray-400">备注：</span>{detail.note}</div>}

            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-700 mb-2">最近订单（{detail.orders?.length || 0}）</h3>
              {detail.orders?.length > 0 ? (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {detail.orders.map(o => (
                    <div key={o.id} className="flex justify-between text-sm py-1 border-b">
                      <span>{o.order_no} <span className="text-gray-400">{o.created_at}</span></span>
                      <span className="font-medium">${parseFloat(o.total).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-gray-400">暂无订单</p>}
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-700 mb-2">优惠券（{detail.coupons?.length || 0}）</h3>
              {detail.coupons?.length > 0 ? (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {detail.coupons.map(c => (
                    <div key={c.id} className="flex justify-between text-sm py-1">
                      <span>{c.name} ({c.type === 'fixed' ? `$${c.value}` : `${c.value}%`})</span>
                      <Badge variant={c.status === 'unused' ? 'success' : c.status === 'used' ? 'default' : 'danger'}>
                        {c.status === 'unused' ? '未使用' : c.status === 'used' ? '已使用' : '已过期'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-gray-400">暂无优惠券</p>}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}