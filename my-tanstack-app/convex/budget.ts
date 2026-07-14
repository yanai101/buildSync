import { query, mutation } from './_generated/server';
import { v, ConvexError } from 'convex/values';
import { getFinancialSummary } from './_lib/financialSummary';
import { canUserViewBudget, requireProjectBudgetView } from './_lib/projectAccess';

export const getSummary = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const allowed = await canUserViewBudget(ctx, args.projectId);
    if (!allowed) return null;
    const project = await ctx.db.get(args.projectId);
    if (!project) return null;
    return await getFinancialSummary(ctx, project);
  },
});

export const listCategories = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const allowed = await canUserViewBudget(ctx, args.projectId);
    if (!allowed) return [];
    return await ctx.db
      .query('budgetCategories')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
  },
});

export const listExpenses = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const allowed = await canUserViewBudget(ctx, args.projectId);
    if (!allowed) return [];
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
    await requireProjectBudgetView(ctx, args.projectId);
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
    await requireProjectBudgetView(ctx, args.projectId);
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

export const deleteExpense = mutation({
  args: {
    expenseId: v.id('expenses'),
  },
  handler: async (ctx, args) => {
    const expense = await ctx.db.get(args.expenseId);
    if (!expense) throw new ConvexError("Expense not found");
    if (expense.contractorId) throw new ConvexError("Cannot modify contractor expenses from the budget screen");
    await requireProjectBudgetView(ctx, expense.projectId);

    if (expense.categoryId && expense.status === 'שולם') {
      const category = await ctx.db.get(expense.categoryId);
      if (category) {
        await ctx.db.patch(category._id, {
          spent: Math.max(0, category.spent - expense.amount)
        });
      }
    }

    // Delete attached files from storage and projectFiles table
    if (expense.fileIds && expense.fileIds.length > 0) {
      for (const fileId of expense.fileIds) {
        const fileDoc = await ctx.db.get(fileId);
        if (fileDoc) {
          try { await ctx.storage.delete(fileDoc.storageId); } catch {}
          await ctx.db.delete(fileId);
        }
      }
    }

    await ctx.db.delete(args.expenseId);
  },
});

export const updateExpense = mutation({
  args: {
    expenseId: v.id('expenses'),
    description: v.string(),
    amount: v.number(),
    category: v.optional(v.string()),
    date: v.string(),
    status: v.union(v.literal('שולם'), v.literal('ממתין')),
    fileIds: v.optional(v.array(v.id('projectFiles'))),
  },
  handler: async (ctx, args) => {
    const expense = await ctx.db.get(args.expenseId);
    if (!expense) throw new ConvexError("Expense not found");
    if (expense.contractorId) throw new ConvexError("Cannot modify contractor expenses from the budget screen");
    await requireProjectBudgetView(ctx, expense.projectId);

    // Rollback old category spent
    if (expense.categoryId && expense.status === 'שולם') {
      const oldCategory = await ctx.db.get(expense.categoryId);
      if (oldCategory) {
        await ctx.db.patch(oldCategory._id, {
          spent: Math.max(0, oldCategory.spent - expense.amount)
        });
      }
    }

    // Find new category
    let newCategoryId = undefined;
    if (args.category) {
      const cat = await ctx.db
        .query('budgetCategories')
        .withIndex('by_project', (q) => q.eq('projectId', expense.projectId))
        .filter(q => q.eq(q.field('name'), args.category))
        .first();
      newCategoryId = cat?._id;
    }

    // Apply new category spent
    if (newCategoryId && args.status === 'שולם') {
      const newCategory = await ctx.db.get(newCategoryId);
      if (newCategory) {
        await ctx.db.patch(newCategory._id, {
          spent: newCategory.spent + args.amount
        });
      }
    }

    const patchData: any = {
      description: args.description,
      amount: args.amount,
      expenseDate: args.date,
      status: args.status,
      categoryId: newCategoryId,
    };
    if (args.fileIds !== undefined) {
      patchData.fileIds = [...(expense.fileIds || []), ...args.fileIds];
    }
    await ctx.db.patch(args.expenseId, patchData);
  },
});

export const updateBudgetCategory = mutation({
  args: {
    categoryId: v.id('budgetCategories'),
    name: v.string(),
    budget: v.number(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const cat = await ctx.db.get(args.categoryId);
    if (!cat) throw new ConvexError("Category not found");
    await requireProjectBudgetView(ctx, cat.projectId);
    await ctx.db.patch(args.categoryId, {
      name: args.name,
      budget: args.budget,
      color: args.color,
    });
  },
});

export const deleteBudgetCategory = mutation({
  args: {
    categoryId: v.id('budgetCategories'),
  },
  handler: async (ctx, args) => {
    const cat = await ctx.db.get(args.categoryId);
    if (!cat) throw new ConvexError("Category not found");
    await requireProjectBudgetView(ctx, cat.projectId);
    
    // Check if there are expenses linked to this category
    const expenses = await ctx.db
      .query('expenses')
      .withIndex('by_category', q => q.eq('categoryId', args.categoryId))
      .collect();
      
    if (expenses.length > 0) {
      throw new ConvexError("לא ניתן למחוק קטגוריה עם הוצאות מקושרות. מחק או העבר את ההוצאות קודם.");
    }
    
    await ctx.db.delete(args.categoryId);
  },
});
