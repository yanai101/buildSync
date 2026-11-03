import { createFileRoute, notFound } from '@tanstack/react-router'
import { FeatureTeaser } from '~/components/FeatureTeaser'
import { RoomsArchivePreview } from '~/components/roomArchive/RoomsArchivePreview'
import { ArchiveDocsPreview, ArchiveImagesPreview } from '~/components/archive/ArchivePreviews'

/**
 * DEV ONLY — gallery of FeatureTeaser variants for visual review (light/dark,
 * owner vs. team member). Returns 404 outside the dev server.
 */
function TeaserGallery() {
  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
      <h2 style={{ margin: 0 }}>FeatureTeaser — dev gallery</h2>

      <section data-testid="teaser-rooms-owner">
        <h3>Rooms · Pro · owner</h3>
        <FeatureTeaser
          tier="pro"
          title="תיעוד תמונות לפי חדרים"
          description="תעד כל חדר בבית לאורך שלבי הבנייה, כדי לדעת בדיוק מה עובר בתוך הקירות גם אחרי שהם נסגרים."
          benefits={[
            'תמונות לכל חדר לפי שלבי הבנייה — שלד, מערכות גולמיות, טיח, ריצוף וגמרים',
            'קטגוריות (חשמל, אינסטלציה, מיזוג…), תיאור קצר והערות לכל תמונה',
            'השוואת לפני / אחרי בין שלבים',
            'דוח PDF להדפסה לכל חדר וייצוא מסודר לפי חדר ושלב',
          ]}
          preview={<RoomsArchivePreview />}
          interactive
          canPurchase
        />
      </section>

      <section data-testid="teaser-images-owner">
        <h3>Archive photos · Pro · owner</h3>
        <FeatureTeaser
          tier="pro"
          title="תמונות ארכיון"
          description="שמור צילומים חשובים של הפרויקט בקבוצות, עם הערות לכל תמונה, והפק מהם דוח מרוכז בלחיצה."
          benefits={['קבוצות תמונות לפי נושא', 'הערה לכל תמונה', 'דוח PDF מרוכז']}
          preview={<ArchiveImagesPreview />}
          canPurchase
        />
      </section>

      <section data-testid="teaser-docs-member">
        <h3>Archive documents · Pro · team member (no purchase)</h3>
        <FeatureTeaser
          tier="pro"
          title="מסמכי הפרויקט"
          description="כל המסמכים החשובים במקום אחד — היתרים, חוזים ותכניות."
          benefits={['היתרים, חוזים ותכניות', 'הערות לכל מסמך', 'צפייה והורדה מכל מכשיר']}
          preview={<ArchiveDocsPreview />}
          canPurchase={false}
          memberMessage="הארכיון יהיה זמין לך כאשר בעל הפרויקט ישדרג ל-Pro או Premium."
        />
      </section>
    </div>
  )
}

export const Route = createFileRoute('/dev/teasers')({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound()
  },
  component: TeaserGallery,
})
