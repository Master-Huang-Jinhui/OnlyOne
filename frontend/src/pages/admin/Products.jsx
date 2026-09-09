import { useState, useEffect, useRef } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Table, Badge, Dialog, Input, Textarea, Select, Empty, toast } from '../../components/ui'

export default function Products() {
  const [categories, setCategories] = useState([])
  const [expanded, setExpanded] = useState({})
  const [catDialog, setCatDialog] = useState(null)
  const [productDialog, setProductDialog] = useState(null)
  const [moveDialog, setMoveDialog] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [searchKeyword, setSearchKeyword] = useState('')
  const fileInputRef = useRef(null)
  const productImageInputRef = useRef(null)

  const handleProductImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = await api.uploadImage(file)
      if (data?.url) {
        setProductDialog(prev => ({ ...prev, data: { ...prev.data, image: data.url } }))
        toast('图片上传成功')
      }
    } catch (err) { toast(err.message, 'error') }
    e.target.value = ''
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = (products) => {
    const allSelected = products.every(p => selectedIds.has(p.id))
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (allSelected) products.forEach(p => next.delete(p.id))
      else products.forEach(p => next.add(p.id))
      return next
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  const downloadTemplate = () => {
    const token = localStorage.getItem('token')
    fetch('/api/products/export/template', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = 'product_import_template.xlsx'; a.click()
        window.URL.revokeObjectURL(url)
      })
  }

  const exportProducts = () => {
    const token = localStorage.getItem('token')
    fetch('/api/products/export', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = 'products_export.xlsx'; a.click()
        window.URL.revokeObjectURL(url)
      })
  }

  const handleImportFile = async (e, confirm = false) => {
    const file = e.target.files?.[0]
    if (!file) return
    const token = localStorage.getItem('token')
    const formData = new FormData()
    formData.append('file', file)
    if (confirm) formData.append('confirm', 'true')
    try {
      const res = await fetch('/api/products/import', { method: 'POST', body: formData, headers: { 'Authorization': `Bearer ${token}` } })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '导入失败')
      if (data.needConfirm) {
        const dupList = data.duplicates.map(d => `第${d.row}行：${d.name}（${d.category}）`).join('\n')
        if (window.confirm(`发现 ${data.duplicateCount} 个重复商品：\n\n${dupList}\n\n是否跳过重复项，继续导入其余 ${data.totalRows - data.duplicateCount} 条？`)) {
          handleImportFile(e, true)
          return
        }
        e.target.value = ''
        return
      }
      toast(`导入成功：${data.success} 条，失败 ${data.failed} 条${data.skipped ? `，跳过重复 ${data.skipped} 条` : ''}${data.errors?.length ? '，' + data.errors[0] : ''}`)
      load()
    } catch (err) { toast(err.message, 'error') }
    e.target.value = ''
  }

  useEffect(() => { load() }, [])

  const load = () => {
    Promise.all([api.getAllCategories(), api.getAllProducts()]).then(([cats, prods]) => {
      const categoryList = Array.isArray(cats) ? cats : []
      const productList = Array.isArray(prods) ? prods : []
      const withProducts = categoryList.map(c => ({
        ...c,
        products: productList.filter(p => p.category_id === c.id)
      }))
      const uncategorized = productList.filter(p => !p.category_id)
      if (uncategorized.length > 0) {
        withProducts.push({ id: 0, name: '未分类', name_en: 'Uncategorized', enabled: 1, sort_order: 999, products: uncategorized })
      }
      setCategories(withProducts)
      if (withProducts.length > 0) setExpanded(prev => ({ ...prev, [withProducts[0].id]: true }))
    }).catch(() => {})
  }

  const saveCategory = async () => {
    const { mode, data } = catDialog
    const name = data.name.trim()
    if (!name) { toast('请填写分类名称', 'error'); return }
    try {
      const payload = { name, name_en: data.name_en || '', sort_order: data.sort_order || 0, enabled: data.enabled ? 1 : 0 }
      if (mode === 'add') { await api.createCategory(payload); toast('分类已添加') }
      else { await api.updateCategory(data.id, payload); toast('分类已更新') }
      setCatDialog(null); load()
    } catch (e) { toast(e.message, 'error') }
  }

  const toggleCategory = async (cat) => {
    if (cat.id === 0) return
    await api.updateCategory(cat.id, { enabled: cat.enabled ? 0 : 1 })
    toast(cat.enabled ? '已禁用该分类' : '已启用该分类')
    load()
  }

  const deleteCategory = async (cat) => {
    if (cat.id === 0) return
    if (!confirm(`确定删除分类"${cat.name}"吗？分类下商品将变为未分类。`)) return
    try { await api.deleteCategory(cat.id); toast('分类已删除'); load() } catch (e) { toast(e.message, 'error') }
  }

  const saveProduct = async () => {
    const { mode, data } = productDialog
    if (!data.name.trim() || data.price === '') { toast('名称和价格必填', 'error'); return }
    try {
      const payload = {
        name: data.name.trim(),
        name_en: data.name_en || '',
        category_id: data.category_id || null,
        price: parseFloat(data.price),
        description: data.description || '',
        description_en: data.description_en || '',
        image: data.image || '',
        available: data.available ? 1 : 0,
        is_recommend: data.is_recommend ? 1 : 0,
        sort_order: data.sort_order || 0
      }
      if (mode === 'add') { await api.createProduct(payload); toast('商品已添加') }
      else { await api.updateProduct(data.id, payload); toast('商品已更新') }
      setProductDialog(null); load()
    } catch (e) { toast(e.message, 'error') }
  }

  const toggleProduct = async (p) => {
    await api.updateProduct(p.id, { available: p.available ? 0 : 1 })
    toast(p.available ? '已下架' : '已上架')
    load()
  }

  const deleteProduct = async (p) => {
    if (!confirm(`确定删除商品"${p.name}"吗？`)) return
    await api.deleteProduct(p.id); toast('商品已删除'); load()
  }

  const confirmMove = async () => {
    const { products, targetCategoryId } = moveDialog
    try {
      await Promise.all(products.map(p => api.updateProduct(p.id, { category_id: targetCategoryId || null })))
      const targetName = categories.find(c => c.id === Number(targetCategoryId))?.name || '未分类'
      toast(`已移动 ${products.length} 个商品到「${targetName}」`)
      setMoveDialog(null)
      clearSelection()
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const openBatchMove = () => {
    const selectedProducts = categories.flatMap(c => c.products || []).filter(p => selectedIds.has(p.id))
    if (selectedProducts.length === 0) { toast('请先选择商品', 'error'); return }
    setMoveDialog({ products: selectedProducts, targetCategoryId: '' })
  }

  const productColumns = [
    { header: '', render: p => (
      <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} className="w-4 h-4 cursor-pointer" />
    )},
    { header: '商品', render: p => (
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-xl overflow-hidden flex-shrink-0">
          {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover" /> : '🍜'}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-gray-800 truncate">{p.name}</p>
          <p className="text-xs text-gray-400 truncate">{p.name_en || '-'}</p>
        </div>
      </div>
    )},
    { header: '价格', render: p => <span className="font-medium text-primary-600">${parseFloat(p.price).toFixed(2)}</span> },
    { header: '推荐', render: p => p.is_recommend ? <Badge variant="danger">推荐</Badge> : <span className="text-gray-300">-</span> },
    { header: '排序', render: p => <span className="text-gray-500 text-sm">{p.sort_order}</span> },
    { header: '状态', render: p => p.available ? <Badge variant="success">在售</Badge> : <Badge variant="default">下架</Badge> }
  ]

  const kw = searchKeyword.trim().toLowerCase()
  const filteredCategories = kw
    ? categories.map(c => ({
        ...c,
        products: (c.products || []).filter(p =>
          (p.name || '').toLowerCase().includes(kw) ||
          (p.name_en || '').toLowerCase().includes(kw) ||
          (p.description || '').toLowerCase().includes(kw) ||
          (p.description_en || '').toLowerCase().includes(kw)
        )
      })).filter(c => c.products.length > 0)
    : categories

  const displayCategories = kw ? filteredCategories : categories

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">商品管理</h2>
          <p className="text-sm text-gray-400 mt-1">按分类管理商品，点击分类展开查看商品列表</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              placeholder="搜索商品名称/描述..."
              className="w-64 pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            {searchKeyword && (
              <button onClick={() => setSearchKeyword('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">✕</button>
            )}
          </div>
          <Button onClick={() => setCatDialog({ mode: 'add', data: { name: '', name_en: '', sort_order: 0, enabled: true } })}>+ 新增分类</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadTemplate}>下载模板</Button>
            <Button variant="outline" onClick={exportProducts}>导出</Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>导入</Button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportFile} className="hidden" />
          </div>
        </div>
      </div>

      {displayCategories.length === 0 ? (
        <Card><Empty text={kw ? `没有找到与"${searchKeyword}"匹配的商品` : '暂无商品分类，点击右上角添加'} icon="🍜" /></Card>
      ) : displayCategories.map(cat => (
        <Card key={cat.id} className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b">
            <div className="flex items-center gap-3">
              <button onClick={() => setExpanded(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))} className="text-gray-500 hover:text-gray-700 w-6 text-center">
                {expanded[cat.id] ? '▼' : '▶'}
              </button>
              <h3 className="font-bold text-gray-800 text-lg">{cat.name}</h3>
              {cat.name_en && <span className="text-xs text-gray-400">{cat.name_en}</span>}
              {cat.id !== 0 && <Badge variant={cat.enabled ? 'success' : 'default'}>{cat.enabled ? '启用中' : '已禁用'}</Badge>}
              <span className="text-xs text-gray-400">{cat.products?.length || 0} 个商品</span>
              {expanded[cat.id] && cat.products?.length > 0 && (
                <label className="flex items-center gap-1 cursor-pointer text-xs text-gray-500">
                  <input type="checkbox" checked={cat.products.every(p => selectedIds.has(p.id))} onChange={() => toggleSelectAll(cat.products)} className="w-3.5 h-3.5" />
                  全选
                </label>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <Button size="sm" variant="outline" className="border-indigo-300 text-indigo-600 hover:bg-indigo-50" onClick={openBatchMove}>
                  批量移动 ({selectedIds.size})
                </Button>
              )}
              {cat.id !== 0 && (
                <>
                  <Button size="sm" variant="outline" onClick={() => toggleCategory(cat)}>{cat.enabled ? '禁用' : '启用'}</Button>
                  <Button size="sm" variant="outline" onClick={() => setCatDialog({ mode: 'edit', data: { ...cat } })}>编辑分类</Button>
                </>
              )}
              <Button size="sm" onClick={() => setProductDialog({ mode: 'add', data: { name: '', name_en: '', category_id: cat.id || '', price: '', description: '', description_en: '', image: '', available: true, is_recommend: false, sort_order: 0 } })}>+ 商品</Button>
              {cat.id !== 0 && <button onClick={() => deleteCategory(cat)} className="text-red-400 hover:text-red-600 text-sm px-2">删除</button>}
            </div>
          </div>

          {expanded[cat.id] && (
            <div className="p-5">
              {(!cat.products || cat.products.length === 0) ? (
                <Empty text="该分类下暂无商品，点击右上角 + 商品 添加" icon="🍜" />
              ) : (
                <Table
                  columns={productColumns}
                  data={cat.products}
                  actions={p => (
                    <div className="flex items-center gap-3">
                      <button onClick={() => setMoveDialog({ products: [p], targetCategoryId: p.category_id || '' })} className="text-xs text-indigo-600 hover:text-indigo-700">移动</button>
                      <button onClick={() => toggleProduct(p)} className={`text-xs ${p.available ? 'text-yellow-600 hover:text-yellow-700' : 'text-green-600 hover:text-green-700'}`}>{p.available ? '下架' : '上架'}</button>
                      <button onClick={() => setProductDialog({ mode: 'edit', data: { ...p } })} className="text-xs text-primary-600 hover:text-primary-700">编辑</button>
                      <button onClick={() => deleteProduct(p)} className="text-xs text-red-400 hover:text-red-600">删除</button>
                    </div>
                  )}
                />
              )}
            </div>
          )}
        </Card>
      ))}

      <Dialog open={!!catDialog} onClose={() => setCatDialog(null)} title={catDialog?.mode === 'add' ? '新增分类' : '编辑分类'} width="max-w-sm">
        {catDialog && (
          <div className="space-y-4">
            <Input label="分类名称 *" value={catDialog.data.name} onChange={e => setCatDialog({ ...catDialog, data: { ...catDialog.data, name: e.target.value } })} placeholder="如：烧烤、奶茶、小吃" />
            <Input label="英文名" value={catDialog.data.name_en} onChange={e => setCatDialog({ ...catDialog, data: { ...catDialog.data, name_en: e.target.value } })} placeholder="如：BBQ、Milk Tea" />
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

      <Dialog open={!!productDialog} onClose={() => setProductDialog(null)} title={productDialog?.mode === 'add' ? '新增商品' : '编辑商品'} width="max-w-2xl">
        {productDialog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="商品名称 *" value={productDialog.data.name} onChange={e => setProductDialog({ ...productDialog, data: { ...productDialog.data, name: e.target.value } })} />
              <Input label="英文名" value={productDialog.data.name_en} onChange={e => setProductDialog({ ...productDialog, data: { ...productDialog.data, name_en: e.target.value } })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Select label="分类" value={productDialog.data.category_id || ''} onChange={e => setProductDialog({ ...productDialog, data: { ...productDialog.data, category_id: e.target.value } })} options={[{ value: '', label: '未分类' }, ...categories.filter(c => c.id !== 0).map(c => ({ value: c.id, label: c.name }))]} />
              <Input label="价格 * ($)" type="number" step="0.01" value={productDialog.data.price} onChange={e => setProductDialog({ ...productDialog, data: { ...productDialog.data, price: e.target.value } })} />
              <Input label="排序" type="number" value={productDialog.data.sort_order} onChange={e => setProductDialog({ ...productDialog, data: { ...productDialog.data, sort_order: parseInt(e.target.value) || 0 } })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">商品图片</label>
              <div className="flex gap-2">
                <input type="text" value={productDialog.data.image} onChange={e => setProductDialog({ ...productDialog, data: { ...productDialog.data, image: e.target.value } })} placeholder="https://... 或 /uploads/images/xxx.jpg" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                <Button variant="outline" onClick={() => productImageInputRef.current?.click()}>上传图片</Button>
                <input ref={productImageInputRef} type="file" accept="image/*" onChange={handleProductImageUpload} className="hidden" />
              </div>
              {productDialog.data.image && (
                <div className="mt-2">
                  <img src={productDialog.data.image} alt="预览" className="w-24 h-24 object-cover rounded-lg border" />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Textarea label="描述" value={productDialog.data.description} onChange={e => setProductDialog({ ...productDialog, data: { ...productDialog.data, description: e.target.value } })} rows={2} />
              <Textarea label="英文描述" value={productDialog.data.description_en} onChange={e => setProductDialog({ ...productDialog, data: { ...productDialog.data, description_en: e.target.value } })} rows={2} />
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={productDialog.data.available} onChange={e => setProductDialog({ ...productDialog, data: { ...productDialog.data, available: e.target.checked } })} className="w-4 h-4" />
                <span className="text-sm text-gray-700">在售</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={productDialog.data.is_recommend} onChange={e => setProductDialog({ ...productDialog, data: { ...productDialog.data, is_recommend: e.target.checked } })} className="w-4 h-4" />
                <span className="text-sm text-gray-700">推荐商品</span>
              </label>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setProductDialog(null)}>取消</Button>
              <Button className="flex-1" onClick={saveProduct}>保存</Button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog open={!!moveDialog} onClose={() => setMoveDialog(null)} title={moveDialog?.products.length > 1 ? `批量移动 ${moveDialog.products.length} 个商品` : '移动商品到分类'} width="max-w-sm">
        {moveDialog && (
          <div className="space-y-4">
            {moveDialog.products.length === 1 ? (
              <p className="text-sm text-gray-600">商品：<span className="font-medium text-gray-800">{moveDialog.products[0].name}</span></p>
            ) : (
              <div className="text-sm text-gray-600 max-h-32 overflow-y-auto space-y-1">
                {moveDialog.products.map(p => <p key={p.id} className="truncate">• {p.name}</p>)}
              </div>
            )}
            <Select label="目标分类" value={moveDialog.targetCategoryId} onChange={e => setMoveDialog({ ...moveDialog, targetCategoryId: e.target.value })} options={[{ value: '', label: '未分类' }, ...categories.filter(c => c.id !== 0).map(c => ({ value: c.id, label: c.name }))]} />
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setMoveDialog(null)}>取消</Button>
              <Button className="flex-1" onClick={confirmMove}>确认移动</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
