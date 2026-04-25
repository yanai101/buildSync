import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth } from 'convex/react'
import { useMutation } from 'convex/react'
import { Icon, Input, Btn } from '~/components/Shared'
import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

function RegisterPage() {
  const navigate = useNavigate()
  const { signIn } = useAuthActions()
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()
  const seedMyProject = useMutation(api.seed.seedMyProject)
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) return
    window.location.replace('/')
  }, [isAuthenticated, isAuthLoading, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) return
    setError(null)
    setLoading(true)
    try {
      await signIn('password', {
        flow: 'signUp',
        email: form.email,
        password: form.password,
        name: form.name,
        phone: form.phone,
      })
      // Navigation is handled by the useEffect above when isAuthenticated becomes true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ההרשמה נכשלה. נסה שוב.')
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

      {/* Visual side pane (hidden on mobile) */}
      <div style={{ flex: 1, background: 'linear-gradient(135deg, var(--text1), #1a1a24)', display: 'flex', flexDirection: 'column', padding: '60px', color: '#fff', position: 'relative', overflow: 'hidden' }} className="hidden-mobile">
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div className="sidebar-logo" style={{ marginBottom: 60, alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img 
              src="/logo.png" 
              alt="BuildSync Icon" 
              style={{ 
                width: 40, 
                height: 40, 
                display: 'block', 
                borderRadius: '10px',
                objectFit: 'cover'
              }} 
            />
            <div className="sidebar-logo-text" style={{ fontSize: 28, color: '#fff', margin: 0 }}>Build<span style={{color: 'var(--accent)'}}>Sync</span></div>
          </div>

          <h2 style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1.1, marginBottom: 24, letterSpacing: '-0.02em', maxWidth: 400 }}>
            פתח פרויקט בנייה חדש.
          </h2>
          <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, maxWidth: 440 }}>
            ההרשמה מיועדת ליזמים ובעלי פרויקט. מנהלי עבודה, מפקחים וקבלנים יצורפו על ידי בעל הפרויקט לאחר יצירתו.
          </p>
        </div>

        {/* Decorative elements */}
        <div style={{ position: 'absolute', bottom: -50, right: -50, width: 400, height: 400, background: 'var(--accent)', filter: 'blur(150px)', opacity: 0.15, zIndex: 1 }} />
        <div style={{ position: 'absolute', top: 100, left: -50, width: 300, height: 300, background: 'var(--success)', filter: 'blur(150px)', opacity: 0.1, zIndex: 1 }} />
      </div>

      {/* Form side */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', background: '#fff' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8, color: 'var(--text1)' }}>יצירת חשבון בעל פרויקט</h1>
            <p style={{ color: 'var(--text2)' }}>הזן את הפרטים כדי לפתוח סביבת עבודה ולצרף צוות</p>
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
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text1)', marginBottom: 6 }}>שם מלא</label>
              <Input value={form.name} onChange={(v: string) => setForm({...form, name: v})} placeholder="ישראל ישראלי" style={{ width: '100%' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
               <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text1)', marginBottom: 6 }}>אימייל</label>
                  <Input type="email" value={form.email} onChange={(v: string) => setForm({...form, email: v})} placeholder="name@company.com" style={{ width: '100%' }} />
               </div>
               <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text1)', marginBottom: 6 }}>טלפון</label>
                  <Input type="tel" value={form.phone} onChange={(v: string) => setForm({...form, phone: v})} placeholder="050-0000000" style={{ width: '100%' }} />
               </div>
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
                   <Icon n="clock" s={16} /> בתהליך יצירה...
                 </span>
              ) : 'פתח חשבון ונהל פרויקט'}
            </Btn>
          </form>

          <p style={{ textAlign: 'center', marginTop: 28, fontSize: 13, color: 'var(--text3)' }}>
            יש לך כבר חשבון? <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>התחבר כאן</Link>
          </p>
          <p style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: 'var(--text3)' }}>
            מנהל עבודה, מפקח או קבלן? יש לבקש מבעל הפרויקט לצרף אותך.
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
