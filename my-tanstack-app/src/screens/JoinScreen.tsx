import * as React from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useAction, useQuery, useMutation, useConvexAuth } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';

import { api } from '../../convex/_generated/api';
import { Btn, Icon, Input } from '../components/Shared';

const ROLE_LABEL: Record<string, string> = {
  manager: 'מנהל עבודה',
  inspector: 'מפקח',
  contractor: 'קבלן',
};

const ROLE_ICON: Record<string, string> = {
  manager: '🏗️',
  inspector: '🔍',
  contractor: '🔨',
};

const REASON_TEXT: Record<string, string> = {
  not_found: 'קוד ההזמנה אינו קיים במערכת',
  consumed: 'ההזמנה הזו כבר מומשה על ידי משתמש אחר',
  revoked: 'ההזמנה בוטלה על ידי בעל הפרויקט',
  expired: 'תוקף ההזמנה פג — צור קשר עם בעל הפרויקט לקבלת הזמנה חדשה',
};

type Props = { code: string };

/* ─── Blueprint Grid Pattern as inline SVG background ─── */
const BlueprintBg = () => (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      background: 'linear-gradient(135deg, #0D1B2A 0%, #1A2E42 50%, #0F2030 100%)',
      zIndex: 0,
    }}
  >
    {/* Grid lines */}
    <svg
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="smallGrid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#4A9EDB" strokeWidth="0.4" />
        </pattern>
        <pattern id="bigGrid" width="120" height="120" patternUnits="userSpaceOnUse">
          <rect width="120" height="120" fill="url(#smallGrid)" />
          <path d="M 120 0 L 0 0 0 120" fill="none" stroke="#4A9EDB" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#bigGrid)" />
    </svg>
    {/* Glowing orb top-right */}
    <div style={{
      position: 'absolute', top: -120, right: -120,
      width: 500, height: 500, borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(224,122,56,0.18) 0%, transparent 70%)',
      pointerEvents: 'none',
    }} />
    {/* Glowing orb bottom-left */}
    <div style={{
      position: 'absolute', bottom: -160, left: -160,
      width: 600, height: 600, borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(74,158,219,0.14) 0%, transparent 70%)',
      pointerEvents: 'none',
    }} />
  </div>
);

