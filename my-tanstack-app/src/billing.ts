// Checkout helpers — single place to keep plan keys in sync across the
// account page, upgrade modal, and any future entry point. The plan key is
// mapped to the actual Polar product ID server-side in /api/checkout, so the
// client never deals with (or can tamper with) product IDs, and local dev
// against the Polar sandbox resolves to sandbox products automatically.

export type BillingPlan = 'monthly' | 'annual' | 'premium_monthly' | 'premium_annual';

export type BillingTier = 'pro' | 'premium';

/** Plan keys per tier, in the order they're offered (annual first). */
export const PLANS_FOR_TIER: Record<BillingTier, { annual: BillingPlan; monthly: BillingPlan }> = {
  pro: { annual: 'annual', monthly: 'monthly' },
  premium: { annual: 'premium_annual', monthly: 'premium_monthly' },
};

/** Builds the checkout URL, binding the purchase to the user's own account. */
export function checkoutUrl(plan: BillingPlan, customerExternalId: string): string {
  return `/api/checkout?plan=${plan}&customerExternalId=${customerExternalId}`;
}
