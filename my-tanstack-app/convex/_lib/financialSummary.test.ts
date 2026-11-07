/**
 * Money. Wrong numbers here are the most expensive class of bug in this
 * product, and `committed` in particular has a branch that is easy to break.
 */
import { convexTest } from 'convex-test';
import { describe, test, expect } from 'vitest';
import schema from '../schema';
import { getFinancialSummary } from './financialSummary';
import {
  seedProject,
  makeContractor,
  makeExpense,
  makeBudgetCategory,
  makeMilestone,
} from '../_test/factories';

const modules = import.meta.glob('../**/*.ts');

const summarise = async (t: ReturnType<typeof convexTest>, projectId: any) =>
  t.run(async (ctx) => {
    const project = await ctx.db.get(projectId);
    return getFinancialSummary(ctx, project as any);
  });

describe('totalBudget', () => {
  test('prefers the project budget over the sum of categories', async () => {
    const t = convexTest(schema, modules);
    const { projectId } = await seedProject(t, { budgetTotal: 500_000 });
    await t.run(async (ctx) => {
      await ctx.db.insert('budgetCategories', makeBudgetCategory(projectId, { budget: 100 }));
      await ctx.db.insert('budgetCategories', makeBudgetCategory(projectId, { budget: 200, sortOrder: 1 }));
    });

    const s = await summarise(t, projectId);
    expect(s.totalBudget).toBe(500_000);
    expect(s.projectBudget).toBe(500_000);
    expect(s.categoryBudget).toBe(300);
    expect(s.isProjectBudgetDefined).toBe(true);
  });

  test('falls back to the category sum when the project budget is zero', async () => {
    const t = convexTest(schema, modules);
    const { projectId } = await seedProject(t, { budgetTotal: 0 });
    await t.run(async (ctx) => {
      await ctx.db.insert('budgetCategories', makeBudgetCategory(projectId, { budget: 1_500 }));
      await ctx.db.insert('budgetCategories', makeBudgetCategory(projectId, { budget: 2_500, sortOrder: 1 }));
    });

    const s = await summarise(t, projectId);
    expect(s.totalBudget).toBe(4_000);
    expect(s.isProjectBudgetDefined).toBe(false);
  });

  test('is zero when neither is set', async () => {
    const t = convexTest(schema, modules);
    const { projectId } = await seedProject(t, { budgetTotal: 0 });
    const s = await summarise(t, projectId);
    expect(s.totalBudget).toBe(0);
    expect(s.categoryBudget).toBe(0);
    expect(s.isProjectBudgetDefined).toBe(false);
  });
});

describe('totalSpent', () => {
  test('counts only expenses whose status is the Hebrew literal "שולם"', async () => {
    // The filter is a string comparison against 'שולם' (paid). A typo, an
    // encoding change or a renamed status silently zeroes out spending, so the
    // literal is pinned here deliberately.
    const t = convexTest(schema, modules);
    const { projectId } = await seedProject(t, { budgetTotal: 100_000 });
    await t.run(async (ctx) => {
      await ctx.db.insert('expenses', makeExpense(projectId, { amount: 1_000, status: 'שולם' }));
      await ctx.db.insert('expenses', makeExpense(projectId, { amount: 2_000, status: 'שולם' }));
      await ctx.db.insert('expenses', makeExpense(projectId, { amount: 9_999, status: 'ממתין' }));
    });

    const s = await summarise(t, projectId);
    expect(s.totalSpent).toBe(3_000);
  });

  test('ignores expenses belonging to another project', async () => {
    const t = convexTest(schema, modules);
    const a = await seedProject(t, { budgetTotal: 100_000 });
    const b = await seedProject(t, { budgetTotal: 100_000 });
    await t.run(async (ctx) => {
      await ctx.db.insert('expenses', makeExpense(a.projectId, { amount: 1_000 }));
      await ctx.db.insert('expenses', makeExpense(b.projectId, { amount: 7_000 }));
    });

    expect((await summarise(t, a.projectId)).totalSpent).toBe(1_000);
    expect((await summarise(t, b.projectId)).totalSpent).toBe(7_000);
  });
});

