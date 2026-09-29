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
  
  const [files, setFiles] = useState<File[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [stageIds, setStageIds] = useState<string[]>([]);
  const [sharedWithContractorIds, setSharedWithContractorIds] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const stages = useQuery(api.stages.list, projectId ? { projectId } : 'skip') || [];
  const contractors = useQuery(api.queries.listContractors, projectId ? { projectId } : 'skip') || [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(selectedFiles);
      
      if (selectedFiles.length === 1) {
        const nameWithoutExt = selectedFiles[0].name.split('.').slice(0, -1).join('.');
        if (!name) setName(nameWithoutExt);
      }
    }
  };

  const handleUpload = async () => {
    if (files.length === 0 || (files.length === 1 && !name)) {
      notify({ kind: 'error', title: 'יש לבחור קבצים (ושם לתוכנית)' });
      return;
    }
    try {
      setIsUploading(true);
      let successCount = 0;
      for (let i = 0; i < files.length; i++) {
        const currentFile = files[i];
        const planName = files.length === 1 ? name : currentFile.name.replace(/\.[^/.]+$/, "");
        
        await uploadPlan({
          file: currentFile,
          name: planName,
          category,
          stageIds: stageIds as any,
          sharedWithContractorIds: sharedWithContractorIds as any,
          onProgress: (pct) => {
             const baseProgress = (i / files.length) * 100;
             const currentProgress = (pct / files.length);
             setProgress(baseProgress + currentProgress);
          }
        });
        successCount++;
      }
      notify({ kind: 'success', title: `הועלו ${successCount} תוכניות בהצלחה` });
      onClose();
    } catch (err: any) {
      notify({ kind: 'error', title: err.message || 'שגיאה בהעלאת התוכניות' });
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
            background: files.length > 0 ? 'var(--accent-light)' : 'var(--surface-2)',
            transition: 'all 0.2s',
            opacity: isUploading ? 0.7 : 1
          }}>
            <Icon n={files.length > 0 ? "check-circle" : "upload-cloud"} s={32} c={files.length > 0 ? "var(--accent)" : "var(--text3)"} />
            <div style={{ marginTop: 12, fontWeight: 600, color: 'var(--text1)' }}>
              {files.length === 1 ? files[0].name : files.length > 1 ? `נבחרו ${files.length} קבצים` : "לחץ לבחירת קבצים"}
            </div>
            {files.length === 0 && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>ניתן לבחור מספר קבצים ביחד (עד 25MB לקובץ)</div>}
            <input 
              type="file" 
              multiple
              accept="image/*,application/pdf" 
              onChange={handleFileChange}
              disabled={isUploading}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {files.length <= 1 && (
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: 'var(--text2)' }}>שם התוכנית</label>
            <Input 
              value={name} 
              onChange={(e: any) => setName(e.target.value)} 
              placeholder="לדוגמה: תוכנית אדריכלית קומת קרקע" 
              disabled={isUploading}
            />
          </div>
        )}
        {files.length > 1 && (
          <div style={{ fontSize: 13, color: 'var(--text3)', background: 'var(--surface-2)', padding: '8px 12px', borderRadius: 8 }}>
            💡 שמות התוכניות יוגדרו אוטומטית לפי שמות הקבצים המקוריים.
          </div>
        )}

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
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6, fontWeight: 600 }}>מעלה... {Math.round(progress)}%</div>
            <ProgressBar value={progress} height={8} color="var(--accent)" />
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
          <Btn variant="outline" onClick={onClose} disabled={isUploading}>ביטול</Btn>
          <Btn variant="primary" onClick={handleUpload} disabled={isUploading || files.length === 0 || (files.length === 1 && !name)}>
            {isUploading ? 'מעלה...' : 'העלה תוכנית'}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
