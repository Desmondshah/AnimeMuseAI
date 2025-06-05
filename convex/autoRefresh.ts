// convex/autoRefresh.ts - Enhanced Smart Auto-Refresh with Specialized Actions

"use node";
import { internalAction, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { ActionCtx } from "./_generated/server";

// Enhanced refresh priority system with specific reasons
interface RefreshPriority {
  priority: "critical" | "high" | "medium" | "low" | "skip";
  reason: "missing_poster" | "missing_episodes" | "missing_metadata" | "missing_characters" | 
          "stale_poster" | "stale_episodes" | "stale_metadata" | "stale_character_data" |
          "airing_needs_update" | "never_fetched" | "general_stale" | "fresh_data";
  recommendedAction: "immediate" | "background" | "scheduled" | "none";
  freshnessScore: number; // 0-100, where 0 is stale, 100 is fresh
  specificActions: string[]; // Which specialized actions should be called
}

interface AutoRefreshResult {
  refreshed: boolean;
  priority: RefreshPriority;
  dataChanged: boolean;
  fieldsUpdated: string[];
  message: string;
  actionsUsed: string[];
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

// ENHANCED: Calculate refresh priority with specific reasons and recommended actions
const calculateRefreshPriority = (anime: Doc<"anime">): RefreshPriority => {
  const now = Date.now();
  const lastFetched = anime.lastFetchedFromExternal?.timestamp;
  const daysSinceLastFetch = lastFetched ? (now - lastFetched) / (24 * 60 * 60 * 1000) : 999;
  
  let priority: RefreshPriority["priority"] = "low";
  let reason: RefreshPriority["reason"] = "general_stale";
  let recommendedAction: RefreshPriority["recommendedAction"] = "none";
  let freshnessScore = 100;
  let specificActions: string[] = [];

  // Critical priority conditions with specific reasons
  if (!anime.posterUrl || anime.posterUrl.includes('placehold.co')) {
    priority = "critical";
    reason = "missing_poster";
    recommendedAction = "immediate";
    freshnessScore = 0;
    specificActions = ["fetchBestQualityPoster"];
  }
  else if (!anime.lastFetchedFromExternal) {
    priority = "critical";
    reason = "never_fetched";
    recommendedAction = "immediate";
    freshnessScore = 0;
    specificActions = ["fetchCoreMetadataFromAniList", "fetchBestQualityPoster"];
  }
  else if (!anime.streamingEpisodes && anime.airingStatus === "RELEASING") {
    priority = "critical";
    reason = "missing_episodes";
    recommendedAction = "immediate";
    freshnessScore = 10;
    specificActions = ["fetchStreamingEpisodesFromConsumet"];
  }
  
  // High priority conditions with specific reasons
  else if (!anime.streamingEpisodes && (anime.airingStatus === "FINISHED" || !anime.airingStatus)) {
    priority = "high";
    reason = "missing_episodes";
    recommendedAction = "immediate";
    freshnessScore = 25;
    specificActions = ["fetchStreamingEpisodesFromConsumet"];
  }
  else if (anime.airingStatus === "RELEASING" && daysSinceLastFetch > 3) {
    priority = "high";
    reason = "airing_needs_update";
    recommendedAction = "background";
    freshnessScore = Math.max(0, 70 - (daysSinceLastFetch * 10));
    specificActions = ["fetchCoreMetadataFromAniList", "fetchStreamingEpisodesFromConsumet"];
  }
  else if (anime.nextAiringEpisode && daysSinceLastFetch > 1) {
    priority = "high";
    reason = "airing_needs_update";
    recommendedAction = "background";
    freshnessScore = Math.max(0, 80 - (daysSinceLastFetch * 15));
    specificActions = ["fetchCoreMetadataFromAniList", "fetchStreamingEpisodesFromConsumet"];
  }
  else if (!anime.description || anime.description.length < 50) {
    priority = "high";
    reason = "missing_metadata";
    recommendedAction = "background";
    freshnessScore = 30;
    specificActions = ["fetchCoreMetadataFromAniList"];
  }
  else if (anime.streamingEpisodes && anime.streamingEpisodes.length < 3 && anime.totalEpisodes && anime.totalEpisodes > 6) {
    priority = "high";
    reason = "missing_episodes";
    recommendedAction = "background";
    freshnessScore = 35;
    specificActions = ["fetchStreamingEpisodesFromConsumet"];
  }
  else if (!anime.characters || anime.characters.length === 0) {
    priority = "high";
    reason = "missing_characters";
    recommendedAction = "background";
    freshnessScore = 40;
    specificActions = ["fetchCharacterListFromAniList"];
  }

  // Medium priority conditions with specific reasons
  else if (daysSinceLastFetch > 14) {
    priority = "medium";
    reason = "general_stale";
    recommendedAction = "scheduled";
    freshnessScore = Math.max(0, 60 - (daysSinceLastFetch * 2));
    specificActions = ["fetchCoreMetadataFromAniList"];
  }
  else if (!anime.studios || anime.studios.length === 0) {
    priority = "medium";
    reason = "missing_metadata";
    recommendedAction = "scheduled";
    freshnessScore = 60;
    specificActions = ["fetchCoreMetadataFromAniList"];
  }
  else if (anime.characters && anime.characters.length > 0 && daysSinceLastFetch > 30) {
    priority = "medium";
    reason = "stale_character_data";
    recommendedAction = "scheduled";
    freshnessScore = Math.max(20, 70 - (daysSinceLastFetch * 2));
    specificActions = ["fetchCharacterListFromAniList"];
  }
  else if (anime.posterUrl && !anime.posterUrl.includes('placehold.co') && daysSinceLastFetch > 21) {
    priority = "medium";
    reason = "stale_poster";
    recommendedAction = "scheduled";
    freshnessScore = Math.max(30, 75 - (daysSinceLastFetch * 2));
    specificActions = ["fetchBestQualityPoster"];
  }

  // Low priority conditions
  else if (daysSinceLastFetch > 7) {
    priority = "low";
    reason = "general_stale";
    recommendedAction = "scheduled";
    freshnessScore = Math.max(40, 90 - (daysSinceLastFetch * 3));
    specificActions = ["fetchCoreMetadataFromAniList"];
  }

  // Fresh data - skip refresh
  else {
    priority = "skip";
    reason = "fresh_data";
    recommendedAction = "none";
    freshnessScore = Math.max(80, 100 - (daysSinceLastFetch * 5));
    specificActions = [];
  }

  return { priority, reason, recommendedAction, freshnessScore, specificActions };
};

// ENHANCED: Smart auto-refresh function with specialized action orchestration
export const smartAutoRefreshAnime = internalAction({
  args: {
    animeId: v.id("anime"),
    triggerType: v.optional(v.union(
      v.literal("user_visit"),    // User visited detail page
      v.literal("manual"),        // Manual refresh button
      v.literal("background"),    // Background scheduler
      v.literal("api_update")     // After other API updates
    )),
    forceRefresh: v.optional(v.boolean()),
    specificReason: v.optional(v.string()) // Allow forcing a specific refresh reason
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
        priority: { 
          priority: "skip", 
          reason: "fresh_data", 
          recommendedAction: "none", 
          freshnessScore: 0,
          specificActions: []
        },
        dataChanged: false,
        fieldsUpdated: [],
        message: "Anime not found",
        actionsUsed: []
      };
    }

    // Calculate refresh priority with specific reasons
    const priority = calculateRefreshPriority(anime);
    console.log(`[Smart Auto-Refresh] ${anime.title} - Priority: ${priority.priority}, Reason: ${priority.reason}, Actions: ${priority.specificActions.join(", ")}`);

    // Determine if we should refresh based on trigger type and priority
    let shouldRefresh = forceRefresh;
    
    if (!shouldRefresh) {
      switch (triggerType) {
        case "user_visit":
          shouldRefresh = priority.priority === "critical" || 
                         priority.priority === "high" || 
                         priority.freshnessScore < 30;
          break;
        case "background":
          shouldRefresh = priority.priority === "critical" || 
                         priority.priority === "high" || 
                         priority.priority === "medium";
          break;
        case "manual":
          shouldRefresh = priority.freshnessScore < 95;
          break;
        case "api_update":
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
        message: `Skipped refresh - ${priority.reason} (score: ${priority.freshnessScore})`,
        actionsUsed: []
      };
    }

    // Store original data for comparison
    const originalData = {
      posterUrl: anime.posterUrl,
      description: anime.description,
      streamingEpisodes: anime.streamingEpisodes?.length || 0,
      characters: anime.characters?.length || 0,
      nextAiringEpisode: anime.nextAiringEpisode,
      studios: anime.studios?.length || 0,
      genres: anime.genres?.length || 0
    };

    try {
      console.log(`[Smart Auto-Refresh] Refreshing ${anime.title} using specialized actions...`);
      
      const actionsUsed: string[] = [];
      const fieldsUpdated: string[] = [];
      let dataChanged = false;

      // NEW: Use switch statement based on specific reason to call specialized actions
      switch (priority.reason) {
        case "missing_poster":
        case "stale_poster":
          console.log(`[Smart Auto-Refresh] Fetching best quality poster for ${anime.title}`);
          try {
            const posterResult = await ctx.runAction(internal.externalApis.fetchBestQualityPoster, {
              title: anime.title,
              year: anime.year
            });
            
            if (posterResult.success && posterResult.posterUrl) {
              await ctx.runMutation(internal.anime.updateAnimeWithExternalData, {
                animeId: args.animeId,
                updates: { posterUrl: posterResult.posterUrl },
                sourceApi: posterResult.source
              });
              actionsUsed.push("fetchBestQualityPoster");
              fieldsUpdated.push("poster");
              dataChanged = true;
            }
          } catch (error: any) {
            console.error(`[Smart Auto-Refresh] Poster fetch failed for ${anime.title}:`, error.message);
          }
          break;

        case "missing_episodes":
        case "stale_episodes":
          console.log(`[Smart Auto-Refresh] Fetching streaming episodes for ${anime.title}`);
          try {
            const episodeResult = await ctx.runAction(internal.externalApis.fetchStreamingEpisodesFromConsumet, {
              title: anime.title,
              totalEpisodes: anime.totalEpisodes
            });
            
            if (episodeResult.success && episodeResult.episodes.length > 0) {
              await ctx.runMutation(internal.anime.updateAnimeWithExternalData, {
                animeId: args.animeId,
                updates: { 
                  streamingEpisodes: episodeResult.episodes,
                  totalEpisodes: episodeResult.totalEpisodes
                },
                sourceApi: episodeResult.source
              });
              actionsUsed.push("fetchStreamingEpisodesFromConsumet");
              fieldsUpdated.push("episodes");
              dataChanged = true;
            }
          } catch (error: any) {
            console.error(`[Smart Auto-Refresh] Episode fetch failed for ${anime.title}:`, error.message);
          }
          break;

        case "missing_metadata":
        case "stale_metadata":
          console.log(`[Smart Auto-Refresh] Fetching core metadata for ${anime.title}`);
          try {
            const metadataResult = await ctx.runAction(internal.externalApis.fetchCoreMetadataFromAniList, {
              title: anime.title,
              anilistId: anime.anilistId
            });
            
            if (metadataResult.success && Object.keys(metadataResult.metadata).length > 0) {
              await ctx.runMutation(internal.anime.updateAnimeWithExternalData, {
                animeId: args.animeId,
                updates: metadataResult.metadata,
                sourceApi: metadataResult.source
              });
              actionsUsed.push("fetchCoreMetadataFromAniList");
              fieldsUpdated.push("metadata");
              dataChanged = true;
            }
          } catch (error: any) {
            console.error(`[Smart Auto-Refresh] Metadata fetch failed for ${anime.title}:`, error.message);
          }
          break;

        case "missing_characters":
        case "stale_character_data":
          console.log(`[Smart Auto-Refresh] Fetching character data for ${anime.title}`);
          try {
            const charactersResult = await ctx.runAction(internal.externalApis.fetchCharacterListFromAniList, {
              title: anime.title,
              anilistId: anime.anilistId
            });
            
            if (charactersResult.success && charactersResult.characters.length > 0) {
              await ctx.runMutation(internal.anime.updateAnimeWithExternalData, {
                animeId: args.animeId,
                updates: { characters: charactersResult.characters },
                sourceApi: charactersResult.source
              });
              actionsUsed.push("fetchCharacterListFromAniList");
              fieldsUpdated.push("characters");
              dataChanged = true;
            }
          } catch (error: any) {
            console.error(`[Smart Auto-Refresh] Character fetch failed for ${anime.title}:`, error.message);
          }
          break;

        case "airing_needs_update":
          console.log(`[Smart Auto-Refresh] Updating airing anime data for ${anime.title}`);
          try {
            // For airing anime, fetch both metadata and episodes
            const [metadataResult, episodeResult] = await Promise.allSettled([
              ctx.runAction(internal.externalApis.fetchCoreMetadataFromAniList, {
                title: anime.title,
                anilistId: anime.anilistId
              }),
              ctx.runAction(internal.externalApis.fetchStreamingEpisodesFromConsumet, {
                title: anime.title,
                totalEpisodes: anime.totalEpisodes
              })
            ]);

            let updates: any = {};
            
            if (metadataResult.status === 'fulfilled' && metadataResult.value.success) {
              updates = { ...updates, ...metadataResult.value.metadata };
              actionsUsed.push("fetchCoreMetadataFromAniList");
              fieldsUpdated.push("metadata");
              dataChanged = true;
            }

            if (episodeResult.status === 'fulfilled' && episodeResult.value.success && episodeResult.value.episodes.length > 0) {
              updates.streamingEpisodes = episodeResult.value.episodes;
              updates.totalEpisodes = episodeResult.value.totalEpisodes;
              actionsUsed.push("fetchStreamingEpisodesFromConsumet");
              fieldsUpdated.push("episodes");
              dataChanged = true;
            }

            if (Object.keys(updates).length > 0) {
              await ctx.runMutation(internal.anime.updateAnimeWithExternalData, {
                animeId: args.animeId,
                updates,
                sourceApi: "multiple"
              });
            }
          } catch (error: any) {
            console.error(`[Smart Auto-Refresh] Airing update failed for ${anime.title}:`, error.message);
          }
          break;

        case "never_fetched":
          console.log(`[Smart Auto-Refresh] Comprehensive data fetch for ${anime.title}`);
          try {
            // For never-fetched anime, get everything
            const [metadataResult, posterResult, episodeResult, charactersResult] = await Promise.allSettled([
              ctx.runAction(internal.externalApis.fetchCoreMetadataFromAniList, {
                title: anime.title
              }),
              ctx.runAction(internal.externalApis.fetchBestQualityPoster, {
                title: anime.title,
                year: anime.year
              }),
              ctx.runAction(internal.externalApis.fetchStreamingEpisodesFromConsumet, {
                title: anime.title
              }),
              ctx.runAction(internal.externalApis.fetchCharacterListFromAniList, {
                title: anime.title
              })
            ]);

            let updates: any = {};
            
            if (metadataResult.status === 'fulfilled' && metadataResult.value.success) {
              updates = { ...updates, ...metadataResult.value.metadata };
              actionsUsed.push("fetchCoreMetadataFromAniList");
              fieldsUpdated.push("metadata");
              dataChanged = true;
            }

            if (posterResult.status === 'fulfilled' && posterResult.value.success) {
              updates.posterUrl = posterResult.value.posterUrl;
              actionsUsed.push("fetchBestQualityPoster");
              fieldsUpdated.push("poster");
              dataChanged = true;
            }

            if (episodeResult.status === 'fulfilled' && episodeResult.value.success && episodeResult.value.episodes.length > 0) {
              updates.streamingEpisodes = episodeResult.value.episodes;
              updates.totalEpisodes = episodeResult.value.totalEpisodes;
              actionsUsed.push("fetchStreamingEpisodesFromConsumet");
              fieldsUpdated.push("episodes");
              dataChanged = true;
            }

            if (charactersResult.status === 'fulfilled' && charactersResult.value.success && charactersResult.value.characters.length > 0) {
              updates.characters = charactersResult.value.characters;
              actionsUsed.push("fetchCharacterListFromAniList");
              fieldsUpdated.push("characters");
              dataChanged = true;
            }

            if (Object.keys(updates).length > 0) {
              await ctx.runMutation(internal.anime.updateAnimeWithExternalData, {
                animeId: args.animeId,
                updates,
                sourceApi: "multiple"
              });
            }
          } catch (error: any) {
            console.error(`[Smart Auto-Refresh] Comprehensive fetch failed for ${anime.title}:`, error.message);
          }
          break;

        case "general_stale":
        default:
          console.log(`[Smart Auto-Refresh] General refresh for ${anime.title}`);
          // Fallback to the existing comprehensive refresh
          const refreshResult = await ctx.runAction(internal.externalApis.triggerFetchExternalAnimeDetails, {
            animeIdInOurDB: args.animeId,
            titleToSearch: anime.title
          });

          if (refreshResult.success) {
            actionsUsed.push("triggerFetchExternalAnimeDetails");
            fieldsUpdated.push("general");
            dataChanged = true;
          }
          break;
      }

      const message = dataChanged 
        ? `Updated: ${fieldsUpdated.join(", ")} using ${actionsUsed.join(", ")}` 
        : "Refreshed but no new data found";

      console.log(`[Smart Auto-Refresh] ${anime.title} - ${message}`);

      return {
        refreshed: true,
        priority,
        dataChanged,
        fieldsUpdated,
        message,
        actionsUsed
      };

    } catch (error: any) {
      console.error(`[Smart Auto-Refresh] Error refreshing ${anime.title}:`, error.message);
      return {
        refreshed: false,
        priority,
        dataChanged: false,
        fieldsUpdated: [],
        message: `Error: ${error.message}`,
        actionsUsed: []
      };
    }
  }
});

