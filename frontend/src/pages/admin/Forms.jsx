import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Table, Badge, Dialog, Input, Select, Switch, Empty, toast } from '../../components/ui'

const fieldTypes = [
  { value: 'text', label: '单行文本' }, { value: 'textarea', label: '多行文本' },
  { value: 'number', label: '数字' }, { value: 'select', label: '下拉选择' },
  { value: 'radio', label: '单选' }, { value: 'checkbox', label: '多选' },
  { value: 'date', label: '日期' }, { value: 'datetime', label: '日期时间' },
  { value: 'time', label: '时间' }, { value: 'switch', label: '开关' },
  { value: 'email', label: '邮箱' }, { value: 'tel', label: '电话' }
]

const emptyForm = { name: '', description: '', fields: [], enabled: true }

const quickTemplates = [
  { icon: '📋', name: '顾客反馈表', description: '收集顾客对菜品和服务的反馈', fields: [
    { type: 'text', label: '顾客姓名', placeholder: '请输入姓名', required: true, options: '' },
    { type: 'tel', label: '联系电话', placeholder: '请输入电话', required: false, options: '' },
    { type: 'select', label: '满意度', placeholder: '', required: true, options: '非常满意,满意,一般,不满意' },
    { type: 'textarea', label: '具体建议', placeholder: '请输入您的建议', required: false, options: '' },
    { type: 'date', label: '到店日期', placeholder: '', required: false, options: '' }
  ]},
  { icon: '📅', name: '包间预订表', description: '顾客预订包间或大型聚餐', fields: [
    { type: 'text', label: '预订人姓名', placeholder: '请输入姓名', required: true, options: '' },
    { type: 'tel', label: '联系电话', placeholder: '请输入电话', required: true, options: '' },
    { type: 'date', label: '预订日期', placeholder: '', required: true, options: '' },
    { type: 'time', label: '到店时间', placeholder: '', required: true, options: '' },
    { type: 'number', label: '用餐人数', placeholder: '请输入人数', required: true, options: '' },
    { type: 'select', label: '取餐方式', placeholder: '', required: false, options: '堂吃,自取,配送' },
    { type: 'textarea', label: '特殊要求', placeholder: '如忌口、生日布置等', required: false, options: '' }
  ]},
  { icon: '💼', name: '员工入职表', description: '新员工基本信息登记', fields: [
    { type: 'text', label: '姓名', placeholder: '请输入姓名', required: true, options: '' },
    { type: 'tel', label: '电话', placeholder: '请输入电话', required: true, options: '' },
    { type: 'text', label: '身份证号', placeholder: '请输入身份证号', required: false, options: '' },
    { type: 'text', label: '住址', placeholder: '请输入住址', required: false, options: '' },
    { type: 'date', label: '入职日期', placeholder: '', required: true, options: '' },
    { type: 'select', label: '岗位', placeholder: '', required: true, options: '前台,后厨,服务员,外卖打包,管理' },
    { type: 'textarea', label: '备注', placeholder: '其他信息', required: false, options: '' }
  ]},
  { icon: '📦', name: '采购申请表', description: '店内物资和食材采购申请', fields: [
    { type: 'text', label: '申请人', placeholder: '请输入姓名', required: true, options: '' },
    { type: 'date', label: '申请日期', placeholder: '', required: true, options: '' },
    { type: 'textarea', label: '采购物品清单', placeholder: '请列出需要采购的物品和数量', required: true, options: '' },
    { type: 'number', label: '预估金额', placeholder: '请输入预估金额', required: false, options: '' },
    { type: 'select', label: '紧急程度', placeholder: '', required: true, options: '普通,较急,紧急' },
    { type: 'textarea', label: '备注', placeholder: '其他说明', required: false, options: '' }
  ]}
]

