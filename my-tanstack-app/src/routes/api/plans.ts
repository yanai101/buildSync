import { createFileRoute } from '@tanstack/react-router'
import { isPlanAvailable } from '~/server/billing/products'

/**
 * Public, read-only: which subscription tiers can currently be purchased in
 * this environment. Lets the upgrade modal show "coming soon" instead of a
 * checkout button for tiers whose Polar products aren't configured yet.
 */
export const Route = createFileRoute('/api/plans')({
  server: {
    handlers: {
      GET: async () =>
        Response.json(
          {
            pro: isPlanAvailable('monthly') || isPlanAvailable('annual'),
            premium: isPlanAvailable('premium_monthly') || isPlanAvailable('premium_annual'),
          },
          { headers: { 'Cache-Control': 'no-store' } },
        ),
    },
  },
})
