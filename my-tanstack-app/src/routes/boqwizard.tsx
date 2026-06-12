import { createFileRoute } from '@tanstack/react-router'
import { BOQWizardScreen } from '~/screens/BOQWizardScreen'
import { useRequireRole } from '~/hooks/useRequireRole'
import { useSubscription } from '~/hooks/useSubscription'
import { AccessDenied, AccessLoading } from '~/components/AccessDenied'
import { SubscriptionLock } from '~/components/Shared'

function GuardedBOQWizard() {
  const { allowed, loading } = useRequireRole(['owner', 'manager'])
  const { isProOrPremium, isLoaded } = useSubscription()
  if (loading || !isLoaded) return <AccessLoading />
  // Owners/managers reach the screen, which shows its own in-place upgrade
  // teaser when unsubscribed. Everyone else who is unsubscribed gets the upgrade
  // prompt (not a bare "no access"); only subscribed wrong-role users see the
  // role denial.
  if (allowed) return <BOQWizardScreen />
  if (!isProOrPremium)
    return (
      <SubscriptionLock
        title="אשף הכמויות זמין במסלול Pro ומעלה"
        description="שדרג את החשבון שלך כדי לקבל גישה לאשף שיעזור לך להכין כתב כמויות מדויק בקליק, כולל הצעות חכמות וייצוא ממותג ל-PDF."
      />
    )
  return <AccessDenied />
}

export const Route = createFileRoute('/boqwizard')({
  component: GuardedBOQWizard,
})
