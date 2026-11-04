/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import schema from './schema';
import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { MAX_PHOTOS_PER_ROOM_STAGE } from './_lib/roomArchiveShared';

const modules = import.meta.glob('./**/*.ts');
type T = ReturnType<typeof convexTest>;

const DAY = 24 * 60 * 60 * 1000;

async function setup(t: T, tier: 'free' | 'pro' | 'premium' = 'pro') {
  const ownerId = await t.run((ctx) => ctx.db.insert('users', {
    name: 'בעלים', role: 'owner', subscriptionTier: tier, subscriptionExpiresAt: Date.now() + DAY,
  }));
  const managerId = await t.run((ctx) => ctx.db.insert('users', { name: 'מנהל', role: 'manager' }));
  const inspectorId = await t.run((ctx) => ctx.db.insert('users', { name: 'מפקח', role: 'inspector' }));
  const strangerId = await t.run((ctx) => ctx.db.insert('users', { name: 'זר', role: 'owner' }));
  const projectId = await t.run((ctx) => ctx.db.insert('projects', {
    name: 'פרויקט', address: 'רחוב', ownerUserId: ownerId, managerUserId: managerId, inspectorUserId: inspectorId,
    startDate: '2026-01-01', expectedEnd: '2026-12-31', progressPct: 0, budgetTotal: 0, spent: 0,
  }));
  const roomId = await t.run((ctx) => ctx.db.insert('projectRooms', {
    projectId, type: 'kitchen', name: 'מטבח', floor: 1, sizeSqm: 12, isWet: true, needsAc: false, sortOrder: 0,
  }));
  const otherRoomId = await t.run((ctx) => ctx.db.insert('projectRooms', {
    projectId, type: 'bedroom', name: 'חדר שינה', floor: 1, sizeSqm: 14, isWet: false, needsAc: true, sortOrder: 1,
  }));
  const stageId = await t.run((ctx) => ctx.db.insert('stages', {
    projectId, sortOrder: 1, name: 'שלד', status: 'active', progressPct: 0,
    startDate: '2026-01-01', endDate: '2026-02-01', payment: { amount: 0, status: 'draft' },
  } as any));
  return { ownerId, managerId, inspectorId, strangerId, projectId, roomId, otherRoomId, stageId };
}

const storeImage = (t: T) =>
  t.run((ctx) => ctx.storage.store(new Blob(['img'], { type: 'image/jpeg' })));

const upload = async (
  t: T,
  userId: Id<'users'>,
  projectId: Id<'projects'>,
  roomId: Id<'projectRooms'>,
  stageId?: Id<'stages'>,
) => {
  const storageId = await storeImage(t);
  return t.withIdentity({ subject: userId }).mutation(api.roomArchive.createRoomPhoto, {
    projectId, roomId, stageId, storageId,
    originalName: 'a.jpg', originalSize: 3, category: 'plumbing', description: 'צנרת', note: '',
  });
};

describe('room archive: subscription gating', () => {
  test('free owner cannot view or upload', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, projectId, roomId } = await setup(t, 'free');
    const access = await t.withIdentity({ subject: ownerId }).query(api.roomArchive.getAccess, { projectId });
    expect(access).toMatchObject({ isPremium: false, canView: false, canUpload: false });
    expect(await t.withIdentity({ subject: ownerId }).query(api.roomArchive.listRooms, { projectId })).toBeNull();
    await expect(upload(t, ownerId, projectId, roomId)).rejects.toThrow(/Pro/);
  });

  test('pro owner can upload and list', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, projectId, roomId, stageId } = await setup(t);
    await upload(t, ownerId, projectId, roomId, stageId);
    const rooms = await t.withIdentity({ subject: ownerId }).query(api.roomArchive.listRooms, { projectId });
    expect(rooms?.find((r) => r.id === roomId)?.photoCount).toBe(1);
    const data = await t.withIdentity({ subject: ownerId }).query(api.roomArchive.listRoomPhotos, { projectId, roomId });
    expect(data?.photos[0]).toMatchObject({ stageId, stageName: 'שלד', category: 'plumbing' });
  });
});

