import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

import { useCurrentProject } from './useCurrentProject';

type Role = 'owner' | 'manager' | 'inspector' | 'contractor';

export function useRequireRole(allowed: ReadonlyArray<Role>) {
  const { project, isLoading: projectLoading } = useCurrentProject();
  
  let role = project?.myRole as Role | undefined;

  // Fallback to global identity role if no project is loaded
  const identity = useQuery(api.users.currentIdentity, {});
  if (!role && identity?.role) {
    role = identity.role as Role;
  }

  const loading = projectLoading || (identity === undefined && !project);

  // DEV OVERRIDE
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    const override = localStorage.getItem('buildsync:dev-role-override');
    if (override && ['owner', 'manager', 'inspector', 'contractor'].includes(override)) {
      role = override as Role;
    }
  }

  const allowedSet = new Set<Role>(allowed);
  const allowedFlag = !!role && allowedSet.has(role);
  return { loading, allowed: allowedFlag, role: role ?? null };
}
