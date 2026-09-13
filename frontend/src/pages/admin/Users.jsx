import { useState, useEffect, useMemo } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Badge, Dialog, Input, Select, Switch, Empty, toast } from '../../components/ui'
import { useConfirm } from '../../components/ConfirmDialog'
import { formatDateTime, formatTime, formatDate, formatClockTime, formatRelative, formatDateTimeCN } from '../../utils/format'
import { useLanguage } from '../../context/LanguageContext'

const emptyForm = { username: '', password: '', role: 'user', role_id: null, name: '', phone: '', email: '', enabled: true }

const SYSTEM_ROLE_COLOR_MAP = {
  admin: 'primary',
  manager: 'success',
  employee: 'warning',
  user: 'default'
}

export default function Users() {
  const { t } = useLanguage()
  const confirm = useConfirm()
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(false)
  const [dialog, setDialog] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [keyword, setKeyword] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedIds, setSelectedIds] = useState([])
  const [resetPwdUser, setResetPwdUser] = useState(null)
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => { load() }, [])

  const load = () => {
    setLoading(true)
    api.getUsers().then(data => setUsers(Array.isArray(data) ? data : [])).catch(() => {})
    api.getRoles().then(data => setRoles(Array.isArray(data) ? data : [])).catch(() => {}).finally(() => setLoading(false))
  }

  const getSystemRoleLabel = (role) => {
    const map = {
      admin: t('users.superAdmin', '超级管理员'),
      manager: t('users.manager', '管理员'),
      employee: t('users.employee', '员工'),
      user: t('users.regularUser', '普通用户')
    }
    return map[role] || role
  }

  const getUserRoleLabel = (u) => {
    if (u.role_id) {
      const role = roles.find(r => r.id === u.role_id)
      if (role) return role.name
    }
    return getSystemRoleLabel(u.role)
  }
  const getUserRoleColor = (u) => {
    if (u.role_id) {
      const role = roles.find(r => r.id === u.role_id)
      if (role && !role.is_system) return 'primary'
    }
    return SYSTEM_ROLE_COLOR_MAP[u.role] || 'default'
  }

  const roleSelectOptions = [
    { value: '', label: t('users.selectRolePlaceholder', '请选择角色') },
    { value: 'system:admin', label: t('users.systemAdmin', '超级管理员（系统）') },
    { value: 'system:manager', label: t('users.systemManager', '管理员（系统）') },
    { value: 'system:employee', label: t('users.systemEmployee', '员工（系统）') },
    { value: 'system:user', label: t('users.systemUser', '普通用户（系统）') },
    ...roles.filter(r => !r.is_system).map(r => ({ value: `custom:${r.id}`, label: `${r.name}${t('users.customSuffix', '（自定义）')}` }))
  ]

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (keyword) {
        const kw = keyword.toLowerCase()
        const match = (u.username || '').toLowerCase().includes(kw) ||
          (u.name || '').toLowerCase().includes(kw) ||
          (u.phone || '').includes(kw) ||
          (u.email || '').toLowerCase().includes(kw)
        if (!match) return false
      }
      if (roleFilter) {
        if (roleFilter.startsWith('custom:')) {
          if (u.role_id !== parseInt(roleFilter.split(':')[1])) return false
        } else if (roleFilter.startsWith('system:')) {
          if (u.role !== roleFilter.split(':')[1]) return false
        }
      }
      if (statusFilter === 'enabled' && !u.enabled) return false
      if (statusFilter === 'disabled' && u.enabled) return false
      return true
    })
  }, [users, keyword, roleFilter, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pagedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const stats = useMemo(() => ({
    total: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    manager: users.filter(u => u.role === 'manager').length,
    employee: users.filter(u => u.role === 'employee').length,
    user: users.filter(u => u.role === 'user').length,
    enabled: users.filter(u => u.enabled).length,
    disabled: users.filter(u => !u.enabled).length
  }), [users])

  const openAdd = () => { setEditing(null); setForm({ ...emptyForm, roleSelect: '' }); setDialog(true) }
  const openEdit = (u) => {
    const roleSelect = u.role_id ? `custom:${u.role_id}` : `system:${u.role}`
    setEditing(u); setForm({ ...u, password: '', enabled: !!u.enabled, roleSelect }); setDialog(true)
  }

  const save = async () => {
    if (!form.username) { toast(t('users.accountRequired', '账号必填'), 'error'); return }
    if (!editing && !form.password) { toast(t('users.passwordRequired', '密码必填'), 'error'); return }
    if (!form.roleSelect) { toast(t('users.pleaseSelectRole', '请选择角色'), 'error'); return }
    try {
      const data = { ...form }
      if (form.roleSelect.startsWith('custom:')) {
        data.role_id = parseInt(form.roleSelect.split(':')[1])
        data.role = 'manager'
      } else {
        data.role = form.roleSelect.split(':')[1]
        data.role_id = null
      }
      delete data.roleSelect
      if (!data.password) delete data.password
      if (editing) {
        await api.updateUser(editing.id, data)
        toast(t('users.updatedSuccess', '更新成功'))
      } else {
        await api.createUser(data)
        toast(t('users.addedSuccess', '添加成功'))
      }
      setDialog(false)
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const remove = async (id) => {
    if (!await confirm({ title: t('users.confirmDeleteTitle', '删除用户'), message: t('users.confirmDeleteMsg', '确定删除该用户？此操作不可恢复。'), variant: 'danger' })) return
    try { await api.deleteUser(id); toast(t('users.deletedToast', '已删除')); load() } catch (e) { toast(e.message, 'error') }
  }

  const toggleEnabled = async (u) => {
    try {
      await api.updateUser(u.id, { enabled: !u.enabled })
      toast(u.enabled ? t('users.disabledToast', '已禁用') : t('users.enabledToast', '已启用'))
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const openResetPassword = (u) => {
    setResetPwdUser(u)
    setNewPassword('')
  }

  const confirmResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) { toast(t('users.passwordMin6', '密码至少6位'), 'error'); return }
    try {
      await api.updateUser(resetPwdUser.id, { password: newPassword })
      toast(t('users.passwordResetSuccess', '密码重置成功'))
      setResetPwdUser(null)
      setNewPassword('')
    } catch (e) { toast(e.message, 'error') }
  }

  const allSelected = pagedUsers.length > 0 && pagedUsers.every(u => selectedIds.includes(u.id))
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !pagedUsers.find(u => u.id === id)))
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...pagedUsers.map(u => u.id)])])
    }
  }
  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const batchDisable = async () => {
    if (selectedIds.length === 0) { toast(t('users.pleaseSelectFirst', '请先选择用户'), 'error'); return }
    if (!await confirm({ title: t('users.batchDisableTitle', '批量禁用'), message: `${t('users.confirmBatchDisableStart', '确定禁用选中的')} ${selectedIds.length} ${t('users.confirmBatchDisableEnd', '个用户？')}`, variant: 'warning' })) return
    try {
      for (const id of selectedIds) {
        const u = users.find(x => x.id === id)
        if (u && u.username !== 'admin') await api.updateUser(id, { enabled: false })
      }
      toast(t('users.batchDisableSuccess', '批量禁用成功'))
      setSelectedIds([])
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const batchDelete = async () => {
    if (selectedIds.length === 0) { toast(t('users.pleaseSelectFirst', '请先选择用户'), 'error'); return }
    if (!await confirm({ title: t('users.batchDeleteTitle', '批量删除'), message: `${t('users.confirmBatchDeleteStart', '确定删除选中的')} ${selectedIds.length} ${t('users.confirmBatchDeleteEnd', '个用户？此操作不可恢复！')}`, variant: 'danger' })) return
    try {
      for (const id of selectedIds) {
        const u = users.find(x => x.id === id)
        if (u && u.username !== 'admin') await api.deleteUser(id)
      }
      toast(t('users.batchDeleteSuccess', '批量删除成功'))
      setSelectedIds([])
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 mb-1">{t('users.totalUsers', '总用户')}</p>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100">
          <p className="text-xs text-gray-400 mb-1">{t('users.superAdmin', '超级管理员')}</p>
          <p className="text-2xl font-bold text-blue-600">{stats.admin}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-green-100">
          <p className="text-xs text-gray-400 mb-1">{t('users.manager', '管理员')}</p>
          <p className="text-2xl font-bold text-green-600">{stats.manager}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-100">
          <p className="text-xs text-gray-400 mb-1">{t('users.employee', '员工')}</p>
          <p className="text-2xl font-bold text-amber-600">{stats.employee}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 mb-1">{t('users.regularUser', '普通用户')}</p>
          <p className="text-2xl font-bold text-gray-600">{stats.user}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-red-100">
          <p className="text-xs text-gray-400 mb-1">{t('users.disabled', '已禁用')}</p>
          <p className="text-2xl font-bold text-red-500">{stats.disabled}</p>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t('admin.users', '用户管理')}</h2>
          <p className="text-sm text-gray-400 mt-1">{t('users.desc', 'admin 超级管理员 / manager 管理员(可分配权限) / employee 员工 / user 普通用户')}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openAdd}>+ {t('common.add', '添加')}{t('users.userSuffix', '用户')}</Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder={t('users.searchPlaceholder', '搜索账号 / 姓名 / 电话 / 邮箱...')}
              value={keyword}
              onChange={e => { setKeyword(e.target.value); setPage(1) }}
            />
          </div>
          <Select
            value={roleFilter}
            onChange={e => { setRoleFilter(e.target.value); setPage(1) }}
            options={roleSelectOptions}
            className="w-44"
          />
          <Select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            options={[{ value: '', label: t('users.allStatus', '全部状态') }, { value: 'enabled', label: t('users.normal', '正常') }, { value: 'disabled', label: t('users.disabledStatus', '禁用') }]}
            className="w-32"
          />
          <Select
            value={pageSize}
            onChange={e => { setPageSize(parseInt(e.target.value)); setPage(1) }}
            options={[{ value: 10, label: `10 ${t('users.perPage', '条/页')}` }, { value: 20, label: `20 ${t('users.perPage', '条/页')}` }, { value: 50, label: `50 ${t('users.perPage', '条/页')}` }]}
            className="w-28"
          />
        </div>
        {selectedIds.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3 bg-primary-50 -mx-4 -mb-4 px-4 py-2.5 rounded-b-xl">
            <span className="text-sm text-primary-700 font-medium">{t('users.selectedItems', '已选')} {selectedIds.length} {t('users.itemsUnit', '项')}</span>
            <div className="flex gap-2 ml-auto">
              <Button size="sm" variant="outline" onClick={batchDisable}>{t('users.batchDisable', '批量禁用')}</Button>
              <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={batchDelete}>{t('users.batchDelete', '批量删除')}</Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedIds([])}>{t('users.cancelSelect', '取消选择')}</Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400">{t('common.loading', '加载中...')}</div>
        ) : filteredUsers.length === 0 ? (
          <Empty text={keyword || roleFilter || statusFilter ? t('users.noMatch', '没有匹配的用户') : t('users.empty', '暂无用户')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left w-10">
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="w-4 h-4" />
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('users.account', '账号')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('users.role', '角色')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('users.phone', '电话')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('users.email', '邮箱')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('users.createdAt', '创建时间')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('common.status', '状态')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('common.action', '操作')}</th>
                </tr>
              </thead>
              <tbody>
                {pagedUsers.map(u => (
                  <tr key={u.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${selectedIds.includes(u.id) ? 'bg-primary-50/50' : ''}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selectedIds.includes(u.id)} onChange={() => toggleSelect(u.id)} className="w-4 h-4" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-medium text-sm flex-shrink-0 ${
                          u.role === 'admin' ? 'bg-blue-100 text-blue-600' :
                          u.role === 'manager' ? 'bg-green-100 text-green-600' :
                          u.role === 'employee' ? 'bg-amber-100 text-amber-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {(u.name || u.username).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate">{u.username}</p>
                          <p className="text-xs text-gray-400 truncate">{u.name || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={getUserRoleColor(u)}>{getUserRoleLabel(u)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.phone || '-'}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">{u.email || '-'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={u.enabled ? 'success' : 'danger'}>{u.enabled ? t('users.normal', '正常') : t('users.disabledStatus', '禁用')}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => openEdit(u)} className="text-primary-500 hover:text-primary-700 text-xs">{t('common.edit', '编辑')}</button>
                        <button onClick={() => openResetPassword(u)} className="text-gray-500 hover:text-gray-700 text-xs">{t('users.resetPassword', '重置密码')}</button>
                        <button onClick={() => toggleEnabled(u)} className="text-gray-500 hover:text-gray-700 text-xs">{u.enabled ? t('users.disabledStatus', '禁用') : t('users.enable', '启用')}</button>
                        {u.username !== 'admin' && <button onClick={() => remove(u.id)} className="text-red-400 hover:text-red-600 text-xs">{t('common.delete', '删除')}</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredUsers.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <span className="text-sm text-gray-500">
              {t('users.paginationTotal', '共')} {filteredUsers.length} {t('users.paginationItems', '条，第')} {currentPage}/{totalPages} {t('users.paginationPage', '页')}
            </span>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>{t('users.prevPage', '上一页')}</Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p = i + 1
                if (totalPages > 5) {
                  if (currentPage > 3) p = currentPage - 2 + i
                  if (currentPage > totalPages - 2) p = totalPages - 4 + i
                }
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                      currentPage === p ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {p}
                  </button>
                )
              })}
              <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>{t('users.nextPage', '下一页')}</Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={dialog} onClose={() => setDialog(false)} title={editing ? t('users.editUser', '编辑用户') : t('users.addUserTitle', '添加用户')} width="max-w-lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('users.accountLabel', '账号 *')} value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} disabled={!!editing} placeholder={t('users.loginAccount', '登录账号')} />
            <Input label={editing ? t('users.newPasswordBlank', '新密码（留空不修改）') : t('users.passwordLabel', '密码 *')} type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={t('users.min6Chars', '至少6位')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('users.nameLabel', '姓名')} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t('users.displayName', '显示名称')} />
            <Select label={t('users.roleLabel', '角色 *')} value={form.roleSelect || ''} onChange={e => setForm({ ...form, roleSelect: e.target.value })} options={roleSelectOptions} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('users.phone', '电话')} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder={t('users.mobile', '手机号码')} />
            <Input label={t('users.email', '邮箱')} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder={t('users.emailAddr', '邮箱地址')} />
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-700">{t('users.accountStatus', '账号状态')}</p>
              <p className="text-xs text-gray-400">{t('users.accountStatusDesc', '禁用后该用户无法登录')}</p>
            </div>
            <Switch checked={form.enabled} onChange={v => setForm({ ...form, enabled: v })} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDialog(false)}>{t('common.cancel', '取消')}</Button>
            <Button className="flex-1" onClick={save}>{t('common.save', '保存')}</Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={!!resetPwdUser} onClose={() => setResetPwdUser(null)} title={`${t('users.resetPasswordTitle', '重置密码')} - ${resetPwdUser?.username || ''}`} width="max-w-sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{t('users.resetPasswordDesc1', '为用户')} <span className="font-medium text-gray-700">{resetPwdUser?.name || resetPwdUser?.username}</span> {t('users.resetPasswordDesc2', '设置新密码，用户下次登录需使用新密码。')}</p>
          <Input label={t('users.newPasswordLabel', '新密码 *')} type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={t('users.min6Chars', '至少6位')} />
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setResetPwdUser(null)}>{t('common.cancel', '取消')}</Button>
            <Button className="flex-1" onClick={confirmResetPassword}>{t('users.confirmReset', '确认重置')}</Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}