/**
 * The access-control chokepoint for ~49 tables. AGENTS.md requires role
 * boundaries to hold HERE, at the query level, not merely in the UI — so this
 * is the single most load-bearing test in the suite.
 *
 * Shape: every exported guard × every actor. Written as a matrix so a new guard
 * or a changed default is impossible to add silently.
 */
import { convexTest } from 'convex-test';
import { describe, test, expect } from 'vitest';
import schema from '../schema';
import {
  requireProjectMember,
  requireProjectFileUser,
  requireProjectFileManager,
  requireProjectOwner,
  canUserViewBudget,
  requireProjectBudgetView,
  canUserViewSchedule,
  requireProjectScheduleView,
  requireProjectFeature,
  canUserViewPlans,
} from './projectAccess';
import { seedProject, makeContractor } from '../_test/factories';

const modules = import.meta.glob('../**/*.ts');

/** Runs `fn` as the given user and reports whether it was allowed. */
const asUser = async (
  t: ReturnType<typeof convexTest>,
  userId: string | null,
  fn: (ctx: any, projectId: any) => Promise<unknown>,
  projectId: any,
): Promise<boolean> => {
  const ident = userId ? t.withIdentity({ subject: userId }) : t;
  try {
    const result = await ident.run(async (ctx) => fn(ctx, projectId));
    // Two shapes: can* helpers return a boolean; require* helpers return an
    // object (or nothing) and throw when they deny.
    return typeof result === 'boolean' ? result : true;
  } catch {
    return false;
  }
};

describe('requireProjectMember', () => {
  test('admits every project role and the super admin', async () => {
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    for (const [label, id] of [
      ['owner', s.ownerId], ['manager', s.managerId], ['inspector', s.inspectorId],
      ['linked contractor', s.contractorUserId], ['super admin', s.superAdminId],
    ] as const) {
      expect(await asUser(t, id, requireProjectMember, s.projectId), label).toBe(true);
    }
  });

  test('rejects an outsider and an unauthenticated caller', async () => {
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    expect(await asUser(t, s.outsiderId, requireProjectMember, s.projectId)).toBe(false);
    expect(await asUser(t, null, requireProjectMember, s.projectId)).toBe(false);
  });

  test('rejects a contractor linked to a DIFFERENT project', async () => {
    const t = convexTest(schema, modules);
    const a = await seedProject(t);
    const b = await seedProject(t);
    // b's contractor must not reach a.
    expect(await asUser(t, b.contractorUserId, requireProjectMember, a.projectId)).toBe(false);
  });

  test('rejects everyone when the project does not exist', async () => {
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    const ghost = await t.run(async (ctx) => {
      const id = await ctx.db.insert('projects', (await ctx.db.get(s.projectId))!);
      await ctx.db.delete(id);
      return id;
    });
    expect(await asUser(t, s.ownerId, requireProjectMember, ghost)).toBe(false);
  });
});

describe('requireProjectOwner', () => {
  test('only the owner and the super admin pass', async () => {
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    expect(await asUser(t, s.ownerId, requireProjectOwner, s.projectId)).toBe(true);
    expect(await asUser(t, s.superAdminId, requireProjectOwner, s.projectId)).toBe(true);
    for (const id of [s.managerId, s.inspectorId, s.contractorUserId, s.outsiderId]) {
      expect(await asUser(t, id, requireProjectOwner, s.projectId)).toBe(false);
    }
    expect(await asUser(t, null, requireProjectOwner, s.projectId)).toBe(false);
  });
});

describe('requireProjectFileUser', () => {
  test('admits every member, rejects outsiders', async () => {
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    for (const id of [s.ownerId, s.managerId, s.inspectorId, s.contractorUserId, s.superAdminId]) {
      expect(await asUser(t, id, requireProjectFileUser, s.projectId)).toBe(true);
    }
    expect(await asUser(t, s.outsiderId, requireProjectFileUser, s.projectId)).toBe(false);
    expect(await asUser(t, null, requireProjectFileUser, s.projectId)).toBe(false);
  });
});

describe('requireProjectFileManager', () => {
  test('project owner and project manager may manage files', async () => {
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    expect(await asUser(t, s.ownerId, requireProjectFileManager, s.projectId)).toBe(true);
    expect(await asUser(t, s.managerId, requireProjectFileManager, s.projectId)).toBe(true);
    expect(await asUser(t, s.superAdminId, requireProjectFileManager, s.projectId)).toBe(true);
  });

  test('the inspector passes only because of their global role, not the project', async () => {
    // hasManagerRole checks user.role === 'owner' || 'manager' INDEPENDENTLY of
    // the project. seedProject gives the inspector role 'inspector', so they
    // are refused — but a user whose global role is 'owner' and who is merely
    // the inspector on this project WOULD pass. Pinned because that is a
    // surprising widening of the guard.
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    expect(await asUser(t, s.inspectorId, requireProjectFileManager, s.projectId)).toBe(false);

    await t.run(async (ctx) => ctx.db.patch(s.inspectorId, { role: 'owner' }));
    expect(await asUser(t, s.inspectorId, requireProjectFileManager, s.projectId)).toBe(true);
  });

  test('a linked contractor cannot manage files', async () => {
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    expect(await asUser(t, s.contractorUserId, requireProjectFileManager, s.projectId)).toBe(false);
  });
});

