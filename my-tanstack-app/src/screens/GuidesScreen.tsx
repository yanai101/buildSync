import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon, ProgressBar, Btn, PageBackground } from '../components/Shared';
import { ScreenBoundary } from '../components/ScreenBoundary';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export interface Guide {
  _id?: string;
  id?: string;
  title: string;
  videoUrl: string;
  duration?: string;
  description: string;
  topics?: string[];
  tips?: string[];
  faqs?: { q: string; a: string }[];
}
export const GuidesScreen = () => {
  const dbGuides = useQuery(api.guides.get);
  const guidesToUse: Guide[] = (dbGuides as unknown as Guide[]) || [];
  
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [watchedVideos, setWatchedVideos] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'topics' | 'tips' | 'faq'>('topics');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Load watched status from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('buildsync:watched-guides');
      if (saved) {
        setWatchedVideos(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load watched status', e);
    }
  }, []);

  // Set initial guide when data loads
  useEffect(() => {
    if (guidesToUse.length > 0 && !selectedGuide) {
      setSelectedGuide(guidesToUse[0]);
    }
  }, [guidesToUse, selectedGuide]);

  // Save watched status to localStorage
  const toggleWatched = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent changing active guide when checking the box
    const nextWatched = watchedVideos.includes(id)
      ? watchedVideos.filter((v) => v !== id)
      : [...watchedVideos, id];
    
    setWatchedVideos(nextWatched);
    try {
      localStorage.setItem('buildsync:watched-guides', JSON.stringify(nextWatched));
    } catch (e) {
      console.error('Failed to save watched status', e);
    }
  };

  // Change video selection
  const selectGuide = (guide: Guide) => {
    setSelectedGuide(guide);
    setIsPlaying(false);
    setExpandedFaq(null);
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  const handlePlayToggle = () => {
    if (selectedGuide?.videoUrl?.includes('youtube.com') || selectedGuide?.videoUrl?.includes('youtu.be')) {
      setIsPlaying(true);
      return;
    }
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(err => console.log('Video play error', err));
      }
      setIsPlaying(!isPlaying);
    }
  };

  if (dbGuides === undefined) {
    return <ScreenBoundary loading={true} error={null}><div style={{ padding: 40, textAlign: 'center' }}>טוען הדרכות...</div></ScreenBoundary>;
  }

  if (dbGuides.length === 0) {
    return (
      <ScreenBoundary 
        loading={false} 
        error={null} 
        isEmpty={true} 
        emptyTitle="אין מדריכים זמינים" 
        emptyDesc="כרגע לא קיימים סרטוני הדרכה במערכת." 
        emptyIcon="video"
      >
        <div/>
      </ScreenBoundary>
    );
  }

  if (!selectedGuide) {
    return <ScreenBoundary loading={true} error={null}><div style={{ padding: 40, textAlign: 'center' }}>טוען הדרכות...</div></ScreenBoundary>;
  }

  const completionPct = Math.round((watchedVideos.length / guidesToUse.length) * 100);

  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };
  const isYouTube = selectedGuide?.videoUrl?.includes('youtube.com') || selectedGuide?.videoUrl?.includes('youtu.be');
  const youtubeId = isYouTube && selectedGuide?.videoUrl ? getYouTubeId(selectedGuide.videoUrl) : null;

  return (
    <ScreenBoundary loading={false} error={null}>
      <div className="page-content" style={{ paddingBottom: '100px' }}>
        <style dangerouslySetInnerHTML={{ __html: `
          .guides-grid {
            display: grid;
            grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
            gap: 24px;
          }
          .guides-tabs {
            display: flex;
            border-bottom: 1px solid var(--border);
            background: rgba(249,250,251,0.5);
          }
          .guides-tab-btn {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 16px;
            border: none;
            cursor: pointer;
            font-family: inherit;
            transition: all 0.2s;
            position: relative;
          }
          .guides-playlist {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          
          @media (max-width: 992px) {
            .guides-grid {
              grid-template-columns: 1fr;
              gap: 20px;
            }
            .guides-playlist {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
            }
          }
          
          @media (max-width: 600px) {
            .guides-tabs {
              overflow-x: auto;
              white-space: nowrap;
              justify-content: flex-start;
              -webkit-overflow-scrolling: touch;
            }
            .guides-tab-btn {
              flex: 0 0 auto;
              padding: 12px 16px;
              font-size: 12.5px;
            }
            .guides-playlist {
              grid-template-columns: 1fr;
            }
          }
        `}} />
        
        {/* Header Grid */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon n="video" s={20} />
              </div>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>מרכז הדרכה דיגיטלי</h1>
                <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>
                  כל הכלים והסרטונים שיעזרו לכם לנהל את הבנייה שלכם בראש שקט
                </div>
              </div>
            </div>
          </div>

          {/* Quick Progress Badge */}
          <div className="card" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>השלמת הדרכות</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text1)', marginTop: 2 }}>
                {watchedVideos.length} מתוך {guidesToUse.length} מדריכים ({completionPct || 0}%)
              </div>
            </div>
            <div style={{ width: 80 }}>
              <ProgressBar value={completionPct} color="var(--success)" height={8} />
            </div>
          </div>
        </div>

        {/* Main Grid Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          <div className="guides-grid">
            
            {/* Left Column: Player & Meta */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Cinematic Video Container */}
              <div 
                className="card" 
                style={{ 
                  borderRadius: 20, 
                  overflow: 'hidden', 
                  background: '#0B0B0C', 
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                  position: 'relative',
                  transform: 'translateZ(0)'
                }}
              >
                <div 
                  className="guide-video-container"
                  style={{
                    borderRadius: 16,
                    overflow: 'hidden',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                    background: '#000',
                    position: 'relative',
                    width: '100%',
                    paddingBottom: '56.25%',
                    transform: 'translateZ(0)',
                    WebkitTransform: 'translateZ(0)'
                  }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
                    {isYouTube && youtubeId ? (
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${youtubeId}?autoplay=${isPlaying ? 1 : 0}`}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: 16 }}
                      ></iframe>
                    ) : (
                      <video 
                        ref={videoRef}
                        src={selectedGuide.videoUrl} 
                        controls
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        style={{ 
                          position: 'absolute', 
                          top: 0, 
                          left: 0, 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'contain',
                          borderRadius: 16
                        }} 
                      />
                    )}
                  </div>

                  {/* Play Overlay if not playing */}
                  <AnimatePresence>
                    {!isPlaying && (
                      <motion.div 
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handlePlayToggle}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(0,0,0,0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          zIndex: 5
                        }}
                      >
                        <motion.div 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          style={{
                            width: 72,
                            height: 72,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--accent) 0%, #c96b30 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            boxShadow: '0 10px 24px rgba(224,122,56,0.5)',
                            border: '2px solid rgba(255,255,255,0.2)'
                          }}
                        >
                          <div style={{ transform: 'translateX(-2px)' }}>
                            <Icon n="play" s={30} c="#fff" />
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Active Video Details */}
              <div className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text1)' }}>{selectedGuide.title}</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                      <span className="badge badge-active" style={{ fontSize: 11 }}>
                        <Icon n="clock" s={12} c="#92400E" />
                        <span style={{ marginRight: 4 }}>{selectedGuide.duration}</span>
                      </span>
                      {watchedVideos.includes(selectedGuide._id || selectedGuide.id || '') && (
                        <span className="badge badge-done" style={{ fontSize: 11 }}>
                          <Icon n="check-circle" s={12} c="#065F46" />
                          <span style={{ marginRight: 4 }}>נצפה בהצלחה</span>
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <Btn 
                    variant={watchedVideos.includes(selectedGuide._id || selectedGuide.id || '') ? 'ghost' : 'primary'}
                    onClick={(e: React.MouseEvent) => toggleWatched(selectedGuide._id || selectedGuide.id || '', e)}
                    style={{ borderRadius: 10, padding: '8px 16px' }}
                  >
                    <Icon n={watchedVideos.includes(selectedGuide._id || selectedGuide.id || '') ? 'x' : 'check'} s={14} />
                    <span>{watchedVideos.includes(selectedGuide._id || selectedGuide.id || '') ? 'בטל סימון כנצפה' : 'סמן כנצפה'}</span>
                  </Btn>
                </div>

                <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6, marginTop: 16, whiteSpace: 'pre-wrap' }}>
                  {selectedGuide.description}
                </p>
              </div>

              {/* Tabs Section */}
              <div className="card" style={{ overflow: 'hidden' }}>
                <div className="guides-tabs">
                  {([
                    { id: 'topics', label: 'נושאי המדריך', icon: 'clipboard' },
                    { id: 'tips', label: 'טיפים מקצועיים', icon: 'wand' },
                    { id: 'faq', label: 'שאלות ותשובות', icon: 'message' },
                  ] as const).map((tab) => {
                    const isCurrent = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className="guides-tab-btn"
                        style={{
                          background: isCurrent ? 'var(--surface)' : 'transparent',
                          color: isCurrent ? 'var(--accent)' : 'var(--text2)',
                          fontWeight: isCurrent ? 700 : 500,
                          borderBottom: isCurrent ? '2px solid var(--accent)' : '2px solid transparent',
                        }}
                      >
                        <Icon n={tab.icon} s={16} c={isCurrent ? 'var(--accent)' : 'var(--text3)'} />
                        {tab.label}
                        {isCurrent && (
                          <motion.div 
                            layoutId="activeTabIndicator" 
                            style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, background: 'var(--accent)' }} 
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div style={{ padding: 24 }}>
                  <AnimatePresence mode="wait">
                    {activeTab === 'topics' && (
                      <motion.div
                        key="topics"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                      >
                        <div style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 600, marginBottom: 4 }}>בסרטון זה נעבור על הנושאים הבאים:</div>
                        {(selectedGuide.topics || []).map((topic, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg)', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)' }}>
                            <Icon n="check-circle" s={16} c="var(--success)" />
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>{topic}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}

                    {activeTab === 'tips' && (
                      <motion.div
                        key="tips"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                      >
                        {(selectedGuide.tips || []).map((tip, i) => (
                          <div 
                            key={i} 
                            style={{ 
                              background: 'var(--accent-light)', 
                              borderRight: '4px solid var(--accent)', 
                              padding: 16, 
                              borderRadius: '0 12px 12px 0',
                              boxShadow: 'var(--shadow-sm)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <Icon n="wand" s={16} c="var(--accent)" />
                              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase' }}>טיפ של מומחים # {i + 1}</span>
                            </div>
                            <p style={{ fontSize: 13, color: 'var(--text1)', lineHeight: 1.6, margin: 0, fontWeight: 500 }}>{tip}</p>
                          </div>
                        ))}
                      </motion.div>
                    )}

                    {activeTab === 'faq' && (
                      <motion.div
                        key="faq"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                      >
                        {(selectedGuide.faqs || []).map((faq, i) => {
                          const isExpanded = expandedFaq === i;
                          return (
                            <div 
                              key={i} 
                              style={{ 
                                border: '1px solid var(--border)', 
                                borderRadius: 12, 
                                overflow: 'hidden',
                                background: isExpanded ? 'rgba(249,250,251,0.3)' : 'var(--surface)',
                                transition: 'all 0.2s'
                              }}
                            >
                              <button
                                onClick={() => setExpandedFaq(isExpanded ? null : i)}
                                style={{
                                  width: '100%',
                                  padding: '16px 20px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  textAlign: 'right',
                                  fontFamily: 'inherit',
                                  fontWeight: 700,
                                  fontSize: 13.5,
                                  color: isExpanded ? 'var(--accent)' : 'var(--text1)',
                                }}
                              >
                                <span>{faq.q}</span>
                                <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                                  <Icon n="chevron-down" s={16} c={isExpanded ? 'var(--accent)' : 'var(--text3)'} />
                                </motion.div>
                              </button>
                              
                              <AnimatePresence initial={false}>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    style={{ overflow: 'hidden' }}
                                  >
                                    <div style={{ padding: '0 20px 20px', fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, borderTop: '1px solid var(--border)', paddingTop: 16, whiteSpace: 'pre-wrap' }}>
                                      {faq.a}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

            </div>

            {/* Right Column: Playlist Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Guides List Card */}
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                  <Icon n="layers" s={18} c="var(--accent)" />
                  <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>סרטוני הדרכה זמינים</h3>
                </div>

                <div className="guides-playlist">
                  {guidesToUse.map((guide, idx) => {
                    const guideId = guide._id || guide.id || String(idx);
                    const isActive = (selectedGuide._id && guide._id) ? selectedGuide._id === guide._id : selectedGuide.id === guide.id;
                    const isWatched = watchedVideos.includes(guideId);
                    return (
                      <motion.div
                        key={guideId}
                        whileHover={{ y: -2, boxShadow: 'var(--shadow)' }}
                        onClick={() => selectGuide(guide)}
                        style={{
                          padding: 16,
                          borderRadius: 14,
                          border: isActive ? '1px solid var(--accent)' : '1px solid var(--border)',
                          background: isActive ? 'var(--accent-light)' : 'var(--surface)',
                          cursor: 'pointer',
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                          transition: 'border-color 0.2s, background-color 0.2s'
                        }}
                      >
                        {/* Play Indicator / Checked status */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span 
                              onClick={(e) => toggleWatched(guideId, e)}
                              style={{ 
                                width: 22, 
                                height: 22, 
                                borderRadius: 6, 
                                border: isWatched ? 'none' : '1.5px solid var(--border)',
                                background: isWatched ? 'var(--success)' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              {isWatched && <Icon n="check" s={14} c="#fff" />}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700 }}>
                              מדריך {idx + 1}
                            </span>
                          </div>

                          <span className="badge badge-pending" style={{ fontSize: 10, padding: '2px 8px' }}>
                            {guide.duration || 'לא צוין'}
                          </span>
                        </div>

                        {/* Title */}
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: isActive ? 'var(--accent)' : 'var(--text1)', lineHeight: 1.4 }}>
                          {guide.title ? guide.title.replace('מדריך ' + (idx + 1) + ': ', '') : 'ללא כותרת'}
                        </div>

                        {/* Hover Overlay Visual indicator */}
                        {isActive && (
                          <div style={{ 
                            position: 'absolute', 
                            left: 12, 
                            bottom: 12, 
                            width: 28, 
                            height: 28, 
                            borderRadius: '50%', 
                            background: 'var(--accent)', 
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: 'var(--shadow-sm)'
                          }}>
                            <Icon n="play" s={12} c="#fff" />
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Extra Support Card */}
              <div 
                className="card" 
                style={{ 
                  padding: 24, 
                  background: 'linear-gradient(135deg, rgba(224,122,56,0.06) 0%, rgba(245,158,11,0.02) 100%)', 
                  border: '1px solid rgba(224,122,56,0.12)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center'
                }}
              >
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <Icon n="message" s={20} />
                </div>
                <h4 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: 'var(--text1)' }}>עדיין צריכים עזרה?</h4>
                <p style={{ fontSize: 12, color: 'var(--text2)', margin: '8px 0 16px', lineHeight: 1.5 }}>
                  צוות התמיכה המקצועי שלנו זמין עבורכם לכל שאלה, תקלה או בקשת הדרכה אישית בשטח.
                </p>
                <Btn 
                  variant="ghost" 
                  onClick={() => window.location.href = 'mailto:support@buildsync.co.il'}
                  style={{ width: '100%', justifyContent: 'center', fontSize: 12, padding: '8px 12px' }}
                >
                  <Icon n="mail" s={12} />
                  <span>צרו קשר עם התמיכה</span>
                </Btn>
              </div>

            </div>

          </div>

        </div>

      </div>
    </ScreenBoundary>
  );
};
