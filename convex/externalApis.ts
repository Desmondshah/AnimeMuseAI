// convex/externalApis.ts - Enhanced with Missing Logic and Improvements

"use node";
import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { ActionCtx } from "./_generated/server";

async function fetchWithTimeout(
  url: string, 
  options: RequestInit = {}, 
  timeoutMs: number = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}

// Enhanced interfaces with better error handling
interface PosterFetchResult {
  success: boolean;
  posterUrl?: string;
  source: string;
  message: string;
  quality?: "low" | "medium" | "high" | "ultra";
  retryCount?: number;
  errorCode?: string;
}

interface EpisodeFetchResult {
  success: boolean;
  episodes: any[];
  totalEpisodes?: number;
  source: string;
  message: string;
  retryCount?: number;
  errorCode?: string;
}

interface MetadataFetchResult {
  success: boolean;
  metadata: Partial<Doc<"anime">>;
  source: string;
  message: string;
  retryCount?: number;
  errorCode?: string;
}

interface CharacterFetchResult {
  success: boolean;
  characters: any[];
  source: string;
  message: string;
  retryCount?: number;
  errorCode?: string;
}

interface BatchOperationResult {
  processed: number;
  successful: number;
  failed: number;
  errors: string[];
  details: Array<{
    animeId: Id<"anime">;
    title: string;
    success: boolean;
    message: string;
  }>;
}

// Rate limiting utility
class RateLimiter {
  private lastRequest: number = 0;
  private readonly minInterval: number;

  constructor(requestsPerSecond: number = 2) {
    this.minInterval = 1000 / requestsPerSecond;
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    
    if (timeSinceLastRequest < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequest = Date.now();
  }
}

// Global rate limiters for different APIs
const tmdbLimiter = new RateLimiter(1); // 1 request per second for TMDB
const anilistLimiter = new RateLimiter(1.5); // 1.5 requests per second for AniList
const consumetLimiter = new RateLimiter(0.5); // 0.5 requests per second for Consumet

// Enhanced retry logic
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.log(`[Retry] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// ENHANCED: Specialized Action - Fetch High-Quality Poster from TMDB with better error handling
export const fetchPosterFromTMDB = internalAction({
  args: { 
    title: v.string(),
    year: v.optional(v.number()),
    retryCount: v.optional(v.number())
  },
  handler: async (ctx: ActionCtx, args): Promise<PosterFetchResult> => {
    const retryCount = args.retryCount || 0;
    
    if (!process.env.TMDB_API_KEY) {
      return {
        success: false,
        source: "tmdb",
        message: "TMDB API key not configured",
        errorCode: "NO_API_KEY",
        retryCount
      };
    }

    await tmdbLimiter.waitIfNeeded();

    try {
      console.log(`[TMDB Poster] Searching for: "${args.title}" (attempt ${retryCount + 1})`);
      
      const result = await withRetry(async () => {
        // Clean title for better search results
        const cleanTitle = args.title
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        // Search for the anime/movie on TMDB
        const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(cleanTitle)}`;
        
        const searchResponse = await fetchWithTimeout(searchUrl, {
  headers: { 'User-Agent': 'AniMuse-App/1.0' }
}, 10000);
        
        if (!searchResponse.ok) {
          if (searchResponse.status === 429) {
            throw new Error(`TMDB_RATE_LIMITED:${searchResponse.status}`);
          }
          throw new Error(`TMDB_SEARCH_FAILED:${searchResponse.status}`);
        }

        const searchData = await searchResponse.json();
        
        if (!searchData.results || searchData.results.length === 0) {
          return {
            success: false,
            source: "tmdb",
            message: `No results found for "${args.title}"`,
            errorCode: "NO_RESULTS",
            retryCount
          };
        }

        // Find the best match (prioritize exact year match if provided)
        let bestMatch = searchData.results[0];
        if (args.year) {
          const yearMatch = searchData.results.find((result: any) => {
            const resultYear = result.first_air_date ? 
              new Date(result.first_air_date).getFullYear() : 
              result.release_date ? new Date(result.release_date).getFullYear() : null;
            return resultYear !== null && Math.abs(resultYear - args.year!) <= 1;
          });
          if (yearMatch) bestMatch = yearMatch;
        }

        if (!bestMatch.poster_path) {
          return {
            success: false,
            source: "tmdb",
            message: "Match found but no poster available",
            errorCode: "NO_POSTER_PATH",
            retryCount
          };
        }

        // Get high-quality poster URL
        const posterUrl = `https://image.tmdb.org/t/p/w780${bestMatch.poster_path}`;
        
        // Verify the poster URL is accessible
        const posterResponse = await fetch(posterUrl, { 
          method: 'HEAD',
        });
        
        if (!posterResponse.ok) {
          return {
            success: false,
            source: "tmdb",
            message: "Poster URL not accessible",
            errorCode: "POSTER_NOT_ACCESSIBLE",
            retryCount
          };
        }

        return {
          success: true,
          posterUrl,
          source: "tmdb",
          message: `High-quality poster found`,
          quality: "high" as const,
          retryCount
        };
      }, 2, 1000);

      console.log(`[TMDB Poster] ✅ Found high-quality poster for: "${args.title}"`);
      return result;

    } catch (error: any) {
      console.error(`[TMDB Poster] Error for "${args.title}":`, error.message);
      
      const errorCode = error.message.includes(':') ? 
        error.message.split(':')[0] : 'UNKNOWN_ERROR';
      
      return {
        success: false,
        source: "tmdb",
        message: `TMDB fetch error: ${error.message}`,
        errorCode,
        retryCount
      };
    }
  }
});

