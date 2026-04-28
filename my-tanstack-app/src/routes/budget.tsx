import { createFileRoute } from '@tanstack/react-router'
import { BudgetScreen } from '~/screens/BudgetScreen'
import { useRequireRole } from '~/hooks/useRequireRole'
import { AccessDenied, AccessLoading } from '~/components/AccessDenied'

function GuardedBudget() {
  const { allowed, loading } = useRequireRole(['owner', 'manager'])
  if (loading) return <AccessLoading />
  if (!allowed) return <AccessDenied />
  return <BudgetScreen />
}

export const Route = createFileRoute('/budget')({
  component: GuardedBudget,
})
