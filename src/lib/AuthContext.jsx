import React, { createContext, useContext, useEffect, useState } from 'react'
import { authClient, isConvexConfigured } from '@/api/supabaseClient.js'

const AuthContext = createContext()

// Storage key for the session token
const TOKEN_KEY = 'convex_auth_token'

function loadToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function saveToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(loadToken())

  // Restore session on mount via Convex session token validation
  useEffect(() => {
    const restoreSession = async () => {
      if (isConvexConfigured() && token) {
        try {
          const result = await authClient.getCurrentUser(token)
          if (result) {
            setUser(result)
            setRole(result.role ?? 'agent')
          } else {
            // Token is invalid or expired — clear it
            saveToken(null)
            setToken(null)
          }
        } catch (error) {
          console.error('Session restore error:', error)
          saveToken(null)
          setToken(null)
        }
      } else if (!token) {
        // No token — check localStorage demo credentials as last resort
        const demoAgent = localStorage.getItem('demo_agent_credentials')
        if (demoAgent) {
          // Legacy support: if user previously logged in via demo mode
          const session = JSON.parse(demoAgent)
          if (session && session.email) {
            setUser({ email: session.email })
            setRole('agent')
          }
        }
      }

      setLoading(false)
    }

    restoreSession()
  }, [token])

  // ---- signIn ----
  const signIn = async (email, password) => {
    // Convex auth — real auth path
    if (isConvexConfigured()) {
      try {
        const result = await authClient.signIn(email, password)
        saveToken(result.token)
        setToken(result.token)
        setUser(result.user)
        setRole(result.role)
        return { user: result.user, role: result.role, error: null }
      } catch (error) {
        return { user: null, error }
      }
    }

    // Demo mode fallback — only for development without Convex configured
    const ADMIN_EMAIL = 'rafat@citywalkrealestatellc.com'
    const AGENT_EMAIL_DOMAIN = '@citywalkrealestatellc.com'
    const DEMO_PASSWORD = 'Shahood@123'

    if (email === ADMIN_EMAIL && password === DEMO_PASSWORD) {
      const session = { email, loginAt: new Date().toISOString() }
      localStorage.setItem('demo_admin_session', JSON.stringify(session))
      setUser(session)
      setRole('admin')
      return { user: session, role: 'admin', error: null }
    }

    if (password === DEMO_PASSWORD && email.endsWith(AGENT_EMAIL_DOMAIN)) {
      localStorage.removeItem('demo_admin_session')
      localStorage.setItem('agent_session_email', JSON.stringify(email))
      setUser({ email })
      setRole('agent')
      return { user: { email }, role: 'agent', error: null }
    }

    return { user: null, error: new Error('Invalid email or password.') }
  }

  // ---- signUp ----
  const signUp = async (name, email, password, role = 'agent') => {
    // Convex auth — real auth path
    if (isConvexConfigured()) {
      try {
        const result = await authClient.signUp(name, email, password, role)
        saveToken(result.token)
        setToken(result.token)
        setUser(result.user)
        setRole(result.role)
        return { user: result.user, role: result.role, error: null }
      } catch (error) {
        return { user: null, error }
      }
    }

    // Demo mode fallback
    const demoCredentials = JSON.parse(
      localStorage.getItem('demo_agent_credentials') || '[]',
    )
    const existing = demoCredentials.find((c) => c.email === email)
    if (existing) {
      Object.assign(existing, { name, password, role })
    } else {
      demoCredentials.push({ name, email, password, role })
    }
    localStorage.setItem('demo_agent_credentials', JSON.stringify(demoCredentials))
    return { user: { name, email, role }, error: null }
  }

  // ---- signOut ----
  const signOut = async () => {
    localStorage.removeItem('demo_admin_session')
    localStorage.removeItem('agent_session_email')
    localStorage.removeItem('demo_agent_credentials')

    if (isConvexConfigured() && token) {
      try {
        await authClient.signOut(token)
      } catch (error) {
        console.error('Sign out error:', error)
      }
    }

    saveToken(null)
    setToken(null)
    setUser(null)
    setRole(null)
  }

  // ---- createAgentAuth (admin creates agent accounts) ----
  const createAgentAuth = async (email, password) => {
    const name = email.split('@')[0]

    if (isConvexConfigured()) {
      try {
        return await authClient.signUp(name, email, password, 'agent')
      } catch (error) {
        console.error('Agent creation error:', error)
        return { user: null, error }
      }
    }

    // Demo mode fallback
    const demoCredentials = JSON.parse(
      localStorage.getItem('demo_agent_credentials') || '[]',
    )
    const existing = demoCredentials.find((c) => c.email === email)
    if (existing) {
      Object.assign(existing, { name, password, role: 'agent' })
    } else {
      demoCredentials.push({ name, email, password, role: 'agent' })
    }
    localStorage.setItem('demo_agent_credentials', JSON.stringify(demoCredentials))
    return { user: { name, email, role: 'agent' }, error: null }
  }

  const value = {
    user,
    role,
    loading,
    token,
    signIn,
    signUp,
    signOut,
    createAgentAuth,
    isAdmin: () => role === 'admin',
    isAgent: () => role === 'agent',
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
