/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, test, expect } from 'vitest';
import schema from './schema';
import { api } from './_generated/api';

const modules = import.meta.glob('./**/*.ts');

/**
 * Helper — create a project with a pro-tier owner.
 * dailyLogs requires at least 'pro' subscription.
 */
async function setupProject(
  t: ReturnType<typeof convexTest>,
  opts: { withManager?: boolean } = {},
) {
  const ownerId = await t.run((ctx) =>
    ctx.db.insert('users', {
      name: 'בעל הפרויקט',
      role: 'owner',
      subscriptionTier: 'pro',           // required for dailyLogs feature
      subscriptionExpiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
    }),
  );
  const managerId = opts.withManager
    ? await t.run((ctx) =>
        ctx.db.insert('users', { name: 'מנהל עבודה', role: 'manager' }),
      )
    : undefined;

  const projectId = await t.run((ctx) =>
    ctx.db.insert('projects', {
      name: 'פרויקט בדיקה',
      ownerUserId: ownerId,
      managerUserId: managerId,
    }),
  );

  return { ownerId, managerId, projectId };
}

/** Helper — register a push subscription for a user */
async function registerDevice(
  t: ReturnType<typeof convexTest>,
  userId: string,
  tag = 'device-1',
) {
  return t.run((ctx) =>
    ctx.db.insert('pushSubscriptions', {
      userId: userId as any,
      endpoint: `https://push.example/${userId}-${tag}`,
      p256dh: 'p256dh',
      auth: 'auth',
    }),
  );
}

/** Helper — add an inspector user and attach them to the project */
async function addInspector(
  t: ReturnType<typeof convexTest>,
  projectId: string,
) {
  const inspectorId = await t.run((ctx) =>
    ctx.db.insert('users', { name: 'מפקח', role: 'inspector' }),
  );
  await t.run((ctx) =>
    ctx.db.patch(projectId as any, { inspectorUserId: inspectorId }),
  );
  return inspectorId;
}

const emptyLog = {
  workforce: [] as any[],
  activities: [] as any[],
  deliveries: [] as any[],
  issues: [] as any[],
  instructions: [] as any[],
};

describe('dailyLogs.saveLog — push notifications', () => {
  test('sends push to owner with correct deep-link URL when inspector creates a log', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, projectId } = await setupProject(t);
    await registerDevice(t, ownerId, 'owner');
    const inspectorId = await addInspector(t, projectId);

    const asInspector = t.withIdentity({ subject: inspectorId });
    await asInspector.mutation(api.dailyLogs.saveLog, {
      projectId,
      date: '2026-07-23',
      ...emptyLog,
    });

    const scheduled = await t.run((ctx) =>
      ctx.db.system.query('_scheduled_functions').collect(),
    );
    const pushCalls = scheduled.filter((s) =>
      s.name.includes('pushActions:sendNotification'),
    );

    const ownerEndpoint = `https://push.example/${ownerId}-owner`;
    const ownerCall = pushCalls.find((s) =>
      (s.args[0] as any).subscriptions.some(
        (sub: any) => sub.endpoint === ownerEndpoint,
      ),
    );

    expect(ownerCall).toBeDefined();
    const payload = (ownerCall!.args[0] as any).payload;
    expect(payload.url).toBe(`/daily-logs?project=${projectId}&date=2026-07-23`);
    expect(payload.tag).toBe(`daily-log-${projectId}-2026-07-23`);
  });

  test('also notifies the manager when managerUserId is set', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, managerId, projectId } = await setupProject(t, {
      withManager: true,
    });
    await registerDevice(t, ownerId, 'owner');
    await registerDevice(t, managerId!, 'manager');
    const inspectorId = await addInspector(t, projectId);

    const asInspector = t.withIdentity({ subject: inspectorId });
    await asInspector.mutation(api.dailyLogs.saveLog, {
      projectId,
      date: '2026-07-23',
      ...emptyLog,
    });

    const scheduled = await t.run((ctx) =>
      ctx.db.system.query('_scheduled_functions').collect(),
    );
    const allEndpoints = scheduled
      .filter((s) => s.name.includes('pushActions:sendNotification'))
      .flatMap((s) => (s.args[0] as any).subscriptions.map((sub: any) => sub.endpoint));

    expect(allEndpoints).toContain(`https://push.example/${ownerId}-owner`);
    expect(allEndpoints).toContain(`https://push.example/${managerId}-manager`);
  });

  test('creator does NOT receive a push about their own log', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, projectId } = await setupProject(t);
    await registerDevice(t, ownerId, 'owner');

    // Owner creates their own log — should NOT receive a notification
    const asOwner = t.withIdentity({ subject: ownerId });
    await asOwner.mutation(api.dailyLogs.saveLog, {
      projectId,
      date: '2026-07-23',
      ...emptyLog,
    });

    const scheduled = await t.run((ctx) =>
      ctx.db.system.query('_scheduled_functions').collect(),
    );
    const allEndpoints = scheduled
      .filter((s) => s.name.includes('pushActions:sendNotification'))
      .flatMap((s) => (s.args[0] as any).subscriptions.map((sub: any) => sub.endpoint));

    expect(allEndpoints).not.toContain(`https://push.example/${ownerId}-owner`);
  });

  test('updating an existing log does NOT trigger a new push', async () => {
    const t = convexTest(schema, modules);
    const { ownerId, projectId } = await setupProject(t);
    await registerDevice(t, ownerId, 'owner');
    const inspectorId = await addInspector(t, projectId);

    const asInspector = t.withIdentity({ subject: inspectorId });

    // First save — creates the log (sends push)
    const logId = await asInspector.mutation(api.dailyLogs.saveLog, {
      projectId,
      date: '2026-07-23',
      ...emptyLog,
    });

    const afterCreate = await t.run((ctx) =>
      ctx.db.system.query('_scheduled_functions').collect(),
    );
    const pushCountAfterCreate = afterCreate.filter((s) =>
      s.name.includes('pushActions:sendNotification'),
    ).length;

    // Second save — update only, should NOT schedule another push
    await asInspector.mutation(api.dailyLogs.saveLog, {
      logId,
      projectId,
      date: '2026-07-23',
      weather: 'שמשי',
      ...emptyLog,
    });

    const afterUpdate = await t.run((ctx) =>
      ctx.db.system.query('_scheduled_functions').collect(),
    );
    const pushCountAfterUpdate = afterUpdate.filter((s) =>
      s.name.includes('pushActions:sendNotification'),
    ).length;

    expect(pushCountAfterUpdate).toBe(pushCountAfterCreate);
  });
});
