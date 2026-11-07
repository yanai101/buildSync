/**
 * Authorization tests for the 14 public functions that were found with NO
 * authentication at all and have now been guarded.
 *
 * Each had a verified hole: any caller holding a project id could read or write
 * that project. These tests pin the guard so the hole cannot reopen — the
 * static sweep in _test/publicFunctionAuth.test.ts proves a guard is PRESENT,
 * while these prove it actually refuses the wrong caller.
 */
import { convexTest } from 'convex-test';
import { describe, test, expect } from 'vitest';
import schema from './schema';
import { api } from './_generated/api';
import { seedProject } from './_test/factories';

const modules = import.meta.glob('./**/*.ts');

describe('updateBudgetTotal follows the budget-view model, not owner-only', () => {
  const setBudget = (t: any, who: string | null, s: any, budgetTotal: number) => {
    const caller = who ? t.withIdentity({ subject: who }) : t;
    return caller.mutation(api.projects.updateBudgetTotal, { projectId: s.projectId, budgetTotal });
  };

  test('the manager and inspector CAN edit it by default', async () => {
    // /budget is reachable by useRequireRole(['owner','manager']) and
    // canUserViewBudget allows manager and inspector unless the owner turns it
    // off. An owner-only guard here would break the manager's budget screen —
    // it did, before this test existed.
    const t = convexTest(schema, modules);
    const s = await seedProject(t, { budgetTotal: 100 });

    await setBudget(t, s.managerId, s, 200);
    expect((await t.run((ctx) => ctx.db.get(s.projectId)))!.budgetTotal).toBe(200);

    await setBudget(t, s.inspectorId, s, 300);
    expect((await t.run((ctx) => ctx.db.get(s.projectId)))!.budgetTotal).toBe(300);
  });

  test('the owner can revoke the manager\'s budget access, and then it is refused', async () => {
    const t = convexTest(schema, modules);
    const s = await seedProject(t, { budgetTotal: 100 });
    await t.run((ctx) => ctx.db.patch(s.projectId, { managerCanViewBudget: false }));

    await expect(setBudget(t, s.managerId, s, 999_999)).rejects.toThrow();
    expect((await t.run((ctx) => ctx.db.get(s.projectId)))!.budgetTotal).toBe(100);
  });

  test('a contractor and an outsider are always refused', async () => {
    const t = convexTest(schema, modules);
    const s = await seedProject(t, { budgetTotal: 100 });
    await expect(setBudget(t, s.contractorUserId, s, 999_999)).rejects.toThrow();
    await expect(setBudget(t, s.outsiderId, s, 999_999)).rejects.toThrow();
    await expect(setBudget(t, null, s, 999_999)).rejects.toThrow();
    expect((await t.run((ctx) => ctx.db.get(s.projectId)))!.budgetTotal).toBe(100);
  });

  test('the owner can always edit it', async () => {
    const t = convexTest(schema, modules);
    const s = await seedProject(t, { budgetTotal: 100 });
    await setBudget(t, s.ownerId, s, 250_000);
    expect((await t.run((ctx) => ctx.db.get(s.projectId)))!.budgetTotal).toBe(250_000);
  });
});

describe('saveProjectSetup is owner-or-manager, and budget is separate', () => {
  const setup = (t: any, who: string, s: any, extra: Record<string, unknown> = {}) =>
    t.withIdentity({ subject: who }).mutation(api.projects.saveProjectSetup, {
      projectId: s.projectId, name: 'שם', address: 'כתובת', floors: 1, rooms: [], ...extra,
    });

  test('the project manager CAN save setup', async () => {
    // /setup is useRequireRole(['owner','manager']), so an owner-only guard
    // broke the manager here too.
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    await setup(t, s.managerId, s, { name: 'שונה בידי מנהל' });
    expect((await t.run((ctx) => ctx.db.get(s.projectId)))!.name).toBe('שונה בידי מנהל');
  });

  test('the inspector and a contractor cannot', async () => {
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    await expect(setup(t, s.inspectorId, s)).rejects.toThrow();
    await expect(setup(t, s.contractorUserId, s)).rejects.toThrow();
    await expect(setup(t, s.outsiderId, s)).rejects.toThrow();
  });

  test('a manager without budget access cannot slip budgetTotal through setup', async () => {
    // setup accepts an optional budgetTotal. A manager whose budget access was
    // revoked may still edit the rest of setup, but that field is dropped.
    const t = convexTest(schema, modules);
    const s = await seedProject(t, { budgetTotal: 1_000 });
    await t.run((ctx) => ctx.db.patch(s.projectId, { managerCanViewBudget: false }));

    await setup(t, s.managerId, s, { name: 'מותר', budgetTotal: 999_999 });

    const project = await t.run((ctx) => ctx.db.get(s.projectId));
    expect(project!.name).toBe('מותר');
    expect(project!.budgetTotal).toBe(1_000);
  });

  test('a manager WITH budget access may set budgetTotal through setup', async () => {
    const t = convexTest(schema, modules);
    const s = await seedProject(t, { budgetTotal: 1_000 });
    await setup(t, s.managerId, s, { budgetTotal: 7_500 });
    expect((await t.run((ctx) => ctx.db.get(s.projectId)))!.budgetTotal).toBe(7_500);
  });
});

