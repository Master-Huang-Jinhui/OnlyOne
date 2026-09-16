import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Table, Badge, Dialog, Input, Select, Empty, toast } from '../../components/ui'
import { useConfirm } from '../../components/ConfirmDialog'
import { useLanguage } from '../../context/LanguageContext'

export default function Flavors() {
  const { t } = useLanguage()
  const confirm = useConfirm()
  const [categories, setCategories] = useState([])
  const [productCategories, setProductCategories] = useState([])
  const [catDialog, setCatDialog] = useState(null)
  const [tagDialog, setTagDialog] = useState(null)
  const [expanded, setExpanded] = useState({})

  useEffect(() => { load() }, [])

  // 加载口味分类列表和商品分类（用于关联适用商品）
  const load = () => {
    api.getAllFlavorCategories().then(data => {
      const list = Array.isArray(data) ? data : []
      setCategories(list)
      if (list.length > 0) setExpanded(prev => ({ ...prev, [list[0].id]: true }))
    }).catch(() => {})
    api.getAllCategories().then(data => setProductCategories(Array.isArray(data) ? data : [])).catch(() => {})
  }

  // 保存口味大类（新建或编辑）
  const saveCategory = async () => {
    const { mode, data } = catDialog
    const name = data.name.trim()
    if (!name) { toast(t('flavors.catNameRequired', '请填写分类名称'), 'error'); return }
    const categoryIds = Array.isArray(data.category_ids) ? data.category_ids : []
    try {
      if (mode === 'add') {
        await api.createFlavorCategory({ name, sort_order: data.sort_order || 0, enabled: data.enabled ? 1 : 0, category_ids: categoryIds })
        toast(t('flavors.catAdded', '分类已添加'))
      } else {
        await api.updateFlavorCategory(data.id, { name, sort_order: data.sort_order || 0, enabled: data.enabled ? 1 : 0, category_ids: categoryIds })
        toast(t('flavors.catUpdated', '分类已更新'))
      }
      setCatDialog(null)
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  // 切换口味大类启用/禁用
  const toggleCategory = async (cat) => {
    await api.updateFlavorCategory(cat.id, { enabled: cat.enabled ? 0 : 1 })
    toast(cat.enabled ? t('flavors.catDisabled', '已禁用该分类') : t('flavors.catEnabled', '已启用该分类'))
    load()
  }

  // 删除口味大类（需确认）
  const deleteCategory = async (cat) => {
    if (!await confirm({ title: t('flavors.confirmDeleteCatTitle', '删除分类'), message: `${t('flavors.confirmDeleteCatStart', '确定删除分类"')}${cat.name}${t('flavors.confirmDeleteCatEnd', '"吗？该分类下没有标签才能删除。')}`, variant: 'danger' })) return
    try {
      await api.deleteFlavorCategory(cat.id)
      toast(t('flavors.catDeleted', '分类已删除'))
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  // 保存口味标签（新建或编辑）
  const saveTag = async () => {
    const { mode, categoryId, data } = tagDialog
    const name = data.name.trim()
    if (!name) { toast(t('flavors.tagNameRequired', '请填写标签名称'), 'error'); return }
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
        toast(t('flavors.tagAdded', '标签已添加'))
      } else {
        await api.updateFlavorTag(data.id, payload)
        toast(t('flavors.tagUpdated', '标签已更新'))
      }
      setTagDialog(null)
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  // 切换口味标签启用/禁用
  const toggleTag = async (tag) => {
    await api.updateFlavorTag(tag.id, { enabled: tag.enabled ? 0 : 1 })
    toast(tag.enabled ? t('flavors.tagDisabled', '已禁用该标签') : t('flavors.tagEnabled', '已启用该标签'))
    load()
  }

  // 删除口味标签（需确认）
  const deleteTag = async (tag) => {
    if (!await confirm({ title: t('flavors.confirmDeleteTagTitle', '删除标签'), message: `${t('flavors.confirmDeleteTagStart', '确定删除标签"')}${tag.name}${t('flavors.confirmDeleteTagEnd', '"吗？')}`, variant: 'danger' })) return
    await api.deleteFlavorTag(tag.id)
    toast(t('flavors.tagDeleted', '标签已删除'))
    load()
  }

  const tagColumns = [
    { header: t('flavors.tagCol', '标签'), render: tag => <span className="font-medium text-gray-800">{tag.name}</span> },
    { header: t('flavors.extraPriceCol', '加价'), render: tag => tag.extra_price > 0 ? <span className="text-primary-600 font-medium">+${tag.extra_price.toFixed(2)}</span> : <span className="text-gray-400">-</span> },
    { header: t('flavors.defaultCol', '默认'), render: tag => tag.is_default ? <Badge variant="success">{t('flavors.defaultSelected', '默认选中')}</Badge> : <span className="text-gray-400">-</span> },
    { header: t('flavors.sortCol', '排序'), render: tag => <span className="text-gray-500">{tag.sort_order}</span> },
    { header: t('common.status', '状态'), render: tag => tag.enabled ? <Badge variant="success">{t('flavors.enabled', '启用')}</Badge> : <Badge variant="default">{t('flavors.disabled', '禁用')}</Badge> }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t('admin.flavors', '口味管理')}</h2>
          <p className="text-sm text-gray-400 mt-1">{t('flavors.desc', '管理口味大类和小类，可单独启用/禁用')}</p>
        </div>
        <Button onClick={() => setCatDialog({ mode: 'add', data: { name: '', sort_order: 0, enabled: true, category_ids: [] } })}>+ {t('flavors.addCategory', '新增大类')}</Button>
      </div>

      {categories.length === 0 ? (
        <Card><Empty text={t('flavors.empty', '暂无口味分类，点击右上角添加')} icon="🌶️" /></Card>
      ) : categories.map(cat => (
        <Card key={cat.id} className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b">
            <div className="flex items-center gap-3">
              <button onClick={() => setExpanded(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))} className="text-gray-500 hover:text-gray-700 w-6">
                {expanded[cat.id] ? '▼' : '▶'}
              </button>
              <h3 className="font-bold text-gray-800 text-lg">{cat.name}</h3>
              <Badge variant={cat.enabled ? 'success' : 'default'}>{cat.enabled ? t('flavors.enabledOn', '启用中') : t('flavors.disabledOff', '已禁用')}</Badge>
              <span className="text-xs text-gray-400">{cat.tags?.length || 0} {t('flavors.tagsUnit', '个标签')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => toggleCategory(cat)}>{cat.enabled ? t('flavors.disabled', '禁用') : t('flavors.enabled', '启用')}</Button>
              <Button size="sm" variant="outline" onClick={() => setCatDialog({ mode: 'edit', data: { ...cat, category_ids: cat.category_ids || [] } })}>{t('common.edit', '编辑')}</Button>
              <Button size="sm" variant="outline" onClick={() => setTagDialog({ mode: 'add', categoryId: cat.id, data: { name: '', extra_price: 0, is_default: false, sort_order: 0, enabled: true } })}>+ {t('flavors.addTag', '标签')}</Button>
              <button onClick={() => deleteCategory(cat)} className="text-red-400 hover:text-red-600 text-sm px-2">{t('common.delete', '删除')}</button>
            </div>
          </div>

          {expanded[cat.id] && (
            <div className="p-5">
              {(!cat.tags || cat.tags.length === 0) ? (
                <Empty text={t('flavors.noTags', '该分类下暂无标签，点击右上角 + 标签 添加')} icon="🏷️" />
              ) : (
                <Table
                  columns={tagColumns}
                  data={cat.tags}
                  actions={tag => (
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleTag(tag)} className={`text-xs ${tag.enabled ? 'text-yellow-600 hover:text-yellow-700' : 'text-green-600 hover:text-green-700'}`}>{tag.enabled ? t('flavors.disabled', '禁用') : t('flavors.enabled', '启用')}</button>
                      <button onClick={() => setTagDialog({ mode: 'edit', categoryId: cat.id, data: { ...tag } })} className="text-xs text-primary-600 hover:text-primary-700">{t('common.edit', '编辑')}</button>
                      <button onClick={() => deleteTag(tag)} className="text-xs text-red-400 hover:text-red-600">{t('common.delete', '删除')}</button>
                    </div>
                  )}
                />
              )}
            </div>
          )}
        </Card>
      ))}

      <Dialog open={!!catDialog} onClose={() => setCatDialog(null)} title={catDialog?.mode === 'add' ? t('flavors.addCategory', '新增大类') : t('flavors.editCategory', '编辑大类')} width="max-w-sm">
        {catDialog && (
          <div className="space-y-4">
            <Input label={t('flavors.catNameLabel', '大类名称 *')} value={catDialog.data.name} onChange={e => setCatDialog({ ...catDialog, data: { ...catDialog.data, name: e.target.value } })} placeholder={t('flavors.catNamePlaceholder', '如：冰度、辣度、甜度')} />
            <Input label={t('flavors.sortLabel', '排序')} type="number" value={catDialog.data.sort_order} onChange={e => setCatDialog({ ...catDialog, data: { ...catDialog.data, sort_order: parseInt(e.target.value) || 0 } })} />
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={catDialog.data.enabled} onChange={e => setCatDialog({ ...catDialog, data: { ...catDialog.data, enabled: e.target.checked } })} className="w-4 h-4" />
              <span className="text-sm text-gray-700">{t('flavors.enableCatHint', '启用该分类（禁用后前台不显示）')}</span>
            </label>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">{t('flavors.applicableProducts', '适用商品分类（不选表示全部分类适用）')}</p>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {productCategories.map(pc => {
                  const checked = (catDialog.data.category_ids || []).includes(pc.id)
                  return (
                    <label key={pc.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm cursor-pointer border transition ${checked ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-gray-200 text-gray-600 hover:border-primary-200'}`}>
                      <input type="checkbox" checked={checked} onChange={e => {
                        const current = catDialog.data.category_ids || []
                        const next = e.target.checked ? [...current, pc.id] : current.filter(id => id !== pc.id)
                        setCatDialog({ ...catDialog, data: { ...catDialog.data, category_ids: next } })
                      }} className="w-3.5 h-3.5" />
                      {pc.name}
                    </label>
                  )
                })}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setCatDialog(null)}>{t('common.cancel', '取消')}</Button>
              <Button className="flex-1" onClick={saveCategory}>{t('common.save', '保存')}</Button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog open={!!tagDialog} onClose={() => setTagDialog(null)} title={tagDialog?.mode === 'add' ? t('flavors.addTagTitle', '新增标签') : t('flavors.editTagTitle', '编辑标签')} width="max-w-sm">
        {tagDialog && (
          <div className="space-y-4">
            <div className="text-sm text-gray-500">{t('flavors.parentCat', '所属大类：')}<span className="font-medium text-gray-700">{categories.find(c => c.id === tagDialog.categoryId)?.name || '-'}</span></div>
            <Input label={t('flavors.tagNameLabel', '标签名称 *')} value={tagDialog.data.name} onChange={e => setTagDialog({ ...tagDialog, data: { ...tagDialog.data, name: e.target.value } })} placeholder={t('flavors.tagNamePlaceholder', '如：少冰、去冰、正常冰')} />
            <Input label={t('flavors.extraPriceLabel', '额外加价 ($)')} type="number" step="0.01" value={tagDialog.data.extra_price} onChange={e => setTagDialog({ ...tagDialog, data: { ...tagDialog.data, extra_price: e.target.value } })} placeholder={t('flavors.extraPricePlaceholder', '0 表示不加价')} />
            <Input label={t('flavors.sortLabel', '排序')} type="number" value={tagDialog.data.sort_order} onChange={e => setTagDialog({ ...tagDialog, data: { ...tagDialog.data, sort_order: parseInt(e.target.value) || 0 } })} />
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={tagDialog.data.is_default} onChange={e => setTagDialog({ ...tagDialog, data: { ...tagDialog.data, is_default: e.target.checked } })} className="w-4 h-4" />
              <span className="text-sm text-gray-700">{t('flavors.defaultHint', '默认选中（商品加入购物车时自动带上）')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={tagDialog.data.enabled} onChange={e => setTagDialog({ ...tagDialog, data: { ...tagDialog.data, enabled: e.target.checked } })} className="w-4 h-4" />
              <span className="text-sm text-gray-700">{t('flavors.enableTagHint', '启用该标签（禁用后前台不显示）')}</span>
            </label>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setTagDialog(null)}>{t('common.cancel', '取消')}</Button>
              <Button className="flex-1" onClick={saveTag}>{t('common.save', '保存')}</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}