import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Table, Badge, Dialog, Input, Select, Switch, toast } from '../../components/ui'

const emptyForm = { name: '', icon: '📄', path: '', parent_id: 0, sort_order: 0, enabled: true }

export default function Menus() {
  const [menus, setMenus] = useState([])
  const [dialog, setDialog] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { load() }, [])

  const load = () => api.getAllMenus().then(data => setMenus(Array.isArray(data) ? data : [])).catch(() => {})

  const openAdd = (parentId = 0) => { setEditing(null); setForm({ ...emptyForm, parent_id: parentId }); setDialog(true) }
  const openEdit = (m) => { setEditing(m); setForm({ ...m, enabled: !!m.enabled }); setDialog(true) }

  const save = async () => {
    if (!form.name) { toast('菜单名称必填', 'error'); return }
    if (!form.path) { toast('菜单路径必填', 'error'); return }
    try {
      if (editing) { await api.updateMenu(editing.id, form); toast('更新成功') }
      else { await api.createMenu(form); toast('创建成功') }
      setDialog(false); load()
    } catch (e) { toast(e.message, 'error') }
  }

  const remove = async (id) => {
    if (!confirm('确定删除该菜单？子菜单也会被删除')) return
    await api.deleteMenu(id); toast('已删除'); load()
  }

  const topMenus = menus.filter(m => m.parent_id === 0)
  const getSubMenus = (parentId) => menus.filter(m => m.parent_id === parentId)
  const parentOptions = [{ value: 0, label: '一级菜单（无上级）' }, ...topMenus.map(m => ({ value: m.id, label: m.name }))]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">菜单管理</h2>
          <p className="text-sm text-gray-400 mt-1">管理后台侧边栏菜单结构</p>
        </div>
        <Button onClick={() => openAdd(0)}>+ 添加菜单</Button>
      </div>

      <Card>
        <div className="p-4 space-y-2">
          {topMenus.length === 0 && <p className="text-center text-gray-400 py-8">暂无菜单</p>}
          {topMenus.map(menu => (
            <div key={menu.id} className="border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between p-3 bg-gray-50">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{menu.icon}</span>
                  <span className="font-medium text-gray-800">{menu.name}</span>
                  <code className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded">{menu.path}</code>
                  <Badge variant={menu.enabled ? 'success' : 'default'}>{menu.enabled ? '显示' : '隐藏'}</Badge>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openAdd(menu.id)} className="text-blue-500 hover:text-blue-700 text-sm">+ 子菜单</button>
                  <button onClick={() => openEdit(menu)} className="text-primary-500 hover:text-primary-700 text-sm">编辑</button>
                  <button onClick={() => remove(menu.id)} className="text-red-400 hover:text-red-600 text-sm">删除</button>
                </div>
              </div>
              {getSubMenus(menu.id).length > 0 && (
                <div className="divide-y">
                  {getSubMenus(menu.id).map(sub => (
                    <div key={sub.id} className="flex items-center justify-between p-3 pl-12">
                      <div className="flex items-center gap-3">
                        <span>{sub.icon}</span>
                        <span className="text-gray-700">{sub.name}</span>
                        <code className="text-xs text-gray-400">{sub.path}</code>
                        <Badge variant={sub.enabled ? 'success' : 'default'}>{sub.enabled ? '显示' : '隐藏'}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(sub)} className="text-primary-500 hover:text-primary-700 text-sm">编辑</button>
                        <button onClick={() => remove(sub.id)} className="text-red-400 hover:text-red-600 text-sm">删除</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Dialog open={dialog} onClose={() => setDialog(false)} title={editing ? '编辑菜单' : '添加菜单'}
        footer={<><Button variant="outline" onClick={() => setDialog(false)}>取消</Button><Button onClick={save}>保存</Button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="菜单名称 *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <Input label="图标（emoji）" value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="如 📄" />
          </div>
          <Input label="菜单路径 *" value={form.path} onChange={e => setForm({ ...form, path: e.target.value })} placeholder="如 /admin/products" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="上级菜单" value={form.parent_id} onChange={e => setForm({ ...form, parent_id: parseInt(e.target.value) })} options={parentOptions} />
            <Input label="排序" type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
          </div>
          <Switch checked={form.enabled} onChange={v => setForm({ ...form, enabled: v })} label="显示菜单" />
        </div>
      </Dialog>
    </div>
  )
}
