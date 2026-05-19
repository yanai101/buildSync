import { useCurrentProject } from './useCurrentProject';

/**
 * Returns subscription tier info for the current user.
 * Reads `user` from the shared ProjectProvider context — no additional
 * api.users.me subscription is created here.
 */
export function useSubscription() {
  const { user } = useCurrentProject();

  const isLoaded = user !== undefined;

  if (!user) {
    return { isLoaded, tier: 'free', isProOrPremium: false, isPremium: false, isSuperAdmin: false };
  }

  const isExpired = user.subscriptionExpiresAt ? Date.now() > user.subscriptionExpiresAt : false;

  const tier = user.subscriptionTier || 'free';

  // If their explicit subscription expired, fallback to free tier.
  // SuperAdmins always have premium access.
  const activeTier = user.isSuperAdmin ? 'premium' : (isExpired ? 'free' : tier);

  const isProOrPremium = activeTier === 'pro' || activeTier === 'premium';
  const isPremium = activeTier === 'premium';

  return {
    isLoaded,
    tier: activeTier,
    isProOrPremium,
    isPremium,
    isSuperAdmin: !!user.isSuperAdmin,
  };
}
