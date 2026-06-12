import { mutation } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';
import { getSyncedPaymentReadiness, syncContractorStagePayments } from './_lib/contractorPaymentSync';
import { requireProjectFeature } from './_lib/projectAccess';
import { scheduleUserNotifications } from './notifications';

const contractorRoleValidator = v.union(
  v.literal('קבלן עד מפתח'),
  v.literal('קבלן שלד'),
  v.literal('קבלן עפר'),
  v.literal('קבלן טיח'),
  v.literal('חשמלאי ראשי'),
  v.literal('אינסטלטור'),
  v.literal('קבלן מיזוג'),
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

const DEFAULT_PAYMENT_SCHEDULES: Record<string, typeof DEFAULT_CONTRACTOR_PAYMENT_SCHEDULE> = {
  "קבלן עד מפתח": [
    {name:"מקדמה וחתימת חוזה", pct:10, triggerText:"חתימת חוזה ותחילת עבודה"},
    {name:"סיום עבודות עפר", pct:10, triggerText:"אישור מפקח לסיום חפירה ויסודות"},
    {name:"סיום שלד", pct:20, triggerText:"אישור קונסטרוקטור ומפקח"},
    {name:"מערכות גולמיות", pct:15, triggerText:"חשמל, אינסטלציה ומיזוג לפני טיח"},
    {name:"סיום טיח", pct:10, triggerText:"אישור מפקח לטיח פנים וחוץ"},
    {name:"ריצוף וחיפויים", pct:15, triggerText:"סיום ריצוף וחיפוי רטובים"},
    {name:"גמרים", pct:10, triggerText:"צבע, נגרות, אביזרים וחשמל עדין"},
    {name:"פיתוח חוץ", pct:5, triggerText:"סיום עבודות חוץ וגינה"},
    {name:"מסירה סופית", pct:5, triggerText:"פרוטוקול מסירה ותיקון ליקויים"},
  ],
};

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
  role: string = 'אחר'
) => {
  const schedule = DEFAULT_PAYMENT_SCHEDULES[role] || DEFAULT_CONTRACTOR_PAYMENT_SCHEDULE;
  for (let i = 0; i < schedule.length; i++) {
    const milestone = schedule[i];
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

const autoGenerateStagesFromSchedule = async (
  ctx: MutationCtx,
  contractorId: Id<'contractors'>,
  projectId: Id<'projects'>,
  contractorName: string,
  contractorRole: string,
  budget: number,
  schedule: { name: string; triggerText: string; pct: number }[]
) => {
  const project = await ctx.db.get(projectId);
  const projStartStr = project?.startDate || new Date().toISOString().split('T')[0];
  const projEndStr = project?.expectedEnd || projStartStr;
  
  const DAY_MS = 24 * 60 * 60 * 1000;
  let totalDays = Math.round((new Date(projEndStr).getTime() - new Date(projStartStr).getTime()) / DAY_MS);
  if (totalDays <= 0) totalDays = 300; // Default to ~10 months if no end date was set
  
  let currentStartDateStr = projStartStr;

  for (let i = 0; i < schedule.length; i++) {
    const milestone = schedule[i];
    const amount = Math.round((budget * milestone.pct) / 100);
    
    // Allocate days proportionally to the stage's percentage
    let stageDays = Math.round(totalDays * (milestone.pct / 100));
    if (stageDays < 1) stageDays = 1; // at least 1 day

    const stageStartDate = currentStartDateStr;
    const stageEndDateObj = new Date(new Date(stageStartDate).getTime() + stageDays * DAY_MS);
    const stageEndDate = stageEndDateObj.toISOString().split('T')[0];

    const dependsOnPrevious = i > 0;

    const stageId = await ctx.db.insert('stages', {
      projectId,
      name: milestone.name,
      contractorId,
      contractorRole,
      progressPct: 0,
      status: 'pending',
      startDate: stageStartDate,
      endDate: stageEndDate,
      dependsOnPrevious,
      sortOrder: i + 1,
      payment: { status: 'draft', amount },
      icon: '📌',
    });
    
    currentStartDateStr = stageEndDate;

    await ctx.db.insert('stageTasks', {
      stageId,
      name: milestone.triggerText || `ביצוע ${milestone.name}`,
      done: false,
      required: true,
      assignee: contractorRole,
      sortOrder: 0,
    });

    await ctx.db.insert('stageContractors', {
      projectId,
      stageId,
      contractorId,
      roleLabel: contractorName,
      paymentMode: 'stage_synced',
      sortOrder: 0,
    });
  }

  await syncContractorStagePayments(ctx, contractorId);
  await recomputeContractorPaid(ctx, contractorId);
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
      await createDefaultContractorPaymentSchedule(ctx, contractorId, contractor.budget, contractor.role);
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

export async function deleteStageSafely(ctx: MutationCtx, stageId: Id<'stages'>, projectId: Id<'projects'>) {
  const milestones = await ctx.db.query('stageMilestones').withIndex('by_stage', q => q.eq('stageId', stageId)).collect();
  for (const m of milestones) {
    const links = await ctx.db.query('stageMilestoneTasks').withIndex('by_milestone', q => q.eq('milestoneId', m._id)).collect();
    for (const l of links) await ctx.db.delete(l._id);
    await ctx.db.delete(m._id);
  }
  const tasks = await ctx.db.query('stageTasks').withIndex('by_stage', q => q.eq('stageId', stageId)).collect();
  for (const t of tasks) await ctx.db.delete(t._id);
  const stageContractorsLinks = await ctx.db.query('stageContractors').withIndex('by_stage', q => q.eq('stageId', stageId)).collect();
  for (const sc of stageContractorsLinks) await ctx.db.delete(sc._id);
  
  // Ensure no pending expenses are left dangling
  const expenses = await ctx.db.query('expenses').withIndex('by_project', q => q.eq('projectId', projectId)).filter(q => q.eq(q.field('stageId'), stageId)).collect();
  for (const exp of expenses) {
    if (exp.status !== 'שולם') await ctx.db.delete(exp._id);
  }

  await ctx.db.delete(stageId);
}

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
      const schedule = DEFAULT_PAYMENT_SCHEDULES[args.role] || DEFAULT_CONTRACTOR_PAYMENT_SCHEDULE;
      await autoGenerateStagesFromSchedule(ctx, contractorId, args.projectId, args.name, args.role, args.budget, schedule);
    } else {
      await createDefaultContractorPaymentSchedule(ctx, contractorId, args.budget, args.role);
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

    const executionStages = await ctx.db
      .query('stages')
      .withIndex('by_project_sort', (q) => q.eq('projectId', contractor.projectId))
      .filter((q) => q.neq(q.field('sortOrder'), 0))
      .collect();

    // SMART SYNC: If project has no stages, automatically generate stages matching this payment schedule.
    if (executionStages.length === 0) {
      const existingMilestones = await ctx.db
        .query('contractorPaymentMilestones')
        .withIndex('by_contractor', (q) => q.eq('contractorId', args.contractorId))
        .take(200);

      // Clean up existing milestones so sync can create them fresh
      for (const milestone of existingMilestones) {
        if (!milestone.paid) {
          await ctx.db.delete(milestone._id);
        }
      }

      // Generate stages
      const project = await ctx.db.get(contractor.projectId);
      const startDate = project?.startDate || new Date().toISOString().split('T')[0];
      const endDate = project?.expectedEnd || startDate;

      for (let i = 0; i < args.milestones.length; i++) {
        const milestone = args.milestones[i];
        const amount = Math.round((contractor.budget * milestone.pct) / 100);

        const stageId = await ctx.db.insert('stages', {
          projectId: contractor.projectId,
          name: milestone.name,
          contractorId: contractor._id,
          contractorRole: contractor.role,
          progressPct: 0,
          status: 'pending',
          startDate,
          endDate,
          sortOrder: i + 1,
          payment: { status: 'draft', amount },
          icon: '📌',
        });

        await ctx.db.insert('stageTasks', {
          stageId,
          name: milestone.triggerText || `ביצוע ${milestone.name}`,
          done: false,
          required: true,
          assignee: contractor.role,
          sortOrder: 0,
        });

        await ctx.db.insert('stageContractors', {
          projectId: contractor.projectId,
          stageId,
          contractorId: contractor._id,
          roleLabel: contractor.name,
          paymentMode: 'stage_synced',
          sortOrder: 0,
        });
      }

      // Sync the payments to create the stage_synced milestones
      await syncContractorStagePayments(ctx, args.contractorId);
      await recomputeContractorPaid(ctx, args.contractorId);
      return;
    }

    if (contractor.role === 'קבלן עד מפתח') {
      const existingStages = await ctx.db
        .query('stages')
        .withIndex('by_project_sort', (q) => q.eq('projectId', contractor.projectId))
        .collect();
      
      const incomingStageIdsToKeep = new Set<string>();

      for (let i = 0; i < args.milestones.length; i++) {
        const milestone = args.milestones[i];
        const amount = Math.round((contractor.budget * milestone.pct) / 100);

        let stageId: Id<'stages'> | undefined = undefined;

        if (milestone.milestoneId && !milestone.milestoneId.includes('-')) {
          const parsedId = ctx.db.normalizeId('contractorPaymentMilestones', milestone.milestoneId);
          if (parsedId) {
            const existingMilestone = await ctx.db.get(parsedId);
            if (existingMilestone?.sourceStageId) {
              stageId = existingMilestone.sourceStageId;
            }
          }
        }

        if (!stageId) {
          const matchByName = existingStages.find(s => !incomingStageIdsToKeep.has(s._id) && s.name === milestone.name);
          if (matchByName) {
            stageId = matchByName._id;
          } else {
            const matchByIndex = existingStages.find(s => !incomingStageIdsToKeep.has(s._id) && s.sortOrder === i + 1);
            if (matchByIndex) {
              stageId = matchByIndex._id;
            }
          }
        }

        if (stageId) {
          const stage = await ctx.db.get(stageId);
          await ctx.db.patch(stageId, {
            name: milestone.name,
            sortOrder: i + 1,
            payment: {
               amount,
               status: stage?.payment.status || 'draft',
            }
          });
          const firstTask = await ctx.db.query('stageTasks').withIndex('by_stage', q => q.eq('stageId', stageId)).first();
          if (firstTask) {
             await ctx.db.patch(firstTask._id, { name: milestone.triggerText || `ביצוע ${milestone.name}` });
          }
          incomingStageIdsToKeep.add(stageId);
        } else {
          const project = await ctx.db.get(contractor.projectId);
          const startDate = project?.startDate || new Date().toISOString().split('T')[0];
          const endDate = project?.expectedEnd || startDate;

          const newStageId = await ctx.db.insert('stages', {
            projectId: contractor.projectId,
            name: milestone.name,
            contractorId: contractor._id,
            contractorRole: contractor.role,
            progressPct: 0,
            status: 'pending',
            startDate,
            endDate,
            sortOrder: i + 1,
            payment: { status: 'draft', amount },
            icon: '📌',
          });
          
          await ctx.db.insert('stageTasks', {
            stageId: newStageId,
            name: milestone.triggerText || `ביצוע ${milestone.name}`,
            done: false,
            required: true,
            assignee: contractor.role,
            sortOrder: 0,
          });

          await ctx.db.insert('stageContractors', {
            projectId: contractor.projectId,
            stageId: newStageId,
            contractorId: contractor._id,
            roleLabel: contractor.name,
            paymentMode: 'stage_synced',
            sortOrder: 0,
          });
          
          incomingStageIdsToKeep.add(newStageId);
        }
      }

      for (const stage of existingStages) {
        if (!incomingStageIdsToKeep.has(stage._id) && stage.contractorId === contractor._id) {
           if (stage.progressPct > 0 || stage.payment.status === 'paid') {
              throw new Error(`לא ניתן למחוק את השלב '${stage.name}' כי הוא כבר התחיל או שולם. יש לאפס את ההתקדמות והתשלומים שלו לפני המחיקה.`);
           }
           await deleteStageSafely(ctx, stage._id, contractor.projectId);
        }
      }

      await syncContractorStagePayments(ctx, args.contractorId);
      await recomputeContractorPaid(ctx, args.contractorId);
      return;
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
      if (contractor.role === 'קבלן עד מפתח') {
        await deleteStageSafely(ctx, stageId, contractor.projectId);
      } else {
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
    await requireProjectFeature(ctx, args.projectId, 'boq');
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

    await requireProjectFeature(ctx, args.projectId, 'boq');

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
    // Directed 1:1 message to another internal user (e.g. owner <-> inspector).
    recipientUserId: v.optional(v.id('users')),
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
    let finalRecipientUserId: Id<'users'> | undefined;

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

    const project = await ctx.db.get(args.projectId);

    if (args.thread === 'internal' && args.recipientUserId) {
      // Directed DM between internal users — must be one of the project's
      // owner/manager/inspector slots, and not the sender themselves.
      if (!project) {
        throw new Error('Project not found');
      }
      const internalMemberIds = [project.ownerUserId, project.managerUserId, project.inspectorUserId];
      if (args.recipientUserId === userId || !internalMemberIds.includes(args.recipientUserId)) {
        throw new Error('Invalid recipient');
      }
      finalRecipientUserId = args.recipientUserId;
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
      recipientUserId: finalRecipientUserId,
    });

    // --- Web Push Notifications Logic ---
    // Each "group" of recipients sees a different conversation, so the deep
    // link's `peer` param (the OTHER party from that group's point of view)
    // is computed per group.
    if (project) {
      const senderName = user.name ?? user.email ?? 'משתמש';
      const internalTeamIds = (excluding: Id<'users'>) =>
        [project.ownerUserId, project.managerUserId, project.inspectorUserId]
          .filter((id): id is Id<'users'> => !!id && id !== excluding);

      const groups: { userIds: (Id<'users'> | undefined)[]; peer: string }[] = [];

      if (args.thread === 'internal') {
        if (finalRecipientUserId) {
          // Directed DM — notify only the recipient; their peer is the sender.
          groups.push({ userIds: [finalRecipientUserId], peer: String(userId) });
        } else {
          // Legacy "Team" broadcast — notify the rest of the internal team.
          groups.push({ userIds: internalTeamIds(userId), peer: 'team' });
        }
      } else if (args.thread === 'contractor') {
        if (user.role === 'contractor') {
          // Internal team's peer is this contractor.
          groups.push({ userIds: internalTeamIds(userId), peer: String(finalRecipientId) });
        } else {
          // Internal user sending to a contractor — their peer is the sender.
          if (finalRecipientId) {
            const contractor = await ctx.db.get(finalRecipientId);
            if (contractor?.userId && contractor.userId !== userId) {
              groups.push({ userIds: [contractor.userId], peer: String(userId) });
            }
          } else {
            // Broadcast to all contractors — notify every contractor with a
            // linked user account. Their single conversation is keyed 'team'.
            const projectContractors = await ctx.db
              .query('contractors')
              .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
              .collect();
            groups.push({
              userIds: projectContractors.map((c) => c.userId).filter((id) => id !== userId),
              peer: 'team',
            });
          }
          // Also notify the rest of the internal team — their peer is this
          // contractor (or the broadcast conversation).
          groups.push({ userIds: internalTeamIds(userId), peer: String(finalRecipientId ?? 'broadcast') });
        }
      }

      for (const group of groups) {
        await scheduleUserNotifications(ctx, {
          userIds: group.userIds,
          title: `הודעה חדשה מאת ${senderName}`,
          body: args.text.substring(0, 100) + (args.text.length > 100 ? '...' : ''),
          url: `/notes?project=${args.projectId}&peer=${group.peer}`,
          tag: `notes-${args.projectId}-${group.peer}`,
        });
      }
    }
  },
});

export const markMessagesAsRead = mutation({
  args: {
    projectId: v.id('projects'),
    thread: v.union(v.literal('internal'), v.literal('contractor')),
    filterContractorId: v.optional(v.id('contractors')),
    // For 'internal' thread: which conversation to mark read.
    // - omitted -> the shared "Team" broadcast conversation
    // - set -> the 1:1 DM with this internal user
    peerUserId: v.optional(v.id('users')),
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

    const messages = await ctx.db
      .query('messages')
      .withIndex('by_project_thread', (q) =>
        q.eq('projectId', args.projectId).eq('thread', args.thread)
      )
      .take(200);

    const unread = messages.filter(
      (m) => m.readAt === undefined && m.fromUserId !== userId
    );

    const now = Date.now();

    if (user.role === 'contractor') {
      const contractor = await ctx.db
        .query('contractors')
        .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
        .filter((q) => q.eq(q.field('userId'), userId))
        .first();

      if (!contractor) return;

      for (const msg of unread) {
        const isAddressedToMe =
          msg.recipientContractorId === undefined ||
          msg.recipientContractorId === contractor._id;
        if (isAddressedToMe) {
          await ctx.db.patch(msg._id, { readAt: now });
        }
      }
    } else if (args.thread === 'internal') {
      // owner / manager / inspector — only mark the open conversation as read.
      for (const msg of unread) {
        const isAddressedToMe = args.peerUserId
          ? msg.recipientUserId === userId && msg.fromUserId === args.peerUserId
          : msg.recipientUserId === undefined; // shared "Team" broadcast
        if (isAddressedToMe) {
          await ctx.db.patch(msg._id, { readAt: now });
        }
      }
    } else {
      // owner / manager / inspector — contractor thread
      for (const msg of unread) {
        if (args.filterContractorId) {
          // Only mark messages from the currently-viewed contractor
          if (
            msg.role === 'contractor' &&
            msg.recipientContractorId === args.filterContractorId
          ) {
            await ctx.db.patch(msg._id, { readAt: now });
          }
        } else {
          await ctx.db.patch(msg._id, { readAt: now });
        }
      }
    }
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
