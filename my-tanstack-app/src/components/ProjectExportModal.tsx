import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Icon, Btn } from './Shared';
import { buildProjectZip, triggerDownload, type ExportSections, type ExportProgress } from '../utils/projectExporter';
import { useAppNotify } from '../hooks/useAppNotify';

// ── Section definitions ────────────────────────────────────────────────────

type SectionKey = keyof ExportSections;

type SectionDef = {
  key: SectionKey;
  label: string;
  icon: string;
  countFn?: (manifest: any) => number | null;
  hintFn?: (manifest: any) => string;
};

const SECTIONS: SectionDef[] = [
  {
    key: 'stages',
    label: 'שלבי בנייה ומשימות',
    icon: 'layers',
    countFn: (m) => m?.stages?.length ?? null,
    hintFn: (m) => m?.stages?.length ? `${m.stages.length} שלבים` : '',
  },
  {
    key: 'contractors',
    label: 'קבלנים ותשלומים',
    icon: 'hard-hat',
    countFn: (m) => m?.contractors?.length ?? null,
    hintFn: (m) => m?.contractors?.length ? `${m.contractors.length} קבלנים` : '',
  },
  {
    key: 'dailyLogs',
    label: 'יומני עבודה',
    icon: 'clipboard-list',
    countFn: (m) => m?.dailyLogs?.length ?? null,
    hintFn: (m) => m?.dailyLogs?.length ? `${m.dailyLogs.length} יומנים` : '',
  },
  {
    key: 'photos',
    label: 'תמונות אתר',
    icon: 'image',
    countFn: (m) => m?.photos?.length ?? null,
    hintFn: (m) => m?.photos?.length ? `${m.photos.length} תמונות` : '',
  },
  {
    key: 'permits',
    label: 'היתרים ורישוי',
    icon: 'file-check',
    countFn: (m) => m?.permits?.length ?? null,
    hintFn: (m) => m?.permits?.length ? `${m.permits.length} מסמכים` : '',
  },
  {
    key: 'documents',
    label: 'מסמכים וקבצים',
    icon: 'file-text',
    countFn: (m) => m?.documents?.length ?? null,
    hintFn: (m) => m?.documents?.length ? `${m.documents.length} קבצים` : '',
  },
  {
    key: 'budget',
    label: 'תקציב והוצאות',
    icon: 'wallet',
    hintFn: (m) => m?.budget ? 'תקציב + הוצאות (JSON + CSV)' : '',
  },
  {
    key: 'boq',
    label: 'BOQ — כמויות ועבודות',
    icon: 'table',
    countFn: (m) => m?.boq?.length ?? null,
    hintFn: (m) => m?.boq?.length ? `${m.boq.length} פריטים (JSON + CSV)` : '',
  },
  {
    key: 'orders',
    label: 'הזמנות חומרים',
    icon: 'package',
    countFn: (m) => m?.orders?.length ?? null,
    hintFn: (m) => m?.orders?.length ? `${m.orders.length} הזמנות` : '',
  },
  {
    key: 'checklists',
    label: "צ'קליסטים",
    icon: 'check-square',
    countFn: (m) => m?.checklists?.length ?? null,
    hintFn: (m) => m?.checklists?.length ? `${m.checklists.length} רשימות` : '',
  },
  {
    key: 'timeline',
    label: 'ציר זמן',
    icon: 'calendar-range',
    hintFn: (m) => m?.timeline?.length ? `${m.timeline.length} פסים` : '',
  },
  {
    key: 'activityFeed',
    label: 'יומן פעילות',
    icon: 'activity',
    countFn: (m) => m?.activityFeed?.length ?? null,
    hintFn: (m) => m?.activityFeed?.length ? `${m.activityFeed.length} רשומות` : '',
  },
  {
    key: 'priceQuotes',
    label: 'הצעות מחיר',
    icon: 'receipt',
    countFn: (m) => m?.priceQuotes?.length ?? null,
    hintFn: (m) => m?.priceQuotes?.length ? `${m.priceQuotes.length} הצעות` : '',
  },
];

const ALL_SELECTED: ExportSections = Object.fromEntries(
  SECTIONS.map((s) => [s.key, true]),
) as ExportSections;

// ── Component ──────────────────────────────────────────────────────────────

type Step = 'select' | 'downloading' | 'done';

type Props = {
  projectId: Id<'projects'>;
  projectName: string;
  onClose: () => void;
};

