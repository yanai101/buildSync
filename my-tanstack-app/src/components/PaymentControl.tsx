import * as React from 'react';
import { Icon, Btn, Modal } from './Shared';
import { PHOTOS_DATA, fmtMoney } from '../utils/mockData';
import { Stage, Milestone } from '../types';

export interface Gate {
  key: string;
  label: string;
  passed: boolean;
  detail: string;
  missing?: number;
  canApprove?: boolean;
}

export interface Gates {
  tasks: Gate;
  supervisor: Gate;
  allPassed: boolean;
}

// ── Payment Control Flow — internal status (audit/logic) ─────────────────────
// Kept for audit + logic layers. Users never see these — they see SIMPLE_STATES.
export const PAYMENT_STATUS = {
  draft:            { label: 'טיוטה' },
  in_progress:      { label: 'בביצוע' },
  review_requested: { label: 'ממתין לבדיקה' },
  blocked:          { label: 'חסום' },
  ready:            { label: 'מוכן לתשלום' },
  paid:             { label: 'שולם' },
  disputed:         { label: 'במחלוקת' },
};


// ── Simple states — what the user actually sees ──────────────────────────────
const SIMPLE: Record<string, { label: string, bg: string, fg: string, dot: string }> = {
  not_started: { label: 'לא התחיל',     bg: 'var(--surface-2)',             fg: 'var(--text2)',     dot: 'var(--text3)' },
  working:     { label: 'עדיין לא מוכן', bg: 'var(--surface-2)',             fg: 'var(--text2)',     dot: 'var(--text3)' },
  ready:       { label: 'מוכן לתשלום',   bg: 'rgba(16,185,129,0.15)',        fg: 'var(--success)',   dot: '#10B981' },
  paid:        { label: 'שולם',          bg: 'var(--success)',               fg: '#FFFFFF',          dot: '#10B981' },
  issue:       { label: 'מחלוקת',        bg: 'rgba(239,68,68,0.12)',         fg: 'var(--danger)',    dot: 'var(--danger)' },
  locked:      { label: 'בהמשך',         bg: 'var(--surface-2)',             fg: 'var(--text3)',     dot: 'var(--border)' },
  waiting_payment: { label: 'ממתין לתשלום', bg: 'rgba(245,158,11,0.12)',     fg: '#F59E0B',          dot: '#F59E0B' },
};

const toSimple = (status: string) => {
  if (status === 'paid')     return 'paid';
  if (status === 'disputed') return 'issue';
  if (status === 'draft')    return 'not_started';
  if (status === 'ready')    return 'ready';
  if (status === 'locked')   return 'locked';
  if (status === 'waiting_payment') return 'waiting_payment';
  return 'working';
};

// ── Gate computation (unchanged — safety layer) ──────────────────────────────
export const computeGates = (stage: Stage): Gates => {
  const tasks = stage.tasks || [];
  const requiredTasks = tasks.filter(t => t.required !== false);
  const doneTasks = requiredTasks.filter(t => t.done).length;

  const tasksGate = {
    key: 'tasks', label: 'המשימות הושלמו',
    passed: doneTasks === requiredTasks.length,
    detail: requiredTasks.length > 0 ? `${doneTasks} מתוך ${requiredTasks.length}` : 'אין משימות חובה',
    missing: requiredTasks.length - doneTasks,
  };
  const supervisorGate = {
    key: 'supervisor', label: 'המפקח אישר',
    passed: !!stage.supervisorApproval,
    detail: stage.supervisorApproval
      ? `${stage.supervisorApproval.by}`
      : 'טרם אושר',
    canApprove: tasksGate.passed,
  };

  const allPassed = tasksGate.passed && supervisorGate.passed;
  return { tasks: tasksGate, supervisor: supervisorGate, allPassed };
};

