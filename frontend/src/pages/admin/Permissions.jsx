import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Table, Badge, Dialog, Empty, toast } from '../../components/ui'

export default function Permissions() {
  const [users, setUsers] = useState([])
  const [menus, setMenus] = useState([])
  const [dialog, setDialog] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [selectedMenus, setSelectedMenus] = useState([])

  useEffect(() => { load() }, [])

  const load = () => {
    api.getUsers().then(setUsers).catch(() => {})
    api.getAllMenus().then(setMenus).catch(() => {})
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

  const toggleMenu = (menuId) => {
    setSelectedMenus(prev =>
      prev.includes(menuId) ? prev.filter(id => id !== menuId) : [...prev, menuId]
    )
  }

  const savePermission = async () => {
    if (!editingUser) return
    try {
      const permissions = { menus: selectedMenus }
      await api.updateUser(editingUser.id, { permissions: JSON.stringify(permissions) })
      toast('权限保存成功')
      setDialog(false)
      load()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const getMenuName = (menuId) => {
    const m = menus.find(m => m.id === menuId)
    return m ? m.name : `菜单${menuId}`
  }

  const columns = [
    {
      header: '用户',
      render: u => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-medium text-sm">
            {(u.name || u.username).charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-gray-800">{u.username}</p>
            <p className="text-xs text-gray-400">{u.name || '-'}</p>
          </div>
        </div>
      )
    },
    { header: '角色', render: u => <Badge variant={u.role === 'admin' ? 'primary' : 'default'}>{u.role === 'admin' ? '超级管理员' : '普通用户'}</Badge> },
    {
      header: '可见菜单',
      render: u => {
        if (u.role === 'admin') return <span className="text-xs text-gray-400">全部菜单（管理员）</span>
        try {
          const perms = JSON.parse(u.permissions || '{}')
          const menuIds = perms.menus || []
          if (menuIds.length === 0) return <Badge variant="warning">未配置（默认全部）</Badge>
          return (
            <div className="flex flex-wrap gap-1">
              {menuIds.slice(0, 3).map(id => (
                <Badge key={id} variant="primary">{getMenuName(id)}</Badge>
              ))}
              {menuIds.length > 3 && <Badge variant="default">+{menuIds.length - 3}</Badge>}
            </div>
          )
        } catch {
          return <span className="text-xs text-gray-400">-</span>
        }
      }
    },
    { header: '状态', render: u => <Badge variant={u.enabled ? 'success' : 'danger'}>{u.enabled ? '正常' : '禁用'}</Badge> }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">权限管理</h2>
        <p className="text-sm text-gray-400 mt-1">给指定用户分配可见的菜单和内容，admin 超级管理员默认拥有全部权限</p>
      </div>

      <Card>
        {users.length === 0 ? (
          <Empty text="暂无用户" />
        ) : (
          <Table
            columns={columns}
            data={users}
            actions={u => (
              <div className="flex gap-2">
                {u.role !== 'admin' && (
                  <button onClick={() => openPermission(u)} className="text-primary-500 hover:text-primary-700 text-sm">
                    分配权限
                  </button>
                )}
                {u.role === 'admin' && <span className="text-xs text-gray-300">管理员无需配置</span>}
              </div>
            )}
          />
        )}
      </Card>

      {/* 权限分配对话框 */}
      <Dialog
        open={dialog}
        onClose={() => setDialog(false)}
        title={`分配权限 - ${editingUser ? editingUser.username : ''}`}
        width="max-w-lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setDialog(false)}>取消</Button>
            <Button onClick={savePermission}>保存权限</Button>
          </>
        }
      >
        <p className="text-sm text-gray-500 mb-4">
          勾选该用户可见的后台菜单，未勾选的菜单将不在侧边栏显示。不勾选任何菜单则默认可见全部。
        </p>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {menus.filter(m => m.parent_id === 0).map(parent => {
            const children = menus.filter(m => m.parent_id === parent.id)
            const allChildrenSelected = children.length > 0 && children.every(c => selectedMenus.includes(c.id))
            const parentSelected = selectedMenus.includes(parent.id) || allChildrenSelected
            return (
              <div key={parent.id} className="border border-gray-200 rounded-lg p-3">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={parentSelected}
                    onChange={() => {
                      if (parentSelected) {
                        setSelectedMenus(prev => prev.filter(id => id !== parent.id && !children.find(c => c.id === id)))
                      } else {
                        setSelectedMenus(prev => [...new Set([...prev, parent.id, ...children.map(c => c.id)])])
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <span className="font-medium text-gray-800">
                    {parent.icon} {parent.name}
                  </span>
                </label>
                {children.length > 0 && (
                  <div className="ml-6 space-y-1">
                    {children.map(child => (
                      <label key={child.id} className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={selectedMenus.includes(child.id)}
                          onChange={() => toggleMenu(child.id)}
                          className="w-3.5 h-3.5"
                        />
                        <span>{child.icon} {child.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Dialog>
    </div>
  )
}
