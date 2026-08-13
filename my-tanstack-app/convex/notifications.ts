import { MutationCtx } from './_generated/server';
import { Id } from './_generated/dataModel';
import { internal } from './_generated/api';

/**
 * Schedules a Web Push notification to every device subscription belonging
 * to the given users. De-dupes recipients and is a no-op if nobody has any
 * push subscriptions. Best-effort: failures are handled inside
 * `pushActions.sendNotification` and never surface to the caller.
 */
export async function scheduleUserNotifications(
  ctx: MutationCtx,
  args: {
    userIds: (Id<'users'> | undefined | null)[];
    title: string;
    body: string;
    url?: string;
    tag?: string;
  },
) {
  const targetUserIds = [...new Set(args.userIds.filter((id): id is Id<'users'> => !!id))];
  console.log(`[Push] scheduleUserNotifications called — raw userIds: ${args.userIds.length}, unique valid: ${targetUserIds.length}, tag: ${args.tag ?? '(none)'}`);

  if (targetUserIds.length === 0) {
    console.log('[Push] Aborting: 0 valid target user IDs after filtering.');
    return;
  }

  const subscriptions: { endpoint: string; p256dh: string; auth: string }[] = [];
  for (const targetId of targetUserIds) {
    const userSubs = await ctx.db
      .query('pushSubscriptions')
      .withIndex('by_user', (q) => q.eq('userId', targetId))
      .collect();
    if (userSubs.length > 0) {
      console.log(`[Push] User ${targetId}: ${userSubs.length} subscription(s)`);
    }
    subscriptions.push(...userSubs.map((s) => ({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth })));
  }

  if (subscriptions.length === 0) {
    console.log(`[Push] Aborting: ${targetUserIds.length} target user(s) but 0 push subscriptions found.`);
    return;
  }

  console.log(`[Push] Scheduling sendNotification — ${subscriptions.length} subscription(s), title: "${args.title}"`);
  await ctx.scheduler.runAfter(0, internal.pushActions.sendNotification, {
    subscriptions,
    payload: {
      title: args.title,
      body: args.body,
      url: args.url,
      tag: args.tag,
    },
  });
}
