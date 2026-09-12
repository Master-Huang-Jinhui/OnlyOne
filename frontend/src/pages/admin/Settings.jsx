import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Card, Button, Input, Select, Switch, Tabs, toast } from '../../components/ui'

const days = [
  { key: 'monday', label: '周一' },
  { key: 'tuesday', label: '周二' },
  { key: 'wednesday', label: '周三' },
  { key: 'thursday', label: '周四' },
  { key: 'friday', label: '周五' },
  { key: 'saturday', label: '周六' },
  { key: 'sunday', label: '周日' }
]

export default function Settings() {
  const [tab, setTab] = useState('basic')
  const [settings, setSettings] = useState({})
  const [saving, setSaving] = useState(false)
  const [qrAddress, setQrAddress] = useState('')

  useEffect(() => {
    api.getSettings().then(s => {
      setSettings(s)
      try {
        if (!s.business_hours) s.business_hours = {}
      } catch {}
    }).catch(() => {})
  }, [])

  const update = (key, value) => setSettings(prev => ({ ...prev, [key]: value }))

  const updateHours = (day, field, value) => {
    const hours = { ...(settings.business_hours || {}) }
    if (!hours[day]) hours[day] = { open: false, open_time: '10:00', close_time: '21:00' }
    hours[day][field] = field === 'open' ? value : value
    update('business_hours', hours)
  }

  const save = async () => {
    setSaving(true)
    try {
      await api.updateSettings(settings)
      toast('保存成功')
    } catch (e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const generateQR = () => {
    const address = qrAddress || `http://${window.location.hostname}:3000`
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(address)}`
    window.open(qrUrl, '_blank')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">系统设置</h2>
          <p className="text-sm text-gray-400 mt-1">店铺信息、营业时间、税率、配送等</p>
        </div>
        <Button onClick={save} disabled={saving}>{saving ? '保存中...' : '保存设置'}</Button>
      </div>

      <Tabs tabs={[
        { key: 'basic', label: '店铺信息' },
        { key: 'hours', label: '营业时间' },
        { key: 'tax', label: '税率与配送' },
        { key: 'qr', label: '堂吃二维码' }
      ]} active={tab} onChange={setTab} />

      {tab === 'basic' && (
        <Card className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="店铺名称" value={settings.store_name || ''} onChange={e => update('store_name', e.target.value)} />
            <Input label="英文名" value={settings.store_name_en || ''} onChange={e => update('store_name_en', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="联系电话" value={settings.phone || ''} onChange={e => update('phone', e.target.value)} />
            <Input label="地址" value={settings.address || ''} onChange={e => update('address', e.target.value)} />
          </div>
        </Card>
      )}

      {tab === 'hours' && (
        <Card className="p-6">
          <p className="text-sm text-gray-400 mb-4">每天可独立开关营业并设置起止时间，周二默认休息</p>
          <div className="space-y-3">
            {days.map(day => {
              const h = settings.business_hours?.[day.key] || { open: false, open_time: '10:00', close_time: '21:00' }
              return (
                <div key={day.key} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <span className="w-12 font-medium text-gray-700">{day.label}</span>
                  <Switch checked={!!h.open} onChange={v => updateHours(day.key, 'open', v)} label={h.open ? '营业中' : '休息'} />
                  {h.open && (
                    <div className="flex items-center gap-2 ml-4">
                      <input type="time" value={h.open_time} onChange={e => updateHours(day.key, 'open_time', e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
                      <span className="text-gray-400">至</span>
                      <input type="time" value={h.close_time} onChange={e => updateHours(day.key, 'close_time', e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2">营业日结算时间</p>
            <p className="text-xs text-gray-400 mb-3">每天这个时间点之前的订单算前一天的营业日，之后算新的一天。比如设为04:00，则凌晨4点前的订单算前一天。</p>
            <div className="flex items-center gap-2">
              <input type="time" value={settings.business_day_start || '04:00'} onChange={e => update('business_day_start', e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
              <span className="text-xs text-gray-400">默认 04:00（凌晨4点）</span>
            </div>
          </div>
        </Card>
      )}

      {tab === 'tax' && (
        <Card className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">税率（默认 8.8875%）</label>
            <div className="flex items-center gap-2">
              <Input type="number" step="0.0001" value={settings.tax_rate || ''} onChange={e => update('tax_rate', e.target.value)} className="w-40" />
              <span className="text-gray-500 text-sm">= {(parseFloat(settings.tax_rate || 0) * 100).toFixed(3)}%</span>
            </div>
          </div>
          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-800 mb-3">配送规则</h4>
            <div className="grid grid-cols-3 gap-4">
              <Input label="配送范围（英里）" type="number" value={settings.delivery_range_miles || ''} onChange={e => update('delivery_range_miles', e.target.value)} />
              <Input label="满多少免配送费（$）" type="number" value={settings.free_delivery_min || ''} onChange={e => update('free_delivery_min', e.target.value)} />
              <Input label="配送费（$）" type="number" step="0.01" value={settings.delivery_fee || ''} onChange={e => update('delivery_fee', e.target.value)} />
            </div>
          </div>
        </Card>
      )}

      {tab === 'qr' && (
        <Card className="p-6">
          <h4 className="font-medium text-gray-800 mb-3">堂吃二维码</h4>
          <p className="text-sm text-gray-400 mb-4">生成门店访问二维码，打印贴餐桌，顾客扫码直接访问菜单首页。需在同一 WiFi 局域网下访问。</p>
          <div className="flex gap-3 mb-2">
            <Input label="局域网地址（留空自动获取当前地址）" value={qrAddress} onChange={e => setQrAddress(e.target.value)} placeholder="http://192.168.1.100:3000" className="flex-1" />
            <div className="flex items-end"><Button onClick={generateQR}>生成二维码</Button></div>
          </div>
          <div className="flex items-center gap-2 mb-4 text-sm">
            <span className="text-gray-500">当前地址：</span>
            <code className="bg-gray-100 px-2 py-1 rounded text-gray-700 flex-1 truncate">{qrAddress || window.location.origin}</code>
            <Button size="sm" variant="outline" onClick={() => {
              navigator.clipboard.writeText(qrAddress || window.location.origin)
              toast('地址已复制')
            }}>复制</Button>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-700">
            <p>⚠️ 注意：</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>电脑主机必须保持开机，服务必须在运行</li>
              <li>Windows 需要允许防火墙专用/公用网络访问</li>
              <li>顾客手机必须连接同一 WiFi</li>
            </ul>
          </div>
        </Card>
      )}
    </div>
  )
}