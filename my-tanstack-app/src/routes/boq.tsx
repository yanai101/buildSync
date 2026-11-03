import { createFileRoute } from '@tanstack/react-router'
import { BOQScreen } from '~/screens/BOQScreen'
import { useRequireRole } from '~/hooks/useRequireRole'
import { useSubscription } from '~/hooks/useSubscription'
import { AccessDenied, AccessLoading } from '~/components/AccessDenied'
import { FeatureTeaser } from '~/components/FeatureTeaser'
import { BOQPreview } from '~/components/teaser/previews/BOQPreview'

function GuardedBOQ() {
  const { allowed, loading } = useRequireRole(['owner', 'manager'])
  const { isProOrPremium, isLoaded } = useSubscription()
  if (loading || !isLoaded) return <AccessLoading />
  if (allowed) return <BOQScreen />
  if (!isProOrPremium)
    return (
      <div className="page-content">
        <FeatureTeaser feature="boq" requiredPlan="pro" preview={<BOQPreview />} />
      </div>
    )
  return <AccessDenied message="ניהול עלויות רכש מורשה לצוות הניהול והפיקוח בלבד." />
}

export const Route = createFileRoute('/boq')({
  component: GuardedBOQ,
})
