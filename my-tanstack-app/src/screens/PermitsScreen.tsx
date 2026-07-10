import React, { useRef, useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCurrentProject } from '../hooks/useCurrentProject';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { ScreenBoundary } from '../components/ScreenBoundary';
import { PageBackground, EmptyState, Btn, Icon, ConfirmDialog, PremiumLock } from '../components/Shared';
import { useRequireRole } from '../hooks/useRequireRole';
import { AccessDenied, AccessLoading } from '../components/AccessDenied';
import type { Id } from '../../convex/_generated/dataModel';
import { useSubscription } from '../hooks/useSubscription';

const PermitCard = ({ permit, authorityDraft, noteDraft, onAuthorityChange, onNoteChange, onDelete, onPreview }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: permit._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    boxShadow: isDragging ? '0 12px 24px rgba(0,0,0,0.15)' : 'none',
    scale: isDragging ? 1.02 : 1,
    border: '1px solid var(--border)', 
    borderRadius: 10, 
    padding: 16, 
    background: 'var(--surface)', 
    display: 'flex', 
    flexDirection: 'column', 
    gap: 12, 
    position: 'relative'
  };

  return (
    <div ref={setNodeRef} style={style as any}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div 
          {...attributes}
          {...listeners}
          style={{ cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', marginTop: 8, padding: 4, touchAction: 'none' }}
        >
          <Icon n="menu" s={18} />
        </div>
        <div style={{ background: 'var(--bg)', width: 40, height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>
          <Icon n="file-text" s={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {permit.title}
          </div>
          <input
            list="authorities-list"
            className="bp-input"
            value={authorityDraft ?? permit.authority ?? ''}
            placeholder="הגדר רשות (עירייה, תאגיד...)"
            onChange={(e) => onAuthorityChange(permit._id, e.target.value)}
            style={{
              width: '100%', fontSize: 13, padding: '4px 8px', marginTop: 4,
              border: '1px solid transparent', borderRadius: 6, background: 'transparent',
              color: 'var(--text2)', transition: 'all 0.2s', height: 28,
            }}
            onFocus={(e) => {
              e.target.style.background = 'var(--bg)';
              e.target.style.borderColor = 'var(--border)';
            }}
            onBlur={(e) => {
              if (!e.target.value) {
                e.target.style.background = 'transparent';
                e.target.style.borderColor = 'transparent';
              }
            }}
          />
        </div>
      </div>

      <textarea
        className="bp-input"
        value={noteDraft ?? permit.notes ?? ''}
        placeholder="הוסף הערה למסמך..."
        onChange={(e) => onNoteChange(permit._id, e.target.value)}
        rows={2}
        style={{
          width: '100%', resize: 'vertical', fontFamily: "'Heebo',sans-serif",
          fontSize: 13, padding: '8px 10px', border: '1px solid var(--border)',
          borderRadius: 8, background: 'var(--bg)',
        }}
      />

      {permit.url && (
        <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
          <div style={{ flex: 1 }}>
            <Btn variant="secondary" onClick={() => onPreview(permit.url as string)} style={{ width: '100%', justifyContent: 'center' }}>
              <Icon n="eye" s={16} /> צפה במסמך
            </Btn>
          </div>
          <button
            type="button"
            onClick={() => onDelete({ id: permit._id, title: permit.title })}
            style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: 8,
              padding: '0 12px', cursor: 'pointer', color: 'var(--danger)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            title="מחק מסמך"
          >
            <Icon n="trash" s={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export const PermitsScreen = () => {
  const { allowed, loading: roleLoading } = useRequireRole(['owner', 'manager', 'inspector']);
  const { projectId } = useCurrentProject();
  const { isProOrPremium } = useSubscription();
  const permits = useQuery(api.permits.list, projectId && allowed ? { projectId } : 'skip');
  const generateUploadUrl = useMutation(api.permits.generateUploadUrl);
  const addPermit = useMutation(api.permits.addPermit);
  const deletePermit = useMutation(api.permits.deletePermit);
  const updatePermit = useMutation(api.permits.updatePermit);
  const reorderPermits = useMutation(api.permits.reorderPermits);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [permitToDelete, setPermitToDelete] = useState<{ id: Id<'permits'>, title: string } | null>(null);
  const [previewDocumentUrl, setPreviewDocumentUrl] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const noteTimers = useRef<Record<string, number>>({});
  const [authorityDrafts, setAuthorityDrafts] = useState<Record<string, string>>({});
  const authorityTimers = useRef<Record<string, number>>({});
  const [localPermits, setLocalPermits] = useState<any[]>([]);

  useEffect(() => {
    if (permits) {
      setLocalPermits(permits);
    }
  }, [permits]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (active.id !== over?.id && over) {
      const oldIndex = localPermits.findIndex((item) => item._id === active.id);
      const newIndex = localPermits.findIndex((item) => item._id === over.id);
      
      const newOrder = arrayMove(localPermits, oldIndex, newIndex);
      setLocalPermits(newOrder);
      
      try {
        const updates = newOrder.map((p, index) => ({
          id: p._id,
          sortOrder: index,
        }));
        await reorderPermits({ updates });
      } catch (e) {
        console.error('Failed to reorder', e);
        if (permits) setLocalPermits(permits);
      }
    }
  };

  const handlePick = () => {
    if (uploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !projectId) return;

    setUploading(true);
    try {
      // Generate upload url
      const uploadUrl = await generateUploadUrl({ projectId });
      
      // Upload the file
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('File upload failed');
      }

      const { storageId } = await uploadResponse.json() as { storageId: Id<'_storage'> };
      
      // Create permit
      await addPermit({
        projectId,
        title: file.name.replace(/\.[^/.]+$/, ""), // remove extension for title
        status: 'not_started',
        fileId: storageId,
      });

    } catch (err) {
      console.error('Failed to upload permit file:', err);
      alert('שגיאה בהעלאת הקובץ');
    } finally {
      setUploading(false);
    }
  };

  const confirmDeletePermit = async () => {
    if (!permitToDelete) return;
    try {
      await deletePermit({ permitId: permitToDelete.id });
      setPermitToDelete(null);
    } catch (e) {
      console.error(e);
      alert('שגיאה במחיקת הקובץ');
    }
  };

  const handleNoteChange = (permitId: Id<'permits'>, value: string) => {
    const key = String(permitId);
    setNoteDrafts((prev) => ({ ...prev, [key]: value }));
    const existing = noteTimers.current[key];
    if (existing) window.clearTimeout(existing);
    noteTimers.current[key] = window.setTimeout(async () => {
      try {
        await updatePermit({ permitId, notes: value });
      } catch (err) {
        console.error(err);
      }
    }, 600);
  };

  const handleAuthorityChange = (permitId: Id<'permits'>, value: string) => {
    const key = String(permitId);
    setAuthorityDrafts((prev) => ({ ...prev, [key]: value }));
    const existing = authorityTimers.current[key];
    if (existing) window.clearTimeout(existing);
    authorityTimers.current[key] = window.setTimeout(async () => {
      try {
        await updatePermit({ permitId, authority: value });
      } catch (err) {
        console.error(err);
      }
    }, 600);
  };

  const isLoading = permits === undefined;

  if (roleLoading) return <AccessLoading />;
  if (!allowed) return <AccessDenied message="מסמכים ואישורים זמינים לצוות הניהול בלבד." />;

  return (
    <PremiumLock isLocked={!isProOrPremium} title="ניהול בירוקרטיה והיתרים" description="מסך ההיתרים מאפשר לרכז היתרי בנייה ואישורים מול רשויות. שדרג את חשבונך כדי לגשת אליו.">
      <ScreenBoundary loading={isLoading}>
      <datalist id="authorities-list">
        <option value="עירייה - ועדה מקומית" />
        <option value="חברת חשמל" />
        <option value="תאגיד מים וביוב" />
        <option value="כיבוי אש" />
        <option value="פיקוד העורף" />
        <option value="הג״א" />
        <option value="רשות העתיקות" />
        <option value="רשות מקרקעי ישראל" />
      </datalist>
      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 120, minHeight: 'calc(100vh - 130px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: 24 }}>בירוקרטיה והיתרים</h1>
          {permits && permits.length > 0 && (
            <Btn onClick={handlePick} disabled={uploading}>
              <Icon n="plus" s={16} /> {uploading ? 'מעלה...' : 'הוסף מסמך'}
            </Btn>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {permits?.length === 0 ? (
          <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
            <PageBackground image="/empty_states/permits.png" opacity={0.03} />
            <div style={{ width: '100%' }}>
              <EmptyState
                icon="file-text"
                title="אין מסמכים מול רשויות"
                description="זה המקום לרכז היתרי בנייה, אישורי תאגיד מים, חיבור חשמל ועוד - למעקב מסודר ונוח."
                action={
                  <Btn size="lg" onClick={handlePick} disabled={uploading} style={{ padding: "12px 28px", fontSize: 16 }}>
                    <Icon n="plus" s={16}/> {uploading ? 'מעלה...' : 'הוסף מסמך ראשון'}
                  </Btn>
                }
              />
            </div>
          </div>
        ) : (
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={localPermits.map(p => p._id)}
              strategy={rectSortingStrategy}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {localPermits.map((permit) => (
                  <PermitCard 
                    key={permit._id}
                    permit={permit}
                    authorityDraft={authorityDrafts[permit._id]}
                    noteDraft={noteDrafts[permit._id]}
                    onAuthorityChange={handleAuthorityChange}
                    onNoteChange={handleNoteChange}
                    onDelete={setPermitToDelete}
                    onPreview={setPreviewDocumentUrl}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
        
        {/* Explicit spacer for mobile scroll issues */}
        <div style={{ height: 100, flexShrink: 0 }} />

        {permitToDelete && (
          <ConfirmDialog
            title="מחיקת מסמך"
            message={`האם אתה בטוח שברצונך למחוק את המסמך "${permitToDelete.title}"? הקובץ יימחק גם משרתי האחסון.`}
            confirmText="מחק"
            cancelText="ביטול"
            onConfirm={confirmDeletePermit}
            onClose={() => setPermitToDelete(null)}
          />
        )}

        {previewDocumentUrl && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 16 }}>
              <button onClick={() => setPreviewDocumentUrl(null)} style={{ background: 'var(--surface)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                <Icon n="x" s={20} />
              </button>
            </div>
            <div style={{ flex: 1, padding: '0 16px 16px 16px' }}>
              <iframe src={previewDocumentUrl} style={{ width: '100%', height: '100%', border: 'none', borderRadius: 12, background: '#fff' }} title="Document Preview" />
            </div>
          </div>
        )}
      </div>
    </ScreenBoundary>
    </PremiumLock>
  );
};
