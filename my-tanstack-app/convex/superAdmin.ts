import { query, mutation } from './_generated/server';
import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import { performProjectDeletion } from './_lib/projectDeletion';

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
    
    // Attach project counts to each user
    const usersWithStats = await Promise.all(
      users.map(async (u) => {
        const projects = await ctx.db
          .query('projects')
          .withIndex('by_ownerUserId', (q) => q.eq('ownerUserId', u._id))
          .collect();
        return {
          ...u,
          projectCount: projects.length,
        };
      })
    );
    
    return usersWithStats;
  },
});

export const updateUserStatus = mutation({
  args: {
    userId: v.id('users'),
    isSuspended: v.optional(v.boolean()),
    subscriptionTier: v.optional(v.string()),
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
      if (!polarToken) throw new Error("Missing POLAR_ACCESS_TOKEN");
      const polar = new Polar({ accessToken: polarToken });
      
      try {
        await polar.subscriptions.revoke({ id: targetUser.polarSubscriptionId });
      } catch (err: any) {
        console.error("Failed to revoke subscription in Polar:", err);
        // We do not throw here, so that the local database still updates to free.
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
