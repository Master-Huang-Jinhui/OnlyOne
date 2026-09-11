import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Select, Empty } from '../../components/ui'

export default function Reports() {
  const [dateRange, setDateRange] = useState('7')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [overview, setOverview] = useState({ totalOrders: 0, totalRevenue: 0, avgOrder: 0, totalQty: 0, todayOrders: 0, todayRevenue: 0 })
  const [trend, setTrend] = useState([])
  const [categorySales, setCategorySales] = useState([])
  const [hourlySales, setHourlySales] = useState([])
  const [diningTypeSales, setDiningTypeSales] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [loading, setLoading] = useState(false)

  const getDateParams = () => {
    if (startDate && endDate) return { start_date: startDate, end_date: endDate }
    const days = parseInt(dateRange) || 7
    const end = new Date()
    const start = new Date(Date.now() - (days - 1) * 86400000)
    return { start_date: start.toISOString().split('T')[0], end_date: end.toISOString().split('T')[0] }
  }

  const load = async () => {
    setLoading(true)
    const params = getDateParams()
    try {
      const [ov, tr, cat, hr, dt, top] = await Promise.all([
        api.getStatsOverview(params),
        api.getSalesTrend({ ...params, days: parseInt(dateRange) || 7 }),
        api.getCategorySales(params),
        api.getHourlySales(params),
        api.getDiningTypeSales(params),
        api.getTopProductsReport({ ...params, limit: 10 })
      ])
      setOverview(ov || { totalOrders: 0, totalRevenue: 0, avgOrder: 0, totalQty: 0 })
      setTrend(Array.isArray(tr) ? tr : [])
      setCategorySales(Array.isArray(cat) ? cat : [])
      setHourlySales(Array.isArray(hr) ? hr : [])
      setDiningTypeSales(Array.isArray(dt) ? dt : [])
      setTopProducts(Array.isArray(top) ? top : [])
    } catch (e) { console.error('报表加载失败:', e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [dateRange, startDate, endDate])

  const maxTrendRevenue = Math.max(...trend.map(t => t.revenue), 1)
  const maxCategoryRevenue = Math.max(...categorySales.map(c => c.revenue), 1)
  const maxHourlyOrders = Math.max(...hourlySales.map(h => h.orders), 1)
  const maxTopQty = Math.max(...topProducts.map(p => p.quantity), 1)
  const totalDiningRevenue = diningTypeSales.reduce((s, d) => s + (d.revenue || 0), 0)

  const diningColors = { dinein: 'bg-blue-500', takeout: 'bg-green-500', delivery: 'bg-orange-500' }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">📈 深度报表</h2>
          <p className="text-sm text-gray-400 mt-1">多维度数据分析，助力经营决策</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onChange={e => { setDateRange(e.target.value); setStartDate(''); setEndDate('') }}
            options={[{ value: '7', label: '最近7天' }, { value: '14', label: '最近14天' }, { value: '30', label: '最近30天' }, { value: '90', label: '最近90天' }]} />
          <div className="flex items-center gap-2">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <span className="text-gray-400">至</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <Button variant="outline" onClick={load} disabled={loading}>{loading ? '加载中...' : '🔄 刷新'}</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <p className="text-sm opacity-80">总订单数</p>
          <p className="text-3xl font-bold mt-1">{overview.totalOrders}</p>
          <p className="text-xs opacity-75 mt-1">今日 {overview.todayOrders} 单</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-green-500 to-green-600 text-white">
          <p className="text-sm opacity-80">总营收</p>
          <p className="text-3xl font-bold mt-1">${parseFloat(overview.totalRevenue || 0).toFixed(2)}</p>
          <p className="text-xs opacity-75 mt-1">今日 ${parseFloat(overview.todayRevenue || 0).toFixed(2)}</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <p className="text-sm opacity-80">平均客单价</p>
          <p className="text-3xl font-bold mt-1">${parseFloat(overview.avgOrder || 0).toFixed(2)}</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <p className="text-sm opacity-80">总销量（份）</p>
          <p className="text-3xl font-bold mt-1">{overview.totalQty}</p>
        </Card>
      </div>

      <Card>
        <div className="px-5 py-3 border-b">
          <h3 className="font-bold text-gray-700">📊 销售趋势</h3>
        </div>
        <div className="p-5">
          {trend.length === 0 ? (
            <Empty text="暂无数据" icon="📊" />
          ) : (
            <div className="flex items-end justify-between gap-1 h-48">
              {trend.map((t, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500">${(t.revenue / 1000).toFixed(1)}k</span>
                  <div
                    className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all hover:from-blue-600 hover:to-blue-500"
                    style={{ height: `${(t.revenue / maxTrendRevenue) * 140}px`, minHeight: '4px' }}
                    title={`${t.date}: ${t.orders}单, $${t.revenue.toFixed(2)}`}
                  />
                  <span className="text-xs text-gray-400">{t.date?.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <div className="px-5 py-3 border-b">
            <h3 className="font-bold text-gray-700">🍔 品类销售分析</h3>
          </div>
          <div className="p-5 space-y-3">
            {categorySales.length === 0 ? (
              <Empty text="暂无数据" icon="🍔" />
            ) : categorySales.map((c, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{c.category_name}</span>
                  <span className="text-gray-500">${parseFloat(c.revenue).toFixed(2)} ({c.percentage}%)</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all"
                    style={{ width: `${(c.revenue / maxCategoryRevenue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="px-5 py-3 border-b">
          <h3 className="font-bold text-gray-700">🍽️ 订单类型分布</h3>
          </div>
          <div className="p-5">
            {diningTypeSales.length === 0 ? (
              <Empty text="暂无数据" icon="🍽️" />
            ) : (
              <div className="space-y-4">
                {diningTypeSales.map((d, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className={`w-4 h-4 rounded ${diningColors[d.dining_type] || 'bg-gray-400'}`} />
                    <div className="flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-700">{d.label || d.dining_type}</span>
                        <span className="text-gray-500">{d.orders}单 · ${parseFloat(d.revenue).toFixed(2)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full mt-1 overflow-hidden">
                        <div
                          className={`h-full ${diningColors[d.dining_type] || 'bg-gray-400'} rounded-full`}
                          style={{ width: `${totalDiningRevenue > 0 ? (d.revenue / totalDiningRevenue) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-600 w-12 text-right">
                      {totalDiningRevenue > 0 ? ((d.revenue / totalDiningRevenue) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="px-5 py-3 border-b">
          <h3 className="font-bold text-gray-700">⏰ 时段分析（按小时订单量）</h3>
        </div>
        <div className="p-5">
          {hourlySales.length === 0 ? (
            <Empty text="暂无数据" icon="⏰" />
          ) : (
            <div className="flex items-end justify-between gap-0.5 h-32">
              {hourlySales.map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div
                    className={`w-full rounded-t transition-all ${h.orders > 0 ? 'bg-gradient-to-t from-purple-500 to-purple-400 hover:from-purple-600' : 'bg-gray-100'}`}
                    style={{ height: `${(h.orders / maxHourlyOrders) * 100}px`, minHeight: h.orders > 0 ? '4px' : '2px' }}
                    title={`${h.hour}:00 - ${h.orders}单, $${h.revenue.toFixed(2)}`}
                  />
                  {i % 3 === 0 && <span className="text-xs text-gray-400 mt-1">{h.hour}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="px-5 py-3 border-b">
          <h3 className="font-bold text-gray-700">🏆 TOP 10 热销商品</h3>
        </div>
        <div className="p-5">
          {topProducts.length === 0 ? (
            <Empty text="暂无数据" icon="🏆" />
          ) : (
            <div className="space-y-2">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-4 p-2 hover:bg-gray-50 rounded-lg">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{p.name} {p.name_en && <span className="text-gray-400">({p.name_en})</span>}</span>
                      <span className="text-gray-500">{p.quantity}份 · ${parseFloat(p.revenue).toFixed(2)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 rounded-full"
                        style={{ width: `${(p.quantity / maxTopQty) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}