import { createFileRoute } from '@tanstack/react-router'
import { Checkout } from "@polar-sh/tanstack-start";

export const Route = createFileRoute("/api/checkout")({
  server: {
    handlers: {
      GET: Checkout({
        accessToken: process.env.POLAR_ACCESS_TOKEN,
        successUrl: process.env.SUCCESS_URL || "http://localhost:3000/account?success=true",
        returnUrl: process.env.RETURN_URL || "http://localhost:3000/account",
        server: "sandbox", // TODO: change to production when ready
        theme: "light",
      }),
    },
  },
});
