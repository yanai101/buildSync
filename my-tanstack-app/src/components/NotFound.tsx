import { Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { Icon, Btn } from './Shared';

export function NotFound({ children }: { children?: any }) {
  return (
    <div style={{ 
      minHeight: '80vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: 40,
      textAlign: 'center',
      background: 'radial-gradient(circle at top right, var(--accent-light) 0%, transparent 40%), radial-gradient(circle at bottom left, #fff7ed 0%, transparent 40%)'
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ position: 'relative', marginBottom: 40 }}
      >
        <div style={{ 
          fontSize: '12rem', 
          fontWeight: 900, 
          lineHeight: 1, 
          color: 'var(--border)', 
          opacity: 0.5,
          letterSpacing: '-8px'
        }}>
          404
        </div>
        <motion.div
          animate={{ 
            y: [0, -10, 0],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 4, 
            ease: "easeInOut" 
          }}
          style={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)',
            width: 120,
            height: 120,
            background: 'linear-gradient(135deg, var(--accent) 0%, #c96b30 100%)',
            borderRadius: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 20px 40px rgba(224, 122, 56, 0.4)',
            zIndex: 2
          }}
        >
          <Icon n="alert" s={64} c="#fff" />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 16 }}>
          הדף הזה נמצא מחוץ לתוכנית הבנייה
        </h1>
        <div style={{ fontSize: 16, color: 'var(--text2)', marginBottom: 40, maxWidth: 480, lineHeight: 1.6 }}>
          {children || (
            <p>
              נראה שהגעת לאתר בנייה לא מאושר. הדף שחיפשת לא נמצא בכתובת הזו, או שהוא עדיין בשלבי תכנון ראשוניים.
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <Btn variant="ghost" onClick={() => window.history.back()}>
            <Icon n="arrow-right" s={16} />
            חזור אחורה
          </Btn>
          <Link to="/dashboard">
            <Btn>
              <Icon n="home" s={16} />
              חזרה ללוח הבקרה
            </Btn>
          </Link>
        </div>
      </motion.div>

      {/* Blueprint decorative elements */}
      <div style={{ 
        position: 'absolute', 
        bottom: 40, 
        right: 40, 
        opacity: 0.1, 
        transform: 'rotate(-15deg)',
        pointerEvents: 'none'
      }}>
        <Icon n="layers" s={200} />
      </div>
      <div style={{ 
        position: 'absolute', 
        top: 40, 
        left: 40, 
        opacity: 0.1, 
        transform: 'rotate(15deg)',
        pointerEvents: 'none'
      }}>
        <Icon n="settings" s={160} />
      </div>
    </div>
  );
}
