import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useCurrentProject } from '../hooks/useCurrentProject';
import { useAppNotify } from '../hooks/useAppNotify';
import { useProjectFileUploader } from '../hooks/useProjectFileUploader';
import { ScreenBoundary } from '../components/ScreenBoundary';
import {
  PageBackground,
  EmptyState,
  Btn,
  Icon,
  Modal,
  ConfirmDialog,
  NumberInput,
} from '../components/Shared';
import { fmtMoney } from '../utils/mockData';
import type { Id } from '../../convex/_generated/dataModel';

// ── Animation variants ─────────────────────────────────────────────────────
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};

// ── Type labels ────────────────────────────────────────────────────────────
const SOURCE_TYPE_LABELS: Record<string, string> = {
  mortgage: 'משכנתא',
  equity: 'הון עצמי',
  loan: 'הלוואה',
  asset_sale: 'מכירת נכס',
  investment_sale: 'מכירת השקעות',
  family: 'משפחה',
  other: 'אחר',
};
const SOURCE_TYPE_ICONS: Record<string, string> = {
  mortgage: 'chart',
  equity: 'check-circle',
  loan: 'clipboard',
  asset_sale: 'home',
  investment_sale: 'pie-chart',
  family: 'users',
  other: 'folder',
};
const SOURCE_TYPES = ['mortgage', 'equity', 'loan', 'asset_sale', 'investment_sale', 'family', 'other'];

// ── Helpers ────────────────────────────────────────────────────────────────
const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const fmtPct = (n?: number) => (n != null ? `${n}%` : '—');

