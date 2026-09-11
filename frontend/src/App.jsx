import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from './components/ui'
import { ConfirmProvider } from './components/ConfirmDialog'
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
import OrderStatuses from './pages/admin/OrderStatuses'
import Tables from './pages/admin/Tables'
import Orders from './pages/admin/Orders'
import Settings from './pages/admin/Settings'
import Menus from './pages/admin/Menus'
import Forms from './pages/admin/Forms'
import FormRenderer from './pages/admin/FormRenderer'
import ProductStats from './pages/admin/ProductStats'
import Content from './pages/admin/Content'
import Permissions from './pages/admin/Permissions'
import Roles from './pages/admin/Roles'
import Inventory from './pages/admin/Inventory'
import KDS from './pages/admin/KDS'
import Members from './pages/admin/Members'
import Coupons from './pages/admin/Coupons'
import Queue from './pages/admin/Queue'
import Reports from './pages/admin/Reports'

// 员工
import EmployeeHome from './pages/employee/EmployeeHome'
import EmployeeOrder from './pages/employee/EmployeeOrder'
import EmployeeOrders from './pages/employee/EmployeeOrders'
import EmployeeTableDetail from './pages/employee/EmployeeTableDetail'

function ProtectedRoute({ children, adminOnly = false, superAdminOnly = false, employeeOnly = false }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">加载中...</div>
  if (!user) return <Navigate to="/login" />
  // superAdminOnly：只有超级管理员能访问（用户管理、权限管理）
  if (superAdminOnly && user.role !== 'admin') return <Navigate to="/" />
  // adminOnly：超级管理员和管理员都能访问后台大部分页面
  if (adminOnly && user.role !== 'admin' && user.role !== 'manager') return <Navigate to="/" />
  if (employeeOnly && user.role !== 'admin' && user.role !== 'employee') return <Navigate to="/" />
  return children
}

export default function App() {
  return (
    <ConfirmProvider>
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
        <Route path="/employee/table-detail" element={<ProtectedRoute employeeOnly><EmployeeTableDetail /></ProtectedRoute>} />
        <Route path="/employee/orders" element={<ProtectedRoute employeeOnly><EmployeeOrders /></ProtectedRoute>} />

        {/* 后台 */}
        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<ProtectedRoute superAdminOnly><Users /></ProtectedRoute>} />
          <Route path="roles" element={<ProtectedRoute superAdminOnly><Roles /></ProtectedRoute>} />
          <Route path="permissions" element={<ProtectedRoute superAdminOnly><Permissions /></ProtectedRoute>} />
          <Route path="platforms" element={<Platforms />} />
          <Route path="products" element={<ProtectedRoute adminOnly><Products /></ProtectedRoute>} />
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
    </ConfirmProvider>
  )
}
