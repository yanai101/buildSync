import { mutation } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';

const contractorRoleValidator = v.union(
  v.literal('קבלן עד מפתח'),
  v.literal('קבלן שלד'),
  v.literal('קבלן עפר'),
  v.literal('קבלן טיח'),
  v.literal('חשמלאי ראשי'),
  v.literal('אינסטלטור'),
  v.literal('קבלן ריצוף'),
  v.literal('קבלן גג'),
  v.literal('קבלן גבס'),
  v.literal('קבלן נגרות'),
  v.literal('צבעי'),
  v.literal('קבלן גינה'),
  v.literal('אחר'),
);

const DEFAULT_CONTRACTOR_PAYMENT_SCHEDULE = [
  { name: 'מקדמה לפני התחלה', pct: 30, triggerText: 'לפני תחילת עבודה' },
  { name: "תשלום ביניים א'", pct: 25, triggerText: 'אחרי 30% מהעבודה' },
  { name: "תשלום ביניים ב'", pct: 25, triggerText: 'אחרי 70% מהעבודה' },
  { name: 'תשלום סופי', pct: 20, triggerText: 'סיום ואישור מפקח' },
];

const recomputeContractorPaid = async (ctx: MutationCtx, contractorId: Id<'contractors'>) => {
  const milestones = await ctx.db
    .query('contractorPaymentMilestones')
    .withIndex('by_contractor', (q) => q.eq('contractorId', contractorId))
    .take(100);

  const paid = milestones
    .filter((milestone) => milestone.paid)
    .reduce((total, milestone) => total + milestone.amount, 0);

  await ctx.db.patch(contractorId, { paid });
};

const requirePhotoManager = async (ctx: MutationCtx) => {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error('Not authenticated');
  }

  const user = await ctx.db.get(userId);
  if (user?.role !== 'owner' && user?.role !== 'manager') {
    throw new Error('Only an owner or manager can update photos');
  }
};


// ── GENERIC MUTATIONS ────────────────────────────────────────────────────────

export const update = mutation({
  args: {
    table: v.string(),
    id: v.any(), 
    patch: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, args.patch);
  },
});

