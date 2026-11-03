import * as React from 'react';
import { Btn, Icon } from './Shared';
import { openUpgradeModal } from './UpgradeModalHost';
import { useCurrentProject } from '../hooks/useCurrentProject';
import type { BillingTier } from '../billing';

export type TeaserFeatureKey =
  | 'analytics'
  | 'boq'
  | 'boqwizard'
  | 'dailyLogs'
  | 'orders'
  | 'permits'
  | 'financing'
  | 'archiveImages'
  | 'archiveDocs'
  | 'archiveRooms';

export type FeatureTeaserMeta = {
  title: string;
  description: string;
  benefits: string[];
  memberMessage?: string;
  upgradeReason?: string;
  interactive?: boolean;
};

export const FEATURE_TEASER_CATALOG: Record<TeaserFeatureKey, FeatureTeaserMeta> = {
  analytics: {
    title: 'דוחות וסטטיסטיקות מתקדמות',
    description: 'תמונת מצב גרפית של התקציב, התפלגות ההוצאות לפי קטגוריה, מגמת התשלומים החודשית וקצב התקדמות השלבים והמשימות.',
    benefits: [
      'כרטיסי סיכום תקציב, הוצאות בפועל, התחייבויות ויתרה פנויה',
      'גרף התפלגות הוצאות לפי קטגוריות ומגמת הוצאות חודשית',
      'פילוח סטטוס משימות והתקדמות שלבי הבנייה באחוזים',
      'הגדלת כל גרף לתצוגת מסך מלא לניתוח מעמיק',
    ],
    interactive: true,
  },
  boq: {
    title: 'ניהול חכם של עלויות רכש',
    description: 'נהל את כל רשימת הרכש של הבית לפי חדרים וקטגוריות — כולל כמויות, מחירי יחידה, ספקים, סטטוס אישור וסימון תשלומים.',
    benefits: [
      'מעקב עלויות מפורט לכל חדר וסיכום אוטומטי לכלל הבית',
      'חישוב אוטומטי של שטחי ריצוף וחיפוי קירות כולל אחוז פחת',
      'מעקב סטטוס פריט (ממתין / מאושר) וסימון פריטים ששולמו',
      'ייצוא כתב כמויות ועלויות מרוכז לקובץ PDF',
    ],
    interactive: true,
  },
  boqwizard: {
    title: 'אשף כמויות חכם לפי חדרים',
    description: 'עבור חדר-חדר ובנה כתב כמויות מדויק לרכישה ולייבוא — עם חישוב אוטומטי של ריצוף וחיפוי וריכוז כמויות מאוחד לכל הבית.',
    benefits: [
      'חישוב אוטומטי של מ"ר ריצוף וחיפוי קירות לפי גודל החדר ואחוז הפחת',
      'קטלוג פריטים מובנה לכל סוג חדר (חשמל, תאורה, אינסטלציה ועוד)',
      'רשימת יבוא ורכש מרוכזת המאחדת כמויות מכל חדרי הבית',
      'העברה בלחיצה לניהול עלויות רכש וייצוא ל-PDF',
    ],
    interactive: true,
  },
  dailyLogs: {
    title: 'יומן עבודה יומי ותיעוד שטח',
    description: 'תעד כל יום עבודה באתר הבנייה — מזג אוויר, מצבת עובדים, עבודות שבוצעו, אספקות חומרים, חריגות, הנחיות מפקח ותמונות שטח.',
    benefits: [
      'תיעוד יומי של כוח אדם לפי תפקיד וקבלן, פעילויות ואספקות',
      'רישום חריגות (איכות, בטיחות, עיכוב, השפעה כספית) והנחיות מפקח',
      'העלאת תמונות מהשטח, נעילת דוח חתום והפקת PDF',
      'היסטוריית יומנים מלאה עם סינון לפי סטטוס, תקופה וסוג חריגה',
    ],
    interactive: true,
  },
  orders: {
    title: 'מעקב הזמנות ואספקות לאתר',
    description: 'נהל את כל הזמנות החומרים והציוד לפרויקט — עקוב אחר כמויות שסופקו בפועל, תאריכי יעד לאספקה ותעודות משלוח.',
    benefits: [
      'תמונת מצב מיידית: בהמתנה לאספקה, סופק חלקית או סופק במלואו',
      'פס התקדמות כמותי לכל הזמנה ועדכון קבלת סחורה באתר',
      'צירוף וצפייה בתעודות משלוח וחשבוניות לכל הזמנה',
      'מעקב תאריכי יעד לאספקה למניעת עיכובים בשטח',
    ],
    interactive: true,
  },
  permits: {
    title: 'ניהול בירוקרטיה, רישוי והיתרים',
    description: 'רכז במקום אחד את כל המסמכים והאישורים מול הרשויות — ועדה מקומית, פיקוד העורף, חברת חשמל, תאגיד המים וטופס 4.',
    benefits: [
      'ניהול מסודר של היתרי בנייה ואישורים לפי רשות מאשרת',
      'תיעוד הערות, סטטוס טיפול וסידור עדיפויות בגרירה',
      'צפייה ישירה במסמכי ההיתרים והאישורים מכל מכשיר',
      'נכלל בגיבוי ובייצוא המלא של תיק הפרויקט',
    ],
    interactive: true,
  },
  financing: {
    title: 'ניהול מימון פרויקט ומשכנתא',
    description: 'עקוב אחר כל מקורות המימון של הבנייה — הון עצמי, משכנתא לבנייה עצמית ופעימות שחרור כספים מול ההוצאות בפועל.',
    benefits: [
      'תמונת קופה חיה: כספי מימון שהתקבלו מול הוצאות ששולמו בפועל',
      'מעקב משכנתא לבנייה עצמית: פעימות שהתקבלו ותכנון המשיכה הבאה לפי אחוז התקדמות',
      'חישוב אוטומטי של יתרת קופה זמינה וזיהוי פערי מימון מראש',
      'צירוף מסמכי אישור עקרוני ואסמכתאות בנקאיות לכל מקור מימון',
    ],
    interactive: true,
  },
  archiveImages: {
    title: 'תמונות ארכיון',
    description: 'שמור צילומים חשובים של הפרויקט בקבוצות, עם הערות לכל תמונה, והפק מהם דוח מרוכז בלחיצה.',
    benefits: [
      'קבוצות תמונות לפי נושא (איטום, צנרת, חשמל…)',
      'הערה לכל תמונה וצפייה בגודל מלא',
      'הפקת דוח PDF מרוכז מהתמונות שבחרת',
      'דחיסה אוטומטית שחוסכת מקום',
    ],
    interactive: false,
  },
  archiveDocs: {
    title: 'מסמכי הפרויקט',
    description: 'כל המסמכים החשובים במקום אחד — היתרים, חוזים ותכניות — זמינים לך בכל שלב של הבנייה.',
    benefits: [
      'שמירת היתרים, חוזים ותכניות בפרויקט',
      'הערות לכל מסמך לחיפוש והתמצאות מהירה',
      'צפייה והורדה מכל מכשיר',
      'נכלל בייצוא הפרויקט בסיום הבנייה',
    ],
    interactive: false,
  },
  archiveRooms: {
    title: 'תיעוד תמונות לפי חדרים',
    description: 'תעד כל חדר בבית לאורך שלבי הבנייה, כדי לדעת בדיוק מה עובר בתוך הקירות גם אחרי שהם נסגרים.',
    benefits: [
      'תמונות לכל חדר לפי שלבי הבנייה — שלד, מערכות גולמיות, טיח, ריצוף וגמרים',
      'קטגוריות (חשמל, אינסטלציה, מיזוג…), תיאור קצר והערות לכל תמונה',
      'השוואת לפני / אחרי בין שלבים',
      'דוח PDF להדפסה לכל חדר וייצוא מסודר לפי חדר ושלב',
    ],
    interactive: true,
  },
};

