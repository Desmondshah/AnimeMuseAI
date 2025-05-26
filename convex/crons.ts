// convex/crons.ts - Updated with verification cleanup
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Schedule the filter metadata update to run every 6 hours
crons.interval(
  "updateFilterOptionsMetadata",
  { hours: 6 }, // Adjust interval as needed
  internal.anime.internalUpdateFilterMetadata,
  {} // Arguments for the internal mutation (none in this case)
);

// Schedule cleanup of expired verification codes every 30 minutes
crons.interval(
  "cleanupExpiredVerifications",
  { minutes: 30 },
  internal.users.scheduledCleanupExpiredVerifications,
  {}
);

// Optional: Daily cleanup at a specific time (e.g., 2 AM UTC)
// crons.cron(
//   "dailyCleanupExpiredVerifications",
//   { hourUTC: 2, minuteUTC: 0 },
//   internal.users.scheduledCleanupExpiredVerifications,
//   {}
// );

export default crons;