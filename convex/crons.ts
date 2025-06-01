// convex/crons.ts - Enhanced with Smart Auto-Refresh Jobs
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Existing jobs
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

// Legacy poster enhancement job (keeping for now)
crons.interval(
  "enhanceAnimePosterQuality",
  { hours: 12 },
  internal.externalApis.enhanceExistingAnimePostersBetter,
  {}
);

// NEW: Smart auto-refresh jobs with intelligent prioritization

// High-frequency smart refresh for critical updates
crons.interval(
  "smartRefreshCritical",
  { hours: 2 }, // Every 2 hours
  internal.autoRefresh.batchSmartAutoRefresh,
  {
    triggerType: "scheduled",
    maxToProcess: 15,
    priorityFilter: ["critical"] // Only critical priority items
  }
);

// Medium-frequency smart refresh for high priority updates
crons.interval(
  "smartRefreshHigh",
  { hours: 6 }, // Every 6 hours
  internal.autoRefresh.batchSmartAutoRefresh,
  {
    triggerType: "scheduled",
    maxToProcess: 25,
    priorityFilter: ["critical", "high"] // Critical and high priority
  }
);

// Daily smart refresh for medium priority updates
crons.daily(
  "smartRefreshMedium",
  { hourUTC: 3, minuteUTC: 0 }, // Daily at 3 AM UTC
  internal.autoRefresh.batchSmartAutoRefresh,
  {
    triggerType: "scheduled",
    maxToProcess: 40,
    priorityFilter: ["critical", "high", "medium"] // Critical, high, and medium priority
  }
);

// Weekly comprehensive smart refresh
crons.weekly(
  "smartRefreshComprehensive",
  { dayOfWeek: "sunday", hourUTC: 1, minuteUTC: 0 }, // Sunday at 1 AM UTC
  internal.autoRefresh.batchSmartAutoRefresh,
  {
    triggerType: "maintenance",
    maxToProcess: 100,
    priorityFilter: ["critical", "high", "medium", "low"] // All priorities
  }
);

// Legacy episode data batch update job (keeping for compatibility)
crons.daily(
  "batchUpdateEpisodeData",
  { hourUTC: 4, minuteUTC: 0 }, // Daily at 4 AM UTC
  internal.externalApis.batchUpdateEpisodeDataForAllAnime,
  {
    batchSize: 5,
    maxAnimeToProcess: 30
  }
);

// Weekly comprehensive poster check (legacy)
crons.weekly(
  "weeklyPosterQualityCheck",
  { dayOfWeek: "saturday", hourUTC: 2, minuteUTC: 0 }, // Saturday at 2 AM UTC
  internal.externalApis.enhanceExistingAnimePostersBetter,
  {}
);

// NEW: Smart refresh for currently airing anime (more frequent updates)
crons.interval(
  "smartRefreshAiring",
  { hours: 4 }, // Every 4 hours
  internal.autoRefresh.batchSmartAutoRefresh,
  {
    triggerType: "scheduled",
    maxToProcess: 20,
    // This will be filtered in the smart refresh logic to prioritize airing anime
    priorityFilter: ["critical", "high", "medium"]
  }
);

// NEW: Maintenance job to clean up old refresh data and optimize
crons.weekly(
  "maintenanceSmartRefresh",
  { dayOfWeek: "monday", hourUTC: 5, minuteUTC: 0 }, // Monday at 5 AM UTC
  internal.autoRefresh.batchSmartAutoRefresh,
  {
    triggerType: "maintenance",
    maxToProcess: 200, // Larger batch for maintenance
    priorityFilter: ["critical", "high", "medium", "low"]
  }
);

export default crons;