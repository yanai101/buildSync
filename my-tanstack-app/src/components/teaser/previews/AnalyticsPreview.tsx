import * as React from 'react';
import { BudgetSummaryCards } from '../../BudgetSummaryCards';
import { Icon, Modal } from '../../Shared';
import { fmtMoney } from '../../../utils/mockData';
import { demoProject } from '../demoProject';

type ChartKey = 'budgetDistribution' | 'expensesOverTime' | 'taskStatus' | 'stageProgress';

/**
 * Interactive preview of AnalyticsScreen powered by `demoProject`.
 * Mirrors the exact 4 cards + BudgetSummaryCards + expand-chart Modal of AnalyticsScreen.
 */
export const AnalyticsPreview = () => {
  const [selectedCat, setSelectedCat] = React.useState<string | null>(null);
  const [expandedChart, setExpandedChart] = React.useState<ChartKey | null>(null);

  const totalCategorySpend = demoProject.categoryExpenses.reduce((sum, c) => sum + c.value, 0);
  const maxMonthSpend = Math.max(...demoProject.expensesOverTime.map((m) => m.total), 1);
  const totalTasks = demoProject.taskStats.reduce((sum, t) => sum + t.value, 0);

  const renderCategoryBreakdown = (expanded = false) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: expanded ? 14 : 10 }}>
      {demoProject.categoryExpenses.map((cat) => {
        const pct = Math.round((cat.value / totalCategorySpend) * 100);
        const isSelected = selectedCat === cat.name;
        return (
          <button
            key={cat.name}
            type="button"
            onClick={() => setSelectedCat(isSelected ? null : cat.name)}
            style={{
              background: isSelected ? 'var(--accent-light)' : 'var(--bg)',
              border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 10,
              padding: expanded ? '12px 14px' : '9px 12px',
              cursor: 'pointer',
              textAlign: 'right',
              transition: 'background 0.15s, border-color 0.15s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, fontSize: 13.5, marginBottom: 7 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700, color: 'var(--text1)' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                {cat.name}
              </span>
              <span style={{ fontWeight: 800, color: 'var(--text1)', whiteSpace: 'nowrap' }}>
                {fmtMoney(cat.value)} <span style={{ color: 'var(--text3)', fontWeight: 600, fontSize: 12 }}>({pct}%)</span>
              </span>
            </div>
            <div style={{ height: 7, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: cat.color, borderRadius: 999 }} />
            </div>
          </button>
        );
      })}
    </div>
  );

  const renderMonthlyTrend = (expanded = false) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${demoProject.expensesOverTime.length}, 1fr)`, gap: 10, alignItems: 'end', height: expanded ? 260 : 185, padding: '16px 8px 4px', borderBottom: '1px solid var(--border)' }}>
        {demoProject.expensesOverTime.map((m) => {
          const heightPct = Math.max(12, Math.round((m.total / maxMonthSpend) * 100));
          return (
            <div key={m.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)' }}>₪{Math.round(m.total / 1000)}k</span>
              <div
                style={{
                  width: '100%',
                  maxWidth: 42,
                  height: `${heightPct}%`,
                  borderRadius: '8px 8px 3px 3px',
                  background: 'linear-gradient(180deg, var(--accent) 0%, var(--accent-light) 100%)',
                  border: '1px solid var(--accent)',
                }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${demoProject.expensesOverTime.length}, 1fr)`, gap: 10, textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>
        {demoProject.expensesOverTime.map((m) => (
          <span key={m.name}>{m.name}</span>
        ))}
      </div>
    </div>
  );

  const renderTaskStatus = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', height: 14, borderRadius: 999, overflow: 'hidden', background: 'var(--border)' }}>
        {demoProject.taskStats.map((t) => (
          <div key={t.name} style={{ width: `${(t.value / totalTasks) * 100}%`, background: t.fill }} title={`${t.name}: ${t.value}`} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {demoProject.taskStats.map((t) => {
          const pct = Math.round((t.value / totalTasks) * 100);
          return (
            <div key={t.name} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: t.fill }}>{t.value}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginTop: 2 }}>{t.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{pct}% מהמשימות</div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderStageProgress = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {demoProject.stages.map((s) => (
        <div key={s._id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ fontWeight: 600, color: 'var(--text1)' }}>{s.name}</span>
            <span style={{ fontWeight: 700, color: s.progress === 100 ? 'var(--success)' : 'var(--text2)' }}>{s.progress}%</span>
          </div>
          <div style={{ height: 8, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${s.progress}%`, height: '100%', background: 'var(--success)', borderRadius: 999 }} />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <BudgetSummaryCards summary={demoProject.budgetSummary} />

      <div className="grid-2">
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon n="chart" s={15} c="var(--accent)" />
              התפלגות הוצאות לפי קטגוריה
            </span>
            <button type="button" onClick={() => setExpandedChart('budgetDistribution')} className="icon-btn" title="הגדל" aria-label="הגדל התפלגות הוצאות לפי קטגוריה">
              <Icon n="maximize-2" s={14} />
            </button>
          </div>
          <div style={{ padding: 14 }}>{renderCategoryBreakdown(false)}</div>
        </div>

        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon n="chart" s={15} c="var(--accent)" />
              מגמת הוצאות (חודשי)
            </span>
            <button type="button" onClick={() => setExpandedChart('expensesOverTime')} className="icon-btn" title="הגדל" aria-label="הגדל מגמת הוצאות">
              <Icon n="maximize-2" s={14} />
            </button>
          </div>
          <div style={{ padding: 14 }}>{renderMonthlyTrend(false)}</div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>סטטוס משימות כולל</h4>
            <button type="button" onClick={() => setExpandedChart('taskStatus')} className="icon-btn" title="הגדל" aria-label="הגדל סטטוס משימות">
              <Icon n="maximize-2" s={14} />
            </button>
          </div>
          {renderTaskStatus()}
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>התקדמות שלבי עבודה</h4>
            <button type="button" onClick={() => setExpandedChart('stageProgress')} className="icon-btn" title="הגדל" aria-label="הגדל התקדמות שלבי עבודה">
              <Icon n="maximize-2" s={14} />
            </button>
          </div>
          {renderStageProgress()}
        </div>
      </div>

      {expandedChart && (
        <Modal
          title={
            expandedChart === 'budgetDistribution'
              ? 'התפלגות הוצאות לפי קטגוריה'
              : expandedChart === 'expensesOverTime'
                ? 'מגמת הוצאות (חודשי)'
                : expandedChart === 'taskStatus'
                  ? 'סטטוס משימות כולל'
                  : 'התקדמות שלבי עבודה'
          }
          onClose={() => setExpandedChart(null)}
          maxWidth={680}
        >
          <div style={{ padding: '8px 0' }}>
            {expandedChart === 'budgetDistribution' && renderCategoryBreakdown(true)}
            {expandedChart === 'expensesOverTime' && renderMonthlyTrend(true)}
            {expandedChart === 'taskStatus' && renderTaskStatus()}
            {expandedChart === 'stageProgress' && renderStageProgress()}
          </div>
        </Modal>
      )}
    </div>
  );
};
