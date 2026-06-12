import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useCurrentProject } from './useCurrentProject';
import { getActiveTier } from '../../convex/_lib/entitlements';

/**
 * Returns subscription tier info for the current user, or falls back to
 * the project owner's subscription tier if they are an invited team member.
 */
export function useSubscription() {
  const { user, project } = useCurrentProject();

  const isLoaded = user !== undefined;

  // Retrieve current project owner's subscription status
  const ownerSubscription = useQuery(
    api.projects.getOwnerSubscription,
    project?._id ? { projectId: project._id } : 'skip'
  );

  if (!user) {
    return { isLoaded, tier: 'free', isProOrPremium: false, isPremium: false, isSuperAdmin: false };
  }

  // Resolve the caller's own active tier via the shared entitlements helper so
  // the client and the Convex backend never disagree (super-admin => premium,
  // expired paid plans => free).
  const selfActiveTier = getActiveTier(user);
  const selfProOrPremium = selfActiveTier !== 'free';

  // The active tier of the context is the user's tier, or if they are invited, the owner's tier
  const activeTier = selfProOrPremium ? selfActiveTier : (ownerSubscription?.tier || 'free');

  const isProOrPremium = selfProOrPremium || !!ownerSubscription?.isProOrPremium;
  const isPremium = activeTier === 'premium';

  return {
    isLoaded: isLoaded && (project?._id ? ownerSubscription !== undefined : true),
    tier: activeTier,
    isProOrPremium,
    isSelfProOrPremium: selfProOrPremium,
    isPremium,
    isSuperAdmin: !!user.isSuperAdmin,
  };
}
