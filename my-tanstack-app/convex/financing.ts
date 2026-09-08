import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { requireProjectOwner } from './_lib/projectAccess';
import { getFinancialSummary } from './_lib/financialSummary';
import { zodToConvex } from 'convex-helpers/server/zod3';
import {
  zFundingSourceType,
  zMortgageDetails,
  zMortgageDrawStatus,
} from './zodSchemas';
import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeSourceSummary(source: any, totalReceivedForSource: number) {
  const expectedTotal: number =
    source.type === 'mortgage'
      ? (source.mortgageDetails?.totalApprovedAmount ?? 0)
      : (source.plannedAmount ?? 0);
  const remainingExpected = Math.max(0, expectedTotal - totalReceivedForSource);
  return { totalReceived: totalReceivedForSource, expectedTotal, remainingExpected };
}

async function requireSourceOwner(ctx: MutationCtx, sourceId: Id<'fundingSources'>) {
  const source = await ctx.db.get(sourceId);
  if (!source) throw new Error('מקור מימון לא נמצא');
  await requireProjectOwner(ctx, source.projectId);
  return source;
}

async function requireTransactionOwner(ctx: MutationCtx, txId: Id<'fundingTransactions'>) {
  const tx = await ctx.db.get(txId);
  if (!tx) throw new Error('תנועת מימון לא נמצאה');
  await requireProjectOwner(ctx, tx.projectId);
  return tx;
}

async function requireDrawOwner(ctx: MutationCtx, drawId: Id<'mortgageDraws'>) {
  const draw = await ctx.db.get(drawId);
  if (!draw) throw new Error('משיכת משכנתא לא נמצאה');
  await requireProjectOwner(ctx, draw.projectId);
  return draw;
}

async function createTransactionForDraw(
  ctx: MutationCtx,
  draw: any,
  drawId: Id<'mortgageDraws'>,
) {
  const txId = await ctx.db.insert('fundingTransactions', {
    projectId: draw.projectId,
    fundingSourceId: draw.fundingSourceId,
    amount: draw.amount,
    date: draw.actualDrawDate ?? new Date().toISOString().split('T')[0],
    notes: draw.notes,
    reference: draw.bankReference,
    mortgageDrawId: drawId,
  });
  await ctx.db.patch(drawId, { fundingTransactionId: txId });
  return txId;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export const getFundingSummary = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId);
    const project = await ctx.db.get(args.projectId);
    if (!project) return null;

    const [sources, allTransactions, allDraws, financialSummary] = await Promise.all([
      ctx.db.query('fundingSources').withIndex('by_project', (q) => q.eq('projectId', args.projectId)).collect(),
      ctx.db.query('fundingTransactions').withIndex('by_project', (q) => q.eq('projectId', args.projectId)).collect(),
      ctx.db.query('mortgageDraws').withIndex('by_project', (q) => q.eq('projectId', args.projectId)).collect(),
      getFinancialSummary(ctx, project),
    ]);

    const txBySource = new Map<string, typeof allTransactions>();
    for (const tx of allTransactions) {
      if (!txBySource.has(tx.fundingSourceId)) txBySource.set(tx.fundingSourceId, []);
      txBySource.get(tx.fundingSourceId)!.push(tx);
    }

    const drawsBySource = new Map<string, typeof allDraws>();
    for (const draw of allDraws) {
      if (!drawsBySource.has(draw.fundingSourceId)) drawsBySource.set(draw.fundingSourceId, []);
      drawsBySource.get(draw.fundingSourceId)!.push(draw);
    }

    const sourcesWithSummary = sources.map((source) => {
      const sourceTxs = txBySource.get(source._id) ?? [];
      const totalReceivedForSource = sourceTxs.reduce((s, t) => s + t.amount, 0);
      const summary = computeSourceSummary(source, totalReceivedForSource);

      let mortgageSummary: object | undefined = undefined;
      if (source.type === 'mortgage') {
        const sourceDraws = drawsBySource.get(source._id) ?? [];
        const receivedDraws = sourceDraws.filter((d) => d.status === 'received')
          .sort((a, b) => (a.actualDrawDate ?? '').localeCompare(b.actualDrawDate ?? ''));
        const plannedDraws = sourceDraws.filter((d) => d.status === 'planned')
          .sort((a, b) => (a.targetProgressPct ?? 0) - (b.targetProgressPct ?? 0));
        mortgageSummary = {
          draws: [...receivedDraws, ...plannedDraws],
          nextPlannedDraw: plannedDraws[0] ?? null,
        };
      }

      return { ...source, ...summary, mortgageSummary };
    });

    const totalFundingReceived = allTransactions.reduce((s, t) => s + t.amount, 0);
    // Per-source remaining (planned draws do NOT add to this — already in expectedTotal)
    const totalPlannedFunding = sourcesWithSummary.reduce((s, src) => s + (src as any).remainingExpected, 0);
    const totalProjectExpenses = financialSummary.totalSpent;
    const availableFunding = totalFundingReceived - totalProjectExpenses;
    const projectBudget = financialSummary.totalBudget;
    const totalExpectedFunding = totalFundingReceived + totalPlannedFunding;
    const projectFundingGap = projectBudget - totalExpectedFunding; // NOT clamped

    return {
      sources: sourcesWithSummary,
      totalFundingReceived,
      totalPlannedFunding,
      totalProjectExpenses,
      availableFunding,
      projectBudget,
      totalExpectedFunding,
      projectFundingGap,
    };
  },
});

