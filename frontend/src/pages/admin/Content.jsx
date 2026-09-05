import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Table, Badge, Dialog, Input, Textarea, Switch, Tabs, Empty, toast } from '../../components/ui'

export default function Content() {
  const [carousel, setCarousel] = useState([])
  const [settings, setSettings] = useState({})
  const [activeTab, setActiveTab] = useState('carousel')
  const [dialog, setDialog] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ image: '', title: '', link: '', sort_order: 0, enabled: true })

  useEffect(() => { load() }, [])

  const load = () => {
    api.getAllCarousel().then(data => setCarousel(Array.isArray(data) ? data : [])).catch(() => {})
    api.getSettings().then(data => setSettings(data || {})).catch(() => {})
  }

  const openAdd = () => { setEditing(null); setForm({ image: '', title: '', link: '', sort_order: 0, enabled: true }); setDialog(true) }
  const openEdit = (c) => { setEditing(c); setForm({ ...c, enabled: !!c.enabled }); setDialog(true) }

  const save = async () => {
    if (!form.image) { toast('图片地址必填', 'error'); return }
    try {
      if (editing) { await api.updateCarousel(editing.id, form); toast('更新成功') }
      else { await api.createCarousel(form); toast('创建成功') }
      setDialog(false); load()
    } catch (e) { toast(e.message, 'error') }
  }

  const remove = async (id) => {
    if (!confirm('确定删除该轮播图？')) return
    await api.deleteCarousel(id); toast('已删除'); load()
  }

  const saveStory = async (key, value) => {
    try { await api.updateSetting(key, value); toast('保存成功'); load() }
    catch (e) { toast(e.message, 'error') }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">内容管理</h2>
        <p className="text-sm text-gray-400 mt-1">管理轮播图和店铺文案</p>
      </div>

      <Tabs tabs={[{ value: 'carousel', label: '轮播图' }, { value: 'story', label: '品牌故事' }, { value: 'tea', label: '茶品溯源' }, { value: 'craft', label: '奶茶工艺' }]} value={activeTab} onChange={setActiveTab} />

      {activeTab === 'carousel' && (
        <Card>
          <div className="p-4 border-b flex justify-end"><Button onClick={openAdd}>+ 添加轮播图</Button></div>
          {carousel.length === 0 ? <Empty text="暂无轮播图" icon="🖼️" /> : (
            <Table columns={[
              { header: '图片', render: c => <img src={c.image} className="w-32 h-16 object-cover rounded" /> },
              { header: '标题', render: c => <p className="font-medium text-gray-800">{c.title || '-'}</p> },
              { header: '链接', render: c => <code className="text-xs text-gray-400">{c.link || '-'}</code> },
              { header: '状态', render: c => <Badge variant={c.enabled ? 'success' : 'default'}>{c.enabled ? '显示' : '隐藏'}</Badge> }
            ]} data={carousel} actions={c => (
              <div className="flex gap-2">
                <button onClick={() => openEdit(c)} className="text-primary-500 hover:text-primary-700 text-sm">编辑</button>
                <button onClick={() => remove(c.id)} className="text-red-400 hover:text-red-600 text-sm">删除</button>
              </div>
            )} />
          )}
        </Card>
      )}

      {activeTab === 'story' && (
        <Card className="p-6">
          <h3 className="font-bold text-gray-800 mb-4">品牌故事（中英双语）</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">中文</label>
              <Textarea rows={6} value={settings.brand_story_zh || ''} onChange={e => saveStory('brand_story_zh', e.target.value)} placeholder="讲述法拉盛门店定位，烧烤+新式茶饮定位..." />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">English</label>
              <Textarea rows={6} value={settings.brand_story_en || ''} onChange={e => saveStory('brand_story_en', e.target.value)} placeholder="Tell the story of your Flushing location..." />
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'tea' && (
        <Card className="p-6">
          <h3 className="font-bold text-gray-800 mb-4">茶品溯源（三栏卡片，中英双语）</h3>
          <div className="space-y-6">
            {['oolong', 'green', 'black'].map(tea => (
              <div key={tea} className="border border-gray-200 rounded-lg p-4">
                <p className="font-medium text-gray-700 mb-3">{tea === 'oolong' ? '乌龙茶' : tea === 'green' ? '绿茶' : '红茶'}</p>
                <div className="grid grid-cols-2 gap-4">
                  <Textarea rows={3} placeholder="中文介绍" value={settings[`tea_${tea}_zh`] || ''} onChange={e => saveStory(`tea_${tea}_zh`, e.target.value)} />
                  <Textarea rows={3} placeholder="English" value={settings[`tea_${tea}_en`] || ''} onChange={e => saveStory(`tea_${tea}_en`, e.target.value)} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === 'craft' && (
        <Card className="p-6">
          <h3 className="font-bold text-gray-800 mb-4">奶茶工艺理念（四点介绍，中英双语）</h3>
          <div className="space-y-4">
            {['brew', 'fresh', 'sweetness', 'made_to_order'].map((item, idx) => (
              <div key={item} className="border border-gray-200 rounded-lg p-4">
                <p className="font-medium text-gray-700 mb-3">{['原叶现萃', '鲜果鲜做', '甜度可控', '现点现做'][idx]}</p>
                <div className="grid grid-cols-2 gap-4">
                  <Textarea rows={2} placeholder="中文" value={settings[`craft_${item}_zh`] || ''} onChange={e => saveStory(`craft_${item}_zh`, e.target.value)} />
                  <Textarea rows={2} placeholder="English" value={settings[`craft_${item}_en`] || ''} onChange={e => saveStory(`craft_${item}_en`, e.target.value)} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Dialog open={dialog} onClose={() => setDialog(false)} title={editing ? '编辑轮播图' : '添加轮播图'}
        footer={<><Button variant="outline" onClick={() => setDialog(false)}>取消</Button><Button onClick={save}>保存</Button></>}>
        <div className="space-y-4">
          <Input label="图片地址 *" value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} placeholder="https://..." />
          <Input label="标题" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <Input label="跳转链接" value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} placeholder="https://..." />
          <div className="grid grid-cols-2 gap-4">
            <Input label="排序" type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
            <Switch checked={form.enabled} onChange={v => setForm({ ...form, enabled: v })} label="显示" />
          </div>
        </div>
      </Dialog>
    </div>
  )
}
