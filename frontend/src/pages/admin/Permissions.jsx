import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Table, Badge, Dialog, Checkbox, toast } from '../../components/ui'

export default function Permissions() {
  const [users, setUsers] = useState([])
  const [menus, setMenus] = useState([])
  const [dialog, setDialog] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [selectedMenus, setSelectedMenus] = useState([])

  useEffect(() => { load() }, [])

  const load = () => {
    api.getUsers().then(data => setUsers(Array.isArray(data) ? data : [])).catch(() => {})
    api.getAllMenus().then(data => setMenus(Array.isArray(data) ? data : [])).catch(() => {})
  }

  const openPermission = (user) => {
    setEditingUser(user)
    try {
      const perms = JSON.parse(user.permissions || '{}')
      setSelectedMenus(perms.menus || [])
    } catch {
      setSelectedMenus([])
    }
    setDialog(true)
  }

  const save = async () => {
    if (!editingUser) return
    try {
      await api.updateUser(editingUser.id, { permissions: JSON.stringify({ menus: selectedMenus }) })
      toast('权限保存成功')
      setDialog(false)
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const toggleMenu = (menuId) => {
    setSelectedMenus(prev => prev.includes(menuId) ? prev.filter(id => id !== menuId) : [...prev, menuId])
  }

  const topMenus = menus.filter(m => m.parent_id === 0)
  const getSubMenus = (parentId) => menus.filter(m => m.parent_id === parentId)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">权限管理</h2>
        <p className="text-sm text-gray-400 mt-1">为用户分配可见的后台菜单</p>
      </div>

      <Card>
        <Table columns={[
          { header: '用户', render: u => <div><p className="font-medium text-gray-800">{u.username}</p><p className="text-xs text-gray-400">{u.name || '-'}</p></div> },
          { header: '角色', render: u => <Badge variant={u.role === 'admin' ? 'primary' : 'default'}>{u.role === 'admin' ? '管理员' : '普通用户'}</Badge> },
          { header: '权限', render: u => {
            if (u.role === 'admin') return <span className="text-xs text-gray-400">全部权限</span>
            try { const p = JSON.parse(u.permissions || '{}'); return <Badge variant="primary">{p.menus?.length || 0} 个菜单</Badge> } catch { return <Badge>未配置</Badge> }
          }}
        ]} data={users} actions={u => (
          u.role !== 'admin' && <button onClick={() => openPermission(u)} className="text-primary-500 hover:text-primary-700 text-sm">分配权限</button>
        )} />
      </Card>

      <Dialog open={dialog} onClose={() => setDialog(false)} title={`分配权限 - ${editingUser?.username || ''}`} width="max-w-lg"
        footer={<><Button variant="outline" onClick={() => setDialog(false)}>取消</Button><Button onClick={save}>保存</Button></>}>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">勾选该用户可见的菜单，不勾选则默认全部可见</p>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {topMenus.map(menu => (
              <div key={menu.id} className="border border-gray-200 rounded-lg p-3">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input type="checkbox" checked={selectedMenus.includes(menu.id)} onChange={() => toggleMenu(menu.id)} className="w-4 h-4" />
                  <span className="font-medium text-gray-800">{menu.icon} {menu.name}</span>
                </label>
                {getSubMenus(menu.id).length > 0 && (
                  <div className="ml-6 space-y-1">
                    {getSubMenus(menu.id).map(sub => (
                      <label key={sub.id} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="checkbox" checked={selectedMenus.includes(sub.id)} onChange={() => toggleMenu(sub.id)} className="w-4 h-4" />
                        <span className="text-gray-600">{sub.icon} {sub.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Dialog>
    </div>
  )
}
