import { mutation } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';


// ── GENERIC MUTATIONS ────────────────────────────────────────────────────────

export const update = mutation({
  args: {
    table: v.string(),
    id: v.any(), 
    patch: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, args.patch);
  },
});

export const add = mutation({
  args: {
    table: v.string(),
    document: v.any(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert(args.table as any, args.document);
  },
});

export const remove = mutation({
  args: {
    table: v.string(),
    id: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ── DOMAIN SPECIFIC MUTATIONS ────────────────────────────────────────────────

export const toggleTask = mutation({
  args: {
    taskId: v.id('stageTasks'),
    done: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, { done: args.done });
    
    const task = await ctx.db.get(args.taskId);
    if (task) {
      const allTasks = await ctx.db
        .query('stageTasks')
        .withIndex('by_stage', (q) => q.eq('stageId', task.stageId))
        .collect();
      
      const doneCount = allTasks.filter(t => t._id === args.taskId ? args.done : t.done).length;
      const progressPct = Math.round((doneCount / allTasks.length) * 100);
      
      await ctx.db.patch(task.stageId, { progressPct });
    }
  },
});

export const saveBoq = mutation({
  args: {
    projectId: v.id('projects'),
    items: v.array(v.any()), 
  },
  handler: async (ctx, args) => {
    for (const item of args.items) {
      await ctx.db.insert('boqItems', {
        projectId: args.projectId,
        roomId: item.roomId,
        category: item.category,
        name: item.name,
        qty: item.qty,
        userQty: item.userQty,
        unit: item.unit,
        unitPrice: item.unitPrice || 0,
        status: 'pending',
        source: 'wizard_smart',
        hint: item.hint,
      });
    }
  },
});


export const addExpense = mutation({
  args: {
    projectId: v.id('projects'),
    description: v.string(),
    amount: v.number(),
    category: v.string(),
    date: v.string(),
    status: v.union(v.literal('שולם'), v.literal('ממתין')),
  },
  handler: async (ctx, args) => {
    const category = await ctx.db
      .query('budgetCategories')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .filter(q => q.eq(q.field('name'), args.category))
      .first();

    await ctx.db.insert('expenses', {
      projectId: args.projectId,
      description: args.description,
      amount: args.amount,
      expenseDate: args.date,
      status: args.status,
      categoryId: category?._id,
    });
  },
});

export const saveNote = mutation({
  args: {
    projectId: v.id('projects'),
    fromName: v.string(),
    role: v.union(v.literal('owner'), v.literal('manager'), v.literal('inspector'), v.literal('contractor')),
    text: v.string(),
    thread: v.union(v.literal('internal'), v.literal('contractor')),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('messages', {
      projectId: args.projectId,
      fromName: args.fromName,
      role: args.role,
      text: args.text,
      thread: args.thread,
      resolved: false,
    });
  },
});

export const savePhotoAnnotation = mutation({
  args: {
    photoId: v.id('photos'),
    noteText: v.string(),
    role: v.union(v.literal('owner'), v.literal('manager'), v.literal('inspector'), v.literal('contractor')),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('photoNotes', {
      photoId: args.photoId,
      authorName: 'משתמש',
      role: args.role,
      text: args.noteText,
    });
  },
});
