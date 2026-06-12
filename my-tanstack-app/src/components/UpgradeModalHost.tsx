import React from 'react'
import { useRouterState } from '@tanstack/react-router'
import { UpgradeModal } from './UpgradeModal'

export const UPGRADE_EVENT = 'buildsync:open-upgrade'

type UpgradeDetail = { title?: string; reason?: string }

/** Fire from anywhere to open the upgrade modal. */
export function openUpgradeModal(detail: UpgradeDetail = {}) {
  window.dispatchEvent(new CustomEvent(UPGRADE_EVENT, { detail }))
}

/**
 * Single mount point for the upgrade modal. Listens for `buildsync:open-upgrade`
 * window events so any component (including PremiumLock, which lives in Shared)
 * can trigger the modal without an import cycle.
 */
export function UpgradeModalHost() {
  const [detail, setDetail] = React.useState<UpgradeDetail | null>(null)
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  React.useEffect(() => {
    const handler = (e: Event) => {
      setDetail((e as CustomEvent<UpgradeDetail>).detail ?? {})
    }
    window.addEventListener(UPGRADE_EVENT, handler)
    return () => window.removeEventListener(UPGRADE_EVENT, handler)
  }, [])

  // The host lives in the persistent Layout, so its state survives route
  // changes. Close the modal whenever the route changes so a modal opened on one
  // screen (e.g. Permits) can never linger on top of another (e.g. Daily Logs).
  React.useEffect(() => {
    setDetail(null)
  }, [pathname])

  if (!detail) return null

  return (
    <UpgradeModal
      title={detail.title}
      reason={detail.reason}
      onClose={() => setDetail(null)}
    />
  )
}
