import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon, Btn } from './Shared'
import { useCurrentProject } from '../hooks/useCurrentProject'
import { getActiveTier, type Tier } from '../../convex/_lib/entitlements'
import { openUpgradeModal } from './UpgradeModalHost'

const TIER_LABELS: Record<Tier, string> = {
  free: 'חינמי (Free)',
  pro: 'Pro',
  premium: 'Premium',
}

const DAY_MS = 24 * 60 * 60 * 1000

type Interval = 'month' | 'year' | null

type SubChange = {
  prevTier: Tier
  prevInterval: Interval
  tier: Tier
  interval: Interval
  expiresAt: number | null
  autoRenew: boolean | null
  autoRenewChanged: boolean
}

/** "Pro · שנתי" for paid tiers, plain tier label otherwise. */
function planLabel(tier: Tier, interval: Interval) {
  if (tier === 'free' || !interval) return TIER_LABELS[tier]
  return `${TIER_LABELS[tier]} · ${interval === 'year' ? 'שנתי' : 'חודשי'}`
}

function storageKey(userId: string) {
  return `buildsync:sub-state:${userId}`
}

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * Watches the live user doc and pops a one-time modal whenever the
 * subscription actually changed — upgrade, expiry/cancellation, or a renewal
 * date change (plan switch / renewal). The last acknowledged state is kept in
 * localStorage per user, so the popup shows the diff both when the user
 * returns to the site after changing the plan in Polar and when the webhook
 * lands while they are browsing. The first observation for a user only seeds
 * the baseline silently.
 */
export function SubscriptionChangePopup() {
  const { user } = useCurrentProject()
  const [change, setChange] = React.useState<SubChange | null>(null)

  const userId = user?._id as string | undefined
  const tier: Tier | null = user ? getActiveTier(user) : null
  const expiresAt: number | null = user?.subscriptionExpiresAt ?? null
  const interval: Interval = user?.subscriptionInterval ?? null
  const autoRenew: boolean | null = user?.subscriptionAutoRenew ?? null

  React.useEffect(() => {
    if (!userId || tier === null || typeof window === 'undefined') return
    const key = storageKey(userId)
    const current = JSON.stringify({ tier, expiresAt, interval, autoRenew })
    const raw = window.localStorage.getItem(key)
    if (raw === current) return

    let prev: { tier?: Tier; expiresAt?: number | null; interval?: Interval; autoRenew?: boolean | null } | null = null
    try {
      prev = raw ? JSON.parse(raw) : null
    } catch {
      prev = null
    }

    window.localStorage.setItem(key, current)
    if (!prev?.tier) return // first time we see this user — baseline only

    const tierChanged = prev.tier !== tier
    // Baselines written before interval/auto-renew tracking lack those keys —
    // don't treat their first appearance as a change.
    const intervalChanged = 'interval' in prev && (prev.interval ?? null) !== interval
    const autoRenewChanged = 'autoRenew' in prev && (prev.autoRenew ?? null) !== autoRenew
    // Ignore sub-day date drift; a real renewal or plan switch moves the date
    // by weeks or months.
    const dateChanged = Math.abs((prev.expiresAt ?? 0) - (expiresAt ?? 0)) > DAY_MS
    if (tierChanged || intervalChanged || dateChanged || autoRenewChanged) {
      setChange({
        prevTier: prev.tier,
        prevInterval: prev.interval ?? null,
        tier,
        interval,
        expiresAt,
        autoRenew,
        autoRenewChanged,
      })
    }
  }, [userId, tier, expiresAt, interval, autoRenew])

  if (!change) return null

  const upgraded = change.prevTier === 'free' && change.tier !== 'free'
  const downgraded = change.prevTier !== 'free' && change.tier === 'free'
  const planChanged = change.prevTier !== change.tier || change.prevInterval !== change.interval
  const renewalCanceled = !upgraded && !downgraded && !planChanged && change.autoRenewChanged && change.autoRenew === false
  const renewalResumed = !upgraded && !downgraded && !planChanged && change.autoRenewChanged && change.autoRenew === true
  const close = () => setChange(null)

  const header = upgraded
    ? { bg: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', icon: 'star', title: 'המנוי שודרג! 🎉' }
    : downgraded
      ? { bg: 'linear-gradient(135deg, #64748B 0%, #475569 100%)', icon: 'clock', title: 'המנוי הסתיים' }
      : renewalCanceled
        ? { bg: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', icon: 'clock', title: 'החידוש האוטומטי בוטל' }
        : renewalResumed
          ? { bg: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', icon: 'check', title: 'החידוש האוטומטי הופעל מחדש' }
          : { bg: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', icon: 'check', title: 'המנוי עודכן' }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(6px)',
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
            borderRadius: 20,
            width: '100%',
            maxWidth: 400,
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ background: header.bg, padding: '22px 24px', color: '#fff', position: 'relative' }}>
            <button
              type="button"
              onClick={close}
              aria-label="סגור"
              style={{
                position: 'absolute',
                insetInlineEnd: 14,
                top: 14,
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: 8,
                width: 28,
                height: 28,
                cursor: 'pointer',
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Icon n="x" s={14} />
            </button>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'grid',
                placeItems: 'center',
                marginBottom: 10,
              }}
            >
              <Icon n={header.icon} s={22} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{header.title}</h2>
          </div>

          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--text1)',
              }}
            >
              {planChanged ? (
                <>
                  <span style={{ color: 'var(--text3)', textDecoration: 'line-through' }}>
                    {planLabel(change.prevTier, change.prevInterval)}
                  </span>
                  <span style={{ display: 'inline-flex', transform: 'scaleX(-1)' }}>
                    <Icon n="arrow-right" s={16} c="var(--text3)" />
                  </span>
                  <span style={{ color: upgraded ? '#059669' : downgraded ? 'var(--text2)' : 'var(--accent)' }}>
                    {planLabel(change.tier, change.interval)}
                  </span>
                </>
              ) : (
                <span style={{ color: 'var(--accent)' }}>{planLabel(change.tier, change.interval)}</span>
              )}
            </div>

            {change.tier !== 'free' && change.expiresAt && (
              <p style={{ margin: 0, textAlign: 'center', fontSize: 13, color: 'var(--text2)' }}>
                {change.autoRenew === false
                  ? `המנוי יישאר פעיל עד ${formatDate(change.expiresAt)} ולא יתחדש אוטומטית`
                  : `תקופת החיוב הנוכחית מסתיימת ב-${formatDate(change.expiresAt)}`}
              </p>
            )}
            {downgraded && (
              <p style={{ margin: 0, textAlign: 'center', fontSize: 13, color: 'var(--text2)' }}>
                הפרויקטים והנתונים שלך נשמרו — ניתן לחדש את המנוי בכל עת.
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              {downgraded ? (
                <Btn
                  onClick={() => {
                    close()
                    openUpgradeModal({ title: 'חידוש מנוי', reason: 'חדש את המנוי כדי להמשיך ליהנות מכל יכולות Pro.' })
                  }}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <Icon n="star" s={14} /> חידוש המנוי
                </Btn>
              ) : (
                <Btn onClick={close} style={{ width: '100%', justifyContent: 'center' }}>
                  הבנתי, תודה
                </Btn>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
