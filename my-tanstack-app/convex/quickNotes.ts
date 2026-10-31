import { Id } from "./_generated/dataModel";

import { mutation, query } from './_generated/server';
import { ConvexError, v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';
import { scheduleUserNotifications } from './notifications';
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

    const [project, allProjectNotes, contractors] = await Promise.all([
      ctx.db.get(args.projectId),
      ctx.db
        .query('quickNotes')
        .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
        .collect(),
      ctx.db
        .query('contractors')
        .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
        .collect(),
    ]);

    const myNotes = allProjectNotes.filter(
      (n) => n.userId === userId || n.sharedWith?.includes(userId)
    );

    const uniqueUserIds = Array.from(new Set(myNotes.map((n) => n.userId)));
    const userDocs = await Promise.all(uniqueUserIds.map((id) => ctx.db.get(id)));
    const userMap = new Map(uniqueUserIds.map((id, idx) => [id, userDocs[idx]]));

    const resolveAuthorInfo = (authorId: Id<'users'>) => {
      const u = userMap.get(authorId);
      if (project) {
        if (project.ownerUserId === authorId) {
          return { authorName: u?.name || project.ownerName || 'בעל הבית', authorRole: 'בעל הבית' };
        }
        if (project.managerUserId === authorId) {
          return { authorName: u?.name || project.managerName || 'מנהל פרויקט', authorRole: 'מנהל פרויקט' };
        }
        if (project.inspectorUserId === authorId) {
          return { authorName: u?.name || project.inspectorName || 'מפקח', authorRole: 'מפקח' };
        }
      }
      const contractor = contractors.find((c) => c.userId === authorId);
      if (contractor) {
        return { authorName: u?.name || contractor.name || 'קבלן', authorRole: contractor.role || 'קבלן' };
      }
      return { authorName: u?.name || 'איש צוות', authorRole: 'צוות' };
    };

    const enriched = myNotes.map((n) => ({
      ...n,
      ...resolveAuthorInfo(n.userId),
    }));

    return enriched.sort((a, b) => {
      const timeB = b.updatedAt ?? b.createdAt;
      const timeA = a.updatedAt ?? a.createdAt;
      if (timeB !== timeA) return timeB - timeA;
      return b._creationTime - a._creationTime;
    });
  },
});

export const create = mutation({
  args: {
    projectId: v.id('projects'),
    text: v.string(),
    color: v.optional(v.string()),
    sharedWith: v.optional(v.array(v.id('users'))),
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

    const now = Date.now();
    const noteId = await ctx.db.insert('quickNotes', {
      userId,
      projectId: args.projectId,
      text: args.text,
      color: args.color,
      createdAt: now,
      updatedAt: now,
      sharedWith: args.sharedWith,
    });

    if (args.sharedWith && args.sharedWith.length > 0) {
      const me = await ctx.db.get(userId);
      const myName = me?.name || 'איש צוות';
      const projName = project.name || 'הפרויקט';

      await scheduleUserNotifications(ctx, {
        userIds: args.sharedWith,
        title: 'פתק חדש שותף איתך',
        body: `${myName} שיתף איתך פתק בפרויקט ${projName}. היכנס לדאשבורד כדי לראות אותו.`,
        url: `/dashboard?project=${args.projectId}`,
        tag: `shared-note-${noteId}-create`
      });
    }

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
    if (!note) {
      throw new Error('Note not found');
    }

    if (note.userId === userId) {
      // Creator deletes completely
      await ctx.db.delete(args.noteId);
    } else if (note.sharedWith?.includes(userId)) {
      // Recipient removes themselves from sharedWith array
      await ctx.db.patch(args.noteId, {
        sharedWith: note.sharedWith.filter((id) => id !== userId),
      });
    } else {
      throw new Error('Note not found or access denied');
    }
  },
});

export const update = mutation({
  args: {
    noteId: v.id('quickNotes'),
    text: v.string(),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const note = await ctx.db.get(args.noteId);
    if (!note) {
      throw new Error('Note not found');
    }

    if (note.userId !== userId && !note.sharedWith?.includes(userId)) {
      throw new Error('Access denied');
    }

    await ctx.db.patch(args.noteId, {
      text: args.text,
      ...(args.color ? { color: args.color } : {})
    });
  },
});

export const share = mutation({
  args: {
    noteId: v.id('quickNotes'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) throw new Error('Not authenticated');

    const note = await ctx.db.get(args.noteId);
    if (!note) throw new Error('Note not found');
    if (note.userId !== currentUserId) {
      throw new Error('Only the creator can share this note');
    }

    const sharedWith = note.sharedWith || [];
    if (!sharedWith.includes(args.userId)) {
      await ctx.db.patch(args.noteId, {
        sharedWith: [...sharedWith, args.userId],
        updatedAt: Date.now(),
      });

      const me = await ctx.db.get(currentUserId);
      const myName = me?.name || 'איש צוות';
      const project = await ctx.db.get(note.projectId);
      const projName = project?.name || 'הפרויקט';

      await scheduleUserNotifications(ctx, {
        userIds: [args.userId],
        title: 'פתק חדש שותף איתך',
        body: `${myName} שיתף איתך פתק בפרויקט ${projName}. היכנס לדאשבורד כדי לראות אותו.`,
        url: `/dashboard?project=${note.projectId}`,
        tag: `shared-note-${args.noteId}-${args.userId}`
      });
    }
  },
});

export const listTeamForSharing = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const project = await ctx.db.get(args.projectId);
    if (!project) return [];

    const team = [];

    // Add owner
    if (project.ownerUserId && project.ownerUserId !== userId) {
      const u = await ctx.db.get(project.ownerUserId as Id<"users">);
      if (u) team.push({ _id: u._id, name: u.name || project.ownerName || 'בעל הבית', role: 'בעל הבית' });
    }
    // Add manager
    if (project.managerUserId && project.managerUserId !== userId) {
      const u = await ctx.db.get(project.managerUserId as Id<"users">);
      if (u) team.push({ _id: u._id, name: u.name || project.managerName || 'מנהל הפרויקט', role: 'מנהל פרויקט' });
    }
    // Add inspector
    if (project.inspectorUserId && project.inspectorUserId !== userId) {
      const u = await ctx.db.get(project.inspectorUserId as Id<"users">);
      if (u) team.push({ _id: u._id, name: u.name || project.inspectorName || 'מפקח', role: 'מפקח' });
    }
    
    // Add contractors who have a linked user account
    const contractors = await ctx.db
      .query('contractors')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
      
    for (const c of contractors) {
      if (c.userId && c.userId !== userId) {
        const u = await ctx.db.get(c.userId as Id<"users">);
        if (u) team.push({ _id: u._id, name: u.name || c.name, role: c.role || 'קבלן' });
      }
    }

    return team;
  }
});
