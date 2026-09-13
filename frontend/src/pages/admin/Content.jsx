import { useState, useEffect, useRef } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Table, Badge, Dialog, Input, Textarea, Switch, Tabs, Empty, toast } from '../../components/ui'
import { useConfirm } from '../../components/ConfirmDialog'
import { useLanguage } from '../../context/LanguageContext'

export default function Content() {
  const { t } = useLanguage()
  const confirm = useConfirm()
  const [tab, setTab] = useState('carousel')
  const [carousel, setCarousel] = useState([])
  const [settings, setSettings] = useState({})
  const [dialog, setDialog] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ image: '', title: '', link: '', sort_order: 0, enabled: true })
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  const sectionFileInputRef = useRef(null)
  const teaFileInputRef = useRef(null)
  const [teaImageIndex, setTeaImageIndex] = useState(null)

  // 自定义板块
  const [sections, setSections] = useState([])
  const [sectionDialog, setSectionDialog] = useState(false)
  const [sectionEditing, setSectionEditing] = useState(null)
  const [sectionForm, setSectionForm] = useState({ title: '', title_en: '', content: '', content_en: '', icon: '📌', image: '', layout: 'left', sort_order: 0, enabled: true })

  const [newProducts, setNewProducts] = useState([])
  const [newProductDialog, setNewProductDialog] = useState(false)
  const [newProductEditing, setNewProductEditing] = useState(null)
  const [newProductForm, setNewProductForm] = useState({ name: '', name_en: '', description: '', description_en: '', image: '', sort_order: 0, enabled: true })
  const newProductFileRef = useRef(null)

  useEffect(() => { load() }, [])

  const load = () => {
    api.getAllCarousel().then(data => setCarousel(Array.isArray(data) ? data : [])).catch(() => {})
    api.getSettings().then(data => setSettings(data || {})).catch(() => {})
    api.getAllContentSections().then(data => setSections(Array.isArray(data) ? data : [])).catch(() => {})
    api.getAllNewProducts().then(data => setNewProducts(Array.isArray(data) ? data : [])).catch(() => {})
  }

  // 图片上传
  const handleFileSelect = (e, target) => {
    const file = e.target.files?.[0]
    if (!file) return
    handleUpload(file, target)
    e.target.value = '' // 重置，允许重复选择同一文件
  }

  const handleUpload = async (file, target) => {
    if (file.size > 10 * 1024 * 1024) {
      toast(t('content.imgTooLarge', '图片不能超过 10MB'), 'error')
      return
    }
    setUploading(true)
    try {
      const res = await api.uploadImage(file)
      if (target === 'carousel') {
        setForm(prev => ({ ...prev, image: res.url }))
      } else if (target === 'section') {
        setSectionForm(prev => ({ ...prev, image: res.url }))
      } else if (target === 'tea' && teaImageIndex !== null) {
        setTeaSourcing(prev => prev.map((tea, j) => j === teaImageIndex ? { ...tea, image: res.url } : tea))
      }
      toast(t('content.imgUploaded', '图片上传成功'))
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setUploading(false)
    }
  }

  // 轮播图
  const openAdd = () => { setEditing(null); setForm({ image: '', title: '', link: '', sort_order: 0, enabled: true }); setDialog(true) }
  const openEdit = (c) => { setEditing(c); setForm({ ...c, enabled: !!c.enabled }); setDialog(true) }

  const saveCarousel = async () => {
    try {
      if (editing) { await api.updateCarousel(editing.id, form); toast(t('content.updated', '更新成功')) }
      else { await api.createCarousel(form); toast(t('content.added', '添加成功')) }
      setDialog(false); load()
    } catch (e) { toast(e.message, 'error') }
  }

  const removeCarousel = async (id) => {
    if (!await confirm({ title: t('content.confirmDeleteTitle', '删除确认'), message: t('content.confirmDeleteMsg', '确定删除？'), variant: 'danger' })) return
    await api.deleteCarousel(id); toast(t('content.deleted', '已删除')); load()
  }

  // 保存文本设置
  const saveText = async (key, value) => {
    try {
      await api.updateSettings({ [key]: value })
      setSettings(prev => ({ ...prev, [key]: value }))
      toast(t('content.saved', '保存成功'))
    } catch (e) { toast(e.message, 'error') }
  }

  // 自定义板块
  const openSectionAdd = () => { setSectionEditing(null); setSectionForm({ title: '', title_en: '', content: '', content_en: '', icon: '📌', sort_order: 0, enabled: true }); setSectionDialog(true) }
  const openSectionEdit = (s) => { setSectionEditing(s); setSectionForm({ ...s, enabled: !!s.enabled }); setSectionDialog(true) }

  const saveSection = async () => {
    try {
      if (!sectionForm.title.trim()) { toast(t('content.sectionTitleRequired', '请填写板块标题'), 'error'); return }
      if (sectionEditing) { await api.updateContentSection(sectionEditing.id, sectionForm); toast(t('content.updated', '更新成功')) }
      else { await api.createContentSection(sectionForm); toast(t('content.added', '添加成功')) }
      setSectionDialog(false); load()
    } catch (e) { toast(e.message, 'error') }
  }

  const removeSection = async (id) => {
    if (!await confirm({ title: t('content.confirmDeleteSectionTitle', '删除板块'), message: t('content.confirmDeleteSectionMsg', '确定删除该板块？'), variant: 'danger' })) return
    await api.deleteContentSection(id); toast(t('content.deleted', '已删除')); load()
  }

  const openNewProductAdd = () => { setNewProductEditing(null); setNewProductForm({ name: '', name_en: '', description: '', description_en: '', image: '', sort_order: 0, enabled: true }); setNewProductDialog(true) }
  const openNewProductEdit = (p) => { setNewProductEditing(p); setNewProductForm({ ...p, enabled: !!p.enabled }); setNewProductDialog(true) }
  const saveNewProduct = async () => {
    try {
      if (!newProductForm.name.trim()) { toast(t('content.newProductNameRequired', '请填写新品名称'), 'error'); return }
      if (newProductEditing) { await api.updateNewProduct(newProductEditing.id, newProductForm); toast(t('content.updated', '更新成功')) }
      else { await api.createNewProduct(newProductForm); toast(t('content.added', '添加成功')) }
      setNewProductDialog(false); load()
    } catch (e) { toast(e.message, 'error') }
  }
  const removeNewProduct = async (id) => { if (!await confirm({ title: t('content.confirmDeleteNewTitle', '删除新品'), message: t('content.confirmDeleteNewMsg', '确定删除该新品？'), variant: 'danger' })) return; await api.deleteNewProduct(id); toast(t('content.deleted', '已删除')); load() }

  // 茶品溯源编辑
  const [teaSourcing, setTeaSourcing] = useState([])
  useEffect(() => {
    if (settings.tea_sourcing) setTeaSourcing(settings.tea_sourcing)
  }, [settings.tea_sourcing])

  const saveTeaSourcing = () => {
    saveText('tea_sourcing', teaSourcing)
  }
  const addTea = () => setTeaSourcing(prev => [...prev, { name: '', name_en: '', desc: '', desc_en: '', enabled: true }])
  const removeTea = (i) => setTeaSourcing(prev => prev.filter((_, j) => j !== i))

  // 工艺理念编辑
  const [craftPhilosophy, setCraftPhilosophy] = useState([])
  useEffect(() => {
    if (settings.craft_philosophy) setCraftPhilosophy(settings.craft_philosophy)
  }, [settings.craft_philosophy])

  const saveCraft = () => {
    saveText('craft_philosophy', craftPhilosophy)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">{t('admin.content', '内容管理')}</h2>
        <p className="text-sm text-gray-400 mt-1">{t('content.desc', '管理前台页面的轮播图、品牌故事、茶品溯源等内容，中英双语')}</p>
      </div>

      <Tabs tabs={[
        { key: 'new', label: t('content.tabNew', '新品上市') },
        { key: 'carousel', label: t('content.tabCarousel', '轮播图') },
        { key: 'brand', label: t('content.tabBrand', '品牌故事') },
        { key: 'tea', label: t('content.tabTea', '茶品溯源') },
        { key: 'craft', label: t('content.tabCraft', '奶茶工艺') },
        { key: 'about', label: t('content.tabAbout', '关于区块') },
        { key: 'sections', label: t('content.tabSections', '自定义板块') }
      ]} active={tab} onChange={setTab} />

      {/* 新品上市 */}
      {tab === 'new' && (
        <Card>
          <div className="p-4 border-b flex justify-between items-center">
            <p className="text-sm text-gray-500">{t('content.newHint', '前台首页品牌故事上方展示，无新品时显示"新品研发中"')}</p>
            <Button onClick={openNewProductAdd}>+ {t('content.addNewProduct', '添加新品')}</Button>
          </div>
          <Table columns={[
            { header: t('content.imgCol', '图片'), render: p => p.image ? <img src={p.image} alt={p.name} className="w-12 h-12 rounded-lg object-cover" /> : <span className="text-2xl">🆕</span> },
            { header: t('content.nameCol', '名称'), render: p => <div><p className="font-medium text-gray-800">{p.name}</p>{p.name_en && <p className="text-xs text-gray-400">{p.name_en}</p>}</div> },
            { header: t('content.descCol', '描述'), render: p => <p className="text-sm text-gray-500 line-clamp-2 max-w-[250px]">{p.description || '-'}</p> },
            { header: t('content.sortCol', '排序'), key: 'sort_order' },
            { header: t('common.status', '状态'), render: p => <Badge variant={p.enabled ? 'success' : 'default'}>{p.enabled ? t('content.show', '显示') : t('content.hide', '隐藏')}</Badge> }
          ]} data={newProducts} actions={p => (
            <div className="flex gap-2">
              <button onClick={() => openNewProductEdit(p)} className="text-primary-500 hover:text-primary-700 text-sm">{t('common.edit', '编辑')}</button>
              <button onClick={() => removeNewProduct(p.id)} className="text-red-400 hover:text-red-600 text-sm">{t('common.delete', '删除')}</button>
            </div>
          )} />
        </Card>
      )}

      {/* 轮播图 */}
      {tab === 'carousel' && (
        <Card>
          <div className="p-4 border-b flex justify-end">
            <Button onClick={openAdd}>+ {t('content.addCarousel', '添加轮播')}</Button>
          </div>
          <Table columns={[
            { header: t('content.previewCol', '预览'), render: c => c.image ? <img src={c.image} alt="" className="w-20 h-12 object-cover rounded" /> : <div className="w-20 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-300">{t('content.noImg', '无图')}</div> },
            { header: t('content.titleCol', '标题'), key: 'title' },
            { header: t('content.linkCol', '链接'), render: c => c.link ? <a href={`/go?carousel=${c.id}`} target="_blank" rel="noreferrer" className="text-primary-500 text-sm hover:underline truncate block max-w-[200px]">{c.link}</a> : <span className="text-gray-300">-</span> },
            { header: t('content.sortCol', '排序'), key: 'sort_order' },
            { header: t('common.status', '状态'), render: c => <Badge variant={c.enabled ? 'success' : 'default'}>{c.enabled ? t('content.show', '显示') : t('content.hide', '隐藏')}</Badge> }
          ]} data={carousel} actions={c => (
            <div className="flex gap-2">
              <button onClick={() => openEdit(c)} className="text-primary-500 hover:text-primary-700 text-sm">{t('common.edit', '编辑')}</button>
              <button onClick={() => removeCarousel(c.id)} className="text-red-400 hover:text-red-600 text-sm">{t('common.delete', '删除')}</button>
            </div>
          )} />
        </Card>
      )}

      {/* 品牌故事 */}
      {tab === 'brand' && (
        <Card className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('content.brandStoryZh', '品牌故事（中文）')}</label>
            <Textarea rows={4} value={settings.brand_story || ''} onChange={e => setSettings(prev => ({ ...prev, brand_story: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('content.brandStoryEn', 'Brand Story (English)')}</label>
            <Textarea rows={4} value={settings.brand_story_en || ''} onChange={e => setSettings(prev => ({ ...prev, brand_story_en: e.target.value }))} />
          </div>
          <Button onClick={() => saveText('brand_story', settings.brand_story) || saveText('brand_story_en', settings.brand_story_en)}>{t('common.save', '保存')}</Button>
        </Card>
      )}

      {/* 茶品溯源 */}
      {tab === 'tea' && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-400">{t('content.teaHint', '前台自动三栏排列，可添加任意数量茶品')}</p>
              <Switch checked={settings.show_tea_sourcing !== false} onChange={v => { setSettings(prev => ({ ...prev, show_tea_sourcing: v })); saveText('show_tea_sourcing', v) }} label={t('content.frontDisplay', '前台显示')} />
            </div>
            <Button size="sm" onClick={addTea}>+ {t('content.addTea', '添加茶品')}</Button>
          </div>
          {teaSourcing.map((tea, i) => (
            <div key={i} className="p-4 bg-gray-50 rounded-lg space-y-3 relative">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={tea.enabled !== false} onChange={e => setTeaSourcing(prev => prev.map((teaItem, j) => j === i ? { ...teaItem, enabled: e.target.checked } : teaItem))} className="w-4 h-4" />
                  <span className="text-sm text-gray-600">{t('content.frontDisplay', '前台显示')}</span>
                </label>
                <button onClick={() => removeTea(i)} className="text-red-400 hover:text-red-600 text-sm">{t('common.delete', '删除')}</button>
              </div>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">{t('content.iconImg', '图标图片')}</label>
                  <div className="flex gap-2">
                    <input type="text" value={tea.image || ''} onChange={e => setTeaSourcing(prev => prev.map((teaItem, j) => j === i ? { ...teaItem, image: e.target.value } : teaItem))} placeholder={t('content.imgOrUpload', 'https://... 或点击上传')}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400" />
                    <Button type="button" size="sm" variant="outline" onClick={() => { setTeaImageIndex(i); teaFileInputRef.current?.click() }} disabled={uploading}>
                      {uploading && teaImageIndex === i ? t('content.uploading', '上传中...') : t('content.upload', '上传')}
                    </Button>
                  </div>
                </div>
                {tea.image && <img src={tea.image} alt="" className="w-12 h-12 rounded-lg object-cover" />}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label={t('content.nameLabel', '名称')} value={tea.name} onChange={e => setTeaSourcing(prev => prev.map((teaItem, j) => j === i ? { ...teaItem, name: e.target.value } : teaItem))} />
                <Input label={t('content.nameEnLabel', '英文名')} value={tea.name_en} onChange={e => setTeaSourcing(prev => prev.map((teaItem, j) => j === i ? { ...teaItem, name_en: e.target.value } : teaItem))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label={t('content.descLabel', '描述')} value={tea.desc} onChange={e => setTeaSourcing(prev => prev.map((teaItem, j) => j === i ? { ...teaItem, desc: e.target.value } : teaItem))} />
                <Input label={t('content.descEnLabel', '英文描述')} value={tea.desc_en} onChange={e => setTeaSourcing(prev => prev.map((teaItem, j) => j === i ? { ...teaItem, desc_en: e.target.value } : teaItem))} />
              </div>
            </div>
          ))}
          <Button onClick={saveTeaSourcing}>{t('common.save', '保存')}</Button>
        </Card>
      )}

      {/* 奶茶工艺 */}
      {tab === 'craft' && (
        <Card className="p-6 space-y-4">
          <p className="text-sm text-gray-400">{t('content.craftHint', '四点介绍：原叶现萃、鲜果鲜做、甜度可控、现点现做')}</p>
          {craftPhilosophy.map((item, i) => (
            <div key={i} className="grid grid-cols-2 gap-3">
              <Input label={`${t('content.craftName', '名称')} ${i + 1}`} value={item.name} onChange={e => setCraftPhilosophy(prev => prev.map((craftItem, j) => j === i ? { ...craftItem, name: e.target.value } : craftItem))} />
              <Input label={t('content.nameEnLabel', '英文名')} value={item.name_en} onChange={e => setCraftPhilosophy(prev => prev.map((craftItem, j) => j === i ? { ...craftItem, name_en: e.target.value } : craftItem))} />
            </div>
          ))}
          <Button onClick={saveCraft}>{t('common.save', '保存')}</Button>
        </Card>
      )}

      {/* 关于区块 */}
      {tab === 'about' && (
        <Card className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('content.aboutZh', '关于我们（中文）')}</label>
            <Textarea rows={4} value={settings.about_text || ''} onChange={e => setSettings(prev => ({ ...prev, about_text: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('content.aboutEn', 'About Us (English)')}</label>
            <Textarea rows={4} value={settings.about_text_en || ''} onChange={e => setSettings(prev => ({ ...prev, about_text_en: e.target.value }))} />
          </div>
          <Button onClick={() => { saveText('about_text', settings.about_text); saveText('about_text_en', settings.about_text_en) }}>{t('common.save', '保存')}</Button>
        </Card>
      )}

      {/* 自定义板块 */}
      {tab === 'sections' && (
        <Card>
          <div className="p-4 border-b flex justify-between items-center">
            <p className="text-sm text-gray-500">{t('content.sectionHint', '添加额外的内容板块，会显示在前台首页菜单上方')}</p>
            <Button onClick={openSectionAdd}>+ {t('content.addSection', '添加板块')}</Button>
          </div>
          <Table columns={[
            { header: t('content.imgCol', '图片'), render: s => s.image ? <img src={s.image} alt={s.title} className="w-12 h-12 rounded-lg object-cover" /> : <span className="text-2xl">{s.icon || '📌'}</span> },
            { header: t('content.titleCol', '标题'), render: s => <div><p className="font-medium text-gray-800">{s.title}</p>{s.title_en && <p className="text-xs text-gray-400">{s.title_en}</p>}</div> },
            { header: t('content.layoutCol', '布局'), render: s => <Badge variant="default">{s.layout === 'right' ? t('content.rightImgLeftText', '右图左文') : t('content.leftImgRightText', '左图右文')}</Badge> },
            { header: t('content.contentCol', '内容'), render: s => <p className="text-sm text-gray-500 line-clamp-2 max-w-[250px]">{s.content || '-'}</p> },
            { header: t('content.sortCol', '排序'), key: 'sort_order' },
            { header: t('common.status', '状态'), render: s => <Badge variant={s.enabled ? 'success' : 'default'}>{s.enabled ? t('content.show', '显示') : t('content.hide', '隐藏')}</Badge> }
          ]} data={sections} actions={s => (
            <div className="flex gap-2">
              <button onClick={() => openSectionEdit(s)} className="text-primary-500 hover:text-primary-700 text-sm">{t('common.edit', '编辑')}</button>
              <button onClick={() => removeSection(s.id)} className="text-red-400 hover:text-red-600 text-sm">{t('common.delete', '删除')}</button>
            </div>
          )} />
        </Card>
      )}

      {/* 轮播图对话框 */}
      <Dialog open={dialog} onClose={() => setDialog(false)} title={editing ? t('content.editCarousel', '编辑轮播') : t('content.addCarousel', '添加轮播')}
        footer={<><Button variant="outline" onClick={() => setDialog(false)}>{t('common.cancel', '取消')}</Button><Button onClick={saveCarousel}>{t('common.save', '保存')}</Button></>}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('content.imgUrlLabel', '图片 URL')}</label>
            <div className="flex gap-2">
              <input type="text" value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} placeholder="https://..."
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400" />
              <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? t('content.uploading', '上传中...') : t('content.selectImg', '选择图片')}
              </Button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileSelect(e, 'carousel')} />
          </div>
          <Input label={t('content.titleLabel', '标题')} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <Input label={t('content.linkLabel', '跳转链接')} value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} placeholder={t('content.optional', '可选')} />
          <Input label={t('content.sortLabel', '排序')} type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
          <Switch checked={form.enabled} onChange={v => setForm({ ...form, enabled: v })} label={t('content.show', '显示')} />
        </div>
      </Dialog>

      {/* 自定义板块对话框 */}
      <Dialog open={sectionDialog} onClose={() => setSectionDialog(false)} title={sectionEditing ? t('content.editSection', '编辑板块') : t('content.addSection', '添加板块')} width="max-w-lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('content.sectionTitleZh', '标题（中文）*')} value={sectionForm.title} onChange={e => setSectionForm({ ...sectionForm, title: e.target.value })} placeholder={t('content.sectionTitlePlaceholder', '如：营业时间')} />
            <Input label={t('content.sectionTitleEn', '标题（英文）')} value={sectionForm.title_en} onChange={e => setSectionForm({ ...sectionForm, title_en: e.target.value })} placeholder="Business Hours" />
          </div>
          <Input label={t('content.iconLabel', '图标 (emoji)')} value={sectionForm.icon} onChange={e => setSectionForm({ ...sectionForm, icon: e.target.value })} placeholder="📌 🕐 📍" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('content.imgUrlLabel', '图片 URL')}</label>
            <div className="flex gap-2">
              <input type="text" value={sectionForm.image} onChange={e => setSectionForm({ ...sectionForm, image: e.target.value })} placeholder="https://example.com/image.jpg"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400" />
              <Button type="button" size="sm" variant="outline" onClick={() => sectionFileInputRef.current?.click()} disabled={uploading}>
                {uploading ? t('content.uploading', '上传中...') : t('content.selectImg', '选择图片')}
              </Button>
            </div>
            <input ref={sectionFileInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileSelect(e, 'section')} />
            <input ref={teaFileInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileSelect(e, 'tea')} />
            <p className="text-xs text-gray-400 mt-1">{t('content.uploadHint', '点击"选择图片"从电脑上传，或手动填写网络图片地址')}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t('content.imgPosition', '图片位置')}</label>
              <select value={sectionForm.layout} onChange={e => setSectionForm({ ...sectionForm, layout: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400">
                <option value="left">{t('content.leftImgRightText', '左图右文')}</option>
                <option value="right">{t('content.rightImgLeftText', '右图左文')}</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input type="checkbox" checked={sectionForm.enabled} onChange={e => setSectionForm({ ...sectionForm, enabled: e.target.checked })} className="w-4 h-4" />
                <span className="text-sm text-gray-700">{t('content.frontDisplay', '前台显示')}</span>
              </label>
            </div>
          </div>
          <Textarea label={t('content.sectionContentZh', '内容（中文）')} rows={3} value={sectionForm.content} onChange={e => setSectionForm({ ...sectionForm, content: e.target.value })} placeholder={t('content.sectionContentPlaceholder', '板块的详细内容')} />
          <Textarea label={t('content.sectionContentEn', '内容（英文）')} rows={3} value={sectionForm.content_en} onChange={e => setSectionForm({ ...sectionForm, content_en: e.target.value })} placeholder="Detailed content" />
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('content.sortLabel', '排序')} type="number" value={sectionForm.sort_order} onChange={e => setSectionForm({ ...sectionForm, sort_order: parseInt(e.target.value) || 0 })} />
            <div className="flex items-end justify-center">
              {sectionForm.image && <img src={sectionForm.image} alt={t('content.preview', '预览')} className="h-16 rounded-lg object-cover" />}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setSectionDialog(false)}>{t('common.cancel', '取消')}</Button>
            <Button className="flex-1" onClick={saveSection}>{t('common.save', '保存')}</Button>
          </div>
        </div>
      </Dialog>

      {/* 新品编辑对话框 */}
      <Dialog open={newProductDialog} onClose={() => setNewProductDialog(false)} title={newProductEditing ? t('content.editNewProduct', '编辑新品') : t('content.addNewProduct', '添加新品')} width="max-w-lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('content.newProductNameZh', '名称（中文）*')} value={newProductForm.name} onChange={e => setNewProductForm({ ...newProductForm, name: e.target.value })} placeholder={t('content.newProductNamePlaceholder', '如：西瓜冰沙柠檬茶')} />
            <Input label={t('content.newProductNameEn', '名称（英文）')} value={newProductForm.name_en} onChange={e => setNewProductForm({ ...newProductForm, name_en: e.target.value })} placeholder="Watermelon Slush Lemon Tea" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('content.imgLabel', '图片')}</label>
            <div className="flex gap-2">
              <input type="text" value={newProductForm.image} onChange={e => setNewProductForm({ ...newProductForm, image: e.target.value })} placeholder={t('content.imgOrUpload', 'https://... 或点击上传')}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400" />
              <Button type="button" size="sm" variant="outline" onClick={() => newProductFileRef.current?.click()} disabled={uploading}>{uploading ? t('content.uploading', '上传中...') : t('content.selectImg', '选择图片')}</Button>
            </div>
            <input ref={newProductFileRef} type="file" accept="image/*" className="hidden" onChange={e => {
              const file = e.target.files?.[0]
              if (!file) return
              setUploading(true)
              api.uploadImage(file).then(res => { setNewProductForm(prev => ({ ...prev, image: res.url })); toast(t('content.imgUploaded', '图片上传成功')) }).catch(err => toast(err.message, 'error')).finally(() => setUploading(false))
              e.target.value = ''
            }} />
          </div>
          <Textarea label={t('content.newProductDescZh', '描述（中文）')} rows={2} value={newProductForm.description} onChange={e => setNewProductForm({ ...newProductForm, description: e.target.value })} placeholder={t('content.newProductDescPlaceholder', '新品的详细介绍')} />
          <Textarea label={t('content.newProductDescEn', '描述（英文）')} rows={2} value={newProductForm.description_en} onChange={e => setNewProductForm({ ...newProductForm, description_en: e.target.value })} placeholder="Detailed description" />
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('content.sortLabel', '排序')} type="number" value={newProductForm.sort_order} onChange={e => setNewProductForm({ ...newProductForm, sort_order: parseInt(e.target.value) || 0 })} />
            <div className="flex items-end"><label className="flex items-center gap-2 cursor-pointer pb-2"><input type="checkbox" checked={newProductForm.enabled} onChange={e => setNewProductForm({ ...newProductForm, enabled: e.target.checked })} className="w-4 h-4" /><span className="text-sm text-gray-700">{t('content.frontDisplay', '前台显示')}</span></label></div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setNewProductDialog(false)}>{t('common.cancel', '取消')}</Button>
            <Button className="flex-1" onClick={saveNewProduct}>{t('common.save', '保存')}</Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
