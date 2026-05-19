/**
 * useProjectContractors — shared hook for contractor data.
 *
 * Instead of 5 separate useQuery(api.queries.listContractors) calls across
 * PhotosScreen, TeamScreen, StagesScreen, ContractorsScreen, DailyLogsScreen,
 * this hook should be called once from a shared context and the result passed down.
 *
 * Usage: Replace all direct useQuery(api.queries.listContractors, ...) calls
 * with this hook — Convex deduplicates subscriptions with the same args,
 * so even without a context layer this reduces network overhead significantly.
 */
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

export function useProjectContractors(projectId: Id<'projects'> | null | undefined) {
  const contractors = useQuery(
    api.queries.listContractors,
    projectId ? { projectId } : 'skip',
  );

  return contractors ?? [];
}
