import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, supabaseAdmin } from '@/api/supabaseClient.js'

const AuthContext = createContext()

// Demo admin credentials — works without Supabase configured
const ADMIN_EMAIL = "rafat@citywalkrealestatellc.com"
const ADMIN_PASSWORD = "Shahood@123"

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for demo admin session in localStorage
    const demoAdminSession = localStorage.getItem('demo_admin_session')
    if (demoAdminSession) {
      const session = JSON.parse(demoAdminSession)
      setUser({ email: session.email })
      setRole('admin')
      setLoading(false)
      return
    }

    // Check for demo agent session in localStorage
    const agentSession = localStorage.getItem('agent_session_email')
    if (agentSession) {
      const agentEmail = JSON.parse(agentSession)
      setUser({ email: agentEmail })
      setRole('agent')
      setLoading(false)
      return
    }

    // Only check Supabase auth if properly configured
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      setLoading(false)
      return
    }

    // Check current Supabase session
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
          setRole(session.user.user_metadata?.role || 'agent')
        }
      } catch (error) {
        console.error('Auth error:', error)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setUser(session.user)
          setRole(session.user.user_metadata?.role || 'agent')
        } else {
          setUser(null)
          setRole(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const supabaseConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY

    // Demo login fallback for admin
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const session = { email, loginAt: new Date().toISOString() }
      localStorage.setItem('demo_admin_session', JSON.stringify(session))
      setUser({ email })
      setRole('admin')
      return { user: { email }, role: 'admin' }
    }

    // Demo login fallback for agents (password: Shahood@123)
    if (password === ADMIN_PASSWORD) {
      const session = JSON.stringify(email)
      localStorage.setItem('agent_session_email', session)
      setUser({ email })
      setRole('agent')
      return { user: { email }, role: 'agent' }
    }

    if (!supabaseConfigured) {
      return { user: null, error: new Error('Invalid email or password. Supabase is not configured for fallback auth.') }
    }

    try {
      const { data: { user: supabaseUser }, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { user: null, error }

      const userRole = supabaseUser?.user_metadata?.role || (email === ADMIN_EMAIL ? 'admin' : 'agent')
      const session = JSON.parse(localStorage.getItem('agent_session_email') || 'null')

      if (userRole === 'admin') {
        localStorage.setItem('demo_admin_session', JSON.stringify({ email: supabaseUser.email, loginAt: new Date().toISOString() }))
      } else {
        localStorage.setItem('agent_session_email', JSON.stringify(supabaseUser.email))
      }

      setUser(supabaseUser)
      setRole(userRole)
      return { user: supabaseUser, role: userRole }
    } catch (error) {
      console.error('Sign in error:', error)
      return { user: null, error }
    }
  }

  const signOut = async () => {
    localStorage.removeItem('demo_admin_session')
    localStorage.removeItem('agent_session_email')

    const supabaseConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
    if (supabaseConfigured) {
      try {
        await supabase.auth.signOut()
      } catch (error) {
        console.error('Sign out error:', error)
      }
    }

    setUser(null)
    setRole(null)
  }

  const createAgentAuth = async (email, password) => {
    // Try Supabase Admin API first
    if (supabaseAdmin) {
      try {
        const { data: { user: adminUser }, error } = await supabaseAdmin.auth.adminCreateUser({
          email,
          password,
          user_metadata: { role: 'agent' },
        })
        if (error) throw error
        return { user: adminUser, error: null }
      } catch (error) {
        console.error('Admin user creation error:', error)
        // Fallback to demo mode
      }
    }

    // Demo mode: store credentials in localStorage
    const demoCredentials = JSON.parse(localStorage.getItem('demo_agent_credentials') || '[]')
    const existing = demoCredentials.find(c => c.email === email)
    if (existing) {
      Object.assign(existing, { email, password })
    } else {
      demoCredentials.push({ email, password })
    }
    localStorage.setItem('demo_agent_credentials', JSON.stringify(demoCredentials))
    return { user: { email, password }, error: null }
  }

  const value = {
    user,
    role,
    loading,
    signIn,
    signOut,
    isAdmin: () => role === 'admin',
    isAgent: () => role === 'agent',
    createAgentAuth,
  }

  if (loading) {
    return <div className="font-body text-center py-24">Loading...</div>
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