// ── Add/Edit FundingSource Modal ───────────────────────────────────────────
function FundingSourceModal({
  projectId,
  editing,
  onClose,
}: {
  projectId: Id<'projects'>;
  editing?: any;
  onClose: () => void;
}) {
  const createSource = useMutation(api.financing.createFundingSource);
  const updateSource = useMutation(api.financing.updateFundingSource);

  const [name, setName] = useState(editing?.name ?? '');
  const [type, setType] = useState(editing?.type ?? 'equity');
  const [plannedAmount, setPlannedAmount] = useState<number | undefined>(editing?.plannedAmount);
  const [notes, setNotes] = useState(editing?.notes ?? '');
  // Mortgage-specific
  const [bankName, setBankName] = useState(editing?.mortgageDetails?.bankName ?? '');
  const [totalApproved, setTotalApproved] = useState<number | undefined>(editing?.mortgageDetails?.totalApprovedAmount);
  const [approvedAt, setApprovedAt] = useState(editing?.mortgageDetails?.approvedAt ?? '');
  const [mortgageStatus, setMortgageStatus] = useState(editing?.mortgageDetails?.mortgageStatus ?? 'approved');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const uploadFile = useProjectFileUploader();
  const deleteProjectFile = useMutation(api.projectFiles.deleteProjectFile);
  const getProjectFileUrl = useMutation(api.projectFiles.getProjectFileUrl);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [removeFile, setRemoveFile] = useState(false);
  const [fileName, setFileName] = useState(editing?.fileName ?? '');

  const onFilePick = (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      setFileName('');
      setRemoveFile(true);
      return;
    }
    setSelectedFile(file);
    setFileName(file.name);
    setRemoveFile(false);
  };


  const isMortgage = type === 'mortgage';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setErr('חובה להזין שם'); return; }
    if (isMortgage && !totalApproved) { setErr('חובה להזין מסגרת מאושרת'); return; }
    setSaving(true);
    try {
      let projectFileId = editing?.projectFileId;
      let fileUrl = editing?.fileUrl;

      if (removeFile && projectFileId) {
        await deleteProjectFile({ fileId: projectFileId as any });
        projectFileId = undefined;
        fileUrl = undefined;
      }

      if (selectedFile) {
        const result = await uploadFile({
          projectId,
          file: selectedFile,
          usage: 'document',
          kind: 'other',
        });
        projectFileId = result.fileId;
        const urlRes = await getProjectFileUrl({ fileId: result.fileId });
        fileUrl = urlRes.url;
      }

      const mortgageDetails = isMortgage ? {
        bankName: bankName || undefined,
        totalApprovedAmount: totalApproved as number,
        approvedAt: approvedAt || undefined,
        mortgageStatus: mortgageStatus as any,
      } : undefined;

      if (editing) {
        await updateSource({
          sourceId: editing._id,
          name: name.trim(),
          plannedAmount: !isMortgage && plannedAmount ? plannedAmount : undefined,
          notes: notes || undefined,
          mortgageDetails,
          projectFileId: projectFileId || null,
          fileUrl: fileUrl || null,
          fileName: fileName || null,
        });
      } else {
        await createSource({
          projectId,
          name: name.trim(),
          type: type as any,
          plannedAmount: !isMortgage && plannedAmount ? plannedAmount : undefined,
          notes: notes || undefined,
          mortgageDetails,
          projectFileId,
          fileUrl,
          fileName,
        });
      }
      onClose();
    } catch (e: any) {
      setErr(e.message ?? 'שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--surface-2)',
    color: 'var(--text1)', fontSize: 14, fontFamily: 'inherit',
  };

  return (
    <Modal open onClose={onClose} title={editing ? 'עריכת מקור מימון' : 'הוספת מקור מימון'}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600, display: 'block', marginBottom: 5 }}>שם המקור *</label>
          <input style={fieldStyle} value={name} onChange={e => setName(e.target.value)} placeholder='לדוגמה: "קרן השתלמות", "משכנתא בנק לאומי"' />
        </div>
        {!editing && (
          <div>
            <label style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600, display: 'block', marginBottom: 5 }}>סוג מקור</label>
            <select style={fieldStyle} value={type} onChange={e => setType(e.target.value)}>
              {SOURCE_TYPES.map(t => <option key={t} value={t}>{SOURCE_TYPE_LABELS[t]}</option>)}
            </select>
          </div>
        )}
        {isMortgage ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600, display: 'block', marginBottom: 5 }}>בנק</label>
                <input style={fieldStyle} value={bankName} onChange={e => setBankName(e.target.value)} placeholder='שם הבנק' />
              </div>
              <div>
                <label style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600, display: 'block', marginBottom: 5 }}>מסגרת מאושרת ₪ *</label>
                <NumberInput style={fieldStyle} value={totalApproved} onChange={setTotalApproved} placeholder='800000' />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600, display: 'block', marginBottom: 5 }}>תאריך אישור</label>
                <input style={fieldStyle} type='date' value={approvedAt} onChange={e => setApprovedAt(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600, display: 'block', marginBottom: 5 }}>סטטוס</label>
                <select style={fieldStyle} value={mortgageStatus} onChange={e => setMortgageStatus(e.target.value)}>
                  <option value='planning'>בתכנון</option>
                  <option value='approved'>אושר</option>
                  <option value='active'>פעיל</option>
                  <option value='closed'>סגור</option>
                </select>
              </div>
            </div>
          </>
        ) : (
          <div>
            <label style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600, display: 'block', marginBottom: 5 }}>סכום מתוכנן ₪ (אופציונלי)</label>
            <NumberInput style={fieldStyle} value={plannedAmount} onChange={setPlannedAmount} placeholder='320000' />
          </div>
        )}
        <div>
          <label style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600, display: 'block', marginBottom: 5 }}>הערות</label>
          <textarea style={{ ...fieldStyle, resize: 'vertical', minHeight: 60 }} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600, display: 'block', marginBottom: 5 }}>מסמך מימון / אישור (אופציונלי)</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {fileName && (
              <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "var(--text1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "10px 12px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }}>
                {fileName}
              </div>
            )}
            {fileName && (
              <Btn size="sm" variant="ghost" type="button" onClick={() => onFilePick(null)}>
                הסר
              </Btn>
            )}
            <label style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 8, border: "1px solid var(--border)", padding: "7px 10px", background: "var(--surface)", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>
              <Icon n="upload-cloud" s={12} />
              {fileName ? 'החלף קובץ' : 'בחר קובץ'}
              <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,image/*" onChange={(e) => onFilePick(e.target.files?.[0] ?? null)} style={{ display: "none" }} />
            </label>
          </div>
        </div>
        {err && <div style={{ color: 'var(--danger)', fontSize: 13, fontWeight: 600 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <Btn variant='ghost' size='sm' type='button' onClick={onClose}>ביטול</Btn>
          <Btn variant='primary' size='sm' type='submit' loading={saving}>{editing ? 'שמור שינויים' : 'הוסף מקור'}</Btn>
        </div>
      </form>
    </Modal>
  );
}

// ── Add Transaction Modal ──────────────────────────────────────────────────
function TransactionModal({ source, onClose }: { source: any; onClose: () => void }) {
  const createTx = useMutation(api.financing.createFundingTransaction);
  const [amount, setAmount] = useState<number | undefined>();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');



  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--surface-2)',
    color: 'var(--text1)', fontSize: 14, fontFamily: 'inherit',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) { setErr('יש להזין סכום חיובי'); return; }
    setSaving(true);
    try {
      await createTx({ fundingSourceId: source._id, amount: amount as number, date, notes: notes || undefined, reference: reference || undefined });
      onClose();
    } catch (e: any) { setErr(e.message ?? 'שגיאה'); } finally { setSaving(false); }
  };

  return (
    <Modal open onClose={onClose} title={`+ הוספת כסף שנכנס — ${source.name}`}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600, display: 'block', marginBottom: 5 }}>סכום ₪ *</label>
            <NumberInput style={fieldStyle} value={amount} onChange={setAmount} placeholder='100000' autoFocus />
          </div>
          <div>
            <label style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600, display: 'block', marginBottom: 5 }}>תאריך</label>
            <input style={fieldStyle} type='date' value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600, display: 'block', marginBottom: 5 }}>אסמכתא / מספר עסקה</label>
          <input style={fieldStyle} value={reference} onChange={e => setReference(e.target.value)} placeholder='אופציונלי' />
        </div>
        <div>
          <label style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600, display: 'block', marginBottom: 5 }}>הערה</label>
          <input style={fieldStyle} value={notes} onChange={e => setNotes(e.target.value)} placeholder='לדוגמה: "משיכה ראשונה"' />
        </div>
        {err && <div style={{ color: 'var(--danger)', fontSize: 13 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variant='ghost' size='sm' type='button' onClick={onClose}>ביטול</Btn>
          <Btn variant='primary' size='sm' type='submit' loading={saving}>הוסף תנועה</Btn>
        </div>
      </form>
    </Modal>
  );
}

// ── Add MortgageDraw Modal ─────────────────────────────────────────────────
function MortgageDrawModal({
  source,
  editing,
  onClose,
  projectId,
}: {
  source: any;
  editing?: any;
  onClose: () => void;
  projectId: Id<'projects'>;
}) {
  const createDraw = useMutation(api.financing.createMortgageDraw);
  const updateDraw = useMutation(api.financing.updateMortgageDraw);
  const stages = useQuery(api.stages.list, { projectId }) ?? [];

  const [status, setStatus] = useState<'planned' | 'received'>(editing?.status ?? 'planned');
  const [amount, setAmount] = useState<number | undefined>(editing?.amount);
  const [actualDrawDate, setActualDrawDate] = useState(editing?.actualDrawDate ?? new Date().toISOString().split('T')[0]);
  const [actualProgressPct, setActualProgressPct] = useState(editing?.actualProgressPct?.toString() ?? '');
  const [bankReference, setBankReference] = useState(editing?.bankReference ?? '');
  const [expectedDate, setExpectedDate] = useState(editing?.expectedDate ?? '');
  const [targetProgressPct, setTargetProgressPct] = useState(editing?.targetProgressPct?.toString() ?? '');
  const [stageId, setStageId] = useState(editing?.stageId ?? '');
  const [estimatedExpenses, setEstimatedExpenses] = useState(editing?.estimatedExpensesUntilDraw?.toString() ?? '');
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');



  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--surface-2)',
    color: 'var(--text1)', fontSize: 14, fontFamily: 'inherit',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) { setErr('יש להזין סכום'); return; }
    setSaving(true);
    try {
      const common = {
        status,
        amount: amount as number,
        actualDrawDate: status === 'received' ? actualDrawDate : undefined,
        actualProgressPct: actualProgressPct ? Number(actualProgressPct) : undefined,
        bankReference: bankReference || undefined,
        expectedDate: status === 'planned' ? (expectedDate || undefined) : undefined,
        targetProgressPct: targetProgressPct ? Number(targetProgressPct) : undefined,
        stageId: (stageId as Id<'stages'>) || undefined,
        estimatedExpensesUntilDraw: status === 'planned' && estimatedExpenses ? Number(estimatedExpenses) : undefined,
        notes: notes || undefined,
      };
      if (editing) {
        await updateDraw({ drawId: editing._id, ...common });
      } else {
        await createDraw({ fundingSourceId: source._id, ...common });
      }
      onClose();
    } catch (e: any) { setErr(e.message ?? 'שגיאה'); } finally { setSaving(false); }
  };

  return (
    <Modal open onClose={onClose} title={editing ? 'עריכת משיכה' : '+ הוספת משיכת משכנתא'}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Status toggle */}
        <div style={{ display: 'flex', gap: 8 }}>
          {(['received', 'planned'] as const).map(s => (
            <button key={s} type='button'
              onClick={() => setStatus(s)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 8, border: '1.5px solid',
                fontFamily: 'inherit', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                borderColor: status === s ? 'var(--accent)' : 'var(--border)',
                background: status === s ? 'var(--accent-light)' : 'var(--surface-2)',
                color: status === s ? 'var(--accent)' : 'var(--text3)',
              }}>
              {s === 'received' ? '✅ התקבלה' : '📅 מתוכננת'}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600, display: 'block', marginBottom: 5 }}>סכום ₪ *</label>
            <NumberInput style={fieldStyle} value={amount} onChange={setAmount} placeholder='200000' autoFocus />
          </div>
          {status === 'received' ? (
            <div>
              <label style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600, display: 'block', marginBottom: 5 }}>תאריך קבלה</label>
              <input style={fieldStyle} type='date' value={actualDrawDate} onChange={e => setActualDrawDate(e.target.value)} />
            </div>
          ) : (
            <div>
              <label style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600, display: 'block', marginBottom: 5 }}>תאריך צפוי</label>
              <input style={fieldStyle} type='date' value={expectedDate} onChange={e => setExpectedDate(e.target.value)} />
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600, display: 'block', marginBottom: 5 }}>
              {status === 'received' ? 'אחוז התקדמות בפועל' : 'יעד התקדמות'}
            </label>
            <input style={fieldStyle} type='number' min={0} max={100}
              value={status === 'received' ? actualProgressPct : targetProgressPct}
              onChange={e => status === 'received' ? setActualProgressPct(e.target.value) : setTargetProgressPct(e.target.value)}
              placeholder='40' />
          </div>
          <div>
            <label style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600, display: 'block', marginBottom: 5 }}>שלב בנייה (אופציונלי)</label>
            <select style={fieldStyle} value={stageId} onChange={e => setStageId(e.target.value)}>
              <option value=''>— ללא שלב —</option>
              {stages.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {status === 'received' && (
          <div>
            <label style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600, display: 'block', marginBottom: 5 }}>אסמכתא בנקאית</label>
            <input style={fieldStyle} value={bankReference} onChange={e => setBankReference(e.target.value)} placeholder='מספר עסקה / אסמכתא' />
          </div>
        )}

        {status === 'planned' && (
          <div>
            <label style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600, display: 'block', marginBottom: 5 }}>הוצאות משוערות עד המשיכה ₪ (הערכה בלבד)</label>
            <input style={fieldStyle} type='number' value={estimatedExpenses} onChange={e => setEstimatedExpenses(e.target.value)} placeholder='120000' />
          </div>
        )}

        <div>
          <label style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600, display: 'block', marginBottom: 5 }}>הערות</label>
          <input style={fieldStyle} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        {err && <div style={{ color: 'var(--danger)', fontSize: 13 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variant='ghost' size='sm' type='button' onClick={onClose}>ביטול</Btn>
          <Btn variant='primary' size='sm' type='submit' loading={saving}>{editing ? 'שמור' : status === 'received' ? 'הוסף משיכה' : 'תכנן משיכה'}</Btn>
        </div>
      </form>
    </Modal>
  );
}

// ── Source Card ────────────────────────────────────────────────────────────
function SourceCard({
  source,
  projectId,
  currentProjectPct,
}: {
  source: any;
  projectId: Id<'projects'>;
  currentProjectPct: number;
}) {
  const deleteSource = useMutation(api.financing.deleteFundingSource);
  const { notify } = useAppNotify();
  const [showAddTx, setShowAddTx] = useState(false);
  const [showAddDraw, setShowAddDraw] = useState(false);
  const [editDraw, setEditDraw] = useState<any>(null);
  const [editSource, setEditSource] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showDraws, setShowDraws] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const isMortgage = source.type === 'mortgage';
  const icon = SOURCE_TYPE_ICONS[source.type] ?? 'folder';
  const label = SOURCE_TYPE_LABELS[source.type] ?? source.type;
  const nextDraw = source.mortgageSummary?.nextPlannedDraw;

  const canPreviewInline = (source: any) => {
    const name = source?.fileName || '';
    const url = source?.fileUrl || '';
    return /\.(pdf|png|jpe?g|webp|gif|avif)$/i.test(name) || url.includes('image/') || url.includes('pdf');
  };
  const draws: any[] = source.mortgageSummary?.draws ?? [];

  return (
    <motion.div
      variants={itemVariants}
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Top accent bar */}
      <div style={{ height: 3, background: isMortgage ? 'linear-gradient(90deg, var(--accent), #8B5CF6)' : 'linear-gradient(90deg, var(--success), var(--accent))' }} />

      {/* Header */}
      <div 
        onClick={() => setIsExpanded(v => !v)}
        style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: isExpanded ? '1px solid var(--border)' : 'none', cursor: 'pointer', transition: 'background 0.2s' }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ width: 40, height: 40, borderRadius: 12, background: isMortgage ? 'var(--accent-light)' : 'var(--success-light)', color: isMortgage ? 'var(--accent)' : 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon n={icon} s={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text1)' }}>{source.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{label}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {!isExpanded && (
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginLeft: 8 }}>
              {fmtMoney(source.expectedTotal)}
            </div>
          )}
          {source.projectFileId && source.fileUrl && (
            <button onClick={(e) => { e.stopPropagation(); setPreviewDoc(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 6, borderRadius: 6 }} title='צפה במסמך'>
              <Icon n='file-text' s={15} />
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); setEditSource(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 6, borderRadius: 6 }} title='ערוך'><Icon n='settings' s={15} /></button>
          <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 6, borderRadius: 6 }} title='מחק'><Icon n='x' s={15} /></button>
          <div style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text3)' }}>
            <Icon n='chevron-down' s={16} />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }} 
            transition={{ duration: 0.2 }} 
            style={{ overflow: 'hidden' }}
          >
            {/* Financial summary row */}
            <div style={{ padding: '14px 20px', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {[
                { label: 'סה"כ צפוי', val: source.expectedTotal },
                { label: 'התקבל', val: source.totalReceived, color: 'var(--success)' },
                { label: 'נותר', val: source.remainingExpected, color: source.remainingExpected > 0 ? 'var(--accent)' : 'var(--text3)' },
              ].map(item => (
                <div key={item.label} style={{ flex: '1 1 80px' }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: item.color ?? 'var(--text1)', letterSpacing: '-0.3px' }}>{fmtMoney(item.val)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, fontWeight: 600, textTransform: 'uppercase' }}>{item.label}</div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            {source.expectedTotal > 0 && (
              <div style={{ padding: '0 20px 12px' }}>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (source.totalReceived / source.expectedTotal) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, var(--success), var(--accent))', borderRadius: 3, transition: 'width 0.5s' }} />
                </div>
              </div>
            )}

            {/* Mortgage: Next Draw card */}
            {isMortgage && nextDraw && (
              <div style={{ margin: '0 20px 14px', padding: 14, background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.08))', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Icon n='chart' s={14} c='var(--accent)' />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>המשיכה הבאה</span>
                  <button onClick={() => setEditDraw(nextDraw)} style={{ marginRight: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 12, fontFamily: 'inherit' }}>ערוך</button>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text1)' }}>{fmtMoney(nextDraw.amount)}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
                  יעד: {fmtPct(nextDraw.targetProgressPct)} התקדמות
                  {nextDraw.expectedDate && <span> · {fmtDate(nextDraw.expectedDate)}</span>}
                </div>
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, (currentProjectPct / (nextDraw.targetProgressPct || 1)) * 100)}%`, height: '100%', background: 'var(--accent)', borderRadius: 3 }} />
                  </div>
                  <span style={{ color: 'var(--text3)', fontWeight: 600, flexShrink: 0 }}>כרגע {currentProjectPct}% / יעד {fmtPct(nextDraw.targetProgressPct)}</span>
                </div>
                {nextDraw.estimatedExpensesUntilDraw != null && (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--warning)', fontWeight: 600 }}>
                    ⚠️ נדרשים כ-{fmtMoney(nextDraw.estimatedExpensesUntilDraw)} עד המשיכה (הערכה בלבד)
                  </div>
                )}
              </div>
            )}

            {/* Mortgage: draws history toggle */}
            {isMortgage && draws.length > 0 && (
              <div style={{ padding: '0 20px 12px' }}>
                <button onClick={() => setShowDraws(v => !v)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Icon n='calendar' s={14} />
                  {showDraws ? 'הסתר' : `היסטוריית משיכות (${draws.filter((d: any) => d.status === 'received').length})`}
                </button>
                <AnimatePresence>
                  {showDraws && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
                      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {draws.filter((d: any) => d.status === 'received').map((d: any) => (
                          <div key={d._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 8, fontSize: 13 }}>
                            <div>
                              <span style={{ fontWeight: 700, color: 'var(--text1)' }}>{fmtMoney(d.amount)}</span>
                              <span style={{ color: 'var(--text3)', marginRight: 8 }}>{fmtDate(d.actualDrawDate)}</span>
                              {d.actualProgressPct != null && <span style={{ color: 'var(--text3)' }}>· {fmtPct(d.actualProgressPct)}</span>}
                            </div>
                            <button onClick={() => setEditDraw(d)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}><Icon n='settings' s={13} /></button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ padding: '12px 20px 16px', display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: '1px solid var(--border)' }}>
              {isMortgage ? (
                <Btn variant='ghost' size='sm' onClick={() => setShowAddDraw(true)}>+ הוסף משיכה</Btn>
              ) : (
                <Btn variant='ghost' size='sm' onClick={() => setShowAddTx(true)}>+ הוסף כסף שנכנס</Btn>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      {editSource && <FundingSourceModal projectId={projectId} editing={source} onClose={() => setEditSource(false)} />}
      {showAddTx && <TransactionModal source={source} onClose={() => setShowAddTx(false)} />}
      {(showAddDraw || editDraw) && (
        <MortgageDrawModal source={source} editing={editDraw ?? undefined} projectId={projectId} onClose={() => { setShowAddDraw(false); setEditDraw(null); }} />
      )}

      {previewDoc && source.fileUrl && (
        <Modal onClose={() => setPreviewDoc(false)} title={`צפייה בקובץ — ${source.fileName || "מסמך מימון"}`} width={900}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {canPreviewInline(source) ? (
              /\.(png|jpe?g|webp|gif|avif)$/i.test(source.fileName || "") ? (
                <img src={source.fileUrl} alt={source.fileName || "מסמך"} style={{ width: "100%", maxHeight: "70vh", objectFit: "contain", border: "1px solid var(--border)", borderRadius: 10, background: "var(--bg)" }} />
              ) : (
                <iframe src={source.fileUrl} title={source.fileName || "מסמך"} style={{ width: "100%", height: "70vh", border: "1px solid var(--border)", borderRadius: 10, background: "var(--bg)" }} />
              )
            ) : (
              <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 24, textAlign: "center", color: "var(--text2)", background: "var(--bg)" }}>
                <Icon n="file-text" s={32} c="var(--text3)" />
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 8 }}>{source.fileName}</div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>לא ניתן להציג את סוג הקובץ הזה בתוך הדפדפן.</div>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <a href={source.fileUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontFamily: "'Heebo',sans-serif", fontWeight: 700, background: "linear-gradient(135deg, var(--accent) 0%, #c96b30 100%)", color: "#fff", boxShadow: "0 2px 8px rgba(224,122,56,0.3)" }}>
                <Icon n="download" s={13} /> פתח בקובץ מלא
              </a>
            </div>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title='מחיקת מקור מימון'
          message='האם אתה בטוח שברצונך למחוק מקור מימון זה? מחיקתו תמחק גם את כל הפעימות, התנועות והמסמכים המקושרים אליו.'
          onConfirm={async () => { await deleteSource({ sourceId: source._id }); notify({ title: 'מקור המימון נמחק בהצלחה', kind: 'success' }); setConfirmDelete(false); }}
          onClose={() => setConfirmDelete(false)}
          confirmText='מחק'
          type='danger'
        />
      )}
    </motion.div>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────
export const FinancingScreen: React.FC = () => {
  const { projects } = useCurrentProject();
  const [showAddSource, setShowAddSource] = useState(false);

  const projectId = projects[0]?._id as Id<'projects'> | undefined;
  const summary = useQuery(
    api.financing.getFundingSummary,
    projectId ? { projectId } : 'skip',
  );
  const project = projects[0];
  const currentProjectPct: number = (project as any)?.progressPct ?? 0;


  if (!projectId) return null;

  const loading = summary === undefined;

  return (
    <ScreenBoundary loading={loading}>
      <div className='page-content'>
          {/* ── Financial Snapshot ────────────────────────────────────── */}
          <motion.div variants={containerVariants} initial='hidden' animate='show'>
            {summary && (
              <>

                {/* ── Global Summary Line ── */}
                <motion.div variants={itemVariants} style={{ 
                  position: 'sticky', 
                  top: 16, 
                  zIndex: 10,
                  background: 'rgba(24, 24, 27, 0.85)', 
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  padding: '12px 20px', 
                  borderRadius: 10, 
                  display: 'flex', 
                  gap: '8px 16px', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  flexWrap: 'wrap', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  marginBottom: 24,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.4)'
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', whiteSpace: 'nowrap' }}>תקציב {fmtMoney(summary.projectBudget)}</span>
                  <span style={{ color: 'var(--border)', height: 4, width: 4, borderRadius: '50%', background: 'currentColor' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', whiteSpace: 'nowrap' }}>נותר לשלם {fmtMoney((summary.projectBudget - summary.totalProjectExpenses))}</span>
                  <span style={{ color: 'var(--border)', height: 4, width: 4, borderRadius: '50%', background: 'currentColor' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', whiteSpace: 'nowrap' }}>מימון עתידי {fmtMoney(summary.totalPlannedFunding)}</span>
                  <span style={{ color: 'var(--border)', height: 4, width: 4, borderRadius: '50%', background: 'currentColor' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: summary.projectFundingGap > 0 ? 'var(--danger)' : 'var(--success)', whiteSpace: 'nowrap' }}>פער צפוי {fmtMoney(Math.abs(summary.projectFundingGap))}</span>
                </motion.div>

                {/* Hero KPI cards */}
                <motion.div
                  variants={itemVariants}
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}
                >
                  {[
                    { label: 'התקבל למימון', val: summary.totalFundingReceived, icon: 'check-circle', color: 'var(--success)', light: 'var(--success-light)' },
                    { label: 'הוצאות פרויקט', val: summary.totalProjectExpenses, icon: 'chart', color: 'var(--accent)', light: 'var(--accent-light)' },
                    {
                      label: summary.availableFunding >= 0 ? 'יתרה זמינה' : 'פער מימון נוכחי',
                      val: Math.abs(summary.availableFunding),
                      icon: summary.availableFunding >= 0 ? 'check-circle' : 'alert',
                      color: summary.availableFunding >= 0 ? 'var(--success)' : 'var(--danger)',
                      light: summary.availableFunding >= 0 ? 'var(--success-light)' : 'rgba(239,68,68,0.1)',
                    },
                  ].map((card) => (
                    <motion.div
                      key={card.label}
                      style={{
                        background: 'var(--surface)', border: '1px solid var(--border)',
                        borderRadius: 14, padding: '20px 22px', position: 'relative', overflow: 'hidden',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                      whileHover={{ y: -2, boxShadow: 'var(--shadow-lg)' }}
                    >
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${card.color}, transparent)`, borderRadius: '14px 14px 0 0' }} />
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: card.light, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                        <Icon n={card.icon} s={22} />
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: card.color, letterSpacing: '-0.5px' }}>{fmtMoney(card.val)}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, marginTop: 4, textTransform: 'uppercase' }}>{card.label}</div>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Future & gap row */}
                <motion.div variants={itemVariants} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
                  <div style={{ flex: '1 1 180px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
                    <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, marginBottom: 4 }}>מימון עתידי מתוכנן</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text1)' }}>{fmtMoney(summary.totalPlannedFunding)}</div>
                  </div>
                  <div style={{
                    flex: '1 1 180px', borderRadius: 10, padding: '12px 16px',
                    borderColor: summary.projectFundingGap > 0 ? 'rgba(239,68,68,0.3)' : 'var(--border)',
                    border: `1px solid ${summary.projectFundingGap > 0 ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
                    background: summary.projectFundingGap > 0 ? 'rgba(239,68,68,0.05)' : 'var(--surface-2)',
                  }}>
                    <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, marginBottom: 4 }}>
                      {summary.projectFundingGap > 0 ? '⚠️ פער מימון צפוי' : summary.projectFundingGap < 0 ? '✅ עודף מימון צפוי' : 'פער מימון'}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: summary.projectFundingGap > 0 ? 'var(--danger)' : summary.projectFundingGap < 0 ? 'var(--success)' : 'var(--text1)' }}>
                      {fmtMoney(Math.abs(summary.projectFundingGap))}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>תקציב פרויקט: {fmtMoney(summary.projectBudget)}</div>
                  </div>
                </motion.div>

                {/* ── Sources list ────────────────────────────────────── */}
                <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>מקורות המימון</h2>
                  <Btn variant='primary' size='sm' onClick={() => setShowAddSource(true)}>+ הוסף מקור</Btn>
                </motion.div>

                {summary.sources.length === 0 ? (
                  <motion.div variants={itemVariants}>
                    <EmptyState
                      icon='chart'
                      title='עדיין אין מקורות מימון'
                      description='הוסף את מקורות המימון של הפרויקט — משכנתא, הון עצמי, קרן השתלמות ועוד.'
                      action={<Btn variant='primary' onClick={() => setShowAddSource(true)}>+ הוסף מקור מימון ראשון</Btn>}
                    />
                  </motion.div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {summary.sources.map((source: any) => (
                      <SourceCard key={source._id} source={source} projectId={projectId} currentProjectPct={currentProjectPct} />
                    ))}
                  </div>
                )}
              </>
            )}
          </motion.div>

          {showAddSource && (
            <FundingSourceModal projectId={projectId} onClose={() => setShowAddSource(false)} />
          )}
        </div>
    </ScreenBoundary>
  );
};
