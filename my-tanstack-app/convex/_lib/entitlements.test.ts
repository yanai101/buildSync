/**
 * The billing contract. This module decides what every paying and non-paying
 * user may do, and it is imported by BOTH the Convex backend and the React
 * client, so a silent change here either gives away paid features or locks out
 * customers who are paying. It is pure TypeScript, so these are plain unit
 * tests with no Convex context.
 */
import { describe, test, expect } from 'vitest';
import {
  TIER_CAPABILITIES,
  AI_MONTHLY_LIMITS,
  getActiveTier,
  capabilitiesFor,
  tierAllows,
  PROJECT_LIMIT_ERROR,
  type Capabilities,
  type Tier,
} from './entitlements';

const TIERS: Tier[] = ['free', 'pro', 'premium'];
const BOOLEAN_CAPABILITIES = [
  'boq',
  'team',
  'analytics',
  'dailyLogs',
  'orders',
  'aiAssistant',
  'projectExport',
  'roomArchive',
] as const satisfies readonly (keyof Omit<Capabilities, 'maxOwnedProjects'>)[];

describe('TIER_CAPABILITIES', () => {
  test('defines every tier', () => {
    expect(Object.keys(TIER_CAPABILITIES).sort()).toEqual([...TIERS].sort());
  });

  test('the capability set is exactly these keys', () => {
    // Fails when a capability is added, which is deliberate: a new capability
    // must get a conscious decision for every tier, not inherit a default.
    for (const tier of TIERS) {
      expect(Object.keys(TIER_CAPABILITIES[tier]).sort()).toEqual(
        ['maxOwnedProjects', ...BOOLEAN_CAPABILITIES].sort(),
      );
    }
  });

  test('free unlocks nothing and is capped at one owned project', () => {
    expect(TIER_CAPABILITIES.free.maxOwnedProjects).toBe(1);
    for (const cap of BOOLEAN_CAPABILITIES) {
      expect(TIER_CAPABILITIES.free[cap], `free.${cap} must be false`).toBe(false);
    }
  });

  test('paid tiers allow unlimited owned projects', () => {
    expect(TIER_CAPABILITIES.pro.maxOwnedProjects).toBe(Number.POSITIVE_INFINITY);
    expect(TIER_CAPABILITIES.premium.maxOwnedProjects).toBe(Number.POSITIVE_INFINITY);
  });

  test('premium differs from pro ONLY in aiAssistant', () => {
    // This is the entire paid-tier ladder. If a capability is added to premium
    // without deciding about pro (or vice versa), this fails and names it.
    const differing = BOOLEAN_CAPABILITIES.filter(
      (cap) => TIER_CAPABILITIES.pro[cap] !== TIER_CAPABILITIES.premium[cap],
    );
    expect(differing).toEqual(['aiAssistant']);
    expect(TIER_CAPABILITIES.pro.aiAssistant).toBe(false);
    expect(TIER_CAPABILITIES.premium.aiAssistant).toBe(true);
  });

  test('every capability free has, the paid tiers also have', () => {
    for (const cap of BOOLEAN_CAPABILITIES) {
      if (!TIER_CAPABILITIES.free[cap]) continue;
      expect(TIER_CAPABILITIES.pro[cap], `pro must not lose ${cap}`).toBe(true);
      expect(TIER_CAPABILITIES.premium[cap], `premium must not lose ${cap}`).toBe(true);
    }
  });
});

