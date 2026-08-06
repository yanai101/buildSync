import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';
import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { getActiveTier } from './_lib/entitlements';

const MAX_FILES_PER_OWNER = 30;

type ArchivePermission = 'photos' | 'docs' | 'any';

const requireArchiveAccess = async (
  ctx: QueryCtx | MutationCtx,
  projectId: Id<'projects'>,
  requiredKind: ArchivePermission = 'any',
) => {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error('Not authenticated');
  }

  const [user, project] = await Promise.all([
    ctx.db.get(userId),
    ctx.db.get(projectId),
  ]);

  if (!project) {
    throw new Error('Project not found');
  }

  if (!project.ownerUserId) {
    throw new Error('Project has no owner');
  }

  // 1. Super admin has full access
  if (user?.isSuperAdmin) {
    return { userId, user, project, ownerUserId: project.ownerUserId, canPhotos: true, canDocs: true, isOwner: true };
  }

  // 2. Project owner has full access
  if (project.ownerUserId === userId) {
    return { userId, user, project, ownerUserId: project.ownerUserId, canPhotos: true, canDocs: true, isOwner: true };
  }

  // 3. Manager or Inspector
  const isManager = project.managerUserId === userId;
  const isInspector = project.inspectorUserId === userId;

  if (!isManager && !isInspector) {
    throw new Error('אין לך הרשאה לגשת לארכיון פרויקט זה');
  }

  // Check if owner has Pro or Premium subscription
  const owner = await ctx.db.get(project.ownerUserId);
  const activeTier = getActiveTier(owner);
  if (activeTier === 'free') {
    throw new Error('הארכיון זמין רק כאשר בעל הפרויקט הוא בעל מנוי Pro או Premium');
  }

  const canPhotos = isManager
    ? project.managerCanViewArchivePhotos === true
    : project.inspectorCanViewArchivePhotos === true;

  const canDocs = isManager
    ? project.managerCanViewArchiveDocs === true
    : project.inspectorCanViewArchiveDocs === true;

  if (requiredKind === 'photos' && !canPhotos) {
    throw new Error('אין לך הרשאת גישה לתמונות בארכיון פרויקט זה');
  }

  if (requiredKind === 'docs' && !canDocs) {
    throw new Error('אין לך הרשאת גישה למסמכים בארכיון פרויקט זה');
  }

  if (requiredKind === 'any' && !canPhotos && !canDocs) {
    throw new Error('בעל הפרויקט לא הגדיר עבורך הרשאות גישה לארכיון');
  }

  return { userId, user, project, ownerUserId: project.ownerUserId, canPhotos, canDocs, isOwner: false };
};

export const getArchivePermissions = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const [user, project] = await Promise.all([
      ctx.db.get(userId),
      ctx.db.get(args.projectId),
    ]);

    if (!project) return null;
    if (user?.isSuperAdmin || project.ownerUserId === userId) {
      return { canPhotos: true, canDocs: true, isOwner: true, isProOrPremium: true };
    }

    const isManager = project.managerUserId === userId;
    const isInspector = project.inspectorUserId === userId;
    if (!isManager && !isInspector) return null;

    const owner = project.ownerUserId ? await ctx.db.get(project.ownerUserId) : null;
    const activeTier = getActiveTier(owner);
    const isProOrPremium = activeTier === 'pro' || activeTier === 'premium';

    const canPhotos = isManager
      ? project.managerCanViewArchivePhotos === true
      : project.inspectorCanViewArchivePhotos === true;

    const canDocs = isManager
      ? project.managerCanViewArchiveDocs === true
      : project.inspectorCanViewArchiveDocs === true;

    return {
      canPhotos,
      canDocs,
      isOwner: false,
      isProOrPremium,
      role: isManager ? ('manager' as const) : ('inspector' as const),
    };
  },
});

export const generateUploadUrl = mutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    await requireArchiveAccess(ctx, args.projectId, 'any');
    return await ctx.storage.generateUploadUrl();
  },
});

export const createPersonalFile = mutation({
  args: {
    projectId: v.id('projects'),
    storageId: v.id('_storage'),
    originalName: v.string(),
    storedName: v.string(),
    originalMimeType: v.string(),
    originalSize: v.number(),
    storedSize: v.number(),
    sectionId: v.optional(v.string()),
    sectionName: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const isImage = args.originalMimeType.startsWith('image/');
    const { ownerUserId } = await requireArchiveAccess(
      ctx,
      args.projectId,
      isImage ? 'photos' : 'docs',
    );

    const existing = await ctx.db
      .query('personalFiles')
      .withIndex('by_owner_and_project', (q) =>
        q.eq('ownerUserId', ownerUserId).eq('projectId', args.projectId),
      )
      .take(MAX_FILES_PER_OWNER);

    if (existing.length >= MAX_FILES_PER_OWNER) {
      await ctx.storage.delete(args.storageId);
      throw new Error(`ניתן לשמור עד ${MAX_FILES_PER_OWNER} קבצים בארכיון`);
    }

    const metadata = await ctx.db.system.get(args.storageId);
    if (!metadata) {
      throw new Error('Uploaded file was not found in storage');
    }

    return await ctx.db.insert('personalFiles', {
      ownerUserId,
      projectId: args.projectId,
      storageId: args.storageId,
      originalName: args.originalName,
      storedName: args.storedName,
      originalMimeType: args.originalMimeType,
      originalSize: args.originalSize,
      storedSize: args.storedSize,
      sectionId: args.sectionId,
      sectionName: args.sectionName,
      note: args.note ?? '',
      uploadedAt: Date.now(),
    });
  },
});

