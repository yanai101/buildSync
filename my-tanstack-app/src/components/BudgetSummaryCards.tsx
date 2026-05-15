import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';

import { StatCard } from './Shared';
import { fmtMoney } from '../utils/mockData';
import type { ProjectBudgetSummary } from '../hooks/useProjectBudgetSummary';

type BudgetSummaryCardsProps = {
  summary: Pick<ProjectBudgetSummary, 'totalBudget' | 'totalSpent' | 'committed' | 'remainingBudget'>;
  style?: CSSProperties;
};

export function BudgetSummaryCards({ summary, style }: BudgetSummaryCardsProps) {
  const { totalBudget, totalSpent, committed, remainingBudget } = summary;
  const spentPct = totalBudget ? Math.round((totalSpent / totalBudget) * 100) : 0;

  return (
    <motion.div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        ...style
      }}
      variants={{ show: { transition: { staggerChildren: 0.1 } } }}
      initial="hidden"
      animate="show"
    >
      {[
        { label: 'תקציב כולל', value: fmtMoney(totalBudget), icon: 'chart' },
        {
          label: 'הוצא עד כה',
          value: fmtMoney(totalSpent),
          accent: 'var(--accent)',
          sub: `${spentPct}% מהתקציב`,
          icon: 'arrow-right',
        },
        { label: 'מחויב (חוזים)', value: fmtMoney(committed), accent: 'var(--warning)', icon: 'clipboard' },
        { label: 'יתרה פנויה', value: fmtMoney(remainingBudget), accent: 'var(--success)', icon: 'check-circle' },
      ].map((card) => (
        <motion.div key={card.label} style={{ height: '100%' }} variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 24 } } }}>
          <StatCard {...card} />
        </motion.div>
      ))}
    </motion.div>
  );
}
