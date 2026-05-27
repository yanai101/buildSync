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
  const [isSuccess, setIsSuccess] = React.useState(false);

  const submitTicket = useMutation(api.support.submitTicket);
  const { notify } = useAppNotify();
  const [copied, setCopied] = React.useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('support@buildsync.co.il');
    setCopied(true);
    notify({
      title: 'הכתובת הועתקה',
      body: 'כתובת האימייל support@buildsync.co.il הועתקה ללוח העריכה שלך.',
      kind: 'success'
    });
    setTimeout(() => setCopied(false), 2000);
  };

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
      
      setIsSuccess(true);
      // Fallback notify just in case it works globally
      notify({
        title: 'הפנייה נשלחה',
        body: 'תודה רבה! הפנייה שלך הועברה לצוות ותטופל בהקדם.',
        kind: 'success'
      });
      // Optionally auto close after 3 seconds:
      // setTimeout(() => onClose(), 3000);
    } catch (err) {
      console.error(err);
      notify({
        title: 'שגיאה',
        body: 'אירעה שגיאה בשליחת הפנייה. נסה שוב מאוחר יותר.',
        kind: 'error'
      });
      alert('אירעה שגיאה בשליחת הפנייה. נסה שוב מאוחר יותר.');
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
        {isSuccess ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#D1FAE5', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Icon n="check" s={32} />
            </div>
            <h2 style={{ fontSize: 20, color: 'var(--text1)', marginBottom: 8, marginTop: 0 }}>הפנייה נשלחה בהצלחה!</h2>
            <p style={{ color: 'var(--text2)', fontSize: 15, marginBottom: 24 }}>
              תודה רבה! הפנייה שלך הועברה לצוות המערכת ותטופל בהקדם.
            </p>
            <Btn variant="primary" onClick={onClose} style={{ minWidth: 120, justifyContent: 'center' }}>
              סגור
            </Btn>
          </div>
        ) : (
          <>
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

            <div style={{
              marginTop: 8,
              paddingTop: 16,
              borderTop: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}>
              <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>
                מעוניין לפנות אלינו במייל ישיר?
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 8,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                gap: 12
              }}>
                <a
                  href="mailto:support@buildsync.co.il"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: 'var(--accent)',
                    textDecoration: 'none',
                    fontSize: 14,
                    fontWeight: 700,
                    direction: 'ltr'
                  }}
                >
                  <Icon n="mail" s={16} c="var(--accent)" />
                  support@buildsync.co.il
                </a>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text3)',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text1)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text3)'}
                >
                  {copied ? (
                    <>
                      <Icon n="check" s={14} c="#10B981" />
                      הועתק!
                    </>
                  ) : (
                    <>
                      <Icon n="clipboard" s={14} />
                      העתק
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
