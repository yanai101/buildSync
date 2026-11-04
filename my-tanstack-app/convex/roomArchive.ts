import { mutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';
import type { Doc, Id } from './_generated/dataModel';
import { getActiveTier, tierAllows } from './_lib/entitlements';
import { validateUploadedFile } from './_lib/fileValidation';
import {
  MAX_BULK_DELETE,
  MAX_DESCRIPTION_LENGTH,
  MAX_NOTE_LENGTH,
  MAX_PHOTOS_PER_ROOM_READ,
  MAX_PHOTOS_PER_ROOM_STAGE,
  type RoomPhotoCategory,
} from './_lib/roomArchiveShared';

// ─────────────────────────────────────────────────────────────────────────────
// Pro "Room photos" archive. Independent feature: owns the `roomPhotos`
// and `roomArchivePermissions` tables and never writes to other tables.
// ─────────────────────────────────────────────────────────────────────────────

type Ctx = QueryCtx | MutationCtx;
type Level = 'view' | 'upload';

export const roomPhotoCategoryValidator = v.union(
  v.literal('general'),
  v.literal('plumbing'),
  v.literal('electrical'),
  v.literal('ac'),
  v.literal('waterproofing'),
  v.literal('tiling'),
  v.literal('plaster_paint'),
  v.literal('carpentry'),
  v.literal('aluminum'),
  v.literal('drywall'),
  v.literal('other'),
);

type AccessInfo = {
  userId: Id<'users'>;
  project: Doc<'projects'>;
  isOwner: boolean;
  isPremium: boolean;
  role: 'owner' | 'manager' | 'inspector' | null;
  canView: boolean;
  canUpload: boolean;
  /** Owner downgraded from Premium but photos exist: view/download only. */
  readOnly: boolean;
};

/** Resolves the caller's access without throwing. Returns null when unauthenticated / not a member. */
const resolveAccess = async (ctx: Ctx, projectId: Id<'projects'>): Promise<AccessInfo | null> => {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  const [user, project] = await Promise.all([ctx.db.get(userId), ctx.db.get(projectId)]);
  if (!project || !project.ownerUserId) return null;

  const owner = project.ownerUserId === userId ? user : await ctx.db.get(project.ownerUserId);
  const isPremium = tierAllows(getActiveTier(owner), 'roomArchive');
  // After a downgrade, existing photos stay viewable (read-only) — never hidden or deleted.
  const hasPhotos = isPremium
    ? true
    : (await ctx.db.query('roomPhotos').withIndex('by_project', (q) => q.eq('projectId', projectId)).first()) !== null;
  const readOnly = !isPremium && hasPhotos;
  const featureVisible = isPremium || hasPhotos;

  if (user?.isSuperAdmin || project.ownerUserId === userId) {
    return { userId, project, isOwner: true, isPremium, role: 'owner', canView: featureVisible, canUpload: isPremium, readOnly };
  }

  const role = project.managerUserId === userId
    ? 'manager' as const
    : project.inspectorUserId === userId
      ? 'inspector' as const
      : null;
  if (!role) return null;

  const perm = await ctx.db
    .query('roomArchivePermissions')
    .withIndex('by_project_and_user', (q) => q.eq('projectId', projectId).eq('userId', userId))
    .unique();
  const canUpload = isPremium && perm?.canUpload === true;
  const canView = featureVisible && (perm?.canUpload === true || perm?.canView === true);
  return { userId, project, isOwner: false, isPremium, role, canView, canUpload, readOnly };
};

const requireAccess = async (ctx: Ctx, projectId: Id<'projects'>, level: Level): Promise<AccessInfo> => {
  const access = await resolveAccess(ctx, projectId);
  if (!access) throw new Error('אין לך הרשאה לגשת לפרויקט זה');
  if (level === 'upload' && !access.isPremium) {
    throw new Error(access.readOnly
      ? 'המנוי אינו Pro — תמונות החדרים זמינות לצפייה בלבד'
      : 'תיעוד תמונות לפי חדרים זמין רק במנוי Pro');
  }
  if (level === 'view' && !access.canView) {
    throw new Error(access.isPremium || access.readOnly ? 'אין לך הרשאת צפייה בתמונות החדרים' : 'תיעוד תמונות לפי חדרים זמין רק במנוי Pro');
  }
  if (level === 'upload' && !access.canUpload) throw new Error('אין לך הרשאה להעלות או לערוך תמונות חדרים');
  return access;
};

const requireRoomInProject = async (ctx: Ctx, roomId: Id<'projectRooms'>, projectId: Id<'projects'>) => {
  const room = await ctx.db.get(roomId);
  if (!room || room.projectId !== projectId) throw new Error('החדר לא נמצא בפרויקט');
  return room;
};

const clampText = (value: string, max: number) => value.trim().slice(0, max);

// ── Queries ──────────────────────────────────────────────────────────────────

export const getAccess = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const access = await resolveAccess(ctx, args.projectId);
    if (!access) return null;
    return {
      isPremium: access.isPremium,
      isOwner: access.isOwner,
      role: access.role,
      canView: access.canView,
      canUpload: access.canUpload,
      readOnly: access.readOnly,
    };
  },
});

