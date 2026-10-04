import * as React from 'react'
import { Icon } from './Shared'

// Visual layer for the legal pages (/terms, /privacy). Styles: `.legal*` in src/styles/app.css;
// system: design.md (Content family · Long Document).

type BuildPhoto = 'stage-0' | 'stage-1' | 'stage-2' | 'stage-3' | 'stage-4' | 'stage-5'

export function LegalShell({
  photo,
  eyebrow,
  title,
  lede,
  children,
}: {
  photo: BuildPhoto
  eyebrow?: string
  title: string
  lede?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="legal" dir="rtl">
      <header className="legal__bar">
        {/* '/' is the static landing page (public/index.html), so these are full page loads */}
        <a href="/" className="auth__wordmark" aria-label="BuildSync - דף הבית">
          <img src="/logo.png" alt="" width={32} height={32} />
          <span dir="ltr">Build<b>Sync</b></span>
        </a>
        <a href="/" className="legal__back">
          <Icon n="arrow-right" s={18} /> חזרה לדף הבית
        </a>
      </header>
      <main>
        <div className="legal__hero">
          <img
            src={`/landing/${photo}.webp`}
            srcSet={`/landing/${photo}-m.webp 800w, /landing/${photo}.webp 1600w`}
            sizes="100vw"
            width={1600}
            height={1066}
            alt=""
          />
          <div className="legal__hero-inner">
            {eyebrow && <p className="legal__eyebrow">{eyebrow}</p>}
            <h1>{title}</h1>
            {lede && <p className="legal__lede">{lede}</p>}
          </div>
        </div>
        <article className="legal__doc">{children}</article>
      </main>
    </div>
  )
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="legal__section">
      <h2>{title}</h2>
      {children}
    </section>
  )
}
