import { query, mutation } from './_generated/server';
import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import { performProjectDeletion } from './_lib/projectDeletion';
import { scheduleUserNotifications } from './notifications';
import { getActiveTier, AI_MONTHLY_LIMITS } from './_lib/entitlements';

async function checkSuperAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error('Unauthorized');
  
  const user = await ctx.db.get(userId);
  if (!user?.isSuperAdmin) {
    throw new Error('Unauthorized: Not Super Admin');
  }
  return user;
}

export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    await checkSuperAdmin(ctx);
    const users = await ctx.db.query('users').collect();

    // Global AI monthly quota override (applies to paid tiers)
    const aiGlobalSetting = await ctx.db
      .query('appSettings')
      .withIndex('by_key', (q) => q.eq('key', 'aiMonthlyLimit'))
      .first();
    const globalAiLimit = aiGlobalSetting?.numberValue;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const monthStartMs = startOfMonth.getTime();

    // Fetch per-user stats in parallel
    const usersWithStats = await Promise.all(
      users.map(async (u) => {
        const [projects, lastActivityEntry, sessions, pushSubs, authAccounts] = await Promise.all([
          // Projects owned by this user
          ctx.db
            .query('projects')
            .withIndex('by_ownerUserId', (q) => q.eq('ownerUserId', u._id))
            .collect(),
          // Most recent activity this user performed (as actor)
          ctx.db
            .query('activityFeed')
            .filter((q) => q.eq(q.field('actorUserId'), u._id))
            .order('desc')
            .first(),
          // Auth sessions — proxy for last login
          ctx.db
            .query('authSessions' as any)
            .filter((q: any) => q.eq(q.field('userId'), u._id))
            .order('desc')
            .collect(),
          // Push subscriptions — how many devices
          ctx.db
            .query('pushSubscriptions')
            .withIndex('by_user', (q) => q.eq('userId', u._id))
            .collect(),
          // Auth accounts — to know if there's a password account to verify
          ctx.db
            .query('authAccounts' as any)
            .filter((q: any) => q.eq(q.field('userId'), u._id))
            .collect(),
        ]);

        // Team members: count accepted invitations across all owned projects
        const projectIds = projects.map((p) => p._id);
        let teamMemberCount = 0;
        if (projectIds.length > 0) {
          const invitations = await Promise.all(
            projectIds.map((pid) =>
              ctx.db
                .query('projectInvitations')
                .withIndex('by_project', (q) => q.eq('projectId', pid))
                .filter((q) => q.neq(q.field('consumedByUserId'), undefined))
                .collect(),
            ),
          );
          // Unique users who joined (deduplicate across projects)
          const uniqueMembers = new Set(
            invitations.flat().map((inv: any) => inv.consumedByUserId).filter(Boolean),
          );
          teamMemberCount = uniqueMembers.size;
        }

        // Last login: most recent session's _creationTime
        const lastSessionAt =
          sessions.length > 0
            ? Math.max(...sessions.map((s: any) => s._creationTime))
            : null;

        // Last daily log: find most recent log date across all owned projects
        let lastDailyLogDate: string | null = null;
        if (projectIds.length > 0) {
          const recentLogs = await Promise.all(
            projectIds.map((pid) =>
              ctx.db
                .query('dailyLogs')
                .withIndex('by_project_date', (q) => q.eq('projectId', pid))
                .order('desc')
                .first(),
            ),
          );
          // date is a string like "2026-07-16" — lexicographic max = most recent
          const dates = recentLogs.map((l) => l?.date).filter(Boolean) as string[];
          if (dates.length > 0) {
            lastDailyLogDate = dates.reduce((a, b) => (a > b ? a : b));
          }
        }

        // AI usage this calendar month (all features)
        const aiLogs = await ctx.db
          .query('aiUsageLogs')
          .withIndex('by_user_feature_at', (q) => q.eq('userId', u._id))
          .collect();
        const aiUsedThisMonth = aiLogs.filter((l) => l.at >= monthStartMs).length;

        const tier = getActiveTier(u);
        const baseLimit =
          tier !== 'free' && globalAiLimit !== undefined
            ? globalAiLimit
            : (AI_MONTHLY_LIMITS[tier] ?? 0);
        const aiLimitPerMonth = u.isSuperAdmin
          ? 9999
          : baseLimit + (u.aiLimitOverride ?? 0);

        const passwordAccount = (authAccounts as any[]).find((a) => a.provider === 'password');

        return {
          ...u,
          hasPasswordAccount: !!passwordAccount,
          // Verified = user-level timestamp OR the password account itself is marked verified
          emailVerified: !!u.emailVerificationTime || !!passwordAccount?.emailVerified,
          aiUsedThisMonth,
          aiLimitPerMonth,
          aiRemaining: Math.max(0, aiLimitPerMonth - aiUsedThisMonth),
          projectCount: projects.length,
          lastActivityAt: lastActivityEntry?.createdAt ?? null,
          lastSessionAt,
          pushDeviceCount: pushSubs.length,
          teamMemberCount,
          lastDailyLogDate,
        };
      }),
    );

    return usersWithStats;
  },
});



