import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export function useSubscription() {
  const user = useQuery(api.users.me, {});

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
    isSuperAdmin: !!user.isSuperAdmin
  };
}
