import { createFileRoute } from '@tanstack/react-router'
import { BOQWizardScreen } from '~/screens/BOQWizardScreen'
import { useRequireRole } from '~/hooks/useRequireRole'
import { AccessDenied, AccessLoading } from '~/components/AccessDenied'

function GuardedBOQWizard() {
  const { allowed, loading } = useRequireRole(['owner', 'manager'])
  if (loading) return <AccessLoading />
  if (!allowed) return <AccessDenied />
  return <BOQWizardScreen />
}

export const Route = createFileRoute('/boqwizard')({
  component: GuardedBOQWizard,
})
