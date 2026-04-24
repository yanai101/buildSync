import { query } from './_generated/server';
import { v } from 'convex/values';

export const getOverview = query({
  args: {
    projectId: v.id('projects'),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      return null;
    }

    const [stages, budgetCategories, recentActivity] = await Promise.all([
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
    ]);

    const activeStage =
      stages.find((stage) => stage.status === 'active') ??
      stages.find((stage) => stage.status === 'pending') ??
      null;
    const doneStages = stages.filter((stage) => stage.status === 'done').length;
    const categoryBudget = budgetCategories.reduce((sum, category) => sum + category.budget, 0);
    const totalBudget = categoryBudget > 0 ? categoryBudget : (project.budgetTotal || 0);
    const budgetCategorySpent = budgetCategories.reduce((sum, category) => sum + category.spent, 0);
    const stageMilestonesByStage = await Promise.all(
      stages.map(async (stage) => {
        const milestones = await ctx.db
          .query('stageMilestones')
          .withIndex('by_stage', (q) => q.eq('stageId', stage._id))
          .take(100);
        return { stage, milestones };
      }),
    );
    const stagePaidTotal = stageMilestonesByStage.reduce((sum, { stage, milestones }) => {
      if (milestones.length > 0) {
        return sum + milestones
          .filter((milestone) => milestone.status === 'paid')
          .reduce((milestoneSum, milestone) => milestoneSum + milestone.amount, 0);
      }
      return sum + (stage.payment.status === 'paid' ? stage.payment.amount : 0);
    }, 0);
    const totalSpent = budgetCategorySpent + stagePaidTotal;
    const remainingBudget = totalBudget - totalSpent - (project.committed || 0);
    const topOverruns = budgetCategories
      .filter((category) => category.spent > category.budget)
      .sort((left, right) => right.spent - right.budget - (left.spent - left.budget))
      .slice(0, 3)
      .map((category) => ({
        id: category._id,
        name: category.name,
        overrun: category.spent - category.budget,
      }));

    return {
      project,
      stats: {
        totalBudget,
        totalSpent,
        stagePaidTotal,
        remainingBudget,
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
    };
  },
});
