// convex/externalApis.ts - Enhanced version with episode data fetching

"use node";
import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { ActionCtx } from "./_generated/server";

// Helper Functions
const getString = (obj: any, path: string, defaultValue?: string): string | undefined => {
    const value = path.split('.').reduce((o, p) => (o && o[p] !== undefined && o[p] !== null) ? o[p] : undefined, obj);
    if (value === undefined || value === null) return defaultValue;
    return String(value);
};
const getNumber = (obj: any, path: string, defaultValue?: number): number | undefined => {
    const value = path.split('.').reduce((o, p) => (o && o[p] !== undefined && o[p] !== null) ? o[p] : undefined, obj);
    if (value === undefined || value === null) return defaultValue;
    const num = parseFloat(String(value));
    return isNaN(num) ? defaultValue : num;
};
const getStringArray = (obj: any, path: string, nameField: string = "name"): string[] | undefined => {
    const arr = path.split('.').reduce((o, p) => (o && o[p]) ? o[p] : undefined, obj);
    if (Array.isArray(arr)) {
        const mappedArr = arr.map(item => getString(item, nameField)).filter(item => typeof item === 'string' && item.length > 0) as string[];
        return mappedArr.length > 0 ? mappedArr : undefined;
    }
    return undefined;
};

// Add interfaces for test results
interface TestResult {
  title: string;
  success: boolean;
  message?: string;
  source?: string;
  error?: string;
}

interface TestEnhancementResult {
  success: boolean;
  message: string;
  tested: number;
  enhanced: number;
  processed?: number; // Add this property
  results?: TestResult[];
}

interface QuickFixResult {
  success: boolean;
  message: string;
  processed: number;
  enhanced: number;
  tested: number;
}

interface SampleTestResult {
  success: boolean;
  message: string;
  tested: number;
  enhanced: number;
  results?: TestResult[];
}

// Add interface for poster stats
interface PosterStats {
  total: number;
  withPosters: number;
  withoutPosters: number;
  withPlaceholders: number;
  withRealPosters: number;
  withLowQuality: number;
  recentlyFetched: number;
  neverFetched: number;
  needsEnhancement: number;
}

interface PosterStatsResult {
  stats: PosterStats;
  percentages: {
    withPosters: string;
    withRealPosters: string;
    needsEnhancement: string;
  };
}

// Add interfaces for the quality check results
interface AnimeQualityReport {
  animeId: Id<"anime">;
  title: string;
  posterUrl?: string;
  quality: "missing" | "placeholder" | "low" | "good" | "unknown";
  needsEnhancement: boolean;
  reason: string;
  lastFetched: number | null;
}

interface QualitySummary {
  total: number;
  missing: number;
  placeholder: number;
  low: number;
  good: number;
  needEnhancement: number;
}

interface QualityCheckResult {
  summary: QualitySummary;
  details: AnimeQualityReport[];
}

interface BatchEnhancementResult {
  enhancedCount: number;
  error?: string;
}

interface ExternalApiResult {
  success: boolean;
  message: string;
  details?: any;
  source?: string;
}

// NEW: Interface for episode batch update result
interface EpisodeBatchUpdateResult {
  success: boolean;
  message: string;
  totalProcessed: number;
  totalEnhanced: number;
  errors: string[];
}

const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 1000;

// Enhanced image quality selection
const selectBestImageUrl = (images: any): string | undefined => {
    if (!images) return undefined;
    
    // AniList image priority: extraLarge > large > medium
    if (images.extraLarge) return images.extraLarge;
    if (images.large) return images.large;
    if (images.medium) return images.medium;
    
    // Jikan image priority: large_image_url > image_url > small_image_url
    if (images.jpg?.large_image_url) return images.jpg.large_image_url;
    if (images.webp?.large_image_url) return images.webp.large_image_url;
    if (images.jpg?.image_url) return images.jpg.image_url;
    if (images.webp?.image_url) return images.webp.image_url;
    
    return undefined;
};

