import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Button, Input, Dialog, toast, Badge } from '../../components/ui'

export default function Tables() {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ table_no: '', sort_order: 0 })
  const [qrTable, setQrTable] = useState(null)

  const load = () => {
    setLoading(true)
    api.getTables().then(setTables).catch(e => toast(e.message, 'error')).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSave = () => {
    if (!form.table_no.trim()) { toast('请输入桌号', 'error'); return }
    if (editing) {
      api.updateTable(editing.id, form).then(() => { toast('保存成功'); setShowAdd(false); setEditing(null); load() }).catch(e => toast(e.message, 'error'))
    } else {
      api.createTable(form).then(() => { toast('添加成功'); setShowAdd(false); load() }).catch(e => toast(e.message, 'error'))
    }
  }

  const handleClear = (table) => {
    if (!confirm(`确定清桌 ${table.table_no}？清桌后当前订单将不再在前台显示，下一桌扫码是全新的。`)) return
    api.clearTable(table.id).then(() => { toast('已清桌'); load() }).catch(e => toast(e.message, 'error'))
  }

  const handleDelete = (table) => {
    if (!confirm(`确定删除餐桌 ${table.table_no}？`)) return
    api.deleteTable(table.id).then(() => { toast('已删除'); load() }).catch(e => toast(e.message, 'error'))
  }

  const getQrUrl = (tableNo) => `${window.location.origin}/menu?table=${encodeURIComponent(tableNo)}`

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">餐桌管理</h1>
          <p className="text-sm text-gray-400 mt-1">管理堂吃餐桌、生成扫码点餐二维码、清桌</p>
        </div>
        <Button onClick={() => { setForm({ table_no: '', sort_order: tables.length + 1 }); setEditing(null); setShowAdd(true) }}>+ 添加餐桌</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tables.map(t => (
          <div key={t.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-800">{t.table_no}</h3>
              <Badge color={t.status === 'occupied' ? 'orange' : 'green'}>{t.status === 'occupied' ? '占用中' : '空闲'}</Badge>
            </div>
            <div className="text-sm text-gray-500 space-y-1 mb-4">
              <div className="flex justify-between"><span>当前订单</span><span className="font-medium text-gray-700">{t.active_orders || 0} 笔</span></div>
              <div className="flex justify-between"><span>当前消费</span><span className="font-medium text-primary-600">${(t.active_total || 0).toFixed(2)}</span></div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setQrTable(t)}>二维码</Button>
              <Button size="sm" variant="outline" onClick={() => { setForm({ table_no: t.table_no, sort_order: t.sort_order }); setEditing(t); setShowAdd(true) }}>编辑</Button>
              <Button size="sm" variant="outline" color="orange" onClick={() => handleClear(t)}>清桌</Button>
              <Button size="sm" variant="outline" color="red" onClick={() => handleDelete(t)}>删</Button>
            </div>
          </div>
        ))}
      </div>

      {tables.length === 0 && !loading && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">🪑</div>
          <p>还没有餐桌，点击右上角添加</p>
        </div>
      )}

      <Dialog open={showAdd} onClose={() => { setShowAdd(false); setEditing(null) }} title={editing ? '编辑餐桌' : '添加餐桌'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">桌号</label>
            <Input value={form.table_no} onChange={e => setForm({ ...form, table_no: e.target.value })} placeholder="如 A1, B2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
            <Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleSave}>{editing ? '保存' : '添加'}</Button>
            <Button variant="outline" className="flex-1" onClick={() => { setShowAdd(false); setEditing(null) }}>取消</Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={!!qrTable} onClose={() => setQrTable(null)} title={`餐桌 ${qrTable?.table_no} 二维码`} width="max-w-md">
        {qrTable && (
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-4">顾客扫码后直接进入菜单页，自动关联餐桌 {qrTable.table_no}</p>
            <div className="bg-white p-4 rounded-xl inline-block border border-gray-200 mb-4">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(getQrUrl(qrTable.table_no))}`} alt={`餐桌${qrTable.table_no}二维码`} className="w-60 h-60" />
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-400 mb-1">扫码地址</p>
              <p className="text-sm text-gray-600 break-all">{getQrUrl(qrTable.table_no)}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { navigator.clipboard.writeText(getQrUrl(qrTable.table_no)); toast('链接已复制') }}>复制链接</Button>
              <Button className="flex-1" onClick={() => window.open(getQrUrl(qrTable.table_no), '_blank')}>预览</Button>
            </div>
            <p className="text-xs text-gray-400 mt-3">右键图片可保存打印，贴在餐桌上</p>
          </div>
        )}
      </Dialog>
    </div>
  )
}
