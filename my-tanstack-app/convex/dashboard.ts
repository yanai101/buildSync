import { query } from './_generated/server';
import { v } from 'convex/values';
import { getFinancialSummary } from './_lib/financialSummary';

export const getOverview = query({
  args: {
    projectId: v.id('projects'),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      return null;
    }

    const [stages, budgetCategories, recentActivity, projectAlerts, orders] = await Promise.all([
      ctx.db
        .query('stages')
        .withIndex('by_project_sort', (q) => q.eq('projectId', args.projectId))
        .collect(),
      ctx.db
        .query('budgetCategories')
        .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
        .collect(),
      ctx.db
        .query('activityFeed')
        .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
        .order('desc')
        .take(4),
      ctx.db
        .query('projectAlerts')
        .withIndex('by_project_read', (q) => q.eq('projectId', args.projectId).eq('isRead', false))
        .order('desc')
        .take(5),
      ctx.db
        .query('orders')
        .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
        .collect(),
    ]);

    const activeStage =
      stages.find((stage) => stage.status === 'active') ??
      stages.find((stage) => stage.status === 'pending') ??
      null;
    const doneStages = stages.filter((stage) => stage.status === 'done').length;
    const financialSummary = await getFinancialSummary(ctx, project);
    const stageMilestonesByStage = await Promise.all(
      stages.map(async (stage) => {
        const milestones = await ctx.db
          .query('stageMilestones')
          .withIndex('by_stage', (q) => q.eq('stageId', stage._id))
          .take(100);
        const contractorLinks = await ctx.db
          .query('stageContractors')
          .withIndex('by_stage', (q) => q.eq('stageId', stage._id))
          .take(100);
        const hasSyncedContractor = contractorLinks.some((link) => (link.paymentMode ?? 'stage_synced') === 'stage_synced');
        return { stage, milestones, hasSyncedContractor };
      }),
    );
    const stagePaidTotal = stageMilestonesByStage.reduce((sum, { stage, milestones, hasSyncedContractor }) => {
      if (hasSyncedContractor) {
        return sum;
      }
      if (milestones.length > 0) {
        return sum + milestones
          .filter((milestone) => milestone.status === 'paid')
          .reduce((milestoneSum, milestone) => milestoneSum + milestone.amount, 0);
      }
      return sum + (stage.payment.status === 'paid' ? stage.payment.amount : 0);
    }, 0);
    const topOverruns = budgetCategories
      .filter((category) => category.spent > category.budget)
      .sort((left, right) => right.spent - right.budget - (left.spent - left.budget))
      .slice(0, 3)
      .map((category) => ({
        id: category._id,
        name: category.name,
        overrun: category.spent - category.budget,
      }));

    // Generate Dynamic Alerts for Stages and Orders
    const today = new Date();
    // Offset by +3 hours for Israel time roughly, to ensure dates align correctly in the evening
    today.setHours(today.getHours() + 3);
    const todayStr = today.toISOString().split('T')[0];
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const dynamicAlerts: any[] = [];

    stages.forEach(stage => {
      if (stage.status !== 'done') {
        if (stage.endDate < todayStr) {
          dynamicAlerts.push({
            id: `stage-overdue-${stage._id}`,
            type: 'danger',
            text: `באיחור: שלב "${stage.name}" היה אמור להסתיים ב-${stage.endDate} וטרם הושלם.`,
            dateLabel: 'עבר',
            createdAt: Date.now(),
            isDynamic: true,
            link: `/timeline`,
            actionText: 'עדכן שלב',
          });
        } else if (stage.endDate === todayStr) {
          dynamicAlerts.push({
            id: `stage-today-${stage._id}`,
            type: 'warning',
            text: `שלב "${stage.name}" אמור להסתיים היום וטרם סומן כמושלם.`,
            dateLabel: 'היום',
            createdAt: Date.now(),
            isDynamic: true,
            link: `/timeline`,
            actionText: 'עדכן שלב',
          });
        } else if (stage.endDate === tomorrowStr) {
          dynamicAlerts.push({
            id: `stage-tomorrow-${stage._id}`,
            type: 'warning',
            text: `שלב "${stage.name}" מסתיים מחר וטרם סומן כמושלם.`,
            dateLabel: 'מחר',
            createdAt: Date.now(),
            isDynamic: true,
            link: `/timeline`,
            actionText: 'עדכן שלב',
          });
        }
      }
    });

    orders.forEach(order => {
      if (order.status !== 'completed') {
        if (order.expectedDeliveryDate && order.expectedDeliveryDate < todayStr) {
          dynamicAlerts.push({
            id: `order-overdue-${order._id}`,
            type: 'danger',
            text: `איחור באספקה: סחורה "${order.title}" הייתה אמורה להגיע ב-${order.expectedDeliveryDate}.`,
            dateLabel: 'עבר',
            createdAt: Date.now(),
            isDynamic: true,
            link: `/orders`,
            actionText: 'בדוק הזמנה',
          });
        } else if (order.expectedDeliveryDate === todayStr) {
          dynamicAlerts.push({
            id: `order-today-${order._id}`,
            type: 'info',
            text: `סחורה צפויה להגיע היום: ${order.title}`,
            dateLabel: 'היום',
            createdAt: Date.now(),
            isDynamic: true,
            link: `/orders`,
            actionText: 'עדכן סטטוס',
          });
        } else if (order.expectedDeliveryDate === tomorrowStr) {
          dynamicAlerts.push({
            id: `order-tomorrow-${order._id}`,
            type: 'info',
            text: `סחורה צפויה להגיע מחר: ${order.title}`,
            dateLabel: 'מחר',
            createdAt: Date.now(),
            isDynamic: true,
            link: `/orders`,
            actionText: 'עדכן סטטוס',
          });
        }
      }
    });

    return {
      project,
      stats: {
        ...financialSummary,
        stagePaidTotal,
        doneStages,
        totalStages: stages.length,
      },
      stages: stages.map((stage) => ({
        id: stage._id,
        name: stage.name,
        progressPct: stage.progressPct,
        status: stage.status,
      })),
      currentStage: activeStage
        ? {
            id: activeStage._id,
            name: activeStage.name,
            progressPct: activeStage.progressPct,
            status: activeStage.status,
          }
        : null,
      topOverruns,
      recentActivity: recentActivity.map((item) => ({
        id: item._id,
        actorName: item.actorName,
        role: item.role,
        text: item.text,
        createdAt: item.createdAt,
      })),
      alerts: [...dynamicAlerts, ...projectAlerts.map((alert) => ({
        id: alert._id,
        type: alert.type,
        text: alert.text,
        dateLabel: alert.dateLabel || 'היום',
        createdAt: alert.createdAt,
        isDynamic: false,
      }))].sort((a, b) => {
        const order = { danger: 0, warning: 1, info: 2 };
        return order[a.type as keyof typeof order] - order[b.type as keyof typeof order];
      }),
    };
  },
});

import { mutation } from './_generated/server';

export const seedAlert = mutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    await ctx.db.insert('projectAlerts', {
      projectId: args.projectId,
      type: 'warning',
      text: 'טיח חוץ לא הושלם - סיכון גשמי חורף',
      isRead: false,
      dateLabel: 'היום',
      createdAt: Date.now(),
    });
  },
});

export const deleteAlert = mutation({
  args: { alertId: v.id('projectAlerts') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.alertId);
  },
});

export const deleteAllAlerts = mutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const alerts = await ctx.db
      .query('projectAlerts')
      .withIndex('by_project_read', (q) => q.eq('projectId', args.projectId))
      .collect();
    
    for (const alert of alerts) {
      await ctx.db.delete(alert._id);
    }
  },
});
