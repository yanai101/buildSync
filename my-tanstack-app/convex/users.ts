import { action, mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { api } from './_generated/api';
import { Polar } from '@polar-sh/sdk';
import {
  getAuthUserId,
  createAccount,
  modifyAccountCredentials,
  retrieveAccount,
} from '@convex-dev/auth/server';

export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    return await ctx.db.get(userId);
  },
});

export const currentIdentity = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const user = await ctx.db.get(userId);
    const now = Date.now();
    const isExpired = user?.subscriptionExpiresAt && now > user.subscriptionExpiresAt;
    
    return {
      userId,
      email: user?.email ?? null,
      name: user?.name ?? null,
      role: user?.role ?? null,
      isSuperAdmin: user?.isSuperAdmin ?? false,
      subscriptionTier: isExpired ? undefined : user?.subscriptionTier,
      subscriptionExpiresAt: user?.subscriptionExpiresAt,
      isSubscriptionExpired: isExpired,
    };
  },
});

export const isEmailTaken = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('email', (q) => q.eq('email', args.email.trim().toLowerCase()))
      .first();
    return user !== null;
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    avatarLetter: v.optional(v.string()),
    avatarColor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const patch: Record<string, string> = {};
    if (args.name !== undefined) patch.name = args.name.trim();
    if (args.phone !== undefined) patch.phone = args.phone.trim();
    if (args.avatarLetter !== undefined) {
      patch.avatarLetter = args.avatarLetter.trim().slice(0, 2);
    }
    if (args.avatarColor !== undefined) patch.avatarColor = args.avatarColor;

    await ctx.db.patch(userId, patch);
  },
});

export const updatePassword = action({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }
    if (args.newPassword.length < 8) {
      throw new Error('הסיסמה החדשה חייבת להכיל לפחות 8 תווים');
    }
    if (args.currentPassword === args.newPassword) {
      throw new Error('הסיסמה החדשה זהה לסיסמה הנוכחית');
    }

    const me = await ctx.runQuery(api.users.me, {});
    if (!me?.email) {
      throw new Error('לא נמצא אימייל בחשבון');
    }

    try {
      await retrieveAccount(ctx, {
        provider: 'password',
        account: { id: me.email, secret: args.currentPassword },
      });
    } catch {
      throw new Error('הסיסמה הנוכחית אינה נכונה');
    }

    await modifyAccountCredentials(ctx, {
      provider: 'password',
      account: { id: me.email, secret: args.newPassword },
    });
  },
});

export const redeemPromoCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { success: false, error: 'Unauthorized' };

    const promo = await ctx.db
      .query('promoCodes')
      .withIndex('by_code', (q) => q.eq('code', args.code))
      .first();

    if (!promo) {
      return { success: false, error: 'קוד ההרשמה אינו קיים' };
    }
    
    if (promo.currentUses >= promo.maxUses) {
      return { success: false, error: 'קוד ההרשמה הגיע למכסת השימושים המקסימלית שלו' };
    }
    
    if (Date.now() > promo.expiresAt) {
      return { success: false, error: 'קוד ההרשמה פג תוקף' };
    }

    // Check if user already redeemed this promo
    const existingRedemption = await ctx.db
      .query('promoRedemptions')
      .withIndex('by_promo_and_user', (q) => q.eq('promoCodeId', promo._id).eq('userId', userId))
      .first();
    
    if (existingRedemption) {
      return { success: false, error: 'כבר ניצלת את קוד ההרשמה הזה בעבר' };
    }

    // Calculate expiration date for the user's subscription
    const subscriptionExpiresAt = Date.now() + (promo.subscriptionDurationMonths * 30 * 24 * 60 * 60 * 1000);

    // Apply the subscription
    const userBefore = await ctx.db.get(userId);
    await ctx.db.patch(userId, {
      subscriptionTier: promo.tier,
      subscriptionExpiresAt
    });

    await ctx.db.insert('subscriptionEvents', {
      userId,
      fromTier: userBefore?.subscriptionTier,
      toTier: promo.tier,
      source: 'promo',
      expiresAt: subscriptionExpiresAt,
      at: Date.now(),
    });

    // Mark code as used
    await ctx.db.patch(promo._id, {
      currentUses: promo.currentUses + 1,
    });

    // Record the redemption
    await ctx.db.insert('promoRedemptions', {
      promoCodeId: promo._id,
      userId,
      redeemedAt: Date.now(),
    });

    return { success: true, tier: promo.tier };
  },
});

