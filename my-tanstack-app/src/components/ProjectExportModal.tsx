import React from 'react';
import { useConvex, useMutation } from 'convex/react';
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
    label: 'שלבי בנייה ומשימות (CSV)',
    icon: 'layers',
    countFn: (m) => m?.stages?.length ?? null,
    hintFn: (m) => m?.stages?.length ? `${m.stages.length} שלבים` : '',
  },
  {
    key: 'contractors',
    label: 'קבלנים ותשלומים (CSV)',
    icon: 'hard-hat',
    countFn: (m) => m?.contractors?.length ?? null,
    hintFn: (m) => m?.contractors?.length ? `${m.contractors.length} קבלנים` : '',
  },
  {
    key: 'dailyLogs',
    label: 'יומני עבודה וקבצים (CSV)',
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
    label: 'ארכיון הפרויקט',
    icon: 'archive',
    countFn: (m) => m?.personalFiles?.length ?? null,
    hintFn: (m) => m?.personalFiles?.length ? `${m.personalFiles.length} קבצים ששמרת בפרויקט` : '',
  },
  {
    key: 'budget',
    label: 'תקציב והוצאות',
    icon: 'wallet',
    hintFn: (m) => m?.budget ? 'תקציב + הוצאות (CSV)' : '',
  },
  {
    key: 'boq',
    label: 'כתב כמויות (BOQ)',
    icon: 'clipboard-list',
    countFn: (m) => m?.boq?.length ?? null,
    hintFn: (m) => m?.boq?.length ? `${m.boq.length} פריטים (CSV)` : '',
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
    label: "צ'קליסטים (CSV)",
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
    label: 'יומן פעילות (CSV)',
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

const onlySection = (key: SectionKey): ExportSections => Object.fromEntries(
  SECTIONS.map((section) => [section.key, section.key === key]),
) as ExportSections;

const safeFilename = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '_');

// ── Component ──────────────────────────────────────────────────────────────

type Step = 'select' | 'downloading' | 'done';

type Props = {
  projectId: Id<'projects'>;
  projectName: string;
  onClose: () => void;
};

