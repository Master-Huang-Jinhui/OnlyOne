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

export default function Forms() {
  const [forms, setForms] = useState([])
  const [dialog, setDialog] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [submissions, setSubmissions] = useState(null)

  useEffect(() => { load() }, [])
  const load = () => api.getForms().then(setForms).catch(() => {})

  const openAdd = () => { setEditing(null); setForm(emptyForm); setDialog(true) }
  const openEdit = (f) => { setEditing(f); setForm({ ...f, fields: f.fields || [] }); setDialog(true) }

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
        <div><h2 className="text-xl font-bold text-gray-800">表单管理</h2><p className="text-sm text-gray-400 mt-1">自定义表单，支持文本、下拉、日期、时间等主流字段</p></div>
        <Button onClick={openAdd}>+ 创建表单</Button>
      </div>

      <Card>
        <Table columns={[
          { header: '表单名称', render: f => <div><p className="font-medium text-gray-800">{f.name}</p><p className="text-xs text-gray-400">{f.description || '-'}</p></div> },
          { header: '字段数', render: f => <Badge variant="primary">{f.fields ? f.fields.length : 0} 个字段</Badge> },
          { header: '状态', render: f => <Badge variant={f.enabled ? 'success' : 'default'}>{f.enabled ? '启用' : '停用'}</Badge> },
          { header: '创建时间', render: f => <span className="text-xs text-gray-400">{f.created_at}</span> }
        ]} data={forms} actions={f => (
          <div className="flex gap-2">
            <button onClick={() => viewSubmissions(f.id)} className="text-green-500 hover:text-green-700 text-sm">提交记录</button>
            <button onClick={() => openEdit(f)} className="text-primary-500 hover:text-primary-700 text-sm">编辑</button>
            <button onClick={() => remove(f.id)} className="text-red-400 hover:text-red-600 text-sm">删除</button>
          </div>
        )} />
      </Card>

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
    </div>
  )
}
