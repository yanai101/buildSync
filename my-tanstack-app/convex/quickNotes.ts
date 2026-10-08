import { Id } from "./_generated/dataModel";

import { mutation, query } from './_generated/server';
import { ConvexError, v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';
import { getActiveTier } from './_lib/entitlements';

const FREE_TIER_MAX_NOTES = 5;

export const list = query({
  args: {
    projectId: v.id('projects'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const notes = await ctx.db
      .query('quickNotes')
      .withIndex('by_user_project', (q) => q.eq('userId', userId).eq('projectId', args.projectId))
      .take(200);

    return notes.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const create = mutation({
  args: {
    projectId: v.id('projects'),
    text: v.string(),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error('Project not found');
    }
    
    // The active tier depends on the project OWNER, not the current user.
    if (!project.ownerUserId) throw new Error("No ownerUserId");
    const owner = await ctx.db.get(project.ownerUserId as Id<"users">);
    if (!owner) {
      throw new Error('Project owner not found');
    }

    const tier = getActiveTier(owner);
    
    if (tier === 'free') {
      const existingNotes = await ctx.db
        .query('quickNotes')
        .withIndex('by_user_project', (q) => q.eq('userId', userId).eq('projectId', args.projectId))
        .collect();
      
      if (existingNotes.length >= FREE_TIER_MAX_NOTES) {
        throw new ConvexError({
          code: 'FREE_NOTE_LIMIT',
          message: 'הגעת למגבלת הפתקים בפרויקט זה. היזם (בעל הפרויקט) מוגדר במסלול חינמי. יש לשדרג לפרו כדי ליצור פתקים ללא הגבלה.',
        });
      }
    }

    const noteId = await ctx.db.insert('quickNotes', {
      userId,
      projectId: args.projectId,
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
