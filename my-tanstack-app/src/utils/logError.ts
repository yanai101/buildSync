/**
 * logError
 * 
 * Central entry point for error telemetry.
 * Currently logs to console, but can be easily swapped for Sentry/PostHog.
 */
export function logError(err: unknown, ctx: { op: string; args?: any }): void {
  const prefix = '[BuildSync Error]';
  const timestamp = new Date().toISOString();

  console.group(`${prefix} ${ctx.op} at ${timestamp}`);
  console.error('Error:', err);
  if (ctx.args) {
    console.log('Arguments:', ctx.args);
  }
  console.groupEnd();

  // Future: Send to Sentry
  // Sentry.captureException(err, { extra: ctx });
}
