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

// Add poster enhancement job - runs daily to improve image quality
crons.interval(
  "enhanceAnimePosterQuality",
  { hours: 24 }, // Run once daily
  internal.externalApis.enhanceExistingAnimePosters,
  {}
);

export default crons;