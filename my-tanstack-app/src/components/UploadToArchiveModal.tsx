import React from 'react';
import type { Id } from '../../convex/_generated/dataModel';
import { Icon, Btn, Modal } from './Shared';
import { usePersonalFileUploader } from '../hooks/usePersonalFileUploader';

export interface ArchiveSectionOption {
  id: string;
  name: string;
  count: number;
}

export interface StagedFileItem {
  id: string;
  file: File;
  previewUrl: string;
  note: string;
  isImage: boolean;
}

interface UploadToArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFiles: File[];
  projectId: Id<'projects'>;
  initialSectionId?: string | null;
  initialSectionName?: string;
  existingSections: ArchiveSectionOption[];
  onSuccess: (info: {
    count: number;
    originalSize: number;
    storedSize: number;
    saved: number;
    pct: number;
  }) => void;
}

const MAX_SECTION_PHOTOS = 3;

export const UploadToArchiveModal: React.FC<UploadToArchiveModalProps> = ({
  isOpen,
  onClose,
  initialFiles,
  projectId,
  initialSectionId,
  initialSectionName,
  existingSections,
  onSuccess,
}) => {
  const uploadFile = usePersonalFileUploader(projectId);

  const [items, setItems] = React.useState<StagedFileItem[]>([]);
  const [groupMode, setGroupMode] = React.useState<'existing' | 'new' | 'none'>('existing');
  const [selectedSectionId, setSelectedSectionId] = React.useState<string>('');
  const [newGroupName, setNewGroupName] = React.useState('');
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState<{ current: number; total: number } | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const cameraInputRef = React.useRef<HTMLInputElement | null>(null);
  const galleryInputRef = React.useRef<HTMLInputElement | null>(null);

  // Initialize staged items when modal opens or initialFiles change
  React.useEffect(() => {
    if (!isOpen) return;

    setErrorMsg(null);
    setIsUploading(false);
    setUploadProgress(null);

    const initialItems: StagedFileItem[] = initialFiles.map((file) => {
      const isImg = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|avif|heic|heif|bmp|gif)$/i.test(file.name);
      return {
        id: crypto.randomUUID(),
        file,
        previewUrl: isImg ? URL.createObjectURL(file) : '',
        note: '',
        isImage: isImg,
      };
    });

    setItems(initialItems);

    return () => {
      initialItems.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, [isOpen, initialFiles]);

  // Set initial section states when opening
  React.useEffect(() => {
    if (!isOpen) return;

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

  if (!isOpen) return null;

  const isAllImages = items.every((i) => i.isImage);
  const selectedSection = existingSections.find((s) => s.id === selectedSectionId);
  const currentSectionCount = groupMode === 'existing' && selectedSection ? selectedSection.count : 0;
  const remainingSlots = Math.max(0, MAX_SECTION_PHOTOS - currentSectionCount - items.length);
  const canAddMore = isAllImages && remainingSlots > 0;

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleAddFiles = (newFiles: FileList | null) => {
    if (!newFiles || newFiles.length === 0) return;
    const filesArray = Array.from(newFiles);

    // Limit to remaining capacity
    const slotsAvailable = Math.max(0, MAX_SECTION_PHOTOS - currentSectionCount - items.length);
    const toAdd = filesArray.slice(0, slotsAvailable);

    if (toAdd.length < filesArray.length) {
      setErrorMsg(`ניתן להעלות עד ${MAX_SECTION_PHOTOS} תמונות בסך הכל לקבוצה זו.`);
    } else {
      setErrorMsg(null);
    }

    const newItems: StagedFileItem[] = toAdd.map((file) => {
      const isImg = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|avif|heic|heif|bmp|gif)$/i.test(file.name);
      return {
        id: crypto.randomUUID(),
        file,
        previewUrl: isImg ? URL.createObjectURL(file) : '',
        note: '',
        isImage: isImg,
      };
    });

    setItems((prev) => [...prev, ...newItems]);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      const updated = prev.filter((item) => item.id !== id);
      if (updated.length === 0) {
        onClose();
      }
      return updated;
    });
  };

  const handleItemNoteChange = (id: string, note: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, note } : item))
    );
  };

  const handleUpload = async () => {
    if (items.length === 0 || !projectId) return;

    let targetSectionId: string | undefined = undefined;
    let targetSectionName: string | undefined = undefined;

    if (isAllImages) {
      if (groupMode === 'existing' && selectedSectionId) {
        targetSectionId = selectedSectionId;
        const matched = existingSections.find((s) => s.id === selectedSectionId);
        targetSectionName = matched?.name || undefined;
      } else if (groupMode === 'new') {
        targetSectionId = initialSectionId || crypto.randomUUID();
        targetSectionName = newGroupName.trim() || undefined;
      }
    }

    setIsUploading(true);
    setErrorMsg(null);

    let totalOriginalSize = 0;
    let totalStoredSize = 0;

    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        setUploadProgress({ current: i + 1, total: items.length });
        totalOriginalSize += item.file.size;

        const res = await uploadFile(
          item.file,
          targetSectionId,
          item.note.trim(),
          targetSectionName
        );
        totalStoredSize += res.storedSize;
      }

      const totalSaved = Math.max(0, totalOriginalSize - totalStoredSize);
      const pct = totalOriginalSize > 0 ? Math.round((totalSaved / totalOriginalSize) * 100) : 0;

      onSuccess({
        count: items.length,
        originalSize: totalOriginalSize,
        storedSize: totalStoredSize,
        saved: totalSaved,
        pct,
      });
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'שגיאה בעת העלאת הקבצים');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  return (
    <Modal
      title={
        isAllImages
          ? items.length > 1
            ? `העלאת ${items.length} תמונות לארכיון`
            : 'העלאת תמונה לארכיון'
          : 'העלאת מסמך לארכיון'
      }
      onClose={isUploading ? () => {} : onClose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 540 }}>
        {/* Hidden inputs for adding additional files from modal */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={(e) => {
            handleAddFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            handleAddFiles(e.target.files);
            e.target.value = '';
          }}
        />

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

        {/* Staged Media Items List / Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((item, idx) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: 12,
              }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {item.previewUrl ? (
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 8,
                      overflow: 'hidden',
                      flexShrink: 0,
                      border: '1px solid var(--border)',
                      background: '#000',
                    }}
                  >
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      width: 64,
                      height: 64,
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
                    <Icon n={item.isImage ? 'image' : 'file-text'} s={28} />
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 13,
                      color: 'var(--text1)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={item.file.name}
                  >
                    {item.file.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span>{formatBytes(item.file.size)}</span>
                    {item.isImage && <span style={{ color: 'var(--success, #16a34a)' }}>⚡ כיווץ WebP אוטומטי</span>}
                  </div>
                </div>

                {items.length > 1 && !isUploading && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    title="הסר תמונה"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--danger)',
                      cursor: 'pointer',
                      padding: 6,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Icon n="trash" s={16} />
                  </button>
                )}
              </div>

              {/* Note input for this specific photo */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <input
                  className="bp-input"
                  value={item.note}
                  onChange={(e) => handleItemNoteChange(item.id, e.target.value)}
                  placeholder={items.length > 1 ? `הערה לתמונה ${idx + 1}...` : "הוסף הערה או תיאור לתמונה..."}
                  disabled={isUploading}
                  style={{ width: '100%', fontSize: 13, padding: '7px 10px' }}
                />
              </div>
            </div>
          ))}

          {/* Buttons to snap another photo or add from gallery if slots remaining */}
          {canAddMore && !isUploading && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
              <button
                type="button"
                className="mobile-only"
                onClick={() => cameraInputRef.current?.click()}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px dashed var(--accent)',
                  background: 'var(--accent-subtle, rgba(235,94,40,0.06))',
                  color: 'var(--accent)',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  fontFamily: "'Heebo',sans-serif",
                }}
              >
                <Icon n="camera" s={15} />
                <span>צלם תמונה נוספת ({items.length}/{MAX_SECTION_PHOTOS})</span>
              </button>

              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px dashed var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text2)',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  fontFamily: "'Heebo',sans-serif",
                }}
              >
                <Icon n="plus" s={15} />
                <span>הוסף מהגלריה ({items.length}/{MAX_SECTION_PHOTOS})</span>
              </button>
            </div>
          )}
        </div>

        {/* Section / Group Selection (for images) */}
        {isAllImages && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
              קבוצה בארכיון
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {existingSections.length > 0 && (
                <button
                  type="button"
                  onClick={() => setGroupMode('existing')}
                  disabled={isUploading}
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
                disabled={isUploading}
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
                disabled={isUploading}
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
                disabled={isUploading}
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
                disabled={isUploading}
                onChange={(e) => setNewGroupName(e.target.value)}
                style={{ width: '100%', fontSize: 13, padding: '8px 10px', marginTop: 4 }}
              />
            )}
          </div>
        )}

        {/* Action Buttons & Progress */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <Btn variant="ghost" onClick={onClose} disabled={isUploading}>
            ביטול
          </Btn>
          <Btn variant="primary" onClick={handleUpload} disabled={isUploading || items.length === 0}>
            {isUploading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon n="loader" s={16} className="spin" />
                <span>
                  {uploadProgress
                    ? `מעלה ומכווץ (${uploadProgress.current}/${uploadProgress.total})...`
                    : 'מעלה ומכווץ...'}
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon n="upload" s={16} />
                <span>
                  {items.length > 1 ? `העלה ${items.length} תמונות לארכיון` : 'העלה ושמור לארכיון'}
                </span>
              </div>
            )}
          </Btn>
        </div>
      </div>
    </Modal>
  );
};
