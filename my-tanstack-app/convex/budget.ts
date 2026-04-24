import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const listCategories = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('budgetCategories')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
  },
});

export const listExpenses = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const expenses = await ctx.db
      .query('expenses')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
    
    return expenses.map(e => ({
      ...e,
      id: e._id,
      desc: e.description,
      amount: e.amount,
      date: e.expenseDate,
      cat: e.category,
      status: e.status,
    }));
  },
});

export const addCategory = mutation({
  args: {
    projectId: v.id('projects'),
    name: v.string(),
    budget: v.number(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('budgetCategories', {
      projectId: args.projectId,
      name: args.name,
      budget: args.budget,
      spent: 0,
      color: args.color,
    });
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
    // 1. Insert expense
    await ctx.db.insert('expenses', {
      projectId: args.projectId,
      description: args.description,
      amount: args.amount,
      expenseDate: args.date,
      status: args.status as any,
      category: args.category,
    });

    // 2. Update category spent amount
    const category = await ctx.db
      .query('budgetCategories')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .filter(q => q.eq(q.field('name'), args.category))
      .first();
    
    if (category) {
      await ctx.db.patch(category._id, {
        spent: category.spent + args.amount
      });
    }
  },
});