export const listRooms = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const access = await resolveAccess(ctx, args.projectId);
    if (!access || !access.canView) return null;

    const rooms = await ctx.db
      .query('projectRooms')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .take(300);

    const result = await Promise.all(
      rooms.map(async (room) => {
        const photos = await ctx.db
          .query('roomPhotos')
          .withIndex('by_room', (q) => q.eq('roomId', room._id))
          .order('desc')
          .take(MAX_PHOTOS_PER_ROOM_READ);
        const coverPhoto = room.coverPhotoId
          ? (photos.find((p) => p._id === room.coverPhotoId) ?? (await ctx.db.get(room.coverPhotoId)))
          : photos.find((p) => p.isCover);
        const cover = (coverPhoto && coverPhoto.roomId === room._id) ? coverPhoto : photos[0];
        return {
          id: room._id,
          name: room.name,
          type: room.type,
          floor: room.floor,
          sizeSqm: room.sizeSqm,
          photoCount: photos.length,
          coverUrl: cover ? await ctx.storage.getUrl(cover.storageId) : null,
          lastUploadedAt: cover?.uploadedAt ?? null,
        };
      }),
    );

    return result.sort((a, b) => a.floor - b.floor || a.name.localeCompare(b.name, 'he'));
  },
});

export const listRoomPhotos = query({
  args: { projectId: v.id('projects'), roomId: v.id('projectRooms') },
  handler: async (ctx, args) => {
    const access = await resolveAccess(ctx, args.projectId);
    if (!access || !access.canView) return null;
    const room = await ctx.db.get(args.roomId);
    if (!room || room.projectId !== args.projectId) return null;

    const photos = await ctx.db
      .query('roomPhotos')
      .withIndex('by_room', (q) => q.eq('roomId', args.roomId))
      .order('desc')
      .take(MAX_PHOTOS_PER_ROOM_READ);

    const uploaderNames = new Map<Id<'users'>, string>();
    for (const p of photos) {
      if (!uploaderNames.has(p.uploaderUserId)) {
        const u = await ctx.db.get(p.uploaderUserId);
        uploaderNames.set(p.uploaderUserId, u?.name ?? u?.email ?? 'משתמש');
      }
    }

    const stages = await ctx.db
      .query('stages')
      .withIndex('by_project_sort', (q) => q.eq('projectId', args.projectId))
      .take(200);
    const stageIds = new Set<string>(stages.map((s) => s._id));
    const stageNames = new Map<string, string>(stages.map((s) => [s._id, s.name]));

    return {
      room: {
        id: room._id,
        name: room.name,
        type: room.type,
        floor: room.floor,
        sizeSqm: room.sizeSqm,
        coverPhotoId: room.coverPhotoId ?? null,
      },
      stages: stages.map((s) => ({
        id: s._id,
        name: s.name,
        sortOrder: s.sortOrder,
        status: s.status,
        startDate: s.startDate,
        endDate: s.endDate,
      })),
      photos: await Promise.all(
        photos.map(async (p) => ({
          id: p._id,
          url: await ctx.storage.getUrl(p.storageId),
          originalName: p.originalName,
          mimeType: p.mimeType,
          category: p.category,
          categories: (p.categories && p.categories.length > 0) ? p.categories : [p.category],
          isCover: room.coverPhotoId === p._id || !!p.isCover,
          description: p.description,
          note: p.note,
          // A stageId that no longer exists means the stage was deleted.
          stageId: p.stageId && stageIds.has(p.stageId) ? p.stageId : null,
          stageDeleted: !!p.stageId && !stageIds.has(p.stageId),
          stageName: (p.stageId && stageNames.get(p.stageId)) ?? p.stageNameSnapshot ?? null,
          takenOn: p.takenOn ?? null,
          uploadedAt: p.uploadedAt,
          updatedAt: p.updatedAt ?? null,
          uploaderName: uploaderNames.get(p.uploaderUserId) ?? 'משתמש',
        })),
      ),
    };
  },
});

