const BASE = '/api'

function getToken() {
  return localStorage.getItem('token')
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, { method: 'POST', ...options, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || '请求失败')
  return data
}

export const api = {
  login: (username, password) => request('/auth/login', { body: JSON.stringify({ username, password }) }),
  getMe: () => request('/auth/me'),
  changePassword: (oldPassword, newPassword) => request('/auth/change-password', { body: JSON.stringify({ oldPassword, newPassword }) }),
  getUsers: () => request('/users/list'),
  createUser: (data) => request('/users', { body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/users/update/${id}`, { body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/users/delete/${id}`),
  getPlatforms: () => request('/platforms/list'),
  getPublicPlatforms: () => request('/platforms/public'),
  createPlatform: (data) => request('/platforms', { body: JSON.stringify(data) }),
  updatePlatform: (id, data) => request(`/platforms/update/${id}`, { body: JSON.stringify(data) }),
  deletePlatform: (id) => request(`/platforms/delete/${id}`),
  getProducts: (categoryId) => request(`/products/list${categoryId ? `?category_id=${categoryId}` : ''}`),
  getAllProducts: () => request('/products/all'),
  getProductById: (id) => request(`/products/detail/${id}`),
  createProduct: (data) => request('/products', { body: JSON.stringify(data) }),
  updateProduct: (id, data) => request(`/products/update/${id}`, { body: JSON.stringify(data) }),
  deleteProduct: (id) => request(`/products/delete/${id}`),
  getCategories: () => request('/products/categories/list'),
  getAllCategories: () => request('/products/categories/all'),
  createCategory: (data) => request('/products/categories', { body: JSON.stringify(data) }),
  updateCategory: (id, data) => request(`/products/categories/update/${id}`, { body: JSON.stringify(data) }),
  deleteCategory: (id) => request(`/products/categories/delete/${id}`),
  createOrder: (data) => request('/orders', { body: JSON.stringify(data) }),
  getOrders: (params) => {
    const qs = new URLSearchParams()
    if (params?.status) qs.append('status', params.status)
    if (params?.start_date) qs.append('start_date', params.start_date)
    if (params?.end_date) qs.append('end_date', params.end_date)
    if (params?.sort_by) qs.append('sort_by', params.sort_by)
    if (params?.sort_order) qs.append('sort_order', params.sort_order)
    if (params?.page) qs.append('page', params.page)
    if (params?.page_size) qs.append('page_size', params.page_size)
    const query = qs.toString()
    return request(`/orders/list${query ? `?${query}` : ''}`)
  },
  getOrderById: (id) => request(`/orders/detail/${id}`),
  getTableOrders: (tableId) => request(`/orders/table/${tableId}`),
  getEmployeeTodayOrders: (status) => request(`/orders/employee/today${status ? `?status=${status}` : ''}`),
  updateEmployeeOrderStatus: (id, status) => request(`/orders/employee/${id}/status`, { body: JSON.stringify({ status }) }),
  appendOrder: (id, items) => request(`/orders/employee/${id}/append`, { body: JSON.stringify({ items }) }),
  getOrderStats: () => request('/orders/stats'),
  updateOrderStatus: (id, status) => request(`/orders/${id}/status`, { body: JSON.stringify({ status }) }),
  getOrderByNo: (orderNo) => request(`/orders/lookup/${orderNo}`),
  searchOrders: (keyword) => request(`/orders/search?keyword=${encodeURIComponent(keyword)}`),
  getMyOrders: (guestId, tableId, tableSession) => {
    const params = new URLSearchParams()
    if (guestId) params.append('guest_id', guestId)
    if (tableId) params.append('table_id', tableId)
    if (tableSession) params.append('table_session', tableSession)
    const qs = params.toString()
    return request(`/orders/mine${qs ? `?${qs}` : ''}`)
  },
  getTableByNo: (tableNo) => request(`/tables/by-no/${encodeURIComponent(tableNo)}`),
  getPublicTables: () => request('/tables/public'),
  getTables: () => request('/tables/list'),
  createTable: (data) => request('/tables', { body: JSON.stringify(data) }),
  updateTable: (id, data) => request(`/tables/update/${id}`, { body: JSON.stringify(data) }),
  deleteTable: (id) => request(`/tables/delete/${id}`),
  clearTable: (id) => request(`/tables/${id}/clear`),
  occupyTable: (id) => request(`/tables/${id}/occupy`),
  getSettings: () => request('/settings/list'),
  getSetting: (key) => request(`/settings/detail/${key}`),
  updateSettings: (data) => request('/settings', { body: JSON.stringify(data) }),
  getTodayBusiness: () => request('/settings/business/today'),
  getForms: () => request('/forms/list'),
  getPublicForm: (id) => request(`/forms/public/${id}`),
  createForm: (data) => request('/forms', { body: JSON.stringify(data) }),
  updateForm: (id, data) => request(`/forms/update/${id}`, { body: JSON.stringify(data) }),
  deleteForm: (id) => request(`/forms/delete/${id}`),
  submitForm: (id, data) => request(`/forms/${id}/submit`, { body: JSON.stringify(data) }),
  getFormSubmissions: (id) => request(`/forms/${id}/submissions`),
  getMenus: () => request('/menus/list'),
  getAllMenus: () => request('/menus/all'),
  createMenu: (data) => request('/menus', { body: JSON.stringify(data) }),
  updateMenu: (id, data) => request(`/menus/update/${id}`, { body: JSON.stringify(data) }),
  deleteMenu: (id) => request(`/menus/delete/${id}`),
  getProductStats: (threshold) => request(`/stats/products${threshold ? `?threshold=${threshold}` : ''}`),
  getTopProducts: () => request('/stats/products/top5'),
  downloadProfitTemplate: async () => {
    const token = getToken()
    const res = await fetch(`${BASE}/stats/profit/template`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } })
    if (!res.ok) throw new Error('下载失败')
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'profit_template.xlsx'
    a.click()
    window.URL.revokeObjectURL(url)
  },
  importProfitExcel: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const token = getToken()
    const res = await fetch(`${BASE}/stats/profit/import`, { method: 'POST', body: formData, headers: { 'Authorization': `Bearer ${token}` } })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || '导入失败')
    return data
  },
  exportProfitResult: async (results) => {
    const token = getToken()
    const res = await fetch(`${BASE}/stats/profit/export`, {
      method: 'POST',
      body: JSON.stringify({ results }),
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    })
    if (!res.ok) throw new Error('导出失败')
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'profit_result.xlsx'
    a.click()
    window.URL.revokeObjectURL(url)
  },
  searchProfitHistory: (keyword) => request(`/stats/profit/history/search?keyword=${encodeURIComponent(keyword)}`),
  getProfitHistoryLatest: (productId, productName) => {
    const params = new URLSearchParams()
    if (productId) params.append('product_id', productId)
    if (productName) params.append('product_name', productName)
    return request(`/stats/profit/history/latest?${params.toString()}`)
  },
  saveProfitRecord: (data) => request('/stats/profit/save', { body: JSON.stringify(data) }),
  getCarousel: () => request('/content/carousel/list'),
  getAllCarousel: () => request('/content/carousel/all'),
  createCarousel: (data) => request('/content/carousel', { body: JSON.stringify(data) }),
  updateCarousel: (id, data) => request(`/content/carousel/update/${id}`, { body: JSON.stringify(data) }),
  deleteCarousel: (id) => request(`/content/carousel/delete/${id}`),
  getContentBlocks: () => request('/content/blocks'),
  getContentBlock: (key) => request(`/content/blocks/detail/${key}`),
  updateContentBlock: (key, data) => request(`/content/blocks/update/${key}`, { body: JSON.stringify(data) }),
  getContentSections: () => request('/content/sections/list'),
  getAllContentSections: () => request('/content/sections/all'),
  createContentSection: (data) => request('/content/sections', { body: JSON.stringify(data) }),
  updateContentSection: (id, data) => request(`/content/sections/update/${id}`, { body: JSON.stringify(data) }),
  deleteContentSection: (id) => request(`/content/sections/delete/${id}`),
  getNewProducts: () => request('/content/new-products/list'),
  getAllNewProducts: () => request('/content/new-products/all'),
  createNewProduct: (data) => request('/content/new-products', { body: JSON.stringify(data) }),
  updateNewProduct: (id, data) => request(`/content/new-products/update/${id}`, { body: JSON.stringify(data) }),
  deleteNewProduct: (id) => request(`/content/new-products/delete/${id}`),
  getMemos: (type) => request(`/memos/list${type ? `?type=${type}` : ''}`),
  createMemo: (data) => request('/memos', { body: JSON.stringify(data) }),
  updateMemo: (id, data) => request(`/memos/update/${id}`, { body: JSON.stringify(data) }),
  deleteMemo: (id) => request(`/memos/delete/${id}`),
  getFlavorTags: (productCategoryId) => request(`/flavor-tags/list${productCategoryId ? `?product_category_id=${productCategoryId}` : ''}`),
  getAllFlavorTags: () => request('/flavor-tags/all'),
  createFlavorTag: (data) => request('/flavor-tags', { body: JSON.stringify(data) }),
  updateFlavorTag: (id, data) => request(`/flavor-tags/update/${id}`, { body: JSON.stringify(data) }),
  deleteFlavorTag: (id) => request(`/flavor-tags/delete/${id}`),
  getFlavorCategories: () => request('/flavor-categories/list'),
  getAllFlavorCategories: () => request('/flavor-categories/all'),
  createFlavorCategory: (data) => request('/flavor-categories', { body: JSON.stringify(data) }),
  updateFlavorCategory: (id, data) => request(`/flavor-categories/update/${id}`, { body: JSON.stringify(data) }),
  deleteFlavorCategory: (id) => request(`/flavor-categories/delete/${id}`),
  getOrderStatuses: (diningType) => request(`/order-statuses/list${diningType ? `?dining_type=${diningType}` : ''}`),
  getAllOrderStatuses: () => request('/order-statuses/all'),
  createOrderStatus: (data) => request('/order-statuses', { body: JSON.stringify(data) }),
  updateOrderStatus: (id, data) => request(`/order-statuses/update/${id}`, { body: JSON.stringify(data) }),
  deleteOrderStatus: (id) => request(`/order-statuses/delete/${id}`),
  uploadImage: async (file) => {
    const formData = new FormData()
    formData.append('image', file)
    const token = getToken()
    const headers = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${BASE}/upload/image`, { method: 'POST', body: formData, headers })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || '上传失败')
    return data
  },
  getTodayAttendance: () => request('/attendance/today'),
  clockIn: () => request('/attendance/clock-in'),
  clockOut: () => request('/attendance/clock-out'),
  getAttendanceRecords: (params) => request(`/attendance/list?${new URLSearchParams(params).toString()}`),
  getGoods: (params) => request(`/inventory/goods/list?${new URLSearchParams(params || {}).toString()}`),
  getGoodsById: (id) => request(`/inventory/goods/detail/${id}`),
  createGoods: (data) => request('/inventory/goods', { body: JSON.stringify(data) }),
  updateGoods: (id, data) => request(`/inventory/goods/update/${id}`, { body: JSON.stringify(data) }),
  deleteGoods: (id) => request(`/inventory/goods/delete/${id}`),
  getPurchaseOrders: (params) => request(`/inventory/orders/list?${new URLSearchParams(params || {}).toString()}`),
  getPurchaseOrder: (id) => request(`/inventory/orders/detail/${id}`),
  createPurchaseOrder: (data) => request('/inventory/orders', { body: JSON.stringify(data) }),
  updatePurchaseOrder: (id, data) => request(`/inventory/orders/update/${id}`, { body: JSON.stringify(data) }),
  deletePurchaseOrder: (id) => request(`/inventory/orders/delete/${id}`)
}
