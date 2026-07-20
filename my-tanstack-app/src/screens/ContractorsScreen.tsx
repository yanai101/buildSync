import React from 'react';
import { motion, Reorder, useDragControls } from 'framer-motion';
import { Icon, Avatar, Badge, Stars, Btn, Modal, ProgressBar, EmptyState, ConfirmDialog, FeedbackModal } from '../components/Shared';
import { ContractorNotesAndDocs } from '../components/ContractorNotesAndDocs';
import { Contractor, Milestone } from '../types';
import { useDataSource } from '../hooks/useDataSource';
import { ScreenBoundary } from '../components/ScreenBoundary';
import { fmtMoney } from '../utils/mockData';
import { useCurrentProject } from '../hooks/useCurrentProject';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useProjectFileUploader } from '../hooks/useProjectFileUploader';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

const LockPaymentModal = ({
  milestone,
  onConfirm,
  onClose,
  projectId,
  contractorId,
}: {
  milestone: Milestone;
  onConfirm: (fileIds: Id<'projectFiles'>[]) => Promise<void>;
  onClose: () => void;
  projectId: Id<'projects'>;
  contractorId: Id<'contractors'>;
}) => {
  const [files, setFiles] = React.useState<{ file: File; id?: Id<'projectFiles'>; progress: number }[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const uploadProjectFile = useProjectFileUploader();

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const newFiles: { file: File; id?: Id<'projectFiles'>; progress: number }[] = Array.from(e.target.files).map(file => ({ file, progress: 0 }));
    setFiles(prev => [...prev, ...newFiles]);
    setUploading(true);

    const updatedFiles = [...files, ...newFiles];
    
    for (const item of newFiles) {
      try {
        const { fileId } = await uploadProjectFile({
          projectId,
          file: item.file,
          usage: 'receipt',
          kind: item.file.type.startsWith('image/') ? 'image' : 'document',
          contractorId,
        });
        const index = updatedFiles.findIndex(f => f.file === item.file);
        if (index !== -1) {
          updatedFiles[index].id = fileId;
          updatedFiles[index].progress = 100;
          setFiles([...updatedFiles]);
        }
      } catch (err) {
        console.error("Failed to upload file", err);
      }
    }
    setUploading(false);
  };

  const handleConfirm = async () => {
    setSaving(true);
    const fileIds = files.map(f => f.id).filter((id): id is Id<'projectFiles'> => id !== undefined);
    try {
      await onConfirm(fileIds);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="נעילת תשלום" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text2)' }}>
          האם ברצונך לנעול את התשלום "{milestone.name}"?
          <br />לאחר הנעילה לא ניתן יהיה לערוך או למחוק את התשלום.
        </div>
        
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>צירוף מסמכים (רשות)</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>
            מומלץ לצרף חשבונית מס, קבלה או תצלום של הצ'ק כהוכחת תשלום. התמונות יעברו דחיסה אוטומטית.
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {files.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, background: '#F9FAFB', padding: '6px 10px', borderRadius: 6 }}>
                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 200 }}>{f.file.name}</span>
                {f.progress < 100 ? (
                  <span style={{ color: 'var(--text3)' }}>מעלה...</span>
                ) : (
                  <span style={{ color: 'var(--success)', fontWeight: 700 }}><Icon n="check" s={12}/> הועלה</span>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <style>{`.receipt-camera-btn{display:none !important} @media (pointer: coarse){.receipt-camera-btn{display:flex !important}}`}</style>
            <label className="receipt-camera-btn" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 0', border: '1px dashed var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--accent)', fontWeight: 700, fontSize: 13 }}>
              <Icon n="camera" s={14}/> צלם עכשיו
              <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFilesSelected} disabled={uploading || saving} />
            </label>
            <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 0', border: '1px dashed var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--accent)', fontWeight: 700, fontSize: 13 }}>
              <Icon n="folder" s={14}/> מגלריה / קובץ
              <input type="file" multiple accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleFilesSelected} disabled={uploading || saving} />
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
          <Btn variant="ghost" onClick={onClose} disabled={saving}>ביטול</Btn>
          <Btn onClick={handleConfirm} disabled={uploading || saving}>{saving ? "נועל..." : "אשר ונעול תשלום"}</Btn>
        </div>
      </div>
    </Modal>
  );
};

const ConfirmPaymentModal = ({
  pendingPayment,
  onConfirm,
  onClose,
  saving,
  vatPct,
}: {
  pendingPayment: { contractor: Contractor; milestone: Milestone; paid: boolean };
  onConfirm: (vatAdded: boolean) => Promise<void>;
  onClose: () => void;
  saving: boolean;
  vatPct: number;
}) => {
  const [vatAdded, setVatAdded] = React.useState(false);
  
  const vatAmount = vatAdded ? Math.round(pendingPayment.milestone.amount * (vatPct / 100)) : 0;
  const finalAmount = pendingPayment.milestone.amount + vatAmount;

  return (
    <Modal title={pendingPayment.paid ? "אישור תשלום לקבלן" : "ביטול תשלום לקבלן"} onClose={saving ? undefined : onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text2)' }}>
          {pendingPayment.paid
            ? `לאשר תשלום עבור "${pendingPayment.milestone.name}" לקבלן ${pendingPayment.contractor.name}? הפעולה תוסיף הוצאה גלובלית לתקציב.`
            : `לבטל את התשלום עבור "${pendingPayment.milestone.name}" לקבלן ${pendingPayment.contractor.name}? הפעולה תסיר את ההוצאה הגלובלית המקושרת.`}
        </div>
        
        {pendingPayment.paid && (
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, background: 'var(--bg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 14 }}>
              <span style={{ color: 'var(--text2)' }}>
                {pendingPayment.contractor.includesVat ? 'סכום תשלום (כולל מע"מ):' : 'סכום תשלום נטו:'}
              </span>
              <span style={{ fontWeight: 600 }}>{fmtMoney(pendingPayment.milestone.amount)}</span>
            </div>
            
            {pendingPayment.contractor.includesVat ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, color: 'var(--success)', fontSize: 13, fontWeight: 600 }}>
                <Icon n="check-circle" s={14} />
                <span>הסכום כולל מע"מ כפי שנקבע בהסכם מול הקבלן</span>
              </div>
            ) : (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 12 }}>
                <input 
                  type="checkbox" 
                  checked={vatAdded} 
                  onChange={(e) => setVatAdded(e.target.checked)} 
                  style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
                />
                <span style={{ fontSize: 13, fontWeight: 600 }}>הוסף מע"מ לתשלום ({vatPct}%)</span>
              </label>
            )}

            {vatAdded && !pendingPayment.contractor.includesVat && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 13, color: 'var(--text2)' }}>
                <span>סכום מע"מ:</span>
                <span>{fmtMoney(vatAmount)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 12, fontSize: 15, fontWeight: 800 }}>
              <span>סך הכל חיוב לתקציב:</span>
              <span style={{ color: 'var(--accent)' }}>{fmtMoney(finalAmount)}</span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
          <Btn variant="ghost" onClick={onClose} disabled={saving}>ביטול</Btn>
          <Btn onClick={() => onConfirm(vatAdded)} disabled={saving} style={!pendingPayment.paid ? { background: 'var(--danger)' } : {}}>
            {saving ? "שומר..." : pendingPayment.paid ? "אשר תשלום" : "בטל תשלום"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
};

const PartialPaymentModal = ({
  pendingPartial,
  onConfirm,
  onClose,
  saving,
  projectId,
}: {
  pendingPartial: { contractor: Contractor; milestone: Milestone };
  onConfirm: (amount: number, date: string, note: string, fileIds?: Id<'projectFiles'>[]) => Promise<void>;
  onClose: () => void;
  saving: boolean;
  projectId: Id<'projects'>;
}) => {
  const [amount, setAmount] = React.useState<number>(() => {
    const totalPartials = (pendingPartial.milestone.partialPayments || []).reduce((sum, p) => sum + p.amount, 0);
    return Math.max(0, pendingPartial.milestone.amount - totalPartials);
  });
  const [date, setDate] = React.useState<string>(new Date().toISOString().slice(0, 10));
  const [note, setNote] = React.useState<string>("");
  const [files, setFiles] = React.useState<{ file: File; id?: Id<'projectFiles'>; progress: number }[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const uploadProjectFile = useProjectFileUploader();

  const totalPartials = (pendingPartial.milestone.partialPayments || []).reduce((sum, p) => sum + p.amount, 0);
  const remaining = pendingPartial.milestone.amount - totalPartials;

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const newFiles: { file: File; id?: Id<'projectFiles'>; progress: number }[] = Array.from(e.target.files).map(file => ({ file, progress: 0 }));
    setFiles(prev => [...prev, ...newFiles]);
    setUploading(true);

    const updatedFiles = [...files, ...newFiles];
    
    for (const item of newFiles) {
      try {
        const { fileId } = await uploadProjectFile({
          projectId,
          file: item.file,
          usage: 'receipt',
          kind: item.file.type.startsWith('image/') ? 'image' : 'document',
          contractorId: (pendingPartial.contractor._id ?? pendingPartial.contractor.id) as Id<'contractors'>,
        });
        const index = updatedFiles.findIndex(f => f.file === item.file);
        if (index !== -1) {
          updatedFiles[index].id = fileId;
          updatedFiles[index].progress = 100;
          setFiles([...updatedFiles]);
        }
      } catch (err) {
        console.error("Failed to upload file", err);
      }
    }
    setUploading(false);
  };

  const submit = () => {
    const fileIds = files.map(f => f.id).filter((id): id is Id<'projectFiles'> => id !== undefined);
    onConfirm(amount, date, note, fileIds.length > 0 ? fileIds : undefined);
  };

  return (
    <Modal title="הזנת תשלום חלקי" onClose={saving ? undefined : onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text2)' }}>
          הזן את הסכום שהועבר לקבלן {pendingPartial.contractor.name} עבור {pendingPartial.milestone.name}.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>סכום התשלום (₪)</label>
          <input
            type="number"
            className="bp-input"
            value={amount === 0 ? "" : amount}
            max={remaining}
            onChange={(e) => setAmount(Number(e.target.value))}
            style={{ fontSize: 14 }}
          />
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>
            נותרו לתשלום בשלב זה: {fmtMoney(remaining)}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>תאריך תשלום</label>
          <input
            type="date"
            className="bp-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ fontSize: 14 }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>הערה (אופציונלי)</label>
          <input
            type="text"
            className="bp-input"
            placeholder="למשל: העברה בנקאית מקדמה"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ fontSize: 14 }}
          />
        </div>

        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>צירוף מסמכים (רשות)</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>
            מומלץ לצרף חשבונית מס, קבלה או תצלום של הצ'ק כהוכחת תשלום.
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {files.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, background: '#F9FAFB', padding: '6px 10px', borderRadius: 6 }}>
                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 200 }}>{f.file.name}</span>
                {f.progress < 100 ? (
                  <span style={{ color: 'var(--text3)' }}>מעלה...</span>
                ) : (
                  <span style={{ color: 'var(--success)', fontWeight: 700 }}><Icon n="check" s={12}/> הועלה</span>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <style>{`.receipt-camera-btn{display:none !important} @media (pointer: coarse){.receipt-camera-btn{display:flex !important}}`}</style>
            <label className="receipt-camera-btn" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 0', border: '1px dashed var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--accent)', fontWeight: 700, fontSize: 13 }}>
              <Icon n="camera" s={14}/> צלם עכשיו
              <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFilesSelected} disabled={uploading || saving} />
            </label>
            <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 0', border: '1px dashed var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--accent)', fontWeight: 700, fontSize: 13 }}>
              <Icon n="folder" s={14}/> מגלריה / קובץ
              <input type="file" multiple accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleFilesSelected} disabled={uploading || saving} />
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
          <Btn variant="ghost" onClick={onClose} disabled={saving}>ביטול</Btn>
          <Btn onClick={submit} disabled={saving || uploading || amount <= 0 || amount > remaining}>
            {saving ? "שומר..." : "הוסף תשלום"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
};

