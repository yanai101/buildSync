import * as React from 'react';
import { Spinner, ErrorState, Icon, Btn, EmptyState, PageBackground } from './Shared';
import { motion } from 'framer-motion';

interface ScreenBoundaryProps {
  loading?: boolean;
  error?: Error | string | null;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDesc?: string;
  emptyIcon?: string;
  emptyImage?: string;
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
  emptyImage,
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
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center', minHeight: 400, position: 'relative', zIndex: 1 }}
      >
        {emptyImage && <PageBackground image={emptyImage} />}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <EmptyState 
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyDesc}
            action={emptyAction && (
              <Btn onClick={emptyAction} size="lg" style={{padding: '12px 28px', fontSize: 16}}>
                <Icon n="plus" s={16} /> {emptyActionLabel}
              </Btn>
            )}
          />
        </div>
      </motion.div>
    );
  }

  return <>{children}</>;
};
