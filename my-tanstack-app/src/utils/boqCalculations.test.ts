import { describe, expect, test } from 'vitest';
import { applyWaste, aggregateWizardItems, DEFAULT_FLOOR_WASTE_PCT } from './boqCalculations';
import { demoProject } from '../components/teaser/demoProject';

describe('boqCalculations & demoProject consistency', () => {
  test('applyWaste calculates ceiling of base area with waste percentage', () => {
    expect(applyWaste(18, 15)).toBe(21); // 18 * 1.15 = 20.7 -> 21
    expect(applyWaste(9, 15)).toBe(11);  // 9 * 1.15 = 10.35 -> 11
    expect(applyWaste(42, DEFAULT_FLOOR_WASTE_PCT)).toBe(49); // 42 * 1.15 = 48.3 -> 49
  });

  test('demoProject budget, expenses, and financing numbers are mutually consistent', () => {
    const { totalBudget, totalSpent, committed, remainingBudget } = demoProject.budgetSummary;
    expect(totalSpent + committed + remainingBudget).toBe(totalBudget);

    const categorySum = demoProject.categoryExpenses.reduce((sum, c) => sum + c.value, 0);
    expect(categorySum).toBe(totalSpent);

    const monthlySum = demoProject.expensesOverTime.reduce((sum, m) => sum + m.total, 0);
    expect(monthlySum).toBe(totalSpent);

    expect(demoProject.financingSummary.projectBudget).toBe(totalBudget);
    expect(demoProject.financingSummary.totalProjectExpenses).toBe(totalSpent);
    expect(
      demoProject.financingSummary.totalFundingReceived - demoProject.financingSummary.totalProjectExpenses,
    ).toBe(demoProject.financingSummary.availableFunding);
  });

  test('aggregateWizardItems combines locked and user items across rooms', () => {
    const rooms = demoProject.rooms.filter((r) =>
      ['r_master_bath', 'r_kitchen', 'r_living'].includes(r.uid),
    );
    const agg = aggregateWizardItems(rooms, demoProject.wizardItemsByRoom, 1);
    const flooring = Object.values(agg).find((i) => i.name === 'ריצוף לחדר');
    expect(flooring?.total).toBe(applyWaste(9, 15) + applyWaste(18, 15) + applyWaste(42, 15));
    expect(flooring?.rooms).toHaveLength(3);
  });
});