const fetchFromAnilist = async (title: string, existingAnilistId?: number): Promise<any | null> => {
    const anilistQuery = `
      query ($search: String, $id: Int) {
        Media (search: $search, id: $id, type: ANIME, sort: SEARCH_MATCH) {
          id
          title { romaji english native }
          description (asHtml: false)
          startDate { year month day }
          endDate { year month day }
          season
          seasonYear
          episodes
          duration
          status
          countryOfOrigin
          source (version: 2)
          hashtag
          trailer { id site thumbnail }
          updatedAt
          coverImage { 
            extraLarge 
            large 
            medium 
            color 
          }
          bannerImage
          genres
          synonyms
          averageScore
          meanScore
          popularity
          trending
          favourites
          tags { id name description category rank isGeneralSpoiler isMediaSpoiler isAdult }
          relations { edges { relationType(version: 2) node { id title { romaji english } type format } } }
          characters(sort: [ROLE, RELEVANCE, ID]) { edges { role node { id name { full } image { large } } } }
          staff(sort: [RELEVANCE, ID]) { edges { role node { id name { full } image { large } } } }
          studios { edges { isMain node { id name isAnimationStudio } } }
          isAdult
          nextAiringEpisode { airingAt timeUntilAiring episode }
          externalLinks { id url site type language color icon notes isDisabled }
          streamingEpisodes { title thumbnail url site }
          rankings { id rank type format year season allTime context }
          stats { scoreDistribution { score amount } statusDistribution { status amount } }
        }
      }
    `;
    const variables = existingAnilistId ? { id: existingAnilistId } : { search: title };
    try {
        console.log(`[External API - AniList] Querying for title: "${title}", ID: ${existingAnilistId || "N/A"}`);
        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ query: anilistQuery, variables })
        });
        const responseBodyText = await response.text();
        if (!response.ok) {
            console.error(`[External API - AniList] Error for "${title}" (ID: ${existingAnilistId}): ${response.status} - ${response.statusText}. Body: ${responseBodyText.substring(0, 500)}`);
            return null;
        }
        const data = JSON.parse(responseBodyText);
        if (data.errors) {
            console.error(`[External API - AniList] GraphQL errors for "${title}":`, JSON.stringify(data.errors).substring(0,500));
            return null;
        }
        if (data?.data?.Media) console.log(`[External API - AniList] Data found for "${title}" (AniList ID: ${data.data.Media.id})`);
        else console.log(`[External API - AniList] No Media object found for "${title}" in response.`);
        return data?.data?.Media;
    } catch (error: any) {
        console.error(`[External API - AniList] Fetch exception for "${title}":`, error.message ? error.message : error);
        return null;
    }
};

// NEW: Helper function to map episode data from AniList
const mapEpisodeData = (streamingEpisodes: any[]): any[] => {
    if (!Array.isArray(streamingEpisodes)) return [];
    
    return streamingEpisodes
        .filter(ep => ep && (ep.title || ep.url)) // Only include episodes with at least title or URL
        .map(ep => ({
            title: ep.title || `Episode ${streamingEpisodes.indexOf(ep) + 1}`,
            thumbnail: ep.thumbnail || undefined,
            url: ep.url || undefined,
            site: ep.site || undefined,
        }))
        .slice(0, 50); // Limit to first 50 episodes to avoid overwhelming storage
};

