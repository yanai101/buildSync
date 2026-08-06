/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import schema from './schema';
import { api } from './_generated/api';

const modules = import.meta.glob('./**/*.ts');

async function setup(t: ReturnType<typeof convexTest>) {
  const ownerId = await t.run((ctx) => ctx.db.insert('users', {
    name: 'בעלים',
    role: 'owner',
    subscriptionTier: 'pro',
    subscriptionExpiresAt: Date.now() + 24 * 60 * 60 * 1000,
  }));
  const otherOwnerId = await t.run((ctx) => ctx.db.insert('users', { name: 'בעלים אחר', role: 'owner' }));
  const projectId = await t.run((ctx) => ctx.db.insert('projects', {
    name: 'פרויקט א', address: 'רחוב א', ownerUserId: ownerId,
    startDate: '2026-01-01', expectedEnd: '2026-12-31', progressPct: 0, budgetTotal: 0, spent: 0,
  }));
  const otherProjectId = await t.run((ctx) => ctx.db.insert('projects', {
    name: 'פרויקט ב', address: 'רחוב ב', ownerUserId: otherOwnerId,
    startDate: '2026-01-01', expectedEnd: '2026-12-31', progressPct: 0, budgetTotal: 0, spent: 0,
  }));
  return { ownerId, otherOwnerId, projectId, otherProjectId };
}

const insertArchiveFile = async (t: ReturnType<typeof convexTest>, fields: Record<string, unknown>) => {
  const storageId = await t.run((ctx) =>
    ctx.storage.store(new Blob(['compressed archive fixture'])),
  );
  return t.run((ctx) => ctx.db.insert('personalFiles', {
      ownerUserId: fields.ownerUserId as any,
      ...(fields.projectId ? { projectId: fields.projectId as any } : {}),
      storageId,
      originalName: fields.originalName as string,
      storedName: `${fields.originalName}.gz`,
      originalMimeType: (fields.originalMimeType as string) ?? 'application/pdf',
      originalSize: 100,
      storedSize: 50,
      note: 'הערת קובץ',
      uploadedAt: Date.now(),
    }));
};

describe('personal project archive scoping', () => {
  test('lists only the personal files attached to the requested owned project', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, projectId, otherProjectId } = await setup(t);
    await insertArchiveFile(t, { ownerUserId: ownerId, projectId, originalName: 'פרויקט-א.pdf' });
    await insertArchiveFile(t, { ownerUserId: ownerId, projectId: otherProjectId, originalName: 'פרויקט-ב.pdf' });
    await insertArchiveFile(t, { ownerUserId: ownerId, originalName: 'קובץ-ישן.pdf' });

    const files = await t.withIdentity({ subject: ownerId }).query(
      api.personalFiles.listMyPersonalFiles,
      { projectId },
    );

    expect(files.map((file) => file.originalName)).toEqual(['פרויקט-א.pdf']);
  });

  test('does not allow a user without permissions to read project archive', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, otherProjectId } = await setup(t);

    await expect(
      t.withIdentity({ subject: ownerId }).query(api.personalFiles.listMyPersonalFiles, { projectId: otherProjectId }),
    ).rejects.toThrow('אין לך הרשאה לגשת לארכיון פרויקט זה');
  });

  test('allows manager with permissions on Pro project to access archive', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, projectId } = await setup(t);
    const managerId = await t.run((ctx) => ctx.db.insert('users', { name: 'מנהל עבודה', role: 'manager' }));
    
    // Assign manager to project with photo permissions
    await t.run((ctx) => ctx.db.patch(projectId, {
      managerUserId: managerId,
      managerCanViewArchivePhotos: true,
      managerCanViewArchiveDocs: false,
    }));

    await insertArchiveFile(t, { ownerUserId: ownerId, projectId, originalName: 'תמונה.jpg', originalMimeType: 'image/jpeg' });
    await insertArchiveFile(t, { ownerUserId: ownerId, projectId, originalName: 'מסמך.pdf', originalMimeType: 'application/pdf' });

    const perms = await t.withIdentity({ subject: managerId }).query(
      api.personalFiles.getArchivePermissions,
      { projectId },
    );
    expect(perms).toEqual({
      isOwner: false,
      isProOrPremium: true,
      canPhotos: true,
      canDocs: false,
      role: 'manager',
    });

    const files = await t.withIdentity({ subject: managerId }).query(
      api.personalFiles.listMyPersonalFiles,
      { projectId },
    );
    // Manager only has photos permission, so only photos are returned
    expect(files.map((f) => f.originalName)).toEqual(['תמונה.jpg']);
  });

  test('blocks manager when project owner has free subscription', async () => {
    const t = convexTest(schema, modules);
    const freeOwnerId = await t.run((ctx) => ctx.db.insert('users', {
      name: 'בעלים חינם',
      role: 'owner',
      subscriptionTier: 'free',
    }));
    const managerId = await t.run((ctx) => ctx.db.insert('users', { name: 'מנהל עבודה', role: 'manager' }));
    const freeProjectId = await t.run((ctx) => ctx.db.insert('projects', {
      name: 'פרויקט חינם', address: 'רחוב', ownerUserId: freeOwnerId, managerUserId: managerId,
      managerCanViewArchivePhotos: true,
      startDate: '2026-01-01', expectedEnd: '2026-12-31', progressPct: 0, budgetTotal: 0, spent: 0,
    }));

    await expect(
      t.withIdentity({ subject: managerId }).query(api.personalFiles.listMyPersonalFiles, { projectId: freeProjectId }),
    ).rejects.toThrow('הארכיון זמין רק כאשר בעל הפרויקט הוא בעל מנוי Pro או Premium');
  });

  test('non-owner cannot delete files from archive', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, projectId } = await setup(t);
    const managerId = await t.run((ctx) => ctx.db.insert('users', { name: 'מנהל עבודה', role: 'manager' }));
    await t.run((ctx) => ctx.db.patch(projectId, {
      managerUserId: managerId,
      managerCanViewArchivePhotos: true,
    }));

    const fileId = await insertArchiveFile(t, { ownerUserId: ownerId, projectId, originalName: 'תמונה.jpg', originalMimeType: 'image/jpeg' });

    await expect(
      t.withIdentity({ subject: managerId }).mutation(api.personalFiles.deletePersonalFile, { fileId }),
    ).rejects.toThrow('רק בעל הפרויקט רשאי למחוק קבצים מהארכיון');
  });

  test('exports only the active project archive, not project files from elsewhere', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, projectId, otherProjectId } = await setup(t);
    await insertArchiveFile(t, { ownerUserId: ownerId, projectId, originalName: 'ארכיון-נוכחי.pdf' });
    await insertArchiveFile(t, { ownerUserId: ownerId, projectId: otherProjectId, originalName: 'ארכיון-אחר.pdf' });

    const manifest = await t.withIdentity({ subject: ownerId }).query(
      api.projectExport.generateExportManifest,
      {
        projectId,
        sections: {
          dailyLogs: false, photos: false, stages: false, contractors: false,
          documents: true, permits: false, budget: false, boq: false,
          orders: false, checklists: false, timeline: false, activityFeed: false,
          priceQuotes: false,
        },
      },
    );

    expect(manifest.personalFiles.map((file) => file.originalName)).toEqual(['ארכיון-נוכחי.pdf']);
  });
});
