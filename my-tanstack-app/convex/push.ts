"use node";
import { mutation, internalAction } from './_generated/server';
import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import webPush from 'web-push';
import { internal } from './_generated/api';

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
      if (existing.userId !== userId) {
        // If it belongs to someone else, update it
        await ctx.db.patch(existing._id, { userId });
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

export const internalRemoveSubscription = mutation({
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

// Since web-push relies on Node's crypto library, we must use an action (Node.js runtime).
export const sendNotification = internalAction({
  args: {
    subscriptions: v.array(
      v.object({
        endpoint: v.string(),
        p256dh: v.string(),
        auth: v.string(),
      })
    ),
    payload: v.object({
      title: v.string(),
      body: v.string(),
      url: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    if (args.subscriptions.length === 0) return;

    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured in environment.');
      return;
    }

    webPush.setVapidDetails(
      'mailto:support@buildpro.com',
      vapidPublicKey,
      vapidPrivateKey
    );

    const payloadString = JSON.stringify(args.payload);

    const promises = args.subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webPush.sendNotification(pushSubscription, payloadString);
      } catch (error: any) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          console.log('Subscription has expired or is no longer valid. Removing...');
          await ctx.runMutation(internal.push.internalRemoveSubscription, {
            endpoint: sub.endpoint,
          });
        } else {
          console.error('Error sending push notification:', error);
        }
      }
    });

    await Promise.allSettled(promises);
  },
});
