import { useState, useEffect, useRef } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Table, Badge, Dialog, Input, Select, Empty, toast } from '../../components/ui'
import Tesseract from 'tesseract.js'

export default function Inventory() {
  const [tab, setTab] = useState('goods')
  const [goods, setGoods] = useState([])
  const [orders, setOrders] = useState([])
  const [goodsDialog, setGoodsDialog] = useState(null)
  const [orderDialog, setOrderDialog] = useState(null)
  const [orderDetail, setOrderDetail] = useState(null)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const ocrFileRef = useRef(null)

  useEffect(() => { loadGoods(); loadOrders() }, [])

  // 搜索防抖：输入后300ms自动搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      loadGoods()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchKeyword])

  const loadGoods = () => {
    api.getGoods({ keyword: searchKeyword }).then(data => {
      setGoods(Array.isArray(data) ? data : [])
    }).catch(() => {})
  }

  const loadOrders = () => {
    api.getPurchaseOrders({}).then(data => {
      setOrders(Array.isArray(data) ? data : [])
    }).catch(() => {})
  }

  const saveGoods = async () => {
    const { mode, data } = goodsDialog
    if (!data.name.trim()) { toast('货物名称必填', 'error'); return }
    try {
      if (mode === 'add') { await api.createGoods(data); toast('货物已添加') }
      else { await api.updateGoods(data.id, data); toast('货物已更新') }
      setGoodsDialog(null); loadGoods()
    } catch (e) { toast(e.message, 'error') }
  }

  const deleteGoods = async (g) => {
    if (!confirm(`确定删除货物"${g.name}"吗？`)) return
    await api.deleteGoods(g.id); toast('货物已删除'); loadGoods()
  }

  const openNewOrder = () => {
    const today = new Date().toISOString().split('T')[0]
    setOrderDialog({
      mode: 'add',
      data: {
        order_no: '', supplier: '', order_date: today,
        delivery_fee: 0, discount: 0, payment_method: 'COD', note: '',
        items: [{ goods_name: '', quantity: 1, unit: '个', unit_price: 0 }]
      }
    })
  }

  const addOrderItem = () => {
    setOrderDialog(prev => ({
      ...prev,
      data: { ...prev.data, items: [...prev.data.items, { goods_name: '', quantity: 1, unit: '个', unit_price: 0 }] }
    }))
  }

  const removeOrderItem = (idx) => {
    setOrderDialog(prev => ({
      ...prev,
      data: { ...prev.data, items: prev.data.items.filter((_, i) => i !== idx) }
    }))
  }

  const updateOrderItem = (idx, field, value) => {
    setOrderDialog(prev => {
      const items = [...prev.data.items]
      items[idx] = { ...items[idx], [field]: value }
      if (field === 'goods_id' && value) {
        const g = goods.find(x => x.id === Number(value))
        if (g) {
          items[idx].goods_name = g.name
          items[idx].unit = g.unit
          items[idx].unit_price = g.avg_price || 0
        }
      }
      return { ...prev, data: { ...prev.data, items } }
    })
  }

  const calcOrderTotal = () => {
    if (!orderDialog) return 0
    const itemsTotal = orderDialog.data.items.reduce((sum, it) => sum + (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0), 0)
    return itemsTotal + (parseFloat(orderDialog.data.delivery_fee) || 0) - (parseFloat(orderDialog.data.discount) || 0)
  }

  const saveOrder = async () => {
    const { mode, data } = orderDialog
    if (!data.supplier.trim()) { toast('供应商必填', 'error'); return }
    if (data.items.length === 0 || !data.items[0].goods_name.trim()) { toast('至少添加一项货物', 'error'); return }
    try {
      if (mode === 'add') { await api.createPurchaseOrder(data); toast('进货单已创建') }
      else { await api.updatePurchaseOrder(data.id, data); toast('进货单已更新') }
      setOrderDialog(null); loadOrders(); loadGoods()
    } catch (e) { toast(e.message, 'error') }
  }

  const viewOrder = async (id) => {
    try {
      const data = await api.getPurchaseOrder(id)
      setOrderDetail(data)
    } catch (e) { toast(e.message, 'error') }
  }

  const deleteOrder = async (o) => {
    if (!confirm(`确定删除进货单"${o.order_no || o.id}"吗？`)) return
    await api.deletePurchaseOrder(o.id); toast('进货单已删除'); loadOrders()
  }

  const cleanOcrText = (text) => {
    return text
      .replace(/false/gi, '')
      .replace(/true/gi, '')
      .replace(/[{}@#$%&*;_~`|\\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const parseReceiptText = (text) => {
    const cleaned = cleanOcrText(text)
    const lines = cleaned.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    const items = []
    const skipWords = /^(total|subtotal|tax|date|order|invoice|phone|address|qty|item|description|amount|price|合计|小计|总计|日期|订单|电话|地址|数量|品名|描述|金额|单价|供应商|供货)$/i
    for (const line of lines) {
      const match = line.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)$/)
      if (match && !skipWords.test(match[1].trim())) {
        items.push({ goods_name: match[1].trim(), quantity: parseFloat(match[2]), unit: '个', unit_price: parseFloat(match[3]) })
        continue
      }
      const match2 = line.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s+\$?(\d+(?:\.\d+)?)$/)
      if (match2 && !skipWords.test(match2[1].trim())) {
        items.push({ goods_name: match2[1].trim(), quantity: parseFloat(match2[2]), unit: '个', unit_price: parseFloat(match2[3]) })
      }
    }
    return items
  }

  const handleOcrUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!orderDialog) {
      openNewOrder()
      await new Promise(r => setTimeout(r, 100))
    }
    setOcrLoading(true)
    setOcrProgress(0)
    try {
      const result = await Tesseract.recognize(file, 'eng+chi_sim', {
        logger: m => { if (m.status === 'recognizing text') setOcrProgress(Math.round(m.progress * 100)) }
      })
      const items = parseReceiptText(result.data.text)
      if (items.length === 0) {
        toast('未识别到货物明细，请手动填写', 'warning')
      } else {
        setOrderDialog(prev => ({
          ...prev,
          data: { ...prev.data, items: items.map(it => ({ ...it, goods_id: '' })) }
        }))
        toast(`识别成功，已填充 ${items.length} 项货物，请核对`)
      }
    } catch (err) {
      toast('识别失败：' + err.message, 'error')
    } finally {
      setOcrLoading(false)
      setOcrProgress(0)
      if (ocrFileRef.current) ocrFileRef.current.value = ''
    }
  }

  const goodsColumns = [
    { header: '货物名称', render: g => <div><p className="font-medium text-gray-800">{g.name}</p>{g.name_en && <p className="text-xs text-gray-400">{g.name_en}</p>}</div> },
    { header: '单位', render: g => <span className="text-sm text-gray-600">{g.unit}</span> },
    { header: '当前库存', render: g => <span className={`font-medium ${g.current_stock > 0 ? 'text-green-600' : 'text-red-500'}`}>{g.current_stock} {g.unit}</span> },
    { header: '平均进价', render: g => <span className="text-primary-600 font-medium">${parseFloat(g.avg_price || 0).toFixed(2)}</span> },
    { header: '供应商', render: g => <span className="text-sm text-gray-600">{g.supplier || '-'}</span> },
    { header: '分类', render: g => g.category ? <Badge variant="default">{g.category}</Badge> : <span className="text-gray-300">-</span> }
  ]

  const orderColumns = [
    { header: '订单号', render: o => <button onClick={() => viewOrder(o.id)} className="text-primary-600 hover:underline font-mono text-sm">{o.order_no || `#${o.id}`}</button> },
    { header: '供应商', render: o => <span className="font-medium text-gray-800">{o.supplier}</span> },
    { header: '日期', render: o => <span className="text-sm text-gray-600">{o.order_date}</span> },
    { header: '付款方式', render: o => <Badge variant="default">{o.payment_method}</Badge> },
    { header: '总金额', render: o => <span className="font-bold text-primary-600">${parseFloat(o.total_amount || 0).toFixed(2)}</span> }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">货物管理</h2>
          <p className="text-sm text-gray-400 mt-1">管理货物库存和进货单</p>
        </div>
      </div>

      <div className="flex gap-2 border-b">
        <button onClick={() => setTab('goods')} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'goods' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>货物列表</button>
        <button onClick={() => setTab('orders')} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'orders' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>进货单</button>
      </div>

      {tab === 'goods' && (
        <>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input type="text" value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') loadGoods() }} placeholder="搜索货物名称/供应商..." className="w-64 pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            </div>
            <Button onClick={() => setGoodsDialog({ mode: 'add', data: { name: '', name_en: '', unit: '个', current_stock: 0, avg_price: 0, supplier: '', category: '', note: '' } })}>+ 新增货物</Button>
          </div>

          <Card>
            {goods.length === 0 ? (
              <Empty text="暂无货物，点击右上角添加" icon="📦" />
            ) : (
              <Table columns={goodsColumns} data={goods} actions={g => (
                <div className="flex items-center gap-3">
                  <button onClick={() => setGoodsDialog({ mode: 'edit', data: { ...g } })} className="text-xs text-primary-600 hover:text-primary-700">编辑</button>
                  <button onClick={() => deleteGoods(g)} className="text-xs text-red-400 hover:text-red-600">删除</button>
                </div>
              )} />
            )}
          </Card>
        </>
      )}

      {tab === 'orders' && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">共 {orders.length} 张进货单</p>
            <Button onClick={openNewOrder}>+ 新建进货单</Button>
          </div>

          <Card>
            {orders.length === 0 ? (
              <Empty text="暂无进货单，点击右上角新建" icon="📋" />
            ) : (
              <Table columns={orderColumns} data={orders} actions={o => (
                <div className="flex items-center gap-3">
                  <button onClick={() => viewOrder(o.id)} className="text-xs text-primary-600 hover:text-primary-700">查看</button>
                  <button onClick={() => deleteOrder(o)} className="text-xs text-red-400 hover:text-red-600">删除</button>
                </div>
              )} />
            )}
          </Card>
        </>
      )}

      <Dialog open={!!goodsDialog} onClose={() => setGoodsDialog(null)} title={goodsDialog?.mode === 'add' ? '新增货物' : '编辑货物'} width="max-w-lg">
        {goodsDialog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="货物名称 *" value={goodsDialog.data.name} onChange={e => setGoodsDialog({ ...goodsDialog, data: { ...goodsDialog.data, name: e.target.value } })} />
              <Input label="英文名" value={goodsDialog.data.name_en} onChange={e => setGoodsDialog({ ...goodsDialog, data: { ...goodsDialog.data, name_en: e.target.value } })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input label="单位" value={goodsDialog.data.unit} onChange={e => setGoodsDialog({ ...goodsDialog, data: { ...goodsDialog.data, unit: e.target.value } })} placeholder="个/箱/包/磅" />
              <Input label="当前库存" type="number" value={goodsDialog.data.current_stock} onChange={e => setGoodsDialog({ ...goodsDialog, data: { ...goodsDialog.data, current_stock: parseFloat(e.target.value) || 0 } })} />
              <Input label="平均进价 ($)" type="number" step="0.01" value={goodsDialog.data.avg_price} onChange={e => setGoodsDialog({ ...goodsDialog, data: { ...goodsDialog.data, avg_price: parseFloat(e.target.value) || 0 } })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="供应商" value={goodsDialog.data.supplier} onChange={e => setGoodsDialog({ ...goodsDialog, data: { ...goodsDialog.data, supplier: e.target.value } })} />
              <Input label="分类" value={goodsDialog.data.category} onChange={e => setGoodsDialog({ ...goodsDialog, data: { ...goodsDialog.data, category: e.target.value } })} />
            </div>
            <Input label="备注" value={goodsDialog.data.note} onChange={e => setGoodsDialog({ ...goodsDialog, data: { ...goodsDialog.data, note: e.target.value } })} />
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setGoodsDialog(null)}>取消</Button>
              <Button className="flex-1" onClick={saveGoods}>保存</Button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog open={!!orderDialog} onClose={() => setOrderDialog(null)} title={orderDialog?.mode === 'add' ? '新建进货单' : '编辑进货单'} width="max-w-3xl">
        {orderDialog && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Input label="订单号" value={orderDialog.data.order_no} onChange={e => setOrderDialog({ ...orderDialog, data: { ...orderDialog.data, order_no: e.target.value } })} />
              <Input label="供应商 *" value={orderDialog.data.supplier} onChange={e => setOrderDialog({ ...orderDialog, data: { ...orderDialog.data, supplier: e.target.value } })} />
              <Input label="日期 *" type="date" value={orderDialog.data.order_date} onChange={e => setOrderDialog({ ...orderDialog, data: { ...orderDialog.data, order_date: e.target.value } })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input label="配送费 ($)" type="number" step="0.01" value={orderDialog.data.delivery_fee} onChange={e => setOrderDialog({ ...orderDialog, data: { ...orderDialog.data, delivery_fee: parseFloat(e.target.value) || 0 } })} />
              <Input label="折扣 ($)" type="number" step="0.01" value={orderDialog.data.discount} onChange={e => setOrderDialog({ ...orderDialog, data: { ...orderDialog.data, discount: parseFloat(e.target.value) || 0 } })} />
              <Select label="付款方式" value={orderDialog.data.payment_method} onChange={e => setOrderDialog({ ...orderDialog, data: { ...orderDialog.data, payment_method: e.target.value } })}
                options={[{ value: 'COD', label: '货到付款' }, { value: '转账', label: '银行转账' }, { value: '现金', label: '现金' }, { value: '支票', label: '支票' }]} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">货物明细</label>
                <div className="flex items-center gap-2">
                  <input ref={ocrFileRef} type="file" accept="image/*" capture="environment" onChange={handleOcrUpload} className="hidden" />
                  <Button size="sm" variant="outline" onClick={() => ocrFileRef.current?.click()} disabled={ocrLoading}>
                    {ocrLoading ? `识别中 ${ocrProgress}%` : '📷 拍照识别'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={addOrderItem}>+ 添加一项</Button>
                </div>
              </div>
              {ocrLoading && (
                <div className="mb-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-primary-600 h-2 rounded-full transition-all" style={{ width: `${ocrProgress}%`}}></div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">正在识别图片文字，请稍候...</p>
                </div>
              )}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {orderDialog.data.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Select value={item.goods_id || ''} onChange={e => updateOrderItem(idx, 'goods_id', e.target.value)}
                      options={[{ value: '', label: '选择已有货物...' }, ...goods.map(g => ({ value: g.id, label: `${g.name} (库存:${g.current_stock}${g.unit})` }))]}
                      className="w-48" />
                    <input type="text" value={item.goods_name} onChange={e => updateOrderItem(idx, 'goods_name', e.target.value)} placeholder="货物名称" className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm" />
                    <input type="number" value={item.quantity} onChange={e => updateOrderItem(idx, 'quantity', parseFloat(e.target.value) || 0)} placeholder="数量" className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm" />
                    <input type="text" value={item.unit} onChange={e => updateOrderItem(idx, 'unit', e.target.value)} placeholder="单位" className="w-16 px-2 py-1.5 border border-gray-300 rounded text-sm" />
                    <input type="number" step="0.01" value={item.unit_price} onChange={e => updateOrderItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} placeholder="单价" className="w-24 px-2 py-1.5 border border-gray-300 rounded text-sm" />
                    <span className="text-sm text-gray-600 w-20 text-right">${((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)).toFixed(2)}</span>
                    <button onClick={() => removeOrderItem(idx)} className="text-red-400 hover:text-red-600 text-sm px-1">✕</button>
                  </div>
                ))}
              </div>
            </div>

            <Input label="备注" value={orderDialog.data.note} onChange={e => setOrderDialog({ ...orderDialog, data: { ...orderDialog.data, note: e.target.value } })} />

            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-gray-500">共 {orderDialog.data.items.length} 项货物</span>
              <span className="text-lg font-bold text-primary-600">合计: ${calcOrderTotal().toFixed(2)}</span>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setOrderDialog(null)}>取消</Button>
              <Button className="flex-1" onClick={saveOrder}>保存</Button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog open={!!orderDetail} onClose={() => setOrderDetail(null)} title={`进货单详情 - ${orderDetail?.order_no || `#${orderDetail?.id}`}`} width="max-w-2xl">
        {orderDetail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-400">供应商</p><p className="font-medium">{orderDetail.supplier}</p></div>
              <div><p className="text-gray-400">日期</p><p className="font-medium">{orderDetail.order_date}</p></div>
              <div><p className="text-gray-400">付款方式</p><p className="font-medium">{orderDetail.payment_method}</p></div>
              <div><p className="text-gray-400">订单号</p><p className="font-medium font-mono">{orderDetail.order_no || '-'}</p></div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-400 mb-2">货物明细</p>
              <div className="space-y-2">
                {orderDetail.items?.map((it, i) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-100">
                    <span className="text-gray-700">{it.goods_name} × {it.quantity} {it.unit}</span>
                    <span className="text-gray-600">${parseFloat(it.subtotal || it.quantity * it.unit_price).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4 space-y-1">
              <div className="flex justify-between text-sm text-gray-600"><span>货物小计</span><span>${(orderDetail.items || []).reduce((s, it) => s + parseFloat(it.subtotal || it.quantity * it.unit_price), 0).toFixed(2)}</span></div>
              <div className="flex justify-between text-sm text-gray-600"><span>配送费</span><span>${parseFloat(orderDetail.delivery_fee || 0).toFixed(2)}</span></div>
              <div className="flex justify-between text-sm text-gray-600"><span>折扣</span><span>-${parseFloat(orderDetail.discount || 0).toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t"><span>合计</span><span className="text-primary-600">${parseFloat(orderDetail.total_amount || 0).toFixed(2)}</span></div>
            </div>

            {orderDetail.note && <div><p className="text-sm text-gray-400">备注</p><p className="text-sm text-gray-700">{orderDetail.note}</p></div>}
          </div>
        )}
      </Dialog>
    </div>
  )
}