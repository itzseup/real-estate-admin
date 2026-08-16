import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/lib/AuthContext.jsx'
import ProtectedRoute from '@/components/ProtectedRoute'
import LoginPage from '@/pages/LoginPage.jsx'
import AgentLoginPage from '@/pages/AgentLoginPage.jsx'
import AdminDashboard from '@/pages/admin/Dashboard.jsx'
import AgentDashboardPage from '@/pages/AgentDashboardPage.jsx'

/** Fallback 404 page (inline — no separate file) */
function PageNotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center py-24">
      <div className="text-center">
        <h1 className="font-display text-display-xl font-light mb-4">404</h1>
        <p className="font-body text-muted-foreground">Page not found</p>
      </div>
    </div>
  )
}

function App() {
  return (
    <HelmetProvider>
      <Router>
        <AuthProvider>
          <Routes>
            {/* Root redirects to login */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Public login pages */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/agent-login" element={<AgentLoginPage />} />

            {/* Admin dashboard — PROTECTED: requires admin role */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Agent dashboard — PROTECTED: requires agent or admin role */}
            <Route
              path="/agent-dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin', 'agent']}>
                  <AgentDashboardPage />
                </ProtectedRoute>
              }
            />

            {/* Catch-all 404 */}
            <Route path="*" element={<PageNotFound />} />
          </Routes>
          <Toaster />
        </AuthProvider>
      </Router>
    </HelmetProvider>
  )
}

export default App
