// convex/crons.ts - Add poster enhancement job
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "updateFilterOptionsMetadata",
  { hours: 6 },
  internal.anime.internalUpdateFilterMetadata,
  {}
);

crons.interval(
  "cleanupExpiredPhoneVerifications",
  { minutes: 30 },
  internal.users.scheduledCleanupExpiredPhoneVerifications,
  {}
);

// Updated poster enhancement job - runs more frequently with better logic
crons.interval(
  "enhanceAnimePosterQuality",
  { hours: 12 }, // Run twice daily instead of once daily
  internal.externalApis.enhanceExistingAnimePostersBetter, // Use the better version
  {}
);

// Optional: Add a weekly comprehensive poster check
crons.weekly(
  "weeklyPosterQualityCheck",
  { dayOfWeek: "sunday", hourUTC: 2, minuteUTC: 0 }, // Sunday at 2 AM UTC
  internal.externalApis.enhanceExistingAnimePostersBetter,
  {}
);

export default crons;