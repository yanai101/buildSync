import { mutation, query } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import { paginationOptsValidator } from 'convex/server';
import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';
import { getActiveTier } from './_lib/entitlements';
import { requireProjectFeature, requireProjectMember } from './_lib/projectAccess';
import { scheduleUserNotifications } from './notifications';

const rating = v.number();
const contractorProfileRoleValues = [
  'קבלן עד מפתח', 'קבלן שלד', 'קבלן עפר', 'קבלן טיח', 'חשמלאי ראשי',
  'אינסטלטור', 'קבלן מיזוג', 'קבלן ריצוף', 'קבלן גג', 'קבלן גבס',
  'קבלן נגרות', 'צבעי', 'קבלן גינה', 'אחר',
] as const;
type ContractorProfileRole = (typeof contractorProfileRoleValues)[number];
const contractorProfileRoles = new Set<string>(contractorProfileRoleValues);

const canUnlockIdentity = async (ctx: Parameters<typeof requireProjectMember>[0], projectId: Id<'projects'>) => {
  const { user, project } = await requireProjectMember(ctx, projectId);
  const owner = project.ownerUserId ? await ctx.db.get(project.ownerUserId) : null;
  return user?.isSuperAdmin === true || getActiveTier(owner) !== 'free';
};

const reviewerRole = (project: { ownerUserId?: Id<'users'>; managerUserId?: Id<'users'>; inspectorUserId?: Id<'users'> }, userId: Id<'users'>) => {
  if (project.ownerUserId === userId) return 'owner' as const;
  if (project.managerUserId === userId) return 'manager' as const;
  if (project.inspectorUserId === userId) return 'inspector' as const;
  return null;
};

const maskedName = (role: string) => `${role} מאומת`;

const MODERATION_STATS_KEY = 'global';

const getOrCreateModerationStats = async (ctx: MutationCtx) => {
  const existing = await ctx.db
    .query('contractorRecommendationModerationStats')
    .withIndex('by_key', (q) => q.eq('key', MODERATION_STATS_KEY))
    .first();
  if (existing) return existing;

  // This one-time fallback keeps the schema migration safe for existing data.
  // Every subsequent change is an O(1) counter update.
  const [reviews, reports] = await Promise.all([
    ctx.db.query('contractorReviews').collect(),
    ctx.db.query('contractorReviewReports').collect(),
  ]);
  const now = Date.now();
  const id = await ctx.db.insert('contractorRecommendationModerationStats', {
    key: MODERATION_STATS_KEY,
    pendingReviewCount: reviews.filter((review) => review.status === 'pending').length,
    openReportCount: reports.filter((report) => report.status !== 'resolved').length,
    updatedAt: now,
  });
  return await ctx.db.get(id);
};

const adjustModerationStats = async (ctx: MutationCtx, pendingDelta = 0, reportDelta = 0) => {
  const stats = await getOrCreateModerationStats(ctx);
  if (!stats) throw new Error('לא הצלחנו לעדכן את מוני הניהול');
  await ctx.db.patch(stats._id, {
    pendingReviewCount: Math.max(0, stats.pendingReviewCount + pendingDelta),
    openReportCount: Math.max(0, stats.openReportCount + reportDelta),
    updatedAt: Date.now(),
  });
};

const recordModerationEvent = async (
  ctx: MutationCtx,
  reviewId: Id<'contractorReviews'>,
  actorUserId: Id<'users'>,
  action: 'submitted' | 'resubmitted' | 'approved' | 'rejected' | 'report_received' | 'report_kept_visible' | 'report_hidden' | 'republished' | 'edited' | 'deleted',
  note?: string,
) => await ctx.db.insert('contractorReviewModerationEvents', {
  reviewId,
  actorUserId,
  action,
  note: note?.trim() || undefined,
  createdAt: Date.now(),
});

const enforceRecommendationRateLimit = async (
  ctx: MutationCtx,
  userId: Id<'users'>,
  scope: 'review_write' | 'image_submission' | 'review_report',
  maxRequests: number,
  windowMs: number,
  message: string,
) => {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const current = await ctx.db
    .query('contractorRecommendationRateLimits')
    .withIndex('by_userId_and_scope_and_windowStart', (q) => q.eq('userId', userId).eq('scope', scope).eq('windowStart', windowStart))
    .first();
  if (current && current.count >= maxRequests) throw new Error(message);
  if (current) {
    await ctx.db.patch(current._id, { count: current.count + 1, updatedAt: now });
  } else {
    await ctx.db.insert('contractorRecommendationRateLimits', { userId, scope, windowStart, count: 1, updatedAt: now });
  }
};

