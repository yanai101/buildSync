import * as React from 'react';
import { Btn, Icon } from './Shared';
import { openUpgradeModal } from './UpgradeModalHost';
import type { BillingTier } from '../billing';

export type FeatureTeaserProps = {
  /** Subscription that unlocks the feature — drives the badge and the upgrade popup. */
  tier: BillingTier;
  title: string;
  description: string;
  benefits: string[];
  /** Mock of the real feature UI rendered with sample data. */
  preview: React.ReactNode;
  /**
   * Interactive demo: the preview is clickable (tabs, filters, gallery…) and
   * shown in full. Otherwise it's a static, non-focusable snapshot that fades out.
   */
  interactive?: boolean;
  /**
   * Whether the viewer can buy the subscription (project owner). Team members
   * see `memberMessage` instead of a buy button, since they can't upgrade the
   * owner's account.
   */
  canPurchase: boolean;
  memberMessage?: string;
  /** Text passed to the upgrade popup header. Defaults to `description`. */
  upgradeReason?: string;
  /** Max height of a static preview before it fades out. */
  previewHeight?: number;
};

const TIER_LABEL: Record<BillingTier, string> = { pro: 'Pro', premium: 'Premium' };

const ctaStyle: React.CSSProperties = {
  width: '100%', justifyContent: 'center',
  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', boxShadow: '0 4px 12px rgba(217,119,6,0.3)',
};

/**
 * Generic paywall teaser: an upgrade card plus a preview of the feature built
 * from the real components with sample data. Layout is size-aware (container
 * queries in app.css): stacked on narrow screens with the card first, and
 * side-by-side with a sticky card on wide screens so the CTA is always in view.
 * The upgrade popup opens only from the button — never automatically.
 * Theme-aware via CSS variables (light/dark).
 *
 * Reusable for any gated screen (archive, budget, BOQ, analytics…).
 */
export const FeatureTeaser = ({
  tier,
  title,
  description,
  benefits,
  preview,
  interactive = false,
  canPurchase,
  memberMessage = 'הפיצ\'ר יהיה זמין לך כאשר בעל הפרויקט ישדרג את המנוי.',
  upgradeReason,
  previewHeight = 420,
}: FeatureTeaserProps) => {
  const headingId = React.useId();
  const tierLabel = TIER_LABEL[tier];
  const upgrade = () => openUpgradeModal({ tier, title, reason: upgradeReason ?? description });

  const cta = canPurchase ? (
    <Btn onClick={upgrade} style={ctaStyle}>
      <Icon n="star" s={15} /> שדרג ל-{tierLabel}
    </Btn>
  ) : (
    <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text2)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
      <Icon n="info" s={15} /> {memberMessage}
    </div>
  );

  const demoBanner = (position: 'top' | 'bottom') => (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 14px',
        background: 'var(--accent-light)', color: 'var(--text1)', fontSize: 13,
        ...(position === 'top' ? { borderBottom: '1px dashed var(--accent)' } : { borderTop: '1px dashed var(--accent)' }),
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--accent)', color: '#fff', fontWeight: 800, fontSize: 12, borderRadius: 999, padding: '3px 10px' }}>
        <Icon n="eye" s={13} /> מצב הדגמה
      </span>
      <span style={{ fontWeight: 600 }}>
        {position === 'top'
          ? (interactive ? 'נתוני דוגמה בלבד — לחץ ונסה. כך זה ייראה עם החדרים והתמונות שלך.' : 'נתוני דוגמה בלבד — כך זה ייראה אצלך.')
          : 'כל המידע כאן הוא לדוגמה ואינו נשמר.'}
      </span>
    </div>
  );

  return (
    <section aria-labelledby={headingId} className="feature-teaser">
      <div className="feature-teaser__layout">
        {/* Upgrade card */}
        <div
          className="feature-teaser__card"
          style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '20px 20px 18px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.10)', display: 'flex', flexDirection: 'column', gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: 'grid', placeItems: 'center', color: '#fff',
                background: 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)', boxShadow: '0 6px 14px rgba(217,119,6,0.3)',
              }}
            >
              <Icon n="lock" s={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 800, letterSpacing: '.4px', color: '#fff', background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', borderRadius: 999, padding: '1px 8px' }}>
                {tierLabel}
              </span>
              <h3 id={headingId} style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 800, color: 'var(--text1)' }}>{title}</h3>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: 14, color: 'var(--text2)', lineHeight: 1.6 }}>{description}</p>

          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {benefits.map((b) => (
              <li key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14, color: 'var(--text1)', lineHeight: 1.45 }}>
                <span style={{ color: 'var(--success, #10B981)', display: 'inline-flex', marginTop: 2, flexShrink: 0 }}>
                  <Icon n="check" s={16} />
                </span>
                {b}
              </li>
            ))}
          </ul>

          <div style={{ marginTop: 4 }}>{cta}</div>
        </div>

        {/* Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          <div
            style={{
              position: 'relative', border: '2px dashed var(--accent)', borderRadius: 16, background: 'var(--bg)', overflow: 'hidden',
              ...(interactive ? {} : { maxHeight: previewHeight }),
            }}
          >
            {demoBanner('top')}
            {interactive ? (
              <div style={{ padding: 14 }}>{preview}</div>
            ) : (
              <>
                <div aria-hidden="true" inert style={{ padding: 14, pointerEvents: 'none', userSelect: 'none' }}>{preview}</div>
                <div aria-hidden="true" style={{ position: 'absolute', insetInline: 0, bottom: 0, height: '35%', background: 'linear-gradient(180deg, transparent 0%, var(--bg) 95%)' }} />
              </>
            )}
            {interactive && demoBanner('bottom')}
          </div>

          {/* Narrow screens: repeat the CTA after the demo (hidden on wide layouts, where the card is sticky). */}
          {canPurchase && (
            <div className="feature-teaser__bottom-cta" style={{ flexDirection: 'column', gap: 8 }}>{cta}</div>
          )}
        </div>
      </div>
    </section>
  );
};