export const add = mutation({
  args: {
    table: v.string(),
    document: v.any(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert(args.table as any, args.document);
  },
});

export const remove = mutation({
  args: {
    table: v.string(),
    id: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ── DOMAIN SPECIFIC MUTATIONS ────────────────────────────────────────────────

import { insertActivity } from './_lib/activity';

export const toggleTask = mutation({
  args: {
    taskId: v.id('stageTasks'),
    done: v.boolean(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) return;

    await ctx.db.patch(args.taskId, { done: args.done });
    
    const stage = await ctx.db.get(task.stageId);
    if (stage) {
      const allTasks = await ctx.db
        .query('stageTasks')
        .withIndex('by_stage', (q) => q.eq('stageId', task.stageId))
        .collect();
      
      const doneCount = allTasks.filter(t => t._id === args.taskId ? args.done : t.done).length;
      const progressPct = Math.round((doneCount / allTasks.length) * 100);
      
      const newStatus = progressPct === 100 ? 'done' : progressPct > 0 ? 'active' : 'pending';
      await ctx.db.patch(task.stageId, { progressPct, status: newStatus });

      // Update project overall progress
      const projectStages = await ctx.db
        .query('stages')
        .withIndex('by_project', q => q.eq('projectId', stage.projectId))
        .collect();
      
      const totalProgress = projectStages.reduce((sum, s) => sum + (s._id === task.stageId ? progressPct : s.progressPct), 0);
      const projectProgress = Math.round(totalProgress / projectStages.length);
      
      await ctx.db.patch(stage.projectId, { 
        progressPct: projectProgress,
        currentStageName: projectStages.find(s => s.status === 'active')?.name || projectStages[0]?.name
      });

      // Log activity
      await insertActivity(ctx, {
        projectId: stage.projectId,
        text: `משימה "${task.name}" ${args.done ? 'בוצעה' : 'בוטלה'} בשלב ${stage.name}`,
      });
    }
  },
});

export const createContractor = mutation({
  args: {
    projectId: v.id('projects'),
    name: v.string(),
    company: v.optional(v.string()),
    role: contractorRoleValidator,
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    budget: v.number(),
    avatarColor: v.string(),
  },
  handler: async (ctx, args) => {
    const contractorId = await ctx.db.insert('contractors', {
      projectId: args.projectId,
      name: args.name,
      ...(args.company ? { company: args.company } : {}),
      role: args.role,
      ...(args.phone ? { phone: args.phone } : {}),
      ...(args.email ? { email: args.email } : {}),
      status: 'pending',
      rating: 0,
      budget: args.budget,
      paid: 0,
      avatarLetter: args.name[0] ?? '',
      avatarColor: args.avatarColor,
    });

    for (let i = 0; i < DEFAULT_CONTRACTOR_PAYMENT_SCHEDULE.length; i++) {
      const milestone = DEFAULT_CONTRACTOR_PAYMENT_SCHEDULE[i];
      await ctx.db.insert('contractorPaymentMilestones', {
        contractorId,
        sortOrder: i,
        name: milestone.name,
        triggerText: milestone.triggerText,
        pct: milestone.pct,
        amount: Math.round((args.budget * milestone.pct) / 100),
        paid: false,
      });
    }

    return contractorId;
  },
});

export const addContractorPaymentMilestone = mutation({
  args: {
    contractorId: v.id('contractors'),
    name: v.string(),
    triggerText: v.string(),
    pct: v.number(),
  },
  handler: async (ctx, args) => {
    const contractor = await ctx.db.get(args.contractorId);
    if (!contractor) {
      throw new Error('Contractor not found');
    }

    const milestones = await ctx.db
      .query('contractorPaymentMilestones')
      .withIndex('by_contractor', (q) => q.eq('contractorId', args.contractorId))
      .take(100);

    return await ctx.db.insert('contractorPaymentMilestones', {
      contractorId: args.contractorId,
      sortOrder: milestones.length,
      name: args.name,
      triggerText: args.triggerText,
      pct: args.pct,
      amount: Math.round((contractor.budget * args.pct) / 100),
      paid: false,
    });
  },
});

export const updateContractorPaymentMilestone = mutation({
  args: {
    milestoneId: v.id('contractorPaymentMilestones'),
    name: v.string(),
    triggerText: v.string(),
    pct: v.number(),
  },
  handler: async (ctx, args) => {
    const milestone = await ctx.db.get(args.milestoneId);
    if (!milestone) {
      throw new Error('Payment milestone not found');
    }

    const contractor = await ctx.db.get(milestone.contractorId);
    if (!contractor) {
      throw new Error('Contractor not found');
    }

    await ctx.db.patch(args.milestoneId, {
      name: args.name,
      triggerText: args.triggerText,
      pct: args.pct,
      amount: Math.round((contractor.budget * args.pct) / 100),
    });

    await recomputeContractorPaid(ctx, milestone.contractorId);
  },
});

export const saveContractorPaymentSchedule = mutation({
  args: {
    contractorId: v.id('contractors'),
    milestones: v.array(v.object({
      milestoneId: v.optional(v.id('contractorPaymentMilestones')),
      name: v.string(),
      triggerText: v.string(),
      pct: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const contractor = await ctx.db.get(args.contractorId);
    if (!contractor) {
      throw new Error('Contractor not found');
    }

    for (let i = 0; i < args.milestones.length; i++) {
      const milestone = args.milestones[i];
      const amount = Math.round((contractor.budget * milestone.pct) / 100);

      if (milestone.milestoneId) {
        await ctx.db.patch(milestone.milestoneId, {
          sortOrder: i,
          name: milestone.name,
          triggerText: milestone.triggerText,
          pct: milestone.pct,
          amount,
        });
      } else {
        await ctx.db.insert('contractorPaymentMilestones', {
          contractorId: args.contractorId,
          sortOrder: i,
          name: milestone.name,
          triggerText: milestone.triggerText,
          pct: milestone.pct,
          amount,
          paid: false,
        });
      }
    }

    await recomputeContractorPaid(ctx, args.contractorId);
  },
});

export const setContractorPaymentMilestonePaid = mutation({
  args: {
    milestoneId: v.id('contractorPaymentMilestones'),
    paid: v.boolean(),
  },
  handler: async (ctx, args) => {
    const milestone = await ctx.db.get(args.milestoneId);
    if (!milestone) {
      throw new Error('Payment milestone not found');
    }

    await ctx.db.patch(args.milestoneId, {
      paid: args.paid,
      paidAt: args.paid ? new Date().toISOString().slice(0, 10) : undefined,
    });

    await recomputeContractorPaid(ctx, milestone.contractorId);
  },
});

export const saveBoq = mutation({
  args: {
    projectId: v.id('projects'),
    items: v.array(v.any()), 
  },
  handler: async (ctx, args) => {
    for (const item of args.items) {
      await ctx.db.insert('boqItems', {
        projectId: args.projectId,
        roomId: item.roomId,
        category: item.category,
        name: item.name,
        qty: item.qty,
        userQty: item.userQty,
        unit: item.unit,
        unitPrice: item.unitPrice || 0,
        status: 'pending',
        source: 'wizard_smart',
        hint: item.hint,
      });
    }
  },
});

export const addBoqItem = mutation({
  args: {
    projectId: v.id('projects'),
    roomId: v.optional(v.id('projectRooms')),
    category: v.string(),
    name: v.string(),
    qty: v.number(),
    unit: v.string(),
    unitPrice: v.number(),
    supplier: v.optional(v.string()),
    spec: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    if (args.roomId) {
      const room = await ctx.db.get(args.roomId);
      if (!room || room.projectId !== args.projectId) {
        throw new Error('Room not found for project');
      }
    }

    return await ctx.db.insert('boqItems', {
      projectId: args.projectId,
      roomId: args.roomId,
      category: args.category,
      name: args.name,
      qty: args.qty,
      unit: args.unit,
      unitPrice: args.unitPrice,
      ...(args.supplier ? { supplier: args.supplier } : {}),
      ...(args.spec ? { spec: args.spec } : {}),
      status: 'pending',
      source: 'manual',
    });
  },
});

export const updateBoqItemStatus = mutation({
  args: {
    itemId: v.id('boqItems'),
    status: v.union(v.literal('approved'), v.literal('pending')),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error('BOQ item not found');
    }

    await ctx.db.patch(args.itemId, { status: args.status });
  },
});



export const saveNote = mutation({
  args: {
    projectId: v.id('projects'),
    text: v.string(),
    thread: v.union(v.literal('internal'), v.literal('contractor')),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const user = await ctx.db.get(userId);
    if (!user?.role) {
      throw new Error('Missing user role');
    }

    if (user.role !== 'owner') {
      const allowedThread = user.role === 'contractor' ? 'contractor' : 'internal';
      if (args.thread !== allowedThread) {
        throw new Error('You do not have access to this chat');
      }
    }

    await ctx.db.insert('messages', {
      projectId: args.projectId,
      fromUserId: userId,
      fromName: user.name ?? user.email ?? 'משתמש',
      role: user.role,
      text: args.text,
      thread: args.thread,
      resolved: false,
    });
  },
});

export const savePhotoAnnotation = mutation({
  args: {
    photoId: v.id('photos'),
    noteText: v.string(),
    role: v.union(v.literal('owner'), v.literal('manager'), v.literal('inspector'), v.literal('contractor')),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('photoNotes', {
      photoId: args.photoId,
      authorName: 'משתמש',
      role: args.role,
      text: args.noteText,
    });
  },
});

export const deletePhoto = mutation({
  args: {
    photoId: v.id('photos'),
  },
  handler: async (ctx, args) => {
    await requirePhotoManager(ctx);

    const photo = await ctx.db.get(args.photoId);
    if (!photo) {
      return null;
    }

    const notes = await ctx.db
      .query('photoNotes')
      .withIndex('by_photo', (q) => q.eq('photoId', args.photoId))
      .take(100);
    for (const note of notes) {
      await ctx.db.delete(note._id);
    }

    const annotations = await ctx.db
      .query('photoAnnotations')
      .withIndex('by_photo', (q) => q.eq('photoId', args.photoId))
      .take(100);
    for (const annotation of annotations) {
      await ctx.db.delete(annotation._id);
    }

    const versions = await ctx.db
      .query('photoFileVersions')
      .withIndex('by_photo', (q) => q.eq('photoId', args.photoId))
      .take(100);

    let storageDeleted = false;
    const deletedFileIds = new Set<string>();
    for (const version of versions) {
      const projectFile = await ctx.db.get(version.annotatedProjectFileId);
      if (projectFile) {
        await ctx.storage.delete(projectFile.storageId);
        await ctx.db.delete(projectFile._id);
        deletedFileIds.add(projectFile._id);
        storageDeleted = true;
      }
      await ctx.db.delete(version._id);
    }

    if (photo.projectFileId) {
      const projectFile = await ctx.db.get(photo.projectFileId);
      if (projectFile && !deletedFileIds.has(projectFile._id)) {
        await ctx.storage.delete(projectFile.storageId);
        await ctx.db.delete(projectFile._id);
        storageDeleted = true;
      }
    }

    await ctx.db.delete(args.photoId);
    return { deleted: true, fileUrl: photo.fileUrl ?? null, storageDeleted };
  },
});

export const updatePhotoTag = mutation({
  args: {
    photoId: v.id('photos'),
    tag: v.union(v.literal('התקדמות'), v.literal('בעיה'), v.literal('בדיקה'), v.literal('אישור')),
  },
  handler: async (ctx, args) => {
    await requirePhotoManager(ctx);

    const photo = await ctx.db.get(args.photoId);
    if (!photo) {
      throw new Error('Photo not found');
    }

    if (args.tag === 'אישור') {
      const versions = await ctx.db
        .query('photoFileVersions')
        .withIndex('by_photo_versionNumber', (q) => q.eq('photoId', args.photoId))
        .order('desc')
        .take(100);
      const originalFileId = versions.find((version) => version.sourceProjectFileId)?.sourceProjectFileId ?? photo.projectFileId;
      const fileIdsToDelete = new Set<string>();

      for (const version of versions) {
        fileIdsToDelete.add(version.annotatedProjectFileId);
        const annotations = await ctx.db
          .query('photoAnnotations')
          .withIndex('by_version', (q) => q.eq('versionId', version._id))
          .take(200);
        for (const annotation of annotations) {
          await ctx.db.delete(annotation._id);
        }
        const notes = await ctx.db
          .query('photoNotes')
          .withIndex('by_version', (q) => q.eq('versionId', version._id))
          .take(100);
        for (const note of notes) {
          await ctx.db.delete(note._id);
        }
        await ctx.db.delete(version._id);
      }

      for (const fileId of fileIdsToDelete) {
        const projectFile = await ctx.db.get(fileId as Id<'projectFiles'>);
        if (projectFile && projectFile._id !== originalFileId) {
          await ctx.storage.delete(projectFile.storageId);
          await ctx.db.delete(projectFile._id);
        }
      }

      await ctx.db.patch(args.photoId, {
        tag: args.tag,
        ...(originalFileId ? { projectFileId: originalFileId } : {}),
      });
      return { updated: true, tag: args.tag, cleanedVersions: versions.length };
    }

    await ctx.db.patch(args.photoId, { tag: args.tag });
    return { updated: true, tag: args.tag };
  },
});
