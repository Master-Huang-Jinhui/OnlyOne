import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { useLanguage } from '../../context/LanguageContext'
import { Card, Button, Badge, Table, Dialog, Input, Textarea, Empty, toast } from '../../components/ui'

// 内容管理页面：新品上市/轮播图/品牌故事/茶品溯源/工艺理念/关于我们/自定义区块
export default function Content() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState('new')
  const [newProducts, setNewProducts] = useState([])      // 新品列表
  const [carousel, setCarousel] = useState([])              // 轮播图列表
  const [settings, setSettings] = useState({})               // 全局设置（品牌故事/茶品等）
  const [contentSections, setContentSections] = useState([]) // 自定义区块列表
  const [editDialog, setEditDialog] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [uploading, setUploading] = useState(false)

  // 页面加载时获取所有内容数据
  useEffect(() => {
    loadData()
  }, [])

  // 并行加载4类内容数据
  const loadData = () => {
    api.getNewProducts().then(d => setNewProducts(Array.isArray(d) ? d : [])).catch(() => {})
    api.getCarousel().then(d => setCarousel(Array.isArray(d) ? d : [])).catch(() => {})
    api.getSettings().then(d => setSettings(d || {})).catch(() => {})
    api.getContentSections().then(d => setContentSections(Array.isArray(d) ? d : [])).catch(() => {})
  }

  // 标签页配置
  const tabs = [
    { id: 'new', label: t('content.newTab', '新品上市') },
    { id: 'carousel', label: t('content.carouselTab', '轮播图') },
    { id: 'brand', label: t('content.brandTab', '品牌故事') },
    { id: 'tea', label: t('content.teaTab', '茶品溯源') },
    { id: 'craft', label: t('content.craftTab', '工艺理念') },
    { id: 'about', label: t('content.aboutTab', '关于我们') },
    { id: 'sections', label: t('content.sectionsTab', '自定义区块') },
  ]

  // 上传图片到服务器，返回URL并填入表单
  const handleUpload = async (e, field = 'image') => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await api.uploadImage(file)
      setForm(prev => ({ ...prev, [field]: res.url }))
      toast(t('content.uploadSuccess', '上传成功'), 'success')
    } catch {
      toast(t('content.uploadFailed', '上传失败'), 'error')
    } finally {
      setUploading(false)
    }
  }

  // 打开添加对话框，根据类型初始化表单
  const openAdd = (type) => {
    setEditing(null)
    if (type === 'new') setForm({ name: '', name_en: '', description: '', description_en: '', image: '', sort_order: newProducts.length + 1, enabled: 1 })
    else if (type === 'carousel') setForm({ title: '', image: '', link: '', sort_order: carousel.length + 1, enabled: 1 })
    else if (type === 'section') setForm({ title: '', title_en: '', content: '', content_en: '', icon: '', image: '', layout: 'left', sort_order: contentSections.length + 1, enabled: 1 })
    setEditDialog(true)
  }

  // 打开编辑对话框
  const openEdit = (item, type) => {
    setEditing({ item, type })
    setForm({ ...item })
    setEditDialog(true)
  }

  // 保存内容（根据当前标签页调用不同API）
  const save = async () => {
    try {
      if (activeTab === 'new') {
        if (editing) await api.updateNewProduct(editing.item.id, form)
        else await api.createNewProduct(form)
      } else if (activeTab === 'carousel') {
        if (editing) await api.updateCarousel(editing.item.id, form)
        else await api.createCarousel(form)
      } else if (activeTab === 'sections') {
        if (editing) await api.updateContentSection(editing.item.id, form)
        else await api.createContentSection(form)
      }
      toast(t('content.saveSuccess', '保存成功'), 'success')
      setEditDialog(false)
      loadData()
    } catch (e) {
      toast(e.message || t('content.saveFailed', '保存失败'), 'error')
    }
  }

  // 删除内容（根据类型调用不同API）
  const remove = async (id, type) => {
    if (!confirm(t('content.confirmDelete', '确定删除？'))) return
    try {
      if (type === 'new') await api.deleteNewProduct(id)
      else if (type === 'carousel') await api.deleteCarousel(id)
      else if (type === 'section') await api.deleteContentSection(id)
      toast(t('content.deleteSuccess', '删除成功'), 'success')
      loadData()
    } catch (e) {
      toast(e.message || t('content.deleteFailed', '删除失败'), 'error')
    }
  }

  // 保存设置项到后端（品牌故事/茶品配置等）
  const saveSettings = async (key, value) => {
    try {
      await api.updateSettings({ [key]: value })
      setSettings(prev => ({ ...prev, [key]: value }))
      toast(t('content.saveSuccess', '保存成功'), 'success')
    } catch (e) {
      toast(e.message || t('content.saveFailed', '保存失败'), 'error')
    }
  }

  // 从settings中获取茶品溯源和工艺理念数组
  const teaSourcing = settings.tea_sourcing || []
  const craftPhilosophy = settings.craft_philosophy || []

  // 更新指定索引的茶品字段
  const updateTea = (index, field, value) => {
    const updated = [...teaSourcing]
    updated[index] = { ...updated[index], [field]: value }
    saveSettings('tea_sourcing', updated)
  }

  // 添加新茶品到数组末尾
  const addTea = () => {
    const updated = [...teaSourcing, { name: '', name_en: '', desc: '', desc_en: '', image: '', enabled: true }]
    saveSettings('tea_sourcing', updated)
  }

  // 删除指定索引的茶品
  const removeTea = (index) => {
    const updated = teaSourcing.filter((_, i) => i !== index)
    saveSettings('tea_sourcing', updated)
  }

  // 更新指定索引的工艺理念字段
  const updateCraft = (index, field, value) => {
    const updated = [...craftPhilosophy]
    updated[index] = { ...updated[index], [field]: value }
    saveSettings('craft_philosophy', updated)
  }

  // 添加新工艺理念
  const addCraft = () => {
    const updated = [...craftPhilosophy, { name: '', name_en: '' }]
    saveSettings('craft_philosophy', updated)
  }

  // 删除指定索引的工艺理念
  const removeCraft = (index) => {
    const updated = craftPhilosophy.filter((_, i) => i !== index)
    saveSettings('craft_philosophy', updated)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{t('content.title', '内容管理')}</h1>
      </div>

      <div className="flex gap-2 mb-6 border-b overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'new' && (
        <Card>
          <div className="p-4 border-b flex justify-end">
            <Button onClick={() => openAdd('new')}>+ {t('content.addNew', '添加新品')}</Button>
          </div>
          <Table columns={[
            { header: t('content.imgCol', '图片'), render: p => p.image ? <img src={p.image} alt={p.name} className="w-12 h-12 rounded-lg object-cover" /> : <span className="text-2xl">🆕</span> },
            { header: t('content.nameCol', '名称'), key: 'name' },
            { header: t('content.nameEnCol', '英文名'), key: 'name_en' },
            { header: t('content.descCol', '描述'), render: p => <span className="text-sm text-gray-500 line-clamp-1">{p.description}</span> },
            { header: t('content.sortCol', '排序'), key: 'sort_order' },
            { header: t('common.status', '状态'), render: p => <Badge variant={p.enabled ? 'success' : 'default'}>{p.enabled ? t('content.show', '显示') : t('content.hide', '隐藏')}</Badge> }
          ]} data={newProducts} actions={p => (
            <div className="flex gap-2">
              <button onClick={() => openEdit(p, 'new')} className="text-primary-500 hover:text-primary-700 text-sm">{t('common.edit', '编辑')}</button>
              <button onClick={() => remove(p.id, 'new')} className="text-red-400 hover:text-red-600 text-sm">{t('common.delete', '删除')}</button>
            </div>
          )} />
        </Card>
      )}

      {activeTab === 'carousel' && (
        <Card>
          <div className="p-4 border-b flex justify-end">
            <Button onClick={() => openAdd('carousel')}>+ {t('content.addCarousel', '添加轮播')}</Button>
          </div>
          <Table columns={[
            { header: t('content.previewCol', '预览'), render: c => c.image ? (
              <img src={c.image} alt="" className="w-20 h-12 object-cover rounded" onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }} />
            ) : (
              <div className="w-20 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-300">{t('content.noImg', '无图')}</div>
            ) },
            { header: t('content.titleCol', '标题'), key: 'title' },
            { header: t('content.linkCol', '链接'), render: c => c.link ? <a href={`/go?carousel=${c.id}`} target="_blank" rel="noreferrer" className="text-primary-500 text-sm hover:underline truncate block max-w-[200px]">{c.link}</a> : <span className="text-gray-300">-</span> },
            { header: t('content.sortCol', '排序'), key: 'sort_order' },
            { header: t('common.status', '状态'), render: c => <Badge variant={c.enabled ? 'success' : 'default'}>{c.enabled ? t('content.show', '显示') : t('content.hide', '隐藏')}</Badge> }
          ]} data={carousel} actions={c => (
            <div className="flex gap-2">
              <button onClick={() => openEdit(c, 'carousel')} className="text-primary-500 hover:text-primary-700 text-sm">{t('common.edit', '编辑')}</button>
              <button onClick={() => remove(c.id, 'carousel')} className="text-red-400 hover:text-red-600 text-sm">{t('common.delete', '删除')}</button>
            </div>
          )} />
        </Card>
      )}

      {activeTab === 'brand' && (
        <Card>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('content.brandStory', '品牌故事（中文）')}</label>
              <Textarea value={settings.brand_story || ''} onChange={e => setSettings(prev => ({ ...prev, brand_story: e.target.value }))} rows={3} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('content.brandStoryEn', '品牌故事（英文）')}</label>
              <Textarea value={settings.brand_story_en || ''} onChange={e => setSettings(prev => ({ ...prev, brand_story_en: e.target.value }))} rows={3} />
            </div>
            <Button onClick={() => saveSettings('brand_story', settings.brand_story) || saveSettings('brand_story_en', settings.brand_story_en)}>{t('common.save', '保存')}</Button>
          </div>
        </Card>
      )}

      {activeTab === 'tea' && (
        <Card>
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">{t('content.showTea', '显示茶品溯源')}</span>
              <button onClick={() => saveSettings('show_tea_sourcing', settings.show_tea_sourcing !== false ? false : true)} className={`w-10 h-6 rounded-full transition-colors ${settings.show_tea_sourcing !== false ? 'bg-primary-500' : 'bg-gray-300'}`}>
                <span className={`block w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.show_tea_sourcing !== false ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>
            <Button onClick={addTea}>+ {t('content.addTea', '添加茶品')}</Button>
          </div>
          <div className="p-4 space-y-4">
            {teaSourcing.map((tea, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">{t('content.teaItem', '茶品')} {i + 1}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{t('content.enabled', '启用')}</span>
                    <button onClick={() => updateTea(i, 'enabled', tea.enabled !== false ? false : true)} className={`w-8 h-5 rounded-full transition-colors ${tea.enabled !== false ? 'bg-primary-500' : 'bg-gray-300'}`}>
                      <span className={`block w-3 h-3 bg-white rounded-full shadow transition-transform ${tea.enabled !== false ? 'translate-x-4' : 'translate-x-1'}`} />
                    </button>
                    <button onClick={() => removeTea(i)} className="text-red-400 hover:text-red-600 text-sm">{t('common.delete', '删除')}</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label={t('content.nameCol', '名称')} value={tea.name || ''} onChange={e => updateTea(i, 'name', e.target.value)} />
                  <Input label={t('content.nameEnCol', '英文名')} value={tea.name_en || ''} onChange={e => updateTea(i, 'name_en', e.target.value)} />
                  <Input label={t('content.descCol', '描述')} value={tea.desc || ''} onChange={e => updateTea(i, 'desc', e.target.value)} />
                  <Input label={t('content.descEnCol', '英文描述')} value={tea.desc_en || ''} onChange={e => updateTea(i, 'desc_en', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('content.teaImage', '茶品图片')}</label>
                  <div className="flex items-center gap-3">
                    {tea.image && <img src={tea.image} alt="" className="w-12 h-12 rounded object-cover" />}
                    <input type="file" accept="image/*" onChange={e => handleUpload(e, `tea_${i}`)} className="text-sm" />
                    {tea.image && <Input value={tea.image} onChange={e => updateTea(i, 'image', e.target.value)} className="flex-1" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === 'craft' && (
        <Card>
          <div className="p-4 border-b flex justify-end">
            <Button onClick={addCraft}>+ {t('content.addCraft', '添加工艺')}</Button>
          </div>
          <div className="p-4 space-y-3">
            {craftPhilosophy.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <Input placeholder={t('content.nameCol', '名称')} value={item.name || ''} onChange={e => updateCraft(i, 'name', e.target.value)} className="flex-1" />
                <Input placeholder={t('content.nameEnCol', '英文名')} value={item.name_en || ''} onChange={e => updateCraft(i, 'name_en', e.target.value)} className="flex-1" />
                <button onClick={() => removeCraft(i)} className="text-red-400 hover:text-red-600 text-sm px-2">{t('common.delete', '删除')}</button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === 'about' && (
        <Card>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('content.aboutText', '关于我们标题')}</label>
              <Input value={settings.about_text || ''} onChange={e => setSettings(prev => ({ ...prev, about_text: e.target.value }))} />
            </div>
            <Button onClick={() => saveSettings('about_text', settings.about_text)}>{t('common.save', '保存')}</Button>
          </div>
        </Card>
      )}

      {activeTab === 'sections' && (
        <Card>
          <div className="p-4 border-b flex justify-end">
            <Button onClick={() => openAdd('section')}>+ {t('content.addSection', '添加区块')}</Button>
          </div>
          <Table columns={[
            { header: t('content.imgCol', '图片'), render: s => s.image ? <img src={s.image} alt={s.title} className="w-12 h-12 rounded-lg object-cover" /> : <span className="text-2xl">{s.icon || '📌'}</span> },
            { header: t('content.titleCol', '标题'), key: 'title' },
            { header: t('content.layoutCol', '布局'), render: s => s.layout === 'right' ? t('content.imageRight', '图右文左') : t('content.imageLeft', '图左文右') },
            { header: t('content.sortCol', '排序'), key: 'sort_order' },
            { header: t('common.status', '状态'), render: s => <Badge variant={s.enabled ? 'success' : 'default'}>{s.enabled ? t('content.show', '显示') : t('content.hide', '隐藏')}</Badge> }
          ]} data={contentSections} actions={s => (
            <div className="flex gap-2">
              <button onClick={() => openEdit(s, 'section')} className="text-primary-500 hover:text-primary-700 text-sm">{t('common.edit', '编辑')}</button>
              <button onClick={() => remove(s.id, 'section')} className="text-red-400 hover:text-red-600 text-sm">{t('common.delete', '删除')}</button>
            </div>
          )} />
        </Card>
      )}

      <Dialog open={editDialog} onClose={() => setEditDialog(false)} title={editing ? t('content.edit', '编辑') : t('content.add', '添加')} width="max-w-lg">
        <div className="space-y-4">
          {(activeTab === 'new' || (editing?.type === 'new')) && (
            <>
              <Input label={t('content.nameCol', '名称 *')} value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} />
              <Input label={t('content.nameEnCol', '英文名')} value={form.name_en || ''} onChange={e => setForm({ ...form, name_en: e.target.value })} />
              <Textarea label={t('content.descCol', '描述')} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
              <Textarea label={t('content.descEnCol', '英文描述')} value={form.description_en || ''} onChange={e => setForm({ ...form, description_en: e.target.value })} />
            </>
          )}
          {(activeTab === 'carousel' || (editing?.type === 'carousel')) && (
            <>
              <Input label={t('content.titleCol', '标题')} value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} />
              <Input label={t('content.linkLabel', '跳转链接')} value={form.link || ''} onChange={e => setForm({ ...form, link: e.target.value })} placeholder={t('content.optional', '可选')} />
            </>
          )}
          {(activeTab === 'sections' || (editing?.type === 'section')) && (
            <>
              <Input label={t('content.titleCol', '标题 *')} value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} />
              <Input label={t('content.titleEnCol', '英文标题')} value={form.title_en || ''} onChange={e => setForm({ ...form, title_en: e.target.value })} />
              <Textarea label={t('content.contentCol', '内容')} value={form.content || ''} onChange={e => setForm({ ...form, content: e.target.value })} />
              <Textarea label={t('content.contentEnCol', '英文内容')} value={form.content_en || ''} onChange={e => setForm({ ...form, content_en: e.target.value })} />
              <Input label={t('content.iconCol', '图标(emoji)')} value={form.icon || ''} onChange={e => setForm({ ...form, icon: e.target.value })} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('content.layoutCol', '布局')}</label>
                <select value={form.layout || 'left'} onChange={e => setForm({ ...form, layout: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="left">{t('content.imageLeft', '图左文右')}</option>
                  <option value="right">{t('content.imageRight', '图右文左')}</option>
                </select>
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('content.imageCol', '图片')}</label>
            <div className="flex items-center gap-3">
              {form.image && <img src={form.image} alt="" className="w-16 h-16 rounded object-cover" />}
              <input type="file" accept="image/*" onChange={e => handleUpload(e)} disabled={uploading} className="text-sm" />
            </div>
            {form.image && <Input value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} className="mt-2" />}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('content.sortCol', '排序')} type="number" value={form.sort_order || 0} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.status', '状态')}</label>
              <select value={form.enabled ?? 1} onChange={e => setForm({ ...form, enabled: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value={1}>{t('content.show', '显示')}</option>
                <option value={0}>{t('content.hide', '隐藏')}</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setEditDialog(false)}>{t('common.cancel', '取消')}</Button>
          <Button onClick={save}>{t('common.save', '保存')}</Button>
        </div>
      </Dialog>
    </div>
  )
}
