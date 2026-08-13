/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import schema from './schema';
import { api } from './_generated/api';

const modules = import.meta.glob('./**/*.ts');

// ─── Shared helpers ──────────────────────────────────────────────────────────

async function setupBase(t: ReturnType<typeof convexTest>) {
  const ownerId = await t.run((ctx) =>
    ctx.db.insert('users', {
      name: 'בעלים',
      role: 'owner',
      subscriptionTier: 'pro',
      subscriptionExpiresAt: Date.now() + 86_400_000,
    }),
  );
  const projectId = await t.run((ctx) =>
    ctx.db.insert('projects', {
      name: 'פרויקט בדיקה',
      address: 'רחוב 1',
      ownerUserId: ownerId,
      startDate: '2026-01-01',
      expectedEnd: '2026-12-31',
      progressPct: 0,
      budgetTotal: 500_000,
      spent: 0,
      vatPct: 17,
    }),
  );
  const contractorId = await t.run((ctx) =>
    ctx.db.insert('contractors', {
      projectId,
      name: 'קבלן ראשי',
      role: 'קבלן עד מפתח',
      budget: 200_000,
      paid: 0,
    }),
  );
  return { ownerId, projectId, contractorId };
}

async function makeStageWithTask(
  t: ReturnType<typeof convexTest>,
  projectId: any,
  contractorId: any,
  taskDone = false,
) {
  const stageId = await t.run((ctx) =>
    ctx.db.insert('stages', {
      projectId,
      name: 'שלב א',
      progressPct: taskDone ? 100 : 0,
      status: taskDone ? 'done' : 'pending',
      sortOrder: 1,
      payment: { status: 'draft', amount: 50_000 },
      icon: '📌',
    }),
  );
  const taskId = await t.run((ctx) =>
    ctx.db.insert('stageTasks', {
      stageId,
      name: 'בדיקת ביסוסים',
      done: taskDone,
      required: true,
      assignee: 'קבלן',
      sortOrder: 0,
    }),
  );
  await t.run((ctx) =>
    ctx.db.insert('stageContractors', {
      projectId,
      stageId,
      contractorId,
      roleLabel: 'קבלן ראשי',
      paymentMode: 'stage_synced',
      sortOrder: 0,
    }),
  );
  return { stageId, taskId };
}

async function makeSyncedMilestone(
  t: ReturnType<typeof convexTest>,
  contractorId: any,
  stageId: any,
  taskId: any,
  overrides: Record<string, unknown> = {},
) {
  return t.run((ctx) =>
    ctx.db.insert('contractorPaymentMilestones', {
      contractorId,
      sortOrder: 0,
      name: 'תשלום ראשון',
      triggerText: 'בדיקת ביסוסים',
      pct: 25,
      amount: 50_000,
      paid: false,
      sourceMode: 'stage_synced',
      sourceStageId: stageId,
      sourceTaskId: taskId,
      ...overrides,
    }),
  );
}

// ─── setContractorPaymentMilestonePaid ───────────────────────────────────────

describe('setContractorPaymentMilestonePaid — readiness guard', () => {
  test('throws when linked task is not done', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, projectId, contractorId } = await setupBase(t);
    const { stageId, taskId } = await makeStageWithTask(t, projectId, contractorId, false);
    const milestoneId = await makeSyncedMilestone(t, contractorId, stageId, taskId);

    await expect(
      t.withIdentity({ subject: ownerId }).mutation(
        api.mutations.setContractorPaymentMilestonePaid,
        { milestoneId: milestoneId as any, paid: true },
      ),
    ).rejects.toThrow('המשימה עדיין לא בוצעה');
  });

  test('succeeds when linked task IS done', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, projectId, contractorId } = await setupBase(t);
    const { stageId, taskId } = await makeStageWithTask(t, projectId, contractorId, true);
    const milestoneId = await makeSyncedMilestone(t, contractorId, stageId, taskId);

    await t.withIdentity({ subject: ownerId }).mutation(
      api.mutations.setContractorPaymentMilestonePaid,
      { milestoneId: milestoneId as any, paid: true, amount: 50_000 },
    );

    const milestone = await t.run((ctx) => ctx.db.get(milestoneId));
    expect(milestone?.paid).toBe(true);
    expect(milestone?.paidAt).toBeTruthy();
  });

  test('marks as paid and creates an expense entry', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, projectId, contractorId } = await setupBase(t);
    const { stageId, taskId } = await makeStageWithTask(t, projectId, contractorId, true);
    const milestoneId = await makeSyncedMilestone(t, contractorId, stageId, taskId);

    await t.withIdentity({ subject: ownerId }).mutation(
      api.mutations.setContractorPaymentMilestonePaid,
      { milestoneId: milestoneId as any, paid: true, amount: 50_000 },
    );

    const expenses = await t.run((ctx) =>
      ctx.db
        .query('expenses')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .collect(),
    );
    expect(expenses).toHaveLength(1);
    expect(expenses[0].amount).toBe(50_000);
    expect(expenses[0].milestoneId).toEqual(milestoneId);
  });

  test('custom-mode milestone can be paid without any task check', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, projectId, contractorId } = await setupBase(t);
    const milestoneId = await t.run((ctx) =>
      ctx.db.insert('contractorPaymentMilestones', {
        contractorId,
        sortOrder: 0,
        name: 'תשלום מותאם',
        triggerText: '',
        pct: 25,
        amount: 30_000,
        paid: false,
        sourceMode: 'custom',
      }),
    );

    await t.withIdentity({ subject: ownerId }).mutation(
      api.mutations.setContractorPaymentMilestonePaid,
      { milestoneId: milestoneId as any, paid: true, amount: 30_000 },
    );

    const milestone = await t.run((ctx) => ctx.db.get(milestoneId));
    expect(milestone?.paid).toBe(true);
  });
});

