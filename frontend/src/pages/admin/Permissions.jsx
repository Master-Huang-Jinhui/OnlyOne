import { useState, useEffect, useMemo } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Badge, Dialog, Input, Select, Empty, toast } from '../../components/ui'

const PERMISSION_TEMPLATES = [
  { name: '店长（全部权限）', desc: '拥有后台全部菜单权限', selectAll: true },
  { name: '收银员（订单+商品）', desc: '只能管理订单和商品', menuNames: ['订单管理', '商品管理', '口味管理', '订单状态管理'] },
  { name: '库管员（货物+统计）', desc: '管理货物库存和销售统计', menuNames: ['货物管理', '销售统计'] },
  { name: '内容运营（内容+平台）', desc: '管理前台内容和外卖平台', menuNames: ['内容管理', '外卖平台'] },
  { name: '只读权限（查看全部）', desc: '可查看所有页面但不能修改', selectAll: true, readOnly: true }
]

const ROLE_OPTIONS = [
  { value: '', label: '全部角色' },
  { value: 'manager', label: '管理员' },
  { value: 'employee', label: '员工' },
  { value: 'user', label: '普通用户' }
]

export default function Permissions() {
  const [users, setUsers] = useState([])
  const [menus, setMenus] = useState([])
  const [loading, setLoading] = useState(false)
  const [dialog, setDialog] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [selectedMenus, setSelectedMenus] = useState([])
  const [keyword, setKeyword] = useState('')
  const [roleFilter, setRoleFilter] = useState('manager')
  const [appliedTemplate, setAppliedTemplate] = useState('')

  useEffect(() => { load() }, [])

  const load = () => {
    setLoading(true)
    api.getUsers().then(data => setUsers(Array.isArray(data) ? data : [])).catch(() => {})
    api.getAllMenus().then(data => setMenus(Array.isArray(data) ? data : [])).catch(() => {}).finally(() => setLoading(false))
  }

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (u.role === 'admin') return false
      if (roleFilter && u.role !== roleFilter) return false
      if (keyword) {
        const kw = keyword.toLowerCase()
        const match = (u.username || '').toLowerCase().includes(kw) || (u.name || '').toLowerCase().includes(kw)
        if (!match) return false
      }
      return true
    })
  }, [users, keyword, roleFilter])

  const openPermission = (user) => {
    setEditingUser(user)
    setAppliedTemplate('')
    try {
      const perms = JSON.parse(user.permissions || '{}')
      setSelectedMenus(perms.menus || [])
    } catch {
      setSelectedMenus([])
    }
    setDialog(true)
  }

  const toggleMenu = (menuId) => {
    setSelectedMenus(prev => prev.includes(menuId) ? prev.filter(id => id !== menuId) : [...prev, menuId])
    setAppliedTemplate('')
  }

  const allMenuIds = useMemo(() => menus.map(m => m.id), [menus])
  const allSelected = allMenuIds.length > 0 && allMenuIds.every(id => selectedMenus.includes(id))

  const selectAll = () => { setSelectedMenus(allMenuIds); setAppliedTemplate('已全选') }
  const selectNone = () => { setSelectedMenus([]); setAppliedTemplate('已全不选（默认全部可见）') }
  const invertSelection = () => { setSelectedMenus(allMenuIds.filter(id => !selectedMenus.includes(id))); setAppliedTemplate('') }

  const applyTemplate = (template) => {
    if (template.selectAll) {
      setSelectedMenus(allMenuIds)
    } else if (template.menuNames) {
      const ids = menus.filter(m => template.menuNames.includes(m.name)).map(m => m.id)
      setSelectedMenus(ids)
    }
    setAppliedTemplate(template.name)
    toast(`已应用模板：${template.name}`)
  }

  const savePermission = async () => {
    if (!editingUser) return
    try {
      const permissions = { menus: selectedMenus }
      await api.updateUser(editingUser.id, { permissions: JSON.stringify(permissions) })
      toast('权限保存成功')
      setDialog(false)
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const getMenuName = (menuId) => {
    const m = menus.find(m => m.id === menuId)
    return m ? m.name : `菜单${menuId}`
  }

  const getUserMenuCount = (user) => {
    try {
      const perms = JSON.parse(user.permissions || '{}')
      return (perms.menus || []).length
    } catch { return 0 }
  }

  const parentMenus = useMemo(() => menus.filter(m => m.parent_id === 0 || !m.parent_id), [menus])
  const getChildren = (parentId) => menus.filter(m => m.parent_id === parentId)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">权限管理</h2>
        <p className="text-sm text-gray-400 mt-1">给管理员(manager)分配可见的后台菜单，超级管理员(admin)默认拥有全部权限。不勾选任何菜单则默认可见全部。</p>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <Input placeholder="搜索账号 / 姓名..." value={keyword} onChange={e => setKeyword(e.target.value)} />
          </div>
          <Select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} options={ROLE_OPTIONS} className="w-36" />
          <div className="text-sm text-gray-400">共 <span className="font-medium text-gray-600">{filteredUsers.length}</span> 个用户待配置</div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400">加载中...</div>
        ) : filteredUsers.length === 0 ? (
          <Empty text={keyword || roleFilter ? '没有匹配的用户' : '暂无需要配置权限的用户'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">用户</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">角色</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">已配置菜单</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">权限状态</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">状态</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => {
                  const menuCount = getUserMenuCount(u)
                  return (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-medium text-sm flex-shrink-0 ${u.role === 'manager' ? 'bg-green-100 text-green-600' : u.role === 'employee' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-600'}`}>
                            {(u.name || u.username).charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800 truncate">{u.username}</p>
                            <p className="text-xs text-gray-400 truncate">{u.name || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><Badge variant={u.role === 'manager' ? 'success' : u.role === 'employee' ? 'warning' : 'default'}>{u.role === 'manager' ? '管理员' : u.role === 'employee' ? '员工' : '普通用户'}</Badge></td>
                      <td className="px-4 py-3">
                        {menuCount === 0 ? (
                          <span className="text-xs text-gray-400">未配置（默认全部可见）</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-primary-600">{menuCount} 个菜单</span>
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {JSON.parse(u.permissions || '{}').menus?.slice(0, 2).map(id => (
                                <Badge key={id} variant="primary" className="text-xs">{getMenuName(id)}</Badge>
                              ))}
                              {menuCount > 2 && <Badge variant="default" className="text-xs">+{menuCount - 2}</Badge>}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {menuCount === 0 ? <Badge variant="warning">未配置</Badge> : menuCount === allMenuIds.length ? <Badge variant="success">全部权限</Badge> : <Badge variant="primary">部分权限</Badge>}
                      </td>
                      <td className="px-4 py-3"><Badge variant={u.enabled ? 'success' : 'danger'}>{u.enabled ? '正常' : '禁用'}</Badge></td>
                      <td className="px-4 py-3">
                        <button onClick={() => openPermission(u)} className="px-3 py-1.5 bg-primary-50 text-primary-600 rounded-lg text-xs font-medium hover:bg-primary-100 transition-colors">
                          {menuCount === 0 ? '分配权限' : '修改权限'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={dialog} onClose={() => setDialog(false)} title={`分配权限 - ${editingUser?.username || ''}`} width="max-w-xl">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-medium">
              {(editingUser?.name || editingUser?.username || '?').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-800">{editingUser?.name || editingUser?.username}</p>
              <p className="text-xs text-gray-400">{editingUser?.username} · {editingUser?.role === 'manager' ? '管理员' : editingUser?.role === 'employee' ? '员工' : '普通用户'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">已选菜单</p>
              <p className="text-lg font-bold text-primary-600">{selectedMenus.length}<span className="text-sm text-gray-400 font-normal">/{allMenuIds.length}</span></p>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">快速模板（点击应用）</p>
            <div className="flex flex-wrap gap-2">
              {PERMISSION_TEMPLATES.map(tpl => (
                <button key={tpl.name} onClick={() => applyTemplate(tpl)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${appliedTemplate === tpl.name ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:bg-primary-50'}`} title={tpl.desc}>
                  {tpl.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">勾选该用户可见的后台菜单，未勾选的菜单将不在侧边栏显示。</p>
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
                    <div className="relative">
                      <input type="checkbox" checked={parentSelected} ref={el => { if (el) el.indeterminate = isIndeterminate }} onChange={() => {
                        if (parentSelected) {
                          setSelectedMenus(prev => prev.filter(id => id !== parent.id && !childIds.includes(id)))
                        } else {
                          setSelectedMenus(prev => [...new Set([...prev, parent.id, ...childIds])])
                        }
                        setAppliedTemplate('')
                      }} className="w-4 h-4" />
                    </div>
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
                            {child.path && <span className="text-xs text-gray-300 font-mono">{child.path}</span>}
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="text-sm text-gray-500">
              已选择 <span className="font-bold text-primary-600">{selectedMenus.length}</span> 个菜单
              {selectedMenus.length === 0 && <span className="text-amber-500 ml-2">（不选则默认全部可见）</span>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialog(false)}>取消</Button>
              <Button onClick={savePermission}>保存权限</Button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