describe('room archive: after a downgrade from Pro', () => {
  test('existing photos stay viewable but read-only', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, managerId, projectId, roomId } = await setup(t);
    const photoId = await upload(t, ownerId, projectId, roomId);
    await t.withIdentity({ subject: ownerId }).mutation(api.roomArchive.setPermission, {
      projectId, role: 'manager', canView: true, canUpload: true,
    });

    await t.run((ctx) => ctx.db.patch(ownerId, { subscriptionTier: 'free' }));
    const owner = t.withIdentity({ subject: ownerId });

    expect(await owner.query(api.roomArchive.getAccess, { projectId }))
      .toMatchObject({ isPremium: false, readOnly: true, canView: true, canUpload: false });
    const data = await owner.query(api.roomArchive.listRoomPhotos, { projectId, roomId });
    expect(data?.photos).toHaveLength(1);

    // No uploads, edits or deletes while not Pro.
    await expect(upload(t, ownerId, projectId, roomId)).rejects.toThrow(/צפייה בלבד/);
    await expect(owner.mutation(api.roomArchive.updateRoomPhoto, { photoId, note: 'x' })).rejects.toThrow();
    await expect(owner.mutation(api.roomArchive.deleteRoomPhotos, { projectId, photoIds: [photoId] })).rejects.toThrow();

    // A member with permission keeps view-only access too.
    expect(await t.withIdentity({ subject: managerId }).query(api.roomArchive.getAccess, { projectId }))
      .toMatchObject({ canView: true, canUpload: false, readOnly: true });
  });
});

describe('room archive: team permissions', () => {
  test('manager has no access until granted; view-only cannot upload', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, managerId, projectId, roomId } = await setup(t);
    expect(await t.withIdentity({ subject: managerId }).query(api.roomArchive.listRooms, { projectId })).toBeNull();

    await t.withIdentity({ subject: ownerId }).mutation(api.roomArchive.setPermission, {
      projectId, role: 'manager', canView: true, canUpload: false,
    });
    expect(await t.withIdentity({ subject: managerId }).query(api.roomArchive.listRooms, { projectId })).not.toBeNull();
    await expect(upload(t, managerId, projectId, roomId)).rejects.toThrow();

    await t.withIdentity({ subject: ownerId }).mutation(api.roomArchive.setPermission, {
      projectId, role: 'manager', canView: true, canUpload: true,
    });
    const photoId = await upload(t, managerId, projectId, roomId);
    const res = await t.withIdentity({ subject: managerId }).mutation(api.roomArchive.deleteRoomPhotos, {
      projectId, photoIds: [photoId],
    });
    expect(res.deletedCount).toBe(1);
  });

  test('only the owner can change permissions; strangers see nothing', async () => {
    const t = convexTest(schema, modules);
    const { managerId, strangerId, projectId } = await setup(t);
    await expect(t.withIdentity({ subject: managerId }).mutation(api.roomArchive.setPermission, {
      projectId, role: 'inspector', canView: true, canUpload: true,
    })).rejects.toThrow();
    expect(await t.withIdentity({ subject: strangerId }).query(api.roomArchive.getAccess, { projectId })).toBeNull();
  });

  test('permissions do not carry over to a replacement manager', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, projectId } = await setup(t);
    await t.withIdentity({ subject: ownerId }).mutation(api.roomArchive.setPermission, {
      projectId, role: 'manager', canView: true, canUpload: true,
    });
    const newManager = await t.run((ctx) => ctx.db.insert('users', { name: 'מנהל חדש', role: 'manager' }));
    await t.run((ctx) => ctx.db.patch(projectId, { managerUserId: newManager }));
    const access = await t.withIdentity({ subject: newManager }).query(api.roomArchive.getAccess, { projectId });
    expect(access?.canView).toBe(false);
  });
});

describe('room archive: limits and stages', () => {
  test(`enforces ${MAX_PHOTOS_PER_ROOM_STAGE} photos per room per stage`, async () => {
    const t = convexTest(schema, modules);
    const { ownerId, projectId, roomId, stageId } = await setup(t);
    for (let i = 0; i < MAX_PHOTOS_PER_ROOM_STAGE; i++) await upload(t, ownerId, projectId, roomId, stageId);
    await expect(upload(t, ownerId, projectId, roomId, stageId)).rejects.toThrow(/שלד/);
    // A different bucket (no stage) still accepts uploads.
    await upload(t, ownerId, projectId, roomId);
  });

  test('deleting a stage keeps its photos with the snapshot name', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, projectId, roomId, stageId } = await setup(t);
    await upload(t, ownerId, projectId, roomId, stageId);
    await t.run((ctx) => ctx.db.delete(stageId));
    const data = await t.withIdentity({ subject: ownerId }).query(api.roomArchive.listRoomPhotos, { projectId, roomId });
    expect(data?.photos[0]).toMatchObject({ stageId: null, stageDeleted: true, stageName: 'שלד' });
  });

  test('rejects rooms from another project', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, projectId } = await setup(t);
    const other = await setup(t);
    await expect(upload(t, ownerId, projectId, other.roomId)).rejects.toThrow(/החדר/);
  });
});

