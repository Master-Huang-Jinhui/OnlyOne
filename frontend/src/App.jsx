import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from './components/ui'
import { useAuth } from './context/AuthContext'

import Home from './pages/customer/Home'
import Menu from './pages/customer/Menu'
import Cart from './pages/customer/Cart'
import Checkout from './pages/customer/Checkout'

import Login from './pages/admin/Login'
import AdminLayout from './pages/admin/Layout'
import Dashboard from './pages/admin/Dashboard'
import Users from './pages/admin/Users'
import Platforms from './pages/admin/Platforms'
import Products from './pages/admin/Products'
import Flavors from './pages/admin/Flavors'
import Orders from './pages/admin/Orders'
import Settings from './pages/admin/Settings'
import Menus from './pages/admin/Menus'
import Forms from './pages/admin/Forms'
import FormRenderer from './pages/admin/FormRenderer'
import Content from './pages/admin/Content'
import Permissions from './pages/admin/Permissions'

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">加载中...</div>
  if (!user) return <Navigate to="/login" />
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" />
  return children
}

export default function App() {
  return (
    <>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<ProtectedRoute adminOnly><Users /></ProtectedRoute>} />
          <Route path="permissions" element={<ProtectedRoute adminOnly><Permissions /></ProtectedRoute>} />
          <Route path="platforms" element={<Platforms />} />
          <Route path="products" element={<ProtectedRoute adminOnly><Products /></ProtectedRoute>} />
          <Route path="flavors" element={<ProtectedRoute adminOnly><Flavors /></ProtectedRoute>} />
          <Route path="orders" element={<ProtectedRoute adminOnly><Orders /></ProtectedRoute>} />
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
