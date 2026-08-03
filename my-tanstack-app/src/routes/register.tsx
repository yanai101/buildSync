import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, useRef } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth, useMutation, useConvex, useQuery } from 'convex/react'
import { Icon, Input, Btn } from '~/components/Shared'
import { api } from '../../convex/_generated/api'

import { z } from 'zod'

const searchSchema = z.object({
  redirect: z.string().optional(),
  promo: z.string().optional(),
  code: z.string().optional(),
  verifyCode: z.string().optional(),
  email: z.string().optional(),
})

export const Route = createFileRoute('/register')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: RegisterPage,
})

function RegisterPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const convex = useConvex()
  const { signIn } = useAuthActions()
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()
  const seedMyProject = useMutation(api.seed.seedMyProject)
  const hasAttemptedVerify = useRef(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verificationStep, setVerificationStep] = useState(false)
  const [code, setCode] = useState('')
  const [promoCode, setPromoCode] = useState<string | null>(null)

  const getRedirectTarget = () => {
    let target = search?.redirect
    if (!target && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('buildsync:auth_redirect')
        if (stored) {
          target = stored
        }
      } catch (e) {}
    }
    if (target && target.startsWith('/') && !target.startsWith('/login') && !target.startsWith('/register')) {
      return target
    }
    return '/dashboard'
  }

  // Use the standard hook for checking promo code status
  const promoStatus = useQuery(api.users.getPromoCodeStatus, promoCode ? { code: promoCode } : 'skip')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      
      // Check for project invitation code
      const joinCode = params.get('code')
      if (joinCode) {
        navigate({ to: '/join/$code', params: { code: joinCode } })
        return
      }

      // Check for promo code
      const promo = params.get('promo')
      if (promo) {
        setPromoCode(promo)
        localStorage.setItem('promoCode', promo)
      }
    }
  }, [navigate])

  useEffect(() => {
    if (isAuthLoading) return

    if (isAuthenticated) {
      const target = getRedirectTarget()
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('buildsync:auth_redirect')
        } catch (e) {}
      }
      navigate({ to: target as any })
      return
    }

    const searchParams = new URLSearchParams(window.location.search)
    const verifyCode = searchParams.get('verifyCode')
    const verifyEmail = searchParams.get('email')

    if (verifyCode && verifyEmail) {
      setVerificationStep(true)
      setCode(verifyCode)
      setForm(prev => ({ ...prev, email: verifyEmail }))
      
      if (!hasAttemptedVerify.current) {
        hasAttemptedVerify.current = true
        // Auto-submit the verification
        setLoading(true)
        signIn('password', {
          email: verifyEmail,
          code: verifyCode,
          flow: 'email-verification',
        }).catch(err => {
           let msg = err instanceof Error ? err.message : 'שגיאה באימות או שהקישור פג תוקף'
           if (msg.includes('Could not verify code')) {
             msg = 'הקישור פג תוקף או שכבר נוצל. אם כבר אימתת את חשבונך, תוכל פשוט להתחבר במסך ההתחברות.'
           }
           setError(msg)
           setLoading(false)
        })
      }
    }
  }, [navigate, signIn, isAuthLoading, isAuthenticated])

  let promoMessage = null;
  if (promoStatus) {
    if (promoStatus.status === 'valid') {
      promoMessage = { type: 'success' as const, text: 'קוד ההטבה הופעל בהצלחה! עם הרשמתך תקבל מנוי אוטומטית.' }
    } else if (promoStatus.status === 'fully_used') {
      promoMessage = { type: 'warning' as const, text: 'קוד ההטבה הזה נוצל במלואו והגיע למקסימום המשתמשים. עדיין תוכל להירשם לאפליקציה, אך המסלול שלך יהיה חינמי.' }
    } else if (promoStatus.status === 'expired') {
      promoMessage = { type: 'error' as const, text: 'קוד ההטבה פג תוקף ולא יופעל עם הרשמתך.' }
    } else {
      promoMessage = { type: 'error' as const, text: 'קוד ההטבה אינו תקין או שאינו קיים.' }
    }
  }

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) return
    const target = getRedirectTarget()
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('buildsync:auth_redirect')
      } catch (e) {}
    }
    navigate({ to: target as any })
  }, [isAuthenticated, isAuthLoading, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 1. Check if any fields are empty
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.password) {
      setError('אנא מלא את כל השדות (שם, אימייל, טלפון וסיסמה).')
      return
    }

    // 2. Name validation (at least 2 characters)
    if (form.name.trim().length < 2) {
      setError('השם המלא חייב להכיל לפחות 2 תווים.')
      return
    }

    // 3. Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) {
      setError('אנא הזן כתובת אימייל תקינה (לדוגמה: name@company.com).')
      return
    }

    // 4. Israeli mobile phone number validation
    const phoneRegex = /^05\d-?\d{7}$/
    if (!phoneRegex.test(form.phone)) {
      setError('אנא הזן מספר טלפון נייד תקין (לדוגמה: 050-1234567).')
      return
    }

    // 5. Strong password validation (at least 8 characters, 1 uppercase, 1 lowercase, 1 digit)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
    if (!passwordRegex.test(form.password)) {
      setError('הסיסמה חייבת להכיל לפחות 8 תווים, כולל אות גדולה (A-Z), אות קטנה (a-z) ומספר.')
      return
    }

    setError(null)
    setLoading(true)
    
    try {
      // Check explicitly if email is taken before creating an account
      const taken = await convex.query(api.users.isEmailTaken, { email: form.email })
      if (taken) {
        setError('כתובת אימייל זו כבר רשומה במערכת.')
        setLoading(false)
        return
      }

      await signIn('password', {
        flow: 'signUp',
        email: form.email,
        password: form.password,
        name: form.name,
        phone: form.phone,
      })
      setVerificationStep(true)
    } catch (err) {
      let msg = err instanceof Error ? err.message : 'ההרשמה נכשלה. נסה שוב.'
      if (msg.toLowerCase().includes('exist') || msg.toLowerCase().includes('already')) {
        msg = 'כתובת אימייל זו כבר רשומה במערכת.'
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError(null)
    const target = getRedirectTarget()
    try {
      await signIn('google', { redirectTo: target })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהתחברות Google')
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code || code.trim().length === 0) {
      setError('אנא הזן קוד אימות תקין.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      await signIn('password', {
        email: form.email,
        code,
        flow: 'email-verification',
      })
      // Navigation is handled by the useEffect above when isAuthenticated becomes true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'קוד שגוי או פג תוקף. נסה שוב.')
    } finally {
      setLoading(false)
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
            <div className="sidebar-logo-text" dir="ltr" style={{ fontSize: 28, color: '#fff', margin: 0 }}>Build<span style={{color: 'var(--accent)'}}>Sync</span></div>
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
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', background: 'var(--surface)' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8, color: 'var(--text1)' }}>יצירת חשבון בעל פרויקט</h1>
            <p style={{ color: 'var(--text2)' }}>הזן את הפרטים כדי לפתוח סביבת עבודה ולצרף צוות</p>
          </div>
          
          {promoCode && !promoStatus ? (
            <div style={{ 
              marginBottom: 24, 
              padding: 16, 
              borderRadius: 8, 
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              color: 'var(--text2)'
            }}>
              <div style={{ 
                width: 20, 
                height: 20, 
                border: '2px solid var(--border)', 
                borderTopColor: 'var(--accent)', 
                borderRadius: '50%', 
                animation: 'spin 1s linear infinite' 
              }} />
              <div style={{ fontSize: 14 }}>בודק קוד הרשמה...</div>
            </div>
          ) : (
            <>
              {promoMessage && (
                <div style={{ 
                  marginBottom: 24, 
                  padding: 16, 
                  borderRadius: 8, 
                  background: promoMessage.type === 'success' ? '#ECFDF5' : promoMessage.type === 'warning' ? '#FFFBEB' : '#FEF2F2',
                  color: promoMessage.type === 'success' ? '#059669' : promoMessage.type === 'warning' ? '#D97706' : '#DC2626',
                  border: `1px solid ${promoMessage.type === 'success' ? '#A7F3D0' : promoMessage.type === 'warning' ? '#FDE68A' : '#FECACA'}`,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start'
                }}>
                  <Icon n={promoMessage.type === 'success' ? 'check-circle' : 'alert-circle'} s={20} />
                  <div style={{ fontSize: 14, lineHeight: 1.4 }}>{promoMessage.text}</div>
                </div>
              )}

          {verificationStep ? (
            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent-light, rgba(0, 102, 255, 0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Icon n="mail" s={32} c="var(--accent)" />
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8, color: 'var(--text1)' }}>אימות אימייל</h2>
                <p style={{ color: 'var(--text2)', lineHeight: 1.5 }}>
                  שלחנו קישור אימות לכתובת <strong>{form.email}</strong>.<br/>
                  אנא לחץ על הקישור במייל, או הזן את הקוד מתוכו כאן כדי להשלים את ההרשמה.
                </p>
              </div>

              <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text1)', marginBottom: 6, textAlign: 'center' }}>קוד אימות</label>
                  <Input 
                    type="text" 
                    value={code} 
                    onChange={(v: string) => setCode(v)} 
                    placeholder="הזן את הקוד..." 
                    style={{ width: '100%', textAlign: 'center', letterSpacing: 4, fontSize: 18 }} 
                  />
                </div>

                {error && (
                  <div style={{ fontSize: 13, color: 'var(--danger)', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                    {error}
                  </div>
                )}

                <Btn type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '14px', marginTop: 4, fontSize: 15 }}>
                  {loading ? (
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Icon n="clock" s={16} /> בודק קוד...
                    </span>
                  ) : 'אמת והתחבר'}
                </Btn>
              </form>

              <button 
                onClick={() => { setVerificationStep(false); setError(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 13, textDecoration: 'underline', marginTop: 24, cursor: 'pointer', width: '100%', textAlign: 'center' }}
              >
                חזור לתיקון פרטים
              </button>
            </div>
          ) : (
            <>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>סיסמה</label>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>לפחות 8 תווים, כולל אותיות A-Z, a-z ומספר</span>
                  </div>
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
                       <Icon n="clock" s={16} /> נרשם...
                     </span>
                  ) : 'פתח חשבון ונהל פרויקט'}
                </Btn>
              </form>
            </>
          )}

          <p style={{ textAlign: 'center', marginTop: 28, fontSize: 13, color: 'var(--text3)' }}>
            יש לך כבר חשבון? <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>התחבר כאן</Link>
          </p>
          <p style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: 'var(--text3)' }}>
            מנהל עבודה, מפקח או קבלן? יש לבקש מבעל הפרויקט לצרף אותך.
          </p>
            </>
          )}
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
