import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon, Btn } from './Shared'

export function WelcomeOnboardingModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'grid',
          placeItems: 'center',
          padding: 20
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          style={{
            background: 'var(--surface)',
            borderRadius: 24,
            width: '100%',
            maxWidth: 420,
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            direction: 'rtl'
          }}
        >
          {/* Icon + Title */}
          <div style={{ padding: '32px 28px 20px', textAlign: 'center' }}>
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: 24,
                background: 'linear-gradient(135deg, rgba(224,122,56,0.15), rgba(201,107,48,0.15))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px auto',
                boxShadow: '0 8px 20px rgba(224,122,56,0.15)',
                border: '1px solid rgba(224,122,56,0.2)',
                overflow: 'hidden'
              }}
            >
              <img src="/logo.svg" alt="BuildSync" style={{ width: 78, height: 78, objectFit: 'contain' }} />
            </div>

            <h2 style={{ margin: '0 0 10px 0', fontSize: 22, fontWeight: 800, color: 'var(--text1)', letterSpacing: '-0.4px' }}>
              ברוכים הבאים ל-BuildSync! 👋
            </h2>
            <p style={{ margin: 0, fontSize: 14.5, color: 'var(--text2)', lineHeight: 1.65, fontWeight: 500 }}>
              כדי להתחיל להשתמש במערכת, יש לפתוח פרויקט מרשימת הפרויקטים.
            </p>
          </div>

          {/* Info items */}
          <div style={{ padding: '0 24px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              background: 'var(--bg)', borderRadius: 14, padding: '12px 14px',
              border: '1px solid var(--border)'
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: 'rgba(224,122,56,0.12)', display: 'flex',
                alignItems: 'center', justifyContent: 'center'
              }}>
                <Icon n="folder" s={18} c="var(--accent)" />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text1)', marginBottom: 3 }}>פתיחת פרויקט</div>
                <div style={{ fontSize: 12.5, color: 'var(--text3)', lineHeight: 1.5 }}>
                  בחרו פרויקט קיים או צרו פרויקט חדש כדי להתחיל לעבוד
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              background: 'var(--bg)', borderRadius: 14, padding: '12px 14px',
              border: '1px solid var(--border)'
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: 'rgba(224,122,56,0.12)', display: 'flex',
                alignItems: 'center', justifyContent: 'center'
              }}>
                <Icon n="video" s={18} c="var(--accent)" />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text1)', marginBottom: 3 }}>מדריכי וידאו</div>
                <div style={{ fontSize: 12.5, color: 'var(--text3)', lineHeight: 1.5 }}>
                  מדריכי הוידאו זמינים באיזור האישי שלך בכל עת
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg)'
          }}>
            <Btn
              variant="primary"
              onClick={onClose}
              style={{ width: '100%', justifyContent: 'center', padding: '12px 20px', fontSize: 14.5, fontWeight: 700, borderRadius: 14 }}
            >
              הבנתי, בואו נתחיל <Icon n="arrow-left" s={16} style={{ marginRight: 6 }} />
            </Btn>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
