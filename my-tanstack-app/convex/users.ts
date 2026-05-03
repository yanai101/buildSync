import { action, mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { api } from './_generated/api';
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
    await ctx.db.patch(userId, { 
      subscriptionTier: promo.tier,
      subscriptionExpiresAt 
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

export const toggleSubscription = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');
    
    const user = await ctx.db.get(userId);
    if (!user) throw new Error('User not found');

    const newTier = user.subscriptionTier === 'pro' ? 'free' : 'pro';
    
    await ctx.db.patch(userId, {
      subscriptionTier: newTier,
      // Give them a 1-year subscription when toggling to pro
      subscriptionExpiresAt: newTier === 'pro' ? Date.now() + 365 * 24 * 60 * 60 * 1000 : undefined,
    });
    
    return newTier;
  },
});
