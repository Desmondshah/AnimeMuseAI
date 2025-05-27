// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Schedule the filter metadata update to run every 6 hours
crons.interval(
  "updateFilterOptionsMetadata",
  { hours: 6 },
  internal.anime.internalUpdateFilterMetadata, // Assuming this still exists and is wanted
  {}
);

// Schedule cleanup of expired PHONE verification codes every 30 minutes
crons.interval(
  "cleanupExpiredPhoneVerifications", // New name for clarity
  { minutes: 30 }, // Or your desired interval
  internal.users.scheduledCleanupExpiredPhoneVerifications, // Points to the new action in users.ts
  {}
);

// Optional: Daily cleanup at a specific time (e.g., 2 AM UTC)
// crons.cron(
//   "dailyCleanupExpiredPhoneVerifications",
//   { hourUTC: 2, minuteUTC: 0 }, // Example: 2 AM UTC daily
//   internal.users.scheduledCleanupExpiredPhoneVerifications,
//   {}
// );

export default crons;