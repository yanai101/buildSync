import React, { useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { FinancingScreen } from '~/screens/FinancingScreen'
import { useRequireRole } from '~/hooks/useRequireRole'
import { useSubscription } from '~/hooks/useSubscription'
import { AccessDenied, AccessLoading } from '~/components/AccessDenied'
import { SubscriptionLock } from '~/components/Shared'
import { openUpgradeModal } from '~/components/UpgradeModalHost'

function GuardedFinancing() {
  const { allowed, loading: roleLoading, role } = useRequireRole(['owner'])
  const { isProOrPremium, isLoaded } = useSubscription()

  useEffect(() => {
    if (isLoaded && !roleLoading && role === 'owner' && !isProOrPremium) {
      openUpgradeModal({ 
        title: 'מימון פרויקט', 
        reason: 'עקוב אחר כל מקורות המימון של הפרויקט במקום אחד.' 
      })
    }
  }, [isLoaded, roleLoading, role, isProOrPremium])

  if (roleLoading || !isLoaded) return <AccessLoading />
  
  if (!allowed) return <AccessDenied />

  if (!isProOrPremium) {
    return (
      <SubscriptionLock
        title="מימון פרויקט זמין במסלול Pro ומעלה"
        description="ניהול מקורות מימון, משיכות בנק ותמונת המצב הפיננסי של הפרויקט — זמין למנויים."
      />
    )
  }

  return <FinancingScreen />
}

export const Route = createFileRoute('/financing')({
  component: GuardedFinancing,
})
