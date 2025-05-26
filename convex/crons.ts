// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Schedule the filter metadata update to run, for example, every 6 hours
crons.interval(
  "updateFilterOptionsMetadata",
  { hours: 6 }, // Adjust interval as needed (e.g., { minutes: 60*6 })
  internal.anime.internalUpdateFilterMetadata,
  {} // Arguments for the internal mutation (none in this case)
);

// Example for a daily cron:
// crons.daily("updateFilterOptionsMetadataDaily", { hourUTC: 8, minuteUTC: 0 }, internal.anime.internalUpdateFilterMetadata, {});

export default crons;