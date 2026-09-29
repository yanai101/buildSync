import * as React from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Modal, Icon, Btn, FeedbackModal, ConfirmDialog } from './Shared';
import { useProjectFileUploader } from '../hooks/useProjectFileUploader';
import { useRequireRole } from '../hooks/useRequireRole';

interface ProgressTimelineModalProps {
  projectId: Id<'projects'>;
  currentStageName?: string;
  onClose: () => void;
  onCoverChanged?: () => void;
}

export const ProgressTimelineModal: React.FC<ProgressTimelineModalProps> = ({
  projectId,
  currentStageName,
  onClose,
  onCoverChanged,
}) => {
  const { allowed: isOwner } = useRequireRole(['owner']);
  const photos = useQuery(api.photos.getProgressPhotos, { projectId });
  const setCoverPhoto = useMutation(api.projects.setCoverPhoto);
  const uploadHeroProgressPhoto = useMutation(api.photos.uploadHeroProgressPhoto);
  const deletePhoto = useMutation(api.mutations.deletePhoto);
  const uploadProjectFile = useProjectFileUploader();

  const [uploading, setUploading] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [photoToDelete, setPhotoToDelete] = React.useState<Id<'photos'> | null>(null);
  const [photoLabel, setPhotoLabel] = React.useState('');
  const [selectedPreview, setSelectedPreview] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<{ title: string; message: string; type: 'success' | 'error' } | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const { fileId } = await uploadProjectFile({
        projectId,
        file,
        usage: 'photo',
        kind: 'image',
      });

      const label = photoLabel.trim() || (currentStageName ? `התקדמות - ${currentStageName}` : 'תמונת התקדמות');

      await uploadHeroProgressPhoto({
        projectId,
        projectFileId: fileId,
        label,
        stageLabel: currentStageName,
        setAsCover: true,
      });

      setPhotoLabel('');
      setFeedback({
        title: 'תמונה הועלתה בהצלחה',
        message: 'התמונה נוספה ליומן ההתקדמות והוגדרה כתמונת השער של הפרויקט.',
        type: 'success',
      });
      onCoverChanged?.();
    } catch (err: any) {
      setFeedback({
        title: 'שגיאה בהעלאה',
        message: err.message || 'אירעה שגיאה בעת העלאת התמונה',
        type: 'error',
      });
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSetCover = async (photoId: Id<'photos'>) => {
    try {
      await setCoverPhoto({ projectId, photoId });
      setFeedback({
        title: 'תמונת שער קובעה בהצלחה',
        message: 'התמונה נבחרה בהצלחה כתמונת השער הקבועה של הפרויקט בדאשבורד.',
        type: 'success',
      });
      onCoverChanged?.();
    } catch (err: any) {
      setFeedback({
        title: 'שגיאה בעדכון',
        message: err.message || 'אירעה שגיאה בעת עדכון תמונת השער',
        type: 'error',
      });
    }
  };

  const handleRemoveCover = async () => {
    try {
      await setCoverPhoto({ projectId });
      setFeedback({
        title: 'תמונת שער הוסרה',
        message: 'הדאשבורד חזר להציג את האייקון הרגיל.',
        type: 'success',
      });
      onCoverChanged?.();
    } catch (err: any) {
      setFeedback({
        title: 'שגיאה',
        message: err.message || 'אירעה שגיאה בעת הסרת תמונת השער',
        type: 'error',
      });
    }
  };

  const confirmDeletePhoto = async () => {
    if (!photoToDelete) return;
    try {
      setDeleting(true);
      await deletePhoto({ photoId: photoToDelete });
      setFeedback({
        title: 'תמונה נמחקה בהצלחה',
        message: 'התמונה והקבצים המשויכים אליה נמחקו לצמיתות.',
        type: 'success',
      });
      setPhotoToDelete(null);
      onCoverChanged?.();
    } catch (err: any) {
      setFeedback({
        title: 'שגיאה במחיקה',
        message: err.message || 'אירעה שגיאה בעת מחיקת התמונה',
        type: 'error',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Modal title="יומן התקדמות הבנייה בתמונות" onClose={onClose} width={740}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Quick upload bar */}
          {isOwner && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '14px 18px',
                background: 'var(--surface-2)',
                borderRadius: 14,
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ flex: '1 1 240px' }}>
                <input
                  type="text"
                  placeholder={currentStageName ? `תיאור קצר (לדוגמה: "סיום יציקה ב-${currentStageName}")` : 'תיאור קצר לתמונה (שלט, יציקה, שלד...)'}
                  value={photoLabel}
                  onChange={(e) => setPhotoLabel(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text1)',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                {/* Camera snap option — strictly visible on MOBILE ONLY */}
                <Btn
                  size="sm"
                  className="mobile-only"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={uploading}
                  style={{ alignItems: 'center', gap: 6 }}
                >
                  <Icon n="camera" s={14} />
                  <span>{uploading ? 'מעלה...' : 'צלם כעת'}</span>
                </Btn>
                {/* File upload option — visible on both desktop & mobile */}
                <Btn
                  size="sm"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Icon n="image" s={14} />
                  <span>{uploading ? 'מעלה...' : 'בחר תמונה'}</span>
                </Btn>
              </div>
            </div>
          )}

          {/* Timeline Photos List */}
          {photos === undefined ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
              טוען תמונות התקדמות...
            </div>
          ) : photos.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '44px 20px',
                borderRadius: 16,
                border: '1.5px dashed var(--border)',
                background: 'var(--surface-2)',
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: 'var(--accent-light)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                }}
              >
                <Icon n="camera" s={26} />
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700 }}>עדיין לא תועדו תמונות התקדמות</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text3)', maxWidth: 360, marginInline: 'auto' }}>
                העלה את תמונת השלט, החפירות או השלד, ותוכל לעקוב אחר הבנייה שלב אחר שלב!
              </p>
            </div>
          ) : (
            <div
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                paddingRight: 14,
                borderRight: '2px solid var(--border)',
                marginRight: 6,
                maxHeight: '60vh',
                overflowY: 'auto',
              }}
            >
              {photos.map((p) => (
                <div
                  key={p._id}
                  style={{
                    position: 'relative',
                    background: 'var(--surface)',
                    border: `1.5px solid ${p.isCover ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 14,
                    padding: 14,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 16,
                    boxShadow: p.isCover ? '0 2px 12px var(--accent-glow-sm)' : 'var(--shadow-sm)',
                    transition: 'all 0.2s',
                  }}
                >
                  {/* Timeline dot */}
                  <div
                    style={{
                      position: 'absolute',
                      right: -21,
                      top: 24,
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: p.isCover ? 'var(--accent)' : 'var(--border)',
                      border: '2px solid var(--surface)',
                      boxShadow: '0 0 0 2px var(--border)',
                    }}
                  />

                  {/* Thumbnail */}
                  <div
                    onClick={() => setSelectedPreview(p.url)}
                    style={{
                      width: 90,
                      height: 70,
                      borderRadius: 10,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      flexShrink: 0,
                      background: '#111',
                    }}
                  >
                    <img
                      src={p.url}
                      alt={p.label}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy"
                    />
                  </div>

                  {/* Details */}
                  <div style={{ flex: '1 1 200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text1)' }}>{p.label}</span>
                      {p.isCover && (
                        <span
                          style={{
                            background: 'var(--accent)',
                            color: '#fff',
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 12,
                          }}
                        >
                          📌 מקובעת כשער
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span>📅 {p.takenOn || new Date(p.createdAt).toLocaleDateString('he-IL')}</span>
                      {p.stageLabel && <span>🔨 {p.stageLabel}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => setSelectedPreview(p.url)}
                      style={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        color: 'var(--text2)',
                        borderRadius: 8,
                        padding: '6px 10px',
                        fontSize: 12,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                      title="הגדל תמונה"
                    >
                      <Icon n="zoom-in" s={14} />
                      <span>צפה</span>
                    </button>

                    {isOwner && (
                      <>
                        {p.isCover ? (
                          <Btn
                            size="sm"
                            variant="outline"
                            onClick={handleRemoveCover}
                            style={{ color: 'var(--text3)' }}
                            title="בטל קיבוע כתמונת שער"
                          >
                            הסר קיבוע
                          </Btn>
                        ) : (
                          <Btn size="sm" variant="secondary" onClick={() => handleSetCover(p._id)}>
                            קבע כשער
                          </Btn>
                        )}

                        {/* Delete Photo Button */}
                        <button
                          onClick={() => setPhotoToDelete(p._id)}
                          title="מחק תמונה זו"
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            color: 'var(--danger)',
                            borderRadius: 8,
                            width: 30,
                            height: 30,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          <Icon n="trash" s={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Enlarged Photo Preview Lightbox */}
      {selectedPreview && (
        <Modal title="תצוגת תמונה" onClose={() => setSelectedPreview(null)} width={800}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <img
              src={selectedPreview}
              alt="הגדלת תמונה"
              style={{
                width: '100%',
                maxHeight: '75vh',
                objectFit: 'contain',
                borderRadius: 12,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
              <Btn size="sm" onClick={() => setSelectedPreview(null)}>
                סגור
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Photo Deletion Dialog */}
      {photoToDelete && (
        <ConfirmDialog
          title="מחיקת תמונת התקדמות"
          message="האם אתה בטוח שברצונך למחוק תמונה זו? התמונה תימחק לצמיתות מהמערכת."
          confirmText="מחק תמונה"
          cancelText="ביטול"
          loading={deleting}
          onConfirm={confirmDeletePhoto}
          onClose={() => setPhotoToDelete(null)}
        />
      )}

      {/* Feedback Toast/Modal */}
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