const requireSuperAdmin = async (ctx: Parameters<typeof requireProjectMember>[0]) => {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error('Not authenticated');
  const user = await ctx.db.get(userId);
  if (!user?.isSuperAdmin) throw new Error('רק מנהל מערכת יכול לאשר חוות דעת');
  return { userId, user };
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Removes direct identifiers before a masked recommendation leaves the API. */
const redactMaskedRecommendation = (value: string, profile: { displayName: string; company?: string }) => {
  let redacted = value;
  const directIdentifiers = [profile.displayName, profile.company]
    .filter((identifier): identifier is string => Boolean(identifier?.trim()))
    .sort((a, b) => b.length - a.length);
  for (const identifier of directIdentifiers) {
    redacted = redacted.replace(new RegExp(escapeRegExp(identifier), 'gi'), 'קבלן');
  }
  return redacted
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[אימייל הוסר]')
    .replace(/(?:https?:\/\/|www\.)\S+/gi, '[קישור הוסר]')
    .replace(/(?:\+?972|0)[\s().-]*\d(?:[\s().-]*\d){7,}/g, '[טלפון הוסר]');
};

/**
 * Recommendation feed is available to every authenticated project member.
 * Free users can identify only contractors already attached to their active
 * project. All other marketplace contractors remain masked until Pro.
 */
export const listFeed = query({
  args: {
    projectId: v.id('projects'),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const { userId } = await requireProjectMember(ctx, args.projectId);
    const isPro = await canUnlockIdentity(ctx, args.projectId);
    const projectContractors = await ctx.db
      .query('contractors')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .take(100);
    const activeProjectProfileIds = new Set(
      projectContractors.flatMap((contractor) => contractor.contractorProfileId ? [contractor.contractorProfileId] : []),
    );
    const result = await ctx.db
      .query('contractorReviews')
      .withIndex('by_status_and_createdAt', (q) => q.eq('status', 'published'))
      .order('desc')
      .paginate(args.paginationOpts);
    const reviews = result.page;

    const visible = await Promise.all(reviews.map(async (review) => {
      const profile = await ctx.db.get(review.contractorProfileId);
      if (!profile) return null;
      const response = await ctx.db
        .query('contractorReviewResponses')
        .withIndex('by_reviewId', (q) => q.eq('reviewId', review._id))
        .first();
      const canRevealIdentity = isPro || activeProjectProfileIds.has(profile._id);
      const originalImageUrl = canRevealIdentity && profile.originalImageStorageId
        ? await ctx.storage.getUrl(profile.originalImageStorageId as Id<'_storage'>)
        : null;

      return {
        id: review._id,
        role: profile.role,
        area: profile.serviceAreas[0] ?? 'אזור שירות לא צוין',
        serviceAreas: profile.serviceAreas,
        overallRating: review.overallRating,
        professionalismRating: review.professionalismRating,
        timelinessRating: review.timelinessRating,
        communicationRating: review.communicationRating,
        tags: review.tags,
        body: canRevealIdentity ? review.body : redactMaskedRecommendation(review.body, profile),
        workMonth: review.workMonth ?? null,
        authorRole: review.authorRole,
        isOwnReview: review.authorUserId === userId,
        createdAt: review.createdAt,
        response: response ? { body: canRevealIdentity ? response.body : redactMaskedRecommendation(response.body, profile), createdAt: response.createdAt } : null,
        // A logo can identify a business just as a name can. It is therefore
        // only included in the paid identity-reveal response.
        imageUrl: originalImageUrl,
        isIdentityLocked: !canRevealIdentity,
        // Keep the response shape stable without exposing an id to Free users.
        contractorProfileId: canRevealIdentity ? profile._id : null,
        ...(canRevealIdentity ? {
          displayName: profile.displayName,
          company: profile.company ?? null,
        } : {
          displayName: maskedName(profile.role),
          company: null,
        }),
      };
    }));

    return { ...result, page: visible.filter((item): item is NonNullable<typeof item> => item !== null) };
  },
});

export const getFeedAccess = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    await requireProjectMember(ctx, args.projectId);
    return { isPro: await canUnlockIdentity(ctx, args.projectId) };
  },
});

export const getContact = query({
  args: { projectId: v.id('projects'), contractorProfileId: v.id('contractorProfiles') },
  handler: async (ctx, args) => {
    await requireProjectFeature(ctx, args.projectId, 'contractorReviews');
    await requireProjectMember(ctx, args.projectId);
    const profile = await ctx.db.get(args.contractorProfileId);
    if (!profile) throw new Error('פרופיל הקבלן לא נמצא');
    return { displayName: profile.displayName, phone: profile.phone ?? null, email: profile.email ?? null };
  },
});

/** Summary is scoped to a contractor in the member's own active project.
 * Its image is needed to identify the contractor while writing/editing a review. */
