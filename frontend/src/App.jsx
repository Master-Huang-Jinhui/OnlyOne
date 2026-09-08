import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from './components/ui'
import { useAuth } from './context/AuthContext'

// 前台
import Home from './pages/customer/Home'
import Menu from './pages/customer/Menu'
import Cart from './pages/customer/Cart'
import Checkout from './pages/customer/Checkout'
import OrderStatus from './pages/customer/OrderStatus'

// 后台
import Login from './pages/admin/Login'
import AdminLayout from './pages/admin/Layout'
import Dashboard from './pages/admin/Dashboard'
import Users from './pages/admin/Users'
import Platforms from './pages/admin/Platforms'
import Products from './pages/admin/Products'
import Flavors from './pages/admin/Flavors'
import Tables from './pages/admin/Tables'
import Orders from './pages/admin/Orders'
import Settings from './pages/admin/Settings'
import Menus from './pages/admin/Menus'
import Forms from './pages/admin/Forms'
import FormRenderer from './pages/admin/FormRenderer'
import ProductStats from './pages/admin/ProductStats'
import Content from './pages/admin/Content'
import Permissions from './pages/admin/Permissions'

// 员工
import EmployeeHome from './pages/employee/EmployeeHome'
import EmployeeOrder from './pages/employee/EmployeeOrder'
import EmployeeOrders from './pages/employee/EmployeeOrders'

function ProtectedRoute({ children, adminOnly = false, superAdminOnly = false, employeeOnly = false }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">加载中...</div>
  if (!user) return <Navigate to="/login" />
  if (superAdminOnly && user.role !== 'admin') return <Navigate to="/" />
  if (adminOnly && user.role !== 'admin' && user.role !== 'manager') return <Navigate to="/" />
  if (employeeOnly && user.role !== 'admin' && user.role !== 'employee') return <Navigate to="/" />
  return children
}

export default function App() {
  return (
    <>
      <ToastContainer />
      <Routes>
        {/* 前台公开页面 */}
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/cart" element={<Navigate to="/menu" />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-status" element={<OrderStatus />} />

        {/* 登录 */}
        <Route path="/login" element={<Login />} />

        {/* 员工 */}
        <Route path="/employee" element={<ProtectedRoute employeeOnly><EmployeeHome /></ProtectedRoute>} />
        <Route path="/employee/order" element={<ProtectedRoute employeeOnly><EmployeeOrder /></ProtectedRoute>} />
        <Route path="/employee/orders" element={<ProtectedRoute employeeOnly><EmployeeOrders /></ProtectedRoute>} />

        {/* 后台 */}
        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<ProtectedRoute superAdminOnly><Users /></ProtectedRoute>} />
          <Route path="permissions" element={<ProtectedRoute superAdminOnly><Permissions /></ProtectedRoute>} />
          <Route path="platforms" element={<Platforms />} />
          <Route path="products" element={<ProtectedRoute adminOnly><Products /></ProtectedRoute>} />
          <Route path="flavors" element={<ProtectedRoute adminOnly><Flavors /></ProtectedRoute>} />
          <Route path="tables" element={<ProtectedRoute adminOnly><Tables /></ProtectedRoute>} />
          <Route path="orders" element={<ProtectedRoute adminOnly><Orders /></ProtectedRoute>} />
          <Route path="stats/product" element={<ProtectedRoute adminOnly><ProductStats /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute adminOnly><Settings /></ProtectedRoute>} />
          <Route path="menus" element={<ProtectedRoute adminOnly><Menus /></ProtectedRoute>} />
          <Route path="forms" element={<ProtectedRoute adminOnly><Forms /></ProtectedRoute>} />
          <Route path="form/:id" element={<FormRenderer />} />
          <Route path="content" element={<ProtectedRoute adminOnly><Content /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  )
}