/**
 * Photo counts per room for the house-setup screen so it can warn before a
 * room (and its photos) is deleted. Counts are returned regardless of tier
 * because deleting a room deletes its photos even after a downgrade.
 */
export const getRoomPhotoCounts = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return {};
    const [user, project] = await Promise.all([ctx.db.get(userId), ctx.db.get(args.projectId)]);
    if (!project) return {};
    const allowed = user?.isSuperAdmin || project.ownerUserId === userId || project.managerUserId === userId;
    if (!allowed) return {};

    const counts: Record<string, number> = {};
    const photos = await ctx.db
      .query('roomPhotos')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .take(5000);
    for (const p of photos) counts[p.roomId] = (counts[p.roomId] ?? 0) + 1;
    return counts;
  },
});

// ── Mutations ────────────────────────────────────────────────────────────────

export const generateUploadUrl = mutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    await requireAccess(ctx, args.projectId, 'upload');
    return await ctx.storage.generateUploadUrl();
  },
});

const resolveStage = async (ctx: Ctx, stageId: Id<'stages'> | undefined, projectId: Id<'projects'>) => {
  if (!stageId) return null;
  const stage = await ctx.db.get(stageId);
  if (!stage || stage.projectId !== projectId) throw new Error('השלב לא נמצא בפרויקט');
  return stage;
};

const countInBucket = async (ctx: Ctx, roomId: Id<'projectRooms'>, stageId: Id<'stages'> | undefined) => {
  const rows = await ctx.db
    .query('roomPhotos')
    .withIndex('by_room_and_stageId', (q) => q.eq('roomId', roomId).eq('stageId', stageId))
    .take(MAX_PHOTOS_PER_ROOM_STAGE);
  return rows.length;
};

const limitMessage = (stageName: string | null) =>
  stageName
    ? `ניתן לשמור עד ${MAX_PHOTOS_PER_ROOM_STAGE} תמונות לחדר בשלב "${stageName}"`
    : `ניתן לשמור עד ${MAX_PHOTOS_PER_ROOM_STAGE} תמונות לחדר ללא שלב`;

export const createRoomPhoto = mutation({
  args: {
    projectId: v.id('projects'),
    roomId: v.id('projectRooms'),
    stageId: v.optional(v.id('stages')),
    storageId: v.id('_storage'),
    originalName: v.string(),
    originalSize: v.number(),
    category: v.optional(roomPhotoCategoryValidator),
    categories: v.optional(v.array(roomPhotoCategoryValidator)),
    isCover: v.optional(v.boolean()),
    description: v.string(),
    note: v.string(),
    takenOn: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let access: AccessInfo;
    let stage: Doc<'stages'> | null;
    try {
      access = await requireAccess(ctx, args.projectId, 'upload');
      await requireRoomInProject(ctx, args.roomId, args.projectId);
      stage = await resolveStage(ctx, args.stageId, args.projectId);
    } catch (err) {
      try { await ctx.storage.delete(args.storageId); } catch { /* ignore */ }
      throw err;
    }

    if ((await countInBucket(ctx, args.roomId, args.stageId)) >= MAX_PHOTOS_PER_ROOM_STAGE) {
      await ctx.storage.delete(args.storageId);
      throw new Error(limitMessage(stage?.name ?? null));
    }

    const metadata = await validateUploadedFile(ctx, args.storageId);
    const rawType = (metadata.contentType ?? '').split(';')[0].trim().toLowerCase();
    if (rawType && !rawType.startsWith('image/')) {
      await ctx.storage.delete(args.storageId);
      throw new Error('ניתן להעלות קבצי תמונה בלבד');
    }
    const contentType = rawType || 'image/jpeg';

    const categories: RoomPhotoCategory[] = (args.categories && args.categories.length > 0)
      ? args.categories
      : (args.category ? [args.category] : ['general']);
    const primaryCategory: RoomPhotoCategory = categories[0] ?? 'general';

    const photoId = await ctx.db.insert('roomPhotos', {
      projectId: args.projectId,
      roomId: args.roomId,
      ...(stage ? { stageId: stage._id, stageNameSnapshot: stage.name } : {}),
      storageId: args.storageId,
      originalName: args.originalName.slice(0, 200),
      mimeType: contentType,
      originalSize: args.originalSize,
      storedSize: metadata.size,
      category: primaryCategory,
      categories,
      description: clampText(args.description, MAX_DESCRIPTION_LENGTH),
      note: clampText(args.note, MAX_NOTE_LENGTH),
      takenOn: args.takenOn,
      isCover: !!args.isCover,
      uploaderUserId: access.userId,
      uploadedAt: Date.now(),
    });

    if (args.isCover) {
      await ctx.db.patch(args.roomId, { coverPhotoId: photoId });
      const otherPhotos = await ctx.db
        .query('roomPhotos')
        .withIndex('by_room', (q) => q.eq('roomId', args.roomId))
        .collect();
      for (const p of otherPhotos) {
        if (p._id !== photoId && p.isCover) {
          await ctx.db.patch(p._id, { isCover: false });
        }
      }
    }

    return photoId;
  },
});

