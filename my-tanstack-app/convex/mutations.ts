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
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('expenses', {
      projectId: args.projectId,
      description: args.description,
      amount: args.amount,
      expenseDate: args.date,
      status: args.status as any,
    });
  },
});

export const saveNote = mutation({
  args: {
    projectId: v.id('projects'),
    fromName: v.string(),
    role: v.string(),
    text: v.string(),
    thread: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('notes', {
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
    photoId: v.any(),
    noteText: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const photo = await ctx.db.get(args.photoId);
    if (photo) {
      const annotations = [...(photo.annotations || []), { text: args.noteText, role: args.role, at: new Date().toISOString() }];
      await ctx.db.patch(args.photoId, { annotations, notesCount: (photo.notesCount || 0) + 1 });
    }
  },
});
