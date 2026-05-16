import { createFileRoute } from '@tanstack/react-router'
import { CustomerPortal } from "@polar-sh/tanstack-start";
// In a real app we'd get the user from session. Here we will pass customerId via query param.

const isProd = process.env.NODE_ENV === 'production';
const baseUrl = isProd ? 'https://buildsync.co.il' : 'http://localhost:3000';

export const Route = createFileRoute("/api/portal")({
  server: {
    handlers: {
      GET: CustomerPortal({
        accessToken: process.env.POLAR_ACCESS_TOKEN!,
        getCustomerId: async (request: Request) => {
          const url = new URL(request.url);
          return url.searchParams.get("customerId") || "";
        },
        returnUrl: `${baseUrl}/account`,
        server: "production", 
      }),
    },
  },
});
