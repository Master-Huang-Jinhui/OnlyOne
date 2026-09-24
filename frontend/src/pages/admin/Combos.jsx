import { useState, useEffect, useRef } from 'react'
import { api } from '../../lib/api'
import { useLanguage } from '../../context/LanguageContext'
import { Card, Button, Table, Badge, Dialog, Input, Textarea, Select, Empty, toast } from '../../components/ui'
import { useConfirm } from '../../components/ConfirmDialog'

export default function Combos() {
  // 组合套餐管理：CRUD + 套餐内容选择 + 图片上传 + 上下架
  const confirm = useConfirm()
  const { t } = useLanguage()
  const [combos, setCombos] = useState([])
  const [products, setProducts] = useState([])
  const [dialog, setDialog] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => { load(); loadProducts() }, [])

  // 加载套餐列表
  const load = () => {
    api.getCombos().then(data => setCombos(Array.isArray(data) ? data : [])).catch(() => {})
  }

  // 加载所有商品（用于选择套餐包含项）
  const loadProducts = () => {
    api.getAllProducts().then(data => setProducts(Array.isArray(data) ? data : [])).catch(() => {})
  }

  // 打开新增套餐弹窗
  const openAdd = () => {
    setDialog({ mode: 'add', data: { name: '', name_en: '', price: '', items: [], description: '', description_en: '', image: '', available: true, sort_order: 0 } })
  }

  // 打开编辑套餐弹窗
  const openEdit = (combo) => {
    setDialog({ mode: 'edit', data: { ...combo, items: combo.items || [] } })
  }

  // 添加套餐包含的商品
  const addItem = (productId) => {
    if (!productId) return
    const p = products.find(x => x.id === Number(productId))
    if (!p) return
    setDialog(prev => {
      const exists = prev.data.items.find(i => i.product_id === p.id)
      if (exists) {
        return { ...prev, data: { ...prev.data, items: prev.data.items.map(i => i.product_id === p.id ? { ...i, quantity: (i.quantity || 1) + 1 } : i) } }
      }
      return { ...prev, data: { ...prev.data, items: [...prev.data.items, { product_id: p.id, product_name: p.name, quantity: 1 }] } }
    })
  }

  // 更新套餐内商品数量
  const updateItemQty = (index, qty) => {
    setDialog(prev => ({
      ...prev,
      data: { ...prev.data, items: prev.data.items.map((item, i) => i === index ? { ...item, quantity: Math.max(1, parseInt(qty) || 1) } : item) }
    }))
  }

  // 移除套餐内商品
  const removeItem = (index) => {
    setDialog(prev => ({ ...prev, data: { ...prev.data, items: prev.data.items.filter((_, i) => i !== index) } }))
  }

  // 上传套餐图片
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = await api.uploadImage(file)
      if (data?.url) {
        setDialog(prev => ({ ...prev, data: { ...prev.data, image: data.url } }))
        toast('图片上传成功')
      }
    } catch (err) { toast(err.message, 'error') }
    e.target.value = ''
  }

  // 保存套餐（新增或编辑）
  const save = async () => {
    const { mode, data } = dialog
    if (!data.name.trim() || data.price === '') { toast('名称和价格必填', 'error'); return }
    try {
      const payload = {
        name: data.name.trim(),
        name_en: data.name_en || '',
        price: parseFloat(data.price),
        items: data.items || [],
        description: data.description || '',
        description_en: data.description_en || '',
        image: data.image || '',
        available: data.available ? 1 : 0,
        sort_order: data.sort_order || 0
      }
      if (mode === 'add') {
        await api.createCombo(payload)
        toast('套餐已添加')
      } else {
        await api.updateCombo(data.id, payload)
        toast('套餐已更新')
      }
      setDialog(null); load()
    } catch (e) { toast(e.message, 'error') }
  }

  // 上下架套餐
  const toggleAvailable = async (combo) => {
    await api.updateCombo(combo.id, { ...combo, available: combo.available ? 0 : 1 })
    toast(combo.available ? '已下架' : '已上架')
    load()
  }

  // 删除套餐
  const removeCombo = async (combo) => {
    if (!await confirm({ title: '删除套餐', message: `确定删除套餐「${combo.name}」吗？`, variant: 'danger' })) return
    await api.deleteCombo(combo.id)
    toast('套餐已删除')
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">组合套餐</h2>
          <p className="text-sm text-gray-400 mt-1">创建套餐组合，包含多个商品，设置优惠价格</p>
        </div>
        <Button onClick={openAdd}>+ 新增套餐</Button>
      </div>

      {combos.length === 0 ? (
        <Card><Empty text="暂无套餐，点击右上角新增" icon="🍱" /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {combos.map(combo => (
            <Card key={combo.id} className="overflow-hidden">
              <div className="h-40 bg-gray-100 flex items-center justify-center overflow-hidden">
                {combo.image ? <img src={combo.image} alt="" className="w-full h-full object-cover" /> : <span className="text-5xl">🍱</span>}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-gray-800">{combo.name}</h3>
                  {combo.available ? <Badge variant="success">在售</Badge> : <Badge variant="default">下架</Badge>}
                </div>
                {combo.name_en && <p className="text-xs text-gray-400 mb-2">{combo.name_en}</p>}
                <p className="text-lg font-bold text-primary-600 mb-2">${parseFloat(combo.price).toFixed(2)}</p>
                <div className="text-xs text-gray-500 mb-3 space-y-1">
                  {(combo.items || []).map((item, i) => (
                    <p key={i}>• {item.product_name} × {item.quantity}</p>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(combo)}>编辑</Button>
                  <Button size="sm" variant="outline" onClick={() => toggleAvailable(combo)}>{combo.available ? '下架' : '上架'}</Button>
                  <button onClick={() => removeCombo(combo)} className="text-red-400 hover:text-red-600 text-sm px-2">删除</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 套餐编辑弹窗 */}
      <Dialog open={!!dialog} onClose={() => setDialog(null)} title={dialog?.mode === 'add' ? '新增套餐' : '编辑套餐'} width="max-w-2xl">
        {dialog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="套餐名称 *" value={dialog.data.name} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, name: e.target.value } })} />
              <Input label="英文名" value={dialog.data.name_en} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, name_en: e.target.value } })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input label="套餐价格 * ($)" type="number" step="0.01" value={dialog.data.price} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, price: e.target.value } })} />
              <Input label="排序" type="number" value={dialog.data.sort_order} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, sort_order: parseInt(e.target.value) || 0 } })} />
              <label className="flex items-end gap-2 cursor-pointer pb-2">
                <input type="checkbox" checked={dialog.data.available} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, available: e.target.checked } })} className="w-4 h-4" />
                <span className="text-sm text-gray-700">在售</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">套餐图片</label>
              <div className="flex gap-2">
                <input type="text" value={dialog.data.image} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, image: e.target.value } })} placeholder="图片URL" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>上传</Button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </div>
              {dialog.data.image && <img src={dialog.data.image} alt="" className="w-20 h-20 object-cover rounded-lg mt-2 border" />}
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">套餐包含商品</label>
                <select onChange={e => { addItem(e.target.value); e.target.value = '' }} className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm">
                  <option value="">+ 添加商品...</option>
                  {products.filter(p => p.available !== 0).map(p => (
                    <option key={p.id} value={p.id}>{p.name} (${parseFloat(p.price).toFixed(2)})</option>
                  ))}
                </select>
              </div>
              {dialog.data.items.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3 border border-dashed rounded-lg">从上方下拉选择商品添加到套餐</p>
              ) : (
                <div className="space-y-2">
                  {dialog.data.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      <span className="flex-1 text-sm text-gray-700">{item.product_name}</span>
                      <input type="number" min="1" value={item.quantity} onChange={e => updateItemQty(idx, e.target.value)} className="w-16 px-2 py-1 border border-gray-300 rounded text-sm" />
                      <span className="text-xs text-gray-400">份</span>
                      <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 text-sm px-1">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Textarea label="描述" value={dialog.data.description} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, description: e.target.value } })} rows={2} />
              <Textarea label="英文描述" value={dialog.data.description_en} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, description_en: e.target.value } })} rows={2} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setDialog(null)}>取消</Button>
              <Button className="flex-1" onClick={save}>保存</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
