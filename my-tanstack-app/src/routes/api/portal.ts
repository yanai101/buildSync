import { createFileRoute } from '@tanstack/react-router'
import { CustomerPortal } from "@polar-sh/tanstack-start";
// In a real app we'd get the user from session. Here we will pass customerId via query param.

const isProd = process.env.NODE_ENV === 'production';
const baseUrl = isProd ? 'https://buildsync.co.il' : 'http://localhost:3000';

export const Route = createFileRoute("/api/portal")({
  server: {
    handlers: {
      GET: async (event) => {
        const url = new URL(event.request.url);
        const customerId = url.searchParams.get("customerId");
        
        // If customerId is missing or literally the string "undefined", redirect back
        if (!customerId || customerId === "undefined") {
          return new Response(null, {
            status: 302,
            headers: { Location: `${baseUrl}/account?error=no_customer_id` },
          });
        }

        const handler = CustomerPortal({
          accessToken: process.env.POLAR_ACCESS_TOKEN!,
          getCustomerId: async () => customerId,
          returnUrl: `${baseUrl}/account`,
          server: (process.env.POLAR_SERVER as "sandbox" | "production") || "sandbox", 
        });

        return handler(event);
      },
    },
  },
});
