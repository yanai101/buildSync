import * as React from 'react';
import { Spinner, ErrorState, Icon, Btn } from './Shared';
import { motion } from 'framer-motion';

interface ScreenBoundaryProps {
  loading: boolean;
  error?: Error | string | null;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDesc?: string;
  emptyIcon?: string;
  emptyAction?: () => void;
  emptyActionLabel?: string;
  children: React.ReactNode;
  onRetry?: () => void;
}

export const ScreenBoundary: React.FC<ScreenBoundaryProps> = ({ 
  loading, 
  error, 
  isEmpty,
  emptyTitle = "אין נתונים להצגה",
  emptyDesc = "נראה שעדיין לא נוספו נתונים לקטגוריה זו.",
  emptyIcon = "clipboard",
  emptyAction,
  emptyActionLabel = "הוספה ראשונה",
  children, 
  onRetry 
}) => {
  if (loading) {
    return (
      <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Spinner size={40} />
          <div style={{ fontSize: 14, color: 'var(--text3)', fontWeight: 500 }}>טוען נתונים...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <ErrorState message={typeof error === 'string' ? error : error.message} onRetry={onRetry} />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <motion.div 
        className="page-content" 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, textAlign: 'center' }}
      >
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Icon n={emptyIcon} s={32} c="var(--text3)" />
        </div>
        <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px 0' }}>{emptyTitle}</h3>
        <p style={{ fontSize: 14, color: 'var(--text3)', maxWidth: 300, margin: '0 0 24px 0', lineHeight: 1.5 }}>{emptyDesc}</p>
        {emptyAction && (
          <Btn onClick={emptyAction}><Icon n="plus" s={14} /> {emptyActionLabel}</Btn>
        )}
      </motion.div>
    );
  }

  return <>{children}</>;
};