export const updateUserStatus = mutation({
  args: {
    userId: v.id('users'),
    isSuspended: v.optional(v.boolean()),
    subscriptionTier: v.optional(
      v.union(v.literal('free'), v.literal('pro'), v.literal('premium')),
    ),
    subscriptionExpiresAt: v.optional(v.union(v.number(), v.null())),
    role: v.optional(v.union(
      v.literal('owner'),
      v.literal('manager'),
      v.literal('inspector'),
      v.literal('contractor')
    )),
  },
  handler: async (ctx, args) => {
    await checkSuperAdmin(ctx);

    const target = await ctx.db.get(args.userId);

    const patch: any = {};
    if (args.isSuspended !== undefined) patch.isSuspended = args.isSuspended;
    if (args.subscriptionTier !== undefined) patch.subscriptionTier = args.subscriptionTier;
    if (args.subscriptionExpiresAt !== undefined) patch.subscriptionExpiresAt = args.subscriptionExpiresAt === null ? undefined : args.subscriptionExpiresAt;
    if (args.role !== undefined) patch.role = args.role;

    if (Object.keys(patch).length > 0) {
      if (args.subscriptionExpiresAt === null) {
        // To remove the field if they are downgraded to free
        patch.subscriptionExpiresAt = undefined;
      }
      await ctx.db.patch(args.userId, patch);
    }

    if (args.subscriptionTier !== undefined && target?.subscriptionTier !== args.subscriptionTier) {
      await ctx.db.insert('subscriptionEvents', {
        userId: args.userId,
        fromTier: target?.subscriptionTier,
        toTier: args.subscriptionTier,
        source: 'admin',
        expiresAt: args.subscriptionExpiresAt ?? undefined,
        at: Date.now(),
      });
    }
  },
});

export const getUserProjects = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    await checkSuperAdmin(ctx);
    return await ctx.db
      .query('projects')
      .withIndex('by_ownerUserId', (q) => q.eq('ownerUserId', args.userId))
      .collect();
  },
});

export const deleteUserProject = mutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    await checkSuperAdmin(ctx);
    await performProjectDeletion(ctx as any, args.projectId);
  },
});

export const deleteUserCascade = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    await checkSuperAdmin(ctx);
    
    // Find all projects owned by this user
    const projects = await ctx.db
      .query('projects')
      .withIndex('by_ownerUserId', (q) => q.eq('ownerUserId', args.userId))
      .collect();
      
    // Delete each project cascading
    for (const project of projects) {
      await performProjectDeletion(ctx as any, project._id);
    }
    
    // Delete personal files, if any
    const personalFiles = await ctx.db
      .query('personalFiles')
      .withIndex('by_owner', (q) => q.eq('ownerUserId', args.userId))
      .collect();
    for (const pf of personalFiles) {
      try { await ctx.storage.delete(pf.storageId); } catch {}
      await ctx.db.delete(pf._id);
    }
    
    // Clean up Convex Auth internal tables so the email is freed up
    const authAccounts = await ctx.db
      .query('authAccounts' as any)
      .filter((q: any) => q.eq(q.field('userId'), args.userId))
      .collect();
    for (const acc of authAccounts) {
      await ctx.db.delete(acc._id);
    }

    const authSessions = await ctx.db
      .query('authSessions' as any)
      .filter((q: any) => q.eq(q.field('userId'), args.userId))
      .collect();
    for (const sess of authSessions) {
      const tokens = await ctx.db
        .query('authRefreshTokens' as any)
        .filter((q: any) => q.eq(q.field('sessionId'), sess._id))
        .collect();
      for (const t of tokens) await ctx.db.delete(t._id);
      await ctx.db.delete(sess._id);
    }
    
    // Finally, delete the user
    await ctx.db.delete(args.userId);
  },
});

