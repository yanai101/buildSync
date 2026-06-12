import { createFileRoute } from '@tanstack/react-router';
import { AnalyticsScreen } from '~/screens/AnalyticsScreen';
import { useRequireRole } from '~/hooks/useRequireRole';
import { useSubscription } from '~/hooks/useSubscription';
import { AccessDenied, AccessLoading } from '~/components/AccessDenied';
import { SubscriptionLock } from '~/components/Shared';

function GuardedAnalytics() {
  const { allowed, loading } = useRequireRole(['owner', 'manager']);
  const { isProOrPremium, isLoaded } = useSubscription();
  if (loading || !isLoaded) return <AccessLoading />;
  // Owners/managers reach the screen, which shows its own in-place upgrade
  // teaser when unsubscribed. Everyone else who is unsubscribed gets the upgrade
  // prompt (not a bare "no access"); only subscribed wrong-role users see the
  // role denial.
  if (allowed) return <AnalyticsScreen />;
  if (!isProOrPremium)
    return (
      <SubscriptionLock
        title="דוחות וסטטיסטיקות מתקדמות"
        description="ניתוח נתונים, גרפים, והתפלגות הוצאות ומשימות. שדרג ל-Pro כדי לקבל גישה."
      />
    );
  return <AccessDenied message="צפייה בדוחות וסטטיסטיקות מורשית למנהלי הפרויקט בלבד." />;
}

export const Route = createFileRoute('/analytics')({
  component: GuardedAnalytics,
});
