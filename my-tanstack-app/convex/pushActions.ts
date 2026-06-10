"use node";
import { internalAction } from './_generated/server';
import { v } from 'convex/values';
import webPush from 'web-push';
import { internal } from './_generated/api';

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
      tag: v.optional(v.string()),
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