import { action } from './_generated/server';
import { api } from './_generated/api';
import { modifyAccountCredentials } from '@convex-dev/auth/server';

export const forceResetPassword = action({
  args: {
    userId: v.id('users'),
    email: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');
    
    // In an action we must use runQuery to get the current user
    const me = await ctx.runQuery(api.users.me, {});
    if (!me?.isSuperAdmin) {
      throw new Error('Unauthorized: Not Super Admin');
    }

    if (args.newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    // Check if the user actually has a password account
    const accounts = await ctx.runQuery(api.superAdmin.getUserAccounts as any, { userId: args.userId });
    const hasPassword = accounts?.some((acc: any) => acc.provider === 'password');
    if (!hasPassword) {
      throw new Error('לא ניתן לאפס סיסמה: המשתמש נרשם באמצעות Google ולכן אין לו סיסמה במערכת.');
    }

    try {
      await modifyAccountCredentials(ctx, {
        provider: 'password',
        account: { id: args.email, secret: args.newPassword },
      });
    } catch (e: any) {
      throw new Error('שגיאה באיפוס הסיסמה: ' + e.message);
    }
  },
});

export const getUserById = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

import { Polar } from '@polar-sh/sdk';

export const cancelUserSubscription = action({
  args: { 
    userId: v.id('users'),
    isSuspended: v.optional(v.boolean()),
    role: v.optional(v.union(
      v.literal('owner'),
      v.literal('manager'),
      v.literal('inspector'),
      v.literal('contractor')
    )),
  },
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) throw new Error("Unauthorized");
    
    // Check if superadmin
    const me = await ctx.runQuery(api.users.me, {});
    if (!me?.isSuperAdmin) {
      throw new Error("Unauthorized: Not Super Admin");
    }

    const targetUser = await ctx.runQuery(api.superAdmin.getUserById, { userId: args.userId });
    if (!targetUser) {
      throw new Error("User not found");
    }

    if (targetUser.polarSubscriptionId) {
      const polarToken = process.env.POLAR_ACCESS_TOKEN;
      if (!polarToken) {
        console.warn("Missing POLAR_ACCESS_TOKEN in Convex environment variables. Skipping Polar revocation.");
      } else {
        const polar = new Polar({
          accessToken: polarToken,
          server: (process.env.POLAR_SERVER as "sandbox" | "production") || "sandbox"
        });
        
        try {
          await polar.subscriptions.revoke({ id: targetUser.polarSubscriptionId });
        } catch (err: any) {
          console.error("Failed to revoke subscription in Polar:", err);
          // We do not throw here, so that the local database still updates to free.
        }
      }
    }

    await ctx.runMutation(api.superAdmin.updateUserStatus, {
      userId: args.userId,
      subscriptionTier: 'free',
      subscriptionExpiresAt: null,
      isSuspended: args.isSuspended,
      role: args.role,
    });
  }
});

export const getUserAccounts = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('authAccounts' as any)
      .filter((q: any) => q.eq(q.field('userId'), args.userId))
      .collect();
  },
});

export const getPromoCodes = query({
  args: {},
  handler: async (ctx) => {
    await checkSuperAdmin(ctx);
    return await ctx.db.query('promoCodes').order('desc').collect();
  },
});

export const generatePromoCode = mutation({
  args: {
    tier: v.union(v.literal('pro'), v.literal('premium')),
    validityDays: v.number(),
    maxUses: v.number(),
    subscriptionDurationMonths: v.number(),
  },
  handler: async (ctx, args) => {
    await checkSuperAdmin(ctx);
    
    // Generate a random string of 8 characters
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const expiresAt = Date.now() + args.validityDays * 24 * 60 * 60 * 1000;
    
    await ctx.db.insert('promoCodes', {
      code,
      tier: args.tier,
      expiresAt,
      maxUses: args.maxUses,
      currentUses: 0,
      subscriptionDurationMonths: args.subscriptionDurationMonths,
    });
    
    return code;
  },
});

export const deletePromoCode = mutation({
  args: { promoCodeId: v.id('promoCodes') },
  handler: async (ctx, args) => {
    await checkSuperAdmin(ctx);
    await ctx.db.delete(args.promoCodeId);
  },
});

// Provides at-a-glance diagnostics for the push notification system.
// Exposed in the Super Admin screen so the admin can quickly tell
// whether there are push subscriptions, and for how many users.
export const getPushDiagnostics = query({
  args: {},
  handler: async (ctx) => {
    await checkSuperAdmin(ctx);

    const allSubscriptions = await ctx.db.query('pushSubscriptions').collect();
    const uniqueUserIds = new Set(allSubscriptions.map((s) => s.userId));

    return {
      totalSubscriptions: allSubscriptions.length,
      usersWithSubscriptions: uniqueUserIds.size,
    };
  },
});

