import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

type Role = 'owner' | 'manager' | 'inspector' | 'contractor';

export function useRequireRole(allowed: ReadonlyArray<Role>) {
  const identity = useQuery(api.users.currentIdentity, {});
  const loading = identity === undefined;
  const role = identity?.role as Role | undefined;
  const allowedSet = new Set<Role>(allowed);
  const allowedFlag = !!role && allowedSet.has(role);
  return { loading, allowed: allowedFlag, role: role ?? null };
}
