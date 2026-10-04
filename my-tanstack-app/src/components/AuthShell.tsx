import * as React from 'react'
import { Icon } from './Shared'

// Visual layer for the auth pages (/login, /register, /join/$code). Styles: `.auth*` in
// src/styles/app.css; system: design.md. Pages keep their own state and handlers.

type BuildPhoto = 'stage-0' | 'stage-1' | 'stage-2' | 'stage-3' | 'stage-4' | 'stage-5'

export function AuthShell({
  photo,
  photoAlt,
  captionTitle,
  captionBody,
  children,
}: {
  photo: BuildPhoto
  photoAlt: string
  captionTitle: React.ReactNode
  captionBody?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="auth" dir="rtl">
      <aside className="auth__photo">
        <img
          src={`/landing/${photo}.webp`}
          srcSet={`/landing/${photo}-m.webp 800w, /landing/${photo}.webp 1600w`}
          sizes="(max-width: 860px) 100vw, 55vw"
          width={1600}
          height={1066}
          alt={photoAlt}
          fetchPriority="high"
        />
        <div className="auth__caption">
          <p className="auth__caption-title">{captionTitle}</p>
          {captionBody && <p className="auth__caption-body">{captionBody}</p>}
        </div>
      </aside>
      <main className="auth__panel">
        {/* '/' is the static landing page, so this is a full page load */}
        <a href="/" className="auth__wordmark" aria-label="BuildSync - דף הבית">
          <img src="/logo.png" alt="" width={32} height={32} />
          <span dir="ltr">Build<b>Sync</b></span>
        </a>
        <div className="auth__body">{children}</div>
      </main>
    </div>
  )
}

export function AuthHead({ title, lede, badge }: { title: React.ReactNode; lede?: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <header className="auth__head">
      {badge}
      <h1 className="auth__title">{title}</h1>
      {lede && <p className="auth__lede">{lede}</p>}
    </header>
  )
}

export function AuthField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="auth-field">
      <span className="auth-field__label">
        {label}
        {hint && <span className="auth-field__hint">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

export function AuthInput({
  value,
  onChange,
  className = '',
  ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & { value: string; onChange: (v: string) => void }) {
  return <input {...rest} className={`auth-input ${className}`} value={value} onChange={(e) => onChange(e.target.value)} />
}

export function AuthButton({
  loading,
  loadingText,
  variant = 'primary',
  size,
  children,
  className = '',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean
  loadingText?: string
  variant?: 'primary' | 'ghost'
  size?: 'sm'
}) {
  const cls = ['auth-btn', variant === 'ghost' && 'auth-btn--ghost', size === 'sm' && 'auth-btn--sm', className].filter(Boolean).join(' ')
  return (
    <button {...rest} className={cls} aria-busy={loading || undefined}>
      {loading ? (
        <>
          <span className="auth-spinner" aria-hidden="true" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  )
}

const NOTICE_ICON = { success: 'check-circle', warning: 'alert', error: 'alert', info: 'info' } as const

export function AuthNotice({
  tone,
  title,
  children,
  actions,
}: {
  tone: keyof typeof NOTICE_ICON
  title?: React.ReactNode
  children?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className={`auth-notice auth-notice--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon n={NOTICE_ICON[tone]} s={18} />
      <div className="auth-notice__text">
        {title && <strong>{title}</strong>}
        {children && <span>{children}</span>}
        {actions && <div className="auth-notice__actions">{actions}</div>}
      </div>
    </div>
  )
}

export function AuthDivider({ children }: { children: React.ReactNode }) {
  return <div className="auth-divider">{children}</div>
}

export function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}
