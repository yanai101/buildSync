import { useQuery } from 'convex/react';

import { api } from '../../convex/_generated/api';
import { useCurrentProject } from './useCurrentProject';

export function useDashboardOverview() {
  const { projectId } = useCurrentProject();
  const overview = useQuery(
    api.dashboard.getOverview,
    projectId ? { projectId } : 'skip',
  );

  return {
    projectId,
    overview,
    isPending: projectId ? overview === undefined : false,
  };
}
