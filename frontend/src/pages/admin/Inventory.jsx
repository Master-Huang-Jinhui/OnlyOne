import { useState, useEffect } from 'react'
import { api, showToast } from '../../lib/api'

export default function Inventory() {
  const [activeTab, setActiveTab] = useState('goods')
  const [goods, setGoods] = useState([])
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [showGoodsModal, setShowGoodsModal] = useState(false)
  const [editingGoods, setEditingGoods] = useState(null)
  const [goodsForm, setGoodsForm] = useState({ name: '', name_en: '', unit: '个', current_stock: 0, avg_price: 0, supplier: '', category: '', note: '' })
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [orderForm, setOrderForm] = useState({ supplier: '', order_date: new Date().toISOString().split('T')[0], delivery_fee: 0, discount: 0, payment_method: 'COD', note: '', items: [{ goods_id: '', goods_name: '', quantity: 1, unit: '个', unit_price: 0 }] })
  const [viewingOrder, setViewingOrder] = useState(null)

  useEffect(() => { loadGoods(); loadPurchaseOrders() }, [])

  const loadGoods = async () => {
    try { setLoading(true); const data = await api.getGoods({ search }); setGoods(data || []) }
    catch (e) { showToast(e.message, 'error') }
    finally { setLoading(false) }
  }

  const loadPurchaseOrders = async () => {
    try { const data = await api.getPurchaseOrders(); setPurchaseOrders(data || []) }
    catch (e) { showToast(e.message, 'error') }
  }

  const handleSaveGoods = async () => {
    if (!goodsForm.name) { showToast('请输入货物名称', 'error'); return }
    try {
      if (editingGoods) { await api.updateGoods(editingGoods.id, goodsForm); showToast('更新成功') }
      else { await api.createGoods(goodsForm); showToast('添加成功') }
      setShowGoodsModal(false); setEditingGoods(null); setGoodsForm({ name: '', name_en: '', unit: '个', current_stock: 0, avg_price: 0, supplier: '', category: '', note: '' }); loadGoods()
    } catch (e) { showToast(e.message, 'error') }
  }

  const handleDeleteGoods = async (id) => {
    if (!confirm('确定删除该货物？')) return
    try { await api.deleteGoods(id); showToast('删除成功'); loadGoods() }
    catch (e) { showToast(e.message, 'error') }
  }

  const addOrderItem = () => {
    setOrderForm({ ...orderForm, items: [...orderForm.items, { goods_id: '', goods_name: '', quantity: 1, unit: '个', unit_price: 0 }] })
  }

  const removeOrderItem = (idx) => {
    setOrderForm({ ...orderForm, items: orderForm.items.filter((_, i) => i !== idx) })
  }

  const updateOrderItem = (idx, field, value) => {
    const items = [...orderForm.items]
    items[idx] = { ...items[idx], [field]: value }
    if (field === 'goods_id' && value) {
      const g = goods.find(x => x.id === Number(value))
      if (g) { items[idx].goods_name = g.name; items[idx].unit = g.unit; items[idx].unit_price = g.avg_price }
    }
    items[idx].subtotal = (items[idx].quantity || 0) * (items[idx].unit_price || 0)
    setOrderForm({ ...orderForm, items })
  }

  const orderTotal = orderForm.items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0), 0) + (orderForm.delivery_fee || 0) - (orderForm.discount || 0)

  const handleCreateOrder = async () => {
    if (!orderForm.supplier) { showToast('请输入供应商', 'error'); return }
    if (orderForm.items.length === 0 || !orderForm.items[0].goods_name) { showToast('请添加至少一项货物', 'error'); return }
    try {
      await api.createPurchaseOrder({ ...orderForm, total_amount: orderTotal, items: orderForm.items.filter(i => i.goods_name) })
      showToast('进货单创建成功，库存已更新')
      setShowOrderModal(false)
      setOrderForm({ supplier: '', order_date: new Date().toISOString().split('T')[0], delivery_fee: 0, discount: 0, payment_method: 'COD', note: '', items: [{ goods_id: '', goods_name: '', quantity: 1, unit: '个', unit_price: 0 }] })
      loadPurchaseOrders(); loadGoods()
    } catch (e) { showToast(e.message, 'error') }
  }

  const handleDeleteOrder = async (id) => {
    if (!confirm('确定删除该进货单？删除后库存不会回退。')) return
    try { await api.deletePurchaseOrder(id); showToast('删除成功'); loadPurchaseOrders() }
    catch (e) { showToast(e.message, 'error') }
  }

  const viewOrder = async (id) => {
    try { const data = await api.getPurchaseOrder(id); setViewingOrder(data) }
    catch (e) { showToast(e.message, 'error') }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">货物管理</h1>
      <div className="flex gap-2 mb-6 border-b">
        <button onClick={() => setActiveTab('goods')} className={`px-4 py-2 font-medium ${activeTab === 'goods' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>货物列表</button>
        <button onClick={() => setActiveTab('orders')} className={`px-4 py-2 font-medium ${activeTab === 'orders' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>进货单</button>
      </div>

      {activeTab === 'goods' && (
        <div>
          <div className="flex gap-3 mb-4">
            <input type="text" placeholder="搜索货物名称..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadGoods()} className="flex-1 max-w-xs px-3 py-2 border rounded-lg" />
            <button onClick={loadGoods} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">搜索</button>
            <button onClick={() => { setEditingGoods(null); setGoodsForm({ name: '', name_en: '', unit: '个', current_stock: 0, avg_price: 0, supplier: '', category: '', note: '' }); setShowGoodsModal(true) }} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">+ 添加货物</button>
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">名称</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">单位</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">当前库存</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">平均进价</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">供应商</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">分类</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {goods.map(g => (
                  <tr key={g.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">{g.name}{g.name_en && <span className="text-gray-400 text-sm ml-2">{g.name_en}</span>}</td>
                    <td className="px-4 py-3">{g.unit}</td>
                    <td className="px-4 py-3">{g.current_stock}</td>
                    <td className="px-4 py-3">${Number(g.avg_price).toFixed(2)}</td>
                    <td className="px-4 py-3">{g.supplier || '-'}</td>
                    <td className="px-4 py-3">{g.category || '-'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setEditingGoods(g); setGoodsForm({ ...g }); setShowGoodsModal(true) }} className="text-blue-500 hover:underline mr-3">编辑</button>
                      <button onClick={() => handleDeleteGoods(g.id)} className="text-red-500 hover:underline">删除</button>
                    </td>
                  </tr>
                ))}
                {goods.length === 0 && <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400">暂无货物</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div>
          <div className="flex justify-between mb-4">
            <h2 className="text-lg font-medium">进货单记录</h2>
            <button onClick={() => setShowOrderModal(true)} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">+ 新建进货单</button>
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">单号</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">供应商</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">日期</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">总金额</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map(o => (
                  <tr key={o.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">{o.order_no || `#${o.id}`}</td>
                    <td className="px-4 py-3">{o.supplier}</td>
                    <td className="px-4 py-3">{o.order_date}</td>
                    <td className="px-4 py-3 font-medium">${Number(o.total_amount).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => viewOrder(o.id)} className="text-blue-500 hover:underline mr-3">查看</button>
                      <button onClick={() => handleDeleteOrder(o.id)} className="text-red-500 hover:underline">删除</button>
                    </td>
                  </tr>
                ))}
                {purchaseOrders.length === 0 && <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-400">暂无进货单</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showGoodsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">{editingGoods ? '编辑货物' : '添加货物'}</h3>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium mb-1">名称 *</label><input type="text" value={goodsForm.name} onChange={e => setGoodsForm({ ...goodsForm, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium mb-1">英文名</label><input type="text" value={goodsForm.name_en} onChange={e => setGoodsForm({ ...goodsForm, name_en: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium mb-1">单位</label><input type="text" value={goodsForm.unit} onChange={e => setGoodsForm({ ...goodsForm, unit: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="个/箱/包" /></div>
                <div><label className="block text-sm font-medium mb-1">当前库存</label><input type="number" step="0.01" value={goodsForm.current_stock} onChange={e => setGoodsForm({ ...goodsForm, current_stock: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium mb-1">平均进价</label><input type="number" step="0.01" value={goodsForm.avg_price} onChange={e => setGoodsForm({ ...goodsForm, avg_price: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">分类</label><input type="text" value={goodsForm.category} onChange={e => setGoodsForm({ ...goodsForm, category: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="蔬菜/肉类/调料" /></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">供应商</label><input type="text" value={goodsForm.supplier} onChange={e => setGoodsForm({ ...goodsForm, supplier: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium mb-1">备注</label><textarea value={goodsForm.note} onChange={e => setGoodsForm({ ...goodsForm, note: e.target.value })} className="w-full px-3 py-2 border rounded-lg" rows="2" /></div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => { setShowGoodsModal(false); setEditingGoods(null) }} className="px-4 py-2 border rounded-lg hover:bg-gray-50">取消</button>
              <button onClick={handleSaveGoods} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">保存</button>
            </div>
          </div>
        </div>
      )}

      {showOrderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">新建进货单</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div><label className="block text-sm font-medium mb-1">供应商 *</label><input type="text" value={orderForm.supplier} onChange={e => setOrderForm({ ...orderForm, supplier: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="Olong Trading" /></div>
              <div><label className="block text-sm font-medium mb-1">日期</label><input type="date" value={orderForm.order_date} onChange={e => setOrderForm({ ...orderForm, order_date: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium mb-1">运费</label><input type="number" step="0.01" value={orderForm.delivery_fee} onChange={e => setOrderForm({ ...orderForm, delivery_fee: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium mb-1">折扣</label><input type="number" step="0.01" value={orderForm.discount} onChange={e => setOrderForm({ ...orderForm, discount: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" /></div>
            </div>
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium">货物明细</label>
                <button onClick={addOrderItem} className="text-blue-500 text-sm hover:underline">+ 添加一项</button>
              </div>
              <div className="space-y-2">
                {orderForm.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <select value={item.goods_id} onChange={e => updateOrderItem(idx, 'goods_id', e.target.value)} className="w-40 px-2 py-1 border rounded text-sm">
                      <option value="">选择货物</option>
                      {goods.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                    <input type="text" placeholder="货物名称" value={item.goods_name} onChange={e => updateOrderItem(idx, 'goods_name', e.target.value)} className="flex-1 px-2 py-1 border rounded text-sm" />
                    <input type="number" step="0.01" placeholder="数量" value={item.quantity} onChange={e => updateOrderItem(idx, 'quantity', Number(e.target.value))} className="w-20 px-2 py-1 border rounded text-sm" />
                    <input type="text" placeholder="单位" value={item.unit} onChange={e => updateOrderItem(idx, 'unit', e.target.value)} className="w-16 px-2 py-1 border rounded text-sm" />
                    <input type="number" step="0.01" placeholder="单价" value={item.unit_price} onChange={e => updateOrderItem(idx, 'unit_price', Number(e.target.value))} className="w-20 px-2 py-1 border rounded text-sm" />
                    <span className="w-20 text-sm text-right">${(item.quantity * item.unit_price).toFixed(2)}</span>
                    <button onClick={() => removeOrderItem(idx)} className="text-red-500 text-sm">×</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center border-t pt-4">
              <div><label className="block text-sm font-medium mb-1">备注</label><input type="text" value={orderForm.note} onChange={e => setOrderForm({ ...orderForm, note: e.target.value })} className="px-3 py-2 border rounded-lg w-64" /></div>
              <div className="text-right">
                <div className="text-sm text-gray-500">合计</div>
                <div className="text-2xl font-bold text-blue-600">${orderTotal.toFixed(2)}</div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowOrderModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">取消</button>
              <button onClick={handleCreateOrder} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">创建进货单</button>
            </div>
          </div>
        </div>
      )}

      {viewingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">进货单详情 {viewingOrder.order_no || `#${viewingOrder.id}`}</h3>
              <button onClick={() => setViewingOrder(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <div><span className="text-gray-500">供应商：</span>{viewingOrder.supplier}</div>
              <div><span className="text-gray-500">日期：</span>{viewingOrder.order_date}</div>
              <div><span className="text-gray-500">运费：</span>${Number(viewingOrder.delivery_fee || 0).toFixed(2)}</div>
              <div><span className="text-gray-500">折扣：</span>${Number(viewingOrder.discount || 0).toFixed(2)}</div>
              {viewingOrder.note && <div className="col-span-2"><span className="text-gray-500">备注：</span>{viewingOrder.note}</div>}
            </div>
            <table className="w-full text-sm mb-4">
              <thead className="bg-gray-50">
                <tr><th className="px-3 py-2 text-left">货物</th><th className="px-3 py-2 text-left">数量</th><th className="px-3 py-2 text-left">单位</th><th className="px-3 py-2 text-left">单价</th><th className="px-3 py-2 text-right">小计</th></tr>
              </thead>
              <tbody>
                {(viewingOrder.items || []).map((item, idx) => (
                  <tr key={idx} className="border-t"><td className="px-3 py-2">{item.goods_name}</td><td className="px-3 py-2">{item.quantity}</td><td className="px-3 py-2">{item.unit}</td><td className="px-3 py-2">${Number(item.unit_price).toFixed(2)}</td><td className="px-3 py-2 text-right">${Number(item.subtotal).toFixed(2)}</td></tr>
                ))}
              </tbody>
            </table>
            <div className="text-right border-t pt-3">
              <span className="text-gray-500 mr-3">总金额：</span>
              <span className="text-2xl font-bold text-blue-600">${Number(viewingOrder.total_amount).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
