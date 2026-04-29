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

/* ─── Full-screen animated construction scene ─── */
const BlueprintBg = () => {
  // deterministic lit-window helper
  const lit = (col: number, row: number) => (col * 7 + row * 13) % 19 > 9;

  // gear tooth path (star polygon) centered at 0,0
  const gearPath = (teeth: number, outer: number, inner: number) => {
    const pts: string[] = [];
    for (let i = 0; i < teeth * 2; i++) {
      const a = (i * Math.PI) / teeth - Math.PI / 2;
      const r = i % 2 === 0 ? outer : inner;
      pts.push(`${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`);
    }
    return `M${pts.join('L')}Z`;
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(160deg,#081524 0%,#0D2035 55%,#091B2E 100%)', zIndex: 0, overflow: 'hidden' }}>

      {/* ── SINGLE FULL-SCREEN SVG ── */}
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="bp24" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M24 0L0 0 0 24" fill="none" stroke="#3A7EBB" strokeWidth="0.35"/>
          </pattern>
          <pattern id="bp120" width="120" height="120" patternUnits="userSpaceOnUse">
            <rect width="120" height="120" fill="url(#bp24)"/>
            <path d="M120 0L0 0 0 120" fill="none" stroke="#3A7EBB" strokeWidth="0.9"/>
          </pattern>
          <radialGradient id="glow1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#E07A38" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#E07A38" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="glow2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4A9EDB" stopOpacity="0.15"/>
            <stop offset="100%" stopColor="#4A9EDB" stopOpacity="0"/>
          </radialGradient>
        </defs>

        {/* Blueprint grid */}
        <rect width="1440" height="900" fill="url(#bp120)" opacity="0.18"/>

        {/* Ambient glow spots */}
        <ellipse cx="1300" cy="100" rx="280" ry="200" fill="url(#glow1)" opacity="0.7"/>
        <ellipse cx="80" cy="800" rx="300" ry="220" fill="url(#glow2)" opacity="0.6"/>

        {/* ══════════ SKYLINE BUILDINGS ══════════ */}
        {/* B1 */}
        <rect x="0" y="660" width="100" height="240" fill="#0C2035" stroke="#2A6090" strokeWidth="0.6"/>
        {[0,1,2,3,4,5].map(r=>[0,1,2].map(c=>(
          <rect key={`b1-${r}-${c}`} x={10+c*32} y={670+r*28} width="20" height="16"
            fill={lit(c,r)?'rgba(74,158,219,0.22)':'rgba(0,0,0,0.3)'} stroke="rgba(74,158,219,0.2)" strokeWidth="0.4"/>
        )))}

        {/* B2 */}
        <rect x="110" y="490" width="140" height="410" fill="#0A1D30" stroke="#2A6090" strokeWidth="0.6"/>
        {[0,1,2,3,4,5,6,7].map(r=>[0,1,2,3].map(c=>(
          <rect key={`b2-${r}-${c}`} x={120+c*32} y={500+r*44} width="20" height="28"
            fill={lit(c+4,r)?'rgba(74,158,219,0.2)':'rgba(0,0,0,0.3)'} stroke="rgba(74,158,219,0.2)" strokeWidth="0.4"/>
        )))}

        {/* B3 — tallest, left of crane */}
        <rect x="260" y="280" width="160" height="620" fill="#0C2035" stroke="#2A6090" strokeWidth="0.6"/>
        {[0,1,2,3,4,5,6,7,8,9,10].map(r=>[0,1,2,3].map(c=>(
          <rect key={`b3-${r}-${c}`} x={270+c*36} y={290+r*50} width="22" height="30"
            fill={lit(c+8,r)?'rgba(74,158,219,0.22)':'rgba(0,0,0,0.3)'} stroke="rgba(74,158,219,0.2)" strokeWidth="0.4"/>
        )))}

        {/* B4 — under construction (short, open top) */}
        <rect x="440" y="640" width="120" height="260" fill="#0A1D30" stroke="#2A6090" strokeWidth="0.6"/>
        {[0,1,2,3].map(r=>[0,1,2].map(c=>(
          <rect key={`b4-${r}-${c}`} x={450+c*36} y={650+r*52} width="22" height="30"
            fill={lit(c+2,r+5)?'rgba(74,158,219,0.18)':'rgba(0,0,0,0.3)'} stroke="rgba(74,158,219,0.2)" strokeWidth="0.4"/>
        )))}
        {/* Rising floor blocks on B4 */}
        {[0,1,2,3].map(i=>(
          <rect key={`rf-${i}`} x="444" y={636} width="112" height="18"
            fill={`rgba(${29+i*10},${78+i*20},${216-i*20},${0.9-i*0.1})`} rx="1"
            style={{ animation:'riseFloor 10s linear infinite', animationDelay:`${i*1.2}s` }}/>
        ))}

        {/* B5 — scaffolding building */}
        <rect x="580" y="410" width="160" height="490" fill="#0B1E31" stroke="#2A6090" strokeWidth="0.6"/>
        {[0,1,2,3,4,5,6,7].map(r=>[0,1,2,3].map(c=>(
          <rect key={`b5-${r}-${c}`} x={590+c*36} y={420+r*56} width="22" height="34"
            fill={lit(c+1,r+2)?'rgba(74,158,219,0.2)':'rgba(0,0,0,0.3)'} stroke="rgba(74,158,219,0.2)" strokeWidth="0.4"/>
        )))}
        {/* Scaffolding overlay on B5 */}
        {[0,1,2,3,4,5,6,7,8].map(r=>(
          <line key={`ssh-${r}`} x1="580" y1={410+r*55} x2="740" y2={410+r*55}
            stroke="#4A9EDB" strokeWidth="1.2" opacity="0.3"/>
        ))}
        {[580,620,660,700,740].map(x=>(
          <line key={`ssv-${x}`} x1={x} y1="410" x2={x} y2="900"
            stroke="#4A9EDB" strokeWidth="1" opacity="0.25"/>
        ))}

        {/* B6 */}
        <rect x="760" y="480" width="150" height="420" fill="#0C2035" stroke="#2A6090" strokeWidth="0.6"/>
        {[0,1,2,3,4,5,6].map(r=>[0,1,2,3].map(c=>(
          <rect key={`b6-${r}-${c}`} x={770+c*34} y={490+r*56} width="20" height="34"
            fill={lit(c+6,r+3)?'rgba(74,158,219,0.2)':'rgba(0,0,0,0.3)'} stroke="rgba(74,158,219,0.2)" strokeWidth="0.4"/>
        )))}

        {/* B7 — tall right center */}
        <rect x="930" y="340" width="180" height="560" fill="#0A1D30" stroke="#2A6090" strokeWidth="0.6"/>
        {[0,1,2,3,4,5,6,7,8,9].map(r=>[0,1,2,3,4].map(c=>(
          <rect key={`b7-${r}-${c}`} x={940+c*33} y={350+r*52} width="20" height="30"
            fill={lit(c+3,r+1)?'rgba(74,158,219,0.22)':'rgba(0,0,0,0.3)'} stroke="rgba(74,158,219,0.2)" strokeWidth="0.4"/>
        )))}

        {/* B8 */}
        <rect x="1130" y="520" width="150" height="380" fill="#0C2035" stroke="#2A6090" strokeWidth="0.6"/>
        {[0,1,2,3,4,5].map(r=>[0,1,2,3].map(c=>(
          <rect key={`b8-${r}-${c}`} x={1140+c*34} y={530+r*54} width="20" height="32"
            fill={lit(c+9,r+4)?'rgba(74,158,219,0.2)':'rgba(0,0,0,0.3)'} stroke="rgba(74,158,219,0.2)" strokeWidth="0.4"/>
        )))}

        {/* B9 */}
        <rect x="1300" y="580" width="140" height="320" fill="#0A1D30" stroke="#2A6090" strokeWidth="0.6"/>
        {[0,1,2,3,4].map(r=>[0,1,2].map(c=>(
          <rect key={`b9-${r}-${c}`} x={1312+c*40} y={592+r*54} width="24" height="32"
            fill={lit(c+11,r+7)?'rgba(74,158,219,0.2)':'rgba(0,0,0,0.3)'} stroke="rgba(74,158,219,0.2)" strokeWidth="0.4"/>
        )))}

        {/* Ground line */}
        <rect x="0" y="896" width="1440" height="4" fill="#1D4ED8" opacity="0.4"/>

        {/* ══════════ LARGE CRANE ══════════ */}
        {/* Crane positioned at x=380, tower top at y=120 */}
        <g transform="translate(380,120)">
          {/* Tower */}
          <rect x="-9" y="0" width="18" height="780" fill="#1D4ED8" rx="2"/>
          {/* Cross-bracing on tower */}
          {[0,1,2,3,4,5,6].map(i=>(
            <g key={i}>
              <line x1="-9" y1={i*110} x2="9" y2={i*110+70} stroke="#2563EB" strokeWidth="2.5"/>
              <line x1="9" y1={i*110} x2="-9" y2={i*110+70} stroke="#2563EB" strokeWidth="2.5"/>
            </g>
          ))}
          {/* Counter-jib (left, fixed) */}
          <rect x="-140" y="-6" width="140" height="12" fill="#1D4ED8" rx="2"/>
          <rect x="-140" y="6" width="18" height="32" fill="#1D4ED8" rx="2"/>
          {/* Counter-weight */}
          <rect x="-152" y="38" width="30" height="20" fill="#0F2A45" stroke="#4A9EDB" strokeWidth="1" rx="2"/>
          {/* Tower cap */}
          <rect x="-20" y="-20" width="40" height="20" fill="#1D4ED8" rx="2"/>
          <line x1="0" y1="-20" x2="0" y2="-40" stroke="#4A9EDB" strokeWidth="2"/>
          <circle cx="0" cy="-44" r="6" fill="#E07A38"/>

          {/* Swinging main jib */}
          <g style={{ transformOrigin:'0px 0px', animation:'craneSway 7s ease-in-out infinite' }}>
            <rect x="0" y="-6" width="280" height="12" fill="#E07A38" rx="2"/>
            {/* Support cables from tower cap to jib */}
            <line x1="0" y1="-18" x2="240" y2="6" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5"/>
            <line x1="0" y1="-18" x2="140" y2="6" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2"/>
            {/* Trolley */}
            <rect x="200" y="-4" width="24" height="10" fill="#F59E0B" rx="2"/>
            {/* Hanging cable */}
            <line x1="212" y1="6" x2="212" y2="160" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeDasharray="4 3"/>
            {/* Hook */}
            <rect x="204" y="160" width="16" height="12" fill="#F59E0B" rx="2"/>
            {/* Load block */}
            <rect x="196" y="172" width="32" height="22" fill="#0F2A45" stroke="#4A9EDB" strokeWidth="1" rx="2"/>
            <rect x="200" y="176" width="10" height="14" fill="rgba(74,158,219,0.3)" rx="1"/>
            <rect x="218" y="176" width="6" height="14" fill="rgba(74,158,219,0.2)" rx="1"/>
          </g>
        </g>

        {/* ══════════ LARGE GEARS ══════════ */}
        {/* Top-right large gear */}
        <g transform="translate(1360,90)" style={{ animation:'spinGear 16s linear infinite' }}>
          <path d={gearPath(12, 76, 58)} fill="none" stroke="#4A9EDB" strokeWidth="2.5" opacity="0.35"/>
          <circle cx="0" cy="0" r="26" fill="none" stroke="#4A9EDB" strokeWidth="2.5" opacity="0.35"/>
          {[0,60,120,180,240,300].map(deg=>(
            <line key={deg}
              x1={Math.cos(deg*Math.PI/180)*28} y1={Math.sin(deg*Math.PI/180)*28}
              x2={Math.cos(deg*Math.PI/180)*56} y2={Math.sin(deg*Math.PI/180)*56}
              stroke="#4A9EDB" strokeWidth="9" strokeLinecap="round" opacity="0.3"/>
          ))}
        </g>

        {/* Bottom-right smaller gear (counter-rotate) */}
        <g transform="translate(1400,820)" style={{ animation:'spinGearReverse 10s linear infinite' }}>
          <path d={gearPath(10, 46, 34)} fill="none" stroke="#E07A38" strokeWidth="2" opacity="0.25"/>
          <circle cx="0" cy="0" r="16" fill="none" stroke="#E07A38" strokeWidth="2" opacity="0.25"/>
          {[0,72,144,216,288].map(deg=>(
            <line key={deg}
              x1={Math.cos(deg*Math.PI/180)*18} y1={Math.sin(deg*Math.PI/180)*18}
              x2={Math.cos(deg*Math.PI/180)*32} y2={Math.sin(deg*Math.PI/180)*32}
              stroke="#E07A38" strokeWidth="6" strokeLinecap="round" opacity="0.22"/>
          ))}
        </g>

        {/* Bottom-left medium gear */}
        <g transform="translate(60,860)" style={{ animation:'spinGear 12s linear infinite' }}>
          <path d={gearPath(8, 52, 38)} fill="none" stroke="#4A9EDB" strokeWidth="2" opacity="0.2"/>
          <circle cx="0" cy="0" r="18" fill="none" stroke="#4A9EDB" strokeWidth="2" opacity="0.2"/>
          {[0,90,180,270].map(deg=>(
            <line key={deg}
              x1={Math.cos(deg*Math.PI/180)*20} y1={Math.sin(deg*Math.PI/180)*20}
              x2={Math.cos(deg*Math.PI/180)*36} y2={Math.sin(deg*Math.PI/180)*36}
              stroke="#4A9EDB" strokeWidth="7" strokeLinecap="round" opacity="0.18"/>
          ))}
        </g>

        {/* ══════════ RULER at bottom ══════════ */}
        <rect x="0" y="890" width="1440" height="10" fill="rgba(74,158,219,0.07)"/>
        {Array.from({length:120},(_,i)=>(
          <line key={i} x1={i*12} y1="890" x2={i*12} y2={i%5===0?878:885}
            stroke="#4A9EDB" strokeWidth="0.7" opacity="0.3"/>
        ))}

        {/* ══════════ SCAN LINE ══════════ */}
        <rect x="0" y="0" width="1440" height="3" fill="rgba(74,158,219,0.18)"
          style={{ animation:'scanLine 8s linear infinite' }}/>

      </svg>

      {/* Extra glow orbs via CSS (outside SVG for performance) */}
      <div style={{ position:'absolute', top:-80, right:-80, width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(224,122,56,0.14) 0%, transparent 70%)', pointerEvents:'none' }}/>
    </div>
  );
};


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
        @keyframes spin            { to { transform: rotate(360deg); } }
        @keyframes spinGear        { to { transform: rotate(360deg); } }
        @keyframes spinGearReverse { to { transform: rotate(-360deg); } }
        @keyframes bounceHat {
          0%, 100% { transform: translateY(0) rotate(-6deg); }
          40%       { transform: translateY(-14px) rotate(6deg); }
          60%       { transform: translateY(-8px) rotate(-3deg); }
        }
        @keyframes floatTool {
          0%, 100% { transform: translateY(0) rotate(-10deg); }
          50%       { transform: translateY(-18px) rotate(14deg); }
        }
        @keyframes craneSway {
          0%, 100% { transform: rotate(0deg); }
          35%       { transform: rotate(6deg); }
          65%       { transform: rotate(-4deg); }
        }
        @keyframes trolleySlide {
          0%, 100% { transform: translateX(0); }
          40%       { transform: translateX(-22px); }
        }
        @keyframes riseFloor {
          0%   { transform: translateY(0);    opacity: 0; }
          5%   { opacity: 1; }
          80%  { transform: translateY(-60px); opacity: 0.9; }
          100% { transform: translateY(-80px); opacity: 0; }
        }
        @keyframes floatParticle {
          0%, 100% { transform: translate(0, 0) rotate(0deg);     opacity: 0.4; }
          33%       { transform: translate(8px, -14px) rotate(20deg); opacity: 0.7; }
          66%       { transform: translate(-6px, -8px) rotate(-10deg); opacity: 0.5; }
        }
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
