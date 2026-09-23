import { useState, useEffect, useRef } from 'react'
import { api } from '../../lib/api'
import { toast } from '../../components/ui'

export default function PlatformReports() {
  const [reports, setReports] = useState([])
  const [platforms, setPlatforms] = useState([])
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef(null)
  const [form, setForm] = useState({
    platform_id: '',
    month: new Date().toISOString().slice(0, 7),
    total_sales: '',
    order_count: '',
    platform_fee: '',
    net_revenue: '',
    note: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [reportsRes, platformsRes] = await Promise.all([
        api.getPlatformReports(),
        api.getPlatforms()
      ])
      // 后端返回 { reports: [...] }，取 reports 字段；如果直接是数组也兼容
      const list = reportsRes?.reports || (Array.isArray(reportsRes) ? reportsRes : [])
      setReports(list)
      setPlatforms(Array.isArray(platformsRes) ? platformsRes : (platformsRes?.platforms || []))
    } catch (e) {
      toast('加载失败：' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!form.platform_id) {
      toast('请先选择外卖平台', 'error')
      return
    }
    if (!form.month) {
      toast('请先选择月份', 'error')
      return
    }
    uploadFile(file)
  }

  const uploadFile = async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('platform_id', form.platform_id)
    formData.append('month', form.month)
    formData.append('total_sales', form.total_sales)
    formData.append('order_count', form.order_count)
    formData.append('platform_fee', form.platform_fee)
    formData.append('net_revenue', form.net_revenue)
    try {
      await api.uploadPlatformReport(formData)
      toast('上传成功')
      loadData()
    } catch (e) {
      toast('上传失败：' + e.message, 'error')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.platform_id) {
      toast('请选择外卖平台', 'error')
      return
    }
    if (!form.month) {
      toast('请选择月份', 'error')
      return
    }
    try {
      await api.createPlatformReport(form)
      toast('添加成功')
      setForm({
        platform_id: '',
        month: new Date().toISOString().slice(0, 7),
        total_sales: '',
        order_count: '',
        platform_fee: '',
        net_revenue: '',
        note: ''
      })
      loadData()
    } catch (e) {
      toast('添加失败：' + e.message, 'error')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('确定删除这条报表记录吗？')) return
    try {
      await api.deletePlatformReport(id)
      toast('删除成功')
      loadData()
    } catch (e) {
      toast('删除失败：' + e.message, 'error')
    }
  }

  const getPlatformName = (id) => {
    const p = platforms.find(p => p.id === id)
    return p?.name || '未知平台'
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">外卖报表</h2>
        <p className="text-sm text-gray-500 mt-1">上传或手动录入各外卖平台的月度报表</p>
      </div>

      {/* 添加表单 */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="font-semibold text-gray-800 mb-4">添加报表</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">外卖平台 *</label>
            <select
              value={form.platform_id}
              onChange={e => setForm({ ...form, platform_id: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">请选择</option>
              {platforms.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">月份 *</label>
            <input
              type="month"
              value={form.month}
              onChange={e => setForm({ ...form, month: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">总销售额 ($)</label>
            <input
              type="number"
              step="0.01"
              value={form.total_sales}
              onChange={e => setForm({ ...form, total_sales: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">订单数</label>
            <input
              type="number"
              value={form.order_count}
              onChange={e => setForm({ ...form, order_count: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">平台手续费 ($)</label>
            <input
              type="number"
              step="0.01"
              value={form.platform_fee}
              onChange={e => setForm({ ...form, platform_fee: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">净收入 ($)</label>
            <input
              type="number"
              step="0.01"
              value={form.net_revenue}
              onChange={e => setForm({ ...form, net_revenue: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="0.00"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-gray-600 mb-1">备注</label>
            <input
              type="text"
              value={form.note}
              onChange={e => setForm({ ...form, note: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="备注说明"
            />
          </div>
          <div className="col-span-2 md:col-span-4 flex gap-2">
            <button
              type="submit"
              className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-700"
            >
              添加报表
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200"
            >
              上传报表文件（CSV/PDF）
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </form>
      </div>

      {/* 报表列表 */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="font-semibold text-gray-800">报表记录</h3>
        </div>
        {loading ? (
          <div className="p-6 text-center text-gray-500 text-sm">加载中...</div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <div className="text-4xl mb-2">📊</div>
            <p>暂无报表记录</p>
            <p className="text-xs mt-1">上传 CSV/PDF 或手动添加</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">平台</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">月份</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">销售额</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">订单数</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">手续费</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">净收入</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">备注</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reports.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm">{getPlatformName(r.platform_id)}</td>
                  <td className="px-6 py-3 text-sm">{r.month}</td>
                  <td className="px-6 py-3 text-sm text-right">${Number(r.total_sales || 0).toFixed(2)}</td>
                  <td className="px-6 py-3 text-sm text-right">{r.order_count || 0}</td>
                  <td className="px-6 py-3 text-sm text-right">${Number(r.platform_fee || 0).toFixed(2)}</td>
                  <td className="px-6 py-3 text-sm text-right font-medium">${Number(r.net_revenue || 0).toFixed(2)}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{r.note || '-'}</td>
                  <td className="px-6 py-3 text-center">
                    <div className="flex gap-2 justify-center">
                      {r.file_path && (
                        <a
                          href={'/' + r.file_path.replace(/\\/g, '/').replace(/.*uploads\//, 'uploads/')}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary-600 text-sm hover:text-primary-700"
                        >
                          查看文件
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
