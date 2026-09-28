import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Modal, Btn, Input, Select, Icon } from './Shared';
import { useCurrentProject } from '../hooks/useCurrentProject';
import { usePlanUploader } from '../hooks/usePlanUploader';
import { useRef } from 'react';
import { useAppNotify } from '../hooks/useAppNotify';

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

export function EditPlanModal({ planId, onClose }: { planId: Id<'projectPlans'>; onClose: () => void }) {
  const { projectId } = useCurrentProject();
  const { notify } = useAppNotify();
  const updatePlan = useMutation(api.projectPlans.updateProjectPlan);
  const uploadPlan = usePlanUploader(projectId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const deletePlan = useMutation(api.projectPlans.deleteProjectPlan);
  
  const plan = useQuery(api.projectPlans.getPlanWithUrl, { planId });
  const stages = useQuery(api.stages.list, projectId ? { projectId } : 'skip') || [];
  const contractors = useQuery(api.queries.listContractors, projectId ? { projectId } : 'skip') || [];

  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [stageIds, setStageIds] = useState<string[]>([]);
  const [sharedWithContractorIds, setSharedWithContractorIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (plan) {
      setName(plan.name);
      setCategory(plan.category);
      setStageIds(plan.stageIds);
      setSharedWithContractorIds(plan.sharedWithContractorIds || []);
    }
  }, [plan]);

  const handleUploadNewVersion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    try {
      setIsSaving(true);
      await uploadPlan({
        file: selectedFile,
        name,
        category: category as any,
        stageIds: stageIds as any,
        sharedWithContractorIds: sharedWithContractorIds as any,
        parentPlanId: planId,
      });
      notify({ kind: 'success', title: 'גרסה חדשה הועלתה בהצלחה' });
      onClose();
    } catch (err: any) {
      notify({ kind: 'error', title: err.message || 'שגיאה בהעלאת הגרסה' });
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!name) {
      notify({ kind: 'error', title: 'יש למלא שם' });
      return;
    }
    try {
      setIsSaving(true);
      await updatePlan({
        planId,
        name,
        category: category as any,
        stageIds: stageIds as any,
        sharedWithContractorIds: sharedWithContractorIds as any,
      });
      notify({ kind: 'success', title: 'התוכנית עודכנה בהצלחה' });
      onClose();
    } catch (err: any) {
      notify({ kind: 'error', title: err.message || 'שגיאה בעדכון התוכנית' });
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    try {
      setIsSaving(true);
      await deletePlan({ planId });
      notify({ kind: 'success', title: 'התוכנית נמחקה' });
      onClose();
    } catch (err: any) {
      notify({ kind: 'error', title: err.message || 'שגיאה במחיקה' });
      setIsSaving(false);
    }
  };

  
  const toggleContractor = (id: string) => {
    setSharedWithContractorIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleStage = (id: string) => {
    setStageIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  if (!plan) return <Modal onClose={onClose} title="טוען..."><div /></Modal>;

  return (
    <>
    <Modal title="עריכת תוכנית" onClose={!isSaving ? onClose : undefined} maxWidth={540}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        <div>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: 'var(--text2)' }}>שם התוכנית</label>
          <Input 
            value={name} 
            onChange={(e: any) => setName(e.target.value)} 
            disabled={isSaving}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: 'var(--text2)' }}>קטגוריה</label>
          <Select value={category} onChange={(val: string) => setCategory(val)} disabled={isSaving}>
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </Select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: 'var(--text2)' }}>קישור לשלבי ביצוע</label>
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
                    onClick={() => !isSaving && toggleStage(s._id)}
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
                      cursor: isSaving ? 'not-allowed' : 'pointer',
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
                    onClick={() => !isSaving && toggleContractor(c._id)}
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
                      cursor: isSaving ? 'not-allowed' : 'pointer',
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <Btn variant="ghost" onClick={() => setShowDeleteConfirm(true)} disabled={isSaving} style={{ color: 'var(--danger)' }}>
            <Icon n="trash" s={16} /> מחק תוכנית
          </Btn>
          <div style={{ display: 'flex', gap: 12 }}>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept="image/*,application/pdf"
              onChange={handleUploadNewVersion}
            />
            <Btn variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isSaving}>
              <Icon n="upload" s={16} /> העלה גרסה חדשה
            </Btn>
            <Btn variant="primary" onClick={handleSave} disabled={isSaving || !name}>
              {isSaving ? 'שומר...' : 'שמור שינויים'}
            </Btn>
          </div>
        </div>
      </div>
    </Modal>

    {showDeleteConfirm && (
      <Modal title="מחיקת תוכנית" onClose={!isSaving ? () => setShowDeleteConfirm(false) : undefined} maxWidth={400}>
        <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Icon n="trash" s={28} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', marginBottom: 8 }}>
            האם אתה בטוח?
          </div>
          <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 24, lineHeight: 1.5 }}>
            האם אתה בטוח שברצונך למחוק את התוכנית? לא ניתן יהיה לבטל פעולה זו.
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <Btn variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isSaving}>ביטול</Btn>
            <Btn variant="primary" onClick={confirmDelete} disabled={isSaving} style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}>
              {isSaving ? 'מוחק...' : 'כן, מחק'}
            </Btn>
          </div>
        </div>
      </Modal>
    )}
    </>
  );
}
