import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Table, Badge, Dialog, Input, Textarea, Select, Switch, Empty, toast } from '../../components/ui'

const emptyProduct = { name: '', description: '', price: 0, category_id: 0, image: '', available: true, is_recommend: false, sort_order: 0 }

export default function Products() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [dialog, setDialog] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyProduct)
  const [catDialog, setCatDialog] = useState(false)
  const [catForm, setCatForm] = useState({ name: '', sort_order: 0 })

  useEffect(() => { load() }, [])

  const load = () => {
    api.getAllProducts().then(data => setProducts(Array.isArray(data) ? data : [])).catch(() => {})
    api.getAllCategories().then(data => setCategories(Array.isArray(data) ? data : [])).catch(() => {})
  }

  const openAdd = () => { setEditing(null); setForm(emptyProduct); setDialog(true) }
  const openEdit = (p) => { setEditing(p); setForm({ ...p, available: !!p.available, is_recommend: !!p.is_recommend }); setDialog(true) }

  const save = async () => {
    if (!form.name) { toast('商品名称必填', 'error'); return }
    try {
      if (editing) { await api.updateProduct(editing.id, form); toast('更新成功') }
      else { await api.createProduct(form); toast('创建成功') }
      setDialog(false); load()
    } catch (e) { toast(e.message, 'error') }
  }

  const remove = async (id) => {
    if (!confirm('确定删除该商品？')) return
    await api.deleteProduct(id); toast('已删除'); load()
  }

  const saveCategory = async () => {
    if (!catForm.name) { toast('分类名称必填', 'error'); return }
    try { await api.createCategory(catForm); toast('分类创建成功'); setCatDialog(false); load() }
    catch (e) { toast(e.message, 'error') }
  }

  const getCategoryName = (id) => categories.find(c => c.id === id)?.name || '未分类'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">商品管理</h2>
          <p className="text-sm text-gray-400 mt-1">管理菜单商品和分类</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setCatForm({ name: '', sort_order: 0 }); setCatDialog(true) }}>+ 分类</Button>
          <Button onClick={openAdd}>+ 添加商品</Button>
        </div>
      </div>

      <Card>
        {products.length === 0 ? <Empty text="暂无商品，点击右上角添加" icon="🍜" /> : (
          <Table columns={[
            { header: '商品', render: p => <div className="flex items-center gap-3"><div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">{p.image ? <img src={p.image} className="w-full h-full object-cover rounded-lg" /> : '🍜'}</div><div><p className="font-medium text-gray-800">{p.name}</p><p className="text-xs text-gray-400">{getCategoryName(p.category_id)}</p></div></div> },
            { header: '价格', render: p => <span className="font-medium text-primary-600">${p.price?.toFixed(2)}</span> },
            { header: '推荐', render: p => p.is_recommend ? <Badge variant="primary">推荐</Badge> : '-' },
            { header: '状态', render: p => <Badge variant={p.available ? 'success' : 'default'}>{p.available ? '在售' : '下架'}</Badge> }
          ]} data={products} actions={p => (
            <div className="flex gap-2">
              <button onClick={() => openEdit(p)} className="text-primary-500 hover:text-primary-700 text-sm">编辑</button>
              <button onClick={() => remove(p.id)} className="text-red-400 hover:text-red-600 text-sm">删除</button>
            </div>
          )} />
        )}
      </Card>

      <Dialog open={dialog} onClose={() => setDialog(false)} title={editing ? '编辑商品' : '添加商品'} width="max-w-2xl"
        footer={<><Button variant="outline" onClick={() => setDialog(false)}>取消</Button><Button onClick={save}>保存</Button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="商品名称 *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <Input label="价格 ($)" type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="分类" value={form.category_id} onChange={e => setForm({ ...form, category_id: parseInt(e.target.value) })} options={[{ value: 0, label: '未分类' }, ...categories.map(c => ({ value: c.id, label: c.name }))]} />
            <Input label="图片URL" value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} placeholder="https://..." />
          </div>
          <Textarea label="描述" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
          <div className="grid grid-cols-3 gap-4">
            <Switch checked={form.available} onChange={v => setForm({ ...form, available: v })} label="在售" />
            <Switch checked={form.is_recommend} onChange={v => setForm({ ...form, is_recommend: v })} label="推荐" />
            <Input label="排序" type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
          </div>
        </div>
      </Dialog>

      <Dialog open={catDialog} onClose={() => setCatDialog(false)} title="添加分类"
        footer={<><Button variant="outline" onClick={() => setCatDialog(false)}>取消</Button><Button onClick={saveCategory}>保存</Button></>}>
        <div className="space-y-4">
          <Input label="分类名称 *" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} />
          <Input label="排序" type="number" value={catForm.sort_order} onChange={e => setCatForm({ ...catForm, sort_order: parseInt(e.target.value) || 0 })} />
        </div>
      </Dialog>
    </div>
  )
}