describe('canUserViewBudget — manager and inspector default ALLOW, contractor defaults DENY', () => {
  test('owner and super admin always true', async () => {
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    expect(await asUser(t, s.ownerId, canUserViewBudget, s.projectId)).toBe(true);
    expect(await asUser(t, s.superAdminId, canUserViewBudget, s.projectId)).toBe(true);
  });

  test('manager: allowed unless explicitly set to false', async () => {
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    expect(await asUser(t, s.managerId, canUserViewBudget, s.projectId)).toBe(true);
    await t.run(async (ctx) => ctx.db.patch(s.projectId, { managerCanViewBudget: false }));
    expect(await asUser(t, s.managerId, canUserViewBudget, s.projectId)).toBe(false);
  });

  test('inspector: allowed unless explicitly set to false', async () => {
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    expect(await asUser(t, s.inspectorId, canUserViewBudget, s.projectId)).toBe(true);
    await t.run(async (ctx) => ctx.db.patch(s.projectId, { inspectorCanViewBudget: false }));
    expect(await asUser(t, s.inspectorId, canUserViewBudget, s.projectId)).toBe(false);
  });

  test('contractor: DENIED by default, needs canViewBudget === true', async () => {
    // Note the asymmetry with manager/inspector: this is `=== true`, not
    // `!== false`. Financial data must be opt-in for contractors.
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    expect(await asUser(t, s.contractorUserId, canUserViewBudget, s.projectId)).toBe(false);
    await t.run(async (ctx) => ctx.db.patch(s.contractorId, { canViewBudget: true }));
    expect(await asUser(t, s.contractorUserId, canUserViewBudget, s.projectId)).toBe(true);
  });

  test('outsider and unauthenticated are false, never throwing', async () => {
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    expect(await asUser(t, s.outsiderId, canUserViewBudget, s.projectId)).toBe(false);
    expect(await asUser(t, null, canUserViewBudget, s.projectId)).toBe(false);
  });

  test('requireProjectBudgetView throws exactly where canUserViewBudget is false', async () => {
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    expect(await asUser(t, s.ownerId, requireProjectBudgetView, s.projectId)).toBe(true);
    expect(await asUser(t, s.contractorUserId, requireProjectBudgetView, s.projectId)).toBe(false);
    expect(await asUser(t, s.outsiderId, requireProjectBudgetView, s.projectId)).toBe(false);
  });
});

describe('canUserViewSchedule — contractor defaults ALLOW', () => {
  test('contractor: ALLOWED by default, unlike budget and plans', async () => {
    // `!== false` here, while budget and plans use `=== true`. The three guards
    // disagree on the contractor default, which is exactly the kind of thing a
    // refactor flattens by accident.
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    expect(await asUser(t, s.contractorUserId, canUserViewSchedule, s.projectId)).toBe(true);
    await t.run(async (ctx) => ctx.db.patch(s.contractorId, { canViewSchedule: false }));
    expect(await asUser(t, s.contractorUserId, canUserViewSchedule, s.projectId)).toBe(false);
  });

  test('manager and inspector default allow', async () => {
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    expect(await asUser(t, s.managerId, canUserViewSchedule, s.projectId)).toBe(true);
    expect(await asUser(t, s.inspectorId, canUserViewSchedule, s.projectId)).toBe(true);
    await t.run(async (ctx) => ctx.db.patch(s.projectId, {
      managerCanViewSchedule: false, inspectorCanViewSchedule: false,
    }));
    expect(await asUser(t, s.managerId, canUserViewSchedule, s.projectId)).toBe(false);
    expect(await asUser(t, s.inspectorId, canUserViewSchedule, s.projectId)).toBe(false);
  });

  test('outsider false; requireProjectScheduleView agrees', async () => {
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    expect(await asUser(t, s.outsiderId, canUserViewSchedule, s.projectId)).toBe(false);
    expect(await asUser(t, s.outsiderId, requireProjectScheduleView, s.projectId)).toBe(false);
    expect(await asUser(t, s.contractorUserId, requireProjectScheduleView, s.projectId)).toBe(true);
  });
});

