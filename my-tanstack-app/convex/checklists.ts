import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { insertActivity } from './_lib/activity';

export const list = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const checklists = await ctx.db
      .query('checklists')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();

    const sortedChecklists = checklists.sort((a, b) => a.sortOrder - b.sortOrder);

    return await Promise.all(sortedChecklists.map(async (checklist) => {
      const items = await ctx.db
        .query('checklistItems')
        .withIndex('by_checklist', (q) => q.eq('checklistId', checklist._id))
        .collect();

      return {
        ...checklist,
        id: checklist._id,
        items: items.sort((a, b) => a.sortOrder - b.sortOrder).map(i => ({ ...i, id: i._id })),
      };
    }));
  },
});

export const addChecklist = mutation({
  args: {
    projectId: v.id('projects'),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    items: v.array(v.string()), // Initial items
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('checklists')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
    
    const sortOrder = existing.length;

    const checklistId = await ctx.db.insert('checklists', {
      projectId: args.projectId,
      title: args.title,
      description: args.description,
      category: args.category,
      sortOrder,
      status: 'pending',
      createdAt: Date.now(),
    });

    for (let i = 0; i < args.items.length; i++) {
      await ctx.db.insert('checklistItems', {
        checklistId,
        text: args.items[i],
        isCompleted: false,
        sortOrder: i,
      });
    }

    await insertActivity(ctx, {
      projectId: args.projectId,
      text: `הוסיף צ'קליסט חדש: ${args.title}`,
    });

    return checklistId;
  },
});

export const deleteChecklist = mutation({
  args: { checklistId: v.id('checklists') },
  handler: async (ctx, args) => {
    const checklist = await ctx.db.get(args.checklistId);
    if (!checklist) return;

    const items = await ctx.db
      .query('checklistItems')
      .withIndex('by_checklist', (q) => q.eq('checklistId', args.checklistId))
      .collect();
    
    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    await ctx.db.delete(args.checklistId);

    await insertActivity(ctx, {
      projectId: checklist.projectId,
      text: `מחק צ'קליסט: ${checklist.title}`,
    });
  },
});

export const addChecklistItem = mutation({
  args: {
    checklistId: v.id('checklists'),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('checklistItems')
      .withIndex('by_checklist', (q) => q.eq('checklistId', args.checklistId))
      .collect();
    
    return await ctx.db.insert('checklistItems', {
      checklistId: args.checklistId,
      text: args.text,
      isCompleted: false,
      sortOrder: existing.length,
    });
  },
});

export const toggleChecklistItem = mutation({
  args: {
    itemId: v.id('checklistItems'),
    isCompleted: v.boolean(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) return;

    await ctx.db.patch(args.itemId, { isCompleted: args.isCompleted });

    // Update checklist status based on items
    const allItems = await ctx.db
      .query('checklistItems')
      .withIndex('by_checklist', (q) => q.eq('checklistId', item.checklistId))
      .collect();
    
    // Replace the current item's status in memory
    const updatedItems = allItems.map(i => i._id === args.itemId ? { ...i, isCompleted: args.isCompleted } : i);
    
    const completedCount = updatedItems.filter(i => i.isCompleted).length;
    let newStatus: 'pending' | 'in_progress' | 'done' = 'pending';
    
    if (completedCount === updatedItems.length && updatedItems.length > 0) {
      newStatus = 'done';
    } else if (completedCount > 0) {
      newStatus = 'in_progress';
    }

    const checklist = await ctx.db.get(item.checklistId);
    if (checklist && checklist.status !== newStatus) {
      await ctx.db.patch(item.checklistId, { status: newStatus });
    }
  },
});

export const deleteChecklistItem = mutation({
  args: { itemId: v.id('checklistItems') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.itemId);
  },
});

export const updateChecklistItem = mutation({
  args: { 
    itemId: v.id('checklistItems'),
    text: v.string()
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.itemId, { text: args.text });
  },
});

export const updateChecklistTitle = mutation({
  args: {
    checklistId: v.id('checklists'),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.checklistId, { title: args.title });
  }
});
