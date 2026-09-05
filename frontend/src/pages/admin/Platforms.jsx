import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Table, Badge, Dialog, Input, Textarea, Switch, Empty, toast } from '../../components/ui'

const emptyPlatform = { name: '', logo: '', url: '', username: '', password: '', phone: '', note: '', enabled: true, weekly_info: '' }

export default function Platforms() {
  const [platforms, setPlatforms] = useState([])
  const [dialog, setDialog] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyPlatform)

  useEffect(() => { load() }, [])

  const load = () => {
    api.getPlatforms().then(data => setPlatforms(Array.isArray(data) ? data : [])).catch(() => {})
  }

  const openAdd = () => { setEditing(null); setForm(emptyPlatform); setDialog(true) }
  const openEdit = (p) => { setEditing(p); setForm({ ...p, enabled: !!p.enabled }); setDialog(true) }

  const save = async () => {
    if (!form.name) { toast('平台名称必填', 'error'); return }
    if (!form.url) { toast('跳转地址必填', 'error'); return }
    try {
      if (editing) { await api.updatePlatform(editing.id, form); toast('更新成功') }
      else { await api.createPlatform(form); toast('创建成功') }
      setDialog(false); load()
    } catch (e) { toast(e.message, 'error') }
  }

  const remove = async (id) => {
    if (!confirm('确定删除该平台？')) return
    await api.deletePlatform(id); toast('已删除'); load()
  }

  const openUrl = (url) => {
    if (url) window.open(url, '_blank')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">外卖平台管理</h2>
          <p className="text-sm text-gray-400 mt-1">管理各外卖平台的跳转、账号和每周信息</p>
        </div>
        <Button onClick={openAdd}>+ 添加平台</Button>
      </div>

      <Card>
        {platforms.length === 0 ? <Empty text="暂无平台，点击右上角添加" icon="🛵" /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {platforms.map(p => (
              <div key={p.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                      {p.logo ? <img src={p.logo} className="w-full h-full object-cover rounded-lg" /> : '🛵'}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{p.name}</h3>
                      <Badge variant={p.enabled ? 'success' : 'default'}>{p.enabled ? '启用' : '停用'}</Badge>
                    </div>
                  </div>
                </div>
                <div className="space-y-1 text-sm text-gray-500 mb-3">
                  {p.phone && <p>📞 {p.phone}</p>}
                  {p.username && <p>👤 {p.username}</p>}
                  {p.note && <p className="text-xs">{p.note}</p>}
                </div>
                {p.weekly_info && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-3">
                    <p className="text-xs text-yellow-700">📋 本周信息</p>
                    <p className="text-xs text-yellow-600 mt-1">{p.weekly_info}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => openUrl(p.url)}>跳转</Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(p)}>编辑</Button>
                  <button onClick={() => remove(p.id)} className="text-red-400 hover:text-red-600 px-2">×</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={dialog} onClose={() => setDialog(false)} title={editing ? '编辑平台' : '添加平台'} width="max-w-2xl"
        footer={<><Button variant="outline" onClick={() => setDialog(false)}>取消</Button><Button onClick={save}>保存</Button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="平台名称 *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="如 DoorDash" />
            <Input label="Logo URL" value={form.logo} onChange={e => setForm({ ...form, logo: e.target.value })} placeholder="https://..." />
          </div>
          <Input label="跳转地址 *" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." />
          <div className="grid grid-cols-2 gap-4">
            <Input label="账号" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
            <Input label="密码" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="联系电话" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <Switch checked={form.enabled} onChange={v => setForm({ ...form, enabled: v })} label="启用平台" />
          </div>
          <Textarea label="备注" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} rows={2} />
          <Textarea label="本周上下架/缺货信息" value={form.weekly_info} onChange={e => setForm({ ...form, weekly_info: e.target.value })} rows={3} placeholder="如：本周烤串缺货，奶茶全部上架..." />
        </div>
      </Dialog>
    </div>
  )
}