describe('canUserViewPlans — contractor defaults DENY', () => {
  test('contractor must be explicitly granted', async () => {
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    expect(await asUser(t, s.contractorUserId, canUserViewPlans, s.projectId)).toBe(false);
    await t.run(async (ctx) => ctx.db.patch(s.contractorId, { canViewPlans: true }));
    expect(await asUser(t, s.contractorUserId, canUserViewPlans, s.projectId)).toBe(true);
  });

  test('manager and inspector default allow; owner and super admin always true', async () => {
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    expect(await asUser(t, s.ownerId, canUserViewPlans, s.projectId)).toBe(true);
    expect(await asUser(t, s.superAdminId, canUserViewPlans, s.projectId)).toBe(true);
    expect(await asUser(t, s.managerId, canUserViewPlans, s.projectId)).toBe(true);
    expect(await asUser(t, s.inspectorId, canUserViewPlans, s.projectId)).toBe(true);
    await t.run(async (ctx) => ctx.db.patch(s.projectId, { managerCanViewPlans: false }));
    expect(await asUser(t, s.managerId, canUserViewPlans, s.projectId)).toBe(false);
  });
});

describe('the three contractor defaults disagree, on purpose', () => {
  test('budget DENY, schedule ALLOW, plans DENY for an ungranted contractor', async () => {
    // One test that states the whole asymmetry in a single place, so flattening
    // any one of them to match the others fails loudly here.
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    expect({
      budget: await asUser(t, s.contractorUserId, canUserViewBudget, s.projectId),
      schedule: await asUser(t, s.contractorUserId, canUserViewSchedule, s.projectId),
      plans: await asUser(t, s.contractorUserId, canUserViewPlans, s.projectId),
    }).toEqual({ budget: false, schedule: true, plans: false });
  });
});

describe('requireProjectFeature — gates on the OWNER\'s tier, not the caller\'s', () => {
  const asTier = async (t: ReturnType<typeof convexTest>, s: any, who: string, feature: any) =>
    asUser(t, who, (ctx, projectId) => requireProjectFeature(ctx, projectId, feature), s.projectId);

  test('a free owner blocks a paid feature for everyone, including the super admin', async () => {
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    expect(await asTier(t, s, s.ownerId, 'boq')).toBe(false);
    expect(await asTier(t, s, s.superAdminId, 'boq')).toBe(false);
  });

  test('upgrading the OWNER unlocks it for a member who is themselves free', async () => {
    // This is the non-obvious rule: the caller's own subscription is irrelevant.
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    await t.run(async (ctx) => ctx.db.patch(s.ownerId, { subscriptionTier: 'pro' }));
    expect(await asTier(t, s, s.managerId, 'boq')).toBe(true);
    expect(await asTier(t, s, s.contractorUserId, 'boq')).toBe(true);
  });

  test('a paid CALLER does not unlock a free owner\'s project', async () => {
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    await t.run(async (ctx) => ctx.db.patch(s.managerId, { subscriptionTier: 'premium' }));
    expect(await asTier(t, s, s.managerId, 'boq')).toBe(false);
  });

  test('an expired owner subscription re-locks the feature', async () => {
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    await t.run(async (ctx) => ctx.db.patch(s.ownerId, {
      subscriptionTier: 'pro', subscriptionExpiresAt: Date.now() - 1000,
    }));
    expect(await asTier(t, s, s.ownerId, 'boq')).toBe(false);
  });

  test('a super-admin OWNER unlocks everything, including premium-only features', async () => {
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    await t.run(async (ctx) => ctx.db.patch(s.ownerId, { isSuperAdmin: true }));
    expect(await asTier(t, s, s.ownerId, 'boq')).toBe(true);
    expect(await asTier(t, s, s.ownerId, 'aiAssistant')).toBe(true);
  });

  test('pro unlocks roomArchive but NOT aiAssistant; premium unlocks both', async () => {
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    await t.run(async (ctx) => ctx.db.patch(s.ownerId, { subscriptionTier: 'pro' }));
    expect(await asTier(t, s, s.ownerId, 'roomArchive')).toBe(true);
    expect(await asTier(t, s, s.ownerId, 'aiAssistant')).toBe(false);
    await t.run(async (ctx) => ctx.db.patch(s.ownerId, { subscriptionTier: 'premium' }));
    expect(await asTier(t, s, s.ownerId, 'aiAssistant')).toBe(true);
  });

  test('throws when the project has no owner at all', async () => {
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    await t.run(async (ctx) => ctx.db.patch(s.projectId, { ownerUserId: undefined }));
    expect(await asTier(t, s, s.superAdminId, 'boq')).toBe(false);
  });

  test('does NOT require membership — it is a tier gate, not an access gate', async () => {
    // An outsider passes requireProjectFeature on a paid project. That is by
    // design (callers pair it with a membership guard), and pinning it makes
    // the division of responsibility explicit: using this alone does not
    // protect data.
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    await t.run(async (ctx) => ctx.db.patch(s.ownerId, { subscriptionTier: 'pro' }));
    expect(await asTier(t, s, s.outsiderId, 'boq')).toBe(true);
  });
});
