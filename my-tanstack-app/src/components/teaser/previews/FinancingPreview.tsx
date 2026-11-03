import * as React from 'react';
import { Icon } from '../../Shared';
import { fmtMoney } from '../../../utils/mockData';
import { demoProject } from '../demoProject';

const SOURCE_TYPE_LABELS: Record<string, string> = {
  mortgage: 'משכנתא',
  equity: 'הון עצמי',
  investment_sale: 'מכירת השקעות',
};

const SOURCE_TYPE_ICONS: Record<string, string> = {
  mortgage: 'chart',
  equity: 'check-circle',
  investment_sale: 'pie-chart',
};

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

/**
 * Interactive preview of FinancingScreen powered by `demoProject.financingSummary`.
 * Mirrors the sticky global summary bar, 3 Hero KPI cards, future & gap row, and
 * expandable SourceCards with Mortgage "המשיכה הבאה" and draw history.
 */
export const FinancingPreview = () => {
  const summary = demoProject.financingSummary;
  const currentProjectPct = demoProject.progressPct;
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(() => new Set(['src_mortgage']));
  const [showDraws, setShowDraws] = React.useState(true);

  const toggleSource = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Global summary line (matches FinancingScreen) */}
      <div
        style={{
          padding: '10px 16px',
          borderRadius: 10,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          display: 'flex',
          gap: '8px 16px',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>תקציב {fmtMoney(summary.projectBudget)}</span>
        <span style={{ color: 'var(--text3)' }}>·</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>
          נותר לשלם {fmtMoney(summary.projectBudget - summary.totalProjectExpenses)}
        </span>
        <span style={{ color: 'var(--text3)' }}>·</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>מימון עתידי {fmtMoney(summary.totalPlannedFunding)}</span>
        <span style={{ color: 'var(--text3)' }}>·</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>פער צפוי {fmtMoney(summary.projectFundingGap)}</span>
      </div>

      {/* 3 Hero KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: 12 }}>
        {[
          {
            label: 'כספי מימון שהתקבלו',
            val: summary.totalFundingReceived,
            icon: 'check-circle',
            color: 'var(--success)',
            light: 'var(--success-light)',
            subtitle: 'סך ההון וההלוואות שנכנסו עד כה',
          },
          {
            label: 'שולם בפועל (הוצאות)',
            val: summary.totalProjectExpenses,
            icon: 'chart',
            color: 'var(--accent)',
            light: 'var(--accent-light)',
            subtitle: 'כספים שיצאו בפועל לקבלנים וספקים',
          },
          {
            label: 'יתרת קופה זמינה',
            val: summary.availableFunding,
            icon: 'check-circle',
            color: 'var(--success)',
            light: 'var(--success-light)',
            subtitle: 'מימון שהתקבל פחות מה ששולם',
          },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: '16px 18px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${card.color}, transparent)` }} />
            <div style={{ width: 38, height: 38, borderRadius: 10, background: card.light, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <Icon n={card.icon} s={20} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: card.color }}>{fmtMoney(card.val)}</div>
            <div style={{ fontSize: 13, color: 'var(--text1)', fontWeight: 700, marginTop: 4 }}>{card.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{card.subtitle}</div>
          </div>
        ))}
      </div>

      {/* Sources list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h4 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>מקורות המימון ({summary.sources.length})</h4>
        {summary.sources.map((source) => {
          const isMortgage = source.type === 'mortgage';
          const isExpanded = expandedIds.has(source._id);
          const nextDraw = isMortgage ? source.mortgageSummary?.nextPlannedDraw : undefined;
          const draws = isMortgage ? source.mortgageSummary?.draws ?? [] : [];

          return (
            <div
              key={source._id}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                overflow: 'hidden',
              }}
            >
              <div style={{ height: 3, background: isMortgage ? 'linear-gradient(90deg, var(--accent), #8B5CF6)' : 'linear-gradient(90deg, var(--success), var(--accent))' }} />

              <button
                type="button"
                onClick={() => toggleSource(source._id)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  textAlign: 'right',
                }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 10, background: isMortgage ? 'var(--accent-light)' : 'var(--success-light)', color: isMortgage ? 'var(--accent)' : 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon n={SOURCE_TYPE_ICONS[source.type] ?? 'folder'} s={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text1)' }}>{source.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{SOURCE_TYPE_LABELS[source.type]}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text1)' }}>{fmtMoney(source.expectedTotal)}</div>
                <Icon n={isExpanded ? 'chevron-up' : 'chevron-down'} s={16} c="var(--text3)" />
              </button>

              {isExpanded && (
                <div style={{ padding: '14px 18px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                    {[
                      { label: 'סה"כ צפוי', val: source.expectedTotal },
                      { label: 'התקבל', val: source.totalReceived, color: 'var(--success)' },
                      { label: 'נותר', val: source.remainingExpected, color: source.remainingExpected > 0 ? 'var(--accent)' : 'var(--text3)' },
                    ].map((item) => (
                      <div key={item.label} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: item.color ?? 'var(--text1)' }}>{fmtMoney(item.val)}</div>
                        <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, marginTop: 2 }}>{item.label}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, (source.totalReceived / source.expectedTotal) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, var(--success), var(--accent))' }} />
                  </div>

                  {source.notes && (
                    <div style={{ fontSize: 12, color: 'var(--text2)', background: 'var(--bg)', padding: '8px 10px', borderRadius: 8 }}>
                      {source.notes}
                    </div>
                  )}

                  {isMortgage && nextDraw && (
                    <div style={{ padding: 12, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Icon n="chart" s={14} c="var(--accent)" />
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>המשיכה הבאה</span>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text1)' }}>{fmtMoney(nextDraw.amount)}</div>
                      <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                        יעד: {nextDraw.targetProgressPct}% התקדמות · {fmtDate(nextDraw.expectedDate)}
                      </div>
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                        <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, (currentProjectPct / nextDraw.targetProgressPct) * 100)}%`, height: '100%', background: 'var(--accent)' }} />
                        </div>
                        <span style={{ color: 'var(--text2)', fontWeight: 600 }}>
                          כרגע {currentProjectPct}% / יעד {nextDraw.targetProgressPct}%
                        </span>
                      </div>
                    </div>
                  )}

                  {isMortgage && draws.length > 0 && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowDraws((v) => !v)}
                        style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <Icon n="calendar" s={13} />
                        {showDraws ? 'הסתר היסטוריית משיכות' : `הצג היסטוריית משיכות (${draws.filter((d) => d.status === 'received').length})`}
                      </button>
                      {showDraws && (
                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {draws
                            .filter((d) => d.status === 'received')
                            .map((d) => (
                              <div key={d._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', background: 'var(--bg)', borderRadius: 8, fontSize: 12 }}>
                                <span style={{ fontWeight: 700, color: 'var(--text1)' }}>{fmtMoney(d.amount)}</span>
                                <span style={{ color: 'var(--text2)' }}>
                                  {fmtDate(d.actualDrawDate)} · {d.actualProgressPct}% התקדמות · אסמכתא {d.bankReference}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
