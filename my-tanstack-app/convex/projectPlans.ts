import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';
import type { Id } from './_generated/dataModel';
import { requireProjectMember, requireProjectOwner, canUserViewPlans } from './_lib/projectAccess';
import { validateUploadedFile } from './_lib/fileValidation';
import { getActiveTier } from './_lib/entitlements';
import { scheduleUserNotifications } from './notifications';

const MAX_PLAN_SIZE_BYTES = 25 * 1024 * 1024; // 25MB per file
const MAX_PLANS_FREE = 5;
const MAX_PLANS_PRO = 50;

const PLAN_CATEGORY_LABELS: Record<string, string> = {
  architectural: 'אדריכלות',
  structural: 'קונסטרוקציה',
  electrical: 'חשמל',
  plumbing: 'אינסטלציה',
  mechanical: 'מיזוג אוויר',
  landscape: 'פיתוח וגינון',
  general: 'כללי',
  other: 'אחר',
};

const categoryValidator = v.union(
  v.literal('architectural'),
  v.literal('structural'),
  v.literal('electrical'),
  v.literal('plumbing'),
  v.literal('mechanical'),
  v.literal('landscape'),
  v.literal('general'),
  v.literal('other'),
);

// ── Mutations ───────────────────────────────────────────────────────────────

export const generateUploadUrl = mutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    await requireProjectMember(ctx, args.projectId);
    return await ctx.storage.generateUploadUrl();
  },
});


async function notifyPlanUpdate(ctx: any, projectId: Id<'projects'>, planName: string, action: 'created' | 'updated' | 'new_version', uploaderUserId: string, explicitContractors: Id<'contractors'>[], stageIds: Id<'stages'>[]) {
  const project = await ctx.db.get(projectId);
  if (!project) return;
  
  const uploader = await ctx.db.get(uploaderUserId);
  const uploaderName = uploader?.name || 'משתמש';

  const userIdsToNotify = new Set<Id<'users'>>();
  
  // Add core team
  if (project.ownerUserId !== uploaderUserId) userIdsToNotify.add(project.ownerUserId);
  if (project.managerUserId && project.managerUserId !== uploaderUserId) userIdsToNotify.add(project.managerUserId);
  if (project.inspectorUserId && project.inspectorUserId !== uploaderUserId) userIdsToNotify.add(project.inspectorUserId);

  // Add explicit contractors
  if (explicitContractors.length > 0) {
    for (const cid of explicitContractors) {
      const c = await ctx.db.get(cid);
      if (c && c.userId && c.userId !== uploaderUserId) userIdsToNotify.add(c.userId as Id<'users'>);
    }
  }

  // Add stage contractors
  if (stageIds.length > 0) {
    for (const sid of stageIds) {
      const scs = await ctx.db
        .query('stageContractors')
        .withIndex('by_stage', (q: any) => q.eq('stageId', sid))
        .collect();
      for (const sc of scs) {
        const c = await ctx.db.get(sc.contractorId);
        if (c && c.userId && c.userId !== uploaderUserId) userIdsToNotify.add(c.userId as Id<'users'>);
      }
    }
  }

  if (userIdsToNotify.size === 0) return;

  const titles = {
    created: 'תוכנית חדשה הועלתה',
    updated: 'תוכנית עודכנה',
    new_version: 'גרסה חדשה הועלתה לתוכנית'
  };

  const bodies = {
    created: `${uploaderName} העלה/תה תוכנית חדשה: ${planName}`,
    updated: `${uploaderName} עדכן/ה את התוכנית: ${planName}`,
    new_version: `${uploaderName} העלה/תה גרסה חדשה לתוכנית: ${planName}`
  };

  await scheduleUserNotifications(ctx, {
    userIds: Array.from(userIdsToNotify),
    title: titles[action],
    body: bodies[action],
    url: `/projects/${projectId}/plans`,
    tag: `plan-${projectId}`
  });
}

