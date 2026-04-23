import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

import { requireProjectOwner } from './lib/access'

export const listByProject = query({
  args: { projectId: v.optional(v.id('projects')) },
  handler: async (ctx, args) => {
    if (!args.projectId) {
      return []
    }
    const projectId = args.projectId
    await requireProjectOwner(ctx, projectId)
    return await ctx.db
      .query('expenses')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .order('desc')
      .collect()
  },
})

export const create = mutation({
  args: {
    projectId: v.id('projects'),
    categoryId: v.id('budgetCategories'),
    supplierId: v.optional(v.id('suppliers')),
    amount: v.number(),
    expenseDate: v.string(),
    note: v.optional(v.string()),
    receiptFileId: v.optional(v.id('files')),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    return await ctx.db.insert('expenses', {
      ...args,
      createdAt: Date.now(),
    })
  },
})
