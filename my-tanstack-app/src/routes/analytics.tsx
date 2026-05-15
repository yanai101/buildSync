import { createFileRoute } from '@tanstack/react-router';
import { AnalyticsScreen } from '~/screens/AnalyticsScreen';
import { useRequireRole } from '~/hooks/useRequireRole';
import { AccessDenied, AccessLoading } from '~/components/AccessDenied';

function GuardedAnalytics() {
  const { allowed, loading } = useRequireRole(['owner', 'manager']);
  if (loading) return <AccessLoading />;
  if (!allowed) return <AccessDenied />;
  return <AnalyticsScreen />;
}

export const Route = createFileRoute('/analytics')({
  component: GuardedAnalytics,
});
