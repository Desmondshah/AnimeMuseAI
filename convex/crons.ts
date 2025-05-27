// convex/crons.ts
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

export default crons;