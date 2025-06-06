// convex/crons.ts - Clean version that removes all non-existent internal.crons references

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// ==============================================
// EXISTING SYSTEM MAINTENANCE JOBS
// ==============================================

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

// Legacy poster enhancement job
crons.interval(
  "enhanceAnimePosterQuality",
  { hours: 12 },
  internal.externalApis.enhanceExistingAnimePostersBetter,
  {}
);

// ==============================================
// SMART AUTO-REFRESH JOBS (Using existing system)
// ==============================================

// High-frequency smart refresh for critical updates
crons.interval(
  "smartRefreshCritical",
  { hours: 2 },
  internal.autoRefresh.batchSmartAutoRefresh,
  {
    triggerType: "scheduled",
    maxToProcess: 15,
    priorityFilter: ["critical"]
  }
);

// Medium-frequency smart refresh for high priority updates
crons.interval(
  "smartRefreshHigh",
  { hours: 6 },
  internal.autoRefresh.batchSmartAutoRefresh,
  {
    triggerType: "scheduled",
    maxToProcess: 25,
    priorityFilter: ["critical", "high"]
  }
);

// Daily smart refresh for medium priority updates
crons.daily(
  "smartRefreshMedium",
  { hourUTC: 3, minuteUTC: 0 },
  internal.autoRefresh.batchSmartAutoRefresh,
  {
    triggerType: "scheduled",
    maxToProcess: 40,
    priorityFilter: ["critical", "high", "medium"]
  }
);

// Weekly comprehensive smart refresh
crons.weekly(
  "smartRefreshComprehensive",
  { dayOfWeek: "sunday", hourUTC: 1, minuteUTC: 0 },
  internal.autoRefresh.batchSmartAutoRefresh,
  {
    triggerType: "maintenance",
    maxToProcess: 100,
    priorityFilter: ["critical", "high", "medium", "low"]
  }
);

// Legacy episode data batch update job
crons.daily(
  "batchUpdateEpisodeData",
  { hourUTC: 4, minuteUTC: 0 },
  internal.externalApis.batchUpdateEpisodeDataForAllAnime,
  {
    batchSize: 5,
    maxAnimeToProcess: 30
  }
);

// Weekly comprehensive poster check
crons.weekly(
  "weeklyPosterQualityCheck",
  { dayOfWeek: "saturday", hourUTC: 2, minuteUTC: 0 },
  internal.externalApis.enhanceExistingAnimePostersBetter,
  {}
);

// Smart refresh for currently airing anime (more frequent updates)
crons.interval(
  "smartRefreshAiring",
  { hours: 4 },
  internal.autoRefresh.batchSmartAutoRefresh,
  {
    triggerType: "scheduled",
    maxToProcess: 20,
    priorityFilter: ["critical", "high", "medium"]
  }
);

// Maintenance job
crons.weekly(
  "maintenanceSmartRefresh",
  { dayOfWeek: "monday", hourUTC: 5, minuteUTC: 0 },
  internal.autoRefresh.batchSmartAutoRefresh,
  {
    triggerType: "maintenance",
    maxToProcess: 200,
    priorityFilter: ["critical", "high", "medium", "low"]
  }
);

export default crons;

/* 
==============================================
FUTURE: SPECIALIZED CRON JOBS 
==============================================

Once you implement the specialized actions in convex/externalApis.ts, 
you can add these specialized cron jobs:

// Airing anime refresh (every 4 hours)
crons.interval(
  "refreshAiringAnimeData",
  { hours: 4 },
  internal.externalApis.batchRefreshAiringAnimeData,
  {
    maxToProcess: 15,
    dataTypes: ["metadata", "episodes"]
  }
);

// Daily poster quality refresh
crons.daily(
  "dailyPosterQualityRefresh",
  { hourUTC: 2, minuteUTC: 0 },
  internal.externalApis.batchRefreshMissingPosters,
  {
    maxToProcess: 25,
    prioritizeNew: true
  }
);

// Daily missing episodes refresh
crons.daily(
  "dailyMissingEpisodesRefresh", 
  { hourUTC: 4, minuteUTC: 0 },
  internal.externalApis.batchRefreshMissingEpisodes,
  {
    maxToProcess: 20,
    prioritizeCompleted: true
  }
);

// Weekly metadata refresh
crons.weekly(
  "weeklyMetadataRefresh",
  { dayOfWeek: "sunday", hourUTC: 1, minuteUTC: 0 },
  internal.externalApis.batchRefreshMetadata,
  {
    maxToProcess: 40,
    includeCharacters: true,
    refreshStaleData: true
  }
);

// Weekly character data refresh
crons.weekly(
  "weeklyCharacterDataRefresh",
  { dayOfWeek: "saturday", hourUTC: 3, minuteUTC: 0 },
  internal.externalApis.batchRefreshCharacterData,
  {
    maxToProcess: 30,
    prioritizeMainCharacters: true
  }
);

// Monthly comprehensive poster audit
crons.monthly(
  "monthlyPosterQualityAudit",
  { day: 1, hourUTC: 5, minuteUTC: 0 },
  internal.externalApis.comprehensivePosterQualityRefresh,
  {
    maxToProcess: 100,
    auditMode: true,
    forceHighQuality: true
  }
);

*/