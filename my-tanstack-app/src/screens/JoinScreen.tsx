import * as React from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useAction, useQuery, useMutation, useConvexAuth } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';

import { api } from '../../convex/_generated/api';
import { Icon } from '../components/Shared';
import { AuthShell, AuthHead, AuthField, AuthInput, AuthButton, AuthNotice } from '../components/AuthShell';

const ROLE_LABEL: Record<string, string> = {
  manager: 'מנהל עבודה',
  inspector: 'מפקח',
  contractor: 'קבלן',
};

const ROLE_ICON: Record<string, string> = {
  manager: 'clipboard',
  inspector: 'search',
  contractor: 'hard-hat',
};

const REASON_TEXT: Record<string, string> = {
  not_found: 'קוד ההזמנה אינו קיים במערכת',
  consumed: 'ההזמנה הזו כבר מומשה על ידי משתמש אחר',
  revoked: 'ההזמנה בוטלה על ידי בעל הפרויקט',
  expired: 'תוקף ההזמנה פג — צור קשר עם בעל הפרויקט לקבלת הזמנה חדשה',
};

type Props = { code: string };

export const JoinScreen = ({ code }: Props) => {
  const peek = useQuery(api.invitations.peekInvitation, { code });
  const redeem = useAction(api.invitations.redeemInvitation);
  const redeemExisting = useMutation(api.invitations.redeemInvitationExistingUser);
  const { signIn, signOut } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const navigate = useNavigate();

  const emailExists = useQuery(
    api.users.isEmailTaken,
    peek?.invitedEmail ? { email: peek.invitedEmail } : 'skip'
  );
  const currentUser = useQuery(api.users.me);

  // Use server-side auth as the source of truth.
  // isAuthenticated (client token) can lag — when the server session is stale,
  // currentUser is null even if isAuthenticated is still true client-side.
  // currentUser===undefined = still loading; null = server doesn't recognise the session.
  const isServerAuthed = isAuthenticated && currentUser != null;

  const isDifferentUser = !!(
    peek?.invitedEmail &&
    currentUser?.email &&
    peek.invitedEmail.trim().toLowerCase() !== currentUser.email.trim().toLowerCase()
  );

  const [form, setForm] = React.useState({ name: '', email: '', phone: '', password: '' });
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [verificationSent, setVerificationSent] = React.useState(false);
  const [isGoogleAccount, setIsGoogleAccount] = React.useState(false);

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
      <AuthShell
        photo="stage-2"
        photoAlt="שלד בטון דו-קומתי עם פיגומים ופועלים באתר"
        captionTitle={<>מצטרפים <b>לצוות</b> של הפרויקט.</>}
        captionBody="כל המשימות, התיעוד והתקשורת של הפרויקט — במקום אחד, מהיום הראשון."
      >
        <div className="auth-loading" role="status">
          <span className="auth-spinner" aria-hidden="true" />
          טוען הזמנה...
        </div>
      </AuthShell>
    );
  }

  /* ─── Invalid invitation ─── */
  if (!peek.valid) {
    return (
      <AuthShell
        photo="stage-2"
        photoAlt="שלד בטון דו-קומתי עם פיגומים ופועלים באתר"
        captionTitle={<>מצטרפים <b>לצוות</b> של הפרויקט.</>}
        captionBody="כל המשימות, התיעוד והתקשורת של הפרויקט — במקום אחד, מהיום הראשון."
      >
        <div className="auth-state">
          <span className="auth-state__icon" aria-hidden="true"><Icon n="x" s={24} /></span>
          <AuthHead title="ההזמנה אינה זמינה" lede={REASON_TEXT[peek.reason] ?? 'לא ניתן להשתמש בקוד זה.'} />
        </div>
        <Link to="/login" className="auth-btn">התחבר לחשבון קיים</Link>
        <footer className="auth__foot">
          <p>BuildSync · מערכת ניהול בנייה מקצועית</p>
        </footer>
      </AuthShell>
    );
  }

  /* ─── Handle submit ─── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (isServerAuthed) {
      try {
        await redeemExisting({ code });
        navigate({ to: '/dashboard' });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'הצטרפות נכשלה');
        setSubmitting(false);
      }
      return;
    }

    if (emailExists) {
      if (!form.password) {
        setError('נא להזין סיסמה כדי להתחבר');
        setSubmitting(false);
        return;
      }

      // Step 1: sign in
      let signInOk = false;
      try {
        const result = await signIn('password', {
          flow: 'signIn',
          email: peek.invitedEmail!.trim().toLowerCase(),
          password: form.password,
        });
        // Account needs email verification — lib sent the email, stop here.
        // Save the code so the root hook can auto-complete the join after verification.
        if (result && !result.signingIn) {
          localStorage.setItem('buildsync:pendingJoinCode', code);
          setVerificationSent(true);
          setSubmitting(false);
          return;
        }
        signInOk = true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('InvalidSecret')) {
          setIsGoogleAccount(true);
          setError('נראה שנרשמת דרך Google ואין לחשבונך סיסמה. אנא התחבר דרך Google בדף הכניסה, ואז חזור לקישור ההזמנה.');
        } else {
          setError('הסיסמה שגויה. אנא בדוק ונסה שוב.');
        }
        setSubmitting(false);
        return;
      }

      // Step 2: redeem (sign-in succeeded)
      if (signInOk) {
        try {
          await redeemExisting({ code });
          navigate({ to: '/dashboard' });
        } catch (err) {
          setError(err instanceof Error ? err.message : 'הצטרפות לפרויקט נכשלה');
          setSubmitting(false);
        }
      }
      return;
    }

    if (!form.name || !form.email || !form.password) {
      setError('יש למלא שם, אימייל וסיסמה');
      setSubmitting(false);
      return;
    }

    // Step 1: Create the account. Invite is NOT consumed here — stays open.
    try {
      await redeem({
        code,
        name: form.name,
        email: form.email,
        password: form.password,
        ...(form.phone ? { phone: form.phone } : {}),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'יצירת החשבון נכשלה');
      setSubmitting(false);
      return;
    }

    // Step 2: Sign in — triggers email verification for unverified accounts.
    let newSignInOk = false;
    try {
      const result = await signIn('password', {
        flow: 'signIn',
        email: form.email,
        password: form.password,
      });
      if (result && !result.signingIn) {
        // Email verification required — store the code so the root hook can
        // auto-complete the join once the user clicks the verification link.
        localStorage.setItem('buildsync:pendingJoinCode', code);
        setVerificationSent(true);
        setSubmitting(false);
        return;
      }
      newSignInOk = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בכניסה לחשבון');
      setSubmitting(false);
      return;
    }

    // Step 3: Signed in with verified email — consume the invite now.
    if (newSignInOk) {
      try {
        await redeemExisting({ code });
        navigate({ to: '/dashboard' });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'הצטרפות לפרויקט נכשלה');
        setSubmitting(false);
      }
    }
  };

  const roleLabel = ROLE_LABEL[peek.role] ?? peek.role;
  const roleIcon = ROLE_ICON[peek.role] ?? 'users';

  /* ─── Valid invitation UI ─── */
  return (
    <AuthShell
        photo="stage-2"
        photoAlt="שלד בטון דו-קומתי עם פיגומים ופועלים באתר"
        captionTitle={<>מצטרפים <b>לצוות</b> של הפרויקט.</>}
        captionBody="כל המשימות, התיעוד והתקשורת של הפרויקט — במקום אחד, מהיום הראשון."
      >
      <AuthHead
        badge={<span className="auth-chip"><Icon n={roleIcon} s={16} /> הוזמנת כ{roleLabel} לפרויקט</span>}
        title={peek.projectName}
        lede={isServerAuthed
          ? 'אתה מחובר למערכת. לחץ על הכפתור כדי להצטרף לפרויקט עכשיו.'
          : emailExists
            ? 'ברוך שובך! נראה שיש לך כבר חשבון. הזן סיסמה כדי להתחבר ולהצטרף.'
            : 'צור חשבון אישי ב-BuildSync כדי להתחיל לעבוד על הפרויקט.'}
      />

      {/* Form / CTA */}
      {isServerAuthed ? (
        <div className="auth__form">
          {isDifferentUser && (
            <AuthNotice
              tone="warning"
              title="שים לב: חשבון שונה מחובר"
              actions={
                <>
                  <AuthButton type="button" variant="ghost" size="sm" onClick={() => signOut()}>
                    התנתק והתחבר כמשתמש הנכון
                  </AuthButton>
                  <AuthButton type="button" size="sm" onClick={handleSubmit} disabled={submitting}>
                    המשך כ-{currentUser?.name || currentUser?.email?.split('@')[0]}
                  </AuthButton>
                </>
              }
            >
              הוזמנת כ-<strong>{peek.invitedEmail}</strong>, אך אתה מחובר כעת כ-<strong>{currentUser?.email}</strong>.
            </AuthNotice>
          )}

          {error && <AuthNotice tone="error">{error}</AuthNotice>}

          {!isDifferentUser && (
            <AuthButton type="button" onClick={handleSubmit} disabled={submitting} loading={submitting} loadingText="מצטרף לפרויקט...">
              <Icon n="arrow-left" s={18} /> הצטרף לפרויקט עכשיו
            </AuthButton>
          )}
        </div>
      ) : emailExists ? (
        <form onSubmit={handleSubmit} className="auth__form">
          <AuthField label="אימייל">
            <div className="auth-readonly">
              <Icon n="mail" s={16} />
              <span className="auth-readonly__value">{peek.invitedEmail}</span>
              <span className="auth-chip auth-chip--info">רשום במערכת</span>
            </div>
          </AuthField>

          <AuthField label="סיסמה">
            <AuthInput type="password" name="password" autoComplete="current-password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="••••••••" />
          </AuthField>

          {verificationSent && (
            <AuthNotice tone="success" title='נדרש אימות דוא"ל'>
              שלחנו קישור אימות לכתובת <strong>{peek.invitedEmail}</strong>. אמת את כתובת הדוא"ל שלך ואז חזור לקישור ההזמנה הזה.
            </AuthNotice>
          )}
          {error && <AuthNotice tone="error">{error}</AuthNotice>}

          {isGoogleAccount ? (
            <Link to="/login" className="auth-btn auth-btn--ghost">
              עבור לדף הכניסה והתחבר דרך Google
            </Link>
          ) : !verificationSent && (
            <AuthButton type="submit" disabled={submitting} loading={submitting} loadingText="מתחבר ומצטרף...">
              <Icon n="lock" s={18} /> התחבר והצטרף לפרויקט
            </AuthButton>
          )}
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="auth__form">
          <AuthField label="שם מלא">
            <AuthInput name="name" autoComplete="name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="ישראל ישראלי" />
          </AuthField>

          <div className="auth-row2">
            <AuthField label="אימייל">
              <AuthInput type="email" name="email" autoComplete="email" inputMode="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="name@company.com" />
            </AuthField>
            <AuthField label="טלפון">
              <AuthInput type="tel" name="phone" autoComplete="tel" inputMode="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="050-0000000" />
            </AuthField>
          </div>

          <AuthField label="סיסמה" hint="8 תווים לפחות">
            <AuthInput type="password" name="password" autoComplete="new-password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="••••••••" />
          </AuthField>

          {verificationSent && (
            <AuthNotice tone="success" title='נדרש אימות דוא"ל'>
              שלחנו קישור אימות לכתובת <strong>{form.email}</strong>. אמת את כתובת הדוא"ל שלך ואז חזור לקישור ההזמנה הזה.
            </AuthNotice>
          )}
          {error && <AuthNotice tone="error">{error}</AuthNotice>}

          {!verificationSent && (
            <AuthButton type="submit" disabled={submitting} loading={submitting} loadingText="יוצר חשבון...">
              צור חשבון והצטרף לפרויקט
            </AuthButton>
          )}
        </form>
      )}

      {/* Footer */}
      {!isServerAuthed && (
        <footer className="auth__foot">
          <p>
            יש לך כבר חשבון? <Link to="/login" className="auth-link">התחבר כאן</Link>
          </p>
        </footer>
      )}
    </AuthShell>
  );
};
