import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';
import type { MutationCtx, QueryCtx } from './_generated/server';

const MAX_FILES_PER_OWNER = 30;

const requireOwner = async (ctx: QueryCtx | MutationCtx) => {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error('Not authenticated');
  }
  const user = await ctx.db.get(userId);
  if (user?.role === 'contractor' || user?.role === 'manager' || user?.role === 'inspector') {
    // Check if they are actually the owner of ANY project before blocking them
    const projects = await ctx.db
      .query('projects')
      .withIndex('by_ownerUserId', (q) => q.eq('ownerUserId', userId))
      .first();
      
    if (!projects && !user?.isSuperAdmin) {
      throw new Error(`Your global role is '${user?.role}', which cannot access personal files`);
    }
  }
  return { userId, user };
};

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const createPersonalFile = mutation({
  args: {
    storageId: v.id('_storage'),
    originalName: v.string(),
    storedName: v.string(),
    originalMimeType: v.string(),
    originalSize: v.number(),
    storedSize: v.number(),
    sectionId: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireOwner(ctx);

    const existing = await ctx.db
      .query('personalFiles')
      .withIndex('by_owner', (q) => q.eq('ownerUserId', userId))
      .take(MAX_FILES_PER_OWNER);

    if (existing.length >= MAX_FILES_PER_OWNER) {
      await ctx.storage.delete(args.storageId);
      throw new Error(`ניתן לשמור עד ${MAX_FILES_PER_OWNER} קבצים אישיים`);
    }

    const metadata = await ctx.db.system.get(args.storageId);
    if (!metadata) {
      throw new Error('Uploaded file was not found in storage');
    }

    return await ctx.db.insert('personalFiles', {
      ownerUserId: userId,
      storageId: args.storageId,
      originalName: args.originalName,
      storedName: args.storedName,
      originalMimeType: args.originalMimeType,
      originalSize: args.originalSize,
      storedSize: args.storedSize,
      sectionId: args.sectionId,
      note: args.note ?? '',
      uploadedAt: Date.now(),
    });
  },
});

export const listMyPersonalFiles = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireOwner(ctx);

    const files = await ctx.db
      .query('personalFiles')
      .withIndex('by_owner', (q) => q.eq('ownerUserId', userId))
      .order('desc')
      .take(MAX_FILES_PER_OWNER);

    return await Promise.all(files.map(async (file) => ({
      ...file,
      id: file._id,
      url: await ctx.storage.getUrl(file.storageId),
    })));
  },
});

export const updatePersonalFileNote = mutation({
  args: {
    fileId: v.id('personalFiles'),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireOwner(ctx);
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error('File not found');
    }
    if (file.ownerUserId !== userId) {
      throw new Error('Cannot edit a note on a file you do not own');
    }
    await ctx.db.patch(args.fileId, { note: args.note });
  },
});

export const updatePersonalFilesNote = mutation({
  args: {
    fileIds: v.array(v.id('personalFiles')),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireOwner(ctx);
    
    await Promise.all(
      args.fileIds.map(async (fileId) => {
        const file = await ctx.db.get(fileId);
        if (file && file.ownerUserId === userId) {
          await ctx.db.patch(fileId, { note: args.note });
        }
      })
    );
  },
});

export const deletePersonalFile = mutation({
  args: {
    fileId: v.id('personalFiles'),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireOwner(ctx);
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      return { deleted: false };
    }
    if (file.ownerUserId !== userId) {
      throw new Error('Cannot delete a file you do not own');
    }
    await ctx.storage.delete(file.storageId);
    await ctx.db.delete(args.fileId);
    return { deleted: true };
  },
});
