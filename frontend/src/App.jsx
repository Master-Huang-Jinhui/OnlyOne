import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, Component } from 'react'
import { ToastContainer, ErrorDialogContainer, toast } from './components/ui'
import { ConfirmProvider } from './components/ConfirmDialog'
import { useAuth } from './context/AuthContext'
import { LanguageProvider, useLanguage } from './context/LanguageContext'
import { initGlobalErrorHandlers, setToastFn } from './lib/errorHandler'

import Home from './pages/customer/Home'
import Menu from './pages/customer/Menu'
import Cart from './pages/customer/Cart'
import Checkout from './pages/customer/Checkout'
import OrderStatus from './pages/customer/OrderStatus'
import Login from './pages/admin/Login'
import AdminLayout from './pages/admin/Layout'
import Dashboard from './pages/admin/Dashboard'
import Users from './pages/admin/Users'
import Platforms from './pages/admin/Platforms'
import PlatformReports from './pages/admin/PlatformReports'
import Products from './pages/admin/Products'
import Combos from './pages/admin/Combos'
import Flavors from './pages/admin/Flavors'
import OrderStatuses from './pages/admin/OrderStatuses'
import Tables from './pages/admin/Tables'
import Orders from './pages/admin/Orders'
import Settings from './pages/admin/Settings'
import Menus from './pages/admin/Menus'
import Forms from './pages/admin/Forms'
import FormRenderer from './pages/admin/FormRenderer'
import ProductStats from './pages/admin/ProductStats'
import DeliveryProductStats from './pages/admin/DeliveryProductStats'
import Content from './pages/admin/Content'
import Permissions from './pages/admin/Permissions'
import Roles from './pages/admin/Roles'
import Translations from './pages/admin/Translations'
import Inventory from './pages/admin/Inventory'
import KDS from './pages/admin/KDS'
import Members from './pages/admin/Members'
import Coupons from './pages/admin/Coupons'
import Queue from './pages/admin/Queue'
import Reports from './pages/admin/Reports'
import EmployeeHome from './pages/employee/EmployeeHome'
import EmployeeOrder from './pages/employee/EmployeeOrder'
import EmployeeOrders from './pages/employee/EmployeeOrders'
import EmployeeTableDetail from './pages/employee/EmployeeTableDetail'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null } }
  static getDerivedStateFromError(error) { return { hasError: true, error: null } }
  componentDidCatch(error, errorInfo) { console.error('[渲染错误]', error, errorInfo) }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">页面出现错误</h2>
            <p className="text-sm text-gray-500 mb-4">很抱歉，页面加载时遇到了问题。</p>
            <div className="bg-red-50 rounded-lg p-3 mb-4 text-left">
              <p className="text-xs text-red-600 font-mono break-all">{this.state.error?.message || '未知错误'}</p>
            </div>
            <p className="text-xs text-amber-600 mb-4">该功能尚未完善，请联系管理员</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/' }} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">返回首页</button>
              <button onClick={() => window.location.reload()} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">刷新页面</button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function ProtectedRoute({ children, adminOnly = false, superAdminOnly = false, employeeOnly = false }) {
  const { user, loading } = useAuth()
  const { t } = useLanguage()
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">{t('common.loading', '加载中...')}</div>
  if (!user) return <Navigate to="/login" />
  if (superAdminOnly && user.role !== 'admin') return <Navigate to="/" />
  if (adminOnly && user.role !== 'admin' && user.role !== 'manager') return <Navigate to="/" />
  if (employeeOnly && user.role !== 'admin' && user.role !== 'employee') return <Navigate to="/" />
  return children
}

function AppInner() {
  useEffect(() => {
    setToastFn((message, type) => toast(message, type))
    initGlobalErrorHandlers()
  }, [])
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/cart" element={<Navigate to="/menu" />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-status" element={<OrderStatus />} />
        <Route path="/login" element={<Login />} />
        <Route path="/employee" element={<ProtectedRoute employeeOnly><EmployeeHome /></ProtectedRoute>} />
        <Route path="/employee/order" element={<ProtectedRoute employeeOnly><EmployeeOrder /></ProtectedRoute>} />
        <Route path="/employee/table-detail" element={<ProtectedRoute employeeOnly><EmployeeTableDetail /></ProtectedRoute>} />
        <Route path="/employee/orders" element={<ProtectedRoute employeeOnly><EmployeeOrders /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<ProtectedRoute superAdminOnly><Users /></ProtectedRoute>} />
          <Route path="roles" element={<ProtectedRoute superAdminOnly><Roles /></ProtectedRoute>} />
          <Route path="translations" element={<ProtectedRoute superAdminOnly><Translations /></ProtectedRoute>} />
          <Route path="permissions" element={<ProtectedRoute superAdminOnly><Permissions /></ProtectedRoute>} />
          <Route path="platforms" element={<Platforms />} />
          <Route path="platform-reports" element={<PlatformReports />} />
          <Route path="delivery-product-stats" element={<ProtectedRoute adminOnly><DeliveryProductStats /></ProtectedRoute>} />
          <Route path="products" element={<ProtectedRoute adminOnly><Products /></ProtectedRoute>} />
          <Route path="combos" element={<ProtectedRoute adminOnly><Combos /></ProtectedRoute>} />
          <Route path="flavors" element={<ProtectedRoute adminOnly><Flavors /></ProtectedRoute>} />
          <Route path="order-statuses" element={<ProtectedRoute adminOnly><OrderStatuses /></ProtectedRoute>} />
          <Route path="tables" element={<ProtectedRoute adminOnly><Tables /></ProtectedRoute>} />
          <Route path="orders" element={<ProtectedRoute adminOnly><Orders /></ProtectedRoute>} />
          <Route path="stats/product" element={<ProtectedRoute adminOnly><ProductStats /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute adminOnly><Settings /></ProtectedRoute>} />
          <Route path="menus" element={<ProtectedRoute adminOnly><Menus /></ProtectedRoute>} />
          <Route path="forms" element={<ProtectedRoute adminOnly><Forms /></ProtectedRoute>} />
          <Route path="form/:id" element={<FormRenderer />} />
          <Route path="content" element={<ProtectedRoute adminOnly><Content /></ProtectedRoute>} />
          <Route path="inventory" element={<ProtectedRoute adminOnly><Inventory /></ProtectedRoute>} />
          <Route path="kds" element={<ProtectedRoute adminOnly><KDS /></ProtectedRoute>} />
          <Route path="members" element={<ProtectedRoute adminOnly><Members /></ProtectedRoute>} />
          <Route path="coupons" element={<ProtectedRoute adminOnly><Coupons /></ProtectedRoute>} />
          <Route path="queue" element={<ProtectedRoute adminOnly><Queue /></ProtectedRoute>} />
          <Route path="reports" element={<ProtectedRoute adminOnly><Reports /></ProtectedRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <ConfirmProvider>
        <ToastContainer />
        <ErrorDialogContainer />
        <ErrorBoundary><AppInner /></ErrorBoundary>
      </ConfirmProvider>
    </LanguageProvider>
  )
}