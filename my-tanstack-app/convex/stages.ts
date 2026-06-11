import { mutation, query } from './_generated/server';
import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { v } from 'convex/values';
import { insertActivity } from './_lib/activity';
import { patchStageDatesWithCascade } from './_lib/stageSchedule';
import { requireProjectScheduleView, requireProjectMember } from './_lib/projectAccess';
import {
  hasSyncedStageContractorLinks,
  syncContractorStagePayments,
  syncStageLinkedContractorPayments,
} from './_lib/contractorPaymentSync';

export const list = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    await requireProjectScheduleView(ctx, args.projectId);
    const stages = await ctx.db
      .query('stages')
      .withIndex('by_project_sort', (q) => q.eq('projectId', args.projectId))
      .collect();

    // Batch-fetch tasks for all stages using the index — avoids full table scan
    const tasksByStage = new Map<string, typeof allTasks>();
    const allTasks = (
      await Promise.all(
        stages.map((s) =>
          ctx.db
            .query('stageTasks')
            .withIndex('by_stage', (q) => q.eq('stageId', s._id))
            .collect(),
        ),
      )
    ).flat();
    for (const task of allTasks) {
      const key = String(task.stageId);
      const bucket = tasksByStage.get(key) ?? [];
      bucket.push(task);
      tasksByStage.set(key, bucket);
    }

    return stages.map((s) => ({
      ...s,
      id: Number(s.sortOrder), // Map to legacy ID if needed
      progress: s.progressPct,
      tasks: (tasksByStage.get(String(s._id)) ?? []).map((t) => ({
        ...t,
        id: t._id, // Keep ID for updates
      })),
    }));
  },
});

const taskTemplateValidator = v.object({
  legacyId: v.number(),
  name: v.string(),
  assignee: v.string(),
  required: v.boolean(),
  paymentRequired: v.optional(v.boolean()),
  paymentAmount: v.optional(v.number()),
});

const milestoneTemplateValidator = v.object({
  legacyKey: v.string(),
  name: v.string(),
  pct: v.number(),
  taskLegacyIds: v.array(v.number()),
});

const stageTemplateValidator = v.object({
  legacyId: v.number(),
  name: v.string(),
  icon: v.optional(v.string()),
  contractorRole: v.optional(v.string()),
  contractorIds: v.optional(v.array(v.id('contractors'))),
  startDate: v.string(),
  endDate: v.string(),
  dependsOnPrevious: v.optional(v.boolean()),
  amount: v.number(),
  paymentAtEnd: v.optional(v.boolean()),
  tasks: v.array(taskTemplateValidator),
  milestones: v.array(milestoneTemplateValidator),
});

const newStageValidator = v.object({
  name: v.string(),
  icon: v.optional(v.string()),
  contractorRole: v.optional(v.string()),
  contractorIds: v.optional(v.array(v.id('contractors'))),
  startDate: v.string(),
  endDate: v.string(),
  dependsOnPrevious: v.optional(v.boolean()),
  amount: v.number(),
  paymentAtEnd: v.optional(v.boolean()),
  tasks: v.array(taskTemplateValidator),
  milestones: v.array(milestoneTemplateValidator),
});

type StageTemplateInput = {
  legacyId: number;
  name: string;
  icon?: string;
  contractorRole?: string;
  contractorIds?: Id<'contractors'>[];
  startDate: string;
  endDate: string;
  dependsOnPrevious?: boolean;
  amount: number;
  paymentAtEnd?: boolean;
  tasks: Array<{
    legacyId: number;
    name: string;
    assignee: string;
    required: boolean;
    paymentRequired?: boolean;
    paymentAmount?: number;
  }>;
  milestones: Array<{
    legacyKey: string;
    name: string;
    pct: number;
    taskLegacyIds: number[];
  }>;
};

