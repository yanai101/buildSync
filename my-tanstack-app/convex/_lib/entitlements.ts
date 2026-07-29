// Single source of truth for what each subscription tier unlocks.
// Pure TypeScript (no Convex imports) so both the Convex backend and the
// React client import the same map — UI gating and server enforcement can
// never drift apart.

export type Tier = 'free' | 'pro' | 'premium';

export interface Capabilities {
  /** Max projects a user may OWN. Number.POSITIVE_INFINITY means unlimited. */
  maxOwnedProjects: number;
  boq: boolean;
  team: boolean;
  analytics: boolean;
  dailyLogs: boolean;
  orders: boolean;
  aiAssistant: boolean;
  /** Download a complete archive of an owned project. */
  projectExport: boolean;
  /** Browse contractor recommendations; Pro additionally unlocks identity/contact. */
  contractorReviews: boolean;
}

export const TIER_CAPABILITIES: Record<Tier, Capabilities> = {
  free: {
    maxOwnedProjects: 1,
    boq: false,
    team: false,
    analytics: false,
    dailyLogs: false,
    orders: false,
    aiAssistant: false,
    projectExport: false,
    contractorReviews: false,
  },
  pro: {
    maxOwnedProjects: Number.POSITIVE_INFINITY,
    boq: true,
    team: true,
    analytics: true,
    dailyLogs: true,
    orders: true,
    aiAssistant: false,
    projectExport: true,
    contractorReviews: true,
  },
  premium: {
    maxOwnedProjects: Number.POSITIVE_INFINITY,
    boq: true,
    team: true,
    analytics: true,
    dailyLogs: true,
    orders: true,
    aiAssistant: true,
    projectExport: true,
    contractorReviews: true,
  },
};

type UserLike = {
  subscriptionTier?: string | null;
  subscriptionExpiresAt?: number | null;
  isSuperAdmin?: boolean | null;
};

/**
 * Resolves the tier a user is *actively* entitled to right now: super-admins
 * are always premium, expired paid subscriptions fall back to free, and any
 * unrecognized value is treated as free.
 */
export function getActiveTier(user: UserLike | null | undefined, now: number = Date.now()): Tier {
  if (!user) return 'free';
  if (user.isSuperAdmin) return 'premium';
  const expired = user.subscriptionExpiresAt ? now > user.subscriptionExpiresAt : false;
  if (expired) return 'free';
  const tier = user.subscriptionTier;
  return tier === 'pro' || tier === 'premium' ? tier : 'free';
}

export function capabilitiesFor(tier: Tier): Capabilities {
  return TIER_CAPABILITIES[tier];
}

export function tierAllows(tier: Tier, feature: keyof Omit<Capabilities, 'maxOwnedProjects'>): boolean {
  return TIER_CAPABILITIES[tier][feature];
}

/** Stable error code the client can detect to show the upgrade modal. */
export const PROJECT_LIMIT_ERROR = 'FREE_PROJECT_LIMIT';
