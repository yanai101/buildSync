import { useQuery } from 'convex/react';

import { api } from '../../convex/_generated/api';
import { useCurrentProject } from './useCurrentProject';

export type ProjectBudgetSummary = {
  totalBudget: number;
  projectBudget: number;
  categoryBudget: number;
  isProjectBudgetDefined: boolean;
  totalSpent: number;
  committed: number;
  remainingBudget: number;
};

export function useProjectBudgetSummary() {
  const { projectId } = useCurrentProject();
  const summary = useQuery(
    api.budget.getSummary,
    projectId ? { projectId } : 'skip',
  ) as ProjectBudgetSummary | null | undefined;

  return {
    projectId,
    summary,
    isPending: projectId ? summary === undefined : false,
  };
}
