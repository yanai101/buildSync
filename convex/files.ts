import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

import { requireProjectOwner } from './lib/access'

export const listByProject = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    return await ctx.db
      .query('files')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect()
  },
})

export const createMetadata = mutation({
  args: {
    projectId: v.id('projects'),
    storageId: v.string(),
    fileName: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
    linkedCategoryId: v.optional(v.id('budgetCategories')),
    linkedSupplierId: v.optional(v.id('suppliers')),
    linkedStageId: v.optional(v.id('stages')),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    return await ctx.db.insert('files', {
      ...args,
      createdAt: Date.now(),
    })
  },
})
