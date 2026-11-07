// Single source of truth for what each subscription tier unlocks.
// Pure TypeScript (no Convex imports) so both the Convex backend and the
// React client import the same map — UI gating and server enforcement can
// never drift apart.

export type Tier = 'free' | 'pro' | 'premium';

export interface Capabilities {
  /** Max projects a user may OWN. Number.POSITIVE_INFINITY means unlimited. */
  maxOwnedProjects: number;
  /**
   * Max members on a project's team, counting the owner.
   *
   * Replaces an earlier `team: boolean` that was set false for free, which
   * contradicted the shipped behaviour — the free plan DOES get a team, capped
   * at five ("במסלול החינמי ניתן להוסיף עד 5 חברי צוות"). Nothing ever read the
   * boolean, so the contradiction never surfaced; wiring it up would have
   * removed team access from every free user.
   *
   * Enforced in the UI only, deliberately: bypassing it requires the project's
   * own OWNER to call the Convex mutation by hand to add a sixth member to
   * their own project. That is revenue leakage, not a security issue, and the
   * levers that actually drive upgrades (maxOwnedProjects, boq) ARE enforced
   * server-side. Revisit if that ever stops being true.
   */
  maxTeamMembers: number;
  boq: boolean;
  analytics: boolean;
  dailyLogs: boolean;
  orders: boolean;
  aiAssistant: boolean;
  /** Download a complete archive of an owned project. */
  projectExport: boolean;
  /** Room photo archive (photos per room, categories, notes, PDF). */
  roomArchive: boolean;
}

export const TIER_CAPABILITIES: Record<Tier, Capabilities> = {
  free: {
    maxOwnedProjects: 1,
    maxTeamMembers: 5,
    boq: false,
    analytics: false,
    dailyLogs: false,
    orders: false,
    aiAssistant: false,
    projectExport: false,
    roomArchive: false,
  },
  pro: {
    maxOwnedProjects: Number.POSITIVE_INFINITY,
    maxTeamMembers: Number.POSITIVE_INFINITY,
    boq: true,
    analytics: true,
    dailyLogs: true,
    orders: true,
    aiAssistant: false,
    projectExport: true,
    roomArchive: true,
  },
  premium: {
    maxOwnedProjects: Number.POSITIVE_INFINITY,
    maxTeamMembers: Number.POSITIVE_INFINITY,
    boq: true,
    analytics: true,
    dailyLogs: true,
    orders: true,
    aiAssistant: true,
    projectExport: true,
    roomArchive: true,
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

/**
 * The boolean, per-feature capabilities — everything except the numeric limits.
 * Using this instead of `keyof Omit<Capabilities, 'maxOwnedProjects'>` means
 * adding another numeric limit cannot silently make it passable to tierAllows.
 */
export type Feature = keyof Omit<Capabilities, 'maxOwnedProjects' | 'maxTeamMembers'>;

export function tierAllows(tier: Tier, feature: Feature): boolean {
  return TIER_CAPABILITIES[tier][feature];
}

/** Stable error code the client can detect to show the upgrade modal. */
export const PROJECT_LIMIT_ERROR = 'FREE_PROJECT_LIMIT';

/**
 * Default monthly AI request quota per tier. A super-admin can override the
 * paid-tier default globally via the 'aiMonthlyLimit' app setting, and add
 * extra requests per user via users.aiLimitOverride.
 */
export const AI_MONTHLY_LIMITS: Record<Tier, number> = {
  free: 0,
  pro: 30,
  premium: 100,
};
