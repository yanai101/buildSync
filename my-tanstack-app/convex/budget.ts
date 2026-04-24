import { query } from './_generated/server';
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
