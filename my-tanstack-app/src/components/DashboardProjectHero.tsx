import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Icon, ProgressBar, Btn, FeedbackModal } from './Shared';
import { ProgressTimelineModal } from './ProgressTimelineModal';
import { useProjectFileUploader } from '../hooks/useProjectFileUploader';
import { useRequireRole } from '../hooks/useRequireRole';

interface DashboardProjectHeroProps {
  project: {
    _id: Id<'projects'>;
    name: string;
    address: string;
    progressPct: number;
    currentStageName?: string;
    coverPhoto?: {
      _id: Id<'photos'>;
      url: string;
      label?: string;
      stageLabel?: string;
      takenOn?: string;
    } | null;
    progressPhotosCount?: number;
  };
}

const COLLAPSED_STORAGE_KEY = 'buildsync:dashboard_hero_collapsed';

export const DashboardProjectHero: React.FC<DashboardProjectHeroProps> = ({ project }) => {
  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  };

  const { allowed: isOwner } = useRequireRole(['owner']);

  const [showTimelineModal, setShowTimelineModal] = React.useState(false);
  const [currentPhotoIdx, setCurrentPhotoIdx] = React.useState<number | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ title: string; message: string; type: 'success' | 'error' } | null>(null);

  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const uploadProjectFile = useProjectFileUploader();
  const uploadHeroProgressPhoto = useMutation(api.photos.uploadHeroProgressPhoto);
  const setCoverPhoto = useMutation(api.projects.setCoverPhoto);

  // Fetch full progress photos only for carousel if user browses
  const timelinePhotos = useQuery(api.photos.getProgressPhotos, { projectId: project._id });

  // Only display a photo if the project explicitly has a coverPhoto, or if user explicitly chose one
  const hasCoverPhoto = !!project.coverPhoto;

  const activePhoto = React.useMemo(() => {
    if (!hasCoverPhoto) return null;
    if (currentPhotoIdx !== null && timelinePhotos && timelinePhotos.length > 0) {
      const safeIdx = Math.max(0, Math.min(currentPhotoIdx, timelinePhotos.length - 1));
      return timelinePhotos[safeIdx];
    }
    return project.coverPhoto;
  }, [hasCoverPhoto, currentPhotoIdx, timelinePhotos, project.coverPhoto]);

  const totalPhotosCount = timelinePhotos?.length ?? (project.coverPhoto ? 1 : 0);

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!timelinePhotos || timelinePhotos.length <= 1) return;
    const current = currentPhotoIdx ?? timelinePhotos.findIndex((p) => p._id === project.coverPhoto?._id);
    const prev = current > 0 ? current - 1 : timelinePhotos.length - 1;
    setCurrentPhotoIdx(prev);
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!timelinePhotos || timelinePhotos.length <= 1) return;
    const current = currentPhotoIdx ?? timelinePhotos.findIndex((p) => p._id === project.coverPhoto?._id);
    const next = current < timelinePhotos.length - 1 ? current + 1 : 0;
    setCurrentPhotoIdx(next);
  };

  const handleRemoveCover = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await setCoverPhoto({ projectId: project._id });
      setCurrentPhotoIdx(null);
      setFeedback({
        title: 'תמונת שער הוסרה',
        message: 'הדאשבורד חזר להציג את האייקון הרגיל.',
        type: 'success',
      });
    } catch (err: any) {
      setFeedback({
        title: 'שגיאה',
        message: err.message || 'אירעה שגיאה בעת הסרת תמונת השער',
        type: 'error',
      });
    }
  };

  const isCurrentPhotoCover = activePhoto?._id === project.coverPhoto?._id;

  const handlePinCurrentPhoto = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activePhoto?._id) return;
    try {
      await setCoverPhoto({ projectId: project._id, photoId: activePhoto._id as any });
      setFeedback({
        title: 'תמונת שער קובעה בהצלחה',
        message: 'התמונה שבחרת קובעה כתמונת השער הקבועה של הפרויקט.',
        type: 'success',
      });
    } catch (err: any) {
      setFeedback({
        title: 'שגיאה',
        message: err.message || 'אירעה שגיאה בעת קיבוע תמונת השער',
        type: 'error',
      });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const { fileId } = await uploadProjectFile({
        projectId: project._id,
        file,
        usage: 'photo',
        kind: 'image',
      });

      const label = project.currentStageName
        ? `התקדמות - ${project.currentStageName}`
        : 'תמונת שער';

      await uploadHeroProgressPhoto({
        projectId: project._id,
        projectFileId: fileId,
        label,
        stageLabel: project.currentStageName,
        setAsCover: true,
      });

      setFeedback({
        title: 'תמונה הועלתה בהצלחה',
        message: 'התמונה נקבעה כתמונת השער של הפרויקט.',
        type: 'success',
      });
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

  return (
    <>
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

      <div style={{ marginBottom: 24 }}>
        {!hasCoverPhoto ? (
          /* ── DEFAULT VIEW: CLASSIC OLD ICON (NO PHOTO SET BY USER) ── */
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* The classic 52x52 home icon box with pencil badge */}
              <div
                onClick={() => setShowTimelineModal(true)}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, var(--accent-light) 0%, var(--accent-glow-sm) 100%)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1.5px solid var(--accent-glow-sm)',
                  boxShadow: '0 4px 16px var(--accent-glow-sm)',
                  flexShrink: 0,
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease',
                }}
                title="לחץ להוספת תמונת בית או לצפייה ביומן ההתקדמות"
              >
                <Icon n="home" s={24} />

                {/* Subtle pencil edit badge */}
                {isOwner && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: -3,
                      left: -3,
                      background: 'var(--accent)',
                      color: '#fff',
                      borderRadius: '50%',
                      width: 20,
                      height: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                      border: '2px solid var(--surface)',
                    }}
                    title="ערוך / הוסף תמונת בית"
                  >
                    <Icon n="edit" s={11} />
                  </div>
                )}
              </div>

              <div>
                <h1
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    margin: 0,
                    letterSpacing: '-0.4px',
                    lineHeight: 1.2,
                    color: 'var(--text1)',
                  }}
                >
                  {project.name}
                </h1>
                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--text3)',
                    marginTop: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Icon n="layers" s={12} c="var(--text3)" />
                  <span>{project.address}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* ── USER HAS EXPLICITLY SET A COVER PHOTO ── */
          <AnimatePresence mode="wait">
            {isCollapsed ? (
              /* ── COMPACT SMART THUMBNAIL (52x52 with house photo) ── */
              <motion.div
                key="collapsed-header"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'var(--surface)',
                  borderRadius: 16,
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-sm)',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    onClick={() => setShowTimelineModal(true)}
                    title="לחץ לעריכה או צפייה ביומן ההתקדמות"
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 16,
                      position: 'relative',
                      overflow: 'visible',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: 16,
                        overflow: 'hidden',
                        background: '#111',
                        border: '1.5px solid var(--accent-glow-sm)',
                        boxShadow: '0 4px 14px var(--accent-glow-sm)',
                      }}
                    >
                      <img
                        src={activePhoto?.url}
                        alt={project.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>

                    {/* Subtle pencil edit badge */}
                    {isOwner && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: -3,
                          left: -3,
                          background: 'var(--accent)',
                          color: '#fff',
                          borderRadius: '50%',
                          width: 20,
                          height: 20,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                          border: '2px solid var(--surface)',
                          zIndex: 2,
                        }}
                        title="ערוך תמונת שער"
                      >
                        <Icon n="edit" s={11} />
                      </div>
                    )}
                  </div>

                  <div>
                    <h1
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        margin: 0,
                        letterSpacing: '-0.3px',
                        lineHeight: 1.2,
                        color: 'var(--text1)',
                      }}
                    >
                      {project.name}
                    </h1>
                    <div
                      style={{
                        fontSize: 13,
                        color: 'var(--text3)',
                        marginTop: 3,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Icon n="layers" s={12} c="var(--text3)" />
                      <span>{project.address}</span>
                      <span style={{ margin: '0 4px', opacity: 0.5 }}>·</span>
                      <span style={{ color: 'var(--accent)', fontWeight: 700 }}>
                        {project.progressPct}% התקדמות
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={toggleCollapsed}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      color: 'var(--text2)',
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    title="הרחב לכרטיס שער מלא"
                  >
                    <Icon n="chevron-down" s={16} />
                  </button>
                </div>
              </motion.div>
            ) : (
              /* ── EXPANDED HERO CARD (MOCKUP STYLE) ── */
              <motion.div
                key="expanded-hero"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                style={{
                  background: 'var(--surface)',
                  borderRadius: 20,
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow)',
                  overflow: 'hidden',
                }}
              >
                {/* Image Hero Area */}
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '16 / 9',
                    maxHeight: 220,
                    background: '#111',
                    overflow: 'hidden',
                    cursor: 'pointer',
                  }}
                  onClick={() => setShowTimelineModal(true)}
                >
                  <img
                    src={activePhoto?.url}
                    alt={project.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                    loading="eager"
                  />

                  {/* Gradient vignette */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 40%, rgba(0,0,0,0.45) 100%)',
                      pointerEvents: 'none',
                    }}
                  />

                  {/* Top overlay controls */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 12,
                      left: 12,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      pointerEvents: 'auto',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Stage and Date Badge */}
                    <div
                      style={{
                        background: 'rgba(0,0,0,0.65)',
                        backdropFilter: 'blur(8px)',
                        color: '#fff',
                        borderRadius: 20,
                        padding: '4px 10px',
                        fontSize: 11.5,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        border: '1px solid rgba(255,255,255,0.15)',
                      }}
                    >
                      <span>{activePhoto?.label || project.currentStageName || 'התקדמות'}</span>
                      {activePhoto?.takenOn && (
                        <span style={{ opacity: 0.8, fontSize: 10.5 }}>· {activePhoto.takenOn}</span>
                      )}
                    </div>

                    {/* Actions: Edit (Pencil) + Collapse */}
                    <div style={{ display: 'flex', gap: 6, marginRight: 'auto' }}>
                      {isOwner && (
                        <button
                          onClick={() => setShowTimelineModal(true)}
                          title="ערוך תמונת שער / פתח יומן התקדמות"
                          style={{
                            background: 'rgba(0,0,0,0.65)',
                            backdropFilter: 'blur(8px)',
                            color: '#fff',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '50%',
                            width: 28,
                            height: 28,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <Icon n="edit" s={13} />
                        </button>
                      )}
                      <button
                        onClick={toggleCollapsed}
                        title="כווץ לתצוגה קומפקטית"
                        style={{
                          background: 'rgba(0,0,0,0.65)',
                          backdropFilter: 'blur(8px)',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '50%',
                          width: 28,
                          height: 28,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <Icon n="chevron-down" s={14} />
                      </button>
                    </div>
                  </div>

                  {/* Carousel Chevrons (< and >) if multiple photos exist */}
                  {totalPhotosCount > 1 && (
                    <>
                      <button
                        onClick={handlePrevPhoto}
                        title="לתמונה הקודמת"
                        style={{
                          position: 'absolute',
                          right: 10,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'rgba(0,0,0,0.5)',
                          backdropFilter: 'blur(4px)',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '50%',
                          width: 32,
                          height: 32,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          zIndex: 2,
                        }}
                      >
                        <Icon n="chevron-right" s={16} />
                      </button>
                      <button
                        onClick={handleNextPhoto}
                        title="לתמונה הבאה"
                        style={{
                          position: 'absolute',
                          left: 10,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'rgba(0,0,0,0.5)',
                          backdropFilter: 'blur(4px)',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '50%',
                          width: 32,
                          height: 32,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          zIndex: 2,
                        }}
                      >
                        <Icon n="chevron-left" s={16} />
                      </button>

                      {/* Bottom counter pill */}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 8,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          background: 'rgba(0,0,0,0.65)',
                          backdropFilter: 'blur(6px)',
                          color: '#fff',
                          borderRadius: 12,
                          padding: '2px 8px',
                          fontSize: 10.5,
                          fontWeight: 700,
                          border: '1px solid rgba(255,255,255,0.15)',
                        }}
                      >
                        {(currentPhotoIdx !== null ? currentPhotoIdx : 0) + 1} מתוך {totalPhotosCount}
                      </div>
                    </>
                  )}
                </div>

                {/* Bottom Card Content: Title, Address, Progress Bar (Mockup style) */}
                <div style={{ padding: '16px 18px 18px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      marginBottom: 12,
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <div>
                      <h1
                        style={{
                          fontSize: 22,
                          fontWeight: 800,
                          margin: 0,
                          letterSpacing: '-0.4px',
                          lineHeight: 1.2,
                          color: 'var(--text1)',
                        }}
                      >
                        {project.name}
                      </h1>
                      <div
                        style={{
                          fontSize: 13,
                          color: 'var(--text3)',
                          marginTop: 4,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Icon n="layers" s={12} c="var(--text3)" />
                        <span>{project.address}</span>
                        {project.currentStageName && (
                          <>
                            <span style={{ margin: '0 4px', opacity: 0.5 }}>·</span>
                            <span>שלב: {project.currentStageName}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setShowTimelineModal(true)}
                      style={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        color: 'var(--accent)',
                        fontWeight: 700,
                        fontSize: 12,
                        padding: '6px 12px',
                        borderRadius: 10,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontFamily: 'inherit',
                      }}
                    >
                      <Icon n="image" s={14} c="var(--accent)" />
                      <span>יומן התקדמות ({totalPhotosCount})</span>
                    </button>
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 8,
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)' }}>
                        התקדמות הפרויקט
                      </span>
                      <span
                        style={{
                          fontSize: 22,
                          fontWeight: 800,
                          color: 'var(--accent)',
                          letterSpacing: '-0.5px',
                        }}
                      >
                        {project.progressPct}%
                      </span>
                    </div>
                    <ProgressBar value={project.progressPct} height={8} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Progress Timeline Modal */}
      {showTimelineModal && (
        <ProgressTimelineModal
          projectId={project._id}
          currentStageName={project.currentStageName}
          onClose={() => setShowTimelineModal(false)}
        />
      )}

      {/* Feedback Toast */}
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
