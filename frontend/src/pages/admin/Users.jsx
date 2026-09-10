import { useState, useEffect, useMemo } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Badge, Dialog, Input, Select, Switch, Empty, toast } from '../../components/ui'

const emptyForm = { username: '', password: '', role: 'user', name: '', phone: '', email: '', enabled: true }

const ROLE_OPTIONS = [
  { value: 'user', label: '普通用户', color: 'default' },
  { value: 'employee', label: '员工', color: 'warning' },
  { value: 'manager', label: '管理员', color: 'success' },
  { value: 'admin', label: '超级管理员', color: 'primary' }
]

const getRoleLabel = (role) => ROLE_OPTIONS.find(r => r.value === role)?.label || role
const getRoleColor = (role) => ROLE_OPTIONS.find(r => r.value === role)?.color || 'default'

export default function Users() {
  const [users, setUsers] = useState([])
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
    api.getUsers().then(data => setUsers(Array.isArray(data) ? data : [])).catch(() => {}).finally(() => setLoading(false))
  }

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
      if (roleFilter && u.role !== roleFilter) return false
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

  const openAdd = () => { setEditing(null); setForm(emptyForm); setDialog(true) }
  const openEdit = (u) => { setEditing(u); setForm({ ...u, password: '', enabled: !!u.enabled }); setDialog(true) }

  const save = async () => {
    if (!form.username) { toast('账号必填', 'error'); return }
    if (!editing && !form.password) { toast('密码必填', 'error'); return }
    try {
      const data = { ...form }
      if (!data.password) delete data.password
      if (editing) {
        await api.updateUser(editing.id, data)
        toast('更新成功')
      } else {
        await api.createUser(data)
        toast('添加成功')
      }
      setDialog(false)
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const remove = async (id) => {
    if (!confirm('确定删除该用户？此操作不可恢复。')) return
    try { await api.deleteUser(id); toast('已删除'); load() } catch (e) { toast(e.message, 'error') }
  }

  const toggleEnabled = async (u) => {
    try {
      await api.updateUser(u.id, { enabled: !u.enabled })
      toast(u.enabled ? '已禁用' : '已启用')
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const openResetPassword = (u) => {
    setResetPwdUser(u)
    setNewPassword('')
  }

  const confirmResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) { toast('密码至少6位', 'error'); return }
    try {
      await api.updateUser(resetPwdUser.id, { password: newPassword })
      toast('密码重置成功')
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
    if (selectedIds.length === 0) { toast('请先选择用户', 'error'); return }
    if (!confirm(`确定禁用选中的 ${selectedIds.length} 个用户？`)) return
    try {
      for (const id of selectedIds) {
        const u = users.find(x => x.id === id)
        if (u && u.username !== 'admin') await api.updateUser(id, { enabled: false })
      }
      toast('批量禁用成功')
      setSelectedIds([])
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const batchDelete = async () => {
    if (selectedIds.length === 0) { toast('请先选择用户', 'error'); return }
    if (!confirm(`确定删除选中的 ${selectedIds.length} 个用户？此操作不可恢复！`)) return
    try {
      for (const id of selectedIds) {
        const u = users.find(x => x.id === id)
        if (u && u.username !== 'admin') await api.deleteUser(id)
      }
      toast('批量删除成功')
      setSelectedIds([])
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const formatDate = (str) => {
    if (!str) return '-'
    return String(str).slice(0, 10)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 mb-1">总用户</p>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100">
          <p className="text-xs text-gray-400 mb-1">超级管理员</p>
          <p className="text-2xl font-bold text-blue-600">{stats.admin}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-green-100">
          <p className="text-xs text-gray-400 mb-1">管理员</p>
          <p className="text-2xl font-bold text-green-600">{stats.manager}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-100">
          <p className="text-xs text-gray-400 mb-1">员工</p>
          <p className="text-2xl font-bold text-amber-600">{stats.employee}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 mb-1">普通用户</p>
          <p className="text-2xl font-bold text-gray-600">{stats.user}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-red-100">
          <p className="text-xs text-gray-400 mb-1">已禁用</p>
          <p className="text-2xl font-bold text-red-500">{stats.disabled}</p>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">用户管理</h2>
          <p className="text-sm text-gray-400 mt-1">admin 超级管理员 / manager 管理员(可分配权限) / employee 员工 / user 普通用户</p>
        </div>
        <Button onClick={openAdd}>+ 添加用户</Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <Input placeholder="搜索账号 / 姓名 / 电话 / 邮箱..." value={keyword} onChange={e => { setKeyword(e.target.value); setPage(1) }} />
          </div>
          <Select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1) }} options={[{ value: '', label: '全部角色' }, ...ROLE_OPTIONS]} className="w-36" />
          <Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} options={[{ value: '', label: '全部状态' }, { value: 'enabled', label: '正常' }, { value: 'disabled', label: '禁用' }]} className="w-32" />
          <Select value={pageSize} onChange={e => { setPageSize(parseInt(e.target.value)); setPage(1) }} options={[{ value: 10, label: '10条/页' }, { value: 20, label: '20条/页' }, { value: 50, label: '50条/页' }]} className="w-28" />
        </div>
        {selectedIds.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3 bg-primary-50 -mx-4 -mb-4 px-4 py-2.5 rounded-b-xl">
            <span className="text-sm text-primary-700 font-medium">已选 {selectedIds.length} 项</span>
            <div className="flex gap-2 ml-auto">
              <Button size="sm" variant="outline" onClick={batchDisable}>批量禁用</Button>
              <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={batchDelete}>批量删除</Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedIds([])}>取消选择</Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400">加载中...</div>
        ) : filteredUsers.length === 0 ? (
          <Empty text={keyword || roleFilter || statusFilter ? '没有匹配的用户' : '暂无用户'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left w-10"><input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="w-4 h-4" /></th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">账号</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">角色</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">电话</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">邮箱</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">创建时间</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">状态</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {pagedUsers.map(u => (
                  <tr key={u.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${selectedIds.includes(u.id) ? 'bg-primary-50/50' : ''}`}>
                    <td className="px-4 py-3"><input type="checkbox" checked={selectedIds.includes(u.id)} onChange={() => toggleSelect(u.id)} className="w-4 h-4" /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-medium text-sm flex-shrink-0 ${u.role === 'admin' ? 'bg-blue-100 text-blue-600' : u.role === 'manager' ? 'bg-green-100 text-green-600' : u.role === 'employee' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-600'}`}>
                          {(u.name || u.username).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate">{u.username}</p>
                          <p className="text-xs text-gray-400 truncate">{u.name || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge variant={getRoleColor(u.role)}>{getRoleLabel(u.role)}</Badge></td>
                    <td className="px-4 py-3 text-gray-600">{u.phone || '-'}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">{u.email || '-'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3"><Badge variant={u.enabled ? 'success' : 'danger'}>{u.enabled ? '正常' : '禁用'}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => openEdit(u)} className="text-primary-500 hover:text-primary-700 text-xs">编辑</button>
                        <button onClick={() => openResetPassword(u)} className="text-gray-500 hover:text-gray-700 text-xs">重置密码</button>
                        <button onClick={() => toggleEnabled(u)} className="text-gray-500 hover:text-gray-700 text-xs">{u.enabled ? '禁用' : '启用'}</button>
                        {u.username !== 'admin' && <button onClick={() => remove(u.id)} className="text-red-400 hover:text-red-600 text-xs">删除</button>}
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
            <span className="text-sm text-gray-500">共 {filteredUsers.length} 条，第 {currentPage}/{totalPages} 页</span>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>上一页</Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p = i + 1
                if (totalPages > 5) {
                  if (currentPage > 3) p = currentPage - 2 + i
                  if (currentPage > totalPages - 2) p = totalPages - 4 + i
                }
                return (
                  <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded text-sm font-medium transition-colors ${currentPage === p ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}>{p}</button>
                )
              })}
              <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>下一页</Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={dialog} onClose={() => setDialog(false)} title={editing ? '编辑用户' : '添加用户'} width="max-w-lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="账号 *" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} disabled={!!editing} placeholder="登录账号" />
            <Input label={editing ? '新密码（留空不修改）' : '密码 *'} type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="至少6位" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="姓名" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="显示名称" />
            <Select label="角色" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} options={ROLE_OPTIONS} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="电话" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="手机号码" />
            <Input label="邮箱" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="邮箱地址" />
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-700">账号状态</p>
              <p className="text-xs text-gray-400">禁用后该用户无法登录</p>
            </div>
            <Switch checked={form.enabled} onChange={v => setForm({ ...form, enabled: v })} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDialog(false)}>取消</Button>
            <Button className="flex-1" onClick={save}>保存</Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={!!resetPwdUser} onClose={() => setResetPwdUser(null)} title={`重置密码 - ${resetPwdUser?.username || ''}`} width="max-w-sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">为用户 <span className="font-medium text-gray-700">{resetPwdUser?.name || resetPwdUser?.username}</span> 设置新密码，用户下次登录需使用新密码。</p>
          <Input label="新密码 *" type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="至少6位" />
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setResetPwdUser(null)}>取消</Button>
            <Button className="flex-1" onClick={confirmResetPassword}>确认重置</Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
