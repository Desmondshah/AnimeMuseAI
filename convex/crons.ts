// convex/crons.ts - Enhanced with Specialized Cron Jobs

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// ==============================================
// SYSTEM MAINTENANCE JOBS (Existing)
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

// ==============================================
// SPECIALIZED DATA REFRESH JOBS (NEW)
// ==============================================

// High-priority airing anime updates (every 4 hours)
crons.interval(
  "refreshAiringAnimeData",
  { hours: 4 },
  internal.externalApis.batchRefreshAiringAnimeData,
  {
    maxToProcess: 15,
    dataTypes: ["metadata", "episodes"]
  }
);

// Critical poster fixes (every 3 hours) - focuses on missing posters
crons.interval(
  "criticalPosterRefresh",
  { hours: 3 },
  internal.externalApis.batchRefreshMissingPosters,
  {
    maxToProcess: 20,
    prioritizeNew: false // Focus on any missing posters
  }
);

// Daily high-quality poster refresh for new content
crons.daily(
  "dailyPosterQualityRefresh",
  { hourUTC: 2, minuteUTC: 0 },
  internal.externalApis.batchRefreshMissingPosters,
  {
    maxToProcess: 35,
    prioritizeNew: true // Focus on recently added anime
  }
);

// Daily missing episodes refresh for completed anime
crons.daily(
  "dailyMissingEpisodesRefresh",
  { hourUTC: 4, minuteUTC: 0 },
  internal.externalApis.batchRefreshMissingEpisodes,
  {
    maxToProcess: 25,
    prioritizeCompleted: true // Focus on finished anime
  }
);

// Evening episode refresh for releasing anime
crons.daily(
  "eveningEpisodeRefresh",
  { hourUTC: 20, minuteUTC: 0 }, // 8 PM UTC - after most episodes air in Japan
  internal.externalApis.batchRefreshMissingEpisodes,
  {
    maxToProcess: 15,
    prioritizeCompleted: false // Include releasing anime
  }
);

// ==============================================
// SMART AUTO-REFRESH JOBS (Enhanced)
// ==============================================

// Critical updates every 2 hours (unchanged)
crons.interval(
  "smartRefreshCritical",
  { hours: 2 },
  internal.autoRefresh.batchSmartAutoRefresh,
  {
    triggerType: "scheduled",
    maxToProcess: 20, // Increased from 15
    priorityFilter: ["critical"]
  }
);

// High priority updates every 6 hours (enhanced)
crons.interval(
  "smartRefreshHigh",
  { hours: 6 },
  internal.autoRefresh.batchSmartAutoRefresh,
  {
    triggerType: "scheduled",
    maxToProcess: 30, // Increased from 25
    priorityFilter: ["critical", "high"]
  }
);

// Daily comprehensive medium priority refresh
crons.daily(
  "smartRefreshMedium",
  { hourUTC: 3, minuteUTC: 0 },
  internal.autoRefresh.batchSmartAutoRefresh,
  {
    triggerType: "scheduled",
    maxToProcess: 50, // Increased from 40
    priorityFilter: ["critical", "high", "medium"]
  }
);

// Weekly comprehensive refresh (enhanced)
crons.weekly(
  "smartRefreshComprehensive",
  { dayOfWeek: "sunday", hourUTC: 1, minuteUTC: 0 },
  internal.autoRefresh.batchSmartAutoRefresh,
  {
    triggerType: "maintenance",
    maxToProcess: 150, // Increased from 100
    priorityFilter: ["critical", "high", "medium", "low"]
  }
);

// ==============================================
// WEEKLY SPECIALIZED JOBS
// ==============================================

// Weekly metadata refresh for stale content
crons.weekly(
  "weeklyMetadataRefresh",
  { dayOfWeek: "saturday", hourUTC: 1, minuteUTC: 0 },
  internal.autoRefresh.batchSmartAutoRefresh,
  {
    triggerType: "maintenance",
    maxToProcess: 60,
    priorityFilter: ["medium", "low"] // Focus on lower priority stale data
  }
);

// Weekly poster quality audit and enhancement
crons.weekly(
  "weeklyPosterQualityAudit",
  { dayOfWeek: "saturday", hourUTC: 3, minuteUTC: 0 },
  internal.externalApis.batchRefreshMissingPosters,
  {
    maxToProcess: 50,
    prioritizeNew: false // Comprehensive poster check
  }
);

// Weekly episode data sweep for missed content
crons.weekly(
  "weeklyEpisodeDataSweep",
  { dayOfWeek: "sunday", hourUTC: 4, minuteUTC: 0 },
  internal.externalApis.batchRefreshMissingEpisodes,
  {
    maxToProcess: 40,
    prioritizeCompleted: false // Include all anime types
  }
);

// ==============================================
// MONTHLY MAINTENANCE JOBS
// ==============================================

