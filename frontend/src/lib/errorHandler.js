// ============================================================
// 全局错误处理模块
// 功能：统一捕获异常、弹出错误提示、记录错误日志
// 作者：OnlyOne BBQ & Tea
// ============================================================

// 延迟导入toast，避免循环依赖（toast在ui/index.jsx中定义）
let toastFn = null
export function setToastFn(fn) { toastFn = fn }

// 功能未完善时的默认提示文案
export const FEATURE_NOT_IMPLEMENTED = '该功能尚未完善，请联系管理员'

// 弹出toast提示
function showToast(message, type = 'error') {
  if (toastFn) toastFn(message, type)
}

// 记录错误到控制台（开发环境可查看详细堆栈）
function logError(error, context) {
  const prefix = context ? `[${context}]` : '[错误]'
  if (error instanceof Error) {
    console.error(`${prefix}`, error.message, error.stack || '')
  } else {
    console.error(`${prefix}`, error)
  }
}

// ============================================================
// 核心函数：处理API错误并自动弹出提示
// 参数：
//   error - 捕获到的Error对象
//   context - 出错的接口路径或场景描述
//   silent - 设为true则不自动弹toast（调用方自己处理提示）
// ============================================================
export function handleApiError(error, context, silent = false) {
  logError(error, context)

  // 如果调用方要求静默，只记录日志不弹提示
  if (silent) return

  // 网络错误：fetch请求失败（服务器未启动、网络断开等）
  if (error.name === 'TypeError' && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
    showToast('无法连接服务器，请检查网络后重试', 'error')
    return
  }

  // 401 未授权：token过期或未登录
  if (error.status === 401) {
    showToast('登录已过期，请重新登录', 'error')
    setTimeout(() => { window.location.href = '/login' }, 1500)
    return
  }

  // 403 无权限
  if (error.status === 403) {
    showToast('您没有权限执行此操作', 'error')
    return
  }

  // 404 接口不存在
  if (error.status === 404) {
    showToast('请求的接口不存在', 'error')
    return
  }

  // 500 服务器内部错误
  if (error.status >= 500) {
    showToast('服务器内部错误，请稍后重试', 'error')
    return
  }

  // 400 等业务错误：显示后端返回的错误信息
  if (error.message && error.message !== '请求失败') {
    showToast(error.message, 'error')
    return
  }

  // 未知错误：显示通用提示
  showToast(FEATURE_NOT_IMPLEMENTED, 'error')
}

// ============================================================
// 显示"功能尚未完善"提示
// 参数：featureName - 功能名称（可选）
// ============================================================
export function showFeatureNotImplemented(featureName) {
  const msg = featureName
    ? `「${featureName}」${FEATURE_NOT_IMPLEMENTED}`
    : FEATURE_NOT_IMPLEMENTED
  showToast(msg, 'error')
}

// ============================================================
// 显示错误弹窗（详细错误信息+联系管理员按钮）
// 通过setErrorDialogFn注册渲染函数
// ============================================================
let errorDialogFn = null
export function setErrorDialogFn(fn) { errorDialogFn = fn }

// 弹出错误对话框
// 参数：
//   title - 错误标题（如"操作失败"）
//   detail - 详细错误信息（如后端返回的error字段）
//   showContact - 是否显示"联系管理员"按钮（默认true）
export function showErrorDialog(title = '操作失败', detail = '', showContact = true) {
  if (errorDialogFn) {
    errorDialogFn({ title, detail, showContact })
  } else {
    // 如果弹窗组件未挂载，降级为toast
    showToast(detail || title, 'error')
  }
}

// ============================================================
// 初始化全局错误监听
// 在App.jsx的useEffect中调用一次
// ============================================================
export function initGlobalErrorHandlers() {
  // 捕获未处理的Promise rejection（异步代码中未catch的错误）
  window.addEventListener('unhandledrejection', (event) => {
    event.preventDefault()
    const reason = event.reason

    // 如果错误已经被api.js处理过（标记了__handled），不再重复弹提示
    if (reason && reason.__handled) return

    logError(reason, '未处理的Promise错误')

    const message = reason?.message || FEATURE_NOT_IMPLEMENTED
    showToast(message, 'error')
  })

  // 捕获运行时JavaScript错误（同步代码中的未捕获异常）
  window.addEventListener('error', (event) => {
    logError(event.error || event.message, '运行时错误')
    // 不在这里弹toast，避免React组件渲染错误时频繁弹窗
    // 渲染错误由ErrorBoundary组件统一处理
  })
}

// ============================================================
// 包装异步函数，自动捕获错误并弹提示
// 用法：const safeLoad = withErrorHandler(async () => { ... })
// ============================================================
export function withErrorHandler(fn, context = '操作') {
  return async (...args) => {
    try {
      return await fn(...args)
    } catch (error) {
      handleApiError(error, context)
      throw error // 仍然抛出，让调用方可以决定是否继续
    }
  }
}
