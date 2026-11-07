/**
 * Cascade completeness.
 *
 * Deleting a project must not leave rows behind. This is not a coverage test:
 * it enumerates the project-scoped tables FROM THE SCHEMA, so a table added in
 * future fails here until someone decides whether the cascade should delete it.
 * That decision is the thing worth enforcing — the bug it prevents ("added a
 * table, forgot the cascade") never shows up in manual testing, only as a
 * database that quietly grows.
 *
 * Six tables were found uncovered when this was written: personalFiles and
 * projectPlans (both holding uploaded files, so their blobs leaked too),
 * quickNotes, quoteExtractions, aiQuoteCache, and aiUsageLogs.
 */
import { convexTest } from 'convex-test';
import { describe, test, expect } from 'vitest';
import schema from '../schema';
import { performProjectDeletion } from './projectDeletion';
import {
  seedProject,
  makeStage,
  makeExpense,
  makeBudgetCategory,
  makeMilestone,
  makeContractor,
} from '../_test/factories';

const modules = import.meta.glob('../**/*.ts');

/**
 * Every table whose documents belong to a project, taken from the schema rather
 * than a hand-written list.
 */
const PROJECT_SCOPED_TABLES = Object.entries(schema.tables)
  .filter(([, table]) => JSON.stringify((table as any).validator?.json ?? {}).includes('projectId'))
  .map(([name]) => name)
  .sort();

/**
 * Tables that intentionally OUTLIVE the project, each with its reason.
 *
 * aiUsageLogs is the monthly AI quota counter (convex/aiQuotes.ts reads it by
 * userId + feature + at). Deleting it with a project would let a user reset
 * their AI allowance by deleting a project, so it is keyed on the user as much
 * as the project and must survive.
 */
const INTENTIONALLY_RETAINED = ['aiUsageLogs'];

describe('project-scoped table inventory', () => {
  test('the schema scan finds a realistic number of tables', () => {
    expect(PROJECT_SCOPED_TABLES.length).toBeGreaterThan(20);
  });

  test('every retained table still exists in the schema', () => {
    for (const t of INTENTIONALLY_RETAINED) {
      expect(PROJECT_SCOPED_TABLES, `${t} is listed as retained but is not project-scoped`).toContain(t);
    }
  });
});

