import { mutation, query } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';
import { insertActivity } from './_lib/activity';
import { patchStageDatesWithCascade } from './_lib/stageSchedule';

export const list = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const stages = await ctx.db
      .query('stages')
      .withIndex('by_project_sort', (q) => q.eq('projectId', args.projectId))
      .collect();

    const tasks = await ctx.db
      .query('stageTasks')
      .collect(); // In production, filter by stage IDs

    return stages.map(s => ({
      ...s,
      id: Number(s.sortOrder), // Map to legacy ID if needed
      progress: s.progressPct,
      tasks: tasks
        .filter(t => t.stageId === s._id)
        .map(t => ({
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
  startDate: v.string(),
  endDate: v.string(),
  dependsOnPrevious: v.optional(v.boolean()),
  amount: v.number(),
  paymentAtEnd: v.optional(v.boolean()),
  tasks: v.array(taskTemplateValidator),
  milestones: v.array(milestoneTemplateValidator),
});

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
      const stage = args.stages[i];
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
    }

    for (let i = 0; i < args.stages.length; i++) {
      const stage = args.stages[i];
      const stageId = await ctx.db.insert('stages', {
        projectId: args.projectId,
        legacyId: stage.legacyId,
        sortOrder: i,
        name: stage.name.trim(),
        ...(stage.icon ? { icon: stage.icon } : {}),
        status: 'pending',
        progressPct: 0,
        startDate: stage.startDate,
        endDate: stage.endDate,
        dependsOnPrevious: i > 0 && Boolean(stage.dependsOnPrevious),
        ...(stage.contractorRole ? { contractorRole: stage.contractorRole } : {}),
        payment: {
          amount: stage.amount,
          status: 'draft',
        },
      });

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
    }

    await ctx.db.patch(args.projectId, {
      currentStageName: args.stages[0].name.trim(),
      progressPct: 0,
    });

    return { created: args.stages.length };
  },
});

export const updateStageDetails = mutation({
  args: {
    stageId: v.id('stages'),
    name: v.string(),
    contractorRole: v.optional(v.string()),
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
        ...(args.contractorRole ? { contractorRole: args.contractorRole } : {}),
        dependsOnPrevious: stage.sortOrder > 0 && Boolean(args.dependsOnPrevious),
        payment: {
          ...stage.payment,
          amount: args.amount,
        },
      },
    });

    return { updatedStages };
  },
});

export const updateStageAdvanced = mutation({
  args: {
    stageId: v.id('stages'),
    name: v.string(),
    contractorRole: v.optional(v.string()),
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
        ...(args.contractorRole ? { contractorRole: args.contractorRole } : {}),
        dependsOnPrevious: stage.sortOrder > 0 && Boolean(args.dependsOnPrevious),
        payment: {
          ...stage.payment,
          amount: args.amount,
        },
      },
    });

    // 1. Sync tasks
    const existingTasks = await ctx.db
      .query('stageTasks')
      .withIndex('by_stage', (q) => q.eq('stageId', args.stageId))
      .collect();

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
    const existingMilestones = await ctx.db
      .query('stageMilestones')
      .withIndex('by_stage', (q) => q.eq('stageId', args.stageId))
      .collect();

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

    return { updatedStages };
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

    await ctx.db.patch(args.stageId, {
      payment: {
        ...stage.payment,
        status: args.paid ? 'paid' : 'draft',
        paidAt: args.paid ? new Date().toISOString().slice(0, 10) : undefined,
        ...(args.receipts && args.receipts.length > 0 ? { receipts: args.receipts } : {}),
      },
    });

    if (args.paid) {
      await insertActivity(ctx, {
        projectId: stage.projectId,
        text: `בוצע תשלום סופי עבור שלב: ${stage.name} בסך ${stage.payment.amount} ₪`,
      });
      
      // Create expense
      const category = await ctx.db
        .query('budgetCategories')
        .withIndex('by_project', (q) => q.eq('projectId', stage.projectId))
        .filter(q => q.eq(q.field('name'), stage.name))
        .first();

      const expenseId = await ctx.db.insert('expenses', {
        projectId: stage.projectId,
        description: `תשלום שלב: ${stage.name}`,
        amount: stage.payment.amount,
        expenseDate: new Date().toISOString().slice(0, 10),
        status: 'שולם',
        categoryId: category?._id,
      });

      if (category) {
        await ctx.db.patch(category._id, {
          spent: category.spent + stage.payment.amount,
        });
      }
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

    await ctx.db.patch(args.milestoneId, {
      status: args.paid ? 'paid' : 'draft',
      paidAt: args.paid ? new Date().toISOString().slice(0, 10) : undefined,
      ...(args.receipts && args.receipts.length > 0 ? { receipts: args.receipts } : {}),
    });

    if (args.paid) {
      await insertActivity(ctx, {
        projectId: stage.projectId,
        text: `בוצע תשלום אבן דרך "${milestone.name}" בשלב ${stage.name} בסך ${milestone.amount} ₪`,
      });

      // Create expense
      const category = await ctx.db
        .query('budgetCategories')
        .withIndex('by_project', (q) => q.eq('projectId', stage.projectId))
        .filter(q => q.eq(q.field('name'), stage.name))
        .first();

      const expenseId = await ctx.db.insert('expenses', {
        projectId: stage.projectId,
        description: `תשלום אבן דרך: ${milestone.name} (${stage.name})`,
        amount: milestone.amount,
        expenseDate: new Date().toISOString().slice(0, 10),
        status: 'שולם',
        categoryId: category?._id,
      });

      if (category) {
        await ctx.db.patch(category._id, {
          spent: category.spent + milestone.amount,
        });
      }
    }
  },
});

export const deleteStage = mutation({
  args: { stageId: v.id('stages') },
  handler: async (ctx, args) => {
    const stage = await ctx.db.get(args.stageId);
    if (!stage) {
      throw new Error('Stage not found');
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
