import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const listQuotes = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('priceQuotes')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
  },
});

export const listTopics = query({
  args: { projectId: v.optional(v.id('projects')) },
  handler: async (ctx, args) => {
    const builtins = await ctx.db
      .query('quoteTopics')
      .withIndex('by_key')
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
    status: v.string(),
    fileName: v.optional(v.string()),
    createdAt: v.optional(v.string()),
    id: v.optional(v.id('priceQuotes')),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    if (id) {
      await ctx.db.patch(id, data);
      return id;
    } else {
      return await ctx.db.insert('priceQuotes', {
        ...data,
        createdAt: new Date().toISOString().slice(0, 10),
      });
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
    return await ctx.db.insert('quoteTopics', {
      projectId: args.projectId,
      key,
      name: args.name,
      icon: args.icon,
      isBuiltin: false,
    });
  },
});
