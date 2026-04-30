import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';
import { zodToConvexFields } from 'convex-helpers/server/zod3';
import * as s from './zodSchemas';

export default defineSchema({
  // Convex Auth ships authSessions, authAccounts, authRefreshTokens,
  // authVerificationCodes, authVerifiers. We spread those here.
  // The `users` table is redefined below so we can extend it.
  ...authTables,

  // Users — Convex Auth base fields + our domain fields.
  // Self-registration creates owners only; other roles are added later.
  users: defineTable({
    // Convex Auth base (from authTables.users) — all optional on that side.
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // Domain extensions
    role: v.optional(
      v.union(
        v.literal('owner'),
        v.literal('manager'),
        v.literal('inspector'),
        v.literal('contractor'),
      ),
    ),
    avatarLetter: v.optional(v.string()),
    avatarColor: v.optional(v.string()),
    isSuperAdmin: v.optional(v.boolean()),
    isSuspended: v.optional(v.boolean()),
    subscriptionTier: v.optional(v.string()),
    subscriptionExpiresAt: v.optional(v.number()),
  })
    .index('email', ['email'])
    .index('phone', ['phone']),

  projects: defineTable(zodToConvexFields(s.zProject))
    .index('by_ownerUserId', ['ownerUserId']),

  projectRooms: defineTable(zodToConvexFields(s.zProjectRoom))
    .index('by_project', ['projectId'])
    .index('by_project_sort', ['projectId', 'sortOrder']),

  stages: defineTable(zodToConvexFields(s.zStage))
    .index('by_project', ['projectId'])
    .index('by_project_sort', ['projectId', 'sortOrder'])
    .index('by_contractor', ['contractorId']),

  stageContractors: defineTable(zodToConvexFields(s.zStageContractor))
    .index('by_project', ['projectId'])
    .index('by_stage', ['stageId'])
    .index('by_contractor', ['contractorId']),

  stageTasks: defineTable(zodToConvexFields(s.zStageTask))
    .index('by_stage', ['stageId']),

  stageMilestones: defineTable(zodToConvexFields(s.zStageMilestone))
    .index('by_stage', ['stageId']),

  stageMilestoneTasks: defineTable(zodToConvexFields(s.zStageMilestoneTask))
    .index('by_milestone', ['milestoneId'])
    .index('by_task', ['taskId']),

  contractors: defineTable(zodToConvexFields(s.zContractor))
    .index('by_project', ['projectId']),

  contractorPaymentMilestones: defineTable(
    zodToConvexFields(s.zContractorPaymentMilestone),
  ).index('by_contractor', ['contractorId']),

  boqItems: defineTable(zodToConvexFields(s.zBoqItem))
    .index('by_project', ['projectId'])
    .index('by_room', ['roomId']),

  projectFiles: defineTable(zodToConvexFields(s.zProjectFile))
    .index('by_project', ['projectId'])
    .index('by_project_usage', ['projectId', 'usage'])
    .index('by_storage', ['storageId'])
    .index('by_contractor', ['contractorId']),

  contractorNotes: defineTable(zodToConvexFields(s.zContractorNote))
    .index('by_contractor', ['contractorId']),

  personalFiles: defineTable(zodToConvexFields(s.zPersonalFile))
    .index('by_owner', ['ownerUserId'])
    .index('by_storage', ['storageId']),

  projectInvitations: defineTable(zodToConvexFields(s.zProjectInvitation))
    .index('by_code', ['code'])
    .index('by_project', ['projectId'])
    .index('by_invited_email', ['invitedEmail']),

  photos: defineTable(zodToConvexFields(s.zPhoto))
    .index('by_project', ['projectId'])
    .index('by_stage', ['stageId'])
    .index('by_tag', ['projectId', 'tag']),

  photoAnnotations: defineTable(zodToConvexFields(s.zPhotoAnnotation))
    .index('by_photo', ['photoId'])
    .index('by_version', ['versionId']),

  photoFileVersions: defineTable(zodToConvexFields(s.zPhotoFileVersion))
    .index('by_photo', ['photoId'])
    .index('by_photo_versionNumber', ['photoId', 'versionNumber'])
    .index('by_annotated_project_file', ['annotatedProjectFileId']),

  photoNotes: defineTable(zodToConvexFields(s.zPhotoNote))
    .index('by_photo', ['photoId'])
    .index('by_version', ['versionId']),

  messages: defineTable(zodToConvexFields(s.zMessage))
    .index('by_project', ['projectId'])
    .index('by_project_thread', ['projectId', 'thread']),

  budgetCategories: defineTable(zodToConvexFields(s.zBudgetCategory))
    .index('by_project', ['projectId']),

  expenses: defineTable(zodToConvexFields(s.zExpense))
    .index('by_project', ['projectId'])
    .index('by_category', ['categoryId']),

  timelineBars: defineTable(zodToConvexFields(s.zTimelineBar))
    .index('by_project', ['projectId']),

  quoteTopics: defineTable(zodToConvexFields(s.zQuoteTopic))
    .index('by_key', ['key']),

  priceQuotes: defineTable(zodToConvexFields(s.zPriceQuote))
    .index('by_project', ['projectId'])
    .index('by_topic', ['projectId', 'topicKey']),

  activityFeed: defineTable(zodToConvexFields(s.zActivityFeedItem))
    .index('by_project', ['projectId']),

  checklists: defineTable(zodToConvexFields(s.zChecklist))
    .index('by_project', ['projectId']),

  checklistItems: defineTable(zodToConvexFields(s.zChecklistItem))
    .index('by_checklist', ['checklistId']),

  permits: defineTable(zodToConvexFields(s.zPermit))
    .index('by_project', ['projectId']),

  dailyLogs: defineTable(zodToConvexFields(s.zDailyLog))
    .index('by_project', ['projectId'])
    .index('by_project_date', ['projectId', 'date']),

  promoCodes: defineTable(zodToConvexFields(s.zPromoCode))
    .index('by_code', ['code']),

  promoRedemptions: defineTable(zodToConvexFields(s.zPromoRedemption))
    .index('by_user', ['userId'])
    .index('by_promo', ['promoCodeId'])
    .index('by_promo_and_user', ['promoCodeId', 'userId']),
});
