import { createClient } from '@supabase/supabase-js'
import { ConvexHttpClient } from 'convex/browser'
import { anyApi } from 'convex/server'

const api = anyApi

// ---------------------------------------------------------------------------
// Convex — the data layer (properties, agents, inquiries, blog posts, ...)
// ---------------------------------------------------------------------------
// ConvexHttpClient is used instead of ConvexReactClient because the data layer
// (base44Client.js) is a plain promise API called outside React components.
// The URL is written to .env.local by `npx convex dev`.

const convexUrl = import.meta.env.VITE_CONVEX_URL || ''

let convexClient = null
if (convexUrl) {
  convexClient = new ConvexHttpClient(convexUrl)
} else {
  console.warn('VITE_CONVEX_URL not set — Convex disabled, using localStorage fallback')
}

// Alias kept because the migration task refers to this name.
const convexHttpClient = convexClient

export function isConvexConfigured() {
  return !!convexClient
}

// ---------------------------------------------------------------------------
// Supabase — auth only
// ---------------------------------------------------------------------------
// Table reads/writes have moved to Convex, but sign-in/sign-out still runs
// through Supabase Auth (see src/lib/AuthContext.jsx), so the auth client stays.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
// Service role key is server-only — safe to read here because Vite strips
// non-VITE_ prefixed vars from the browser bundle.
const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || ''

let supabase
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
} else {
  // Mock auth client for development without Supabase. AuthContext falls back
  // to its demo/localStorage sessions when Supabase env vars are absent.
  supabase = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signInWithPassword: async () => ({ data: { user: null }, error: null }),
      signUp: async () => ({ error: null }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  }
}

// Admin client (service_role key) — only used by createAgentAuth.
let supabaseAdmin = null
if (supabaseUrl && supabaseServiceRoleKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

// ---------------------------------------------------------------------------
// Convex auth client — thin wrapper around convexClient for sign-in/out.
// ---------------------------------------------------------------------------
const authClient = {
  /** Sign in / up → returns { token, role, user } */
  signIn: async (email, password) => {
    if (!convexClient) throw new Error('Convex not configured')
    return await convexClient.mutation(api.auth.signIn, { email, password })
  },
  signUp: async (name, email, password, role) => {
    if (!convexClient) throw new Error('Convex not configured')
    return await convexClient.mutation(api.auth.signUp, { name, email, password, role })
  },
  signOut: async (token) => {
    if (!convexClient) return true
    try {
      return await convexClient.mutation(api.auth.signOut, { token })
    } catch {
      return true
    }
  },
  getCurrentUser: async (token) => {
    if (!convexClient) return null
    try {
      return await convexClient.query(api.auth.getCurrentUser, { token })
    } catch {
      return null
    }
  },
}

export { convexClient, convexHttpClient, supabase, supabaseAdmin, authClient }
