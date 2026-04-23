import { query } from './_generated/server'
import { v } from 'convex/values'

import { requireProjectOwner } from './lib/access'

export const summary = query({
  args: { projectId: v.optional(v.id('projects')) },
  handler: async (ctx, args) => {
    if (!args.projectId) {
      return {
        budgetRemaining: 0,
        topOverruns: [] as Array<{ categoryId: string; categoryName: string; overrun: number }>,
        currentStage: null,
        nextStage: null,
        nextPayment: null,
        openTasks: [] as string[],
      }
    }

    const projectId = args.projectId
    await requireProjectOwner(ctx, projectId)

    const [categories, expenses, stages, payments] = await Promise.all([
      ctx.db
        .query('budgetCategories')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .collect(),
      ctx.db
        .query('expenses')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .collect(),
      ctx.db
        .query('stages')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .collect(),
      ctx.db
        .query('payments')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .collect(),
    ])

    const actualByCategory = new Map<string, number>()
    for (const expense of expenses) {
      const key = String(expense.categoryId)
      actualByCategory.set(key, (actualByCategory.get(key) ?? 0) + expense.amount)
    }

    const plannedTotal = categories.reduce((sum, category) => sum + category.plannedAmount, 0)
    const actualTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0)

    const topOverruns = categories
      .map((category) => {
        const actual = actualByCategory.get(String(category._id)) ?? 0
        const overrun = actual - category.plannedAmount
        return {
          categoryId: String(category._id),
          categoryName: category.name,
          overrun,
        }
      })
      .filter((item) => item.overrun > 0)
      .sort((a, b) => b.overrun - a.overrun)
      .slice(0, 3)

    const currentStage =
      stages.find((stage) => stage.status === 'in_progress') ??
      stages.find((stage) => stage.status !== 'done') ??
      null

    const nextStage =
      stages.find((stage) => stage.status === 'not_started') ??
      (currentStage?.status === 'in_progress' ? currentStage : null)

    const nextPayment = payments
      .filter((payment) => payment.status !== 'paid' && Boolean(payment.dueDate))
      .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))[0] ?? null

    return {
      budgetRemaining: plannedTotal - actualTotal,
      topOverruns,
      currentStage: currentStage
        ? {
            id: String(currentStage._id),
            name: currentStage.name,
            progress: currentStage.progress,
            status: currentStage.status,
          }
        : null,
      nextStage: nextStage
        ? {
            id: String(nextStage._id),
            name: nextStage.name,
            status: nextStage.status,
          }
        : null,
      nextPayment: nextPayment
        ? {
            id: String(nextPayment._id),
            amount: nextPayment.amount,
            dueDate: nextPayment.dueDate ?? null,
            status: nextPayment.status,
            supplierId: String(nextPayment.supplierId),
          }
        : null,
      openTasks: [] as string[],
    }
  },
})
