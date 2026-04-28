import { createFileRoute } from '@tanstack/react-router'
import { QuotesScreen } from '~/screens/QuotesScreen'
import { useRequireRole } from '~/hooks/useRequireRole'
import { AccessDenied, AccessLoading } from '~/components/AccessDenied'

function GuardedQuotes() {
  const { allowed, loading } = useRequireRole(['owner', 'manager'])
  if (loading) return <AccessLoading />
  if (!allowed) return <AccessDenied />
  return <QuotesScreen />
}

export const Route = createFileRoute('/quotes')({
  component: GuardedQuotes,
})