// ENHANCED: Streaming Episodes with better error handling and multiple providers
export const fetchStreamingEpisodesFromConsumet = internalAction({
  args: { 
    title: v.string(),
    totalEpisodes: v.optional(v.number()),
    provider: v.optional(v.string()),
    retryCount: v.optional(v.number())
  },
  handler: async (ctx: ActionCtx, args): Promise<EpisodeFetchResult> => {
    const retryCount = args.retryCount || 0;
    const provider = args.provider || "gogoanime";
    
    await consumetLimiter.waitIfNeeded();

    try {
      console.log(`[Consumet Episodes] Searching for: "${args.title}" on ${provider} (attempt ${retryCount + 1})`);
      
      const result = await withRetry(async () => {
        // Clean title for API search
        const cleanTitle = args.title
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        // Try multiple providers if the primary fails
        const providers = [provider, "gogoanime", "zoro", "animepahe"].filter((p, i, arr) => arr.indexOf(p) === i);
        
        for (const currentProvider of providers) {
          try {
            // Search using Consumet API
            const searchUrl = `https://api.consumet.org/anime/${currentProvider}/${encodeURIComponent(cleanTitle)}`;
            
            const searchResponse = await fetchWithTimeout(searchUrl, {
  headers: { 'User-Agent': 'AniMuse-App/1.0' }
}, 15000);

            if (!searchResponse.ok) {
              if (searchResponse.status === 404) {
                continue; // Try next provider
              }
              throw new Error(`CONSUMET_SEARCH_FAILED:${searchResponse.status}`);
            }

            const searchData = await searchResponse.json();
            
            if (!searchData.results || searchData.results.length === 0) {
              continue; // Try next provider
            }

            // Get the first/best match
            const animeResult = searchData.results[0];
            
            if (!animeResult.id) {
              continue; // Try next provider
            }

            // Fetch episode info for this anime
            const episodeUrl = `https://api.consumet.org/anime/${currentProvider}/info/${animeResult.id}`;
            const episodeResponse = await fetchWithTimeout(episodeUrl, {
              headers: { 'User-Agent': 'AniMuse-App/1.0' }
}, 15000);

            if (!episodeResponse.ok) {
              continue; // Try next provider
            }

            const episodeData = await episodeResponse.json();
            
            if (!episodeData.episodes || !Array.isArray(episodeData.episodes)) {
              continue; // Try next provider
            }

            // Map episodes to our format
            const episodes = episodeData.episodes.map((ep: any) => ({
              title: ep.title || `Episode ${ep.number || ep.id}`,
              thumbnail: ep.image || undefined,
              url: ep.url || undefined,
              site: currentProvider,
            })).slice(0, 100); // Limit to 100 episodes

            console.log(`[Consumet Episodes] ✅ Found ${episodes.length} episodes for: "${args.title}" on ${currentProvider}`);

            return {
              success: true,
              episodes,
              totalEpisodes: episodeData.totalEpisodes || episodes.length,
              source: `consumet-${currentProvider}`,
              message: `Found ${episodes.length} streaming episodes`,
              retryCount
            };
          } catch (providerError: any) {
            console.warn(`[Consumet Episodes] Provider ${currentProvider} failed:`, providerError.message);
            continue;
          }
        }

        // If all providers failed
        return {
          success: false,
          episodes: [],
          source: "consumet",
          message: `No episodes found for "${args.title}" on any provider`,
          errorCode: "NO_EPISODES_ALL_PROVIDERS",
          retryCount
        };
      }, 1, 2000); // Reduced retries since we try multiple providers

      return result;

    } catch (error: any) {
      console.error(`[Consumet Episodes] Error for "${args.title}":`, error.message);
      
      const errorCode = error.message.includes(':') ? 
        error.message.split(':')[0] : 'UNKNOWN_ERROR';
      
      return {
        success: false,
        episodes: [],
        source: "consumet",
        message: `Consumet fetch error: ${error.message}`,
        errorCode,
        retryCount
      };
    }
  }
});

// Helper function with the logic, NOT exported
async function fetchCoreMetadataFromAniListHandler(
  args: { 
    title: string;
    anilistId?: number;
    retryCount?: number;
  }
): Promise<MetadataFetchResult> {
    const retryCount = args.retryCount || 0;
    
    await anilistLimiter.waitIfNeeded();

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
          genres
          synonyms
          averageScore
          meanScore
          popularity
          tags { id name description category rank }
          studios { edges { isMain node { id name isAnimationStudio } } }
          trailer { id site thumbnail }
          nextAiringEpisode { airingAt timeUntilAiring episode }
          coverImage { extraLarge large medium }
        }
      }
    `;

    const variables = args.anilistId ? { id: args.anilistId } : { search: args.title };

    try {
      console.log(`[AniList Metadata] Querying for: "${args.title}" (attempt ${retryCount + 1})`);
      
      const result = await withRetry(async () => {
        const response = await fetchWithTimeout('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Accept': 'application/json',
            'User-Agent': 'AniMuse-App/1.0'
          },
          body: JSON.stringify({ query: anilistQuery, variables })
        }, 15000);

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error(`ANILIST_RATE_LIMITED:${response.status}`);
          }
          throw new Error(`ANILIST_QUERY_FAILED:${response.status}`);
        }

        const data = await response.json();
        
        if (data.errors) {
          throw new Error(`ANILIST_GRAPHQL_ERROR:${JSON.stringify(data.errors)}`);
        }

        if (!data?.data?.Media) {
          return {
            success: false,
            metadata: {},
            source: "anilist",
            message: `No metadata found for "${args.title}"`,
            errorCode: "NO_MEDIA_FOUND",
            retryCount
          };
        }

        const media = data.data.Media;

        // Map the core metadata with better data validation
        const metadata: Partial<Doc<"anime">> = {};
        
        if (media.id) metadata.anilistId = media.id;
        if (media.description && media.description.trim()) {
          metadata.description = media.description.trim();
        }
        if (media.startDate?.year || media.seasonYear) {
          metadata.year = media.startDate?.year || media.seasonYear;
        }
        if (media.genres?.length) {
          metadata.genres = media.genres.filter(Boolean);
        }
        if (media.averageScore && media.averageScore > 0) {
          metadata.rating = parseFloat((media.averageScore / 10).toFixed(1));
        }
        if (media.episodes && media.episodes > 0) {
          metadata.totalEpisodes = media.episodes;
        }
        if (media.duration && media.duration > 0) {
          metadata.episodeDuration = media.duration;
        }
        if (media.status) {
          metadata.airingStatus = media.status;
        }
        
        if (media.trailer?.site === "youtube" && media.trailer?.id) {
          metadata.trailerUrl = `https://www.youtube.com/watch?v=$${media.trailer.id}`;
        }
        
        if (media.nextAiringEpisode) {
          metadata.nextAiringEpisode = {
            airingAt: media.nextAiringEpisode.airingAt,
            episode: media.nextAiringEpisode.episode,
            timeUntilAiring: media.nextAiringEpisode.timeUntilAiring,
          };
        }

        if (media.studios?.edges?.length) {
          const mainStudios = media.studios.edges
            .filter((e: any) => e.isMain && e.node?.name)
            .map((e: any) => e.node.name)
            .filter(Boolean);
          if (mainStudios.length > 0) {
            metadata.studios = mainStudios;
          }
        }

        if (media.tags?.length) {
          const themes = media.tags
            .filter((t: any) => 
              t.category?.toLowerCase().includes('theme') || 
              t.rank > 60 ||
              t.category?.toLowerCase().includes('setting')
            )
            .map((t: any) => t.name)
            .filter(Boolean)
            .slice(0, 10); // Limit themes
          
          const emotionalTags = media.tags
            .filter((t: any) => 
              !t.category?.toLowerCase().includes('theme') && 
              !t.category?.toLowerCase().includes('setting') &&
              t.rank > 50 &&
              (t.category?.toLowerCase().includes('cast') ||
               t.category?.toLowerCase().includes('demographic') ||
               t.name?.toLowerCase().includes('comedy') ||
               t.name?.toLowerCase().includes('drama') ||
               t.name?.toLowerCase().includes('action'))
            )
            .map((t: any) => t.name)
            .filter(Boolean)
            .slice(0, 8); // Limit emotional tags

          if (themes.length > 0) metadata.themes = themes;
          if (emotionalTags.length > 0) metadata.emotionalTags = emotionalTags;
        }

        return {
          success: true,
          metadata,
          source: "anilist",
          message: `Core metadata fetched from AniList`,
          retryCount
        };
      }, 2, 1500);

      console.log(`[AniList Metadata] ✅ Found metadata for: "${args.title}"`);
      return result;

    } catch (error: any) {
      console.error(`[AniList Metadata] Error for "${args.title}":`, error.message);
      
      const errorCode = error.message.includes(':') ? 
        error.message.split(':')[0] : 'UNKNOWN_ERROR';
      
      return {
        success: false,
        metadata: {},
        source: "anilist",
        message: `AniList metadata error: ${error.message}`,
        errorCode,
        retryCount
      };
    }
}

