import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { useLanguage } from '../../context/LanguageContext'
import { Dialog, Button, Input, Select, toast, Switch } from '../../components/ui'
import { useConfirm } from '../../components/ConfirmDialog'

const STATUS_KEYS = ['pending', 'preparing', 'ready', 'completed', 'cancelled']

export default function OrderStatuses() {
  const { t } = useLanguage()
  const confirm = useConfirm()

  // 订单类型列表（堂吃/打包/配送）
  const DINING_TYPES = [
    { value: 'dinein', label: t('orderStatuses.dinein', '堂吃') },
    { value: 'takeout', label: t('orderStatuses.takeout', '打包/自取') },
    { value: 'delivery', label: t('orderStatuses.delivery', '配送') }
  ]

  // 状态标签可选颜色
  const COLORS = [
    { value: 'primary', label: t('orderStatuses.colorBlue', '蓝色') },
    { value: 'success', label: t('orderStatuses.colorGreen', '绿色') },
    { value: 'warning', label: t('orderStatuses.colorOrange', '橙色') },
    { value: 'danger', label: t('orderStatuses.colorRed', '红色') },
    { value: 'default', label: t('orderStatuses.colorGray', '灰色') }
  ]

  const [statuses, setStatuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState(null)

  useEffect(() => { loadStatuses() }, [])

  // 加载所有订单状态配置
  const loadStatuses = async () => {
    try { const data = await api.getAllOrderStatuses(); setStatuses(Array.isArray(data) ? data : []) } catch (e) { toast(e.message, 'error') } finally { setLoading(false) }
  }

  // 按订单类型分组状态列表
  const groupedByType = DINING_TYPES.map(dt => ({ ...dt, items: statuses.filter(s => s.dining_type === dt.value) }))

  // 打开添加状态对话框
  const openAdd = (diningType) => {
    setDialog({ mode: 'add', data: { status_key: 'pending', dining_type: diningType, label: '', color: 'default', sort_order: 0, enabled: 1, is_active: 0, next_status: '', next_label: '' } })
  }

  // 打开编辑状态对话框
  const openEdit = (status) => { setDialog({ mode: 'edit', data: { ...status } }) }

  // 保存状态配置（新建或编辑）
  const save = async () => {
    const { mode, data } = dialog
    if (!data.status_key || !data.label.trim()) { toast(t('orderStatuses.required', '状态标识和名称必填'), 'error'); return }
    try {
      if (mode === 'add') { await api.createOrderStatus(data); toast(t('orderStatuses.added', '添加成功')) }
      else { await api.updateOrderStatus(data.id, data); toast(t('orderStatuses.saved', '保存成功')) }
      setDialog(null); loadStatuses()
    } catch (e) { toast(e.message, 'error') }
  }

  // 切换状态启用/禁用
  const toggleEnabled = async (status) => {
    try { await api.updateOrderStatus(status.id, { enabled: status.enabled ? 0 : 1 }); loadStatuses() } catch (e) { toast(e.message, 'error') }
  }

  // 删除状态（需确认）
  const remove = async (status) => {
    if (!await confirm({ title: t('orderStatuses.deleteTitle', '删除状态'), message: `${t('orderStatuses.deleteMsgPrefix', '确定删除状态')}"${status.label}"${t('orderStatuses.deleteMsgSuffix', '吗？')}`, variant: 'danger' })) return
    try { await api.deleteOrderStatus(status.id); toast(t('orderStatuses.deleted', '删除成功')); loadStatuses() } catch (e) { toast(e.message, 'error') }
  }

  // 根据颜色值返回对应的CSS类名
  const getColorClass = (color) => {
    const map = { primary: 'bg-blue-100 text-blue-700', success: 'bg-green-100 text-green-700', warning: 'bg-orange-100 text-orange-700', danger: 'bg-red-100 text-red-700', default: 'bg-gray-100 text-gray-600' }
    return map[color] || map.default
  }

  if (loading) return <div className="p-8 text-center text-gray-400">{t('common.loading', '加载中...')}</div>

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t('orderStatuses.title', '订单状态管理')}</h1>
          <p className="text-sm text-gray-400 mt-1">{t('orderStatuses.subtitle', '管理不同订单类型的状态显示、颜色和流转，禁用后该状态不会在前台显示')}</p>
        </div>
      </div>

      <div className="space-y-6">
        {groupedByType.map(group => (
          <div key={group.value} className="bg-white rounded-xl shadow-sm border">
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <h2 className="font-bold text-gray-800">{group.label}</h2>
              <Button size="sm" onClick={() => openAdd(group.value)}>{t('orderStatuses.addStatusBtn', '+ 添加状态')}</Button>
            </div>
            <div className="p-4">
              {group.items.length === 0 ? (
                <p className="text-center text-gray-400 py-6 text-sm">{t('orderStatuses.noStatus', '暂无状态配置')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b">
                        <th className="pb-2 font-medium">{t('orderStatuses.baseStatus', '底层状态')}</th>
                        <th className="pb-2 font-medium">{t('orderStatuses.displayName', '显示名称')}</th>
                        <th className="pb-2 font-medium">{t('orderStatuses.color', '颜色')}</th>
                        <th className="pb-2 font-medium">{t('orderStatuses.activeFilter', '进行中筛选')}</th>
                        <th className="pb-2 font-medium">{t('orderStatuses.nextStatus', '下一状态')}</th>
                        <th className="pb-2 font-medium">{t('orderStatuses.buttonText', '按钮文字')}</th>
                        <th className="pb-2 font-medium">{t('orderStatuses.sort', '排序')}</th>
                        <th className="pb-2 font-medium">{t('orderStatuses.enabled', '启用')}</th>
                        <th className="pb-2 font-medium">{t('common.action', '操作')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map(s => (
                        <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-2.5"><code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{s.status_key}</code></td>
                          <td className="py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getColorClass(s.color)}`}>{s.label}</span></td>
                          <td className="py-2.5 text-gray-500">{COLORS.find(c => c.value === s.color)?.label || s.color}</td>
                          <td className="py-2.5">{s.is_active ? <span className="text-green-600 text-xs">{t('orderStatuses.yes', '是')}</span> : <span className="text-gray-300 text-xs">{t('orderStatuses.no', '否')}</span>}</td>
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
                              <button onClick={() => openEdit(s)} className="text-primary-600 hover:text-primary-700 text-xs">{t('common.edit', '编辑')}</button>
                              <button onClick={() => remove(s)} className="text-red-400 hover:text-red-600 text-xs">{t('common.delete', '删除')}</button>
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

      <Dialog open={!!dialog} onClose={() => setDialog(null)} title={dialog?.mode === 'add' ? t('orderStatuses.addTitle', '添加订单状态') : t('orderStatuses.editTitle', '编辑订单状态')} width="max-w-lg">
        {dialog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('orderStatuses.diningType', '订单类型')}</label>
                <select value={dialog.data.dining_type} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, dining_type: e.target.value } })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  {DINING_TYPES.map(dt => <option key={dt.value} value={dt.value}>{dt.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('orderStatuses.baseStatusLabel', '底层状态')}</label>
                <select value={dialog.data.status_key} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, status_key: e.target.value } })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  {STATUS_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('orderStatuses.displayNameLabel', '显示名称 *')}</label>
              <input type="text" value={dialog.data.label} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, label: e.target.value } })} placeholder={t('orderStatuses.displayPh', '如：进行中、待取餐、已完成')} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('orderStatuses.colorLabel', '标签颜色')}</label>
                <select value={dialog.data.color} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, color: e.target.value } })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  {COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('orderStatuses.sort', '排序')}</label>
                <input type="number" value={dialog.data.sort_order} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, sort_order: parseInt(e.target.value) || 0 } })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('orderStatuses.nextStatusLabel', '下一状态（推进流转）')}</label>
                <select value={dialog.data.next_status || ''} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, next_status: e.target.value } })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="">{t('orderStatuses.noNext', '无（终态）')}</option>
                  {STATUS_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('orderStatuses.nextLabel', '推进按钮文字')}</label>
                <input type="text" value={dialog.data.next_label || ''} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, next_label: e.target.value } })} placeholder={t('orderStatuses.nextPh', '如：制作完成、确认取餐')} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!dialog.data.is_active} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, is_active: e.target.checked ? 1 : 0 } })} className="w-4 h-4" />
                <span className="text-sm text-gray-700">{t('orderStatuses.countActive', '计入"进行中"筛选')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!dialog.data.enabled} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, enabled: e.target.checked ? 1 : 0 } })} className="w-4 h-4" />
                <span className="text-sm text-gray-700">{t('orderStatuses.enabledLabel', '启用')}</span>
              </label>
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <Button variant="outline" className="flex-1" onClick={() => setDialog(null)}>{t('common.cancel', '取消')}</Button>
              <Button className="flex-1" onClick={save}>{t('common.save', '保存')}</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
