import { mutation } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';
import { getSyncedPaymentReadiness, syncContractorStagePayments } from './_lib/contractorPaymentSync';

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

const contractorRoleBudgetCategory: Record<string, string> = {
  'קבלן עד מפתח': 'שונות',
  'קבלן שלד': 'שלד ויסודות',
  'קבלן עפר': 'שלד ויסודות',
  'קבלן טיח': 'טיח',
  'חשמלאי ראשי': 'חשמל',
  'אינסטלטור': 'אינסטלציה',
  'קבלן ריצוף': 'ריצוף וחיפוי',
  'קבלן גג': 'שונות',
  'קבלן גבס': 'גבס ותקרות',
  'קבלן נגרות': 'נגרות ומטבח',
  'צבעי': 'צביעה',
  'קבלן גינה': 'גינה וחוץ',
  'אחר': 'שונות',
};

const recomputeContractorPaid = async (ctx: MutationCtx, contractorId: Id<'contractors'>) => {
  const milestones = await ctx.db
    .query('contractorPaymentMilestones')
    .withIndex('by_contractor', (q) => q.eq('contractorId', contractorId))
    .take(100);

  const paid = milestones
    .filter((milestone) => milestone.paid)
    .reduce((total, milestone) => total + milestone.amount + (milestone.vatAmount || 0), 0);

  await ctx.db.patch(contractorId, { paid });
};

const createDefaultContractorPaymentSchedule = async (
  ctx: MutationCtx,
  contractorId: Id<'contractors'>,
  budget: number,
) => {
  for (let i = 0; i < DEFAULT_CONTRACTOR_PAYMENT_SCHEDULE.length; i++) {
    const milestone = DEFAULT_CONTRACTOR_PAYMENT_SCHEDULE[i];
    await ctx.db.insert('contractorPaymentMilestones', {
      contractorId,
      sortOrder: i,
      name: milestone.name,
      triggerText: milestone.triggerText,
      pct: milestone.pct,
      amount: Math.round((budget * milestone.pct) / 100),
      paid: false,
      sourceMode: 'custom',
    });
  }
};

const resolveMilestoneId = async (
  ctx: MutationCtx,
  idStr: string,
): Promise<Id<'contractorPaymentMilestones'>> => {
  if (idStr.includes('-')) {
    const [contractorIdStr, indexStr] = idStr.split('-');
    const contractorId = ctx.db.normalizeId('contractors', contractorIdStr);
    if (!contractorId) throw new Error('קבלן לא נמצא');
    
    const contractor = await ctx.db.get(contractorId);
    if (!contractor) throw new Error('קבלן לא נמצא');

    let milestones = await ctx.db
      .query('contractorPaymentMilestones')
      .withIndex('by_contractor', (q) => q.eq('contractorId', contractorId))
      .collect();

    if (milestones.length === 0) {
      await createDefaultContractorPaymentSchedule(ctx, contractorId, contractor.budget);
      milestones = await ctx.db
        .query('contractorPaymentMilestones')
        .withIndex('by_contractor', (q) => q.eq('contractorId', contractorId))
        .collect();
    }

    const index = parseInt(indexStr, 10);
    const sorted = milestones.sort((a, b) => a.sortOrder - b.sortOrder);
    const milestoneDoc = sorted[index];
    if (!milestoneDoc) throw new Error('אבן דרך לא נמצאה');
    
    return milestoneDoc._id;
  }

  const parsedId = ctx.db.normalizeId('contractorPaymentMilestones', idStr);
  if (!parsedId) throw new Error('מזהה אבן דרך לא תקין');
  return parsedId;
};

const findContractorPaymentExpense = async (
  ctx: MutationCtx,
  projectId: Id<'projects'>,
  milestoneId: Id<'contractorPaymentMilestones'>,
) => {
  return await ctx.db
    .query('expenses')
    .withIndex('by_project', (q) => q.eq('projectId', projectId))
    .filter((q) => q.eq(q.field('milestoneId'), milestoneId))
    .first();
};

const findBudgetCategoryForContractor = async (
  ctx: MutationCtx,
  projectId: Id<'projects'>,
  role: string,
) => {
  const categoryName = contractorRoleBudgetCategory[role] ?? 'שונות';
  return await ctx.db
    .query('budgetCategories')
    .withIndex('by_project', (q) => q.eq('projectId', projectId))
    .filter((q) => q.eq(q.field('name'), categoryName))
    .first();
};

