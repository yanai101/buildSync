import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Icon } from './Shared';

export interface GalleryImage {
  url: string;
  title?: string;
  description?: string;
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
}

export const ImageGalleryViewer: React.FC<ImageGalleryViewerProps> = ({
  images,
  initialIndex = 0,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Initialize scroll position
  useEffect(() => {
    if (containerRef.current) {
      // Small timeout ensures the DOM is fully rendered before scrolling
      setTimeout(() => {
        if (containerRef.current) {
          const containerWidth = containerRef.current.clientWidth;
          // Calculate the correct scroll position. RTL means scrolling is negative or reversed in some browsers,
          // but flex row typically handles it. We'll use scrollTo.
          // Note: In RTL environments, scroll position logic can vary by browser.
          // Usually, the first item is at scrollLeft = 0.
          // Since direction is rtl, scrolling right might be negative. Let's just scroll to the specific element.
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
    
    // Calculate which slide is most visible
    // In RTL, scrollLeft can be negative in some browsers. We can find the element closest to the center.
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
    if (currentIndex < images.length - 1 && containerRef.current) {
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      // Arrow navigation (consider RTL: ArrowRight usually means prev, ArrowLeft means next in Hebrew)
      if (e.key === 'ArrowLeft') {
        if (currentIndex < images.length - 1 && containerRef.current) {
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
  }, [currentIndex, images.length, onClose]);

  if (!images || images.length === 0) return null;

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
          <div style={{ color: 'white', fontSize: 16, fontWeight: 600, background: 'rgba(0,0,0,0.5)', padding: '6px 12px', borderRadius: 20, backdropFilter: 'blur(4px)' }}>
            {currentIndex + 1} / {images.length}
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', 
              width: 40, height: 40, borderRadius: '50%', cursor: 'pointer', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(4px)', transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <Icon n="x" s={20} />
          </button>
        </div>

        {/* Desktop Navigation Buttons */}
        {images.length > 1 && (
          <>
            {currentIndex < images.length - 1 && (
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
          {images.map((img, index) => (
            <ZoomableSlide key={index} img={img} index={index} />
          ))}
        </div>

        {/* Bottom Text Overlay */}
        {(images[currentIndex]?.title || images[currentIndex]?.description) && (
          <div style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', padding: '16px 24px', borderRadius: 16, color: 'white', textAlign: 'center', backdropFilter: 'blur(8px)', minWidth: 250, maxWidth: '90%', zIndex: 10 }} onClick={(e) => e.stopPropagation()}>
            {images[currentIndex].title && <div style={{ fontWeight: 700, fontSize: 16, marginBottom: images[currentIndex].description ? 6 : 0 }}>{images[currentIndex].title}</div>}
            {images[currentIndex].description && <div style={{ fontSize: 14, whiteSpace: 'pre-wrap', color: 'rgba(255,255,255,0.9)' }}>{images[currentIndex].description}</div>}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
