/**
 * Proves the subscription-related refactors changed NO behaviour.
 *
 * Two call sites had re-derived the active tier by hand and now call
 * getActiveTier: convex/invitations.ts (the inspector limit on a free project)
 * and convex/projects.ts:getOwnerSubscription (what the client's subscription
 * context is built from). Both consume the result the same way, as
 * `activeTier === 'pro' || activeTier === 'premium'`.
 *
 * The old formula is replicated here as an oracle and asserted to agree with
 * the new code across the whole user matrix, so this is an equivalence proof
 * rather than an assurance.
 */
import { convexTest } from 'convex-test';
import { describe, test, expect } from 'vitest';
import schema from './schema';
import { api } from './_generated/api';
import { getActiveTier } from './_lib/entitlements';
import { seedProject } from './_test/factories';

const modules = import.meta.glob('./**/*.ts');

/** The exact logic both call sites used before the refactor. */
function oldInlineIsProOrPremium(
  owner: { subscriptionTier?: string; subscriptionExpiresAt?: number; isSuperAdmin?: boolean },
  now: number,
): boolean {
  const isExpired = owner.subscriptionExpiresAt ? now > owner.subscriptionExpiresAt : false;
  const tier = owner.subscriptionTier || 'free';
  const activeTier = owner.isSuperAdmin ? 'premium' : isExpired ? 'free' : tier;
  return activeTier === 'pro' || activeTier === 'premium';
}

const NOW = 1_800_000_000_000;

const USER_MATRIX = [
  { label: 'no tier at all', user: {} },
  { label: 'explicitly free', user: { subscriptionTier: 'free' } },
  { label: 'pro, no expiry', user: { subscriptionTier: 'pro' } },
  { label: 'premium, no expiry', user: { subscriptionTier: 'premium' } },
  { label: 'pro, live', user: { subscriptionTier: 'pro', subscriptionExpiresAt: NOW + 86_400_000 } },
  { label: 'pro, expired', user: { subscriptionTier: 'pro', subscriptionExpiresAt: NOW - 1 } },
  { label: 'premium, expired', user: { subscriptionTier: 'premium', subscriptionExpiresAt: NOW - 1 } },
  { label: 'pro, expiring exactly now', user: { subscriptionTier: 'pro', subscriptionExpiresAt: NOW } },
  { label: 'pro, expiry 0 (falsy)', user: { subscriptionTier: 'pro', subscriptionExpiresAt: 0 } },
  { label: 'super admin, free', user: { isSuperAdmin: true, subscriptionTier: 'free' } },
  { label: 'super admin, no tier', user: { isSuperAdmin: true } },
  { label: 'super admin, expired pro', user: { isSuperAdmin: true, subscriptionTier: 'pro', subscriptionExpiresAt: NOW - 1 } },
  { label: 'isSuperAdmin false, pro', user: { isSuperAdmin: false, subscriptionTier: 'pro' } },
] as const;

describe('getActiveTier is equivalent to the old inline derivation', () => {
  for (const { label, user } of USER_MATRIX) {
    test(`${label}: isProOrPremium matches`, () => {
      const tier = getActiveTier(user as any, NOW);
      const now = tier === 'pro' || tier === 'premium';
      expect(now, label).toBe(oldInlineIsProOrPremium(user as any, NOW));
    });
  }

  test('the one divergence is an unrecognised tier string, which cannot occur', () => {
    // The old formula passed an unknown value straight through; getActiveTier
    // normalises it to 'free'. Both still yield isProOrPremium === false, and
    // the schema's subscriptionTier union makes such a value unstorable anyway.
    const odd = { subscriptionTier: 'enterprise' } as any;
    expect(getActiveTier(odd, NOW)).toBe('free');
    expect(oldInlineIsProOrPremium(odd, NOW)).toBe(false);
  });
});

describe('projects.getOwnerSubscription reports the OWNER\'s tier', () => {
  const ask = async (patch: Record<string, unknown>) => {
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    if (Object.keys(patch).length) await t.run((ctx) => ctx.db.patch(s.ownerId, patch));
    return t.withIdentity({ subject: s.ownerId }).query(api.projects.getOwnerSubscription, {
      projectId: s.projectId,
    });
  };

  test('a free owner', async () => {
    expect(await ask({})).toEqual({ tier: 'free', isProOrPremium: false });
  });

  test('a pro owner', async () => {
    expect(await ask({ subscriptionTier: 'pro' })).toEqual({ tier: 'pro', isProOrPremium: true });
  });

  test('a premium owner', async () => {
    expect(await ask({ subscriptionTier: 'premium' })).toEqual({ tier: 'premium', isProOrPremium: true });
  });

  test('an expired pro owner falls back to free', async () => {
    expect(await ask({ subscriptionTier: 'pro', subscriptionExpiresAt: Date.now() - 1000 })).toEqual({
      tier: 'free', isProOrPremium: false,
    });
  });

  test('a super-admin owner is premium even with no subscription', async () => {
    expect(await ask({ isSuperAdmin: true })).toEqual({ tier: 'premium', isProOrPremium: true });
  });

  test('a non-owner MEMBER sees the owner\'s tier, not their own', async () => {
    // This is what drives feature gating for invited team members: a free
    // manager on a pro owner's project must be reported as pro.
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    await t.run((ctx) => ctx.db.patch(s.ownerId, { subscriptionTier: 'pro' }));
    await t.run((ctx) => ctx.db.patch(s.managerId, { subscriptionTier: 'free' }));

    expect(
      await t.withIdentity({ subject: s.managerId }).query(api.projects.getOwnerSubscription, {
        projectId: s.projectId,
      }),
    ).toEqual({ tier: 'pro', isProOrPremium: true });
  });

  test('a project with no owner reports free rather than throwing', async () => {
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    await t.run((ctx) => ctx.db.patch(s.projectId, { ownerUserId: undefined }));
    expect(
      await t.withIdentity({ subject: s.superAdminId }).query(api.projects.getOwnerSubscription, {
        projectId: s.projectId,
      }),
    ).toEqual({ tier: 'free', isProOrPremium: false });
  });
});