describe('performProjectDeletion leaves no orphans', () => {
  /** Writes at least one row into as many project-scoped tables as possible. */
  const seedEverything = async (t: ReturnType<typeof convexTest>) => {
    const s = await seedProject(t, { budgetTotal: 100_000 });
    await t.run(async (ctx) => {
      const stageId = await ctx.db.insert('stages', makeStage(s.projectId));
      await ctx.db.insert('stageTasks', { stageId, name: 'משימה', done: false, sortOrder: 0 } as any);
      await ctx.db.insert('expenses', makeExpense(s.projectId));
      await ctx.db.insert('budgetCategories', makeBudgetCategory(s.projectId));
      await ctx.db.insert('contractorPaymentMilestones', makeMilestone(s.contractorId));
      await ctx.db.insert('contractors', makeContractor(s.projectId, { name: 'שני' }));
      await ctx.db.insert('projectRooms', {
        projectId: s.projectId, name: 'סלון', type: 'living', floor: 1,
        sizeSqm: 20, isWet: false, needsAc: false, sortOrder: 0,
      } as any);

      // Files and blobs that must be cleaned:
      const blobA = await ctx.storage.store(new Blob(['personal']));
      await ctx.db.insert('personalFiles', {
        ownerUserId: s.ownerId, projectId: s.projectId, storageId: blobA,
        originalName: 'a.pdf', storedName: 'a.gz', originalMimeType: 'application/pdf',
        originalSize: 8, storedSize: 8, note: '', uploadedAt: Date.now(),
      } as any);

      const blobB = await ctx.storage.store(new Blob(['plan']));
      const blobBThumb = await ctx.storage.store(new Blob(['thumb']));
      await ctx.db.insert('projectPlans', {
        projectId: s.projectId, storageId: blobB, thumbnailStorageId: blobBThumb,
        name: 'תוכנית', uploadedAt: Date.now(),
      } as any);

      const blobPermit = await ctx.storage.store(new Blob(['permit']));
      await ctx.db.insert('permits', {
        projectId: s.projectId, title: 'היתר', status: 'in_progress', fileId: blobPermit,
      } as any);

      const blobLog = await ctx.storage.store(new Blob(['logImg']));
      await ctx.db.insert('dailyLogs', {
        projectId: s.projectId, date: '2026-11-07', status: 'draft', createdBy: s.ownerId, updatedAt: Date.now(),
        images: [{ storageId: blobLog }],
      } as any);

      const blobOrder = await ctx.storage.store(new Blob(['orderDoc']));
      await ctx.db.insert('orders', {
        projectId: s.projectId, title: 'הזמנה', status: 'pending', orderedQuantity: 1, receivedQuantity: 0,
        unit: 'יח', deliveryDocuments: [{ storageId: blobOrder, name: 'תעודה' }],
      } as any);

      await ctx.db.insert('quoteTopics', {
        projectId: s.projectId, key: 'custom_123', name: 'נושא אישי', icon: 'tag', isBuiltin: false,
      } as any);

      const quoteId = await ctx.db.insert('priceQuotes', {
        projectId: s.projectId, topicKey: 'custom_123', supplier: 'ספק', total: 1000,
        status: 'received', createdAt: '2026-11-07',
      } as any);

      await ctx.db.insert('quoteExtractions', {
        quoteId, projectId: s.projectId, extractedJson: '{}', modelUsed: 'gpt-4o', extractedAt: Date.now(),
      } as any);

      await ctx.db.insert('quickNotes', {
        userId: s.ownerId, projectId: s.projectId, text: 'פתק',
        createdAt: Date.now(), updatedAt: Date.now(),
      } as any);
      await ctx.db.insert('aiQuoteCache', {
        projectId: s.projectId, topicKey: 't', cacheKey: 'k', result: '{}', createdAt: Date.now(),
      } as any);
      await ctx.db.insert('aiUsageLogs', {
        userId: s.ownerId, projectId: s.projectId, feature: 'extract', at: Date.now(), credits: 1,
      } as any);
    });
    return s;
  };

  const rowsFor = (t: ReturnType<typeof convexTest>, table: string, projectId: string) =>
    t.run(async (ctx) => {
      const all = await ctx.db.query(table as any).collect();
      return all.filter((r: any) => r.projectId === projectId);
    });

  test('no project-scoped table keeps rows, except the ones deliberately retained', async () => {
    const t = convexTest(schema, modules);
    const s = await seedEverything(t);

    // Confirm the seed actually populated something, or this would pass vacuously.
    const seeded: string[] = [];
    for (const table of PROJECT_SCOPED_TABLES) {
      if ((await rowsFor(t, table, s.projectId)).length > 0) seeded.push(table);
    }
    expect(seeded.length, 'the seed populated nothing — the test would be vacuous').toBeGreaterThan(8);

    await t.run(async (ctx) => performProjectDeletion(ctx as any, s.projectId));

    const leftovers: string[] = [];
    for (const table of PROJECT_SCOPED_TABLES) {
      if ((await rowsFor(t, table, s.projectId)).length > 0) leftovers.push(table);
    }

    expect(
      leftovers.sort(),
      'These tables still hold rows for a deleted project. Either delete them in ' +
        'convex/_lib/projectDeletion.ts, or add them to INTENTIONALLY_RETAINED ' +
        'with a reason.',
    ).toEqual([...INTENTIONALLY_RETAINED].sort());
  });

  test('the project document itself is gone', async () => {
    const t = convexTest(schema, modules);
    const s = await seedEverything(t);
    await t.run(async (ctx) => performProjectDeletion(ctx as any, s.projectId));
    expect(await t.run(async (ctx) => ctx.db.get(s.projectId))).toBeNull();
  });

  test('uploaded file blobs are deleted, not just their rows', async () => {
    // personalFiles, projectPlans, permits, dailyLogs, and orders all hold storageIds.
    // Ensure all stored blobs belonging to the project are deleted.
    const t = convexTest(schema, modules);
    const s = await seedEverything(t);

    const before = await t.run(async (ctx) => (await ctx.db.system.query('_storage').collect()).length);
    expect(before).toBeGreaterThanOrEqual(5);

    await t.run(async (ctx) => performProjectDeletion(ctx as any, s.projectId));

    const after = await t.run(async (ctx) => (await ctx.db.system.query('_storage').collect()).length);
    expect(after, 'file blobs were orphaned').toBe(0);
  });

  test('another project is untouched', async () => {
    const t = convexTest(schema, modules);
    const victim = await seedEverything(t);
    const bystander = await seedEverything(t);

    await t.run(async (ctx) => performProjectDeletion(ctx as any, victim.projectId));

    expect(await t.run(async (ctx) => ctx.db.get(bystander.projectId))).not.toBeNull();
    const survivors: string[] = [];
    for (const table of PROJECT_SCOPED_TABLES) {
      if ((await rowsFor(t, table, bystander.projectId)).length > 0) survivors.push(table);
    }
    expect(survivors.length).toBeGreaterThan(8);
  });
});
