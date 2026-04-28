import type { Id } from '../_generated/dataModel';
import type { QueryCtx } from '../_generated/server';

type FinancialSummaryProject = {
  _id: Id<'projects'>;
  budgetTotal?: number;
};

export const getFinancialSummary = async (
  ctx: QueryCtx,
  project: FinancialSummaryProject,
) => {
  const [categories, expenses, contractors] = await Promise.all([
    ctx.db
      .query('budgetCategories')
      .withIndex('by_project', (q) => q.eq('projectId', project._id))
      .collect(),
    ctx.db
      .query('expenses')
      .withIndex('by_project', (q) => q.eq('projectId', project._id))
      .collect(),
    ctx.db
      .query('contractors')
      .withIndex('by_project', (q) => q.eq('projectId', project._id))
      .collect(),
  ]);

  const categoryBudget = categories.reduce((sum, category) => sum + category.budget, 0);
  const projectBudget = project.budgetTotal || 0;
  const totalBudget = projectBudget > 0 ? projectBudget : categoryBudget;
  const isProjectBudgetDefined = projectBudget > 0;
  const totalSpent = expenses
    .filter((expense) => expense.status === 'שולם')
    .reduce((sum, expense) => sum + expense.amount, 0);

  let committed = 0;
  for (const contractor of contractors) {
    const milestones = await ctx.db
      .query('contractorPaymentMilestones')
      .withIndex('by_contractor', (q) => q.eq('contractorId', contractor._id))
      .take(200);

    if (milestones.length > 0) {
      committed += milestones
        .filter((milestone) => !milestone.paid)
        .reduce((sum, milestone) => sum + milestone.amount, 0);
    } else {
      committed += Math.max(0, contractor.budget - contractor.paid);
    }
  }

  return {
    totalBudget,
    projectBudget,
    categoryBudget,
    isProjectBudgetDefined,
    totalSpent,
    committed,
    remainingBudget: totalBudget - totalSpent - committed,
  };
};