export const listSources = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId);
    return ctx.db.query('fundingSources').withIndex('by_project', (q) => q.eq('projectId', args.projectId)).collect();
  },
});

export const listTransactions = query({
  args: { fundingSourceId: v.id('fundingSources') },
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.fundingSourceId);
    if (!source) return [];
    await requireProjectOwner(ctx, source.projectId);
    return ctx.db.query('fundingTransactions').withIndex('by_source', (q) => q.eq('fundingSourceId', args.fundingSourceId)).collect();
  },
});

export const listDraws = query({
  args: { fundingSourceId: v.id('fundingSources') },
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.fundingSourceId);
    if (!source) return [];
    await requireProjectOwner(ctx, source.projectId);
    return ctx.db.query('mortgageDraws').withIndex('by_source', (q) => q.eq('fundingSourceId', args.fundingSourceId)).collect();
  },
});

// ── FundingSource Mutations ───────────────────────────────────────────────────

export const createFundingSource = mutation({
  args: {
    projectId: v.id('projects'),
    name: v.string(),
    type: zodToConvex(zFundingSourceType),
    plannedAmount: v.optional(v.number()),
    notes: v.optional(v.string()),
    mortgageDetails: v.optional(zodToConvex(zMortgageDetails)),
    projectFileId: v.optional(v.id('projectFiles')),
    fileUrl: v.optional(v.string()),
    fileName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId);
    return ctx.db.insert('fundingSources', {
      projectId: args.projectId,
      name: args.name,
      type: args.type,
      plannedAmount: args.plannedAmount,
      notes: args.notes,
      mortgageDetails: args.mortgageDetails,
      projectFileId: args.projectFileId,
      fileUrl: args.fileUrl,
      fileName: args.fileName,
    });
  },
});

