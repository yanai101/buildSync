import { mutation } from './_generated/server'
import { v } from 'convex/values'

import { requireProjectOwner } from './lib/access'

const mockUser = {
  authTokenIdentifier: 'dev-local-user',
  email: 'dev@buildflow.local',
  name: 'Dev User',
}

const defaultBudgetCategories = [
  'תכנון ואדריכלות',
  'שלד',
  'איטום',
  'חשמל',
  'אינסטלציה',
  'אלומיניום/חלונות',
  'טיח וצבע',
  'ריצוף',
  'מטבח',
  'נגרות/ארונות',
  'תאורה',
  'פיתוח חוץ',
  'גינון',
  'בלתי צפוי (רזרבה)',
]

const defaultStages = [
  'תכנון',
  'עבודות עפר',
  'שלד',
  'איטום',
  'מערכות (חשמל/מים)',
  'טיח וצבע',
  'ריצוף וחיפויים',
  'מטבח ונגרות',
  'גמרים אחרונים',
  'פיתוח חוץ ומסירה',
]

export const seedMockUser = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_auth_token', (q) =>
        q.eq('authTokenIdentifier', mockUser.authTokenIdentifier),
      )
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: mockUser.email,
        name: mockUser.name,
      })
      return existing._id
    }

    return await ctx.db.insert('users', {
      ...mockUser,
      createdAt: Date.now(),
    })
  },
})

export const migrateLegacyProjectOwners = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_auth_token', (q) =>
        q.eq('authTokenIdentifier', mockUser.authTokenIdentifier),
      )
      .first()

    if (!user) {
      throw new Error('MOCK_USER_NOT_FOUND')
    }

    const projects = await ctx.db.query('projects').collect()
    let migratedCount = 0

    for (const project of projects) {
      if (project.ownerUserId === mockUser.authTokenIdentifier) {
        await ctx.db.patch(project._id, {
          ownerUserId: user._id,
        })
        migratedCount += 1
      }
    }

    return { migratedCount, userId: user._id }
  },
})

export const seedProjectDefaults = mutation({
  args: {
    projectId: v.id('projects'),
    useTemplateBudget: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)

    for (const name of defaultBudgetCategories) {
      await ctx.db.insert('budgetCategories', {
        projectId: args.projectId,
        name,
        plannedAmount: 0,
        createdAt: Date.now(),
      })
    }

    for (const name of defaultStages) {
      await ctx.db.insert('stages', {
        projectId: args.projectId,
        name,
        status: 'not_started',
        progress: 0,
        createdAt: Date.now(),
      })
    }

    return { ok: true, usedTemplateBudget: args.useTemplateBudget ?? false }
  },
})