export const getContractorSummary = query({
  args: { projectId: v.id('projects'), contractorId: v.id('contractors') },
  handler: async (ctx, args) => {
    await requireProjectMember(ctx, args.projectId);
    const contractor = await ctx.db.get(args.contractorId);
    if (!contractor || contractor.projectId !== args.projectId) throw new Error('הקבלן אינו שייך לפרויקט הפעיל');
    if (!contractor.contractorProfileId) {
      return {
        reviewCount: 0,
        averageRating: null,
        topTags: [],
        latestReview: null,
        imageUrl: null,
        profileRole: contractor.role,
        serviceAreas: [],
      };
    }
    const profile = await ctx.db.get(contractor.contractorProfileId);
    const imageStorageId = profile?.originalImageStorageId ?? profile?.previewImageStorageId;
    const imageUrl = imageStorageId
      ? await ctx.storage.getUrl(imageStorageId as Id<'_storage'>)
      : null;
    const reviews = await ctx.db
      .query('contractorReviews')
      .withIndex('by_contractorProfileId_and_status', (q) => q.eq('contractorProfileId', contractor.contractorProfileId!).eq('status', 'published'))
      .take(100);
    if (reviews.length === 0) {
      return {
        reviewCount: 0,
        averageRating: null,
        topTags: [],
        latestReview: null,
        imageUrl,
        profileRole: profile?.role ?? contractor.role,
        serviceAreas: profile?.serviceAreas ?? [],
      };
    }
    const tagCounts = new Map<string, number>();
    for (const review of reviews) for (const tag of review.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([tag]) => tag);
    const latest = [...reviews].sort((a, b) => b.createdAt - a.createdAt)[0];
    return {
      reviewCount: reviews.length,
      averageRating: Math.round((reviews.reduce((sum, review) => sum + review.overallRating, 0) / reviews.length) * 10) / 10,
      topTags,
      latestReview: { body: latest.body, authorRole: latest.authorRole, createdAt: latest.createdAt },
      imageUrl,
      profileRole: profile?.role ?? contractor.role,
      serviceAreas: profile?.serviceAreas ?? [],
    };
  },
});

