import { useState, useEffect, useRef } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Table, Badge, Dialog, Input, Textarea, Switch, Empty, toast } from '../../components/ui'

const emptyForm = { name: '', logo: '', url: '', account: '', password: '', phone: '', note: '', enabled: true, sort_order: 0 }

export default function Platforms() {
  const [platforms, setPlatforms] = useState([])
  const [dialog, setDialog] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [showPassword, setShowPassword] = useState({})
  const [isAdmin, setIsAdmin] = useState(false)
  const [uploading, setUploading] = useState(false)
  const logoInputRef = useRef(null)

  useEffect(() => {
    load()
    api.getMe().then(u => setIsAdmin(u?.role === 'admin')).catch(() => {})
  }, [])

  const load = () => {
    api.getPlatforms().then(data => setPlatforms(Array.isArray(data) ? data : [])).catch(() => {})
  }

  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm)
    setDialog(true)
  }

  const openEdit = (p) => {
    setEditing(p)
    setForm({ ...p, enabled: !!p.enabled })
    setDialog(true)
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast('请选择图片文件', 'error'); return }
    if (file.size > 5 * 1024 * 1024) { toast('图片不能超过5MB', 'error'); return }
    setUploading(true)
    try {
      const res = await api.uploadImage(file)
      setForm(f => ({ ...f, logo: res.url }))
      toast('Logo 上传成功')
    } catch (err) {
      toast(err.message || '上传失败', 'error')
    } finally {
      setUploading(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  const save = async () => {
    if (!form.name) { toast('平台名称必填', 'error'); return }
    try {
      if (editing) {
        await api.updatePlatform(editing.id, form)
        toast('更新成功')
      } else {
        await api.createPlatform(form)
        toast('添加成功')
      }
      setDialog(false)
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const remove = async (id) => {
    if (!confirm('确定删除该平台？')) return
    await api.deletePlatform(id)
    toast('已删除')
    load()
  }

  const toggleEnabled = async (p) => {
    await api.updatePlatform(p.id, { enabled: !p.enabled })
    load()
  }

  const columns = [
    { header: '平台', render: p => (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-xl border overflow-hidden">
          {p.logo ? <img src={p.logo} alt="" className="w-full h-full object-cover" /> : '🛵'}
        </div>
        <div>
          <p className="font-medium text-gray-800">{p.name}</p>
        </div>
      </div>
    )},
    { header: '账号', render: p => <span className="text-sm text-gray-700">{p.account || '-'}</span> },
    ...(isAdmin ? [{ header: '密码', render: p => (
      <div className="text-sm flex items-center gap-1">
        {p.password ? (
          <>
            <span className="text-gray-700">{showPassword[p.id] ? p.password : '••••••'}</span>
            <button onClick={() => setShowPassword(s => ({ ...s, [p.id]: !s[p.id] }))} className="text-primary-500 text-xs">
              {showPassword[p.id] ? '隐藏' : '显示'}
            </button>
          </>
        ) : '-'}
      </div>
    )}] : []),
    { header: '电话', render: p => <span className="text-sm text-gray-700">{p.phone || '-'}</span> },
    { header: '备注', render: p => <span className="text-sm text-gray-500 max-w-[200px] truncate block">{p.note || '-'}</span> },
    { header: '状态', render: p => <Badge variant={p.enabled ? 'success' : 'default'}>{p.enabled ? '启用' : '停用'}</Badge> },
    { header: '跳转', render: p => p.url ? (
      <a href={`/go?platform=${p.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm font-medium">
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
        {platforms.length === 0 ? (
          <Empty text="暂无平台，点击右上角添加" icon="🛵" />
        ) : (
          <Table
            columns={columns}
            data={platforms}
            actions={p => (
              <div className="flex gap-2">
                <button onClick={() => openEdit(p)} className="text-primary-500 hover:text-primary-700 text-sm">编辑</button>
                <button onClick={() => toggleEnabled(p)} className="text-gray-500 hover:text-gray-700 text-sm">{p.enabled ? '停用' : '启用'}</button>
                <button onClick={() => remove(p.id)} className="text-red-400 hover:text-red-600 text-sm">删除</button>
              </div>
            )}
          />
        )}
      </Card>

      <Dialog
        open={dialog}
        onClose={() => setDialog(false)}
        title={editing ? '编辑平台' : '添加平台'}
        width="max-w-2xl"
        footer={<><Button variant="outline" onClick={() => setDialog(false)}>取消</Button><Button onClick={save}>保存</Button></>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="平台名称 *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="如：DoorDash" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo 图片</label>
              <div className="flex items-center gap-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={uploading}>
                  {uploading ? '上传中...' : '选择图片'}
                </Button>
                {form.logo && (
                  <div className="w-10 h-10 rounded border overflow-hidden">
                    <img src={form.logo} alt="logo" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              {form.logo && <p className="text-xs text-gray-400 mt-1 truncate">{form.logo}</p>}
            </div>
          </div>
          <Input label="跳转 URL" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." />
          <div className="grid grid-cols-2 gap-4">
            <Input label="账号" value={form.account} onChange={e => setForm({ ...form, account: e.target.value })} placeholder="登录账号" />
            {isAdmin ? (
              <Input label="密码" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="登录密码" type="text" />
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
                <p className="text-sm text-gray-400 py-2">仅管理员可查看和修改密码</p>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="联系电话" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="平台客服电话" />
            <Input label="排序" type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
          </div>
          <Textarea label="备注" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="其他备注信息" rows={2} />
          <div className="flex items-center gap-4">
            <Switch checked={form.enabled} onChange={v => setForm({ ...form, enabled: v })} label="启用该平台" />
          </div>
        </div>
      </Dialog>
    </div>
  )
}