import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Table, Badge, Dialog, Input, Select, Switch, Empty, toast } from '../../components/ui'

const emptyForm = { category: '其他', name: '', extra_price: 0, is_default: false, sort_order: 0, enabled: true }
const categoryOptions = [
  { value: '辣度', label: '辣度' }, { value: '冰度', label: '冰度' },
  { value: '甜度', label: '甜度' }, { value: '配料', label: '配料' }, { value: '其他', label: '其他' }
]

export default function Flavors() {
  const [tags, setTags] = useState([])
  const [dialog, setDialog] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [filterCategory, setFilterCategory] = useState('all')

  useEffect(() => { load() }, [])

  const load = () => {
    api.getAllFlavorTags().then(data => setTags(Array.isArray(data) ? data : [])).catch(() => {})
  }

  const openAdd = () => { setEditing(null); setForm(emptyForm); setDialog(true) }
  const openEdit = (t) => {
    setEditing(t)
    setForm({ ...t, is_default: !!t.is_default, enabled: !!t.enabled, extra_price: t.extra_price || 0 })
    setDialog(true)
  }

  const save = async () => {
    if (!form.name) { toast('标签名称必填', 'error'); return }
    try {
      const data = { ...form, extra_price: parseFloat(form.extra_price) || 0 }
      if (editing) { await api.updateFlavorTag(editing.id, data); toast('更新成功') }
      else { await api.createFlavorTag(data); toast('添加成功') }
      setDialog(false); load()
    } catch (e) { toast(e.message, 'error') }
  }

  const remove = async (id) => {
    if (!confirm('确定删除该口味标签？')) return
    await api.deleteFlavorTag(id); toast('已删除'); load()
  }

  const toggleEnabled = async (t) => {
    await api.updateFlavorTag(t.id, { enabled: !t.enabled })
    toast(t.enabled ? '已禁用' : '已启用')
    load()
  }

  const filtered = filterCategory === 'all' ? tags : tags.filter(t => t.category === filterCategory)
  const categories = [...new Set(tags.map(t => t.category))]

  const columns = [
    { key: 'category', label: '分类', render: (t) => <Badge variant="info">{t.category}</Badge> },
    { key: 'name', label: '标签名称' },
    { key: 'extra_price', label: '额外加价', render: (t) => t.extra_price > 0 ? <span className="text-orange-600 font-medium">+${t.extra_price.toFixed(2)}</span> : <span className="text-gray-400">$0.00</span> },
    { key: 'is_default', label: '默认选中', render: (t) => t.is_default ? <Badge variant="success">是</Badge> : <span className="text-gray-400">否</span> },
    { key: 'sort_order', label: '排序' },
    { key: 'enabled', label: '启用', render: (t) => <Switch checked={!!t.enabled} onChange={() => toggleEnabled(t)} /> },
    { key: 'actions', label: '操作', render: (t) => (
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => openEdit(t)}>编辑</Button>
        <Button size="sm" variant="danger" onClick={() => remove(t.id)}>删除</Button>
      </div>
    )}
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">口味管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理商品的口味标签、加价和默认选项</p>
        </div>
        <Button onClick={openAdd}>+ 新增口味</Button>
      </div>

      <Card className="mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">筛选分类：</span>
          <Select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-40">
            <option value="all">全部分类</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <span className="text-sm text-gray-400 ml-auto">共 {filtered.length} 个标签</span>
        </div>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <Empty text="暂无口味标签，点击右上角新增" icon="🌶️" />
        ) : (
          <Table columns={columns} data={filtered} rowKey="id" />
        )}
      </Card>

      <Dialog open={dialog} onClose={() => setDialog(false)} title={editing ? '编辑口味' : '新增口味'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="分类" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {categoryOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </Select>
            <Input label="标签名称 *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="如：少辣、去冰" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="额外加价 ($)" type="number" step="0.01" min="0" value={form.extra_price} onChange={e => setForm({ ...form, extra_price: e.target.value })} placeholder="0.00" />
            <Input label="排序" type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch checked={form.is_default} onChange={v => setForm({ ...form, is_default: v })} />
              <span className="text-sm text-gray-700">默认选中（新商品自动带上此口味）</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch checked={form.enabled} onChange={v => setForm({ ...form, enabled: v })} />
              <span className="text-sm text-gray-700">启用</span>
            </label>
          </div>
          <p className="text-xs text-gray-400">提示：默认选中的标签（如正常冰、正常糖）会在商品加入购物车时自动选中，顾客可在购物车中修改。</p>
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={() => setDialog(false)}>取消</Button>
          <Button className="flex-1" onClick={save}>{editing ? '保存修改' : '确认添加'}</Button>
        </div>
      </Dialog>
    </div>
  )
}
