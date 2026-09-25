import { useCurrentProject } from './useCurrentProject';

type Role = 'owner' | 'manager' | 'inspector' | 'contractor';

export function useRequireRole(allowed: ReadonlyArray<Role>) {
  const { project, identity, isLoading: projectLoading } = useCurrentProject();
  
  let role = project?.myRole as Role | undefined;

  // Fallback to identity role if no project is loaded
  if (!role && identity?.role) {
    role = identity.role as Role;
  }

  const loading = projectLoading || (!identity && !project);

  // DEV OVERRIDE
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    const override = localStorage.getItem('buildsync:dev-role-override');
    if (override && ['owner', 'manager', 'inspector', 'contractor'].includes(override)) {
      role = override as Role;
    }
  }

  const allowedSet = new Set<Role>(allowed);
  const allowedFlag = !!role && allowedSet.has(role);
  return { loading, allowed: allowedFlag, role: role ?? null, identity };
}