// The UI reads gates, not intent — any active/review/blocked collapses to gate truth.
export const resolveStatus = (stage: Stage, gates: Gates) => {
  const s = stage.payment?.status || 'draft';
  if (s === 'paid' || s === 'disputed') return s;
  if (gates.allPassed) return 'ready';
  if (stage.progress > 0) return 'in_progress';
  return 'draft';
};

// ── Milestone helpers (unchanged logic) ──────────────────────────────────────
export const computeMilestoneGates = (stage: Stage, milestone: Milestone): Gates => {
  const linkedTasks = (stage.tasks || []).filter(t => milestone.taskIds.includes(t.id));
  const required = (stage.tasks || []).filter(t => t.required !== false);
  const done = required.filter(t => t.done).length;

  const tasksGate = {
    key: 'tasks', label: 'כל משימות השלב הושלמו',
    passed: done === required.length,
    detail: required.length > 0 ? `${done} מתוך ${required.length}` : 'אין משימות חובה',
    missing: required.length - done,
  };
  const supervisorGate = {
    key: 'supervisor', label: 'המפקח אישר',
    passed: tasksGate.passed,
    detail: linkedTasks.length ? linkedTasks.map(task => task.name).join(', ') : 'משימת תשלום',
    canApprove: tasksGate.passed,
  };
  
  return {
    tasks: tasksGate, supervisor: supervisorGate,
    allPassed: tasksGate.passed && supervisorGate.passed,
  };
};

export const resolveMilestoneStatus = (milestone: Milestone, gates: Gates, prev: Milestone | null) => {
  const s = milestone.status;
  if (s === 'paid' || s === 'disputed') return s;
  if (prev && prev.status !== 'paid' && !gates.allPassed) return 'locked';
  if (s === 'draft') return gates.allPassed ? 'ready' : 'draft';
  return gates.allPassed ? 'ready' : 'blocked';
};

export const aggregateStageStatus = (stage: Stage) => {
  const ms = stage.payment?.milestones;
  if (!ms?.length) return null;
  if (ms.every(m => m.status === 'paid')) return 'paid';
  if (ms.some(m => m.status === 'disputed')) return 'disputed';
  if (ms.some(m => m.status === 'review_requested')) return 'review_requested';
  if (ms.some(m => m.status === 'in_progress')) return 'in_progress';
  return 'draft';
};

// ── Plain-Hebrew headline + single primary CTA ───────────────────────────────
// Everything the user needs to know in one sentence and one button.
const stageHasContractor = (stage: Stage) =>
  (stage.contractorIds?.length ?? 0) > 0 || (stage.contractors?.length ?? 0) > 0;

const buildHeadlineAndCTA = (stage: Stage, gates: Gates, handlers: { onSupervisorApprove?: () => void, onReleasePayment?: () => void }, amount: number) => {
  if (!stageHasContractor(stage)) {
    return {
      headline: 'אין קבלן מקושר לשלב — אי אפשר לשלם',
      cta: null,
    };
  }
  if (stage.paymentAmountMismatch) {
    return {
      headline: stage.paymentMismatchReason || 'סכום השלב לא תואם לסכום החוזה של הקבלנים',
      cta: null,
    };
  }
  if (!gates.tasks.passed) {
    return {
      headline: `חסרות ${gates.tasks.missing} משימות — סיים אותן למעלה`,
      cta: null, // tasks are right above in the same expanded view
    };
  }
  if (!gates.supervisor.passed) {
    return {
      headline: 'חסר אישור מפקח',
      cta: { label: 'שלח לאישור המפקח', onClick: handlers.onSupervisorApprove },
    };
  }
  return {
    headline: 'הכל אושר — אפשר לשלם',
    cta: { label: `שולם ${fmtMoney(amount)}`, onClick: handlers.onReleasePayment, primary: true },
  };
};

// ── PaymentBadge — 3 colors max ──────────────────────────────────────────────
export const PaymentBadge = ({ status }: { status: string }) => {
  const simple = toSimple(status);
  const s = SIMPLE[simple];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.fg,
      padding: '3px 8px', borderRadius: 999,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot }} />
      {s.label}
    </span>
  );
};