// The exported internalAction now simply calls the helper function.
export const fetchCoreMetadataFromAniList = internalAction({
  args: { 
    title: v.string(),
    anilistId: v.optional(v.number()),
    retryCount: v.optional(v.number())
  },
  handler: async (_ctx: ActionCtx, args): Promise<MetadataFetchResult> => {
    return await fetchCoreMetadataFromAniListHandler(args);
  }
});

// NEW: Missing Specialized Batch Operations mentioned in the objective

// Batch refresh for missing posters
export const batchRefreshMissingPosters = internalAction({
  args: {
    maxToProcess: v.optional(v.number()),
    prioritizeNew: v.optional(v.boolean())
  },
  handler: async (ctx: ActionCtx, args): Promise<BatchOperationResult> => {
    const maxToProcess = args.maxToProcess || 25;
    const prioritizeNew = args.prioritizeNew || false;
    
    console.log(`[Batch Poster Refresh] Starting batch poster refresh (max: ${maxToProcess})`);
    
    const allAnime = await ctx.runQuery(internal.anime.getAllAnimeInternal, {});
    
    // Filter anime that need better posters
    const animeMissingPosters = allAnime
      .filter(anime => {
        const needsBetterPoster = !anime.posterUrl || 
                                anime.posterUrl.includes('placehold.co') ||
                                anime.posterUrl.includes('placeholder');
        
        if (prioritizeNew && anime.lastFetchedFromExternal) {
          const daysSinceLastFetch = (Date.now() - anime.lastFetchedFromExternal.timestamp) / (24 * 60 * 60 * 1000);
          return needsBetterPoster && daysSinceLastFetch > 7;
        }
        
        return needsBetterPoster;
      })
      .sort((a, b) => (b.rating || 0) - (a.rating || 0)) // Prioritize higher rated anime
      .slice(0, maxToProcess);

    const results: BatchOperationResult = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [],
      details: []
    };

    // Process in batches of 3 to avoid overwhelming APIs
    const batchSize = 3;
    
    for (let i = 0; i < animeMissingPosters.length; i += batchSize) {
      const batch = animeMissingPosters.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (anime) => {
        results.processed++;
        
        try {
          const posterResult = await ctx.runAction(internal.externalApis.fetchBestQualityPoster, {
            title: anime.title,
            year: anime.year
          });

          if (posterResult.success && posterResult.posterUrl) {
            await ctx.runMutation(internal.anime.updateAnimeWithExternalData, {
              animeId: anime._id,
              updates: { posterUrl: posterResult.posterUrl },
              sourceApi: posterResult.source
            });
            
            results.successful++;
            results.details.push({
              animeId: anime._id,
              title: anime.title,
              success: true,
              message: `Poster updated from ${posterResult.source}`
            });
            
            console.log(`[Batch Poster Refresh] ✅ Enhanced poster for: ${anime.title}`);
          } else {
            results.failed++;
            results.details.push({
              animeId: anime._id,
              title: anime.title,
              success: false,
              message: posterResult.message
            });
          }
        } catch (error: any) {
          results.failed++;
          results.errors.push(`${anime.title}: ${error.message}`);
          results.details.push({
            animeId: anime._id,
            title: anime.title,
            success: false,
            message: error.message
          });
          
          console.error(`[Batch Poster Refresh] ❌ Error for ${anime.title}:`, error.message);
        }
      });

      await Promise.all(batchPromises);

      // Rate limiting between batches
      if (i + batchSize < animeMissingPosters.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`[Batch Poster Refresh] Complete! Processed: ${results.processed}, Success: ${results.successful}, Failed: ${results.failed}`);
    return results;
  }
});

