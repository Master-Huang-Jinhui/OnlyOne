import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Table, Badge, Dialog, Input, Textarea, Switch, Empty, toast } from '../../components/ui'

const emptyForm = { name: '', logo: '', url: '', account: '', password: '', phone: '', note: '', enabled: true, sort_order: 0 }

export default function Platforms() {
  const [platforms, setPlatforms] = useState([])
  const [dialog, setDialog] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [showPassword, setShowPassword] = useState({})

  useEffect(() => { load() }, [])
  const load = () => { api.getPlatforms().then(setPlatforms).catch(() => {}) }

  const openAdd = () => { setEditing(null); setForm(emptyForm); setDialog(true) }
  const openEdit = (p) => { setEditing(p); setForm({ ...p, enabled: !!p.enabled }); setDialog(true) }

  const save = async () => {
    if (!form.name) { toast('平台名称必填', 'error'); return }
    try {
      if (editing) { await api.updatePlatform(editing.id, form); toast('更新成功') }
      else { await api.createPlatform(form); toast('添加成功') }
      setDialog(false); load()
    } catch (e) { toast(e.message, 'error') }
  }

  const remove = async (id) => {
    if (!confirm('确定删除该平台？')) return
    await api.deletePlatform(id); toast('已删除'); load()
  }

  const toggleEnabled = async (p) => { await api.updatePlatform(p.id, { enabled: !p.enabled }); load() }

  const columns = [
    { header: '平台', render: p => (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-xl border overflow-hidden">
          {p.logo ? <img src={p.logo} alt="" className="w-full h-full object-cover" /> : '🛵'}
        </div>
        <div>
          <p className="font-medium text-gray-800">{p.name}</p>
          <p className="text-xs text-gray-400">{p.phone || '无电话'}</p>
        </div>
      </div>
    )},
    { header: '账号', render: p => (
      <div className="text-sm">
        <p className="text-gray-700">{p.account || '-'}</p>
        {p.password && (
          <p className="text-gray-400 text-xs flex items-center gap-1">
            {showPassword[p.id] ? p.password : '••••••'}
            <button onClick={() => setShowPassword(s => ({ ...s, [p.id]: !s[p.id] }))} className="text-primary-500">
              {showPassword[p.id] ? '隐藏' : '显示'}
            </button>
          </p>
        )}
      </div>
    )},
    { header: '备注', render: p => <span className="text-sm text-gray-500 max-w-[200px] truncate block">{p.note || '-'}</span> },
    { header: '状态', render: p => <Badge variant={p.enabled ? 'success' : 'default'}>{p.enabled ? '启用' : '停用'}</Badge> },
    { header: '跳转', render: p => p.url ? (
      <a href={p.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm font-medium">
        <span>跳转</span><span>↗</span>
      </a>
    ) : <span className="text-gray-300 text-sm">未设置</span> }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">外卖平台管理</h2>
          <p className="text-sm text-gray-400 mt-1">管理所有外卖平台的跳转、账号和每周状态</p>
        </div>
        <Button onClick={openAdd}>+ 添加平台</Button>
      </div>

      <Card>
        {platforms.length === 0 ? <Empty text="暂无平台，点击右上角添加" icon="🛵" /> : (
          <Table columns={columns} data={platforms} actions={p => (
            <div className="flex gap-2">
              <button onClick={() => openEdit(p)} className="text-primary-500 hover:text-primary-700 text-sm">编辑</button>
              <button onClick={() => toggleEnabled(p)} className="text-gray-500 hover:text-gray-700 text-sm">{p.enabled ? '停用' : '启用'}</button>
              <button onClick={() => remove(p.id)} className="text-red-400 hover:text-red-600 text-sm">删除</button>
            </div>
          )} />
        )}
      </Card>

      <Dialog open={dialog} onClose={() => setDialog(false)} title={editing ? '编辑平台' : '添加平台'} width="max-w-2xl"
        footer={<><Button variant="outline" onClick={() => setDialog(false)}>取消</Button><Button onClick={save}>保存</Button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="平台名称 *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="如：DoorDash" />
            <Input label="Logo URL" value={form.logo} onChange={e => setForm({ ...form, logo: e.target.value })} placeholder="图片链接" />
          </div>
          <Input label="跳转 URL" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." />
          <div className="grid grid-cols-2 gap-4">
            <Input label="账号" value={form.account} onChange={e => setForm({ ...form, account: e.target.value })} placeholder="登录账号" />
            <Input label="密码" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="登录密码" type="text" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="联系电话" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="平台客服电话" />
            <Input label="排序" type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
          </div>
          <Textarea label="备注" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="其他备注信息" rows={2} />
          <Switch checked={form.enabled} onChange={v => setForm({ ...form, enabled: v })} label="启用该平台" />
        </div>
      </Dialog>
    </div>
  )
}
