/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import schema from './schema';
import { api } from './_generated/api';

const modules = import.meta.glob('./**/*.ts');
const firstPage = { cursor: null, numItems: 20 };

async function seed(t: ReturnType<typeof convexTest>, tier: 'free' | 'pro' = 'free') {
  const ownerId = await t.run((ctx) => ctx.db.insert('users', { name: 'בעלים', role: 'owner', subscriptionTier: tier, subscriptionExpiresAt: Date.now() + 60_000 }));
  const inspectorId = await t.run((ctx) => ctx.db.insert('users', { name: 'מפקח', role: 'inspector' }));
  const contractorUserId = await t.run((ctx) => ctx.db.insert('users', { name: 'קבלן', role: 'contractor' }));
  const superAdminId = await t.run((ctx) => ctx.db.insert('users', { name: 'מנהל מערכת', role: 'owner', isSuperAdmin: true }));
  const projectId = await t.run((ctx) => ctx.db.insert('projects', { name: 'בית', address: 'בדיקה', ownerUserId: ownerId, inspectorUserId: inspectorId, startDate: '2026-01-01', expectedEnd: '2026-12-31', progressPct: 0, budgetTotal: 0, spent: 0 }));
  const profileId = await t.run((ctx) => ctx.db.insert('contractorProfiles', { displayName: 'חשמל כהן', company: 'כהן חשמל', role: 'חשמלאי ראשי', serviceAreas: ['השרון'], phone: '0501234567', claimedUserId: contractorUserId, createdAt: 1, updatedAt: 1 }));
  const contractorId = await t.run((ctx) => ctx.db.insert('contractors', { projectId, name: 'חשמל כהן', role: 'חשמלאי ראשי', status: 'active', rating: 0, budget: 0, paid: 0, contractorProfileId: profileId, userId: contractorUserId }));
  const reviewId = await t.run((ctx) => ctx.db.insert('contractorReviews', { contractorProfileId: profileId, contractorId, projectId, authorUserId: ownerId, authorRole: 'owner', overallRating: 5, professionalismRating: 5, timelinessRating: 4, communicationRating: 5, tags: ['מדויק'], body: 'עבודה מקצועית, מסודרת ותקשורת מצוינת לאורך הפרויקט.', status: 'published', createdAt: 2, updatedAt: 2 }));
  return { ownerId, inspectorId, contractorUserId, superAdminId, projectId, profileId, contractorId, reviewId };
}

