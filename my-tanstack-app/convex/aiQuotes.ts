import { query, mutation } from './_generated/server';
import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import { requireProjectMember } from './_lib/projectAccess';
import { getActiveTier, AI_MONTHLY_LIMITS } from './_lib/entitlements';
import type { Id } from './_generated/dataModel';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Rate limiting ────────────────────────────────────────────────────────────

/**
 * Shared quota computation: how many AI calls the user has made this
 * calendar month for the given feature, and whether another is allowed.
 */
async function computeAiQuota(ctx: any, feature: string) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return { allowed: false, used: 0, remaining: 0, limitPerMonth: 0, tier: 'free' as string };
  }

  const user = await ctx.db.get(userId);
  if (user?.isSuperAdmin) {
    return { allowed: true, used: 0, remaining: 9999, limitPerMonth: 9999, tier: 'superAdmin' as string };
  }

  const tier = getActiveTier(user);
  // Paid tiers can have their default quota overridden globally by an admin
  let baseLimit = AI_MONTHLY_LIMITS[tier] ?? 0;
  if (tier !== 'free') {
    const globalSetting = await ctx.db
      .query('appSettings')
      .withIndex('by_key', (q: any) => q.eq('key', 'aiMonthlyLimit'))
      .first();
    if (globalSetting?.numberValue !== undefined) {
      baseLimit = globalSetting.numberValue;
    }
  }
  const limitPerMonth = baseLimit + (user?.aiLimitOverride ?? 0);

  if (limitPerMonth === 0) {
    return { allowed: false, used: 0, remaining: 0, limitPerMonth, tier: tier as string };
  }

  // Count calls in current calendar month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const logs = await ctx.db
    .query('aiUsageLogs')
    .withIndex('by_user_feature_at', (q: any) =>
      q
        .eq('userId', userId)
        .eq('feature', feature)
        .gte('at', startOfMonth.getTime()),
    )
    .collect();

  const used = logs.length;
  const remaining = Math.max(0, limitPerMonth - used);
  return { allowed: remaining > 0, used, remaining, limitPerMonth, tier: tier as string };
}

/**
 * Returns how many AI calls the current user has made this calendar month
 * for the given feature, and whether they are allowed to make another.
 */
export const checkAiRateLimit = query({
  args: {
    projectId: v.id('projects'),
    feature: v.string(),
  },
  handler: async (ctx, args) => {
    return await computeAiQuota(ctx, args.feature);
  },
});

/**
 * Same quota info without a project context — for showing the user their
 * remaining AI requests anywhere in the app (account screen, quotes header).
 */
export const myAiQuota = query({
  args: {},
  handler: async (ctx) => {
    return await computeAiQuota(ctx, 'quoteCompare');
  },
});

export const logAiUsage = mutation({
  args: {
    projectId: v.id('projects'),
    feature: v.string(),
    tokensUsed: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');
    await requireProjectMember(ctx, args.projectId);

    await ctx.db.insert('aiUsageLogs', {
      userId,
      projectId: args.projectId,
      feature: args.feature,
      at: Date.now(),
      ...(args.tokensUsed !== undefined ? { tokensUsed: args.tokensUsed } : {}),
    });
  },
});

// ── Quote Extractions (per-file, permanent cache) ────────────────────────────

/**
 * Returns existing extractions for a list of quote IDs.
 * Keys are quoteId strings; missing keys mean extraction not yet done.
 */
export const getQuoteExtractions = query({
  args: {
    projectId: v.id('projects'),
    quoteIds: v.array(v.id('priceQuotes')),
  },
  handler: async (ctx, args) => {
    await requireProjectMember(ctx, args.projectId);

    const results: Record<string, { extractedJson: string; extractedAt: number }> = {};

    await Promise.all(
      args.quoteIds.map(async (quoteId) => {
        const extraction = await ctx.db
          .query('quoteExtractions')
          .withIndex('by_quote', (q) => q.eq('quoteId', quoteId))
          .first();
        if (extraction) {
          results[quoteId] = {
            extractedJson: extraction.extractedJson,
            extractedAt: extraction.extractedAt,
          };
        }
      }),
    );

    return results;
  },
});

export const saveQuoteExtraction = mutation({
  args: {
    quoteId: v.id('priceQuotes'),
    projectId: v.id('projects'),
    extractedJson: v.string(),
    modelUsed: v.string(),
    sourceFileId: v.optional(v.id('projectFiles')),
  },
  handler: async (ctx, args) => {
    await requireProjectMember(ctx, args.projectId);

    // Upsert — replace if already exists
    const existing = await ctx.db
      .query('quoteExtractions')
      .withIndex('by_quote', (q) => q.eq('quoteId', args.quoteId))
      .first();

    const data = {
      quoteId: args.quoteId,
      projectId: args.projectId,
      extractedJson: args.extractedJson,
      modelUsed: args.modelUsed,
      extractedAt: Date.now(),
      ...(args.sourceFileId ? { sourceFileId: args.sourceFileId } : {}),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert('quoteExtractions', data);
    }
  },
});

// ── Comparison Cache ─────────────────────────────────────────────────────────

/**
 * Returns a cached comparison result if:
 * 1. The cache key matches (same quotes + extractions)
 * 2. It was created within the last 24 hours
 */
export const getComparisonCache = query({
  args: {
    projectId: v.id('projects'),
    topicKey: v.string(),
    cacheKey: v.string(),
  },
  handler: async (ctx, args) => {
    await requireProjectMember(ctx, args.projectId);

    const cached = await ctx.db
      .query('aiQuoteCache')
      .withIndex('by_project_topic', (q) =>
        q.eq('projectId', args.projectId).eq('topicKey', args.topicKey),
      )
      .first();

    if (!cached) return null;
    if (cached.cacheKey !== args.cacheKey) return null;
    if (Date.now() - cached.createdAt > CACHE_TTL_MS) return null;

    return cached.result;
  },
});

export const saveComparisonCache = mutation({
  args: {
    projectId: v.id('projects'),
    topicKey: v.string(),
    cacheKey: v.string(),
    result: v.string(),
  },
  handler: async (ctx, args) => {
    await requireProjectMember(ctx, args.projectId);

    // Upsert
    const existing = await ctx.db
      .query('aiQuoteCache')
      .withIndex('by_project_topic', (q) =>
        q.eq('projectId', args.projectId).eq('topicKey', args.topicKey),
      )
      .first();

    const data = {
      projectId: args.projectId,
      topicKey: args.topicKey,
      cacheKey: args.cacheKey,
      result: args.result,
      createdAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert('aiQuoteCache', data);
    }
  },
});

/**
 * Invalidates the comparison cache for a topic (call after quote changes).
 */
export const invalidateComparisonCache = mutation({
  args: {
    projectId: v.id('projects'),
    topicKey: v.string(),
  },
  handler: async (ctx, args) => {
    await requireProjectMember(ctx, args.projectId);

    const existing = await ctx.db
      .query('aiQuoteCache')
      .withIndex('by_project_topic', (q) =>
        q.eq('projectId', args.projectId).eq('topicKey', args.topicKey),
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});
