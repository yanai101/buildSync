import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Icon } from './Shared';

export interface GalleryImage {
  id?: string;
  url: string;
  title?: string;
  description?: string;
  groupName?: string;
}

const ZoomableSlide = ({ img, index }: { img: GalleryImage; index: number }) => {
  const [scale, setScale] = useState(1);
  return (
    <div className="gallery-slide">
      <TransformWrapper 
        initialScale={1}
        minScale={1}
        maxScale={8}
        doubleClick={{ step: 2 }}
        wheel={{ step: 0.2 }}
        onTransform={(ref: any) => setScale(ref.state.scale)}
        panning={{ disabled: scale <= 1 }}
      >
        <TransformComponent wrapperStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img 
            src={img.url} 
            alt={img.title || `Image ${index + 1}`} 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
};

interface ImageGalleryViewerProps {
  images: GalleryImage[];
  initialIndex?: number;
  onClose: () => void;
  onSaveNote?: (imageIndex: number, newNote: string, imageId?: string) => Promise<void> | void;
}

export const ImageGalleryViewer: React.FC<ImageGalleryViewerProps> = ({
  images: initialImages,
  initialIndex = 0,
  onClose,
  onSaveNote,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imagesList, setImagesList] = useState<GalleryImage[]>(initialImages);

  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editedNoteText, setEditedNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  useEffect(() => {
    setImagesList(initialImages);
  }, [initialImages]);

  // Reset editing mode when navigating slides
  useEffect(() => {
    setIsEditingNote(false);
    setEditedNoteText(imagesList[currentIndex]?.description || '');
  }, [currentIndex, imagesList]);

  // Initialize scroll position
  useEffect(() => {
    if (containerRef.current) {
      setTimeout(() => {
        if (containerRef.current) {
          const slide = containerRef.current.children[initialIndex] as HTMLElement;
          if (slide) {
             slide.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'center' });
          }
        }
      }, 50);
    }
  }, [initialIndex]);

  // Handle scroll to update current index indicator
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    
    let closestIndex = 0;
    let closestDistance = Infinity;
    
    const containerCenter = container.getBoundingClientRect().left + container.offsetWidth / 2;
    
    Array.from(container.children).forEach((child, index) => {
      const rect = child.getBoundingClientRect();
      const childCenter = rect.left + rect.width / 2;
      const distance = Math.abs(containerCenter - childCenter);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    if (closestIndex !== currentIndex) {
      setCurrentIndex(closestIndex);
    }
  }, [currentIndex]);

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex < imagesList.length - 1 && containerRef.current) {
      const slide = containerRef.current.children[currentIndex + 1] as HTMLElement;
      slide?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0 && containerRef.current) {
      const slide = containerRef.current.children[currentIndex - 1] as HTMLElement;
      slide?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  const handleSaveEditedNote = async () => {
    const cur = imagesList[currentIndex];
    if (!cur) return;
    setIsSavingNote(true);
    try {
      if (onSaveNote) {
        await onSaveNote(currentIndex, editedNoteText.trim(), cur.id);
      }
      setImagesList(prev => prev.map((item, i) => i === currentIndex ? { ...item, description: editedNoteText.trim() } : item));
      setIsEditingNote(false);
    } catch {
      // keep editing state on error
    } finally {
      setIsSavingNote(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditingNote) {
          setIsEditingNote(false);
        } else {
          onClose();
        }
      }
      if (isEditingNote) return; // Don't navigate while typing note
      if (e.key === 'ArrowLeft') {
        if (currentIndex < imagesList.length - 1 && containerRef.current) {
          const slide = containerRef.current.children[currentIndex + 1] as HTMLElement;
          slide?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
      if (e.key === 'ArrowRight') {
        if (currentIndex > 0 && containerRef.current) {
          const slide = containerRef.current.children[currentIndex - 1] as HTMLElement;
          slide?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, imagesList.length, isEditingNote, onClose]);

  if (!imagesList || imagesList.length === 0) return null;

  const currentImage = imagesList[currentIndex];

  return (
    <AnimatePresence>
      <motion.div
        className="gallery-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* Top Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', zIndex: 10 }}>
          <div style={{ color: 'white', fontSize: 15, fontWeight: 600, background: 'rgba(0,0,0,0.55)', padding: '6px 14px', borderRadius: 20, backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{currentIndex + 1} / {imagesList.length}</span>
            {currentImage?.groupName && (
              <span style={{ opacity: 0.8, fontSize: 13, borderRight: '1px solid rgba(255,255,255,0.3)', paddingRight: 8 }}>
                📁 {currentImage.groupName}
              </span>
            )}
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', 
              width: 40, height: 40, borderRadius: '50%', cursor: 'pointer', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(6px)', transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            title="סגור (Esc)"
          >
            <Icon n="x" s={20} />
          </button>
        </div>

        {/* Desktop Navigation Buttons */}
        {imagesList.length > 1 && (
          <>
            {currentIndex < imagesList.length - 1 && (
              <button className="gallery-nav-btn gallery-nav-btn-left" onClick={handleNext}>
                <div style={{ transform: 'rotate(180deg)', display: 'flex' }}><Icon n="arrow-right" s={24} /></div>
              </button>
            )}
            {currentIndex > 0 && (
              <button className="gallery-nav-btn gallery-nav-btn-right" onClick={handlePrev}>
                <Icon n="arrow-right" s={24} />
              </button>
            )}
          </>
        )}

        {/* Scrollable Container */}
        <div 
          className="gallery-container" 
          ref={containerRef}
          onScroll={handleScroll}
        >
          {imagesList.map((img, index) => (
            <ZoomableSlide key={index} img={img} index={index} />
          ))}
        </div>

        {/* Bottom Panel (Note display & in-viewer editor) */}
        <div 
          style={{ 
            position: 'absolute', 
            bottom: 24, 
            left: '50%', 
            transform: 'translateX(-50%)', 
            background: 'rgba(15, 23, 42, 0.85)', 
            padding: '16px 20px', 
            borderRadius: 16, 
            color: 'white', 
            backdropFilter: 'blur(12px)', 
            boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.15)',
            minWidth: 280, 
            maxWidth: 'min(92vw, 560px)', 
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }} 
          onClick={(e) => e.stopPropagation()}
        >
          {isEditingNote ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
                  עריכת הערה לתמונה
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                  {currentImage?.title}
                </span>
              </div>
              <textarea
                value={editedNoteText}
                onChange={(e) => setEditedNoteText(e.target.value)}
                placeholder="הוסף הערה או תיאור לתמונה זו..."
                rows={3}
                autoFocus
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  borderRadius: 8,
                  color: '#fff',
                  padding: '8px 10px',
                  fontSize: 13,
                  fontFamily: "'Heebo',sans-serif",
                  resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 2 }}>
                <button
                  type="button"
                  onClick={() => setIsEditingNote(false)}
                  disabled={isSavingNote}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.3)',
                    color: 'white',
                    borderRadius: 6,
                    padding: '5px 12px',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  ביטול
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditedNote}
                  disabled={isSavingNote}
                  style={{
                    background: 'var(--accent, #EB5E28)',
                    border: 'none',
                    color: 'white',
                    borderRadius: 6,
                    padding: '5px 14px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {isSavingNote ? <Icon n="loader" s={14} className="spin" /> : <Icon n="check" s={14} />}
                  <span>שמור הערה</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {currentImage?.title && (
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {currentImage.title}
                    </div>
                  )}
                </div>
                {onSaveNote && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditedNoteText(currentImage?.description || '');
                      setIsEditingNote(true);
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.12)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: 'white',
                      borderRadius: 6,
                      padding: '4px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      flexShrink: 0,
                      backdropFilter: 'blur(4px)',
                      transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                  >
                    <Icon n="edit-3" s={13} />
                    <span>{currentImage?.description ? 'ערוך הערה' : '+ הוסף הערה'}</span>
                  </button>
                )}
              </div>

              {currentImage?.description ? (
                <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'rgba(255,255,255,0.92)', whiteSpace: 'pre-wrap', maxHeight: '18vh', overflowY: 'auto', paddingRight: 2 }}>
                  {currentImage.description}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
                  אין הערה לתמונה זו
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
