import React from 'react';
import type { Id } from '../../convex/_generated/dataModel';
import { Icon, Btn, Modal } from './Shared';
import { usePersonalFileUploader } from '../hooks/usePersonalFileUploader';

export interface ArchiveSectionOption {
  id: string;
  name: string;
  count: number;
}

interface UploadToArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  projectId: Id<'projects'>;
  initialSectionId?: string | null;
  initialSectionName?: string;
  existingSections: ArchiveSectionOption[];
  onSuccess: (info: {
    fileId: string;
    name: string;
    sectionId?: string;
    note?: string;
    originalSize: number;
    storedSize: number;
    saved: number;
    pct: number;
  }) => void;
}

export const UploadToArchiveModal: React.FC<UploadToArchiveModalProps> = ({
  isOpen,
  onClose,
  file,
  projectId,
  initialSectionId,
  initialSectionName,
  existingSections,
  onSuccess,
}) => {
  const uploadFile = usePersonalFileUploader(projectId);

  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [noteText, setNoteText] = React.useState('');
  const [groupMode, setGroupMode] = React.useState<'existing' | 'new' | 'none'>('existing');
  const [selectedSectionId, setSelectedSectionId] = React.useState<string>('');
  const [newGroupName, setNewGroupName] = React.useState('');
  const [isUploading, setIsUploading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Generate object URL for image preview
  React.useEffect(() => {
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  // Set initial section states when opening
  React.useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setNoteText('');
    setIsUploading(false);

    if (initialSectionId) {
      const match = existingSections.find((s) => s.id === initialSectionId);
      if (match) {
        setGroupMode('existing');
        setSelectedSectionId(initialSectionId);
      } else {
        setGroupMode('new');
        setNewGroupName(initialSectionName || '');
      }
    } else if (existingSections.length > 0) {
      setGroupMode('existing');
      setSelectedSectionId(existingSections[0].id);
    } else {
      setGroupMode('new');
      setNewGroupName('');
    }
  }, [isOpen, initialSectionId, initialSectionName, existingSections]);

  if (!isOpen || !file) return null;

  const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|avif|heic|heif|bmp|gif)$/i.test(file.name);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleUpload = async () => {
    if (!file || !projectId) return;

    let targetSectionId: string | undefined = undefined;
    let targetSectionName: string | undefined = undefined;
    if (groupMode === 'existing' && selectedSectionId) {
      targetSectionId = selectedSectionId;
      const matched = existingSections.find((s) => s.id === selectedSectionId);
      targetSectionName = matched?.name || undefined;
    } else if (groupMode === 'new') {
      targetSectionId = initialSectionId || crypto.randomUUID();
      targetSectionName = newGroupName.trim() || undefined;
    }

    setIsUploading(true);
    setErrorMsg(null);

    try {
      const finalNote = noteText.trim();
      const result = await uploadFile(file, targetSectionId, finalNote, targetSectionName);

      const saved = Math.max(0, file.size - result.storedSize);
      const pct = file.size > 0 ? Math.round((saved / file.size) * 100) : 0;

      onSuccess({
        fileId: result.fileId,
        name: file.name,
        sectionId: targetSectionId,
        note: finalNote,
        originalSize: file.size,
        storedSize: result.storedSize,
        saved,
        pct,
      });
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'שגיאה בעת העלאת הקובץ');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      title={isImage ? 'העלאת תמונה לארכיון' : 'העלאת מסמך לארכיון'}
      onClose={isUploading ? () => {} : onClose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 540 }}>
        {/* Error message */}
        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'var(--danger-bg, #FEF2F2)',
              border: '1px solid var(--danger-border, #FCA5A5)',
              color: 'var(--danger, #991B1B)',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Icon n="alert-circle" s={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Media preview and file details */}
        <div
          style={{
            display: 'flex',
            gap: 14,
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: 12,
            alignItems: 'center',
          }}
        >
          {previewUrl ? (
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 8,
                overflow: 'hidden',
                flexShrink: 0,
                border: '1px solid var(--border)',
                background: '#000',
              }}
            >
              <img
                src={previewUrl}
                alt={file.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          ) : (
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 8,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent)',
                flexShrink: 0,
              }}
            >
              <Icon n={isImage ? 'image' : 'file-text'} s={32} />
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 14,
                color: 'var(--text1)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={file.name}
            >
              {file.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', gap: 10 }}>
              <span>גודל מקורי: {formatBytes(file.size)}</span>
              {isImage && <span style={{ color: 'var(--success, #16a34a)' }}>⚡ יידחס אוטומטית</span>}
            </div>
          </div>
        </div>

        {/* Section / Group Selection (for images) */}
        {isImage && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
              קבוצה בארכיון
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {existingSections.length > 0 && (
                <button
                  type="button"
                  onClick={() => setGroupMode('existing')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: groupMode === 'existing' ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: groupMode === 'existing' ? 'var(--accent-subtle, rgba(235,94,40,0.08))' : 'var(--surface)',
                    color: groupMode === 'existing' ? 'var(--accent)' : 'var(--text2)',
                    fontWeight: groupMode === 'existing' ? 700 : 500,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Icon n="folder" s={14} /> קבוצה קיימת
                </button>
              )}
              <button
                type="button"
                onClick={() => setGroupMode('new')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: groupMode === 'new' ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: groupMode === 'new' ? 'var(--accent-subtle, rgba(235,94,40,0.08))' : 'var(--surface)',
                  color: groupMode === 'new' ? 'var(--accent)' : 'var(--text2)',
                  fontWeight: groupMode === 'new' ? 700 : 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Icon n="plus" s={14} /> קבוצה חדשה
              </button>
              <button
                type="button"
                onClick={() => setGroupMode('none')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: groupMode === 'none' ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: groupMode === 'none' ? 'var(--accent-subtle, rgba(235,94,40,0.08))' : 'var(--surface)',
                  color: groupMode === 'none' ? 'var(--accent)' : 'var(--text2)',
                  fontWeight: groupMode === 'none' ? 700 : 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                ללא קבוצה
              </button>
            </div>

            {groupMode === 'existing' && existingSections.length > 0 && (
              <select
                className="bp-input"
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                style={{ width: '100%', fontSize: 13, padding: '8px 10px', marginTop: 4 }}
              >
                {existingSections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name || 'קבוצה ללא שם'} ({sec.count} {sec.count === 1 ? 'תמונה' : 'תמונות'})
                  </option>
                ))}
              </select>
            )}

            {groupMode === 'new' && (
              <input
                className="bp-input"
                placeholder="הזן שם לקבוצה החדשה (לדוגמה: איטום מרפסת)..."
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                style={{ width: '100%', fontSize: 13, padding: '8px 10px', marginTop: 4 }}
              />
            )}
          </div>
        )}

        {/* Note / Description input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon n="file-text" s={14} /> הערה / תיאור לתמונה
            </label>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>אופציונלי</span>
          </div>
          <textarea
            className="bp-input"
            rows={3}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="הוסף תיאור מפורט של התמונה (לדוגמה: בוצע איטום ביטומני בשכבה כפולה כולל רולקות)..."
            style={{ width: '100%', fontSize: 13, padding: '10px', resize: 'vertical' }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <Btn variant="ghost" onClick={onClose} disabled={isUploading}>
            ביטול
          </Btn>
          <Btn variant="primary" onClick={handleUpload} disabled={isUploading}>
            {isUploading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon n="loader" s={16} className="spin" />
                <span>מעלה ומכווץ...</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon n="upload" s={16} />
                <span>העלה ושמור לארכיון</span>
              </div>
            )}
          </Btn>
        </div>
      </div>
    </Modal>
  );
};