// UPDATED: Batch smart refresh for multiple anime (keeping existing interface)
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
      const allAnime: Doc<"anime">[] = await ctx.runQuery(internal.anime.getAllAnimeInternal, {});
      
      // Calculate priorities and filter
      const animeWithPriorities: AnimeWithPriority[] = allAnime.map((anime: Doc<"anime">) => ({
        anime,
        priority: calculateRefreshPriority(anime)
      }));
      
      animeToProcess = animeWithPriorities
        .filter(({ priority }: AnimeWithPriority) => {
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

// Keep existing public actions (unchanged)
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

// NEW: Get detailed refresh recommendation for an anime
export const getDetailedRefreshRecommendation = action({
  args: { animeId: v.id("anime") },
  handler: async (ctx: ActionCtx, args): Promise<{
    priority: RefreshPriority["priority"];
    reason: RefreshPriority["reason"];
    recommendedAction: RefreshPriority["recommendedAction"];
    freshnessScore: number;
    specificActions: string[];
    anime: {
      title: string;
      lastFetched?: number;
      airingStatus?: string;
      hasEpisodes: boolean;
      hasPoster: boolean;
      hasCharacters: boolean;
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
        hasPoster: !!(anime.posterUrl && !anime.posterUrl.includes('placehold.co')),
        hasCharacters: !!(anime.characters?.length)
      }
    };
  }
});

// Keep existing bulk fix action (unchanged)
export const bulkFixMissingEpisodeData = action({
  args: {
    dryRun: v.optional(v.boolean()),
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
    
    const allAnime: Doc<"anime">[] = await ctx.runQuery(internal.anime.getAllAnimeInternal, {});
    
    const animeMissingEpisodes = allAnime
      .map((anime: Doc<"anime">) => ({
        anime,
        priority: calculateRefreshPriority(anime)
      }))
      .filter(({ anime, priority }) => {
        return priority.reason === "missing_episodes" || 
               priority.reason === "stale_episodes" ||
               (!anime.streamingEpisodes || anime.streamingEpisodes.length === 0);
      })
      .sort((a, b) => {
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

    // Process the anime using the enhanced smart refresh
    console.log(`[Bulk Episode Fix] Processing ${animeMissingEpisodes.length} anime...`);
    
    let processed = 0;
    let fixed = 0;
    const errors: string[] = [];

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
      errors: errors.slice(0, 5),
      animeList
    };
  }
});