export const updateRoomPhoto = mutation({
  args: {
    photoId: v.id('roomPhotos'),
    description: v.optional(v.string()),
    note: v.optional(v.string()),
    category: v.optional(roomPhotoCategoryValidator),
    categories: v.optional(v.array(roomPhotoCategoryValidator)),
    isCover: v.optional(v.boolean()),
    /** Pass a stage id to move the photo, or null for "no stage". Omit to keep. */
    stageId: v.optional(v.union(v.id('stages'), v.null())),
  },
  handler: async (ctx, args) => {
    const photo = await ctx.db.get(args.photoId);
    if (!photo) throw new Error('התמונה לא נמצאה');
    await requireAccess(ctx, photo.projectId, 'upload');

    let stagePatch: { stageId: Id<'stages'> | undefined; stageNameSnapshot: string | undefined } | null = null;
    if (args.stageId !== undefined) {
      const targetStageId = args.stageId ?? undefined;
      if (targetStageId !== photo.stageId) {
        const stage = await resolveStage(ctx, targetStageId, photo.projectId);
        if ((await countInBucket(ctx, photo.roomId, targetStageId)) >= MAX_PHOTOS_PER_ROOM_STAGE) {
          throw new Error(limitMessage(stage?.name ?? null));
        }
        stagePatch = { stageId: stage?._id, stageNameSnapshot: stage?.name };
      }
    }

    let categoryPatch: { category?: RoomPhotoCategory; categories?: RoomPhotoCategory[] } = {};
    if (args.categories !== undefined) {
      const cats: RoomPhotoCategory[] = args.categories.length > 0 ? (args.categories as RoomPhotoCategory[]) : ['general'];
      categoryPatch = { categories: cats, category: cats[0] };
    } else if (args.category !== undefined) {
      categoryPatch = { category: args.category as RoomPhotoCategory, categories: [args.category as RoomPhotoCategory] };
    }

    if (args.isCover !== undefined) {
      const room = await ctx.db.get(photo.roomId);
      if (room) {
        if (args.isCover) {
          await ctx.db.patch(room._id, { coverPhotoId: photo._id });
          const otherPhotos = await ctx.db
            .query('roomPhotos')
            .withIndex('by_room', (q) => q.eq('roomId', photo.roomId))
            .collect();
          for (const p of otherPhotos) {
            if (p._id !== photo._id && p.isCover) {
              await ctx.db.patch(p._id, { isCover: false });
            }
          }
        } else if (room.coverPhotoId === photo._id) {
          await ctx.db.patch(room._id, { coverPhotoId: undefined });
        }
      }
    }

    await ctx.db.patch(args.photoId, {
      ...(args.description !== undefined ? { description: clampText(args.description, MAX_DESCRIPTION_LENGTH) } : {}),
      ...(args.note !== undefined ? { note: args.note.slice(0, MAX_NOTE_LENGTH) } : {}),
      ...(args.isCover !== undefined ? { isCover: args.isCover } : {}),
      ...categoryPatch,
      ...(stagePatch ?? {}),
      updatedAt: Date.now(),
    });
  },
});

