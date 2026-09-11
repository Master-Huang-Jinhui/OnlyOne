import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Input, Dialog, toast, Empty } from '../../components/ui'

export default function Translations() {
  const [data, setData] = useState({ byPage: {}, total: 0 })
  const [loading, setLoading] = useState(false)
  const [editDialog, setEditDialog] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ key: '', page: 'common', description: '', zh: '', en: '', es: '' })
  const [activePage, setActivePage] = useState('all')

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const result = await api.getAdminTranslations()
      setData(result)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const pages = Object.keys(data.byPage || {})
  const allItems = activePage === 'all' 
    ? Object.values(data.byPage || {}).flat()
    : (data.byPage?.[activePage] || [])

  const openAdd = () => {
    setEditing(null)
    setForm({ key: '', page: 'common', description: '', zh: '', en: '', es: '' })
    setEditDialog(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({
      key: item.key,
      page: item.page,
      description: item.description || '',
      zh: item.translations?.zh || '',
      en: item.translations?.en || '',
      es: item.translations?.es || ''
    })
    setEditDialog(true)
  }

  const save = async () => {
    if (!form.key) { toast('key 必填', 'error'); return }
    try {
      const translations = {}
      if (form.zh) translations.zh = form.zh
      if (form.en) translations.en = form.en
      if (form.es) translations.es = form.es
      
      if (editing) {
        await api.updateTranslation(editing.id, { 
          key: form.key, 
          page: form.page, 
          description: form.description, 
          translations 
        })
        toast('更新成功')
      } else {
        await api.createTranslation({ 
          key: form.key, 
          page: form.page, 
          description: form.description, 
          translations 
        })
        toast('添加成功')
      }
      setEditDialog(false)
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const remove = async (item) => {
    if (!confirm(`确定删除翻译「${item.key}」？`)) return
    try {
      await api.deleteTranslation(item.id)
      toast('已删除')
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">多语言字典</h2>
          <p className="text-sm text-gray-400 mt-1">管理系统所有文本的多语言翻译，共 {data.total} 条</p>
        </div>
        <Button onClick={openAdd}>+ 添加翻译</Button>
      </div>

      {pages.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActivePage('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activePage === 'all' ? 'bg-primary-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            全部 ({data.total})
          </button>
          {pages.map(page => (
            <button
              key={page}
              onClick={() => setActivePage(page)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activePage === page ? 'bg-primary-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {page} ({data.byPage[page]?.length || 0})
            </button>
          ))}
        </div>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400">加载中...</div>
        ) : allItems.length === 0 ? (
          <Empty text="暂无翻译" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Key</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">页面</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">中文</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">English</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Español</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {allItems.map(item => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-primary-600">{item.key}</td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 bg-gray-100 rounded">{item.page}</span></td>
                    <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">{item.translations?.zh || '-'}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">{item.translations?.en || '-'}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">{item.translations?.es || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button onClick={() => openEdit(item)} className="text-primary-500 hover:text-primary-700 text-xs">编辑</button>
                        <button onClick={() => remove(item)} className="text-red-400 hover:text-red-600 text-xs">删除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={editDialog} onClose={() => setEditDialog(false)} title={editing ? '编辑翻译' : '添加翻译'} width="max-w-lg">
        <div className="space-y-4">
          <Input label="Key *" value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} placeholder="如：common.save" disabled={!!editing} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="页面分类" value={form.page} onChange={e => setForm({ ...form, page: e.target.value })} placeholder="common/admin/employee" />
            <Input label="说明" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="可选" />
          </div>
          <Input label="中文 (zh)" value={form.zh} onChange={e => setForm({ ...form, zh: e.target.value })} placeholder="保存" />
          <Input label="English (en)" value={form.en} onChange={e => setForm({ ...form, en: e.target.value })} placeholder="Save" />
          <Input label="Español (es)" value={form.es} onChange={e => setForm({ ...form, es: e.target.value })} placeholder="Guardar（可选）" />
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setEditDialog(false)}>取消</Button>
            <Button className="flex-1" onClick={save}>保存</Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}