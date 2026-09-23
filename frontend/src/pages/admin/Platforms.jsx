import { useState, useEffect, useRef } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Table, Badge, Dialog, Input, Textarea, Switch, Empty, toast } from '../../components/ui'
import { useConfirm } from '../../components/ConfirmDialog'
import { useLanguage } from '../../context/LanguageContext'

const emptyForm = { name: '', logo: '', url: '', account: '', password: '', phone: '', note: '', enabled: true, sort_order: 0 }

export default function Platforms() {
  const { t } = useLanguage()
  const confirm = useConfirm()
  const [activeTab, setActiveTab] = useState('links') // links | reports
  const [platforms, setPlatforms] = useState([])
  const [dialog, setDialog] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [showPassword, setShowPassword] = useState({})
  const [reports, setReports] = useState([])
  const [reportUpload, setReportUpload] = useState({ platform_id: '', month: '', file: null })
  const logoFileRef = useRef(null)

  useEffect(() => { load(); loadReports() }, [])

  const load = () => { api.getPlatforms().then(setPlatforms).catch(() => {}) }
  const loadReports = () => {
    api.getPlatformReports().then(r => setReports(r.reports || [])).catch(() => {})
  }

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
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-xl border overflow-hidden">
          {p.logo ? <img src={p.logo} alt="" className="w-full h-full object-cover" /> : '🛵'}
        </div>
        <div>
          <p className="font-medium text-gray-800">{p.name}</p>
          <p className="text-xs text-gray-400">{p.phone || t('platforms.noPhone', '无电话')}</p>
        </div>
      </div>
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
    { header: t('platforms.noteCol', '备注'), render: p => <span className="text-sm text-gray-500 max-w-[200px] truncate block">{p.note || '-'}</span> },
    { header: t('common.status', '状态'), render: p => <Badge variant={p.enabled ? 'success' : 'default'}>{p.enabled ? t('platforms.enabled', '启用') : t('platforms.disabled', '停用')}</Badge> },
    { header: t('platforms.jumpCol', '跳转'), render: p => p.url ? (
      <a href={p.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm font-medium">
        <span>{t('platforms.jump', '跳转')}</span><span>↗</span>
      </a>
    ) : <span className="text-gray-300 text-sm">{t('platforms.notSet', '未设置')}</span> }
  ]

  const handleReportUpload = async () => {
    if (!reportUpload.platform_id || !reportUpload.month || !reportUpload.file) {
      toast('请选择平台、月份和文件', 'error'); return
    }
    try {
      const fd = new FormData()
      fd.append('platform_id', reportUpload.platform_id)
      fd.append('month', reportUpload.month)
      fd.append('file', reportUpload.file)
      await api.uploadPlatformReport(fd)
      toast('报表导入成功')
      setReportUpload({ platform_id: '', month: '', file: null })
      loadReports()
    } catch (e) { toast(e.message, 'error') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t('admin.platforms', '外卖平台管理')}</h2>
          <p className="text-sm text-gray-400 mt-1">{t('platforms.desc', '管理所有外卖平台的跳转、账号和每周状态')}</p>
        </div>
        {activeTab === 'links' && <Button onClick={openAdd}>+ {t('platforms.addPlatform', '添加平台')}</Button>}
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('links')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'links' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🔗 平台链接
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'reports' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📊 报表月报
        </button>
      </div>

      {activeTab === 'links' && (
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
      )}

      {activeTab === 'reports' && (
        <div className="space-y-4">
          {/* 上传报表 */}
          <Card>
            <h3 className="text-base font-semibold text-gray-800 mb-4">导入月度报表</h3>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">选择平台</label>
                <select
                  value={reportUpload.platform_id}
                  onChange={e => setReportUpload({ ...reportUpload, platform_id: e.target.value })}
                  className="border rounded-lg px-3 py-2 text-sm min-w-[150px]"
                >
                  <option value="">-- 请选择 --</option>
                  {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">月份</label>
                <input
                  type="month"
                  value={reportUpload.month}
                  onChange={e => setReportUpload({ ...reportUpload, month: e.target.value })}
                  className="border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">CSV 文件</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={e => setReportUpload({ ...reportUpload, file: e.target.files[0] })}
                  className="text-sm"
                />
              </div>
              <Button onClick={handleReportUpload}>上传报表</Button>
            </div>
            <p className="text-xs text-gray-400 mt-3">从各外卖平台后台下载月度报表CSV，上传后系统自动解析汇总</p>
          </Card>

          {/* 已导入报表列表 */}
          <Card>
            <h3 className="text-base font-semibold text-gray-800 mb-4">已导入报表</h3>
            {reports.length === 0 ? (
              <Empty text="暂无导入的报表" icon="📊" />
            ) : (
              <Table
                columns={[
                  { header: '月份', render: r => <span className="text-sm font-medium">{r.month}</span> },
                  { header: '平台', render: r => <span className="text-sm">{r.platform_name || '-'}</span> },
                  { header: '销售额', render: r => <span className="text-sm">${r.total_sales || '0.00'}</span> },
                  { header: '订单数', render: r => <span className="text-sm">{r.order_count || 0}</span> },
                  { header: '平台费用', render: r => <span className="text-sm text-red-500">-${r.platform_fee || '0.00'}</span> },
                  { header: '净收入', render: r => <span className="text-sm font-medium text-green-600">${r.net_revenue || '0.00'}</span> },
                  { header: '导入时间', render: r => <span className="text-xs text-gray-400">{r.created_at?.slice(0, 16) || '-'}</span> },
                ]}
                data={reports}
              />
            )}
          </Card>
        </div>
      )}

      <Dialog open={dialog} onClose={() => setDialog(false)} title={editing ? t('platforms.editPlatform', '编辑平台') : t('platforms.addPlatform', '添加平台')} width="max-w-2xl"
        footer={<><Button variant="outline" onClick={() => setDialog(false)}>{t('common.cancel', '取消')}</Button><Button onClick={save}>{t('common.save', '保存')}</Button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('platforms.nameLabel', '平台名称 *')} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t('platforms.namePlaceholder', '如：DoorDash')} />
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Logo</label>
          <div className="flex gap-2 items-center">
            {form.logo && <img src={form.logo} alt="" className="w-10 h-10 rounded border object-cover" />}
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
          <Input label={t('platforms.urlLabel', '跳转 URL')} value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." />
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('platforms.accountLabel', '账号')} value={form.account} onChange={e => setForm({ ...form, account: e.target.value })} placeholder={t('platforms.accountPlaceholder', '登录账号')} />
            <Input label={t('platforms.passwordLabel', '密码')} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={t('platforms.passwordPlaceholder', '登录密码')} type="text" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('platforms.phoneLabel', '联系电话')} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder={t('platforms.phonePlaceholder', '平台客服电话')} />
            <Input label={t('platforms.sortLabel', '排序')} type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
          </div>
          <Textarea label={t('platforms.noteLabel', '备注')} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder={t('platforms.notePlaceholder', '其他备注信息')} rows={2} />
          <div className="flex items-center gap-4">
            <Switch checked={form.enabled} onChange={v => setForm({ ...form, enabled: v })} label={t('platforms.enableLabel', '启用该平台')} />
          </div>
        </div>
      </Dialog>
    </div>
  )
}
