import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { insertActivity } from './_lib/activity';
import { zPermitStatus } from './zodSchemas';
import { zodToConvex } from 'convex-helpers/server/zod3';

export const list = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query('permits')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
      
    const withUrls = await Promise.all(records.map(async (p) => ({
      ...p,
      url: p.fileId ? await ctx.storage.getUrl(p.fileId) : null,
    })));

    return withUrls.sort((a, b) => {
      const aOrder = a.sortOrder ?? a._creationTime;
      const bOrder = b.sortOrder ?? b._creationTime;
      return aOrder - bOrder;
    });
  },
});

export const generateUploadUrl = mutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx) => {
    // Basic auth check can go here if needed
    return await ctx.storage.generateUploadUrl();
  },
});

export const addPermit = mutation({
  args: {
    projectId: v.id('projects'),
    title: v.string(),
    authority: v.optional(v.string()),
    status: zodToConvex(zPermitStatus),
    expirationDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    fileId: v.optional(v.id('_storage')),
  },
  handler: async (ctx, args) => {
    
    const permitId = await ctx.db.insert('permits', {
      projectId: args.projectId,
      title: args.title,
      authority: args.authority,
      status: args.status,
      expirationDate: args.expirationDate,
      notes: args.notes,
      fileId: args.fileId,
      sortOrder: Date.now(),
    });

    await insertActivity(ctx, {
      projectId: args.projectId,
      text: `הוסיף מסמך/היתר חדש: ${args.title}`,
    });

    return permitId;
  },
});

export const updatePermit = mutation({
  args: {
    permitId: v.id('permits'),
    title: v.optional(v.string()),
    authority: v.optional(v.string()),
    status: v.optional(zodToConvex(zPermitStatus)),
    expirationDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    fileId: v.optional(v.id('_storage')),
  },
  handler: async (ctx, args) => {
    const permit = await ctx.db.get(args.permitId);
    if (!permit) throw new Error('Permit not found');

    const { permitId, ...updates } = args;
    await ctx.db.patch(permitId, updates);
  },
});

export const deletePermit = mutation({
  args: { permitId: v.id('permits') },
  handler: async (ctx, args) => {
    const permit = await ctx.db.get(args.permitId);
    if (!permit) throw new Error('Permit not found');

    if (permit.fileId) {
      await ctx.storage.delete(permit.fileId);
    }
    await ctx.db.delete(args.permitId);
  },
});

export const reorderPermits = mutation({
  args: {
    updates: v.array(
      v.object({
        id: v.id('permits'),
        sortOrder: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await Promise.all(
      args.updates.map((update) =>
        ctx.db.patch(update.id, { sortOrder: update.sortOrder })
      )
    );
  },
});