// Collapsible "what's missing" — shows the 3 gates for users who want detail.
const WhatsMissing = ({ gates }: { gates: Gates }) => {
  const [open, setOpen] = React.useState(false);
  const rows = [gates.tasks, gates.supervisor];
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          fontSize: 12, color: 'var(--text2)', fontFamily: "'Heebo',sans-serif",
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}
      >
        <Icon n={open ? 'chevron-down' : 'chevron-right'} s={12} c="var(--text2)" />
        מה נבדק?
      </button>
      {open && (
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {rows.map(g => (
            <div key={g.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <Icon n={g.passed ? 'check' : 'x'} s={12} c={g.passed ? 'var(--success)' : 'var(--danger)'} />
              <span style={{ color: 'var(--text1)' }}>{g.label}</span>
              <span style={{ color: 'var(--text3)' }}>— {g.detail}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Primary button — one adaptive CTA.
const PrimaryCTA = ({ cta }: { cta: { label: string, onClick?: () => void, primary?: boolean } | null }) => {
  if (!cta) return null;
  const primary = cta.primary;
  return (
    <button
      onClick={cta.onClick || (() => {})}
      style={{
        fontFamily: "'Heebo',sans-serif", fontWeight: 700, fontSize: 14,
        padding: '10px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
        background: primary ? '#10B981' : 'var(--accent)',
        color: '#fff',
        display: 'inline-flex', alignItems: 'center', gap: 8,
      }}
    >
      {primary && <Icon n="check-circle" s={15} c="#fff" />}
      {cta.label}
    </button>
  );
};

// ── PaymentGatesPanel — single-payment stage (no milestones) ─────────────────
export const PaymentGatesPanel = ({
  stage,
  gates,
  status,
  onSupervisorApprove,
  onReleasePayment,
  onRequestReviewMs,
  onSupervisorApproveMs,
  onReleaseMs,
  onLockMs,
}: {
  stage: Stage,
  gates: Gates,
  status: string,
  onRequestReview?: () => void,
  onSupervisorApprove: () => void,
  onReleasePayment: () => void,
  onRequestReviewMs: (id: string) => void,
  onSupervisorApproveMs: (id: string) => void,
  onReleaseMs: (m: Milestone) => void,
  onLockMs?: (id: string) => void,
}) => {
  if (stage.payment?.milestones?.length) {
    return (
      <MilestonesPanel
        stage={stage}
        onSupervisorApproveMs={onSupervisorApproveMs}
        onReleaseMs={onReleaseMs}
        onLockMs={onLockMs}
      />
    );
  }

  const amount = stage.payment?.amount || 0;
  const simple = toSimple(status);

  return (
    <div style={{
      marginTop: 16,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
          תשלום — {fmtMoney(amount)}
        </span>
        <span style={{ marginInlineStart: 'auto' }}>
          <PaymentBadge status={status} />
        </span>
      </div>
      {stage.paymentAmountMismatch && (
        <div style={{
          marginBottom: 10,
          border: '1px solid var(--danger)',
          background: 'rgba(239,68,68,0.08)',
          color: 'var(--danger)',
          borderRadius: 8,
          padding: '8px 10px',
          fontSize: 12,
          fontWeight: 700,
          lineHeight: 1.45,
        }}>
          {stage.paymentMismatchReason || 'סכום השלב לא תואם לסכום החוזה של הקבלנים'}
        </div>
      )}

      {simple === 'paid' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>
            שולם ב-{stage.payment?.paidAt || '—'}.
          </div>
          {stage.payment?.receipts && stage.payment.receipts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
              {stage.payment.receipts.map((receipt, idx) => (
                <a key={idx} href={`#${receipt}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--success)', background: 'rgba(16,185,129,0.1)', padding: '6px 10px', borderRadius: 6, alignSelf: 'flex-start', textDecoration: 'none' }}>
                  <Icon n="file-text" s={14} /> אסמכתא {idx + 1}: {receipt}
                </a>
              ))}
            </div>
          )}
        </div>
      ) : simple === 'not_started' ? (
        <div style={{ fontSize: 13, color: 'var(--text2)' }}>
          השלב עדיין לא התחיל.
        </div>
      ) : simple === 'issue' ? (
        <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 500 }}>
          מחלוקת פתוחה — נדרשת החלטת מפקח.
        </div>
      ) : (
        <>
          {(() => {
            const { headline, cta } = buildHeadlineAndCTA(stage, gates, {
              onSupervisorApprove, onReleasePayment,
            }, amount);
            const ready = simple === 'ready';
            return (
              <>
                <div style={{
                  fontSize: 15, fontWeight: 600,
                  color: stage.paymentAmountMismatch ? 'var(--danger)' : ready ? 'var(--success)' : 'var(--text1)',
                  marginBottom: 12,
                }}>
                  {headline}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <PrimaryCTA cta={cta} />
                  <WhatsMissing gates={gates} />
                </div>
              </>
            );
          })()}
        </>
      )}
    </div>
  );
};

// ── MilestonesPanel — focus on the next thing to pay ─────────────────────────
const MilestoneItem = ({
  stage, milestone, gates, status, locked, isNext,
  onSupervisorApprove, onRelease, onLock
}: {
  stage: Stage, milestone: Milestone, gates: Gates, status: string, locked: boolean, isNext?: boolean,
  onSupervisorApprove?: () => void, onRelease?: (m: Milestone) => void, onLock?: (id: string) => void
}) => {
  if (status === 'paid') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 6,
        padding: '8px 12px',
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
          <Icon n="check-circle" s={14} c="var(--success)" />
          <span style={{ flex: 1, color: 'var(--text2)' }}>{milestone.name}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {milestone.isLocked ? (
              <div style={{ padding: "4px 6px", color: "var(--text2)", display: "flex", alignItems: "center" }} title="תשלום נעול">
                <Icon n="lock" s={13}/>
              </div>
            ) : (
              onLock && (
                <Btn
                  size="sm"
                  variant="ghost"
                  onClick={() => onLock(milestone.id)}
                  title="נעל תשלום מעריכה או מחיקה"
                >
                  <Icon n="lock" s={13}/> נעל
                </Btn>
              )
            )}
            <span style={{ color: 'var(--text3)', fontSize: 12 }}>
              {fmtMoney(milestone.amount)} · שולם ב-{milestone.paidAt || '—'}
            </span>
          </div>
        </div>
        {milestone.receipts && milestone.receipts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 24 }}>
            {milestone.receipts.map((receipt, idx) => (
              <a key={idx} href={`#${receipt}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--success)', background: 'rgba(16,185,129,0.1)', padding: '4px 8px', borderRadius: 4, alignSelf: 'flex-start', textDecoration: 'none' }}>
                <Icon n="file-text" s={12} /> אסמכתא {idx + 1}: {receipt}
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (locked) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 12px',
        background: 'var(--surface-2)',
        border: '1px dashed var(--border)',
        borderRadius: 8,
        fontSize: 13,
      }}>
        <Icon n="clock" s={13} c="var(--text3)" />
        <span style={{ flex: 1, color: 'var(--text3)' }}>{milestone.name}</span>
        <span style={{ color: 'var(--text3)', fontSize: 12 }}>
          {fmtMoney(milestone.amount)} · בהמשך
        </span>
      </div>
    );
  }

  // The active milestone — the one the user should act on.
  const { headline, cta } = buildHeadlineAndCTA(stage, gates, {
    onSupervisorApprove,
    onReleasePayment: onRelease ? () => onRelease(milestone) : undefined,
  }, milestone.amount);
  const ready = status === 'ready';

  return (
    <div style={{
      border: `1px solid ${ready ? 'rgba(16,185,129,0.4)' : 'var(--border)'}`,
      background: ready ? 'rgba(16,185,129,0.06)' : 'var(--surface)',
      borderRadius: 10,
      padding: 14,
      boxShadow: isNext ? '0 1px 3px rgba(0,0,0,.04)' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>
          {milestone.name}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>
          · {fmtMoney(milestone.amount)}
        </span>
        <span style={{ marginInlineStart: 'auto' }}>
          <PaymentBadge status={status} />
        </span>
      </div>
      <div style={{
        fontSize: 14, fontWeight: 600,
        color: stage.paymentAmountMismatch ? 'var(--danger)' : ready ? 'var(--success)' : 'var(--text1)',
        marginBottom: 12,
      }}>
        {headline}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <PrimaryCTA cta={cta ? { ...cta, onClick: cta.onClick || (() => {}) } : null} />
        <WhatsMissing gates={gates} />
      </div>
    </div>
  );
};

export const MilestonesPanel = ({
  stage,
  onSupervisorApproveMs,
  onReleaseMs,
  onLockMs,
}: {
  stage: Stage,
  onSupervisorApproveMs: (id: string) => void,
  onReleaseMs: (m: Milestone) => void,
  onLockMs?: (id: string) => void
}) => {
  const [showPaid,   setShowPaid]   = React.useState(false);
  const [showFuture, setShowFuture] = React.useState(false);

  const ms = stage.payment?.milestones || [];
  const totalPaid   = ms.filter(m => m.status === 'paid').reduce((a, m) => a + m.amount, 0);
  const totalAmount = ms.reduce((a, m) => a + m.amount, 0);
  const pct = totalAmount ? Math.round((totalPaid / totalAmount) * 100) : 0;

  // Split into paid / next / future.
  const resolved = ms.map((m, i) => {
    const prev = i > 0 ? ms[i - 1] : null;
    const gates = computeMilestoneGates(stage, m);
    const status = resolveMilestoneStatus(m, gates, prev);
    return { m, gates, status };
  });

  const paid   = resolved.filter(r => r.status === 'paid');
  const active = resolved.filter(r => r.status !== 'paid' && r.status !== 'locked');
  const future = resolved.filter(r => r.status === 'locked');

  return (
    <div style={{
      marginTop: 16,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: 14,
    }}>
      {stage.paymentAmountMismatch && (
        <div style={{
          marginBottom: 12,
          border: '1px solid var(--danger)',
          background: 'rgba(239,68,68,0.08)',
          color: 'var(--danger)',
          borderRadius: 8,
          padding: '8px 10px',
          fontSize: 12,
          fontWeight: 700,
          lineHeight: 1.45,
        }}>
          {stage.paymentMismatchReason || 'סכום השלב לא תואם לסכום החוזה של הקבלנים'}
        </div>
      )}
      {/* Progress summary */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>
            שולם עד כה: {fmtMoney(totalPaid)} מתוך {fmtMoney(totalAmount)}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>{pct}%</span>
        </div>
        <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: '#10B981', transition: 'width .4s',
          }} />
        </div>
      </div>

      {/* Paid — collapsed by default */}
      {paid.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => setShowPaid(!showPaid)}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              fontSize: 12, color: 'var(--text2)', fontFamily: "'Heebo',sans-serif",
              display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 8,
            }}
          >
            <Icon n={showPaid ? 'chevron-down' : 'chevron-right'} s={12} c="var(--text2)" />
            {paid.length} שולמו
          </button>
          {showPaid && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {paid.map(({ m, gates, status }) => (
                <MilestoneItem key={m.id} stage={stage} milestone={m}
                  gates={gates} status={status} locked={false} onLock={onLockMs} />
              ))}
            </div>
          )}
        </div>
      )}

      {active.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {active.map(({ m, gates, status }, index) => (
            <MilestoneItem
              key={m.id}
              stage={stage} milestone={m} gates={gates}
              status={status} locked={false} isNext={index === 0}
              onSupervisorApprove={() => onSupervisorApproveMs(m.id)}
              onRelease={(milestone) => onReleaseMs(milestone)}
            />
          ))}
        </div>
      ) : paid.length === ms.length ? (
        <div style={{
          padding: 14, textAlign: 'center',
          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: 10, fontSize: 13, color: 'var(--success)', fontWeight: 600,
        }}>
          כל התשלומים הושלמו 🎉
        </div>
      ) : null}

      {/* Future — collapsed by default, show count only */}
      {future.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <button
            onClick={() => setShowFuture(!showFuture)}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              fontSize: 12, color: 'var(--text2)', fontFamily: "'Heebo',sans-serif",
              display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 8,
            }}
          >
            <Icon n={showFuture ? 'chevron-down' : 'chevron-right'} s={12} c="var(--text2)" />
            בהמשך — {future.length} שלבים
          </button>
          {showFuture && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {future.map(({ m, gates, status }) => (
                <MilestoneItem key={m.id} stage={stage} milestone={m}
                  gates={gates} status={status} locked={status === 'locked'} onLock={onLockMs} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── ReleasePaymentModal — simple yes/cancel ──────────────────────────────────
export const ReleasePaymentModal = ({ stage, milestoneName, amount, gates, onClose, onConfirm }: {
  stage: Stage, milestoneName: string | null, amount: number, gates?: Gates, onClose: () => void, onConfirm: (receipts?: string[]) => void
}) => {
  const finalAmount = amount ?? stage.payment?.amount ?? 0;
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);

  const handleConfirm = () => {
    onConfirm(selectedFiles.length > 0 ? selectedFiles.map(f => f.name) : undefined);
  };

  return (
    <Modal title="לאשר תשלום?" onClose={onClose} width={440}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 14, color: 'var(--text1)', lineHeight: 1.5 }}>
          אתה משלם <b>{fmtMoney(finalAmount)}</b> ל<b>{stage.contractor}</b>
          {milestoneName ? <> עבור <b>{milestoneName}</b></> : <> עבור שלב <b>{stage.name}</b></>}.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '16px', background: 'var(--surface-2)', borderRadius: 8, border: '1px dashed var(--border)', cursor: selectedFiles.length >= 3 ? 'not-allowed' : 'pointer', transition: '0.2s', opacity: selectedFiles.length >= 3 ? 0.6 : 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>
              <Icon n="upload-cloud" s={16} c="var(--text2)" /> 
              צירוף קבלה / אסמכתא (עד 3 קבצים)
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              ניתן להעלות תמונות או קבצי PDF
            </div>
            <input 
              type="file" 
              multiple={true}
              style={{ display: 'none' }} 
              accept="image/*,application/pdf" 
              disabled={selectedFiles.length >= 3}
              onChange={(e) => {
                if (e.target.files) {
                  const newFiles = Array.from(e.target.files);
                  setSelectedFiles(prev => {
                    const uniqueNewFiles = newFiles.filter(nf => !prev.some(pf => pf.name === nf.name && pf.size === nf.size));
                    return [...prev, ...uniqueNewFiles].slice(0, 3);
                  });
                }
                e.target.value = '';
              }} 
            />
          </label>
          
          {selectedFiles.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {selectedFiles.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--success)', fontWeight: 500 }}>
                    <Icon n="file-text" s={14} /> {f.name}
                  </div>
                  <button onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <Icon n="trash-2" s={14} c="var(--danger)" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ fontSize: 12, color: 'var(--text3)' }}>
          יש לך 14 יום לטעון לפגם לאחר התשלום.
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-start' }}>
          <button
            onClick={handleConfirm}
            style={{
              fontFamily: "'Heebo',sans-serif", fontWeight: 700, fontSize: 14,
              padding: '10px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: '#10B981', color: '#fff',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            <Icon n="check-circle" s={14} c="#fff" />
            סמן שולם {fmtMoney(finalAmount)}
          </button>
          <Btn variant="ghost" size="md" onClick={onClose}>ביטול</Btn>
        </div>
      </div>
    </Modal>
  );
};
