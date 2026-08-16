import { ConvexError, v } from 'convex/values'
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server'
import { internal } from './_generated/api'
import { hashPassword, verifyPassword } from './lib/password'

/**
 * Email/password auth for the admin dashboard.
 *
 * `signUp` and `signIn` are **actions**, not mutations: bcrypt salt generation
 * and CSRF-style token randomness both read `crypto.getRandomValues`, which
 * Convex exposes in the action runtime only. Each action reads/writes the
 * database through the internal query/mutation pair below so the sensitive
 * `password_hash` never reaches a public function's arg schema.
 *
 * Errors are thrown as ConvexError so the message survives to the browser; a
 * plain Error is redacted to "Server Error" in a production deployment.
 */

// Roles this backend recognises. Matches convex/schema.ts.
export type Role = 'admin' | 'agent' | 'customer'

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

/** Lowercase + trim so lookup matches regardless of how the user typed it. */
function normalizeEmail(email: string): string {
  return String(email ?? '').trim().toLowerCase()
}

/** 64 hex chars from the action runtime's CSPRNG. */
function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** The user shape the client is allowed to see — never the password hash. */
function publicUser(doc: any) {
  if (!doc) return null
  return {
    id: doc._id as string,
    _id: doc._id as string,
    name: doc.name as string,
    email: doc.email as string,
    role: (doc.role ?? 'agent') as Role,
    agent_id: doc.agent_id as string | null,
  }
}

// ---------------------------------------------------------------------------
// Internal helpers — database access for the actions below. Not callable from
// the browser, so they may read the password hash.
// ---------------------------------------------------------------------------

export const findUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('by_email', (q: any) => q.eq('email', args.email))
      .unique()
  },
})

export const insertUser = internalMutation({
  args: {
    name: v.string(),
    email: v.string(),
    password_hash: v.string(),
    role: v.optional(v.union(v.literal('admin'), v.literal('agent'), v.literal('customer'))),
    agent_id: v.optional(v.id('agents')),
  },
  handler: async (ctx, args) => {
    // Re-check inside the mutation: the action's earlier lookup and this write
    // are separate transactions, so a concurrent signUp could slip between them.
    const existing = await ctx.db
      .query('users')
      .withIndex('by_email', (q: any) => q.eq('email', args.email))
      .unique()
    if (existing) {
      throw new ConvexError('An account with that email already exists.')
    }

    const now = Date.now()
    const id = await ctx.db.insert('users', {
      name: args.name,
      email: args.email,
      password_hash: args.password_hash,
      role: args.role ?? 'agent',
      agent_id: args.agent_id,
      created_at: now,
      updated_at: now,
    } as any)

    return publicUser(await ctx.db.get(id))
  },
})

export const insertSession = internalMutation({
  args: { token: v.string(), user_id: v.id('users') },
  handler: async (ctx, args) => {
    const now = Date.now()
    await ctx.db.insert('sessions', {
      token: args.token,
      user_id: args.user_id,
      expires_at: now + SESSION_TTL_MS,
      created_at: now,
    } as any)
    return args.token
  },
})

export const deleteSession = internalMutation({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.token) return true
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q: any) => q.eq('token', args.token as string))
      .unique()
    if (session) await ctx.db.delete(session._id)
    return true
  },
})

// ---------------------------------------------------------------------------
// Public API — consumed by src/api/supabaseClient.js (`authClient`).
// ---------------------------------------------------------------------------

/**
 * Resolve a session token to its user. Returns null for an unknown, revoked,
 * or expired token — the caller treats all three as "signed out".
 */
export const getCurrentUser = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.token) return null

    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q: any) => q.eq('token', args.token as string))
      .unique()

    // A query cannot delete the stale row; signOut and expiry sweeps handle it.
    if (!session || session.expires_at < Date.now()) return null

    return publicUser(await ctx.db.get(session.user_id))
  },
})