export const ensureProfileForProjectContractor = mutation({
  args: { projectId: v.id('projects'), contractorId: v.id('contractors') },
  handler: async (ctx, args) => {
    const { userId, project } = await requireProjectMember(ctx, args.projectId);
    if (!reviewerRole(project, userId)) throw new Error('רק בעלים, מנהל או מפקח יכולים לנהל המלצות קבלנים');
    const contractor = await ctx.db.get(args.contractorId);
    if (!contractor || contractor.projectId !== args.projectId) throw new Error('הקבלן אינו שייך לפרויקט הפעיל');
    if (contractor.contractorProfileId) return contractor.contractorProfileId;
    const now = Date.now();
    const normalizedPhone = contractor.phone?.replace(/\D/g, '') || undefined;
    const existing = normalizedPhone
      ? await ctx.db.query('contractorProfiles').withIndex('by_normalizedPhone', (q) => q.eq('normalizedPhone', normalizedPhone)).first()
      : null;
    const profileId = existing?._id ?? await ctx.db.insert('contractorProfiles', {
      displayName: contractor.name,
      company: contractor.company,
      role: contractor.role,
      serviceAreas: [],
      phone: contractor.phone,
      email: contractor.email,
      claimedUserId: contractor.userId,
      normalizedPhone,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(args.contractorId, { contractorProfileId: profileId });
    return profileId;
  },
});

/** Profile-only metadata for the global recommendations directory. It is
 * deliberately separate from the project's contractor role, because changing
 * the latter can affect payment schedules and stage assignment behaviour. */
export const updateProfileDetails = mutation({
  args: {
    projectId: v.id('projects'),
    contractorId: v.id('contractors'),
    role: v.string(),
    serviceAreas: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, project } = await requireProjectMember(ctx, args.projectId);
    if (!reviewerRole(project, userId)) throw new Error('רק בעלים, מנהל או מפקח יכולים לעדכן את פרופיל הקבלן');
    if (!contractorProfileRoles.has(args.role)) throw new Error('סוג הקבלן אינו תקין');
    const role = args.role as ContractorProfileRole;
    const serviceAreas = [...new Set(args.serviceAreas.map((area) => area.trim()).filter(Boolean))];
    if (serviceAreas.length > 12 || serviceAreas.some((area) => area.length > 80)) {
      throw new Error('ניתן לשמור עד 12 אזורי פעילות קצרים');
    }
    const contractor = await ctx.db.get(args.contractorId);
    if (!contractor || contractor.projectId !== args.projectId) throw new Error('הקבלן אינו שייך לפרויקט הפעיל');
    const now = Date.now();
    const profileId = contractor.contractorProfileId ?? await ctx.db.insert('contractorProfiles', {
      displayName: contractor.name,
      company: contractor.company,
      role,
      serviceAreas,
      phone: contractor.phone,
      email: contractor.email,
      claimedUserId: contractor.userId,
      normalizedPhone: contractor.phone?.replace(/\D/g, '') || undefined,
      createdAt: now,
      updatedAt: now,
    });
    if (!contractor.contractorProfileId) await ctx.db.patch(contractor._id, { contractorProfileId: profileId });
    await ctx.db.patch(profileId, { role, serviceAreas, updatedAt: now });
    return profileId;
  },
});

export const generateProfileImageUploadUrl = mutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const { userId, project } = await requireProjectMember(ctx, args.projectId);
    if (!reviewerRole(project, userId)) throw new Error('רק בעלים, מנהל או מפקח יכולים להעלות תמונת קבלן');
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveProfileImage = mutation({
  args: { projectId: v.id('projects'), contractorId: v.id('contractors'), reviewId: v.id('contractorReviews'), storageId: v.id('_storage') },
  handler: async (ctx, args) => {
    const { userId, project } = await requireProjectMember(ctx, args.projectId);
    if (!reviewerRole(project, userId)) throw new Error('רק בעלים, מנהל או מפקח יכולים לעדכן תמונת קבלן');
    await enforceRecommendationRateLimit(ctx, userId, 'image_submission', 8, 24 * 60 * 60 * 1000, 'הגעת למגבלת העלאות תמונת קבלן להיום. נסו שוב מחר.');
    const contractor = await ctx.db.get(args.contractorId);
    if (!contractor || contractor.projectId !== args.projectId) throw new Error('הקבלן אינו שייך לפרויקט הפעיל');
    const pendingReview = await ctx.db.get(args.reviewId);
    if (!pendingReview || pendingReview.projectId !== args.projectId || pendingReview.contractorId !== args.contractorId || pendingReview.authorUserId !== userId || pendingReview.status !== 'pending') throw new Error('אפשר להעלות תמונה רק יחד עם חוות הדעת הממתינה שלך');
    const profileId = contractor.contractorProfileId ?? await ctx.db.insert('contractorProfiles', { displayName: contractor.name, company: contractor.company, role: contractor.role, serviceAreas: [], phone: contractor.phone, email: contractor.email, claimedUserId: contractor.userId, normalizedPhone: contractor.phone?.replace(/\D/g, '') || undefined, createdAt: Date.now(), updatedAt: Date.now() });
    if (!contractor.contractorProfileId) await ctx.db.patch(contractor._id, { contractorProfileId: profileId });
    const existingSubmission = await ctx.db
      .query('contractorProfileImageSubmissions')
      .withIndex('by_reviewId', (q) => q.eq('reviewId', args.reviewId))
      .first();
    const now = Date.now();
    if (existingSubmission) {
      await ctx.db.patch(existingSubmission._id, { storageId: args.storageId, status: 'pending', submittedByUserId: userId, moderatedByUserId: undefined, moderatedAt: undefined, moderationNote: undefined, updatedAt: now });
      if (existingSubmission.storageId !== args.storageId) await ctx.storage.delete(existingSubmission.storageId as Id<'_storage'>);
    } else {
      await ctx.db.insert('contractorProfileImageSubmissions', { contractorProfileId: profileId, reviewId: args.reviewId, storageId: args.storageId, status: 'pending', submittedByUserId: userId, createdAt: now, updatedAt: now });
    }
  },
});

export const createReview = mutation({
  args: {
    projectId: v.id('projects'), contractorId: v.id('contractors'), contractorProfileId: v.id('contractorProfiles'),
    overallRating: rating, professionalismRating: rating, timelinessRating: rating, communicationRating: rating,
    tags: v.array(v.string()), body: v.string(), workMonth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, project } = await requireProjectMember(ctx, args.projectId);
    const authorRole = reviewerRole(project, userId);
    if (!authorRole) throw new Error('רק בעלים, מנהל או מפקח יכולים לכתוב חוות דעת');
    await enforceRecommendationRateLimit(ctx, userId, 'review_write', 6, 24 * 60 * 60 * 1000, 'הגעת למגבלת שליחת חוות דעת להיום. נסו שוב מחר.');
    await getOrCreateModerationStats(ctx);
    const contractor = await ctx.db.get(args.contractorId);
    if (!contractor || contractor.projectId !== args.projectId || contractor.contractorProfileId !== args.contractorProfileId) throw new Error('הקבלן אינו תואם לפרויקט או לפרופיל');
    if (contractor.userId === userId) throw new Error('לא ניתן לכתוב חוות דעת על עצמך');
    for (const value of [args.overallRating, args.professionalismRating, args.timelinessRating, args.communicationRating]) {
      if (!Number.isInteger(value) || value < 1 || value > 5) throw new Error('הדירוג חייב להיות מספר שלם בין 1 ל-5');
    }
    if (args.body.trim().length < 20 || args.body.trim().length > 2000) throw new Error('חוות הדעת חייבת לכלול בין 20 ל-2000 תווים');
    const priorReviews = await ctx.db
      .query('contractorReviews')
      .withIndex('by_projectId_and_authorUserId', (q) => q.eq('projectId', args.projectId).eq('authorUserId', userId))
      .collect();
    const activeDuplicate = priorReviews.find((review) => review.contractorId === args.contractorId && (review.status === 'pending' || review.status === 'published'));
    if (activeDuplicate) throw new Error('כבר נכתבה חוות דעת פעילה על קבלן זה בפרויקט');
    const now = Date.now();
    const reviewId = await ctx.db.insert('contractorReviews', { ...args, body: args.body.trim(), authorUserId: userId, authorRole, status: 'pending', createdAt: now, updatedAt: now });
    await adjustModerationStats(ctx, 1);
    await recordModerationEvent(ctx, reviewId, userId, 'submitted');
    const superAdmins = await ctx.db.query('users').filter((q) => q.eq(q.field('isSuperAdmin'), true)).take(20);
    await scheduleUserNotifications(ctx, {
      userIds: superAdmins.map((admin) => admin._id),
      title: 'חוות דעת חדשה ממתינה לאישור',
      body: 'נוספה חוות דעת חדשה בתור הניהולי של המלצות הקבלנים.',
      url: '/super-admin?tab=reviews',
      tag: `contractor-review-${reviewId}`,
    });
    return reviewId;
  },
});

