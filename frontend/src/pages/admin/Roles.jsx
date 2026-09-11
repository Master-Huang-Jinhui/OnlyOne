import { useState, useEffect, useMemo } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Badge, Dialog, Input, Empty, toast } from '../../components/ui'

export default function Roles() {
  const [roles, setRoles] = useState([])
  const [menus, setMenus] = useState([])
  const [loading, setLoading] = useState(false)
  const [editDialog, setEditDialog] = useState(false)
  const [permDialog, setPermDialog] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', sort_order: 0 })
  const [selectedMenus, setSelectedMenus] = useState([])
  const [permRole, setPermRole] = useState(null)

  useEffect(() => { load() }, [])

  const load = () => {
    setLoading(true)
    api.getRoles().then(data => setRoles(Array.isArray(data) ? data : [])).catch(() => {})
    api.getAllMenus().then(data => setMenus(Array.isArray(data) ? data : [])).catch(() => {}).finally(() => setLoading(false))
  }

  const openAdd = () => { setEditing(null); setForm({ name: '', description: '', sort_order: roles.length + 1 }); setEditDialog(true) }
  const openEdit = (r) => { setEditing(r); setForm({ name: r.name, description: r.description || '', sort_order: r.sort_order || 0 }); setEditDialog(true) }

  const save = async () => {
    if (!form.name) { toast('角色名称必填', 'error'); return }
    try {
      if (editing) {
        await api.updateRole(editing.id, form)
        toast('更新成功')
      } else {
        await api.createRole(form)
        toast('添加成功')
      }
      setEditDialog(false)
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const remove = async (r) => {
    if (r.is_system) { toast('系统内置角色不可删除', 'error'); return }
    if (!confirm(`确定删除角色「${r.name}」？`)) return
    try { await api.deleteRole(r.id); toast('已删除'); load() } catch (e) { toast(e.message, 'error') }
  }

  const openPerm = (r) => {
    setPermRole(r)
    try {
      const perms = r.permissions || JSON.parse(r.permissions || '{}')
      setSelectedMenus(perms.menus || [])
    } catch { setSelectedMenus([]) }
    setPermDialog(true)
  }

  const toggleMenu = (menuId) => {
    setSelectedMenus(prev => prev.includes(menuId) ? prev.filter(id => id !== menuId) : [...prev, menuId])
  }

  const allMenuIds = useMemo(() => menus.map(m => m.id), [menus])
  const allSelected = allMenuIds.length > 0 && allMenuIds.every(id => selectedMenus.includes(id))
  const selectAll = () => setSelectedMenus(allMenuIds)
  const selectNone = () => setSelectedMenus([])
  const invertSelection = () => setSelectedMenus(allMenuIds.filter(id => !selectedMenus.includes(id)))

  const savePerm = async () => {
    if (!permRole) return
    try {
      await api.updateRole(permRole.id, { permissions: { menus: selectedMenus } })
      toast('权限保存成功')
      setPermDialog(false)
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const parentMenus = useMemo(() => menus.filter(m => m.parent_id === 0 || !m.parent_id), [menus])
  const getChildren = (parentId) => menus.filter(m => m.parent_id === parentId)
  const getMenuName = (menuId) => menus.find(m => m.id === menuId)?.name || `菜单${menuId}`

  // 快速权限模板（按菜单路径匹配，不受ID变化影响）
  const roleTemplates = useMemo(() => [
    {
      name: '老板/店长',
      desc: '全部权限',
      icon: '👑',
      match: () => allMenuIds
    },
    {
      name: '经理',
      desc: '运营+营销+报表',
      icon: '📊',
      match: () => menus.filter(m => !['/admin/permissions','/admin/roles','/admin/menus','/admin/settings','/admin/users'].includes(m.path)).map(m => m.id)
    },
    {
      name: '管理员',
      desc: '日常运营管理',
      icon: '👨‍💼',
      match: () => menus.filter(m => ['/admin/orders','/admin/products','/admin/flavors','/admin/tables','/admin/inventory','/admin/order-statuses'].includes(m.path)).map(m => m.id)
    },
    {
      name: '收银员',
      desc: '订单+收款+餐桌',
      icon: '💰',
      match: () => menus.filter(m => ['/admin/orders','/admin/tables','/admin/order-statuses'].includes(m.path)).map(m => m.id)
    },
    {
      name: '服务员',
      desc: '点餐+餐桌服务',
      icon: '🍽️',
      match: () => menus.filter(m => ['/admin/tables','/admin/orders'].includes(m.path)).map(m => m.id)
    },
    {
      name: '后厨师傅',
      desc: '厨房显示+出餐',
      icon: '👨‍🍳',
      match: () => menus.filter(m => m.path === '/admin/kds' || m.name.includes('厨房') || m.name.includes('KDS')).map(m => m.id)
    },
    {
      name: '库管员',
      desc: '货物+库存+统计',
      icon: '📦',
      match: () => menus.filter(m => ['/admin/inventory','/admin/stats/product'].includes(m.path)).map(m => m.id)
    },
    {
      name: '内容运营',
      desc: '内容+平台+表单',
      icon: '📝',
      match: () => menus.filter(m => ['/admin/content','/admin/platforms','/admin/forms'].includes(m.path)).map(m => m.id)
    },
    {
      name: '只读权限',
      desc: '查看全部菜单',
      icon: '👁️',
      match: () => allMenuIds
    },
  ], [menus, allMenuIds])

  const applyTemplate = (template) => {
    const ids = template.match()
    setSelectedMenus(ids)
    toast(`已应用「${template.name}」模板，选中 ${ids.length} 个菜单`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">角色管理</h2>
          <p className="text-sm text-gray-400 mt-1">创建角色并配置菜单权限，给用户分配角色后自动继承该角色的所有权限。系统内置角色不可删除。</p>
        </div>
        <Button onClick={openAdd}>+ 新建角色</Button>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400">加载中...</div>
        ) : roles.length === 0 ? (
          <Empty text="暂无角色" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">角色名称</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">描述</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">类型</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">已配置菜单</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">用户数</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">排序</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {roles.map(r => {
                  const menuCount = (r.permissions?.menus || JSON.parse(r.permissions || '{}').menus || []).length
                  return (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{r.is_system ? '🔒' : '👤'}</span>
                          <span className="font-medium text-gray-800">{r.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{r.description || '-'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={r.is_system ? 'default' : 'primary'}>{r.is_system ? '系统内置' : '自定义'}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {menuCount === 0 ? (
                          <span className="text-xs text-amber-500">未配置（默认全部可见）</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-primary-600">{menuCount} 个</span>
                            <div className="flex flex-wrap gap-1 max-w-[150px]">
                              {(r.permissions?.menus || JSON.parse(r.permissions || '{}').menus || []).slice(0, 2).map(id => (
                                <Badge key={id} variant="primary" className="text-xs">{getMenuName(id)}</Badge>
                              ))}
                              {menuCount > 2 && <Badge variant="default" className="text-xs">+{menuCount - 2}</Badge>}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${r.user_count > 0 ? 'text-gray-700' : 'text-gray-300'}`}>{r.user_count}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{r.sort_order || 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <button onClick={() => openPerm(r)} className="text-primary-500 hover:text-primary-700 text-xs font-medium">配置权限</button>
                          <button onClick={() => openEdit(r)} className="text-gray-500 hover:text-gray-700 text-xs">编辑</button>
                          {!r.is_system && <button onClick={() => remove(r)} className="text-red-400 hover:text-red-600 text-xs">删除</button>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 编辑角色弹窗 */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} title={editing ? '编辑角色' : '新建角色'} width="max-w-md">
        <div className="space-y-4">
          <Input label="角色名称 *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="如：厨房师傅、收银员" disabled={editing?.is_system} />
          <Input label="描述" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="角色职责说明" />
          <Input label="排序" type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
          {editing?.is_system && (
            <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-600">
              系统内置角色仅可修改描述和排序，名称和权限不可修改。
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setEditDialog(false)}>取消</Button>
            <Button className="flex-1" onClick={save}>保存</Button>
          </div>
        </div>
      </Dialog>

      {/* 配置权限弹窗 */}
      <Dialog open={permDialog} onClose={() => setPermDialog(false)} title={`配置权限 - ${permRole?.name || ''}`} width="max-w-xl">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-800">{permRole?.name}</p>
              <p className="text-xs text-gray-400">{permRole?.description || '暂无描述'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">已选菜单</p>
              <p className="text-lg font-bold text-primary-600">{selectedMenus.length}<span className="text-sm text-gray-400 font-normal">/{allMenuIds.length}</span></p>
            </div>
          </div>

          {permRole?.is_system ? (
            <div className="p-4 bg-amber-50 rounded-lg text-center">
              <p className="text-amber-600 text-sm">系统内置角色（超级管理员/管理员/员工/普通用户）的权限由系统固定，不可在此修改。</p>
              <p className="text-amber-500 text-xs mt-1">如需自定义权限，请新建一个自定义角色。</p>
            </div>
          ) : (
            <>
              {/* 快速模板 */}
              <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                <p className="text-xs font-medium text-gray-600 mb-2">⚡ 快速模板（点击应用，可在此基础上微调）</p>
                <div className="flex flex-wrap gap-2">
                  {roleTemplates.map(tpl => (
                    <button
                      key={tpl.name}
                      onClick={() => applyTemplate(tpl)}
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <span>{tpl.icon}</span>
                      <span className="font-medium">{tpl.name}</span>
                      <span className="text-gray-400">（{tpl.desc}）</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">勾选该角色可见的后台菜单，未勾选的菜单将不在侧边栏显示。</p>
                <div className="flex gap-2">
                  <button onClick={selectAll} className="text-xs text-primary-500 hover:text-primary-700">全选</button>
                  <span className="text-gray-300">|</span>
                  <button onClick={selectNone} className="text-xs text-gray-500 hover:text-gray-700">全不选</button>
                  <span className="text-gray-300">|</span>
                  <button onClick={invertSelection} className="text-xs text-gray-500 hover:text-gray-700">反选</button>
                </div>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {parentMenus.map(parent => {
                  const children = getChildren(parent.id)
                  const childIds = children.map(c => c.id)
                  const allChildrenSelected = children.length > 0 && childIds.every(id => selectedMenus.includes(id))
                  const someChildrenSelected = children.length > 0 && childIds.some(id => selectedMenus.includes(id))
                  const parentSelected = selectedMenus.includes(parent.id) || allChildrenSelected
                  const isIndeterminate = !allChildrenSelected && someChildrenSelected
                  return (
                    <div key={parent.id} className={`border rounded-lg overflow-hidden transition-colors ${parentSelected ? 'border-primary-200 bg-primary-50/30' : 'border-gray-200 bg-white'}`}>
                      <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50">
                        <input type="checkbox" checked={parentSelected} ref={el => { if (el) el.indeterminate = isIndeterminate }} onChange={() => {
                          if (parentSelected) {
                            setSelectedMenus(prev => prev.filter(id => id !== parent.id && !childIds.includes(id)))
                          } else {
                            setSelectedMenus(prev => [...new Set([...prev, parent.id, ...childIds])])
                          }
                        }} className="w-4 h-4" />
                        <span className="text-lg">{parent.icon}</span>
                        <span className={`font-medium flex-1 ${parentSelected ? 'text-primary-700' : 'text-gray-700'}`}>{parent.name}</span>
                        {children.length > 0 && <span className="text-xs text-gray-400">{childIds.filter(id => selectedMenus.includes(id)).length}/{children.length} 子菜单</span>}
                      </label>
                      {children.length > 0 && (
                        <div className="border-t border-gray-100 bg-gray-50/50">
                          {children.map(child => {
                            const checked = selectedMenus.includes(child.id)
                            return (
                              <label key={child.id} className={`flex items-center gap-3 px-4 py-2.5 pl-12 cursor-pointer hover:bg-white transition-colors ${checked ? 'bg-primary-50/50' : ''}`}>
                                <input type="checkbox" checked={checked} onChange={() => toggleMenu(child.id)} className="w-3.5 h-3.5" />
                                <span className="text-sm">{child.icon}</span>
                                <span className={`text-sm flex-1 ${checked ? 'text-primary-700 font-medium' : 'text-gray-600'}`}>{child.name}</span>
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="text-sm text-gray-500">
              已选择 <span className="font-bold text-primary-600">{selectedMenus.length}</span> 个菜单
              {selectedMenus.length === 0 && !permRole?.is_system && <span className="text-amber-500 ml-2">（不选则默认全部可见）</span>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPermDialog(false)}>取消</Button>
              {!permRole?.is_system && <Button onClick={savePerm}>保存权限</Button>}
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