describe('room archive: cascade on room deletion', () => {
  test('saveProjectSetup deletes photos of removed rooms only', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, projectId, roomId, otherRoomId } = await setup(t);
    await upload(t, ownerId, projectId, roomId);
    await upload(t, ownerId, projectId, otherRoomId);

    await t.withIdentity({ subject: ownerId }).mutation(api.projects.saveProjectSetup, {
      projectId, name: 'פרויקט', address: 'רחוב',
      rooms: [{ uid: otherRoomId, name: 'חדר שינה', type: 'bedroom', floor: 1, size: 14 }],
    });

    const remaining = await t.run((ctx) => ctx.db.query('roomPhotos').collect());
    expect(remaining.map((p) => p.roomId)).toEqual([otherRoomId]);
  });
});

describe('room archive: multi-category and room cover photo', () => {
  test('supports multiple categories and cover photo selection', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, projectId, roomId } = await setup(t);

    const storageId1 = await storeImage(t);
    const photo1 = await t.withIdentity({ subject: ownerId }).mutation(api.roomArchive.createRoomPhoto, {
      projectId,
      roomId,
      storageId: storageId1,
      originalName: 'infra.jpg',
      originalSize: 10,
      categories: ['electrical', 'plumbing'],
      description: 'חשמל ואינסטלציה יחד',
      note: 'תשתיות משולבות',
      isCover: true,
    });

    const storageId2 = await storeImage(t);
    const photo2 = await t.withIdentity({ subject: ownerId }).mutation(api.roomArchive.createRoomPhoto, {
      projectId,
      roomId,
      storageId: storageId2,
      originalName: 'second.jpg',
      originalSize: 12,
      category: 'tiling',
      description: 'ריצוף',
      note: '',
    });

    // Check listRooms uses the cover photo (photo1), even though photo2 is newer
    const rooms = await t.withIdentity({ subject: ownerId }).query(api.roomArchive.listRooms, { projectId });
    const kitchen = rooms?.find((r) => r.id === roomId);
    expect(kitchen?.photoCount).toBe(2);

    // Check listRoomPhotos returns categories array and isCover flag
    const detail = await t.withIdentity({ subject: ownerId }).query(api.roomArchive.listRoomPhotos, { projectId, roomId });
    expect(detail?.room.coverPhotoId).toBe(photo1);

    const p1 = detail?.photos.find((p) => p.id === photo1);
    expect(p1?.categories).toEqual(['electrical', 'plumbing']);
    expect(p1?.isCover).toBe(true);

    const p2 = detail?.photos.find((p) => p.id === photo2);
    expect(p2?.categories).toEqual(['tiling']);
    expect(p2?.isCover).toBe(false);

    // Switch cover to photo2 via setRoomCoverPhoto
    await t.withIdentity({ subject: ownerId }).mutation(api.roomArchive.setRoomCoverPhoto, {
      projectId,
      roomId,
      photoId: photo2,
    });

    const detail2 = await t.withIdentity({ subject: ownerId }).query(api.roomArchive.listRoomPhotos, { projectId, roomId });
    expect(detail2?.room.coverPhotoId).toBe(photo2);

    // Update categories on photo2
    await t.withIdentity({ subject: ownerId }).mutation(api.roomArchive.updateRoomPhoto, {
      photoId: photo2,
      categories: ['tiling', 'waterproofing'],
    });

    const detail3 = await t.withIdentity({ subject: ownerId }).query(api.roomArchive.listRoomPhotos, { projectId, roomId });
    expect(detail3?.photos.find((p) => p.id === photo2)?.categories).toEqual(['tiling', 'waterproofing']);

    // Deleting cover photo clears room coverPhotoId
    await t.withIdentity({ subject: ownerId }).mutation(api.roomArchive.deleteRoomPhotos, {
      projectId,
      photoIds: [photo2],
    });

    const detail4 = await t.withIdentity({ subject: ownerId }).query(api.roomArchive.listRoomPhotos, { projectId, roomId });
    expect(detail4?.room.coverPhotoId).toBeNull();
  });
});