const AddReceiptModal = ({
  onClose,
  onUpload,
}: {
  onClose: () => void;
  onUpload: (files: File[]) => void;
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      onUpload(Array.from(e.target.files));
    }
  };

  return (
    <Modal title="הוספת מסמך לתשלום" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text2)' }}>
          בחר כיצד תרצה להעלות את הקבלה או התיעוד:
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
          <style>{`.receipt-camera-btn{display:none !important} @media (pointer: coarse){.receipt-camera-btn{display:flex !important}}`}</style>
          <Btn
            variant="ghost"
            className="receipt-camera-btn"
            style={{ flex: 1, padding: '24px 0', flexDirection: 'column', gap: 8, height: 'auto', border: '1px solid var(--border)' }}
            onClick={() => cameraInputRef.current?.click()}
          >
            <Icon n="camera" s={24} c="var(--accent)" />
            <span style={{ fontSize: 14, fontWeight: 600 }}>צלם עכשיו</span>
          </Btn>
          
          <Btn
            variant="ghost"
            style={{ flex: 1, padding: '24px 0', display: 'flex', flexDirection: 'column', gap: 8, height: 'auto', border: '1px solid var(--border)' }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Icon n="folder" s={24} c="var(--accent)" />
            <span style={{ fontSize: 14, fontWeight: 600 }}>מגלריה / קובץ</span>
          </Btn>
        </div>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleFilesSelected}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf"
          style={{ display: 'none' }}
          onChange={handleFilesSelected}
        />
      </div>
    </Modal>
  );
};

const DEFAULT_SCHEDULE = [
  {name:"מקדמה לפני התחלה", pct:30, triggerText:"לפני תחילת עבודה"},
  {name:"תשלום ביניים א'", pct:25, triggerText:"אחרי 30% מהעבודה"},
  {name:"תשלום ביניים ב'", pct:25, triggerText:"אחרי 70% מהעבודה"},
  {name:"תשלום סופי", pct:20, triggerText:"סיום ואישור מפקח"},
];

const DEFAULT_PAYMENT_SCHEDULES: Record<string, typeof DEFAULT_SCHEDULE> = {
  "קבלן עד מפתח": [
    {name:"מקדמה וחתימת חוזה", pct:10, triggerText:"חתימת חוזה ותחילת עבודה"},
    {name:"סיום עבודות עפר", pct:10, triggerText:"אישור מפקח לסיום חפירה ויסודות"},
    {name:"סיום שלד", pct:20, triggerText:"אישור קונסטרוקטור ומפקח"},
    {name:"מערכות גולמיות", pct:15, triggerText:"חשמל, אינסטלציה ומיזוג לפני טיח"},
    {name:"סיום טיח", pct:10, triggerText:"אישור מפקח לטיח פנים וחוץ"},
    {name:"ריצוף וחיפויים", pct:15, triggerText:"סיום ריצוף וחיפוי רטובים"},
    {name:"גמרים", pct:10, triggerText:"צבע, נגרות, אביזרים וחשמל עדין"},
    {name:"פיתוח חוץ", pct:5, triggerText:"סיום עבודות חוץ וגינה"},
    {name:"מסירה סופית", pct:5, triggerText:"פרוטוקול מסירה ותיקון ליקויים"},
  ],
};

const ContractorRoles = [
  "קבלן עד מפתח","קבלן שלד","קבלן עפר","קבלן טיח","חשמלאי ראשי",
  "אינסטלטור","קבלן מיזוג","קבלן ריצוף","קבלן גג","קבלן גבס","קבלן נגרות","צבעי","קבלן גינה","אחר"
];

const COLORS = ["#7B9B8A","#8B7B5A","#7B8FA1","#E07A38","#6B8B6B","#8B5A5A","#5A5A8B"];

type ContractorForm = {
  name: string;
  company: string;
  role: string;
  phone: string;
  email: string;
  budget: number | "";
  includesVat: boolean;
};

const emptyForm: ContractorForm = {
  name: "",
  company: "",
  role: "קבלן עד מפתח",
  phone: "",
  email: "",
  budget: "",
  includesVat: false,
};

const contractorDbId = (contractor: Contractor) => String(contractor._id ?? contractor.id);
const stageDbId = (stage: { id?: unknown; _id?: unknown; stageId?: unknown }) => String(stage._id ?? stage.stageId ?? stage.id);

type DraftMilestone = Milestone & { isNew?: boolean };

const clampPct = (pct: number) => Math.max(0, Math.min(100, Math.round((Number.isFinite(pct) ? pct : 0) * 10000) / 10000));
const roundPct = (value: number) => Math.round(value * 100) / 100;

const withAmounts = (contractor: Contractor, milestones: DraftMilestone[]): DraftMilestone[] => {
  if (contractor.budget === 0) return milestones.map(m => ({...m, amount: 0, pct: clampPct(m.pct)}));
  
  let sumAmount = 0;
  const next = [...milestones];
  
  // Calculate what the amounts sum up to currently
  const totalAmount = next.reduce((sum, m) => sum + (m.amount || 0), 0);
  const needsRescaling = Math.abs(totalAmount - contractor.budget) > 1;

  if (!needsRescaling) {
    return next.map(m => ({
      ...m,
      pct: (m.amount / contractor.budget) * 100
    }));
  }

  // Fallback: derive amounts from pct (e.g. initialization or budget change)
  const adjustedMilestones = next.map(m => {
    const isImmutable = m.isLocked || m.paid;
    if (isImmutable && contractor.budget > 0) {
       return { ...m, pct: clampPct((m.amount / contractor.budget) * 100) };
    }
    return m;
  });

  const totalPct = roundPct(adjustedMilestones.reduce((sum, m) => sum + m.pct, 0));

  return adjustedMilestones.map((m, i) => {
    const isImmutable = m.isLocked || m.paid;
    if (isImmutable) {
      sumAmount += m.amount;
      return m;
    }
    if (i === adjustedMilestones.length - 1 && totalPct === 100 && contractor.budget > 0) {
      const amount = Math.max(0, contractor.budget - sumAmount);
      return {
        ...m,
        amount,
        pct: (amount / contractor.budget) * 100
      };
    }
    const amount = Math.round(contractor.budget * m.pct / 100);
    sumAmount += amount;
    return {
      ...m,
      amount,
      pct: (amount / contractor.budget) * 100
    };
  });
};

const normalizeMilestones = (contractor: Contractor): Milestone[] => {
  let rawMilestones;
  if (contractor.milestones?.length) {
    rawMilestones = contractor.milestones.map(m => ({
      ...m,
      paid: m.isLocked ? true : m.paid,
      status: (m.paid || m.isLocked) ? 'paid' : m.status,
      paidAt: m.paidAt ?? null,
      amount: m.amount || 0,
    }));
  } else {
    const base = DEFAULT_PAYMENT_SCHEDULES[contractor.role] || DEFAULT_SCHEDULE;
    rawMilestones = base.map((m, i) => {
      const cumulativePct = base.slice(0, i + 1).reduce((total, step) => total + step.pct, 0);
      const paid = contractor.paid >= contractor.budget * (cumulativePct / 100);
      return {
        id: `${contractor.id}-${i}`,
        name: m.name,
        pct: m.pct,
        taskIds: [],
        amount: 0,
        triggerText: m.triggerText,
        paid,
        status: paid ? 'paid' : 'pending',
        paidAt: null,
      };
    });
  }
  
  return withAmounts(contractor, rawMilestones as DraftMilestone[]) as Milestone[];
};

const paymentScheduleKey = (contractor: Contractor) =>
  [
    contractorDbId(contractor),
    contractor.budget,
    contractor.paid,
    contractor.paymentMode ?? 'custom',
    ...(contractor.milestones ?? []).map((milestone) => [
      milestone.id,
      milestone.pct,
      milestone.amount,
      milestone.paid ? 'paid' : 'pending',
      milestone.readyToPay === false ? milestone.lockedReason ?? 'locked' : 'ready',
      milestone.isLocked ? 'locked' : 'unlocked',
    ].join(':')),
  ].join('|');

const balanceMilestones = (milestones: DraftMilestone[], changedIndex: number, contractor: Contractor): DraftMilestone[] => {
  const next = milestones.map(m => ({ ...m }));
  if (next.length === 0 || contractor.budget === 0) return next;

  const totalAmount = next.reduce((sum, m) => sum + (m.amount || 0), 0);
  let delta = totalAmount - contractor.budget;

  if (delta > 0) {
    const indexes = [
      ...Array.from({ length: changedIndex }, (_, i) => changedIndex - 1 - i),
      ...next.map((_, i) => i).filter(i => i > changedIndex),
    ].filter(i => !(next[i].isLocked || next[i].paid));

    for (const index of indexes) {
      if (delta <= 0) break;
      const reduction = Math.min(next[index].amount, delta);
      next[index].amount -= reduction;
      delta -= reduction;
    }

    // Note: any remaining delta here means every other adjustable row has
    // already been drained to 0 and there is genuinely no room in the
    // budget. We deliberately do NOT touch next[changedIndex] — the amount
    // the user just entered must be preserved. The schedule may end up
    // slightly over budget; `scheduleOverBudget` surfaces that in the UI.
  }

  if (delta < 0) {
    const unlockedIndexes = next.map((_, i) => i).filter(i => i !== changedIndex && !(next[i].isLocked || next[i].paid));
    const targetIndex = unlockedIndexes.reverse().find(i => i < changedIndex) ?? unlockedIndexes[0];

    if (targetIndex !== undefined) {
      next[targetIndex].amount += Math.abs(delta);
    } else {
      next[changedIndex].amount += Math.abs(delta);
    }
  }

  // Reconciliation pass: only applies when the schedule is under budget
  // (there's slack to hand to another row). If we're at/over budget, leave
  // the totals as-is rather than forcing an exact match onto some other
  // row or clawing amount back from the row the user just edited.
  const balancedTotal = next.reduce((sum, m) => sum + (m.amount || 0), 0);
  if (balancedTotal < contractor.budget) {
    const unlockedIndexes = next.map((_, i) => i).filter(i => i !== changedIndex && !(next[i].isLocked || next[i].paid));
    const targetIndex = unlockedIndexes[0];
    if (targetIndex !== undefined) {
      next[targetIndex].amount += contractor.budget - balancedTotal;
    } else {
      next[changedIndex].amount += contractor.budget - balancedTotal;
    }
  }

  return next.map(m => ({ ...m, pct: (m.amount / contractor.budget) * 100 }));
};

type DraggableMilestoneAccordionProps = {
  m: DraftMilestone;
  i: number;
  renderAccordion: (m: DraftMilestone, i: number, isExpanded: boolean, toggleExpand: () => void, gripStarter?: (e: React.PointerEvent) => void) => React.ReactNode;
};

