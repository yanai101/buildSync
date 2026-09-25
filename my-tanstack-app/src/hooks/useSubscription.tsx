import { useCurrentProject } from './useCurrentProject';

/**
 * Returns subscription tier info for the current user, or falls back to
 * the project owner's subscription tier if they are an invited team member.
 */
export function useSubscription() {
  const { subscription } = useCurrentProject();
  return subscription;
}
