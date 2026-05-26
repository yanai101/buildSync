import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useCurrentProject } from './useCurrentProject';

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

  const isExpired = user.subscriptionExpiresAt ? Date.now() > user.subscriptionExpiresAt : false;

  const tier = user.subscriptionTier || 'free';

  // If their explicit subscription expired, fallback to free tier.
  // SuperAdmins always have premium access.
  const selfActiveTier = user.isSuperAdmin ? 'premium' : (isExpired ? 'free' : tier);
  const selfProOrPremium = selfActiveTier === 'pro' || selfActiveTier === 'premium';

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
