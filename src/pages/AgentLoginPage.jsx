import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { User } from 'lucide-react'
import Seo from '@/components/Seo.jsx'

/**
 * AgentLoginPage — standalone login at /agent-login.
 *
 * Agents log in with their email and password. The password is "Shahood@123"
 * for all agent accounts in demo mode. After login, redirect to /agent-dashboard.
 */
export default function AgentLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const from = location.state?.from || '/agent-dashboard'

  // If already logged in as agent, redirect to dashboard
  useEffect(() => {
    const savedEmail = localStorage.getItem('agent_session_email')
    if (savedEmail) {
      navigate(from, { replace: true })
    }
  }, [from, navigate])

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    // Demo mode: password 'Shahood@123' works for any agent email
    // In production, this uses Supabase auth
    if (password === 'Shahood@123' && email.includes('@')) {
      localStorage.setItem('agent_session_email', JSON.stringify(email))
      navigate(from, { replace: true })
      return
    }

    setError('Invalid email or password.')
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-white py-24 md:py-40 px-[4%] md:px-[2%]">
      <Seo
        title="Agent Login"
        description="Login to the agent dashboard to manage your assigned leads."
        url="/agent-login"
        noIndex
      />
      <div className="max-w-[480px] mx-auto">
        <div className="flex items-center justify-center mb-6">
          <User className="h-12 w-12 text-forest" />
        </div>
        <h1 className="font-display text-display-xl font-light text-center mb-4">
          Agent Login
        </h1>
        <p className="font-body text-center text-muted-foreground leading-relaxed mb-8 max-w-md mx-auto">
          Sign in to view your assigned leads and manage customer inquiries.
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
              placeholder="agent@citywalkrealestatellc.com"
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
            disabled={submitting}
            className="w-full py-3 bg-forest text-white font-body text-xs tracking-label uppercase hover:bg-forest/90 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
