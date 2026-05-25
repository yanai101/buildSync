import { createFileRoute } from '@tanstack/react-router'
import { Checkout } from "@polar-sh/tanstack-start";

const isProd = process.env.NODE_ENV === 'production';
const baseUrl = isProd ? 'https://buildsync.co.il' : 'http://localhost:3000';

export const Route = createFileRoute("/api/checkout")({
  server: {
    handlers: {
      GET: Checkout({
        accessToken: process.env.POLAR_ACCESS_TOKEN,
        successUrl: `${baseUrl}/account?success=true`,
        returnUrl: `${baseUrl}/account`,
        server: (process.env.POLAR_SERVER as "sandbox" | "production") || "sandbox",
        theme: "light",
      }),
    },
  },
});
