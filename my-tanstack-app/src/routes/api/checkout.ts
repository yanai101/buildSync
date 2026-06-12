import { createFileRoute } from '@tanstack/react-router'
import { Checkout } from "@polar-sh/tanstack-start";
import type { BillingPlan } from '~/billing';

const isProd = process.env.NODE_ENV === 'production';
const baseUrl = isProd ? 'https://buildsync.co.il' : 'http://localhost:3000';
const polarServer = (process.env.POLAR_SERVER as "sandbox" | "production") || "sandbox";

// The sandbox org has its own copies of the Pro products with different IDs,
// so the plan→product mapping must follow POLAR_SERVER.
const PRODUCT_IDS: Record<"sandbox" | "production", Record<BillingPlan, string>> = {
  production: {
    monthly: '30b1595a-9bda-4258-95e6-6836de2c7547',
    annual: 'a2eab161-dd1c-48b4-b870-bd7d7a0a3101',
  },
  sandbox: {
    monthly: '0fbf2c19-6302-4bf6-b5be-d0317632513f',
    annual: '140a20ee-cfa9-4f0c-b1ca-21234c5f80fb',
  },
};

const polarCheckout = Checkout({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  successUrl: `${baseUrl}/account?success=true`,
  returnUrl: `${baseUrl}/account`,
  server: polarServer,
  theme: "light",
});

export const Route = createFileRoute("/api/checkout")({
  server: {
    handlers: {
      GET: async (ctx) => {
        const url = new URL(ctx.request.url);
        const plan = url.searchParams.get('plan') as BillingPlan | null;
        const productId = plan ? PRODUCT_IDS[polarServer][plan] : undefined;
        if (!productId) {
          return Response.json({ error: 'Unknown plan' }, { status: 400 });
        }
        url.searchParams.delete('plan');
        // Only the server-resolved product may be purchased — drop any
        // client-supplied product IDs.
        url.searchParams.delete('products');
        url.searchParams.set('products', productId);
        return polarCheckout({ ...ctx, request: new Request(url, ctx.request) });
      },
    },
  },
});