// ─── forceCompleteTasksAndPay ────────────────────────────────────────────────

describe('forceCompleteTasksAndPay', () => {
  test('marks the linked task as done', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, projectId, contractorId } = await setupBase(t);
    const { stageId, taskId } = await makeStageWithTask(t, projectId, contractorId, false);
    const milestoneId = await makeSyncedMilestone(t, contractorId, stageId, taskId);

    await t.withIdentity({ subject: ownerId }).mutation(
      api.mutations.forceCompleteTasksAndPay,
      { milestoneId: milestoneId as any, amount: 50_000 },
    );

    const task = await t.run((ctx) => ctx.db.get(taskId));
    expect(task?.done).toBe(true);
  });

  test('confirms payment and creates expense', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, projectId, contractorId } = await setupBase(t);
    const { stageId, taskId } = await makeStageWithTask(t, projectId, contractorId, false);
    const milestoneId = await makeSyncedMilestone(t, contractorId, stageId, taskId);

    await t.withIdentity({ subject: ownerId }).mutation(
      api.mutations.forceCompleteTasksAndPay,
      { milestoneId: milestoneId as any, amount: 50_000 },
    );

    const milestone = await t.run((ctx) => ctx.db.get(milestoneId));
    expect(milestone?.paid).toBe(true);
    expect(milestone?.paidAt).toBeTruthy();
    expect(milestone?.amount).toBe(50_000);

    const expenses = await t.run((ctx) =>
      ctx.db
        .query('expenses')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .collect(),
    );
    expect(expenses).toHaveLength(1);
    expect(expenses[0].amount).toBe(50_000);
  });

  test('adds VAT to expense when vatAdded=true', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, projectId, contractorId } = await setupBase(t);
    const { stageId, taskId } = await makeStageWithTask(t, projectId, contractorId, false);
    const milestoneId = await makeSyncedMilestone(t, contractorId, stageId, taskId);

    await t.withIdentity({ subject: ownerId }).mutation(
      api.mutations.forceCompleteTasksAndPay,
      { milestoneId: milestoneId as any, amount: 50_000, vatAdded: true },
    );

    const expenses = await t.run((ctx) =>
      ctx.db
        .query('expenses')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .collect(),
    );
    // 50,000 + 17% = 58,500
    expect(expenses[0].amount).toBe(58_500);

    const milestone = await t.run((ctx) => ctx.db.get(milestoneId));
    expect(milestone?.vatAdded).toBe(true);
    expect(milestone?.vatAmount).toBe(8_500);
  });

  test('updates stage progressPct to 100 after marking task done', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, projectId, contractorId } = await setupBase(t);
    const { stageId, taskId } = await makeStageWithTask(t, projectId, contractorId, false);
    const milestoneId = await makeSyncedMilestone(t, contractorId, stageId, taskId);

    await t.withIdentity({ subject: ownerId }).mutation(
      api.mutations.forceCompleteTasksAndPay,
      { milestoneId: milestoneId as any, amount: 50_000 },
    );

    const stage = await t.run((ctx) => ctx.db.get(stageId));
    expect(stage?.progressPct).toBe(100);
    expect(stage?.status).toBe('done');
  });

  test('updates contractor.paid total', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, projectId, contractorId } = await setupBase(t);
    const { stageId, taskId } = await makeStageWithTask(t, projectId, contractorId, false);
    const milestoneId = await makeSyncedMilestone(t, contractorId, stageId, taskId);

    await t.withIdentity({ subject: ownerId }).mutation(
      api.mutations.forceCompleteTasksAndPay,
      { milestoneId: milestoneId as any, amount: 50_000 },
    );

    const contractor = await t.run((ctx) => ctx.db.get(contractorId));
    expect(contractor?.paid).toBe(50_000);
  });

  test('does not create duplicate expense if one already exists', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, projectId, contractorId } = await setupBase(t);
    const { stageId, taskId } = await makeStageWithTask(t, projectId, contractorId, false);
    const milestoneId = await makeSyncedMilestone(t, contractorId, stageId, taskId);

    // Pre-insert an expense for this milestone
    await t.run((ctx) =>
      ctx.db.insert('expenses', {
        projectId,
        contractorId,
        milestoneId,
        description: 'קיים',
        amount: 50_000,
        expenseDate: '2026-08-01',
        status: 'שולם',
      }),
    );

    await t.withIdentity({ subject: ownerId }).mutation(
      api.mutations.forceCompleteTasksAndPay,
      { milestoneId: milestoneId as any, amount: 50_000 },
    );

    const expenses = await t.run((ctx) =>
      ctx.db
        .query('expenses')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .collect(),
    );
    expect(expenses).toHaveLength(1);
  });

  test('skips already-done tasks but still confirms payment', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, projectId, contractorId } = await setupBase(t);
    const { stageId, taskId } = await makeStageWithTask(t, projectId, contractorId, true);
    const milestoneId = await makeSyncedMilestone(t, contractorId, stageId, taskId);

    await t.withIdentity({ subject: ownerId }).mutation(
      api.mutations.forceCompleteTasksAndPay,
      { milestoneId: milestoneId as any, amount: 50_000 },
    );

    const milestone = await t.run((ctx) => ctx.db.get(milestoneId));
    expect(milestone?.paid).toBe(true);
  });
});
