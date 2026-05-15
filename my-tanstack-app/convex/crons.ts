import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run cleanup every day at 2:00 AM (UTC)
crons.daily(
  "Data Retention Cleanup",
  { hourUTC: 2, minuteUTC: 0 },
  internal.cleanup.performCleanupBatch
);

export default crons;
