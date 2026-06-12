import { createFileRoute } from '@tanstack/react-router'

const isProd = process.env.NODE_ENV === 'production';
const baseUrl = isProd ? 'https://buildsync.co.il' : 'http://localhost:3000';

// DEPRECATED & intentionally inert.
//
// This route previously trusted a `?customerId=` query param and opened the
// Polar customer portal for whatever customer was named — an IDOR that let
// anyone open another user's billing portal. Server route handlers here have no
// access to the Convex auth session (the token lives client-side), so the
// portal session is now created by the authenticated Convex action
// `api.users.createPortalSession`, called from the account page. This route
// just bounces any stale links back to /account.
export const Route = createFileRoute("/api/portal")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(null, {
          status: 302,
          headers: { Location: `${baseUrl}/account` },
        });
      },
    },
  },
});