describe('getActiveTier', () => {
  const NOW = 1_700_000_000_000;

  test('no user is free', () => {
    expect(getActiveTier(null, NOW)).toBe('free');
    expect(getActiveTier(undefined, NOW)).toBe('free');
  });

  test('an unrecognised tier string falls back to free', () => {
    expect(getActiveTier({ subscriptionTier: 'enterprise' }, NOW)).toBe('free');
    expect(getActiveTier({ subscriptionTier: '' }, NOW)).toBe('free');
    expect(getActiveTier({ subscriptionTier: null }, NOW)).toBe('free');
    expect(getActiveTier({}, NOW)).toBe('free');
  });

  test('a live paid subscription is honoured', () => {
    expect(getActiveTier({ subscriptionTier: 'pro', subscriptionExpiresAt: NOW + 1000 }, NOW)).toBe('pro');
    expect(getActiveTier({ subscriptionTier: 'premium', subscriptionExpiresAt: NOW + 1000 }, NOW)).toBe('premium');
  });

  test('an expired paid subscription drops to free', () => {
    expect(getActiveTier({ subscriptionTier: 'premium', subscriptionExpiresAt: NOW - 1 }, NOW)).toBe('free');
    expect(getActiveTier({ subscriptionTier: 'pro', subscriptionExpiresAt: NOW - 1 }, NOW)).toBe('free');
  });

  test('expiry is exclusive: the tier still holds at the exact expiry instant', () => {
    // `now > expiresAt`, so now === expiresAt is NOT expired. Pinned because
    // flipping this to >= would silently cut a subscription a moment early.
    expect(getActiveTier({ subscriptionTier: 'pro', subscriptionExpiresAt: NOW }, NOW)).toBe('pro');
    expect(getActiveTier({ subscriptionTier: 'pro', subscriptionExpiresAt: NOW }, NOW + 1)).toBe('free');
  });

  test('no expiry means it never expires', () => {
    expect(getActiveTier({ subscriptionTier: 'pro' }, NOW)).toBe('pro');
    expect(getActiveTier({ subscriptionTier: 'pro', subscriptionExpiresAt: null }, NOW)).toBe('pro');
  });

  test('expiry of 0 is treated as "no expiry", not as expired in 1970', () => {
    // The check is `user.subscriptionExpiresAt ? ... : false`, and 0 is falsy.
    // Documenting the quirk rather than asserting it is desirable: a stored 0
    // grants an unlimited paid tier.
    expect(getActiveTier({ subscriptionTier: 'premium', subscriptionExpiresAt: 0 }, NOW)).toBe('premium');
  });

  describe('super admins', () => {
    test('are premium regardless of their stored tier', () => {
      expect(getActiveTier({ isSuperAdmin: true }, NOW)).toBe('premium');
      expect(getActiveTier({ isSuperAdmin: true, subscriptionTier: 'free' }, NOW)).toBe('premium');
    });

    test('are premium even when their subscription has expired', () => {
      // The super-admin check runs BEFORE the expiry check, so an expired
      // super admin keeps full access. Pinned because reordering those two
      // branches would lock admins out of their own app.
      expect(
        getActiveTier({ isSuperAdmin: true, subscriptionTier: 'pro', subscriptionExpiresAt: NOW - 1 }, NOW),
      ).toBe('premium');
    });

    test('isSuperAdmin false or null is not special', () => {
      expect(getActiveTier({ isSuperAdmin: false, subscriptionTier: 'pro' }, NOW)).toBe('pro');
      expect(getActiveTier({ isSuperAdmin: null }, NOW)).toBe('free');
    });
  });

  test('defaults `now` to the current time', () => {
    expect(getActiveTier({ subscriptionTier: 'pro', subscriptionExpiresAt: Date.now() + 60_000 })).toBe('pro');
    expect(getActiveTier({ subscriptionTier: 'pro', subscriptionExpiresAt: Date.now() - 60_000 })).toBe('free');
  });
});

describe('capabilitiesFor and tierAllows', () => {
  test('capabilitiesFor returns that tier\'s map', () => {
    for (const tier of TIERS) expect(capabilitiesFor(tier)).toBe(TIER_CAPABILITIES[tier]);
  });

  test('tierAllows agrees with the map for every tier and capability', () => {
    for (const tier of TIERS) {
      for (const cap of BOOLEAN_CAPABILITIES) {
        expect(tierAllows(tier, cap), `${tier}.${cap}`).toBe(TIER_CAPABILITIES[tier][cap]);
      }
    }
  });

  test('free is denied every gated feature', () => {
    for (const cap of BOOLEAN_CAPABILITIES) expect(tierAllows('free', cap)).toBe(false);
  });
});

describe('AI_MONTHLY_LIMITS', () => {
  test('free gets no AI requests at all', () => {
    expect(AI_MONTHLY_LIMITS.free).toBe(0);
  });

  test('limits are defined for every tier and never decrease with tier', () => {
    expect(Object.keys(AI_MONTHLY_LIMITS).sort()).toEqual([...TIERS].sort());
    expect(AI_MONTHLY_LIMITS.free).toBeLessThanOrEqual(AI_MONTHLY_LIMITS.pro);
    expect(AI_MONTHLY_LIMITS.pro).toBeLessThanOrEqual(AI_MONTHLY_LIMITS.premium);
  });

  test('the quota, NOT the aiAssistant flag, is what actually gates AI', () => {
    // Pro has a quota of 30 while TIER_CAPABILITIES.pro.aiAssistant is false,
    // and that is not a contradiction: convex/aiQuotes.ts gates AI purely on
    // AI_MONTHLY_LIMITS, and nothing in the codebase ever reads aiAssistant.
    // Asserting the two must agree would be wrong — this documents the real
    // relationship instead.
    expect(AI_MONTHLY_LIMITS.pro).toBeGreaterThan(0);
    expect(TIER_CAPABILITIES.pro.aiAssistant).toBe(false);
  });
});