export const listMyProjectReviews = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const { userId } = await requireProjectMember(ctx, args.projectId);
    const reviews = await ctx.db
      .query('contractorReviews')
      .withIndex('by_projectId_and_authorUserId', (q) => q.eq('projectId', args.projectId).eq('authorUserId', userId))
      .take(100);
    return reviews.map((review) => ({
      id: review._id,
      contractorId: review.contractorId,
      contractorProfileId: review.contractorProfileId,
      overallRating: review.overallRating,
      professionalismRating: review.professionalismRating,
      timelinessRating: review.timelinessRating,
      communicationRating: review.communicationRating,
      tags: review.tags,
      body: review.body,
      workMonth: review.workMonth ?? null,
      status: review.status,
      moderationNote: review.moderationNote ?? null,
    }));
  },
});

export const updateMyReview = mutation({
  args: {
    reviewId: v.id('contractorReviews'), overallRating: rating, professionalismRating: rating,
    timelinessRating: rating, communicationRating: rating, tags: v.array(v.string()), body: v.string(), workMonth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const review = await ctx.db.get(args.reviewId);
    if (!review) throw new Error('חוות הדעת לא נמצאה');
    const { userId, project } = await requireProjectMember(ctx, review.projectId);
    if (review.authorUserId !== userId || !reviewerRole(project, userId)) throw new Error('ניתן לערוך רק חוות דעת שכתבת בעצמך');
    await enforceRecommendationRateLimit(ctx, userId, 'review_write', 6, 24 * 60 * 60 * 1000, 'הגעת למגבלת שליחת חוות דעת להיום. נסו שוב מחר.');
    for (const value of [args.overallRating, args.professionalismRating, args.timelinessRating, args.communicationRating]) {
      if (!Number.isInteger(value) || value < 1 || value > 5) throw new Error('הדירוג חייב להיות מספר שלם בין 1 ל-5');
    }
    if (args.body.trim().length < 20 || args.body.trim().length > 2000) throw new Error('חוות הדעת חייבת לכלול בין 20 ל-2000 תווים');
    if (review.status !== 'pending') await getOrCreateModerationStats(ctx);
    await ctx.db.patch(review._id, {
      ...args,
      body: args.body.trim(),
      status: 'pending',
      moderatedByUserId: undefined,
      moderatedAt: undefined,
      moderationNote: undefined,
      updatedAt: Date.now(),
    });
    if (review.status !== 'pending') await adjustModerationStats(ctx, 1);
    await recordModerationEvent(ctx, review._id, userId, 'resubmitted');
  },
});

/** The global moderation queue is visible only to super-admins. */
export const listPendingReviews = query({
  args: {},
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const reviews = await ctx.db
      .query('contractorReviews')
      .withIndex('by_status_and_createdAt', (q) => q.eq('status', 'pending'))
      .order('desc')
      .take(100);
    return await Promise.all(reviews.map(async (review) => {
      const [profile, project, author, imageSubmission] = await Promise.all([
        ctx.db.get(review.contractorProfileId),
        ctx.db.get(review.projectId),
        ctx.db.get(review.authorUserId),
        ctx.db.query('contractorProfileImageSubmissions').withIndex('by_reviewId', (q) => q.eq('reviewId', review._id)).first(),
      ]);
      const pendingImageStorageId = imageSubmission?.status === 'pending' ? imageSubmission.storageId : profile?.pendingImageStorageId;
      const pendingImageUrl = pendingImageStorageId
        ? await ctx.storage.getUrl(pendingImageStorageId as Id<'_storage'>)
        : null;
      return {
        id: review._id,
        contractorId: review.contractorId,
        contractorName: profile?.displayName ?? 'קבלן',
        contractorCompany: profile?.company ?? null,
        pendingImageUrl,
        projectName: project?.name ?? 'פרויקט שנמחק',
        authorName: author?.name ?? 'משתמש',
        overallRating: review.overallRating,
        body: review.body,
        tags: review.tags,
        authorRole: review.authorRole,
        createdAt: review.createdAt,
      };
    }));
  },
});

/** Lightweight unread count for the super-admin header badge. */
export const getPendingReviewCount = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);
    const stats = await ctx.db
      .query('contractorRecommendationModerationStats')
      .withIndex('by_key', (q) => q.eq('key', MODERATION_STATS_KEY))
      .first();
    return stats?.pendingReviewCount ?? 0;
  },
});

/** Creates the aggregate read model once after deployment, without making
 * every badge read scan the reviews and reports tables. Safe to call again. */
