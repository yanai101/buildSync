import { createFileRoute } from '@tanstack/react-router'
import { FinancingScreen } from '~/screens/FinancingScreen'
import { useRequireRole } from '~/hooks/useRequireRole'
import { useSubscription } from '~/hooks/useSubscription'
import { AccessDenied, AccessLoading } from '~/components/AccessDenied'
import { FeatureTeaser } from '~/components/FeatureTeaser'
import { FinancingPreview } from '~/components/teaser/previews/FinancingPreview'

function GuardedFinancing() {
  const { allowed, loading: roleLoading } = useRequireRole(['owner'])
  const { isProOrPremium, isLoaded } = useSubscription()

  if (roleLoading || !isLoaded) return <AccessLoading />

  if (allowed) return <FinancingScreen />
  if (!isProOrPremium) {
    return (
      <div className="page-content">
        <FeatureTeaser feature="financing" requiredPlan="pro" preview={<FinancingPreview />} />
      </div>
    )
  }

  return <AccessDenied />
}

export const Route = createFileRoute('/financing')({
  component: GuardedFinancing,
})