const requirePhotoManager = async (ctx: MutationCtx) => {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error('Not authenticated');
  }

  const user = await ctx.db.get(userId);
  if (user?.role !== 'owner' && user?.role !== 'manager' && !user?.isSuperAdmin) {
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

    if (args.done) {
      const linkedContractors = await ctx.db
        .query('stageContractors')
        .withIndex('by_stage', (q) => q.eq('stageId', task.stageId))
        .take(1);
      if (linkedContractors.length === 0) {
        throw new Error('אי אפשר לסמן משימות — לא קושר קבלן לשלב');
      }
    } else {
      const stage = await ctx.db.get(task.stageId);
      if (stage && stage.payment?.status === 'paid') {
        throw new Error('אי אפשר לבטל משימה בשלב שכבר שולם');
      }
      const taskLinks = await ctx.db
        .query('stageMilestoneTasks')
        .withIndex('by_task', (q) => q.eq('taskId', args.taskId))
        .collect();
      
      for (const link of taskLinks) {
        const milestone = await ctx.db.get(link.milestoneId);
        if (milestone && (milestone.status === 'paid' || milestone.isLocked)) {
          throw new Error('אי אפשר לבטל משימה שכבר שולמה או ננעלה במסגרת אבן דרך');
        }
      }
      
      const syncedMilestones = await ctx.db
        .query('contractorPaymentMilestones')
        .filter(q => q.eq(q.field('sourceTaskId'), args.taskId))
        .collect();
        
      for (const milestone of syncedMilestones) {
        if (milestone.paid || milestone.isLocked) {
          throw new Error('אי אפשר לבטל משימה שכבר שולמה או ננעלה בחשבון הקבלן');
        }
      }
    }

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
    includesVat: v.optional(v.boolean()),
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
      includesVat: args.includesVat,
    });

    if (args.role === 'קבלן עד מפתח') {
      const executionStages = await ctx.db
        .query('stages')
        .withIndex('by_project_sort', (q) => q.eq('projectId', args.projectId))
        .filter((q) => q.neq(q.field('sortOrder'), 0))
        .collect();

      for (const stage of executionStages) {
        const existingLinks = await ctx.db
          .query('stageContractors')
          .withIndex('by_stage', (q) => q.eq('stageId', stage._id))
          .collect();

        if (existingLinks.some((link) => link.contractorId === contractorId)) continue;

        await ctx.db.insert('stageContractors', {
          projectId: args.projectId,
          stageId: stage._id,
          contractorId,
          roleLabel: args.name,
          paymentMode: 'stage_synced',
          sortOrder: existingLinks.length,
        });
      }

      if (executionStages.length > 0) {
        await syncContractorStagePayments(ctx, contractorId);
      } else {
        await createDefaultContractorPaymentSchedule(ctx, contractorId, args.budget);
      }
    } else {
      await createDefaultContractorPaymentSchedule(ctx, contractorId, args.budget);
    }

    return contractorId;
  },
});

export const updateContractor = mutation({
  args: {
    contractorId: v.id('contractors'),
    name: v.string(),
    company: v.optional(v.string()),
    role: contractorRoleValidator,
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    budget: v.number(),
    includesVat: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const contractor = await ctx.db.get(args.contractorId);
    if (!contractor) throw new Error('Contractor not found');

    await ctx.db.patch(args.contractorId, {
      name: args.name,
      company: args.company,
      role: args.role,
      phone: args.phone,
      email: args.email,
      budget: args.budget,
      includesVat: args.includesVat,
    });
    
    // If budget changed, sync if paymentMode is 'stage_synced' (budget will redistribute)
    if (contractor.budget !== args.budget) {
      const stageLinks = await ctx.db
        .query('stageContractors')
        .withIndex('by_contractor', (q) => q.eq('contractorId', args.contractorId))
        .collect();
      
      const isStageSynced = stageLinks.length > 0 && stageLinks.some(link => (link.paymentMode ?? 'stage_synced') === 'stage_synced');
      
      if (isStageSynced) {
        await syncContractorStagePayments(ctx, args.contractorId);
      }
    }
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
      sourceMode: 'custom',
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
      sourceMode: 'custom',
      sourceStageId: undefined,
      sourceStageMilestoneId: undefined,
      sourceTaskId: undefined,
    });

    await recomputeContractorPaid(ctx, milestone.contractorId);
  },
});

