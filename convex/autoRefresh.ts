// convex/autoRefresh.ts - Smart Auto-Refresh Logic

"use node";
import { internalAction, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { ActionCtx } from "./_generated/server";

// Enhanced refresh priority system
interface RefreshPriority {
  priority: "critical" | "high" | "medium" | "low" | "skip";
  reason: string;
  recommendedAction: "immediate" | "background" | "scheduled" | "none";
  freshnessScore: number; // 0-100, where 0 is stale, 100 is fresh
}

interface AutoRefreshResult {
  refreshed: boolean;
  priority: RefreshPriority;
  dataChanged: boolean;
  fieldsUpdated: string[];
  message: string;
}

interface BatchRefreshResult {
  processed: number;
  refreshed: number;
  dataChanged: number;
  errors: number;
  message: string;
}

interface AnimeWithPriority {
  anime: Doc<"anime">;
  priority: RefreshPriority;
}

// Helper function to calculate data freshness and refresh priority
const calculateRefreshPriority = (anime: Doc<"anime">): RefreshPriority => {
  const now = Date.now();
  const lastFetched = anime.lastFetchedFromExternal?.timestamp;
  const daysSinceLastFetch = lastFetched ? (now - lastFetched) / (24 * 60 * 60 * 1000) : 999;
  
  let priority: RefreshPriority["priority"] = "low";
  let reason = "";
  let recommendedAction: RefreshPriority["recommendedAction"] = "none";
  let freshnessScore = 100;

  // Critical priority conditions
  if (!anime.posterUrl || anime.posterUrl.includes('placehold.co')) {
    priority = "critical";
    reason = "Missing or placeholder poster";
    recommendedAction = "immediate";
    freshnessScore = 0;
  }
  else if (!anime.lastFetchedFromExternal) {
    priority = "critical";
    reason = "Never fetched from external APIs";
    recommendedAction = "immediate";
    freshnessScore = 0;
  }
  else if (!anime.streamingEpisodes && anime.airingStatus === "RELEASING") {
    priority = "critical";
    reason = "Currently airing but missing episode data";
    recommendedAction = "immediate";
    freshnessScore = 10;
  }
  // NEW: Make missing episode data HIGH priority for completed anime
  else if (!anime.streamingEpisodes && (anime.airingStatus === "FINISHED" || !anime.airingStatus)) {
    priority = "high";
    reason = "Completed anime missing episode data";
    recommendedAction = "immediate";
    freshnessScore = 25;
  }

  // High priority conditions
  else if (anime.airingStatus === "RELEASING" && daysSinceLastFetch > 3) {
    priority = "high";
    reason = "Currently airing anime with data older than 3 days";
    recommendedAction = "background";
    freshnessScore = Math.max(0, 70 - (daysSinceLastFetch * 10));
  }
  else if (anime.nextAiringEpisode && daysSinceLastFetch > 1) {
    priority = "high";
    reason = "Has upcoming episode but data is over 1 day old";
    recommendedAction = "background";
    freshnessScore = Math.max(0, 80 - (daysSinceLastFetch * 15));
  }
  else if (!anime.description || anime.description.length < 50) {
    priority = "high";
    reason = "Missing or incomplete description";
    recommendedAction = "background";
    freshnessScore = 30;
  }
  // NEW: Prioritize anime with very few episodes when they should have more
  else if (anime.streamingEpisodes && anime.streamingEpisodes.length < 3 && anime.totalEpisodes && anime.totalEpisodes > 6) {
    priority = "high";
    reason = "Has few episodes but should have more";
    recommendedAction = "background";
    freshnessScore = 35;
  }

  // Medium priority conditions
  else if (daysSinceLastFetch > 14) {
    priority = "medium";
    reason = "Data is over 2 weeks old";
    recommendedAction = "scheduled";
    freshnessScore = Math.max(0, 60 - (daysSinceLastFetch * 2));
  }
  else if (!anime.studios || anime.studios.length === 0) {
    priority = "medium";
    reason = "Missing studio information";
    recommendedAction = "scheduled";
    freshnessScore = 60;
  }

  // Low priority conditions
  else if (daysSinceLastFetch > 7) {
    priority = "low";
    reason = "Data is over 1 week old";
    recommendedAction = "scheduled";
    freshnessScore = Math.max(40, 90 - (daysSinceLastFetch * 3));
  }

  // Fresh data - skip refresh
  else {
    priority = "skip";
    reason = "Data is fresh and complete";
    recommendedAction = "none";
    freshnessScore = Math.max(80, 100 - (daysSinceLastFetch * 5));
  }

  return { priority, reason, recommendedAction, freshnessScore };
};

// Smart auto-refresh function for individual anime
export const smartAutoRefreshAnime = internalAction({
  args: {
    animeId: v.id("anime"),
    triggerType: v.optional(v.union(
      v.literal("user_visit"),    // User visited detail page
      v.literal("manual"),        // Manual refresh button
      v.literal("background"),    // Background scheduler
      v.literal("api_update")     // After other API updates
    )),
    forceRefresh: v.optional(v.boolean())
  },
  handler: async (ctx: ActionCtx, args): Promise<AutoRefreshResult> => {
    const triggerType = args.triggerType || "manual";
    const forceRefresh = args.forceRefresh || false;
    
    console.log(`[Smart Auto-Refresh] Checking anime ${args.animeId} (trigger: ${triggerType})`);
    
    // Get current anime data
    const anime = await ctx.runQuery(internal.anime.getAnimeByIdInternal, { animeId: args.animeId });
    if (!anime) {
      return {
        refreshed: false,
        priority: { priority: "skip", reason: "Anime not found", recommendedAction: "none", freshnessScore: 0 },
        dataChanged: false,
        fieldsUpdated: [],
        message: "Anime not found"
      };
    }

    // Calculate refresh priority
    const priority = calculateRefreshPriority(anime);
    console.log(`[Smart Auto-Refresh] ${anime.title} - Priority: ${priority.priority}, Score: ${priority.freshnessScore}, Reason: ${priority.reason}`);

    // Determine if we should refresh based on trigger type and priority
    let shouldRefresh = forceRefresh;
    
    if (!shouldRefresh) {
      switch (triggerType) {
        case "user_visit":
          // Refresh on visit only for critical/high priority or very stale data
          shouldRefresh = priority.priority === "critical" || 
                         priority.priority === "high" || 
                         priority.freshnessScore < 30;
          break;
        case "background":
          // Background refresh for critical/high/medium priority
          shouldRefresh = priority.priority === "critical" || 
                         priority.priority === "high" || 
                         priority.priority === "medium";
          break;
        case "manual":
          // Manual refresh always goes through unless data is very fresh
          shouldRefresh = priority.freshnessScore < 95;
          break;
        case "api_update":
          // API update trigger only for critical issues
          shouldRefresh = priority.priority === "critical";
          break;
      }
    }

    if (!shouldRefresh) {
      return {
        refreshed: false,
        priority,
        dataChanged: false,
        fieldsUpdated: [],
        message: `Skipped refresh - ${priority.reason} (score: ${priority.freshnessScore})`
      };
    }

    // Store original data for comparison
    const originalData = {
      posterUrl: anime.posterUrl,
      description: anime.description,
      streamingEpisodes: anime.streamingEpisodes?.length || 0,
      nextAiringEpisode: anime.nextAiringEpisode,
      studios: anime.studios?.length || 0,
      genres: anime.genres?.length || 0
    };

    try {
      // Perform the refresh
      console.log(`[Smart Auto-Refresh] Refreshing ${anime.title}...`);
      const refreshResult = await ctx.runAction(internal.externalApis.triggerFetchExternalAnimeDetails, {
        animeIdInOurDB: args.animeId,
        titleToSearch: anime.title
      });

      if (!refreshResult.success) {
        return {
          refreshed: false,
          priority,
          dataChanged: false,
          fieldsUpdated: [],
          message: `Refresh failed: ${refreshResult.message}`
        };
      }

      // Get updated data to check what changed
      const updatedAnime = await ctx.runQuery(internal.anime.getAnimeByIdInternal, { animeId: args.animeId });
      if (!updatedAnime) {
        return {
          refreshed: true,
          priority,
          dataChanged: false,
          fieldsUpdated: [],
          message: "Refreshed but could not verify changes"
        };
      }

      // Detect what changed
      const fieldsUpdated: string[] = [];
      let dataChanged = false;

      if (originalData.posterUrl !== updatedAnime.posterUrl) {
        fieldsUpdated.push("poster");
        dataChanged = true;
      }
      if (originalData.description !== updatedAnime.description) {
        fieldsUpdated.push("description");
        dataChanged = true;
      }
      if (originalData.streamingEpisodes !== (updatedAnime.streamingEpisodes?.length || 0)) {
        fieldsUpdated.push("episodes");
        dataChanged = true;
      }
      if (JSON.stringify(originalData.nextAiringEpisode) !== JSON.stringify(updatedAnime.nextAiringEpisode)) {
        fieldsUpdated.push("nextEpisode");
        dataChanged = true;
      }
      if (originalData.studios !== (updatedAnime.studios?.length || 0)) {
        fieldsUpdated.push("studios");
        dataChanged = true;
      }
      if (originalData.genres !== (updatedAnime.genres?.length || 0)) {
        fieldsUpdated.push("genres");
        dataChanged = true;
      }

      const message = dataChanged 
        ? `Updated: ${fieldsUpdated.join(", ")}` 
        : "Refreshed but no new data found";

      console.log(`[Smart Auto-Refresh] ${anime.title} - ${message}`);

      return {
        refreshed: true,
        priority,
        dataChanged,
        fieldsUpdated,
        message
      };

    } catch (error: any) {
      console.error(`[Smart Auto-Refresh] Error refreshing ${anime.title}:`, error.message);
      return {
        refreshed: false,
        priority,
        dataChanged: false,
        fieldsUpdated: [],
        message: `Error: ${error.message}`
      };
    }
  }
});

// Batch smart refresh for multiple anime
export const batchSmartAutoRefresh = internalAction({
  args: {
    animeIds: v.optional(v.array(v.id("anime"))),
    triggerType: v.optional(v.union(
      v.literal("scheduled"),
      v.literal("user_batch"),
      v.literal("maintenance")
    )),
    maxToProcess: v.optional(v.number()),
    priorityFilter: v.optional(v.array(v.union(
      v.literal("critical"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    )))
  },
  handler: async (ctx: ActionCtx, args): Promise<BatchRefreshResult> => {
    const triggerType = args.triggerType || "scheduled";
    const maxToProcess = args.maxToProcess || 20;
    const priorityFilter = args.priorityFilter || ["critical", "high", "medium"];
    
    console.log(`[Batch Smart Auto-Refresh] Starting batch refresh (${triggerType})...`);

    // Get anime to process
    let animeToProcess: Doc<"anime">[];
    
    if (args.animeIds) {
      // Process specific anime
      const animeResults = await Promise.all(
        args.animeIds.map(id => ctx.runQuery(internal.anime.getAnimeByIdInternal, { animeId: id }))
      );
      animeToProcess = animeResults.filter((anime): anime is Doc<"anime"> => anime !== null);
    } else {
      // Get all anime and filter by priority
      const allAnime: Doc<"anime">[] = await ctx.runQuery(internal.ai.getAllAnimeInternal, {});
      
      // Calculate priorities and filter
      const animeWithPriorities: AnimeWithPriority[] = allAnime.map((anime: Doc<"anime">) => ({
        anime,
        priority: calculateRefreshPriority(anime)
      }));
      
      animeToProcess = animeWithPriorities
        .filter(({ priority }: AnimeWithPriority) => {
          // First check if priority is not "skip", then check if it's in the filter
          return priority.priority !== "skip" && priorityFilter.includes(priority.priority as "critical" | "high" | "medium" | "low");
        })
        .sort((a: AnimeWithPriority, b: AnimeWithPriority) => {
          // Sort by priority (critical first) then by freshness score (lowest first)
          const priorityOrder: Record<RefreshPriority["priority"], number> = { 
            critical: 0, 
            high: 1, 
            medium: 2, 
            low: 3, 
            skip: 4 
          };
          const aPriorityOrder = priorityOrder[a.priority.priority];
          const bPriorityOrder = priorityOrder[b.priority.priority];
          
          if (aPriorityOrder !== bPriorityOrder) {
            return aPriorityOrder - bPriorityOrder;
          }
          return a.priority.freshnessScore - b.priority.freshnessScore;
        })
        .slice(0, maxToProcess)
        .map(({ anime }: AnimeWithPriority) => anime);
    }

    if (animeToProcess.length === 0) {
      console.log("[Batch Smart Auto-Refresh] No anime found that need refreshing");
      return {
        processed: 0,
        refreshed: 0,
        dataChanged: 0,
        errors: 0,
        message: "No anime needed refreshing"
      };
    }

    console.log(`[Batch Smart Auto-Refresh] Processing ${animeToProcess.length} anime...`);

    // Process in smaller batches to avoid overwhelming APIs
    const batchSize = 3;
    let processed = 0;
    let refreshed = 0;
    let dataChanged = 0;
    let errors = 0;

    for (let i = 0; i < animeToProcess.length; i += batchSize) {
      const batch = animeToProcess.slice(i, i + batchSize);
      
      // Process batch with individual error handling
      const batchPromises = batch.map(async (anime) => {
        try {
          const result = await ctx.runAction(internal.autoRefresh.smartAutoRefreshAnime, {
            animeId: anime._id,
            triggerType: "background"
          });
          
          processed++;
          if (result.refreshed) refreshed++;
          if (result.dataChanged) dataChanged++;
          
          return result;
        } catch (error: any) {
          processed++;
          errors++;
          console.error(`[Batch Smart Auto-Refresh] Error processing ${anime.title}:`, error.message);
          return null;
        }
      });

      await Promise.all(batchPromises);

      // Rate limiting between batches
      if (i + batchSize < animeToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
      }
    }

    const message = `Batch complete: ${processed} processed, ${refreshed} refreshed, ${dataChanged} with new data, ${errors} errors`;
    console.log(`[Batch Smart Auto-Refresh] ${message}`);

    return {
      processed,
      refreshed,
      dataChanged,
      errors,
      message
    };
  }
});

// Public action for manual smart refresh
export const callSmartAutoRefreshAnime = action({
  args: {
    animeId: v.id("anime"),
    triggerType: v.optional(v.union(
      v.literal("user_visit"),
      v.literal("manual"),
      v.literal("background")
    )),
    forceRefresh: v.optional(v.boolean())
  },
  handler: async (ctx: ActionCtx, args): Promise<AutoRefreshResult> => {
    return await ctx.runAction(internal.autoRefresh.smartAutoRefreshAnime, args);
  }
});

// Public action for batch refresh
export const callBatchSmartAutoRefresh = action({
  args: {
    animeIds: v.optional(v.array(v.id("anime"))),
    maxToProcess: v.optional(v.number())
  },
  handler: async (ctx: ActionCtx, args): Promise<BatchRefreshResult> => {
    return await ctx.runAction(internal.autoRefresh.batchSmartAutoRefresh, {
      animeIds: args.animeIds,
      triggerType: "user_batch",
      maxToProcess: args.maxToProcess
    });
  }
});

// NEW: Bulk fix for existing anime missing episode data
export const bulkFixMissingEpisodeData = action({
  args: {
    dryRun: v.optional(v.boolean()), // Preview what would be fixed
    maxToProcess: v.optional(v.number())
  },
  handler: async (ctx: ActionCtx, args): Promise<{
    dryRun: boolean;
    found: number;
    processed: number;
    fixed: number;
    errors: string[];
    animeList: Array<{
      title: string;
      id: Id<"anime">;
      reason: string;
      priority: string;
    }>;
  }> => {
    const dryRun = args.dryRun || false;
    const maxToProcess = args.maxToProcess || 100;
    
    console.log(`[Bulk Episode Fix] ${dryRun ? 'DRY RUN - ' : ''}Finding anime missing episode data...`);
    
    // Get all anime and find those missing episode data
    const allAnime: Doc<"anime">[] = await ctx.runQuery(internal.ai.getAllAnimeInternal, {});
    
    const animeMissingEpisodes = allAnime
      .map((anime: Doc<"anime">) => ({
        anime,
        priority: calculateRefreshPriority(anime)
      }))
      .filter(({ anime, priority }) => {
        // Target anime that need episode data
        return !anime.streamingEpisodes || 
               anime.streamingEpisodes.length === 0 ||
               (anime.streamingEpisodes.length < 3 && anime.totalEpisodes && anime.totalEpisodes > 6);
      })
      .sort((a, b) => {
        // Prioritize by priority level and freshness score
        const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, skip: 4 };
        const aPriorityOrder = priorityOrder[a.priority.priority] || 5;
        const bPriorityOrder = priorityOrder[b.priority.priority] || 5;
        
        if (aPriorityOrder !== bPriorityOrder) {
          return aPriorityOrder - bPriorityOrder;
        }
        return a.priority.freshnessScore - b.priority.freshnessScore;
      })
      .slice(0, maxToProcess);

    const animeList = animeMissingEpisodes.map(({ anime, priority }) => ({
      title: anime.title,
      id: anime._id,
      reason: priority.reason,
      priority: priority.priority
    }));

    if (dryRun) {
      return {
        dryRun: true,
        found: animeMissingEpisodes.length,
        processed: 0,
        fixed: 0,
        errors: [],
        animeList
      };
    }

    // Actually process the anime
    console.log(`[Bulk Episode Fix] Processing ${animeMissingEpisodes.length} anime...`);
    
    let processed = 0;
    let fixed = 0;
    const errors: string[] = [];

    // Process in small batches to avoid overwhelming APIs
    const batchSize = 3;
    
    for (let i = 0; i < animeMissingEpisodes.length; i += batchSize) {
      const batch = animeMissingEpisodes.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async ({ anime }) => {
        try {
          console.log(`[Bulk Episode Fix] Processing: ${anime.title}`);
          
          const result = await ctx.runAction(internal.autoRefresh.smartAutoRefreshAnime, {
            animeId: anime._id,
            triggerType: "background",
            forceRefresh: false
          });
          
          processed++;
          
          if (result.refreshed && result.fieldsUpdated.includes("episodes")) {
            fixed++;
            console.log(`[Bulk Episode Fix] ✅ Fixed episodes for: ${anime.title}`);
          } else if (result.refreshed) {
            console.log(`[Bulk Episode Fix] ✓ Refreshed (no episodes): ${anime.title}`);
          } else {
            console.log(`[Bulk Episode Fix] ⚠️ No changes: ${anime.title} - ${result.message}`);
          }
          
          return true;
        } catch (error: any) {
          processed++;
          const errorMsg = `${anime.title}: ${error.message}`;
          errors.push(errorMsg);
          console.error(`[Bulk Episode Fix] ❌ Error: ${errorMsg}`);
          return false;
        }
      });

      await Promise.all(batchPromises);

      // Rate limiting between batches
      if (i + batchSize < animeMissingEpisodes.length) {
        console.log(`[Bulk Episode Fix] Waiting 4 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 4000));
      }
    }

    console.log(`[Bulk Episode Fix] Complete! Processed: ${processed}, Fixed: ${fixed}, Errors: ${errors.length}`);

    return {
      dryRun: false,
      found: animeMissingEpisodes.length,
      processed,
      fixed,
      errors: errors.slice(0, 5), // Limit error array
      animeList
    };
  }
});

// Get refresh recommendations for an anime
export const getRefreshRecommendation = action({
  args: { animeId: v.id("anime") },
  handler: async (ctx: ActionCtx, args): Promise<{
    priority: RefreshPriority["priority"];
    reason: string;
    recommendedAction: RefreshPriority["recommendedAction"];
    freshnessScore: number;
    anime: {
      title: string;
      lastFetched?: number;
      airingStatus?: string;
      hasEpisodes: boolean;
      hasPoster: boolean;
    };
  } | null> => {
    const anime: Doc<"anime"> | null = await ctx.runQuery(internal.anime.getAnimeByIdInternal, { animeId: args.animeId });
    if (!anime) {
      return null;
    }

    const priority = calculateRefreshPriority(anime);
    
    return {
      ...priority,
      anime: {
        title: anime.title,
        lastFetched: anime.lastFetchedFromExternal?.timestamp,
        airingStatus: anime.airingStatus,
        hasEpisodes: !!(anime.streamingEpisodes?.length),
        hasPoster: !!(anime.posterUrl && !anime.posterUrl.includes('placehold.co'))
      }
    };
  }
});