const DraggableMilestoneAccordion = ({ m, i, renderAccordion }: DraggableMilestoneAccordionProps) => {
  const controls = useDragControls();
  const [isExpanded, setIsExpanded] = React.useState(m.isNew || false);
  return (
    <Reorder.Item
      as="div"
      layout="position"
      value={m}
      dragListener={false}
      dragControls={controls}
      style={{
        background: (m.paid || m.isLocked) ? "#F0FDF4" : (!m.paid && (m as any).partialPayments?.length > 0) ? "#FFFBEB" : "#FFFFFF",
        border: "1px solid var(--border)",
        borderRadius: 8,
        marginBottom: 8,
        overflow: "hidden"
      }}
    >
      {renderAccordion(m, i, isExpanded, () => setIsExpanded(!isExpanded), (e) => controls.start(e))}
    </Reorder.Item>
  );
};

const PaymentSchedule = ({
  contractor,
  onTogglePaid,
  onSaveSchedule,
  onLock,
  onViewFile,
  onSyncBudget,
  onAddFiles,
  uploadingFilesToMilestone,
  locked,
  onPartialPayment,
  onDeletePartialPayment,
}: {
  contractor: Contractor;
  onTogglePaid: (milestone: Milestone, paid: boolean) => Promise<void>;
  onSaveSchedule: (contractor: Contractor, milestones: DraftMilestone[]) => Promise<void>;
  onLock?: (milestoneId: string) => Promise<void>;
  onViewFile?: (file: { id: string; url: string; name: string; milestoneId: string }) => void;
  onSyncBudget?: (budget: number) => Promise<void>;
  onAddFiles?: (milestoneId: string, files: File[]) => Promise<void>;
  uploadingFilesToMilestone?: string | null;
  locked?: boolean;
  onPartialPayment?: (milestone: Milestone) => void;
  onDeletePartialPayment?: (milestoneId: string, partialId: string) => Promise<void>;
}) => {
  const sourceMilestones = React.useMemo(() => normalizeMilestones(contractor), [contractor]);
  const [milestones, setMilestones] = React.useState<DraftMilestone[]>(() => sourceMilestones);
  const milestonesRef = React.useRef(milestones);
  const [adding, setAdding] = React.useState(false);
  const [newM, setNewM] = React.useState({name:"", pct:10, triggerText:""});
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [attachmentModalId, setAttachmentModalId] = React.useState<string | null>(null);
  const [savingNew, setSavingNew] = React.useState(false);
  const [savingSchedule, setSavingSchedule] = React.useState(false);

  React.useEffect(() => {
    setMilestones(sourceMilestones);
  }, [sourceMilestones]);

  React.useEffect(() => {
    milestonesRef.current = milestones;
  }, [milestones]);

  const totalPaid = milestones.reduce((a, m) => {
    if (m.paid) return a + m.amount;
    const partials = ((m as any).partialPayments || []).reduce((sum: number, p: any) => sum + p.amount, 0);
    return a + partials;
  }, 0);
  const totalPct = roundPct(milestones.reduce((a, m) => {
    if (m.paid) return a + m.pct;
    const partials = ((m as any).partialPayments || []).reduce((sum: number, p: any) => sum + p.amount, 0);
    const partialPct = m.amount > 0 ? (partials / m.amount) * m.pct : 0;
    return a + partialPct;
  }, 0));
  const totalPctAll = roundPct(milestones.reduce((a,m)=>a+m.pct,0));
  const totalAmount = milestones.reduce((a,m)=>a+m.amount,0);
  const scheduleOverBudget = totalPctAll > 100 || totalAmount > contractor.budget;

  const toggle = async (milestone: Milestone) => {
    setPendingId(String(milestone.id));
    try {
      await onTogglePaid(milestone, !milestone.paid);
    } finally {
      setPendingId(null);
    }
  };

  const saveSchedule = async (nextMilestones = milestones) => {
    if (locked) return;
    // Over-budget schedules are allowed to save (surfaced via
    // `scheduleOverBudget` in the UI) — only refuse genuinely invalid
    // input, since blocking the save here would silently drop an edit
    // and leave a stale amount in the DB.
    const hasInvalidAmount = nextMilestones.some(milestone => !Number.isFinite(milestone.amount) || milestone.amount < 0);
    if (hasInvalidAmount) return;
    setSavingSchedule(true);
    try {
      await onSaveSchedule(contractor, nextMilestones);
    } catch (err) {
      // Backend rejects >100% schedules. The UI surfaces this via scheduleOverBudget,
      // so we just catch the error here to prevent an unhandled promise rejection crash.
      console.warn("Schedule save rejected:", err);
    } finally {
      setSavingSchedule(false);
    }
  };

  const updateMilestone = (index: number, patch: Partial<DraftMilestone>, shouldBalance = false) => {
    const prev = milestonesRef.current;
    const edited = prev.map((m, i) => i === index ? { ...m, ...patch } : m);
    const next = shouldBalance ? balanceMilestones(edited, index, contractor) : edited;
    milestonesRef.current = next;
    setMilestones(next);
  };

  const addMilestone = async () => {
    if (!newM.name.trim()) return;
    setSavingNew(true);
    try {
      const newEntry: DraftMilestone = {
        id: `new-${Date.now()}`,
        name: newM.name.trim(),
        triggerText: newM.triggerText.trim(),
        pct: Number(newM.pct),
        // Use user-entered amount directly — do NOT run balanceMilestones here.
        // balanceMilestones would erroneously inflate the amount to fill the entire
        // remaining budget when milestonesRef is stale/empty after a sync update.
        amount: Math.round(contractor.budget * Number(newM.pct) / 100),
        taskIds: [],
        status: 'pending',
        paid: false,
        paidAt: null,
        isNew: true,
      };
      // Append to the CURRENT ref (not state) to avoid stale-closure issues
      const next = [...milestonesRef.current, newEntry];
      milestonesRef.current = next;
      setMilestones(next);
      await onSaveSchedule(contractor, next);
      // Success: close form
      setNewM({ name: "", pct: newM.pct, triggerText: "" });
      setAdding(false);
    } catch (err) {
      // Keep form open so the user can retry — their input is preserved
      console.warn("שגיאה בהוספת שלב תשלום:", err);
    } finally {
      setSavingNew(false);
    }
  };


  const saveOnBlur = async (changedIndex: number) => {
    const balanced = balanceMilestones(milestonesRef.current, changedIndex, contractor);
    milestonesRef.current = balanced;
    setMilestones(balanced);
    await saveSchedule(balanced);
  };

  const handleReorder = (next: DraftMilestone[]) => {
    if (locked) return;
    milestonesRef.current = next;
    setMilestones(next);
    void saveSchedule(next);
  };

  const renderMilestoneAccordion = (m: DraftMilestone, i: number, isExpanded: boolean, toggleExpand: () => void, gripStarter?: (e: React.PointerEvent) => void) => {
    const isSyncedLocked = m.sourceMode === 'stage_synced' && contractor.role !== 'קבלן עד מפתח';
    const partialsSum = ((m as any).partialPayments || []).reduce((sum: number, p: any) => sum + p.amount, 0);
    const totalFilesCount = (m.files?.length || 0) + ((m as any).partialPayments || []).reduce((acc: number, p: any) => acc + (p.files?.length || 0), 0);
    const mRemaining = Math.max(0, m.amount - partialsSum);

    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Accordion Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 12, cursor: 'pointer', flexWrap: 'wrap' }} onClick={toggleExpand}>
          {gripStarter && (
            <div onPointerDown={(e) => { e.stopPropagation(); gripStarter(e); }} title="גרור לסידור" style={{ cursor: "grab", padding: 4, marginInlineStart: -8, touchAction: "none" }}>
              <Icon n="menu" s={16} c="var(--text3)"/>
            </div>
          )}
          <div style={{ width: 24, height: 24, flexShrink: 0, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text2)' }}>
            {i + 1}
          </div>
          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', minWidth: 150 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>{m.name || "שלב ללא שם"}</span>
              <Icon n={isExpanded ? "chevron-up" : "chevron-down"} s={14} c="var(--text3)" />
              {((!m.paid && (m as any).partialPayments?.length > 0) || totalFilesCount > 0) && (
                <div style={{ display: 'flex', gap: 6, marginInlineStart: 4, alignItems: 'center' }}>
                  {!m.paid && (m as any).partialPayments?.length > 0 && (
                    <span style={{fontSize: 10, background: '#FEF3C7', color: '#92400E', padding: '2px 6px', borderRadius: 4, fontWeight: 600}}>
                      שולם חלקי
                    </span>
                  )}
                  {totalFilesCount > 0 && (
                    <span style={{fontSize: 10, background: 'var(--bg)', padding: '2px 6px', borderRadius: 10, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4}}>
                      <Icon n="file-text" s={10}/>
                      {totalFilesCount}
                    </span>
                  )}
                </div>
              )}
            </div>
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>
              {m.pct === 0 ? "0%" : `${Number(m.pct.toFixed(2))}%`} · {fmtMoney(m.amount)}
              {m.paidAt && ` · שולם: ${m.paidAt}`}
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
            {m.isLocked ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, paddingRight: 4 }}>
                <Icon n="check-circle" s={14} c="var(--success)"/>
                <span className="badge badge-done hide-mobile">שולם (נעול)</span>
              </div>
            ) : m.paid ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button onClick={() => toggle(m as Milestone)} disabled={pendingId === String(m.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg)', color: 'var(--text1)', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }} title="בטל תשלום">
                  {pendingId === String(m.id) ? <Icon n="loader" s={12} c="var(--success)" /> : <Icon n="check-square" s={14} c="var(--success)" />}
                  <span className="hide-mobile">בטל תשלום</span>
                </button>
                {onLock && (
                  <button onClick={() => onLock(String(m.id))} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--success)', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                    <Icon n="lock" s={12}/> <span className="hide-mobile">נעל</span>
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {(m as any).partialPayments?.length > 0 && mRemaining > 0 && (
                  <button onClick={() => onPartialPayment?.(m as Milestone)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D', borderRadius: 4, padding: '4px 8px', fontWeight: 600, cursor: 'pointer' }} title="הוסף תשלום חלקי נוסף">
                    <Icon n="plus" s={12} />
                    <span>עוד חלקי (יתרה: {fmtMoney(mRemaining)})</span>
                  </button>
                )}
                {(!((m as any).partialPayments?.length > 0)) && (
                  <button onClick={() => onPartialPayment?.(m as Milestone)} style={{ fontSize: 11, background: 'var(--bg)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', fontWeight: 600, cursor: 'pointer' }}>
                    חלקי
                  </button>
                )}
                <button onClick={() => toggle(m as Milestone)} disabled={pendingId === String(m.id)} style={{ fontSize: 11, background: 'var(--success)', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {pendingId === String(m.id) && <Icon n="loader" s={10} />}
                  שלם
                </button>
              </div>
            )}
            
            {/* Delete Stage Button in Header */}
            {!m.isLocked && !m.paid && !isSyncedLocked && milestones.length > 1 && (
              <button onClick={() => {
                const next = milestonesRef.current.filter((_, idx) => idx !== i);
                const balanced = balanceMilestones(next, next.length - 1, contractor);
                milestonesRef.current = balanced;
                setMilestones(balanced);
                void saveSchedule(balanced);
              }} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#FEF2F2', color: 'var(--danger)', border: '1px solid #FECACA', borderRadius: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }} title="מחק שלב">
                <Icon n="trash-2" s={12}/>
                <span>מחק</span>
              </button>
            )}
          </div>
        </div>

        {/* Accordion Body (Everything inside is only visible when expanded) */}
        {isExpanded && (
          <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            
            {/* Divider */}
            <div style={{ height: 1, background: 'var(--border)', margin: '0 -16px 8px' }} />

            {/* VAT Info & Synced Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 11, color: m.paid ? 'var(--success)' : 'var(--text3)', fontWeight: m.paid ? 600 : 400 }}>
                {m.paid && m.vatAmount ? `+ ${fmtMoney(m.vatAmount)} מע"מ` : (!contractor.includesVat && !m.paid ? `+ מע"מ` : null)}
              </div>
              {isSyncedLocked && (
                <div style={{fontSize:11,color:"#3730A3",fontWeight:700,background:"#EEF2FF",padding:"4px 8px",borderRadius:4}}>ממשימות השלב</div>
              )}
            </div>

            {/* Partial payments list */}
            {(m as any).partialPayments?.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: 'var(--bg)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)' }}>היסטוריית תשלומים חלקיים:</span>
                </div>
                {(m as any).partialPayments.map((p: any, idx: number, arr: any[]) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, borderBottom: idx < arr.length - 1 ? '1px solid var(--border)' : 'none', paddingBottom: idx < arr.length - 1 ? 6 : 0, marginBottom: idx < arr.length - 1 ? 6 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, color: 'var(--success)' }}>{fmtMoney(p.amount)}</span>
                      <span style={{ color: 'var(--text3)' }}>({p.date.split('-').reverse().join('/')})</span>
                      {p.note && <span style={{ color: 'var(--text2)', fontSize: 11, background: '#F1F5F9', padding: '2px 6px', borderRadius: 4 }} title={p.note}>{p.note}</span>}
                      {p.files && p.files.length > 0 && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          {p.files.map((f: any) => (
                            <button key={f.id} onClick={() => onViewFile?.({ id: f.id as string, url: f.url, name: f.name, milestoneId: m.id as string })} title={f.name} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, background: '#EEF2FF', color: '#4F46E5', borderRadius: 4, border: 'none', cursor: 'pointer' }}>
                              <Icon n="file-text" s={12}/>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {!m.paid && !m.isLocked && (
                      <button onClick={() => onDeletePartialPayment?.(String(m.id), p.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 4 }} title="מחק תשלום חלקי">
                        <Icon n="trash-2" s={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Notes and files */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
              <button onClick={() => setAttachmentModalId(String(m.id))} disabled={uploadingFilesToMilestone === m.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--bg)', color: 'var(--accent)', borderRadius: 4, border: '1px dashed var(--border)', padding: '4px 8px', fontSize: 11, fontWeight: 600, cursor: uploadingFilesToMilestone === m.id ? 'wait' : 'pointer' }} title="הוסף קובץ">
                {uploadingFilesToMilestone === m.id ? <Icon n="loader" s={12} /> : <Icon n="paperclip" s={12} />}
                הוסף קובץ לשלב זה
              </button>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {(m.files || []).map((f: any) => (
                  <button key={f.id} onClick={() => onViewFile?.({ id: f.id as string, url: f.url, name: f.name, milestoneId: m.id as string })} title={f.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#EEF2FF', color: '#4F46E5', borderRadius: 4, border: 'none', padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}>
                    <Icon n="file-text" s={12}/>
                    {f.name.length > 15 ? f.name.substring(0, 15) + "..." : f.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Accordion Configuration Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>הגדרות שלב תשלום (עריכה)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>שם השלב</span>
                  <input className="bp-input" value={m.name} disabled={savingSchedule || locked || m.isLocked || m.paid || isSyncedLocked} onChange={e=>updateMilestone(i, {name:e.target.value})} onBlur={()=>saveOnBlur(i)} style={{ fontSize: 13 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>תנאי לתשלום</span>
                  <input className="bp-input" value={m.triggerText || ""} disabled={savingSchedule || locked || m.isLocked || m.paid || isSyncedLocked} onChange={e=>updateMilestone(i, {triggerText:e.target.value})} onBlur={()=>saveOnBlur(i)} style={{ fontSize: 13 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>אחוז (%)</span>
                  <input className="bp-input" type="number" min={0} max={100} step="any" placeholder="0" value={m.pct === 0 ? "" : Number(m.pct.toFixed(2))} disabled={savingSchedule || locked || m.isLocked || m.paid || isSyncedLocked} onChange={e=>{
                    const val = e.target.value;
                    const newPct = val === "" ? 0 : Number(val);
                    updateMilestone(i, {pct: newPct, amount: contractor.budget ? Math.round((newPct / 100) * contractor.budget) : 0}, false);
                  }} onBlur={()=>saveOnBlur(i)} style={{ fontSize: 13 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>סכום (₪)</span>
                  <input className="bp-input" type="number" min={0} max={contractor.budget} placeholder="0" value={m.amount === 0 ? "" : m.amount} disabled={savingSchedule || locked || m.isLocked || m.paid || isSyncedLocked} onChange={e => {
                    if (contractor.budget > 0) {
                      const val = e.target.value;
                      const newAmount = val === "" ? 0 : Number(val);
                      const newPct = (newAmount / contractor.budget) * 100;
                      updateMilestone(i, { amount: newAmount, pct: newPct }, false);
                    }
                  }} onBlur={()=>saveOnBlur(i)} style={{ fontSize: 13 }} />
                </div>
              </div>
            </div>
            
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="card">
      <div className="card-header" style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
          <span>לוח תשלומים</span>
          <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",lineHeight:1.3}}>
              <span style={{fontSize:12,color:scheduleOverBudget?"var(--danger)":totalPctAll===100?"var(--success)":"var(--warning)",fontWeight:700}}>סה"כ: {totalPctAll}%</span>
              <span style={{fontSize:11,color:"var(--text3)",fontWeight:400}}>שולם: {totalPct}% · {fmtMoney(totalPaid)}</span>
            </div>
            <Btn size="sm" onClick={() => {
              const remainingAmount = Math.max(0, contractor.budget - totalAmount);
              const remainingPct = contractor.budget > 0
                ? Math.round((remainingAmount / contractor.budget) * 10000) / 100  // 2 decimal precision
                : 10;
              setNewM({ name: "", pct: remainingPct > 0 ? remainingPct : 10, triggerText: "" });
              setAdding(v => !v);
            }} disabled={locked}><Icon n="plus" s={12}/> הוסף שלב</Btn>
          </div>
        </div>
        {locked && (
          <div style={{background:"#EEF2FF",color:"#3730A3",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            <Icon n="lock" s={12}/> מסונכרן לפי משימות השלבים
          </div>
        )}
      </div>

      {scheduleOverBudget && !locked && (
        <div style={{margin:"10px 18px 0",border:"1px solid #FCA5A5",background:"#FEF2F2",color:"#991B1B",borderRadius:8,padding:"8px 10px",fontSize:12,fontWeight:700}}>
          סכום שלבי התשלום ({fmtMoney(totalAmount)}) גבוה מהסכום המוסכם עם הקבלן ({fmtMoney(contractor.budget)}). צריך להקטין אחוזים לפני שמירה.
        </div>
      )}

      {locked && totalAmount !== Math.round(contractor.budget) && (
        <div style={{margin:"10px 18px 0",border:"1px solid #FCD34D",background:"#FFFBEB",color:"#92400E",borderRadius:8,padding:"10px 12px",fontSize:12,display:"flex",flexDirection:"column",gap:8}}>
          <div>
            <div style={{fontWeight:700,marginBottom:2}}>חוסר התאמה בתקציב</div>
            סכום השלבים המשויכים לקבלן ({fmtMoney(totalAmount)}) שונה מסכום החוזה המוגדר ({fmtMoney(contractor.budget)}).
          </div>
          {onSyncBudget && (
            <Btn size="sm" onClick={() => onSyncBudget(totalAmount)} style={{alignSelf:"flex-start"}}><Icon n="refresh-cw" s={13}/> סנכרן את חוזה הקבלן לסכום השלבים ({fmtMoney(totalAmount)})</Btn>
          )}
        </div>
      )}



      {adding && (
        <div style={{margin:"12px 18px",padding:14,background:"var(--bg)",borderRadius:8,border:"1px solid var(--border)"}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>שלב תשלום חדש</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
            <div style={{flex:2,minWidth:140}}>
              <div style={{fontSize:11,color:"var(--text2)",marginBottom:3}}>שם השלב</div>
              <input className="bp-input" value={newM.name} onChange={e=>setNewM(n=>({...n,name:e.target.value}))} placeholder="לדוגמה: אחרי ריצוף קומה ב'"/>
            </div>
            <div style={{flex:2,minWidth:140}}>
              <div style={{fontSize:11,color:"var(--text2)",marginBottom:3}}>תנאי לתשלום</div>
              <input className="bp-input" value={newM.triggerText} onChange={e=>setNewM(n=>({...n,triggerText:e.target.value}))} placeholder="מה צריך להיות מוכן?"/>
            </div>
            <div style={{flex:"0 0 80px"}}>
              <div style={{fontSize:11,color:"var(--text2)",marginBottom:3}}>אחוז %</div>
              <input className="bp-input" type="number" placeholder="0" value={newM.pct === 0 ? "" : Number(newM.pct.toFixed(2))} onChange={e=>{
                const val = e.target.value;
                setNewM(n=>({...n,pct:val === "" ? 0 : Number(val)}));
              }} min={0} max={100} step="any"/>
            </div>
            <div style={{flex:"0 0 100px"}}>
              <div style={{fontSize:11,color:"var(--text2)",marginBottom:3}}>סכום ₪</div>
              <input className="bp-input" type="number" placeholder="0" value={Math.round(contractor.budget * newM.pct / 100) === 0 ? "" : Math.round(contractor.budget * newM.pct / 100)} onChange={e=>{
                if (contractor.budget > 0) {
                  const val = e.target.value;
                  setNewM(n=>({...n,pct:val === "" ? 0 : (Number(val) / contractor.budget) * 100}));
                }
              }} min={0} max={contractor.budget}/>
            </div>
            <div style={{display:"flex",gap:6}}>
              <Btn onClick={addMilestone} disabled={savingNew}><Icon n="plus" s={13}/> הוסף</Btn>
              <Btn variant="ghost" onClick={()=>setAdding(false)} disabled={savingNew}>ביטול</Btn>
            </div>
          </div>
          <div style={{fontSize:11,color:"var(--text3)",marginTop:8}}>
            ההוספה מאזנת אוטומטית את האחוזים כך שכל השלבים יחד נשארים 100%.
          </div>
        </div>
      )}

      <div style={{padding:"10px 18px 0"}}>
        <div style={{height:8,background:"var(--border)",borderRadius:4,overflow:"hidden",display:"flex"}}>
          {milestones.map((m,i)=>{
            const partials = ((m as any).partialPayments || []).reduce((sum: number, p: any) => sum + p.amount, 0);
            const fillPct = m.paid ? 100 : (m.amount > 0 ? (partials / m.amount) * 100 : 0);
            return (
              <div key={m.id} style={{
                width:`${m.pct}%`,
                background: "transparent",
                borderLeft:i>0?"1px solid var(--bg)":"",
                position: "relative"
              }} title={`${m.name}: ${roundPct(m.pct)}%`}>
                {fillPct > 0 && (
                  <div style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    right: 0,
                    width: `${fillPct}%`,
                    background: "var(--success)"
                  }} />
                )}
              </div>
            );
          })}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--text3)",marginTop:4}}>
          <span>₪0</span><span>{fmtMoney(contractor.budget)}</span>
        </div>
      </div>

      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 0 }}>
        {locked ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {milestones.map((m, i) => (
              <div key={m.id} style={{
                background: (m.paid || m.isLocked) ? "#F0FDF4" : (!m.paid && (m as any).partialPayments?.length > 0) ? "#FFFBEB" : "#FFFFFF",
                border: "1px solid var(--border)",
                borderRadius: 8,
                overflow: "hidden"
              }}>
                {renderMilestoneAccordion(m, i, false, () => {}, undefined)}
              </div>
            ))}
          </div>
        ) : (
          <Reorder.Group as="div" axis="y" values={milestones} onReorder={handleReorder}>
            {milestones.map((m, i) => (
              <DraggableMilestoneAccordion key={m.id} m={m} i={i} renderAccordion={renderMilestoneAccordion} />
            ))}
          </Reorder.Group>
        )}
        
        {/* Footer Summary */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F9FAFB", padding: "12px 16px", borderRadius: 8, border: "1px solid var(--border)" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>סה"כ</span>
            <div style={{ display: 'flex', gap: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>אחוז כולל</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: scheduleOverBudget ? "var(--danger)" : totalPctAll === 100 ? "var(--text1)" : "var(--warning)" }}>{totalPctAll}%</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>סכום חוזה</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: scheduleOverBudget ? "var(--danger)" : "var(--text1)" }}>{fmtMoney(contractor.budget)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>שולם בפועל</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--success)" }}>{fmtMoney(totalPaid)}</span>
              </div>
            </div>
          </div>
          {contractor.budget > totalAmount + 1 && (
            <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "8px 14px", fontSize: 12, color: "#92400E", display: "flex", alignItems: "center", gap: 6 }}>
              <Icon n="alert-triangle" s={13}/>
              <span>יש הפרש בלתי מתוכנן של <strong>{fmtMoney(contractor.budget - totalAmount)}</strong> — הוסף שלב תשלום כדי לכסות אותו</span>
            </div>
          )}
        </div>

      </div>
      
      {attachmentModalId && (
        <AddReceiptModal 
          onClose={() => setAttachmentModalId(null)} 
          onUpload={(files) => {
            setAttachmentModalId(null);
            onAddFiles?.(attachmentModalId, files);
          }} 
        />
      )}

    </div>
  );
};

import { useSearch } from '@tanstack/react-router';

export const ContractorsScreen = () => {
  const { projectId, project } = useCurrentProject();
  const search = useSearch({ from: '/contractors', shouldThrow: false }) as { contractorId?: string } | undefined;
  const dbContractors = useQuery(api.queries.listContractors, projectId ? { projectId } : "skip");
  const dbStages = useQuery(api.queries.listStages, projectId ? { projectId } : "skip");
  const contractorsSource = useDataSource<Contractor[]>('contractors', { db: dbContractors as any });
  const { loading, error, refetch, mode } = contractorsSource;
  const contractors = contractorsSource.data ?? [];
  const createContractor = useMutation(api.mutations.createContractor);
  const updateContractor = useMutation(api.mutations.updateContractor);
  const deleteContractor = useMutation(api.mutations.deleteContractor);
  const saveSchedule = useMutation(api.mutations.saveContractorPaymentSchedule);
  const setMilestonePaid = useMutation(api.mutations.setContractorPaymentMilestonePaid);
  const lockPaymentMilestone = useMutation(api.mutations.lockContractorPaymentMilestone);
  const addFilesToLockedMilestone = useMutation(api.mutations.addFilesToContractorPaymentMilestone);
  const deleteFileMutation = useMutation(api.mutations.deleteContractorPaymentMilestoneFile);
  const addPartialPayment = useMutation(api.mutations.addContractorPartialPayment);
  const deletePartialPayment = useMutation(api.mutations.deleteContractorPartialPayment);
  const uploadProjectFile = useProjectFileUploader();
  const setContractorStages = useMutation(api.stages.setContractorStages);
  const setContractorPaymentMode = useMutation(api.stages.setContractorPaymentMode);
  const [selectedId, setSelectedId] = React.useState<string | null>(search?.contractorId ?? null);
  const [adding, setAdding] = React.useState(false);
  const [editingContractor, setEditingContractor] = React.useState<Contractor | null>(null);
  const [savingContractor, setSavingContractor] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Contractor | null>(null);
  const [deletingContractor, setDeletingContractor] = React.useState(false);
  const [confirmPaymentMode, setConfirmPaymentMode] = React.useState<{ contractor: Contractor, mode: 'stage_synced' | 'custom' } | null>(null);

  const [savingPayment, setSavingPayment] = React.useState(false);
  const [pendingPayment, setPendingPayment] = React.useState<{ contractor: Contractor; milestone: Milestone; paid: boolean } | null>(null);
  const [pendingPartial, setPendingPartial] = React.useState<{ contractor: Contractor; milestone: Milestone } | null>(null);
  const [savingPartial, setSavingPartial] = React.useState(false);
  const [deletePartialTarget, setDeletePartialTarget] = React.useState<{ milestoneId: string; partialId: string } | null>(null);
  const [deletingPartial, setDeletingPartial] = React.useState(false);
  const [lockTarget, setLockTarget] = React.useState<string | null>(null);
  const [lockingPayment, setLockingPayment] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ title: string; message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [savingStageLinks, setSavingStageLinks] = React.useState(false);
  const [savingPaymentMode, setSavingPaymentMode] = React.useState(false);
  const [uploadingFilesToMilestone, setUploadingFilesToMilestone] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<ContractorForm>(emptyForm);
  const [viewFile, setViewFile] = React.useState<{ id: string; url: string; name: string; milestoneId: string } | null>(null);
  const [fileToDelete, setFileToDelete] = React.useState<{ id: Id<'projectFiles'>; milestoneId: string } | null>(null);
  const [deletingFile, setDeletingFile] = React.useState(false);

  const selected = contractors.find(c => String(c.id) === selectedId || String(c._id) === selectedId) ?? null;
  const stages = (dbStages ?? []) as any[];

  React.useEffect(() => {
    if (search?.contractorId) {
      setSelectedId(search.contractorId);
    }
  }, [search?.contractorId]);

  React.useEffect(() => {
    if (selectedId && !selected && !loading && contractors.length > 0) setSelectedId(null);
  }, [selected, selectedId, loading, contractors.length]);

  const addContractor = async () => {
    if (!projectId || !form.name.trim()) return;

    if (!form.budget || form.budget <= 0) {
      setFeedback({ title: "שגיאה בשמירה", message: "חובה להזין את סכום התקציב שנסגר מול הקבלן כדי שלוח התשלומים יתחלק נכון.", type: "error" });
      return;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setFeedback({ title: "שגיאה", message: "כתובת האימייל שהוזנה אינה תקינה.", type: "error" });
      return;
    }
    if (form.phone && !/^[0-9\-\+]{9,15}$/.test(form.phone)) {
      setFeedback({ title: "שגיאה", message: "מספר הטלפון שהוזן אינו תקין.", type: "error" });
      return;
    }

    setSavingContractor(true);
    try {
      if (editingContractor) {
        await updateContractor({
          contractorId: contractorDbId(editingContractor) as any,
          name: form.name.trim(),
          company: form.company.trim() || undefined,
          role: form.role as any,
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          budget: Number(form.budget) || 0,
          includesVat: form.includesVat,
        });
        setEditingContractor(null);
      } else {
        await createContractor({
          projectId,
          name: form.name.trim(),
          company: form.company.trim() || undefined,
          role: form.role as any,
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          budget: Number(form.budget) || 0,
          avatarColor: COLORS[contractors.length % COLORS.length],
          includesVat: form.includesVat,
        });
        setAdding(false);
      }
      setForm(emptyForm);
    } catch (err) {
      setFeedback({
        title: "שגיאה",
        message: err instanceof Error ? err.message : "לא הצלחנו לשמור את הקבלן. אנא נסו שוב.",
        type: "error",
      });
    } finally {
      setSavingContractor(false);
    }
  };

  const openEditModal = (contractor: Contractor) => {
    setForm({
      name: contractor.name,
      company: contractor.company || "",
      role: contractor.role || "קבלן עד מפתח",
      phone: contractor.phone || "",
      email: contractor.email || "",
      budget: contractor.budget || "",
      includesVat: contractor.includesVat || false,
    });
    setEditingContractor(contractor);
  };

  const handleTogglePaid = async (milestone: Milestone, paid: boolean) => {
    if (mode !== 'db') return;
    const contractor = contractors.find(c => normalizeMilestones(c).some(m => String(m.id) === String(milestone.id)));
    if (!contractor) return;
    setPendingPayment({ contractor, milestone, paid });
  };

  const confirmPaymentChange = async (vatAdded: boolean) => {
    if (!pendingPayment) return;
    setSavingPayment(true);
    try {
      await setMilestonePaid({
        milestoneId: String(pendingPayment.milestone.id) as any,
        paid: pendingPayment.paid,
        vatAdded,
        // Pass the on-screen amount so paying can never fall back to a
        // stale/racy value already written to the DB by a schedule save.
        amount: pendingPayment.paid ? pendingPayment.milestone.amount : undefined,
      });
      setFeedback({
        title: pendingPayment.paid ? "תשלום אושר" : "תשלום בוטל",
        message: pendingPayment.paid
          ? "התשלום סומן כשולם ונוספה הוצאה גלובלית לתקציב."
          : "התשלום בוטל וההוצאה הגלובלית המקושרת הוסרה.",
        type: pendingPayment.paid ? "success" : "info",
      });
      setPendingPayment(null);
    } catch (err) {
      setFeedback({
        title: "שגיאה",
        message: err instanceof Error ? err.message : "לא הצלחנו לעדכן את התשלום. אנא נסו שוב.",
        type: "error",
      });
    } finally {
      setSavingPayment(false);
    }
  };

  const handleAddPartialPayment = async (amount: number, date: string, note: string, fileIds?: Id<'projectFiles'>[]) => {
    if (!pendingPartial) return;
    setSavingPartial(true);
    try {
      await addPartialPayment({
        milestoneId: String(pendingPartial.milestone.id),
        amount,
        date,
        note: note || undefined,
        fileIds,
        // Fallback: if the milestone was replaced by a sync after the UI loaded,
        // the server uses contractorId + sortOrder to find the new milestone.
        contractorId: contractorDbId(pendingPartial.contractor) as any,
        sortOrder: (pendingPartial.milestone as any).sortOrder,
      });
      setPendingPartial(null);
      setFeedback({ title: "נשמר בהצלחה", message: "התשלום החלקי נוסף וההוצאה עודכנה", type: "success" });
    } catch (err) {
      setFeedback({ title: "שגיאה", message: "שגיאה בהוספת תשלום חלקי", type: "error" });
    } finally {
      setSavingPartial(false);
    }
  };


  const handleDeletePartialPayment = async (milestoneId: string, partialId: string): Promise<void> => {
    setDeletePartialTarget({ milestoneId, partialId });
  };

  const confirmDeletePartialPayment = async () => {
    if (!deletePartialTarget) return;
    setDeletingPartial(true);
    try {
      await deletePartialPayment({ milestoneId: deletePartialTarget.milestoneId, partialPaymentId: deletePartialTarget.partialId });
      setFeedback({ title: "נמחק", message: "התשלום החלקי הוסר מהתקציב", type: "success" });
      setDeletePartialTarget(null);
    } catch (err) {
      setFeedback({ title: "שגיאה", message: "שגיאה במחיקת תשלום", type: "error" });
    } finally {
      setDeletingPartial(false);
    }
  };

  const handleSaveSchedule = async (contractor: Contractor, milestones: DraftMilestone[]) => {
    if (mode !== 'db') return;
    await saveSchedule({
      contractorId: contractorDbId(contractor) as any,
      milestones: milestones.map(milestone => ({
        milestoneId: milestone.isNew ? undefined : String(milestone.id) as any,
        sourceStageId: milestone.sourceStageId as any,
        name: milestone.name,
        triggerText: milestone.triggerText || '',
        pct: milestone.pct,
        amount: milestone.amount,
      })),
    });
  };


  const handleLockPayment = async (milestoneId: string) => {
    setLockTarget(milestoneId);
  };

  const confirmLockPayment = async (fileIds?: Id<'projectFiles'>[]) => {
    if (mode !== 'db' || !lockTarget) return;
    setLockingPayment(true);
    try {
      await lockPaymentMilestone({ milestoneId: lockTarget as any, ...(fileIds?.length ? { fileIds } : {}) });
      setLockTarget(null);
    } catch (err) {
      setFeedback({
        title: "שגיאה",
        message: err instanceof Error ? err.message : "לא הצלחנו לנעול את התשלום. אנא נסו שוב.",
        type: "error",
      });
    } finally {
      setLockingPayment(false);
    }
  };

  const handleAddFilesToLockedMilestone = async (milestoneId: string, files: File[]) => {
    if (mode !== 'db' || !projectId || !selectedId) return;
    setUploadingFilesToMilestone(milestoneId);
    try {
      const fileIds: Id<'projectFiles'>[] = [];
      for (const file of files) {
        const { fileId } = await uploadProjectFile({
          projectId,
          file,
          usage: 'receipt',
          kind: file.type.startsWith('image/') ? 'image' : 'document',
          contractorId: selectedId as Id<'contractors'>,
        });
        fileIds.push(fileId);
      }
      await addFilesToLockedMilestone({ milestoneId, fileIds });
    } catch (err) {
      setFeedback({
        title: "שגיאה",
        message: err instanceof Error ? err.message : "לא הצלחנו להעלות קבצים. אנא נסו שוב.",
        type: "error",
      });
    } finally {
      setUploadingFilesToMilestone(null);
    }
  };

  const handleToggleStage = async (contractor: Contractor, stageId: string, checked: boolean) => {
    if (mode !== 'db') return;
    const currentIds = new Set((contractor.stages ?? []).map(stageDbId));
    if (checked) currentIds.add(stageId);
    else currentIds.delete(stageId);

    setSavingStageLinks(true);
    try {
      await setContractorStages({
        contractorId: contractorDbId(contractor) as any,
        stageIds: Array.from(currentIds) as any[],
      });
    } catch (err) {
      setFeedback({ title: "שגיאה", message: "לא הצלחנו לעדכן את שיוך השלבים לקבלן.", type: "error" });
    } finally {
      setSavingStageLinks(false);
    }
  };

  const handlePaymentModeChange = async (contractor: Contractor, paymentMode: 'stage_synced' | 'custom') => {
    if (mode !== 'db') return;
    const isPaid = contractorHasPaidPayments(contractor);
    if (isPaid && paymentMode === 'custom' && contractor.paymentMode === 'stage_synced') {
      setConfirmPaymentMode({ contractor, mode: paymentMode });
      return;
    }
    executePaymentModeChange(contractor, paymentMode);
  };

  const executePaymentModeChange = async (contractor: Contractor, paymentMode: 'stage_synced' | 'custom') => {
    setSavingPaymentMode(true);
    try {
      await setContractorPaymentMode({
        contractorId: contractorDbId(contractor) as any,
        paymentMode,
      });
      setConfirmPaymentMode(null);
    } catch (err) {
      setFeedback({ title: "שגיאה", message: err instanceof Error ? err.message : "לא הצלחנו לעדכן את מצב לוח התשלומים.", type: "error" });
    } finally {
      setSavingPaymentMode(false);
    }
  };

  const contractorHasPaidPayments = (contractor: Contractor) =>
    contractor.paid > 0 || normalizeMilestones(contractor).some(milestone => Boolean(milestone.paid));

  const requestDeleteContractor = (contractor: Contractor) => {
    if (mode !== 'db') return;
    setDeleteTarget(contractor);
  };

  const confirmDeleteContractor = async () => {
    if (!deleteTarget) return;
    setDeletingContractor(true);
    try {
      const result = await deleteContractor({ contractorId: contractorDbId(deleteTarget) as any });
      setFeedback({
        title: "הקבלן נמחק",
        message: result.paidMilestonesPreserved > 0
          ? `הקבלן נמחק מהפרויקט. ${result.paidMilestonesPreserved} תשלומים ששולמו נשמרו בהיסטוריית התשלומים וההוצאות.`
          : "הקבלן נמחק מהפרויקט.",
        type: "success",
      });
      if (selectedId && (selectedId === String(deleteTarget.id) || selectedId === String(deleteTarget._id))) {
        setSelectedId(null);
      }
      setDeleteTarget(null);
    } catch (err) {
      setFeedback({
        title: "שגיאה",
        message: err instanceof Error ? err.message : "לא הצלחנו למחוק את הקבלן. אנא נסו שוב.",
        type: "error",
      });
    } finally {
      setDeletingContractor(false);
    }
  };

  const c = selected;
  const selectedPaymentStarted = c
    ? c.paid > 0 || normalizeMilestones(c).some(milestone => Boolean(milestone.paid))
    : false;

  const hasTurnkeyContractor = (contractors ?? []).some(item => item.role === 'קבלן עד מפתח');
  
  const visibleStages = React.useMemo(() => {
    if (!c) return stages;
    return stages.filter(stage => {
      const isTurnkeyStage = stage.contractorRole === 'קבלן עד מפתח' || stage.contractors?.some((sc: any) => sc.role === 'קבלן עד מפתח');
      if (c.role === 'קבלן עד מפתח') {
        return isTurnkeyStage;
      }
      return !isTurnkeyStage;
    });
  }, [stages, c]);

  const hasCustomStages = stages.some(stage => stage.contractorRole !== 'קבלן עד מפתח' && !stage.contractors?.some((sc: any) => sc.role === 'קבלן עד מפתח'));
  const availableRoles = hasCustomStages ? ContractorRoles.filter(r => r !== 'קבלן עד מפתח') : ContractorRoles;

  const contractorModal = (adding || editingContractor) ? (
    <Modal onClose={()=>{setAdding(false); setEditingContractor(null); setForm(emptyForm);}} title={editingContractor ? "עריכת קבלן" : "הוספת קבלן חדש"} width={520}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div>
          <div style={{fontSize:12,color:"var(--text2)",marginBottom:4,fontWeight:600}}>סוג קבלן</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:4}}>
            {availableRoles.map(r=>(
              <button key={r} onClick={()=>setForm(f=>({...f,role:r}))} style={{padding:"5px 10px",borderRadius:20,border:"1px solid",borderColor:form.role===r?"var(--accent)":"var(--border)",background:form.role===r?"var(--accent-light)":"var(--surface)",color:form.role===r?"var(--accent)":"var(--text2)",fontSize:12,cursor:"pointer",fontFamily:"'Heebo',sans-serif",fontWeight:form.role===r?700:400,transition:"all .12s"}}>
                {r}
              </button>
            ))}
          </div>
          {form.role==="קבלן עד מפתח" && (
            <div style={{fontSize:11,color:"#3730A3",background:"#EEF2FF",borderRadius:6,padding:"8px 12px",marginTop:4,lineHeight:1.5}}>
              <strong>שים לב:</strong> לוח תשלומים של 9 שלבים יוגדר אוטומטית ויפרוס את ימי הפרויקט באופן יחסי כמפל. ניתן לערוך ולהזיז את השלבים בקלות תחת מסך <strong>"שלבי בנייה"</strong> מתי שתרצה!
            </div>
          )}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {[
            ["name","שם הקבלן"],
            ["company","שם חברה"],
            ["phone","טלפון"],
            ["email","אימייל"],
          ].map(([k,label])=>(
            <div key={k}>
              <div style={{fontSize:12,color:"var(--text2)",marginBottom:3,fontWeight:500}}>{label}</div>
              <input className="bp-input" value={form[k as keyof ContractorForm] as string} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/>
            </div>
          ))}
          <div>
            <div style={{fontSize:12,color:"var(--text2)",marginBottom:3,fontWeight:500}}>תקציב מוסכם (₪)</div>
            <input className="bp-input" type="number" placeholder="0" value={form.budget === 0 ? "" : form.budget} onChange={e=>setForm(f=>({...f,budget:e.target.value === "" ? 0 : Number(e.target.value)}))}/>
          </div>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", paddingTop: 18 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={form.includesVat} 
                onChange={(e) => setForm(f => ({ ...f, includesVat: e.target.checked }))} 
                style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
              />
              <span style={{ fontSize: 13, fontWeight: 500 }}>הסכום כולל מע"מ</span>
            </label>
            {!form.includesVat && form.budget !== "" && Number(form.budget) > 0 && (
              <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>
                * סה"כ תקציב ברוטו: {fmtMoney(Number(form.budget) * (1 + ((project as any)?.vatPct ?? 18) / 100))}
              </div>
            )}
          </div>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
          <Btn variant="ghost" onClick={()=>{setAdding(false); setEditingContractor(null); setForm(emptyForm);}} disabled={savingContractor}>ביטול</Btn>
          <Btn onClick={addContractor} disabled={savingContractor || !form.name.trim()}>
            {editingContractor ? (
              <>שמור שינויים</>
            ) : (
              <><Icon n="plus" s={13}/> הוסף קבלן</>
            )}
          </Btn>
        </div>
      </div>
    </Modal>
  ) : null;

  if (c) return (
    <>
      <ScreenBoundary loading={loading} error={error} onRetry={refetch}>
        <div className="page-content">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,gap:12}}>
            <button onClick={()=>setSelectedId(null)} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",color:"var(--text2)",fontSize:13,padding:0}}>
              <Icon n="arrow-right" s={14}/> חזרה לרשימה
            </button>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button onClick={() => document.getElementById('mobile-notes-section')?.scrollIntoView({ behavior: 'smooth' })} className="mobile-only" style={{border:"none",cursor:"pointer",fontSize:12,color:"var(--accent)",display:"flex",alignItems:"center",gap:4,textDecoration:"none",background:"var(--accent-light)",padding:"4px 8px",borderRadius:999,fontWeight:600}}>
                <Icon n="arrow-down" s={12}/> הערות
              </button>
              <Btn
                size="sm"
                variant="outline"
                onClick={() => openEditModal(c)}
                disabled={mode !== 'db'}
              >
                <Icon n="edit" s={13}/> עריכה
              </Btn>
              <Btn
                size="sm"
                variant="ghost"
                onClick={()=>requestDeleteContractor(c)}
                disabled={deletingContractor || mode !== 'db'}
                style={{color:"var(--danger)"}}
              >
                <Icon n="trash" s={13}/> מחק
              </Btn>
            </div>
          </div>
        <div className="contractor-detail-layout">
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div className="card" style={{padding:20,textAlign:"center"}}>
              <Avatar letter={c.avatar || c.name[0]} color={c.color} size={64} />
              <div style={{fontWeight:700,fontSize:17,marginTop:12}}>{c.name}</div>
              <div style={{fontSize:13,color:"var(--text2)",marginTop:2}}>{c.company}</div>
              <div style={{marginTop:8}}><Badge type={c.status}/></div>
              <div style={{marginTop:8}}><Stars rating={c.rating}/></div>
            </div>
            <div className="card card-body">
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid var(--border)",fontSize:13}}>
                <span style={{color:"var(--text3)"}}><Icon n="phone" s={14}/></span>
                {c.phone ? (
                  <>
                    <span style={{ direction: "ltr" }}>{c.phone}</span>
                    <div style={{ display: "flex", gap: 8, marginRight: "auto", alignItems: "center" }}>
                      <a href={`tel:${c.phone.replace(/[^0-9+]/g, '')}`} style={{ color: "var(--accent)", display: "flex" }} title="חייג">
                        <Icon n="phone" s={15} />
                      </a>
                      <a href={`https://wa.me/${c.phone.replace(/[^0-9+]/g, '').replace(/^0/, '972')}`} target="_blank" rel="noreferrer" style={{ color: "#25D366", display: "flex" }} title="וואטסאפ">
                        <Icon n="message-circle" s={15} />
                      </a>
                    </div>
                  </>
                ) : (
                  <span>—</span>
                )}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",fontSize:13}}>
                <span style={{color:"var(--text3)"}}><Icon n="mail" s={14}/></span>
                <span>{c.email || "—"}</span>
              </div>
            </div>
              <div className="card card-body">
                <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>סיכום תשלומים</div>
                {(() => {
                  const grossBudget = c.includesVat ? c.budget : Math.round(c.budget * (1 + ((project as any)?.vatPct ?? 18) / 100));
                  
                  return (
                    <>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"5px 0",borderBottom:"1px solid var(--border)"}}>
                        <span style={{color:"var(--text2)"}}>תקציב בסיס (נטו)</span><span style={{fontWeight:600}}>{fmtMoney(c.budget)}</span>
                      </div>
                      {!c.includesVat && (
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"5px 0",borderBottom:"1px solid var(--border)"}}>
                          <span style={{color:"var(--text2)"}}>תקציב כולל מע"מ (ברוטו)</span><span style={{fontWeight:600}}>{fmtMoney(grossBudget)}</span>
                        </div>
                      )}
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"5px 0",borderBottom:"1px solid var(--border)"}}>
                        <span style={{color:"var(--text2)"}}>סך הכל שולם (ברוטו)</span><span style={{fontWeight:600}}>{fmtMoney(c.paid)}</span>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"5px 0"}}>
                        <span style={{color:"var(--text2)"}}>יתרה לתשלום</span><span style={{fontWeight:600}}>{fmtMoney(grossBudget - c.paid)}</span>
                      </div>
                      <div style={{marginTop:10}}><ProgressBar value={grossBudget ? c.paid / grossBudget * 100 : 0} color="var(--success)" height={5}/></div>
                      <div style={{fontSize:11,color:"var(--text3)",marginTop:4,textAlign:"left"}}>{grossBudget ? Math.round(c.paid / grossBudget * 100) : 0}% שולם</div>
                    </>
                  );
                })()}
              </div>
            
            {projectId && c._id && (
              <div className="desktop-only">
                <ContractorNotesAndDocs
                  projectId={projectId}
                  contractorId={c._id as Id<'contractors'>}
                  contractorName={c.name}
                />
              </div>
            )}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div className="card">
              <div className="card-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
                <span>שלבי בנייה מקושרים</span>
                <span style={{fontSize:12,color:"var(--text3)",fontWeight:500}}>
                  {c.stages?.length ?? 0} שלבים · {c.stageProgressPct ?? 0}% התקדמות
                </span>
              </div>
              <div className="card-body" style={{display:"flex",flexDirection:"column",gap:14}}>
                <div>
                  <ProgressBar value={c.stageProgressPct ?? 0} color="var(--accent)" height={6}/>
                  <div style={{fontSize:11,color:"var(--text3)",marginTop:5,textAlign:"left"}}>התקדמות ממוצעת לפי השלבים המשויכים</div>
                </div>
                {c.role === 'קבלן עד מפתח' && (
                  <div style={{fontSize:12,color:"#475569",background:"#F1F5F9",padding:"8px 12px",borderRadius:8}}>
                    💡 השלבים פרסו את ימי הפרויקט באופן יחסי כמפל (Gantt). ניתן לערוך את תאריכי השלבים דרך מסך <strong>"שלבי בנייה"</strong> - עדכון תאריך סיום ישפיע אוטומטית על השלבים הבאים!
                  </div>
                )}
                {c.stagePaymentMismatch && (
                  <div style={{border:"1px solid #FCD34D",background:"#FFFBEB",color:"#92400E",borderRadius:8,padding:"8px 10px",fontSize:12,fontWeight:700,lineHeight:1.45}}>
                    {c.stagePaymentMismatchReason || `סכום השלבים המשויכים לקבלן (${fmtMoney(c.stagePaymentTotal || 0)}) לא תואם לסכום החוזה (${fmtMoney(c.budget)}).`}
                  </div>
                )}
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:8}}>
                  {visibleStages.length ? visibleStages.map(stage => {
                    const id = stageDbId(stage);
                    const checked = (c.stages ?? []).some(linkedStage => stageDbId(linkedStage) === id);
                    return (
                      <label key={id} style={{display:"flex",alignItems:"center",gap:8,border:"1px solid",borderColor:checked?"var(--accent)":"var(--border)",background:checked?"var(--accent-light)":"#fff",borderRadius:8,padding:"9px 10px",cursor:savingStageLinks?"wait":"pointer"}}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={savingStageLinks}
                          onChange={e=>handleToggleStage(c, id, e.target.checked)}
                        />
                        <span style={{flex:1,minWidth:0}}>
                          <span style={{display:"block",fontSize:13,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{stage.name}</span>
                          <span style={{display:"block",fontSize:11,color:"var(--text3)"}}>{stage.start} - {stage.end} · {stage.progress}%</span>
                        </span>
                      </label>
                    );
                  }) : (
                    <div style={{fontSize:12,color:"var(--text3)",border:"1px dashed var(--border)",borderRadius:8,padding:12}}>
                      אין עדיין שלבי בנייה בפרויקט.
                    </div>
                  )}
                </div>
                {(c.stages?.length ?? 0) > 0 && (
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {c.stages!.map(stage => (
                      <div key={stageDbId(stage)} style={{display:"flex",alignItems:"center",gap:10,fontSize:12,color:"var(--text2)"}}>
                        <Badge type={stage.status}/>
                        <span style={{fontWeight:700,color:"var(--text1)"}}>{stage.name}</span>
                        <span style={{marginInlineStart:"auto"}}>{stage.progressPct}%</span>
                      </div>
                    ))}
                  </div>
                )}
                {(c.stages?.length ?? 0) > 0 && (
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,borderTop:"1px solid var(--border)",paddingTop:12}}>
                    {c.role === 'קבלן עד מפתח' ? (
                      <div style={{display:"flex", alignItems:"center", gap: 10, background:"#EEF2FF", padding:"10px 14px", borderRadius: 8, width:"100%"}}>
                        <Icon n="info" color="#3730A3" s={16}/>
                        <div>
                          <div style={{fontSize:13,fontWeight:800, color:"#3730A3"}}>לוח תשלומים מסונכרן למסך שלבי עבודה</div>
                          <div style={{fontSize:11,color:"#4F46E5", marginTop:2}}>
                            בקבלן מפתח לוח התשלומים מנהל את השלבים. כל הוספה, עריכה או שינוי של שלבים מתבצעים ישירות כאן.
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <div style={{fontSize:13,fontWeight:800}}>מקור לוח התשלומים</div>
                          <div style={{fontSize:11,color:"var(--text3)"}}>
                            {c.paymentMode === 'stage_synced'
                              ? "התשלומים נבנים אוטומטית ממשימות ואבני הדרך של השלבים המקושרים."
                              : "התשלומים נקבעים ומנוהלים באופן חופשי ועצמאי מהשלבים."}
                          </div>
                        </div>
                        <div style={{display:"flex",gap:6,background:"#F4F4F5",borderRadius:8,padding:3}}>
                          {[
                            {mode:'stage_synced' as const,label:'לפי משימות השלבים'},
                            {mode:'custom' as const,label:'לפי חוזה קבלן'},
                          ].map(option => {
                            const active = (c.paymentMode ?? 'custom') === option.mode;
                            const isDisabled = savingPaymentMode || active || (selectedPaymentStarted && option.mode === 'stage_synced');
                            return (
                              <button
                                key={option.mode}
                                type="button"
                                disabled={isDisabled}
                                onClick={()=>handlePaymentModeChange(c, option.mode)}
                                style={{border:"none",borderRadius:6,padding:"6px 10px",fontFamily:"'Heebo',sans-serif",fontSize:12,fontWeight:700,cursor:savingPaymentMode?"wait":isDisabled?"default":"pointer",background:active?"#fff":"transparent",color:active?"var(--accent)":isDisabled&&!active?"var(--text3)":"var(--text2)",boxShadow:active?"var(--shadow-sm)":"none",opacity:isDisabled&&!active?0.6:1}}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            <PaymentSchedule
              key={paymentScheduleKey(c)}
              contractor={c}
              locked={c.paymentMode === 'stage_synced' && c.role !== 'קבלן עד מפתח'}
              onTogglePaid={handleTogglePaid}
              onSaveSchedule={handleSaveSchedule}
              onLock={handleLockPayment}
              onViewFile={setViewFile}
              onAddFiles={handleAddFilesToLockedMilestone}
              uploadingFilesToMilestone={uploadingFilesToMilestone}
              onPartialPayment={(milestone) => setPendingPartial({ contractor: c, milestone })}
              onDeletePartialPayment={handleDeletePartialPayment}
            />
            {projectId && c._id && (
              <div id="mobile-notes-section" className="mobile-block-only">
                <ContractorNotesAndDocs
                  projectId={projectId}
                  contractorId={c._id as Id<'contractors'>}
                  contractorName={c.name}
                />
              </div>
            )}
          </div>
        </div>
        {pendingPayment && (
          <ConfirmPaymentModal
            pendingPayment={pendingPayment}
            onConfirm={confirmPaymentChange}
            onClose={() => savingPayment ? undefined : setPendingPayment(null)}
            saving={savingPayment}
            vatPct={(project as any)?.vatPct ?? 18}
          />
        )}
        {pendingPartial && (
          <PartialPaymentModal
            pendingPartial={pendingPartial}
            onConfirm={handleAddPartialPayment}
            onClose={() => savingPartial ? undefined : setPendingPartial(null)}
            saving={savingPartial}
            projectId={projectId as Id<'projects'>}
          />
        )}
        {lockTarget && selected && (() => {
          const m = selected.milestones?.find(m => String(m.id) === lockTarget || String((m as any)._id) === lockTarget);
          if (!m) return null;
          return (
            <LockPaymentModal
              milestone={m}
              projectId={projectId as Id<'projects'>}
              contractorId={contractorDbId(selected) as Id<'contractors'>}
              onConfirm={confirmLockPayment}
              onClose={() => setLockTarget(null)}
            />
          );
        })()}
        </div>
      </ScreenBoundary>
      {contractorModal}
      {deleteTarget && (
        <ConfirmDialog
          title="מחיקת קבלן"
          message={
            contractorHasPaidPayments(deleteTarget)
              ? `למחוק את ${deleteTarget.name}? קיימים תשלומים שכבר שולמו. הקבלן, שיוכי השלבים ותשלומים שלא שולמו יימחקו, אבל תשלומים והוצאות שכבר שולמו יישארו בבסיס הנתונים.`
              : `למחוק את ${deleteTarget.name}? הקבלן, שיוכי השלבים ולוח התשלומים שלא שולם יימחקו מהפרויקט.`
          }
          confirmText={deletingContractor ? "מוחק..." : "מחק קבלן"}
          cancelText="ביטול"
          loading={deletingContractor}
          type={contractorHasPaidPayments(deleteTarget) ? "warning" : "error"}
          onConfirm={confirmDeleteContractor}
          onClose={() => deletingContractor ? undefined : setDeleteTarget(null)}
        />
      )}
      {confirmPaymentMode && (
        <ConfirmDialog
          title="ניתוק מסנכרון שלבים"
          message={`שים לב: העברה למצב "לפי חוזה קבלן" תנתק את לוח התשלומים מהתקדמות שלבי הבנייה. כל המשימות שעוד לא שולמו יהפכו לעצמאיות ותוכל לערוך אותן חופשי. תשלומים שכבר שולמו יישארו ללא שינוי.`}
          confirmText="הבנתי, שחרר מנעילה"
          cancelText="ביטול"
          type="info"
          onConfirm={() => executePaymentModeChange(confirmPaymentMode.contractor, confirmPaymentMode.mode)}
          onClose={() => setConfirmPaymentMode(null)}
        />
      )}
      {deletePartialTarget && (
        <ConfirmDialog
          title="מחיקת תשלום חלקי"
          message="האם למחוק תשלום חלקי זה? ההוצאה תימחק מהתקציב, והקבצים שצורפו לתשלום יימחקו גם הם."
          confirmText={deletingPartial ? "מוחק..." : "מחק תשלום"}
          cancelText="ביטול"
          loading={deletingPartial}
          type="error"
          onConfirm={confirmDeletePartialPayment}
          onClose={() => deletingPartial ? undefined : setDeletePartialTarget(null)}
        />
      )}
      {viewFile && (() => {
        let currentMilestoneFiles: any[] = [];
        for (const c of contractors) {
          if (!c.milestones) continue;
          const milestone = c.milestones.find((m: any) => m.id === viewFile.milestoneId);
          if (milestone && milestone.files) {
            currentMilestoneFiles = milestone.files;
            break;
          }
        }
        
        const currentFileIndex = currentMilestoneFiles.findIndex(f => f.id === viewFile.id);
        const hasNextFile = currentFileIndex >= 0 && currentFileIndex < currentMilestoneFiles.length - 1;
        const hasPrevFile = currentFileIndex > 0;

        return (
          <Modal title={currentMilestoneFiles.length > 1 ? `${viewFile.name} (${currentFileIndex + 1}/${currentMilestoneFiles.length})` : viewFile.name} onClose={() => setViewFile(null)}>
            <div style={{ height: '70vh', minHeight: 400, width: '100%', position: 'relative' }}>
              {hasPrevFile && (
                <button 
                  onClick={() => {
                    const prev = currentMilestoneFiles[currentFileIndex - 1];
                    setViewFile({ id: prev.id as string, url: prev.url, name: prev.name, milestoneId: viewFile.milestoneId });
                  }} 
                  style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, backdropFilter: 'blur(4px)', boxShadow: 'var(--shadow-lg)', color: 'var(--text1)' }}
                >
                  <Icon n="chevron-right" s={24} />
                </button>
              )}
              {/\.(jpg|jpeg|png|gif|webp)$/i.test(viewFile.name) ? (
                <TransformWrapper 
                  initialScale={1} 
                  minScale={1} 
                  maxScale={8} 
                  centerOnInit
                  doubleClick={{ step: 2 }}
                  wheel={{ step: 0.2 }}
                  pinch={{ step: 5 }}
                >
                  <TransformComponent wrapperStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', borderRadius: 8 }} contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={viewFile.url} draggable={false} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt="Preview" />
                  </TransformComponent>
                </TransformWrapper>
              ) : (
                <iframe 
                  src={viewFile.url} 
                  style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8, background: '#f5f5f5' }}
                  title={viewFile.name}
                />
              )}
              {hasNextFile && (
                <button 
                  onClick={() => {
                    const next = currentMilestoneFiles[currentFileIndex + 1];
                    setViewFile({ id: next.id as string, url: next.url, name: next.name, milestoneId: viewFile.milestoneId });
                  }} 
                  style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, backdropFilter: 'blur(4px)', boxShadow: 'var(--shadow-lg)', color: 'var(--text1)' }}
                >
                  <div style={{ transform: 'rotate(180deg)', display: 'flex' }}><Icon n="chevron-right" s={24} /></div>
                </button>
              )}
            </div>
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 12 }}>
              <Btn variant="ghost" onClick={() => setViewFile(null)}>סגור</Btn>
              <Btn variant="ghost" style={{ color: 'var(--danger)', border: '1px solid var(--danger)', background: 'transparent' }} onClick={() => setFileToDelete({ id: viewFile.id as Id<'projectFiles'>, milestoneId: viewFile.milestoneId })}>
                <Icon n="trash-2" s={14} /> מחק קובץ
              </Btn>
            </div>
          </Modal>
        );
      })()}
      {fileToDelete && (
        <ConfirmDialog
          title="מחיקת מסמך"
          message="האם אתה בטוח שברצונך למחוק מסמך זה? פעולה זו תמחק את הקובץ מהמערכת לצמיתות."
          confirmText={deletingFile ? "מוחק..." : "מחק מסמך"}
          cancelText="ביטול"
          type="danger"
          onConfirm={async () => {
            try {
              setDeletingFile(true);
              await deleteFileMutation({ fileId: fileToDelete.id, milestoneId: fileToDelete.milestoneId });
              setFileToDelete(null);
              setViewFile(null);
              setFeedback({ title: "נמחק בהצלחה", message: "הקובץ נמחק בהצלחה", type: "success" });
            } catch (err) {
              setFeedback({ title: "שגיאה", message: "לא הצלחנו למחוק את הקובץ", type: "error" });
            } finally {
              setDeletingFile(false);
            }
          }}
          onClose={() => setFileToDelete(null)}
        />
      )}
      {feedback && (
        <FeedbackModal
          title={feedback.title}
          message={feedback.message}
          type={feedback.type}
          onClose={() => setFeedback(null)}
        />
      )}
    </>
  );

  return (
    <>
      <ScreenBoundary 
        loading={loading} 
        error={error} 
        onRetry={refetch}
        isEmpty={contractors.length === 0}
        emptyTitle="לא נמצאו קבלנים בפרויקט"
        emptyDesc="הוסיפו קבלנים, הגדירו עבורם לוח תשלומים המחובר להתקדמות הבנייה, ועקבו אחר התקציב."
        emptyIcon="users"
        emptyImage="/empty_states/contractors.png"
        emptyAction={() => setAdding(true)}
        emptyActionLabel="קבלן חדש"
      >
        <div className="page-content">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontSize:13,color:"var(--text2)"}}>{contractors.length} קבלנים בפרויקט</div>
          <Btn size="sm" onClick={()=>setAdding(true)} disabled={!projectId || mode !== 'db'}><Icon n="plus" s={14}/> קבלן חדש</Btn>
        </div>

        <>
            {contractors.some(c=>c.role==="קבלן עד מפתח") && (
              <div style={{background:"#EEF2FF",border:"1px solid #C7D2FE",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#3730A3",display:"flex",alignItems:"center",gap:8}}>
                <Icon n="check-circle" s={14} c="#3730A3"/>
                יש בפרויקט קבלן עד מפתח — לוח התשלומים שלו מחובר לשלבי הבנייה
              </div>
            )}

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(295px,1fr))",gap:22}}>
              {contractors.map(c=>(
                <motion.div
                  key={c.id}
                  className="card"
                  style={{padding:24,cursor:"pointer",borderColor:"var(--border)",backgroundColor:"var(--surface)"}}
                  whileHover={{y:-5,boxShadow:"var(--shadow-xl)",borderColor:"rgba(224,122,56,0.3)"}}
                  whileTap={{scale:0.99}}
                  onClick={()=>setSelectedId(String(c.id))}
                >
                  <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
                    <Avatar letter={c.avatar || c.name[0]} color={c.color} size={44}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:15,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div>
                      <div style={{fontSize:12.5,color:"var(--text2)",marginTop:2}}>{c.role}</div>
                    </div>
                    <div style={{marginRight:"auto",display:"flex",alignItems:"center",gap:6}}>
                      <Badge type={c.status}/>
                      <button
                        type="button"
                        disabled={mode !== 'db'}
                        onClick={(e)=>{
                          e.stopPropagation();
                          openEditModal(c);
                        }}
                        style={{width:28,height:28,border:"1px solid var(--border)",borderRadius:6,background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:mode!=='db'?"not-allowed":"pointer",color:"var(--text1)",opacity:mode!=='db'?0.55:1}}
                        title="ערוך קבלן"
                      >
                        <Icon n="edit" s={13}/>
                      </button>
                      <button
                        type="button"
                        disabled={deletingContractor || mode !== 'db'}
                        onClick={(e)=>{
                          e.stopPropagation();
                          requestDeleteContractor(c);
                        }}
                        style={{width:28,height:28,border:"1px solid var(--border)",borderRadius:6,background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:deletingContractor||mode!=='db'?"not-allowed":"pointer",color:"var(--danger)",opacity:deletingContractor||mode!=='db'?0.55:1}}
                        title="מחק קבלן"
                      >
                        <Icon n="trash" s={13}/>
                      </button>
                    </div>
                  </div>
                  {c.role==="קבלן עד מפתח" && (
                    <div style={{fontSize:11,background:"#EEF2FF",color:"#3730A3",borderRadius:4,padding:"2px 6px",marginBottom:8,display:"inline-block",fontWeight:600}}>עד מפתח · 9 שלבים</div>
                  )}
                  <div style={{fontSize:12,color:"var(--text3)",marginBottom:10}}>{c.company}</div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontSize:12,color:"var(--text2)"}}>התקדמות שלבים</span>
                    <span style={{fontSize:12,fontWeight:600}}>{c.stages?.length ?? 0} שלבים · {c.stageProgressPct ?? 0}%</span>
                  </div>
                  <ProgressBar value={c.stageProgressPct ?? 0} color="var(--accent)" height={4}/>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontSize:12,color:"var(--text2)"}}>תקציב</span>
                    <span style={{fontSize:12,fontWeight:600}}>{fmtMoney(c.budget)}</span>
                  </div>
                  <ProgressBar value={c.budget?c.paid/c.budget*100:0} color="var(--success)" height={4}/>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:11,color:"var(--text3)"}}>
                    <span>שולם: {fmtMoney(c.paid)}</span>
                    <Stars rating={c.rating}/>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        </div>
      </ScreenBoundary>
      {contractorModal}
      {deleteTarget && (
        <ConfirmDialog
          title="מחיקת קבלן"
          message={
            contractorHasPaidPayments(deleteTarget)
              ? `למחוק את ${deleteTarget.name}? קיימים תשלומים שכבר שולמו. הקבלן, שיוכי השלבים ותשלומים שלא שולמו יימחקו, אבל תשלומים והוצאות שכבר שולמו יישארו בבסיס הנתונים.`
              : `למחוק את ${deleteTarget.name}? הקבלן, שיוכי השלבים ולוח התשלומים שלא שולם יימחקו מהפרויקט.`
          }
          confirmText={deletingContractor ? "מוחק..." : "מחק קבלן"}
          cancelText="ביטול"
          loading={deletingContractor}
          type={contractorHasPaidPayments(deleteTarget) ? "warning" : "error"}
          onConfirm={confirmDeleteContractor}
          onClose={() => deletingContractor ? undefined : setDeleteTarget(null)}
        />
      )}
      {feedback && (
        <FeedbackModal
          title={feedback.title}
          message={feedback.message}
          type={feedback.type}
          onClose={() => setFeedback(null)}
        />
      )}
    </>
  );
};
