import type { Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';
import { MAX_PHOTOS_PER_ROOM_READ } from './roomArchiveShared';

/**
 * Deletes every room photo (and its storage file) for the given rooms.
 * Called from projects.saveProjectSetup when rooms are removed. Bounded by
 * MAX_PHOTOS_PER_ROOM_STAGE per stage.
 */
export async function deletePhotosForRooms(ctx: MutationCtx, roomIds: Id<'projectRooms'>[]) {
  let deleted = 0;
  for (const roomId of roomIds) {
    const photos = await ctx.db
      .query('roomPhotos')
      .withIndex('by_room', (q) => q.eq('roomId', roomId))
      .take(MAX_PHOTOS_PER_ROOM_READ);
    for (const photo of photos) {
      try { await ctx.storage.delete(photo.storageId); } catch { /* already gone */ }
      await ctx.db.delete(photo._id);
      deleted++;
    }
  }
  return deleted;
}

/** Removes all room-archive data for a project. Used by project deletion. */
export async function deleteRoomArchiveForProject(ctx: MutationCtx, projectId: Id<'projects'>) {
  const photos = await ctx.db
    .query('roomPhotos')
    .withIndex('by_project', (q) => q.eq('projectId', projectId))
    .take(8000);
  for (const photo of photos) {
    try { await ctx.storage.delete(photo.storageId); } catch { /* already gone */ }
    await ctx.db.delete(photo._id);
  }
  const perms = await ctx.db
    .query('roomArchivePermissions')
    .withIndex('by_project', (q) => q.eq('projectId', projectId))
    .take(100);
  for (const perm of perms) {
    await ctx.db.delete(perm._id);
  }
}
