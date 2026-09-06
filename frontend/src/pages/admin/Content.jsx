import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Table, Badge, Dialog, Input, Textarea, Switch, Tabs, Empty, toast } from '../../components/ui'

export default function Content() {
  const [tab, setTab] = useState('carousel')
  const [carousel, setCarousel] = useState([])
  const [settings, setSettings] = useState({})
  const [dialog, setDialog] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ image: '', title: '', link: '', sort_order: 0, enabled: true })

  const [sections, setSections] = useState([])
  const [sectionDialog, setSectionDialog] = useState(false)
  const [sectionEditing, setSectionEditing] = useState(null)
  const [sectionForm, setSectionForm] = useState({ title: '', title_en: '', content: '', content_en: '', icon: '📌', image: '', layout: 'left', sort_order: 0, enabled: true })

  useEffect(() => { load() }, [])

  const load = () => {
    api.getAllCarousel().then(data => setCarousel(Array.isArray(data) ? data : [])).catch(() => {})
    api.getSettings().then(data => setSettings(data || {})).catch(() => {})
    api.getAllContentSections().then(data => setSections(Array.isArray(data) ? data : [])).catch(() => {})
  }

  const openAdd = () => { setEditing(null); setForm({ image: '', title: '', link: '', sort_order: 0, enabled: true }); setDialog(true) }
  const openEdit = (c) => { setEditing(c); setForm({ ...c, enabled: !!c.enabled }); setDialog(true) }

  const saveCarousel = async () => {
    try {
      if (editing) { await api.updateCarousel(editing.id, form); toast('更新成功') }
      else { await api.createCarousel(form); toast('添加成功') }
      setDialog(false); load()
    } catch (e) { toast(e.message, 'error') }
  }

  const removeCarousel = async (id) => {
    if (!confirm('确定删除？')) return
    await api.deleteCarousel(id); toast('已删除'); load()
  }

  const saveText = async (key, value) => {
    try {
      await api.updateSettings({ [key]: value })
      setSettings(prev => ({ ...prev, [key]: value }))
      toast('保存成功')
    } catch (e) { toast(e.message, 'error') }
  }

  const [teaSourcing, setTeaSourcing] = useState([])
  useEffect(() => {
    if (settings.tea_sourcing) setTeaSourcing(settings.tea_sourcing)
  }, [settings.tea_sourcing])
  const saveTeaSourcing = () => { saveText('tea_sourcing', teaSourcing) }

  const [craftPhilosophy, setCraftPhilosophy] = useState([])
  useEffect(() => {
    if (settings.craft_philosophy) setCraftPhilosophy(settings.craft_philosophy)
  }, [settings.craft_philosophy])
  const saveCraftPhilosophy = () => { saveText('craft_philosophy', craftPhilosophy) }

  const openSectionAdd = () => { setSectionEditing(null); setSectionForm({ title: '', title_en: '', content: '', content_en: '', icon: '📌', image: '', layout: 'left', sort_order: 0, enabled: true }); setSectionDialog(true) }
  const openSectionEdit = (s) => { setSectionEditing(s); setSectionForm({ ...s, enabled: !!s.enabled }); setSectionDialog(true) }

  const saveSection = async () => {
    try {
      if (!sectionForm.title.trim()) { toast('请填写板块标题', 'error'); return }
      if (sectionEditing) { await api.updateContentSection(sectionEditing.id, sectionForm); toast('更新成功') }
      else { await api.createContentSection(sectionForm); toast('添加成功') }
      setSectionDialog(false); load()
    } catch (e) { toast(e.message, 'error') }
  }

  const removeSection = async (id) => {
    if (!confirm('确定删除该板块？')) return
    await api.deleteContentSection(id); toast('已删除'); load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">内容管理</h2>
        <p className="text-sm text-gray-400 mt-1">管理前台页面的轮播图、品牌故事、茶品溯源等内容，中英双语</p>
      </div>

      <Tabs tabs={[
        { key: 'carousel', label: '轮播图' },
        { key: 'brand', label: '品牌故事' },
        { key: 'tea', label: '茶品溯源' },
        { key: 'craft', label: '奶茶工艺' },
        { key: 'about', label: '关于区块' },
        { key: 'sections', label: '自定义板块' }
      ]} active={tab} onChange={setTab} />

      {tab === 'carousel' && (
        <Card>
          <div className="p-4 border-b flex justify-end">
            <Button onClick={openAdd}>+ 添加轮播</Button>
          </div>
          <Table columns={[
            { header: '预览', render: c => c.image ? <img src={c.image} alt="" className="w-20 h-12 object-cover rounded" /> : <div className="w-20 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-300">无图</div> },
            { header: '标题', key: 'title' },
            { header: '链接', render: c => c.link ? <a href={c.link} target="_blank" rel="noreferrer" className="text-primary-500 text-sm hover:underline truncate block max-w-[200px]">{c.link}</a> : <span className="text-gray-300">-</span> },
            { header: '排序', key: 'sort_order' },
            { header: '状态', render: c => <Badge variant={c.enabled ? 'success' : 'default'}>{c.enabled ? '显示' : '隐藏'}</Badge> }
          ]} data={carousel} actions={c => (
            <div className="flex gap-2">
              <button onClick={() => openEdit(c)} className="text-primary-500 hover:text-primary-700 text-sm">编辑</button>
              <button onClick={() => removeCarousel(c.id)} className="text-red-400 hover:text-red-600 text-sm">删除</button>
            </div>
          )} />
        </Card>
      )}

      {tab === 'brand' && (
        <Card className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">品牌故事（中文）</label>
            <Textarea rows={4} value={settings.brand_story || ''} onChange={e => setSettings(prev => ({ ...prev, brand_story: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand Story (English)</label>
            <Textarea rows={4} value={settings.brand_story_en || ''} onChange={e => setSettings(prev => ({ ...prev, brand_story_en: e.target.value }))} />
          </div>
          <Button onClick={() => { saveText('brand_story', settings.brand_story); saveText('brand_story_en', settings.brand_story_en) }}>保存</Button>
        </Card>
      )}

      {tab === 'tea' && (
        <Card className="p-6 space-y-4">
          <p className="text-sm text-gray-400">三栏卡片，介绍乌龙茶、绿茶、红茶</p>
          {teaSourcing.map((tea, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <Input label="名称（中文）" value={tea.name} onChange={e => { const next = [...teaSourcing]; next[i].name = e.target.value; setTeaSourcing(next) }} />
                <Input label="Name (English)" value={tea.name_en} onChange={e => { const next = [...teaSourcing]; next[i].name_en = e.target.value; setTeaSourcing(next) }} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Textarea label="描述（中文）" rows={2} value={tea.desc} onChange={e => { const next = [...teaSourcing]; next[i].desc = e.target.value; setTeaSourcing(next) }} />
                <Textarea label="Description (English)" rows={2} value={tea.desc_en} onChange={e => { const next = [...teaSourcing]; next[i].desc_en = e.target.value; setTeaSourcing(next) }} />
              </div>
            </div>
          ))}
          <Button onClick={saveTeaSourcing}>保存</Button>
        </Card>
      )}

      {tab === 'craft' && (
        <Card className="p-6 space-y-4">
          <p className="text-sm text-gray-400">四点介绍：原叶现萃、鲜果鲜做、甜度可控、现点现做</p>
          {craftPhilosophy.map((item, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4 grid grid-cols-2 gap-4">
              <Input label="名称（中文）" value={item.name} onChange={e => { const next = [...craftPhilosophy]; next[i].name = e.target.value; setCraftPhilosophy(next) }} />
              <Input label="Name (English)" value={item.name_en} onChange={e => { const next = [...craftPhilosophy]; next[i].name_en = e.target.value; setCraftPhilosophy(next) }} />
            </div>
          ))}
          <Button onClick={saveCraftPhilosophy}>保存</Button>
        </Card>
      )}

      {tab === 'about' && (
        <Card className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">关于我们（中文）</label>
            <Textarea rows={4} value={settings.about_text || ''} onChange={e => setSettings(prev => ({ ...prev, about_text: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">About Us (English)</label>
            <Textarea rows={4} value={settings.about_text_en || ''} onChange={e => setSettings(prev => ({ ...prev, about_text_en: e.target.value }))} />
          </div>
          <Button onClick={() => { saveText('about_text', settings.about_text); saveText('about_text_en', settings.about_text_en) }}>保存</Button>
        </Card>
      )}

      {tab === 'sections' && (
        <Card>
          <div className="p-4 border-b flex justify-between items-center">
            <p className="text-sm text-gray-500">添加额外的内容板块，会显示在前台首页菜单上方</p>
            <Button onClick={openSectionAdd}>+ 添加板块</Button>
          </div>
          <Table columns={[
            { header: '图片', render: s => s.image ? <img src={s.image} alt={s.title} className="w-12 h-12 rounded-lg object-cover" /> : <span className="text-2xl">{s.icon || '📌'}</span> },
            { header: '标题', render: s => <div><p className="font-medium text-gray-800">{s.title}</p>{s.title_en && <p className="text-xs text-gray-400">{s.title_en}</p>}</div> },
            { header: '布局', render: s => <Badge variant="default">{s.layout === 'right' ? '右图左文' : '左图右文'}</Badge> },
            { header: '内容', render: s => <p className="text-sm text-gray-500 line-clamp-2 max-w-[250px]">{s.content || '-'}</p> },
            { header: '排序', key: 'sort_order' },
            { header: '状态', render: s => <Badge variant={s.enabled ? 'success' : 'default'}>{s.enabled ? '显示' : '隐藏'}</Badge> }
          ]} data={sections} actions={s => (
            <div className="flex gap-2">
              <button onClick={() => openSectionEdit(s)} className="text-primary-500 hover:text-primary-700 text-sm">编辑</button>
              <button onClick={() => removeSection(s.id)} className="text-red-400 hover:text-red-600 text-sm">删除</button>
            </div>
          )} />
        </Card>
      )}

      <Dialog open={dialog} onClose={() => setDialog(false)} title={editing ? '编辑轮播' : '添加轮播'}
        footer={<><Button variant="outline" onClick={() => setDialog(false)}>取消</Button><Button onClick={saveCarousel}>保存</Button></>}>
        <div className="space-y-4">
          <Input label="图片 URL" value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} placeholder="https://..." />
          <Input label="标题" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <Input label="跳转链接" value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} placeholder="可选" />
          <Input label="排序" type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
          <Switch checked={form.enabled} onChange={v => setForm({ ...form, enabled: v })} label="显示" />
        </div>
      </Dialog>

      <Dialog open={sectionDialog} onClose={() => setSectionDialog(false)} title={sectionEditing ? '编辑板块' : '添加板块'} width="max-w-lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="标题（中文）*" value={sectionForm.title} onChange={e => setSectionForm({ ...sectionForm, title: e.target.value })} placeholder="如：营业时间" />
            <Input label="标题（英文）" value={sectionForm.title_en} onChange={e => setSectionForm({ ...sectionForm, title_en: e.target.value })} placeholder="Business Hours" />
          </div>
          <Input label="图标 (emoji)" value={sectionForm.icon} onChange={e => setSectionForm({ ...sectionForm, icon: e.target.value })} placeholder="📌 🕐 📍" />
          <div>
            <Input label="图片 URL" value={sectionForm.image} onChange={e => setSectionForm({ ...sectionForm, image: e.target.value })} placeholder="https://example.com/image.jpg" />
            <p className="text-xs text-gray-400 mt-1">本地图片放到 frontend/public/images/ 后填 /images/文件名.jpg</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">图片位置</label>
              <select value={sectionForm.layout} onChange={e => setSectionForm({ ...sectionForm, layout: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400">
                <option value="left">左图右文</option>
                <option value="right">右图左文</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input type="checkbox" checked={sectionForm.enabled} onChange={e => setSectionForm({ ...sectionForm, enabled: e.target.checked })} className="w-4 h-4" />
                <span className="text-sm text-gray-700">前台显示</span>
              </label>
            </div>
          </div>
          <Textarea label="内容（中文）" rows={3} value={sectionForm.content} onChange={e => setSectionForm({ ...sectionForm, content: e.target.value })} placeholder="板块的详细内容" />
          <Textarea label="内容（英文）" rows={3} value={sectionForm.content_en} onChange={e => setSectionForm({ ...sectionForm, content_en: e.target.value })} placeholder="Detailed content" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="排序" type="number" value={sectionForm.sort_order} onChange={e => setSectionForm({ ...sectionForm, sort_order: parseInt(e.target.value) || 0 })} />
            <div className="flex items-end justify-center">
              {sectionForm.image && <img src={sectionForm.image} alt="预览" className="h-16 rounded-lg object-cover" />}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setSectionDialog(false)}>取消</Button>
            <Button className="flex-1" onClick={saveSection}>保存</Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