describe('contractor recommendations privacy and roles', () => {
  test('reveals the active project contractor to a Free project member', async () => {
    const t = convexTest(schema, modules);
    const data = await seed(t, 'free');
    const result = await t.withIdentity({ subject: data.ownerId }).query(api.contractorRecommendations.listFeed, { projectId: data.projectId, paginationOpts: firstPage });
    expect((await t.withIdentity({ subject: data.ownerId }).query(api.contractorRecommendations.getFeedAccess, { projectId: data.projectId })).isPro).toBe(false);
    expect(result.page[0]).toMatchObject({ displayName: 'חשמל כהן', company: 'כהן חשמל', contractorProfileId: data.profileId, isIdentityLocked: false, isOwnReview: true });
  });

  test('keeps contractors from other projects masked for a Free project member', async () => {
    const t = convexTest(schema, modules);
    const data = await seed(t, 'free');
    const otherOwnerId = await t.run((ctx) => ctx.db.insert('users', { name: 'בעלים נוסף', role: 'owner' }));
    const otherProjectId = await t.run((ctx) => ctx.db.insert('projects', { name: 'פרויקט נוסף', address: 'בדיקה', ownerUserId: otherOwnerId, startDate: '2026-01-01', expectedEnd: '2026-12-31', progressPct: 0, budgetTotal: 0, spent: 0 }));
    const otherProfileId = await t.run((ctx) => ctx.db.insert('contractorProfiles', { displayName: 'קבלן חיצוני', company: 'חברה חיצונית', role: 'קבלן שלד', serviceAreas: ['דרום'], createdAt: 3, updatedAt: 3 }));
    const otherContractorId = await t.run((ctx) => ctx.db.insert('contractors', { projectId: otherProjectId, name: 'קבלן חיצוני', role: 'קבלן שלד', status: 'active', rating: 0, budget: 0, paid: 0, contractorProfileId: otherProfileId }));
    await t.run((ctx) => ctx.db.insert('contractorReviews', { contractorProfileId: otherProfileId, contractorId: otherContractorId, projectId: otherProjectId, authorUserId: otherOwnerId, authorRole: 'owner', overallRating: 5, professionalismRating: 5, timelinessRating: 5, communicationRating: 5, tags: [], body: 'קבלן חיצוני זמין ב-050-123-4567 ובמייל external@example.com.', status: 'published', createdAt: 4, updatedAt: 4 }));

    const result = await t.withIdentity({ subject: data.ownerId }).query(api.contractorRecommendations.listFeed, { projectId: data.projectId, paginationOpts: firstPage });
    const externalReview = result.page.find((review) => review.id !== data.reviewId);
    expect(externalReview).toMatchObject({ displayName: 'קבלן שלד מאומת', company: null, contractorProfileId: null, isIdentityLocked: true });
    expect(externalReview?.body).not.toContain('קבלן חיצוני');
    expect(externalReview?.body).not.toContain('050-123-4567');
    expect(externalReview?.body).not.toContain('external@example.com');

    const pageOne = await t.withIdentity({ subject: data.ownerId }).query(api.contractorRecommendations.listFeed, { projectId: data.projectId, paginationOpts: { cursor: null, numItems: 1 } });
    expect(pageOne.isDone).toBe(false);
    const pageTwo = await t.withIdentity({ subject: data.ownerId }).query(api.contractorRecommendations.listFeed, { projectId: data.projectId, paginationOpts: { cursor: pageOne.continueCursor, numItems: 1 } });
    expect(pageTwo.page).toHaveLength(1);
  });

  test('unlocks identity for a Pro project member', async () => {
    const t = convexTest(schema, modules);
    const data = await seed(t, 'pro');
    const result = await t.withIdentity({ subject: data.inspectorId }).query(api.contractorRecommendations.listFeed, { projectId: data.projectId, paginationOpts: firstPage });
    expect((await t.withIdentity({ subject: data.inspectorId }).query(api.contractorRecommendations.getFeedAccess, { projectId: data.projectId })).isPro).toBe(true);
    expect(result.page[0]).toMatchObject({ displayName: 'חשמל כהן', company: 'כהן חשמל', contractorProfileId: data.profileId, isIdentityLocked: false });
  });

  test('queues an eligible Free project member review for super-admin approval', async () => {
    const t = convexTest(schema, modules);
    const data = await seed(t, 'free');
    const reviewId = await t.withIdentity({ subject: data.inspectorId }).mutation(api.contractorRecommendations.createReview, {
      projectId: data.projectId, contractorId: data.contractorId, contractorProfileId: data.profileId,
      overallRating: 4, professionalismRating: 4, timelinessRating: 4, communicationRating: 4,
      tags: [], body: 'עבודה טובה ומסודרת, עם תקשורת ברורה לאורך הביצוע כולו.',
    });
    expect(reviewId).toBeDefined();
    const mine = await t.withIdentity({ subject: data.inspectorId }).query(api.contractorRecommendations.listMyProjectReviews, { projectId: data.projectId });
    expect(mine.find((review) => review.id === reviewId)?.status).toBe('pending');
    await expect(t.withIdentity({ subject: data.superAdminId }).query(api.contractorRecommendations.getPendingReviewCount, {})).resolves.toBe(1);
  });

  test('keeps each pending contractor image tied to its own review', async () => {
    const t = convexTest(schema, modules);
    const data = await seed(t, 'pro');
    await t.withIdentity({ subject: data.ownerId }).mutation(api.contractorRecommendations.updateMyReview, {
      reviewId: data.reviewId, overallRating: 5, professionalismRating: 5, timelinessRating: 4, communicationRating: 5,
      tags: ['מדויק'], body: 'הביקורת נערכה ונשלחה מחדש לאישור עם פירוט מספק על העבודה בפרויקט.',
    });
    const inspectorReviewId = await t.withIdentity({ subject: data.inspectorId }).mutation(api.contractorRecommendations.createReview, {
      projectId: data.projectId, contractorId: data.contractorId, contractorProfileId: data.profileId,
      overallRating: 4, professionalismRating: 4, timelinessRating: 4, communicationRating: 4,
      tags: [], body: 'חוות דעת נוספת של המפקח עם פירוט מספק כדי לעבור את כל בדיקות האורך.',
    });
    const ownerImageId = await t.run((ctx) => ctx.storage.store(new Blob(['owner image'])));
    const inspectorImageId = await t.run((ctx) => ctx.storage.store(new Blob(['inspector image'])));
    await t.withIdentity({ subject: data.ownerId }).mutation(api.contractorRecommendations.saveProfileImage, { projectId: data.projectId, contractorId: data.contractorId, reviewId: data.reviewId, storageId: ownerImageId });
    await t.withIdentity({ subject: data.inspectorId }).mutation(api.contractorRecommendations.saveProfileImage, { projectId: data.projectId, contractorId: data.contractorId, reviewId: inspectorReviewId, storageId: inspectorImageId });
    const submissions = await t.run((ctx) => ctx.db.query('contractorProfileImageSubmissions').collect());
    expect(submissions.find((submission) => submission.reviewId === data.reviewId)?.storageId).toBe(ownerImageId);
    expect(submissions.find((submission) => submission.reviewId === inspectorReviewId)?.storageId).toBe(inspectorImageId);

    await t.withIdentity({ subject: data.superAdminId }).mutation(api.contractorRecommendations.moderateReview, { reviewId: inspectorReviewId, decision: 'published' });
    expect((await t.run((ctx) => ctx.db.get(data.profileId)))?.originalImageStorageId).toBe(inspectorImageId);
    expect((await t.run((ctx) => ctx.db.query('contractorProfileImageSubmissions').withIndex('by_reviewId', (q) => q.eq('reviewId', data.reviewId)).first()))?.status).toBe('pending');
  });

  test('rate limits repeated review submissions on the server', async () => {
    const t = convexTest(schema, modules);
    const data = await seed(t, 'pro');
    const payload = {
      reviewId: data.reviewId, overallRating: 5, professionalismRating: 5, timelinessRating: 4, communicationRating: 5,
      tags: ['מדויק'], body: 'עדכון חוות דעת מפורט מספיק כדי לעמוד בכללי התוכן של מאגר ההמלצות.',
    };
    for (let attempt = 0; attempt < 6; attempt += 1) {
      await expect(t.withIdentity({ subject: data.ownerId }).mutation(api.contractorRecommendations.updateMyReview, payload)).resolves.toBeNull();
    }
    await expect(t.withIdentity({ subject: data.ownerId }).mutation(api.contractorRecommendations.updateMyReview, payload)).rejects.toThrow('מגבלת שליחת חוות דעת');
  });

  test('only a super-admin can approve a pending review', async () => {
    const t = convexTest(schema, modules);
    const data = await seed(t, 'free');
    const pendingReviewId = await t.withIdentity({ subject: data.inspectorId }).mutation(api.contractorRecommendations.createReview, {
      projectId: data.projectId, contractorId: data.contractorId, contractorProfileId: data.profileId,
      overallRating: 4, professionalismRating: 4, timelinessRating: 4, communicationRating: 4,
      tags: [], body: 'עבודה טובה ומסודרת, עם תקשורת ברורה לאורך הביצוע כולו.',
    });
    await expect(t.withIdentity({ subject: data.ownerId }).query(api.contractorRecommendations.listPendingReviews, {})).rejects.toThrow('מנהל מערכת');
    const pending = await t.withIdentity({ subject: data.superAdminId }).query(api.contractorRecommendations.listPendingReviews, {});
    expect(pending.some((review) => review.id === pendingReviewId)).toBe(true);
    await t.withIdentity({ subject: data.superAdminId }).mutation(api.contractorRecommendations.moderateReview, { reviewId: pendingReviewId, decision: 'published' });
    const published = await t.run((ctx) => ctx.db.get(pendingReviewId));
    expect(published?.status).toBe('published');
  });

  test('shows a rejection reason and lets the author submit a new review', async () => {
    const t = convexTest(schema, modules);
    const data = await seed(t, 'pro');
    const rejectedReviewId = await t.withIdentity({ subject: data.inspectorId }).mutation(api.contractorRecommendations.createReview, {
      projectId: data.projectId, contractorId: data.contractorId, contractorProfileId: data.profileId,
      overallRating: 3, professionalismRating: 3, timelinessRating: 3, communicationRating: 3,
      tags: [], body: 'הטקסט הראשון נשלח לבדיקה אך כלל מידע שלא מתאים לפרסום במאגר.',
    });
    await t.withIdentity({ subject: data.superAdminId }).mutation(api.contractorRecommendations.moderateReview, {
      reviewId: rejectedReviewId, decision: 'rejected', note: 'יש להסיר פרטי קשר מהטקסט.',
    });
    const mine = await t.withIdentity({ subject: data.inspectorId }).query(api.contractorRecommendations.listMyProjectReviews, { projectId: data.projectId });
    expect(mine.find((review) => review.id === rejectedReviewId)).toMatchObject({ status: 'rejected', moderationNote: 'יש להסיר פרטי קשר מהטקסט.' });

    await expect(t.withIdentity({ subject: data.inspectorId }).mutation(api.contractorRecommendations.createReview, {
      projectId: data.projectId, contractorId: data.contractorId, contractorProfileId: data.profileId,
      overallRating: 5, professionalismRating: 5, timelinessRating: 5, communicationRating: 5,
      tags: ['מקצועי'], body: 'נוסח חדש ומעודכן שמסביר את איכות העבודה בלי פרטים שלא מתאימים לפרסום.',
    })).resolves.toBeDefined();
  });

  test('lets a project member report a published review for super-admin handling', async () => {
    const t = convexTest(schema, modules);
    const data = await seed(t, 'pro');
    await t.withIdentity({ subject: data.inspectorId }).mutation(api.contractorRecommendations.reportReview, {
      projectId: data.projectId,
      reviewId: data.reviewId,
      reason: 'חוות הדעת כוללת מידע אישי שלא צריך להיות במאגר.',
    });
    await expect(t.withIdentity({ subject: data.superAdminId }).query(api.contractorRecommendations.getOpenReviewReportCount, {})).resolves.toBe(1);
    expect((await t.run((ctx) => ctx.db.get(data.reviewId)))?.status).toBe('published');
    const visibleFeed = await t.withIdentity({ subject: data.inspectorId }).query(api.contractorRecommendations.listFeed, { projectId: data.projectId, paginationOpts: firstPage });
    expect(visibleFeed.page.some((review) => review.id === data.reviewId)).toBe(true);
    const moderationList = await t.withIdentity({ subject: data.superAdminId }).query(api.contractorRecommendations.listModerationReviews, { paginationOpts: firstPage });
    expect(moderationList.page.find((review) => review.id === data.reviewId)?.reports[0]).toMatchObject({ reason: expect.stringContaining('מידע אישי'), status: 'open' });
    // Compatibility with reports created before reports were tracked separately
    // from the review visibility status.
    await t.run((ctx) => ctx.db.patch(data.reviewId, { status: 'reported' }));
    await expect(t.withIdentity({ subject: data.ownerId }).mutation(api.contractorRecommendations.resolveReportedReview, { reviewId: data.reviewId, decision: 'published' })).rejects.toThrow('מנהל מערכת');
    await t.withIdentity({ subject: data.superAdminId }).mutation(api.contractorRecommendations.resolveReportedReview, { reviewId: data.reviewId, decision: 'published' });
    expect((await t.run((ctx) => ctx.db.get(data.reviewId)))?.status).toBe('published');
    await expect(t.withIdentity({ subject: data.superAdminId }).query(api.contractorRecommendations.getOpenReviewReportCount, {})).resolves.toBe(0);
    const audit = await t.withIdentity({ subject: data.superAdminId }).query(api.contractorRecommendations.listReviewModerationEvents, { reviewId: data.reviewId });
    expect(audit.map((event) => event.action)).toEqual(expect.arrayContaining(['report_received', 'report_kept_visible']));
    const resolvedModerationList = await t.withIdentity({ subject: data.superAdminId }).query(api.contractorRecommendations.listModerationReviews, { paginationOpts: firstPage });
    expect(resolvedModerationList.page.find((review) => review.id === data.reviewId)?.reports[0]?.status).toBe('resolved');
    await expect(t.withIdentity({ subject: data.inspectorId }).mutation(api.contractorRecommendations.reportReview, {
      projectId: data.projectId,
      reviewId: data.reviewId,
      reason: 'נדרש בירור נוסף גם לאחר שהדיווח הקודם טופל.',
    })).resolves.toBeDefined();
    const reopenedModerationList = await t.withIdentity({ subject: data.superAdminId }).query(api.contractorRecommendations.listModerationReviews, { paginationOpts: firstPage });
    expect(reopenedModerationList.page.find((review) => review.id === data.reviewId)?.reports.filter((report) => report.status === 'open')).toHaveLength(1);
  });

  test('lets only a super-admin republish a hidden review', async () => {
    const t = convexTest(schema, modules);
    const data = await seed(t, 'pro');
    await t.run((ctx) => ctx.db.patch(data.reviewId, { status: 'hidden' }));
    await expect(t.withIdentity({ subject: data.ownerId }).mutation(api.contractorRecommendations.republishReview, { reviewId: data.reviewId })).rejects.toThrow('מנהל מערכת');
    await t.withIdentity({ subject: data.superAdminId }).mutation(api.contractorRecommendations.republishReview, { reviewId: data.reviewId });
    expect((await t.run((ctx) => ctx.db.get(data.reviewId)))?.status).toBe('published');
  });

  test('lets a super-admin edit and delete an existing review', async () => {
    const t = convexTest(schema, modules);
    const data = await seed(t, 'pro');
    await expect(t.withIdentity({ subject: data.ownerId }).mutation(api.contractorRecommendations.updateModerationReview, {
      reviewId: data.reviewId,
      overallRating: 4,
      tags: ['מעודכן'],
      body: 'חוות דעת מעודכנת עם מספיק תוכן כדי לעבור את בדיקת האורך של המערכת.',
    })).rejects.toThrow('מנהל מערכת');

    await t.withIdentity({ subject: data.superAdminId }).mutation(api.contractorRecommendations.updateModerationReview, {
      reviewId: data.reviewId,
      overallRating: 4,
      tags: ['מעודכן'],
      body: 'חוות דעת מעודכנת עם מספיק תוכן כדי לעבור את בדיקת האורך של המערכת.',
    });
    const updated = await t.run((ctx) => ctx.db.get(data.reviewId));
    expect(updated).toMatchObject({ overallRating: 4, professionalismRating: 4, tags: ['מעודכן'] });

    await t.withIdentity({ subject: data.superAdminId }).mutation(api.contractorRecommendations.deleteModerationReview, {
      reviewId: data.reviewId,
      deleteProfileImage: false,
    });
    expect(await t.run((ctx) => ctx.db.get(data.reviewId))).toBeNull();
  });

  test('rejects a contractor attempting to publish a review', async () => {
    const t = convexTest(schema, modules);
    const data = await seed(t, 'pro');
    await expect(t.withIdentity({ subject: data.contractorUserId }).mutation(api.contractorRecommendations.createReview, {
      projectId: data.projectId, contractorId: data.contractorId, contractorProfileId: data.profileId,
      overallRating: 5, professionalismRating: 5, timelinessRating: 5, communicationRating: 5,
      tags: [], body: 'זוהי חוות דעת שאסור לקבלן לכתוב בעצמו בפרויקט הזה.',
    })).rejects.toThrow('רק בעלים, מנהל או מפקח');
  });
});