describe('owner-only writes reject members and outsiders', () => {

  test('backfillStageContractors is owner-only', async () => {
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    await expect(
      t.withIdentity({ subject: s.managerId }).mutation(
        api.stages.backfillStageContractors, { projectId: s.projectId },
      ),
    ).rejects.toThrow();
  });
});

describe('member-only reads reject outsiders', () => {
  const cases = [
    ['projects.getWithDetails', (t: any, id: any) => t.query(api.projects.getWithDetails, { projectId: id })],
    ['projects.getOwnerSubscription', (t: any, id: any) => t.query(api.projects.getOwnerSubscription, { projectId: id })],
    ['checklists.list', (t: any, id: any) => t.query(api.checklists.list, { projectId: id })],
    ['dashboard.getOverview', (t: any, id: any) => t.query(api.dashboard.getOverview, { projectId: id })],
    ['quotes.listTopics', (t: any, id: any) => t.query(api.quotes.listTopics, { projectId: id })],
  ] as const;

  for (const [name, call] of cases) {
    test(`${name} refuses an outsider and an unauthenticated caller`, async () => {
      const t = convexTest(schema, modules);
      const s = await seedProject(t);
      await expect(call(t.withIdentity({ subject: s.outsiderId }), s.projectId)).rejects.toThrow();
      await expect(call(t, s.projectId)).rejects.toThrow(/Not authenticated/);
      // A member still gets through.
      await expect(call(t.withIdentity({ subject: s.ownerId }), s.projectId)).resolves.toBeDefined();
    });
  }

  test('quotes.listTopics still works with no projectId at all', async () => {
    // projectId is optional there; without one it returns only builtin topics,
    // which are not project data, so it must NOT require membership.
    const t = convexTest(schema, modules);
    await expect(t.query(api.quotes.listTopics, {})).resolves.toBeDefined();
  });
});

describe('member-only writes reject outsiders', () => {
  test('checklists.addChecklist', async () => {
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    await expect(
      t.withIdentity({ subject: s.outsiderId }).mutation(api.checklists.addChecklist, {
        projectId: s.projectId, title: 'זר', items: ['x'],
      }),
    ).rejects.toThrow();
    expect(await t.run((ctx) => ctx.db.query('checklists').collect())).toHaveLength(0);
  });

  test('mutations.createContractor', async () => {
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    const before = (await t.run((ctx) => ctx.db.query('contractors').collect())).length;
    await expect(
      t.withIdentity({ subject: s.outsiderId }).mutation(api.mutations.createContractor, {
        projectId: s.projectId, name: 'זר', role: 'קבלן שלד', budget: 1, avatarColor: '#fff',
      }),
    ).rejects.toThrow();
    expect(await t.run((ctx) => ctx.db.query('contractors').collect())).toHaveLength(before);
  });

  test('dashboard.seedAlert and deleteAllAlerts', async () => {
    const t = convexTest(schema, modules);
    const s = await seedProject(t);
    await expect(
      t.withIdentity({ subject: s.outsiderId }).mutation(api.dashboard.seedAlert, { projectId: s.projectId }),
    ).rejects.toThrow();
    await expect(
      t.withIdentity({ subject: s.outsiderId }).mutation(api.dashboard.deleteAllAlerts, { projectId: s.projectId }),
    ).rejects.toThrow();
  });
});

describe('dashboard.getOverview redacts financial data server-side', () => {
  test('a contractor, who defaults to no budget access, receives zeroes', async () => {
    const t = convexTest(schema, modules);
    const s = await seedProject(t, { budgetTotal: 400_000, spent: 50_000 });

    const asContractor = await t
      .withIdentity({ subject: s.contractorUserId })
      .query(api.dashboard.getOverview, { projectId: s.projectId });

    expect(asContractor!.canViewBudget).toBe(false);
    expect(asContractor!.stats.totalBudget).toBe(0);
    expect(asContractor!.stats.totalSpent).toBe(0);
    expect(asContractor!.stats.remainingBudget).toBe(0);
    expect(asContractor!.project.budgetTotal).toBe(0);
    expect(asContractor!.topOverruns).toEqual([]);
    // Non-financial content still comes through — this is redaction, not denial.
    expect(asContractor!.project.name).toBeDefined();
  });

  test('the owner receives the real figures', async () => {
    const t = convexTest(schema, modules);
    const s = await seedProject(t, { budgetTotal: 400_000 });

    const asOwner = await t
      .withIdentity({ subject: s.ownerId })
      .query(api.dashboard.getOverview, { projectId: s.projectId });

    expect(asOwner!.canViewBudget).toBe(true);
    expect(asOwner!.stats.totalBudget).toBe(400_000);
    expect(asOwner!.project.budgetTotal).toBe(400_000);
  });

  test('a contractor granted canViewBudget sees the figures', async () => {
    const t = convexTest(schema, modules);
    const s = await seedProject(t, { budgetTotal: 400_000 });
    await t.run((ctx) => ctx.db.patch(s.contractorId, { canViewBudget: true }));

    const asContractor = await t
      .withIdentity({ subject: s.contractorUserId })
      .query(api.dashboard.getOverview, { projectId: s.projectId });

    expect(asContractor!.canViewBudget).toBe(true);
    expect(asContractor!.stats.totalBudget).toBe(400_000);
  });
});
