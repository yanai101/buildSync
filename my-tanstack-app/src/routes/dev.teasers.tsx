import { createFileRoute, notFound } from '@tanstack/react-router'
import { FeatureTeaser } from '~/components/FeatureTeaser'
import { RoomsArchivePreview } from '~/components/roomArchive/RoomsArchivePreview'
import { ArchiveDocsPreview, ArchiveImagesPreview } from '~/components/archive/ArchivePreviews'
import {
  AnalyticsPreview,
  BOQPreview,
  BOQWizardPreview,
  DailyLogsPreview,
  FinancingPreview,
  OrdersPreview,
  PermitsPreview,
} from '~/components/teaser/previews'

/**
 * DEV ONLY — gallery of all FeatureTeaser variants for visual and E2E review
 * (light/dark, desktop/mobile, owner vs. team member). Returns 404 outside dev.
 */
function TeaserGallery() {
  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
      <h2 style={{ margin: 0 }}>FeatureTeaser — dev gallery</h2>

      <section data-testid="teaser-rooms-owner">
        <h3>Rooms · Pro · owner</h3>
        <FeatureTeaser
          feature="archiveRooms"
          requiredPlan="pro"
          preview={<RoomsArchivePreview />}
          canPurchase
        />
      </section>

      <section data-testid="teaser-analytics-owner">
        <h3>Analytics · Pro · owner</h3>
        <FeatureTeaser
          feature="analytics"
          requiredPlan="pro"
          preview={<AnalyticsPreview />}
          canPurchase
        />
      </section>

      <section data-testid="teaser-boq-owner">
        <h3>BOQ · Pro · owner</h3>
        <FeatureTeaser
          feature="boq"
          requiredPlan="pro"
          preview={<BOQPreview />}
          canPurchase
        />
      </section>

      <section data-testid="teaser-boqwizard-owner">
        <h3>BOQ Wizard · Pro · owner</h3>
        <FeatureTeaser
          feature="boqwizard"
          requiredPlan="pro"
          preview={<BOQWizardPreview />}
          canPurchase
        />
      </section>

      <section data-testid="teaser-dailylogs-owner">
        <h3>Daily Logs · Pro · owner</h3>
        <FeatureTeaser
          feature="dailyLogs"
          requiredPlan="pro"
          preview={<DailyLogsPreview />}
          canPurchase
        />
      </section>

      <section data-testid="teaser-orders-owner">
        <h3>Orders · Pro · owner</h3>
        <FeatureTeaser
          feature="orders"
          requiredPlan="pro"
          preview={<OrdersPreview />}
          canPurchase
        />
      </section>

      <section data-testid="teaser-permits-owner">
        <h3>Permits · Pro · owner</h3>
        <FeatureTeaser
          feature="permits"
          requiredPlan="pro"
          preview={<PermitsPreview />}
          canPurchase
        />
      </section>

      <section data-testid="teaser-financing-owner">
        <h3>Financing · Pro · owner</h3>
        <FeatureTeaser
          feature="financing"
          requiredPlan="pro"
          preview={<FinancingPreview />}
          canPurchase
        />
      </section>

      <section data-testid="teaser-images-owner">
        <h3>Archive photos · Pro · owner</h3>
        <FeatureTeaser
          feature="archiveImages"
          requiredPlan="pro"
          preview={<ArchiveImagesPreview />}
          canPurchase
        />
      </section>

      <section data-testid="teaser-docs-member">
        <h3>Archive documents · Pro · team member (no purchase)</h3>
        <FeatureTeaser
          feature="archiveDocs"
          requiredPlan="pro"
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
