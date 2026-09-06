const BASE = '/api'
function getToken() { return localStorage.getItem('token') }
async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || '请求失败')
  return data
}
export const api = {
  login: (username, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getMe: () => request('/auth/me'),
  changePassword: (oldPassword, newPassword) => request('/auth/change-password', { method: 'PUT', body: JSON.stringify({ oldPassword, newPassword }) }),
  getUsers: () => request('/users'),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  getPlatforms: () => request('/platforms'),
  createPlatform: (data) => request('/platforms', { method: 'POST', body: JSON.stringify(data) }),
  updatePlatform: (id, data) => request(`/platforms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePlatform: (id) => request(`/platforms/${id}`, { method: 'DELETE' }),
  getProducts: (categoryId) => request(`/products${categoryId ? `?category_id=${categoryId}` : ''}`),
  getAllProducts: () => request('/products/all'),
  createProduct: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  getCategories: () => request('/products/categories'),
  getAllCategories: () => request('/products/categories/all'),
  createCategory: (data) => request('/products/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id, data) => request(`/products/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id) => request(`/products/categories/${id}`, { method: 'DELETE' }),
  createOrder: (data) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
  getOrders: (status) => request(`/orders${status ? `?status=${status}` : ''}`),
  getOrderStats: () => request('/orders/stats'),
  updateOrderStatus: (id, status) => request(`/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  getSettings: () => request('/settings'),
  updateSettings: (data) => request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  getTodayBusiness: () => request('/settings/business/today'),
  getForms: () => request('/forms'),
  getPublicForm: (id) => request(`/forms/public/${id}`),
  createForm: (data) => request('/forms', { method: 'POST', body: JSON.stringify(data) }),
  updateForm: (id, data) => request(`/forms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteForm: (id) => request(`/forms/${id}`, { method: 'DELETE' }),
  submitForm: (id, data) => request(`/forms/${id}/submit`, { method: 'POST', body: JSON.stringify(data) }),
  getFormSubmissions: (id) => request(`/forms/${id}/submissions`),
  getMenus: () => request('/menus'),
  getAllMenus: () => request('/menus/all'),
  createMenu: (data) => request('/menus', { method: 'POST', body: JSON.stringify(data) }),
  updateMenu: (id, data) => request(`/menus/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMenu: (id) => request(`/menus/${id}`, { method: 'DELETE' }),
  getCarousel: () => request('/content/carousel'),
  getAllCarousel: () => request('/content/carousel/all'),
  createCarousel: (data) => request('/content/carousel', { method: 'POST', body: JSON.stringify(data) }),
  updateCarousel: (id, data) => request(`/content/carousel/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCarousel: (id) => request(`/content/carousel/${id}`, { method: 'DELETE' }),
  getContentBlocks: () => request('/content/blocks'),
  updateContentBlock: (key, data) => request(`/content/blocks/${key}`, { method: 'PUT', body: JSON.stringify(data) }),

  // 自定义内容板块
  getContentSections: () => request('/content/sections'),
  getAllContentSections: () => request('/content/sections/all'),
  createContentSection: (data) => request('/content/sections', { method: 'POST', body: JSON.stringify(data) }),
  updateContentSection: (id, data) => request(`/content/sections/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteContentSection: (id) => request(`/content/sections/${id}`, { method: 'DELETE' }),

  getMemos: (type) => request(`/memos${type ? `?type=${type}` : ''}`),
  createMemo: (data) => request('/memos', { method: 'POST', body: JSON.stringify(data) }),
  updateMemo: (id, data) => request(`/memos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMemo: (id) => request(`/memos/${id}`, { method: 'DELETE' }),

  // 口味标签
  getFlavorTags: () => request('/flavor-tags'),
  getAllFlavorTags: () => request('/flavor-tags/all'),
  createFlavorTag: (data) => request('/flavor-tags', { method: 'POST', body: JSON.stringify(data) }),
  updateFlavorTag: (id, data) => request(`/flavor-tags/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFlavorTag: (id) => request(`/flavor-tags/${id}`, { method: 'DELETE' }),

  // 口味分类（大类）
  getFlavorCategories: () => request('/flavor-categories'),
  getAllFlavorCategories: () => request('/flavor-categories/all'),
  createFlavorCategory: (data) => request('/flavor-categories', { method: 'POST', body: JSON.stringify(data) }),
  updateFlavorCategory: (id, data) => request(`/flavor-categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFlavorCategory: (id) => request(`/flavor-categories/${id}`, { method: 'DELETE' })
}
