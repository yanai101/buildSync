import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth } from 'convex/react'
import { Btn, Input, Icon } from '~/components/Shared'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const { signIn } = useAuthActions()
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) return
    window.location.replace('/')
  }, [isAuthenticated, isAuthLoading, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.password) return
    setError(null)
    setLoading(true)
    try {
      await signIn('password', {
        flow: 'signIn',
        email: form.email,
        password: form.password,
      })
      window.location.assign('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ההתחברות נכשלה. נסה שוב.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError(null)
    try {
      await signIn('google')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהתחברות Google')
    }
  }

  return (
    <div style={{ flex: 1, width: '100%', height: '100vh', overflowY: 'auto', display: 'flex', background: 'var(--bg)', fontFamily: "'Heebo', sans-serif" }}>
      <div style={{ flex: 1, background: 'linear-gradient(135deg, var(--text1), #1a1a24)', display: 'flex', flexDirection: 'column', padding: '60px', color: '#fff', position: 'relative', overflow: 'hidden' }} className="hidden-mobile">
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div className="sidebar-logo" style={{ marginBottom: 60, alignSelf: 'flex-start' }}>
            <div className="sidebar-logo-mark" style={{ background: 'var(--accent)', color: '#fff' }}>B</div>
            <div><div className="sidebar-logo-text" style={{fontSize: 28, color: '#fff'}}>Build<span style={{ color: 'var(--accent)'}}>Pro</span></div></div>
          </div>

          <h2 style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1.1, marginBottom: 24, letterSpacing: '-0.02em', maxWidth: 400 }}>
            חזרה למרכז השליטה של הפרויקט.
          </h2>
          <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, maxWidth: 440 }}>
            התחברו כדי להמשיך לנהל תקציב, שלבים, קבלנים ותיעוד שוטף מתוך סביבת עבודה אחת.
          </p>
        </div>

        <div style={{ position: 'absolute', bottom: -50, right: -50, width: 400, height: 400, background: 'var(--accent)', filter: 'blur(150px)', opacity: 0.15, zIndex: 1 }} />
        <div style={{ position: 'absolute', top: 100, left: -50, width: 300, height: 300, background: 'var(--success)', filter: 'blur(150px)', opacity: 0.1, zIndex: 1 }} />
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', background: '#fff' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8, color: 'var(--text1)' }}>התחברות לחשבון</h1>
            <p style={{ color: 'var(--text2)' }}>כניסה לבעלי פרויקט, מנהלים ומפקחים מורשים</p>
          </div>

          <Btn onClick={handleGoogle} variant="ghost" style={{ width: '100%', justifyContent: 'center', padding: '12px', marginBottom: 16, fontSize: 14, border: '1px solid var(--border)' }}>
            <GoogleMark /> המשך עם Google
          </Btn>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0', color: 'var(--text3)', fontSize: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            או בדוא"ל
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text1)', marginBottom: 6 }}>אימייל</label>
              <Input type="email" value={form.email} onChange={(v: string) => setForm({...form, email: v})} placeholder="name@company.com" style={{ width: '100%' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text1)', marginBottom: 6 }}>סיסמה</label>
              <Input type="password" value={form.password} onChange={(v: string) => setForm({...form, password: v})} placeholder="••••••••" style={{ width: '100%' }} />
            </div>

            {error && (
              <div style={{ fontSize: 13, color: 'var(--danger)', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '8px 12px' }}>
                {error}
              </div>
            )}

            <Btn type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '14px', marginTop: 4, fontSize: 15 }}>
              {loading ? (
                 <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                   <Icon n="clock" s={16} /> מתחבר...
                 </span>
              ) : 'כניסה למערכת'}
            </Btn>
          </form>

          <p style={{ textAlign: 'center', marginTop: 28, fontSize: 13, color: 'var(--text3)' }}>
            עדיין אין לך חשבון? <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>צור חשבון חדש</Link>
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 800px) {
          .hidden-mobile { display: none !important; }
        }
      `}</style>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}
