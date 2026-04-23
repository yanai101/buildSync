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
      .query('payments')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .collect()
  },
})

export const create = mutation({
  args: {
    projectId: v.id('projects'),
    supplierId: v.id('suppliers'),
    amount: v.number(),
    dueDate: v.optional(v.string()),
    paidDate: v.optional(v.string()),
    status: v.union(v.literal('planned'), v.literal('paid'), v.literal('overdue')),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    return await ctx.db.insert('payments', {
      ...args,
      createdAt: Date.now(),
    })
  },
})

export const markPaid = mutation({
  args: {
    projectId: v.id('projects'),
    paymentId: v.id('payments'),
    paidDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)

    const payment = await ctx.db.get(args.paymentId)
    if (!payment || payment.projectId !== args.projectId) {
      throw new Error('PAYMENT_NOT_FOUND')
    }

    await ctx.db.patch(args.paymentId, {
      status: 'paid',
      paidDate: args.paidDate ?? new Date().toISOString().slice(0, 10),
    })

    return args.paymentId
  },
})

export const reschedule = mutation({
  args: {
    projectId: v.id('projects'),
    paymentId: v.id('payments'),
    dueDate: v.string(),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)

    const payment = await ctx.db.get(args.paymentId)
    if (!payment || payment.projectId !== args.projectId) {
      throw new Error('PAYMENT_NOT_FOUND')
    }

    await ctx.db.patch(args.paymentId, {
      dueDate: args.dueDate,
      status: payment.status === 'paid' ? 'paid' : 'planned',
    })

    return args.paymentId
  },
})