const uniqueContractorIds = (ids: Id<'contractors'>[]) => {
  const seen = new Set<string>();
  return ids.filter((id) => {
    const key = String(id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const findStagePaymentExpense = async (
  ctx: MutationCtx,
  projectId: Id<'projects'>,
  stageId: Id<'stages'>,
) => {
  return await ctx.db
    .query('expenses')
    .withIndex('by_project', (q) => q.eq('projectId', projectId))
    .filter((q) => q.eq(q.field('stageId'), stageId))
    .first();
};

const findStageMilestoneExpense = async (
  ctx: MutationCtx,
  projectId: Id<'projects'>,
  milestoneId: Id<'stageMilestones'>,
) => {
  return await ctx.db
    .query('expenses')
    .withIndex('by_project', (q) => q.eq('projectId', projectId))
    .filter((q) => q.eq(q.field('stageMilestoneId'), milestoneId))
    .first();
};

const findBudgetCategoryForStage = async (
  ctx: MutationCtx,
  projectId: Id<'projects'>,
  stageName: string,
) => {
  return await ctx.db
    .query('budgetCategories')
    .withIndex('by_project', (q) => q.eq('projectId', projectId))
    .filter((q) => q.eq(q.field('name'), stageName))
    .first();
};

const adjustBudgetCategorySpent = async (
  ctx: MutationCtx,
  categoryId: Id<'budgetCategories'> | undefined,
  amountDelta: number,
) => {
  if (!categoryId) return;
  const category = await ctx.db.get(categoryId);
  if (!category) return;
  await ctx.db.patch(category._id, {
    spent: Math.max(0, category.spent + amountDelta),
  });
};

const getDirectStagePaymentMismatch = async (
  ctx: MutationCtx,
  stageId: Id<'stages'>,
  stageAmount: number,
) => {
  const links = await ctx.db
    .query('stageContractors')
    .withIndex('by_stage', (q) => q.eq('stageId', stageId))
    .take(100);

  if (links.length === 0) {
    return {
      hasContractors: false,
      hasSyncedContractors: false,
      mismatch: false,
      contractorBudgetTotal: 0,
      reason: null as string | null,
    };
  }

  const hasSyncedContractors = links.some((link) => (link.paymentMode ?? 'stage_synced') === 'stage_synced');
  const directLinks = links.filter((link) => (link.paymentMode ?? 'stage_synced') !== 'stage_synced');
  let contractorBudgetTotal = 0;
  for (const link of directLinks) {
    const contractor = await ctx.db.get(link.contractorId);
    if (contractor) {
      contractorBudgetTotal += contractor.budget;
    }
  }

  const mismatch =
    directLinks.length > 0 &&
    Math.round(stageAmount || 0) !== Math.round(contractorBudgetTotal);

  return {
    hasContractors: true,
    hasSyncedContractors,
    mismatch,
    contractorBudgetTotal,
    reason: mismatch
      ? `סכום השלב ${Math.round(stageAmount || 0).toLocaleString('he-IL')} ₪ לא תואם לסכום החוזה של הקבלנים ${Math.round(contractorBudgetTotal).toLocaleString('he-IL')} ₪`
      : null,
  };
};

const hasPaidContractorPaymentForStageMilestone = async (
  ctx: MutationCtx,
  stageId: Id<'stages'>,
  milestoneId: Id<'stageMilestones'>,
) => {
  const links = await ctx.db
    .query('stageContractors')
    .withIndex('by_stage', (q) => q.eq('stageId', stageId))
    .take(100);

  for (const link of links) {
    const contractorMilestones = await ctx.db
      .query('contractorPaymentMilestones')
      .withIndex('by_contractor', (q) => q.eq('contractorId', link.contractorId))
      .take(200);
    if (contractorMilestones.some((milestone) =>
      milestone.paid && milestone.sourceStageMilestoneId === milestoneId
    )) {
      return true;
    }
  }

  return false;
};

const syncStageContractors = async (
  ctx: MutationCtx,
  projectId: Id<'projects'>,
  stageId: Id<'stages'>,
  contractorIds: Id<'contractors'>[],
) => {
  const uniqueIds = uniqueContractorIds(contractorIds);
  const contractors = [];

  for (const contractorId of uniqueIds) {
    const contractor = await ctx.db.get(contractorId);
    if (!contractor || contractor.projectId !== projectId) {
      throw new Error('Contractor not found in this project');
    }
    contractors.push(contractor);
  }

  const existing = await ctx.db
    .query('stageContractors')
    .withIndex('by_stage', (q) => q.eq('stageId', stageId))
    .collect();
  const affectedContractorIds = new Set(existing.map((link) => link.contractorId));
  for (const contractorId of uniqueIds) {
    affectedContractorIds.add(contractorId);
  }

  const nextIdSet = new Set(uniqueIds.map(String));
  for (const link of existing) {
    if (!nextIdSet.has(String(link.contractorId))) {
      await ctx.db.delete(link._id);
    }
  }

  const existingByContractor = new Map(existing.map((link) => [String(link.contractorId), link]));
  for (let i = 0; i < contractors.length; i++) {
    const contractor = contractors[i];
    const existingLink = existingByContractor.get(String(contractor._id));
    if (existingLink) {
      await ctx.db.patch(existingLink._id, {
        sortOrder: i,
        roleLabel: contractor.name,
        paymentMode: existingLink.paymentMode ?? 'stage_synced',
      });
    } else {
      await ctx.db.insert('stageContractors', {
        projectId,
        stageId,
        contractorId: contractor._id,
        roleLabel: contractor.name,
        paymentMode: 'stage_synced',
        sortOrder: i,
      });
    }
  }

  const primary = contractors[0];
  await ctx.db.patch(stageId, {
    contractorId: primary?._id,
    contractorRole: contractors.map((contractor) => contractor.name).join(', ') || undefined,
  });

  for (const contractorId of affectedContractorIds) {
    await syncContractorStagePayments(ctx, contractorId);
  }

  return contractors.length;
};

const ensureLegacyContractorStageLinks = async (
  ctx: MutationCtx,
  contractorId: Id<'contractors'>,
  paymentMode: 'stage_synced' | 'custom' = 'stage_synced',
) => {
  const contractor = await ctx.db.get(contractorId);
  if (!contractor) throw new Error('Contractor not found');

  const stages = await ctx.db
    .query('stages')
    .withIndex('by_project_sort', (q) => q.eq('projectId', contractor.projectId))
    .collect();

  let created = 0;
  for (const stage of stages) {
    const isLegacyMatch =
      stage.contractorId === contractor._id ||
      stage.contractorRole === contractor.name ||
      stage.contractorRole === contractor.role;
    if (!isLegacyMatch) continue;

    const existing = await ctx.db
      .query('stageContractors')
      .withIndex('by_stage', (q) => q.eq('stageId', stage._id))
      .collect();
    if (existing.some((link) => link.contractorId === contractor._id)) continue;

    await ctx.db.insert('stageContractors', {
      projectId: contractor.projectId,
      stageId: stage._id,
      contractorId: contractor._id,
      roleLabel: contractor.name,
      paymentMode,
      sortOrder: existing.length,
    });
    created += 1;
  }

  return created;
};

const validateStageTemplateInput = (stage: StageTemplateInput) => {
  if (!stage.name.trim()) {
    throw new Error('Every stage must have a name');
  }
  if (stage.tasks.length === 0) {
    throw new Error('Every stage must include at least one task');
  }

  const taskIds = new Set(stage.tasks.map((task) => task.legacyId));
  for (const milestone of stage.milestones) {
    for (const taskLegacyId of milestone.taskLegacyIds) {
      if (!taskIds.has(taskLegacyId)) {
        throw new Error('Milestone task links must reference tasks in the same stage');
      }
    }
  }
  for (const task of stage.tasks) {
    if (task.paymentRequired && (!task.paymentAmount || task.paymentAmount <= 0)) {
      throw new Error('Paid tasks must include a positive payment amount');
    }
  }
};

const insertStageFromTemplate = async (
  ctx: MutationCtx,
  projectId: Id<'projects'>,
  stage: StageTemplateInput,
  sortOrder: number,
) => {
  let contractorRole = stage.contractorRole;
  let contractorIds = stage.contractorIds || [];

  const stageId = await ctx.db.insert('stages', {
    projectId,
    legacyId: stage.legacyId,
    sortOrder,
    name: stage.name.trim(),
    ...(stage.icon ? { icon: stage.icon } : {}),
    status: 'pending',
    progressPct: 0,
    startDate: stage.startDate,
    endDate: stage.endDate,
    dependsOnPrevious: sortOrder > 0 && Boolean(stage.dependsOnPrevious),
    ...(contractorRole ? { contractorRole } : {}),
    payment: {
      amount: stage.amount,
      status: 'draft',
    },
  });

  if (contractorIds.length) {
    await syncStageContractors(ctx, projectId, stageId, contractorIds);
  }

  const taskIdByLegacyId = new Map<number, Id<'stageTasks'>>();
  for (let j = 0; j < stage.tasks.length; j++) {
    const task = stage.tasks[j];
    const taskId = await ctx.db.insert('stageTasks', {
      stageId,
      legacyId: task.legacyId,
      name: task.name.trim(),
      done: false,
      assignee: task.assignee.trim() || 'לא הוגדר',
      required: task.required,
      sortOrder: j,
    });
    taskIdByLegacyId.set(task.legacyId, taskId);
  }

  const taskPaymentMilestones = stage.paymentAtEnd
    ? []
    : stage.tasks
        .filter((task) => task.paymentRequired && (task.paymentAmount || 0) > 0)
        .map((task) => ({
          legacyKey: `task-${task.legacyId}`,
          name: task.name.trim(),
          pct: stage.amount > 0 ? Math.round(((task.paymentAmount || 0) / stage.amount) * 10000) / 100 : 0,
          amount: Math.round(task.paymentAmount || 0),
          taskLegacyIds: [task.legacyId],
        }));
  const paymentMilestones = [
    ...taskPaymentMilestones,
    ...stage.milestones.map((milestone) => ({
      ...milestone,
      amount: Math.round((stage.amount * milestone.pct) / 100),
    })),
  ];

  for (let k = 0; k < paymentMilestones.length; k++) {
    const milestone = paymentMilestones[k];
    const milestoneId = await ctx.db.insert('stageMilestones', {
      stageId,
      legacyKey: milestone.legacyKey,
      sortOrder: k,
      name: milestone.name.trim(),
      pct: milestone.pct,
      amount: milestone.amount,
      status: 'draft',
    });

    for (const taskLegacyId of milestone.taskLegacyIds) {
      const taskId = taskIdByLegacyId.get(taskLegacyId);
      if (taskId) {
        await ctx.db.insert('stageMilestoneTasks', { milestoneId, taskId });
      }
    }
  }

  await syncStageLinkedContractorPayments(ctx, stageId);

  return stageId;
};

export const createFromTemplate = mutation({
  args: {
    projectId: v.id('projects'),
    stages: v.array(stageTemplateValidator),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('stages')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .take(1);

    if (existing.length > 0) {
      throw new Error('Project already has construction stages');
    }

    if (args.stages.length === 0) {
      throw new Error('At least one stage is required');
    }

    for (let i = 0; i < args.stages.length; i++) {
      validateStageTemplateInput(args.stages[i]);
    }

    for (let i = 0; i < args.stages.length; i++) {
      await insertStageFromTemplate(ctx, args.projectId, args.stages[i], i);
    }

    await ctx.db.patch(args.projectId, {
      currentStageName: args.stages[0].name.trim(),
      progressPct: 0,
    });

    return { created: args.stages.length };
  },
});

export const addStage = mutation({
  args: {
    projectId: v.id('projects'),
    stage: newStageValidator,
  },
  handler: async (ctx, args) => {
    validateStageTemplateInput({ ...args.stage, legacyId: 1 });

    const existingStages = await ctx.db
      .query('stages')
      .withIndex('by_project_sort', (q) => q.eq('projectId', args.projectId))
      .collect();

    const nextSortOrder = existingStages.length
      ? Math.max(...existingStages.map((stage) => stage.sortOrder)) + 1
      : 0;
    const nextLegacyId = existingStages.length
      ? Math.max(...existingStages.map((stage) => stage.legacyId ?? stage.sortOrder + 1)) + 1
      : 1;

    const stageId = await insertStageFromTemplate(
      ctx,
      args.projectId,
      {
        ...args.stage,
        legacyId: nextLegacyId,
        dependsOnPrevious: nextSortOrder > 0 && Boolean(args.stage.dependsOnPrevious),
      },
      nextSortOrder,
    );

    if (existingStages.length === 0) {
      await ctx.db.patch(args.projectId, {
        currentStageName: args.stage.name.trim(),
        progressPct: 0,
      });
    }

    return { stageId, sortOrder: nextSortOrder, legacyId: nextLegacyId };
  },
});

export const updateStageDetails = mutation({
  args: {
    stageId: v.id('stages'),
    name: v.string(),
    icon: v.optional(v.string()),
    contractorRole: v.optional(v.string()),
    contractorIds: v.optional(v.array(v.id('contractors'))),
    startDate: v.string(),
    endDate: v.string(),
    dependsOnPrevious: v.optional(v.boolean()),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const stage = await ctx.db.get(args.stageId);
    if (!stage) {
      throw new Error('Stage not found');
    }

    const updatedStages = await patchStageDatesWithCascade(ctx, {
      projectId: stage.projectId,
      stage,
      startDate: args.startDate,
      endDate: args.endDate,
      patch: {
        name: args.name.trim(),
        icon: args.icon,
        contractorRole: args.contractorRole,
        dependsOnPrevious: stage.sortOrder > 0 && Boolean(args.dependsOnPrevious),
        payment: {
          ...stage.payment,
          amount: args.amount,
        },
      },
    });

    if (args.contractorIds !== undefined) {
      await syncStageContractors(ctx, stage.projectId, args.stageId, args.contractorIds);
    }
    await syncStageLinkedContractorPayments(ctx, args.stageId);

    return { updatedStages };
  },
});

export const updateStageAdvanced = mutation({
  args: {
    stageId: v.id('stages'),
    name: v.string(),
    icon: v.optional(v.string()),
    contractorRole: v.optional(v.string()),
    contractorIds: v.optional(v.array(v.id('contractors'))),
    startDate: v.string(),
    endDate: v.string(),
    dependsOnPrevious: v.optional(v.boolean()),
    amount: v.number(),
    paymentAtEnd: v.optional(v.boolean()),
    tasks: v.array(v.object({
      _id: v.optional(v.id('stageTasks')),
      legacyId: v.number(),
      name: v.string(),
      assignee: v.string(),
      required: v.boolean(),
      paymentRequired: v.boolean(),
      paymentAmount: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const stage = await ctx.db.get(args.stageId);
    if (!stage) throw new Error('Stage not found');

    const updatedStages = await patchStageDatesWithCascade(ctx, {
      projectId: stage.projectId,
      stage,
      startDate: args.startDate,
      endDate: args.endDate,
      patch: {
        name: args.name.trim(),
        icon: args.icon,
        contractorRole: args.contractorRole,
        dependsOnPrevious: stage.sortOrder > 0 && Boolean(args.dependsOnPrevious),
        payment: {
          ...stage.payment,
          amount: args.amount,
        },
      },
    });

    if (args.contractorIds !== undefined) {
      await syncStageContractors(ctx, stage.projectId, args.stageId, args.contractorIds);
    }

    // 1. Sync tasks
    const existingTasks = await ctx.db
      .query('stageTasks')
      .withIndex('by_stage', (q) => q.eq('stageId', args.stageId))
      .collect();

    const existingMilestones = await ctx.db
      .query('stageMilestones')
      .withIndex('by_stage', (q) => q.eq('stageId', args.stageId))
      .collect();

    for (const milestone of existingMilestones) {
      if (!milestone.legacyKey?.startsWith('task-')) continue;
      const hasPaidLinkedContractorPayment = await hasPaidContractorPaymentForStageMilestone(ctx, args.stageId, milestone._id);
      if (milestone.status === 'paid' || hasPaidLinkedContractorPayment) {
        throw new Error('אי אפשר לערוך או להחליף אבני דרך שכבר שולמו');
      }
    }

    const incomingIds = new Set(args.tasks.map(t => t._id).filter(Boolean));
    
    // Delete missing tasks
    for (const t of existingTasks) {
      if (!incomingIds.has(t._id)) {
        await ctx.db.delete(t._id);
      }
    }

    const taskIdByLegacyId = new Map<number, Id<'stageTasks'>>();

    for (let i = 0; i < args.tasks.length; i++) {
      const task = args.tasks[i];
      if (task._id) {
        await ctx.db.patch(task._id, {
          name: task.name.trim(),
          assignee: task.assignee.trim() || 'לא הוגדר',
          required: task.required,
          sortOrder: i,
        });
        taskIdByLegacyId.set(task.legacyId, task._id);
      } else {
        const newId = await ctx.db.insert('stageTasks', {
          stageId: args.stageId,
          legacyId: task.legacyId,
          name: task.name.trim(),
          done: false,
          assignee: task.assignee.trim() || 'לא הוגדר',
          required: task.required,
          sortOrder: i,
        });
        taskIdByLegacyId.set(task.legacyId, newId);
      }
    }

    // 2. Re-create task payment milestones (only if not paymentAtEnd)
    // Delete existing task-based milestones
    for (const m of existingMilestones) {
      if (m.legacyKey?.startsWith('task-')) {
        const links = await ctx.db.query('stageMilestoneTasks').withIndex('by_milestone', q => q.eq('milestoneId', m._id)).collect();
        for (const l of links) await ctx.db.delete(l._id);
        await ctx.db.delete(m._id);
      }
    }

    if (!args.paymentAtEnd) {
      const taskPaymentMilestones = args.tasks
        .filter((task) => task.paymentRequired && (task.paymentAmount || 0) > 0)
        .map((task) => ({
          legacyKey: `task-${task.legacyId}`,
          name: task.name.trim(),
          pct: args.amount > 0 ? Math.round(((task.paymentAmount || 0) / args.amount) * 10000) / 100 : 0,
          amount: Math.round(task.paymentAmount || 0),
          taskLegacyId: task.legacyId,
        }));

      for (let k = 0; k < taskPaymentMilestones.length; k++) {
        const m = taskPaymentMilestones[k];
        const milestoneId = await ctx.db.insert('stageMilestones', {
          stageId: args.stageId,
          legacyKey: m.legacyKey,
          sortOrder: k,
          name: m.name,
          pct: m.pct,
          amount: m.amount,
          status: 'draft',
        });
        const taskId = taskIdByLegacyId.get(m.taskLegacyId);
        if (taskId) {
          await ctx.db.insert('stageMilestoneTasks', { milestoneId, taskId });
        }
      }
    }

    await syncStageLinkedContractorPayments(ctx, args.stageId);

    return { updatedStages };
  },
});

export const setStageContractors = mutation({
  args: {
    stageId: v.id('stages'),
    contractorIds: v.array(v.id('contractors')),
  },
  handler: async (ctx, args) => {
    const stage = await ctx.db.get(args.stageId);
    if (!stage) throw new Error('Stage not found');

    const count = await syncStageContractors(ctx, stage.projectId, args.stageId, args.contractorIds);
    return { count };
  },
});

export const setContractorStages = mutation({
  args: {
    contractorId: v.id('contractors'),
    stageIds: v.array(v.id('stages')),
  },
  handler: async (ctx, args) => {
    const contractor = await ctx.db.get(args.contractorId);
    if (!contractor) throw new Error('Contractor not found');

    const stageIdSet = new Set(args.stageIds.map(String));
    for (const stageId of args.stageIds) {
      const stage = await ctx.db.get(stageId);
      if (!stage || stage.projectId !== contractor.projectId) {
        throw new Error('Stage not found in this project');
      }
    }

    await ensureLegacyContractorStageLinks(ctx, args.contractorId, 'stage_synced');

    const stages = await ctx.db
      .query('stages')
      .withIndex('by_project_sort', (q) => q.eq('projectId', contractor.projectId))
      .collect();

    // Batch-fetch all stageContractors for this project in one query, then group by stageId
    const allLinks = await ctx.db
      .query('stageContractors')
      .withIndex('by_project', (q) => q.eq('projectId', contractor.projectId))
      .take(2000);
    const linksByStageId = new Map<string, typeof allLinks>();
    for (const link of allLinks) {
      const key = String(link.stageId);
      const bucket = linksByStageId.get(key) ?? [];
      bucket.push(link);
      linksByStageId.set(key, bucket);
    }

    let changed = 0;
    for (const stage of stages) {
      const links = (linksByStageId.get(String(stage._id)) ?? []);
      const currentIds = links
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((link) => link.contractorId);
      const hasLegacyContractor =
        stage.contractorId === args.contractorId ||
        stage.contractorRole === contractor.name ||
        stage.contractorRole === contractor.role;
      if (currentIds.length === 0 && hasLegacyContractor) {
        currentIds.push(args.contractorId);
      }
      const hasContractor = currentIds.some((id) => id === args.contractorId);
      const shouldHaveContractor = stageIdSet.has(String(stage._id));

      if (hasContractor === shouldHaveContractor) continue;

      const nextIds = shouldHaveContractor
        ? [...currentIds, args.contractorId]
        : currentIds.filter((id) => id !== args.contractorId);
      await syncStageContractors(ctx, contractor.projectId, stage._id, nextIds);
      changed += 1;
    }


    return { changed };
  },
});

export const setContractorPaymentMode = mutation({
  args: {
    contractorId: v.id('contractors'),
    paymentMode: v.union(v.literal('stage_synced'), v.literal('custom')),
  },
  handler: async (ctx, args) => {
    const contractor = await ctx.db.get(args.contractorId);
    if (!contractor) throw new Error('Contractor not found');

    const existingLinks = await ctx.db
      .query('stageContractors')
      .withIndex('by_contractor', (q) => q.eq('contractorId', args.contractorId))
      .take(200);
    const existingMilestones = await ctx.db
      .query('contractorPaymentMilestones')
      .withIndex('by_contractor', (q) => q.eq('contractorId', args.contractorId))
      .take(200);
    const currentPaymentMode = existingLinks.length > 0 && existingLinks.some((link) => (link.paymentMode ?? 'stage_synced') === 'stage_synced')
      ? 'stage_synced'
      : 'custom';
    const paymentStarted = contractor.paid > 0 || existingMilestones.some((milestone) => milestone.paid);
    if (paymentStarted && currentPaymentMode !== args.paymentMode) {
      if (args.paymentMode === 'stage_synced') {
        throw new Error('אי אפשר לחזור ללוח מסונכרן לשלבים אחרי שהתחילו תשלומים');
      }
    }

    await ensureLegacyContractorStageLinks(ctx, args.contractorId, args.paymentMode);

    const links = await ctx.db
      .query('stageContractors')
      .withIndex('by_contractor', (q) => q.eq('contractorId', args.contractorId))
      .take(200);
    for (const link of links) {
      await ctx.db.patch(link._id, { paymentMode: args.paymentMode });
    }

    if (args.paymentMode === 'stage_synced') {
      for (const milestone of existingMilestones) {
        if (!milestone.paid && milestone.sourceMode !== 'stage_synced') {
          await ctx.db.delete(milestone._id);
        }
      }
      await syncContractorStagePayments(ctx, args.contractorId);
    } else {
      const unmutatedMilestones = existingMilestones.filter((m) => !m.paid);
      const paidPct = existingMilestones.filter((m) => m.paid).reduce((s, m) => s + m.pct, 0);
      const remainingPct = 100 - paidPct;
      const sumAmounts = unmutatedMilestones.reduce((s, m) => s + (m.amount || 0), 0);
      let currentPctSum = 0;

      for (let i = 0; i < unmutatedMilestones.length; i++) {
        const milestone = unmutatedMilestones[i];
        let newPct = 0;
        if (i === unmutatedMilestones.length - 1) {
          newPct = Math.round((remainingPct - currentPctSum) * 100) / 100;
        } else {
          newPct = sumAmounts > 0
            ? Math.round(((milestone.amount || 0) / sumAmounts) * remainingPct * 100) / 100
            : Math.round((remainingPct / unmutatedMilestones.length) * 100) / 100;
          currentPctSum += newPct;
        }

        await ctx.db.patch(milestone._id, {
          pct: newPct,
          sourceMode: 'custom',
          sourceStageId: undefined,
          sourceStageMilestoneId: undefined,
          sourceTaskId: undefined,
        });
      }
    }

    return { updated: links.length };
  },
});

export const backfillStageContractors = mutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const stages = await ctx.db
      .query('stages')
      .withIndex('by_project_sort', (q) => q.eq('projectId', args.projectId))
      .collect();
    const contractors = await ctx.db
      .query('contractors')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();

    let createdStages = 0;
    for (const stage of stages) {
      const existing = await ctx.db
        .query('stageContractors')
        .withIndex('by_stage', (q) => q.eq('stageId', stage._id))
        .take(1);
      if (existing.length > 0) continue;

      const contractor =
        (stage.contractorId ? contractors.find((item) => item._id === stage.contractorId) : null) ??
        contractors.find((item) => item.name === stage.contractorRole) ??
        contractors.find((item) => item.role === stage.contractorRole);

      if (contractor) {
        await syncStageContractors(ctx, args.projectId, stage._id, [contractor._id]);
        createdStages += 1;
      }
    }

    return { createdStages };
  },
});

export const setStagePaymentPaid = mutation({
  args: {
    stageId: v.id('stages'),
    paid: v.boolean(),
    receipts: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const stage = await ctx.db.get(args.stageId);
    if (!stage) {
      throw new Error('Stage not found');
    }
    if (args.paid) {
      const paymentCheck = await getDirectStagePaymentMismatch(ctx, args.stageId, stage.payment.amount);
      if (!paymentCheck.hasContractors) {
        throw new Error('אי אפשר לשלם — לא קושר קבלן לשלב');
      }
      if (paymentCheck.mismatch) {
        throw new Error(paymentCheck.reason ?? 'סכום השלב לא תואם לסכום החוזה של הקבלנים');
      }
    }
    if (await hasSyncedStageContractorLinks(ctx, args.stageId)) {
      throw new Error('Pay synced contractor stage payments from the contractor payment schedule');
    }

    const existingExpense = await findStagePaymentExpense(ctx, stage.projectId, args.stageId);
    const today = new Date().toISOString().slice(0, 10);

    await ctx.db.patch(args.stageId, {
      payment: {
        ...stage.payment,
        status: args.paid ? 'paid' : 'draft',
        paidAt: args.paid ? today : undefined,
        ...(args.receipts && args.receipts.length > 0 ? { receipts: args.receipts } : {}),
      },
    });

    if (args.paid) {
      await insertActivity(ctx, {
        projectId: stage.projectId,
        text: `בוצע תשלום סופי עבור שלב: ${stage.name} בסך ${stage.payment.amount} ₪`,
      });
      
      // Create expense
      if (!existingExpense) {
        const category = await findBudgetCategoryForStage(ctx, stage.projectId, stage.name);
        await ctx.db.insert('expenses', {
          projectId: stage.projectId,
          description: `תשלום שלב: ${stage.name}`,
          amount: stage.payment.amount,
          expenseDate: today,
          status: 'שולם',
          categoryId: category?._id,
          stageId: args.stageId,
        });
        await adjustBudgetCategorySpent(ctx, category?._id, stage.payment.amount);
      }
    } else if (existingExpense) {
      await ctx.db.delete(existingExpense._id);
      await adjustBudgetCategorySpent(ctx, existingExpense.categoryId, -existingExpense.amount);
    }
  },
});

export const setStageMilestonePaid = mutation({
  args: {
    milestoneId: v.id('stageMilestones'),
    paid: v.boolean(),
    receipts: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const milestone = await ctx.db.get(args.milestoneId);
    if (!milestone) {
      throw new Error('Stage milestone not found');
    }

    const stage = await ctx.db.get(milestone.stageId);
    if (!stage) throw new Error('Stage not found');
    if (args.paid) {
      const paymentCheck = await getDirectStagePaymentMismatch(ctx, stage._id, stage.payment.amount);
      if (!paymentCheck.hasContractors) {
        throw new Error('אי אפשר לשלם — לא קושר קבלן לשלב');
      }
      if (paymentCheck.mismatch) {
        throw new Error(paymentCheck.reason ?? 'סכום השלב לא תואם לסכום החוזה של הקבלנים');
      }
    }
    if (await hasSyncedStageContractorLinks(ctx, stage._id)) {
      throw new Error('Pay synced contractor stage payments from the contractor payment schedule');
    }

    const existingExpense = await findStageMilestoneExpense(ctx, stage.projectId, args.milestoneId);
    const today = new Date().toISOString().slice(0, 10);

    await ctx.db.patch(args.milestoneId, {
      status: args.paid ? 'paid' : 'draft',
      paidAt: args.paid ? today : undefined,
      ...(args.receipts && args.receipts.length > 0 ? { receipts: args.receipts } : {}),
    });

    if (args.paid) {
      await insertActivity(ctx, {
        projectId: stage.projectId,
        text: `בוצע תשלום אבן דרך "${milestone.name}" בשלב ${stage.name} בסך ${milestone.amount} ₪`,
      });

      // Create expense
      if (!existingExpense) {
        const category = await findBudgetCategoryForStage(ctx, stage.projectId, stage.name);
        await ctx.db.insert('expenses', {
          projectId: stage.projectId,
          description: `תשלום אבן דרך: ${milestone.name} (${stage.name})`,
          amount: milestone.amount,
          expenseDate: today,
          status: 'שולם',
          categoryId: category?._id,
          stageId: stage._id,
          stageMilestoneId: args.milestoneId,
        });
        await adjustBudgetCategorySpent(ctx, category?._id, milestone.amount);
      }
    } else if (existingExpense) {
      await ctx.db.delete(existingExpense._id);
      await adjustBudgetCategorySpent(ctx, existingExpense.categoryId, -existingExpense.amount);
    }
  },
});

export const lockStageMilestone = mutation({
  args: {
    milestoneId: v.id('stageMilestones'),
  },
  handler: async (ctx, args) => {
    const milestone = await ctx.db.get(args.milestoneId);
    if (!milestone) {
      throw new Error('Stage milestone not found');
    }

    if (milestone.status !== 'paid') {
      throw new Error('אפשר לנעול רק תשלום שסומן כשולם');
    }

    await ctx.db.patch(args.milestoneId, {
      isLocked: true,
    });
  },
});

export const deleteStage = mutation({
  args: { stageId: v.id('stages') },
  handler: async (ctx, args) => {
    const stage = await ctx.db.get(args.stageId);
    if (!stage) {
      return;
    }

    const milestones = await ctx.db
      .query('stageMilestones')
      .withIndex('by_stage', (q) => q.eq('stageId', args.stageId))
      .take(100);

    for (const milestone of milestones) {
      const links = await ctx.db
        .query('stageMilestoneTasks')
        .withIndex('by_milestone', (q) => q.eq('milestoneId', milestone._id))
        .take(100);
      for (const link of links) {
        await ctx.db.delete(link._id);
      }
      await ctx.db.delete(milestone._id);
    }

    const tasks = await ctx.db
      .query('stageTasks')
      .withIndex('by_stage', (q) => q.eq('stageId', args.stageId))
      .take(100);

    for (const task of tasks) {
      await ctx.db.delete(task._id);
    }

    const contractorLinks = await ctx.db
      .query('stageContractors')
      .withIndex('by_stage', (q) => q.eq('stageId', args.stageId))
      .take(100);
    for (const link of contractorLinks) {
      await ctx.db.delete(link._id);
    }

    await ctx.db.delete(args.stageId);

    const remaining = await ctx.db
      .query('stages')
      .withIndex('by_project_sort', (q) => q.eq('projectId', stage.projectId))
      .take(200);

    for (let i = 0; i < remaining.length; i++) {
      await ctx.db.patch(remaining[i]._id, { sortOrder: i });
    }

    await ctx.db.patch(stage.projectId, {
      currentStageName: remaining[0]?.name ?? 'חדש',
      progressPct: remaining.length
        ? Math.round(remaining.reduce((sum, item) => sum + item.progressPct, 0) / remaining.length)
        : 0,
    });
  },
});

// Mark a stage's payment as awaiting review. Replaces the old generic
// `mutations.update` path, with proper auth + project-membership checks.
export const requestStagePaymentReview = mutation({
  args: { stageId: v.id('stages') },
  handler: async (ctx, args) => {
    const stage = await ctx.db.get(args.stageId);
    if (!stage) {
      throw new Error('Stage not found');
    }
    await requireProjectMember(ctx, stage.projectId);

    await ctx.db.patch(args.stageId, {
      payment: { ...stage.payment, status: 'review_requested' },
    });
  },
});

// Record a supervisor's approval of a stage. The approving name is taken from
// the authenticated user, never trusted from the client.
export const setStageSupervisorApproval = mutation({
  args: { stageId: v.id('stages') },
  handler: async (ctx, args) => {
    const stage = await ctx.db.get(args.stageId);
    if (!stage) {
      throw new Error('Stage not found');
    }
    const { user } = await requireProjectMember(ctx, stage.projectId);

    await ctx.db.patch(args.stageId, {
      supervisorApprovalBy: user?.name ?? user?.email ?? 'מאשר',
      supervisorApprovalAt: new Date().toLocaleDateString('he-IL'),
    });
  },
});