export const triggerFetchExternalAnimeDetails = internalAction({
  args: { animeIdInOurDB: v.id("anime"), titleToSearch: v.string() },
  handler: async (ctx: ActionCtx, args): Promise<ExternalApiResult> => {
    const existingAnime = await ctx.runQuery(internal.anime.getAnimeByIdInternal, { animeId: args.animeIdInOurDB });
    if (!existingAnime) return { success: false, message: "Internal: Anime not found." };

    let apiData: any = null;
    let sourceApiUsed: string = "none";

    // Try AniList first (higher quality images and episode data)
    if (existingAnime.anilistId) {
        apiData = await fetchFromAnilist(args.titleToSearch, existingAnime.anilistId);
        if (apiData) sourceApiUsed = "anilist";
    }
    if (!apiData) {
        apiData = await fetchFromAnilist(args.titleToSearch);
        if (apiData) sourceApiUsed = "anilist";
    }

    // Fallback to Jikan if AniList fails
    if (!apiData) {
        console.log(`[External API] AniList failed or no data, falling back to Jikan for "${args.titleToSearch}"`);
        const encodedTitle = encodeURIComponent(args.titleToSearch);
        const jikanUrl = `https://api.jikan.moe/v4/anime?q=${encodedTitle}&limit=1&sfw`;
        sourceApiUsed = "jikan";
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                const response = await fetch(jikanUrl, { headers: { 'Accept': 'application/json' } });
                if (!response.ok) {
                    const errorBody = await response.text().catch(() => "Failed to read error body");
                    console.error(`[External API - Jikan] Request failed: ${response.status}, Body: ${errorBody.substring(0,100)}`);
                    if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES) {
                        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
                        continue;
                    }
                    return { success: false, message: `Jikan API fail: ${response.status}`, details: { body: errorBody.substring(0,200) }, source: sourceApiUsed };
                }
                const jikanResponse = await response.json();
                apiData = jikanResponse?.data?.[0];
                break;
            } catch (error: any) {
                console.error(`[External API - Jikan] Fetch exception attempt ${attempt + 1}:`, error);
                if (attempt >= MAX_RETRIES) return { success: false, message: `Jikan fetch error: ${error.message}`, source: sourceApiUsed };
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
            }
        }
    }

    if (apiData) {
        let mappedData: Partial<Omit<Doc<"anime">, "title">> = {};
        let fetchedTitle: string | undefined = undefined;

        if (sourceApiUsed === "jikan") {
            // Enhanced image selection for Jikan
            const bestImageUrl = selectBestImageUrl(apiData.images);
            
              mappedData = {
              description: getString(apiData, 'synopsis', existingAnime.description),
              posterUrl: bestImageUrl || existingAnime.posterUrl,
              genres: getStringArray(apiData, 'genres', 'name') || existingAnime.genres,
              year: apiData.year ?? (apiData.aired?.from ? new Date(apiData.aired.from).getFullYear() : existingAnime.year),
              rating: getNumber(apiData, 'score', existingAnime.rating),
              emotionalTags: getStringArray(apiData, 'themes', 'name')?.concat(getStringArray(apiData, 'demographics', 'name') || []) || existingAnime.emotionalTags,
              trailerUrl: getString(apiData, 'trailer.url', existingAnime.trailerUrl),
              studios: getStringArray(apiData, 'studios', 'name') || existingAnime.studios,
              themes: getStringArray(apiData, 'themes', 'name') || existingAnime.themes,
              // NEW: Episode data from Jikan (limited)
              totalEpisodes: getNumber(apiData, 'episodes', existingAnime.totalEpisodes), // Also good to use getNumber here if apiData.episodes might not be a number
              episodeDuration: getNumber(apiData, 'duration', existingAnime.episodeDuration), // <<< FIX APPLIED HERE
              airingStatus: getString(apiData, 'status', existingAnime.airingStatus), // getString might be more appropriate for status
            };
        } else if (sourceApiUsed === "anilist" && apiData) {
            fetchedTitle = apiData.title?.english || apiData.title?.romaji || apiData.title?.native;
            
            if (fetchedTitle && fetchedTitle.toLowerCase() !== existingAnime.title.toLowerCase()) {
                console.warn(`[External API - AniList] Fetched title "${fetchedTitle}" differs from existing "${existingAnime.title}". Title will not be updated by this process.`);
            }

            // Enhanced image selection for AniList
            const bestImageUrl = selectBestImageUrl(apiData.coverImage);

            mappedData.anilistId = apiData.id;
            mappedData.description = apiData.description || existingAnime.description;
            if (apiData.startDate?.year) mappedData.year = apiData.startDate.year;
            else if (apiData.seasonYear) mappedData.year = apiData.seasonYear;
            
            // Prioritize high-quality images
            if (bestImageUrl) {
                mappedData.posterUrl = bestImageUrl;
                console.log(`[External API - AniList] Selected high-quality image: ${bestImageUrl}`);
            }
            
            if (apiData.genres?.length) mappedData.genres = apiData.genres;

            let anilistStudiosData = existingAnime.studios || [];
            if (apiData.studios?.edges?.length) {
                let mainStudios = apiData.studios.edges.filter((e: any) => e.isMain).map((e: any) => e.node.name).filter(Boolean);
                if (mainStudios.length === 0 && apiData.studios?.edges?.length > 0) {
                     mainStudios = apiData.studios.edges.map((e: any) => e.node.name).filter(Boolean);
                }
                if (mainStudios.length > 0) anilistStudiosData = mainStudios;
            }
            mappedData.studios = anilistStudiosData;

            if (apiData.averageScore) mappedData.rating = parseFloat((apiData.averageScore / 10).toFixed(1));

            if (apiData.trailer?.site === "youtube" && apiData.trailer?.id) mappedData.trailerUrl = `https://www.youtube.com/watch?v=${apiData.trailer.id}`;

            const anilistThemesFromTags = apiData.tags?.filter((t:any) => t.category?.toLowerCase().includes('theme') || t.rank > 60).map((t:any)=>t.name).filter(Boolean) || [];
            const anilistEmotionalFromTags = apiData.tags?.filter((t:any) => !t.category?.toLowerCase().includes('theme') && t.rank > 50).map((t:any)=>t.name).filter(Boolean) || [];

            mappedData.themes = anilistThemesFromTags.length ? [...new Set([...(existingAnime.themes || []), ...anilistThemesFromTags])] : existingAnime.themes;
            mappedData.emotionalTags = anilistEmotionalFromTags.length ? [...new Set([...(existingAnime.emotionalTags || []), ...anilistEmotionalFromTags])] : existingAnime.emotionalTags;
            
            // NEW: Episode and streaming data from AniList
            if (apiData.streamingEpisodes?.length > 0) {
                mappedData.streamingEpisodes = mapEpisodeData(apiData.streamingEpisodes);
                console.log(`[External API - AniList] Found ${mappedData.streamingEpisodes.length} streaming episodes for "${existingAnime.title}"`);
            }
            
            // Additional episode metadata
            if (apiData.episodes) mappedData.totalEpisodes = apiData.episodes;
            if (apiData.duration) mappedData.episodeDuration = apiData.duration;
            if (apiData.status) mappedData.airingStatus = apiData.status;
            
            // Next airing episode info
            if (apiData.nextAiringEpisode) {
                mappedData.nextAiringEpisode = {
                    airingAt: apiData.nextAiringEpisode.airingAt,
                    episode: apiData.nextAiringEpisode.episode,
                    timeUntilAiring: apiData.nextAiringEpisode.timeUntilAiring,
                };
            }
            
            console.log(`[External API - AniList] Mapped data for (AniList ID: ${apiData.id}). Title in DB: "${existingAnime.title}"`);
        }

        const updatesForMutation: Partial<Omit<Doc<"anime">, "title" | "_id" | "_creationTime">> = { ...mappedData };

        if (Object.keys(updatesForMutation).length > 0) {
            await ctx.runMutation(internal.anime.updateAnimeWithExternalData, {
              animeId: args.animeIdInOurDB,
              updates: updatesForMutation,
              sourceApi: sourceApiUsed,
            });
            const episodeCount = mappedData.streamingEpisodes?.length || 0;
            const episodeMessage = episodeCount > 0 ? ` (${episodeCount} episodes)` : '';
            return { success: true, message: `High-quality data from ${sourceApiUsed} applied${episodeMessage}.`, source: sourceApiUsed };
        } else {
            return { success: true, message: `No new data from ${sourceApiUsed} to update.`, source: sourceApiUsed };
        }
    } else {
        return { success: false, message: `No data found from any external API for "${args.titleToSearch}".`, source: sourceApiUsed };
    }
  },
});

