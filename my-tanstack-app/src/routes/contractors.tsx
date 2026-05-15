import { createFileRoute } from '@tanstack/react-router'
import { ContractorsScreen } from '~/screens/ContractorsScreen'
import { useRequireRole } from '~/hooks/useRequireRole'
import { AccessDenied, AccessLoading } from '~/components/AccessDenied'

function GuardedContractors() {
  const { allowed, loading } = useRequireRole(['owner', 'manager'])
  if (loading) return <AccessLoading />
  if (!allowed) return <AccessDenied />
  return <ContractorsScreen />
}

import { z } from 'zod';

export const Route = createFileRoute('/contractors')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      contractorId: search.contractorId as string | undefined,
    }
  },
  component: GuardedContractors,
})
