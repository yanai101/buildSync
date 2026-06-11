import { mutation, internalMutation } from './_generated/server';
import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';

export const saveSubscription = mutation({
  args: {
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthenticated');

    // Check if subscription already exists for this endpoint
    const existing = await ctx.db
      .query('pushSubscriptions')
      .withIndex('by_endpoint', (q) => q.eq('endpoint', args.endpoint))
      .unique();

    if (existing) {
      // Re-claim the device for the current user (shared-device login) and
      // refresh the encryption keys in case the browser rotated them.
      if (existing.userId !== userId || existing.p256dh !== args.p256dh || existing.auth !== args.auth) {
        await ctx.db.patch(existing._id, { userId, p256dh: args.p256dh, auth: args.auth });
      }
      return existing._id;
    }

    return await ctx.db.insert('pushSubscriptions', {
      userId,
      endpoint: args.endpoint,
      p256dh: args.p256dh,
      auth: args.auth,
    });
  },
});

export const removeSubscription = mutation({
  args: {
    endpoint: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthenticated');

    const existing = await ctx.db
      .query('pushSubscriptions')
      .withIndex('by_endpoint', (q) => q.eq('endpoint', args.endpoint))
      .unique();

    if (existing && existing.userId === userId) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const internalRemoveSubscription = internalMutation({
  args: {
    endpoint: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('pushSubscriptions')
      .withIndex('by_endpoint', (q) => q.eq('endpoint', args.endpoint))
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});