export const JoinScreen = ({ code }: Props) => {
  const peek = useQuery(api.invitations.peekInvitation, { code });
  const redeem = useAction(api.invitations.redeemInvitation);
  const redeemExisting = useMutation(api.invitations.redeemInvitationExistingUser);
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const navigate = useNavigate();

  const [form, setForm] = React.useState({ name: '', email: '', phone: '', password: '' });
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  React.useEffect(() => {
    if (peek?.valid) {
      setForm((f) => ({
        ...f,
        name: f.name || peek.invitedName || '',
        email: f.email || peek.invitedEmail || '',
      }));
    }
  }, [peek?.valid, peek]);

  /* ─── Loading ─── */
  if (peek === undefined) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0D1B2A' }}>
        <BlueprintBg />
        <div style={{
          position: 'relative', zIndex: 1,
          background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 16, padding: '28px 36px',
          color: '#fff', fontSize: 15, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.3)',
            borderTopColor: '#E07A38',
            animation: 'spin 0.8s linear infinite',
          }} />
          טוען הזמנה...
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ─── Invalid invitation ─── */
  if (!peek.valid) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0D1B2A', padding: 20 }}>
        <BlueprintBg />
        <div
          style={{
            position: 'relative', zIndex: 1,
            background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 20, padding: '48px 44px',
            maxWidth: 440, width: '100%', textAlign: 'center',
            fontFamily: "'Heebo', sans-serif",
            transform: mounted ? 'translateY(0)' : 'translateY(24px)',
            opacity: mounted ? 1 : 0,
            transition: 'transform 0.5s ease, opacity 0.5s ease',
          }}
        >
          {/* Warning icon circle */}
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(239,68,68,0.25) 0%, rgba(239,68,68,0.1) 100%)',
            border: '1px solid rgba(239,68,68,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', fontSize: 30,
          }}>
            🚫
          </div>

          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 10, lineHeight: 1.3 }}>
            ההזמנה אינה זמינה
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, marginBottom: 28 }}>
            {REASON_TEXT[peek.reason] ?? 'לא ניתן להשתמש בקוד זה.'}
          </div>

          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <Link
              to="/login"
              style={{
                display: 'block', padding: '12px 20px',
                background: 'linear-gradient(135deg, #E07A38 0%, #B45309 100%)',
                borderRadius: 10, color: '#fff', fontWeight: 700,
                fontSize: 14, textDecoration: 'none', textAlign: 'center',
                transition: 'opacity 0.2s',
              }}
            >
              התחבר לחשבון קיים
            </Link>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>
              BuildPro · מערכת ניהול בנייה מקצועית
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Handle submit ─── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (isAuthenticated) {
      try {
        await redeemExisting({ code });
        navigate({ to: '/' });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'הצטרפות נכשלה');
        setSubmitting(false);
      }
      return;
    }

    if (!form.name || !form.email || !form.password) {
      setError('יש למלא שם, אימייל וסיסמה');
      setSubmitting(false);
      return;
    }
    try {
      await redeem({
        code,
        name: form.name,
        email: form.email,
        password: form.password,
        ...(form.phone ? { phone: form.phone } : {}),
      });
      await signIn('password', {
        flow: 'signIn',
        email: form.email,
        password: form.password,
      });
      navigate({ to: '/' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הצטרפות נכשלה');
      setSubmitting(false);
    }
  };

  const roleLabel = ROLE_LABEL[peek.role] ?? peek.role;
  const roleIcon = ROLE_ICON[peek.role] ?? '👷';

  /* ─── Valid invitation UI ─── */
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0D1B2A', fontFamily: "'Heebo', sans-serif", padding: 20, position: 'relative',
    }}>
      <BlueprintBg />

      {/* Glassmorphism card */}
      <div
        style={{
          position: 'relative', zIndex: 1,
          width: '100%', maxWidth: 500,
          background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 24,
          overflow: 'hidden',
          transform: mounted ? 'translateY(0)' : 'translateY(30px)',
          opacity: mounted ? 1 : 0,
          transition: 'transform 0.55s cubic-bezier(0.16,1,0.3,1), opacity 0.55s ease',
        }}
      >
        {/* Top accent bar */}
        <div style={{ height: 4, background: 'linear-gradient(90deg, #E07A38 0%, #F59E0B 50%, #E07A38 100%)' }} />

        <div style={{ padding: '36px 40px 32px' }}>
          {/* Header */}
          <div style={{ marginBottom: 28, textAlign: 'center' }}>
            {/* Role badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 14px', borderRadius: 999,
              background: 'rgba(224,122,56,0.18)', border: '1px solid rgba(224,122,56,0.35)',
              color: '#F59E0B', fontSize: 13, fontWeight: 700,
              marginBottom: 18,
            }}>
              <span style={{ fontSize: 16 }}>{roleIcon}</span>
              הוזמנת כ{roleLabel} לפרויקט
            </div>

            {/* Project name */}
            <h1 style={{
              fontSize: '1.8rem', fontWeight: 900, color: '#fff',
              margin: '0 0 10px', lineHeight: 1.2, letterSpacing: '-0.01em',
            }}>
              {peek.projectName}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: 0, lineHeight: 1.7 }}>
              {isAuthenticated
                ? 'אתה כבר מחובר למערכת. לחץ על הכפתור כדי להצטרף לפרויקט.'
                : 'צור חשבון אישי ב-BuildPro כדי להתחיל לעבוד על הפרויקט.'}
            </p>
          </div>

          {/* Divider with icon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.10)' }} />
            <span style={{ fontSize: 18 }}>🏠</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.10)' }} />
          </div>

          {/* Form / CTA */}
          {isAuthenticated ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {error && <ErrorBox msg={error} />}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={joinBtnStyle(submitting)}
              >
                {submitting ? (
                  <>
                    <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                    מצטרף לפרויקט...
                  </>
                ) : '🔑  הצטרף לפרויקט עכשיו'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <FieldRow label="שם מלא">
                <StyledInput
                  value={form.name}
                  onChange={(v) => setForm({ ...form, name: v })}
                  placeholder="ישראל ישראלי"
                />
              </FieldRow>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <FieldRow label="אימייל">
                  <StyledInput
                    type="email"
                    value={form.email}
                    onChange={(v) => setForm({ ...form, email: v })}
                    placeholder="name@company.com"
                  />
                </FieldRow>
                <FieldRow label="טלפון">
                  <StyledInput
                    type="tel"
                    value={form.phone}
                    onChange={(v) => setForm({ ...form, phone: v })}
                    placeholder="050-0000000"
                  />
                </FieldRow>
              </div>

              <FieldRow label="סיסמה (8 תווים לפחות)">
                <StyledInput
                  type="password"
                  value={form.password}
                  onChange={(v) => setForm({ ...form, password: v })}
                  placeholder="••••••••"
                />
              </FieldRow>

              {error && <ErrorBox msg={error} />}

              <button
                type="submit"
                disabled={submitting}
                style={joinBtnStyle(submitting)}
              >
                {submitting ? (
                  <>
                    <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                    יוצר חשבון...
                  </>
                ) : '🏗️  צור חשבון והצטרף לפרויקט'}
              </button>
            </form>
          )}

          {/* Footer */}
          {!isAuthenticated && (
            <p style={{ textAlign: 'center', marginTop: 22, fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
              יש לך כבר חשבון?{' '}
              <Link to="/login" style={{ color: '#E07A38', fontWeight: 700, textDecoration: 'none' }}>
                התחבר כאן
              </Link>
            </p>
          )}
        </div>

        {/* Bottom branding strip */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.07)',
          padding: '14px 40px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: 'rgba(0,0,0,0.15)',
        }}>
          <span style={{ fontSize: 18 }}>🏗</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>
            BUILDPRO · מערכת ניהול בנייה מקצועית
          </span>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

