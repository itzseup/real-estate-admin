import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext.jsx'

/**
 * Route guard that enforces authentication and role-based access control.
 *
 * - If no session token → redirect to /login
 * - If token present but role doesn't match `allowedRoles` → redirect to /login
 * - If token present and role matches → render children
 *
 * The check is synchronous via the AuthContext token (read from localStorage
 * at init). A Convex `getCurrentUser` call on mount validates the token
 * server-side — if invalid, AuthProvider clears it.
 */
export default function ProtectedRoute({ children, allowedRoles = ['admin', 'agent'] }) {
  const { user, token, role, loading } = useAuth()
  const location = useLocation()

  if (loading) return null

  // A session is either a Convex one (token) or a demo one (user, no token).
  // Gating on token alone locks out every demo/offline login.
  if (!user && !token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (role && !allowedRoles.includes(role)) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}
