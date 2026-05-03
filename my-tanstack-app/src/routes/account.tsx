import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { useAction, useMutation, useQuery } from 'convex/react'
import { Btn, Input, Icon } from '~/components/Shared'
import { api } from '../../convex/_generated/api'
import { useSubscription } from '~/hooks/useSubscription'

export const Route = createFileRoute('/account')({
  component: AccountPage,
})

const AVATAR_COLORS = [
  '#E07A38',
  '#5A67D8',
  '#10B981',
  '#E11D48',
  '#0EA5E9',
  '#8B5CF6',
  '#F59E0B',
  '#475569',
]

const ROLE_LABELS: Record<string, string> = {
  owner: 'בעל פרויקט',
  manager: 'מנהל עבודה',
  inspector: 'מפקח',
  contractor: 'קבלן',
}

function AccountPage() {
  const user = useQuery(api.users.me, {})
  const updateProfile = useMutation(api.users.updateProfile)
  const updatePassword = useAction(api.users.updatePassword)
  const toggleSubscription = useMutation(api.users.toggleSubscription)
  const { isProOrPremium, tier, isSuperAdmin } = useSubscription()

  const [profile, setProfile] = React.useState({
    name: '',
    phone: '',
    avatarLetter: '',
    avatarColor: AVATAR_COLORS[0],
  })
  const [profileSaving, setProfileSaving] = React.useState(false)
  const [profileMsg, setProfileMsg] = React.useState<
    { kind: 'ok' | 'err'; text: string } | null
  >(null)

  const [pwd, setPwd] = React.useState({ current: '', next: '', confirm: '' })
  const [pwdSaving, setPwdSaving] = React.useState(false)
  const [pwdMsg, setPwdMsg] = React.useState<
    { kind: 'ok' | 'err'; text: string } | null
  >(null)

  React.useEffect(() => {
    if (!user) return
    setProfile({
      name: user.name ?? '',
      phone: user.phone ?? '',
      avatarLetter: user.avatarLetter ?? (user.name?.[0] ?? user.email?.[0] ?? '').toUpperCase(),
      avatarColor: user.avatarColor ?? AVATAR_COLORS[0],
    })
  }, [user])

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileMsg(null)
    setProfileSaving(true)
    try {
      await updateProfile({
        name: profile.name,
        phone: profile.phone,
        avatarLetter: profile.avatarLetter,
        avatarColor: profile.avatarColor,
      })
      setProfileMsg({ kind: 'ok', text: 'הפרטים נשמרו' })
    } catch (err) {
      setProfileMsg({
        kind: 'err',
        text: err instanceof Error ? err.message : 'שמירת הפרטים נכשלה',
      })
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwdMsg(null)
    if (!pwd.current || !pwd.next || !pwd.confirm) {
      setPwdMsg({ kind: 'err', text: 'יש למלא את כל שדות הסיסמה' })
      return
    }
    if (pwd.next !== pwd.confirm) {
      setPwdMsg({ kind: 'err', text: 'אימות הסיסמה החדשה לא תואם' })
      return
    }
    if (pwd.next.length < 8) {
      setPwdMsg({ kind: 'err', text: 'הסיסמה החדשה חייבת להכיל לפחות 8 תווים' })
      return
    }
    setPwdSaving(true)
    try {
      await updatePassword({ currentPassword: pwd.current, newPassword: pwd.next })
      setPwd({ current: '', next: '', confirm: '' })
      setPwdMsg({ kind: 'ok', text: 'הסיסמה עודכנה בהצלחה' })
    } catch (err) {
      setPwdMsg({
        kind: 'err',
        text: err instanceof Error ? err.message : 'עדכון הסיסמה נכשל',
      })
    } finally {
      setPwdSaving(false)
    }
  }

  if (user === undefined) {
    return (
      <div className="page-content">
        <div className="card" style={{ padding: 24 }}>טוען פרטי משתמש...</div>
      </div>
    )
  }

  if (user === null) {
    return (
      <div className="page-content">
        <div className="card" style={{ padding: 24 }}>לא נמצא משתמש מחובר.</div>
      </div>
    )
  }

  const letter = (profile.avatarLetter || user.name?.[0] || user.email?.[0] || '?').toUpperCase()
  const createdAt = new Date(user._creationTime).toLocaleDateString('he-IL')

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 820 }}>
      <div className="card" style={{ padding: 24 }}>
        <SectionHeader title="פרטים אישיים" subtitle="עדכנו את הפרטים המוצגים בצוות הפרויקט" />

        <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: `${profile.avatarColor}22`,
                color: profile.avatarColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
                fontWeight: 800,
              }}
            >
              {letter}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>צבע אווטאר</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {AVATAR_COLORS.map((color) => {
                  const selected = profile.avatarColor === color
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setProfile((p) => ({ ...p, avatarColor: color }))}
                      aria-label={`צבע ${color}`}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        background: color,
                        border: selected ? '2px solid var(--text1)' : '2px solid transparent',
                        outline: selected ? '2px solid var(--border)' : 'none',
                        cursor: 'pointer',
                      }}
                    />
                  )
                })}
              </div>
            </div>
          </div>

          <Field label="שם מלא">
            <Input
              value={profile.name}
              onChange={(v: string) => setProfile((p) => ({ ...p, name: v }))}
              placeholder="ישראל ישראלי"
              style={{ width: '100%' }}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="טלפון">
              <Input
                type="tel"
                value={profile.phone}
                onChange={(v: string) => setProfile((p) => ({ ...p, phone: v }))}
                placeholder="050-0000000"
                style={{ width: '100%' }}
              />
            </Field>
            <Field label="אות אווטאר" hint="אות אחת או שתיים">
              <Input
                value={profile.avatarLetter}
                onChange={(v: string) => setProfile((p) => ({ ...p, avatarLetter: v.slice(0, 2) }))}
                placeholder="א"
                style={{ width: '100%' }}
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <ReadOnlyField label="אימייל" value={user.email ?? '—'} />
            <ReadOnlyField
              label="תפקיד"
              value={user.role ? ROLE_LABELS[user.role] ?? user.role : '—'}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <ReadOnlyField label="תאריך פתיחת חשבון" value={createdAt} />
            <ReadOnlyField 
              label="סוג מנוי" 
              value={isSuperAdmin ? 'מנהל מערכת (Premium)' : isProOrPremium ? 'מנוי Pro פעיל' : 'חשבון חינמי (Free)'} 
              color={isProOrPremium || isSuperAdmin ? 'var(--accent)' : 'var(--text2)'}
            />
          </div>

          {profileMsg && <Banner {...profileMsg} />}

          <div>
            <Btn type="submit" disabled={profileSaving} style={{ padding: '10px 22px' }}>
              {profileSaving ? (
                <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  <Icon n="clock" s={14} /> שומר...
                </span>
              ) : 'שמור שינויים'}
            </Btn>
          </div>
        </form>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <SectionHeader title="שינוי סיסמה" subtitle="מומלץ להחליף סיסמה אחת לכמה חודשים" />

        <form onSubmit={handlePasswordSave} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
          <Field label="סיסמה נוכחית">
            <Input
              type="password"
              value={pwd.current}
              onChange={(v: string) => setPwd((p) => ({ ...p, current: v }))}
              placeholder="••••••••"
              style={{ width: '100%' }}
            />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="סיסמה חדשה" hint="לפחות 8 תווים">
              <Input
                type="password"
                value={pwd.next}
                onChange={(v: string) => setPwd((p) => ({ ...p, next: v }))}
                placeholder="••••••••"
                style={{ width: '100%' }}
              />
            </Field>
            <Field label="אימות סיסמה חדשה">
              <Input
                type="password"
                value={pwd.confirm}
                onChange={(v: string) => setPwd((p) => ({ ...p, confirm: v }))}
                placeholder="••••••••"
                style={{ width: '100%' }}
              />
            </Field>
          </div>

          {pwdMsg && <Banner {...pwdMsg} />}

          <div>
            <Btn type="submit" disabled={pwdSaving} style={{ padding: '10px 22px' }}>
              {pwdSaving ? (
                <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  <Icon n="clock" s={14} /> מעדכן...
                </span>
              ) : 'עדכן סיסמה'}
            </Btn>
          </div>
        </form>
      </div>

      <div className="card" style={{ padding: 24, background: '#FFF7ED', borderColor: '#FDBA74' }}>
        <SectionHeader
          title="פעולות נוספות (בקרוב)"
          subtitle="פעולות אלו עדיין לא זמינות — כאן יופיעו בהמשך"
        />
        <ul style={{ marginTop: 12, color: 'var(--text2)', lineHeight: 1.9, paddingInlineStart: 18 }}>
          <li>ניתוק מכל המכשירים האחרים</li>
          <li>החלפת כתובת אימייל (עם אימות)</li>
          <li>העדפות התראות ושפה</li>
          <li>מחיקת חשבון</li>
        </ul>
      </div>

      {/* Dev Toggle */}
      {process.env.NODE_ENV === 'development' && (
        <div className="card" style={{ padding: 24, background: 'rgba(0,0,0,0.02)', borderStyle: 'dashed' }}>
          <SectionHeader
            title="🛠️ כלי מפתחים (טסטים)"
            subtitle="החלף את סוג המנוי של המשתמש הזה כדי לבדוק גישה."
          />
          <div style={{ marginTop: 16 }}>
            <Btn onClick={() => toggleSubscription()} variant="outline">
              החלף מנוי (עכשיו: {tier})
            </Btn>
          </div>
        </div>
      )}
    </div>
  )
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text1)' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>{subtitle}</div>}
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 13, fontWeight: 600, color: 'var(--text1)', marginBottom: 6 }}>
        <span>{label}</span>
        {hint && <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text3)' }}>{hint}</span>}
      </label>
      {children}
    </div>
  )
}

function ReadOnlyField({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)', marginBottom: 6 }}>{label}</div>
      <div
        style={{
          padding: '10px 12px',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          color: color || 'var(--text2)',
          fontSize: 14,
          fontWeight: color ? 700 : 400
        }}
      >
        {value}
      </div>
    </div>
  )
}

function Banner({ kind, text }: { kind: 'ok' | 'err'; text: string }) {
  const ok = kind === 'ok'
  return (
    <div
      style={{
        fontSize: 13,
        color: ok ? '#065F46' : 'var(--danger)',
        background: ok ? '#D1FAE5' : '#FEE2E2',
        border: `1px solid ${ok ? '#6EE7B7' : '#FCA5A5'}`,
        borderRadius: 8,
        padding: '8px 12px',
      }}
    >
      {text}
    </div>
  )
}
