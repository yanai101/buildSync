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
  const [photoNotes, setPhotoNotes] = React.useState<Record<string, string>>({});
  const [selectedPhotoIndex, setSelectedPhotoIndex] = React.useState<number>(0);
  const [bulkNoteText, setBulkNoteText] = React.useState('');
  const [deleteFromPhotos, setDeleteFromPhotos] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  const [exportProgress, setExportProgress] = React.useState({ current: 0, total: 0 });
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Helper to build individual photo note from its metadata and comments
  const buildDefaultPhotoNote = React.useCallback((p: PhotoToExport): string => {
    const details: string[] = [];
    if (p.label) details.push(p.label);
    if (p.location && p.location !== 'לא הוגדר') details.push(`מיקום: ${p.location}`);
    if (p.stage) details.push(`שלב: ${p.stage}`);
    if (p.date) details.push(`תאריך: ${p.date}`);

    const lines: string[] = [];
    if (details.length > 0) {
      lines.push(details.join(' · '));
    }

    if (p.notes && p.notes.length > 0) {
      lines.push('הערות:');
      p.notes.forEach((n) => {
        if (n.text) {
          lines.push(`• ${n.authorName ? `${n.authorName}: ` : ''}${n.text}`);
        }
      });
    }

    return lines.join('\n');
  }, []);

  // Extract existing sections from archive
  const existingSections = React.useMemo(() => {
    if (!archiveFiles) return [];
    const sectionMap = new Map<string, { id: string; name: string; count: number }>();
    for (const f of archiveFiles) {
      if (f.sectionId) {
        const existing = sectionMap.get(f.sectionId);
        const groupName = f.sectionName || (f.note && f.note.length > 40 ? f.note.slice(0, 40) + '...' : f.note) || 'קבוצה ללא שם';
        if (existing) {
          existing.count++;
          if (existing.name === 'קבוצה ללא שם' && f.sectionName) existing.name = f.sectionName;
        } else {
          sectionMap.set(f.sectionId, {
            id: f.sectionId,
            name: groupName,
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
    setSelectedPhotoIndex(0);
    setBulkNoteText('');

    const initialNotes: Record<string, string> = {};
    photos.forEach((p, idx) => {
      const key = p._id || p.id || String(idx);
      initialNotes[key] = buildDefaultPhotoNote(p);
    });
    setPhotoNotes(initialNotes);

    if (photos.length === 1) {
      const p = photos[0];
      setNewGroupName(p.label ? p.label : (p.location ? `תמונות ${p.location}` : 'קבוצת תמונות'));
    } else {
      setNewGroupName(`תיעוד תמונות - ${new Date().toLocaleDateString('he-IL')}`);
    }

    if (existingSections.length > 0 && groupMode === 'existing' && !selectedSectionId) {
      setSelectedSectionId(existingSections[0].id);
    }
  }, [isOpen, photos, existingSections, buildDefaultPhotoNote]);

  if (!isOpen) return null;

  const currentCount = archiveFiles?.length ?? 0;
  const remainingSlots = Math.max(0, MAX_ARCHIVE_FILES - currentCount);
  const isOverLimit = photos.length > remainingSlots;

  const canPhotos = archivePerms?.canPhotos ?? true;
  const isPro = archivePerms?.isProOrPremium ?? true;

  const handleApplyBulkNote = () => {
    if (!bulkNoteText.trim()) return;
    const updated: Record<string, string> = {};
    photos.forEach((p, idx) => {
      const key = p._id || p.id || String(idx);
      updated[key] = bulkNoteText.trim();
    });
    setPhotoNotes(updated);
  };

  const handleExport = async () => {
    if (photos.length === 0 || isExporting) return;

    if (isOverLimit) {
      setErrorMsg(`לא ניתן לייצא: נותרו ${remainingSlots} מקומות פנויים בארכיון, אך נבחרו ${photos.length} תמונות.`);
      return;
    }

    setIsExporting(true);
    setErrorMsg(null);
    setExportProgress({ current: 0, total: photos.length });

    // Determine target section ID and Section Name
    let targetSectionId: string | undefined = undefined;
    let targetSectionName: string | undefined = undefined;
    if (groupMode === 'new') {
      targetSectionId = `section-${Date.now()}`;
      targetSectionName = newGroupName.trim() || undefined;
    } else if (groupMode === 'existing') {
      targetSectionId = selectedSectionId || undefined;
      const matched = existingSections.find((s) => s.id === selectedSectionId);
      targetSectionName = matched?.name || undefined;
    }

    try {
      // 1. Upload each photo to personalFiles archive with its specific note and group name
      for (let i = 0; i < photos.length; i++) {
        const p = photos[i];
        if (!p.fileUrl) continue;

        const photoKey = p._id || p.id || String(i);
        const specificNote = photoNotes[photoKey] ?? buildDefaultPhotoNote(p);

        // Fetch image blob
        const res = await fetch(p.fileUrl);
        if (!res.ok) throw new Error(`שגיאה בהורדת התמונה: ${p.label || i + 1}`);
        const blob = await res.blob();

        const cleanName = (p.label || `photo-${i + 1}`)
          .replace(/[/\\?%*:|"<>]/g, '-')
          .slice(0, 50);
        const fileName = `${cleanName}.jpg`;
        const fileObj = new File([blob], fileName, { type: blob.type || 'image/jpeg' });

        // Upload to archive with individual photo note & section name
        await uploadFile(
          fileObj,
          targetSectionId,
          specificNote.trim() ? specificNote.trim() : undefined,
          targetSectionName,
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

        {/* Selected photos preview / selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>
              תמונות לייצוא ({photos.length}):
            </span>
            {photos.length > 1 && (
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                לחץ על תמונה כדי לערוך את ההערה שלה
              </span>
            )}
          </div>

          <div style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            padding: '6px 2px',
            maxHeight: 96,
          }}>
            {photos.map((p, idx) => {
              const pKey = p._id || p.id || String(idx);
              const isSelected = selectedPhotoIndex === idx;
              const hasCustomNote = !!photoNotes[pKey]?.trim();

              return (
                <div
                  key={pKey}
                  onClick={() => setSelectedPhotoIndex(idx)}
                  style={{
                    flex: '0 0 74px',
                    height: 74,
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                    boxShadow: isSelected ? '0 0 0 2px rgba(255,149,0,0.2)' : 'none',
                    position: 'relative',
                    background: '#eee',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
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
                  {hasCustomNote && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 3,
                        right: 3,
                        background: 'rgba(0,0,0,0.65)',
                        color: '#fff',
                        borderRadius: '50%',
                        width: 16,
                        height: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="יש הערה לתמונה זו"
                    >
                      <Icon n="file-text" s={10} />
                    </div>
                  )}
                </div>
              );
            })}
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
                    {sec.name} ({sec.count} תמונות)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Note Editor for Photos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon n="file-text" s={14} c="var(--accent)" />
              <span style={{ fontSize: 13, fontWeight: 700 }}>
                {photos.length === 1
                  ? 'הערה לתמונה בארכיון:'
                  : `הערה לתמונה ${selectedPhotoIndex + 1} מתוך ${photos.length}${photos[selectedPhotoIndex]?.label ? ` (${photos[selectedPhotoIndex].label})` : ''}:`}
              </span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
              תישמר ישירות על גבי התמונה בארכיון ובדוח PDF
            </span>
          </div>

          {photos.length > 0 && (() => {
            const activePhoto = photos[selectedPhotoIndex] || photos[0];
            const activeKey = activePhoto._id || activePhoto.id || String(selectedPhotoIndex);
            const activeNote = photoNotes[activeKey] ?? '';

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <textarea
                  rows={3}
                  value={activeNote}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPhotoNotes(prev => ({ ...prev, [activeKey]: val }));
                  }}
                  placeholder="הזן תיאור, הערות ביצוע או סיכום לתמונה זו בארכיון..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    fontSize: 12.5,
                    fontFamily: "'Heebo', sans-serif",
                    resize: 'vertical',
                    outline: 'none',
                    lineHeight: 1.5,
                  }}
                />

                {photos.length > 1 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'var(--bg)',
                    padding: '6px 10px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    fontSize: 12,
                  }}>
                    <input
                      type="text"
                      value={bulkNoteText}
                      onChange={(e) => setBulkNoteText(e.target.value)}
                      placeholder="הזן הערה משותפת להחלה על כל התמונות..."
                      style={{
                        flex: 1,
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        padding: '4px 8px',
                        fontSize: 11.5,
                        fontFamily: "'Heebo', sans-serif",
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleApplyBulkNote}
                      disabled={!bulkNoteText.trim()}
                      style={{
                        background: bulkNoteText.trim() ? 'var(--accent)' : 'var(--border)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        padding: '4px 10px',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: bulkNoteText.trim() ? 'pointer' : 'default',
                        whiteSpace: 'nowrap',
                        fontFamily: "'Heebo', sans-serif",
                      }}
                    >
                      החל על הכל
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
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
