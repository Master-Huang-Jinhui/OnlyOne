/**
 * 统一时间格式化工具
 * 所有时间显示都应使用这里的函数，确保格式统一
 */

// 补零
const pad = (n) => String(n).padStart(2, '0')

/**
 * 解析时间字符串为 Date 对象
 * 支持 "2026-09-11 14:30:00" 和 ISO 格式
 */
export function parseDate(str) {
  if (!str) return null
  // 如果已经是 Date 对象
  if (str instanceof Date) return str
  // 处理 "2026-09-11 14:30:00" 格式（SQLite 本地时间）
  if (typeof str === 'string' && str.includes(' ') && !str.includes('T')) {
    const [datePart, timePart] = str.split(' ')
    const [y, m, d] = datePart.split('-').map(Number)
    const [h, min, s] = (timePart || '00:00:00').split(':').map(Number)
    return new Date(y, m - 1, d, h || 0, min || 0, s || 0)
  }
  // 其他格式用原生解析
  return new Date(str)
}

/**
 * 格式化完整日期时间：2026-09-11 14:30
 */
export function formatDateTime(str) {
  const d = parseDate(str)
  if (!d || isNaN(d.getTime())) return '-'
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * 格式化完整日期时间（带秒）：2026-09-11 14:30:00
 */
export function formatDateTimeFull(str) {
  const d = parseDate(str)
  if (!d || isNaN(d.getTime())) return '-'
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/**
 * 只显示时间：14:30
 */
export function formatTime(str) {
  const d = parseDate(str)
  if (!d || isNaN(d.getTime())) return '-'
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * 只显示日期：2026-09-11
 */
export function formatDate(str) {
  const d = parseDate(str)
  if (!d || isNaN(d.getTime())) return '-'
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * 中文日期：2026年9月11日
 */
export function formatDateCN(str) {
  const d = parseDate(str)
  if (!d || isNaN(d.getTime())) return '-'
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

/**
 * 中文日期时间：2026年9月11日 14:30
 */
export function formatDateTimeCN(str) {
  const d = parseDate(str)
  if (!d || isNaN(d.getTime())) return '-'
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * 相对时间：刚刚 / 5分钟前 / 2小时前 / 昨天
 */
export function formatRelative(str) {
  const d = parseDate(str)
  if (!d || isNaN(d.getTime())) return '-'
  const now = new Date()
  const diff = (now.getTime() - d.getTime()) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
  if (diff < 172800) return '昨天'
  return formatDate(str)
}

/**
 * 打卡时间格式化：09:15:00 → 09:15
 */
export function formatClockTime(str) {
  if (!str) return '-'
  // 如果是 "09:15:00" 格式
  if (typeof str === 'string' && str.includes(':') && str.length <= 8) {
    const parts = str.split(':')
    return `${parts[0]}:${parts[1]}`
  }
  return formatTime(str)
}
