import { createFileRoute } from '@tanstack/react-router'
import { BOQScreen } from '~/screens/BOQScreen'
import { useRequireRole } from '~/hooks/useRequireRole'
import { AccessDenied, AccessLoading } from '~/components/AccessDenied'

function GuardedBOQ() {
  const { allowed, loading } = useRequireRole(['owner', 'manager'])
  if (loading) return <AccessLoading />
  if (!allowed) return <AccessDenied />
  return <BOQScreen />
}

export const Route = createFileRoute('/boq')({
  component: GuardedBOQ,
})
