import { createFileRoute } from '@tanstack/react-router';
import { AnalyticsScreen } from '~/screens/AnalyticsScreen';
import { useRequireRole } from '~/hooks/useRequireRole';
import { useSubscription } from '~/hooks/useSubscription';
import { AccessDenied, AccessLoading } from '~/components/AccessDenied';
import { FeatureTeaser } from '~/components/FeatureTeaser';
import { AnalyticsPreview } from '~/components/teaser/previews/AnalyticsPreview';

function GuardedAnalytics() {
  const { allowed, loading } = useRequireRole(['owner', 'manager']);
  const { isProOrPremium, isLoaded } = useSubscription();
  if (loading || !isLoaded) return <AccessLoading />;
  if (allowed) return <AnalyticsScreen />;
  if (!isProOrPremium)
    return (
      <div className="page-content">
        <FeatureTeaser feature="analytics" requiredPlan="pro" preview={<AnalyticsPreview />} />
      </div>
    );
  return <AccessDenied message="צפייה בדוחות וסטטיסטיקות מורשית למנהלי הפרויקט בלבד." />;
}

export const Route = createFileRoute('/analytics')({
  component: GuardedAnalytics,
});