export const initializeModerationStats = mutation({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);
    await getOrCreateModerationStats(ctx);
  },
});

/** Unresolved community reports shown in the super-admin header and workspace. */
export const getOpenReviewReportCount = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);
    const stats = await ctx.db
      .query('contractorRecommendationModerationStats')
      .withIndex('by_key', (q) => q.eq('key', MODERATION_STATS_KEY))
      .first();
    return stats?.openReportCount ?? 0;
  },
});

export const moderateReview = mutation({
  args: {
    reviewId: v.id('contractorReviews'),
    decision: v.union(v.literal('published'), v.literal('rejected')),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSuperAdmin(ctx);
    const review = await ctx.db.get(args.reviewId);
    if (!review || review.status !== 'pending') throw new Error('חוות הדעת אינה ממתינה לאישור');
    const note = args.note?.trim();
    if (note && note.length > 500) throw new Error('הערת האישור ארוכה מדי');
    await ctx.db.patch(review._id, {
      status: args.decision,
      moderatedByUserId: userId,
      moderatedAt: Date.now(),
      moderationNote: note || undefined,
      updatedAt: Date.now(),
    });
    await adjustModerationStats(ctx, -1);
    await recordModerationEvent(ctx, review._id, userId, args.decision === 'published' ? 'approved' : 'rejected', note);
    const [profile, imageSubmission] = await Promise.all([
      ctx.db.get(review.contractorProfileId),
      ctx.db.query('contractorProfileImageSubmissions').withIndex('by_reviewId', (q) => q.eq('reviewId', review._id)).first(),
    ]);
    if (imageSubmission && imageSubmission.status === 'pending') {
      if (args.decision === 'published' && profile) {
        const previousStorageId = profile.originalImageStorageId;
        await ctx.db.patch(profile._id, { originalImageStorageId: imageSubmission.storageId, updatedAt: Date.now() });
        await ctx.db.patch(imageSubmission._id, { status: 'published', moderatedByUserId: userId, moderatedAt: Date.now(), moderationNote: note || undefined, updatedAt: Date.now() });
        if (previousStorageId && previousStorageId !== imageSubmission.storageId) await ctx.storage.delete(previousStorageId as Id<'_storage'>);
      } else {
        await ctx.db.patch(imageSubmission._id, { status: 'rejected', moderatedByUserId: userId, moderatedAt: Date.now(), moderationNote: note || undefined, updatedAt: Date.now() });
        await ctx.storage.delete(imageSubmission.storageId as Id<'_storage'>);
      }
      return;
    }
    // Compatibility only for images uploaded before image submissions existed.
    const pendingImageStorageId = profile?.pendingImageStorageId;
    if (!profile || !pendingImageStorageId) return;
    if (args.decision === 'published') {
      const previousStorageId = profile.originalImageStorageId;
      await ctx.db.patch(profile._id, { originalImageStorageId: pendingImageStorageId, pendingImageStorageId: undefined, updatedAt: Date.now() });
      if (previousStorageId && previousStorageId !== pendingImageStorageId) await ctx.storage.delete(previousStorageId as Id<'_storage'>);
    } else {
      await ctx.db.patch(profile._id, { pendingImageStorageId: undefined, updatedAt: Date.now() });
      await ctx.storage.delete(pendingImageStorageId as Id<'_storage'>);
    }
  },
});

/** Resolves a community report without deleting its audit trail. */
export const resolveReportedReview = mutation({
  args: { reviewId: v.id('contractorReviews'), decision: v.union(v.literal('published'), v.literal('hidden')) },
  handler: async (ctx, args) => {
    const { userId } = await requireSuperAdmin(ctx);
    const review = await ctx.db.get(args.reviewId);
    if (!review) throw new Error('חוות הדעת לא נמצאה');
    await getOrCreateModerationStats(ctx);
    const reports = await ctx.db
      .query('contractorReviewReports')
      .withIndex('by_reviewId', (q) => q.eq('reviewId', review._id))
      .collect();
    const openReports = reports.filter((report) => report.status !== 'resolved');
    if (openReports.length === 0) throw new Error('אין דיווח פתוח על חוות הדעת');
    const now = Date.now();
    await ctx.db.patch(review._id, {
      status: args.decision,
      moderatedByUserId: userId,
      moderatedAt: now,
      updatedAt: now,
    });
    for (const report of openReports) {
      await ctx.db.patch(report._id, {
        status: 'resolved',
        resolvedByUserId: userId,
        resolvedAt: now,
        resolution: args.decision === 'hidden' ? 'review_hidden' : 'kept_visible',
      });
    }
    await adjustModerationStats(ctx, 0, -openReports.length);
    await recordModerationEvent(ctx, review._id, userId, args.decision === 'hidden' ? 'report_hidden' : 'report_kept_visible');
  },
});

