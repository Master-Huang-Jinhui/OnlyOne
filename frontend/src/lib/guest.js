const GUEST_KEY = 'onlyone_guest_id'
const TABLE_KEY = 'onlyone_table_info'

// 生成UUID（优先使用浏览器原生crypto.randomUUID，降级到手动实现）
function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

// 获取或创建顾客唯一ID（存储在localStorage中）
export function getGuestId() {
  let id = localStorage.getItem(GUEST_KEY)
  if (!id) { id = uuid(); localStorage.setItem(GUEST_KEY, id) }
  return id
}

// 从localStorage读取当前餐桌信息（JSON对象）
export function getTableInfo() {
  try { const raw = localStorage.getItem(TABLE_KEY); return raw ? JSON.parse(raw) : null } catch { return null }
}

// 将餐桌信息写入localStorage
export function setTableInfo(table) {
  localStorage.setItem(TABLE_KEY, JSON.stringify(table))
}

// 清除localStorage中的餐桌信息（结账后调用）
export function clearTableInfo() {
  localStorage.removeItem(TABLE_KEY)
}

// 从URL参数?table=桌号初始化餐桌信息，自动清除URL参数
export async function initTableFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const tableNo = params.get('table')
  if (tableNo) {
    try {
      const table = await fetch(`/api/tables/by-no/${encodeURIComponent(tableNo)}`).then(r => r.json())
      if (table && table.id) {
        setTableInfo({ id: table.id, table_no: table.table_no, current_session: table.current_session })
        const url = new URL(window.location)
        url.searchParams.delete('table')
        window.history.replaceState({}, '', url)
        return table
      }
    } catch (e) { console.error('获取餐桌信息失败', e) }
  }
  return null
}

// 获取订单身份标识（顾客ID + 餐桌ID + 餐桌会话）
export function getOrderIdentity() {
  const guestId = getGuestId()
  const table = getTableInfo()
  return { guest_id: guestId, table_id: table?.id || null, table_session: table?.current_session || null }
}
