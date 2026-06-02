import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';

const checkSuperAdmin = async (ctx: any) => {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error('Not authenticated');
  const user = await ctx.db.get(userId);
  if (!user || !user.isSuperAdmin) throw new Error('Unauthorized: Super Admin only');
};

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('guides').withIndex('by_sort').collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    videoUrl: v.string(),
    duration: v.optional(v.string()),
    description: v.string(),
    topics: v.optional(v.array(v.string())),
    tips: v.optional(v.array(v.string())),
    faqs: v.optional(v.array(v.object({ q: v.string(), a: v.string() }))),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await checkSuperAdmin(ctx);
    
    // Auto-increment sortOrder if not provided
    let order = args.sortOrder;
    if (order === undefined) {
      const existing = await ctx.db.query('guides').withIndex('by_sort').collect();
      order = existing.length > 0 ? (existing[existing.length - 1].sortOrder || 0) + 1 : 1;
    }

    return await ctx.db.insert('guides', {
      ...args,
      sortOrder: order,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id('guides'),
    title: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    duration: v.optional(v.string()),
    description: v.optional(v.string()),
    topics: v.optional(v.array(v.string())),
    tips: v.optional(v.array(v.string())),
    faqs: v.optional(v.array(v.object({ q: v.string(), a: v.string() }))),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await checkSuperAdmin(ctx);
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id('guides') },
  handler: async (ctx, args) => {
    await checkSuperAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});


