import { Bell, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Shown when this device had push enabled (permission still granted) but its
// subscription was lost and the browser won't let us restore it without a tap.
export function PushReenableBanner({ show, onReenable, onDismiss }: { show: boolean, onReenable: () => void, onDismiss: () => void }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{
            position: 'fixed',
            bottom: 'max(20px, calc(85px + env(safe-area-inset-bottom)))',
            insetInlineEnd: 24,
            zIndex: 1000,
            maxWidth: 380,
            width: 'calc(100vw - 48px)',
            background: 'var(--surface-elevated)',
            border: '1px solid var(--accent-glow-sm)',
            borderRadius: 20,
            padding: 16,
            boxShadow: 'var(--shadow-xl), 0 0 0 1px var(--accent-glow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            direction: 'rtl',
          }}
        >
          <div style={{ padding: 8, borderRadius: '50%', background: 'var(--accent-light)', color: 'var(--accent)', flexShrink: 0 }}>
            <Bell size={20} />
          </div>
          <div style={{ flex: 1, fontSize: 13, color: 'var(--text1)', lineHeight: 1.5 }}>
            ההתראות כובו בעקבות עדכון האפליקציה
          </div>
          <button
            onClick={onReenable}
            style={{ padding: '8px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
          >
            הפעל מחדש
          </button>
          <button
            onClick={onDismiss}
            aria-label="סגור"
            style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', padding: 4, flexShrink: 0 }}
          >
            <X size={18} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
