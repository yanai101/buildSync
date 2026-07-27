/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import schema from './schema';
import { api } from './_generated/api';

const modules = import.meta.glob('./**/*.ts');

const emptySections = {
  dailyLogs: false,
  photos: false,
  stages: false,
  contractors: false,
  documents: false,
  permits: false,
  budget: false,
  boq: false,
  orders: false,
  checklists: false,
  timeline: false,
  activityFeed: false,
  priceQuotes: false,
};

async function setupExportProject(
  t: ReturnType<typeof convexTest>,
  owner: {
    role?: 'owner' | 'manager' | 'inspector' | 'contractor';
    tier?: 'free' | 'pro' | 'premium';
    expiresAt?: number;
  } = {},
) {
  const ownerId = await t.run((ctx) =>
    ctx.db.insert('users', {
      name: 'בעל הפרויקט',
      role: owner.role ?? 'owner',
      subscriptionTier: owner.tier ?? 'pro',
      subscriptionExpiresAt: owner.expiresAt ?? Date.now() + 24 * 60 * 60 * 1000,
    }),
  );
  const projectId = await t.run((ctx) =>
    ctx.db.insert('projects', {
      name: 'פרויקט ייצוא',
      address: 'רחוב הבדיקה 1',
      ownerUserId: ownerId,
      startDate: '2026-01-01',
      expectedEnd: '2026-12-31',
      progressPct: 0,
      budgetTotal: 0,
      spent: 0,
    }),
  );

  return { ownerId, projectId };
}

const manifestFor = (t: ReturnType<typeof convexTest>, userId: string, projectId: string) =>
  t.withIdentity({ subject: userId }).query(api.projectExport.generateExportManifest, {
    projectId: projectId as any,
    sections: emptySections,
  });

describe('projectExport.generateExportManifest authorization', () => {
  test('allows the actual owner with an active Pro subscription', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, projectId } = await setupExportProject(t);

    const manifest = await manifestFor(t, ownerId, projectId);

    expect(manifest.project._id).toBe(projectId);
    expect(manifest.stages).toEqual([]);
  });

  test.each([
    ['manager', 'manager'],
    ['inspector', 'inspector'],
    ['contractor', 'contractor'],
  ] as const)('rejects a project %s even when the owner is subscribed', async (_label, role) => {
    const t = convexTest(schema, modules);
    const { projectId } = await setupExportProject(t);
    const memberId = await t.run((ctx) =>
      ctx.db.insert('users', { name: role, role }),
    );
    await t.run((ctx) =>
      ctx.db.patch(projectId, role === 'manager'
        ? { managerUserId: memberId }
        : role === 'inspector'
          ? { inspectorUserId: memberId }
          : {}),
    );
    if (role === 'contractor') {
      await t.run((ctx) => ctx.db.insert('contractors', {
        projectId,
        name: 'קבלן בפרויקט',
        userId: memberId,
      }));
    }

    await expect(manifestFor(t, memberId, projectId)).rejects.toThrow(
      'Only the project owner can perform this action',
    );
  });

  test('rejects a super-admin who is not the project owner', async () => {
    const t = convexTest(schema, modules);
    const { projectId } = await setupExportProject(t);
    const superAdminId = await t.run((ctx) =>
      ctx.db.insert('users', { name: 'תמיכה', role: 'owner', isSuperAdmin: true }),
    );

    await expect(manifestFor(t, superAdminId, projectId)).rejects.toThrow(
      'Only the project owner can export this project',
    );
  });

  test('rejects an owner whose account role is no longer owner', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, projectId } = await setupExportProject(t, { role: 'contractor' });

    await expect(manifestFor(t, ownerId, projectId)).rejects.toThrow(
      'Only the project owner can export this project',
    );
  });

  test('rejects a free owner', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, projectId } = await setupExportProject(t, { tier: 'free' });

    await expect(manifestFor(t, ownerId, projectId)).rejects.toThrow('projectExport');
  });

  test('rejects an owner whose paid subscription has expired', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, projectId } = await setupExportProject(t, {
      tier: 'pro',
      expiresAt: Date.now() - 1,
    });

    await expect(manifestFor(t, ownerId, projectId)).rejects.toThrow('projectExport');
  });
});
