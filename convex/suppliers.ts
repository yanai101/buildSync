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
      .query('suppliers')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .collect()
  },
})

export const getById = query({
  args: {
    projectId: v.id('projects'),
    supplierId: v.id('suppliers'),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)

    const supplier = await ctx.db.get(args.supplierId)
    if (!supplier || supplier.projectId !== args.projectId) {
      return null
    }

    return supplier
  },
})

export const create = mutation({
  args: {
    projectId: v.id('projects'),
    categoryId: v.optional(v.id('budgetCategories')),
    name: v.string(),
    trade: v.string(),
    contactPhone: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    agreedAmount: v.optional(v.number()),
    status: v.union(v.literal('active'), v.literal('inactive')),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    return await ctx.db.insert('suppliers', {
      ...args,
      createdAt: Date.now(),
    })
  },
})

export const update = mutation({
  args: {
    projectId: v.id('projects'),
    supplierId: v.id('suppliers'),
    categoryId: v.optional(v.id('budgetCategories')),
    name: v.optional(v.string()),
    trade: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    agreedAmount: v.optional(v.number()),
    status: v.optional(v.union(v.literal('active'), v.literal('inactive'))),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)

    const supplier = await ctx.db.get(args.supplierId)
    if (!supplier || supplier.projectId !== args.projectId) {
      throw new Error('SUPPLIER_NOT_FOUND')
    }

    const patch: Record<string, unknown> = {}
    if (args.categoryId !== undefined) patch.categoryId = args.categoryId
    if (args.name !== undefined) patch.name = args.name
    if (args.trade !== undefined) patch.trade = args.trade
    if (args.contactPhone !== undefined) patch.contactPhone = args.contactPhone
    if (args.contactEmail !== undefined) patch.contactEmail = args.contactEmail
    if (args.agreedAmount !== undefined) patch.agreedAmount = args.agreedAmount
    if (args.status !== undefined) patch.status = args.status
    if (args.notes !== undefined) patch.notes = args.notes

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.supplierId, patch)
    }

    return args.supplierId
  },
})

export const remove = mutation({
  args: {
    projectId: v.id('projects'),
    supplierId: v.id('suppliers'),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)

    const supplier = await ctx.db.get(args.supplierId)
    if (!supplier || supplier.projectId !== args.projectId) {
      throw new Error('SUPPLIER_NOT_FOUND')
    }

    await ctx.db.delete(args.supplierId)
    return args.supplierId
  },
})
