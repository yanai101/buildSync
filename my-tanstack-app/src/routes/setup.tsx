import { createFileRoute } from '@tanstack/react-router'
import { ProjectSetupScreen } from '~/screens/ProjectSetupScreen'
import { useRequireRole } from '~/hooks/useRequireRole'
import { AccessDenied, AccessLoading } from '~/components/AccessDenied'

function GuardedSetup() {
  const { allowed, loading } = useRequireRole(['owner', 'manager'])
  if (loading) return <AccessLoading />
  if (!allowed) return <AccessDenied />
  return <ProjectSetupScreen />
}

export const Route = createFileRoute('/setup')({
  // Optional deep link: /setup?step=rooms opens the rooms step in edit mode.
  validateSearch: (search: Record<string, unknown>): { step?: string } => ({
    step: typeof search.step === 'string' ? search.step : undefined,
  }),
  component: GuardedSetup,
})
