import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { getFinancialSummary } from './_lib/financialSummary';

export const getSummary = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return null;
    return await getFinancialSummary(ctx, project);
  },
});

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
    
    // Resolve files
    const allFileIds = expenses.flatMap(e => e.fileIds || []);
    const fileDocs = await Promise.all(
      [...new Set(allFileIds)].map(id => ctx.db.get(id))
    );
    const validFiles = fileDocs.filter(f => f !== null) as any[];
    
    const fileUrls = new Map<string, string | null>();
    for (const f of validFiles) {
      if (!fileUrls.has(f.storageId)) {
        const url = await ctx.storage.getUrl(f.storageId);
        fileUrls.set(f.storageId, url);
      }
    }
    
    const fileMap = new Map(validFiles.map(f => [
      f._id, 
      { id: f._id, url: fileUrls.get(f.storageId), name: f.originalName }
    ]));

    return expenses.map(e => ({
      ...e,
      id: e._id,
      desc: e.description,
      amount: e.amount,
      date: e.expenseDate,
      cat: e.categoryId ? categoryById.get(e.categoryId) : undefined,
      status: e.status,
      files: (e.fileIds || []).map((id: any) => fileMap.get(id)).filter(Boolean),
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
    category: v.optional(v.string()),
    date: v.string(),
    status: v.union(v.literal('שולם'), v.literal('ממתין')),
    fileIds: v.optional(v.array(v.id('projectFiles'))),
  },
  handler: async (ctx, args) => {
    let category = null;
    if (args.category) {
      category = await ctx.db
        .query('budgetCategories')
        .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
        .filter(q => q.eq(q.field('name'), args.category))
        .first();
    }

    await ctx.db.insert('expenses', {
      projectId: args.projectId,
      description: args.description,
      amount: args.amount,
      expenseDate: args.date,
      status: args.status,
      categoryId: category?._id,
      fileIds: args.fileIds,
    });

    if (category && args.status === 'שולם') {
      await ctx.db.patch(category._id, {
        spent: category.spent + args.amount
      });
    }
  },
});
