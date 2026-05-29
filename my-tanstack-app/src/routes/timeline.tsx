import { createFileRoute } from '@tanstack/react-router'
import { TimelineScreen } from '~/screens/TimelineScreen'
import { useRequireRole } from '~/hooks/useRequireRole'
import { AccessDenied, AccessLoading } from '~/components/AccessDenied'

function GuardedTimeline() {
  const { allowed, loading } = useRequireRole(['owner', 'manager', 'inspector', 'contractor'])
  if (loading) return <AccessLoading />
  if (!allowed) return <AccessDenied />
  return <TimelineScreen />
}

export const Route = createFileRoute('/timeline')({
  component: GuardedTimeline,
})