export const createProjectPlan = mutation({
  args: {
    projectId: v.id('projects'),
    storageId: v.id('_storage'),
    name: v.string(),
    description: v.optional(v.string()),
    category: categoryValidator,
    stageIds: v.array(v.id('stages')),
    originalName: v.string(),
    storedName: v.string(),
    originalMimeType: v.string(),
    storedMimeType: v.string(),
    originalSize: v.number(),
    storedSize: v.number(),
    pageCount: v.optional(v.number()),
    sharedWithContractorIds: v.optional(v.array(v.id('contractors'))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const { project } = await requireProjectMember(ctx, args.projectId);

    if (project.ownerUserId !== userId && project.managerUserId !== userId) {
      const user = await ctx.db.get(userId);
      if (!user?.isSuperAdmin) {
        throw new Error('רק בעל הפרויקט או מנהל העבודה יכולים להעלות תוכניות');
      }
    }

    const metadata = await validateUploadedFile(ctx, args.storageId);

    if (metadata.size > MAX_PLAN_SIZE_BYTES) {
      await ctx.storage.delete(args.storageId);
      throw new Error(`גודל הקובץ חורג מהמקסימום (25MB לקובץ בודד)`);
    }
    
    const owner = project.ownerUserId ? await ctx.db.get(project.ownerUserId) : null;
    const tier = getActiveTier(owner);
    const maxTotalSizeMB = tier === 'free' ? 5 : 50;
    const maxTotalSizeBytes = maxTotalSizeMB * 1024 * 1024;

    const existingPlans = await ctx.db
      .query('projectPlans')
      .withIndex('by_project_latest', (q) =>
        q.eq('projectId', args.projectId).eq('isLatest', true),
      )
      .collect();
      
    const currentTotalSize = existingPlans.reduce((sum, p) => sum + p.originalSize, 0);
    
    if (currentTotalSize + metadata.size > maxTotalSizeBytes) {
      await ctx.storage.delete(args.storageId);
      throw new Error(`העלאה זו תחרוג מנפח האחסון הכולל המותר בפרויקט (${maxTotalSizeMB}MB)`);
    }

    const maxPlans = tier === 'free' ? MAX_PLANS_FREE : MAX_PLANS_PRO;

    if (existingPlans.length >= maxPlans) {
      await ctx.storage.delete(args.storageId);
      if (tier === 'free') {
        throw new Error(`במסלול החינמי ניתן להעלות עד ${MAX_PLANS_FREE} תוכניות. שדרג ל-Pro לתוכניות ללא הגבלה.`);
      }
      throw new Error(`הפרויקט הגיע למכסת התוכניות המרבית (${maxPlans})`);
    }

    for (const stageId of args.stageIds) {
      const stage = await ctx.db.get(stageId);
      if (!stage || stage.projectId !== args.projectId) {
        throw new Error('אחד השלבים שנבחרו אינו שייך לפרויקט זה');
      }
    }

    const newVersionId = await ctx.db.insert('projectPlans', {
      projectId: args.projectId,
      storageId: args.storageId,
      name: args.name,
      description: args.description,
      category: args.category,
      stageIds: args.stageIds,
      originalName: args.originalName,
      storedName: args.storedName,
      originalMimeType: args.originalMimeType,
      storedMimeType: metadata.contentType ?? args.storedMimeType,
      originalSize: args.originalSize,
      storedSize: metadata.size,
      pageCount: args.pageCount,
      version: 1,
      isLatest: true,
      uploaderUserId: userId,
      uploadedAt: Date.now(),
      sharedWithContractorIds: args.sharedWithContractorIds,
    });
    
    await notifyPlanUpdate(ctx, args.projectId, args.name, 'created', userId, args.sharedWithContractorIds || [], args.stageIds || []);
    return newVersionId;
  },
});

export const updateProjectPlan = mutation({
  args: {
    planId: v.id('projectPlans'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(categoryValidator),
    stageIds: v.optional(v.array(v.id('stages'))),
    sharedWithContractorIds: v.optional(v.array(v.id('contractors'))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error('תוכנית לא נמצאה');

    const { project } = await requireProjectMember(ctx, plan.projectId);

    if (project.ownerUserId !== userId && project.managerUserId !== userId) {
      const user = await ctx.db.get(userId);
      if (!user?.isSuperAdmin) {
        throw new Error('רק בעל הפרויקט או מנהל העבודה יכולים לערוך תוכניות');
      }
    }

    // Validate stageIds if provided
    if (args.stageIds) {
      for (const stageId of args.stageIds) {
        const stage = await ctx.db.get(stageId);
        if (!stage || stage.projectId !== plan.projectId) {
          throw new Error('אחד השלבים שנבחרו אינו שייך לפרויקט זה');
        }
      }
    }

    const patch: Record<string, any> = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.description !== undefined) patch.description = args.description;
    if (args.category !== undefined) patch.category = args.category;
    if (args.stageIds !== undefined) patch.stageIds = args.stageIds;
    if (args.sharedWithContractorIds !== undefined) patch.sharedWithContractorIds = args.sharedWithContractorIds;

    await ctx.db.patch(args.planId, patch);
    
    // Check if we should notify
    const updatedPlan = await ctx.db.get(args.planId);
    if (updatedPlan) {
       await notifyPlanUpdate(ctx, updatedPlan.projectId, updatedPlan.name, 'updated', userId, updatedPlan.sharedWithContractorIds || [], updatedPlan.stageIds || []);
    }
  },
});

export const uploadNewVersion = mutation({
  args: {
    parentPlanId: v.id('projectPlans'),
    storageId: v.id('_storage'),
    originalName: v.string(),
    storedName: v.string(),
    originalMimeType: v.string(),
    storedMimeType: v.string(),
    originalSize: v.number(),
    storedSize: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const parentPlan = await ctx.db.get(args.parentPlanId);
    if (!parentPlan) throw new Error('תוכנית מקור לא נמצאה');

    const { project } = await requireProjectMember(ctx, parentPlan.projectId);

    if (project.ownerUserId !== userId && project.managerUserId !== userId) {
      const user = await ctx.db.get(userId);
      if (!user?.isSuperAdmin) {
        throw new Error('רק בעל הפרויקט או מנהל העבודה יכולים להעלות גרסאות');
      }
    }

    const metadata = await validateUploadedFile(ctx, args.storageId);

    if (metadata.size > MAX_PLAN_SIZE_BYTES) {
      await ctx.storage.delete(args.storageId);
      throw new Error(`גודל הקובץ חורג מהמקסימום (25MB לקובץ בודד)`);
    }
    
    const owner = project.ownerUserId ? await ctx.db.get(project.ownerUserId) : null;
    const tier = getActiveTier(owner);
    const maxTotalSizeMB = tier === 'free' ? 5 : 50;
    const maxTotalSizeBytes = maxTotalSizeMB * 1024 * 1024;

    const existingPlans = await ctx.db
      .query('projectPlans')
      .withIndex('by_project_latest', (q) =>
        q.eq('projectId', parentPlan.projectId).eq('isLatest', true),
      )
      .collect();
      
    const currentTotalSize = existingPlans.reduce((sum, p) => sum + (p._id === parentPlan._id ? 0 : p.originalSize), 0);
    
    if (currentTotalSize + metadata.size > maxTotalSizeBytes) {
      await ctx.storage.delete(args.storageId);
      throw new Error(`העלאה זו תחרוג מנפח האחסון הכולל המותר בפרויקט (${maxTotalSizeMB}MB)`);
    }

    await ctx.db.patch(parentPlan._id, { isLatest: false });

    const newVersionId = await ctx.db.insert('projectPlans', {
      projectId: parentPlan.projectId,
      parentPlanId: parentPlan._id,
      storageId: args.storageId,
      name: parentPlan.name,
      description: parentPlan.description,
      category: parentPlan.category,
      stageIds: parentPlan.stageIds,
      originalName: args.originalName,
      storedName: args.storedName,
      originalMimeType: args.originalMimeType,
      storedMimeType: metadata.contentType ?? args.storedMimeType,
      originalSize: args.originalSize,
      storedSize: metadata.size,
      version: parentPlan.version + 1,
      isLatest: true,
      uploaderUserId: userId,
      uploadedAt: Date.now(),
      sharedWithContractorIds: parentPlan.sharedWithContractorIds,
    });
    
    await notifyPlanUpdate(ctx, parentPlan.projectId, parentPlan.name, 'new_version', userId, parentPlan.sharedWithContractorIds || [], parentPlan.stageIds || []);
    
    return newVersionId;
  },
});

export const saveThumbnail = mutation({
  args: {
    planId: v.id('projectPlans'),
    storageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) return;
    await requireProjectMember(ctx, plan.projectId);
    await ctx.db.patch(args.planId, { thumbnailStorageId: args.storageId });
  },
});

export const deleteProjectPlan = mutation({
  args: { planId: v.id('projectPlans') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const plan = await ctx.db.get(args.planId);
    if (!plan) return { deleted: false };

    const { project } = await requireProjectMember(ctx, plan.projectId);

    if (project.ownerUserId !== userId && project.managerUserId !== userId) {
      const user = await ctx.db.get(userId);
      if (!user?.isSuperAdmin) {
        throw new Error('רק בעל הפרויקט או מנהל העבודה יכולים למחוק תוכניות');
      }
    }

    // Delete all versions in chain
    const allVersions = await ctx.db
      .query('projectPlans')
      .withIndex('by_project', (q) => q.eq('projectId', plan.projectId))
      .collect();

    // Find the root plan and all its versions
    const findRoot = (id: Id<'projectPlans'>): Id<'projectPlans'> => {
      const p = allVersions.find((v) => v._id === id);
      if (p?.parentPlanId) return findRoot(p.parentPlanId);
      return id;
    };

    const rootId = plan.parentPlanId ? findRoot(plan._id) : plan._id;
    const chain = allVersions.filter((v) => {
      if (v._id === rootId) return true;
      let current = v;
      while (current.parentPlanId) {
        if (current.parentPlanId === rootId) return true;
        const parent = allVersions.find((p) => p._id === current.parentPlanId);
        if (!parent) break;
        current = parent;
      }
      return false;
    });

    for (const version of chain) {
      try { await ctx.storage.delete(version.storageId); } catch {}
      if (version.thumbnailStorageId) {
        try { await ctx.storage.delete(version.thumbnailStorageId); } catch {}
      }
      await ctx.db.delete(version._id);
    }

    return { deleted: true, deletedCount: chain.length };
  },
});

// ── Queries ─────────────────────────────────────────────────────────────────

export const listByProject = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const canView = await canUserViewPlans(ctx, args.projectId);
    if (!canView) return null;

    const plans = await ctx.db
      .query('projectPlans')
      .withIndex('by_project_latest', (q) =>
        q.eq('projectId', args.projectId).eq('isLatest', true),
      )
      .collect();

    // For contractors: filter to only plans shared with them or linked to their stages
    const user = await ctx.db.get(userId);
    const project = await ctx.db.get(args.projectId);
    const isOwnerOrManager =
      project?.ownerUserId === userId ||
      project?.managerUserId === userId ||
      project?.inspectorUserId === userId ||
      user?.isSuperAdmin;

    let filteredPlans = plans;
    if (!isOwnerOrManager) {
      // Contractor: find their stages
      const contractorRecord = await ctx.db
        .query('contractors')
        .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
        .filter((q) => q.eq(q.field('userId'), userId))
        .first();

      if (contractorRecord) {
        const stageContractors = await ctx.db
          .query('stageContractors')
          .withIndex('by_contractor', (q) => q.eq('contractorId', contractorRecord._id))
          .collect();
        const contractorStageIds = new Set(stageContractors.map((sc) => sc.stageId));

        filteredPlans = plans.filter((plan) => {
          // Shared explicitly
          if (plan.sharedWithContractorIds?.includes(contractorRecord._id)) return true;
          // Linked to one of their stages
          return plan.stageIds.some((sid) => contractorStageIds.has(sid));
        });
      }
    }

    return await Promise.all(
      filteredPlans.map(async (plan) => ({
        ...plan,
        id: plan._id,
        url: await ctx.storage.getUrl(plan.storageId),
        thumbnailUrl: plan.thumbnailStorageId
          ? await ctx.storage.getUrl(plan.thumbnailStorageId)
          : null,
        categoryLabel: PLAN_CATEGORY_LABELS[plan.category] || plan.category,
      })),
    );
  },
});