describe('committed', () => {
  test('with milestones: sums the UNPAID ones only', async () => {
    const t = convexTest(schema, modules);
    const { projectId } = await seedProject(t, { budgetTotal: 100_000 });
    await t.run(async (ctx) => {
      const c = await ctx.db.insert('contractors', makeContractor(projectId, { budget: 50_000, paid: 10_000 }));
      await ctx.db.insert('contractorPaymentMilestones', makeMilestone(c, { amount: 10_000, paid: true }));
      await ctx.db.insert('contractorPaymentMilestones', makeMilestone(c, { amount: 15_000, paid: false, sortOrder: 1 }));
      await ctx.db.insert('contractorPaymentMilestones', makeMilestone(c, { amount: 5_000, paid: false, sortOrder: 2 }));
    });

    const s = await summarise(t, projectId);
    // 15k + 5k unpaid. The contractor's budget/paid fields are IGNORED once
    // milestones exist — that is the branch worth pinning.
    expect(s.committed).toBe(20_000);
  });

  test('without milestones: falls back to budget minus paid', async () => {
    const t = convexTest(schema, modules);
    const { projectId } = await seedProject(t, { budgetTotal: 100_000 });
    await t.run(async (ctx) => {
      await ctx.db.insert('contractors', makeContractor(projectId, { budget: 40_000, paid: 15_000 }));
    });

    expect((await summarise(t, projectId)).committed).toBe(25_000);
  });

  test('clamps the fallback at zero when a contractor is overpaid', async () => {
    const t = convexTest(schema, modules);
    const { projectId } = await seedProject(t, { budgetTotal: 100_000 });
    await t.run(async (ctx) => {
      await ctx.db.insert('contractors', makeContractor(projectId, { budget: 10_000, paid: 25_000 }));
    });

    // Math.max(0, ...): without it an overpaid contractor would REDUCE the
    // committed total and inflate the remaining budget.
    expect((await summarise(t, projectId)).committed).toBe(0);
  });

  test('sums across contractors, mixing both branches', async () => {
    const t = convexTest(schema, modules);
    const { projectId } = await seedProject(t, { budgetTotal: 100_000 });
    await t.run(async (ctx) => {
      const withMilestones = await ctx.db.insert(
        'contractors',
        makeContractor(projectId, { name: 'עם אבני דרך', budget: 99_999, paid: 0 }),
      );
      await ctx.db.insert('contractorPaymentMilestones', makeMilestone(withMilestones, { amount: 7_000, paid: false }));
      await ctx.db.insert('contractors', makeContractor(projectId, { name: 'בלי', budget: 3_000, paid: 1_000 }));
    });

    expect((await summarise(t, projectId)).committed).toBe(9_000);
  });

  test('a contractor with only paid milestones commits nothing', async () => {
    const t = convexTest(schema, modules);
    const { projectId } = await seedProject(t, { budgetTotal: 100_000 });
    await t.run(async (ctx) => {
      const c = await ctx.db.insert('contractors', makeContractor(projectId, { budget: 50_000, paid: 50_000 }));
      await ctx.db.insert('contractorPaymentMilestones', makeMilestone(c, { amount: 50_000, paid: true }));
    });

    expect((await summarise(t, projectId)).committed).toBe(0);
  });
});

describe('remainingBudget', () => {
  test('is budget minus spent minus committed', async () => {
    const t = convexTest(schema, modules);
    const { projectId } = await seedProject(t, { budgetTotal: 100_000 });
    await t.run(async (ctx) => {
      await ctx.db.insert('expenses', makeExpense(projectId, { amount: 20_000, status: 'שולם' }));
      await ctx.db.insert('contractors', makeContractor(projectId, { budget: 30_000, paid: 0 }));
    });

    const s = await summarise(t, projectId);
    expect(s.remainingBudget).toBe(50_000);
    expect(s.remainingBudget).toBe(s.totalBudget - s.totalSpent - s.committed);
  });

  test('may go negative when the project is overcommitted', async () => {
    // Not clamped, deliberately: the UI needs to show an overrun.
    const t = convexTest(schema, modules);
    const { projectId } = await seedProject(t, { budgetTotal: 10_000 });
    await t.run(async (ctx) => {
      await ctx.db.insert('expenses', makeExpense(projectId, { amount: 8_000, status: 'שולם' }));
      await ctx.db.insert('contractors', makeContractor(projectId, { budget: 9_000, paid: 0 }));
    });

    expect((await summarise(t, projectId)).remainingBudget).toBe(-7_000);
  });

  test('an empty project is all zeroes', async () => {
    const t = convexTest(schema, modules);
    const { projectId } = await seedProject(t, { budgetTotal: 0 });
    const s = await summarise(t, projectId);
    expect(s).toMatchObject({
      totalBudget: 0, projectBudget: 0, categoryBudget: 0,
      totalSpent: 0, committed: 0, remainingBudget: 0,
      isProjectBudgetDefined: false,
    });
  });
});
