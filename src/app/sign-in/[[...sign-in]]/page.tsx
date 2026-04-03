import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--md-background)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--md-on-surface)', margin: '0 0 6px' }}>
          Adaptive Market
        </h1>
        <p style={{ fontSize: 14, color: 'var(--md-on-surface-variant)', margin: 0 }}>
          Institutional TA · DCF Valuation · AI Reports
        </p>
      </div>
      <SignIn />
    </div>
  )
}
