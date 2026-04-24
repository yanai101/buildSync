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
    return {
      userId,
      email: user?.email ?? null,
      name: user?.name ?? null,
      role: user?.role ?? null,
    };
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