// Monthly comprehensive data audit
crons.monthly(
  "monthlyDataAudit",
  { day: 1, hourUTC: 5, minuteUTC: 0 },
  internal.autoRefresh.batchSmartAutoRefresh,
  {
    triggerType: "maintenance",
    maxToProcess: 300, // Large monthly sweep
    priorityFilter: ["critical", "high", "medium", "low"]
  }
);

// Monthly poster quality overhaul
crons.monthly(
  "monthlyPosterOverhaul",
  { day: 15, hourUTC: 6, minuteUTC: 0 },
  internal.externalApis.batchRefreshMissingPosters,
  {
    maxToProcess: 100,
    prioritizeNew: false
  }
);

// ==============================================
// LEGACY SUPPORT JOBS (Gradually reducing)
// ==============================================

// Legacy comprehensive poster enhancement (reduced frequency)
crons.interval(
  "legacyPosterEnhancement",
  { hours: 24 }, // Reduced from 12 hours
  internal.externalApis.enhanceExistingAnimePostersBetter,
  {
    maxToProcess: 15 // Reduced workload
  }
);

// Legacy batch episode update (reduced frequency)
crons.daily(
  "legacyBatchEpisodeUpdate",
  { hourUTC: 6, minuteUTC: 0 }, // Moved later to avoid conflicts
  internal.externalApis.batchUpdateEpisodeDataForAllAnime,
  {
    batchSize: 3, // Reduced from 5
    maxAnimeToProcess: 20 // Reduced from 30
  }
);

// ==============================================
// CONDITIONAL/SEASONAL JOBS
// ==============================================

// Peak anime season refresh (runs more frequently during typical anime seasons)
// Spring: March-May, Summer: June-August, Fall: September-November, Winter: December-February
crons.interval(
  "seasonalAiringBoost",
  { hours: 2 }, // More frequent during peak times
  internal.externalApis.batchRefreshAiringAnimeData,
  {
    maxToProcess: 10,
    dataTypes: ["metadata"] // Just metadata during boost periods
  }
);

// Weekend comprehensive refresh (when traffic is typically lower)
crons.weekly(
  "weekendComprehensiveRefresh",
  { dayOfWeek: "sunday", hourUTC: 8, minuteUTC: 0 },
  internal.autoRefresh.batchSmartAutoRefresh,
  {
    triggerType: "maintenance",
    maxToProcess: 200,
    priorityFilter: ["critical", "high", "medium"]
  }
);

// ==============================================
// PERFORMANCE MONITORING JOBS
// ==============================================

// Daily system health check (could be expanded to check API response times, etc.)
crons.daily(
  "dailySystemHealthCheck", 
  { hourUTC: 12, minuteUTC: 0 },
  internal.autoRefresh.batchSmartAutoRefresh,
  {
    triggerType: "scheduled",
    maxToProcess: 5, // Small sample for health check
    priorityFilter: ["critical"]
  }
);

export default crons;

/*
==============================================
CRON JOB SCHEDULE OVERVIEW
==============================================

HOURLY (Every 2-4 hours):
- Critical smart refresh (every 2h)
- Airing anime data refresh (every 4h)  
- Critical poster fixes (every 3h)
- High priority smart refresh (every 6h)
- Seasonal airing boost (every 2h)
- Legacy poster enhancement (every 24h)

DAILY:
- Filter metadata update (every 6h)
- Phone verification cleanup (every 30min)
- Poster quality refresh (2 AM UTC)
- Missing episodes refresh (4 AM UTC)
- Evening episode refresh (8 PM UTC)  
- Legacy episode update (6 AM UTC)
- Medium priority smart refresh (3 AM UTC)
- System health check (12 PM UTC)

WEEKLY:
- Comprehensive smart refresh (Sunday 1 AM)
- Metadata refresh (Saturday 1 AM)
- Poster quality audit (Saturday 3 AM)
- Episode data sweep (Sunday 4 AM)
- Weekend comprehensive refresh (Sunday 8 AM)

MONTHLY:
- Data audit (1st at 5 AM)
- Poster overhaul (15th at 6 AM)

==============================================
TIMING STRATEGY
==============================================

1. **Peak Traffic Avoidance**: Heavy operations scheduled during low-traffic hours (1-6 AM UTC)
2. **API Rate Limiting**: Staggered schedules to avoid overwhelming external APIs
3. **Progressive Enhancement**: Critical data first, then nice-to-have improvements
4. **Seasonal Adaptation**: More frequent airing anime updates during peak seasons
5. **Legacy Support**: Gradual reduction of old batch jobs as new system proves reliable

==============================================
SCALING CONSIDERATIONS  
==============================================

As the database grows, consider:
- Adjusting `maxToProcess` values based on performance metrics
- Adding more specialized jobs for specific data types
- Implementing smart scheduling based on user activity patterns
- Adding regional scheduling for global user bases
- Creating emergency/maintenance mode schedules
*/