// Dev-only helper (exposed in the Super Admin screen behind import.meta.env.DEV)
// to verify the Web Push pipeline end-to-end against a real device subscription.
export const sendTestPushNotification = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const admin = await checkSuperAdmin(ctx);

    const subscriptions = await ctx.db
      .query('pushSubscriptions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    if (subscriptions.length === 0) {
      return { subscriptionCount: 0 };
    }

    await scheduleUserNotifications(ctx, {
      userIds: [args.userId],
      title: '🔔 התראת בדיקה',
      body: `נשלח על ידי ${admin.name || admin.email || 'מנהל מערכת'} בשעה ${new Date().toLocaleTimeString('he-IL')}`,
      url: '/account',
      // Unique per send so repeated test clicks each show as a fresh
      // notification instead of collapsing into one (via renotify+tag).
      tag: `test-push-${Date.now()}`,
    });

    return { subscriptionCount: subscriptions.length };
  },
});

// Manually mark a user's email as verified, without sending a verification
// email — for test accounts and support cases. Mirrors exactly what
// @convex-dev/auth does after a successful OTP verification: sets
// `emailVerified` on the password authAccount (the field Password's sign-in
// gate checks) and `emailVerificationTime` on the user.
// NOTE: touches the library's internal authAccounts/authVerificationCodes
// tables — revisit if @convex-dev/auth changes its internal format.
export const verifyUserEmail = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    await checkSuperAdmin(ctx);

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error('User not found');
    if (!user.email) throw new Error('למשתמש אין כתובת אימייל');

    const accounts = await ctx.db
      .query('authAccounts' as any)
      .filter((q: any) => q.eq(q.field('userId'), args.userId))
      .collect();
    const passwordAccount = (accounts as any[]).find((a) => a.provider === 'password');
    if (!passwordAccount) {
      throw new Error('למשתמש אין חשבון סיסמה — הוא נרשם עם Google ומאומת אוטומטית.');
    }

    await ctx.db.patch(passwordAccount._id, { emailVerified: user.email } as any);
    if (!user.emailVerificationTime) {
      await ctx.db.patch(args.userId, { emailVerificationTime: Date.now() });
    }

    // Pending OTP codes are now moot — clean them up
    const codes = await ctx.db
      .query('authVerificationCodes' as any)
      .filter((q: any) => q.eq(q.field('accountId'), passwordAccount._id))
      .collect();
    for (const c of codes) {
      await ctx.db.delete(c._id);
    }
  },
});

// Global monthly AI request quota for paid (pro/premium) subscribers.
// Returns null when no override is set (the code default applies).
export const getGlobalAiLimit = query({
  args: {},
  handler: async (ctx) => {
    await checkSuperAdmin(ctx);
    const setting = await ctx.db
      .query('appSettings')
      .withIndex('by_key', (q) => q.eq('key', 'aiMonthlyLimit'))
      .first();
    return {
      value: setting?.numberValue ?? null,
      defaultValue: AI_MONTHLY_LIMITS.pro,
    };
  },
});

export const setGlobalAiLimit = mutation({
  args: {
    // null clears the override and falls back to the code default
    limit: v.union(v.number(), v.null()),
  },
  handler: async (ctx, args) => {
    await checkSuperAdmin(ctx);
    if (args.limit !== null && (args.limit < 0 || !Number.isFinite(args.limit))) {
      throw new Error('Limit must be a non-negative number');
    }

    const existing = await ctx.db
      .query('appSettings')
      .withIndex('by_key', (q) => q.eq('key', 'aiMonthlyLimit'))
      .first();

    if (args.limit === null) {
      if (existing) await ctx.db.delete(existing._id);
      return;
    }

    if (existing) {
      await ctx.db.patch(existing._id, { numberValue: args.limit });
    } else {
      await ctx.db.insert('appSettings', { key: 'aiMonthlyLimit', numberValue: args.limit });
    }
  },
});

export const updateAiLimitOverride = mutation({
  args: {
    userId: v.id('users'),
    override: v.number(),
  },
  handler: async (ctx, args) => {
    await checkSuperAdmin(ctx);
    await ctx.db.patch(args.userId, { aiLimitOverride: args.override });
  },
});