export type FeatureTeaserProps = {
  /** Key in `FEATURE_TEASER_CATALOG` for declarative usage. */
  feature?: TeaserFeatureKey;
  /** Subscription plan required (alias for `tier`). Defaults to `'pro'`. */
  requiredPlan?: BillingTier;
  /** Subscription that unlocks the feature — drives the badge and the upgrade popup. */
  tier?: BillingTier;
  title?: string;
  description?: string;
  benefits?: string[];
  /** Mock of the real feature UI rendered with sample data. */
  preview: React.ReactNode;
  /**
   * Interactive demo: the preview is clickable (tabs, filters, gallery…) and
   * shown in full. Otherwise it's a static, non-focusable snapshot that fades out.
   */
  interactive?: boolean;
  /**
   * Whether the viewer can buy the subscription (project owner). When omitted,
   * automatically resolved from `useCurrentProject().userRole === 'owner'`.
   */
  canPurchase?: boolean;
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
 * from the real components with sample data (`demoProject`).
 *
 * Layout is size-aware (container queries in app.css): stacked on narrow
 * screens with the card first, and side-by-side with a sticky card on wide
 * screens so the CTA is always in view. The upgrade popup opens only from the
 * button — never automatically.
 */
export const FeatureTeaser = ({
  feature,
  requiredPlan,
  tier: tierProp,
  title: titleProp,
  description: descriptionProp,
  benefits: benefitsProp,
  preview,
  interactive: interactiveProp,
  canPurchase: canPurchaseProp,
  memberMessage: memberMessageProp,
  upgradeReason: upgradeReasonProp,
  previewHeight = 420,
}: FeatureTeaserProps) => {
  const { project, identity, user } = useCurrentProject();
  const headingId = React.useId();

  const meta = feature ? FEATURE_TEASER_CATALOG[feature] : undefined;
  const resolvedTier: BillingTier = requiredPlan ?? tierProp ?? 'pro';
  const tierLabel = TIER_LABEL[resolvedTier];
  const title = titleProp ?? meta?.title ?? 'פיצ\'ר מתקדם';
  const description = descriptionProp ?? meta?.description ?? '';
  const benefits = benefitsProp ?? meta?.benefits ?? [];
  const interactive = interactiveProp ?? meta?.interactive ?? false;
  const roleFromContext = (project?.myRole ?? identity?.role) as string | undefined;
  const isOwnerByContext =
    Boolean(identity?.isSuperAdmin) ||
    (project && user?._id && project.ownerUserId === user._id) ||
    (roleFromContext ? roleFromContext === 'owner' : true);
  const canPurchase = canPurchaseProp ?? isOwnerByContext;
  const memberMessage =
    memberMessageProp ??
    meta?.memberMessage ??
    `פיצ'ר זה יהיה זמין לך כאשר בעל הפרויקט ישדרג ל-${tierLabel}.`;
  const upgradeReason = upgradeReasonProp ?? meta?.upgradeReason ?? description;

  const upgrade = () => openUpgradeModal({ tier: resolvedTier, title, reason: upgradeReason });

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
          ? (interactive ? 'נתוני דוגמה בלבד (וילה משפחת לוי) — לחץ והתנסה בחופשיות.' : 'נתוני דוגמה בלבד — כך זה ייראה אצלך.')
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
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '20px 22px',
            boxShadow: '0 10px 28px rgba(0,0,0,0.08)',
          }}
        >
          <div className="feature-teaser__card-main">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: 'grid', placeItems: 'center', color: '#fff',
                  background: 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)', boxShadow: '0 6px 14px rgba(217,119,6,0.3)',
                }}
              >
                <Icon n="lock" s={18} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 800, letterSpacing: '.4px', color: '#fff', background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', borderRadius: 999, padding: '2px 9px' }}>
                    {tierLabel}
                  </span>
                  <h3 id={headingId} style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text1)' }}>{title}</h3>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--text2)', lineHeight: 1.55 }}>{description}</p>
              </div>
            </div>

            <ul className="feature-teaser__benefits" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {benefits.map((b) => (
                <li key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13.5, color: 'var(--text1)', lineHeight: 1.45 }}>
                  <span style={{ color: 'var(--success, #10B981)', display: 'inline-flex', marginTop: 2, flexShrink: 0 }}>
                    <Icon n="check" s={15} />
                  </span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="feature-teaser__card-cta">{cta}</div>
        </div>

        {/* Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <div
            style={{
              position: 'relative', border: '2px dashed var(--accent)', borderRadius: 16, background: 'var(--bg)', overflow: 'hidden',
              ...(interactive ? {} : { maxHeight: previewHeight }),
            }}
          >
            {demoBanner('top')}
            {interactive ? (
              <div className="feature-teaser__preview-body">{preview}</div>
            ) : (
              <>
                <div aria-hidden="true" inert className="feature-teaser__preview-body" style={{ pointerEvents: 'none', userSelect: 'none' }}>{preview}</div>
                <div aria-hidden="true" style={{ position: 'absolute', insetInline: 0, bottom: 0, height: '35%', background: 'linear-gradient(180deg, transparent 0%, var(--bg) 95%)' }} />
              </>
            )}
            {interactive && demoBanner('bottom')}
          </div>

          {/* Repeat CTA after the demo so users who scrolled through the interactive preview can upgrade right away. */}
          {canPurchase && (
            <div className="feature-teaser__bottom-cta" style={{ flexDirection: 'column', gap: 8 }}>{cta}</div>
          )}
        </div>
      </div>
    </section>
  );
};
