import React from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { Bell, BellOff, Loader2 } from 'lucide-react';

export function PushNotificationToggle() {
  const { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) {
    const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches;
    if (isIOS && !isStandalone) {
      return (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: 16, background: 'var(--surface-2)',
          borderRadius: 12, border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-xs)'
        }}>
          <div style={{
            padding: 8, borderRadius: '50%',
            background: 'var(--surface-elevated)',
            color: 'var(--text3)', flexShrink: 0
          }}>
            <BellOff size={20} />
          </div>
          <div>
            <h3 style={{ fontWeight: 600, color: 'var(--text1)', fontSize: 14, margin: 0 }}>התראות פוש במכשיר</h3>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4, lineHeight: 1.5 }}>
              באייפון, כדי לקבל התראות יש להוסיף את האפליקציה למסך הבית
              (שתף ⬆️ ← &quot;הוסף למסך הבית&quot;), ואז להפעיל התראות מתוך האפליקציה שנוספה.
            </p>
          </div>
        </div>
      );
    }
    return null;
  }

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: 16, background: 'var(--surface-2)',
      borderRadius: 12, border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-xs)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          padding: 8, borderRadius: '50%', flexShrink: 0,
          background: isSubscribed ? 'var(--accent-light)' : 'var(--surface-elevated)',
          color: isSubscribed ? 'var(--accent)' : 'var(--text3)',
          transition: 'all 0.2s'
        }}>
          {isSubscribed ? <Bell size={20} /> : <BellOff size={20} />}
        </div>
        <div>
          <h3 style={{ fontWeight: 600, color: 'var(--text1)', fontSize: 14, margin: 0 }}>התראות פוש במכשיר</h3>
          <p style={{ fontSize: 12.5, color: 'var(--text3)', marginTop: 3 }}>קבל התראות גם כשהאפליקציה סגורה</p>
        </div>
      </div>

      {/* Toggle switch */}
      <button
        onClick={handleToggle}
        disabled={isLoading || permission === 'denied'}
        title={permission === 'denied' ? 'ההרשאות נדחו — שנה בהגדרות הדפדפן' : undefined}
        style={{
          position: 'relative',
          display: 'inline-flex',
          height: 24, width: 44,
          alignItems: 'center',
          borderRadius: 9999,
          border: 'none',
          cursor: (isLoading || permission === 'denied') ? 'not-allowed' : 'pointer',
          background: isSubscribed ? 'var(--accent)' : 'var(--border-strong)',
          transition: 'background 0.25s',
          opacity: (isLoading || permission === 'denied') ? 0.6 : 1,
          outline: 'none',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            height: 16, width: 16,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
            transform: isSubscribed ? 'translateX(-26px)' : 'translateX(-4px)',
            transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
            position: 'absolute',
            right: 0,
          }}
        />
        {isLoading && (
          <span style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Loader2 size={12} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
          </span>
        )}
      </button>
    </div>
  );
}
