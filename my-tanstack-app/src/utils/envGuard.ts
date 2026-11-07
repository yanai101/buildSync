/**
 * Named errors for missing environment variables.
 *
 * Why: when a Vercel env var is scoped to Production only, preview deployments
 * throw during SSR and the visitor gets an opaque 500 with nothing in it to act
 * on. The deploy looks fine; the page is blank. This turns that into a message
 * that names the variable, the environment it is missing from, and where to set
 * it — a 20-minute debug becomes a 5-second one.
 *
 * Source of truth for which var belongs where: ../../env.schema.json.
 */

/** Which deployment this code is running in, as far as it can tell. */
export function deploymentContext(): string {
  // process is absent in the browser bundle; import.meta.env is absent in some
  // server contexts. Check both defensively — this runs on the error path and
  // must never itself throw.
  try {
    if (typeof process !== 'undefined' && process.env?.VERCEL_ENV) {
      return `Vercel ${process.env.VERCEL_ENV}`;
    }
    if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
      return `local ${process.env.NODE_ENV}`;
    }
  } catch {
    /* ignore */
  }
  try {
    if (import.meta.env?.DEV) return 'local dev';
    if (import.meta.env?.MODE) return `build ${import.meta.env.MODE}`;
  } catch {
    /* ignore */
  }
  return 'unknown environment';
}

/**
 * Throw a message that says what to do, instead of letting a `!`-asserted
 * undefined surface as a 500 three frames later.
 */
export function requireEnv(name: string, value: string | undefined, where: string): string {
  if (value !== undefined && value !== '') return value;
  throw new Error(
    `Missing ${name} in ${deploymentContext()}.\n` +
      `  Set it in: ${where}\n` +
      `  Declared homes: see env.schema.json\n` +
      `  Check every environment with: node scripts/check-env.mjs --remote\n` +
      `  A var scoped to Vercel "Production" only will 500 on Preview during SSR — ` +
      `that is the most common cause of this error.`,
  );
}
