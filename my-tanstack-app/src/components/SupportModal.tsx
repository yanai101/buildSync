import * as React from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Btn, Input, Icon } from './Shared';
import { useAppNotify } from '../hooks/useAppNotify';

interface SupportModalProps {
  onClose: () => void;
}

export function SupportModal({ onClose }: SupportModalProps) {
  const [topic, setTopic] = React.useState<'bug' | 'feature' | 'billing' | 'general' | 'other'>('bug');
  const [message, setMessage] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const submitTicket = useMutation(api.support.submitTicket);
  const { notify } = useAppNotify();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    try {
      await submitTicket({
        topic,
        message,
        urlContext: window.location.href, // Captures current URL for debugging
      });
      
      notify({
        title: 'הפנייה נשלחה',
        body: 'תודה רבה! הפנייה שלך הועברה לצוות ותטופל בהקדם.',
        kind: 'success'
      });
      onClose();
    } catch (err) {
      console.error(err);
      notify({
        title: 'שגיאה',
        body: 'אירעה שגיאה בשליחת הפנייה. נסה שוב מאוחר יותר.',
        kind: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const topicOptions = [
    { value: 'bug', label: 'מצאתי באג' },
    { value: 'feature', label: 'הצעה לשיפור' },
    { value: 'billing', label: 'בעיה בחיוב' },
    { value: 'general', label: 'שאלה כללית' },
    { value: 'other', label: 'אחר' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg)',
          borderRadius: 16,
          padding: 24,
          width: '100%',
          maxWidth: 450,
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 20, color: 'var(--text1)' }}>יצירת קשר / תמיכה</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text3)',
              padding: 4,
            }}
          >
            <Icon n="x" s={20} />
          </button>
        </div>

        <p style={{ margin: 0, color: 'var(--text2)', fontSize: 14 }}>
          נשמח לעזור לך! ספר לנו במה מדובר.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text1)', marginBottom: 6 }}>
              נושא הפנייה
            </label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value as any)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text1)',
                fontSize: 14,
                fontFamily: 'inherit',
              }}
            >
              {topicOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text1)', marginBottom: 6 }}>
              פירוט הבעיה או ההצעה
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="פרט ככל שניתן..."
              rows={5}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text1)',
                fontSize: 14,
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <Btn type="button" variant="ghost" onClick={onClose}>
              ביטול
            </Btn>
            <Btn type="submit" variant="primary" disabled={isSubmitting || !message.trim()}>
              {isSubmitting ? 'שולח...' : 'שלח פנייה'}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}
