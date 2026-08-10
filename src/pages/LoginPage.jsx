import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext.jsx'
import Seo from '@/components/Seo.jsx'
import { Lock } from 'lucide-react'

const ADMIN_EMAIL = "rafat@citywalkrealestatellc.com"

export default function LoginPage() {
  const { user, role, signIn, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const from = location.state?.from || '/admin'

  // If already logged in as admin, redirect to admin dashboard
  useEffect(() => {
    if (user && role === 'admin') {
      navigate(from, { replace: true })
    }
    // If logged in as agent, redirect to agent dashboard
    if (user && role === 'agent') {
      navigate('/agent-dashboard', { replace: true })
    }
  }, [user, role, from, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) return
    setSubmitting(true)
    setError('')

    const { user: signedInUser, error: signInError } = await signIn(email, password)

    if (signInError) {
      setError(signInError.message || 'Invalid email or password.')
      setSubmitting(false)
      return
    }

    if (!signedInUser) {
      setError('Login failed. Please try again.')
      setSubmitting(false)
      return
    }

    // Route based on role/email
    if (email === ADMIN_EMAIL) {
      navigate('/admin', { replace: true })
    } else {
      navigate('/agent-dashboard', { replace: true })
    }
  }

  // If already authenticated, show redirect
  if (user && role === 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-white py-24 md:py-40 px-[4%] md:px-[2%]">
      <Seo
        title="Admin Login"
        description="Login to the admin dashboard to manage properties, agents, and leads."
        url="/login"
        noIndex
      />
      <div className="max-w-[480px] mx-auto">
        <div className="flex items-center justify-center mb-6">
          <Lock className="h-12 w-12 text-forest" />
        </div>
        <h1 className="font-display text-display-xl font-light text-center mb-4">
          Admin Login
        </h1>
        <p className="font-body text-center text-muted-foreground leading-relaxed mb-8 max-w-md mx-auto">
          Sign in to manage properties, agents, and customer leads.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-body text-xs tracking-label uppercase text-muted-foreground mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg font-body text-sm ${
                error ? 'border-destructive' : 'border-border'
              }`}
              placeholder="admin@citywalkrealestatellc.com"
            />
          </div>
          <div>
            <label className="block font-body text-xs tracking-label uppercase text-muted-foreground mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg font-body text-sm ${
                error ? 'border-destructive' : 'border-border'
              }`}
              placeholder="password"
            />
          </div>
          {error && (
            <p className="font-body text-sm text-destructive">{error}</p>
          )}
          <button
            type="submit"
            disabled={submitting || authLoading}
            className="w-full py-3 bg-forest text-white font-body text-xs tracking-label uppercase hover:bg-forest/90 transition-colors disabled:opacity-50"
          >
            {submitting || authLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
