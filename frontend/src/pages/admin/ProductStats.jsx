import { useState, useEffect, useMemo } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Table, Badge, Select, Empty, Input } from '../../components/ui'

export default function ProductStats() {
  const [list, setList] = useState([])
  const [activeTab, setActiveTab] = useState('hot')
  const [threshold, setThreshold] = useState(15)
  const [loading, setLoading] = useState(false)

  const [profitForm, setProfitForm] = useState({
    productId: '',
    purchasePrice: '',
    purchaseQty: '',
    unit: '磅',
    portionPerUnit: '',
    sellPrice: ''
  })

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

  const profitCalc = useMemo(() => {
    const price = parseFloat(profitForm.purchasePrice) || 0
    const qty = parseFloat(profitForm.purchaseQty) || 0
    const portion = parseFloat(profitForm.portionPerUnit) || 0
    const sell = parseFloat(profitForm.sellPrice) || 0
    if (price <= 0 || qty <= 0 || portion <= 0 || sell <= 0) return null

    const unitCost = price / qty
    const portionCost = unitCost / portion
    const portionProfit = sell - portionCost
    const profitRate = (portionProfit / sell) * 100
    const totalPortions = qty * portion
    const totalRevenue = totalPortions * sell
    const totalProfit = totalRevenue - price

    let soldProfit = null
    if (profitForm.productId) {
      const p = list.find(i => String(i.product_id) === String(profitForm.productId))
      if (p && p.total_sold > 0) {
        soldProfit = {
          sold: p.total_sold,
          revenue: p.total_sold * sell,
          cost: p.total_sold * portionCost,
          profit: p.total_sold * portionProfit
        }
      }
    }

    return { unitCost, portionCost, portionProfit, profitRate, totalPortions, totalRevenue, totalProfit, soldProfit }
  }, [profitForm, list])

  const selectProduct = (e) => {
    const pid = e.target.value
    setProfitForm(f => ({ ...f, productId: pid }))
    if (pid) {
      const p = list.find(i => String(i.product_id) === String(pid))
      if (p) setProfitForm(f => ({ ...f, productId: pid, sellPrice: p.price }))
    }
  }

  const columns = [
    { header: 'ID', render: o => <span className="text-xs text-gray-400 font-mono">{o.product_id}</span> },
    { header: '菜品名称', render: o => <span className="font-medium text-gray-800">{o.name}</span> },
    { header: '订单出现次数', render: o => <span className="font-bold text-primary-600">{o.order_count}</span> },
    { header: '总售出份数', render: o => <span className="text-gray-700">{o.total_sold}</span> },
    { header: '单价', render: o => <span className="text-gray-500">${parseFloat(o.price).toFixed(2)}</span> },
    { header: '状态', render: o => <span className={`text-xs ${o.available ? 'text-green-600' : 'text-gray-400'}`}>{o.available ? '上架中' : '已下架'}</span> },
    { header: '标签', render: o => <Badge variant={o.tag === 'hot' ? 'danger' : o.tag === 'normal' ? 'primary' : 'default'}>{o.tagText}</Badge> }
  ]

  const tabConfig = [
    { key: 'hot', label: '🔥 热销商品', count: hotList.length, color: 'bg-red-500 text-white' },
    { key: 'normal', label: '📈 平销商品', count: normalList.length, color: 'bg-blue-500 text-white' },
    { key: 'cold', label: '🪫 零销量商品', count: coldList.length, color: 'bg-gray-400 text-white' },
    { key: 'profit', label: '💰 利润计算器', count: null, color: 'bg-green-500 text-white' }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">菜品销售统计</h2>
          <p className="text-sm text-gray-400 mt-1">统计各菜品订单出现次数与总销量，自动分类热销/平销/滞销</p>
        </div>
        {activeTab !== 'profit' && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">热销阈值：订单≥</span>
            <Input type="number" value={threshold} onChange={e => setThreshold(parseInt(e.target.value) || 15)} className="w-20" />
            <span className="text-sm text-gray-500">次</span>
            <Button onClick={() => load()}>应用</Button>
          </div>
        )}
      </div>

      <div className="flex gap-3 flex-wrap">
        {tabConfig.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key ? tab.color + ' shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            {tab.label} {tab.count !== null && <span className="ml-1 opacity-80">({tab.count})</span>}
          </button>
        ))}
      </div>

      {activeTab === 'profit' ? (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <div className="px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-800">📝 成本输入</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">关联菜品（可选）</label>
                <Select value={profitForm.productId} onChange={selectProduct}
                  options={[{ value: '', label: '不关联（手动计算）' }, ...list.map(p => ({ value: String(p.product_id), label: `${p.name} ($${parseFloat(p.price).toFixed(2)})` }))]} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">采购总价 ($)</label>
                  <Input type="number" step="0.01" value={profitForm.purchasePrice} onChange={e => setProfitForm(f => ({ ...f, purchasePrice: e.target.value }))} placeholder="如 50.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">采购总量</label>
                  <Input type="number" step="0.01" value={profitForm.purchaseQty} onChange={e => setProfitForm(f => ({ ...f, purchaseQty: e.target.value }))} placeholder="如 5" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">采购单位</label>
                  <Select value={profitForm.unit} onChange={e => setProfitForm(f => ({ ...f, unit: e.target.value }))}
                    options={[{ value: '磅', label: '磅 (lb)' }, { value: '个', label: '个' }, { value: '包', label: '包' }, { value: '箱', label: '箱' }, { value: '升', label: '升 (L)' }, { value: '加仑', label: '加仑 (gal)' }]} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">每{profitForm.unit || '单位'}出几份</label>
                  <Input type="number" step="0.01" value={profitForm.portionPerUnit} onChange={e => setProfitForm(f => ({ ...f, portionPerUnit: e.target.value }))} placeholder="如 4（一磅出4份）" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">每份售价 ($)</label>
                <Input type="number" step="0.01" value={profitForm.sellPrice} onChange={e => setProfitForm(f => ({ ...f, sellPrice: e.target.value }))} placeholder="如 3.99" />
              </div>
              <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
                💡 示例：羊肉 $50 买 5 磅，一磅出 4 串，每串卖 $3.99 → 自动算出每串成本和利润
              </div>
            </div>
          </Card>

          <Card>
            <div className="px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-800">📊 利润分析</h3>
            </div>
            <div className="p-5">
              {!profitCalc ? (
                <Empty text="请填写左侧所有字段后自动计算" icon="🧮" />
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs text-blue-400">每{profitForm.unit}成本</p>
                      <p className="text-xl font-bold text-blue-600 mt-1">${profitCalc.unitCost.toFixed(2)}</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3">
                      <p className="text-xs text-orange-400">每份成本</p>
                      <p className="text-xl font-bold text-orange-600 mt-1">${profitCalc.portionCost.toFixed(3)}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs text-green-400">每份利润</p>
                      <p className="text-xl font-bold text-green-600 mt-1">${profitCalc.portionProfit.toFixed(2)}</p>
                    </div>
                    <div className={`rounded-lg p-3 ${profitCalc.profitRate >= 50 ? 'bg-green-50' : profitCalc.profitRate >= 30 ? 'bg-yellow-50' : 'bg-red-50'}`}>
                      <p className={`text-xs ${profitCalc.profitRate >= 50 ? 'text-green-400' : profitCalc.profitRate >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>利润率</p>
                      <p className={`text-xl font-bold mt-1 ${profitCalc.profitRate >= 50 ? 'text-green-600' : profitCalc.profitRate >= 30 ? 'text-yellow-600' : 'text-red-600'}`}>{profitCalc.profitRate.toFixed(1)}%</p>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">总可出份数</span><span className="font-medium text-gray-800">{profitCalc.totalPortions.toFixed(1)} 份</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">全部卖完营收</span><span className="font-medium text-gray-800">${profitCalc.totalRevenue.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">采购成本</span><span className="font-medium text-gray-800">-${parseFloat(profitForm.purchasePrice).toFixed(2)}</span></div>
                    <div className="flex justify-between pt-2 border-t"><span className="font-bold text-gray-800">全部卖完利润</span><span className="font-bold text-green-600 text-lg">${profitCalc.totalProfit.toFixed(2)}</span></div>
                  </div>

                  {profitCalc.soldProfit && (
                    <div className="border-t pt-4 bg-green-50 rounded-lg p-3">
                      <p className="text-sm font-semibold text-green-700 mb-2">✅ 该商品已售利润</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-gray-500">已售出：</span><span className="font-medium">{profitCalc.soldProfit.sold} 份</span></div>
                        <div><span className="text-gray-500">已营收：</span><span className="font-medium">${profitCalc.soldProfit.revenue.toFixed(2)}</span></div>
                        <div><span className="text-gray-500">已耗成本：</span><span className="font-medium">${profitCalc.soldProfit.cost.toFixed(2)}</span></div>
                        <div><span className="text-gray-500">已赚利润：</span><span className="font-bold text-green-600">${profitCalc.soldProfit.profit.toFixed(2)}</span></div>
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 space-y-1">
                    {profitCalc.profitRate < 30 && <p>⚠️ 利润率低于 30%，建议提价或寻找更便宜的供应商</p>}
                    {profitCalc.profitRate >= 30 && profitCalc.profitRate < 50 && <p>📊 利润率 30%-50%，属于餐饮行业正常水平</p>}
                    {profitCalc.profitRate >= 50 && <p>🎉 利润率超过 50%，非常健康！</p>}
                    <p>💡 回本需要卖出：{Math.ceil(parseFloat(profitForm.purchasePrice) / profitCalc.portionProfit)} 份</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      ) : (
        <Card>
          {currentList.length === 0 ? (
            <Empty text="暂无数据" icon="📊" />
          ) : (
            <Table columns={columns} data={currentList} />
          )}
        </Card>
      )}

      {activeTab !== 'profit' && (
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
      )}
    </div>
  )
}
