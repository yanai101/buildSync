import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon, Btn } from './Shared'

export function WelcomeOnboardingModal({ isOpen, onClose, onStartTour }: { isOpen: boolean, onClose: () => void, onStartTour: () => void }) {
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
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'grid',
          placeItems: 'center',
          padding: 20
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          style={{
            background: 'var(--surface)',
            borderRadius: 24,
            width: '100%',
            maxWidth: 480,
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ padding: '32px 32px 24px', textAlign: 'center' }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: '#4f46e515',
                color: '#4f46e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px auto',
                boxShadow: '0 0 40px #4f46e520'
              }}
            >
              <Icon n="home" s={40} />
            </div>
            <h2 style={{ margin: '0 0 12px 0', fontSize: 28, fontWeight: 800, color: 'var(--text1)' }}>
              ברוכים הבאים ל-BuildSync!
            </h2>
            <p style={{ margin: 0, fontSize: 16, color: 'var(--text2)', lineHeight: 1.6 }}>
              המערכת המובילה לניהול פרויקטי בנייה ושיפוצים. הכנו עבורכם סיור קצר שיציג את הכלים המרכזיים במערכת ויעזור לכם להתחיל לעבוד ביעילות.
            </p>
          </div>

          <div
            style={{
              padding: '20px 24px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg)'
            }}
          >
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text3)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                padding: '8px 12px'
              }}
            >
              דלג על הסיור
            </button>

            <Btn variant="primary" onClick={onStartTour} style={{ gap: 8 }}>
              בואו נתחיל בסיור <Icon n="arrow-left" s={16} />
            </Btn>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