// Creates a Polar customer-portal session for the *authenticated* caller only.
// The customer is resolved from the caller's own user id (used as the Polar
// external customer id at checkout), so a user can never open someone else's
// billing portal — unlike trusting a client-supplied customerId.
export const createPortalSession = action({
  args: {},
  handler: async (ctx): Promise<{ url?: string; error?: string; rawError?: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const token = process.env.POLAR_ACCESS_TOKEN;
    if (!token) throw new Error('POLAR_ACCESS_TOKEN is not configured');

    const baseUrl = process.env.SITE_URL || 'https://buildsync.co.il';
    const polar = new Polar({
      accessToken: token,
      server: (process.env.POLAR_SERVER as 'sandbox' | 'production') || 'sandbox',
    });

    const user = await ctx.runQuery(api.users.me, {});
    const customerId = user?.polarCustomerId;

    try {
      const payload = customerId
        ? { customerId, returnUrl: `${baseUrl}/account` }
        : { externalCustomerId: userId, returnUrl: `${baseUrl}/account` };

      const session = await polar.customerSessions.create(payload as any);
      return { url: session.customerPortalUrl };
    } catch (err: any) {
      console.error("Polar portal session error:", err);
      const msg = err.message?.toLowerCase() || "";
      const status = err.statusCode || err.status || 0;
      
      // If Polar says the customer doesn't exist or is invalid for this (excluding 401 auth errors)
      if (status !== 401 && (status === 404 || status === 422 || msg.includes('404') || msg.includes('not found') || msg.includes('invalid'))) {
        return { error: "CUSTOMER_NOT_FOUND", rawError: msg || String(status) };
      }
      
      return { error: "POLAR_SYSTEM_ERROR", rawError: msg || String(status) };
    }
  },
});

export const getPromoCodeStatus = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const promo = await ctx.db
      .query('promoCodes')
      .withIndex('by_code', (q) => q.eq('code', args.code))
      .first();

    if (!promo) {
      return { status: 'not_found' };
    }
    
    if (promo.currentUses >= promo.maxUses) {
      return { status: 'fully_used' };
    }
    
    if (Date.now() > promo.expiresAt) {
      return { status: 'expired' };
    }

    return { status: 'valid', tier: promo.tier };
  },
});

// Dev/admin-only testing helper. Self-grant of a paid tier must never be
// reachable by ordinary users, so this is gated behind the super-admin flag.
export const toggleSubscription = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const user = await ctx.db.get(userId);
    if (!user) throw new Error('User not found');
    if (!user.isSuperAdmin) {
      throw new Error('Unauthorized: Not Super Admin');
    }

    const newTier = user.subscriptionTier === 'pro' ? 'free' : 'pro';

    await ctx.db.patch(userId, {
      subscriptionTier: newTier,
      // Give them a 1-year subscription when toggling to pro
      subscriptionExpiresAt: newTier === 'pro' ? Date.now() + 365 * 24 * 60 * 60 * 1000 : undefined,
    });

    await ctx.db.insert('subscriptionEvents', {
      userId,
      fromTier: user.subscriptionTier,
      toTier: newTier,
      source: 'admin',
      expiresAt: newTier === 'pro' ? Date.now() + 365 * 24 * 60 * 60 * 1000 : undefined,
      at: Date.now(),
    });

    return newTier;
  },
});

// Applies a subscription change coming from the Polar webhook. The webhook
// (which already verifies Polar's HMAC signature in the TanStack edge handler)
// proves it is the trusted caller by passing the shared SUBSCRIPTION_SYNC_SECRET.
// Without a matching secret this mutation is inert, so it cannot be abused to
// self-upgrade or tamper with another user's plan.
export const updateSubscription = mutation({
  args: {
    secret: v.string(),
    userId: v.id('users'),
    subscriptionTier: v.union(
      v.literal('free'),
      v.literal('pro'),
      v.literal('premium'),
    ),
    subscriptionExpiresAt: v.optional(v.number()),
    subscriptionInterval: v.optional(
      v.union(v.literal('month'), v.literal('year')),
    ),
    subscriptionAutoRenew: v.optional(v.boolean()),
    polarCustomerId: v.optional(v.string()),
    polarSubscriptionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const expected = process.env.SUBSCRIPTION_SYNC_SECRET;
    if (!expected) {
      throw new Error('SUBSCRIPTION_SYNC_SECRET is not configured');
    }
    if (args.secret !== expected) {
      throw new Error('Unauthorized');
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error('User not found');
    }

    await ctx.db.patch(args.userId, {
      subscriptionTier: args.subscriptionTier,
      subscriptionExpiresAt: args.subscriptionExpiresAt,
      // undefined clears the field (e.g. when the subscription ended)
      subscriptionInterval: args.subscriptionInterval,
      subscriptionAutoRenew: args.subscriptionAutoRenew,
      polarCustomerId: args.polarCustomerId,
      polarSubscriptionId: args.polarSubscriptionId,
    });

    if (user.subscriptionTier !== args.subscriptionTier) {
      await ctx.db.insert('subscriptionEvents', {
        userId: args.userId,
        fromTier: user.subscriptionTier,
        toTier: args.subscriptionTier,
        source: 'webhook',
        expiresAt: args.subscriptionExpiresAt,
        polarSubscriptionId: args.polarSubscriptionId,
        at: Date.now(),
      });
    }

    return null;
  },
});
