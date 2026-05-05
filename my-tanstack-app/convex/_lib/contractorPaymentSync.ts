import type { Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';

type DbCtx = MutationCtx | QueryCtx;

type SyncedPaymentItem = {
  key: string;
  sourceStageId: Id<'stages'>;
  sourceStageMilestoneId?: Id<'stageMilestones'>;
  sourceTaskId?: Id<'stageTasks'>;
  stageSortOrder: number;
  milestoneSortOrder: number;
  name: string;
  triggerText: string;
  weight: number;
};

const roundPct = (value: number) => Math.round(value * 100) / 100;

const itemKey = (item: Pick<SyncedPaymentItem, 'sourceStageId' | 'sourceStageMilestoneId' | 'sourceTaskId'>) =>
  item.sourceStageMilestoneId
    ? `milestone:${item.sourceStageMilestoneId}`
    : item.sourceTaskId
      ? `task:${item.sourceTaskId}`
      : `stage:${item.sourceStageId}`;

const milestoneKey = (milestone: {
  sourceStageId?: Id<'stages'>;
  sourceStageMilestoneId?: Id<'stageMilestones'>;
  sourceTaskId?: Id<'stageTasks'>;
}) => milestone.sourceStageMilestoneId
  ? `milestone:${milestone.sourceStageMilestoneId}`
  : milestone.sourceTaskId
    ? `task:${milestone.sourceTaskId}`
    : milestone.sourceStageId
      ? `stage:${milestone.sourceStageId}`
      : '';

export const hasSyncedStageContractorLinks = async (ctx: DbCtx, stageId: Id<'stages'>) => {
  const links = await ctx.db
    .query('stageContractors')
    .withIndex('by_stage', (q) => q.eq('stageId', stageId))
    .take(100);
  return links.some((link) => (link.paymentMode ?? 'stage_synced') === 'stage_synced');
};

const getStagePaymentItems = async (ctx: DbCtx, stageId: Id<'stages'>): Promise<SyncedPaymentItem[]> => {
  const stage = await ctx.db.get(stageId);
  if (!stage) return [];

  const milestones = await ctx.db
    .query('stageMilestones')
    .withIndex('by_stage', (q) => q.eq('stageId', stageId))
    .take(100);

  if (milestones.length === 0) {
    const stageTasks = await ctx.db
      .query('stageTasks')
      .withIndex('by_stage', (q) => q.eq('stageId', stageId))
      .take(200);
    const requiredTasks = stageTasks
      .filter((task) => task.required !== false)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    if (requiredTasks.length > 0) {
      const stagePot = Math.max(0, stage.payment.amount || 0);
      const perTaskWeight = stagePot / requiredTasks.length;
      return requiredTasks.map((task, index) => ({
        key: `task:${task._id}`,
        sourceStageId: stage._id,
        sourceTaskId: task._id,
        stageSortOrder: stage.sortOrder,
        milestoneSortOrder: index,
        name: `${stage.name} - ${task.name}`,
        triggerText: `סיום משימה: ${task.name}`,
        weight: perTaskWeight,
      }));
    }
    return [{
      key: `stage:${stage._id}`,
      sourceStageId: stage._id,
      stageSortOrder: stage.sortOrder,
      milestoneSortOrder: 0,
      name: `סיום ${stage.name}`,
      triggerText: `סיום ואישור שלב ${stage.name}`,
      weight: Math.max(0, stage.payment.amount || 0),
    }];
  }

  return await Promise.all(
    milestones
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(async (milestone): Promise<SyncedPaymentItem> => {
        const taskLink = await ctx.db
          .query('stageMilestoneTasks')
          .withIndex('by_milestone', (q) => q.eq('milestoneId', milestone._id))
          .first();

        return {
          key: `milestone:${milestone._id}`,
          sourceStageId: stage._id,
          sourceStageMilestoneId: milestone._id,
          sourceTaskId: taskLink?.taskId,
          stageSortOrder: stage.sortOrder,
          milestoneSortOrder: milestone.sortOrder,
          name: `${stage.name} - ${milestone.name}`,
          triggerText: `לפי שלב ${stage.name}: ${milestone.name}`,
          weight: Math.max(0, milestone.amount || 0),
        };
      }),
  );
};

export const getContractorSyncedPaymentItems = async (
  ctx: DbCtx,
  contractorId: Id<'contractors'>,
) => {
  const links = await ctx.db
    .query('stageContractors')
    .withIndex('by_contractor', (q) => q.eq('contractorId', contractorId))
    .take(200);
  const syncedLinks = links.filter((link) => (link.paymentMode ?? 'stage_synced') === 'stage_synced');

  const items = [];
  for (const link of syncedLinks) {
    items.push(...await getStagePaymentItems(ctx, link.stageId));
  }

  return items.sort((a, b) =>
    a.stageSortOrder - b.stageSortOrder ||
    a.milestoneSortOrder - b.milestoneSortOrder,
  );
};

export const getSyncedPaymentReadiness = async (
  ctx: DbCtx,
  milestone: {
    sourceMode?: 'stage_synced' | 'custom';
    sourceStageId?: Id<'stages'>;
    sourceStageMilestoneId?: Id<'stageMilestones'>;
    sourceTaskId?: Id<'stageTasks'>;
  },
) => {
  if (milestone.sourceMode !== 'stage_synced') {
    return { ready: true, reason: null as string | null };
  }

  if (!milestone.sourceStageId) {
    return { ready: false, reason: 'חסר קישור לשלב המקור' };
  }

  const stage = await ctx.db.get(milestone.sourceStageId);
  if (!stage) {
    return { ready: false, reason: 'שלב המקור לא נמצא' };
  }

  if (milestone.sourceTaskId && !milestone.sourceStageMilestoneId) {
    const task = await ctx.db.get(milestone.sourceTaskId);
    if (!task) {
      return { ready: false, reason: 'משימת המקור לא נמצאה' };
    }
    if (!task.done) {
      return { ready: false, reason: 'המשימה עדיין לא בוצעה' };
    }
    return { ready: true, reason: null };
  }

  if (milestone.sourceStageMilestoneId) {
    const stageMilestone = await ctx.db.get(milestone.sourceStageMilestoneId);
    if (!stageMilestone) {
      return { ready: false, reason: 'אבן דרך המקור לא נמצאה' };
    }

    const taskLinks = await ctx.db
      .query('stageMilestoneTasks')
      .withIndex('by_milestone', (q) => q.eq('milestoneId', milestone.sourceStageMilestoneId!))
      .take(100);
    const taskIds = taskLinks.map((link) => link.taskId);
    if (taskIds.length === 0 && milestone.sourceTaskId) {
      taskIds.push(milestone.sourceTaskId);
    }

    if (taskIds.length > 0) {
      const tasks = [];
      for (const taskId of taskIds) {
        const task = await ctx.db.get(taskId);
        if (task) tasks.push(task);
      }
      const missing = tasks.filter((task) => task.required !== false && !task.done).length;
      if (missing > 0) {
        return { ready: false, reason: `חסרות ${missing} משימות` };
      }
      return { ready: true, reason: null };
    }
  }

  const stageTasks = await ctx.db
    .query('stageTasks')
    .withIndex('by_stage', (q) => q.eq('stageId', milestone.sourceStageId!))
    .take(100);
  const requiredTasks = stageTasks.filter((task) => task.required !== false);
  const missing = requiredTasks.filter((task) => !task.done).length;
  if (missing > 0) {
    return { ready: false, reason: `חסרות ${missing} משימות בשלב` };
  }
  if (stage.status !== 'done' && stage.progressPct < 100) {
    return { ready: false, reason: 'השלב עדיין לא הושלם' };
  }

  return { ready: true, reason: null };
};

export const syncContractorStagePayments = async (
  ctx: MutationCtx,
  contractorId: Id<'contractors'>,
) => {
  const contractor = await ctx.db.get(contractorId);
  if (!contractor) return { synced: 0 };

  const items = await getContractorSyncedPaymentItems(ctx, contractorId);
  const milestones = await ctx.db
    .query('contractorPaymentMilestones')
    .withIndex('by_contractor', (q) => q.eq('contractorId', contractorId))
    .take(200);

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const balancedItems = items.map((item, index) => {
    const pct = totalWeight > 0
      ? roundPct((item.weight / totalWeight) * 100)
      : roundPct(100 / Math.max(1, items.length));
    return {
      ...item,
      pct,
      sortOrder: index,
      amount: Math.round((contractor.budget * pct) / 100),
    };
  });

  const pctTotal = balancedItems.reduce((sum, item) => sum + item.pct, 0);
  if (balancedItems.length > 0 && pctTotal !== 100) {
    const last = balancedItems[balancedItems.length - 1];
    last.pct = roundPct(last.pct + (100 - pctTotal));
    last.amount = Math.round((contractor.budget * last.pct) / 100);
  }

  const targetKeys = new Set(balancedItems.map(itemKey));
  const existingSyncedByKey = new Map(
    milestones
      .filter((milestone) => milestone.sourceMode === 'stage_synced')
      .map((milestone) => [milestoneKey(milestone), milestone]),
  );

  for (const milestone of milestones) {
    const key = milestoneKey(milestone);
    const isSynced = milestone.sourceMode === 'stage_synced';
    const isCustom = milestone.sourceMode !== 'stage_synced';
    const shouldDelete =
      !milestone.paid &&
      ((isSynced && !targetKeys.has(key)) || (isCustom && items.length > 0));
    if (shouldDelete) {
      await ctx.db.delete(milestone._id);
    }
  }

  for (const item of balancedItems) {
    const existing = existingSyncedByKey.get(itemKey(item));
    if (existing) {
      if (!existing.paid) {
        await ctx.db.patch(existing._id, {
          sortOrder: item.sortOrder,
          name: item.name,
          triggerText: item.triggerText,
          pct: item.pct,
          amount: item.amount,
          sourceMode: 'stage_synced',
          sourceStageId: item.sourceStageId,
          sourceStageMilestoneId: item.sourceStageMilestoneId,
          sourceTaskId: item.sourceTaskId,
        });
      }
      continue;
    }

    await ctx.db.insert('contractorPaymentMilestones', {
      contractorId,
      sortOrder: item.sortOrder,
      name: item.name,
      triggerText: item.triggerText,
      pct: item.pct,
      amount: item.amount,
      paid: false,
      sourceMode: 'stage_synced',
      sourceStageId: item.sourceStageId,
      sourceStageMilestoneId: item.sourceStageMilestoneId,
      sourceTaskId: item.sourceTaskId,
    });
  }

  return { synced: balancedItems.length };
};

export const syncStageLinkedContractorPayments = async (
  ctx: MutationCtx,
  stageId: Id<'stages'>,
) => {
  const links = await ctx.db
    .query('stageContractors')
    .withIndex('by_stage', (q) => q.eq('stageId', stageId))
    .take(100);
  const contractorIds = new Set(
    links
      .filter((link) => (link.paymentMode ?? 'stage_synced') === 'stage_synced')
      .map((link) => link.contractorId),
  );

  for (const contractorId of contractorIds) {
    await syncContractorStagePayments(ctx, contractorId);
  }
};
