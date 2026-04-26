import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';
import { requireProjectFileUser } from './_lib/projectAccess';
import { insertActivity } from './_lib/activity';

export const listByContractor = query({
  args: {
    contractorId: v.id('contractors'),
  },
  handler: async (ctx, args) => {
    const contractor = await ctx.db.get(args.contractorId);
    if (!contractor) return [];
    await requireProjectFileUser(ctx, contractor.projectId);

    const notes = await ctx.db
      .query('contractorNotes')
      .withIndex('by_contractor', (q) => q.eq('contractorId', args.contractorId))
      .order('desc')
      .take(200);

    return notes.map((note) => ({
      ...note,
      id: note._id,
    }));
  },
});

export const addNote = mutation({
  args: {
    contractorId: v.id('contractors'),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const text = args.text.trim();
    if (!text) {
      throw new Error('Note text cannot be empty');
    }

    const contractor = await ctx.db.get(args.contractorId);
    if (!contractor) {
      throw new Error('Contractor not found');
    }

    const { userId, user } = await requireProjectFileUser(ctx, contractor.projectId);
    const role = (user?.role ?? 'owner') as 'owner' | 'manager' | 'inspector' | 'contractor';
    const authorName = user?.name || user?.email || 'משתמש';

    const id = await ctx.db.insert('contractorNotes', {
      projectId: contractor.projectId,
      contractorId: args.contractorId,
      authorUserId: userId,
      authorName,
      role,
      text,
    });

    await insertActivity(ctx, {
      projectId: contractor.projectId,
      text: `הערה נוספה לקבלן ${contractor.name}`,
    });

    return id;
  },
});

export const removeNote = mutation({
  args: {
    noteId: v.id('contractorNotes'),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note) return { deleted: false };

    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const { user, project } = await requireProjectFileUser(ctx, note.projectId);
    const isAuthor = note.authorUserId === userId;
    const isProjectManager = project.ownerUserId === userId || project.managerUserId === userId;
    const hasManagerRole = user?.role === 'owner' || user?.role === 'manager';
    if (!isAuthor && !isProjectManager && !hasManagerRole) {
      throw new Error('Only the author, owner, or manager can delete this note');
    }

    await ctx.db.delete(args.noteId);
    return { deleted: true };
  },
});

