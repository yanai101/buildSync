import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth } from 'convex/react'
import { AuthShell, AuthHead, AuthField, AuthInput, AuthButton, AuthNotice, AuthDivider, GoogleMark } from '~/components/AuthShell'

import { z } from 'zod'

const searchSchema = z.object({
  redirect: z.string().optional(),
  promo: z.string().optional(),
})

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const { signIn } = useAuthActions()
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verificationSent, setVerificationSent] = useState(false)

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const promo = new URLSearchParams(window.location.search).get('promo')
      if (promo) {
        localStorage.setItem('promoCode', promo)
      }
    }
  }, [])

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
    if (!form.email || !form.password) return
    setError(null)
    setLoading(true)
    try {
      const result = await signIn('password', {
        flow: 'signIn',
        email: form.email,
        password: form.password,
      })
      // If signingIn is false with no error, the account needs email verification.
      // @convex-dev/auth silently sends a verification email instead of signing in.
      if (result && !result.signingIn) {
        setVerificationSent(true)
        return
      }
    } catch (err) {
      let msg = err instanceof Error ? err.message : 'ההתחברות נכשלה. נסה שוב.'
      if (msg.includes('InvalidSecret')) {
        msg = 'האימייל או הסיסמה שהוזנו שגויים. (אם נרשמת דרך גוגל, השתמש בכפתור ההתחברות של גוגל)'
      } else if (msg.includes('AccountNotFound')) {
        msg = 'לא נמצאה סיסמה לאימייל זה. אם נרשמת דרך גוגל, השתמש בכפתור ההתחברות של גוגל למעלה.'
      } else if (msg.includes('Server') || msg.includes('Called by client')) {
        msg = 'ההתחברות נכשלה. (אם נרשמת דרך גוגל, אנא השתמש בכפתור ההתחברות של גוגל)'
      } else if (msg.includes('Uncaught Error')) {
        msg = 'ההתחברות נכשלה. אנא בדוק את הפרטים ונסה שוב.'
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

  return (
    <AuthShell
      photo="stage-5"
      photoAlt="בית האבן המוגמר בשקיעה, משפחה מקבלת את המפתחות"
      captionTitle={<>חזרה <b>למרכז השליטה</b> של הפרויקט.</>}
      captionBody="התחברו כדי להמשיך לנהל תקציב, שלבים, קבלנים ותיעוד שוטף מתוך סביבת עבודה אחת."
    >
      <AuthHead title="התחברות לחשבון" lede="כניסה לבעלי פרויקט, מנהלים ומפקחים מורשים" />

      <AuthButton type="button" variant="ghost" onClick={handleGoogle}>
        <GoogleMark /> המשך עם Google
      </AuthButton>

      <AuthDivider>או בדוא"ל</AuthDivider>

      <form onSubmit={handleSubmit} className="auth__form">
        <AuthField label="אימייל">
          <AuthInput type="email" name="email" autoComplete="email" inputMode="email" value={form.email} onChange={(v) => { setForm({ ...form, email: v }); setVerificationSent(false); setError(null) }} placeholder="name@company.com" />
        </AuthField>

        <AuthField label="סיסמה">
          <AuthInput type="password" name="password" autoComplete="current-password" value={form.password} onChange={(v) => { setForm({ ...form, password: v }); setVerificationSent(false); setError(null) }} placeholder="••••••••" />
        </AuthField>

        {verificationSent && (
          <AuthNotice tone="success" title='נדרש אימות דוא"ל'>
            שלחנו קישור אימות לכתובת <strong>{form.email}</strong>. אנא בדוק את תיבת הדואר שלך ולחץ על הקישור כדי לאמת את החשבון, ואז נסה להתחבר שוב.
          </AuthNotice>
        )}
        {error && <AuthNotice tone="error">{error}</AuthNotice>}

        <AuthButton type="submit" disabled={loading} loading={loading} loadingText="מתחבר...">
          כניסה למערכת
        </AuthButton>
      </form>

      <footer className="auth__foot">
        <p>
          עדיין אין לך חשבון? <Link to="/register" className="auth-link">צור חשבון חדש</Link>
        </p>
        <p className="auth__legal">
          בהתחברות למערכת, את/ה מסכים/ה ל<Link to="/terms" className="auth-link--quiet">תנאי השימוש</Link> ול<Link to="/privacy" className="auth-link--quiet">מדיניות הפרטיות</Link> שלנו.
        </p>
      </footer>
    </AuthShell>
  )
}

