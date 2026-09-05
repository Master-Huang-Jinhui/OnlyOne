import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Table, Badge, Dialog, Input, Select, Switch, Empty, toast } from '../../components/ui'

const emptyForm = { parent_id: 0, name: '', icon: '', path: '', sort_order: 0, enabled: true }

export default function Menus() {
  const [menus, setMenus] = useState([])
  const [dialog, setDialog] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { load() }, [])
  const load = () => api.getAllMenus().then(setMenus).catch(() => {})

  const openAdd = (parentId) => { setEditing(null); setForm({ ...emptyForm, parent_id: parentId || 0 }); setDialog(true) }
  const openEdit = (m) => { setEditing(m); setForm({ ...m, enabled: !!m.enabled }); setDialog(true) }

  const save = async () => {
    if (!form.name) { toast('菜单名称必填', 'error'); return }
    try {
      if (editing) { await api.updateMenu(editing.id, form); toast('更新成功') }
      else { await api.createMenu(form); toast('添加成功') }
      setDialog(false); load()
    } catch (e) { toast(e.message, 'error') }
  }

  const remove = async (id) => {
    if (!confirm('确定删除？子菜单也会被删除')) return
    await api.deleteMenu(id); toast('已删除'); load()
  }

  const parents = menus.filter(m => m.parent_id === 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">菜单管理</h2><p className="text-sm text-gray-400 mt-1">管理后台侧边栏菜单，支持一级二级菜单</p></div>
        <Button onClick={() => openAdd(0)}>+ 添加菜单</Button>
      </div>

      <Card>
        {menus.length === 0 ? <Empty text="暂无菜单" /> : (
          <Table columns={[
            { header: '菜单名称', render: m => (
              <div className="flex items-center gap-2">
                <span className="text-lg">{m.icon || '📄'}</span>
                <span className={`font-medium ${m.parent_id === 0 ? 'text-gray-800' : 'text-gray-600 ml-4'}`}>{m.parent_id !== 0 && '└ '}{m.name}</span>
              </div>
            )},
            { header: '层级', render: m => <Badge variant={m.parent_id === 0 ? 'primary' : 'default'}>{m.parent_id === 0 ? '一级' : '二级'}</Badge> },
            { header: '路径', render: m => <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">{m.path || '-'}</code> },
            { header: '排序', key: 'sort_order' },
            { header: '状态', render: m => <Badge variant={m.enabled ? 'success' : 'default'}>{m.enabled ? '启用' : '停用'}</Badge> }
          ]} data={menus} actions={m => (
            <div className="flex gap-2">
              {m.parent_id === 0 && <button onClick={() => openAdd(m.id)} className="text-green-500 hover:text-green-700 text-sm">加子菜单</button>}
              <button onClick={() => openEdit(m)} className="text-primary-500 hover:text-primary-700 text-sm">编辑</button>
              <button onClick={() => remove(m.id)} className="text-red-400 hover:text-red-600 text-sm">删除</button>
            </div>
          )} />
        )}
      </Card>

      <Dialog open={dialog} onClose={() => setDialog(false)} title={editing ? '编辑菜单' : '添加菜单'}
        footer={<><Button variant="outline" onClick={() => setDialog(false)}>取消</Button><Button onClick={save}>保存</Button></>}>
        <div className="space-y-4">
          <Select label="上级菜单" value={form.parent_id} onChange={e => setForm({ ...form, parent_id: parseInt(e.target.value) })}
            options={[{ value: 0, label: '一级菜单（无上级）' }, ...parents.map(p => ({ value: p.id, label: p.name }))]} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="菜单名称 *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <Input label="图标（emoji）" value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="如 📋" />
          </div>
          <Input label="路由路径" value={form.path} onChange={e => setForm({ ...form, path: e.target.value })} placeholder="/admin/xxx" />
          <Input label="排序" type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
          <Switch checked={form.enabled} onChange={v => setForm({ ...form, enabled: v })} label="启用" />
        </div>
      </Dialog>
    </div>
  )
}