export default function Forms() {
  const [forms, setForms] = useState([])
  const [dialog, setDialog] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [submissions, setSubmissions] = useState(null)
  const [menuDialog, setMenuDialog] = useState(false)
  const [menuForm, setMenuForm] = useState({ name: '', icon: '📝', parent_id: 0, sort_order: 0 })
  const [menus, setMenus] = useState([])
  const [currentForm, setCurrentForm] = useState(null)

  useEffect(() => { load() }, [])

  const load = () => {
    api.getForms().then(data => setForms(Array.isArray(data) ? data : [])).catch(() => {})
    api.getAllMenus().then(data => setMenus(Array.isArray(data) ? data : [])).catch(() => {})
  }

  const openAdd = () => { setEditing(null); setForm(emptyForm); setDialog(true) }
  const openEdit = (f) => { setEditing(f); setForm({ ...f, fields: f.fields || [] }); setDialog(true) }

  const createFromTemplate = (tpl) => {
    setEditing(null)
    setForm({ name: tpl.name, description: tpl.description, fields: JSON.parse(JSON.stringify(tpl.fields)), enabled: true })
    setDialog(true)
  }

  const openMenuDialog = (f) => {
    setCurrentForm(f)
    setMenuForm({ name: f.name, icon: '📝', parent_id: 0, sort_order: 0 })
    setMenuDialog(true)
  }

  const addToMenu = async () => {
    if (!menuForm.name || !currentForm) return
    try {
      await api.createMenu({ ...menuForm, path: `/admin/form/${currentForm.id}`, enabled: 1 })
      toast('已添加到菜单，刷新后侧边栏可见')
      setMenuDialog(false)
    } catch (e) { toast(e.message, 'error') }
  }

  const save = async () => {
    if (!form.name) { toast('表单名称必填', 'error'); return }
    try {
      if (editing) { await api.updateForm(editing.id, form); toast('更新成功') }
      else { await api.createForm(form); toast('创建成功') }
      setDialog(false); load()
    } catch (e) { toast(e.message, 'error') }
  }

  const remove = async (id) => {
    if (!confirm('确定删除该表单及所有提交记录？')) return
    await api.deleteForm(id); toast('已删除'); load()
  }

  const addField = () => {
    setForm(prev => ({ ...prev, fields: [...prev.fields, { type: 'text', label: '', placeholder: '', required: false, options: '' }] }))
  }

  const updateField = (idx, key, value) => {
    setForm(prev => ({ ...prev, fields: prev.fields.map((f, i) => i === idx ? { ...f, [key]: value } : f) }))
  }

  const removeField = (idx) => {
    setForm(prev => ({ ...prev, fields: prev.fields.filter((_, i) => i !== idx) }))
  }

  const viewSubmissions = async (id) => {
    try { const data = await api.getFormSubmissions(id); setSubmissions(data) } catch (e) { toast(e.message, 'error') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">表单管理</h2>
          <p className="text-sm text-gray-400 mt-1">自定义动态表单，支持12种字段类型，可添加到侧边栏菜单</p>
        </div>
        <Button onClick={openAdd}>+ 创建表单</Button>
      </div>

      {forms.length === 0 ? (
        <div className="space-y-6">
          <Card className="p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">还没有表单</h3>
            <p className="text-gray-500 mb-6">创建自定义动态表单，支持文本、数字、下拉、单选、多选、日期、时间、开关等12种字段类型，创建后可添加到侧边栏菜单</p>
            <Button size="lg" onClick={openAdd}>+ 创建表单</Button>
          </Card>
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-3">或从快速模板开始</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickTemplates.map((tpl, i) => (
                <button key={i} onClick={() => createFromTemplate(tpl)} className="p-4 bg-white border border-gray-200 rounded-xl hover:border-primary-300 hover:shadow-md transition-all text-left">
                  <div className="text-3xl mb-2">{tpl.icon}</div>
                  <p className="font-medium text-gray-800 text-sm">{tpl.name}</p>
                  <p className="text-xs text-gray-400 mt-1">{tpl.fields.length} 个字段</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
      <Card>
        <div className="p-4 border-b flex justify-end"><Button onClick={openAdd}>+ 创建表单</Button></div>
        <Table columns={[
          { header: '表单名称', render: f => <div><p className="font-medium text-gray-800">{f.name}</p><p className="text-xs text-gray-400">{f.description || '-'}</p></div> },
          { header: '字段数', render: f => <Badge variant="primary">{f.fields ? f.fields.length : 0} 个字段</Badge> },
          { header: '状态', render: f => <Badge variant={f.enabled ? 'success' : 'default'}>{f.enabled ? '启用' : '停用'}</Badge> },
          { header: '创建时间', render: f => <span className="text-xs text-gray-400">{f.created_at}</span> }
        ]} data={forms} actions={f => (
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => openMenuDialog(f)} className="text-blue-500 hover:text-blue-700 text-sm">加到菜单</button>
            <button onClick={() => viewSubmissions(f.id)} className="text-green-500 hover:text-green-700 text-sm">提交记录</button>
            <button onClick={() => openEdit(f)} className="text-primary-500 hover:text-primary-700 text-sm">编辑</button>
            <button onClick={() => remove(f.id)} className="text-red-400 hover:text-red-600 text-sm">删除</button>
          </div>
        )} />
      </Card>
      )}

      <Dialog open={dialog} onClose={() => setDialog(false)} title={editing ? '编辑表单' : '创建表单'} width="max-w-3xl"
        footer={<><Button variant="outline" onClick={() => setDialog(false)}>取消</Button><Button onClick={save}>保存</Button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="表单名称 *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <Input label="描述" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">表单字段</label>
              <Button size="sm" variant="outline" onClick={addField}>+ 添加字段</Button>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {form.fields.length === 0 && <p className="text-sm text-gray-400 text-center py-4">暂无字段，点击上方添加</p>}
              {form.fields.map((field, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-400 w-6">#{idx + 1}</span>
                    <Select value={field.type} onChange={e => updateField(idx, 'type', e.target.value)} options={fieldTypes} className="w-36" />
                    <Input placeholder="字段标签" value={field.label} onChange={e => updateField(idx, 'label', e.target.value)} className="flex-1" />
                    <button onClick={() => removeField(idx)} className="text-red-400 hover:text-red-600 px-2">×</button>
                  </div>
                  <div className="flex items-center gap-2 ml-8">
                    <Input placeholder="占位提示文字" value={field.placeholder} onChange={e => updateField(idx, 'placeholder', e.target.value)} className="flex-1" />
                    {['select', 'radio', 'checkbox'].includes(field.type) && (
                      <Input placeholder="选项（逗号分隔）" value={field.options} onChange={e => updateField(idx, 'options', e.target.value)} className="flex-1" />
                    )}
                    <label className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
                      <input type="checkbox" checked={field.required} onChange={e => updateField(idx, 'required', e.target.checked)} /> 必填
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Switch checked={form.enabled} onChange={v => setForm({ ...form, enabled: v })} label="启用表单" />
        </div>
      </Dialog>

      <Dialog open={!!submissions} onClose={() => setSubmissions(null)} title="表单提交记录" width="max-w-2xl">
        {submissions && submissions.length === 0 ? <Empty text="暂无提交记录" icon="📭" /> : (
          <div className="space-y-3">
            {submissions.map((s, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400 mb-2">{s.created_at}</p>
                {Object.entries(s.data || {}).map(([k, v]) => (
                  <div key={k} className="text-sm flex gap-2">
                    <span className="text-gray-500">{k}:</span>
                    <span className="text-gray-800">{Array.isArray(v) ? v.join(', ') : String(v)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </Dialog>

      <Dialog open={menuDialog} onClose={() => setMenuDialog(false)} title={`添加到菜单 - ${currentForm ? currentForm.name : ''}`}
        footer={<><Button variant="outline" onClick={() => setMenuDialog(false)}>取消</Button><Button onClick={addToMenu}>确认添加</Button></>}>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">将此表单添加为后台菜单项，点击侧边栏菜单即可打开表单填写页面</p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="菜单名称 *" value={menuForm.name} onChange={e => setMenuForm({ ...menuForm, name: e.target.value })} />
            <Input label="图标（emoji）" value={menuForm.icon} onChange={e => setMenuForm({ ...menuForm, icon: e.target.value })} placeholder="如 📝" />
          </div>
          <Select label="上级菜单" value={menuForm.parent_id} onChange={e => setMenuForm({ ...menuForm, parent_id: parseInt(e.target.value) })} options={[{ value: 0, label: '一级菜单（无上级）' }, ...(menus || []).filter(m => m.parent_id === 0).map(m => ({ value: m.id, label: m.name }))]} />
          <Input label="排序" type="number" value={menuForm.sort_order} onChange={e => setMenuForm({ ...menuForm, sort_order: parseInt(e.target.value) || 0 })} />
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            <p>菜单路径将自动设置为：<code className="bg-white px-1 rounded">/admin/form/{currentForm ? currentForm.id : ''}</code></p>
            <p className="mt-1 text-xs">添加后刷新页面，侧边栏将显示该菜单项</p>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