// Batch refresh for missing episodes
export const batchRefreshMissingEpisodes = internalAction({
  args: {
    maxToProcess: v.optional(v.number()),
    prioritizeCompleted: v.optional(v.boolean())
  },
  handler: async (ctx: ActionCtx, args): Promise<BatchOperationResult> => {
    const maxToProcess = args.maxToProcess || 20;
    const prioritizeCompleted = args.prioritizeCompleted || true;
    
    console.log(`[Batch Episode Refresh] Starting batch episode refresh (max: ${maxToProcess})`);
    
    const allAnime = await ctx.runQuery(internal.anime.getAllAnimeInternal, {});
    
    // Filter anime that need episode data
    const animeMissingEpisodes = allAnime
      .filter(anime => {
        const hasNoEpisodes = !anime.streamingEpisodes || anime.streamingEpisodes.length === 0;
        const isFinished = anime.airingStatus === "FINISHED" || !anime.airingStatus;
        const isReleasing = anime.airingStatus === "RELEASING";
        
        if (prioritizeCompleted) {
          return hasNoEpisodes && isFinished;
        }
        
        return hasNoEpisodes && (isFinished || isReleasing);
      })
      .sort((a, b) => {
        // Prioritize by rating, then by year
        const ratingDiff = (b.rating || 0) - (a.rating || 0);
        if (ratingDiff !== 0) return ratingDiff;
        return (b.year || 0) - (a.year || 0);
      })
      .slice(0, maxToProcess);

    const results: BatchOperationResult = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [],
      details: []
    };

    // Process in batches of 2 to avoid overwhelming Consumet API
    const batchSize = 2;
    
    for (let i = 0; i < animeMissingEpisodes.length; i += batchSize) {
      const batch = animeMissingEpisodes.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (anime) => {
        results.processed++;
        
        try {
          const episodeResult = await ctx.runAction(internal.externalApis.fetchStreamingEpisodesFromConsumet, {
            title: anime.title,
            totalEpisodes: anime.totalEpisodes
          });

          if (episodeResult.success && episodeResult.episodes.length > 0) {
            await ctx.runMutation(internal.anime.updateAnimeWithExternalData, {
              animeId: anime._id,
              updates: { 
                streamingEpisodes: episodeResult.episodes,
                totalEpisodes: episodeResult.totalEpisodes
              },
              sourceApi: episodeResult.source
            });
            
            results.successful++;
            results.details.push({
              animeId: anime._id,
              title: anime.title,
              success: true,
              message: `${episodeResult.episodes.length} episodes added from ${episodeResult.source}`
            });
            
            console.log(`[Batch Episode Refresh] ✅ Updated episodes for: ${anime.title} (${episodeResult.episodes.length} episodes)`);
          } else {
            results.failed++;
            results.details.push({
              animeId: anime._id,
              title: anime.title,
              success: false,
              message: episodeResult.message
            });
          }
        } catch (error: any) {
          results.failed++;
          results.errors.push(`${anime.title}: ${error.message}`);
          results.details.push({
            animeId: anime._id,
            title: anime.title,
            success: false,
            message: error.message
          });
          
          console.error(`[Batch Episode Refresh] ❌ Error for ${anime.title}:`, error.message);
        }
      });

      await Promise.all(batchPromises);

      // Rate limiting between batches
      if (i + batchSize < animeMissingEpisodes.length) {
        await new Promise(resolve => setTimeout(resolve, 4000));
      }
    }

    console.log(`[Batch Episode Refresh] Complete! Processed: ${results.processed}, Success: ${results.successful}, Failed: ${results.failed}`);
    return results;
  }
});