export const listByStage = query({
  args: { stageId: v.id('stages') },
  handler: async (ctx, args) => {
    const stage = await ctx.db.get(args.stageId);
    if (!stage) return [];

    const canView = await canUserViewPlans(ctx, stage.projectId);
    if (!canView) return [];

    const allPlans = await ctx.db
      .query('projectPlans')
      .withIndex('by_project_latest', (q) =>
        q.eq('projectId', stage.projectId).eq('isLatest', true),
      )
      .collect();

    const linkedPlans = allPlans.filter((p) => p.stageIds.includes(args.stageId));

    return await Promise.all(
      linkedPlans.map(async (plan) => ({
        ...plan,
        id: plan._id,
        url: await ctx.storage.getUrl(plan.storageId),
        thumbnailUrl: plan.thumbnailStorageId
          ? await ctx.storage.getUrl(plan.thumbnailStorageId)
          : null,
        categoryLabel: PLAN_CATEGORY_LABELS[plan.category] || plan.category,
      })),
    );
  },
});

export const getVersionHistory = query({
  args: { planId: v.id('projectPlans') },
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) return [];

    const canView = await canUserViewPlans(ctx, plan.projectId);
    if (!canView) return [];

    // Traverse up to find root
    let rootId = plan._id;
    let current = plan;
    while (current.parentPlanId) {
      rootId = current.parentPlanId;
      const parent = await ctx.db.get(current.parentPlanId);
      if (!parent) break;
      current = parent;
    }

    // Collect all versions
    const allProjectPlans = await ctx.db
      .query('projectPlans')
      .withIndex('by_project', (q) => q.eq('projectId', plan.projectId))
      .collect();

    const versions = allProjectPlans.filter((p) => {
      if (p._id === rootId) return true;
      let c = p;
      while (c.parentPlanId) {
        if (c.parentPlanId === rootId) return true;
        const parent = allProjectPlans.find((pp) => pp._id === c.parentPlanId);
        if (!parent) break;
        c = parent;
      }
      return false;
    });

    const sorted = versions.sort((a, b) => b.version - a.version);

    return await Promise.all(
      sorted.map(async (v) => ({
        ...v,
        id: v._id,
        url: await ctx.storage.getUrl(v.storageId),
      })),
    );
  },
});

