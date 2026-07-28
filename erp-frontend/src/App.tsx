import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { WorkOrders } from './pages/WorkOrders'
import { Employees } from './pages/Employees'
import { Equipment } from './pages/Equipment'
import { Projects } from './pages/Projects'
import { Clients } from './pages/Clients'

// Protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <div className="login-container">Loading...</div>
  if (!user) return <Navigate to="/login" />
  return <>{children}</>
}

// Layout with navigation
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { signOut } = useAuth()
  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      <nav style={{ background: '#fff', padding: '1rem 2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <Link to="/dashboard" style={{ fontWeight: 'bold', textDecoration: 'none', color: '#1f2937' }}>Dashboard</Link>
        <Link to="/employees" style={{ textDecoration: 'none', color: '#4b5563' }}>Employees</Link>
        <Link to="/clients" style={{ textDecoration: 'none', color: '#4b5563' }}>Clients</Link>
        <Link to="/projects" style={{ textDecoration: 'none', color: '#4b5563' }}>Projects</Link>
        <Link to="/equipment" style={{ textDecoration: 'none', color: '#4b5563' }}>Equipment</Link>
        <Link to="/work-orders" style={{ textDecoration: 'none', color: '#4b5563' }}>Work Orders</Link>
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={signOut} style={{ padding: '0.25rem 0.75rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Sign Out</button>
        </div>
      </nav>
      <div style={{ padding: '2rem' }}>
        {children}
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees"
            element={
              <ProtectedRoute>
                <Layout>
                  <Employees />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients"
            element={
              <ProtectedRoute>
                <Layout>
                  <Clients />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <Layout>
                  <Projects />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/equipment"
            element={
              <ProtectedRoute>
                <Layout>
                  <Equipment />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/work-orders"
            element={
              <ProtectedRoute>
                <Layout>
                  <WorkOrders />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App