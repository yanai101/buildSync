import React from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Icon, Btn, Modal } from './Shared';
import { usePersonalFileUploader } from '../hooks/usePersonalFileUploader';

const MAX_ARCHIVE_FILES = 30;

export interface PhotoToExport {
  _id?: string;
  id?: string;
  label?: string;
  location?: string;
  stage?: string;
  date?: string;
  tag?: string;
  fileUrl?: string;
  notes?: Array<{ authorName?: string; text?: string; id?: string; _id?: string }>;
  notesCount?: number;
}

export interface ExportSuccessInfo {
  count: number;
  deleted: boolean;
}

interface ExportToArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: Id<'projects'>;
  photos: PhotoToExport[];
  onSuccess?: (info: ExportSuccessInfo) => void;
}

export const ExportToArchiveModal: React.FC<ExportToArchiveModalProps> = ({
  isOpen,
  onClose,
  projectId,
  photos,
  onSuccess,
}) => {
  const uploadFile = usePersonalFileUploader(projectId);
  const deletePhoto = useMutation(api.mutations.deletePhoto);

  const archiveFiles = useQuery(
    api.personalFiles.listMyPersonalFiles,
    projectId ? { projectId } : 'skip',
  );

  const archivePerms = useQuery(
    api.personalFiles.getArchivePermissions,
    projectId ? { projectId } : 'skip',
  );

  const [groupMode, setGroupMode] = React.useState<'new' | 'existing' | 'none'>('new');
  const [newGroupName, setNewGroupName] = React.useState('');
  const [selectedSectionId, setSelectedSectionId] = React.useState<string>('');
  const [noteText, setNoteText] = React.useState('');
  const [deleteFromPhotos, setDeleteFromPhotos] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  const [exportProgress, setExportProgress] = React.useState({ current: 0, total: 0 });
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Extract existing sections from archive
  const existingSections = React.useMemo(() => {
    if (!archiveFiles) return [];
    const sectionMap = new Map<string, { id: string; note: string; count: number }>();
    for (const f of archiveFiles) {
      if (f.sectionId) {
        const existing = sectionMap.get(f.sectionId);
        if (existing) {
          existing.count++;
          if (!existing.note && f.note) existing.note = f.note;
        } else {
          sectionMap.set(f.sectionId, {
            id: f.sectionId,
            note: f.note ? (f.note.length > 40 ? f.note.slice(0, 40) + '...' : f.note) : 'קבוצה ללא שם',
            count: 1,
          });
        }
      }
    }
    return Array.from(sectionMap.values());
  }, [archiveFiles]);

  // Prepopulate note and default group name when photos change
  React.useEffect(() => {
    if (!isOpen || photos.length === 0) return;

    setErrorMsg(null);
    setDeleteFromPhotos(true);
    setExportProgress({ current: 0, total: photos.length });

    if (photos.length === 1) {
      const p = photos[0];
      const details: string[] = [];
      if (p.label) details.push(p.label);
      if (p.location && p.location !== 'לא הוגדר') details.push(`מיקום: ${p.location}`);
      if (p.stage) details.push(`שלב: ${p.stage}`);
      if (p.date) details.push(`תאריך: ${p.date}`);

      const noteLines: string[] = [];
      if (details.length > 0) {
        noteLines.push(details.join(' · '));
      }

      if (p.notes && p.notes.length > 0) {
        noteLines.push('\nהערות:');
        p.notes.forEach((n) => {
          noteLines.push(`• ${n.authorName ? `${n.authorName}: ` : ''}${n.text}`);
        });
      }

      setNoteText(noteLines.join('\n'));
      setNewGroupName(p.label ? p.label : (p.location ? `תמונות ${p.location}` : 'קבוצת תמונות'));
    } else {
      const summaryLines: string[] = [];
      summaryLines.push(`ייצוא של ${photos.length} תמונות ממסך התמונות`);
      const distinctStages = Array.from(new Set(photos.map(p => p.stage).filter(Boolean)));
      if (distinctStages.length > 0) {
        summaryLines.push(`שלבים: ${distinctStages.join(', ')}`);
      }

      const allNotes: string[] = [];
      photos.forEach(p => {
        if (p.notes && p.notes.length > 0) {
          p.notes.forEach(n => {
            allNotes.push(`• ${p.label || 'תמונה'} (${n.authorName || 'משתמש'}): ${n.text}`);
          });
        }
      });

      if (allNotes.length > 0) {
        summaryLines.push('\nהערות מהתמונות:');
        summaryLines.push(...allNotes);
      }

      setNoteText(summaryLines.join('\n'));
      setNewGroupName(`תיעוד תמונות - ${new Date().toLocaleDateString('he-IL')}`);
    }

    if (existingSections.length > 0 && groupMode === 'existing' && !selectedSectionId) {
      setSelectedSectionId(existingSections[0].id);
    }
  }, [isOpen, photos, existingSections]);

  if (!isOpen) return null;

  const currentCount = archiveFiles?.length ?? 0;
  const remainingSlots = Math.max(0, MAX_ARCHIVE_FILES - currentCount);
  const isOverLimit = photos.length > remainingSlots;

  const canPhotos = archivePerms?.canPhotos ?? true;
  const isPro = archivePerms?.isProOrPremium ?? true;

  const handleExport = async () => {
    if (photos.length === 0 || isExporting) return;

    if (isOverLimit) {
      setErrorMsg(`לא ניתן לייצא: נותרו ${remainingSlots} מקומות פנויים בארכיון, אך נבחרו ${photos.length} תמונות.`);
      return;
    }

    setIsExporting(true);
    setErrorMsg(null);
    setExportProgress({ current: 0, total: photos.length });

    // Determine target section ID
    let targetSectionId: string | undefined = undefined;
    if (groupMode === 'new') {
      targetSectionId = `section-${Date.now()}`;
    } else if (groupMode === 'existing') {
      targetSectionId = selectedSectionId || undefined;
    }

    try {
      // 1. Upload each photo to personalFiles archive
      for (let i = 0; i < photos.length; i++) {
        const p = photos[i];
        if (!p.fileUrl) continue;

        // Fetch image blob
        const res = await fetch(p.fileUrl);
        if (!res.ok) throw new Error(`שגיאה בהורדת התמונה: ${p.label || i + 1}`);
        const blob = await res.blob();

        const cleanName = (p.label || `photo-${i + 1}`)
          .replace(/[/\\?%*:|"<>]/g, '-')
          .slice(0, 50);
        const fileName = `${cleanName}.jpg`;
        const fileObj = new File([blob], fileName, { type: blob.type || 'image/jpeg' });

        // Upload to archive with note & section
        await uploadFile(
          fileObj,
          targetSectionId,
          noteText.trim() ? noteText.trim() : undefined,
        );

        setExportProgress({ current: i + 1, total: photos.length });
      }

      // 2. If deleteFromPhotos is true, remove the photos from gallery
      if (deleteFromPhotos) {
        for (const p of photos) {
          const photoId = p._id || p.id;
          if (photoId && typeof photoId === 'string') {
            try {
              await deletePhoto({ photoId: photoId as Id<'photos'> });
            } catch (delErr) {
              console.warn('Could not delete photo from gallery:', photoId, delErr);
            }
          }
        }
      }

      // 3. Notify success and auto-close modal
      if (onSuccess) {
        onSuccess({ count: photos.length, deleted: deleteFromPhotos });
      }
      onClose();
    } catch (err) {
      console.error('Export to archive failed:', err);
      setErrorMsg(err instanceof Error ? err.message : 'אירעה שגיאה בייצוא לארכיון');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal
      onClose={() => !isExporting && onClose()}
      title={`ייצוא לארכיון הפרויקט (${photos.length} תמונות)`}
      width={600}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Permission & Quota warnings */}
        {!isPro && (
          <div style={{
            background: '#FFF3E0',
            border: '1px solid #FFE082',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 13,
            color: '#E65100',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <Icon n="lock" s={16} />
            <span>ארכיון הפרויקט זמין רק כאשר בעל הפרויקט הוא בעל מנוי Pro או Premium.</span>
          </div>
        )}

        {!canPhotos && isPro && (
          <div style={{
            background: '#FFEBEE',
            border: '1px solid #FFCDD2',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 13,
            color: '#C62828',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <Icon n="shield" s={16} />
            <span>אין לך הרשאה להעלות תמונות לארכיון פרויקט זה.</span>
          </div>
        )}

        {/* Quota indicator */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--surface)',
          padding: '10px 14px',
          borderRadius: 8,
          border: '1px solid var(--border)',
          fontSize: 13,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon n="archive" s={15} />
            <span>מכסת ארכיון: <strong>{currentCount}/{MAX_ARCHIVE_FILES}</strong> קבצים</span>
          </div>
          <span style={{ color: remainingSlots < photos.length ? 'var(--danger)' : 'var(--text2)', fontSize: 12 }}>
            נותרו {remainingSlots} מקומות פנויים
          </span>
        </div>

        {isOverLimit && (
          <div style={{
            background: 'var(--danger-light, #FFEBEE)',
            border: '1px solid var(--danger, #D32F2F)',
            color: 'var(--danger, #D32F2F)',
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
          }}>
            ⚠️ חריגה ממכסה: בחרת {photos.length} תמונות אך נותרו רק {remainingSlots} מקומות פנויים.
          </div>
        )}

        {/* Selected photos preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>תמונות לייצוא ({photos.length}):</span>
          <div style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            padding: '6px 2px',
            maxHeight: 90,
          }}>
            {photos.map((p, idx) => (
              <div
                key={p.id || p._id || idx}
                style={{
                  flex: '0 0 70px',
                  height: 70,
                  borderRadius: 6,
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                  position: 'relative',
                  background: '#eee',
                }}
                title={p.label || `תמונה ${idx + 1}`}
              >
                {p.fileUrl ? (
                  <img src={p.fileUrl} alt={p.label || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon n="camera" s={18} c="var(--text3)" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Group / Section selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>שיוך לקבוצה בארכיון:</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setGroupMode('new')}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: '1px solid',
                borderColor: groupMode === 'new' ? 'var(--accent)' : 'var(--border)',
                background: groupMode === 'new' ? 'var(--accent-light)' : 'var(--surface)',
                color: groupMode === 'new' ? 'var(--accent)' : 'var(--text1)',
                fontWeight: groupMode === 'new' ? 700 : 500,
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: "'Heebo', sans-serif",
              }}
            >
              ✨ קבוצה חדשה
            </button>

            {existingSections.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setGroupMode('existing');
                  if (!selectedSectionId && existingSections.length > 0) {
                    setSelectedSectionId(existingSections[0].id);
                  }
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: '1px solid',
                  borderColor: groupMode === 'existing' ? 'var(--accent)' : 'var(--border)',
                  background: groupMode === 'existing' ? 'var(--accent-light)' : 'var(--surface)',
                  color: groupMode === 'existing' ? 'var(--accent)' : 'var(--text1)',
                  fontWeight: groupMode === 'existing' ? 700 : 500,
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: "'Heebo', sans-serif",
                }}
              >
                📁 הוספה לקבוצה קיימת ({existingSections.length})
              </button>
            )}

            <button
              type="button"
              onClick={() => setGroupMode('none')}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: '1px solid',
                borderColor: groupMode === 'none' ? 'var(--accent)' : 'var(--border)',
                background: groupMode === 'none' ? 'var(--accent-light)' : 'var(--surface)',
                color: groupMode === 'none' ? 'var(--accent)' : 'var(--text1)',
                fontWeight: groupMode === 'none' ? 700 : 500,
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: "'Heebo', sans-serif",
              }}
            >
              📄 ללא קבוצה (בודד)
            </button>
          </div>

          {groupMode === 'new' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text2)' }}>שם הקבוצה החדשה:</span>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="למשל: יציקת רצפה, עבודות איטום..."
                style={{
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  fontSize: 13,
                  fontFamily: "'Heebo', sans-serif",
                  outline: 'none',
                }}
              />
            </div>
          )}

          {groupMode === 'existing' && existingSections.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text2)' }}>בחר קבוצה קיימת:</span>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                style={{
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  fontSize: 13,
                  fontFamily: "'Heebo', sans-serif",
                  background: 'var(--surface)',
                  color: 'var(--text1)',
                }}
              >
                {existingSections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.note} ({sec.count} תמונות)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Note Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>הערות ומסמך תיעוד לארכיון:</span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>ניתן לערוך לפני השמירה</span>
          </div>
          <textarea
            rows={3}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="רשום הערות, סיכום או פרטי ביצוע שישמרו יחד עם התמונות בארכיון..."
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              fontSize: 12,
              fontFamily: "'Heebo', sans-serif",
              resize: 'vertical',
              outline: 'none',
              lineHeight: 1.5,
            }}
          />
        </div>

        {/* Prominent delete toggle box */}
        <div style={{
          background: deleteFromPhotos ? 'rgba(255, 149, 0, 0.08)' : 'var(--surface)',
          border: `1.5px solid ${deleteFromPhotos ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 10,
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          transition: 'all 0.2s ease',
          boxShadow: deleteFromPhotos ? '0 2px 8px rgba(255, 149, 0, 0.12)' : 'none',
        }}>
          <input
            type="checkbox"
            id="delete-after-export-checkbox"
            checked={deleteFromPhotos}
            onChange={(e) => setDeleteFromPhotos(e.target.checked)}
            style={{
              width: 18,
              height: 18,
              marginTop: 2,
              cursor: 'pointer',
              accentColor: 'var(--accent)',
            }}
          />
          <label
            htmlFor="delete-after-export-checkbox"
            style={{ cursor: 'pointer', flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span>🗑️ למחוק {photos.length === 1 ? 'את התמונה' : `את ${photos.length} התמונות`} מעמוד התמונות לאחר ההעברה</span>
              <span style={{ fontSize: 10, background: 'var(--accent-light)', color: 'var(--accent)', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>ברירת מחדל</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.4 }}>
              {deleteFromPhotos
                ? 'התמונות יימחקו מגלריית הפרויקט ויישמרו בארכיון בלבד (מומלץ כדי לפנות מקום בגלריה).'
                : 'עותק של התמונות יישאר גם בגלריית התמונות וגם בארכיון הפרויקט.'}
            </div>
          </label>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div style={{
            background: 'var(--danger-light, #FFEBEE)',
            border: '1px solid var(--danger, #D32F2F)',
            color: 'var(--danger, #D32F2F)',
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: 12,
          }}>
            {errorMsg}
          </div>
        )}

        {/* Export progress bar */}
        {isExporting && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span>מעביר לארכיון {deleteFromPhotos ? 'ומוחק מהגלריה' : ''}...</span>
              <span>{exportProgress.current} מתוך {exportProgress.total}</span>
            </div>
            <div style={{ width: '100%', height: 6, background: '#eee', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                width: `${exportProgress.total > 0 ? (exportProgress.current / exportProgress.total) * 100 : 0}%`,
                height: '100%',
                background: 'var(--accent)',
                transition: 'width 0.2s',
              }} />
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <Btn
            size="md"
            variant="ghost"
            onClick={onClose}
            disabled={isExporting}
          >
            ביטול
          </Btn>
          <Btn
            size="md"
            onClick={handleExport}
            disabled={isExporting || isOverLimit || !isPro || !canPhotos}
          >
            <Icon n={isExporting ? 'loader' : 'archive'} s={15} />
            {isExporting ? `מייצא (${exportProgress.current}/${exportProgress.total})...` : `העבר לארכיון (${photos.length})`}
          </Btn>
        </div>
      </div>
    </Modal>
  );
};
