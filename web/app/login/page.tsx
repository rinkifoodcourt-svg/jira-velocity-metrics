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
      background: 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)',
      padding: '2rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '3rem',
        boxShadow: '0 20px 60px rgba(37, 99, 235, 0.18)',
        maxWidth: '400px',
        width: '100%'
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          marginBottom: '0.5rem',
          color: '#111827'
        }}>
          Jira Velocity Dashboard
        </h1>
        <p style={{
          color: '#4B5563',
          marginBottom: '2rem'
        }}>
          Sign in with your Atlassian account to access velocity metrics
        </p>

        {error && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            color: '#B91C1C'
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '1rem',
            background: loading ? '#DBEAFE' : 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          {loading ? 'Redirecting...' : 'Login with Atlassian'}
        </button>

        <p style={{
          marginTop: '2rem',
          fontSize: '0.9rem',
          color: '#6B7280',
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