// Batch refresh for airing anime data
export const batchRefreshAiringAnimeData = internalAction({
  args: {
    maxToProcess: v.optional(v.number()),
    dataTypes: v.optional(v.array(v.string()))
  },
  handler: async (ctx: ActionCtx, args): Promise<BatchOperationResult> => {
    const maxToProcess = args.maxToProcess || 15;
    const dataTypes = args.dataTypes || ["metadata", "episodes"];
    
    console.log(`[Batch Airing Refresh] Starting airing anime refresh (max: ${maxToProcess}, types: ${dataTypes.join(", ")})`);
    
    const allAnime = await ctx.runQuery(internal.anime.getAllAnimeInternal, {});
    
    // Filter currently airing anime
    const airingAnime = allAnime
      .filter(anime => anime.airingStatus === "RELEASING")
      .sort((a, b) => {
        // Prioritize anime with next airing episode info, then by popularity
        if (a.nextAiringEpisode && !b.nextAiringEpisode) return -1;
        if (b.nextAiringEpisode && !a.nextAiringEpisode) return 1;
        return (b.rating || 0) - (a.rating || 0);
      })
      .slice(0, maxToProcess);

    const results: BatchOperationResult = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [],
      details: []
    };

    // Process individually with longer delays for airing data
    for (const anime of airingAnime) {
      results.processed++;
      
      try {
        let updates: any = {};
        let updated = false;
        const sources: string[] = [];

        // Fetch metadata if requested
        if (dataTypes.includes("metadata")) {
          const metadataResult = await fetchCoreMetadataFromAniListHandler({
            title: anime.title,
            anilistId: anime.anilistId
          });
          
          if (metadataResult.success && Object.keys(metadataResult.metadata).length > 0) {
            updates = { ...updates, ...metadataResult.metadata };
            sources.push("anilist-metadata");
            updated = true;
          }
        }

        // Fetch episodes if requested
        if (dataTypes.includes("episodes")) {
          const episodeResult = await ctx.runAction(internal.externalApis.fetchStreamingEpisodesFromConsumet, {
            title: anime.title,
            totalEpisodes: anime.totalEpisodes
          });
          
          if (episodeResult.success && episodeResult.episodes.length > 0) {
            updates.streamingEpisodes = episodeResult.episodes;
            updates.totalEpisodes = episodeResult.totalEpisodes;
            sources.push("consumet-episodes");
            updated = true;
          }
        }

        if (updated && Object.keys(updates).length > 0) {
          await ctx.runMutation(internal.anime.updateAnimeWithExternalData, {
            animeId: anime._id,
            updates,
            sourceApi: sources.join("+")
          });
          
          results.successful++;
          results.details.push({
            animeId: anime._id,
            title: anime.title,
            success: true,
            message: `Updated from ${sources.join(", ")}`
          });
          
          console.log(`[Batch Airing Refresh] ✅ Updated: ${anime.title}`);
        } else {
          results.details.push({
            animeId: anime._id,
            title: anime.title,
            success: true,
            message: "No new data available"
          });
        }
        
        // Rate limiting between airing anime
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${anime.title}: ${error.message}`);
        results.details.push({
          animeId: anime._id,
          title: anime.title,
          success: false,
          message: error.message
        });
        
        console.error(`[Batch Airing Refresh] ❌ Error for ${anime.title}:`, error.message);
      }
    }

    console.log(`[Batch Airing Refresh] Complete! Processed: ${results.processed}, Success: ${results.successful}, Failed: ${results.failed}`);
    return results;
  }
});

// Keep existing functions but enhance them...
export const fetchCharacterListFromAniList = internalAction({
  args: { 
    title: v.string(),
    anilistId: v.optional(v.number()),
    retryCount: v.optional(v.number())
  },
  handler: async (ctx: ActionCtx, args): Promise<CharacterFetchResult> => {
    const retryCount = args.retryCount || 0;
    
    await anilistLimiter.waitIfNeeded();

    const anilistQuery = `
      query ($search: String, $id: Int) {
        Media (search: $search, id: $id, type: ANIME, sort: SEARCH_MATCH) {
          id
          title { romaji english native }
          characters(sort: [ROLE, RELEVANCE, ID], page: 1, perPage: 25) {
            edges {
              role
              voiceActors(language: JAPANESE, sort: [RELEVANCE, ID]) {
                id
                name {
                  first
                  middle
                  last
                  full
                  native
                  userPreferred
                }
                image { large }
                languageV2
              }
              node {
                id
                name {
                  first
                  middle
                  last
                  full
                  native
                  userPreferred
                  alternative
                  alternativeSpoiler
                }
                image { large }
                description(asHtml: false)
                age
                gender
                bloodType
                dateOfBirth {
                  year
                  month
                  day
                }
                favourites
                siteUrl
              }
            }
          }
        }
      }
    `;

    const variables = args.anilistId ? { id: args.anilistId } : { search: args.title };

    try {
      console.log(`[AniList Characters] Querying for: "${args.title}" (attempt ${retryCount + 1})`);
      
      const result = await withRetry(async () => {
        const response = await fetchWithTimeout('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Accept': 'application/json',
            'User-Agent': 'AniMuse-App/1.0'
          },
          body: JSON.stringify({ query: anilistQuery, variables })
}, 15000);

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error(`ANILIST_RATE_LIMITED:${response.status}`);
          }
          throw new Error(`ANILIST_QUERY_FAILED:${response.status}`);
        }

        const data = await response.json();
        
        if (data.errors) {
          throw new Error(`ANILIST_GRAPHQL_ERROR:${JSON.stringify(data.errors)}`);
        }

        if (!data?.data?.Media?.characters?.edges) {
          return {
            success: false,
            characters: [],
            source: "anilist",
            message: `No characters found for "${args.title}"`,
            errorCode: "NO_CHARACTERS_FOUND",
            retryCount
          };
        }

        const charactersEdges = data.data.Media.characters.edges;

        // Use the enhanced character mapping function
        const characters = mapCharacterData(charactersEdges);

        return {
          success: true,
          characters,
          source: "anilist",
          message: `Found ${characters.length} characters`,
          retryCount
        };
      }, 2, 1500);

      console.log(`[AniList Characters] ✅ Found ${result.characters?.length || 0} characters for: "${args.title}"`);
      return result;

    } catch (error: any) {
      console.error(`[AniList Characters] Error for "${args.title}":`, error.message);
      
      const errorCode = error.message.includes(':') ? 
        error.message.split(':')[0] : 'UNKNOWN_ERROR';
      
      return {
        success: false,
        characters: [],
        source: "anilist",
        message: `AniList character error: ${error.message}`,
        errorCode,
        retryCount
      };
    }
  }
});

// Enhanced Best-of-Breed Poster Fetching
export const fetchBestQualityPoster = internalAction({
  args: { 
    title: v.string(),
    year: v.optional(v.number()),
    sources: v.optional(v.array(v.string()))
  },
  handler: async (ctx: ActionCtx, args): Promise<PosterFetchResult> => {
    console.log(`[Best Poster] Starting multi-source poster search for: "${args.title}"`);
    
    const requestedSources = args.sources || ["tmdb", "anilist"];
    const sources: Promise<PosterFetchResult>[] = [];

    // Try TMDB first if requested (highest quality)
    if (requestedSources.includes("tmdb")) {
      sources.push(
        ctx.runAction(internal.externalApis.fetchPosterFromTMDB, {
          title: args.title,
          year: args.year
        })
      );
    }

    // Try AniList as backup if requested
    if (requestedSources.includes("anilist")) {
      sources.push(
        (async () => {
          try {
            const metadataResult = await ctx.runAction(internal.externalApis.fetchCoreMetadataFromAniList, {
              title: args.title
            });
            
            if (metadataResult.success && metadataResult.metadata.anilistId) {
              // Get poster from AniList using enhanced function
              const anilistData = await fetchFromAnilistEnhanced(args.title, metadataResult.metadata.anilistId);
              if (anilistData?.coverImage) {
                const posterUrl = selectBestImageUrl(anilistData.coverImage);
                if (posterUrl) {
                  return {
                    success: true,
                    posterUrl,
                    source: "anilist",
                    message: "High-quality poster from AniList",
                    quality: "medium" as const
                  };
                }
              }
            }
            
            return {
              success: false,
              source: "anilist",
              message: "No poster found on AniList"
            };
          } catch (error: any) {
            return {
              success: false,
              source: "anilist",
              message: `AniList poster fetch failed: ${error.message}`
            };
          }
        })()
      );
    }

    try {
      // Use Promise.allSettled for resilience
      const results = await Promise.allSettled(sources);
      
      // Find the best successful result by quality
      const qualityOrder = ["ultra", "high", "medium", "low"];
      let bestResult: PosterFetchResult | null = null;
      
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.success) {
          if (!bestResult) {
            bestResult = result.value;
          } else {
            const currentQuality = qualityOrder.indexOf(result.value.quality || "low");
            const bestQuality = qualityOrder.indexOf(bestResult.quality || "low");
            if (currentQuality < bestQuality) {
              bestResult = result.value;
            }
          }
        }
      }

      if (bestResult) {
        console.log(`[Best Poster] ✅ Found ${bestResult.quality} quality poster from ${bestResult.source} for: "${args.title}"`);
        return bestResult;
      }

      // If no sources succeeded, return the first error
      const firstError = results.find(r => r.status === 'fulfilled')?.value || {
        success: false,
        source: "multiple",
        message: "All poster sources failed"
      };

      return firstError as PosterFetchResult;

    } catch (error: any) {
      console.error(`[Best Poster] Error for "${args.title}":`, error.message);
      return {
        success: false,
        source: "multiple",
        message: `Multi-source poster fetch error: ${error.message}`
      };
    }
  }
});

// Enhanced helper functions
const fetchFromAnilistEnhanced = async (title: string, existingAnilistId?: number): Promise<any | null> => {
  const anilistQuery = `
    query ($search: String, $id: Int) {
      Media (search: $search, id: $id, type: ANIME, sort: SEARCH_MATCH) {
        id
        title { romaji english native }
        coverImage { 
          extraLarge 
          large 
          medium 
          color
        }
      }
    }
  `;
  
  const variables = existingAnilistId ? { id: existingAnilistId } : { search: title };
  
  try {
    const response = await fetchWithTimeout('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Accept': 'application/json',
        'User-Agent': 'AniMuse-App/1.0'
      },
       body: JSON.stringify({ query: anilistQuery, variables })
}, 10000);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data?.data?.Media;
  } catch (error) {
    console.error('[AniList Helper] Error:', error);
    return null;
  }
};

const selectBestImageUrl = (images: any): string | undefined => {
  if (!images) return undefined;
  
  // AniList image priority: extraLarge > large > medium
  if (images.extraLarge && images.extraLarge.startsWith('https://')) return images.extraLarge;
  if (images.large && images.large.startsWith('https://')) return images.large;
  if (images.medium && images.medium.startsWith('https://')) return images.medium;
  
  return undefined;
};

// Enhanced character data mapping with better validation
const mapCharacterData = (charactersEdges: any[]): any[] => {
  if (!Array.isArray(charactersEdges)) return [];
  
  return charactersEdges
    .filter(edge => edge && edge.node && edge.node.name && (edge.node.name.full || edge.node.name.userPreferred))
    .map(edge => {
      const character = edge.node;
      const voiceActors = edge.voiceActors || [];
      
      // Extract additional info from description with better parsing
      const description = character.description || "";
      const powersAbilities = extractPowersFromDescription(description);
      const weapons = extractWeaponsFromDescription(description);
      const species = extractSpeciesFromDescription(description);
      
      return {
        id: character.id || undefined,
        name: character.name.full || character.name.userPreferred || "Unknown",
        imageUrl: character.image?.large || undefined,
        role: edge.role || "BACKGROUND",
        
        // Enhanced details with validation
        description: description.trim() || undefined,
        status: extractStatusFromDescription(description),
        gender: character.gender || undefined,
        age: character.age || undefined,
        
        dateOfBirth: character.dateOfBirth && (character.dateOfBirth.year || character.dateOfBirth.month || character.dateOfBirth.day) ? {
          year: character.dateOfBirth.year || undefined,
          month: character.dateOfBirth.month || undefined,
          day: character.dateOfBirth.day || undefined,
        } : undefined,
        
        bloodType: character.bloodType || undefined,
        height: extractHeightFromDescription(description),
        weight: extractWeightFromDescription(description),
        species: species || "Human",
        
        powersAbilities: powersAbilities.length > 0 ? powersAbilities : undefined,
        weapons: weapons.length > 0 ? weapons : undefined,
        
        nativeName: character.name.native || undefined,
        siteUrl: character.siteUrl || undefined,
        
        voiceActors: voiceActors
          .filter((va: any) => va && va.name && (va.name.full || va.name.userPreferred))
          .map((va: any) => ({
            id: va.id || undefined,
            name: va.name?.full || va.name?.userPreferred || "Unknown",
            language: va.languageV2 || "Unknown",
            imageUrl: va.image?.large || undefined,
          }))
          .filter((va: any) => va.name !== "Unknown")
          .slice(0, 3), // Limit voice actors
        
        relationships: undefined, // Would need separate API calls
      };
    })
    .slice(0, 25); // Limit to prevent overwhelming storage
};

// Enhanced extraction functions with better regex patterns
const extractPowersFromDescription = (description: string): string[] => {
  const powerPatterns = [
    /(?:power|ability|magic|skill|technique|jutsu|quirk|talent)(?:\s+(?:of|to)\s+)?([^.!?]+)/gi,
    /(?:can|able to|capable of)\s+([^.!?]+)/gi,
    /(?:special|unique|rare)\s+([^.!?]+)/gi
  ];
  
  const powers: Set<string> = new Set();
  
  powerPatterns.forEach(pattern => {
    const matches = description.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const cleaned = match.trim().substring(0, 100); // Limit length
        if (cleaned.length > 10) { // Minimum meaningful length
          powers.add(cleaned);
        }
      });
    }
  });
  
  return Array.from(powers).slice(0, 5);
};

const extractWeaponsFromDescription = (description: string): string[] => {
  const weaponKeywords = [
    'sword', 'blade', 'katana', 'gun', 'weapon', 'staff', 'bow', 'arrow', 
    'spear', 'dagger', 'rifle', 'pistol', 'hammer', 'axe', 'scythe'
  ];
  
  const weapons: Set<string> = new Set();
  
  weaponKeywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    if (regex.test(description)) {
      weapons.add(keyword.charAt(0).toUpperCase() + keyword.slice(1));
    }
  });
  
  return Array.from(weapons).slice(0, 3);
};

const extractSpeciesFromDescription = (description: string): string | undefined => {
  const speciesKeywords = [
    'demon', 'angel', 'elf', 'dwarf', 'vampire', 'werewolf', 'dragon', 
    'robot', 'android', 'alien', 'spirit', 'ghost', 'deity', 'god', 'goddess'
  ];
  
  for (const species of speciesKeywords) {
    const regex = new RegExp(`\\b${species}\\b`, 'gi');
    if (regex.test(description)) {
      return species.charAt(0).toUpperCase() + species.slice(1);
    }
  }
  
  return undefined;
};

const extractStatusFromDescription = (description: string): string | undefined => {
  if (/\b(?:dead|died|deceased|killed)\b/gi.test(description)) {
    return "Deceased";
  }
  if (/\b(?:alive|living|survived)\b/gi.test(description)) {
    return "Alive";
  }
  return undefined;
};

const extractHeightFromDescription = (description: string): string | undefined => {
  const heightRegex = /(\d+(?:\.\d+)?)\s*(?:cm|centimeters?|meters?|m|feet?|ft|'|inches?|in|")/gi;
  const match = description.match(heightRegex);
  return match ? match[0] : undefined;
};

const extractWeightFromDescription = (description: string): string | undefined => {
  const weightRegex = /(\d+(?:\.\d+)?)\s*(?:kg|kilograms?|lbs?|pounds?)/gi;
  const match = description.match(weightRegex);
  return match ? match[0] : undefined;
};

export const triggerFetchExternalAnimeDetails = internalAction({
  args: {
    animeIdInOurDB: v.id("anime"),
    titleToSearch: v.string()
  },
  handler: async (ctx, args): Promise<{ success: boolean; message: string }> => {
    try {
      console.log(`[External API] Triggering comprehensive data fetch for: ${args.titleToSearch}`);
      
      // Get the anime first to check what we already have
      const anime = await ctx.runQuery(internal.anime.getAnimeByIdInternal, { 
        animeId: args.animeIdInOurDB 
      });
      
      if (!anime) {
        return { success: false, message: "Anime not found in database" };
      }

      // Fetch metadata from AniList
      const metadataResult = await fetchCoreMetadataFromAniListHandler({
        title: args.titleToSearch,
        anilistId: anime.anilistId
      });

      // Fetch poster if needed
      const posterResult = await ctx.runAction(internal.externalApis.fetchBestQualityPoster, {
        title: args.titleToSearch,
        year: anime.year
      });

      // Fetch streaming episodes
      const episodeResult = await ctx.runAction(internal.externalApis.fetchStreamingEpisodesFromConsumet, {
        title: args.titleToSearch,
        totalEpisodes: anime.totalEpisodes
      });

      // Fetch character data
      const charactersResult = await ctx.runAction(internal.externalApis.fetchCharacterListFromAniList, {
        title: args.titleToSearch,
        anilistId: anime.anilistId
      });

      // Prepare updates
      let updates: any = {};
      let dataChanged = false;

      if (metadataResult.success) {
        updates = { ...updates, ...metadataResult.metadata };
        dataChanged = true;
      }

      if (posterResult.success && posterResult.posterUrl) {
        updates.posterUrl = posterResult.posterUrl;
        dataChanged = true;
      }

      if (episodeResult.success && episodeResult.episodes.length > 0) {
        updates.streamingEpisodes = episodeResult.episodes;
        updates.totalEpisodes = episodeResult.totalEpisodes;
        dataChanged = true;
      }

      if (charactersResult.success && charactersResult.characters.length > 0) {
        updates.characters = charactersResult.characters;
        dataChanged = true;
      }

      // Apply updates if we have any
      if (dataChanged && Object.keys(updates).length > 0) {
        await ctx.runMutation(internal.anime.updateAnimeWithExternalData, {
          animeId: args.animeIdInOurDB,
          updates,
          sourceApi: "comprehensive"
        });
      }

      const message = dataChanged 
        ? `Successfully updated ${Object.keys(updates).length} fields`
        : "No new data found";

      return { success: true, message };

    } catch (error: any) {
      console.error(`[External API] Error in triggerFetchExternalAnimeDetails:`, error);
      return { success: false, message: error.message || "Unknown error" };
    }
  }
});

// Missing function: enhanceExistingAnimePostersBetter
export const enhanceExistingAnimePostersBetter = internalAction({
  args: {
    maxToProcess: v.optional(v.number()),
    prioritizeNew: v.optional(v.boolean())
  },
  handler: async (ctx, args): Promise<{ processed: number; enhanced: number; errors: number }> => {
    const maxToProcess = args.maxToProcess || 20;
    const prioritizeNew = args.prioritizeNew || false;
    
    console.log(`[Poster Enhancement] Starting batch poster enhancement (max: ${maxToProcess})`);
    
    try {
      // Get all anime from database
      const allAnime = await ctx.runQuery(internal.anime.getAllAnimeInternal, {});
      
      // Filter anime that need better posters
      const animeMissingPosters = allAnime
        .filter(anime => {
          const needsBetterPoster = !anime.posterUrl || 
                                  anime.posterUrl.includes('placehold.co') ||
                                  anime.posterUrl.includes('placeholder');
          
          if (prioritizeNew && anime.lastFetchedFromExternal) {
            const daysSinceLastFetch = (Date.now() - anime.lastFetchedFromExternal.timestamp) / (24 * 60 * 60 * 1000);
            return needsBetterPoster && daysSinceLastFetch > 7;
          }
          
          return needsBetterPoster;
        })
        .slice(0, maxToProcess);

      let processed = 0;
      let enhanced = 0;
      let errors = 0;

      // Process in batches of 3 to avoid overwhelming APIs
      const batchSize = 3;
      
      for (let i = 0; i < animeMissingPosters.length; i += batchSize) {
        const batch = animeMissingPosters.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (anime) => {
          try {
            processed++;
            
            const posterResult = await ctx.runAction(internal.externalApis.fetchBestQualityPoster, {
              title: anime.title,
              year: anime.year
            });

            if (posterResult.success && posterResult.posterUrl) {
              await ctx.runMutation(internal.anime.updateAnimeWithExternalData, {
                animeId: anime._id,
                updates: { posterUrl: posterResult.posterUrl },
                sourceApi: posterResult.source
              });
              enhanced++;
              console.log(`[Poster Enhancement] ✅ Enhanced poster for: ${anime.title}`);
            }
          } catch (error: any) {
            errors++;
            console.error(`[Poster Enhancement] ❌ Error for ${anime.title}:`, error.message);
          }
        });

        await Promise.all(batchPromises);

        // Rate limiting between batches
        if (i + batchSize < animeMissingPosters.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      console.log(`[Poster Enhancement] Complete! Processed: ${processed}, Enhanced: ${enhanced}, Errors: ${errors}`);
      return { processed, enhanced, errors };

    } catch (error: any) {
      console.error(`[Poster Enhancement] Batch error:`, error);
      return { processed: 0, enhanced: 0, errors: 1 };
    }
  }
});

// Missing function: batchUpdateEpisodeDataForAllAnime
export const batchUpdateEpisodeDataForAllAnime = internalAction({
  args: {
    batchSize: v.optional(v.number()),
    maxAnimeToProcess: v.optional(v.number())
  },
  handler: async (ctx, args): Promise<{ processed: number; updated: number; errors: number }> => {
    const batchSize = args.batchSize || 5;
    const maxAnimeToProcess = args.maxAnimeToProcess || 30;
    
    console.log(`[Episode Data Batch] Starting batch episode update (max: ${maxAnimeToProcess}, batch: ${batchSize})`);
    
    try {
      // Get all anime from database
      const allAnime = await ctx.runQuery(internal.anime.getAllAnimeInternal, {});
      
      // Filter anime that need episode data
      const animeMissingEpisodes = allAnime
        .filter(anime => {
          const hasNoEpisodes = !anime.streamingEpisodes || anime.streamingEpisodes.length === 0;
          const isFinished = anime.airingStatus === "FINISHED" || !anime.airingStatus;
          const isReleasing = anime.airingStatus === "RELEASING";
          
          // Prioritize finished anime without episodes, or releasing anime
          return hasNoEpisodes && (isFinished || isReleasing);
        })
        .sort((a, b) => {
          // Prioritize releasing anime, then by popularity (rating)
          if (a.airingStatus === "RELEASING" && b.airingStatus !== "RELEASING") return -1;
          if (b.airingStatus === "RELEASING" && a.airingStatus !== "RELEASING") return 1;
          return (b.rating || 0) - (a.rating || 0);
        })
        .slice(0, maxAnimeToProcess);

      let processed = 0;
      let updated = 0;
      let errors = 0;

      // Process in specified batch sizes
      for (let i = 0; i < animeMissingEpisodes.length; i += batchSize) {
        const batch = animeMissingEpisodes.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (anime) => {
          try {
            processed++;
            
            const episodeResult = await ctx.runAction(internal.externalApis.fetchStreamingEpisodesFromConsumet, {
              title: anime.title,
              totalEpisodes: anime.totalEpisodes
            });

            if (episodeResult.success && episodeResult.episodes.length > 0) {
              await ctx.runMutation(internal.anime.updateAnimeWithExternalData, {
                animeId: anime._id,
                updates: { 
                  streamingEpisodes: episodeResult.episodes,
                  totalEpisodes: episodeResult.totalEpisodes
                },
                sourceApi: episodeResult.source
              });
              updated++;
              console.log(`[Episode Data Batch] ✅ Updated episodes for: ${anime.title} (${episodeResult.episodes.length} episodes)`);
            } else {
              console.log(`[Episode Data Batch] ⚠️ No episodes found for: ${anime.title}`);
            }
          } catch (error: any) {
            errors++;
            console.error(`[Episode Data Batch] ❌ Error for ${anime.title}:`, error.message);
          }
        });

        await Promise.all(batchPromises);

        // Rate limiting between batches
        if (i + batchSize < animeMissingEpisodes.length) {
          console.log(`[Episode Data Batch] Waiting 3 seconds before next batch...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      console.log(`[Episode Data Batch] Complete! Processed: ${processed}, Updated: ${updated}, Errors: ${errors}`);
      return { processed, updated, errors };

    } catch (error: any) {
      console.error(`[Episode Data Batch] Batch error:`, error);
      return { processed: 0, updated: 0, errors: 1 };
    }
  }
});

