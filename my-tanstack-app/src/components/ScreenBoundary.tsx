import * as React from 'react';
import { Spinner, ErrorState } from './Shared';

interface ScreenBoundaryProps {
  loading: boolean;
  error?: Error | string | null;
  children: React.ReactNode;
  onRetry?: () => void;
}

export const ScreenBoundary: React.FC<ScreenBoundaryProps> = ({ 
  loading, 
  error, 
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

  return <>{children}</>;
};
