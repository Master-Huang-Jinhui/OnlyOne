import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Table, Badge, Dialog, Input, Select, Empty, toast } from '../../components/ui'

export default function Flavors() {
  const [categories, setCategories] = useState([])
  const [catDialog, setCatDialog] = useState(null)
  const [tagDialog, setTagDialog] = useState(null)
  const [expanded, setExpanded] = useState({})

  useEffect(() => { load() }, [])

  const load = () => api.getAllFlavorCategories().then(data => {
    const list = Array.isArray(data) ? data : []
    setCategories(list)
    if (list.length > 0) setExpanded(prev => ({ ...prev, [list[0].id]: true }))
  }).catch(() => {})

  const saveCategory = async () => {
    const { mode, data } = catDialog
    const name = data.name.trim()
    if (!name) { toast('请填写分类名称', 'error'); return }
    try {
      if (mode === 'add') {
        await api.createFlavorCategory({ name, sort_order: data.sort_order || 0, enabled: data.enabled ? 1 : 0 })
        toast('分类已添加')
      } else {
        await api.updateFlavorCategory(data.id, { name, sort_order: data.sort_order || 0, enabled: data.enabled ? 1 : 0 })
        toast('分类已更新')
      }
      setCatDialog(null)
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const toggleCategory = async (cat) => {
    await api.updateFlavorCategory(cat.id, { enabled: cat.enabled ? 0 : 1 })
    toast(cat.enabled ? '已禁用该分类' : '已启用该分类')
    load()
  }

  const deleteCategory = async (cat) => {
    if (!confirm(`确定删除分类"${cat.name}"吗？该分类下没有标签才能删除。`)) return
    try {
      await api.deleteFlavorCategory(cat.id)
      toast('分类已删除')
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const saveTag = async () => {
    const { mode, categoryId, data } = tagDialog
    const name = data.name.trim()
    if (!name) { toast('请填写标签名称', 'error'); return }
    try {
      const payload = {
        category_id: categoryId,
        name,
        extra_price: parseFloat(data.extra_price) || 0,
        is_default: data.is_default ? 1 : 0,
        sort_order: data.sort_order || 0,
        enabled: data.enabled ? 1 : 0
      }
      if (mode === 'add') {
        await api.createFlavorTag(payload)
        toast('标签已添加')
      } else {
        await api.updateFlavorTag(data.id, payload)
        toast('标签已更新')
      }
      setTagDialog(null)
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const toggleTag = async (tag) => {
    await api.updateFlavorTag(tag.id, { enabled: tag.enabled ? 0 : 1 })
    toast(tag.enabled ? '已禁用该标签' : '已启用该标签')
    load()
  }

  const deleteTag = async (tag) => {
    if (!confirm(`确定删除标签"${tag.name}"吗？`)) return
    await api.deleteFlavorTag(tag.id)
    toast('标签已删除')
    load()
  }

  const tagColumns = [
    { header: '标签', render: t => <span className="font-medium text-gray-800">{t.name}</span> },
    { header: '加价', render: t => t.extra_price > 0 ? <span className="text-primary-600 font-medium">+${t.extra_price.toFixed(2)}</span> : <span className="text-gray-400">-</span> },
    { header: '默认', render: t => t.is_default ? <Badge variant="success">默认选中</Badge> : <span className="text-gray-400">-</span> },
    { header: '排序', render: t => <span className="text-gray-500">{t.sort_order}</span> },
    { header: '状态', render: t => t.enabled ? <Badge variant="success">启用</Badge> : <Badge variant="default">禁用</Badge> }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">口味管理</h2>
          <p className="text-sm text-gray-400 mt-1">管理口味大类和小类，可单独启用/禁用</p>
        </div>
        <Button onClick={() => setCatDialog({ mode: 'add', data: { name: '', sort_order: 0, enabled: true } })}>+ 新增大类</Button>
      </div>

      {categories.length === 0 ? (
        <Card><Empty text="暂无口味分类，点击右上角添加" icon="🌶️" /></Card>
      ) : categories.map(cat => (
        <Card key={cat.id} className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b">
            <div className="flex items-center gap-3">
              <button onClick={() => setExpanded(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))} className="text-gray-500 hover:text-gray-700 w-6">
                {expanded[cat.id] ? '▼' : '▶'}
              </button>
              <h3 className="font-bold text-gray-800 text-lg">{cat.name}</h3>
              <Badge variant={cat.enabled ? 'success' : 'default'}>{cat.enabled ? '启用中' : '已禁用'}</Badge>
              <span className="text-xs text-gray-400">{cat.tags?.length || 0} 个标签</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => toggleCategory(cat)}>{cat.enabled ? '禁用' : '启用'}</Button>
              <Button size="sm" variant="outline" onClick={() => setCatDialog({ mode: 'edit', data: { ...cat } })}>编辑</Button>
              <Button size="sm" variant="outline" onClick={() => setTagDialog({ mode: 'add', categoryId: cat.id, data: { name: '', extra_price: 0, is_default: false, sort_order: 0, enabled: true } })}>+ 标签</Button>
              <button onClick={() => deleteCategory(cat)} className="text-red-400 hover:text-red-600 text-sm px-2">删除</button>
            </div>
          </div>

          {expanded[cat.id] && (
            <div className="p-5">
              {(!cat.tags || cat.tags.length === 0) ? (
                <Empty text="该分类下暂无标签，点击右上角 + 标签 添加" icon="🏷️" />
              ) : (
                <Table
                  columns={tagColumns}
                  data={cat.tags}
                  actions={t => (
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleTag(t)} className={`text-xs ${t.enabled ? 'text-yellow-600 hover:text-yellow-700' : 'text-green-600 hover:text-green-700'}`}>{t.enabled ? '禁用' : '启用'}</button>
                      <button onClick={() => setTagDialog({ mode: 'edit', categoryId: cat.id, data: { ...t } })} className="text-xs text-primary-600 hover:text-primary-700">编辑</button>
                      <button onClick={() => deleteTag(t)} className="text-xs text-red-400 hover:text-red-600">删除</button>
                    </div>
                  )}
                />
              )}
            </div>
          )}
        </Card>
      ))}

      <Dialog open={!!catDialog} onClose={() => setCatDialog(null)} title={catDialog?.mode === 'add' ? '新增大类' : '编辑大类'} width="max-w-sm">
        {catDialog && (
          <div className="space-y-4">
            <Input label="大类名称 *" value={catDialog.data.name} onChange={e => setCatDialog({ ...catDialog, data: { ...catDialog.data, name: e.target.value } })} placeholder="如：冰度、辣度、甜度" />
            <Input label="排序" type="number" value={catDialog.data.sort_order} onChange={e => setCatDialog({ ...catDialog, data: { ...catDialog.data, sort_order: parseInt(e.target.value) || 0 } })} />
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={catDialog.data.enabled} onChange={e => setCatDialog({ ...catDialog, data: { ...catDialog.data, enabled: e.target.checked } })} className="w-4 h-4" />
              <span className="text-sm text-gray-700">启用该分类（禁用后前台不显示）</span>
            </label>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setCatDialog(null)}>取消</Button>
              <Button className="flex-1" onClick={saveCategory}>保存</Button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog open={!!tagDialog} onClose={() => setTagDialog(null)} title={tagDialog?.mode === 'add' ? '新增标签' : '编辑标签'} width="max-w-sm">
        {tagDialog && (
          <div className="space-y-4">
            <div className="text-sm text-gray-500">所属大类：<span className="font-medium text-gray-700">{categories.find(c => c.id === tagDialog.categoryId)?.name || '-'}</span></div>
            <Input label="标签名称 *" value={tagDialog.data.name} onChange={e => setTagDialog({ ...tagDialog, data: { ...tagDialog.data, name: e.target.value } })} placeholder="如：少冰、去冰、正常冰" />
            <Input label="额外加价 ($)" type="number" step="0.01" value={tagDialog.data.extra_price} onChange={e => setTagDialog({ ...tagDialog, data: { ...tagDialog.data, extra_price: e.target.value } })} placeholder="0 表示不加价" />
            <Input label="排序" type="number" value={tagDialog.data.sort_order} onChange={e => setTagDialog({ ...tagDialog, data: { ...tagDialog.data, sort_order: parseInt(e.target.value) || 0 } })} />
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={tagDialog.data.is_default} onChange={e => setTagDialog({ ...tagDialog, data: { ...tagDialog.data, is_default: e.target.checked } })} className="w-4 h-4" />
              <span className="text-sm text-gray-700">默认选中（商品加入购物车时自动带上）</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={tagDialog.data.enabled} onChange={e => setTagDialog({ ...tagDialog, data: { ...tagDialog.data, enabled: e.target.checked } })} className="w-4 h-4" />
              <span className="text-sm text-gray-700">启用该标签（禁用后前台不显示）</span>
            </label>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setTagDialog(false)}>取消</Button>
              <Button className="flex-1" onClick={saveTag}>保存</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
