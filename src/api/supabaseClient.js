import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
// Service role key is server-only — safe to read here because this client is
// never shipped to the browser (import.meta.env vars prefixed VITE_ are, but
// the non-prefixed SUPABASE_* ones are stripped by Vite).
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || import.meta.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Primary anon client (safe for browser use)
let supabase
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
} else {
  // Mock client for development without Supabase
  const mockResponse = { data: null, error: null }
  const mockQuery = {
    select: () => mockQuery,
    order: () => mockQuery,
    limit: () => Promise.resolve({ data: [], error: null }),
    eq: () => mockQuery,
    single: () => Promise.resolve({ data: null, error: null }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => Promise.resolve({ data: null, error: null }),
    delete: () => Promise.resolve({ error: null }),
    count: () => Promise.resolve({ count: 0, error: null }),
    head: true,
  }

  supabase = {
    from: () => mockQuery,
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signInWithPassword: async () => ({ error: null }),
      signUp: async () => ({ error: null }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  }
}

// Admin / server-side client (uses the service_role key)
// Only initialize when a service role key is present.
let supabaseAdmin = null
if (supabaseUrl && supabaseServiceRoleKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export { supabase, supabaseAdmin }