// NEW: Batch update episode data for all anime
export const batchUpdateEpisodeDataForAllAnime = internalAction({
  args: {
    batchSize: v.optional(v.number()),
    maxAnimeToProcess: v.optional(v.number()),
  },
  handler: async (ctx: ActionCtx, args): Promise<EpisodeBatchUpdateResult> => {
    const batchSize = args.batchSize || 5;
    const maxAnimeToProcess = args.maxAnimeToProcess || 25;
    
    console.log(`[Episode Batch Update] Starting batch update for anime episode data...`);
    
    // Get all anime, prioritizing those without episode data or with old data
    const allAnime: Doc<"anime">[] = await ctx.runQuery(internal.anime.getAllAnimeInternal, {});
    
    const animeNeedingEpisodeUpdate = allAnime
      .filter((anime: Doc<"anime">) => {
        // Prioritize anime without episode data
        if (!anime.streamingEpisodes || anime.streamingEpisodes.length === 0) return true;
        
        // Also update anime with very old episode data (30+ days)
        if (!anime.lastFetchedFromExternal) return true;
        const daysSinceLastFetch = (Date.now() - anime.lastFetchedFromExternal.timestamp) / (24 * 60 * 60 * 1000);
        return daysSinceLastFetch > 30;
      })
      .slice(0, maxAnimeToProcess);

    if (animeNeedingEpisodeUpdate.length === 0) {
      return {
        success: true,
        message: "No anime need episode data updates",
        totalProcessed: 0,
        totalEnhanced: 0,
        errors: []
      };
    }

    console.log(`[Episode Batch Update] Found ${animeNeedingEpisodeUpdate.length} anime needing episode updates`);
    
    let totalProcessed = 0;
    let totalEnhanced = 0;
    const errors: string[] = [];

    // Process in batches with rate limiting
    for (let i = 0; i < animeNeedingEpisodeUpdate.length; i += batchSize) {
      const batch = animeNeedingEpisodeUpdate.slice(i, i + batchSize);
      
      console.log(`[Episode Batch Update] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(animeNeedingEpisodeUpdate.length / batchSize)}`);

      // Process batch with individual error handling
      const batchPromises = batch.map(async (anime: Doc<"anime">): Promise<boolean> => {
        try {
          console.log(`[Episode Batch Update] Processing: ${anime.title}`);
          
          const result = await ctx.runAction(internal.externalApis.triggerFetchExternalAnimeDetails, {
            animeIdInOurDB: anime._id,
            titleToSearch: anime.title
          });
          
          totalProcessed++;
          
          if (result.success) {
            totalEnhanced++;
            console.log(`[Episode Batch Update] ✅ Enhanced: ${anime.title}`);
            return true;
          } else {
            console.log(`[Episode Batch Update] ❌ Failed: ${anime.title} - ${result.message}`);
            return false;
          }
          
        } catch (error: any) {
          totalProcessed++;
          const errorMsg = `${anime.title}: ${error.message}`;
          errors.push(errorMsg);
          console.error(`[Episode Batch Update] Error processing ${anime.title}:`, error.message);
          return false;
        }
      });
      
      // Wait for batch to complete
      await Promise.all(batchPromises);
      
      // Respectful delay between batches (longer for episode updates)
      if (i + batchSize < animeNeedingEpisodeUpdate.length) {
        console.log(`[Episode Batch Update] Waiting 8 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 8000)); // 8 second delay for AniList rate limiting
      }
    }
    
    const message = `Episode batch update completed! Processed: ${totalProcessed}, Enhanced: ${totalEnhanced}, Errors: ${errors.length}`;
    console.log(`[Episode Batch Update] ${message}`);
    
    return {
      success: true,
      message,
      totalProcessed,
      totalEnhanced,
      errors: errors.slice(0, 10) // Limit error array size
    };
  },
});

// Add scheduled enhancement for existing anime with low-quality posters
export const enhanceExistingAnimePosters = internalAction({
  args: {},
  handler: async (ctx: ActionCtx) => {
    console.log("[Poster Enhancement] Starting batch enhancement of existing anime posters...");
    
    // Get anime with potentially low-quality posters
    const allAnime: Doc<"anime">[] = await ctx.runQuery(internal.anime.getAllAnimeInternal, {});
    const animesToEnhance = allAnime.filter(anime => {
      const poster = anime.posterUrl;
      // Target placeholder images or very old/low quality URLs
      return !poster || 
             poster.includes('placehold.co') || 
             poster.includes('placeholder') ||
             poster.includes('300x450') ||
             !anime.lastFetchedFromExternal ||
             (Date.now() - anime.lastFetchedFromExternal.timestamp) > (30 * 24 * 60 * 60 * 1000); // 30 days old
    });

    console.log(`[Poster Enhancement] Found ${animesToEnhance.length} anime that could benefit from poster enhancement.`);
    
    // Process in batches to avoid overwhelming external APIs
    const batchSize = 5;
    for (let i = 0; i < Math.min(animesToEnhance.length, 20); i += batchSize) { // Limit to 20 per run
      const batch = animesToEnhance.slice(i, i + batchSize);
      
      for (const anime of batch) {
        try {
          console.log(`[Poster Enhancement] Processing: ${anime.title}`);
          await ctx.runAction(internal.externalApis.triggerFetchExternalAnimeDetails, {
            animeIdInOurDB: anime._id,
            titleToSearch: anime.title
          });
          
          // Small delay between requests to be respectful to APIs
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error: any) {
          console.error(`[Poster Enhancement] Failed to enhance ${anime.title}:`, error.message);
        }
      }
      
      // Longer delay between batches
      if (i + batchSize < Math.min(animesToEnhance.length, 20)) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    console.log("[Poster Enhancement] Batch enhancement completed.");
  },
});

export const callTriggerFetchExternalAnimeDetails = action({
  args: { animeIdInOurDB: v.id("anime"), titleToSearch: v.string() },
  handler: async (ctx: ActionCtx, args): Promise<ExternalApiResult> => {
    return await ctx.runAction(internal.externalApis.triggerFetchExternalAnimeDetails, args);
  },
});

// Add this to convex/externalApis.ts - Batch poster enhancement for visible anime

export const batchEnhanceVisibleAnimePosters = internalAction({
  args: {
    animeIds: v.array(v.id("anime")),
    messageId: v.string(),
  },
  handler: async (ctx: ActionCtx, args): Promise<BatchEnhancementResult> => {
    console.log(`[Batch Poster Enhancement] Starting enhancement for ${args.animeIds.length} anime...`);
    
    let enhancedCount = 0;
    const errors: string[] = [];

    // Process in small batches to avoid overwhelming APIs
    const batchSize = 3;
    
    for (let i = 0; i < args.animeIds.length; i += batchSize) {
      const batchIds = args.animeIds.slice(i, i + batchSize);
      
      // Process batch in parallel
      const batchPromises = batchIds.map(async (animeId: Id<"anime">): Promise<boolean> => {
        try {
          const anime: Doc<"anime"> | null = await ctx.runQuery(internal.anime.getAnimeByIdInternal, { animeId });
          if (!anime) {
            console.warn(`[Batch Poster Enhancement] Anime ${animeId} not found`);
            return false;
          }

          // Check if poster needs enhancement
          const needsEnhancement = !anime.posterUrl || 
                                 anime.posterUrl.includes('placehold.co') || 
                                 anime.posterUrl.includes('placeholder') ||
                                 anime.posterUrl.includes('300x450') ||
                                 !anime.lastFetchedFromExternal ||
                                 (Date.now() - anime.lastFetchedFromExternal.timestamp) > (7 * 24 * 60 * 60 * 1000); // 7 days old

          if (needsEnhancement) {
            console.log(`[Batch Poster Enhancement] Enhancing poster for: ${anime.title}`);
            
            // Use the existing external API fetching function
            const result = await ctx.runAction(internal.externalApis.triggerFetchExternalAnimeDetails, {
              animeIdInOurDB: animeId,
              titleToSearch: anime.title
            });

            if (result.success) {
              console.log(`[Batch Poster Enhancement] ✅ Enhanced: ${anime.title}`);
              return true;
            } else {
              console.warn(`[Batch Poster Enhancement] ❌ Failed to enhance: ${anime.title} - ${result.message}`);
              return false;
            }
          } else {
            console.log(`[Batch Poster Enhancement] ✓ Skipped (already good): ${anime.title}`);
            return false;
          }
        } catch (error: any) {
          console.error(`[Batch Poster Enhancement] Error for anime ${animeId}:`, error.message);
          errors.push(`${animeId}: ${error.message}`);
          return false;
        }
      });

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      enhancedCount += batchResults.filter(result => result === true).length;

      // Respectful delay between batches
      if (i + batchSize < args.animeIds.length) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay between batches
      }

      console.log(`[Batch Poster Enhancement] Batch ${Math.floor(i / batchSize) + 1} complete. Enhanced: ${batchResults.filter(r => r).length}/${batchResults.length}`);
    }

    console.log(`[Batch Poster Enhancement] Complete! Enhanced ${enhancedCount} out of ${args.animeIds.length} anime.`);

    // Store feedback about the batch operation
    await ctx.runMutation(api.ai.storeAiFeedback, {
      prompt: `Batch enhance ${args.animeIds.length} anime posters`,
      aiAction: "batchEnhanceVisibleAnimePosters",
      aiResponseText: `Enhanced ${enhancedCount} posters. Errors: ${errors.length > 0 ? errors.join("; ") : "None"}`,
      feedbackType: "none",
      messageId: args.messageId,
    });

    return {
      enhancedCount,
      error: errors.length > 0 ? `Some enhancements failed: ${errors.slice(0, 3).join("; ")}${errors.length > 3 ? "..." : ""}` : undefined
    };
  },
});

// Public action that users can call
export const callBatchEnhanceVisibleAnimePosters = action({
  args: {
    animeIds: v.array(v.id("anime")),
    messageId: v.string(),
  },
  handler: async (ctx: ActionCtx, args): Promise<BatchEnhancementResult> => {
    return await ctx.runAction(internal.externalApis.batchEnhanceVisibleAnimePosters, args);
  },
});

// Enhanced version of the existing scheduled poster enhancement job with proper types
export const enhanceExistingAnimePostersBetter = internalAction({
  args: {},
  handler: async (ctx: ActionCtx): Promise<void> => {
    console.log("[Enhanced Poster Enhancement] Starting comprehensive poster enhancement...");
    
    // Get anime with potentially low-quality posters
    const allAnime: Doc<"anime">[] = await ctx.runQuery(internal.anime.getAllAnimeInternal, {});
    const animesToEnhance = allAnime.filter((anime: Doc<"anime">) => {
      const poster = anime.posterUrl;
      // Target placeholder images, very old/low quality URLs, or never-fetched anime
      return !poster || 
             poster.includes('placehold.co') || 
             poster.includes('placeholder') ||
             poster.includes('300x450') ||
             poster.includes('via.placeholder') ||
             !anime.lastFetchedFromExternal ||
             (Date.now() - anime.lastFetchedFromExternal.timestamp) > (14 * 24 * 60 * 60 * 1000); // 14 days old
    });

    console.log(`[Enhanced Poster Enhancement] Found ${animesToEnhance.length} anime that need poster enhancement.`);
    
    if (animesToEnhance.length === 0) {
      console.log("[Enhanced Poster Enhancement] No anime need poster enhancement.");
      return;
    }

    // Process in batches with rate limiting
    const batchSize = 5;
    const maxAnimesToProcess = 30; // Limit per run to avoid timeouts
    const animeToProcess = animesToEnhance.slice(0, maxAnimesToProcess);
    
    let processedCount = 0;
    let enhancedCount = 0;

    for (let i = 0; i < animeToProcess.length; i += batchSize) {
      const batch = animeToProcess.slice(i, i + batchSize);
      
      console.log(`[Enhanced Poster Enhancement] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(animeToProcess.length / batchSize)}`);

      // Process batch with individual error handling
      const batchPromises = batch.map(async (anime: Doc<"anime">): Promise<void> => {
        try {
          console.log(`[Enhanced Poster Enhancement] Processing: ${anime.title}`);
          
          const result = await ctx.runAction(internal.externalApis.triggerFetchExternalAnimeDetails, {
            animeIdInOurDB: anime._id,
            titleToSearch: anime.title
          });
          
          processedCount++;
          
          if (result.success) {
            enhancedCount++;
            console.log(`[Enhanced Poster Enhancement] ✅ Enhanced: ${anime.title}`);
          } else {
            console.log(`[Enhanced Poster Enhancement] ❌ Failed: ${anime.title} - ${result.message}`);
          }
          
          // Small delay between individual requests within batch
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error: any) {
          processedCount++;
          console.error(`[Enhanced Poster Enhancement] Error processing ${anime.title}:`, error.message);
        }
      });
      
      // Wait for batch to complete
      await Promise.all(batchPromises);
      
      // Longer delay between batches to be respectful to external APIs
      if (i + batchSize < animeToProcess.length) {
        console.log(`[Enhanced Poster Enhancement] Waiting 5 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    console.log(`[Enhanced Poster Enhancement] Completed! Processed: ${processedCount}, Enhanced: ${enhancedCount}, Remaining: ${animesToEnhance.length - processedCount}`);
  },
});

// Quick poster quality check action
export const checkPosterQuality = action({
  args: {
    animeIds: v.optional(v.array(v.id("anime"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx: ActionCtx, args): Promise<QualityCheckResult> => {
    const limit = args.limit || 20;
    let animeToCheck: Doc<"anime">[] = [];

    if (args.animeIds) {
      // Check specific anime
      const animeResults = await Promise.all(
        args.animeIds.map((id: Id<"anime">) => ctx.runQuery(internal.anime.getAnimeByIdInternal, { animeId: id }))
      );
      animeToCheck = animeResults.filter((anime): anime is Doc<"anime"> => anime !== null);
    } else {
      // Check random sample
      const allAnime: Doc<"anime">[] = await ctx.runQuery(internal.anime.getAllAnimeInternal, {});
      animeToCheck = allAnime.slice(0, limit);
    }

    const qualityReport: AnimeQualityReport[] = animeToCheck.map((anime: Doc<"anime">) => {
      const poster = anime.posterUrl;
      
      let quality: AnimeQualityReport["quality"] = "unknown";
      let needsEnhancement = true;
      let reason = "";

      if (!poster) {
        quality = "missing";
        reason = "No poster URL";
      } else if (poster.includes('placehold.co') || poster.includes('placeholder')) {
        quality = "placeholder";
        reason = "Using placeholder image";
      } else if (poster.includes('300x450')) {
        quality = "low";
        reason = "Low resolution (300x450)";
      } else if (poster.startsWith('https://')) {
        quality = "good";
        needsEnhancement = false;
        reason = "Has real poster URL";
        
        // Check if it's old data
        if (!anime.lastFetchedFromExternal || (Date.now() - anime.lastFetchedFromExternal.timestamp) > (30 * 24 * 60 * 60 * 1000)) {
          needsEnhancement = true;
          reason += " (but data is old, may need refresh)";
        }
      }

      return {
        animeId: anime._id,
        title: anime.title,
        posterUrl: poster,
        quality,
        needsEnhancement,
        reason,
        lastFetched: anime.lastFetchedFromExternal?.timestamp || null,
      };
    });

    const summary: QualitySummary = {
      total: qualityReport.length,
      missing: qualityReport.filter(r => r.quality === "missing").length,
      placeholder: qualityReport.filter(r => r.quality === "placeholder").length,
      low: qualityReport.filter(r => r.quality === "low").length,
      good: qualityReport.filter(r => r.quality === "good").length,
      needEnhancement: qualityReport.filter(r => r.needsEnhancement).length,
    };

    return {
      summary,
      details: qualityReport,
    };
  },
});

// Action to get detailed poster statistics with proper types
export const getPosterQualityStats = action({
  args: {},
  handler: async (ctx: ActionCtx): Promise<PosterStatsResult> => {
        const allAnime: Doc<"anime">[] = await ctx.runQuery(internal.anime.getAllAnimeInternal, {});
    
    const stats: PosterStats = {
      total: allAnime.length,
      withPosters: 0,
      withoutPosters: 0,
      withPlaceholders: 0,
      withRealPosters: 0,
      withLowQuality: 0,
      recentlyFetched: 0,
      neverFetched: 0,
      needsEnhancement: 0,
    };
    
    const now = Date.now();
    
    allAnime.forEach((anime: Doc<"anime">) => {
      const poster = anime.posterUrl;
      
      if (!poster) {
        stats.withoutPosters++;
        stats.needsEnhancement++;
      } else {
        stats.withPosters++;
        
        if (poster.includes('placehold.co') || poster.includes('placeholder')) {
          stats.withPlaceholders++;
          stats.needsEnhancement++;
        } else if (poster.includes('300x450')) {
          stats.withLowQuality++;
          stats.needsEnhancement++;
        } else if (poster.startsWith('https://')) {
          stats.withRealPosters++;
        }
      }
      
      if (anime.lastFetchedFromExternal) {
        const daysSinceLastFetch = (now - anime.lastFetchedFromExternal.timestamp) / (24 * 60 * 60 * 1000);
        if (daysSinceLastFetch <= 7) {
          stats.recentlyFetched++;
        } else if (daysSinceLastFetch > 30) {
          stats.needsEnhancement++;
        }
      } else {
        stats.neverFetched++;
        stats.needsEnhancement++;
      }
    });
    
    return {
      stats,
      percentages: {
        withPosters: ((stats.withPosters / stats.total) * 100).toFixed(1),
        withRealPosters: ((stats.withRealPosters / stats.total) * 100).toFixed(1),
        needsEnhancement: ((stats.needsEnhancement / stats.total) * 100).toFixed(1),
      }
    };
  },
});

// Action to run poster enhancement on a sample for testing with proper types
export const testPosterEnhancementSample = action({
  args: {
    sampleSize: v.optional(v.number()),
  },
  handler: async (ctx: ActionCtx, args): Promise<SampleTestResult> => {
    const sampleSize = args.sampleSize || 5;
    
    console.log(`[Test Poster Enhancement] Testing on ${sampleSize} anime sample...`);
    
    const allAnime: Doc<"anime">[] = await ctx.runQuery(internal.anime.getAllAnimeInternal, {});
    const animesToTest = allAnime
      .filter((anime: Doc<"anime">) => !anime.posterUrl || anime.posterUrl.includes('placeholder'))
      .slice(0, sampleSize);
    
    if (animesToTest.length === 0) {
      return {
        success: false,
        message: "No anime found that need poster enhancement",
        tested: 0,
        enhanced: 0
      };
    }
    
    console.log(`[Test Poster Enhancement] Found ${animesToTest.length} anime to test`);
    
    const results: TestResult[] = [];
    let enhancedCount = 0;
    
    for (const anime of animesToTest) {
      try {
        console.log(`[Test Poster Enhancement] Testing: ${anime.title}`);
        
        const result = await ctx.runAction(internal.externalApis.triggerFetchExternalAnimeDetails, {
          animeIdInOurDB: anime._id,
          titleToSearch: anime.title
        });
        
        results.push({
          title: anime.title,
          success: result.success,
          message: result.message,
          source: result.source
        });
        
        if (result.success) enhancedCount++;
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error: any) {
        results.push({
          title: anime.title,
          success: false,
          error: error.message
        });
      }
    }
    
    return {
      success: true,
      tested: animesToTest.length,
      enhanced: enhancedCount,
      results,
      message: `Test completed: ${enhancedCount}/${animesToTest.length} enhanced`
    };
  },
});

// Quick fix action - force refresh all placeholder posters with proper types
export const quickFixPlaceholderPosters = action({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx: ActionCtx, args): Promise<QuickFixResult> => {
    const limit = args.limit || 10;
    
    console.log(`[Quick Fix] Finding anime with placeholder posters...`);
    
    const allAnime: Doc<"anime">[] = await ctx.runQuery(internal.anime.getAllAnimeInternal, {});
    const placeholderAnime = allAnime
      .filter((anime: Doc<"anime">) => anime.posterUrl && anime.posterUrl.includes('placehold'))
      .slice(0, limit);
    
    if (placeholderAnime.length === 0) {
      return {
        success: true,
        message: "No placeholder posters found!",
        processed: 0,
        enhanced: 0,
        tested: 0
      };
    }
    
    console.log(`[Quick Fix] Found ${placeholderAnime.length} anime with placeholder posters`);
    
    let enhancedCount = 0;
    
    for (const anime of placeholderAnime) {
      try {
        console.log(`[Quick Fix] Fixing poster for: ${anime.title}`);
        
        const result = await ctx.runAction(internal.externalApis.triggerFetchExternalAnimeDetails, {
          animeIdInOurDB: anime._id,
          titleToSearch: anime.title
        });
        
        if (result.success) {
          enhancedCount++;
          console.log(`[Quick Fix] ✅ Fixed: ${anime.title}`);
        } else {
          console.log(`[Quick Fix] ❌ Failed: ${anime.title} - ${result.message}`);
        }
        
        // Respectful delay
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error: any) {
        console.error(`[Quick Fix] Error fixing ${anime.title}:`, error.message);
      }
    }
    
    return {
      success: true,
      message: `Quick fix completed`,
      processed: placeholderAnime.length,
      enhanced: enhancedCount,
      tested: placeholderAnime.length
    };
  },
});

// Debug action to manually test poster enhancement with proper types
export const debugManualPosterEnhancement = action({
  args: {
    animeTitle: v.string(),
    animeId: v.optional(v.id("anime")),
  },
  handler: async (ctx: ActionCtx, args): Promise<{ success: boolean; message?: string; error?: string; details?: any; source?: string }> => {
    console.log(`[Debug Manual Enhancement] Testing poster enhancement for: ${args.animeTitle}`);
    
    let animeId = args.animeId;
    
    // If no ID provided, try to find by title
    if (!animeId) {
      const anime: Doc<"anime"> | null = await ctx.runQuery(internal.anime.getAnimeByTitleInternal, { title: args.animeTitle });
      if (!anime) {
        return { success: false, error: `Anime "${args.animeTitle}" not found` };
      }
      animeId = anime._id;
    }
    
    try {
      const result = await ctx.runAction(internal.externalApis.triggerFetchExternalAnimeDetails, {
        animeIdInOurDB: animeId,
        titleToSearch: args.animeTitle
      });
      
      return {
        success: result.success,
        message: result.message,
        details: result.details,
        source: result.source
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        details: error
      };
    }
  },
});

// NEW: Public action to manually trigger episode data update for specific anime
export const callBatchUpdateEpisodeData = action({
  args: {
    batchSize: v.optional(v.number()),
    maxAnimeToProcess: v.optional(v.number()),
  },
  handler: async (ctx: ActionCtx, args): Promise<EpisodeBatchUpdateResult> => {
    return await ctx.runAction(internal.externalApis.batchUpdateEpisodeDataForAllAnime, args);
  },
});