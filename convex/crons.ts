// convex/crons.ts - Enhanced with Smart Auto-Refresh Jobs and Character AI Enrichment
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

// ===== CHARACTER AI ENRICHMENT JOBS =====

// High-frequency enrichment for newly added characters
crons.interval(
  "enrichNewCharacters",
  { minutes: 30 }, // Every 30 minutes
  internal.characterEnrichment.batchEnrichCharacters,
  {
    animeBatchSize: 2, // Process 2 anime
    charactersPerAnime: 3, // 3 characters per anime
  }
);

// Hourly enrichment with medium batch size
crons.interval(
  "enrichCharactersHourly",
  { hours: 1 }, // Every hour
  internal.characterEnrichment.batchEnrichCharacters,
  {
    animeBatchSize: 3, // Process 3 anime
    charactersPerAnime: 5, // 5 characters per anime
  }
);

// Popular anime character enrichment (runs every 2 hours)
crons.interval(
  "enrichPopularAnimeCharacters",
  { hours: 2 },
  internal.characterEnrichment.enrichPopularAnimeCharacters,
  {
    limit: 5, // Process top 5 popular anime with unenriched characters
  }
);

// Daily comprehensive character enrichment
crons.daily(
  "enrichCharactersDaily",
  { hourUTC: 2, minuteUTC: 0 }, // Daily at 2 AM UTC
  internal.characterEnrichment.batchEnrichCharacters,
  {
    animeBatchSize: 10, // Process 10 anime
    charactersPerAnime: 5, // 5 characters per anime
  }
);

// Weekly character enrichment sweep for any missed characters
crons.weekly(
  "enrichCharactersWeekly",
  { dayOfWeek: "sunday", hourUTC: 0, minuteUTC: 0 }, // Sunday at midnight UTC
  internal.characterEnrichment.batchEnrichCharacters,
  {
    animeBatchSize: 20, // Process 20 anime
    charactersPerAnime: 5, // 5 characters per anime
  }
);

// ===== SMART AUTO-REFRESH JOBS =====

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

// Smart refresh for currently airing anime (more frequent updates)
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

// Maintenance job to clean up old refresh data and optimize
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

// Daily job to enrich episode previews via Jikan
crons.daily(
  "enrichEpisodePreviewsYouTube",
  { hourUTC: 5, minuteUTC: 30 },
  internal.anime.batchEnrichEpisodesWithYouTubePreviews,
  { maxAnimeToProcess: 15 } // Process 15 anime per day
);

// Daily job to deduplicate anime database
crons.daily(
  "deduplicateAnimeDatabase",
  { hourUTC: 6, minuteUTC: 0 },
  internal.anime.deduplicateAnimeDatabase,
  {}
);

export default crons;