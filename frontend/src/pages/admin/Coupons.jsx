import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Table, Badge, Dialog, Input, Select, Empty, toast } from '../../components/ui'

export default function Coupons() {
  const [coupons, setCoupons] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [statusFilter, setStatusFilter] = useState('')
  const [dialog, setDialog] = useState(null)
  const [detail, setDetail] = useState(null)
  const [stats, setStats] = useState({ total: 0, active: 0, totalClaimed: 0, totalUsed: 0 })

  useEffect(() => { load(); loadStats() }, [])

  const load = () => {
    api.getCoupons({ status: statusFilter, page, page_size: pageSize }).then(data => {
      setCoupons(data.coupons || [])
      setTotal(data.total || 0)
    }).catch(() => {})
  }

  const loadStats = () => {
    api.getCouponStats().then(data => setStats(data)).catch(() => {})
  }

  const save = async () => {
    const { mode, data } = dialog
    if (!data.name.trim() || !data.type || !data.value) { toast('名称、类型、面值必填', 'error'); return }
    try {
      const payload = {
        name: data.name.trim(),
        type: data.type,
        value: parseFloat(data.value),
        min_amount: parseFloat(data.min_amount) || 0,
        max_discount: data.max_discount ? parseFloat(data.max_discount) : null,
        valid_days: data.valid_days ? parseInt(data.valid_days) : null,
        stock: data.stock ? parseInt(data.stock) : null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        sort_order: parseInt(data.sort_order) || 0
      }
      if (mode === 'add') { await api.createCoupon(payload); toast('优惠券创建成功') }
      else { await api.updateCoupon(data.id, payload); toast('优惠券已更新') }
      setDialog(null); load(); loadStats()
    } catch (e) { toast(e.message, 'error') }
  }

  const remove = async (c) => {
    if (!window.confirm(`确定删除优惠券"${c.name}"吗？`)) return
    try { await api.deleteCoupon(c.id); toast('优惠券已删除'); load(); loadStats() } catch (e) { toast(e.message, 'error') }
  }

  const toggleStatus = async (c) => {
    try {
      await api.updateCoupon(c.id, { enabled: c.enabled ? 0 : 1 })
      toast(c.enabled ? '已下架' : '已上架')
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const viewDetail = async (c) => {
    try {
      const data = await api.getCouponDetail(c.id)
      setDetail(data)
    } catch (e) { toast(e.message, 'error') }
  }

  const formatValue = (c) => c.type === 'fixed' ? `$${parseFloat(c.value).toFixed(2)}` : `${parseFloat(c.value)}%`

  const columns = [
    { header: '优惠券', render: c => (
      <div>
        <p className="font-medium text-gray-800">{c.name}</p>
        <p className="text-xs text-gray-400">{c.type === 'fixed' ? '满减券' : '折扣券'} · 最低消费${parseFloat(c.min_amount || 0).toFixed(2)}</p>
      </div>
    )},
    { header: '面值', render: c => <span className="font-bold text-red-500 text-lg">{formatValue(c)}</span> },
    { header: '库存', render: c => c.stock ? `${c.used_count || 0}/${c.stock}` : '不限' },
    { header: '有效期', render: c => c.valid_days ? `领取后${c.valid_days}天` : (c.start_date && c.end_date ? `${c.start_date} ~ ${c.end_date}` : '永久') },
    { header: '状态', render: c => c.enabled ? <Badge variant="success">上架中</Badge> : <Badge variant="default">已下架</Badge> }
  ]

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">🎟️ 优惠券管理</h2>
          <p className="text-sm text-gray-400 mt-1">创建和管理优惠券，支持满减券和折扣券</p>
        </div>
        <Button onClick={() => setDialog({ mode: 'add', data: { name: '', type: 'fixed', value: '', min_amount: 0, max_discount: '', valid_days: '', stock: '', start_date: '', end_date: '', sort_order: 0 } })}>+ 创建优惠券</Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 bg-red-50">
          <p className="text-sm text-red-600">优惠券总数</p>
          <p className="text-3xl font-bold text-red-700 mt-1">{stats.total}</p>
        </Card>
        <Card className="p-4 bg-green-50">
          <p className="text-sm text-green-600">上架中</p>
          <p className="text-3xl font-bold text-green-700 mt-1">{stats.active}</p>
        </Card>
        <Card className="p-4 bg-blue-50">
          <p className="text-sm text-blue-600">已领取</p>
          <p className="text-3xl font-bold text-blue-700 mt-1">{stats.totalClaimed}</p>
        </Card>
        <Card className="p-4 bg-yellow-50">
          <p className="text-sm text-yellow-600">已使用</p>
          <p className="text-3xl font-bold text-yellow-700 mt-1">{stats.totalUsed}</p>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          options={[{ value: '', label: '全部状态' }, { value: 'active', label: '上架中' }, { value: 'expired', label: '已过期' }, { value: 'disabled', label: '已下架' }]} />
      </div>

      <Card>
        {coupons.length === 0 ? (
          <Empty text="暂无优惠券，点击右上角创建" icon="🎟️" />
        ) : (
          <>
            <Table
              columns={columns}
              data={coupons}
              actions={c => (
                <div className="flex items-center gap-3">
                  <button onClick={() => viewDetail(c)} className="text-xs text-blue-600 hover:text-blue-700">详情</button>
                  <button onClick={() => toggleStatus(c)} className={`text-xs ${c.enabled ? 'text-yellow-600' : 'text-green-600'}`}>{c.enabled ? '下架' : '上架'}</button>
                  <button onClick={() => setDialog({ mode: 'edit', data: { ...c } })} className="text-xs text-primary-600 hover:text-primary-700">编辑</button>
                  <button onClick={() => remove(c)} className="text-xs text-red-400 hover:text-red-600">删除</button>
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

      <Dialog open={!!dialog} onClose={() => setDialog(null)} title={dialog?.mode === 'add' ? '创建优惠券' : '编辑优惠券'} width="max-w-lg">
        {dialog && (
          <div className="space-y-4">
            <Input label="优惠券名称 *" value={dialog.data.name} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, name: e.target.value } })} placeholder="如：新客立减5元" />
            <div className="grid grid-cols-2 gap-4">
              <Select label="类型 *" value={dialog.data.type} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, type: e.target.value } })}
                options={[{ value: 'fixed', label: '满减券（固定金额）' }, { value: 'percent', label: '折扣券（百分比）' }]} />
              <Input label={dialog.data.type === 'fixed' ? '减免金额 ($) *' : '折扣 (%) *'} type="number" step="0.01" value={dialog.data.value} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, value: e.target.value } })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="最低消费 ($)" type="number" step="0.01" value={dialog.data.min_amount} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, min_amount: e.target.value } })} />
              <Input label="最高优惠 ($)" type="number" step="0.01" value={dialog.data.max_discount} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, max_discount: e.target.value } })} placeholder="折扣券可选" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="领取后有效天数" type="number" value={dialog.data.valid_days} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, valid_days: e.target.value } })} placeholder="如：7" />
              <Input label="发放数量（空=不限）" type="number" value={dialog.data.stock} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, stock: e.target.value } })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="开始日期" type="date" value={dialog.data.start_date || ''} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, start_date: e.target.value } })} />
              <Input label="结束日期" type="date" value={dialog.data.end_date || ''} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, end_date: e.target.value } })} />
            </div>
            <Input label="排序" type="number" value={dialog.data.sort_order} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, sort_order: e.target.value } })} />
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setDialog(null)}>取消</Button>
              <Button className="flex-1" onClick={save}>保存</Button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog open={!!detail} onClose={() => setDetail(null)} title={`优惠券详情 - ${detail?.name}`} width="max-w-md">
        {detail && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white p-4 rounded-lg">
              <p className="text-2xl font-bold">{formatValue(detail)}</p>
              <p className="text-sm opacity-90">{detail.name}</p>
              <p className="text-xs opacity-75 mt-1">最低消费 ${parseFloat(detail.min_amount || 0).toFixed(2)}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-400">类型：</span>{detail.type === 'fixed' ? '满减券' : '折扣券'}</div>
              <div><span className="text-gray-400">状态：</span>{detail.enabled ? '上架中' : '已下架'}</div>
              <div><span className="text-gray-400">已领取：</span>{detail.received_count || 0}</div>
              <div><span className="text-gray-400">已使用：</span>{detail.used_count || 0}</div>
              <div><span className="text-gray-400">库存：</span>{detail.stock || '不限'}</div>
              <div><span className="text-gray-400">创建时间：</span>{detail.created_at}</div>
            </div>
            {detail.start_date && <div className="text-sm"><span className="text-gray-400">有效期：</span>{detail.start_date} ~ {detail.end_date || '永久'}</div>}
          </div>
        )}
      </Dialog>
    </div>
  )
}