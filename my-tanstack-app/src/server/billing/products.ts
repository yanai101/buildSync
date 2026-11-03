// Server-only: maps billing plan keys to Polar product IDs per environment.
// Shared by /api/checkout (purchase) and /api/plans (availability).
import type { BillingPlan } from '~/billing';

export type PolarServer = 'sandbox' | 'production';

const isProd = process.env.NODE_ENV === 'production';

export const polarServer: PolarServer =
  (process.env.POLAR_SERVER as PolarServer) || (isProd ? 'production' : 'sandbox');

// The sandbox org has its own copies of the products with different IDs, so
// the plan→product mapping must follow POLAR_SERVER.
// Premium products: add their IDs here once they exist in Polar (the product
// name must contain "Premium" — the webhook derives the tier from the name).
// Until then the Premium plans are reported as unavailable by /api/plans and
// the upgrade modal shows "coming soon" instead of a checkout button.
export const PRODUCT_IDS: Record<PolarServer, Partial<Record<BillingPlan, string>>> = {
  production: {
    monthly: '30b1595a-9bda-4258-95e6-6836de2c7547',
    annual: 'a2eab161-dd1c-48b4-b870-bd7d7a0a3101',
    // premium_monthly: '',
    // premium_annual: '',
  },
  sandbox: {
    monthly: '0fbf2c19-6302-4bf6-b5be-d0317632513f',
    annual: '140a20ee-cfa9-4f0c-b1ca-21234c5f80fb',
    // premium_monthly: '',
    // premium_annual: '',
  },
};

export const productIdFor = (plan: string | null | undefined): string | undefined => {
  const map = PRODUCT_IDS[polarServer];
  // Own-property check: `plan` comes from the query string, so never let a
  // value like "__proto__" resolve to something on the prototype chain.
  if (!plan || !Object.hasOwn(map, plan)) return undefined;
  const id = map[plan as BillingPlan];
  return typeof id === 'string' && id.length > 0 ? id : undefined;
};

export const isPlanAvailable = (plan: BillingPlan) => Boolean(productIdFor(plan));
