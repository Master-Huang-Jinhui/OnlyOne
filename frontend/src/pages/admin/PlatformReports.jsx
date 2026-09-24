import { useState, useEffect, useRef } from 'react'
import { api } from '../../lib/api'
import { toast } from '../../components/ui'
import { useConfirm } from '../../components/ConfirmDialog'

export default function PlatformReports() {
  const confirm = useConfirm()
  const [reports, setReports] = useState([])
  const [platforms, setPlatforms] = useState([])
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => { loadData() }, [])

  // 加载报表列表和平台列表
  const loadData = async () => {
    setLoading(true)
    try {
      const [reportsRes, platformsRes] = await Promise.all([api.getPlatformReports(), api.getPlatforms()])
      const list = reportsRes?.reports || (Array.isArray(reportsRes) ? reportsRes : [])
      setReports(list)
      setPlatforms(Array.isArray(platformsRes) ? platformsRes : (platformsRes?.platforms || []))
    } catch (e) { toast('加载失败：' + e.message, 'error') }
    finally { setLoading(false) }
  }

  // 文件选择后立即上传
  const handleFileSelect = (e) => { const file = e.target.files?.[0]; if (file) uploadFile(file) }

  // 上传报表文件；force=true时跳过重复检查直接覆盖
  const uploadFile = async (file, force = false) => {
    const formData = new FormData()
    formData.append('file', file)
    if (force) formData.append('force', 'true')
    try {
      await api.uploadPlatformReport(formData)
      toast('上传成功')
      loadData()
    } catch (e) {
      // 409重复：弹紫色确认框询问是否覆盖，不弹红色错误
      if (e.duplicate) {
        if (await confirm({
          title: '🟣 重复报表确认',
          message: '该平台这个月已经上传过报表了。\n\n确定要覆盖原有报表吗？覆盖后旧数据将被替换，此操作不可恢复。',
          confirmText: '覆盖上传',
          cancelText: '取消',
          variant: 'purple'
        })) {
          uploadFile(file, true)
        }
        return
      }
      toast('上传失败：' + e.message, 'error')
    }
  }

  // 删除报表记录
  const handleDelete = async (id) => {
    if (!await confirm({ title: '删除报表', message: '确定删除这条报表记录吗？此操作不可恢复。', variant: 'danger' })) return
    try { await api.deletePlatformReport(id); toast('删除成功'); loadData() }
    catch (e) { toast('删除失败：' + e.message, 'error') }
  }

  // 根据平台ID查找平台名称
  const getPlatformName = (id) => platforms.find(p => p.id === id)?.name || '未知'

  // 找出重复的平台+月份组合，用于紫色标记
  const duplicateKeys = new Set()
  const countMap = {}
  reports.forEach(r => { const key = `${r.platform_id}_${r.month}`; countMap[key] = (countMap[key] || 0) + 1 })
  Object.keys(countMap).forEach(key => { if (countMap[key] > 1) duplicateKeys.add(key) })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">外卖报表月报</h1>
        <p className="text-sm text-gray-500 mt-1">上传和管理各外卖平台的月度报表（自动识别平台和提取数据）</p>
      </div>

      {/* 上传按钮 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">上传月报表</h2>
          <p className="text-sm text-gray-500 mt-1">支持 Grubhub/Uber Eats/DoorDash 的 PDF 或 CSV 报表，自动识别平台和数据</p>
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 font-medium"
        >
          选择文件上传
        </button>
        <input ref={fileInputRef} type="file" accept=".csv,.pdf" onChange={handleFileSelect} className="hidden" />
      </div>

      {/* 报表列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">报表列表</h2>
        </div>
        {loading ? <div className="p-8 text-center text-gray-400">加载中...</div>
        : reports.length === 0 ? <div className="p-8 text-center text-gray-400">暂无报表数据</div>
        : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">平台</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">月份</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">总销售额</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">订单数</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">退菜数</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">退菜金额</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">客单价</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">平台佣金</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">佣金率</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">净收入</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">备注</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm text-gray-800">{r.platform_name || getPlatformName(r.platform_id)}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">
                    {duplicateKeys.has(`${r.platform_id}_${r.month}`) ? (
                      <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">{r.month} ⚠️重复</span>
                    ) : r.month}
                  </td>
                  <td className="px-6 py-3 text-sm text-right text-gray-800">${r.total_sales?.toFixed(2)}</td>
                  <td className="px-6 py-3 text-sm text-right text-gray-600">{r.order_count}</td>
                  <td className="px-6 py-3 text-sm text-right text-red-500">{r.refund_count || 0}</td>
                  <td className="px-6 py-3 text-sm text-right text-red-500">${(r.refund_amount || 0).toFixed(2)}</td>
                  <td className="px-6 py-3 text-sm text-right text-gray-600">{r.order_count > 0 ? '$' + (r.total_sales / r.order_count).toFixed(2) : '-'}</td>
                  <td className="px-6 py-3 text-sm text-right text-red-600">-${r.platform_fee?.toFixed(2)}</td>
                  <td className="px-6 py-3 text-sm text-right text-gray-500">{r.total_sales > 0 ? ((r.platform_fee / r.total_sales) * 100).toFixed(1) + '%' : '-'}</td>
                  <td className="px-6 py-3 text-sm text-right text-green-600 font-medium">${r.net_revenue?.toFixed(2)}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{r.note || '-'}</td>
                  <td className="px-6 py-3 text-center">
                    <div className="flex gap-2 justify-center">
                      {r.file_path && <a href={r.file_path} target="_blank" rel="noreferrer" className="text-primary-600 text-sm hover:text-primary-700">在线查看</a>}
                      <button onClick={() => handleDelete(r.id)} className="text-red-600 text-sm hover:text-red-700">删除</button>
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
