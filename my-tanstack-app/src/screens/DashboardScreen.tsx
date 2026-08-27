import React from 'react';
import { motion } from 'framer-motion';
import { Link, Navigate } from '@tanstack/react-router';
import { Icon, ProgressBar, Badge, Avatar, Btn, Modal } from '../components/Shared';
import { ROLE_COLORS, fmtMoney } from '../utils/mockData';
import { useDataSource } from '../hooks/useDataSource';
import { ScreenBoundary } from '../components/ScreenBoundary';
import { useDashboardOverview } from '../hooks/useDashboardOverview';
import { BudgetSummaryCards } from '../components/BudgetSummaryCards';
import { useRequireRole } from '../hooks/useRequireRole';
import { useCurrentProject } from '../hooks/useCurrentProject';
import { DashboardCategoryBreakdown } from '../components/DashboardCategoryBreakdown';

import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { openUpgradeModal } from '../components/UpgradeModalHost';

// ── Stagger animation variants ──────────────────────────────────────────────
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};

export const DashboardScreen = () => {
  const { role } = useRequireRole(['owner', 'manager', 'inspector', 'contractor']);
  const { projects, isLoading: projectLoading, setCurrentProject } = useCurrentProject();
  const [showAllStages, setShowAllStages] = React.useState(false);
  const [showAllAlerts, setShowAllAlerts] = React.useState(false);
  const identity = useQuery(api.users.currentIdentity);

  // Free-tier retention warning — dismissed state via localStorage (7 days)
  const DISMISS_KEY = 'free_retention_warning_dismissed_at';
  const [retentionDismissed, setRetentionDismissed] = React.useState(() => {
    try {
      const saved = localStorage.getItem(DISMISS_KEY);
      if (!saved) return false;
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      return Date.now() - Number(saved) < sevenDays;
    } catch { return false; }
  });

  const dismissRetentionWarning = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setRetentionDismissed(true);
  };

  // Handle push-notification deep links: ?project=<id>
  React.useEffect(() => {
    const urlProject = new URLSearchParams(window.location.search).get('project');
    if (!urlProject) return;
    setCurrentProject(urlProject);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isFreeTier = identity !== undefined &&
    !identity?.isSuperAdmin &&
    (!identity?.subscriptionTier || identity?.subscriptionTier === 'free');

  const showRetentionBanner = isFreeTier && !retentionDismissed && role === 'owner';
  const { overview } = useDashboardOverview();
  const { data: dashboard, loading, error, refetch } = useDataSource<any>('dashboard', { db: overview });
  const seedAlert = useMutation(api.dashboard.seedAlert);
  const deleteAlert = useMutation(api.dashboard.deleteAlert);
  const deleteAllAlerts = useMutation(api.dashboard.deleteAllAlerts);

  const projectId = dashboard?.project?._id;
  const accessInfo = useQuery(api.projects.getProjectAccessInfo, projectId ? { projectId } : "skip");
  const canViewBudget = accessInfo?.canViewBudget ?? false;

  const contractorDashboard = useQuery(
    api.dashboard.getContractorDashboard,
    role === 'contractor' && projectId ? { projectId } : 'skip'
  );

  const [viewFile, setViewFile] = React.useState<{ url: string; name: string } | null>(null);

  if (!projectLoading && projects.length === 0) {
    if (role === 'owner') {
      return <Navigate to="/projects" />;
    } else {
      return (
        <ScreenBoundary
          isEmpty={true}
          emptyTitle="אין גישה לפרויקטים"
          emptyDesc="עדיין לא שויכת לאף פרויקט במערכת. אנא פנה למנהל הפרויקט כדי שיזמין אותך."
          emptyIcon="lock"
        >
          <div />
        </ScreenBoundary>
      );
    }
  }

  if (!dashboard || accessInfo === undefined) {
    return <ScreenBoundary loading={loading || accessInfo === undefined} error={error} onRetry={refetch}><div /></ScreenBoundary>;
  }

  const { project, stats, stages, recentActivity, topOverruns, alerts } = dashboard;
  const stageRows = stages ?? [];
  const rc = ROLE_COLORS;
  const fmtDate = (dateStr: string) => {
    if (!dateStr) return 'טרם הוגדר';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  // ── CONTRACTOR VIEW ────────────────────────────────────────────────────────
  if (role === 'contractor') {
    if (contractorDashboard === undefined) {
      return <ScreenBoundary loading={true} onRetry={refetch}><div /></ScreenBoundary>;
    }
    if (!contractorDashboard) {
      return <ScreenBoundary error={new Error("לא נמצאה רשומת קבלן עבור המשתמש הנוכחי בפרויקט זה.")} onRetry={refetch}><div /></ScreenBoundary>;
    }

    const { contractor, milestones, stages: contractorStages } = contractorDashboard;
    const paidPct = contractor.budget ? Math.min(100, Math.max(0, (contractor.paid / contractor.budget) * 100)) : 0;
    const remaining = Math.max(0, contractor.budget - contractor.paid);

    return (
      <ScreenBoundary loading={false} onRetry={refetch}>
        <div className="page-content">
          {/* Greeting Header */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16,
                background: 'linear-gradient(135deg, var(--accent-light) 0%, var(--accent-glow-sm) 100%)',
                color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1.5px solid var(--accent-glow-sm)',
                boxShadow: '0 4px 16px var(--accent-glow-sm)'
              }}>
                <Icon n="users" s={24} />
              </div>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
                  שלום, {contractor.name} 👋
                </h1>
                <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 3 }}>
                  {contractor.role} · פורטל קבלן מורשה ב-<strong style={{ color: 'var(--text2)' }}>{project.name}</strong>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Financial Cards */}
          <motion.div
            variants={containerVariants} initial="hidden" animate="show"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}
          >
            {[
              { label: 'סך הכל הסכם פרויקט', value: fmtMoney(contractor.budget), icon: 'clipboard', color: '#3B82F6', colorLight: 'rgba(59,130,246,0.12)' },
              { label: 'שולם בפועל', value: fmtMoney(contractor.paid), sub: `${paidPct.toFixed(1)}%`, icon: 'check-circle', color: 'var(--success)', colorLight: 'var(--success-light)' },
              { label: 'יתרת זכות לתשלום', value: fmtMoney(remaining), icon: 'chart', color: 'var(--accent)', colorLight: 'var(--accent-light)' },
            ].map((card, i) => (
              <motion.div key={card.label} variants={itemVariants}
                style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '20px 22px', position: 'relative', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}
                whileHover={{ y: -2, boxShadow: 'var(--shadow-lg)' }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${card.color}, transparent)`, borderRadius: 'var(--radius) var(--radius) 0 0' }} />
                <div style={{ width: 44, height: 44, borderRadius: 12, background: card.colorLight, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <Icon n={card.icon} s={22} />
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text1)', letterSpacing: '-0.5px' }}>{card.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{card.label}</div>
                {card.sub && <div style={{ fontSize: 12, color: card.color, fontWeight: 700, marginTop: 6 }}>{card.sub} מהחוזה</div>}
              </motion.div>
            ))}
          </motion.div>

          {/* Payment Milestones */}
          <motion.div variants={containerVariants} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <motion.div variants={itemVariants} className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon n="calendar" s={16} c="var(--accent)" />
                  לוח תשלומים ואבני דרך אישי
                </span>
                <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, background: 'var(--surface-2)', padding: '4px 10px', borderRadius: 20 }}>
                  שולם: {paidPct.toFixed(0)}% · {fmtMoney(contractor.paid)}
                </span>
              </div>

              <div style={{ padding: '16px 22px 0' }}>
                <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                  {milestones.map((m: any) => (
                    <div key={m.id} style={{ width: `${m.pct}%`, background: m.paid ? 'var(--success)' : 'transparent', borderLeft: '1px solid var(--bg)', position: 'relative', overflow: 'hidden' }} title={`${m.name}: ${m.pct}%`}>
                      {m.paid && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)', animation: 'shimmer 2.5s ease-in-out infinite' }} />}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ overflowX: 'auto', marginTop: 12 }}>
                <table className="bp-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>#</th><th>אבן דרך לתשלום</th><th>תנאי לשחרור</th>
                      <th>%</th><th>סכום</th><th>סטטוס</th><th>מסמכים</th>
                    </tr>
                  </thead>
                  <tbody>
                    {milestones.map((m: any, idx: number) => (
                      <tr key={m.id} style={{ background: m.paid ? 'rgba(16,185,129,0.04)' : 'transparent' }}>
                        <td style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 700 }}>{idx + 1}</td>
                        <td style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</td>
                        <td style={{ fontSize: 12, color: 'var(--text2)' }}>{m.triggerText || '—'}</td>
                        <td style={{ fontSize: 13, fontWeight: 600, textAlign: 'center' }}>{m.pct.toFixed(1)}%</td>
                        <td style={{ fontSize: 13, fontWeight: 700, color: m.paid ? 'var(--success)' : 'var(--text1)' }}>{fmtMoney(m.amount)}</td>
                        <td><span className={`badge ${m.paid ? 'badge-done' : 'badge-pending'}`}>{m.paid ? 'שולם' : 'ממתין'}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {m.files && m.files.length > 0 ? (
                              m.files.map((file: any) => (
                                <button key={file.id} onClick={() => setViewFile({ url: file.url, name: file.name })} title={`צפה ב-${file.name}`}
                                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, background: 'var(--info-light)', color: 'var(--info)', borderRadius: 6, border: 'none', cursor: 'pointer', transition: 'all 0.15s' }}>
                                  <Icon n="file-text" s={13} />
                                </button>
                              ))
                            ) : <span style={{ color: 'var(--text3)', fontSize: 11 }}>—</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {milestones.length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--text3)', fontSize: 13 }}>טרם הוגדר לוח תשלומים עבורך בפרויקט זה.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Contractor Stages */}
            <motion.div variants={itemVariants} className="card">
              <div className="card-header">
                <Icon n="layers" s={16} c="var(--accent)" />
                שלבי בנייה באחריותך המקצועית ({contractorStages.length})
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 16 }}>
                {contractorStages.map((s: any) => (
                  <motion.div key={s.id} whileHover={{ borderColor: 'var(--accent-glow-sm)', boxShadow: 'var(--shadow)' }}
                    style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', borderRadius: 12, padding: 16, background: 'var(--surface-2)', transition: 'all 0.2s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon n="layers" s={18} />
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>{s.name}</span>
                      </div>
                      <Badge type={s.status} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>
                      <span>התקדמות השלב:</span>
                      <span style={{ fontWeight: 700, color: 'var(--text1)' }}>{s.progressPct}%</span>
                    </div>
                    <ProgressBar value={s.progressPct} color={s.status === 'done' ? 'var(--success)' : s.status === 'active' ? 'var(--accent)' : 'var(--border)'} height={7} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                      <span>התחלה: <strong style={{ color: 'var(--text2)' }}>{fmtDate(s.startDate)}</strong></span>
                      <span>סיום צפוי: <strong style={{ color: 'var(--text2)' }}>{fmtDate(s.endDate)}</strong></span>
                    </div>
                  </motion.div>
                ))}
                {contractorStages.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 32, color: 'var(--text3)', fontSize: 13, border: '1px dashed var(--border)', borderRadius: 10 }}>
                    לא נמצאו שלבי בנייה המשויכים אליך כרגע.
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>

          {viewFile && (
            <Modal title={viewFile.name} onClose={() => setViewFile(null)}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                {viewFile.url.endsWith('.pdf') || viewFile.name.toLowerCase().endsWith('.pdf') ? (
                  <iframe src={viewFile.url} style={{ width: '100%', height: '500px', border: 'none' }} title="PDF Preview" />
                ) : (
                  <img src={viewFile.url} alt={viewFile.name} style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8, objectFit: 'contain' }} />
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                  <Btn onClick={() => setViewFile(null)}>סגור</Btn>
                </div>
              </div>
            </Modal>
          )}
        </div>
      </ScreenBoundary>
    );
  }

  // ── OWNER / MANAGER / INSPECTOR VIEW ──────────────────────────────────────
  return (
    <ScreenBoundary loading={loading} error={error} onRetry={refetch}>
      <div className="page-content">

        {/* ── Page Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: 'linear-gradient(135deg, var(--accent-light) 0%, var(--accent-glow-sm) 100%)',
              color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1.5px solid var(--accent-glow-sm)', boxShadow: '0 4px 16px var(--accent-glow-sm)',
              flexShrink: 0
            }}>
              <Icon n="home" s={24} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.4px', lineHeight: 1.2 }}>
                {project.name}
              </h1>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon n="layers" s={12} c="var(--text3)" />
                {project.address}
              </div>
            </div>
          </div>
          {import.meta.env.DEV && (
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn size="sm" variant="secondary" onClick={() => seedAlert({ projectId: project._id })}>+ התראת טסט</Btn>
              <Btn size="sm" variant="danger" onClick={() => deleteAllAlerts({ projectId: project._id })}>מחק הכל</Btn>
            </div>
          )}
        </motion.div>

        {/* ── Retention Banner ── */}
        {showRetentionBanner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              position: 'relative',
              background: 'rgba(245, 158, 11, 0.07)',
              border: '1px solid rgba(245, 158, 11, 0.28)',
              borderRight: '4px solid #F59E0B',
              borderRadius: 14,
              padding: '14px 44px 14px 18px',
              marginBottom: 20,
              display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12,
            }}
          >
            <button onClick={dismissRetentionWarning} title="הסתר למשך שבוע"
              style={{ position: 'absolute', top: 10, left: 14, background: 'none', border: 'none', cursor: 'pointer', color: '#B45309', padding: 4, opacity: 0.6, lineHeight: 1, borderRadius: 4 }}>
              <Icon n="x" s={16} />
            </button>
            <div style={{ flex: '1 1 200px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 700, color: '#B45309', fontSize: 14, lineHeight: 1.4 }}>פרויקט לא פעיל מעל 3 חודשים עלול להימחק</div>
                <div style={{ fontSize: 12, color: '#92400E', marginTop: 3 }}>חשבון חינמי ללא פעילות — הנתונים נמחקים אוטומטית. שדרג לפרו כדי לשמור עליהם.</div>
              </div>
            </div>
            <button onClick={() => openUpgradeModal({ title: 'שמור על הנתונים שלך', reason: 'משתמשי פרו לא נמחקים גם אחרי חודשים של אי-פעילות.' })}
              style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 24, boxShadow: '0 3px 10px rgba(217,119,6,0.3)' }}>
              ⭐ שדרג לפרו
            </button>
          </motion.div>
        )}

        {/* ── Alerts ── */}
        {alerts && alerts.length > 0 && (() => {
          const getAlertStyle = (type: string) => {
            switch (type) {
              case 'danger': return { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.3)', text: '#EF4444', borderAccent: '#EF4444' };
              case 'info':   return { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.3)', text: '#3B82F6', borderAccent: '#3B82F6' };
              case 'warning':
              default: return { bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.28)', text: '#B45309', borderAccent: '#F59E0B' };
            }
          };
          const mainStyle = getAlertStyle(alerts[0].type);

          return (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: mainStyle.bg,
                border: `1px solid ${mainStyle.border}`,
                borderRight: `4px solid ${mainStyle.borderAccent}`,
                borderRadius: 14,
                padding: 16,
                marginBottom: 24,
                display: 'flex', flexDirection: 'column', gap: 12
              }}
            >
              {!showAllAlerts ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: '1 1 160px', display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, color: mainStyle.text }}>
                    <Icon n="alert" s={20} />
                    <span>{alerts[0].text}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    {alerts[0].isDynamic && alerts[0].link && (
                      <Link to={alerts[0].link} style={{ color: mainStyle.text, fontWeight: 700, textDecoration: 'none', border: `1.5px solid ${mainStyle.text}`, padding: '5px 12px', borderRadius: 8, fontSize: 13, whiteSpace: 'nowrap', background: 'transparent' }}>
                        {alerts[0].actionText || 'לטפל'}
                      </Link>
                    )}
                    {!alerts[0].isDynamic && <span style={{ fontSize: 13, color: 'var(--text2)' }}>{alerts[0].dateLabel}</span>}
                    {!alerts[0].isDynamic && (
                      <button onClick={() => deleteAlert({ alertId: alerts[0].id })} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4, borderRadius: 4 }} title="מחק התראה">
                        <Icon n="x" s={16} />
                      </button>
                    )}
                    {alerts.length > 1 && (
                      <button onClick={() => setShowAllAlerts(true)} style={{ background: 'none', border: 'none', color: mainStyle.text, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', fontSize: 13, whiteSpace: 'nowrap' }}>
                        ראה הכל ({alerts.length})
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontWeight: 800, color: mainStyle.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icon n="alert" s={20} />
                      <span>כל ההתראות ({alerts.length})</span>
                    </div>
                    <button onClick={() => setShowAllAlerts(false)} style={{ background: 'none', border: 'none', color: mainStyle.text, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', fontSize: 13 }}>הסתר</button>
                  </div>
                  {alerts.map((alert: any, idx: number) => {
                    const ast = getAlertStyle(alert.type);
                    return (
                      <div key={alert.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: '12px 0', borderTop: idx > 0 ? `1px solid ${mainStyle.border}` : 'none' }}>
                        <div style={{ flex: '1 1 160px', display: 'flex', alignItems: 'center', gap: 10, fontWeight: 500, color: ast.text }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: ast.text, flexShrink: 0 }} />
                          <span>{alert.text}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                          {alert.isDynamic && alert.link && (
                            <Link to={alert.link} style={{ color: ast.text, fontWeight: 700, textDecoration: 'none', border: `1.5px solid ${ast.text}`, padding: '5px 12px', borderRadius: 8, fontSize: 13, whiteSpace: 'nowrap', background: 'transparent' }}>
                              {alert.actionText || 'לטפל'}
                            </Link>
                          )}
                          {!alert.isDynamic && <span style={{ fontSize: 13, color: 'var(--text2)' }}>{alert.dateLabel}</span>}
                          {!alert.isDynamic && (
                            <button onClick={() => deleteAlert({ alertId: alert.id })} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4, borderRadius: 4 }} title="מחק התראה">
                              <Icon n="x" s={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </motion.div>
          );
        })()}

        {/* ── Budget Summary Cards ── */}
        {canViewBudget && <BudgetSummaryCards summary={stats} style={{ marginBottom: 28 }} />}

        {/* ── Main Grid ── */}
        <motion.div
          variants={containerVariants} initial="hidden" animate="show"
          style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}
        >
          {/* ── Left Column ── */}
          <div style={{ flex: '1 1 480px', display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>

            {/* Progress Card */}
            <motion.div variants={itemVariants} className="card">
              <div className="card-header">
                <Icon n="chart" s={16} c="var(--accent)" />
                התקדמות פרויקט
              </div>
              <div className="card-body" style={{ paddingTop: 18 }}>
                {/* Overall progress */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>סה"כ</span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.5px' }}>{project.progressPct}%</span>
                </div>
                <ProgressBar value={project.progressPct} height={10} />

                {/* Per-stage progress */}
                <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(showAllStages ? stageRows : stageRows.slice(0, 4)).map((s: any) => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 110, fontSize: 12, color: s.status === 'active' ? 'var(--text1)' : 'var(--text3)', fontWeight: s.status === 'active' ? 700 : 500, textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.name}
                      </div>
                      <div style={{ flex: 1 }}>
                        <ProgressBar
                          value={s.progressPct}
                          color={s.status === 'done' ? 'var(--success)' : s.status === 'active' ? 'var(--accent)' : 'var(--border)'}
                          height={6}
                          noShimmer={s.status !== 'active'}
                        />
                      </div>
                      <Badge type={s.status} />
                    </div>
                  ))}
                  {stageRows.length > 0 && (
                    <button onClick={() => setShowAllStages(v => !v)}
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 12.5, color: 'var(--accent)', fontFamily: "'Heebo',sans-serif", fontWeight: 700, padding: '8px 0', textAlign: 'center', width: '100%', borderRadius: 8, marginTop: 4, transition: 'all 0.2s' }}>
                      {showAllStages ? 'הסתר שלבים ▲' : `הצג את כל השלבים (${stageRows.length}) ▼`}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Budget Card */}
            {canViewBudget && (
              <motion.div variants={itemVariants} className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon n="chart" s={16} c="var(--accent)" />
                    תקציב ותשלומים
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, background: 'var(--surface-2)', padding: '4px 10px', borderRadius: 20 }}>
                    יתרה: {fmtMoney(stats.remainingBudget)}
                  </span>
                </div>
                <div className="card-body" style={{ paddingTop: 16 }}>
                  <div style={{ display: 'flex', gap: 20, marginBottom: 18, flexWrap: 'wrap' }}>
                    {[
                      { label: 'תקציב', v: stats.totalBudget, c: 'var(--text1)' },
                      { label: 'הוצא', v: stats.totalSpent, c: 'var(--accent)' },
                      { label: 'מחויב', v: stats.committed, c: 'var(--warning)' }
                    ].map(x => (
                      <div key={x.label} style={{ flex: '1 1 90px' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: x.c, letterSpacing: '-0.4px' }}>{fmtMoney(x.v)}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{x.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ height: 12, background: 'var(--border)', borderRadius: 6, overflow: 'hidden', display: 'flex', position: 'relative' }}>
                    <div style={{ width: `${stats.totalBudget ? (stats.totalSpent / stats.totalBudget * 100) : 0}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent-dark))', transition: 'width .5s', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)', animation: 'shimmer 2.5s ease-in-out infinite' }} />
                    </div>
                    <div style={{ width: `${stats.totalBudget ? (stats.committed / stats.totalBudget * 100) : 0}%`, background: '#FDE68A' }} />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 10, fontSize: 11.5, color: 'var(--text3)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent)', display: 'inline-block' }} />
                      הוצא {stats.totalBudget ? (stats.totalSpent / stats.totalBudget * 100).toFixed(1) : '0.0'}%
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: '#FDE68A', display: 'inline-block' }} />
                      מחויב {stats.totalBudget ? (stats.committed / stats.totalBudget * 100).toFixed(1) : '0.0'}%
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Budget Category Breakdown (lite) */}
            {canViewBudget && projectId && (
              <DashboardCategoryBreakdown projectId={projectId} />
            )}

            {/* Top Overruns */}
            {canViewBudget && topOverruns.length > 0 && (
              <motion.div variants={itemVariants} className="card">
                <div className="card-header">
                  <Icon n="alert" s={16} c="var(--danger)" />
                  חריגות מובילות
                </div>
                <div className="card-body" style={{ paddingTop: 14 }}>
                  {topOverruns.map((item: any, i: number) => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < topOverruns.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 13 }}>
                      <span style={{ color: 'var(--text1)', fontWeight: 500 }}>{item.name}</span>
                      <span style={{ fontWeight: 800, color: 'var(--danger)', background: 'var(--danger-light)', padding: '3px 10px', borderRadius: 8, fontSize: 12 }}>+{fmtMoney(item.overrun)}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* ── Right Column ── */}
          <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>

            {/* Project Info Card */}
            <motion.div variants={itemVariants} className="card">
              <div className="card-header">
                <Icon n="clipboard" s={16} c="var(--accent)" />
                פרטי פרויקט
              </div>
              <div className="card-body" style={{ paddingTop: 14 }}>
                {[
                  ['שם הפרויקט', project.name],
                  ['כתובת', project.address],
                  ['בעל הבית', project.ownerName],
                  ['מנהל פרויקט', project.managerName],
                  ['מפקח', project.inspectorName],
                  ['תחילת עבודה', fmtDate(project.startDate)],
                  ['סיום צפוי', fmtDate(project.expectedEnd)],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: 13, gap: 12 }}>
                    <span style={{ color: 'var(--text3)', fontWeight: 600, flexShrink: 0 }}>{k}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text1)', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v || '—'}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Activity Feed — Timeline Style */}
            <motion.div variants={itemVariants} className="card">
              <div className="card-header">
                <Icon n="clock" s={16} c="var(--accent)" />
                פעילות אחרונה
              </div>
              <div style={{ padding: '8px 0 4px' }}>
                {recentActivity.map((a: any, i: number) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06, type: 'spring', stiffness: 300, damping: 28 }}
                    whileHover={{ background: 'var(--surface-2)' }}
                    style={{ display: 'flex', gap: 12, padding: '12px 22px', borderBottom: i < recentActivity.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                  >
                    <Avatar letter={a.actorName[0]} color={rc[a.role as keyof typeof rc]} size={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{a.actorName}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--text2)', marginTop: 2, lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{a.text}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5 }}>{new Date(a.createdAt).toLocaleString('he-IL')}</div>
                    </div>
                  </motion.div>
                ))}
                {recentActivity.length === 0 && (
                  <div style={{ padding: '20px 22px', fontSize: 13, color: 'var(--text3)', textAlign: 'center' }}>אין פעילות אחרונה להצגה.</div>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </ScreenBoundary>
  );
};