describe('PROJECT_LIMIT_ERROR', () => {
  test('is a stable string the client matches on', () => {
    // The client detects this exact code to show the upgrade modal, so changing
    // it breaks that modal silently.
    expect(PROJECT_LIMIT_ERROR).toBe('FREE_PROJECT_LIMIT');
  });
});

describe('capability enforcement coverage', () => {
  // Every declared capability should be enforced somewhere on the backend. A
  // capability set per tier but never checked is dead config: the paid feature
  // is reachable by calling the Convex function directly, which is what
  // AGENTS.md forbids ("enforce at the query level, not just the UI").
  const files = Object.entries(
    import.meta.glob('../**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>,
  ).filter(([f]) => !f.includes('_generated') && !f.endsWith('.test.ts') && !f.includes('entitlements.ts'));

  const allLines = files.flatMap(([f, code]) => code.split('\n').map((line) => ({ f, line })));

  /**
   * Capabilities with no backend check today. Each is a real gap, recorded so
   * the suite reports it instead of pretending it is fine:
   *   team        — /team is owner-gated by role, but no tier check
   *   analytics   — gated only by <FeatureTeaser> in src/routes/analytics.tsx
   *   aiAssistant — never read anywhere; AI is gated by AI_MONTHLY_LIMITS
   * Remove an entry once it is enforced; the test then fails if it is still
   * listed, which keeps the list honest in both directions.
   */
  const KNOWN_UNENFORCED = ['aiAssistant', 'analytics', 'team'] as const;

  // Line-based, because the real calls nest parens —
  // `tierAllows(getActiveTier(owner), 'roomArchive')` — which a [^)]* regex
  // cannot cross. That bug made roomArchive look unenforced when it is not.
  const isEnforced = (cap: string) =>
    allLines.some(
      ({ line }) =>
        (line.includes('requireProjectFeature') || line.includes('tierAllows')) &&
        new RegExp(`['"\`]${cap}['"\`]`).test(line),
    );

  test('finds the backend sources to scan', () => {
    expect(files.length).toBeGreaterThan(30);
  });

  test('every capability is either enforced or listed as a known gap', () => {
    const unenforced = BOOLEAN_CAPABILITIES.filter((cap) => !isEnforced(cap));
    expect(
      [...unenforced].sort(),
      'A capability is declared per tier but never checked on the backend. ' +
        'Either enforce it with requireProjectFeature/tierAllows, or add it to ' +
        'KNOWN_UNENFORCED with a reason.',
    ).toEqual([...KNOWN_UNENFORCED].sort());
  });

  test('maxOwnedProjects is enforced', () => {
    expect(allLines.some(({ line }) => line.includes('.maxOwnedProjects'))).toBe(true);
  });

  test('the active tier is derived in one place, per FUNCTION', () => {
    // Scans each exported function separately, not whole files. A file-level
    // check was used first and was too coarse: projects.ts imports
    // getActiveTier for one function, which hid an inline re-derivation inside
    // getOwnerSubscription until it was found by hand.
    const smell = /now\s*>\s*[\w?.]*subscriptionExpiresAt|subscriptionExpiresAt\s*<\s*now/;
    const offenders: string[] = [];
    for (const [file, code] of files) {
      for (const chunk of code.split(/\nexport const |\nexport function |\nexport async function /).slice(1)) {
        const name = chunk.match(/^(\w+)/)?.[1] ?? '?';
        if (smell.test(chunk) && !/getActiveTier/.test(chunk)) {
          offenders.push(`${file.replace('../', '')}:${name}`);
        }
      }
    }

    /**
     * Exceptions, each deliberate:
     *   cleanup.ts (both) — compares the date for DATA RETENTION of inactive
     *                 projects, which is not an entitlement decision.
     *   users.ts:currentIdentity — derives an expired/not-expired tier for the
     *                 client WITHOUT the super-admin rule, so a super admin is
     *                 reported with no tier while getActiveTier says premium.
     *                 A real divergence, left alone because changing this
     *                 query's response shape affects every client consumer.
     */
    const ALLOWED = [
      'cleanup.ts:getCleanupCandidates',
      'cleanup.ts:performCleanupBatch',
      'users.ts:currentIdentity',
    ];
    expect(
      offenders.sort(),
      'A function re-derives the active tier by hand instead of calling getActiveTier.',
    ).toEqual([...ALLOWED].sort());
  });
});
