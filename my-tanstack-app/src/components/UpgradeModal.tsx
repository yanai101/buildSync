import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon, Btn } from './Shared'
import { useCurrentProject } from '../hooks/useCurrentProject'
import { checkoutUrl, PLANS_FOR_TIER, type BillingPlan, type BillingTier } from '../billing'
import { useNavigate } from '@tanstack/react-router'

const PRO_BENEFITS = [
  '✨ השוואת הצעות מחיר חכמה עם AI',
  'תיעוד תמונות לכל חדר לפי שלבי הבנייה, השוואת לפני/אחרי ודוח PDF',
  'פרויקטים ללא הגבלה',
  'מעקב עלויות רכש והזמנות',
  'ניהול צוות ומפקחים',
  'יומני עבודה וייצוא ל-PDF',
  'דוחות וניתוחים מתקדמים',
]

const PREMIUM_BENEFITS = [
  'תיעוד תמונות לכל חדר לפי שלבי הבנייה',
  'קטגוריות (חשמל, אינסטלציה, מיזוג…), תיאור והערות לכל תמונה',
  'השוואת לפני / אחרי בין שלבים — לראות מה עובר בתוך הקירות',
  'דוח PDF להדפסה לכל חדר וייצוא מסודר לפי חדר ושלב',
  'הרשאות צפייה והעלאה למנהל העבודה ולמפקח',
  'כל היכולות של מסלול Pro',
]

/** Which tiers can be purchased in this environment (see /api/plans). */
function usePlanAvailability(enabled: boolean) {
  const [state, setState] = React.useState<{ pro: boolean; premium: boolean } | null>(null)
  React.useEffect(() => {
    if (!enabled) return
    let cancelled = false
    fetch('/api/plans')
      .then((r) => (r.ok ? r.json() : { pro: true, premium: false }))
      .then((data) => { if (!cancelled) setState(data) })
      .catch(() => { if (!cancelled) setState({ pro: true, premium: false }) })
    return () => { cancelled = true }
  }, [enabled])
  return state
}

/**
 * Conversion-focused upgrade modal. Reused by FeatureTeaser and
 * by the project-limit flow. Lets a free user subscribe in one click — monthly
 * or annual — without hunting through the account page.
 */
export function UpgradeModal({
  onClose,
  tier = 'pro',
  title = tier === 'premium' ? 'שדרג ל-Premium' : 'שדרג ל-Pro',
  reason,
}: {
  onClose: () => void
  /** Which subscription the modal sells. Defaults to Pro. */
  tier?: BillingTier
  title?: string
  reason?: string
}) {
  const isPremium = tier === 'premium'
  const benefits = isPremium ? PREMIUM_BENEFITS : PRO_BENEFITS
  const availability = usePlanAvailability(isPremium)
  // Pro is always purchasable; Premium only once its Polar products exist.
  const canBuy = !isPremium || availability?.premium === true
  const checkingAvailability = isPremium && availability === null
  const { user } = useCurrentProject()
  const userId = user?._id as string | undefined

  const navigate = useNavigate()

  const go = (plan: BillingPlan) => {
    if (!userId) {
      navigate({ to: '/account', search: { success: undefined } })
      return
    }
    window.location.href = checkoutUrl(plan, userId)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(8px)',
          zIndex: 10000,
          display: 'grid',
          placeItems: 'center',
          padding: 20,
        }}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--surface)',
            borderRadius: 24,
            width: '100%',
            maxWidth: 460,
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            border: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              padding: '28px 28px 24px',
              color: '#fff',
              position: 'relative',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="סגור"
              style={{
                position: 'absolute',
                insetInlineEnd: 16,
                top: 16,
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: 8,
                width: 30,
                height: 30,
                cursor: 'pointer',
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Icon n="x" s={16} />
            </button>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'grid',
                placeItems: 'center',
                marginBottom: 14,
              }}
            >
              <Icon n="star" s={26} />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{title}</h2>
            {reason && (
              <p style={{ margin: '8px 0 0', fontSize: 14, opacity: 0.95, lineHeight: 1.5 }}>{reason}</p>
            )}
          </div>

          <div style={{ padding: 28 }}>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {benefits.map((b) => (
                <li key={b} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, color: 'var(--text1)' }}>
                  <span style={{ color: '#10B981', display: 'inline-flex' }}>
                    <Icon n="check" s={18} />
                  </span>
                  {b}
                </li>
              ))}
            </ul>

            {!canBuy ? (
              <div style={{ marginTop: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div role="status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--accent-light)', border: '1px solid var(--accent)', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: 'var(--text1)', lineHeight: 1.5 }}>
                  {!checkingAvailability && <Icon n="clock" s={16} c="var(--accent)" />}
                  {checkingAvailability ? 'בודק זמינות…' : 'מסלול Premium יושק בקרוב. נעדכן אותך ברגע שיהיה זמין לרכישה.'}
                </div>
                <Btn variant="ghost" onClick={onClose} style={{ width: '100%', justifyContent: 'center' }}>הבנתי</Btn>
              </div>
            ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
              <Btn
                onClick={() => go(PLANS_FOR_TIER[tier].annual)}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  boxShadow: '0 4px 12px rgba(217,119,6,0.3)',
                }}
              >
                <Icon n="star" s={16} /> {isPremium ? 'שדרג ל-Premium שנתי' : 'שדרג למנוי שנתי (17% הנחה)'}
              </Btn>
              <Btn variant="ghost" onClick={() => go(PLANS_FOR_TIER[tier].monthly)} style={{ width: '100%', justifyContent: 'center' }}>
                {isPremium ? 'שדרג ל-Premium חודשי' : 'שדרג למנוי חודשי'}
              </Btn>
            </div>
            )}

            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)', marginTop: 16 }}>
              ביטול בכל עת · חיוב מאובטח דרך Polar
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
