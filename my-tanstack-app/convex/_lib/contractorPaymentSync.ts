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

// Cascades a contractorPaymentMilestone delete to its attached files (milestone-level
// and per-partial-payment) and any expenses linked from its partial payments, mirroring
// the cleanup already done by deleteContractorPaymentMilestoneFile / deleteContractorPartialPayment.
// Without this, deleting a milestone directly (e.g. from the schedule editor's "delete
// stage" action) leaves orphaned projectFiles/storage rows and dangling expenses behind.
export const deleteMilestoneCascade = async (
  ctx: MutationCtx,
  milestone: {
    _id: Id<'contractorPaymentMilestones'>;
    fileIds?: Id<'projectFiles'>[];
    partialPayments?: { fileIds?: Id<'projectFiles'>[]; expenseId?: string }[];
  },
) => {
  for (const fileId of milestone.fileIds || []) {
    const file = await ctx.db.get(fileId);
    if (file && file.storageId) {
      await ctx.storage.delete(file.storageId);
      await ctx.db.delete(fileId);
    }
  }

  for (const partial of milestone.partialPayments || []) {
    for (const fileId of partial.fileIds || []) {
      const file = await ctx.db.get(fileId);
      if (file && file.storageId) {
        await ctx.storage.delete(file.storageId);
        await ctx.db.delete(fileId);
      }
    }
    if (partial.expenseId) {
      const expense = await ctx.db.get(partial.expenseId as Id<'expenses'>);
      if (expense) {
        await ctx.db.delete(expense._id);
        if (expense.categoryId) {
          const category = await ctx.db.get(expense.categoryId);
          if (category) {
            await ctx.db.patch(category._id, {
              spent: Math.max(0, category.spent - expense.amount),
            });
          }
        }
      }
    }
  }

  await ctx.db.delete(milestone._id);
};

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
      return requiredTasks.map((task, index) => {
        const isSingle = requiredTasks.length === 1;
        return {
          key: `task:${task._id}`,
          sourceStageId: stage._id,
          sourceTaskId: task._id,
          stageSortOrder: stage.sortOrder,
          milestoneSortOrder: index,
          name: isSingle ? stage.name : `${stage.name} - ${task.name}`,
          triggerText: task.name,
          weight: perTaskWeight,
        };
      });
    }
    return [{
      key: `stage:${stage._id}`,
      sourceStageId: stage._id,
      stageSortOrder: stage.sortOrder,
      milestoneSortOrder: 0,
      name: stage.name,
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

  // Budget already committed to milestones outside the stage-weight system
  // (e.g. legacy/imported milestones deliberately kept on a 'custom'
  // stageContractors link) must not be redistributed away. Only the
  // remaining budget should be divided by stage weight among the
  // stage_synced items — otherwise a single stage_synced item ends up
  // claiming the FULL contractor budget even when most of it is already
  // spoken for by custom milestones.
  const customTotal = milestones
    .filter((m) => m.sourceMode !== 'stage_synced')
    .reduce((sum, m) => sum + (m.amount || 0), 0);
  const availablePool = Math.max(0, contractor.budget - customTotal);

  // Each item's own weight (its stage's payment.amount, i.e. what was
  // literally entered for it) is used as-is — NOT stretched to fill the
  // available pool. Weights are only scaled *down* when they collectively
  // exceed the pool, proportionally reducing every item so the total fits.
  // If they add up to less than the pool, that's a genuine gap and is left
  // alone (surfaced via the "unplanned difference" banner) rather than
  // inflating whichever item happens to sort last.
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const needsShrink = totalWeight > availablePool && totalWeight > 0;
  const scale = needsShrink ? availablePool / totalWeight : 1;
  const balancedItems = items.map((item) => {
    const amount = Math.round(item.weight * scale);
    const pct = contractor.budget > 0 ? roundPct((amount / contractor.budget) * 100) : 0;
    return {
      ...item,
      pct,
      // Derived from the stage's own sortOrder (which saveContractorPaymentSchedule
      // sets from the dragged position) rather than a freshly-compacted local index —
      // a compacted 0..n-1 index among stage_synced items alone ignores custom-mode
      // milestones occupying the same sortOrder space under the same contractor,
      // so a drag past/before a custom milestone would keep reverting on resync.
      // milestoneSortOrder is a small fractional tiebreaker for sub-items sharing
      // one stage (multiple stageMilestones/stageTasks under it).
      sortOrder: item.stageSortOrder + item.milestoneSortOrder / 1000,
      amount,
    };
  });

  // When shrinking to fit, correct rounding residue on the last item so the
  // total lands exactly on the available pool. When not shrinking, leave any
  // shortfall as-is — it's a genuine gap, not rounding noise.
  if (needsShrink && balancedItems.length > 0) {
    const last = balancedItems[balancedItems.length - 1];
    const sumAmounts = balancedItems.reduce((sum, item) => sum + item.amount, 0);
    const amountDiff = Math.round(availablePool) - sumAmounts;
    if (amountDiff !== 0) {
      last.amount += amountDiff;
      last.pct = contractor.budget > 0 ? roundPct((last.amount / contractor.budget) * 100) : last.pct;
    }
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
    const hasPartialPayments = milestone.partialPayments && milestone.partialPayments.length > 0;
    const shouldDelete =
      !milestone.paid &&
      !milestone.isLocked &&
      !hasPartialPayments &&
      ((isSynced && !targetKeys.has(key)) || (isCustom && items.length > 0));
    if (shouldDelete) {
      await deleteMilestoneCascade(ctx, milestone);
    }
  }

  for (const item of balancedItems) {
    const existing = existingSyncedByKey.get(itemKey(item));
    if (existing) {
      if (existing.paid) {
        // Paid milestones: protect pct/amount (financial data) but DO update
        // sortOrder so reordering stages is reflected in the UI after a save.
        await ctx.db.patch(existing._id, { sortOrder: item.sortOrder });
      } else {
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
