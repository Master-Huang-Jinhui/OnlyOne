import { useState, useEffect, useRef } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Table, Badge, Dialog, Input, Textarea, Switch, Empty, toast, Select } from '../../components/ui'
import { useConfirm } from '../../components/ConfirmDialog'
import { useLanguage } from '../../context/LanguageContext'

const emptyForm = {
  name: '', logo: '', url: '', account: '', password: '', phone: '', note: '', enabled: true, sort_order: 0,
  commission_rate: 30, payout_schedule: 'weekly', delivery_type: 'platform', min_order: 0,
  delivery_radius: 3, contact_person: '', rating: 0, launch_date: ''
}

export default function Platforms() {
  const { t } = useLanguage()
  const confirm = useConfirm()
  const [platforms, setPlatforms] = useState([])
  const [dialog, setDialog] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [showPassword, setShowPassword] = useState({})
  const logoFileRef = useRef(null)

  useEffect(() => { load() }, [])

  const load = () => { api.getPlatforms().then(setPlatforms).catch(() => {}) }

  const openAdd = () => { setEditing(null); setForm(emptyForm); setDialog(true) }
  const openEdit = (p) => { setEditing(p); setForm({ ...p, enabled: !!p.enabled }); setDialog(true) }

  const save = async () => {
    if (!form.name) { toast(t('platforms.nameRequired', '平台名称必填'), 'error'); return }
    try {
      if (editing) { await api.updatePlatform(editing.id, form); toast(t('platforms.updated', '更新成功')) }
      else { await api.createPlatform(form); toast(t('platforms.added', '添加成功')) }
      setDialog(false); load()
    } catch (e) { toast(e.message, 'error') }
  }

  const remove = async (id) => {
    if (!await confirm({ title: t('platforms.confirmDeleteTitle', '删除平台'), message: t('platforms.confirmDeleteMsg', '确定删除该平台？'), variant: 'danger' })) return
    await api.deletePlatform(id); toast(t('platforms.deleted', '已删除')); load()
  }

  const toggleEnabled = async (p) => { await api.updatePlatform(p.id, { enabled: !p.enabled }); load() }

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.uploadImage(fd)
      setForm({ ...form, logo: res.url })
      toast('上传成功')
    } catch (err) { toast('上传失败：' + err.message, 'error') }
  }

  const columns = [
    { header: t('platforms.platformCol', '平台'), render: p => (
      <div className="flex items-center gap-3">
        <div className="w-14 h-10 bg-white rounded-lg flex items-center justify-center border overflow-hidden p-1.5">
          {p.logo ? <img src={p.logo} alt="" className="max-w-full max-h-full object-contain" onError={(e) => { e.target.style.display = 'none' }} /> : <span className="text-xl">🛵</span>}
        </div>
        <div>
          <p className="font-medium text-gray-800">{p.name}</p>
          <p className="text-xs text-gray-400">{p.contact_person || ''}</p>
        </div>
      </div>
    )},
    { header: '佣金', render: p => (
      <span className="text-sm font-medium text-orange-600">{p.commission_rate ? `${p.commission_rate}%` : '-'}</span>
    )},
    { header: t('platforms.accountCol', '账号'), render: p => (
      <div className="text-sm">
        <p className="text-gray-700">{p.account || '-'}</p>
        {p.password && (
          <p className="text-gray-400 text-xs flex items-center gap-1">
            {showPassword[p.id] ? p.password : '••••••'}
            <button onClick={() => setShowPassword(s => ({ ...s, [p.id]: !s[p.id] }))} className="text-primary-500">
              {showPassword[p.id] ? t('platforms.hide', '隐藏') : t('platforms.show', '显示')}
            </button>
          </p>
        )}
      </div>
    )},
    { header: '电话', render: p => (
      <span className="text-sm text-gray-600">{p.phone || '-'}</span>
    )},
    { header: '配送/结算', render: p => (
      <div className="text-xs text-gray-500 space-y-0.5">
        <p>{p.delivery_type === 'platform' ? '平台配送' : p.delivery_type === 'self' ? '商家自送' : '仅自取'}</p>
        <p>{p.payout_schedule === 'weekly' ? '周结' : p.payout_schedule === 'biweekly' ? '双周结' : '月结'}</p>
      </div>
    )},
    { header: t('common.status', '状态'), render: p => <Badge variant={p.enabled ? 'success' : 'default'}>{p.enabled ? t('platforms.enabled', '启用') : t('platforms.disabled', '停用')}</Badge> },
    { header: t('platforms.jumpCol', '跳转'), render: p => p.url ? (
      <a href={p.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm font-medium">
        <span>{t('platforms.jump', '跳转')}</span><span>↗</span>
      </a>
    ) : <span className="text-gray-300 text-sm">{t('platforms.notSet', '未设置')}</span> }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t('admin.platforms', '外卖平台管理')}</h2>
          <p className="text-sm text-gray-400 mt-1">{t('platforms.desc', '管理所有外卖平台的跳转、账号、佣金和结算')}</p>
        </div>
        <Button onClick={openAdd}>+ {t('platforms.addPlatform', '添加平台')}</Button>
      </div>

      <Card>
        {platforms.length === 0 ? (
          <Empty text={t('platforms.empty', '暂无平台，点击右上角添加')} icon="🛵" />
        ) : (
          <Table columns={columns} data={platforms} actions={p => (
            <div className="flex gap-2">
              <button onClick={() => openEdit(p)} className="text-primary-500 hover:text-primary-700 text-sm">{t('common.edit', '编辑')}</button>
              <button onClick={() => toggleEnabled(p)} className="text-gray-500 hover:text-gray-700 text-sm">{p.enabled ? t('platforms.disabled', '停用') : t('platforms.enabled', '启用')}</button>
              <button onClick={() => remove(p.id)} className="text-red-400 hover:text-red-600 text-sm">{t('common.delete', '删除')}</button>
            </div>
          )} />
        )}
      </Card>

      <Dialog open={dialog} onClose={() => setDialog(false)} title={editing ? t('platforms.editPlatform', '编辑平台') : t('platforms.addPlatform', '添加平台')} width="max-w-3xl"
        footer={<><Button variant="outline" onClick={() => setDialog(false)}>{t('common.cancel', '取消')}</Button><Button onClick={save}>{t('common.save', '保存')}</Button></>}>
        <div className="space-y-4">
          {/* 基本信息 */}
          <div className="text-sm font-semibold text-gray-500 border-b pb-1">基本信息</div>
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('platforms.nameLabel', '平台名称 *')} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="如：DoorDash" />
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Logo</label>
              <div className="flex gap-2 items-center">
                {form.logo && (
                  <div className="w-16 h-12 bg-white rounded border flex items-center justify-center p-1.5 shrink-0">
                    <img src={form.logo} alt="" className="max-w-full max-h-full object-contain" onError={(e) => { e.target.style.display = 'none' }} />
                  </div>
                )}
                <input
                  value={form.logo}
                  onChange={e => setForm({ ...form, logo: e.target.value })}
                  placeholder="图片链接或上传"
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                />
                <Button type="button" size="sm" onClick={() => logoFileRef.current?.click()}>上传</Button>
                <input ref={logoFileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </div>
            </div>
          </div>
          <Input label={t('platforms.urlLabel', '商家后台 URL')} value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." />

          {/* 账号密码 */}
          <div className="text-sm font-semibold text-gray-500 border-b pb-1 mt-4">账号登录</div>
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('platforms.accountLabel', '账号')} value={form.account} onChange={e => setForm({ ...form, account: e.target.value })} placeholder="登录账号" />
            <Input label={t('platforms.passwordLabel', '密码')} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="登录密码" type="text" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('platforms.phoneLabel', '平台客服电话')} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="平台客服电话" />
            <Input label="对接人" value={form.contact_person || ''} onChange={e => setForm({ ...form, contact_person: e.target.value })} placeholder="平台客户经理姓名/电话" />
          </div>

          {/* 商业信息 */}
          <div className="text-sm font-semibold text-gray-500 border-b pb-1 mt-4">商业条款</div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="佣金比例 (%)" type="number" step="0.1" value={form.commission_rate} onChange={e => setForm({ ...form, commission_rate: parseFloat(e.target.value) || 0 })} placeholder="如 30" />
            <Select label="结算周期" value={form.payout_schedule} onChange={e => setForm({ ...form, payout_schedule: e.target.value })}
              options={[{value:'weekly',label:'周结'},{value:'biweekly',label:'双周结'},{value:'monthly',label:'月结'}]} />
            <Select label="配送方式" value={form.delivery_type} onChange={e => setForm({ ...form, delivery_type: e.target.value })}
              options={[{value:'platform',label:'平台配送'},{value:'self',label:'商家自送'},{value:'pickup',label:'仅自取'}]} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="最低订单额 ($)" type="number" step="0.01" value={form.min_order} onChange={e => setForm({ ...form, min_order: parseFloat(e.target.value) || 0 })} placeholder="如 15.99" />
            <Input label="配送范围 (英里)" type="number" step="0.5" value={form.delivery_radius} onChange={e => setForm({ ...form, delivery_radius: parseFloat(e.target.value) || 0 })} placeholder="如 3" />
            <Input label="店铺评分 (1-5)" type="number" step="0.1" min="0" max="5" value={form.rating} onChange={e => setForm({ ...form, rating: parseFloat(e.target.value) || 0 })} placeholder="如 4.5" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="上线日期" type="date" value={form.launch_date || ''} onChange={e => setForm({ ...form, launch_date: e.target.value })} />
            <Input label={t('platforms.sortLabel', '排序')} type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
          </div>

          {/* 其他 */}
          <div className="text-sm font-semibold text-gray-500 border-b pb-1 mt-4">其他</div>
          <Textarea label={t('platforms.noteLabel', '备注')} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="其他备注信息" rows={2} />
          <div className="flex items-center gap-4">
            <Switch checked={form.enabled} onChange={v => setForm({ ...form, enabled: v })} label={t('platforms.enableLabel', '启用该平台')} />
          </div>
        </div>
      </Dialog>
    </div>
  )
}
