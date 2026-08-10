import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext.jsx'
import { UserCheck } from 'lucide-react'

/**
 * AgentRoute — protects routes that require agent role.
 * Redirects to /agent-login if not authenticated, or to /login if admin.
 */
export default function AgentRoute() {
  const { user, loading, isAgent } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="font-body text-center py-24">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/agent-login" state={{ from: location.pathname }} replace />
  }

  if (!isAgent()) {
    // If they're an admin trying to access agent routes, send to admin
    return <Navigate to="/admin" replace />
  }

  return <Outlet />
}