export const saveContractorPaymentSchedule = mutation({
  args: {
    contractorId: v.id('contractors'),
    milestones: v.array(v.object({
      milestoneId: v.optional(v.string()),
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

    const totalPct = args.milestones.reduce((sum, milestone) => sum + milestone.pct, 0);
    if (totalPct > 100.01) {
      throw new Error('Contractor payment schedule cannot exceed the agreed budget');
    }

    const stageLinks = await ctx.db
      .query('stageContractors')
      .withIndex('by_contractor', (q) => q.eq('contractorId', args.contractorId))
      .take(200);
    for (const link of stageLinks) {
      await ctx.db.patch(link._id, { paymentMode: 'custom' });
    }

    const existingMilestones = await ctx.db
      .query('contractorPaymentMilestones')
      .withIndex('by_contractor', (q) => q.eq('contractorId', args.contractorId))
      .take(200);

    const incomingIds = new Set<Id<'contractorPaymentMilestones'>>();
    for (const milestone of args.milestones) {
      if (milestone.milestoneId && !milestone.milestoneId.includes('-')) {
        const parsedId = ctx.db.normalizeId('contractorPaymentMilestones', milestone.milestoneId);
        if (parsedId) {
          incomingIds.add(parsedId);
        }
      }
    }

    for (const milestone of existingMilestones) {
      if (!incomingIds.has(milestone._id)) {
        if (milestone.paid) {
          throw new Error('Cannot remove a payment stage after it was paid');
        }
        await ctx.db.delete(milestone._id);
      }
    }

    for (let i = 0; i < args.milestones.length; i++) {
      const milestone = args.milestones[i];
      const amount = Math.round((contractor.budget * milestone.pct) / 100);

      let realMilestoneId: Id<'contractorPaymentMilestones'> | undefined = undefined;
      if (milestone.milestoneId && !milestone.milestoneId.includes('-')) {
        realMilestoneId = ctx.db.normalizeId('contractorPaymentMilestones', milestone.milestoneId) ?? undefined;
      }

      if (realMilestoneId) {
        await ctx.db.patch(realMilestoneId, {
          sortOrder: i,
          name: milestone.name,
          triggerText: milestone.triggerText,
          pct: milestone.pct,
          amount,
          sourceMode: 'custom',
          sourceStageId: undefined,
          sourceStageMilestoneId: undefined,
          sourceTaskId: undefined,
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
          sourceMode: 'custom',
        });
      }
    }

    await recomputeContractorPaid(ctx, args.contractorId);
  },
});

export const setContractorPaymentMilestonePaid = mutation({
  args: {
    milestoneId: v.string(),
    paid: v.boolean(),
    vatAdded: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const milestoneId = await resolveMilestoneId(ctx as any, args.milestoneId);
    const milestone = await ctx.db.get(milestoneId);
    if (!milestone) {
      throw new Error('Payment milestone not found');
    }

    const contractor = await ctx.db.get(milestone.contractorId);
    if (!contractor) {
      throw new Error('Contractor not found');
    }

    const project = await ctx.db.get(contractor.projectId);
    const vatPct = project?.vatPct ?? 18;

    const existingExpense = await findContractorPaymentExpense(ctx, contractor.projectId, milestoneId);
    const category = await findBudgetCategoryForContractor(ctx, contractor.projectId, contractor.role);
    const today = new Date().toISOString().slice(0, 10);

    if (args.paid) {
      const readiness = await getSyncedPaymentReadiness(ctx, milestone);
      if (!readiness.ready) {
        throw new Error(readiness.reason ?? 'התשלום עדיין לא מוכן');
      }
    }

    const vatAmount = args.paid && args.vatAdded ? Math.round(milestone.amount * (vatPct / 100)) : undefined;

    await ctx.db.patch(milestoneId, {
      paid: args.paid,
      paidAt: args.paid ? today : undefined,
      vatAdded: args.paid ? args.vatAdded : undefined,
      vatAmount,
    });

    if (args.paid) {
      const finalAmount = milestone.amount + (vatAmount || 0);
      if (!existingExpense) {
        await ctx.db.insert('expenses', {
          projectId: contractor.projectId,
          description: `תשלום לקבלן ${contractor.name} — ${milestone.name}${args.vatAdded ? ' (כולל מע"מ)' : ''}`,
          amount: finalAmount,
          expenseDate: today,
          status: 'שולם',
          categoryId: category?._id,
          contractorId: contractor._id,
          milestoneId,
        });

        if (category) {
          await ctx.db.patch(category._id, {
            spent: category.spent + finalAmount,
          });
        }
      }
    } else if (existingExpense) {
      await ctx.db.delete(existingExpense._id);
      if (existingExpense.categoryId) {
        const expenseCategory = await ctx.db.get(existingExpense.categoryId);
        if (expenseCategory) {
          await ctx.db.patch(expenseCategory._id, {
            spent: Math.max(0, expenseCategory.spent - existingExpense.amount),
          });
        }
      }
    }

    await recomputeContractorPaid(ctx, milestone.contractorId);
  },
});

export const lockContractorPaymentMilestone = mutation({
  args: {
    milestoneId: v.string(),
    fileIds: v.optional(v.array(v.id('projectFiles'))),
  },
  handler: async (ctx, args) => {
    const milestoneId = await resolveMilestoneId(ctx as any, args.milestoneId);
    const milestone = await ctx.db.get(milestoneId);
    if (!milestone) {
      throw new Error('Payment milestone not found');
    }

    if (!milestone.paid) {
      throw new Error('אפשר לנעול רק תשלום שסומן כשולם');
    }

    await ctx.db.patch(milestoneId, {
      isLocked: true,
      ...(args.fileIds && args.fileIds.length > 0 ? { fileIds: args.fileIds } : {}),
    });
  },
});

export const deleteContractor = mutation({
  args: {
    contractorId: v.id('contractors'),
  },
  handler: async (ctx, args) => {
    const contractor = await ctx.db.get(args.contractorId);
    if (!contractor) {
      throw new Error('Contractor not found');
    }

    // Fetch only expenses linked to this contractor — filter at DB level, not in memory
    const contractorExpenses = await ctx.db
      .query('expenses')
      .withIndex('by_project', (q) => q.eq('projectId', contractor.projectId))
      .filter((q) => q.eq(q.field('contractorId'), args.contractorId))
      .collect();

    let paidAmountPreserved = 0;
    let paidCountPreserved = 0;

    for (const expense of contractorExpenses) {
      if (expense.status === 'שולם') {
        // Keep paid expenses but unlink them from the deleted contractor
        await ctx.db.patch(expense._id, {
          contractorId: undefined,
          milestoneId: undefined,
        });
        paidAmountPreserved += expense.amount;
        paidCountPreserved++;
      } else {
        // Delete unpaid (pending) expenses linked to this contractor
        await ctx.db.delete(expense._id);
      }
    }

    const milestones = await ctx.db
      .query('contractorPaymentMilestones')
      .withIndex('by_contractor', (q) => q.eq('contractorId', args.contractorId))
      .take(200);

    const stageLinks = await ctx.db
      .query('stageContractors')
      .withIndex('by_contractor', (q) => q.eq('contractorId', args.contractorId))
      .take(200);
    const affectedStageIds = new Set(stageLinks.map((link) => link.stageId));

    for (const link of stageLinks) {
      await ctx.db.delete(link._id);
    }

    for (const stageId of affectedStageIds) {
      const remainingLinks = await ctx.db
        .query('stageContractors')
        .withIndex('by_stage', (q) => q.eq('stageId', stageId))
        .collect();
      const orderedLinks = remainingLinks.sort((a, b) => a.sortOrder - b.sortOrder);
      const remainingContractors = [];

      for (let i = 0; i < orderedLinks.length; i++) {
        const link = orderedLinks[i];
        if (link.sortOrder !== i) {
          await ctx.db.patch(link._id, { sortOrder: i });
        }
        const linkedContractor = await ctx.db.get(link.contractorId);
        if (linkedContractor) remainingContractors.push(linkedContractor);
      }

      await ctx.db.patch(stageId, {
        contractorId: remainingContractors[0]?._id,
        contractorRole: remainingContractors.map((item) => item.name).join(', ') || undefined,
      });
    }

    // Delete ALL milestones (the paid value is now preserved in the detached expenses)
    for (const milestone of milestones) {
      await ctx.db.delete(milestone._id);
    }

    const files = await ctx.db
      .query('projectFiles')
      .withIndex('by_contractor', (q) => q.eq('contractorId', args.contractorId))
      .take(200);
    for (const file of files) {
      await ctx.db.patch(file._id, { contractorId: undefined });
    }

    const notes = await ctx.db
      .query('contractorNotes')
      .withIndex('by_contractor', (q) => q.eq('contractorId', args.contractorId))
      .take(200);
    for (const note of notes) {
      await ctx.db.delete(note._id);
    }

    await ctx.db.delete(args.contractorId);

    await insertActivity(ctx, {
      projectId: contractor.projectId,
      text: `נמחק קבלן: ${contractor.name}`,
    });

    return {
      paidMilestonesPreserved: paidCountPreserved,
      paidAmountPreserved,
    };
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
        ...(item.notes ? { notes: item.notes } : {}),
        ...(item.isLocked ? { isLocked: true } : {}),
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
    notes: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    projectFileId: v.optional(v.id('projectFiles')),
    isLocked: v.optional(v.boolean()),
    isEnabled: v.optional(v.boolean()),
    userQty: v.optional(v.number()),
    source: v.optional(
      v.union(v.literal('manual'), v.literal('wizard_smart'), v.literal('catalog')),
    ),
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
      ...(args.userQty !== undefined ? { userQty: args.userQty } : {}),
      ...(args.supplier ? { supplier: args.supplier } : {}),
      ...(args.spec ? { spec: args.spec } : {}),
      ...(args.notes ? { notes: args.notes } : {}),
      ...(args.imageUrl ? { imageUrl: args.imageUrl } : {}),
      ...(args.projectFileId ? { projectFileId: args.projectFileId } : {}),
      ...(args.isLocked ? { isLocked: true } : {}),
      ...(args.isEnabled !== undefined ? { isEnabled: args.isEnabled } : {}),
      status: 'pending',
      source: args.source ?? 'manual',
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

    if (args.status === 'pending' && item.paid) {
      throw new Error('אי אפשר לבטל אישור — הפריט כבר סומן כשולם');
    }

    await ctx.db.patch(args.itemId, { status: args.status });
  },
});

const findBoqItemExpense = async (
  ctx: MutationCtx,
  projectId: Id<'projects'>,
  itemId: Id<'boqItems'>,
) => {
  return await ctx.db
    .query('expenses')
    .withIndex('by_project', (q) => q.eq('projectId', projectId))
    .filter((q) => q.eq(q.field('boqItemId'), itemId))
    .first();
};

const findBudgetCategoryByName = async (
  ctx: MutationCtx,
  projectId: Id<'projects'>,
  name: string,
) => {
  if (!name) return null;
  return await ctx.db
    .query('budgetCategories')
    .withIndex('by_project', (q) => q.eq('projectId', projectId))
    .filter((q) => q.eq(q.field('name'), name))
    .first();
};

export const setBoqItemPaid = mutation({
  args: {
    itemId: v.id('boqItems'),
    paid: v.boolean(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error('BOQ item not found');
    }

    if (args.paid && item.status !== 'approved') {
      throw new Error('אפשר לסמן כשולם רק פריט מאושר');
    }

    if (args.paid === Boolean(item.paid)) {
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const qty = item.userQty ?? item.qty;
    const amount = Math.max(0, Math.round(qty * item.unitPrice));
    const existingExpense = await findBoqItemExpense(ctx, item.projectId, args.itemId);

    if (args.paid) {
      await ctx.db.patch(args.itemId, { paid: true, paidAt: today });

      if (!existingExpense) {
        const category = await findBudgetCategoryByName(ctx, item.projectId, item.category);
        await ctx.db.insert('expenses', {
          projectId: item.projectId,
          description: `רכש BoQ: ${item.name}`,
          amount,
          expenseDate: today,
          status: 'שולם',
          categoryId: category?._id,
          boqItemId: args.itemId,
        });

        if (category) {
          await ctx.db.patch(category._id, {
            spent: category.spent + amount,
          });
        }
      }

      await insertActivity(ctx, {
        projectId: item.projectId,
        text: `סומן כשולם פריט BoQ: ${item.name} (${amount.toLocaleString('he-IL')} ₪)`,
      });
    } else {
      await ctx.db.patch(args.itemId, { paid: false, paidAt: undefined });

      if (existingExpense) {
        await ctx.db.delete(existingExpense._id);
        if (existingExpense.categoryId) {
          const category = await ctx.db.get(existingExpense.categoryId);
          if (category) {
            await ctx.db.patch(category._id, {
              spent: Math.max(0, category.spent - existingExpense.amount),
            });
          }
        }
      }

      await insertActivity(ctx, {
        projectId: item.projectId,
        text: `בוטל סימון תשלום עבור פריט BoQ: ${item.name}`,
      });
    }
  },
});

export const updateBoqItem = mutation({
  args: {
    itemId: v.id('boqItems'),
    category: v.optional(v.string()),
    name: v.optional(v.string()),
    qty: v.optional(v.number()),
    userQty: v.optional(v.number()),
    unit: v.optional(v.string()),
    unitPrice: v.optional(v.number()),
    supplier: v.optional(v.string()),
    spec: v.optional(v.string()),
    notes: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    projectFileId: v.optional(v.id('projectFiles')),
    isEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error('BOQ item not found');
    }

    const patch: Record<string, unknown> = {};
    if (args.category !== undefined && !item.isLocked) patch.category = args.category;
    if (args.name !== undefined && !item.isLocked) patch.name = args.name;
    if (args.qty !== undefined) patch.qty = args.qty;
    if (args.userQty !== undefined) patch.userQty = args.userQty;
    if (args.unit !== undefined && !item.isLocked) patch.unit = args.unit;
    if (args.unitPrice !== undefined) patch.unitPrice = args.unitPrice;
    if (args.supplier !== undefined) patch.supplier = args.supplier;
    if (args.spec !== undefined) patch.spec = args.spec;
    if (args.notes !== undefined) patch.notes = args.notes;
    if (args.imageUrl !== undefined) patch.imageUrl = args.imageUrl;
    if (args.projectFileId !== undefined) patch.projectFileId = args.projectFileId;
    if (args.isEnabled !== undefined) patch.isEnabled = args.isEnabled;

    if (Object.keys(patch).length === 0) return;
    await ctx.db.patch(args.itemId, patch);
  },
});

export const deleteBoqItem = mutation({
  args: {
    itemId: v.id('boqItems'),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) return;

    if (item.isLocked) {
      throw new Error('אי אפשר למחוק פריט מערכת');
    }

    // Clean up linked project file (and its storage) if present
    if (item.projectFileId) {
      const projectFile = await ctx.db.get(item.projectFileId);
      if (projectFile) {
        try { await ctx.storage.delete(projectFile.storageId); } catch { /* best-effort */ }
        await ctx.db.delete(projectFile._id);
      }
    }

    await ctx.db.delete(args.itemId);
  },
});




export const saveNote = mutation({
  args: {
    projectId: v.id('projects'),
    text: v.string(),
    thread: v.union(v.literal('internal'), v.literal('contractor')),
    recipientContractorId: v.optional(v.id('contractors')),
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

    if (user.role !== 'owner' && user.role !== 'manager' && user.role !== 'inspector') {
      const allowedThread = user.role === 'contractor' ? 'contractor' : 'internal';
      if (args.thread !== allowedThread) {
        throw new Error('You do not have access to this chat');
      }
    }

    let finalRecipientId = args.thread === 'internal' ? undefined : args.recipientContractorId;

    if (user.role === 'contractor') {
      const contractor = await ctx.db
        .query('contractors')
        .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
        .filter((q) => q.eq(q.field('userId'), userId))
        .first();

      if (!contractor) {
        throw new Error('קבלן לא נמצא בפרויקט זה');
      }

      finalRecipientId = contractor._id;
    }

    await ctx.db.insert('messages', {
      projectId: args.projectId,
      fromUserId: userId,
      fromName: user.name ?? user.email ?? 'משתמש',
      role: user.role,
      text: args.text,
      thread: args.thread,
      resolved: false,
      recipientContractorId: finalRecipientId,
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

export const updatePhotoDefect = mutation({
  args: {
    photoId: v.id('photos'),
    defectStatus: v.optional(v.union(v.literal('פתוח'), v.literal('בטיפול'), v.literal('תוקן'), v.literal('אושר'))),
    priority: v.optional(v.union(v.literal('נמוכה'), v.literal('רגילה'), v.literal('קריטית'))),
    assigneeId: v.optional(v.id('contractors')),
    dueDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePhotoManager(ctx);

    const photo = await ctx.db.get(args.photoId);
    if (!photo) {
      throw new Error('Photo not found');
    }

    const updates: any = {};
    if (args.defectStatus !== undefined) updates.defectStatus = args.defectStatus;
    if (args.priority !== undefined) updates.priority = args.priority;
    if (args.assigneeId !== undefined) updates.assigneeId = args.assigneeId;
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate;

    await ctx.db.patch(args.photoId, updates);
    return { updated: true };
  },
});
