/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, test, expect } from 'vitest';
import schema from './schema';
import { api } from './_generated/api';

const modules = import.meta.glob('./**/*.ts');

async function setupProjectWithStage(t: ReturnType<typeof convexTest>) {
  const ownerId = await t.run((ctx) => ctx.db.insert('users', { name: 'בעלים', role: 'owner' }));
  const outsiderId = await t.run((ctx) => ctx.db.insert('users', { name: 'זר', role: 'owner' }));
  const projectId = await t.run((ctx) => ctx.db.insert('projects', { name: 'פרויקט', ownerUserId: ownerId }));
  const stageId = await t.run((ctx) => ctx.db.insert('stages', {
    projectId,
    sortOrder: 0,
    name: 'שלב',
    status: 'in_progress',
    progressPct: 0,
    startDate: '2026-01-01',
    endDate: '2026-02-01',
    payment: { amount: 1000, status: 'pending' },
  }));
  return { ownerId, outsiderId, projectId, stageId };
}

describe('stage payment mutation authorization', () => {
  test('requestStagePaymentReview rejects a non-member', async () => {
    const t = convexTest(schema, modules);
    const { outsiderId, stageId } = await setupProjectWithStage(t);

    await expect(
      t.withIdentity({ subject: outsiderId }).mutation(api.stages.requestStagePaymentReview, { stageId }),
    ).rejects.toThrow();

    // The stage's payment status is untouched.
    const stage = await t.run((ctx) => ctx.db.get(stageId));
    expect(stage?.payment.status).toBe('pending');
  });

  test('requestStagePaymentReview rejects an unauthenticated caller', async () => {
    const t = convexTest(schema, modules);
    const { stageId } = await setupProjectWithStage(t);

    await expect(
      t.mutation(api.stages.requestStagePaymentReview, { stageId }),
    ).rejects.toThrow();
  });

  test('requestStagePaymentReview succeeds for a project member', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, stageId } = await setupProjectWithStage(t);

    await t.withIdentity({ subject: ownerId }).mutation(api.stages.requestStagePaymentReview, { stageId });

    const stage = await t.run((ctx) => ctx.db.get(stageId));
    expect(stage?.payment.status).toBe('review_requested');
  });

  test('setStageSupervisorApproval records the authenticated user, not a client value', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, outsiderId, stageId } = await setupProjectWithStage(t);

    // Non-member can't approve.
    await expect(
      t.withIdentity({ subject: outsiderId }).mutation(api.stages.setStageSupervisorApproval, { stageId }),
    ).rejects.toThrow();

    await t.withIdentity({ subject: ownerId }).mutation(api.stages.setStageSupervisorApproval, { stageId });

    const stage = await t.run((ctx) => ctx.db.get(stageId));
    expect(stage?.supervisorApprovalBy).toBe('בעלים');
    expect(stage?.supervisorApprovalAt).toBeTruthy();
  });
});
