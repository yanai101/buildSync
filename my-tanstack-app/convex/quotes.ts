import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';

export const listQuotes = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const quotes = await ctx.db
      .query('priceQuotes')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();

    // Batch-fetch all referenced project files at once
    const fileIds = [...new Set(quotes.map((q) => q.projectFileId).filter(Boolean))] as Id<'projectFiles'>[];
    const rawFileDocs = await Promise.all(fileIds.map((id) => ctx.db.get(id)));
    const fileDocs = rawFileDocs.filter(
      (f): f is NonNullable<Awaited<ReturnType<typeof ctx.db.get<'projectFiles'>>>> => f !== null && 'storageId' in f,
    );
    const fileById = new Map(fileDocs.map((f) => [String(f._id), f]));

    // Batch-fetch all storage URLs in parallel
    const storageIds = [...new Set(fileDocs.map((f) => String(f.storageId)))];
    const urlByStorageId = new Map<string, string | null>();
    await Promise.all(
      storageIds.map(async (storageId) => {
        urlByStorageId.set(storageId, await ctx.storage.getUrl(storageId as any));
      }),
    );

    return quotes.map((quote) => {
      if (!quote.projectFileId) return quote;
      const file = fileById.get(String(quote.projectFileId));
      if (!file) return quote;
      return {
        ...quote,
        fileName: quote.fileName || file.originalName,
        fileUrl: urlByStorageId.get(String(file.storageId)) ?? quote.fileUrl,
      };
    });
  },
});

export const listTopics = query({
  args: { projectId: v.optional(v.id('projects')) },
  handler: async (ctx, args) => {
    const builtins = await ctx.db
      .query('quoteTopics')
      .withIndex('by_key')
      .filter(q => q.eq(q.field('isBuiltin'), true))
      .collect();
    
    if (args.projectId) {
      const custom = await ctx.db
        .query('quoteTopics')
        .filter(q => q.eq(q.field('projectId'), args.projectId))
        .collect();
      return [...builtins, ...custom];
    }
    
    return builtins;
  },
});

export const saveQuote = mutation({
  args: {
    projectId: v.id('projects'),
    topicKey: v.string(),
    supplier: v.string(),
    contact: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    total: v.number(),
    validity: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected')),
    fileName: v.optional(v.string()),
    projectFileId: v.optional(v.id('projectFiles')),
    removeFile: v.optional(v.boolean()),
    createdAt: v.optional(v.string()),
    id: v.optional(v.id('priceQuotes')),
  },
  handler: async (ctx, args) => {
    const { id, removeFile, ...data } = args;
    if (id) {
      await ctx.db.patch(id, removeFile ? {
        ...data,
        fileName: undefined,
        projectFileId: undefined,
        fileUrl: undefined,
      } : data);
      if (data.status === 'approved') {
        const siblingQuotes = await ctx.db
          .query('priceQuotes')
          .withIndex('by_project', (q) => q.eq('projectId', data.projectId))
          .collect();

        await Promise.all(
          siblingQuotes
            .filter((quote) => quote._id !== id && quote.topicKey === data.topicKey && quote.status !== 'rejected')
            .map((quote) => ctx.db.patch(quote._id, { status: 'rejected' })),
        );
      }
      return id;
    } else {
      const quoteId = await ctx.db.insert('priceQuotes', {
        ...data,
        createdAt: new Date().toISOString().slice(0, 10),
      });
      if (data.status === 'approved') {
        const siblingQuotes = await ctx.db
          .query('priceQuotes')
          .withIndex('by_project', (q) => q.eq('projectId', data.projectId))
          .collect();

        await Promise.all(
          siblingQuotes
            .filter((quote) => quote._id !== quoteId && quote.topicKey === data.topicKey && quote.status !== 'rejected')
            .map((quote) => ctx.db.patch(quote._id, { status: 'rejected' })),
        );
      }
      return quoteId;
    }
  },
});

export const deleteQuote = mutation({
  args: { id: v.id('priceQuotes') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const addTopic = mutation({
  args: {
    projectId: v.id('projects'),
    name: v.string(),
    icon: v.string(),
  },
  handler: async (ctx, args) => {
    const key = `custom_${Date.now()}`;
    await ctx.db.insert('quoteTopics', {
      projectId: args.projectId,
      key,
      name: args.name,
      icon: args.icon,
      isBuiltin: false,
    });
    return key;
  },
});
