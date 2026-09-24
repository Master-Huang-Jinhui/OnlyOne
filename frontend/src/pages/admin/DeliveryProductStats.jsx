import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useLanguage } from '../context/LanguageContext'

export default function DeliveryProductStats() {
  const { t } = useLanguage()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sortBy, setSortBy] = useState('quantity')

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.post('/stats/delivery-products', { start_date: startDate, end_date: endDate })
      setData(res)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const sortedProducts = data?.products ? [...data.products].sort((a, b) => sortBy === 'revenue' ? b.revenue - a.revenue : b.quantity - a.quantity) : []

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">{t('delivery_products.title', '外卖菜品报表')}</h1>
      <p className="text-sm text-gray-500 mb-6">{t('delivery_products.subtitle', '统计配送和外带订单中各菜品的销售情况')}</p>
      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
        <span className="text-gray-400">~</span>
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
        <button onClick={load} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-700">{t('common.search', '查询')}</button>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setSortBy('quantity')} className={`px-3 py-2 rounded-lg text-sm ${sortBy === 'quantity' ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}>{t('delivery_products.sort_by_qty', '按销量')}</button>
          <button onClick={() => setSortBy('revenue')} className={`px-3 py-2 rounded-lg text-sm ${sortBy === 'revenue' ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}>{t('delivery_products.sort_by_rev', '按营收')}</button>
        </div>
      </div>
      {loading && <div className="text-center py-12 text-gray-400">{t('common.loading', '加载中...')}</div>}
      {data && !loading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm"><div className="text-xs text-gray-500 mb-1">{t('delivery_products.total_orders', '外卖订单数')}</div><div className="text-2xl font-bold">{data.summary.totalOrders}</div></div>
            <div className="bg-white rounded-xl p-4 shadow-sm"><div className="text-xs text-gray-500 mb-1">{t('delivery_products.total_qty', '总销量')}</div><div className="text-2xl font-bold">{data.summary.totalQty}</div></div>
            <div className="bg-white rounded-xl p-4 shadow-sm"><div className="text-xs text-gray-500 mb-1">{t('delivery_products.total_revenue', '总营收')}</div><div className="text-2xl font-bold text-green-600">${Number(data.summary.totalRevenue).toFixed(2)}</div></div>
            <div className="bg-white rounded-xl p-4 shadow-sm"><div className="text-xs text-gray-500 mb-1">{t('delivery_products.avg_order', '客单价')}</div><div className="text-2xl font-bold text-blue-600">${Number(data.summary.avgOrderValue).toFixed(2)}</div></div>
          </div>
          {data.categories?.length > 0 && (
            <div className="bg-white rounded-xl p-5 shadow-sm mb-6">
              <h2 className="font-bold mb-4">{t('delivery_products.category_summary', '品类汇总')}</h2>
              <div className="space-y-3">
                {data.categories.map(c => (
                  <div key={c.category_id}>
                    <div className="flex justify-between text-sm mb-1"><span>{c.category_name}</span><span className="text-gray-500">{c.product_count} 个菜品 · {c.quantity} 份 · ${Number(c.revenue).toFixed(2)}</span></div>
                    <div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-primary-500 h-2 rounded-full" style={{ width: data.summary.totalRevenue > 0 ? (c.revenue / data.summary.totalRevenue * 100) + '%' : '0%' }} /></div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b"><h2 className="font-bold">{t('delivery_products.product_detail', '菜品明细')}</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">{t('delivery_products.product_name', '菜品名称')}</th>
                    <th className="px-4 py-3 text-left">{t('delivery_products.category', '品类')}</th>
                    <th className="px-4 py-3 text-right">{t('delivery_products.quantity', '销量')}</th>
                    <th className="px-4 py-3 text-right">{t('delivery_products.qty_pct', '销量占比')}</th>
                    <th className="px-4 py-3 text-right">{t('delivery_products.revenue', '营收')}</th>
                    <th className="px-4 py-3 text-right">{t('delivery_products.rev_pct', '营收占比')}</th>
                    <th className="px-4 py-3 text-right">{t('delivery_products.order_count', '出现次数')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedProducts.length === 0 && <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-400">{t('delivery_products.no_data', '暂无外卖订单数据')}</td></tr>}
                  {sortedProducts.map((p, i) => (
                    <tr key={p.product_id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-gray-500">{p.category_name}</td>
                      <td className="px-4 py-3 text-right font-bold">{p.quantity}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{p.quantity_pct}%</td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">${Number(p.revenue).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{p.revenue_pct}%</td>
                      <td className="px-4 py-3 text-right text-gray-500">{p.order_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
