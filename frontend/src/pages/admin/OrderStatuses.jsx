import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Dialog, Button, Input, Select, toast, Switch } from '../../components/ui'

const DINING_TYPES = [
  { value: 'dinein', label: '堂吃' },
  { value: 'takeout', label: '打包/自取' },
  { value: 'delivery', label: '配送' }
]

const COLORS = [
  { value: 'primary', label: '蓝色' },
  { value: 'success', label: '绿色' },
  { value: 'warning', label: '橙色' },
  { value: 'danger', label: '红色' },
  { value: 'default', label: '灰色' }
]

const STATUS_KEYS = ['pending', 'preparing', 'ready', 'completed', 'cancelled']

export default function OrderStatuses() {
  const [statuses, setStatuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState(null)

  useEffect(() => { loadStatuses() }, [])

  const loadStatuses = async () => {
    try {
      const data = await api.getAllOrderStatuses()
      setStatuses(Array.isArray(data) ? data : [])
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const groupedByType = DINING_TYPES.map(dt => ({
    ...dt,
    items: statuses.filter(s => s.dining_type === dt.value)
  }))

  const openAdd = (diningType) => {
    setDialog({
      mode: 'add',
      data: {
        status_key: 'pending',
        dining_type: diningType,
        label: '',
        color: 'default',
        sort_order: 0,
        enabled: 1,
        is_active: 0,
        next_status: '',
        next_label: ''
      }
    })
  }

  const openEdit = (status) => {
    setDialog({ mode: 'edit', data: { ...status } })
  }

  const save = async () => {
    const { mode, data } = dialog
    if (!data.status_key || !data.label.trim()) {
      toast('状态标识和名称必填', 'error')
      return
    }
    try {
      if (mode === 'add') {
        await api.createOrderStatus(data)
        toast('添加成功')
      } else {
        await api.updateOrderStatus(data.id, data)
        toast('保存成功')
      }
      setDialog(null)
      loadStatuses()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const toggleEnabled = async (status) => {
    try {
      await api.updateOrderStatus(status.id, { enabled: status.enabled ? 0 : 1 })
      loadStatuses()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const remove = async (status) => {
    if (!confirm(`确定删除状态"${status.label}"吗？`)) return
    try {
      await api.deleteOrderStatus(status.id)
      toast('删除成功')
      loadStatuses()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const getColorClass = (color) => {
    const map = {
      primary: 'bg-blue-100 text-blue-700',
      success: 'bg-green-100 text-green-700',
      warning: 'bg-orange-100 text-orange-700',
      danger: 'bg-red-100 text-red-700',
      default: 'bg-gray-100 text-gray-600'
    }
    return map[color] || map.default
  }

  if (loading) return <div className="p-8 text-center text-gray-400">加载中...</div>

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">订单状态管理</h1>
          <p className="text-sm text-gray-400 mt-1">管理不同订单类型的状态显示、颜色和流转，禁用后该状态不会在前台显示</p>
        </div>
      </div>

      <div className="space-y-6">
        {groupedByType.map(group => (
          <div key={group.value} className="bg-white rounded-xl shadow-sm border">
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <h2 className="font-bold text-gray-800">{group.label}</h2>
              <Button size="sm" onClick={() => openAdd(group.value)}>+ 添加状态</Button>
            </div>
            <div className="p-4">
              {group.items.length === 0 ? (
                <p className="text-center text-gray-400 py-6 text-sm">暂无状态配置</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b">
                        <th className="pb-2 font-medium">底层状态</th>
                        <th className="pb-2 font-medium">显示名称</th>
                        <th className="pb-2 font-medium">颜色</th>
                        <th className="pb-2 font-medium">进行中筛选</th>
                        <th className="pb-2 font-medium">下一状态</th>
                        <th className="pb-2 font-medium">按钮文字</th>
                        <th className="pb-2 font-medium">排序</th>
                        <th className="pb-2 font-medium">启用</th>
                        <th className="pb-2 font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map(s => (
                        <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-2.5"><code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{s.status_key}</code></td>
                          <td className="py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getColorClass(s.color)}`}>{s.label}</span></td>
                          <td className="py-2.5 text-gray-500">{COLORS.find(c => c.value === s.color)?.label || s.color}</td>
                          <td className="py-2.5">{s.is_active ? <span className="text-green-600 text-xs">是</span> : <span className="text-gray-300 text-xs">否</span>}</td>
                          <td className="py-2.5 text-gray-500">{s.next_status ? <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{s.next_status}</code> : '-'}</td>
                          <td className="py-2.5 text-gray-500">{s.next_label || '-'}</td>
                          <td className="py-2.5 text-gray-500">{s.sort_order}</td>
                          <td className="py-2.5">
                            <button onClick={() => toggleEnabled(s)} className={`relative w-10 h-5 rounded-full transition ${s.enabled ? 'bg-primary-600' : 'bg-gray-300'}`}>
                              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${s.enabled ? 'left-5' : 'left-0.5'}`}></span>
                            </button>
                          </td>
                          <td className="py-2.5">
                            <div className="flex gap-2">
                              <button onClick={() => openEdit(s)} className="text-primary-600 hover:text-primary-700 text-xs">编辑</button>
                              <button onClick={() => remove(s)} className="text-red-400 hover:text-red-600 text-xs">删除</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 编辑对话框 */}
      <Dialog open={!!dialog} onClose={() => setDialog(null)} title={dialog?.mode === 'add' ? '添加订单状态' : '编辑订单状态'} width="max-w-lg">
        {dialog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">订单类型</label>
                <select value={dialog.data.dining_type} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, dining_type: e.target.value } })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  {DINING_TYPES.map(dt => <option key={dt.value} value={dt.value}>{dt.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">底层状态</label>
                <select value={dialog.data.status_key} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, status_key: e.target.value } })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  {STATUS_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">显示名称 *</label>
              <input type="text" value={dialog.data.label} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, label: e.target.value } })} placeholder="如：进行中、待取餐、已完成" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标签颜色</label>
                <select value={dialog.data.color} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, color: e.target.value } })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  {COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                <input type="number" value={dialog.data.sort_order} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, sort_order: parseInt(e.target.value) || 0 } })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">下一状态（推进流转）</label>
                <select value={dialog.data.next_status || ''} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, next_status: e.target.value } })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="">无（终态）</option>
                  {STATUS_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">推进按钮文字</label>
                <input type="text" value={dialog.data.next_label || ''} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, next_label: e.target.value } })} placeholder="如：制作完成、确认取餐" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!dialog.data.is_active} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, is_active: e.target.checked ? 1 : 0 } })} className="w-4 h-4" />
                <span className="text-sm text-gray-700">计入"进行中"筛选</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!dialog.data.enabled} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, enabled: e.target.checked ? 1 : 0 } })} className="w-4 h-4" />
                <span className="text-sm text-gray-700">启用</span>
              </label>
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <Button variant="outline" className="flex-1" onClick={() => setDialog(null)}>取消</Button>
              <Button className="flex-1" onClick={save}>保存</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