export const updateFundingSource = mutation({
  args: {
    sourceId: v.id('fundingSources'),
    name: v.optional(v.string()),
    plannedAmount: v.optional(v.number()),
    notes: v.optional(v.string()),
    mortgageDetails: v.optional(zodToConvex(zMortgageDetails)),
    projectFileId: v.optional(v.union(v.id('projectFiles'), v.null())),
    fileUrl: v.optional(v.union(v.string(), v.null())),
    fileName: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { sourceId, ...patch } = args;
    await requireSourceOwner(ctx, sourceId);
    // Convex DB patch strips undefined but we might want to unset a file,
    // so we handle null values correctly (by setting them to undefined if that's what schema expects, wait, schema is optional so we can just let convex delete it if we pass undefined, but we need a way to delete).
    // Actually we'll just pass the patch. Convex allows undefined to unset optional fields if you use `db.replace` or explicitly pass undefined. 
    // Wait, the schema uses `.optional()`. We can patch with undefined to delete.
    const cleanPatch: any = { ...patch };
    if (cleanPatch.projectFileId === null) cleanPatch.projectFileId = undefined;
    if (cleanPatch.fileUrl === null) cleanPatch.fileUrl = undefined;
    if (cleanPatch.fileName === null) cleanPatch.fileName = undefined;
    await ctx.db.patch(sourceId, cleanPatch);
  },
});

export const deleteFundingSource = mutation({
  args: { sourceId: v.id('fundingSources') },
  handler: async (ctx, args) => {
    const source = await requireSourceOwner(ctx, args.sourceId);
    const draws = await ctx.db.query('mortgageDraws').withIndex('by_source', (q) => q.eq('fundingSourceId', args.sourceId)).collect();
    for (const draw of draws) {
      if (draw.fundingTransactionId) await ctx.db.delete(draw.fundingTransactionId);
      await ctx.db.delete(draw._id);
    }
    const txs = await ctx.db.query('fundingTransactions').withIndex('by_source', (q) => q.eq('fundingSourceId', args.sourceId)).collect();
    for (const tx of txs) await ctx.db.delete(tx._id);

    if (source.projectFileId) {
      const file = await ctx.db.get(source.projectFileId);
      if (file) {
        try { await ctx.storage.delete(file.storageId); } catch {}
        await ctx.db.delete(file._id);
      }
    }

    await ctx.db.delete(args.sourceId);
  },
});

// ── FundingTransaction Mutations ─────────────────────────────────────────────

export const createFundingTransaction = mutation({
  args: {
    fundingSourceId: v.id('fundingSources'),
    amount: v.number(),
    date: v.string(),
    notes: v.optional(v.string()),
    reference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const source = await requireSourceOwner(ctx, args.fundingSourceId);
    if (source.type === 'mortgage') {
      throw new Error('תנועות מימון למשכנתא מתווספות דרך "הוסף משיכה". אין להוסיף תנועה ישירה.');
    }
    return ctx.db.insert('fundingTransactions', {
      projectId: source.projectId,
      fundingSourceId: args.fundingSourceId,
      amount: args.amount,
      date: args.date,
      notes: args.notes,
      reference: args.reference,
    });
  },
});

export const updateFundingTransaction = mutation({
  args: {
    transactionId: v.id('fundingTransactions'),
    amount: v.optional(v.number()),
    date: v.optional(v.string()),
    notes: v.optional(v.string()),
    reference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tx = await requireTransactionOwner(ctx, args.transactionId);
    if (tx.mortgageDrawId) throw new Error('יש לערוך את התנועה דרך משיכת המשכנתא המקושרת');
    const { transactionId, ...patch } = args;
    await ctx.db.patch(transactionId, patch);
  },
});

export const deleteFundingTransaction = mutation({
  args: { transactionId: v.id('fundingTransactions') },
  handler: async (ctx, args) => {
    const tx = await requireTransactionOwner(ctx, args.transactionId);
    if (tx.mortgageDrawId) throw new Error('יש למחוק את התנועה דרך משיכת המשכנתא המקושרת');
    await ctx.db.delete(args.transactionId);
  },
});

// ── MortgageDraw Mutations ────────────────────────────────────────────────────

