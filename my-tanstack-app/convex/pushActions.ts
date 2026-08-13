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
      console.error('[Push] VAPID keys not configured in environment — cannot send push notifications.');
      return;
    }

    webPush.setVapidDetails(
      'mailto:support@buildpro.com',
      vapidPublicKey,
      vapidPrivateKey
    );

    const payloadString = JSON.stringify(args.payload);
    console.log(`[Push] sendNotification: sending to ${args.subscriptions.length} subscription(s), payload title: "${args.payload.title}"`);

    let successCount = 0;
    let expiredCount = 0;
    let errorCount = 0;

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
        successCount++;
      } catch (error: any) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          expiredCount++;
          console.log(`[Push] Subscription expired (${error.statusCode}), removing: ${sub.endpoint.substring(0, 60)}...`);
          await ctx.runMutation(internal.push.internalRemoveSubscription, {
            endpoint: sub.endpoint,
          });
        } else {
          errorCount++;
          console.error(`[Push] Error sending to ${sub.endpoint.substring(0, 60)}...: ${error.statusCode || error.message}`);
        }
      }
    });

    await Promise.allSettled(promises);
    console.log(`[Push] sendNotification complete — success: ${successCount}, expired: ${expiredCount}, errors: ${errorCount}`);
  },
});
