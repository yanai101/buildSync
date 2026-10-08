import { mutation, query } from './_generated/server';
import { ConvexError, v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';
import { getActiveTier } from './_lib/entitlements';

const FREE_TIER_MAX_NOTES = 5;

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const notes = await ctx.db
      .query('quickNotes')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .take(200);

    return notes.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const create = mutation({
  args: {
    text: v.string(),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const tier = getActiveTier(user);
    if (tier === 'free') {
      const existingNotes = await ctx.db
        .query('quickNotes')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect();
      
      if (existingNotes.length >= FREE_TIER_MAX_NOTES) {
        throw new ConvexError({
          code: 'FREE_NOTE_LIMIT',
          message: 'משתמשי חינם יכולים לשמור עד 5 פתקים. שדרג לפרו כדי ליצור פתקים ללא הגבלה.',
        });
      }
    }

    const noteId = await ctx.db.insert('quickNotes', {
      userId,
      text: args.text,
      color: args.color,
      createdAt: Date.now(),
    });

    return noteId;
  },
});

export const remove = mutation({
  args: {
    noteId: v.id('quickNotes'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== userId) {
      throw new Error('Note not found or access denied');
    }

    await ctx.db.delete(args.noteId);
  },
});
