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
      .query('budgetCategories')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .collect()
  },
})

export const create = mutation({
  args: {
    projectId: v.id('projects'),
    name: v.string(),
    plannedAmount: v.number(),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    return await ctx.db.insert('budgetCategories', {
      projectId: args.projectId,
      name: args.name,
      plannedAmount: args.plannedAmount,
      createdAt: Date.now(),
    })
  },
})
