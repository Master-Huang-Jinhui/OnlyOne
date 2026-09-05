import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { Card, Button, Input, Textarea, Select, Empty, toast } from '../../components/ui'

export default function FormRenderer() {
  const { id } = useParams()
  const [form, setForm] = useState(null)
  const [values, setValues] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => { loadForm() }, [id])

  const loadForm = async () => {
    try {
      const data = await api.getPublicForm(id)
      setForm(data)
      const initValues = {}
      ;(data.fields || []).forEach(f => {
        if (f.type === 'checkbox') initValues[f.label] = []
        else if (f.type === 'switch') initValues[f.label] = false
        else initValues[f.label] = ''
      })
      setValues(initValues)
    } catch (e) { toast(e.message, 'error') }
  }

  const handleChange = (label, value) => { setValues(prev => ({ ...prev, [label]: value })) }

  const handleCheckbox = (label, option, checked) => {
    setValues(prev => {
      const arr = prev[label] || []
      if (checked) return { ...prev, [label]: [...arr, option] }
      return { ...prev, [label]: arr.filter(o => o !== option) }
    })
  }

  const validate = () => {
    for (const field of form.fields) {
      if (field.required) {
        const val = values[field.label]
        if (field.type === 'checkbox') {
          if (!val || val.length === 0) { toast(`请填写「${field.label}」`, 'error'); return false }
        } else if (!val || val === '') {
          toast(`请填写「${field.label}」`, 'error'); return false
        }
      }
    }
    return true
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try { await api.submitForm(id, values); setSubmitted(true); toast('提交成功') }
    catch (e) { toast(e.message, 'error') } finally { setSubmitting(false) }
  }

  const resetForm = () => {
    const initValues = {}
    ;(form.fields || []).forEach(f => {
      if (f.type === 'checkbox') initValues[f.label] = []
      else if (f.type === 'switch') initValues[f.label] = false
      else initValues[f.label] = ''
    })
    setValues(initValues); setSubmitted(false)
  }

  if (!form) return <div className="flex items-center justify-center h-64"><Empty text="加载中..." icon="⏳" /></div>

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="p-12 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">提交成功</h2>
          <p className="text-gray-500 mb-6">感谢您的填写，我们已收到您的信息</p>
          <Button variant="outline" onClick={resetForm}>再填一份</Button>
        </Card>
      </div>
    )
  }

  const renderField = (field, idx) => {
    const options = field.options ? field.options.split(',').map(o => o.trim()).filter(Boolean) : []
    switch (field.type) {
      case 'text': case 'email': case 'tel': case 'number':
        return <Input key={idx} label={`${field.label}${field.required ? ' *' : ''}`} type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : 'text'} placeholder={field.placeholder} value={values[field.label] || ''} onChange={e => handleChange(field.label, e.target.value)} />
      case 'textarea':
        return <Textarea key={idx} label={`${field.label}${field.required ? ' *' : ''}`} placeholder={field.placeholder} rows={4} value={values[field.label] || ''} onChange={e => handleChange(field.label, e.target.value)} />
      case 'select':
        return <Select key={idx} label={`${field.label}${field.required ? ' *' : ''}`} value={values[field.label] || ''} onChange={e => handleChange(field.label, e.target.value)} options={[{ value: '', label: field.placeholder || '请选择' }, ...options.map(o => ({ value: o, label: o }))]} />
      case 'radio':
        return (
          <div key={idx}>
            <label className="block text-sm font-medium text-gray-700 mb-2">{field.label}{field.required && ' *'}</label>
            <div className="flex flex-wrap gap-4">
              {options.map((opt, i) => (
                <label key={i} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name={field.label} value={opt} checked={values[field.label] === opt} onChange={() => handleChange(field.label, opt)} className="w-4 h-4" />
                  <span className="text-sm text-gray-700">{opt}</span>
                </label>
              ))}
            </div>
          </div>
        )
      case 'checkbox':
        return (
          <div key={idx}>
            <label className="block text-sm font-medium text-gray-700 mb-2">{field.label}{field.required && ' *'}</label>
            <div className="flex flex-wrap gap-4">
              {options.map((opt, i) => (
                <label key={i} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={(values[field.label] || []).includes(opt)} onChange={e => handleCheckbox(field.label, opt, e.target.checked)} className="w-4 h-4" />
                  <span className="text-sm text-gray-700">{opt}</span>
                </label>
              ))}
            </div>
          </div>
        )
      case 'date':
        return <Input key={idx} label={`${field.label}${field.required ? ' *' : ''}`} type="date" value={values[field.label] || ''} onChange={e => handleChange(field.label, e.target.value)} />
      case 'datetime':
        return <Input key={idx} label={`${field.label}${field.required ? ' *' : ''}`} type="datetime-local" value={values[field.label] || ''} onChange={e => handleChange(field.label, e.target.value)} />
      case 'time':
        return <Input key={idx} label={`${field.label}${field.required ? ' *' : ''}`} type="time" value={values[field.label] || ''} onChange={e => handleChange(field.label, e.target.value)} />
      case 'switch':
        return (
          <div key={idx} className="flex items-center justify-between py-2">
            <label className="text-sm font-medium text-gray-700">{field.label}{field.required && ' *'}</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={values[field.label] || false} onChange={e => handleChange(field.label, e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        )
      default:
        return <Input key={idx} label={`${field.label}${field.required ? ' *' : ''}`} placeholder={field.placeholder} value={values[field.label] || ''} onChange={e => handleChange(field.label, e.target.value)} />
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{form.name}</h2>
        {form.description && <p className="text-gray-500 mt-1">{form.description}</p>}
      </div>
      <Card className="p-6">
        {!form.fields || form.fields.length === 0 ? <Empty text="该表单暂无字段" icon="📝" /> : (
          <div className="space-y-5">
            {form.fields.map((field, idx) => renderField(field, idx))}
            <div className="pt-4 border-t">
              <Button onClick={handleSubmit} disabled={submitting} className="w-full">{submitting ? '提交中...' : '提交'}</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
