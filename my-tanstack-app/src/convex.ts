import { ConvexReactClient } from 'convex/react';
import { requireEnv } from './utils/envGuard';

// requireEnv rather than a bare throw: the old message said "run npx convex
// dev", which is misleading in a deployed environment, where the real cause is
// almost always a Vercel env var scoped to Production only.
const url = requireEnv(
  'VITE_CONVEX_URL',
  import.meta.env.VITE_CONVEX_URL as string | undefined,
  'Vercel → Settings → Environment Variables for ALL environments (or let `npx convex deploy --cmd-url-env-var-name VITE_CONVEX_URL` inject it); locally `npx convex dev` writes it into .env.local',
);

export const convex = new ConvexReactClient(url);
