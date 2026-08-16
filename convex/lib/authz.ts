import { ConvexError } from 'convex/values'
import type { Doc } from '../_generated/dataModel'

/**
 * Centralised role-based access control helpers for the admin dashboard.
 *
 * `requireRole` is intentionally a *pure* function — it does no database I/O,
 * it only inspects a user document that the caller has already resolved from
 * the session token (via `internal.auth.findSessionUser`). Doing the db read
 * inside the caller and the permission check here keeps every protected query
 * mutation identical in shape:
 *
 *   const user = await ctx.runQuery(internal.auth.findSessionUser, { token })
 *   requireRole(user, 'admin')   // throws ConvexError if insufficient
 *   ...
 *
 * Roles form a lattice: admin > agent > customer. `requireAgent` therefore
 * admits both admins and agents, but never customers — that is how the
 * "manage own listings" boundary is enforced at the data layer rather than
 * only in the UI.
 */
export type Role = 'admin' | 'agent' | 'customer'

export function roleOf(user: { role?: Role } | null | undefined): Role {
  return user?.role ?? 'customer'
}

/**
 * Assert that `user` carries one of `allowed`. Returns the user doc on success
 * so callers can chain: `const user = requireRole(resolved, 'admin')`.
 * Throws `ConvexError('Not authenticated.')` when user is null (missing/invalid
 * token) and `ConvexError('Forbidden: ...')` when the role is insufficient.
 */
export function requireRole(
  user: Doc<'users'> | null | undefined,
  allowed: Role | Role[],
): Doc<'users'> {
  const allow = (Array.isArray(allowed) ? allowed : [allowed]) as Role[]

  if (!user) {
    throw new ConvexError('Not authenticated.')
  }

  const userRole = roleOf(user)
  if (!allow.includes(userRole)) {
    throw new ConvexError(
      `Forbidden: requires ${allow.join(' or ')} role, got ${userRole}.`,
    )
  }

  return user
}

// Convenience aliases — the most common permission checks across the backend.
export const requireAdmin = (
  user: Doc<'users'> | null | undefined,
): Doc<'users'> => requireRole(user, 'admin')

export const requireAgent = (
  user: Doc<'users'> | null | undefined,
): Doc<'users'> => requireRole(user, ['admin', 'agent'])

export const requireCustomer = (
  user: Doc<'users'> | null | undefined,
): Doc<'users'> =>
  requireRole(user, ['admin', 'agent', 'customer'])
