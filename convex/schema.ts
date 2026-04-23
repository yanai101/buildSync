import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  users: defineTable({
    authTokenIdentifier: v.optional(v.string()),
    email: v.string(),
    name: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_auth_token', ['authTokenIdentifier'])
    .index('by_email', ['email']),

  projects: defineTable({
    ownerUserId: v.union(v.id('users'), v.string()),
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
    createdAt: v.number(),
  }).index('by_owner', ['ownerUserId']),

  budgetCategories: defineTable({
    projectId: v.id('projects'),
    name: v.string(),
    plannedAmount: v.number(),
    createdAt: v.number(),
  }).index('by_project', ['projectId']),

  suppliers: defineTable({
    projectId: v.id('projects'),
    categoryId: v.optional(v.id('budgetCategories')),
    name: v.string(),
    trade: v.string(),
    contactPhone: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    agreedAmount: v.optional(v.number()),
    status: v.union(v.literal('active'), v.literal('inactive')),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_project', ['projectId'])
    .index('by_project_trade', ['projectId', 'trade']),

  expenses: defineTable({
    projectId: v.id('projects'),
    categoryId: v.id('budgetCategories'),
    supplierId: v.optional(v.id('suppliers')),
    amount: v.number(),
    expenseDate: v.string(),
    note: v.optional(v.string()),
    receiptFileId: v.optional(v.id('files')),
    createdAt: v.number(),
  })
    .index('by_project', ['projectId'])
    .index('by_project_category', ['projectId', 'categoryId']),

  payments: defineTable({
    projectId: v.id('projects'),
    supplierId: v.id('suppliers'),
    amount: v.number(),
    dueDate: v.optional(v.string()),
    paidDate: v.optional(v.string()),
    status: v.union(v.literal('planned'), v.literal('paid'), v.literal('overdue')),
    note: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_project', ['projectId'])
    .index('by_project_dueDate', ['projectId', 'dueDate'])
    .index('by_project_supplier', ['projectId', 'supplierId']),

  stages: defineTable({
    projectId: v.id('projects'),
    name: v.string(),
    status: v.union(v.literal('not_started'), v.literal('in_progress'), v.literal('done')),
    progress: v.number(),
    startEst: v.optional(v.string()),
    endEst: v.optional(v.string()),
    createdAt: v.number(),
  }).index('by_project', ['projectId']),

  files: defineTable({
    projectId: v.id('projects'),
    storageId: v.string(),
    fileName: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
    linkedCategoryId: v.optional(v.id('budgetCategories')),
    linkedSupplierId: v.optional(v.id('suppliers')),
    linkedStageId: v.optional(v.id('stages')),
    createdAt: v.number(),
  }).index('by_project', ['projectId']),
})
