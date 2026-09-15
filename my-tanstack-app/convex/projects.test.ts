/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import schema from './schema';
import { api } from './_generated/api';

const modules = import.meta.glob('./**/*.ts');

async function setupProject(t: ReturnType<typeof convexTest>) {
  const ownerId = await t.run((ctx) =>
    ctx.db.insert('users', { name: 'בעל הבית', role: 'owner' }),
  );
  const projectId = await t.run((ctx) =>
    ctx.db.insert('projects', {
      name: 'בית לבדיקה',
      address: 'רחוב הבדיקה 1',
      ownerUserId: ownerId,
      startDate: '2026-01-01',
      expectedEnd: '2026-12-31',
      floors: 3,
      progressPct: 0,
      budgetTotal: 0,
      spent: 0,
    }),
  );
  return { ownerId, projectId };
}

describe('saveProjectSetup room reconciliation', () => {
  test('deletes rooms that are omitted from the submitted rooms list', async () => {
    const t = convexTest(schema, modules);
    const { projectId } = await setupProject(t);

    const keptRoomId = await t.run((ctx) =>
      ctx.db.insert('projectRooms', {
        projectId,
        name: 'סלון',
        type: 'living',
        floor: 1,
        sizeSqm: 30,
        isWet: false,
        needsAc: false,
        sortOrder: 0,
      }),
    );
    const orphanedRoomId = await t.run((ctx) =>
      ctx.db.insert('projectRooms', {
        projectId,
        name: 'חדר שינה חדש',
        type: 'bedroom',
        floor: 3,
        sizeSqm: 16,
        isWet: false,
        needsAc: false,
        sortOrder: 0,
      }),
    );

    // Simulates reducing the floor count from 3 to 1: the client only
    // resends the room the user can still see/edit.
    await t.mutation(api.projects.saveProjectSetup, {
      projectId,
      name: 'בית לבדיקה',
      address: 'רחוב הבדיקה 1',
      floors: 1,
      rooms: [{ uid: keptRoomId, name: 'סלון', type: 'living', floor: 1, size: 30 }],
    });

    const kept = await t.run((ctx) => ctx.db.get(keptRoomId));
    const orphaned = await t.run((ctx) => ctx.db.get(orphanedRoomId));

    expect(kept).not.toBeNull();
    const remaining = await t.run((ctx) =>
      ctx.db
        .query('projectRooms')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .collect(),
    );
    expect(remaining.map((r) => r._id)).toEqual([keptRoomId]);
    expect(orphaned).toBeNull();
  });
});