/** Resolve a session token to the full user document (incl. password_hash). */
export const findSessionUser = internalQuery({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.token) return null
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q: any) => q.eq('token', args.token as string))
      .unique()
    if (!session || session.expires_at < Date.now()) return null
    return await ctx.db.get(session.user_id)
  },
})

/**
 * Create an account and sign it in.
 *
 * Self-service sign-up may only create `agent` or `customer` accounts. The
 * `admin` role is reserved for bootstrapping — it is rejected here unless no
 * admin account exists yet, which prevents privilege escalation: an attacker
 * cannot create a second admin once one exists.
 *
 * @returns { token, role, user }
 */
export const signUp = action({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    role: v.optional(
      v.union(v.literal('admin'), v.literal('agent'), v.literal('customer')),
    ),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email)
    const name = String(args.name ?? '').trim()
    const role = args.role ?? 'customer'

    if (!name) throw new ConvexError('Name is required.')
    if (!email.includes('@')) throw new ConvexError('A valid email is required.')

    // RBAC guard: only bootstrap the first admin through self-sign-up.
    if (role === 'admin') {
      const adminCount = await ctx.runQuery(internal.auth.countAdmins)
      if (adminCount > 0) {
        throw new ConvexError('An admin account already exists.')
      }
    }

    const existing = await ctx.runQuery(internal.auth.findUserByEmail, { email })
    if (existing) {
      throw new ConvexError('An account with that email already exists.')
    }

    const password_hash = await hashPassword(args.password)
    const user = await ctx.runMutation(internal.auth.insertUser, {
      name,
      email,
      password_hash,
      role,
    })

    const token = generateToken()
    await ctx.runMutation(internal.auth.insertSession, {
      token,
      user_id: user.id,
    })

    return { token, role: user.role, user }
  },
})

/**
 * Verify credentials and issue a session token.
 *
 * @returns { token, role, user }
 */
export const signIn = action({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email)
    // One message for "no such user" and "wrong password" alike, so the
    // response cannot be used to enumerate registered emails.
    const invalid = new ConvexError('Invalid email or password.')

    const user = await ctx.runQuery(internal.auth.findUserByEmail, { email })
    if (!user?.password_hash) throw invalid

    const matches = await verifyPassword(args.password, user.password_hash)
    if (!matches) throw invalid

    const token = generateToken()
    await ctx.runMutation(internal.auth.insertSession, {
      token,
      user_id: user._id,
    })

    return { token, role: user.role ?? 'agent', user: publicUser(user) }
  },
})

/**
 * Revoke a session token. Idempotent — an unknown token is a no-op, so a
 * client holding a stale token can still sign out cleanly.
 */
export const signOut = mutation({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.token) return true
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q: any) => q.eq('token', args.token as string))
      .unique()
    if (session) await ctx.db.delete(session._id)
    return true
  },
})

/** Count how many admin accounts exist (used to gate first-admin bootstrap). */
export const countAdmins = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('users')
      .withIndex('by_role', (q: any) => q.eq('role', 'admin'))
      .collect().then((rows) => rows.length)
  },
})

/** List user accounts (admin only). */
export const listUsers = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const caller = await ctx.runQuery(internal.auth.findSessionUser, {
      token: args.token,
    })
    if (caller?.role !== 'admin') {
      throw new ConvexError('Unauthorized: admins only.')
    }
    const users = await ctx.db.query('users').order('desc').take(200)
    return users.map(publicUser)
  },
})

/** Update a user's role (admin only). */
export const updateUserRole = mutation({
  args: {
    token: v.string(),
    user_id: v.string(),
    role: v.union(v.literal('admin'), v.literal('agent'), v.literal('customer')),
  },
  handler: async (ctx, args) => {
    const caller = await ctx.runQuery(internal.auth.findSessionUser, {
      token: args.token,
    })
    if (caller?.role !== 'admin') {
      throw new ConvexError('Unauthorized: admins only.')
    }
    const userId = ctx.db.normalizeId('users', args.user_id)
    if (!userId) throw new ConvexError('Invalid user id.')
    await ctx.db.patch(userId, { role: args.role, updated_at: Date.now() })
    return true
  },
})
