'use client'

export default function LoadingSpinner() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      flexDirection: 'column',
      gap: '1rem',
      background: 'var(--dashboard-bg-gradient)'
    }}>
      <div style={{
        width: '50px',
        height: '50px',
        border: '4px solid var(--dashboard-border)',
        borderTop: '4px solid var(--dashboard-accent)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <p style={{ color: 'var(--dashboard-text)', fontSize: '1.1rem', fontWeight: '600' }}>
        Loading Dashboard...
      </p>
    </div>
  )
}

