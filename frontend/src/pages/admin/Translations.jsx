import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { useLanguage } from '../../context/LanguageContext'
import { Card, Button, Input, Dialog, toast, Empty } from '../../components/ui'

export default function Translations() {
  const { t } = useLanguage()
  const [data, setData] = useState({ byPage: {}, total: 0 })
  const [loading, setLoading] = useState(false)
  const [editDialog, setEditDialog] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ key: '', page: 'common', description: '', zh: '', en: '', es: '' })
  const [activePage, setActivePage] = useState('all')

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try { const result = await api.getAdminTranslations(); setData(result) } catch (e) { toast(e.message, 'error') } finally { setLoading(false) }
  }

  const pages = Object.keys(data.byPage || {})
  const allItems = activePage === 'all' ? Object.values(data.byPage || {}).flat() : (data.byPage?.[activePage] || [])

  const openAdd = () => { setEditing(null); setForm({ key: '', page: 'common', description: '', zh: '', en: '', es: '' }); setEditDialog(true) }
  const openEdit = (item) => {
    setEditing(item)
    setForm({ key: item.key, page: item.page, description: item.description || '', zh: item.translations?.zh || '', en: item.translations?.en || '', es: item.translations?.es || '' })
    setEditDialog(true)
  }

  const save = async () => {
    if (!form.key) { toast(t('translations.keyRequired', 'key 必填'), 'error'); return }
    try {
      const translations = {}
      if (form.zh) translations.zh = form.zh
      if (form.en) translations.en = form.en
      if (form.es) translations.es = form.es
      if (editing) { await api.updateTranslation(editing.id, { key: form.key, page: form.page, description: form.description, translations }); toast(t('translations.updated', '更新成功')) }
      else { await api.createTranslation({ key: form.key, page: form.page, description: form.description, translations }); toast(t('translations.added', '添加成功')) }
      setEditDialog(false); load()
    } catch (e) { toast(e.message, 'error') }
  }

  const remove = async (item) => {
    if (!confirm(`${t('translations.deleteMsgPrefix', '确定删除翻译「')}${item.key}${t('translations.deleteMsgSuffix', '」？')}`)) return
    try { await api.deleteTranslation(item.id); toast(t('translations.deleted', '已删除')); load() } catch (e) { toast(e.message, 'error') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t('translations.title', '多语言字典')}</h2>
          <p className="text-sm text-gray-400 mt-1">{t('translations.subtitlePrefix', '管理系统所有文本的多语言翻译，共')} {data.total} {t('translations.subtitleSuffix', '条')}</p>
        </div>
        <Button onClick={openAdd}>{t('translations.addBtn', '+ 添加翻译')}</Button>
      </div>

      {pages.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setActivePage('all')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activePage === 'all' ? 'bg-primary-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {t('translations.all', '全部')} ({data.total})
          </button>
          {pages.map(page => (
            <button key={page} onClick={() => setActivePage(page)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activePage === page ? 'bg-primary-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {page} ({data.byPage[page]?.length || 0})
            </button>
          ))}
        </div>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400">{t('common.loading', '加载中...')}</div>
        ) : allItems.length === 0 ? (
          <Empty text={t('translations.noTranslations', '暂无翻译')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('translations.colKey', 'Key')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('translations.page', '页面')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('translations.zh', '中文')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('translations.en', 'English')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('translations.es', 'Español')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('common.action', '操作')}</th>
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
                        <button onClick={() => openEdit(item)} className="text-primary-500 hover:text-primary-700 text-xs">{t('common.edit', '编辑')}</button>
                        <button onClick={() => remove(item)} className="text-red-400 hover:text-red-600 text-xs">{t('common.delete', '删除')}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={editDialog} onClose={() => setEditDialog(false)} title={editing ? t('translations.editTitle', '编辑翻译') : t('translations.addTitle', '添加翻译')} width="max-w-lg">
        <div className="space-y-4">
          <Input label={t('translations.keyLabel', 'Key *')} value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} placeholder={t('translations.keyPh', '如：common.save')} disabled={!!editing} />
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('translations.pageLabel', '页面分类')} value={form.page} onChange={e => setForm({ ...form, page: e.target.value })} placeholder={t('translations.pagePh', 'common/admin/employee')} />
            <Input label={t('translations.descLabel', '说明')} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={t('translations.optional', '可选')} />
          </div>
          <Input label={t('translations.zhLabel', '中文 (zh)')} value={form.zh} onChange={e => setForm({ ...form, zh: e.target.value })} placeholder={t('translations.zhPh', '保存')} />
          <Input label={t('translations.enLabel', 'English (en)')} value={form.en} onChange={e => setForm({ ...form, en: e.target.value })} placeholder={t('translations.enPh', 'Save')} />
          <Input label={t('translations.esLabel', 'Español (es)')} value={form.es} onChange={e => setForm({ ...form, es: e.target.value })} placeholder={t('translations.esPh', 'Guardar（可选）')} />
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setEditDialog(false)}>{t('common.cancel', '取消')}</Button>
            <Button className="flex-1" onClick={save}>{t('common.save', '保存')}</Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}