export const listMyPersonalFiles = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const { ownerUserId, canPhotos, canDocs, isOwner } = await requireArchiveAccess(
      ctx,
      args.projectId,
      'any',
    );

    const files = await ctx.db
      .query('personalFiles')
      .withIndex('by_owner_and_project', (q) =>
        q.eq('ownerUserId', ownerUserId).eq('projectId', args.projectId),
      )
      .order('desc')
      .take(MAX_FILES_PER_OWNER);

    const filteredFiles = files.filter((file) => {
      if (isOwner) return true;
      const isImage = file.originalMimeType?.startsWith('image/');
      if (isImage) return canPhotos;
      return canDocs;
    });

    return await Promise.all(
      filteredFiles.map(async (file) => ({
        ...file,
        id: file._id,
        url: await ctx.storage.getUrl(file.storageId),
      })),
    );
  },
});

export const updatePersonalFileNote = mutation({
  args: {
    fileId: v.id('personalFiles'),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error('File not found');
    }
    if (!file.projectId) {
      const userId = await getAuthUserId(ctx);
      if (file.ownerUserId !== userId) {
        throw new Error('Cannot edit a note on a file you do not own');
      }
    } else {
      const isImage = file.originalMimeType?.startsWith('image/');
      await requireArchiveAccess(ctx, file.projectId, isImage ? 'photos' : 'docs');
    }
    await ctx.db.patch(args.fileId, { note: args.note });
  },
});

export const updatePersonalSectionName = mutation({
  args: {
    projectId: v.id('projects'),
    sectionId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const { ownerUserId } = await requireArchiveAccess(ctx, args.projectId, 'photos');
    const files = await ctx.db
      .query('personalFiles')
      .withIndex('by_owner_and_project', (q) =>
        q.eq('ownerUserId', ownerUserId).eq('projectId', args.projectId),
      )
      .collect();
    const sectionFiles = files.filter(
      (f) => f.sectionId === args.sectionId || (!f.sectionId && `legacy-${f._id}` === args.sectionId),
    );
    for (const file of sectionFiles) {
      await ctx.db.patch(file._id, { sectionName: args.name });
    }
  },
});

export const updatePersonalFilesNote = mutation({
  args: {
    fileIds: v.array(v.id('personalFiles')),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    await Promise.all(
      args.fileIds.map(async (fileId) => {
        const file = await ctx.db.get(fileId);
        if (!file) return;
        if (!file.projectId) {
          const userId = await getAuthUserId(ctx);
          if (file.ownerUserId === userId) {
            await ctx.db.patch(fileId, { note: args.note });
          }
        } else {
          try {
            const isImage = file.originalMimeType?.startsWith('image/');
            await requireArchiveAccess(ctx, file.projectId, isImage ? 'photos' : 'docs');
            await ctx.db.patch(fileId, { note: args.note });
          } catch {
            // ignore if no permission for specific file
          }
        }
      }),
    );
  },
});

export const deletePersonalFile = mutation({
  args: {
    fileId: v.id('personalFiles'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const file = await ctx.db.get(args.fileId);
    if (!file) {
      return { deleted: false };
    }

    const user = await ctx.db.get(userId);
    const isSuperAdmin = !!user?.isSuperAdmin;

    let isOwner = file.ownerUserId === userId || isSuperAdmin;
    if (file.projectId) {
      const project = await ctx.db.get(file.projectId);
      if (project && project.ownerUserId === userId) {
        isOwner = true;
      }
    }

    if (!isOwner) {
      throw new Error('רק בעל הפרויקט רשאי למחוק קבצים מהארכיון');
    }

    await ctx.storage.delete(file.storageId);
    await ctx.db.delete(args.fileId);
    return { deleted: true };
  },
});

export const deletePersonalSection = mutation({
  args: {
    projectId: v.id('projects'),
    sectionId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error('Project not found');

    const user = await ctx.db.get(userId);
    const isSuperAdmin = !!user?.isSuperAdmin;
    const isOwner = project.ownerUserId === userId || isSuperAdmin;

    if (!isOwner) {
      throw new Error('רק בעל הפרויקט רשאי למחוק קבצים מהארכיון');
    }

    const files = await ctx.db
      .query('personalFiles')
      .withIndex('by_owner_and_project', (q) =>
        q.eq('ownerUserId', project.ownerUserId!).eq('projectId', args.projectId)
      )
      .collect();

    const sectionFiles = files.filter(
      (f) => f.sectionId === args.sectionId || (!f.sectionId && `legacy-${f._id}` === args.sectionId),
    );

    for (const file of sectionFiles) {
      await ctx.storage.delete(file.storageId);
      await ctx.db.delete(file._id);
    }

    return { deletedCount: sectionFiles.length };
  },
});