export const createMortgageDraw = mutation({
  args: {
    fundingSourceId: v.id('fundingSources'),
    status: zodToConvex(zMortgageDrawStatus),
    amount: v.number(),
    actualDrawDate: v.optional(v.string()),
    actualProgressPct: v.optional(v.number()),
    bankReference: v.optional(v.string()),
    expectedDate: v.optional(v.string()),
    targetProgressPct: v.optional(v.number()),
    stageId: v.optional(v.id('stages')),
    estimatedExpensesUntilDraw: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const source = await requireSourceOwner(ctx, args.fundingSourceId);
    if (source.type !== 'mortgage') {
      throw new Error('משיכות משכנתא ניתן ליצור רק עבור מקורות מסוג משכנתא');
    }
    if (args.stageId) {
      const stage = await ctx.db.get(args.stageId);
      if (!stage || stage.projectId !== source.projectId) throw new Error('שלב הבנייה לא שייך לפרויקט זה');
    }
    const drawId = await ctx.db.insert('mortgageDraws', {
      projectId: source.projectId,
      fundingSourceId: args.fundingSourceId,
      status: args.status,
      amount: args.amount,
      actualDrawDate: args.actualDrawDate,
      actualProgressPct: args.actualProgressPct,
      bankReference: args.bankReference,
      expectedDate: args.expectedDate,
      targetProgressPct: args.targetProgressPct,
      stageId: args.stageId,
      estimatedExpensesUntilDraw: args.estimatedExpensesUntilDraw,
      notes: args.notes,
    });
    if (args.status === 'received') {
      const draw = await ctx.db.get(drawId);
      await createTransactionForDraw(ctx, draw, drawId);
    }
    return drawId;
  },
});

export const updateMortgageDraw = mutation({
  args: {
    drawId: v.id('mortgageDraws'),
    status: v.optional(zodToConvex(zMortgageDrawStatus)),
    amount: v.optional(v.number()),
    actualDrawDate: v.optional(v.string()),
    actualProgressPct: v.optional(v.number()),
    bankReference: v.optional(v.string()),
    expectedDate: v.optional(v.string()),
    targetProgressPct: v.optional(v.number()),
    stageId: v.optional(v.id('stages')),
    estimatedExpensesUntilDraw: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const draw = await requireDrawOwner(ctx, args.drawId);
    const source = await ctx.db.get(draw.fundingSourceId);
    if (!source || source.type !== 'mortgage') throw new Error('משיכה שייכת למקור שאינו משכנתא');
    if (args.stageId) {
      const stage = await ctx.db.get(args.stageId);
      if (!stage || stage.projectId !== draw.projectId) throw new Error('שלב הבנייה לא שייך לפרויקט זה');
    }

    const { drawId, status, ...rest } = args;
    const newStatus = status ?? draw.status;
    const oldStatus = draw.status;
    const patch: Record<string, any> = { ...rest };
    if (status !== undefined) patch.status = status;

    if (oldStatus === 'planned' && newStatus === 'received') {
      await ctx.db.patch(drawId, patch);
      const updatedDraw = await ctx.db.get(drawId);
      await createTransactionForDraw(ctx, updatedDraw, drawId);
      return;
    }

    if (oldStatus === 'received' && newStatus === 'planned') {
      if (draw.fundingTransactionId) {
        await ctx.db.delete(draw.fundingTransactionId);
        patch.fundingTransactionId = undefined;
      }
      await ctx.db.patch(drawId, patch);
      return;
    }

    await ctx.db.patch(drawId, patch);
    if (draw.status === 'received' && draw.fundingTransactionId) {
      const txPatch: Record<string, any> = {};
      if (args.amount !== undefined)        txPatch.amount = args.amount;
      if (args.actualDrawDate !== undefined) txPatch.date = args.actualDrawDate;
      if (args.bankReference !== undefined)  txPatch.reference = args.bankReference;
      if (args.notes !== undefined)          txPatch.notes = args.notes;
      if (Object.keys(txPatch).length > 0) await ctx.db.patch(draw.fundingTransactionId, txPatch);
    }
  },
});

export const deleteMortgageDraw = mutation({
  args: { drawId: v.id('mortgageDraws') },
  handler: async (ctx, args) => {
    const draw = await requireDrawOwner(ctx, args.drawId);
    if (draw.fundingTransactionId) await ctx.db.delete(draw.fundingTransactionId);
    await ctx.db.delete(args.drawId);
  },
});