export const getPlanWithUrl = query({
  args: { planId: v.id('projectPlans') },
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) return null;

    const canView = await canUserViewPlans(ctx, plan.projectId);
    if (!canView) return null;

    return {
      ...plan,
      id: plan._id,
      url: await ctx.storage.getUrl(plan.storageId),
      thumbnailUrl: plan.thumbnailStorageId
        ? await ctx.storage.getUrl(plan.thumbnailStorageId)
        : null,
      categoryLabel: PLAN_CATEGORY_LABELS[plan.category] || plan.category,
    };
  },
});

export const getPlansCountForDashboard = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const canView = await canUserViewPlans(ctx, args.projectId);
    if (!canView) return null;

    const plans = await ctx.db
      .query('projectPlans')
      .withIndex('by_project_latest', (q) =>
        q.eq('projectId', args.projectId).eq('isLatest', true),
      )
      .collect();

    const byCategory: Record<string, number> = {};
    let totalSize = 0;

    for (const plan of plans) {
      const cat = plan.category;
      byCategory[cat] = (byCategory[cat] || 0) + 1;
      totalSize += plan.originalSize;
    }

    const project = await ctx.db.get(args.projectId);
    const owner = project?.ownerUserId ? await ctx.db.get(project.ownerUserId) : null;
    const tier = getActiveTier(owner);
    const maxPlans = tier === 'free' ? MAX_PLANS_FREE : MAX_PLANS_PRO;

    return {
      total: plans.length,
      limit: maxPlans,
      totalSize,
      byCategory,
      categoryLabels: PLAN_CATEGORY_LABELS,
    };
  },
});
