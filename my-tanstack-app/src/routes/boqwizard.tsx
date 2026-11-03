import { createFileRoute } from '@tanstack/react-router'
import { BOQWizardScreen } from '~/screens/BOQWizardScreen'
import { useRequireRole } from '~/hooks/useRequireRole'
import { useSubscription } from '~/hooks/useSubscription'
import { AccessDenied, AccessLoading } from '~/components/AccessDenied'
import { FeatureTeaser } from '~/components/FeatureTeaser'
import { BOQWizardPreview } from '~/components/teaser/previews/BOQWizardPreview'

function GuardedBOQWizard() {
  const { allowed, loading } = useRequireRole(['owner', 'manager'])
  const { isProOrPremium, isLoaded } = useSubscription()
  if (loading || !isLoaded) return <AccessLoading />
  if (allowed) return <BOQWizardScreen />
  if (!isProOrPremium)
    return (
      <div className="page-content">
        <FeatureTeaser feature="boqwizard" requiredPlan="pro" preview={<BOQWizardPreview />} />
      </div>
    )
  return <AccessDenied />
}

export const Route = createFileRoute('/boqwizard')({
  component: GuardedBOQWizard,
})
