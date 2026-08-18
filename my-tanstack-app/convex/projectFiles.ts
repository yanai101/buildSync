import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireProjectFileUser } from './_lib/projectAccess';
import { validateUploadedFile } from './_lib/fileValidation';

// Abuse guard, not a product limit — regular projects stay far below this.
const MAX_FILES_PER_PROJECT = 2000;

const usageValidator = v.union(
  v.literal('photo'),
  v.literal('receipt'),
  v.literal('quote'),
  v.literal('document'),
  v.literal('daily_log'),
);

const kindValidator = v.union(
  v.literal('image'),
  v.literal('pdf'),
  v.literal('document'),
  v.literal('other'),
);

export const generateUploadUrl = mutation({
  args: {
    projectId: v.id('projects'),
  },
  handler: async (ctx, args) => {
    await requireProjectFileUser(ctx, args.projectId);
    return await ctx.storage.generateUploadUrl();
  },
});

export const createProjectFile = mutation({
  args: {
    projectId: v.id('projects'),
    storageId: v.id('_storage'),
    usage: usageValidator,
    kind: kindValidator,
    originalName: v.string(),
    storedName: v.string(),
    originalMimeType: v.string(),
    storedMimeType: v.string(),
    originalSize: v.number(),
    storedSize: v.number(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    contractorId: v.optional(v.id('contractors')),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireProjectFileUser(ctx, args.projectId);
    const metadata = await validateUploadedFile(ctx, args.storageId);

    const existing = await ctx.db
      .query('projectFiles')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .take(MAX_FILES_PER_PROJECT);
    if (existing.length >= MAX_FILES_PER_PROJECT) {
      await ctx.storage.delete(args.storageId);
      throw new Error('הפרויקט הגיע למכסת הקבצים המרבית');
    }

    return await ctx.db.insert('projectFiles', {
      projectId: args.projectId,
      storageId: args.storageId,
      usage: args.usage,
      kind: args.kind,
      originalName: args.originalName,
      storedName: args.storedName,
      originalMimeType: args.originalMimeType,
      // Trust the storage system's recorded values over the client's claims
      storedMimeType: metadata.contentType ?? args.storedMimeType,
      originalSize: args.originalSize,
      storedSize: metadata.size,
      ...(args.width !== undefined ? { width: args.width } : {}),
      ...(args.height !== undefined ? { height: args.height } : {}),
      uploaderUserId: userId,
      ...(args.contractorId ? { contractorId: args.contractorId } : {}),
    });
  },
});

export const deleteProjectFile = mutation({
  args: {
    fileId: v.id('projectFiles'),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      return { deleted: false };
    }

    const { userId, user, project } = await requireProjectFileUser(ctx, file.projectId);
    const isUploader = file.uploaderUserId === userId;
    const isProjectManager = project.ownerUserId === userId || project.managerUserId === userId;
    if (!isUploader && !isProjectManager && !user?.isSuperAdmin) {
      throw new Error('Only the uploader, owner, or manager can delete this file');
    }

    await ctx.storage.delete(file.storageId);
    await ctx.db.delete(args.fileId);
    return { deleted: true };
  },
});

export const deleteProjectFileByStorageId = mutation({
  args: {
    storageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db
      .query('projectFiles')
      .withIndex('by_storage', (q) => q.eq('storageId', args.storageId))
      .first();

    // Storage files without a projectFiles record cannot be verified for
    // ownership, so they are never deleted through this mutation.
    if (!file) {
      return { deleted: false };
    }

    const { userId, user, project } = await requireProjectFileUser(ctx, file.projectId);
    const isUploader = file.uploaderUserId === userId;
    const isProjectManager = project.ownerUserId === userId || project.managerUserId === userId;
    if (!isUploader && !isProjectManager && !user?.isSuperAdmin) {
      throw new Error('Only the uploader, owner, or manager can delete this file');
    }

    await ctx.db.delete(file._id);
    try {
      await ctx.storage.delete(args.storageId);
    } catch (e) {
      // Storage file might already be deleted
    }
    return { deleted: true };
  },
});

export const listByProject = query({
  args: {
    projectId: v.id('projects'),
    usage: v.optional(usageValidator),
  },
  handler: async (ctx, args) => {
    await requireProjectFileUser(ctx, args.projectId);

    const files = args.usage
      ? await ctx.db
        .query('projectFiles')
        .withIndex('by_project_usage', (q) => q.eq('projectId', args.projectId).eq('usage', args.usage!))
        .take(100)
      : await ctx.db
        .query('projectFiles')
        .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
        .take(100);

    return await Promise.all(files.map(async (file) => ({
      ...file,
      id: file._id,
      url: await ctx.storage.getUrl(file.storageId),
    })));
  },
});

export const listByContractor = query({
  args: {
    contractorId: v.id('contractors'),
  },
  handler: async (ctx, args) => {
    const contractor = await ctx.db.get(args.contractorId);
    if (!contractor) return [];
    await requireProjectFileUser(ctx, contractor.projectId);

    const files = await ctx.db
      .query('projectFiles')
      .withIndex('by_contractor', (q) => q.eq('contractorId', args.contractorId))
      .take(200);

    return await Promise.all(files.map(async (file) => ({
      ...file,
      id: file._id,
      url: await ctx.storage.getUrl(file.storageId),
    })));
  },
});
