import { createFileRoute } from '@tanstack/react-router'
import { BOQScreen } from '~/screens/BOQScreen'
import { useRequireRole } from '~/hooks/useRequireRole'
import { useSubscription } from '~/hooks/useSubscription'
import { AccessDenied, AccessLoading } from '~/components/AccessDenied'
import { SubscriptionLock } from '~/components/Shared'

function GuardedBOQ() {
  const { allowed, loading } = useRequireRole(['owner', 'manager'])
  const { isProOrPremium, isLoaded } = useSubscription()
  if (loading || !isLoaded) return <AccessLoading />
  // Owners/managers reach the screen, which shows its own in-place upgrade
  // teaser when unsubscribed. Everyone else who is unsubscribed gets the upgrade
  // prompt (not a bare "no access"); only subscribed wrong-role users see the
  // role denial.
  if (allowed) return <BOQScreen />
  if (!isProOrPremium)
    return (
      <SubscriptionLock
        title="ניהול חכם של עלויות רכש"
        description="קבל גישה מלאה לניהול רשימת העלויות, ייצוא ל-PDF ומעקב מדויק אחר הזמנות מספקים."
      />
    )
  return <AccessDenied message="ניהול עלויות רכש מורשה לצוות הניהול והפיקוח בלבד." />
}

export const Route = createFileRoute('/boq')({
  component: GuardedBOQ,
})
