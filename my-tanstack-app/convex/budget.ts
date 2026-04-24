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
    const categories = await ctx.db
      .query('budgetCategories')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
    const categoryById = new Map(categories.map((c) => [c._id, c.name]));
    
    return expenses.map(e => ({
      ...e,
      id: e._id,
      desc: e.description,
      amount: e.amount,
      date: e.expenseDate,
      cat: e.categoryId ? categoryById.get(e.categoryId) : undefined,
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
    const categories = await ctx.db
      .query('budgetCategories')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();

    return await ctx.db.insert('budgetCategories', {
      projectId: args.projectId,
      name: args.name,
      budget: args.budget,
      spent: 0,
      color: args.color,
      sortOrder: categories.length,
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

    if (category) {
      await ctx.db.patch(category._id, {
        spent: category.spent + args.amount
      });
    }
  },
});
