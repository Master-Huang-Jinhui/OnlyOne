const GUEST_KEY = 'onlyone_guest_id'
const TABLE_KEY = 'onlyone_table_info'

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

export function getGuestId() {
  let id = localStorage.getItem(GUEST_KEY)
  if (!id) { id = uuid(); localStorage.setItem(GUEST_KEY, id) }
  return id
}

export function getTableInfo() {
  try { const raw = localStorage.getItem(TABLE_KEY); return raw ? JSON.parse(raw) : null } catch { return null }
}

export function setTableInfo(table) {
  localStorage.setItem(TABLE_KEY, JSON.stringify(table))
}

export function clearTableInfo() {
  localStorage.removeItem(TABLE_KEY)
}

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

export function getOrderIdentity() {
  const guestId = getGuestId()
  const table = getTableInfo()
  return { guest_id: guestId, table_id: table?.id || null, table_session: table?.current_session || null }
}
