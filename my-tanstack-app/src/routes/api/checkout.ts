import { createFileRoute } from '@tanstack/react-router'
import { Checkout } from "@polar-sh/tanstack-start";
import type { BillingPlan } from '~/billing';
import { polarServer, productIdFor } from '~/server/billing/products';

const isProd = process.env.NODE_ENV === 'production';
const baseUrl = isProd ? 'https://buildsync.co.il' : 'http://localhost:3000';

export const Route = createFileRoute("/api/checkout")({
  server: {
    handlers: {
      GET: async (ctx) => {
        const url = new URL(ctx.request.url);
        const plan = url.searchParams.get('plan') as BillingPlan | null;
        const productId = productIdFor(plan);
        if (!productId) {
          return Response.json({ error: 'Unknown plan' }, { status: 400 });
        }
        url.searchParams.delete('plan');
        // Only the server-resolved product may be purchased — drop any
        // client-supplied product IDs.
        url.searchParams.delete('products');
        url.searchParams.set('products', productId);
        
        try {
          if (!process.env.POLAR_ACCESS_TOKEN) {
            throw new Error("POLAR_ACCESS_TOKEN is not defined in environment variables");
          }

          const polarCheckout = Checkout({
            accessToken: process.env.POLAR_ACCESS_TOKEN,
            successUrl: `${baseUrl}/account?success=true`,
            returnUrl: `${baseUrl}/account`,
            server: polarServer,
            theme: "light",
          });

          return await polarCheckout({ ...ctx, request: new Request(url, ctx.request) });
        } catch (error) {
          return new Response("Internal Server Error", { status: 500 });
        }
      },
    },
  },
});
