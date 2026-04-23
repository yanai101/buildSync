// @ts-nocheck

import * as React from 'react';
import { Icon, Btn, Modal } from './Shared';
import { PHOTOS_DATA, fmtMoney } from '../utils/mockData';

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

export const REQUIRED_PROOF_PHOTOS = 3;

// ── Simple states — what the user actually sees ──────────────────────────────
const SIMPLE = {
  not_started: { label: 'לא התחיל',     bg: '#F1F5F9', fg: '#64748B', dot: '#94A3B8' },
  working:     { label: 'עדיין לא מוכן', bg: '#F3F4F6', fg: '#4B5563', dot: '#9CA3AF' },
  ready:       { label: 'מוכן לתשלום',   bg: '#D1FAE5', fg: '#065F46', dot: '#10B981' },
  paid:        { label: 'שולם',          bg: '#065F46', fg: '#FFFFFF', dot: '#10B981' },
  issue:       { label: 'מחלוקת',        bg: '#FEE2E2', fg: '#991B1B', dot: '#EF4444' },
  locked:      { label: 'בהמשך',         bg: '#F9FAFB', fg: '#9CA3AF', dot: '#D1D5DB' },
};

const toSimple = (status) => {
  if (status === 'paid')     return 'paid';
  if (status === 'disputed') return 'issue';
  if (status === 'draft')    return 'not_started';
  if (status === 'ready')    return 'ready';
  if (status === 'locked')   return 'locked';
  return 'working';
};

