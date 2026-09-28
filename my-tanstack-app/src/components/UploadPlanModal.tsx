import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Modal, Btn, Input, Select, Icon, ProgressBar } from './Shared';
import { useCurrentProject } from '../hooks/useCurrentProject';
import { useAppNotify } from '../hooks/useAppNotify';
import { usePlanUploader } from '../hooks/usePlanUploader';

const CATEGORIES = [
  { value: 'architectural', label: 'אדריכלות' },
  { value: 'structural', label: 'קונסטרוקציה' },
  { value: 'electrical', label: 'חשמל' },
  { value: 'plumbing', label: 'אינסטלציה' },
  { value: 'mechanical', label: 'מיזוג אוויר' },
  { value: 'landscape', label: 'פיתוח נוף' },
  { value: 'general', label: 'כללי' },
  { value: 'other', label: 'אחר' },
];

export function UploadPlanModal({ onClose }: { onClose: () => void }) {
  const { projectId } = useCurrentProject();
  const { notify } = useAppNotify();
  const uploadPlan = usePlanUploader(projectId);
  
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [stageIds, setStageIds] = useState<string[]>([]);
  const [sharedWithContractorIds, setSharedWithContractorIds] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const stages = useQuery(api.stages.list, projectId ? { projectId } : 'skip') || [];
  const contractors = useQuery(api.queries.listContractors, projectId ? { projectId } : 'skip') || [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Auto-fill name from file
      const nameWithoutExt = selectedFile.name.split('.').slice(0, -1).join('.');
      if (!name) {
        setName(nameWithoutExt);
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !name) {
      notify({ kind: 'error', title: 'יש למלא שם ולבחור קובץ' });
      return;
    }
    try {
      setIsUploading(true);
      await uploadPlan({
        file,
        name,
        category,
        stageIds: stageIds as any,
        sharedWithContractorIds: sharedWithContractorIds as any,
        onProgress: setProgress
      });
      notify({ kind: 'success', title: 'התוכנית הועלתה בהצלחה' });
      onClose();
    } catch (err: any) {
      notify({ kind: 'error', title: err.message || 'שגיאה בהעלאת התוכנית' });
      setIsUploading(false);
    }
  };

  
  const toggleContractor = (id: string) => {
    setSharedWithContractorIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleStage = (id: string) => {
    setStageIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <Modal title="העלאת תוכנית" onClose={!isUploading ? onClose : undefined} maxWidth={540}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        {/* File Input */}
        <div>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: 'var(--text2)' }}>קובץ (PDF או תמונה)</label>
          <label style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px dashed var(--border)',
            borderRadius: 12,
            padding: 24,
            cursor: isUploading ? 'not-allowed' : 'pointer',
            background: file ? 'var(--accent-light)' : 'var(--surface-2)',
            transition: 'all 0.2s',
            opacity: isUploading ? 0.7 : 1
          }}>
            <Icon n={file ? "check-circle" : "upload-cloud"} s={32} c={file ? "var(--accent)" : "var(--text3)"} />
            <div style={{ marginTop: 12, fontWeight: 600, color: 'var(--text1)' }}>
              {file ? file.name : "לחץ לבחירת קובץ"}
            </div>
            {!file && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>עד 25MB</div>}
            <input 
              type="file" 
              accept="image/*,application/pdf" 
              onChange={handleFileChange}
              disabled={isUploading}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: 'var(--text2)' }}>שם התוכנית</label>
          <Input 
            value={name} 
            onChange={(e: any) => setName(e.target.value)} 
            placeholder="לדוגמה: תוכנית אדריכלית קומת קרקע" 
            disabled={isUploading}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: 'var(--text2)' }}>קטגוריה</label>
          <Select value={category} onChange={(val: string) => setCategory(val)} disabled={isUploading}>
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </Select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: 'var(--text2)' }}>קישור לשלבי ביצוע (אופציונלי)</label>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 8, 
            background: 'var(--surface-2)', 
            padding: 12, 
            borderRadius: 8,
            maxHeight: 180,
            overflowY: 'auto',
            border: '1px solid var(--border)'
          }}>
            {stages.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>אין שלבים בפרויקט</div>
            ) : (
              stages.map(s => {
                const isSelected = stageIds.includes(s._id);
                return (
                  <div
                    key={s._id}
                    onClick={() => !isUploading && toggleStage(s._id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      borderRadius: 999,
                      background: isSelected ? 'var(--accent)' : 'var(--surface)',
                      color: isSelected ? '#fff' : 'var(--text2)',
                      border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                      fontSize: 12,
                      cursor: isUploading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {isSelected && <Icon n="check" s={12} c="#fff" />}
                    {s.name}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: 'var(--text2)' }}>שיתוף ישיר עם קבלנים (אופציונלי)</label>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>
            * קבלנים יראו אוטומטית תוכניות שמקושרות לשלבים שלהם. כאן תוכל לשתף תוכניות כלליות שאינן מקושרות לשלב ספציפי.
          </div>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 8, 
            background: 'var(--surface-2)', 
            padding: 12, 
            borderRadius: 8,
            maxHeight: 180,
            overflowY: 'auto',
            border: '1px solid var(--border)'
          }}>
            {contractors.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>אין קבלנים בפרויקט</div>
            ) : (
              contractors.map((c: any) => {
                const isSelected = sharedWithContractorIds.includes(c._id);
                return (
                  <div
                    key={c._id}
                    onClick={() => !isUploading && toggleContractor(c._id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      borderRadius: 999,
                      background: isSelected ? 'var(--accent)' : 'var(--surface)',
                      color: isSelected ? '#fff' : 'var(--text2)',
                      border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                      fontSize: 12,
                      cursor: isUploading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {isSelected && <Icon n="check" s={12} c="#fff" />}
                    {c.name}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {isUploading && (
          <div style={{ marginTop: 8 }}>
            <ProgressBar progress={progress} label="מעלה קובץ..." />
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
          <Btn variant="outline" onClick={onClose} disabled={isUploading}>ביטול</Btn>
          <Btn variant="primary" onClick={handleUpload} disabled={isUploading || !file || !name}>
            {isUploading ? 'מעלה...' : 'העלה תוכנית'}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