/* ─── Helpers ─── */

const joinBtnStyle = (disabled: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  width: '100%', padding: '15px 24px',
  background: disabled
    ? 'rgba(224,122,56,0.4)'
    : 'linear-gradient(135deg, #E07A38 0%, #B45309 100%)',
  borderRadius: 12, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
  color: '#fff', fontSize: 15, fontWeight: 800,
  boxShadow: disabled ? 'none' : '0 6px 24px rgba(224,122,56,0.35)',
  transition: 'all 0.2s', fontFamily: "'Heebo', sans-serif",
  letterSpacing: '0.01em',
});

const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.55)', marginBottom: 6, letterSpacing: '0.02em' }}>
      {label}
    </label>
    {children}
  </div>
);

const StyledInput = ({
  value, onChange, placeholder, type = 'text',
}: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) => (
  <input
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    style={{
      width: '100%', boxSizing: 'border-box',
      background: 'rgba(255,255,255,0.07)',
      border: '1px solid rgba(255,255,255,0.14)',
      borderRadius: 10, padding: '11px 14px',
      color: '#fff', fontSize: 14, fontFamily: "'Heebo', sans-serif",
      outline: 'none', transition: 'border-color 0.2s',
    }}
    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(224,122,56,0.6)'; }}
    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; }}
  />
);

const ErrorBox = ({ msg }: { msg: string }) => (
  <div style={{
    fontSize: 13, color: '#FCA5A5',
    background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.25)',
    borderRadius: 8, padding: '10px 14px', lineHeight: 1.5,
  }}>
    ⚠️ {msg}
  </div>
);