/** Restores a review that the super-admin previously hid. */
export const republishReview = mutation({
  args: { reviewId: v.id('contractorReviews') },
  handler: async (ctx, args) => {
    const { userId } = await requireSuperAdmin(ctx);
    const review = await ctx.db.get(args.reviewId);
    if (!review || review.status !== 'hidden') throw new Error('רק חוות דעת מוסתרת ניתנת לפרסום מחדש');
    await ctx.db.patch(review._id, {
      status: 'published',
      moderatedByUserId: userId,
      moderatedAt: Date.now(),
      updatedAt: Date.now(),
    });
    await recordModerationEvent(ctx, review._id, userId, 'republished');
  },
});

/** Global moderation history for the super-admin review workspace. */
export const listModerationReviews = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const result = await ctx.db.query('contractorReviews').order('desc').paginate(args.paginationOpts);
    const page = await Promise.all(result.page.map(async (review) => {
      const [profile, project, author, reports, imageSubmission] = await Promise.all([
        ctx.db.get(review.contractorProfileId),
        ctx.db.get(review.projectId),
        ctx.db.get(review.authorUserId),
        ctx.db.query('contractorReviewReports').withIndex('by_reviewId', (q) => q.eq('reviewId', review._id)).collect(),
        ctx.db.query('contractorProfileImageSubmissions').withIndex('by_reviewId', (q) => q.eq('reviewId', review._id)).first(),
      ]);
      const [imageUrl, pendingImageUrl] = await Promise.all([
        profile?.originalImageStorageId ? ctx.storage.getUrl(profile.originalImageStorageId as Id<'_storage'>) : null,
        imageSubmission?.status === 'pending' ? ctx.storage.getUrl(imageSubmission.storageId as Id<'_storage'>) : profile?.pendingImageStorageId ? ctx.storage.getUrl(profile.pendingImageStorageId as Id<'_storage'>) : null,
      ]);
      return {
        id: review._id,
        contractorProfileId: review.contractorProfileId,
        contractorName: profile?.displayName ?? 'קבלן',
        contractorCompany: profile?.company ?? null,
        imageUrl,
        pendingImageUrl,
        projectName: project?.name ?? 'פרויקט שנמחק',
        authorName: author?.name ?? 'משתמש',
        authorRole: review.authorRole,
        overallRating: review.overallRating,
        professionalismRating: review.professionalismRating,
        timelinessRating: review.timelinessRating,
        communicationRating: review.communicationRating,
        tags: review.tags,
        body: review.body,
        status: review.status,
        moderationNote: review.moderationNote ?? null,
        reports: await Promise.all(reports.map(async (report) => ({
          id: report._id,
          reason: report.reason,
          status: report.status ?? 'open',
          createdAt: report.createdAt,
          reporterName: (await ctx.db.get(report.reporterUserId))?.name ?? 'משתמש',
        }))),
        createdAt: review.createdAt,
      };
    }));
    return { ...result, page };
  },
});

export const updateModerationReview = mutation({
  args: {
    reviewId: v.id('contractorReviews'),
    overallRating: rating,
    body: v.string(),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSuperAdmin(ctx);
    const review = await ctx.db.get(args.reviewId);
    if (!review) throw new Error('חוות הדעת לא נמצאה');
    await getOrCreateModerationStats(ctx);
    if (!Number.isInteger(args.overallRating) || args.overallRating < 1 || args.overallRating > 5) throw new Error('הדירוג חייב להיות מספר שלם בין 1 ל-5');
    const body = args.body.trim();
    if (body.length < 20 || body.length > 2000) throw new Error('חוות הדעת חייבת לכלול בין 20 ל-2000 תווים');
    if (args.tags.length > 12 || args.tags.some((tag) => tag.trim().length === 0 || tag.length > 80)) throw new Error('התגיות אינן תקינות');
    await ctx.db.patch(review._id, {
      overallRating: args.overallRating,
      professionalismRating: args.overallRating,
      timelinessRating: args.overallRating,
      communicationRating: args.overallRating,
      body,
      tags: args.tags.map((tag) => tag.trim()),
      updatedAt: Date.now(),
    });
    await recordModerationEvent(ctx, review._id, userId, 'edited');
  },
});

/** Per-review immutable management history, loaded only when requested. */
export const listReviewModerationEvents = query({
  args: { reviewId: v.id('contractorReviews') },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const events = await ctx.db
      .query('contractorReviewModerationEvents')
      .withIndex('by_reviewId_and_createdAt', (q) => q.eq('reviewId', args.reviewId))
      .order('desc')
      .take(50);
    return await Promise.all(events.map(async (event) => ({
      id: event._id,
      action: event.action,
      note: event.note ?? null,
      createdAt: event.createdAt,
      actorName: (await ctx.db.get(event.actorUserId))?.name ?? 'משתמש שנמחק',
    })));
  },
});

