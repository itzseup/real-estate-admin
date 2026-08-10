import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext.jsx'
import { ShieldCheck } from 'lucide-react'

/**
 * AdminRoute — protects routes that require admin role.
 * Redirects to /login if not authenticated or not an admin.
 */
export default function AdminRoute() {
  const { user, loading, isAdmin } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="font-body text-center py-24">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (!isAdmin()) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center py-24">
        <div className="text-center max-w-md px-4">
          <ShieldCheck size={48} className="mx-auto text-muted-foreground mb-6" />
          <h1 className="font-display text-2xl font-light mb-4">Admin Access Required</h1>
          <p className="font-body text-muted-foreground">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    )
  }

  return <Outlet />
}
