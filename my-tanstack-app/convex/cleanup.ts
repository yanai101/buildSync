import { internalMutation, internalAction, query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { performProjectDeletion } from './_lib/projectDeletion';
import { internal } from './_generated/api';
import { getAuthUserId } from '@convex-dev/auth/server';

const INACTIVITY_MONTHS = 3;
const INACTIVITY_MS = INACTIVITY_MONTHS * 30 * 24 * 60 * 60 * 1000;

export const getCleanupCandidates = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');
    const user = await ctx.db.get(userId);
    if (!user || !user.isSuperAdmin) throw new Error('Unauthorized');

    const now = Date.now();
    const projects = await ctx.db.query('projects').collect();
    const candidates = [];

    for (const project of projects) {
      if (!project.ownerUserId) continue;
      const owner = await ctx.db.get(project.ownerUserId);
      if (!owner) continue;

      const lastActivityAt = project.lastActivityAt ?? project._creationTime;
      const inactiveMs = now - lastActivityAt;
      const isInactive = inactiveMs > INACTIVITY_MS;

      const isFreeTier = !owner.subscriptionTier || owner.subscriptionTier === 'free';
      const isSubscriptionExpired =
        owner.subscriptionExpiresAt !== undefined &&
        owner.subscriptionExpiresAt < now - INACTIVITY_MS;

      // Rule 1: Free tier + 3 months inactive = delete
      // Rule 2: Paid tier expired 3 months ago + 3 months inactive = delete
      if (isInactive && (isFreeTier || isSubscriptionExpired)) {
        candidates.push({
          project,
          ownerEmail: owner.email,
          ownerName: owner.name,
          inactiveDays: Math.floor(inactiveMs / (1000 * 60 * 60 * 24)),
          reason: isFreeTier ? 'Free tier & inactive' : 'Subscription expired & inactive',
        });
      }
    }

    return candidates;
  },
});

export const performCleanupBatch = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const projects = await ctx.db.query('projects').collect();

    // We only process one project per batch to avoid timeout
    for (const project of projects) {
      if (!project.ownerUserId) continue;
      const owner = await ctx.db.get(project.ownerUserId);
      if (!owner) continue;

      const lastActivityAt = project.lastActivityAt ?? project._creationTime;
      const inactiveMs = now - lastActivityAt;
      const isInactive = inactiveMs > INACTIVITY_MS;

      const isFreeTier = !owner.subscriptionTier || owner.subscriptionTier === 'free';
      const isSubscriptionExpired =
        owner.subscriptionExpiresAt !== undefined &&
        owner.subscriptionExpiresAt < now - INACTIVITY_MS;

      if (isInactive && (isFreeTier || isSubscriptionExpired)) {
        await performProjectDeletion(ctx, project._id);
        // Only delete one per run to avoid hitting limits
        return { deletedProjectId: project._id, projectName: project.name };
      }
    }

    return { deletedProjectId: null };
  },
});

export const manualDeleteProject = mutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');
    const user = await ctx.db.get(userId);
    if (!user || !user.isSuperAdmin) throw new Error('Unauthorized');

    await performProjectDeletion(ctx, args.projectId);
  },
});

export const createSimulatedInactiveProject = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');
    const me = await ctx.db.get(userId);
    if (!me || !me.isSuperAdmin) throw new Error('Unauthorized');

    // 1. Create a dummy user
    const dummyUserId = await ctx.db.insert('users', {
      name: 'משתמש סימולציה (למחיקה)',
      email: `dummy_${Date.now()}@example.com`,
      role: 'owner',
      subscriptionTier: 'free',
      isSuspended: false,
    });

    const fourMonthsAgo = Date.now() - 4 * 30 * 24 * 60 * 60 * 1000;

    // 2. Create a dummy project for them
    const projectId = await ctx.db.insert('projects', {
      name: 'פרויקט סימולציה למחיקה אוטומטית',
      address: 'רחוב הסימולציה 1',
      ownerUserId: dummyUserId,
      startDate: new Date().toISOString(),
      expectedEnd: new Date().toISOString(),
      progressPct: 10,
      budgetTotal: 0,
      spent: 0,
      lastActivityAt: fourMonthsAgo,
    });

    return projectId;
  },
});
