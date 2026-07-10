// @ts-nocheck

import * as React from 'react';
import { motion } from 'framer-motion';
import { Icon } from './Shared';
import { PROJECT, STAGES, BUDGET_CATS, CONTRACTORS_DATA, fmtMoney, fmt } from '../utils/mockData';

// ── Decision Engine — color tokens ───────────────────────────────────────────
const STATUS = {
  green:  { fg:"#065F46", bg:"#D1FAE5", border:"#A7F3D0", dot:"#10B981", icon:"check-circle" },
  yellow: { fg:"#92400E", bg:"#FEF3C7", border:"#FDE68A", dot:"#F59E0B", icon:"alert" },
  red:    { fg:"#991B1B", bg:"#FEE2E2", border:"#FECACA", dot:"#EF4444", icon:"alert" },
  blue:   { fg:"#1E40AF", bg:"#DBEAFE", border:"#BFDBFE", dot:"#3B82F6", icon:"chart" },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const parseDMY = (s) => {
  if (!s) return null;
  const [d, m, y] = s.split('/').map(Number);
  return new Date(y, m - 1, d);
};
const daysBetween = (a, b) => Math.round((a - b) / 86400000);

// ── Insight computation ──────────────────────────────────────────────────────
export const computeHealth = () => {
  const totalBudget = BUDGET_CATS.reduce((a, c) => a + c.budget, 0);
  const totalSpent  = BUDGET_CATS.reduce((a, c) => a + c.spent, 0);
  const progress    = PROJECT.progress;
  const spentPct    = totalBudget ? totalSpent / totalBudget : 0;
  const forecast    = progress > 0 ? totalSpent / (progress / 100) : totalSpent;
  const overrun     = forecast - totalBudget;
  const remaining   = totalBudget - totalSpent;

  // -- Budget -----------------------------------------------------------------
  let budget;
  if (spentPct > 1 || overrun / totalBudget > 0.05) {
    const topOver = [...BUDGET_CATS]
      .filter(c => c.spent > c.budget)
      .sort((a, b) => (b.spent - b.budget) - (a.spent - a.budget))
      .slice(0, 2)
      .map(c => c.name)
      .join(', ');
    budget = {
      status: 'red',
      title: `חרגת מהתקציב ב-${fmtMoney(Math.round(overrun))}`,
      body: topOver
        ? `עיקר החריגה: ${topOver}. בקצב הנוכחי הפרויקט יסתיים ב-${fmtMoney(Math.round(forecast))}.`
        : `בקצב הנוכחי הפרויקט יסתיים ב-${fmtMoney(Math.round(forecast))}, מעל התקציב שנקבע.`,
      cta: 'הצג פירוק חריגות',
    };
  } else if (spentPct > 0.9 || overrun > 0) {
    budget = {
      status: 'yellow',
      title: `קרוב לגבול — צפויה חריגה של ${fmtMoney(Math.max(0, Math.round(overrun)))}`,
      body: `הוצאת ${Math.round(spentPct * 100)}% מהתקציב ונותרו ${100 - progress}% מהפרויקט. שקול לצמצם בשלבים הבאים.`,
      cta: 'ראה איפה לחסוך',
    };
  } else {
    budget = {
      status: 'green',
      title: `תקציב מאוזן — נותרו ${fmtMoney(remaining)} ברזרבה`,
      body: `הוצאת ${Math.round(spentPct * 100)}% מהתקציב לאחר ${progress}% התקדמות. הפרויקט צפוי להסתיים בתוך התקציב.`,
      cta: 'צפה בפירוט תקציב',
    };
  }

  // -- Schedule ---------------------------------------------------------------
  const today = new Date();
  const start = parseDMY(PROJECT.startDate);
  const expEnd = parseDMY(PROJECT.expectedEnd);
  const active = STAGES.find(s => s.status === 'active');
  let delayDays = 0;
  if (active && active.end) {
    const plannedStageEnd = new Date(active.end);
    const stageRemainingPct = (100 - active.progress) / 100;
    const daysPast = daysBetween(today, plannedStageEnd);
    if (daysPast > 0) delayDays = Math.max(delayDays, Math.round(daysPast * (1 - stageRemainingPct * 0.5)));
  }
  if (start && expEnd) {
    const totalDur = daysBetween(expEnd, start);
    const elapsed = daysBetween(today, start);
    const expectedProgress = Math.max(0, Math.min(100, (elapsed / totalDur) * 100));
    if (expectedProgress > progress) {
      delayDays = Math.max(delayDays, Math.round(((expectedProgress - progress) / 100) * totalDur));
    }
  }
  const newEnd = expEnd ? new Date(expEnd.getTime() + delayDays * 86400000) : null;
  const fmtDate = (d) => d ? d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

  let schedule;
  if (delayDays <= 3) {
    schedule = {
      status: 'green',
      title: `בזמן — סיום צפוי ב-${fmtDate(expEnd)}`,
      body: `${STAGES.filter(s => s.status === 'done').length} מתוך ${STAGES.length} שלבים הושלמו לפי התכנון. השלב הפעיל: ${active?.name || '—'}.`,
      cta: 'צפה בלוח הזמנים',
    };
  } else if (delayDays <= 10) {
    schedule = {
      status: 'yellow',
      title: `עיכוב של ${delayDays} ימים — עדיין ניתן לצמצם`,
      body: `השלב הנוכחי (${active?.name || '—'}) מתעכב. שקול עבודה מקבילה של קבלנים כדי לסגור את הפער.`,
      cta: 'בנה תכנית תאוצה',
    };
  } else {
    schedule = {
      status: 'red',
      title: `עיכוב מצטבר של ${delayDays} ימים — תאריך סיום חדש: ${fmtDate(newEnd)}`,
      body: `השלב הפעיל "${active?.name || '—'}" חרג מלוח הזמנים. נדרש לעדכן בעלי עניין ולשקול החלפת קבלנים בנתיב הקריטי.`,
      cta: 'עדכן לוח זמנים',
    };
  }

  // -- Contractors ------------------------------------------------------------
  const activeContractors = CONTRACTORS_DATA.filter(c => c.status === 'active');
  const flagged = activeContractors.map(c => {
    const paidPct = c.budget ? (c.paid / c.budget) * 100 : 0;
    const gap = paidPct - progress;
    return { ...c, paidPct, gap };
  }).filter(c => c.gap > 15);

  let contractors;
  if (flagged.length === 0) {
    contractors = {
      status: 'green',
      title: `${activeContractors.length} קבלנים פעילים — הכל תקין`,
      body: 'אין תשלומים בפיגור ואין אבני דרך שהוחמצו. המשך מעקב שגרתי.',
      cta: 'נהל קבלנים',
    };
  } else if (flagged.length === 1) {
    const c = flagged[0];
    contractors = {
      status: 'yellow',
      title: `קבלן אחד דורש תשומת לב — ${c.name}`,
      body: `${c.role}: שולמו ${Math.round(c.paidPct)}% מהחוזה מול התקדמות של ${progress}% בפרויקט. פער של ${Math.round(c.gap)} נקודות.`,
      cta: 'צור קשר ועדכן מילסטון',
    };
  } else {
    const names = flagged.slice(0, 2).map(c => c.name).join(' · ');
    contractors = {
      status: 'red',
      title: `${flagged.length} קבלנים דורשים טיפול מיידי`,
      body: `${names} — שולמו מעבר להתקדמות בפועל. סכנה לתשלום יתר ללא תוצר.`,
      cta: 'פתח בירור',
    };
  }

  // -- Overall ----------------------------------------------------------------
  const score = (s) => s === 'green' ? 100 : s === 'yellow' ? 60 : 20;
  const overallScore =
    score(budget.status)      * 0.40 +
    score(schedule.status)    * 0.35 +
    score(contractors.status) * 0.25;

  let overall;
  if (overallScore >= 80) {
    overall = {
      status: 'green',
      title: 'הפרויקט שלך במסלול טוב',
      body: `תקציב מאוזן · לוח זמנים לפי תכנון · ללא בעיות קבלנים פתוחות. תאריך סיום צפוי: ${fmtDate(expEnd)}.`,
    };
  } else if (overallScore >= 50) {
    const issues = [budget, schedule, contractors].filter(x => x.status !== 'green').length;
    overall = {
      status: 'yellow',
      title: `דורש תשומת לב — ${issues} נושאים פתוחים`,
      body: 'הפרויקט עדיין ניתן לייצוב. פעל על התובנות למטה לפני שהן יהפכו לבעיות.',
    };
  } else {
    overall = {
      status: 'red',
      title: 'הפרויקט בסיכון — נדרשות החלטות',
      body: `חריגה תקציבית · עיכוב של ${delayDays} ימים · ${flagged.length || 'מספר'} קבלנים לטיפול. פתח את התובנות וקבל החלטה היום.`,
    };
  }

  return { overall, budget, schedule, contractors };
};

export const ProjectHealthBanner = ({ overall, onOpen }) => {
  const s = STATUS[overall.status];
  return (
    <motion.div 
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{
        background: `linear-gradient(135deg, ${s.bg} 0%, ${s.bg}cc 100%)`,
        border: `1px solid ${s.border}`,
        borderRadius: 14,
        marginBottom: 24,
        padding: "18px 24px",
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: "rgba(255,255,255,0.8)",
        border: `1.5px solid ${s.dot}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        boxShadow: `0 4px 12px ${s.dot}33`,
      }}>
        <Icon n={s.icon} s={22} c={s.dot} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15.5, fontWeight: 800, color: s.fg, lineHeight: 1.3 }}>
          {overall.title}
        </div>
        <div style={{ fontSize: 13, color: s.fg, opacity: .8, marginTop: 5, lineHeight: 1.5 }}>
          {overall.body}
        </div>
      </div>
      {onOpen && (
        <button
          onClick={onOpen}
          style={{
            background: "rgba(255,255,255,0.85)",
            border: `1.5px solid ${s.border}`,
            color: s.fg,
            fontFamily: "'Heebo',sans-serif",
            fontWeight: 700,
            fontSize: 13,
            padding: "9px 16px",
            borderRadius: 10,
            cursor: "pointer",
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: 6,
            transition: "background .15s",
          }}
        >
          פתח מרכז החלטות
          <Icon n="arrow-right" s={14} c={s.fg} />
        </button>
      )}
    </motion.div>
  );
};

export const InsightCard = ({ insight, icon, onAction, variants }) => {
  const s = STATUS[insight.status];
  return (
    <motion.div 
      variants={variants}
      whileHover={{ y: -5, boxShadow: "var(--shadow-xl)", borderColor: s.dot }}
      className="card" 
      style={{
        padding: 24,
        borderTop: `3px solid ${s.dot}`,
        borderColor: "var(--border)",
        background: `linear-gradient(160deg, ${s.bg}22 0%, var(--surface) 60%)`,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minHeight: 185,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: s.bg, color: s.dot,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
          border: `1px solid ${s.border}`,
          boxShadow: `0 2px 8px ${s.dot}22`,
        }}>
          <Icon n={icon} s={16} c={s.dot} />
        </div>
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          color: s.fg,
          background: s.bg,
          padding: "3px 8px",
          borderRadius: 999,
          letterSpacing: ".2px",
        }}>
          {insight.status === 'green' ? 'תקין' : insight.status === 'yellow' ? 'שימו לב' : 'דורש פעולה'}
        </span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text1)", lineHeight: 1.35 }}>
        {insight.title}
      </div>
      <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.5, flex: 1 }}>
        {insight.body}
      </div>
      {insight.cta && (
        <button
          onClick={onAction}
          style={{
            alignSelf: "flex-start",
            background: "transparent",
            border: "none",
            color: "var(--accent)",
            fontFamily: "'Heebo',sans-serif",
            fontWeight: 600,
            fontSize: 13,
            padding: 0,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {insight.cta}
          <Icon n="arrow-right" s={13} c="var(--accent)" />
        </button>
      )}
    </motion.div>
  );
};

// ── InsightCardsRow — Budget / Schedule / Contractors ────────────────────────
export const InsightCardsRow = ({ health }) => {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 20,
        marginBottom: 32,
      }}
    >
      <InsightCard insight={health.budget} icon="chart" variants={item} />
      <InsightCard insight={health.schedule} icon="calendar" variants={item} />
      <InsightCard insight={health.contractors} icon="users" variants={item} />
    </motion.div>
  );
};
