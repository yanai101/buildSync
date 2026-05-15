import { createFileRoute } from '@tanstack/react-router'
import { CustomerPortal } from "@polar-sh/tanstack-start";
// In a real app we'd get the user from session. Here we will pass customerId via query param.

export const Route = createFileRoute("/api/portal")({
  server: {
    handlers: {
      GET: CustomerPortal({
        accessToken: process.env.POLAR_ACCESS_TOKEN!,
        getCustomerId: async (request: Request) => {
          const url = new URL(request.url);
          return url.searchParams.get("customerId") || "";
        },
        returnUrl: process.env.RETURN_URL || "http://localhost:3000/account",
        server: "sandbox", 
      }),
    },
  },
});
