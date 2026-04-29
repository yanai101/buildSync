import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

type Role = 'owner' | 'manager' | 'inspector' | 'contractor';

export function useRequireRole(allowed: ReadonlyArray<Role>) {
  const identity = useQuery(api.users.currentIdentity, {});
  const loading = identity === undefined;
  
  let role = identity?.role as Role | undefined;

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