export function ProjectExportModal({ projectId, projectName, onClose }: Props) {
  const { notify } = useAppNotify();
  const convex = useConvex();
  const [step, setStep] = React.useState<Step>('select');
  const [exportingSection, setExportingSection] = React.useState<SectionDef | null>(null);
  const [progress, setProgress] = React.useState<ExportProgress>({
    phase: 'preparing',
    current: 0,
    total: 0,
    label: 'מכין נתונים...',
  });
  const [downloadedFilename, setDownloadedFilename] = React.useState<string | null>(null);
  const [downloadedBlob, setDownloadedBlob] = React.useState<Blob | null>(null);
  const [sectionDownloads, setSectionDownloads] = React.useState<Partial<Record<SectionKey, true>>>({});
  const [deleteAfterExport, setDeleteAfterExport] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const deleteProject = useMutation(api.projects.deleteProject);
  const handleStartDownload = async (section: SectionDef) => {
    const filename = `BuildPro_${projectName.replace(/\s+/g, '_')}_${safeFilename(section.key)}_${new Date().toISOString().slice(0, 10)}.zip`;
    setExportingSection(section);
    setStep('downloading');
    setProgress({ phase: 'preparing', current: 0, total: 0, label: 'מביא נתונים מהשרת...' });
    try {
      const manifest = await convex.query(api.projectExport.generateExportManifest, {
        projectId,
        sections: onlySection(section.key),
      });
      const blob = await buildProjectZip(manifest, setProgress);
      triggerDownload(blob, filename);
      setDownloadedBlob(blob);
      setSectionDownloads((previous) => ({
        ...previous,
        [section.key]: true,
      }));
      setDownloadedFilename(filename);
      setStep('done');
    } catch (err) {
      console.error('[ProjectExport] Archive build failed:', err);
      setProgress({ phase: 'error', current: 0, total: 0, label: 'שגיאה ביצירת הארכיון' });
      notify({ title: 'שגיאה ביצוא', body: 'לא ניתן היה ליצור את הארכיון. נסה שוב.', kind: 'error' });
      setStep('select');
      setExportingSection(null);
    }
  };

  const handleDeleteProject = async () => {
    setDeleting(true);
    try {
      await deleteProject({ projectId });
      notify({ title: 'הפרויקט נמחק', body: `"${projectName}" וכל תוכנו נמחקו לצמיתות.`, kind: 'success' });
      onClose();
    } catch (err) {
      console.error('[ProjectExport] Project deletion failed:', err);
      notify({ title: 'שגיאה במחיקה', body: 'לא ניתן היה למחוק את הפרויקט. נסה שוב.', kind: 'error' });
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
    <div
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
        <div
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
              {step === 'select' && `${projectName} — בחר נושא להורדה`}
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

                <p style={{ margin: '2px 0 6px', fontSize: 12, color: 'var(--text3)' }}>
                  כל קישור יוצר ZIP נפרד רק עבור הנושא שבחרת.
                </p>

                {/* Individual, on-demand archives */}
                {SECTIONS.map((section) => {
                  const downloadStatus = sectionDownloads[section.key];
                  return (
                    <div
                      key={section.key}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 14px',
                        background: 'var(--surface-2)',
                        border: '1.5px solid var(--border)',
                        borderRadius: 10,
                        textAlign: 'right',
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: 'rgba(224,122,56,0.12)',
                        display: 'grid', placeItems: 'center',
                      }}>
                        <Icon n={section.icon} s={16} c="var(--accent)" />
                      </div>

                      <div style={{ flex: 1, textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>
                          {section.label}
                        </div>
                        {downloadStatus && (
                          <div style={{ fontSize: 11, marginTop: 3, color: '#059669' }}>
                            ✓ ההורדה התחילה
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleStartDownload(section)}
                        style={{
                          background: 'var(--accent)', border: 'none', borderRadius: 7,
                          color: '#fff', cursor: 'pointer', padding: '7px 10px',
                          fontFamily: 'inherit', fontSize: 12, fontWeight: 800,
                          display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                        }}
                      >
                        <Icon n="download" s={13} /> {downloadStatus ? 'הורד שוב' : 'הורד'}
                      </button>
                    </div>
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
                          {phase === 'preparing' ? 'איסוף נתונים' : phase === 'downloading' ? 'איסוף קבצים' : 'אריזה'}
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
                    <div
                      style={{
                        height: '100%',
                        background: 'linear-gradient(90deg, var(--accent), #f97316)',
                        borderRadius: 8,
                        width: `${pct}%`,
                        transition: 'width 0.2s ease-out',
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
                  אפשר לסגור את החלון רק אחרי שהקובץ נשמר
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
                      ההורדה של {exportingSection?.label ?? 'הארכיון'} התחילה
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>
                      {downloadedFilename}
                    </div>
                  </div>
                </div>

                {downloadedBlob && downloadedFilename && (
                  <Btn
                    variant="ghost"
                    onClick={() => triggerDownload(downloadedBlob, downloadedFilename)}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <Icon n="download" s={14} /> ההורדה לא התחילה? הורד שוב
                  </Btn>
                )}

                <label style={{
                  display: 'flex', alignItems: 'flex-start', gap: 9, padding: '12px 14px',
                  borderRadius: 10, background: 'rgba(239,68,68,0.06)',
                  border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer',
                }}>
                  <input
                    type="checkbox"
                    checked={deleteAfterExport}
                    onChange={(event) => setDeleteAfterExport(event.target.checked)}
                    style={{ marginTop: 3, accentColor: '#DC2626' }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.55 }}>
                    הורדתי את כל הקבצים שאני צריך ואני רוצה למחוק את הפרויקט לצמיתות, כולל תמונות, מסמכים וכל הנתונים.
                  </span>
                </label>
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
                <Btn variant="ghost" onClick={onClose} style={{ flex: 1, justifyContent: 'center', padding: '11px 0' }}>
                  סגור
                </Btn>
              )}
              {step === 'done' && (
                <>
                  <Btn
                    variant="ghost"
                    onClick={() => {
                      setStep('select');
                      setExportingSection(null);
                      setDownloadedFilename(null);
                      setDownloadedBlob(null);
                    }}
                    style={{ flex: 1, justifyContent: 'center', padding: '11px 0' }}
                  >
                    הורד נושא נוסף
                  </Btn>
                  <Btn onClick={() => deleteAfterExport ? setShowDeleteConfirm(true) : onClose()} style={{ flex: 1, justifyContent: 'center', padding: '11px 0' }}>
                    {deleteAfterExport ? 'המשך למחיקה' : 'סיום'}
                  </Btn>
                </>
              )}
            </div>
          )}

          {showDeleteConfirm && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-project-title"
              style={{
                position: 'absolute', inset: 0, zIndex: 1, display: 'grid', placeItems: 'center',
                background: 'rgba(15, 23, 42, 0.62)', padding: 24,
              }}
              onClick={(event) => {
                event.stopPropagation();
                if (!deleting) setShowDeleteConfirm(false);
              }}
            >
              <div
                onClick={(event) => event.stopPropagation()}
                style={{ background: 'var(--surface)', borderRadius: 14, padding: 22, maxWidth: 390, width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.28)' }}
              >
                <h3 id="delete-project-title" style={{ margin: 0, fontSize: 17, color: '#DC2626' }}>למחוק את הפרויקט לצמיתות?</h3>
                <p style={{ margin: '10px 0 18px', fontSize: 13, lineHeight: 1.65, color: 'var(--text2)' }}>
                  הפעולה תמחק את “{projectName}” ואת כל התמונות, המסמכים, יומני העבודה והנתונים הכספיים. לא ניתן לשחזר אותם.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <Btn variant="ghost" disabled={deleting} onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, justifyContent: 'center' }}>
                    ביטול
                  </Btn>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => void handleDeleteProject()}
                    style={{
                      flex: 1, border: 'none', borderRadius: 8, padding: '9px 12px',
                      background: '#DC2626', color: '#fff', fontFamily: 'inherit', fontWeight: 800,
                      cursor: deleting ? 'wait' : 'pointer', opacity: deleting ? 0.7 : 1,
                    }}
                  >
                    {deleting ? 'מוחק...' : 'כן, מחק לצמיתות'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
  );
}