export const setRoomCoverPhoto = mutation({
  args: {
    projectId: v.id('projects'),
    roomId: v.id('projectRooms'),
    photoId: v.optional(v.id('roomPhotos')),
  },
  handler: async (ctx, args) => {
    await requireAccess(ctx, args.projectId, 'upload');
    await requireRoomInProject(ctx, args.roomId, args.projectId);
    if (args.photoId) {
      const photo = await ctx.db.get(args.photoId);
      if (!photo || photo.roomId !== args.roomId) {
        throw new Error('התמונה לא שייכת לחדר זה');
      }
    }
    await ctx.db.patch(args.roomId, { coverPhotoId: args.photoId ?? undefined });
    const roomPhotos = await ctx.db
      .query('roomPhotos')
      .withIndex('by_room', (q) => q.eq('roomId', args.roomId))
      .collect();
    for (const p of roomPhotos) {
      const shouldBeCover = p._id === args.photoId;
      if (p.isCover !== shouldBeCover) {
        await ctx.db.patch(p._id, { isCover: shouldBeCover });
      }
    }
  },
});

export const deleteRoomPhotos = mutation({
  args: {
    projectId: v.id('projects'),
    photoIds: v.array(v.id('roomPhotos')),
  },
  handler: async (ctx, args) => {
    if (args.photoIds.length === 0) return { deletedCount: 0 };
    if (args.photoIds.length > MAX_BULK_DELETE) throw new Error('יותר מדי תמונות למחיקה בבת אחת');
    await requireAccess(ctx, args.projectId, 'upload');

    let deletedCount = 0;
    for (const photoId of args.photoIds) {
      const photo = await ctx.db.get(photoId);
      if (!photo || photo.projectId !== args.projectId) continue;
      const room = await ctx.db.get(photo.roomId);
      if (room && room.coverPhotoId === photo._id) {
        await ctx.db.patch(room._id, { coverPhotoId: undefined });
      }
      try { await ctx.storage.delete(photo.storageId); } catch { /* already gone */ }
      await ctx.db.delete(photo._id);
      deletedCount++;
    }
    return { deletedCount };
  },
});

// ── Team permissions (owner only) ────────────────────────────────────────────

const requireOwner = async (ctx: Ctx, projectId: Id<'projects'>) => {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error('Not authenticated');
  const [user, project] = await Promise.all([ctx.db.get(userId), ctx.db.get(projectId)]);
  if (!project) throw new Error('Project not found');
  if (project.ownerUserId !== userId && !user?.isSuperAdmin) {
    throw new Error('רק בעל הפרויקט רשאי לנהל הרשאות');
  }
  return project;
};

export const getPermissions = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    let project: Doc<'projects'>;
    try {
      project = await requireOwner(ctx, args.projectId);
    } catch {
      return null;
    }
    const owner = project.ownerUserId ? await ctx.db.get(project.ownerUserId) : null;
    const isPremium = tierAllows(getActiveTier(owner), 'roomArchive');

    const memberInfo = async (memberId: Id<'users'> | undefined) => {
      if (!memberId) return null;
      const [member, perm] = await Promise.all([
        ctx.db.get(memberId),
        ctx.db
          .query('roomArchivePermissions')
          .withIndex('by_project_and_user', (q) => q.eq('projectId', args.projectId).eq('userId', memberId))
          .unique(),
      ]);
      return {
        name: member?.name ?? member?.email ?? 'חבר צוות',
        canView: perm?.canView === true || perm?.canUpload === true,
        canUpload: perm?.canUpload === true,
      };
    };

    return {
      isPremium,
      manager: await memberInfo(project.managerUserId ?? undefined),
      inspector: await memberInfo(project.inspectorUserId ?? undefined),
    };
  },
});

export const setPermission = mutation({
  args: {
    projectId: v.id('projects'),
    role: v.union(v.literal('manager'), v.literal('inspector')),
    canView: v.boolean(),
    canUpload: v.boolean(),
  },
  handler: async (ctx, args) => {
    const project = await requireOwner(ctx, args.projectId);
    const memberId = args.role === 'manager' ? project.managerUserId : project.inspectorUserId;
    if (!memberId) throw new Error('אין חבר צוות בתפקיד זה');

    // Upload implies view; removing view also removes upload.
    const canUpload = args.canUpload && args.canView;
    const canView = args.canView;

    const existing = await ctx.db
      .query('roomArchivePermissions')
      .withIndex('by_project_and_user', (q) => q.eq('projectId', args.projectId).eq('userId', memberId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { canView, canUpload });
    } else {
      await ctx.db.insert('roomArchivePermissions', {
        projectId: args.projectId,
        userId: memberId,
        canView,
        canUpload,
      });
    }
  },
});
