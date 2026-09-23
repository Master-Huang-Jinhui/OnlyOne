import { useState, useEffect, useMemo } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Badge, Dialog, Input, Empty, toast } from '../../components/ui'
import { useLanguage } from '../../context/LanguageContext'

// 角色管理页面：创建自定义角色、配置菜单权限、一键应用角色模板
export default function Roles() {
  const { t, language } = useLanguage()
  const [roles, setRoles] = useState([])
  const [menus, setMenus] = useState([])
  const [loading, setLoading] = useState(false)
  const [editDialog, setEditDialog] = useState(false)       // 编辑角色名称对话框
  const [permDialog, setPermDialog] = useState(false)       // 配置权限对话框
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', sort_order: 0 })
  const [selectedMenus, setSelectedMenus] = useState([])   // 当前选中的菜单ID列表
  const [permRole, setPermRole] = useState(null)            // 正在配置权限的角色

  // 加载角色列表和菜单列表
  useEffect(() => { load() }, [])

  // 加载角色（过滤掉系统内置角色的显示）和全部菜单
  const load = () => {
    setLoading(true)
    api.getRoles().then(data => {
      const list = Array.isArray(data) ? data : []
      const filtered = list.filter(r => r.role_key === 'admin' || !r.is_system)
      setRoles(filtered)
    }).catch(() => {})
    api.getAllMenus().then(data => setMenus(Array.isArray(data) ? data : [])).catch(() => {}).finally(() => setLoading(false))
  }

  // 打开新建角色对话框
  const openAdd = () => { setEditing(null); setForm({ name: '', description: '', sort_order: roles.length + 1 }); setEditDialog(true) }
  // 打开编辑角色对话框
  const openEdit = (r) => { setEditing(r); setForm({ name: r.name, description: r.description || '', sort_order: r.sort_order || 0 }); setEditDialog(true) }

  // 保存角色（新建或更新）
  const save = async () => {
    if (!form.name) { toast(t('roles.nameRequired', '角色名称必填'), 'error'); return }
    try {
      if (editing) {
        await api.updateRole(editing.id, form)
        toast(t('roles.updated', '更新成功'))
      } else {
        await api.createRole(form)
        toast(t('roles.added', '添加成功'))
      }
      setEditDialog(false)
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  // 删除角色（系统内置角色不可删除）
  const remove = async (r) => {
    if (r.is_system) { toast(t('roles.systemNotDeletable', '系统内置角色不可删除'), 'error'); return }
    if (!confirm(`${t('roles.confirmDelete', '确定删除角色「')}${r.name}${t('roles.confirmDeleteEnd', '」？')}`)) return
    try { await api.deleteRole(r.id); toast(t('roles.deleted', '已删除')); load() } catch (e) { toast(e.message, 'error') }
  }

  // 打开权限配置对话框，解析角色已有的菜单权限
  const openPerm = (r) => {
    setPermRole(r)
    try {
      const perms = r.permissions || {}
      setSelectedMenus(perms.menus || [])
    } catch { setSelectedMenus([]) }
    setPermDialog(true)
  }

  // 切换单个菜单的选中状态
  const toggleMenu = (menuId) => {
    setSelectedMenus(prev => prev.includes(menuId) ? prev.filter(id => id !== menuId) : [...prev, menuId])
  }

  // 全选/全不选/反选
  const allMenuIds = useMemo(() => menus.map(m => m.id), [menus])
  const allSelected = allMenuIds.length > 0 && allMenuIds.every(id => selectedMenus.includes(id))
  const selectAll = () => setSelectedMenus(allMenuIds)
  const selectNone = () => setSelectedMenus([])
  const invertSelection = () => setSelectedMenus(allMenuIds.filter(id => !selectedMenus.includes(id)))

  // 保存角色权限到后端
  const savePerm = async () => {
    if (!permRole) return
    try {
      await api.updateRole(permRole.id, { permissions: { menus: selectedMenus } })
      toast(t('roles.permSaved', '权限保存成功'))
      setPermDialog(false)
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  // 获取一级菜单和子菜单
  const parentMenus = useMemo(() => menus.filter(m => m.parent_id === 0 || !m.parent_id), [menus])
  const getChildren = (parentId) => menus.filter(m => m.parent_id === parentId)
  // 根据菜单ID获取菜单名称（支持中英文）
  const getMenuName = (menuId) => { const m = menus.find(m => m.id === menuId); return m ? (language === 'en' ? (m.name_en || m.name) : m.name) : `${t('roles.menu', '菜单')}${menuId}` }

  // 角色快速模板：一键勾选对应角色的菜单权限
  const roleTemplates = useMemo(() => [
    { name: t('roles.tplOwner', '老板/店长'), desc: t('roles.tplOwnerDesc', '全部权限'), icon: '👑', match: () => allMenuIds },
    { name: t('roles.tplManager', '经理'), desc: t('roles.tplManagerDesc', '运营+营销+报表'), icon: '📊', match: () => menus.filter(m => !['/admin/permissions','/admin/roles','/admin/menus','/admin/settings','/admin/users'].includes(m.path)).map(m => m.id) },
    { name: t('roles.tplAdmin', '管理员'), desc: t('roles.tplAdminDesc', '日常运营管理'), icon: '👨‍💼', match: () => menus.filter(m => ['/admin/orders','/admin/products','/admin/flavors','/admin/tables','/admin/inventory','/admin/order-statuses'].includes(m.path)).map(m => m.id) },
    { name: t('roles.tplCashier', '收银员'), desc: t('roles.tplCashierDesc', '订单+收款+餐桌'), icon: '💰', match: () => menus.filter(m => ['/admin/orders','/admin/tables','/admin/order-statuses'].includes(m.path)).map(m => m.id) },
    { name: t('roles.tplWaiter', '服务员'), desc: t('roles.tplWaiterDesc', '点餐+餐桌服务'), icon: '🍽️', match: () => menus.filter(m => ['/admin/tables','/admin/orders'].includes(m.path)).map(m => m.id) },
    { name: t('roles.tplChef', '后厨师傅'), desc: t('roles.tplChefDesc', '厨房显示+出餐'), icon: '👨‍🍳', match: () => menus.filter(m => m.path === '/admin/kds' || m.name.includes('厨房') || m.name.includes('KDS')).map(m => m.id) },
    { name: t('roles.tplKeeper', '库管员'), desc: t('roles.tplKeeperDesc', '货物+库存+统计'), icon: '📦', match: () => menus.filter(m => ['/admin/inventory','/admin/stats/product'].includes(m.path)).map(m => m.id) },
    { name: t('roles.tplContent', '内容运营'), desc: t('roles.tplContentDesc', '内容+平台+表单'), icon: '📝', match: () => menus.filter(m => ['/admin/content','/admin/platforms','/admin/forms'].includes(m.path)).map(m => m.id) },
    { name: t('roles.tplReadonly', '只读权限'), desc: t('roles.tplReadonlyDesc', '查看全部菜单'), icon: '👁️', match: () => allMenuIds },
  ], [menus, allMenuIds, t])

  // 应用角色模板：自动勾选对应菜单
  const applyTemplate = (template) => {
    const ids = template.match()
    setSelectedMenus(ids)
    toast(`${t('roles.tplApplied', '已应用「')}${template.name}${t('roles.tplAppliedEnd', '」模板，选中')} ${ids.length} ${t('roles.menusUnit', '个菜单')}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t('admin.roles', '角色管理')}</h2>
          <p className="text-sm text-gray-400 mt-1">{t('roles.desc', '创建角色并配置菜单权限，给用户分配角色后自动继承该角色的所有权限。系统内置角色不可删除。')}</p>
        </div>
        <Button onClick={openAdd}>+ {t('roles.newRole', '新建角色')}</Button>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400">{t('common.loading', '加载中...')}</div>
        ) : roles.length === 0 ? (
          <Empty text={t('roles.empty', '暂无角色')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('roles.nameCol', '角色名称')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('roles.descCol', '描述')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('roles.typeCol', '类型')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('roles.menusCol', '已配置菜单')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('roles.usersCol', '用户数')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('roles.sortCol', '排序')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('common.action', '操作')}</th>
                </tr>
              </thead>
              <tbody>
                {roles.map(r => {
                  const roleMenus = r.permissions?.menus || []
                  const menuCount = roleMenus.length
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
                        <Badge variant={r.is_system ? 'default' : 'primary'}>{r.is_system ? t('roles.systemBuiltin', '系统内置') : t('roles.custom', '自定义')}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {r.is_system ? (
                          <span className="text-xs text-green-600 font-medium">✓ {t('roles.allPermsFixed', '全部权限（系统固定）')}</span>
                        ) : menuCount === 0 ? (
                          <span className="text-xs text-red-400">{t('roles.noPerms', '无权限（请配置）')}</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-primary-600">{menuCount} {t('roles.countUnit', '个')}</span>
                            <div className="flex flex-wrap gap-1 max-w-[150px]">
                              {roleMenus.slice(0, 2).map(id => (
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
                          <button onClick={() => openPerm(r)} className="text-primary-500 hover:text-primary-700 text-xs font-medium">{t('roles.configPerm', '配置权限')}</button>
                          <button onClick={() => openEdit(r)} className="text-gray-500 hover:text-gray-700 text-xs">{t('common.edit', '编辑')}</button>
                          {!r.is_system && <button onClick={() => remove(r)} className="text-red-400 hover:text-red-600 text-xs">{t('common.delete', '删除')}</button>}
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

      <Dialog open={editDialog} onClose={() => setEditDialog(false)} title={editing ? t('roles.editRole', '编辑角色') : t('roles.newRole', '新建角色')} width="max-w-md">
        <div className="space-y-4">
          <Input label={t('roles.nameLabel', '角色名称 *')} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t('roles.namePlaceholder', '如：厨房师傅、收银员')} disabled={editing?.is_system} />
          <Input label={t('roles.descLabel', '描述')} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={t('roles.descPlaceholder', '角色职责说明')} />
          <Input label={t('roles.sortLabel', '排序')} type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
          {editing?.is_system && (
            <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-600">
              {t('roles.systemHint', '系统内置角色仅可修改描述和排序，名称和权限不可修改。')}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setEditDialog(false)}>{t('common.cancel', '取消')}</Button>
            <Button className="flex-1" onClick={save}>{t('common.save', '保存')}</Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={permDialog} onClose={() => setPermDialog(false)} title={`${t('roles.configPerm', '配置权限')} - ${permRole?.name || ''}`} width="max-w-xl">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-800">{permRole?.name}</p>
              <p className="text-xs text-gray-400">{permRole?.description || t('roles.noDesc', '暂无描述')}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">{t('roles.selectedMenus', '已选菜单')}</p>
              <p className="text-lg font-bold text-primary-600">{selectedMenus.length}<span className="text-sm text-gray-400 font-normal">/{allMenuIds.length}</span></p>
            </div>
          </div>

          {permRole?.is_system ? (
            <div className="p-4 bg-amber-50 rounded-lg text-center">
              <p className="text-amber-600 text-sm">{t('roles.systemFixedPerm', '系统内置角色（超级管理员/管理员/员工/普通用户）的权限由系统固定，不可在此修改。')}</p>
              <p className="text-amber-500 text-xs mt-1">{t('roles.systemFixedPermHint', '如需自定义权限，请新建一个自定义角色。')}</p>
            </div>
          ) : (
            <>
              <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                <p className="text-xs font-medium text-gray-600 mb-2">⚡ {t('roles.quickTemplates', '快速模板（点击应用，可在此基础上微调）')}</p>
                <div className="flex flex-wrap gap-2">
                  {roleTemplates.map(tpl => (
                    <button key={tpl.name} onClick={() => applyTemplate(tpl)} className="px-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-all flex items-center gap-1.5 shadow-sm">
                      <span>{tpl.icon}</span>
                      <span className="font-medium">{tpl.name}</span>
                      <span className="text-gray-400">（{tpl.desc}）</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">{t('roles.checkMenusHint', '勾选该角色可见的后台菜单，未勾选的菜单将不在侧边栏显示。')}</p>
                <div className="flex gap-2">
                  <button onClick={selectAll} className="text-xs text-primary-500 hover:text-primary-700">{t('roles.selectAll', '全选')}</button>
                  <span className="text-gray-300">|</span>
                  <button onClick={selectNone} className="text-xs text-gray-500 hover:text-gray-700">{t('roles.selectNone', '全不选')}</button>
                  <span className="text-gray-300">|</span>
                  <button onClick={invertSelection} className="text-xs text-gray-500 hover:text-gray-700">{t('roles.invert', '反选')}</button>
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
                        <span className={`font-medium flex-1 ${parentSelected ? 'text-primary-700' : 'text-gray-700'}`}>{language === 'en' ? (parent.name_en || parent.name) : parent.name}</span>
                        {children.length > 0 && <span className="text-xs text-gray-400">{childIds.filter(id => selectedMenus.includes(id)).length}/{children.length} {t('roles.submenu', '子菜单')}</span>}
                      </label>
                      {children.length > 0 && (
                        <div className="border-t border-gray-100 bg-gray-50/50">
                          {children.map(child => {
                            const checked = selectedMenus.includes(child.id)
                            return (
                              <label key={child.id} className={`flex items-center gap-3 px-4 py-2.5 pl-12 cursor-pointer hover:bg-white transition-colors ${checked ? 'bg-primary-50/50' : ''}`}>
                                <input type="checkbox" checked={checked} onChange={() => toggleMenu(child.id)} className="w-3.5 h-3.5" />
                                <span className="text-sm">{child.icon}</span>
                                <span className={`text-sm flex-1 ${checked ? 'text-primary-700 font-medium' : 'text-gray-600'}`}>{language === 'en' ? (child.name_en || child.name) : child.name}</span>
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
              {t('roles.selectedMenusCount', '已选择')} <span className="font-bold text-primary-600">{selectedMenus.length}</span> {t('roles.menusUnit', '个菜单')}
              {selectedMenus.length === 0 && !permRole?.is_system && <span className="text-red-400 ml-2">{t('roles.noPermsHint', '（不选则无任何权限）')}</span>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPermDialog(false)}>{t('common.cancel', '取消')}</Button>
              {!permRole?.is_system && <Button onClick={savePerm}>{t('roles.savePerm', '保存权限')}</Button>}
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
