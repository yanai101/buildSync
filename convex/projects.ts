import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

import {
  findUserByIdentity,
  requireExistingUser,
  requireProjectOwner,
  requireAuthUser,
} from './lib/access'

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await findUserByIdentity(ctx, await requireAuthUser(ctx))
    if (!user) {
      return []
    }

    return await ctx.db
      .query('projects')
      .withIndex('by_owner', (q) => q.eq('ownerUserId', user._id))
      .order('desc')
      .collect()
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    region: v.string(),
    buildType: v.union(
      v.literal('single_story'),
      v.literal('two_story'),
      v.literal('renovation'),
    ),
    sqm: v.number(),
    finishLevel: v.union(v.literal('basic'), v.literal('standard'), v.literal('high')),
    targetBudget: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireExistingUser(ctx, await requireAuthUser(ctx))
    const now = Date.now()
    return await ctx.db.insert('projects', {
      ownerUserId: user._id,
      name: args.name,
      region: args.region,
      buildType: args.buildType,
      sqm: args.sqm,
      finishLevel: args.finishLevel,
      targetBudget: args.targetBudget,
      createdAt: now,
    })
  },
})

export const updateBasics = mutation({
  args: {
    projectId: v.id('projects'),
    name: v.optional(v.string()),
    region: v.optional(v.string()),
    targetBudget: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)

    const patch: Record<string, unknown> = {}
    if (args.name !== undefined) patch.name = args.name
    if (args.region !== undefined) patch.region = args.region
    if (args.targetBudget !== undefined) patch.targetBudget = args.targetBudget

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.projectId, patch)
    }

    return args.projectId
  },
})
