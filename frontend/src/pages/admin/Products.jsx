import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Table, Badge, Dialog, Input, Textarea, Select, Switch, Tabs, Empty, toast } from '../../components/ui'

const emptyProduct = { name: '', name_en: '', category_id: '', price: '', description: '', description_en: '', image: '', available: true, is_recommend: false, sort_order: 0 }
const emptyCategory = { name: '', name_en: '', sort_order: 0 }

export default function Products() {
  const [tab, setTab] = useState('products')
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [dialog, setDialog] = useState(false)
  const [catDialog, setCatDialog] = useState(false)
  const [editing, setEditing] = useState(null)
  const [catEditing, setCatEditing] = useState(null)
  const [form, setForm] = useState(emptyProduct)
  const [catForm, setCatForm] = useState(emptyCategory)

  useEffect(() => { load() }, [])

  const load = () => {
    api.getAllProducts().then(setProducts).catch(() => {})
    api.getAllCategories().then(setCategories).catch(() => {})
  }

  const openAdd = () => { setEditing(null); setForm(emptyProduct); setDialog(true) }
  const openEdit = (p) => { setEditing(p); setForm({ ...p, available: !!p.available, is_recommend: !!p.is_recommend }); setDialog(true) }

  const save = async () => {
    if (!form.name || form.price === '') { toast('名称和价格必填', 'error'); return }
    try {
      const data = { ...form, price: parseFloat(form.price) }
      if (editing) { await api.updateProduct(editing.id, data); toast('更新成功') }
      else { await api.createProduct(data); toast('添加成功') }
      setDialog(false); load()
    } catch (e) { toast(e.message, 'error') }
  }

  const remove = async (id) => {
    if (!confirm('确定删除该商品？')) return
    await api.deleteProduct(id); toast('已删除'); load()
  }

  const openCatAdd = () => { setCatEditing(null); setCatForm(emptyCategory); setCatDialog(true) }
  const openCatEdit = (c) => { setCatEditing(c); setCatForm({ ...c }); setCatDialog(true) }
  const saveCat = async () => {
    if (!catForm.name) { toast('分类名称必填', 'error'); return }
    try {
      if (catEditing) { await api.updateCategory(catEditing.id, catForm); toast('更新成功') }
      else { await api.createCategory(catForm); toast('添加成功') }
      setCatDialog(false); load()
    } catch (e) { toast(e.message, 'error') }
  }
  const removeCat = async (id) => {
    if (!confirm('确定删除该分类？分类下商品将变为未分类')) return
    await api.deleteCategory(id); toast('已删除'); load()
  }

  const productColumns = [
    { header: '商品', render: p => (
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-xl overflow-hidden">
          {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover" /> : '🍜'}
        </div>
        <div>
          <p className="font-medium text-gray-800">{p.name}</p>
          <p className="text-xs text-gray-400">{p.name_en || '-'}</p>
        </div>
      </div>
    )},
    { header: '分类', render: p => <Badge variant="primary">{p.category_name || '未分类'}</Badge> },
    { header: '价格', render: p => <span className="font-medium text-primary-600">${parseFloat(p.price).toFixed(2)}</span> },
    { header: '推荐', render: p => p.is_recommend ? <Badge variant="danger">推荐</Badge> : <span className="text-gray-300">-</span> },
    { header: '状态', render: p => <Badge variant={p.available ? 'success' : 'default'}>{p.available ? '在售' : '下架'}</Badge> }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">商品管理</h2>
          <p className="text-sm text-gray-400 mt-1">管理商品和分类</p>
        </div>
        <Button onClick={tab === 'products' ? openAdd : openCatAdd}>+ 添加{tab === 'products' ? '商品' : '分类'}</Button>
      </div>

      <Tabs tabs={[{ key: 'products', label: '商品列表' }, { key: 'categories', label: '分类管理' }]} active={tab} onChange={setTab} />

      {tab === 'products' ? (
        <Card>
          <Table columns={productColumns} data={products} actions={p => (
            <div className="flex gap-2">
              <button onClick={() => openEdit(p)} className="text-primary-500 hover:text-primary-700 text-sm">编辑</button>
              <button onClick={() => remove(p.id)} className="text-red-400 hover:text-red-600 text-sm">删除</button>
            </div>
          )} />
        </Card>
      ) : (
        <Card>
          <Table columns={[
            { header: '分类名称', render: c => <div><p className="font-medium text-gray-800">{c.name}</p><p className="text-xs text-gray-400">{c.name_en || '-'}</p></div> },
            { header: '排序', key: 'sort_order' },
            { header: '状态', render: c => <Badge variant={c.enabled ? 'success' : 'default'}>{c.enabled ? '启用' : '停用'}</Badge> }
          ]} data={categories} actions={c => (
            <div className="flex gap-2">
              <button onClick={() => openCatEdit(c)} className="text-primary-500 hover:text-primary-700 text-sm">编辑</button>
              <button onClick={() => removeCat(c.id)} className="text-red-400 hover:text-red-600 text-sm">删除</button>
            </div>
          )} />
        </Card>
      )}

      <Dialog open={dialog} onClose={() => setDialog(false)} title={editing ? '编辑商品' : '添加商品'} width="max-w-2xl"
        footer={<><Button variant="outline" onClick={() => setDialog(false)}>取消</Button><Button onClick={save}>保存</Button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="商品名称 *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <Input label="英文名" value={form.name_en} onChange={e => setForm({ ...form, name_en: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Select label="分类" value={form.category_id || ''} onChange={e => setForm({ ...form, category_id: e.target.value })}
              options={[{ value: '', label: '未分类' }, ...categories.map(c => ({ value: c.id, label: c.name }))]} />
            <Input label="价格 *" type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
            <Input label="排序" type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
          </div>
          <Input label="图片 URL" value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} placeholder="https://..." />
          <div className="grid grid-cols-2 gap-4">
            <Textarea label="描述" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
            <Textarea label="英文描述" value={form.description_en} onChange={e => setForm({ ...form, description_en: e.target.value })} rows={2} />
          </div>
          <div className="flex gap-6">
            <Switch checked={form.available} onChange={v => setForm({ ...form, available: v })} label="在售" />
            <Switch checked={form.is_recommend} onChange={v => setForm({ ...form, is_recommend: v })} label="推荐商品" />
          </div>
        </div>
      </Dialog>

      <Dialog open={catDialog} onClose={() => setCatDialog(false)} title={catEditing ? '编辑分类' : '添加分类'}
        footer={<><Button variant="outline" onClick={() => setCatDialog(false)}>取消</Button><Button onClick={saveCat}>保存</Button></>}>
        <div className="space-y-4">
          <Input label="分类名称 *" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} />
          <Input label="英文名" value={catForm.name_en} onChange={e => setCatForm({ ...catForm, name_en: e.target.value })} />
          <Input label="排序" type="number" value={catForm.sort_order} onChange={e => setCatForm({ ...catForm, sort_order: parseInt(e.target.value) || 0 })} />
        </div>
      </Dialog>
    </div>
  )
}
