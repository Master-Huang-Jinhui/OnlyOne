import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Table, Badge, Dialog, Input, Select, Switch, toast } from '../../components/ui'

const emptyForm = { username: '', password: '', role: 'user', name: '', phone: '', email: '', enabled: true }

export default function Users() {
  const [users, setUsers] = useState([])
  const [dialog, setDialog] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { load() }, [])
  const load = () => api.getUsers().then(setUsers).catch(() => {})

  const openAdd = () => { setEditing(null); setForm(emptyForm); setDialog(true) }
  const openEdit = (u) => { setEditing(u); setForm({ ...u, password: '', enabled: !!u.enabled }); setDialog(true) }

  const save = async () => {
    if (!form.username) { toast('账号必填', 'error'); return }
    if (!editing && !form.password) { toast('密码必填', 'error'); return }
    try {
      const data = { ...form }
      if (!data.password) delete data.password
      if (editing) { await api.updateUser(editing.id, data); toast('更新成功') }
      else { await api.createUser(data); toast('添加成功') }
      setDialog(false); load()
    } catch (e) { toast(e.message, 'error') }
  }

  const remove = async (id) => {
    if (!confirm('确定删除该用户？')) return
    try { await api.deleteUser(id); toast('已删除'); load() } catch (e) { toast(e.message, 'error') }
  }

  const toggleEnabled = async (u) => { await api.updateUser(u.id, { enabled: !u.enabled }); load() }

  const columns = [
    { header: '账号', render: u => (
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-medium text-sm">
          {(u.name || u.username).charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-gray-800">{u.username}</p>
          <p className="text-xs text-gray-400">{u.name || '-'}</p>
        </div>
      </div>
    )},
    { header: '角色', render: u => <Badge variant={u.role === 'admin' ? 'primary' : 'default'}>{u.role === 'admin' ? '超级管理员' : '普通用户'}</Badge> },
    { header: '电话', render: u => <span className="text-sm text-gray-600">{u.phone || '-'}</span> },
    { header: '邮箱', render: u => <span className="text-sm text-gray-600">{u.email || '-'}</span> },
    { header: '状态', render: u => <Badge variant={u.enabled ? 'success' : 'danger'}>{u.enabled ? '正常' : '禁用'}</Badge> }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">用户管理</h2>
          <p className="text-sm text-gray-400 mt-1">管理系统用户，admin 为超级管理员</p>
        </div>
        <Button onClick={openAdd}>+ 添加用户</Button>
      </div>

      <Card>
        <Table columns={columns} data={users} actions={u => (
          <div className="flex gap-2">
            <button onClick={() => openEdit(u)} className="text-primary-500 hover:text-primary-700 text-sm">编辑</button>
            <button onClick={() => toggleEnabled(u)} className="text-gray-500 hover:text-gray-700 text-sm">{u.enabled ? '禁用' : '启用'}</button>
            {u.username !== 'admin' && <button onClick={() => remove(u.id)} className="text-red-400 hover:text-red-600 text-sm">删除</button>}
          </div>
        )} />
      </Card>

      <Dialog open={dialog} onClose={() => setDialog(false)} title={editing ? '编辑用户' : '添加用户'}
        footer={<><Button variant="outline" onClick={() => setDialog(false)}>取消</Button><Button onClick={save}>保存</Button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="账号 *" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} disabled={!!editing} />
            <Input label={editing ? '新密码（留空不修改）' : '密码 *'} type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="姓名" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <Select label="角色" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
              options={[{ value: 'user', label: '普通用户' }, { value: 'admin', label: '超级管理员' }]} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="电话" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <Input label="邮箱" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <Switch checked={form.enabled} onChange={v => setForm({ ...form, enabled: v })} label="启用账号" />
        </div>
      </Dialog>
    </div>
  )
}
