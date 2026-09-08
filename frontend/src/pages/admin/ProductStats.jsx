import { useState, useEffect, useMemo } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Table, Badge, Select, Empty, Input } from '../../components/ui'

export default function ProductStats() {
  const [list, setList] = useState([])
  const [activeTab, setActiveTab] = useState('hot')
  const [threshold, setThreshold] = useState(15)
  const [loading, setLoading] = useState(false)

  const load = (t = threshold) => {
    setLoading(true)
    api.getProductStats(t).then(data => {
      setList(Array.isArray(data) ? data : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const hotList = useMemo(() => list.filter(i => i.tag === 'hot'), [list])
  const normalList = useMemo(() => list.filter(i => i.tag === 'normal'), [list])
  const coldList = useMemo(() => list.filter(i => i.tag === 'cold'), [list])

  const currentList = activeTab === 'hot' ? hotList : activeTab === 'normal' ? normalList : coldList

  const columns = [
    { header: 'ID', render: o => <span className="text-xs text-gray-400 font-mono">{o.product_id}</span> },
    { header: '菜品名称', render: o => <span className="font-medium text-gray-800">{o.name}</span> },
    { header: '订单出现次数', render: o => <span className="font-bold text-primary-600">{o.order_count}</span> },
    { header: '总售出份数', render: o => <span className="text-gray-700">{o.total_sold}</span> },
    { header: '单价', render: o => <span className="text-gray-500">${parseFloat(o.price).toFixed(2)}</span> },
    { header: '状态', render: o => <span className={`text-xs ${o.enabled ? 'text-green-600' : 'text-gray-400'}`}>{o.enabled ? '上架中' : '已下架'}</span> },
    { header: '标签', render: o => <Badge variant={o.tag === 'hot' ? 'danger' : o.tag === 'normal' ? 'primary' : 'default'}>{o.tagText}</Badge> }
  ]

  const tabConfig = [
    { key: 'hot', label: '🔥 热销商品', count: hotList.length, color: 'bg-red-500 text-white' },
    { key: 'normal', label: '📈 平销商品', count: normalList.length, color: 'bg-blue-500 text-white' },
    { key: 'cold', label: '🪫 零销量商品', count: coldList.length, color: 'bg-gray-400 text-white' }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">菜品销售统计</h2>
          <p className="text-sm text-gray-400 mt-1">统计各菜品订单出现次数与总销量，自动分类热销/平销/滞销</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">热销阈值：订单≥</span>
          <Input type="number" value={threshold} onChange={e => setThreshold(parseInt(e.target.value) || 15)} className="w-20" />
          <span className="text-sm text-gray-500">次</span>
          <Button onClick={() => load()}>应用</Button>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-3">
        {tabConfig.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key ? tab.color + ' shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            {tab.label} <span className="ml-1 opacity-80">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* 表格 */}
      <Card>
        {currentList.length === 0 ? (
          <Empty text="暂无数据" icon="📊" />
        ) : (
          <Table columns={columns} data={currentList} />
        )}
      </Card>

      {/* 总结 */}
      <Card className="p-5">
        <h3 className="font-semibold text-gray-800 mb-3">📋 统计总结</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400">商品总数</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{list.length}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-xs text-red-400">🔥 热销</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{hotList.length}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-400">📈 平销</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{normalList.length}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400">🪫 滞销</p>
            <p className="text-2xl font-bold text-gray-500 mt-1">{coldList.length}</p>
          </div>
        </div>
        <div className="text-sm text-gray-600 space-y-1">
          <p>💡 <strong>备货建议：</strong>{hotList.length > 0 ? `热销品 ${hotList.slice(0, 3).map(i => i.name).join('、')} 等，请保证库存充足。` : '暂无热销品，可考虑做促销活动。'}</p>
          <p>⚠️ <strong>优化建议：</strong>{coldList.length > 0 ? `${coldList.length} 款零销量商品，可考虑做套餐搭配、降价促销或下架精简菜单。` : '没有零销量商品，菜单结构健康。'}</p>
          <p>📊 <strong>热销占比：</strong>{list.length > 0 ? ((hotList.length / list.length) * 100).toFixed(1) : 0}%（热销≥{threshold}次订单）</p>
        </div>
      </Card>
    </div>
  )
}
