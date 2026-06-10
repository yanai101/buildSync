/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, test, expect, vi } from 'vitest';
import webPush from 'web-push';
import schema from './schema';
import { api, internal } from './_generated/api';
import { scheduleUserNotifications } from './notifications';

const modules = import.meta.glob('./**/*.ts');

describe('push notification system', () => {
  test('scheduleUserNotifications is a no-op when the user has no device subscriptions', async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run((ctx) => ctx.db.insert('users', { name: 'Owner' }));

    await t.run((ctx) => scheduleUserNotifications(ctx, { userIds: [userId], title: 'כותרת', body: 'גוף' }));

    const scheduled = await t.run((ctx) => ctx.db.system.query('_scheduled_functions').collect());
    expect(scheduled).toHaveLength(0);
  });

  test('schedules a push send to every device subscription a user has', async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run((ctx) => ctx.db.insert('users', { name: 'Owner' }));
    await t.run((ctx) => ctx.db.insert('pushSubscriptions', { userId, endpoint: 'https://push.example/device-1', p256dh: 'p256dh-1', auth: 'auth-1' }));
    await t.run((ctx) => ctx.db.insert('pushSubscriptions', { userId, endpoint: 'https://push.example/device-2', p256dh: 'p256dh-2', auth: 'auth-2' }));

    await t.run((ctx) => scheduleUserNotifications(ctx, {
      userIds: [userId],
      title: 'פעולה חדשה בפרויקט',
      body: 'דני: הוספתי יומן עבודה',
      url: '/dashboard',
      tag: 'activity-123',
    }));

    const scheduled = await t.run((ctx) => ctx.db.system.query('_scheduled_functions').collect());
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0].name).toContain('pushActions:sendNotification');

    const args = scheduled[0].args[0] as any;
    expect(args.subscriptions).toHaveLength(2);
    expect(args.subscriptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ endpoint: 'https://push.example/device-1' }),
        expect.objectContaining({ endpoint: 'https://push.example/device-2' }),
      ]),
    );
    expect(args.payload).toEqual({
      title: 'פעולה חדשה בפרויקט',
      body: 'דני: הוספתי יומן עבודה',
      url: '/dashboard',
      tag: 'activity-123',
    });
  });

  test('de-dupes recipients and ignores missing/undefined user ids', async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run((ctx) => ctx.db.insert('users', { name: 'Owner' }));
    await t.run((ctx) => ctx.db.insert('pushSubscriptions', { userId, endpoint: 'https://push.example/device-1', p256dh: 'p256dh-1', auth: 'auth-1' }));

    await t.run((ctx) => scheduleUserNotifications(ctx, {
      userIds: [userId, userId, undefined, null],
      title: 'כותרת',
      body: 'גוף',
    }));

    const scheduled = await t.run((ctx) => ctx.db.system.query('_scheduled_functions').collect());
    expect(scheduled).toHaveLength(1);
    expect((scheduled[0].args[0] as any).subscriptions).toHaveLength(1);
  });

  test('saveSubscription upserts per device and removeSubscription deletes only the owner\'s subscription', async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run((ctx) => ctx.db.insert('users', { name: 'Owner' }));
    const otherUserId = await t.run((ctx) => ctx.db.insert('users', { name: 'Other' }));
    const asUser = t.withIdentity({ subject: userId });
    const asOther = t.withIdentity({ subject: otherUserId });

    await asUser.mutation(api.push.saveSubscription, { endpoint: 'https://push.example/device-1', p256dh: 'p256dh-1', auth: 'auth-1' });

    let subs = await t.run((ctx) => ctx.db.query('pushSubscriptions').withIndex('by_user', (q) => q.eq('userId', userId)).collect());
    expect(subs).toHaveLength(1);

    // Saving the same endpoint again doesn't create a duplicate row.
    await asUser.mutation(api.push.saveSubscription, { endpoint: 'https://push.example/device-1', p256dh: 'p256dh-1', auth: 'auth-1' });
    subs = await t.run((ctx) => ctx.db.query('pushSubscriptions').withIndex('by_user', (q) => q.eq('userId', userId)).collect());
    expect(subs).toHaveLength(1);

    // A different user can't remove someone else's subscription.
    await asOther.mutation(api.push.removeSubscription, { endpoint: 'https://push.example/device-1' });
    subs = await t.run((ctx) => ctx.db.query('pushSubscriptions').withIndex('by_user', (q) => q.eq('userId', userId)).collect());
    expect(subs).toHaveLength(1);

    await asUser.mutation(api.push.removeSubscription, { endpoint: 'https://push.example/device-1' });
    subs = await t.run((ctx) => ctx.db.query('pushSubscriptions').withIndex('by_user', (q) => q.eq('userId', userId)).collect());
    expect(subs).toHaveLength(0);
  });

  test('sendNotification removes an expired subscription on a 410 Gone response', async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run((ctx) => ctx.db.insert('users', { name: 'Owner' }));

    // The library validates the subscription's p256dh/auth keys before sending,
    // so they need to be the right shape (a 65-byte EC point / 16-byte secret).
    const subscriptionKeys = webPush.generateVAPIDKeys();
    const auth = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64url');
    const subId = await t.run((ctx) => ctx.db.insert('pushSubscriptions', {
      userId,
      endpoint: 'https://push.example/expired-device',
      p256dh: subscriptionKeys.publicKey,
      auth,
    }));

    // Simulate the push service responding that the subscription is gone.
    const sendSpy = vi.spyOn(webPush, 'sendNotification').mockRejectedValue(
      Object.assign(new Error('Gone'), { statusCode: 410 }),
    );
    const vapidKeys = webPush.generateVAPIDKeys();
    process.env.VAPID_PUBLIC_KEY = vapidKeys.publicKey;
    process.env.VAPID_PRIVATE_KEY = vapidKeys.privateKey;

    try {
      await t.action(internal.pushActions.sendNotification, {
        subscriptions: [{ endpoint: 'https://push.example/expired-device', p256dh: subscriptionKeys.publicKey, auth }],
        payload: { title: 'כותרת', body: 'גוף' },
      });
    } finally {
      sendSpy.mockRestore();
    }

    const sub = await t.run((ctx) => ctx.db.get(subId));
    expect(sub).toBeNull();
  });
});
