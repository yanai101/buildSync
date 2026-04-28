import * as React from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useAction, useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';

import { api } from '../../convex/_generated/api';
import { Btn, Icon, Input } from '../components/Shared';

const ROLE_LABEL: Record<string, string> = {
  manager: 'מנהל עבודה',
  inspector: 'מפקח',
  contractor: 'קבלן',
};

const REASON_TEXT: Record<string, string> = {
  not_found: 'הקוד לא נמצא',
  consumed: 'ההזמנה כבר נוצלה',
  revoked: 'ההזמנה בוטלה על ידי בעל הפרויקט',
  expired: 'תוקף ההזמנה פג',
};

type Props = { code: string };

export const JoinScreen = ({ code }: Props) => {
  const peek = useQuery(api.invitations.peekInvitation, { code });
  const redeem = useAction(api.invitations.redeemInvitation);
  const { signIn } = useAuthActions();
  const navigate = useNavigate();

  const [form, setForm] = React.useState({ name: '', email: '', phone: '', password: '' });
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (peek?.valid) {
      setForm((f) => ({
        ...f,
        name: f.name || peek.invitedName || '',
        email: f.email || peek.invitedEmail || '',
      }));
    }
  }, [peek?.valid, peek]);

  if (peek === undefined) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
        <div className="card" style={{ padding: 24 }}>טוען הזמנה...</div>
      </div>
    );
  }

  if (!peek.valid) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
        <div className="card" style={{ padding: 32, maxWidth: 420, textAlign: 'center' }}>
          <Icon n="alert" s={28} c="var(--danger)" />
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 12 }}>
            ההזמנה אינה זמינה
          </div>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6 }}>
            {REASON_TEXT[peek.reason] ?? 'לא ניתן להשתמש בקוד זה.'}
          </div>
          <Link
            to="/login"
            style={{
              display: 'inline-block',
              marginTop: 18,
              color: 'var(--accent)',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            התחבר לחשבון קיים
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError('יש למלא שם, אימייל וסיסמה');
      return;
    }
    setSubmitting(true);
    setError(null);
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

  return (
    <div
      style={{
        flex: 1,
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        fontFamily: "'Heebo', sans-serif",
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#fff',
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: 'inline-block',
              fontSize: 12,
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: 999,
              background: 'var(--accent-light)',
              color: 'var(--accent)',
              marginBottom: 12,
            }}
          >
            הזמנה לתפקיד {roleLabel}
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 6, color: 'var(--text1)' }}>
            הצטרף לפרויקט {peek.projectName}
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>
            צור חשבון אישי כדי להתחיל לעבוד על הפרויקט.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>שם מלא</label>
            <Input
              value={form.name}
              onChange={(v: string) => setForm({ ...form, name: v })}
              placeholder="ישראל ישראלי"
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>אימייל</label>
              <Input
                type="email"
                value={form.email}
                onChange={(v: string) => setForm({ ...form, email: v })}
                placeholder="name@company.com"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>טלפון</label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(v: string) => setForm({ ...form, phone: v })}
                placeholder="050-0000000"
                style={{ width: '100%' }}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>סיסמה (8 תווים לפחות)</label>
            <Input
              type="password"
              value={form.password}
              onChange={(v: string) => setForm({ ...form, password: v })}
              placeholder="••••••••"
              style={{ width: '100%' }}
            />
          </div>
          {error && (
            <div
              style={{
                fontSize: 13,
                color: 'var(--danger)',
                background: '#FEE2E2',
                border: '1px solid #FCA5A5',
                borderRadius: 8,
                padding: '8px 12px',
              }}
            >
              {error}
            </div>
          )}
          <Btn
            type="submit"
            disabled={submitting}
            style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15 }}
          >
            {submitting ? 'מצטרף...' : 'צור חשבון והצטרף'}
          </Btn>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text3)' }}>
          יש לך כבר חשבון?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
            התחבר
          </Link>
        </p>
      </div>
    </div>
  );
};
