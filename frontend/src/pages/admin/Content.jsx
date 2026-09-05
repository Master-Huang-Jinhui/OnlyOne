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

  useEffect(() => { load() }, [])
  const load = () => { api.getAllCarousel().then(setCarousel).catch(() => {}); api.getSettings().then(setSettings).catch(() => {}) }

  const openAdd = () => { setEditing(null); setForm({ image: '', title: '', link: '', sort_order: 0, enabled: true }); setDialog(true) }
  const openEdit = (c) => { setEditing(c); setForm({ ...c, enabled: !!c.enabled }); setDialog(true) }

  const saveCarousel = async () => {
    try {
      if (editing) { await api.updateCarousel(editing.id, form); toast('更新成功') }
      else { await api.createCarousel(form); toast('添加成功') }
      setDialog(false); load()
    } catch (e) { toast(e.message, 'error') }
  }

  const removeCarousel = async (id) => { if (!confirm('确定删除？')) return; await api.deleteCarousel(id); toast('已删除'); load() }

  const saveText = async (key, value) => {
    try { await api.updateSettings({ [key]: value }); setSettings(prev => ({ ...prev, [key]: value })); toast('保存成功') } catch (e) { toast(e.message, 'error') }
  }

  const [teaSourcing, setTeaSourcing] = useState([])
  useEffect(() => { if (settings.tea_sourcing) setTeaSourcing(settings.tea_sourcing) }, [settings.tea_sourcing])
  const saveTeaSourcing = () => saveText('tea_sourcing', teaSourcing)

  const [craftPhilosophy, setCraftPhilosophy] = useState([])
  useEffect(() => { if (settings.craft_philosophy) setCraftPhilosophy(settings.craft_philosophy) }, [settings.craft_philosophy])
  const saveCraft = () => saveText('craft_philosophy', craftPhilosophy)

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold text-gray-800">内容管理</h2><p className="text-sm text-gray-400 mt-1">管理前台页面的轮播图、品牌故事、茶品溯源等内容，中英双语</p></div>

      <Tabs tabs={[
        { key: 'carousel', label: '轮播图' }, { key: 'brand', label: '品牌故事' },
        { key: 'tea', label: '茶品溯源' }, { key: 'craft', label: '奶茶工艺' }, { key: 'about', label: '关于区块' }
      ]} active={tab} onChange={setTab} />

      {tab === 'carousel' && (
        <Card>
          <div className="p-4 border-b flex justify-end"><Button onClick={openAdd}>+ 添加轮播</Button></div>
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
          <div><label className="block text-sm font-medium text-gray-700 mb-1">品牌故事（中文）</label><Textarea rows={4} value={settings.brand_story || ''} onChange={e => setSettings(prev => ({ ...prev, brand_story: e.target.value }))} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Brand Story (English)</label><Textarea rows={4} value={settings.brand_story_en || ''} onChange={e => setSettings(prev => ({ ...prev, brand_story_en: e.target.value }))} /></div>
          <Button onClick={() => { saveText('brand_story', settings.brand_story); saveText('brand_story_en', settings.brand_story_en) }}>保存</Button>
        </Card>
      )}

      {tab === 'tea' && (
        <Card className="p-6 space-y-4">
          <p className="text-sm text-gray-400">三栏卡片，介绍乌龙茶、绿茶、红茶</p>
          {teaSourcing.map((tea, i) => (
            <div key={i} className="p-4 bg-gray-50 rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input label="名称" value={tea.name} onChange={e => setTeaSourcing(prev => prev.map((t, j) => j === i ? { ...t, name: e.target.value } : t))} />
                <Input label="英文名" value={tea.name_en} onChange={e => setTeaSourcing(prev => prev.map((t, j) => j === i ? { ...t, name_en: e.target.value } : t))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="描述" value={tea.desc} onChange={e => setTeaSourcing(prev => prev.map((t, j) => j === i ? { ...t, desc: e.target.value } : t))} />
                <Input label="英文描述" value={tea.desc_en} onChange={e => setTeaSourcing(prev => prev.map((t, j) => j === i ? { ...t, desc_en: e.target.value } : t))} />
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
            <div key={i} className="grid grid-cols-2 gap-3">
              <Input label={`名称 ${i + 1}`} value={item.name} onChange={e => setCraftPhilosophy(prev => prev.map((t, j) => j === i ? { ...t, name: e.target.value } : t))} />
              <Input label="英文名" value={item.name_en} onChange={e => setCraftPhilosophy(prev => prev.map((t, j) => j === i ? { ...t, name_en: e.target.value } : t))} />
            </div>
          ))}
          <Button onClick={saveCraft}>保存</Button>
        </Card>
      )}

      {tab === 'about' && (
        <Card className="p-6 space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">关于我们（中文）</label><Textarea rows={4} value={settings.about_text || ''} onChange={e => setSettings(prev => ({ ...prev, about_text: e.target.value }))} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">About Us (English)</label><Textarea rows={4} value={settings.about_text_en || ''} onChange={e => setSettings(prev => ({ ...prev, about_text_en: e.target.value }))} /></div>
          <Button onClick={() => { saveText('about_text', settings.about_text); saveText('about_text_en', settings.about_text_en) }}>保存</Button>
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
    </div>
  )
}