export const deleteModerationReview = mutation({
  args: { reviewId: v.id('contractorReviews'), deleteProfileImage: v.boolean() },
  handler: async (ctx, args) => {
    const { userId } = await requireSuperAdmin(ctx);
    const review = await ctx.db.get(args.reviewId);
    if (!review) throw new Error('חוות הדעת לא נמצאה');
    const [response, reports, profile, imageSubmission] = await Promise.all([
      ctx.db.query('contractorReviewResponses').withIndex('by_reviewId', (q) => q.eq('reviewId', review._id)).first(),
      ctx.db.query('contractorReviewReports').withIndex('by_reviewId', (q) => q.eq('reviewId', review._id)).collect(),
      ctx.db.get(review.contractorProfileId),
      ctx.db.query('contractorProfileImageSubmissions').withIndex('by_reviewId', (q) => q.eq('reviewId', review._id)).first(),
    ]);
    if (response) await ctx.db.delete(response._id);
    for (const report of reports) await ctx.db.delete(report._id);
    if (imageSubmission) {
      await ctx.db.delete(imageSubmission._id);
      if (imageSubmission.status !== 'published' || args.deleteProfileImage) await ctx.storage.delete(imageSubmission.storageId as Id<'_storage'>);
    }
    await ctx.db.delete(review._id);
    await adjustModerationStats(ctx, review.status === 'pending' ? -1 : 0, -reports.filter((report) => report.status !== 'resolved').length);
    await recordModerationEvent(ctx, review._id, userId, 'deleted', args.deleteProfileImage ? 'כולל מחיקת תמונת הפרופיל' : undefined);
    if (!args.deleteProfileImage || !profile) return;
    const storageIds = [profile.originalImageStorageId, profile.pendingImageStorageId]
      .filter((storageId): storageId is string => Boolean(storageId));
    await ctx.db.patch(profile._id, { originalImageStorageId: undefined, pendingImageStorageId: undefined, updatedAt: Date.now() });
    for (const storageId of new Set(storageIds)) await ctx.storage.delete(storageId as Id<'_storage'>);
  },
});

export const respondToReview = mutation({
  args: { reviewId: v.id('contractorReviews'), body: v.string() },
  handler: async (ctx, args) => {
    const review = await ctx.db.get(args.reviewId);
    if (!review || review.status !== 'published') throw new Error('חוות הדעת אינה זמינה לתגובה');
    const { userId } = await requireProjectMember(ctx, review.projectId);
    const profile = await ctx.db.get(review.contractorProfileId);
    if (!profile || profile.claimedUserId !== userId) throw new Error('רק חשבון הקבלן המקושר יכול להגיב');
    if (args.body.trim().length < 2 || args.body.trim().length > 2000) throw new Error('התגובה חייבת לכלול בין 2 ל-2000 תווים');
    const existing = await ctx.db.query('contractorReviewResponses').withIndex('by_reviewId', (q) => q.eq('reviewId', review._id)).first();
    const now = Date.now();
    if (existing) { await ctx.db.patch(existing._id, { body: args.body.trim(), updatedAt: now }); return existing._id; }
    return await ctx.db.insert('contractorReviewResponses', { reviewId: review._id, contractorProfileId: review.contractorProfileId, authorUserId: userId, body: args.body.trim(), createdAt: now, updatedAt: now });
  },
});

export const reportReview = mutation({
  args: { projectId: v.id('projects'), reviewId: v.id('contractorReviews'), reason: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireProjectMember(ctx, args.projectId);
    await enforceRecommendationRateLimit(ctx, userId, 'review_report', 8, 60 * 60 * 1000, 'שלחת יותר מדי דיווחים בזמן קצר. נסו שוב בעוד שעה.');
    const review = await ctx.db.get(args.reviewId);
    if (!review || review.status !== 'published') throw new Error('חוות הדעת אינה זמינה לדיווח');
    if (review.authorUserId === userId) throw new Error('לא ניתן לדווח על חוות דעת שכתבת בעצמך');
    if (args.reason.trim().length < 5) throw new Error('נא לפרט את סיבת הדיווח');
    await getOrCreateModerationStats(ctx);
    const priorReports = await ctx.db
      .query('contractorReviewReports')
      .withIndex('by_reviewId_and_reporterUserId', (q) => q.eq('reviewId', args.reviewId).eq('reporterUserId', userId))
      .collect();
    const openDuplicate = priorReports.find((report) => report.status !== 'resolved');
    if (openDuplicate) return openDuplicate._id;
    const reportId = await ctx.db.insert('contractorReviewReports', { reviewId: args.reviewId, reporterUserId: userId, reason: args.reason.trim(), status: 'open', createdAt: Date.now() });
    await adjustModerationStats(ctx, 0, 1);
    await recordModerationEvent(ctx, review._id, userId, 'report_received', args.reason.trim());
    const superAdmins = await ctx.db.query('users').filter((q) => q.eq(q.field('isSuperAdmin'), true)).take(20);
    await scheduleUserNotifications(ctx, {
      userIds: superAdmins.map((admin) => admin._id),
      title: 'דיווח חדש על חוות דעת',
      body: 'דיווח חדש ממתין לבדיקה; חוות הדעת עדיין מוצגת עד להכרעתך.',
      url: '/super-admin?tab=reviews',
      tag: `contractor-review-report-${reportId}`,
    });
    return reportId;
  },
});
