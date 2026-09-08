import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Table, Badge, Dialog, Input, Select, Switch, toast } from '../../components/ui'

const emptyForm = { name: '', icon: '📄', path: '', parent_id: 0, sort_order: 0, enabled: true }

export default function Menus() {
  const [menus, setMenus] = useState([])
  const [dialog, setDialog] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [moveDialog, setMoveDialog] = useState(false)
  const [moveMenu, setMoveMenu] = useState(null)
  const [moveParentId, setMoveParentId] = useState(0)
  const [moveSort, setMoveSort] = useState(0)

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

  const hasChildren = (id) => menus.some(m => m.parent_id === id)
  const getMenuName = (id) => { const m = menus.find(x => x.id === id); return m ? m.name : '一级菜单（无上级）' }

  const openMoveDialog = (m) => {
    setMoveMenu(m)
    setMoveParentId(m.parent_id || 0)
    setMoveSort(m.sort_order || 0)
    setMoveDialog(true)
  }

  const doMove = async () => {
    if (!moveMenu) return
    if (moveMenu.parent_id === 0 && hasChildren(moveMenu.id) && moveParentId !== 0) {
      toast('该菜单下有子菜单，不能移动为二级菜单', 'error'); return
    }
    try {
      await api.updateMenu(moveMenu.id, { parent_id: moveParentId, sort_order: moveSort })
      const target = moveParentId === 0 ? '一级菜单' : `「${getMenuName(moveParentId)}」下`
      toast(`已移动到${target}，刷新侧边栏生效`)
      setMoveDialog(false); load()
    } catch (e) { toast(e.message, 'error') }
  }

  const topMenus = menus.filter(m => m.parent_id === 0)
  const getSubMenus = (parentId) => menus.filter(m => m.parent_id === parentId)
  const parentOptions = [{ value: 0, label: '一级菜单（无上级）' }, ...topMenus.map(m => ({ value: m.id, label: m.name }))]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">菜单管理</h2>
          <p className="text-sm text-gray-400 mt-1">管理后台侧边栏菜单结构，支持一级二级菜单移动</p>
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
                  <button onClick={() => openMoveDialog(menu)} className="text-purple-500 hover:text-purple-700 text-sm">移动</button>
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
                        <button onClick={() => openMoveDialog(sub)} className="text-purple-500 hover:text-purple-700 text-sm">移动</button>
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

      <Dialog open={moveDialog} onClose={() => setMoveDialog(false)} title={`移动菜单 - ${moveMenu?.name || ''}`}
        footer={<><Button variant="outline" onClick={() => setMoveDialog(false)}>取消</Button><Button onClick={doMove}>确认移动</Button></>}>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">将此菜单移动到新的位置，最多支持二级菜单</p>
          <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
            <p><span className="text-gray-500">当前层级：</span><span className="font-medium text-gray-800">{moveMenu?.parent_id === 0 ? '一级菜单' : `二级菜单（${getMenuName(moveMenu?.parent_id)} 下）`}</span></p>
            <p><span className="text-gray-500">当前排序：</span><span className="font-medium text-gray-800">{moveMenu?.sort_order || 0}</span></p>
            {moveMenu?.parent_id === 0 && hasChildren(moveMenu?.id) && (
              <p className="text-orange-500 text-xs mt-2">⚠️ 该菜单下有子菜单，只能作为一级菜单，不能降级为二级</p>
            )}
          </div>
          <Select label="移动到" value={moveParentId} onChange={e => setMoveParentId(parseInt(e.target.value))}
            options={[
              { value: 0, label: '一级菜单（无上级）' },
              ...topMenus.filter(p => p.id !== moveMenu?.id).map(p => ({ value: p.id, label: p.name }))
            ]} />
          <Input label="排序（数字越小越靠前）" type="number" value={moveSort} onChange={e => setMoveSort(parseInt(e.target.value) || 0)} />
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-700">
            <p>移动后刷新页面，侧边栏菜单将显示在新位置</p>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
