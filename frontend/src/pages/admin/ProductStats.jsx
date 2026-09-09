import { useState, useEffect, useMemo, useRef } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Table, Badge, Select, Empty, Input, toast } from '../../components/ui'

export default function ProductStats() {
  const [list, setList] = useState([])
  const [activeTab, setActiveTab] = useState('hot')
  const [threshold, setThreshold] = useState(15)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [profitForm, setProfitForm] = useState({ productId: '', purchasePrice: '', purchaseQty: '', unit: '磅', portionPerUnit: '', sellPrice: '' })
  const [importResults, setImportResults] = useState([])
  const [importLoading, setImportLoading] = useState(false)
  const [importInfo, setImportInfo] = useState(null)
  const fileInputRef = useRef(null)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const searchTimer = useRef(null)

  const load = (t = threshold) => {
    setLoading(true)
    api.getProductStats(t).then(data => { setList(Array.isArray(data) ? data : []) }).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const hotList = useMemo(() => list.filter(i => i.tag === 'hot'), [list])
  const normalList = useMemo(() => list.filter(i => i.tag === 'normal'), [list])
  const coldList = useMemo(() => list.filter(i => i.tag === 'cold'), [list])
  const currentList = activeTab === 'hot' ? hotList : activeTab === 'normal' ? normalList : coldList

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return currentList
    const q = searchQuery.toLowerCase()
    return currentList.filter(item => item.name?.toLowerCase().includes(q))
  }, [currentList, searchQuery])

  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredList.slice(start, start + pageSize)
  }, [filteredList, currentPage, pageSize])

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize))

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
        soldProfit = { sold: p.total_sold, revenue: p.total_sold * sell, cost: p.total_sold * portionCost, profit: p.total_sold * portionProfit }
      }
    }
    return { unitCost, portionCost, portionProfit, profitRate, totalPortions, totalRevenue, totalProfit, soldProfit }
  }, [profitForm, list])

  const handleSearchChange = (e) => {
    const kw = e.target.value
    setSearchKeyword(kw)
    setShowSearchDropdown(true)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!kw.trim()) { setSearchResults([]); return }
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const data = await api.searchProfitHistory(kw)
        setSearchResults(Array.isArray(data) ? data : [])
      } catch { setSearchResults([]) }
      finally { setSearchLoading(false) }
    }, 300)
  }

  const handleSelectSearchResult = async (item) => {
    setSearchKeyword(item.name)
    setShowSearchDropdown(false)
    setProfitForm(f => ({ ...f, productId: item.product_id || '' }))
    try {
      const history = await api.getProfitHistoryLatest(item.product_id, item.name)
      if (history) {
        setProfitForm(f => ({ ...f, productId: history.productId || item.product_id || '', purchasePrice: history.purchasePrice, purchaseQty: history.purchaseQty, unit: history.unit || '磅', portionPerUnit: history.portionPerUnit, sellPrice: history.sellPrice }))
        toast(`已自动填充 ${history.createdAt} 的最新记录`)
      } else {
        const p = list.find(i => String(i.product_id) === String(item.product_id))
        if (p) setProfitForm(f => ({ ...f, sellPrice: p.price }))
      }
    } catch { }
  }

  const handleSaveRecord = async () => {
    if (!profitCalc) { toast('请先填写完整成本数据', 'error'); return }
    try {
      await api.saveProfitRecord({ productId: profitForm.productId || null, name: searchKeyword || '手动计算', purchasePrice: parseFloat(profitForm.purchasePrice), purchaseQty: parseFloat(profitForm.purchaseQty), unit: profitForm.unit, portionPerUnit: parseFloat(profitForm.portionPerUnit), sellPrice: parseFloat(profitForm.sellPrice) })
      toast('记录已保存，下次搜索可自动填充')
    } catch (e) { toast(e.message, 'error') }
  }

  const handleDownloadTemplate = async () => { try { await api.downloadProfitTemplate(); toast('模板已下载') } catch (e) { toast(e.message, 'error') } }
  const handleImportClick = () => fileInputRef.current?.click()
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportLoading(true)
    try {
      const data = await api.importProfitExcel(file)
      setImportResults(data.results || [])
      setImportInfo({ filename: data.filename, total: data.total, errors: data.errors || [] })
      toast(`导入成功，共 ${data.total} 条数据`)
      if (data.errors?.length > 0) toast(`${data.errors.length} 行数据有误已跳过`, 'warning')
    } catch (e) { toast(e.message, 'error') }
    finally { setImportLoading(false); if (fileInputRef.current) fileInputRef.current.value = '' }
  }
  const handleExportResult = async () => {
    if (importResults.length === 0) { toast('没有可导出的数据', 'error'); return }
    try { await api.exportProfitResult(importResults); toast('结果已导出') } catch (e) { toast(e.message, 'error') }
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
          <button key={tab.key} onClick={() => { setActiveTab(tab.key); setCurrentPage(1); setSearchQuery('') }} className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key ? tab.color + ' shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {tab.label} {tab.count !== null && <span className="ml-1 opacity-80">({tab.count})</span>}
          </button>
        ))}
      </div>

      {activeTab === 'profit' ? (
        <div className="space-y-6">
          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={handleDownloadTemplate}>📥 下载 Excel 模板</Button>
            <Button variant="outline" onClick={handleImportClick} disabled={importLoading}>{importLoading ? '导入中...' : '📤 导入 Excel 批量计算'}</Button>
            {importResults.length > 0 && <Button variant="success" onClick={handleExportResult}>💾 导出计算结果</Button>}
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
            {importInfo && <span className="text-xs text-gray-400">已导入：{importInfo.filename}（{importInfo.total} 条）{importInfo.errors?.length > 0 && <span className="text-red-400 ml-2">，{importInfo.errors.length} 行跳过</span>}</span>}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <div className="px-5 py-4 border-b"><h3 className="font-semibold text-gray-800">📝 成本输入</h3></div>
              <div className="p-5 space-y-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">关联菜品（输入名称搜索，有记录自动填充）</label>
                  <Input type="text" value={searchKeyword} onChange={handleSearchChange} onFocus={() => setShowSearchDropdown(true)} onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)} placeholder="输入菜品名称搜索，如：羊肉、奶茶..." className="w-full" />
                  {showSearchDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {searchLoading ? <div className="px-3 py-2 text-sm text-gray-400">搜索中...</div> : searchResults.length === 0 ? <div className="px-3 py-2 text-sm text-gray-400">{searchKeyword ? '无匹配菜品，可手动输入名称计算' : '输入关键词搜索'}</div> : searchResults.map((item, i) => (
                        <div key={i} onMouseDown={() => handleSelectSearchResult(item)} className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between">
                          <span className="text-sm text-gray-800">{item.name}</span>
                          {item.last_used && <span className="text-xs text-green-500">🕐 有记录</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">采购总价 ($)</label><Input type="number" step="0.01" value={profitForm.purchasePrice} onChange={e => setProfitForm(f => ({ ...f, purchasePrice: e.target.value }))} placeholder="如 50.00" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">采购总量</label><Input type="number" step="0.01" value={profitForm.purchaseQty} onChange={e => setProfitForm(f => ({ ...f, purchaseQty: e.target.value }))} placeholder="如 5" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">采购单位</label><Select value={profitForm.unit} onChange={e => setProfitForm(f => ({ ...f, unit: e.target.value }))} options={[{ value: '磅', label: '磅 (lb)' }, { value: '个', label: '个' }, { value: '包', label: '包' }, { value: '箱', label: '箱' }, { value: '升', label: '升 (L)' }, { value: '加仑', label: '加仑 (gal)' }]} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">每{profitForm.unit || '单位'}出几份</label><Input type="number" step="0.01" value={profitForm.portionPerUnit} onChange={e => setProfitForm(f => ({ ...f, portionPerUnit: e.target.value }))} placeholder="如 4（一磅出4份）" /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">每份售价 ($)</label><Input type="number" step="0.01" value={profitForm.sellPrice} onChange={e => setProfitForm(f => ({ ...f, sellPrice: e.target.value }))} placeholder="如 3.99" /></div>
                <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">💡 示例：羊肉 $50 买 5 磅，一磅出 4 串，每串卖 $3.99 → 自动算出每串成本和利润</div>
              </div>
            </Card>

            <Card>
              <div className="px-5 py-4 border-b"><h3 className="font-semibold text-gray-800">📊 利润分析</h3></div>
              <div className="p-5">
                {!profitCalc ? <Empty text="请填写左侧所有字段后自动计算" icon="🧮" /> : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 rounded-lg p-3"><p className="text-xs text-blue-400">每{profitForm.unit}成本</p><p className="text-xl font-bold text-blue-600 mt-1">${profitCalc.unitCost.toFixed(2)}</p></div>
                      <div className="bg-orange-50 rounded-lg p-3"><p className="text-xs text-orange-400">每份成本</p><p className="text-xl font-bold text-orange-600 mt-1">${profitCalc.portionCost.toFixed(3)}</p></div>
                      <div className="bg-green-50 rounded-lg p-3"><p className="text-xs text-green-400">每份利润</p><p className="text-xl font-bold text-green-600 mt-1">${profitCalc.portionProfit.toFixed(2)}</p></div>
                      <div className={`rounded-lg p-3 ${profitCalc.profitRate >= 50 ? 'bg-green-50' : profitCalc.profitRate >= 30 ? 'bg-yellow-50' : 'bg-red-50'}`}><p className={`text-xs ${profitCalc.profitRate >= 50 ? 'text-green-400' : profitCalc.profitRate >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>利润率</p><p className={`text-xl font-bold mt-1 ${profitCalc.profitRate >= 50 ? 'text-green-600' : profitCalc.profitRate >= 30 ? 'text-yellow-600' : 'text-red-600'}`}>{profitCalc.profitRate.toFixed(1)}%</p></div>
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
                    <div className="pt-2 border-t"><Button size="sm" variant="outline" className="w-full" onClick={handleSaveRecord}>💾 保存此成本记录（下次搜索自动填充）</Button></div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {importResults.length > 0 && (
            <Card>
              <div className="px-5 py-4 border-b flex items-center justify-between"><h3 className="font-semibold text-gray-800">📊 批量计算结果（{importResults.length} 条）</h3><Button size="sm" onClick={handleExportResult}>💾 导出 Excel</Button></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 text-gray-500 text-xs">
                    <th className="px-3 py-2 text-left">菜品名称</th><th className="px-3 py-2 text-right">采购总价</th><th className="px-3 py-2 text-right">采购量</th><th className="px-3 py-2 text-center">单位</th><th className="px-3 py-2 text-right">出份数</th><th className="px-3 py-2 text-right">售价</th><th className="px-3 py-2 text-right">每份成本</th><th className="px-3 py-2 text-right">每份利润</th><th className="px-3 py-2 text-right">利润率</th><th className="px-3 py-2 text-right">总利润</th>
                  </tr></thead>
                  <tbody>
                    {importResults.map((r, i) => (
                      <tr key={i} className="border-t hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-800">{r.name}</td>
                        <td className="px-3 py-2 text-right text-gray-600">${r.purchasePrice?.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{r.purchaseQty}</td>
                        <td className="px-3 py-2 text-center text-gray-500">{r.unit}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{r.portionPerUnit}</td>
                        <td className="px-3 py-2 text-right text-gray-600">${r.sellPrice?.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-orange-600">${r.portionCost?.toFixed(3)}</td>
                        <td className="px-3 py-2 text-right font-bold text-green-600">${r.portionProfit?.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right"><span className={`px-2 py-0.5 rounded text-xs ${r.profitRate >= 50 ? 'bg-green-100 text-green-700' : r.profitRate >= 30 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{r.profitRate?.toFixed(1)}%</span></td>
                        <td className="px-3 py-2 text-right font-bold text-primary-600">${r.totalProfit?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr className="bg-gray-50 font-bold">
                    <td className="px-3 py-2 text-gray-800">合计</td>
                    <td className="px-3 py-2 text-right text-gray-600">${importResults.reduce((s, r) => s + (r.purchasePrice || 0), 0).toFixed(2)}</td>
                    <td colSpan="4"></td><td className="px-3 py-2 text-right"></td><td className="px-3 py-2 text-right"></td><td className="px-3 py-2 text-right"></td>
                    <td className="px-3 py-2 text-right text-primary-600">${importResults.reduce((s, r) => s + (r.totalProfit || 0), 0).toFixed(2)}</td>
                  </tr></tfoot>
                </table>
              </div>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <div className="flex items-center justify-between mb-4 px-5 pt-5">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">搜索菜品：</span>
              <Input type="text" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }} placeholder="输入菜品名称模糊搜索..." className="w-64" />
            </div>
            <span className="text-sm text-gray-400">共 {filteredList.length} 条</span>
          </div>
          {filteredList.length === 0 ? (
            <Empty text={searchQuery ? '未找到匹配的菜品' : '暂无数据'} icon="📊" />
          ) : (
            <>
              <Table columns={columns} data={paginatedList} />
              <div className="flex items-center justify-between px-5 py-3 border-t">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>每页</span>
                  <select value={pageSize} onChange={e => { setPageSize(parseInt(e.target.value)); setCurrentPage(1) }} className="px-2 py-1 border border-gray-300 rounded text-sm">
                    <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option>
                  </select>
                  <span>条</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>上一页</Button>
                  <span className="text-sm text-gray-600">第 {currentPage} / {totalPages} 页</span>
                  <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>下一页</Button>
                </div>
              </div>
            </>
          )}
        </Card>
      )}

      {activeTab !== 'profit' && (
        <Card className="p-5">
          <h3 className="font-semibold text-gray-800 mb-3">📋 统计总结</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-400">商品总数</p><p className="text-2xl font-bold text-gray-800 mt-1">{list.length}</p></div>
            <div className="bg-red-50 rounded-lg p-3"><p className="text-xs text-red-400">🔥 热销</p><p className="text-2xl font-bold text-red-600 mt-1">{hotList.length}</p></div>
            <div className="bg-blue-50 rounded-lg p-3"><p className="text-xs text-blue-400">📈 平销</p><p className="text-2xl font-bold text-blue-600 mt-1">{normalList.length}</p></div>
            <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-400">🪫 滞销</p><p className="text-2xl font-bold text-gray-500 mt-1">{coldList.length}</p></div>
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