export function ProjectExportModal({ projectId, projectName, onClose }: Props) {
  const { notify } = useAppNotify();
  const [step, setStep] = React.useState<Step>('select');
  const [selected, setSelected] = React.useState<ExportSections>({ ...ALL_SELECTED });
  const [progress, setProgress] = React.useState<ExportProgress>({
    phase: 'preparing',
    current: 0,
    total: 0,
    label: 'מכין נתונים...',
  });
  const [downloadedBlob, setDownloadedBlob] = React.useState<Blob | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const deleteProject = useMutation(api.projects.deleteProject);

  // Fetch manifest — only after user clicks Download
  const [shouldFetch, setShouldFetch] = React.useState(false);
  const manifest = useQuery(
    api.projectExport.generateExportManifest,
    shouldFetch ? { projectId, sections: selected } : 'skip',
  );

  // Toggle section
  const toggle = (key: SectionKey) =>
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));

  const allOn = SECTIONS.every((s) => selected[s.key]);
  const toggleAll = () => {
    const next = !allOn;
    setSelected(Object.fromEntries(SECTIONS.map((s) => [s.key, next])) as ExportSections);
  };

  // When manifest arrives, build ZIP
  React.useEffect(() => {
    if (!manifest || step !== 'downloading') return;
    let cancelled = false;

    (async () => {
      try {
        const blob = await buildProjectZip(manifest, (p) => {
          if (!cancelled) setProgress(p);
        });
        if (!cancelled) {
          setDownloadedBlob(blob);
          const filename = `BuildPro_${projectName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.zip`;
          triggerDownload(blob, filename);
          setStep('done');
        }
      } catch (err) {
        if (!cancelled) {
          setProgress({ phase: 'error', current: 0, total: 0, label: 'שגיאה ביצירת הארכיון' });
          notify({ title: 'שגיאה ביצוא', body: 'לא ניתן היה ליצור את הארכיון. נסה שוב.', kind: 'error' });
        }
      }
    })();

    return () => { cancelled = true; };
  }, [manifest, step, projectName, notify]);

  const handleStartDownload = () => {
    setStep('downloading');
    setProgress({ phase: 'preparing', current: 0, total: 0, label: 'מביא נתונים מהשרת...' });
    setShouldFetch(true);
  };

  const handleDeleteProject = async () => {
    setDeleting(true);
    try {
      await deleteProject({ projectId });
      notify({ title: 'הפרויקט נמחק', body: `"${projectName}" נמחק בהצלחה.`, kind: 'success' });
      onClose();
    } catch (err) {
      notify({ title: 'שגיאה', body: 'מחיקת הפרויקט נכשלה. נסה שוב.', kind: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const pct = progress.phase === 'packing'
    ? progress.current
    : progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={step === 'downloading' ? undefined : onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(6px)',
          zIndex: 10000,
          display: 'grid', placeItems: 'center',
          padding: 20,
        }}
      >
        <motion.div
          initial={{ scale: 0.93, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--surface)',
            borderRadius: 20,
            width: '100%',
            maxWidth: 520,
            maxHeight: '90vh',
            overflow: 'hidden',
            boxShadow: '0 30px 60px -12px rgba(0,0,0,0.35)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* ─── Header ────────────────────────────────────────────────────── */}
          <div style={{
            background: 'linear-gradient(135deg, #E07A38 0%, #c95e1e 100%)',
            padding: '20px 24px',
            color: '#fff',
            position: 'relative',
            flexShrink: 0,
          }}>
            {step !== 'downloading' && (
              <button
                type="button"
                onClick={onClose}
                aria-label="סגור"
                style={{
                  position: 'absolute', insetInlineEnd: 14, top: 14,
                  background: 'rgba(255,255,255,0.2)', border: 'none',
                  borderRadius: 8, width: 28, height: 28, cursor: 'pointer',
                  color: '#fff', display: 'grid', placeItems: 'center',
                }}
              >
                <Icon n="x" s={14} />
              </button>
            )}
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'grid', placeItems: 'center', marginBottom: 10,
            }}>
              <Icon n="archive" s={22} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
              {step === 'select' && 'ייצוא ארכיון פרויקט'}
              {step === 'downloading' && 'מוריד ארכיון...'}
              {step === 'done' && '✅ הארכיון מוכן!'}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.88 }}>
              {step === 'select' && `${projectName} — בחר מה לכלול בקובץ ה-ZIP`}
              {step === 'downloading' && progress.label}
              {step === 'done' && 'הקובץ הורד למחשב שלך'}
            </p>
          </div>

          {/* ─── Body ──────────────────────────────────────────────────────── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

            {/* ── Step 1: Select ─────────────────────────────────────────── */}
            {step === 'select' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Always-included banner */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px',
                  background: 'rgba(224,122,56,0.08)',
                  border: '1px solid rgba(224,122,56,0.25)',
                  borderRadius: 10, marginBottom: 4,
                }}>
                  <Icon n="lock" s={14} c="var(--accent)" />
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>
                    פרטי הפרויקט תמיד נכללים בארכיון
                  </span>
                </div>

                {/* Select all toggle */}
                <button
                  type="button"
                  onClick={toggleAll}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'none', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '7px 12px', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, color: 'var(--text1)',
                    fontFamily: 'inherit', marginBottom: 4,
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: 5,
                    background: allOn ? 'var(--accent)' : 'var(--surface-2)',
                    border: `2px solid ${allOn ? 'var(--accent)' : 'var(--border-strong)'}`,
                    display: 'grid', placeItems: 'center', flexShrink: 0,
                    transition: 'all 0.15s',
                  }}>
                    {allOn && <Icon n="check" s={11} c="#fff" />}
                  </div>
                  {allOn ? 'בטל בחירת הכל' : 'בחר הכל'}
                </button>

                {/* Section checkboxes */}
                {SECTIONS.map((section) => {
                  const isOn = selected[section.key];
                  return (
                    <button
                      key={section.key}
                      type="button"
                      onClick={() => toggle(section.key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 14px',
                        background: isOn ? 'rgba(224,122,56,0.06)' : 'var(--surface-2)',
                        border: `1.5px solid ${isOn ? 'rgba(224,122,56,0.3)' : 'var(--border)'}`,
                        borderRadius: 10, cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'all 0.15s',
                        textAlign: 'right',
                      }}
                    >
                      {/* Checkbox */}
                      <div style={{
                        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                        background: isOn ? 'var(--accent)' : 'var(--surface)',
                        border: `2px solid ${isOn ? 'var(--accent)' : 'var(--border-strong)'}`,
                        display: 'grid', placeItems: 'center',
                        transition: 'all 0.15s',
                      }}>
                        {isOn && <Icon n="check" s={11} c="#fff" />}
                      </div>

                      {/* Icon */}
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: isOn ? 'rgba(224,122,56,0.12)' : 'var(--surface)',
                        display: 'grid', placeItems: 'center',
                      }}>
                        <Icon n={section.icon} s={16} c={isOn ? 'var(--accent)' : 'var(--text3)'} />
                      </div>

                      {/* Label + hint */}
                      <div style={{ flex: 1, textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>
                          {section.label}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── Step 2: Downloading ────────────────────────────────────── */}
            {step === 'downloading' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', padding: '8px 0' }}>
                {/* Phase indicators */}
                <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                  {(['preparing', 'downloading', 'packing'] as const).map((phase, i) => {
                    const phaseOrder = ['preparing', 'downloading', 'packing', 'done'];
                    const currentIdx = phaseOrder.indexOf(progress.phase);
                    const thisIdx = phaseOrder.indexOf(phase);
                    const isDone = currentIdx > thisIdx;
                    const isActive = currentIdx === thisIdx;

                    return (
                      <div key={phase} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: isDone ? 'var(--accent)' : isActive ? 'rgba(224,122,56,0.15)' : 'var(--surface-2)',
                          border: `2px solid ${isDone || isActive ? 'var(--accent)' : 'var(--border)'}`,
                          display: 'grid', placeItems: 'center',
                          transition: 'all 0.3s',
                        }}>
                          {isDone
                            ? <Icon n="check" s={14} c="#fff" />
                            : <span style={{ fontSize: 12, fontWeight: 800, color: isActive ? 'var(--accent)' : 'var(--text3)' }}>{i + 1}</span>
                          }
                        </div>
                        <span style={{ fontSize: 11, color: isActive ? 'var(--accent)' : isDone ? 'var(--text2)' : 'var(--text3)', fontWeight: isActive ? 700 : 400 }}>
                          {phase === 'preparing' ? 'יצירת PDFs' : phase === 'downloading' ? 'הורדת קבצים' : 'אריזה'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Progress bar */}
                <div style={{ width: '100%' }}>
                  <div style={{
                    background: 'var(--surface-2)',
                    borderRadius: 8, height: 8, overflow: 'hidden',
                  }}>
                    <motion.div
                      animate={{ width: `${pct}%` }}
                      transition={{ ease: 'easeOut', duration: 0.3 }}
                      style={{
                        height: '100%',
                        background: 'linear-gradient(90deg, var(--accent), #f97316)',
                        borderRadius: 8,
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>{progress.label}</span>
                    <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>{pct}%</span>
                  </div>
                </div>

                {/* File counter */}
                {progress.phase === 'downloading' && progress.total > 0 && (
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text2)', textAlign: 'center' }}>
                    {progress.current} / {progress.total} קבצים
                  </p>
                )}

                <p style={{ margin: 0, fontSize: 12, color: 'var(--text3)', textAlign: 'center' }}>
                  אל תסגור את החלון עד שההורדה תסתיים
                </p>
              </div>
            )}

            {/* ── Step 3: Done ───────────────────────────────────────────── */}
            {step === 'done' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Success card */}
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                  padding: 20,
                  background: 'rgba(16,185,129,0.07)',
                  border: '1px solid rgba(16,185,129,0.25)',
                  borderRadius: 14, textAlign: 'center',
                }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: 'rgba(16,185,129,0.15)',
                    display: 'grid', placeItems: 'center',
                  }}>
                    <Icon n="check-circle" s={26} c="#10B981" />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text1)' }}>
                      הארכיון הורד בהצלחה!
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>
                      {`BuildPro_${projectName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.zip`}
                    </div>
                  </div>
                </div>

                {/* Re-download */}
                {downloadedBlob && (
                  <Btn
                    variant="ghost"
                    onClick={() => {
                      triggerDownload(
                        downloadedBlob,
                        `BuildPro_${projectName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.zip`,
                      );
                    }}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <Icon n="download" s={14} /> הורד שוב
                  </Btn>
                )}

                {/* Delete section */}
                {!showDeleteConfirm ? (
                  <div style={{
                    padding: '14px 16px',
                    background: 'rgba(239,68,68,0.06)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 12,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 6 }}>
                      רוצה למחוק את הפרויקט?
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12, lineHeight: 1.6 }}>
                      הנתונים הורדו בהצלחה. ניתן למחוק את הפרויקט מהמערכת — הפעולה אינה הפיכה.
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      style={{
                        background: 'none',
                        border: '1.5px solid rgba(239,68,68,0.4)',
                        borderRadius: 8, padding: '7px 14px',
                        color: '#EF4444', fontSize: 13, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <Icon n="trash-2" s={14} c="#EF4444" /> מחק פרויקט
                    </button>
                  </div>
                ) : (
                  <div style={{
                    padding: '14px 16px',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1.5px solid rgba(239,68,68,0.35)',
                    borderRadius: 12,
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#EF4444', marginBottom: 8 }}>
                      ⚠️ אישור מחיקה
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14, lineHeight: 1.6 }}>
                      אתה עומד למחוק את <strong>"{projectName}"</strong> לצמיתות. פעולה זו אינה ניתנת לביטול.
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={handleDeleteProject}
                        disabled={deleting}
                        style={{
                          flex: 1,
                          background: '#EF4444', border: 'none',
                          borderRadius: 8, padding: '9px 14px',
                          color: '#fff', fontSize: 13, fontWeight: 800,
                          cursor: deleting ? 'not-allowed' : 'pointer',
                          fontFamily: 'inherit', opacity: deleting ? 0.7 : 1,
                        }}
                      >
                        {deleting ? 'מוחק...' : 'כן, מחק לצמיתות'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        style={{
                          flex: 1,
                          background: 'var(--surface-2)',
                          border: '1px solid var(--border)',
                          borderRadius: 8, padding: '9px 14px',
                          color: 'var(--text1)', fontSize: 13, fontWeight: 600,
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        ביטול
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ─── Footer ────────────────────────────────────────────────────── */}
          {step !== 'downloading' && (
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border)',
              display: 'flex', gap: 10, flexShrink: 0,
              background: 'var(--surface)',
            }}>
              {step === 'select' && (
                <>
                  <Btn
                    onClick={handleStartDownload}
                    disabled={!SECTIONS.some((s) => selected[s.key])}
                    style={{ flex: 1, justifyContent: 'center', padding: '11px 0' }}
                  >
                    <Icon n="download" s={15} />
                    הורד ארכיון ZIP
                  </Btn>
                  <Btn
                    variant="ghost"
                    onClick={onClose}
                    style={{ padding: '11px 20px' }}
                  >
                    ביטול
                  </Btn>
                </>
              )}
              {step === 'done' && (
                <Btn onClick={onClose} style={{ flex: 1, justifyContent: 'center', padding: '11px 0' }}>
                  סיום
                </Btn>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
