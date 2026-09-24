import { useState, useEffect, useRef } from 'react'
import { api } from '../../lib/api'
import { useLanguage } from '../../context/LanguageContext'
import { Card, Button, Table, Badge, Dialog, Input, Textarea, Select, Empty, toast } from '../../components/ui'
import { useConfirm } from '../../components/ConfirmDialog'

export default function Products() {
  // 商品管理：分类CRUD + 商品CRUD + 配料管理 + 批量移动 + Excel导入导出 + 模糊搜索
  const confirm = useConfirm()
  const { t } = useLanguage()
  const [categories, setCategories] = useState([])
  const [expanded, setExpanded] = useState({})
  const [catDialog, setCatDialog] = useState(null)
  const [productDialog, setProductDialog] = useState(null)
  const [moveDialog, setMoveDialog] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [searchKeyword, setSearchKeyword] = useState('')
  const [ingredients, setIngredients] = useState([])
  const [goodsList, setGoodsList] = useState([])
  const fileInputRef = useRef(null)
  const productImageInputRef = useRef(null)

  // 加载货物列表（用于配料选择）
  useEffect(() => {
    api.getGoods({}).then(data => {
      setGoodsList(Array.isArray(data) ? data : [])
    }).catch(() => {})
  }, [])

  // 打开编辑弹窗时加载配料
  const openEditProduct = async (product) => {
    setProductDialog({ mode: 'edit', data: { ...product } })
    try {
      const data = await api.getProductIngredients(product.id)
      setIngredients(Array.isArray(data) ? data : [])
    } catch (e) {
      setIngredients([])
    }
  }

  // 打开新增弹窗时清空配料
  const openAddProduct = (categoryId = '') => {
    setProductDialog({ mode: 'add', data: { name: '', name_en: '', category_id: categoryId, price: '', description: '', description_en: '', image: '', available: 1, is_recommend: 0, sort_order: 0 } })
    setIngredients([])
  }

  // 添加配料行
  const addIngredient = () => {
    setIngredients(prev => [...prev, { goods_id: '', goods_name: '', quantity: 1, unit: '个' }])
  }

  // 更新配料行
  const updateIngredient = (index, field, value) => {
    setIngredients(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      if (field === 'goods_id') {
        const goods = goodsList.find(g => g.id === Number(value))
        if (goods) {
          next[index].goods_name = goods.name
          next[index].unit = goods.unit || '个'
        }
      }
      return next
    })
  }

  // 删除配料行
  const removeIngredient = (index) => {
    setIngredients(prev => prev.filter((_, i) => i !== index))
  }

  // 上传商品图片到服务器并更新表单中的图片URL
  const handleProductImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = await api.uploadImage(file)
      if (data?.url) {
        setProductDialog(prev => ({ ...prev, data: { ...prev.data, image: data.url } }))
        toast(t('products.uploadSuccess', '图片上传成功'))
      }
    } catch (err) { toast(err.message, 'error') }
    e.target.value = ''
  }

  // 切换单个商品的勾选状态
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // 全选/取消全选当前分类下的商品
  const toggleSelectAll = (products) => {
    const allSelected = products.every(p => selectedIds.has(p.id))
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (allSelected) products.forEach(p => next.delete(p.id))
      else products.forEach(p => next.add(p.id))
      return next
    })
  }

  // 清空所有已选商品
  const clearSelection = () => setSelectedIds(new Set())

  // 下载Excel导入模板
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

  // 导出全部商品为Excel文件
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

  // 上传Excel文件导入商品，发现重复时弹确认框询问是否跳过
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
      if (!res.ok) throw new Error(data.error || t('products.importFailed', '导入失败'))
      if (data.needConfirm) {
        const dupList = data.duplicates.map(d => `${t('products.rowPrefix', '第')}${d.row}${t('products.rowSuffix', '行：')}${d.name}（${d.category}）`).join('\n')
        if (await confirm({ title: t('products.duplicateTitle', '发现重复商品'), message: `${t('products.duplicateCountPrefix', '发现')} ${data.duplicateCount} ${t('products.duplicateCountSuffix', '个重复商品：')}\n\n${dupList}\n\n${t('products.duplicateMessagePrefix', '是否跳过重复项，继续导入其余')} ${data.totalRows - data.duplicateCount} ${t('products.duplicateMessageSuffix', '条？')}`, variant: 'warning', confirmText: t('products.skipAndContinue', '跳过并继续'), cancelText: t('products.cancelImport', '取消导入') })) {
          handleImportFile(e, true)
          return
        }
        e.target.value = ''
        return
      }
      toast(`${t('products.importSuccessPrefix', '导入成功：')}${data.success} ${t('products.importSuccessMid', '条，失败')} ${data.failed} ${t('products.recordsUnit', '条')}${data.skipped ? `${t('products.importSkippedPrefix', '，跳过重复')} ${data.skipped} ${t('products.recordsUnit', '条')}` : ''}${data.errors?.length ? '，' + data.errors[0] : ''}`)
      load()
    } catch (err) { toast(err.message, 'error') }
    e.target.value = ''
  }

  useEffect(() => { load() }, [])

  // 加载全部分类和商品，组装成树形结构（分类→商品列表）
  const load = () => {
    Promise.all([api.getAllCategories(), api.getAllProducts()]).then(([cats, prods]) => {
      const categoryList = Array.isArray(cats) ? cats : []
      const productList = Array.isArray(prods) ? prods : []
      const withProducts = categoryList.map(c => ({
        ...c,
        products: productList.filter(p => p.category_id === c.id)
      }))
      // 未分类商品
      const uncategorized = productList.filter(p => !p.category_id)
      if (uncategorized.length > 0) {
        withProducts.push({ id: 0, name: t('products.uncategorized', '未分类'), name_en: 'Uncategorized', enabled: 1, sort_order: 999, products: uncategorized })
      }
      setCategories(withProducts)
      if (withProducts.length > 0) setExpanded(prev => ({ ...prev, [withProducts[0].id]: true }))
    }).catch(() => {})
  }

  // 保存分类（新增或更新）
  const saveCategory = async () => {
    const { mode, data } = catDialog
    const name = data.name.trim()
    if (!name) { toast(t('products.enterCategoryName', '请填写分类名称'), 'error'); return }
    try {
      const payload = { name, name_en: data.name_en || '', sort_order: data.sort_order || 0, enabled: data.enabled ? 1 : 0 }
      if (mode === 'add') { await api.createCategory(payload); toast(t('products.categoryAdded', '分类已添加')) }
      else { await api.updateCategory(data.id, payload); toast(t('products.categoryUpdated', '分类已更新')) }
      setCatDialog(null); load()
    } catch (e) { toast(e.message, 'error') }
  }

  // 启用/禁用分类
  const toggleCategory = async (cat) => {
    if (cat.id === 0) return
    await api.updateCategory(cat.id, { enabled: cat.enabled ? 0 : 1 })
    toast(cat.enabled ? t('products.categoryDisabled', '已禁用该分类') : t('products.categoryEnabled', '已启用该分类'))
    load()
  }

  // 删除分类（需确认，分类下商品变为未分类）
  const deleteCategory = async (cat) => {
    if (cat.id === 0) return
    if (!await confirm({ title: t('products.deleteCategory', '删除分类'), message: `${t('products.deleteCategoryMessage', '确定删除分类')}"${cat.name}"${t('products.deleteCategorySuffix', '吗？分类下商品将变为未分类。')}`, variant: 'danger' })) return
    try { await api.deleteCategory(cat.id); toast(t('products.categoryDeleted', '分类已删除')); load() } catch (e) { toast(e.message, 'error') }
  }

  // 保存商品（新增或更新），同时保存配料关联
  const saveProduct = async () => {
    const { mode, data } = productDialog
    if (!data.name.trim() || data.price === '') { toast(t('products.namePriceRequired', '名称和价格必填'), 'error'); return }
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
      let productId = data.id
      if (mode === 'add') {
        const result = await api.createProduct(payload)
        productId = result.id
        toast(t('products.productAdded', '商品已添加'))
      } else {
        await api.updateProduct(data.id, payload)
        toast(t('products.productUpdated', '商品已更新'))
      }
      // 保存配料
      if (productId && ingredients.length > 0) {
        const validIngredients = ingredients.filter(i => i.goods_id && i.quantity > 0)
        if (validIngredients.length > 0) {
          await api.saveProductIngredients(productId, validIngredients)
        }
      }
      setProductDialog(null); load()
    } catch (e) { toast(e.message, 'error') }
  }

  // 上架/下架单个商品
  const toggleProduct = async (p) => {
    await api.updateProduct(p.id, { available: p.available ? 0 : 1 })
    toast(p.available ? t('products.offShelf', '已下架') : t('products.onShelf', '已上架'))
    load()
  }

  // 删除单个商品（需确认）
  const deleteProduct = async (p) => {
    if (!await confirm({ title: t('products.deleteProduct', '删除商品'), message: `${t('products.deleteProductMessage', '确定删除商品')}"${p.name}"${t('products.deleteProductSuffix', '吗？')}`, variant: 'danger' })) return
    await api.deleteProduct(p.id); toast(t('products.productDeleted', '商品已删除')); load()
  }

  // 确认批量移动商品到目标分类
  const confirmMove = async () => {
    const { products, targetCategoryId } = moveDialog
    try {
      await Promise.all(products.map(p => api.updateProduct(p.id, { category_id: targetCategoryId || null })))
      const targetName = categories.find(c => c.id === Number(targetCategoryId))?.name || t('products.uncategorized', '未分类')
      toast(`${t('products.movedPrefix', '已移动')} ${products.length} ${t('products.movedMiddle', '个商品到「')}${targetName}」`)
      setMoveDialog(null)
      clearSelection()
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  // 打开批量移动弹窗（从已选商品中获取列表）
  const openBatchMove = () => {
    const selectedProducts = categories.flatMap(c => c.products || []).filter(p => selectedIds.has(p.id))
    if (selectedProducts.length === 0) { toast(t('products.selectProductsFirst', '请先选择商品'), 'error'); return }
    setMoveDialog({ products: selectedProducts, targetCategoryId: '' })
  }

  const productColumns = [
    { header: '', render: p => (
      <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} className="w-4 h-4 cursor-pointer" />
    )},
    { header: t('products.product', '商品'), render: p => (
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
    { header: t('products.price', '价格'), render: p => <span className="font-medium text-primary-600">${parseFloat(p.price).toFixed(2)}</span> },
    { header: t('products.recommend', '推荐'), render: p => p.is_recommend ? <Badge variant="danger">{t('products.recommend', '推荐')}</Badge> : <span className="text-gray-300">-</span> },
    { header: t('products.sortOrder', '排序'), render: p => <span className="text-gray-500 text-sm">{p.sort_order}</span> },
    { header: t('common.status', '状态'), render: p => p.available ? <Badge variant="success">{t('products.onSale', '在售')}</Badge> : <Badge variant="default">{t('products.offShelfShort', '下架')}</Badge> }
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
          <h2 className="text-xl font-bold text-gray-800">{t('products.title', '商品管理')}</h2>
          <p className="text-sm text-gray-400 mt-1">{t('products.subtitle', '按分类管理商品，点击分类展开查看商品列表')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              placeholder={t('products.searchPlaceholder', '搜索商品名称/描述...')}
              className="w-64 pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            {searchKeyword && (
              <button onClick={() => setSearchKeyword('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">✕</button>
            )}
          </div>
          <Button onClick={() => setCatDialog({ mode: 'add', data: { name: '', name_en: '', sort_order: 0, enabled: true } })}>+ {t('products.addCategory', '新增分类')}</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadTemplate}>{t('products.downloadTemplate', '下载模板')}</Button>
            <Button variant="outline" onClick={exportProducts}>{t('products.export', '导出')}</Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>{t('products.import', '导入')}</Button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportFile} className="hidden" />
          </div>
        </div>
      </div>

      {displayCategories.length === 0 ? (
        <Card><Empty text={kw ? `${t('products.noMatchPrefix', '没有找到与')}"${searchKeyword}"${t('products.noMatchSuffix', '匹配的商品')}` : t('products.noCategories', '暂无商品分类，点击右上角添加')} icon="🍜" /></Card>
      ) : displayCategories.map(cat => {
        // 计算当前分类下被选中的商品数量
        const catSelectedCount = (cat.products || []).filter(p => selectedIds.has(p.id)).length
        return (
        <Card key={cat.id} className="overflow-hidden">
          {/* 分类头部 */}
          <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b">
            <div className="flex items-center gap-3">
              <button onClick={() => setExpanded(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))} className="text-gray-500 hover:text-gray-700 w-6 text-center">
                {expanded[cat.id] ? '▼' : '▶'}
              </button>
              <h3 className="font-bold text-gray-800 text-lg">{cat.name}</h3>
              {cat.name_en && <span className="text-xs text-gray-400">{cat.name_en}</span>}
              {cat.id !== 0 && <Badge variant={cat.enabled ? 'success' : 'default'}>{cat.enabled ? t('products.enabled', '启用中') : t('products.disabled', '已禁用')}</Badge>}
              <span className="text-xs text-gray-400">{cat.products?.length || 0} {t('products.productsCountSuffix', '个商品')}</span>
              {expanded[cat.id] && cat.products?.length > 0 && (
                <label className="flex items-center gap-1 cursor-pointer text-xs text-gray-500">
                  <input type="checkbox" checked={cat.products.every(p => selectedIds.has(p.id))} onChange={() => toggleSelectAll(cat.products)} className="w-3.5 h-3.5" />
                  {t('common.selectAll', '全选')}
                </label>
              )}
            </div>
            <div className="flex items-center gap-2">
              {catSelectedCount > 0 && (
                <Button size="sm" variant="outline" className="border-indigo-300 text-indigo-600 hover:bg-indigo-50" onClick={openBatchMove}>
                  {t('products.batchMovePrefix', '批量移动 (')}{catSelectedCount})
                </Button>
              )}
              {cat.id !== 0 && (
                <>
                  <Button size="sm" variant="outline" onClick={() => toggleCategory(cat)}>{cat.enabled ? t('common.disable', '禁用') : t('common.enable', '启用')}</Button>
                  <Button size="sm" variant="outline" onClick={() => setCatDialog({ mode: 'edit', data: { ...cat } })}>{t('products.editCategory', '编辑分类')}</Button>
                </>
              )}
              <Button size="sm" onClick={() => openAddProduct(cat.id || '')}>+ {t('products.addProduct', '商品')}</Button>
              {cat.id !== 0 && <button onClick={() => deleteCategory(cat)} className="text-red-400 hover:text-red-600 text-sm px-2">{t('common.delete', '删除')}</button>}
            </div>
          </div>

          {/* 展开的商品列表 */}
          {expanded[cat.id] && (
            <div className="p-5">
              {(!cat.products || cat.products.length === 0) ? (
                <Empty text={t('products.noProductsInCategory', '该分类下暂无商品，点击右上角 + 商品 添加')} icon="🍜" />
              ) : (
                <Table
                  columns={productColumns}
                  data={cat.products}
                  actions={p => (
                    <div className="flex items-center gap-3">
                      <button onClick={() => setMoveDialog({ products: [p], targetCategoryId: p.category_id || '' })} className="text-xs text-indigo-600 hover:text-indigo-700">{t('products.move', '移动')}</button>
                      <button onClick={() => toggleProduct(p)} className={`text-xs ${p.available ? 'text-yellow-600 hover:text-yellow-700' : 'text-green-600 hover:text-green-700'}`}>{p.available ? t('products.offShelfShort', '下架') : t('products.onShelfShort', '上架')}</button>
                      <button onClick={() => openEditProduct(p)} className="text-xs text-primary-600 hover:text-primary-700">{t('common.edit', '编辑')}</button>
                      <button onClick={() => deleteProduct(p)} className="text-xs text-red-400 hover:text-red-600">{t('common.delete', '删除')}</button>
                    </div>
                  )}
                />
              )}
            </div>
          )}
        </Card>
        )
      })}

      {/* 分类对话框 */}
      <Dialog open={!!catDialog} onClose={() => setCatDialog(null)} title={catDialog?.mode === 'add' ? t('products.addCategory', '新增分类') : t('products.editCategory', '编辑分类')} width="max-w-sm">
        {catDialog && (
          <div className="space-y-4">
            <Input label={t('products.categoryName', '分类名称 *')} value={catDialog.data.name} onChange={e => setCatDialog({ ...catDialog, data: { ...catDialog.data, name: e.target.value } })} placeholder={t('products.categoryNamePlaceholder', '如：烧烤、奶茶、小吃')} />
            <Input label={t('products.englishName', '英文名')} value={catDialog.data.name_en} onChange={e => setCatDialog({ ...catDialog, data: { ...catDialog.data, name_en: e.target.value } })} placeholder={t('products.englishNamePlaceholder', '如：BBQ、Milk Tea')} />
            <Input label={t('products.sortOrder', '排序')} type="number" value={catDialog.data.sort_order} onChange={e => setCatDialog({ ...catDialog, data: { ...catDialog.data, sort_order: parseInt(e.target.value) || 0 } })} />
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={catDialog.data.enabled} onChange={e => setCatDialog({ ...catDialog, data: { ...catDialog.data, enabled: e.target.checked } })} className="w-4 h-4" />
              <span className="text-sm text-gray-700">{t('products.enableCategoryHint', '启用该分类（禁用后前台不显示）')}</span>
            </label>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setCatDialog(null)}>{t('common.cancel', '取消')}</Button>
              <Button className="flex-1" onClick={saveCategory}>{t('common.save', '保存')}</Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* 商品对话框 */}
      <Dialog open={!!productDialog} onClose={() => setProductDialog(null)} title={productDialog?.mode === 'add' ? t('products.addProductTitle', '新增商品') : t('products.editProductTitle', '编辑商品')} width="max-w-2xl">
        {productDialog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label={t('products.productName', '商品名称 *')} value={productDialog.data.name} onChange={e => setProductDialog({ ...productDialog, data: { ...productDialog.data, name: e.target.value } })} />
              <Input label={t('products.englishName', '英文名')} value={productDialog.data.name_en} onChange={e => setProductDialog({ ...productDialog, data: { ...productDialog.data, name_en: e.target.value } })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Select label={t('products.category', '分类')} value={productDialog.data.category_id || ''} onChange={e => setProductDialog({ ...productDialog, data: { ...productDialog.data, category_id: e.target.value } })}
                options={[{ value: '', label: t('products.uncategorized', '未分类') }, ...categories.filter(c => c.id !== 0).map(c => ({ value: c.id, label: c.name }))]} />
              <Input label={t('products.priceRequired', '价格 * ($)')} type="number" step="0.01" value={productDialog.data.price} onChange={e => setProductDialog({ ...productDialog, data: { ...productDialog.data, price: e.target.value } })} />
              <Input label={t('products.sortOrder', '排序')} type="number" value={productDialog.data.sort_order} onChange={e => setProductDialog({ ...productDialog, data: { ...productDialog.data, sort_order: parseInt(e.target.value) || 0 } })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('products.productImage', '商品图片')}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={productDialog.data.image}
                  onChange={e => setProductDialog({ ...productDialog, data: { ...productDialog.data, image: e.target.value } })}
                  placeholder={t('products.imageUrlPlaceholder', 'https://... or /uploads/images/xxx.jpg')}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <Button variant="outline" onClick={() => productImageInputRef.current?.click()}>{t('products.uploadImage', '上传图片')}</Button>
                <input ref={productImageInputRef} type="file" accept="image/*" onChange={handleProductImageUpload} className="hidden" />
              </div>
              {productDialog.data.image && (
                <div className="mt-2">
                  <img src={productDialog.data.image} alt={t('products.preview', '预览')} className="w-24 h-24 object-cover rounded-lg border" />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Textarea label={t('products.description', '描述')} value={productDialog.data.description} onChange={e => setProductDialog({ ...productDialog, data: { ...productDialog.data, description: e.target.value } })} rows={2} />
              <Textarea label={t('products.englishDescription', '英文描述')} value={productDialog.data.description_en} onChange={e => setProductDialog({ ...productDialog, data: { ...productDialog.data, description_en: e.target.value } })} rows={2} />
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={productDialog.data.available} onChange={e => setProductDialog({ ...productDialog, data: { ...productDialog.data, available: e.target.checked } })} className="w-4 h-4" />
                <span className="text-sm text-gray-700">{t('products.onSale', '在售')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={productDialog.data.is_recommend} onChange={e => setProductDialog({ ...productDialog, data: { ...productDialog.data, is_recommend: e.target.checked } })} className="w-4 h-4" />
                <span className="text-sm text-gray-700">{t('products.recommendProduct', '推荐商品')}</span>
              </label>
            </div>

            {/* 配料管理 */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">{t('products.ingredientManagement', '🧂 配料管理（下单自动扣减库存）')}</h3>
                <Button size="sm" variant="outline" onClick={addIngredient}>+ {t('products.addIngredient', '添加配料')}</Button>
              </div>
              {ingredients.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">{t('products.noIngredients', '暂无配料，点击上方按钮添加')}</p>
              ) : (
                <div className="space-y-2">
                  {ingredients.map((ing, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={ing.goods_id}
                        onChange={e => updateIngredient(idx, 'goods_id', e.target.value)}
                        className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">{t('products.selectGoods', '选择货物...')}</option>
                        {goodsList.map(g => (
                          <option key={g.id} value={g.id}>{g.name} ({g.unit})</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={ing.quantity}
                        onChange={e => updateIngredient(idx, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder={t('products.quantity', '用量')}
                      />
                      <span className="text-xs text-gray-500 w-8">{ing.unit}</span>
                      <button onClick={() => removeIngredient(idx)} className="text-red-500 hover:text-red-700 text-sm px-2">✕</button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2">{t('products.ingredientExample', '💡 例：一杯奶茶用 0.05 磅茶叶、0.2 杯牛奶，下单后自动扣减对应库存')}</p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setProductDialog(null)}>{t('common.cancel', '取消')}</Button>
              <Button className="flex-1" onClick={saveProduct}>{t('common.save', '保存')}</Button>
            </div>
          </div>
        )}
      </Dialog>
      {/* 移动分类弹窗 */}
      <Dialog open={!!moveDialog} onClose={() => setMoveDialog(null)} title={moveDialog?.products.length > 1 ? `${t('products.batchMoveTitle', '批量移动')} ${moveDialog.products.length} ${t('products.batchMoveTitleSuffix', '个商品')}` : t('products.moveProductTitle', '移动商品到分类')} width="max-w-sm">
        {moveDialog && (
          <div className="space-y-4">
            {moveDialog.products.length === 1 ? (
              <p className="text-sm text-gray-600">{t('products.productLabel', '商品：')}<span className="font-medium text-gray-800">{moveDialog.products[0].name}</span></p>
            ) : (
              <div className="text-sm text-gray-600 max-h-32 overflow-y-auto space-y-1">
                {moveDialog.products.map(p => <p key={p.id} className="truncate">• {p.name}</p>)}
              </div>
            )}
            <Select label={t('products.targetCategory', '目标分类')} value={moveDialog.targetCategoryId} onChange={e => setMoveDialog({ ...moveDialog, targetCategoryId: e.target.value })}
              options={[{ value: '', label: t('products.uncategorized', '未分类') }, ...categories.filter(c => c.id !== 0).map(c => ({ value: c.id, label: c.name }))]} />
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setMoveDialog(null)}>{t('common.cancel', '取消')}</Button>
              <Button className="flex-1" onClick={confirmMove}>{t('products.confirmMove', '确认移动')}</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
