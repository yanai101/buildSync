import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, useRef } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth, useMutation, useConvex, useQuery } from 'convex/react'
import { Icon } from '~/components/Shared'
import { AuthShell, AuthHead, AuthField, AuthInput, AuthButton, AuthNotice, AuthDivider, GoogleMark } from '~/components/AuthShell'
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
    <AuthShell
      photo="stage-0"
      photoAlt="מגרש ריק מסומן ביתדות, ובעל הבית בוחן את תוכניות האדריכל"
      captionTitle={<>פתח פרויקט <b>בנייה חדש.</b></>}
      captionBody="ההרשמה מיועדת ליזמים ובעלי פרויקט. מנהלי עבודה, מפקחים וקבלנים יצורפו על ידי בעל הפרויקט לאחר יצירתו."
    >
      <AuthHead title="יצירת חשבון בעל פרויקט" lede="הזן את הפרטים כדי לפתוח סביבת עבודה ולצרף צוות" />

      {promoCode && !promoStatus ? (
        <div className="auth-loading" role="status">
          <span className="auth-spinner" aria-hidden="true" />
          בודק קוד הרשמה...
        </div>
      ) : (
        <>
          {promoMessage && (
            <AuthNotice tone={promoMessage.type}>{promoMessage.text}</AuthNotice>
          )}

          {verificationStep ? (
            <>
              <header className="auth__head">
                <span className="auth-chip"><Icon n="mail" s={16} /> אימות אימייל</span>
                <p className="auth__lede">
                  שלחנו קישור אימות לכתובת <strong>{form.email}</strong>. אנא לחץ על הקישור במייל, או הזן את הקוד מתוכו כאן כדי להשלים את ההרשמה.
                </p>
              </header>

              <form onSubmit={handleVerify} className="auth__form">
                <AuthField label="קוד אימות">
                  <AuthInput type="text" name="code" autoComplete="one-time-code" inputMode="numeric" className="auth-input--code" value={code} onChange={(v) => setCode(v)} placeholder="הזן את הקוד..." />
                </AuthField>

                {error && <AuthNotice tone="error">{error}</AuthNotice>}

                <AuthButton type="submit" disabled={loading} loading={loading} loadingText="בודק קוד...">
                  אמת והתחבר
                </AuthButton>
              </form>

              <button type="button" className="auth-text-btn" onClick={() => { setVerificationStep(false); setError(null); }}>
                חזור לתיקון פרטים
              </button>
            </>
          ) : (
            <>
              <AuthButton type="button" variant="ghost" onClick={handleGoogle}>
                <GoogleMark /> המשך עם Google
              </AuthButton>

              <AuthDivider>או בדוא"ל</AuthDivider>

              <form onSubmit={handleSubmit} className="auth__form">
                <AuthField label="שם מלא">
                  <AuthInput name="name" autoComplete="name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="ישראל ישראלי" />
                </AuthField>

                <div className="auth-row2">
                  <AuthField label="אימייל">
                    <AuthInput type="email" name="email" autoComplete="email" inputMode="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="name@company.com" />
                  </AuthField>
                  <AuthField label="טלפון">
                    <AuthInput type="tel" name="phone" autoComplete="tel" inputMode="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="050-0000000" />
                  </AuthField>
                </div>

                <AuthField label="סיסמה" hint="לפחות 8 תווים, כולל אותיות A-Z, a-z ומספר">
                  <AuthInput type="password" name="password" autoComplete="new-password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="••••••••" />
                </AuthField>

                {error && <AuthNotice tone="error">{error}</AuthNotice>}

                <AuthButton type="submit" disabled={loading} loading={loading} loadingText="נרשם...">
                  פתח חשבון ונהל פרויקט
                </AuthButton>
              </form>
            </>
          )}

          <footer className="auth__foot">
            <p>
              יש לך כבר חשבון? <Link to="/login" className="auth-link">התחבר כאן</Link>
            </p>
            <p>מנהל עבודה, מפקח או קבלן? יש לבקש מבעל הפרויקט לצרף אותך.</p>
            <p className="auth__legal">
              בהרשמה למערכת, את/ה מסכים/ה ל<Link to="/terms" className="auth-link--quiet">תנאי השימוש</Link> ול<Link to="/privacy" className="auth-link--quiet">מדיניות הפרטיות</Link> שלנו.
            </p>
          </footer>
        </>
      )}
    </AuthShell>
  )
}
