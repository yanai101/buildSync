import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

import { requireProjectOwner } from './lib/access'

export const listByProject = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    return await ctx.db
      .query('stages')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect()
  },
})

export const create = mutation({
  args: {
    projectId: v.id('projects'),
    name: v.string(),
    status: v.union(v.literal('not_started'), v.literal('in_progress'), v.literal('done')),
    progress: v.number(),
    startEst: v.optional(v.string()),
    endEst: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    return await ctx.db.insert('stages', {
      ...args,
      createdAt: Date.now(),
    })
  },
})
