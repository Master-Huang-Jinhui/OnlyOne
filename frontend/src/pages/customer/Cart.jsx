import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useLanguage } from '../../context/LanguageContext'
import { Button, Input, Empty, Dialog } from '../../components/ui'

export default function Cart() {
  // 购物车页：商品列表 + 数量调整 + 备注编辑 + 小计结算
  const navigate = useNavigate()
  const { t, language } = useLanguage()
  const { items, updateQuantity, updateNote, clearNote, removeItem, clear, subtotal, totalCount } = useCart()
  const [noteDialog, setNoteDialog] = useState(null)
  const [noteText, setNoteText] = useState('')

  // 打开备注编辑弹窗
  const openNoteDialog = (item) => {
    setNoteDialog(item)
    setNoteText(item.note || '')
  }

  // 保存商品备注并关闭弹窗
  const saveNote = () => {
    if (noteDialog) {
      updateNote(noteDialog.cartId, noteText)
    }
    setNoteDialog(null)
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 flex flex-col items-center justify-center">
        <Empty text={t('cart.empty', '购物车是空的')} icon="🛒" />
        <Link to="/menu"><Button className="mt-4">{t('cart.goOrder', '去点餐')}</Button></Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">{t('cart.title', '购物车')} ({totalCount})</h1>
          <button onClick={clear} className="text-sm text-gray-400 hover:text-red-500">{t('cart.clearCart', '清空购物车')}</button>
        </div>

        <div className="space-y-4 mb-8">
          {items.map((item) => (
            <div key={item.cartId} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-primary-50 to-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover rounded-lg" /> : <span className="text-3xl">🍜</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-800">{language === 'en' ? (item.name_en || item.name) : item.name}</h3>
                      {item.note && (
                        <span className="inline-block mt-1 text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded">📝 {item.note}</span>
                      )}
                    </div>
                    <span className="font-bold text-primary-600">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQuantity(item.cartId, item.quantity - 1)} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center">−</button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.cartId, item.quantity + 1)} className="w-7 h-7 rounded-full bg-primary-100 hover:bg-primary-200 text-primary-600 flex items-center justify-center">+</button>
                    </div>
                    <div className="flex gap-2 text-sm">
                      <button onClick={() => openNoteDialog(item)} className="text-primary-600 hover:text-primary-700">{item.note ? t('cart.editNote', '修改备注') : t('cart.addNote', '加备注')}</button>
                      {item.note && <button onClick={() => clearNote(item.cartId)} className="text-gray-400 hover:text-gray-600">{t('cart.clearNote', '清除')}</button>}
                      <button onClick={() => removeItem(item.cartId)} className="text-red-400 hover:text-red-600">{t('common.delete', '删除')}</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 小计 */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
          <div className="flex justify-between text-gray-600 mb-2">
            <span>{t('cart.subtotal', '商品小计')}</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600 mb-2 text-sm">
            <span>{t('cart.feesNote', '税费和配送费将在结算时计算')}</span>
          </div>
          <div className="border-t pt-3 mt-3 flex justify-between">
            <span className="font-bold text-gray-800">{t('cart.total', '合计')}</span>
            <span className="font-bold text-xl text-primary-600">${subtotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex gap-4">
          <Link to="/menu"><Button variant="outline">{t('cart.continueOrdering', '继续点餐')}</Button></Link>
          <Button className="flex-1" onClick={() => navigate('/checkout')}>{t('cart.checkout', '去结算')}</Button>
        </div>
      </div>

      {/* 备注对话框 */}
      <Dialog
        open={!!noteDialog}
        onClose={() => setNoteDialog(null)}
        title={t('cart.addNoteTitle', '添加备注')}
        footer={
          <>
            <Button variant="outline" onClick={() => setNoteDialog(null)}>{t('common.cancel', '取消')}</Button>
            <Button onClick={saveNote}>{t('common.save', '保存')}</Button>
          </>
        }
      >
        <p className="text-sm text-gray-500 mb-3">{t('cart.productLabel', '商品')}：{noteDialog?.name}</p>
        <Input
          placeholder={t('cart.notePlaceholder', '例如：少冰、半糖、不要香菜...')}
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
        />
        <p className="text-xs text-gray-400 mt-2">{t('cart.noteHint', '提示：不同备注的同款商品会分开计算，不会合并数量')}</p>
      </Dialog>
    </div>
  )
}
