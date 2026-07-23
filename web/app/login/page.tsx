'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { login, checkAuthStatus } from '@/lib/api'

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkAuthStatus().then((status) => {
      if (status.authenticated) {
        router.push('/')
      }
    })

    const urlError = searchParams.get('error')
    if (urlError) {
      setError(decodeURIComponent(urlError))
    }
  }, [router, searchParams])

  const handleLogin = async () => {
    setLoading(true)
    setError(null)

    try {
      const authUrl = await login()
      window.location.href = authUrl
    } catch (err: any) {
      setError(err.message || 'Failed to initiate login')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--dashboard-bg-gradient)',
      padding: '2rem'
    }}>
      <div className="dashboard-card" style={{
        padding: '3rem',
        maxWidth: '420px',
        width: '100%'
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          marginBottom: '0.5rem',
          color: 'var(--dashboard-text)'
        }}>
          Jira Velocity Dashboard
        </h1>
        <p style={{
          color: 'var(--dashboard-muted)',
          marginBottom: '2rem'
        }}>
          Sign in with your Atlassian account to access velocity metrics
        </p>

        {error && (
          <div className="dashboard-alert-soft" style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            borderRadius: '12px'
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="btn-dashboard-primary"
          style={{
            width: '100%',
            padding: '1rem',
            borderRadius: '12px',
            fontSize: '1.1rem',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Redirecting...' : 'Login with Atlassian'}
        </button>

        <p style={{
          marginTop: '2rem',
          fontSize: '0.9rem',
          color: 'var(--dashboard-muted)',
          textAlign: 'center'
        }}>
          You&apos;ll be redirected to Atlassian to sign in securely
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  )
}