export const callBatchRefreshMissingPosters = action({
  args: { maxToProcess: v.optional(v.number()), prioritizeNew: v.optional(v.boolean()) },
  handler: async (ctx: ActionCtx, args): Promise<BatchOperationResult> => {
    return await ctx.runAction(internal.externalApis.batchRefreshMissingPosters, args);
  }
});

export const callBatchRefreshMissingEpisodes = action({
  args: { maxToProcess: v.optional(v.number()), prioritizeCompleted: v.optional(v.boolean()) },
  handler: async (ctx: ActionCtx, args): Promise<BatchOperationResult> => {
    return await ctx.runAction(internal.externalApis.batchRefreshMissingEpisodes, args);
  }
});

export const callBatchRefreshAiringAnimeData = action({
  args: { maxToProcess: v.optional(v.number()), dataTypes: v.optional(v.array(v.string())) },
  handler: async (ctx: ActionCtx, args): Promise<BatchOperationResult> => {
    return await ctx.runAction(internal.externalApis.batchRefreshAiringAnimeData, args);
  }
});

// ADD THIS NEW ACTION AT THE END OF THE FILE
export const callBatchEnhanceVisibleAnimePosters = action({
  args: {
    animeIds: v.array(v.id("anime")),
    messageId: v.string(), // For logging/tracking
  },
  handler: async (ctx: ActionCtx, args): Promise<BatchOperationResult> => {
    const totalToProcess = args.animeIds.length;
    if (totalToProcess === 0) {
      return {
        processed: 0,
        successful: 0,
        failed: 0,
        errors: [],
        details: []
      };
    }

    console.log(`[Enhance Visible] Starting enhancement for ${totalToProcess} visible anime posters.`);

    const results: BatchOperationResult = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [],
      details: []
    };

    // Get the anime documents for the given IDs
    const animeDocs = await ctx.runQuery(internal.anime.getAnimeByIdsInternal, { animeIds: args.animeIds });

    for (const anime of animeDocs) {
        if (!anime) {
            results.processed++;
            results.failed++;
            results.errors.push(`Anime with a provided ID not found.`);
            continue;
        }

        results.processed++;
        
        try {
          // Check if poster needs enhancement
          const needsEnhancement = !anime.posterUrl || anime.posterUrl.includes('placehold.co');
          if (!needsEnhancement) {
            console.log(`[Enhance Visible] Skipping ${anime.title} as it already has a good poster.`);
            results.details.push({
              animeId: anime._id,
              title: anime.title,
              success: true,
              message: "Skipped, poster already exists."
            });
            continue;
          }

          const posterResult = await ctx.runAction(internal.externalApis.fetchBestQualityPoster, {
            title: anime.title,
            year: anime.year,
          });

          if (posterResult.success && posterResult.posterUrl) {
            await ctx.runMutation(internal.anime.updateAnimeWithExternalData, {
              animeId: anime._id,
              updates: { posterUrl: posterResult.posterUrl },
              sourceApi: posterResult.source,
            });
            
            results.successful++;
            results.details.push({
              animeId: anime._id,
              title: anime.title,
              success: true,
              message: `Enhanced poster from ${posterResult.source}.`
            });
            console.log(`[Enhance Visible] ✅ Enhanced poster for: ${anime.title}`);
          } else {
            results.failed++;
            results.details.push({
                animeId: anime._id,
                title: anime.title,
                success: false,
                message: posterResult.message,
            });
          }
        } catch (error: any) {
          results.failed++;
          results.errors.push(`${anime.title}: ${error.message}`);
          results.details.push({
            animeId: anime._id,
            title: anime.title,
            success: false,
            message: error.message,
          });
          console.error(`[Enhance Visible] ❌ Error enhancing ${anime.title}:`, error.message);
        }
        
        // Add a small delay between each API call to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500)); 
    }
    
    console.log(`[Enhance Visible] Complete! Processed: ${results.processed}, Success: ${results.successful}, Failed: ${results.failed}`);
    return results;
  },
});