// ── Gate computation (unchanged — safety layer) ──────────────────────────────
export const computeGates = (stage, extraApprovedPhotos = 0) => {
  const tasks = stage.tasks || [];
  const requiredTasks = tasks.filter(t => t.required !== false);
  const doneTasks = requiredTasks.filter(t => t.done).length;

  const stageKey = (stage.name || '').split(' ')[0];
  const approvedPhotos = PHOTOS_DATA.filter(p =>
    p.tag === 'אישור' && (p.stage === stage.name || p.stage === stageKey)
  ).length + extraApprovedPhotos;

  const tasksGate = {
    key: 'tasks', label: 'המשימות הושלמו',
    passed: requiredTasks.length > 0 && doneTasks === requiredTasks.length,
    detail: `${doneTasks} מתוך ${requiredTasks.length}`,
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
  const photosGate = {
    key: 'photos', label: 'יש תמונות אישור',
    passed: approvedPhotos >= REQUIRED_PROOF_PHOTOS,
    detail: `${approvedPhotos} מתוך ${REQUIRED_PROOF_PHOTOS}`,
    missing: Math.max(0, REQUIRED_PROOF_PHOTOS - approvedPhotos),
  };

  const allPassed = tasksGate.passed && supervisorGate.passed && photosGate.passed;
  return { tasks: tasksGate, supervisor: supervisorGate, photos: photosGate, allPassed };
};

// The UI reads gates, not intent — any active/review/blocked collapses to gate truth.
export const resolveStatus = (stage, gates) => {
  const s = stage.payment?.status || 'draft';
  if (s === 'paid' || s === 'disputed' || s === 'draft') return s;
  return gates.allPassed ? 'ready' : 'blocked';
};

// ── Milestone helpers (unchanged logic) ──────────────────────────────────────
export const computeMilestoneGates = (stage, milestone) => {
  const tasks = (stage.tasks || []).filter(t => milestone.taskIds.includes(t.id));
  const required = tasks.filter(t => t.required !== false);
  const done = required.filter(t => t.done).length;

  const stageKey = (stage.name || '').split(' ')[0];
  const basePhotos = PHOTOS_DATA.filter(p =>
    p.tag === 'אישור' && (p.stage === stage.name || p.stage === stageKey)
  ).length;
  const milestonesCount = (stage.payment?.milestones || []).length || 1;
  const sharedPhotos = Math.floor(basePhotos / milestonesCount);
  const approvedPhotos = sharedPhotos + (milestone.extraProofPhotos || 0);

  const tasksGate = {
    key: 'tasks', label: 'המשימות הושלמו',
    passed: required.length > 0 && done === required.length,
    detail: `${done} מתוך ${required.length}`,
    missing: required.length - done,
  };
  const supervisorGate = {
    key: 'supervisor', label: 'המפקח אישר',
    passed: !!milestone.supervisorApproval,
    detail: milestone.supervisorApproval ? milestone.supervisorApproval.by : 'טרם אושר',
    canApprove: tasksGate.passed,
  };
  const photosGate = {
    key: 'photos', label: 'יש תמונות אישור',
    passed: approvedPhotos >= REQUIRED_PROOF_PHOTOS,
    detail: `${approvedPhotos} מתוך ${REQUIRED_PROOF_PHOTOS}`,
    missing: Math.max(0, REQUIRED_PROOF_PHOTOS - approvedPhotos),
  };
  return {
    tasks: tasksGate, supervisor: supervisorGate, photos: photosGate,
    allPassed: tasksGate.passed && supervisorGate.passed && photosGate.passed,
  };
};

export const resolveMilestoneStatus = (milestone, gates, prev) => {
  const s = milestone.status;
  if (s === 'paid' || s === 'disputed') return s;
  if (prev && prev.status !== 'paid') return 'locked';
  if (s === 'draft') return 'draft';
  return gates.allPassed ? 'ready' : 'blocked';
};

export const aggregateStageStatus = (stage) => {
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
const buildHeadlineAndCTA = (gates, handlers, amount) => {
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
  if (!gates.photos.passed) {
    return {
      headline: `חסרות ${gates.photos.missing} תמונות אישור`,
      cta: { label: 'העלה תמונה', onClick: handlers.onAddProofPhoto },
    };
  }
  return {
    headline: 'הכל אושר — אפשר לשלם',
    cta: { label: `שלם ${fmtMoney(amount)}`, onClick: handlers.onReleasePayment, primary: true },
  };
};

// ── PaymentBadge — 3 colors max ──────────────────────────────────────────────
export const PaymentBadge = ({ status }) => {
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
const WhatsMissing = ({ gates }) => {
  const [open, setOpen] = React.useState(false);
  const rows = [gates.tasks, gates.supervisor, gates.photos];
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
const PrimaryCTA = ({ cta }) => {
  if (!cta) return null;
  const primary = cta.primary;
  return (
    <button
      onClick={cta.onClick}
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
  onRequestReview,
  onSupervisorApprove,
  onAddProofPhoto,
  onReleasePayment,
  onRequestReviewMs,
  onSupervisorApproveMs,
  onAddProofPhotoMs,
  onReleaseMs,
}) => {
  if (stage.payment?.milestones?.length) {
    return (
      <MilestonesPanel
        stage={stage}
        onRequestReviewMs={onRequestReviewMs}
        onSupervisorApproveMs={onSupervisorApproveMs}
        onAddProofPhotoMs={onAddProofPhotoMs}
        onReleaseMs={onReleaseMs}
      />
    );
  }

  const amount = stage.payment?.amount || 0;
  const simple = toSimple(status);

  return (
    <div style={{
      marginTop: 16,
      background: '#fff',
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

      {simple === 'paid' ? (
        <div style={{ fontSize: 13, color: 'var(--text2)' }}>
          שולם ב-{stage.payment?.paidAt || '—'}.
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
            const { headline, cta } = buildHeadlineAndCTA(gates, {
              onSupervisorApprove, onAddProofPhoto, onReleasePayment,
            }, amount);
            const ready = simple === 'ready';
            return (
              <>
                <div style={{
                  fontSize: 15, fontWeight: 600,
                  color: ready ? '#065F46' : 'var(--text1)',
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
  onSupervisorApprove, onAddProofPhoto, onRelease,
}) => {
  if (status === 'paid') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 12px',
        background: '#F9FAFB',
        border: '1px solid var(--border)',
        borderRadius: 8,
        fontSize: 13,
      }}>
        <Icon n="check-circle" s={14} c="var(--success)" />
        <span style={{ flex: 1, color: 'var(--text2)' }}>{milestone.name}</span>
        <span style={{ color: 'var(--text3)', fontSize: 12 }}>
          {fmtMoney(milestone.amount)} · שולם ב-{milestone.paidAt || '—'}
        </span>
      </div>
    );
  }

  if (locked) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 12px',
        background: '#F9FAFB',
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
  const { headline, cta } = buildHeadlineAndCTA(gates, {
    onSupervisorApprove, onAddProofPhoto,
    onReleasePayment: () => onRelease(milestone),
  }, milestone.amount);
  const ready = status === 'ready';

  return (
    <div style={{
      border: `1px solid ${ready ? '#A7F3D0' : 'var(--border)'}`,
      background: ready ? '#F0FDF4' : '#fff',
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
        color: ready ? '#065F46' : 'var(--text1)',
        marginBottom: 12,
      }}>
        {headline}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <PrimaryCTA cta={cta} />
        <WhatsMissing gates={gates} />
      </div>
    </div>
  );
};

export const MilestonesPanel = ({
  stage,
  onSupervisorApproveMs,
  onAddProofPhotoMs,
  onReleaseMs,
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
  const next   = active[0]; // only the first non-locked non-paid is "now"
  const later  = active.slice(1);

  return (
    <div style={{
      marginTop: 16,
      background: '#fff',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: 14,
    }}>
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
                  gates={gates} status={status} locked={false} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Next — the one that matters now */}
      {next ? (
        <MilestoneItem
          stage={stage} milestone={next.m} gates={next.gates}
          status={next.status} locked={false} isNext
          onSupervisorApprove={() => onSupervisorApproveMs(next.m.id)}
          onAddProofPhoto={() => onAddProofPhotoMs(next.m.id)}
          onRelease={(milestone) => onReleaseMs(milestone)}
        />
      ) : paid.length === ms.length ? (
        <div style={{
          padding: 14, textAlign: 'center',
          background: '#F0FDF4', border: '1px solid #BBF7D0',
          borderRadius: 10, fontSize: 13, color: '#065F46', fontWeight: 600,
        }}>
          כל התשלומים הושלמו 🎉
        </div>
      ) : null}

      {/* Future — collapsed by default, show count only */}
      {(later.length > 0 || future.length > 0) && (
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
            בהמשך — {later.length + future.length} שלבים
          </button>
          {showFuture && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[...later, ...future].map(({ m, gates, status }) => (
                <MilestoneItem key={m.id} stage={stage} milestone={m}
                  gates={gates} status={status} locked={status === 'locked'} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── ReleasePaymentModal — simple yes/cancel ──────────────────────────────────
export const ReleasePaymentModal = ({ stage, milestoneName, amount, onClose, onConfirm }) => {
  const finalAmount = amount ?? stage.payment?.amount ?? 0;
  return (
    <Modal title="לאשר תשלום?" onClose={onClose} width={440}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 14, color: 'var(--text1)', lineHeight: 1.5 }}>
          אתה משלם <b>{fmtMoney(finalAmount)}</b> ל<b>{stage.contractor}</b>
          {milestoneName ? <> עבור <b>{milestoneName}</b></> : <> עבור שלב <b>{stage.name}</b></>}.
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)' }}>
          יש לך 14 יום לטעון לפגם לאחר התשלום.
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-start' }}>
          <button
            onClick={onConfirm}
            style={{
              fontFamily: "'Heebo',sans-serif", fontWeight: 700, fontSize: 14,
              padding: '10px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: '#10B981', color: '#fff',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            <Icon n="check-circle" s={14} c="#fff" />
            שלם {fmtMoney(finalAmount)}
          </button>
          <Btn variant="ghost" size="md" onClick={onClose}>ביטול</Btn>
        </div>
      </div>
    </Modal>
  );
};
