// convex/externalApis.ts - Enhanced version with episode data fetching

"use node";
import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { ActionCtx } from "./_generated/server";
import { AnimeRecommendation } from "./types";

// Enhanced interfaces for type safety
interface ExternalApiResult {
  success: boolean;
  message: string;
  details?: any;
  source?: string;
}

interface EnhancedBatchResult {
  success: boolean;
  message: string;
  totalProcessed: number;
  totalEnhanced: number;
  errors: string[];
}

// Keep existing BatchEnhancementResult for compatibility with other functions
interface BatchEnhancementResult {
  enhancedCount: number;
  error?: string;
}

// Enhanced timeout and fallback functionality from animeApis.ts
const DEFAULT_TIMEOUT_MS = 7000;

// Helper to add timeout support to fetch
async function fetchWithTimeout(url: string, options: RequestInit & { timeout?: number } = {}): Promise<Response> {
  const { timeout, ...fetchOptions } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout ?? DEFAULT_TIMEOUT_MS);
  try {
    return await fetch(url, { ...fetchOptions, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

// Enhanced image quality selection (improved from your existing version)
const selectBestImageUrl = (images: any, source: 'anilist' | 'jikan' | 'tmdb' | 'kitsu' = 'anilist'): string | undefined => {
    if (!images) return undefined;
    
    switch (source) {
        case 'anilist':
            // AniList image priority: extraLarge > large > medium
            if (images.extraLarge) return images.extraLarge;
            if (images.large) return images.large;
            if (images.medium) return images.medium;
            break;
            
        case 'jikan':
            // Jikan image priority: large_image_url > image_url > small_image_url
            if (images.jpg?.large_image_url) return images.jpg.large_image_url;
            if (images.webp?.large_image_url) return images.webp.large_image_url;
            if (images.jpg?.image_url) return images.jpg.image_url;
            if (images.webp?.image_url) return images.webp.image_url;
            break;
            
        case 'tmdb':
            // TMDb returns poster_path, needs to be constructed
            if (images.poster_path) return `https://image.tmdb.org/t/p/w500${images.poster_path}`;
            break;
            
        case 'kitsu':
            // Kitsu image priority
            if (images.posterImage?.original) return images.posterImage.original;
            if (images.posterImage?.large) return images.posterImage.large;
            break;
    }
    
    return undefined;
};


// Enhanced poster fetching with multiple fallbacks (from animeApis.ts)
const fetchPosterWithFallbacks = async (
  searchTerm: string, 
  existingUrl?: string,
  allowUpgrade: boolean = true  // NEW: Allow quality upgrades
): Promise<string | null> => {
    console.log(`[Enhanced Poster Fetch] Searching for poster: "${searchTerm}"`);
    console.log(`[Enhanced Poster Fetch] Existing poster: ${existingUrl || 'none'}`);
    console.log(`[Enhanced Poster Fetch] Allow upgrade: ${allowUpgrade}`);

    // Only skip if we have a good poster AND upgrades are disabled
    if (!allowUpgrade && existingUrl && !existingUrl.includes('placehold') && !existingUrl.includes('placeholder')) {
        console.log(`[Enhanced Poster Fetch] Skipping - good poster exists and upgrades disabled`);
        return existingUrl;
    }

    // Check if existing poster is low quality and should be upgraded
    const isLowQuality = !existingUrl || 
                        existingUrl.includes('placehold') || 
                        existingUrl.includes('placeholder') ||
                        existingUrl.includes('300x450') ||  // Low resolution
                        existingUrl.includes('small') ||    // Small size indicator
                        existingUrl.includes('medium');     // Medium when we want large

    if (existingUrl && !isLowQuality && !allowUpgrade) {
        console.log(`[Enhanced Poster Fetch] Good quality poster exists: ${existingUrl}`);
        return existingUrl;
    }

    if (existingUrl && !isLowQuality) {
        console.log(`[Enhanced Poster Fetch] Will try to upgrade existing poster with TMDB`);
    }

    // 1. TMDb - requires an API key
    const tmdbKey = process.env.TMDB_API_KEY;
    if (tmdbKey) {
        try {
            console.log(`[Enhanced Poster Fetch] Attempting TMDB with key: ${tmdbKey.substring(0, 8)}...`);
            
            const tmdbUrl = `https://api.themoviedb.org/3/search/tv?api_key=${tmdbKey}&query=${encodeURIComponent(searchTerm)}`;
            const res = await fetchWithTimeout(tmdbUrl, { timeout: DEFAULT_TIMEOUT_MS });
            
            console.log(`[Enhanced Poster Fetch] TMDB response status: ${res.status}`);
            
            if (res.ok) {
                const data = await res.json();
                console.log(`[Enhanced Poster Fetch] TMDB found ${data.results?.length || 0} results`);
                
                const posterPath = data?.results?.[0]?.poster_path;
                if (posterPath) {
                    const poster = `https://image.tmdb.org/t/p/w500${posterPath}`;
                    console.log(`[Enhanced Poster Fetch] ✅ Found TMDb poster: ${poster}`);
                    
                    // If we have an existing poster, compare quality
                    if (existingUrl && !isLowQuality) {
                        console.log(`[Enhanced Poster Fetch] Upgrading from ${existingUrl} to TMDB ${poster}`);
                    }
                    
                    return poster;
                } else {
                    console.log(`[Enhanced Poster Fetch] TMDB has results but no poster_path`);
                }
            } else {
                const errorText = await res.text();
                console.log(`[Enhanced Poster Fetch] TMDB error ${res.status}: ${errorText.substring(0, 100)}`);
            }
        } catch (err: any) {
            console.error('[Enhanced Poster Fetch] TMDb failed:', err.message);
        }
    } else {
        console.log(`[Enhanced Poster Fetch] No TMDB API key found`);
    }

    // 2. If existing poster is good quality and TMDB failed, keep it
    if (existingUrl && !isLowQuality) {
        console.log(`[Enhanced Poster Fetch] TMDB failed, keeping existing good quality poster`);
        return existingUrl;
    }

    // 3. Continue with other APIs for fallback...
    console.log(`[Enhanced Poster Fetch] TMDB failed, trying AniList fallback...`);
    
    // AniList fallback code (same as before)
    try {
        const query = `query ($search: String) { Media(search: $search, type: ANIME) { coverImage { extraLarge large medium } } }`;
        const res = await fetchWithTimeout('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables: { search: searchTerm } }),
            timeout: DEFAULT_TIMEOUT_MS,
        });
        if (res.ok) {
            const data = await res.json();
            const poster = selectBestImageUrl(data?.data?.Media?.coverImage, 'anilist');
            if (poster) {
                console.log(`[Enhanced Poster Fetch] ✅ Found AniList poster: ${poster}`);
                return poster;
            }
        }
    } catch (err) {
        console.error('[Enhanced Poster Fetch] AniList failed:', err);
    }

    // 3. Jikan fallback
    try {
        const url = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(searchTerm)}&limit=1&sfw`;
        const res = await fetchWithTimeout(url, { timeout: DEFAULT_TIMEOUT_MS });
        if (res.ok) {
            const data = await res.json();
            const poster = selectBestImageUrl(data?.data?.[0]?.images, 'jikan');
            if (poster) {
                console.log(`[Enhanced Poster Fetch] Found Jikan poster: ${poster}`);
                return poster;
            }
        }
    } catch (err) {
        console.error('[Enhanced Poster Fetch] Jikan failed:', err);
    }

    // 4. Kitsu fallback
    try {
        const url = `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(searchTerm)}`;
        const res = await fetchWithTimeout(url, { timeout: DEFAULT_TIMEOUT_MS });
        if (res.ok) {
            const data = await res.json();
            const poster = selectBestImageUrl(data?.data?.[0]?.attributes, 'kitsu');
            if (poster) {
                console.log(`[Enhanced Poster Fetch] Found Kitsu poster: ${poster}`);
                return poster;
            }
        }
    } catch (err) {
        console.error('[Enhanced Poster Fetch] Kitsu failed:', err);
    }

    console.log(`[Enhanced Poster Fetch] No poster found from any source`);
    return existingUrl || null; // Return existing if we have it, or null
};

// Enhanced episode fetching with multiple fallbacks
const fetchEpisodesWithFallbacks = async (idOrTitle: string | number, existingEpisodes?: any[]): Promise<any[] | null> => {
    // Skip if we already have recent episode data
    if (existingEpisodes && existingEpisodes.length > 0) {
        return existingEpisodes;
    }

    console.log(`[Enhanced Episode Fetch] Searching for episodes: "${idOrTitle}"`);

    // 1. AniList (primary source for episode data)
    try {
        const query = `query ($id: Int, $search: String) { 
            Media(id: $id, search: $search, type: ANIME) { 
                streamingEpisodes { title thumbnail url site }
                episodes
            } 
        }`;
        const variables: Record<string, any> = typeof idOrTitle === 'number' ? { id: idOrTitle } : { search: idOrTitle };
        const res = await fetchWithTimeout('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables }),
            timeout: DEFAULT_TIMEOUT_MS,
        });
        if (res.ok) {
            const data = await res.json();
            const eps = data?.data?.Media?.streamingEpisodes || [];
            if (eps.length > 0) {
                console.log(`[Enhanced Episode Fetch] Found ${eps.length} AniList episodes`);
                return eps.map((ep: any) => ({
                    title: ep.title || `Episode ${eps.indexOf(ep) + 1}`,
                    thumbnail: ep.thumbnail,
                    url: ep.url,
                    site: ep.site,
                }));
            }
        }
    } catch (err) {
        console.error('[Enhanced Episode Fetch] AniList failed:', err);
    }


    // 2. Shikimori fallback
    try {
        const query = typeof idOrTitle === 'number' 
            ? `https://shikimori.one/api/animes/${idOrTitle}/episodes` 
            : `https://shikimori.one/api/animes?search=${encodeURIComponent(String(idOrTitle))}`;
        const res = await fetchWithTimeout(query, { timeout: DEFAULT_TIMEOUT_MS });
        if (res.ok) {
            const data = await res.json();
            const eps = Array.isArray(data)
                ? data.map((ep: any) => ({ title: ep.name, url: ep.url }))
                : data?.episodes?.map((ep: any) => ({ title: ep.russian || ep.name, url: ep.url })) || [];
            if (eps.length > 0) {
                console.log(`[Enhanced Episode Fetch] Found ${eps.length} Shikimori episodes`);
                return eps;
            }
        }
    } catch (err) {
        console.error('[Enhanced Episode Fetch] Shikimori failed:', err);
    }

    // 3. Jikan fallback
    try {
        const url = typeof idOrTitle === 'number'
            ? `https://api.jikan.moe/v4/anime/${idOrTitle}/episodes`
            : `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(String(idOrTitle))}&limit=1&sfw`;
        const res = await fetchWithTimeout(url, { timeout: DEFAULT_TIMEOUT_MS });
        if (res.ok) {
            const data = await res.json();
            const eps = data?.data?.episodes || data?.data?.[0]?.episodes || [];
            if (eps.length > 0) {
                console.log(`[Enhanced Episode Fetch] Found ${eps.length} Jikan episodes`);
                return eps;
            }
        }
    } catch (err) {
        console.error('[Enhanced Episode Fetch] Jikan failed:', err);
    }

    // 4. TMDb fallback
    try {
        const tmdbKey = process.env.TMDB_API_KEY;
        if (tmdbKey) {
            const searchUrl = `https://api.themoviedb.org/3/search/tv?api_key=${tmdbKey}&query=${encodeURIComponent(String(idOrTitle))}`;
            const searchRes = await fetchWithTimeout(searchUrl, { timeout: DEFAULT_TIMEOUT_MS });
            if (searchRes.ok) {
                const searchData = await searchRes.json();
                const tmdbId = searchData?.results?.[0]?.id;
                if (tmdbId) {
                    const seasonUrl = `https://api.themoviedb.org/3/tv/${tmdbId}/season/1?api_key=${tmdbKey}`;
                    const seasonRes = await fetchWithTimeout(seasonUrl, { timeout: DEFAULT_TIMEOUT_MS });
                    if (seasonRes.ok) {
                        const seasonData = await seasonRes.json();
                        const eps = seasonData?.episodes || [];
                        if (eps.length > 0) {
                            console.log(`[Enhanced Episode Fetch] Found ${eps.length} TMDb episodes`);
                            return eps.map((ep: any, index: number) => ({
                                title: ep.name || `Episode ${ep.episode_number || index + 1}`,
                                thumbnail: ep.still_path ? `https://image.tmdb.org/t/p/w500${ep.still_path}` : undefined,
                                url: '',
                                site: 'TMDb',
                            }));
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.error('[Enhanced Episode Fetch] TMDb failed:', err);
    }

    return null;
};

// Enhanced character fetching with multiple fallbacks
const fetchCharactersWithFallbacks = async (animeId: string | number, existingCharacters?: any[]): Promise<any[] | null> => {
    // Skip if we already have recent character data
    if (existingCharacters && existingCharacters.length > 0) {
        return existingCharacters;
    }

    console.log(`[Enhanced Character Fetch] Searching for characters: "${animeId}"`);

    // 1. AniList (primary source for character data)
    try {
        const query = `query ($id: Int) { 
            Media(id: $id, type: ANIME) { 
                characters(sort: [ROLE, RELEVANCE, ID], page: 1, perPage: 20) { 
                    edges { 
                        role
                        voiceActors { 
                            id name { full } image { large } languageV2 
                        }
                        node { 
                            id name { full userPreferred } image { large } 
                            description age gender bloodType 
                            dateOfBirth { year month day }
                        } 
                    } 
                } 
            } 
        }`;
        const variables = { id: typeof animeId === 'number' ? animeId : parseInt(animeId) };
        const res = await fetchWithTimeout('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables }),
            timeout: DEFAULT_TIMEOUT_MS,
        });
        if (res.ok) {
            const data = await res.json();
            const edges = data?.data?.Media?.characters?.edges || [];
            if (edges.length > 0) {
                const chars = edges.map((edge: any) => ({
                    id: edge.node?.id,
                    name: edge.node?.name?.userPreferred || edge.node?.name?.full,
                    imageUrl: edge.node?.image?.large,
                    description: edge.node?.description,
                    role: edge.role,
                    age: edge.node?.age,
                    gender: edge.node?.gender,
                    bloodType: edge.node?.bloodType,
                    dateOfBirth: edge.node?.dateOfBirth,
                    voiceActors: edge.voiceActors?.map((va: any) => ({
                        id: va.id,
                        name: va.name?.full,
                        language: va.languageV2,
                        imageUrl: va.image?.large,
                    })) || [],
                }));
                console.log(`[Enhanced Character Fetch] Found ${chars.length} AniList characters`);
                return chars;
            }
        }
    } catch (err) {
        console.error('[Enhanced Character Fetch] AniList failed:', err);
    }

    // 2. Jikan fallback
    try {
        const url = `https://api.jikan.moe/v4/anime/${animeId}/characters`;
        const res = await fetchWithTimeout(url, { timeout: DEFAULT_TIMEOUT_MS });
        if (res.ok) {
            const data = await res.json();
            const chars = (data?.data || []).map((c: any) => ({
                id: c.character?.mal_id,
                name: c.character?.name,
                imageUrl: c.character?.images?.jpg?.image_url,
                description: c.character?.about,
                role: c.role,
            }));
            if (chars.length > 0) {
                console.log(`[Enhanced Character Fetch] Found ${chars.length} Jikan characters`);
                return chars;
            }
        }
    } catch (err) {
        console.error('[Enhanced Character Fetch] Jikan failed:', err);
    }

    return null;
};

// Your existing helper functions (keep these as they are)
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

// Enhanced main fetch function with improved fallbacks
export const triggerFetchExternalAnimeDetailsEnhanced = internalAction({
  args: { 
    animeIdInOurDB: v.id("anime"), 
    titleToSearch: v.string(),
    forceUpgrade: v.optional(v.boolean()) // NEW: Force poster upgrades
  },
  handler: async (ctx: ActionCtx, args): Promise<ExternalApiResult> => {
    const existingAnime = await ctx.runQuery(internal.anime.getAnimeByIdInternal, { animeId: args.animeIdInOurDB });
    if (!existingAnime) return { success: false, message: "Internal: Anime not found." };

    console.log(`[Enhanced External API] Processing: "${existingAnime.title}"`);
    console.log(`[Enhanced External API] Current poster: ${existingAnime.posterUrl || 'none'}`);
    console.log(`[Enhanced External API] Force upgrade: ${args.forceUpgrade || false}`);

    // Enhanced poster fetching with upgrade capability
    const enhancedPosterUrl = await fetchPosterWithFallbacks(
        args.titleToSearch, 
        existingAnime.posterUrl,
        args.forceUpgrade || true  // Allow upgrades by default
    );
    
    // Enhanced episode fetching with multiple fallbacks
    const enhancedEpisodes = await fetchEpisodesWithFallbacks(
        existingAnime.anilistId || args.titleToSearch, 
        existingAnime.streamingEpisodes
    );
    
    // Enhanced character fetching with multiple fallbacks
    const enhancedCharacters = await fetchCharactersWithFallbacks(
        existingAnime.anilistId || args.titleToSearch,
        existingAnime.characters
    );

    // Prepare updates
    const updates: Partial<Omit<Doc<"anime">, "title" | "_id" | "_creationTime">> = {};
    let enhancementCount = 0;
    const sources: string[] = [];

    if (enhancedPosterUrl && enhancedPosterUrl !== existingAnime.posterUrl) {
        updates.posterUrl = enhancedPosterUrl;
        enhancementCount++;
        sources.push('poster');
        console.log(`[Enhanced External API] Poster updated: ${existingAnime.posterUrl} → ${enhancedPosterUrl}`);
    }

    // Apply updates if any enhancements were found
    if (Object.keys(updates).length > 0) {
        updates.lastFetchedFromExternal = {
            timestamp: Date.now(),
            source: 'enhanced_fallback_apis',
        };

        await ctx.runMutation(internal.anime.updateAnimeWithExternalData, {
            animeId: args.animeIdInOurDB,
            updates,
            sourceApi: 'enhanced_fallback_apis',
        });

        return {
            success: true,
            message: `Enhanced ${enhancementCount} data fields: ${sources.join(', ')}`,
            source: 'enhanced_fallback_apis',
            details: { enhanced: sources, posterUpgraded: enhancedPosterUrl !== existingAnime.posterUrl }
        };
    }

    return {
        success: true,
        message: "No new enhancements needed - data is already up to date",
        source: 'enhanced_fallback_apis'
    };
  },
});

// Public action to call the enhanced version
export const callEnhancedFetchExternalAnimeDetails = action({
  args: { animeIdInOurDB: v.id("anime"), titleToSearch: v.string() },
  handler: async (ctx: ActionCtx, args): Promise<ExternalApiResult> => {
    return await ctx.runAction(internal.externalApis.triggerFetchExternalAnimeDetailsEnhanced, args);
  },
});

// Enhanced batch processing with better error handling and rate limiting
export const batchEnhanceAnimeWithFallbacks = internalAction({
  args: {
    batchSize: v.optional(v.number()),
    maxAnimeToProcess: v.optional(v.number()),
    prioritizeMissingData: v.optional(v.boolean()),
  },
  handler: async (ctx: ActionCtx, args): Promise<EnhancedBatchResult> => {
    const batchSize = args.batchSize || 3; // Smaller batches for more API calls
    const maxAnimeToProcess = args.maxAnimeToProcess || 15;
    const prioritizeMissingData = args.prioritizeMissingData ?? true;
    
    console.log(`[Enhanced Batch Processing] Starting enhanced batch processing...`);
    
    const allAnime: Doc<"anime">[] = await ctx.runQuery(internal.anime.getAllAnimeInternal, {});
    
    // Prioritize anime with missing data
    const animeNeedingEnhancement = allAnime
      .filter((anime: Doc<"anime">) => {
        if (prioritizeMissingData) {
          // Prioritize anime with missing posters, episodes, or characters
          const missingPoster = !anime.posterUrl || anime.posterUrl.includes('placeholder');
          const missingEpisodes = !anime.streamingEpisodes || anime.streamingEpisodes.length === 0;
          const missingCharacters = !anime.characters || anime.characters.length === 0;
          const oldData = !anime.lastFetchedFromExternal || 
                         (Date.now() - anime.lastFetchedFromExternal.timestamp) > (7 * 24 * 60 * 60 * 1000);
          
          return missingPoster || missingEpisodes || missingCharacters || oldData;
        }
        return true;
      })
      .slice(0, maxAnimeToProcess);

    if (animeNeedingEnhancement.length === 0) {
      return {
        success: true,
        message: "No anime need enhancement",
        totalProcessed: 0,
        totalEnhanced: 0,
        errors: []
      };
    }

    console.log(`[Enhanced Batch Processing] Processing ${animeNeedingEnhancement.length} anime with enhanced fallbacks`);
    
    let totalProcessed = 0;
    let totalEnhanced = 0;
    const errors: string[] = [];

    // Process in smaller batches with longer delays due to multiple API calls per anime
    for (let i = 0; i < animeNeedingEnhancement.length; i += batchSize) {
      const batch = animeNeedingEnhancement.slice(i, i + batchSize);
      
      console.log(`[Enhanced Batch Processing] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(animeNeedingEnhancement.length / batchSize)}`);

      for (const anime of batch) {
        try {
          console.log(`[Enhanced Batch Processing] Processing: ${anime.title}`);
          
          const result = await ctx.runAction(internal.externalApis.triggerFetchExternalAnimeDetailsEnhanced, {
            animeIdInOurDB: anime._id,
            titleToSearch: anime.title
          });
          
          totalProcessed++;
          
          if (result.success && result.details?.enhanced?.length > 0) {
            totalEnhanced++;
            console.log(`[Enhanced Batch Processing] ✅ Enhanced: ${anime.title} (${result.details.enhanced.join(', ')})`);
          } else {
            console.log(`[Enhanced Batch Processing] ⚪ Processed: ${anime.title} - ${result.message}`);
          }
          
          // Longer delay between requests due to multiple API calls
          await new Promise(resolve => setTimeout(resolve, 3000));
          
        } catch (error: any) {
          totalProcessed++;
          const errorMsg = `${anime.title}: ${error.message}`;
          errors.push(errorMsg);
          console.error(`[Enhanced Batch Processing] Error processing ${anime.title}:`, error.message);
        }
      }
      
      // Longer delay between batches
      if (i + batchSize < animeNeedingEnhancement.length) {
        console.log(`[Enhanced Batch Processing] Waiting 10 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
    
    const message = `Enhanced batch processing completed! Processed: ${totalProcessed}, Enhanced: ${totalEnhanced}, Errors: ${errors.length}`;
    console.log(`[Enhanced Batch Processing] ${message}`);
    
    return {
      success: true,
      message,
      totalProcessed,
      totalEnhanced,
      errors: errors.slice(0, 5)
    };
  },
});

// Public action to call enhanced batch processing
export const callBatchEnhanceAnimeWithFallbacks = action({
  args: {
    batchSize: v.optional(v.number()),
    maxAnimeToProcess: v.optional(v.number()),
    prioritizeMissingData: v.optional(v.boolean()),
  },
  handler: async (ctx: ActionCtx, args): Promise<EnhancedBatchResult> => {
    return await ctx.runAction(internal.externalApis.batchEnhanceAnimeWithFallbacks, args);
  },
});


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
      
      # ENHANCED CHARACTER QUERY:
      characters(sort: [ROLE, RELEVANCE, ID], page: 1, perPage: 20) {
        edges {
          role
          voiceActors { # Voice actors for this character in this anime
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
            # Note: AniList doesn't have height, weight, powers, weapons as standard fields
            # These need to be extracted from description or derived from other data
          }
        }
      }
      
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

const mapCharacterData = (charactersEdges: any[]): any[] => {
  if (!Array.isArray(charactersEdges)) return [];
  
  return charactersEdges
    .filter(edge => edge && edge.node && edge.node.name && edge.node.name.full)
    .map(edge => {
      const character = edge.node;
      const voiceActors = edge.voiceActors || [];
      
      // Extract additional info from description
      const description = character.description || "";
      const powersAbilities = extractPowersFromDescription(description);
      const weapons = extractWeaponsFromDescription(description);
      const species = extractSpeciesFromDescription(description);
      
      return {
        id: character.id || undefined,
        name: character.name.full || character.name.userPreferred,
        imageUrl: character.image?.large || undefined,
        role: edge.role || "BACKGROUND",
        
        // Enhanced details
        description: description || undefined,
        status: extractStatusFromDescription(description),
        gender: character.gender || undefined,
        age: character.age || undefined,
        
        dateOfBirth: character.dateOfBirth ? {
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
        
        // FIX: Proper typing for voice actors (addresses error 7006)
        voiceActors: voiceActors.map((va: any) => ({
          id: va.id || undefined,
          name: va.name?.full || va.name?.userPreferred || "Unknown",
          language: va.languageV2 || "Unknown",
          imageUrl: va.image?.large || undefined,
        })).filter((va: any) => va.name !== "Unknown"),
        
        relationships: undefined, // Would need separate API calls
      };
    })
    .slice(0, 25); // Limit to prevent overwhelming storage
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

    // Try AniList first (higher quality images, episode data, and character data)
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
              // Episode data from Jikan (limited)
              totalEpisodes: getNumber(apiData, 'episodes', existingAnime.totalEpisodes),
              episodeDuration: getNumber(apiData, 'duration', existingAnime.episodeDuration),
              airingStatus: getString(apiData, 'status', existingAnime.airingStatus),
              // Note: Jikan doesn't provide character data in the main anime endpoint
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
            
            // Episode and streaming data from AniList
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

            // NEW: Character data from AniList
            if (apiData.characters?.edges?.length > 0) {
                mappedData.characters = mapCharacterData(apiData.characters.edges);
                console.log(`[External API - AniList] Found ${mappedData.characters.length} characters for "${existingAnime.title}"`);
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
            const characterCount = mappedData.characters?.length || 0;
            const episodeMessage = episodeCount > 0 ? ` (${episodeCount} episodes)` : '';
            const characterMessage = characterCount > 0 ? ` (${characterCount} characters)` : '';
            return { success: true, message: `High-quality data from ${sourceApiUsed} applied${episodeMessage}${characterMessage}.`, source: sourceApiUsed };
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
    console.log("[Enhanced Poster Enhancement] Starting TMDB-enabled poster enhancement...");
    
    const allAnime: Doc<"anime">[] = await ctx.runQuery(internal.anime.getAllAnimeInternal, {});
    const animesToEnhance = allAnime.filter((anime: Doc<"anime">) => {
      const poster = anime.posterUrl;
      // Include anime with ANY existing poster for potential TMDB upgrade
      return !poster || 
             poster.includes('placehold') || 
             poster.includes('placeholder') ||
             poster.includes('300x450') ||
             !anime.lastFetchedFromExternal ||
             (Date.now() - anime.lastFetchedFromExternal.timestamp) > (7 * 24 * 60 * 60 * 1000); // 7 days for more frequent TMDB checks
    });

    console.log(`[Enhanced Poster Enhancement] Found ${animesToEnhance.length} anime for TMDB enhancement.`);
    
    if (animesToEnhance.length === 0) {
      console.log("[Enhanced Poster Enhancement] No anime need enhancement.");
      return;
    }

    const batchSize = 3;
    const maxAnimesToProcess = 15;
    const animeToProcess = animesToEnhance.slice(0, maxAnimesToProcess);
    
    let processedCount = 0;
    let enhancedCount = 0;

    for (let i = 0; i < animeToProcess.length; i += batchSize) {
      const batch = animeToProcess.slice(i, i + batchSize);
      
      console.log(`[Enhanced Poster Enhancement] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(animeToProcess.length / batchSize)}`);

      const batchPromises = batch.map(async (anime: Doc<"anime">): Promise<void> => {
        try {
          console.log(`[Enhanced Poster Enhancement] Processing: ${anime.title}`);
          
          // 🚀 KEY FIX: Use enhanced function with force upgrade
          const result = await ctx.runAction(internal.externalApis.triggerFetchExternalAnimeDetailsEnhanced, {
            animeIdInOurDB: anime._id,
            titleToSearch: anime.title,
            forceUpgrade: true  // Force TMDB upgrade attempts
          });
          
          processedCount++;
          
          if (result.success && result.details?.posterUpgraded) {
            enhancedCount++;
            console.log(`[Enhanced Poster Enhancement] ✅ Enhanced: ${anime.title}`);
          } else {
            console.log(`[Enhanced Poster Enhancement] ⚪ No upgrade: ${anime.title} - ${result.message}`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (error: any) {
          processedCount++;
          console.error(`[Enhanced Poster Enhancement] Error processing ${anime.title}:`, error.message);
        }
      });
      
      await Promise.all(batchPromises);
      
      if (i + batchSize < animeToProcess.length) {
        console.log(`[Enhanced Poster Enhancement] Waiting 8 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 8000));
      }
    }
    
    console.log(`[Enhanced Poster Enhancement] Completed! Processed: ${processedCount}, Enhanced: ${enhancedCount}`);
  },
});

export const forceTmdbUpgrade = action({
  args: {
    animeIds: v.array(v.id("anime")),
  },
  handler: async (ctx: ActionCtx, args): Promise<{
    upgraded: number;
    total: number;
    results: Array<{title: string; success: boolean; oldPoster?: string; newPoster?: string; message: string}>;
  }> => {
    console.log(`🚀 Force TMDB upgrade for ${args.animeIds.length} anime...`);
    
    const results: Array<{title: string; success: boolean; oldPoster?: string; newPoster?: string; message: string}> = [];
    let upgraded = 0;

    for (const animeId of args.animeIds) {
      try {
        const anime = await ctx.runQuery(internal.anime.getAnimeByIdInternal, { animeId });
        if (!anime) {
          results.push({title: "Unknown", success: false, message: "Anime not found"});
          continue;
        }

        const oldPoster = anime.posterUrl;
        
        const result = await ctx.runAction(internal.externalApis.triggerFetchExternalAnimeDetailsEnhanced, {
          animeIdInOurDB: animeId,
          titleToSearch: anime.title,
          forceUpgrade: true
        });

        // Check if poster was actually updated
        const updatedAnime = await ctx.runQuery(internal.anime.getAnimeByIdInternal, { animeId });
        const newPoster = updatedAnime?.posterUrl;
        const posterChanged = newPoster !== oldPoster;

        if (posterChanged) upgraded++;

        results.push({
          title: anime.title,
          success: result.success,
          oldPoster: oldPoster,
          newPoster: newPoster,
          message: posterChanged ? "Poster upgraded" : result.message
        });

        // Delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error: any) {
        results.push({title: "Error", success: false, message: error.message});
      }
    }

    return {
      upgraded,
      total: args.animeIds.length,
      results
    };
  },
});

// Optional: Add a manual trigger version for immediate use
export const manualPosterEnhancement = action({
  args: {
    maxAnimeToProcess: v.optional(v.number()),
    prioritizeWorst: v.optional(v.boolean()),
  },
  handler: async (ctx: ActionCtx, args): Promise<{
    success: boolean;
    message: string;
    processed: number;
    enhanced: number;
    details: string[];
  }> => {
    console.log("🎯 Starting manual poster enhancement...");
    
    const maxToProcess = args.maxAnimeToProcess || 15;
    const prioritizeWorst = args.prioritizeWorst ?? true;
    
    // Get anime needing enhancement
    const allAnime: Doc<"anime">[] = await ctx.runQuery(internal.anime.getAllAnimeInternal, {});
    let animesToEnhance = allAnime.filter((anime: Doc<"anime">) => {
      const poster = anime.posterUrl;
      return !poster || 
             poster.includes('placehold') || 
             poster.includes('placeholder') ||
             !anime.lastFetchedFromExternal ||
             (Date.now() - anime.lastFetchedFromExternal.timestamp) > (7 * 24 * 60 * 60 * 1000);
    });

    // Prioritize worst cases first
    if (prioritizeWorst) {
      animesToEnhance.sort((a, b) => {
        const scoreA = (!a.posterUrl ? 3 : a.posterUrl.includes('placeholder') ? 2 : 1);
        const scoreB = (!b.posterUrl ? 3 : b.posterUrl.includes('placeholder') ? 2 : 1);
        return scoreB - scoreA; // Worst first
      });
    }

    const animeToProcess = animesToEnhance.slice(0, maxToProcess);
    
    if (animeToProcess.length === 0) {
      return {
        success: true,
        message: "No anime need poster enhancement!",
        processed: 0,
        enhanced: 0,
        details: []
      };
    }

    let processedCount = 0;
    let enhancedCount = 0;
    const enhancementDetails: string[] = [];

    // Process with enhanced system
    for (const anime of animeToProcess) {
      try {
        console.log(`🎯 Processing: ${anime.title}`);
        
        const result = await ctx.runAction(internal.externalApis.triggerFetchExternalAnimeDetailsEnhanced, {
          animeIdInOurDB: anime._id,
          titleToSearch: anime.title
        });
        
        processedCount++;
        
        if (result.success && result.details?.enhanced?.length > 0) {
          enhancedCount++;
          const enhanced = result.details.enhanced.join(', ');
          enhancementDetails.push(`${anime.title}: ${enhanced}`);
          console.log(`✅ Enhanced: ${anime.title} (${enhanced})`);
        }
        
        // Respectful delay
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error: any) {
        processedCount++;
        console.error(`❌ Error processing ${anime.title}:`, error.message);
      }
    }

    return {
      success: true,
      message: `Enhancement complete: ${enhancedCount}/${processedCount} anime improved`,
      processed: processedCount,
      enhanced: enhancedCount,
      details: enhancementDetails
    };
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

const extractPowersFromDescription = (description: string): string[] => {
  const powerKeywords = ['power', 'ability', 'magic', 'skill', 'technique', 'jutsu', 'quirk'];
  const powers: string[] = [];
  
  powerKeywords.forEach(keyword => {
    const regex = new RegExp(`(${keyword}[^.!?]*[.!?])`, 'gi');
    const matches = description.match(regex);
    if (matches) {
      powers.push(...matches.map(match => match.trim()));
    }
  });
  
  return [...new Set(powers)].slice(0, 5);
};

const extractWeaponsFromDescription = (description: string): string[] => {
  const weaponKeywords = ['sword', 'blade', 'gun', 'weapon', 'staff', 'bow', 'arrow', 'katana'];
  const weapons: string[] = [];
  
  weaponKeywords.forEach(keyword => {
    if (description.toLowerCase().includes(keyword)) {
      weapons.push(keyword);
    }
  });
  
  return [...new Set(weapons)];
};

const extractSpeciesFromDescription = (description: string): string | undefined => {
  const speciesKeywords = ['demon', 'angel', 'elf', 'dwarf', 'vampire', 'werewolf', 'dragon', 'robot', 'android'];
  
  for (const species of speciesKeywords) {
    if (description.toLowerCase().includes(species)) {
      return species.charAt(0).toUpperCase() + species.slice(1);
    }
  }
  
  return undefined;
};

const extractStatusFromDescription = (description: string): string | undefined => {
  if (description.toLowerCase().includes('dead') || description.toLowerCase().includes('died')) {
    return "Deceased";
  }
  if (description.toLowerCase().includes('alive')) {
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

// TMDB API Testing and Setup Functions

// 1. Test TMDB API Connection
export const testTmdbApi = action({
  args: {
    testTitle: v.optional(v.string()),
  },
  handler: async (ctx: ActionCtx, args): Promise<{
    success: boolean;
    message: string;
    hasApiKey: boolean;
    testResult?: any;
    error?: string;
  }> => {
    const testTitle = args.testTitle || "Attack on Titan";
    
    console.log(`🧪 Testing TMDB API with: "${testTitle}"`);
    
    // Check if API key exists
    const tmdbKey = process.env.TMDB_API_KEY;
    const hasApiKey = !!tmdbKey;
    
    if (!tmdbKey) {
      return {
        success: false,
        message: "TMDB API key not found in environment variables",
        hasApiKey: false,
        error: "No TMDB_API_KEY in environment variables"
      };
    }

    console.log(`✅ TMDB API key found: ${tmdbKey.substring(0, 8)}...`);

    try {
      // Test the API call
      const tmdbUrl = `https://api.themoviedb.org/3/search/tv?api_key=${tmdbKey}&query=${encodeURIComponent(testTitle)}`;
      
      console.log(`🔍 Testing URL: ${tmdbUrl.replace(tmdbKey, 'API_KEY_HIDDEN')}`);
      
      const response = await fetch(tmdbUrl, {
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          message: `TMDB API Error: ${response.status} - ${response.statusText}`,
          hasApiKey: true,
          error: errorText
        };
      }

      const data = await response.json();
      
      const results = data.results || [];
      const foundPoster = results.length > 0 && results[0].poster_path;
      
      return {
        success: true,
        message: `TMDB API working! Found ${results.length} results for "${testTitle}"${foundPoster ? ` with poster` : ''}`,
        hasApiKey: true,
        testResult: {
          totalResults: data.total_results,
          resultsFound: results.length,
          firstResult: results[0] ? {
            name: results[0].name,
            poster_path: results[0].poster_path,
            overview: results[0].overview?.substring(0, 100) + '...'
          } : null,
          posterUrl: foundPoster ? `https://image.tmdb.org/t/p/w500${results[0].poster_path}` : null
        }
      };

    } catch (error: any) {
      return {
        success: false,
        message: `TMDB API fetch failed: ${error.message}`,
        hasApiKey: true,
        error: error.message
      };
    }
  },
});

// 2. Test All API Sources for Comparison
export const testAllApiSources = action({
  args: {
    animeTitle: v.string(),
  },
  handler: async (ctx: ActionCtx, args): Promise<{
    animeTitle: string;
    results: {
      tmdb: { success: boolean; posterUrl?: string; error?: string };
      anilist: { success: boolean; posterUrl?: string; error?: string };
      jikan: { success: boolean; posterUrl?: string; error?: string };
      kitsu: { success: boolean; posterUrl?: string; error?: string };
    };
    summary: string;
  }> => {
    const title = args.animeTitle;
    console.log(`🔬 Testing all API sources for: "${title}"`);

    const results = {
      tmdb: { success: false, error: "Not tested" },
      anilist: { success: false, error: "Not tested" },
      jikan: { success: false, error: "Not tested" },
      kitsu: { success: false, error: "Not tested" }
    } as any;

    // Test TMDB
    try {
      const tmdbKey = process.env.TMDB_API_KEY;
      if (tmdbKey) {
        const tmdbUrl = `https://api.themoviedb.org/3/search/tv?api_key=${tmdbKey}&query=${encodeURIComponent(title)}`;
        const tmdbRes = await fetch(tmdbUrl);
        if (tmdbRes.ok) {
          const tmdbData = await tmdbRes.json();
          const posterPath = tmdbData?.results?.[0]?.poster_path;
          results.tmdb = {
            success: !!posterPath,
            posterUrl: posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : undefined,
            error: !posterPath ? "No poster found" : undefined
          };
        } else {
          results.tmdb = { success: false, error: `HTTP ${tmdbRes.status}` };
        }
      } else {
        results.tmdb = { success: false, error: "No API key" };
      }
    } catch (error: any) {
      results.tmdb = { success: false, error: error.message };
    }

    // Test AniList
    try {
      const anilistQuery = `query ($search: String) { Media(search: $search, type: ANIME) { coverImage { extraLarge large medium } } }`;
      const anilistRes = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: anilistQuery, variables: { search: title } }),
      });
      if (anilistRes.ok) {
        const anilistData = await anilistRes.json();
        const coverImage = anilistData?.data?.Media?.coverImage;
        const posterUrl = coverImage?.extraLarge || coverImage?.large || coverImage?.medium;
        results.anilist = {
          success: !!posterUrl,
          posterUrl,
          error: !posterUrl ? "No poster found" : undefined
        };
      } else {
        results.anilist = { success: false, error: `HTTP ${anilistRes.status}` };
      }
    } catch (error: any) {
      results.anilist = { success: false, error: error.message };
    }

    // Test Jikan
    try {
      const jikanUrl = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=1&sfw`;
      const jikanRes = await fetch(jikanUrl);
      if (jikanRes.ok) {
        const jikanData = await jikanRes.json();
        const images = jikanData?.data?.[0]?.images;
        const posterUrl = images?.jpg?.large_image_url || images?.jpg?.image_url;
        results.jikan = {
          success: !!posterUrl,
          posterUrl,
          error: !posterUrl ? "No poster found" : undefined
        };
      } else {
        results.jikan = { success: false, error: `HTTP ${jikanRes.status}` };
      }
    } catch (error: any) {
      results.jikan = { success: false, error: error.message };
    }

    // Test Kitsu
    try {
      const kitsuUrl = `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(title)}`;
      const kitsuRes = await fetch(kitsuUrl);
      if (kitsuRes.ok) {
        const kitsuData = await kitsuRes.json();
        const posterImage = kitsuData?.data?.[0]?.attributes?.posterImage;
        const posterUrl = posterImage?.original || posterImage?.large;
        results.kitsu = {
          success: !!posterUrl,
          posterUrl,
          error: !posterUrl ? "No poster found" : undefined
        };
      } else {
        results.kitsu = { success: false, error: `HTTP ${kitsuRes.status}` };
      }
    } catch (error: any) {
      results.kitsu = { success: false, error: error.message };
    }

    // Create summary
    const successCount = Object.values(results).filter((r: any) => r.success).length;
    const summary = `${successCount}/4 APIs found posters for "${title}"`;

    return {
      animeTitle: title,
      results,
      summary
    };
  },
});

// 3. Enhanced poster fetching with TMDB debug logging
const fetchPosterWithTmdbDebug = async (searchTerm: string): Promise<{
  posterUrl: string | null;
  source: string;
  tmdbStatus: string;
}> => {
  console.log(`🔍 [Debug] Starting poster fetch for: "${searchTerm}"`);

  // 1. Try TMDB first with detailed logging
  const tmdbKey = process.env.TMDB_API_KEY;
  let tmdbStatus = "not_attempted";
  
  if (tmdbKey) {
    tmdbStatus = "api_key_found";
    try {
      console.log(`🔍 [TMDB Debug] Using API key: ${tmdbKey.substring(0, 8)}...`);
      
      const tmdbUrl = `https://api.themoviedb.org/3/search/tv?api_key=${tmdbKey}&query=${encodeURIComponent(searchTerm)}`;
      console.log(`🔍 [TMDB Debug] Fetching: ${tmdbUrl.replace(tmdbKey, 'HIDDEN')}`);
      
      const res = await fetch(tmdbUrl);
      console.log(`🔍 [TMDB Debug] Response status: ${res.status}`);
      
      if (res.ok) {
        const data = await res.json();
        console.log(`🔍 [TMDB Debug] Found ${data.results?.length || 0} results`);
        
        const posterPath = data?.results?.[0]?.poster_path;
        if (posterPath) {
          const posterUrl = `https://image.tmdb.org/t/p/w500${posterPath}`;
          console.log(`🔍 [TMDB Debug] ✅ Found poster: ${posterUrl}`);
          return { posterUrl, source: "tmdb", tmdbStatus: "success" };
        } else {
          tmdbStatus = "no_poster_found";
          console.log(`🔍 [TMDB Debug] ❌ No poster in results`);
        }
      } else {
        const errorText = await res.text();
        tmdbStatus = `http_error_${res.status}`;
        console.log(`🔍 [TMDB Debug] ❌ HTTP Error: ${res.status} - ${errorText.substring(0, 100)}`);
      }
    } catch (error: any) {
      tmdbStatus = `fetch_error: ${error.message}`;
      console.log(`🔍 [TMDB Debug] ❌ Fetch Error: ${error.message}`);
    }
  } else {
    tmdbStatus = "no_api_key";
    console.log(`🔍 [TMDB Debug] ❌ No API key found in environment`);
  }

  // Fallback to other APIs (simplified for debug)
  console.log(`🔍 [Debug] TMDB failed (${tmdbStatus}), trying fallbacks...`);
  
  // Try AniList fallback
  try {
    const query = `query ($search: String) { Media(search: $search, type: ANIME) { coverImage { extraLarge large } } }`;
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { search: searchTerm } }),
    });
    if (res.ok) {
      const data = await res.json();
      const poster = data?.data?.Media?.coverImage?.extraLarge || data?.data?.Media?.coverImage?.large;
      if (poster) {
        console.log(`🔍 [Debug] ✅ Found AniList poster: ${poster}`);
        return { posterUrl: poster, source: "anilist", tmdbStatus };
      }
    }
  } catch (error) {
    console.log(`🔍 [Debug] AniList also failed`);
  }

  return { posterUrl: null, source: "none", tmdbStatus };
};

// 4. Test function that uses the debug poster fetching
export const debugPosterFetch = action({
  args: {
    animeTitle: v.string(),
  },
  handler: async (ctx: ActionCtx, args): Promise<{
    title: string;
    posterUrl: string | null;
    source: string;
    tmdbStatus: string;
    recommendation: string;
  }> => {
    const result = await fetchPosterWithTmdbDebug(args.animeTitle);
    
    let recommendation = "";
    
    if (result.tmdbStatus === "no_api_key") {
      recommendation = "Add TMDB_API_KEY to your Convex environment variables for better poster quality";
    } else if (result.tmdbStatus.startsWith("http_error_401")) {
      recommendation = "TMDB API key is invalid - check your API key";
    } else if (result.tmdbStatus.startsWith("http_error_")) {
      recommendation = "TMDB API is having issues - fallbacks will handle this";
    } else if (result.tmdbStatus === "success") {
      recommendation = "TMDB is working perfectly!";
    } else if (result.tmdbStatus === "no_poster_found") {
      recommendation = "TMDB is working but no poster found for this title - try different search terms";
    }

    return {
      title: args.animeTitle,
      posterUrl: result.posterUrl,
      source: result.source,
      tmdbStatus: result.tmdbStatus,
      recommendation
    };
  },
});// Import trending anime from AniList and add to database
export const importTrendingAnime = internalAction({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx: ActionCtx, args): Promise<{ imported: number; added: string[]; error?: string }> => {
    const limit = args.limit ?? 10;
    try {
      const query = `query ($page: Int, $perPage: Int) { Page(page: $page, perPage: $perPage) { media(type: ANIME, sort: TRENDING_DESC) { id title { romaji } description(asHtml: false) startDate { year } genres coverImage { extraLarge } averageScore } } }`;
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { page: 1, perPage: limit } })
      });
      if (!res.ok) {
        return { imported: 0, added: [], error: `AniList error ${res.status}` };
      }
      const data = await res.json();
      const media = data?.data?.Page?.media || [];
      const added: string[] = [];
      for (const item of media) {
        const title = item.title?.romaji || 'Unknown';
        const existing = await ctx.runQuery(internal.anime.getAnimeByTitleInternal, { title });
        if (existing) continue;
        const animeId = await ctx.runMutation(internal.anime.addAnimeInternal, {
          title,
          description: item.description || '',
          posterUrl: item.coverImage?.extraLarge || '',
          genres: item.genres || [],
          year: item.startDate?.year || undefined,
          rating: typeof item.averageScore === 'number' ? item.averageScore / 10 : undefined,
          emotionalTags: [],
          trailerUrl: '',
          studios: [],
          themes: [],
          anilistId: item.id
        });
        await ctx.runAction(internal.externalApis.triggerFetchExternalAnimeDetailsEnhanced, { animeIdInOurDB: animeId, titleToSearch: title });
        added.push(title);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      return { imported: added.length, added };
    } catch (error: any) {
      return { imported: 0, added: [], error: error.message };
    }
  }
});

// Public action for importing trending anime
export const callImportTrendingAnime = action({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx: ActionCtx, args): Promise<{ imported: number; added: string[]; error?: string }> => {
    return await ctx.runAction(internal.externalApis.importTrendingAnime, args);
  }
});

async function fetchAniListSimple(sort: string, limit: number, reason: string): Promise<{ animes: AnimeRecommendation[]; error?: string }> {
  const query = `query ($page:Int,$perPage:Int){ Page(page:$page, perPage:$perPage){ media(type: ANIME, sort: ${sort}) { id title { romaji } description(asHtml:false) startDate{ year } coverImage{ extraLarge } averageScore genres } } }`;
  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { page: 1, perPage: limit } })
    });
    if (!res.ok) return { animes: [], error: `AniList error ${res.status}` };
    const data = await res.json();
    const media = data?.data?.Page?.media || [];
    const animes = media.map((item: any) => ({
      title: item.title?.romaji || 'Unknown',
      description: item.description || '',
      posterUrl: item.coverImage?.extraLarge || '',
      genres: item.genres || [],
      year: item.startDate?.year || undefined,
      rating: typeof item.averageScore === 'number' ? item.averageScore / 10 : undefined,
      emotionalTags: [],
      trailerUrl: '',
      studios: [],
      themes: [],
      reasoning: reason,
      moodMatchScore: item.averageScore ? item.averageScore / 10 : 0,
      _id: undefined,
      foundInDatabase: false
    })) as AnimeRecommendation[];
    return { animes };
  } catch (e: any) {
    return { animes: [], error: e.message };
  }
}

export const fetchTrendingAnime = action({
  args: { limit: v.optional(v.number()) },
  handler: async (_ctx: ActionCtx, args) => {
    return await fetchAniListSimple('TRENDING_DESC', args.limit ?? 10, 'Trending on AniList');
  }
});

export const fetchTopRatedAnime = action({
  args: { limit: v.optional(v.number()) },
  handler: async (_ctx: ActionCtx, args) => {
    return await fetchAniListSimple('SCORE_DESC', args.limit ?? 10, 'Top ranked on AniList');
  }
});

export const fetchPopularAnime = action({
  args: { limit: v.optional(v.number()) },
  handler: async (_ctx: ActionCtx, args) => {
    return await fetchAniListSimple('POPULARITY_DESC', args.limit ?? 10, 'Popular on AniList');
  }
  });

// Smart Auto-Fill System - Fetch anime data by AniList or MyAnimeList ID
export const smartAutoFillByExternalId = action({
  args: {
    anilistId: v.optional(v.number()),
    myAnimeListId: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    data?: {
      title: string;
      description: string;
      posterUrl: string;
      genres: string[];
      year?: number;
      rating?: number;
      emotionalTags: string[];
      trailerUrl?: string;
      studios: string[];
      themes: string[];
      anilistId?: number;
      myAnimeListId?: number;
      totalEpisodes?: number;
      episodeDuration?: number;
      airingStatus?: string;
      characters?: any[];
      streamingEpisodes?: any[];
    };
    message: string;
    source?: string;
  }> => {
    if (!args.anilistId && !args.myAnimeListId) {
      return { 
        success: false, 
        message: "Please provide either an AniList ID or MyAnimeList ID" 
      };
    }

    try {
      let apiData: any = null;
      let source: string = "";

      // Try AniList first if ID provided
      if (args.anilistId) {
        console.log(`[Smart Auto-Fill] Fetching from AniList with ID: ${args.anilistId}`);
        apiData = await fetchFromAnilist("", args.anilistId);
        if (apiData) {
          source = "anilist";
        }
      }

      // Try MyAnimeList if no AniList data or if MAL ID provided
      if (!apiData && args.myAnimeListId) {
        console.log(`[Smart Auto-Fill] Fetching from MyAnimeList with ID: ${args.myAnimeListId}`);
        
        const jikanUrl = `https://api.jikan.moe/v4/anime/${args.myAnimeListId}/full`;
        
        try {
          const response = await fetchWithTimeout(jikanUrl, { 
            headers: { 'Accept': 'application/json' },
            timeout: 10000 
          });
          
          if (response.ok) {
            const jikanResponse = await response.json();
            apiData = jikanResponse?.data;
            if (apiData) {
              source = "myanimelist";
              
              // Also fetch characters for MAL
              try {
                const charUrl = `https://api.jikan.moe/v4/anime/${args.myAnimeListId}/characters`;
                const charResponse = await fetchWithTimeout(charUrl, { timeout: 5000 });
                if (charResponse.ok) {
                  const charData = await charResponse.json();
                  apiData.characters = charData?.data;
                }
              } catch (err) {
                console.log(`[Smart Auto-Fill] Failed to fetch MAL characters: ${err}`);
              }
            }
          }
        } catch (error: any) {
          console.error(`[Smart Auto-Fill] MyAnimeList fetch error:`, error.message);
        }
      }

      if (!apiData) {
        return { 
          success: false, 
          message: "Could not fetch data from external APIs. Please check the ID and try again." 
        };
      }

      // Map the data based on source
      let mappedData: any = {};

      if (source === "anilist") {
        const title = apiData.title?.english || apiData.title?.romaji || apiData.title?.native || "";
        
        mappedData = {
          title: title,
          description: apiData.description || "",
          posterUrl: selectBestImageUrl(apiData.coverImage, 'anilist') || "",
          genres: apiData.genres || [],
          year: apiData.startDate?.year || apiData.seasonYear,
          rating: apiData.averageScore ? parseFloat((apiData.averageScore / 10).toFixed(1)) : undefined,
          emotionalTags: [],
          trailerUrl: apiData.trailer?.site === "youtube" && apiData.trailer?.id 
            ? `https://www.youtube.com/watch?v=${apiData.trailer.id}` 
            : undefined,
          studios: [],
          themes: [],
          anilistId: apiData.id,
          totalEpisodes: apiData.episodes,
          episodeDuration: apiData.duration,
          airingStatus: apiData.status,
        };

        // Extract studios
        if (apiData.studios?.edges?.length) {
          const mainStudios = apiData.studios.edges
            .filter((e: any) => e.isMain)
            .map((e: any) => e.node.name)
            .filter(Boolean);
          
          if (mainStudios.length === 0 && apiData.studios.edges.length > 0) {
            mappedData.studios = apiData.studios.edges
              .map((e: any) => e.node.name)
              .filter(Boolean);
          } else {
            mappedData.studios = mainStudios;
          }
        }

        // Extract themes and emotional tags from AniList tags
        if (apiData.tags?.length) {
          const themeTags = apiData.tags
            .filter((t: any) => t.category?.toLowerCase().includes('theme') || t.rank > 60)
            .map((t: any) => t.name)
            .filter(Boolean);
          
          const emotionalTags = apiData.tags
            .filter((t: any) => !t.category?.toLowerCase().includes('theme') && t.rank > 50)
            .map((t: any) => t.name)
            .filter(Boolean);
          
          mappedData.themes = themeTags;
          mappedData.emotionalTags = emotionalTags;
        }

        // Map characters if available
        if (apiData.characters?.edges?.length) {
          mappedData.characters = mapCharacterData(apiData.characters.edges);
        }

        // Map streaming episodes if available
        if (apiData.streamingEpisodes?.length) {
          mappedData.streamingEpisodes = mapEpisodeData(apiData.streamingEpisodes);
        }

      } else if (source === "myanimelist") {
        mappedData = {
          title: apiData.title || apiData.title_english || apiData.title_japanese || "",
          description: apiData.synopsis || "",
          posterUrl: selectBestImageUrl(apiData.images, 'jikan') || "",
          genres: getStringArray(apiData, 'genres', 'name') || [],
          year: apiData.year || (apiData.aired?.from ? new Date(apiData.aired.from).getFullYear() : undefined),
          rating: apiData.score,
          emotionalTags: [],
          trailerUrl: apiData.trailer?.url,
          studios: getStringArray(apiData, 'studios', 'name') || [],
          themes: getStringArray(apiData, 'themes', 'name') || [],
          myAnimeListId: apiData.mal_id,
          totalEpisodes: apiData.episodes,
          episodeDuration: parseInt(apiData.duration) || undefined, // Parse "24 min" format
          airingStatus: apiData.status,
        };

        // Combine themes and demographics for emotional tags
        const themes = getStringArray(apiData, 'themes', 'name') || [];
        const demographics = getStringArray(apiData, 'demographics', 'name') || [];
        mappedData.emotionalTags = [...themes, ...demographics];

        // Map characters if fetched
        if (apiData.characters?.length) {
          mappedData.characters = apiData.characters
            .filter((item: any) => item.character)
            .map((item: any) => ({
              id: item.character.mal_id,
              name: item.character.name,
              imageUrl: item.character.images?.jpg?.image_url,
              role: item.role || "SUPPORTING",
              // MAL has limited character data compared to AniList
            }))
            .slice(0, 25);
        }
      }

      console.log(`[Smart Auto-Fill] Successfully fetched data from ${source}`);
      
      return {
        success: true,
        data: mappedData,
        message: `Successfully fetched anime data from ${source === 'anilist' ? 'AniList' : 'MyAnimeList'}`,
        source: source
      };

    } catch (error: any) {
      console.error(`[Smart Auto-Fill] Error:`, error);
      return {
        success: false,
        message: `Failed to fetch data: ${error.message}`
      };
    }
  }
});

// Batch Smart Auto-Fill - Process multiple anime IDs at once
export const batchSmartAutoFill = action({
  args: {
    ids: v.array(v.object({
      anilistId: v.optional(v.number()),
      myAnimeListId: v.optional(v.number()),
    })),
    createNew: v.boolean(), // Whether to create new anime or just return data
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    message: string;
    results: Array<{
      success: boolean;
      data?: any;
      error?: string;
      anilistId?: number;
      myAnimeListId?: number;
    }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
      created: number;
    };
  }> => {
    if (!args.ids || args.ids.length === 0) {
      return {
        success: false,
        message: "No IDs provided",
        results: [],
        summary: { total: 0, successful: 0, failed: 0, created: 0 }
      };
    }

    const results: Array<{
      success: boolean;
      data?: any;
      error?: string;
      anilistId?: number;
      myAnimeListId?: number;
    }> = [];

    let created = 0;
    const batchSize = 3; // Process 3 at a time to avoid rate limits

    console.log(`[Batch Smart Auto-Fill] Processing ${args.ids.length} anime IDs...`);

    // Process in batches
    for (let i = 0; i < args.ids.length; i += batchSize) {
      const batch = args.ids.slice(i, i + batchSize);
      
      // Process batch in parallel
      const batchPromises = batch.map(async (idPair) => {
        try {
          // Use the existing smartAutoFillByExternalId action
          const result = await ctx.runAction(api.externalApis.smartAutoFillByExternalId, idPair);
          
          if (result.success && result.data && args.createNew) {
            // Check if anime already exists
            const existingAnime = await ctx.runQuery(internal.anime.checkAnimeExistsByExternalIds, {
              anilistId: result.data.anilistId,
              myAnimeListId: result.data.myAnimeListId,
              title: result.data.title
            });

            if (!existingAnime) {
              // Create the anime
              await ctx.runMutation(api.admin.adminCreateAnime, {
                animeData: {
                  title: result.data.title,
                  description: result.data.description,
                  posterUrl: result.data.posterUrl,
                  genres: result.data.genres,
                  year: result.data.year,
                  rating: result.data.rating,
                  emotionalTags: result.data.emotionalTags,
                  trailerUrl: result.data.trailerUrl,
                  studios: result.data.studios,
                  themes: result.data.themes,
                  anilistId: result.data.anilistId,
                  myAnimeListId: result.data.myAnimeListId,
                  totalEpisodes: result.data.totalEpisodes,
                  episodeDuration: result.data.episodeDuration,
                  airingStatus: result.data.airingStatus,
                }
              });
              created++;
              
              return {
                success: true,
                data: result.data,
                anilistId: idPair.anilistId,
                myAnimeListId: idPair.myAnimeListId
              };
            } else {
              return {
                success: false,
                error: "Anime already exists in database",
                data: result.data,
                anilistId: idPair.anilistId,
                myAnimeListId: idPair.myAnimeListId
              };
            }
          }

          return {
            success: result.success,
            data: result.data,
            error: result.success ? undefined : result.message,
            anilistId: idPair.anilistId,
            myAnimeListId: idPair.myAnimeListId
          };
          
        } catch (error: any) {
          console.error(`[Batch Smart Auto-Fill] Error processing ID:`, idPair, error);
          return {
            success: false,
            error: error.message || "Unknown error",
            anilistId: idPair.anilistId,
            myAnimeListId: idPair.myAnimeListId
          };
        }
      });

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Rate limit between batches
      if (i + batchSize < args.ids.length) {
        console.log(`[Batch Smart Auto-Fill] Processed ${i + batchSize}/${args.ids.length}, waiting before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    const message = args.createNew 
      ? `Processed ${args.ids.length} IDs: ${successful} successful, ${failed} failed, ${created} created`
      : `Fetched data for ${successful}/${args.ids.length} anime`;

    console.log(`[Batch Smart Auto-Fill] ${message}`);

    return {
      success: true,
      message,
      results,
      summary: {
        total: args.ids.length,
        successful,
        failed,
        created
      }
    };
  }
});

export const fetchBingeableAnime = action({
  args: { limit: v.optional(v.number()) },
  handler: async (_ctx: ActionCtx, args) => {
    const limit = args.limit ?? 10;
    
    // Query for anime that are specifically good for binge-watching:
    // - Focus on longer series (24+ episodes) or multiple seasons
    // - Prioritize by popularity and episode count rather than just score
    // - Include ongoing series that have substantial content
    // - Target genres that are typically more binge-worthy
    const query = `query ($page:Int,$perPage:Int) { 
      Page(page:$page, perPage:$perPage){ 
        media(
          type: ANIME, 
          sort: [POPULARITY_DESC, EPISODES_DESC],
          episodes_greater: 23,
          averageScore_greater: 60,
          genre_not_in: ["Hentai"]
        ) { 
          id 
          title { romaji } 
          description(asHtml:false) 
          startDate{ year } 
          coverImage{ extraLarge } 
          averageScore 
          genres 
          episodes
          duration
          status
          format
        } 
      } 
    }`;
    
    try {
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { page: 1, perPage: limit * 2 } }) // Fetch more to filter
      });
      
      if (!res.ok) return { animes: [], error: `AniList error ${res.status}` };
      
      const data = await res.json();
      const media = data?.data?.Page?.media || [];
      
      // Filter for series that are particularly good for binge-watching
      const bingeableMedia = media.filter((item: any) => {
        const episodes = item.episodes || 0;
        const genres = item.genres || [];
        const format = item.format || '';
        
        // Prioritize series with substantial episode counts
        if (episodes < 24) return false;
        
        // Focus on TV series format (not movies or OVAs)
        if (format !== 'TV') return false;
        
        // Prefer genres that are typically more binge-worthy
        const bingeableGenres = [
          'Action', 'Adventure', 'Drama', 'Fantasy', 'Mystery', 
          'Psychological', 'Romance', 'Sci-Fi', 'Supernatural', 
          'Thriller', 'Sports', 'Slice of Life'
        ];
        
        const hasBingeableGenre = genres.some((genre: string) => 
          bingeableGenres.includes(genre)
        );
        
        return hasBingeableGenre;
      }).slice(0, limit);
      
      const animes = bingeableMedia.map((item: any) => ({
        title: item.title?.romaji || 'Unknown',
        description: item.description || '',
        posterUrl: item.coverImage?.extraLarge || '',
        genres: item.genres || [],
        year: item.startDate?.year || undefined,
        rating: typeof item.averageScore === 'number' ? item.averageScore / 10 : undefined,
        emotionalTags: [],
        trailerUrl: '',
        studios: [],
        themes: [],
        reasoning: `Great for binge-watching (${item.episodes} episodes)`,
        moodMatchScore: item.averageScore ? item.averageScore / 10 : 0,
        _id: undefined,
        foundInDatabase: false
      })) as AnimeRecommendation[];
      
      return { animes };
    } catch (e: any) {
      return { animes: [], error: e.message };
    }
  }
});

export const fetchRetroClassicAnime = action({
  args: { limit: v.optional(v.number()) },
  handler: async (_ctx: ActionCtx, args) => {
    const limit = args.limit ?? 10;
    
    // Query for classic/retro anime:
    // - Focus on anime from 1980s to early 2000s
    // - High ratings to ensure they're true classics
    // - Sort by score to get the best classic anime
    const query = `query ($page:Int,$perPage:Int) { 
      Page(page:$page, perPage:$perPage){ 
        media(
          type: ANIME, 
          sort: [SCORE_DESC, FAVOURITES_DESC],
          startDate_greater: 19800101,
          startDate_lesser: 20050101,
          averageScore_greater: 70,
          genre_not_in: ["Hentai"]
        ) { 
          id 
          title { romaji } 
          description(asHtml:false) 
          startDate{ year } 
          coverImage{ extraLarge } 
          averageScore 
          genres 
          episodes
          duration
          status
          format
        } 
      } 
    }`;
    
    try {
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { page: 1, perPage: limit } })
      });
      
      if (!res.ok) return { animes: [], error: `AniList error ${res.status}` };
      
      const data = await res.json();
      const media = data?.data?.Page?.media || [];
      
      const animes = media.map((item: any) => ({
        title: item.title?.romaji || 'Unknown',
        description: item.description || '',
        posterUrl: item.coverImage?.extraLarge || '',
        genres: item.genres || [],
        year: item.startDate?.year || undefined,
        rating: typeof item.averageScore === 'number' ? item.averageScore / 10 : undefined,
        emotionalTags: [],
        trailerUrl: '',
        studios: [],
        themes: [],
        reasoning: `Classic anime from ${item.startDate?.year || 'the golden era'}`,
        moodMatchScore: item.averageScore ? item.averageScore / 10 : 0,
        _id: undefined,
        foundInDatabase: false
      })) as AnimeRecommendation[];
      
      return { animes };
    } catch (e: any) {
      return { animes: [], error: e.message };
    }
  }
});

export const fetchHorrorAnime = action({
  args: { limit: v.optional(v.number()) },
  handler: async (_ctx: ActionCtx, args) => {
    const limit = args.limit ?? 10;
    
    // Query for horror anime:
    // - Focus on Horror genre and related dark/scary genres
    // - Sort by score and popularity to get quality horror anime
    // - Include Psychological, Supernatural, Thriller for broader horror content
    const query = `query ($page:Int,$perPage:Int) { 
      Page(page:$page, perPage:$perPage){ 
        media(
          type: ANIME, 
          sort: [SCORE_DESC, POPULARITY_DESC],
          genre_in: ["Horror", "Supernatural", "Psychological", "Thriller"],
          averageScore_greater: 60,
          genre_not_in: ["Hentai"]
        ) { 
          id 
          title { romaji } 
          description(asHtml:false) 
          startDate{ year } 
          coverImage{ extraLarge } 
          averageScore 
          genres 
          episodes
          duration
          status
          format
        } 
      } 
    }`;
    
    try {
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { page: 1, perPage: limit * 2 } }) // Fetch more to filter
      });
      
      if (!res.ok) return { animes: [], error: `AniList error ${res.status}` };
      
      const data = await res.json();
      const media = data?.data?.Page?.media || [];
      
      // Filter to prioritize true horror content
      const horrorMedia = media.filter((item: any) => {
        const genres = item.genres || [];
        
        // Prioritize anime with explicit Horror genre
        if (genres.includes('Horror')) return true;
        
        // Include dark supernatural/psychological content
        const darkGenres = ['Supernatural', 'Psychological', 'Thriller'];
        const hasDarkGenre = genres.some((genre: string) => darkGenres.includes(genre));
        
        // Also check for horror-related terms in description
        const description = (item.description || '').toLowerCase();
        const horrorKeywords = ['horror', 'scary', 'ghost', 'demon', 'monster', 'nightmare', 'terror', 'dark', 'creepy'];
        const hasHorrorKeywords = horrorKeywords.some(keyword => description.includes(keyword));
        
        return hasDarkGenre && (hasHorrorKeywords || genres.includes('Psychological'));
      }).slice(0, limit);
      
      const animes = horrorMedia.map((item: any) => ({
        title: item.title?.romaji || 'Unknown',
        description: item.description || '',
        posterUrl: item.coverImage?.extraLarge || '',
        genres: item.genres || [],
        year: item.startDate?.year || undefined,
        rating: typeof item.averageScore === 'number' ? item.averageScore / 10 : undefined,
        emotionalTags: [],
        trailerUrl: '',
        studios: [],
        themes: [],
        reasoning: `Spine-chilling horror anime`,
        moodMatchScore: item.averageScore ? item.averageScore / 10 : 0,
        _id: undefined,
        foundInDatabase: false
      })) as AnimeRecommendation[];
      
      return { animes };
    } catch (e: any) {
      return { animes: [], error: e.message };
    }
  }
});

export const fetchTrueCrimeAnime = action({
  args: { limit: v.optional(v.number()) },
  handler: async (_ctx: ActionCtx, args) => {
    const limit = args.limit ?? 10;
    
    // Query for true crime anime:
    // - Focus on Crime, Mystery, Detective, and Psychological genres
    // - Target realistic crime stories rather than fantasy
    // - Sort by score to get quality crime anime
    const query = `query ($page:Int,$perPage:Int) { 
      Page(page:$page, perPage:$perPage){ 
        media(
          type: ANIME, 
          sort: [SCORE_DESC, POPULARITY_DESC],
          genre_in: ["Mystery", "Psychological", "Thriller"],
          averageScore_greater: 65,
          genre_not_in: ["Hentai", "Supernatural", "Magic"]
        ) { 
          id 
          title { romaji } 
          description(asHtml:false) 
          startDate{ year } 
          coverImage{ extraLarge } 
          averageScore 
          genres 
          episodes
          duration
          status
          format
        } 
      } 
    }`;
    
    try {
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { page: 1, perPage: limit * 3 } }) // Fetch more to filter
      });
      
      if (!res.ok) return { animes: [], error: `AniList error ${res.status}` };
      
      const data = await res.json();
      const media = data?.data?.Page?.media || [];
      
      // Filter to prioritize realistic crime/detective content
      const crimeMedia = media.filter((item: any) => {
        const genres = item.genres || [];
        const description = (item.description || '').toLowerCase();
        
        // Look for crime/detective keywords in description
        const crimeKeywords = [
          'detective', 'police', 'investigation', 'murder', 'crime', 'criminal', 
          'case', 'solve', 'mystery', 'killer', 'serial', 'forensic', 'law enforcement',
          'prosecutor', 'court', 'justice', 'evidence', 'suspect', 'victim'
        ];
        
        const hasCrimeKeywords = crimeKeywords.some(keyword => description.includes(keyword));
        
        // Exclude fantasy/supernatural elements
        const fantasyKeywords = ['magic', 'demon', 'ghost', 'supernatural', 'fantasy', 'powers', 'abilities'];
        const hasFantasyElements = fantasyKeywords.some(keyword => description.includes(keyword)) || 
                                  genres.some((genre: string) => ['Fantasy', 'Supernatural', 'Magic'].includes(genre));
        
        // Must have crime elements and not be fantasy
        return hasCrimeKeywords && !hasFantasyElements && 
               (genres.includes('Mystery') || genres.includes('Psychological') || genres.includes('Thriller'));
      }).slice(0, limit);
      
      const animes = crimeMedia.map((item: any) => ({
        title: item.title?.romaji || 'Unknown',
        description: item.description || '',
        posterUrl: item.coverImage?.extraLarge || '',
        genres: item.genres || [],
        year: item.startDate?.year || undefined,
        rating: typeof item.averageScore === 'number' ? item.averageScore / 10 : undefined,
        emotionalTags: [],
        trailerUrl: '',
        studios: [],
        themes: [],
        reasoning: `Gripping crime investigation anime`,
        moodMatchScore: item.averageScore ? item.averageScore / 10 : 0,
        _id: undefined,
        foundInDatabase: false
      })) as AnimeRecommendation[];
      
      return { animes };
    } catch (e: any) {
      return { animes: [], error: e.message };
    }
  }
});

// Internal function for cron job to refresh Studio Ghibli cache
export const refreshStudioGhibliCache = internalAction({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    animeCount: v.number()
  }),
  handler: async (ctx, args): Promise<{ success: boolean; message: string; animeCount: number }> => {
    try {
      console.log('[Studio Ghibli Cache] Starting scheduled refresh...');
      
      const result = await ctx.runAction(api.externalApis.fetchStudioGhibliAnime, { limit: 100 });
      
      if (result.error) {
        console.error('[Studio Ghibli Cache] Refresh failed:', result.error);
        return {
          success: false,
          message: `Cache refresh failed: ${result.error}`,
          animeCount: 0
        };
      }
      
      const animeCount = result.animes?.length || 0;
      console.log(`[Studio Ghibli Cache] Successfully refreshed cache with ${animeCount} anime`);
      
      return {
        success: true,
        message: `Successfully refreshed Studio Ghibli cache with ${animeCount} anime`,
        animeCount
      };
      
    } catch (error: any) {
      console.error('[Studio Ghibli Cache] Unexpected error:', error);
      return {
        success: false,
        message: `Cache refresh error: ${error.message}`,
        animeCount: 0
      };
    }
  }
});

// Internal function for cron job to refresh Madhouse cache
export const refreshMadhouseCache = internalAction({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    animeCount: v.number()
  }),
  handler: async (ctx, args): Promise<{ success: boolean; message: string; animeCount: number }> => {
    try {
      console.log('[Madhouse Cache] Starting scheduled refresh...');
      
      const result = await ctx.runAction(api.externalApis.fetchMadhouseAnime, { limit: 100 });
      
      if (result.error) {
        console.error('[Madhouse Cache] Refresh failed:', result.error);
        return {
          success: false,
          message: `Cache refresh failed: ${result.error}`,
          animeCount: 0
        };
      }
      
      const animeCount = result.animes?.length || 0;
      console.log(`[Madhouse Cache] Successfully refreshed cache with ${animeCount} anime`);
      
      return {
        success: true,
        message: `Successfully refreshed Madhouse cache with ${animeCount} anime`,
        animeCount
      };
      
    } catch (error: any) {
      console.error('[Madhouse Cache] Unexpected error:', error);
      return {
        success: false,
        message: `Cache refresh error: ${error.message}`,
        animeCount: 0
      };
    }
  }
});

export const fetchMadhouseAnime = action({
  args: { limit: v.optional(v.number()) },
  handler: async (_ctx: ActionCtx, args) => {
    const limit = args.limit ?? 100;
    
    console.log(`[Madhouse] Starting comprehensive fetch with limit: ${limit}`);
    
    let allMadhouseAnime: AnimeRecommendation[] = [];
    const seenTitles = new Set<string>();
    
    // Helper function to add unique anime
    const addUniqueAnime = (animes: AnimeRecommendation[]) => {
      animes.forEach(anime => {
        const normalizedTitle = anime.title.toLowerCase().trim();
        if (!seenTitles.has(normalizedTitle)) {
          seenTitles.add(normalizedTitle);
          allMadhouseAnime.push(anime);
        }
      });
    };
    
        // 1. AniList - Search for famous Madhouse titles
    try {
      console.log(`[Madhouse] Fetching from AniList...`);
      
      const famousTitles = [
        "Death Note", "One Punch Man", "Hunter x Hunter", "Monster", "Parasyte", 
        "Overlord", "No Game No Life", "Trigun", "Black Lagoon", "Perfect Blue"
      ];

      for (const title of famousTitles) {
        try {
          const titleQuery = `query ($search: String) { 
            Page(page: 1, perPage: 3) { 
              media(type: ANIME, search: $search, sort: [SCORE_DESC]) { 
                id title { romaji english native } description(asHtml:false) 
                startDate{ year month day } coverImage{ extraLarge large medium } 
                averageScore genres episodes duration status format
                studios { edges { node { name } isMain } }
                trailer { id site }
              } 
            } 
          }`;

          const titleRes = await fetchWithTimeout('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: titleQuery, variables: { search: title } }),
            timeout: DEFAULT_TIMEOUT_MS
          });

          if (titleRes.ok) {
            const titleData = await titleRes.json();
            const titleMedia = titleData?.data?.Page?.media || [];
            
            // Filter for Madhouse productions
            const madhouseMedia = titleMedia.filter((item: any) => {
              const studios = item.studios?.edges?.map((edge: any) => edge.node.name.toLowerCase()) || [];
              return studios.some((studio: string) => studio.includes('madhouse'));
            });

            const titleAnimes = madhouseMedia.map((item: any) => ({
              title: item.title?.english || item.title?.romaji || item.title?.native || 'Unknown',
              description: item.description || '',
              posterUrl: item.coverImage?.extraLarge || item.coverImage?.large || item.coverImage?.medium || '',
              genres: item.genres || [],
              year: item.startDate?.year || undefined,
              rating: typeof item.averageScore === 'number' ? item.averageScore / 10 : undefined,
              emotionalTags: [],
              trailerUrl: item.trailer?.site === "youtube" && item.trailer?.id 
                ? `https://www.youtube.com/watch?v=${item.trailer.id}` : '',
              studios: item.studios?.edges?.map((edge: any) => edge.node.name).filter(Boolean) || ['Madhouse'],
              themes: [],
              reasoning: `High-quality Madhouse production`,
              moodMatchScore: item.averageScore ? item.averageScore / 10 : 8.0,
              _id: undefined,
              foundInDatabase: false,
              anilistId: item.id
            })) as AnimeRecommendation[];

            addUniqueAnime(titleAnimes);
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (e) {
          console.error(`[Madhouse] Error fetching ${title}:`, e);
        }
      }

      console.log(`[Madhouse] AniList search found ${allMadhouseAnime.length} works after individual searches`);
      
    } catch (e: any) {
      console.error(`[Madhouse] AniList error:`, e.message);
    }
    
    // 2. Jikan (MyAnimeList) API - Multiple Madhouse searches
    try {
      console.log(`[Madhouse] Fetching from Jikan...`);
      
      // Search 1: Producer ID for Madhouse
      const jikanUrl1 = `https://api.jikan.moe/v4/anime?producers=11&order_by=score&sort=desc&limit=25`;
      const jikanRes1 = await fetchWithTimeout(jikanUrl1, { timeout: DEFAULT_TIMEOUT_MS });
      
      if (jikanRes1.ok) {
        const jikanData1 = await jikanRes1.json();
        const animeList1 = jikanData1?.data || [];
        
        const animes1 = animeList1.map((item: any) => ({
          title: item.title || item.title_english || item.title_japanese || 'Unknown',
          description: item.synopsis || '',
          posterUrl: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || item.images?.webp?.large_image_url || item.images?.webp?.image_url || '',
          genres: getStringArray(item, 'genres', 'name') || [],
          year: item.year || (item.aired?.from ? new Date(item.aired.from).getFullYear() : undefined),
          rating: item.score || undefined,
          emotionalTags: [],
          trailerUrl: item.trailer?.url || '',
          studios: getStringArray(item, 'studios', 'name') || ['Madhouse'],
          themes: getStringArray(item, 'themes', 'name') || [],
          reasoning: `High-quality Madhouse production`,
          moodMatchScore: item.score || 8.0,
          _id: undefined,
          foundInDatabase: false,
          malId: item.mal_id
        })) as AnimeRecommendation[];
        
        addUniqueAnime(animes1);
        console.log(`[Madhouse] Jikan producer search found ${animes1.length} works`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Search 2: Text search for "Madhouse"
      const jikanUrl2 = `https://api.jikan.moe/v4/anime?q=madhouse&order_by=score&sort=desc&limit=25`;
      const jikanRes2 = await fetchWithTimeout(jikanUrl2, { timeout: DEFAULT_TIMEOUT_MS });
      
      if (jikanRes2.ok) {
        const jikanData2 = await jikanRes2.json();
        const animeList2 = jikanData2?.data || [];
        
        // Filter for actual Madhouse productions
        const madhouseAnimes = animeList2.filter((item: any) => {
          const studios = getStringArray(item, 'studios', 'name') || [];
          return studios.some((studio: string) => studio.toLowerCase().includes('madhouse'));
        });
        
        const animes2 = madhouseAnimes.map((item: any) => ({
          title: item.title || item.title_english || item.title_japanese || 'Unknown',
          description: item.synopsis || '',
          posterUrl: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || item.images?.webp?.large_image_url || item.images?.webp?.image_url || '',
          genres: getStringArray(item, 'genres', 'name') || [],
          year: item.year || (item.aired?.from ? new Date(item.aired.from).getFullYear() : undefined),
          rating: item.score || undefined,
          emotionalTags: [],
          trailerUrl: item.trailer?.url || '',
          studios: getStringArray(item, 'studios', 'name') || ['Madhouse'],
          themes: getStringArray(item, 'themes', 'name') || [],
          reasoning: `High-quality Madhouse production`,
          moodMatchScore: item.score || 8.0,
          _id: undefined,
          foundInDatabase: false,
          malId: item.mal_id
        })) as AnimeRecommendation[];
        
        addUniqueAnime(animes2);
        console.log(`[Madhouse] Jikan query search found ${animes2.length} works`);
      }
      
    } catch (e: any) {
      console.error(`[Madhouse] Jikan error:`, e.message);
    }
    
    // 3. Hardcoded list of famous Madhouse anime
    try {
      console.log(`[Madhouse] Adding famous Madhouse works...`);
      
      const famousMadhouseList = [
        // Iconic Series
        { title: "Death Note", year: 2006, rating: 9.0, genres: ["Supernatural", "Thriller", "Psychological"], description: "A high school student discovers a supernatural notebook that allows him to kill anyone by writing their name in it." },
        { title: "One Punch Man", year: 2015, rating: 8.7, genres: ["Action", "Comedy", "Superhero"], description: "A superhero who can defeat any enemy with a single punch struggles with the mundane problems that come with his overwhelming power." },
        { title: "Hunter x Hunter (2011)", year: 2011, rating: 9.0, genres: ["Adventure", "Fantasy", "Action"], description: "A young boy named Gon discovers that his father, who left him at a young age, is actually a world-renowned Hunter." },
        { title: "Parasyte -the maxim-", year: 2014, rating: 8.3, genres: ["Horror", "Sci-Fi", "Psychological"], description: "A teenager must coexist with a parasitic alien that failed to take over his brain." },
        { title: "Monster", year: 2004, rating: 9.0, genres: ["Drama", "Mystery", "Psychological"], description: "A Japanese surgeon living in Germany finds his life destroyed after saving the life of a young boy." },
        { title: "Overlord", year: 2015, rating: 7.9, genres: ["Fantasy", "Adventure", "Isekai"], description: "A powerful wizard is trapped in a virtual reality game and decides to conquer this new world." },
        { title: "No Game No Life", year: 2014, rating: 8.1, genres: ["Comedy", "Fantasy", "Isekai"], description: "Two shut-in siblings are transported to a world where everything is decided by games." },
        { title: "Trigun", year: 1998, rating: 8.2, genres: ["Action", "Adventure", "Sci-Fi"], description: "A gunman with a $$60 billion bounty on his head tries to live peacefully in a desert world." },
        { title: "Chihayafuru", year: 2011, rating: 8.2, genres: ["Drama", "Sports", "Josei"], description: "A high school girl becomes passionate about the competitive card game karuta." },
        { title: "Hellsing Ultimate", year: 2006, rating: 8.2, genres: ["Action", "Horror", "Supernatural"], description: "The Hellsing Organization fights supernatural threats to England using their own supernatural agents." },
        
        // Classic Works
        { title: "Perfect Blue", year: 1997, rating: 8.0, genres: ["Psychological", "Thriller"], description: "A pop singer's reality becomes increasingly distorted as she transitions to acting." },
        { title: "Paprika", year: 2006, rating: 7.7, genres: ["Sci-Fi", "Thriller", "Fantasy"], description: "A device that allows therapists to enter patients' dreams is stolen and used for sinister purposes." },
        { title: "Tokyo Godfathers", year: 2003, rating: 7.8, genres: ["Adventure", "Comedy", "Drama"], description: "Three homeless people find an abandoned baby on Christmas Eve and search for its parents." },
        { title: "Millennium Actress", year: 2001, rating: 7.8, genres: ["Drama", "Romance"], description: "A documentary filmmaker interviews a reclusive actress about her career and life." },
        { title: "Black Lagoon", year: 2006, rating: 8.0, genres: ["Action", "Crime"], description: "A Japanese businessman joins a group of modern-day pirates in Southeast Asia." },
        { title: "Claymore", year: 2007, rating: 7.6, genres: ["Action", "Fantasy", "Supernatural"], description: "Half-human, half-demon warriors called Claymores fight against demons called Yoma." },
        { title: "Hajime no Ippo", year: 2000, rating: 8.7, genres: ["Sports", "Boxing", "Drama"], description: "A shy high school student discovers boxing and begins training to become a professional boxer." },
        { title: "Card Captor Sakura", year: 1998, rating: 8.0, genres: ["Adventure", "Comedy", "Fantasy"], description: "A young girl must capture magical cards that have escaped from a mysterious book." },
        { title: "Vampire Knight", year: 2008, rating: 6.8, genres: ["Romance", "Supernatural", "Vampire"], description: "A girl attends a boarding school where vampires and humans coexist." },
        { title: "NANA", year: 2006, rating: 8.4, genres: ["Drama", "Romance", "Music"], description: "Two young women with the same name become roommates and navigate love and friendship in Tokyo." },
        
        // Recent Works
        { title: "Sonny Boy", year: 2021, rating: 7.6, genres: ["Supernatural", "Drama", "School"], description: "Students and their school are transported to a dimension with supernatural powers." },
        { title: "Frieren: Beyond Journey's End", year: 2023, rating: 9.3, genres: ["Adventure", "Drama", "Fantasy"], description: "An elf mage reflects on her adventures and relationships after her hero companion's death." },
        { title: "Pluto", year: 2023, rating: 8.9, genres: ["Drama", "Mystery", "Sci-Fi"], description: "A detective investigates a series of murders involving both humans and robots." },
        { title: "Takt Op. Destiny", year: 2021, rating: 7.0, genres: ["Action", "Music", "Supernatural"], description: "Humans fight alien invaders using the power of classical music." },
        { title: "High School of the Dead", year: 2010, rating: 7.1, genres: ["Action", "Horror", "Ecchi"], description: "High school students fight for survival during a zombie apocalypse." }
      ];
      
      const hardcodedAnimes = famousMadhouseList.map((item) => ({
        title: item.title,
        description: item.description,
        posterUrl: '', // Will be enhanced with real posters via external API
        genres: item.genres,
        year: item.year,
        rating: item.rating,
        emotionalTags: [],
        trailerUrl: '',
        studios: ['Madhouse'],
        themes: [],
        reasoning: `High-quality Madhouse production`,
        moodMatchScore: item.rating,
        _id: undefined,
        foundInDatabase: false
      })) as AnimeRecommendation[];

      // Enhance hardcoded entries with real posters from external APIs
      for (const anime of hardcodedAnimes) {
        try {
          const posterUrl = await fetchPosterWithFallbacks(anime.title, undefined, true);
          if (posterUrl) {
            anime.posterUrl = posterUrl;
          } else {
            // Fallback to placeholder only if no real poster found
            anime.posterUrl = `https://placehold.co/600x900/ff6b6b/ffffff/png?text=${encodeURIComponent(anime.title.substring(0, 20))}&font=roboto`;
          }
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (e) {
          console.error(`[Madhouse] Error fetching poster for ${anime.title}:`, e);
          anime.posterUrl = `https://placehold.co/600x900/ff6b6b/ffffff/png?text=${encodeURIComponent(anime.title.substring(0, 20))}&font=roboto`;
        }
      }
      
      addUniqueAnime(hardcodedAnimes);
      console.log(`[Madhouse] Added ${hardcodedAnimes.length} hardcoded works`);
      
    } catch (e: any) {
      console.error(`[Madhouse] Hardcoded list error:`, e.message);
    }
    
    // Sort by rating and year
    allMadhouseAnime.sort((a, b) => {
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      if (ratingA !== ratingB) return ratingB - ratingA;
      return (b.year || 0) - (a.year || 0);
    });
    
    const finalAnimes = allMadhouseAnime.slice(0, limit);
    
    console.log(`[Madhouse] ✅ Final collection: ${finalAnimes.length} unique Madhouse works`);
    
    if (finalAnimes.length === 0) {
      return { 
        animes: [], 
        error: "Unable to fetch Madhouse anime from any source. Please try again later." 
      };
    }
    
    return { animes: finalAnimes };
  }
});

// Internal function for cron job to refresh MAPPA cache
export const refreshMappaCache = internalAction({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    animeCount: v.number()
  }),
  handler: async (ctx, args): Promise<{ success: boolean; message: string; animeCount: number }> => {
    try {
      console.log('[MAPPA Cache] Starting scheduled refresh...');
      
      const result = await ctx.runAction(api.externalApis.fetchMappaAnime, { limit: 100 });
      
      if (result.error) {
        console.error('[MAPPA Cache] Refresh failed:', result.error);
        return {
          success: false,
          message: `Cache refresh failed: ${result.error}`,
          animeCount: 0
        };
      }
      
      const animeCount = result.animes?.length || 0;
      console.log(`[MAPPA Cache] Successfully refreshed cache with ${animeCount} anime`);
      
      return {
        success: true,
        message: `Successfully refreshed MAPPA cache with ${animeCount} anime`,
        animeCount
      };
      
    } catch (error: any) {
      console.error('[MAPPA Cache] Unexpected error:', error);
      return {
        success: false,
        message: `Cache refresh error: ${error.message}`,
        animeCount: 0
      };
    }
  }
});

export const fetchStudioGhibliAnime = action({
  args: { limit: v.optional(v.number()) },
  handler: async (_ctx: ActionCtx, args) => {
    const limit = args.limit ?? 100; // Increased limit for comprehensive collection
    
    console.log(`[Studio Ghibli] Starting comprehensive fetch with limit: ${limit}`);
    
    let allGhibliAnime: AnimeRecommendation[] = [];
    const seenTitles = new Set<string>(); // Prevent duplicates
    
    // Helper function to add unique anime
    const addUniqueAnime = (animes: AnimeRecommendation[]) => {
      animes.forEach(anime => {
        const normalizedTitle = anime.title.toLowerCase().trim();
        if (!seenTitles.has(normalizedTitle)) {
          seenTitles.add(normalizedTitle);
          allGhibliAnime.push(anime);
        }
      });
    };
    
    // 1. AniList - Multiple search approaches
    try {
      console.log(`[Studio Ghibli] Fetching from AniList...`);
      
      // 1a. Search by "studio ghibli"
      const searchQuery1 = `query ($page:Int,$perPage:Int) { 
        Page(page:$page, perPage:$perPage){ 
          media(
            type: ANIME, 
            sort: [SCORE_DESC, POPULARITY_DESC],
            search: "studio ghibli",
            genre_not_in: ["Hentai"]
          ) { 
            id title { romaji english native } description(asHtml:false) 
            startDate{ year month day } coverImage{ extraLarge large medium } 
            averageScore genres episodes duration status format
            studios { edges { node { name } isMain } }
            trailer { id site }
          } 
        } 
      }`;
      
      const res1 = await fetchWithTimeout('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery1, variables: { page: 1, perPage: 50 } }),
        timeout: DEFAULT_TIMEOUT_MS
      });
      
      if (res1.ok) {
        const data1 = await res1.json();
        const media1 = data1?.data?.Page?.media || [];
        const ghibliMedia1 = media1.filter((item: any) => {
          const studios = item.studios?.edges?.map((edge: any) => edge.node.name.toLowerCase()) || [];
          return studios.some((studio: string) => studio.includes('ghibli'));
        });
        
        const animes1 = ghibliMedia1.map((item: any) => ({
          title: item.title?.english || item.title?.romaji || item.title?.native || 'Unknown',
          description: item.description || '',
          posterUrl: item.coverImage?.extraLarge || item.coverImage?.large || item.coverImage?.medium || '',
          genres: item.genres || [],
          year: item.startDate?.year || undefined,
          rating: typeof item.averageScore === 'number' ? item.averageScore / 10 : undefined,
          emotionalTags: [],
          trailerUrl: item.trailer?.site === "youtube" && item.trailer?.id 
            ? `https://www.youtube.com/watch?v=${item.trailer.id}` : '',
          studios: item.studios?.edges?.map((edge: any) => edge.node.name).filter(Boolean) || ['Studio Ghibli'],
          themes: [],
          reasoning: `Magical Studio Ghibli masterpiece`,
          moodMatchScore: item.averageScore ? item.averageScore / 10 : 8.0,
          _id: undefined,
          foundInDatabase: false,
          anilistId: item.id
        })) as AnimeRecommendation[];
        
        addUniqueAnime(animes1);
        console.log(`[Studio Ghibli] AniList search 1 found ${animes1.length} works`);
      }
      
      // 1b. Search individual famous titles
      const famousTitles = [
        "spirited away", "princess mononoke", "my neighbor totoro", "howl's moving castle",
        "castle in the sky", "kiki's delivery service", "ponyo", "the wind rises",
        "grave of the fireflies", "nausicaa", "porco rosso", "whisper of the heart",
        "the cat returns", "tales from earthsea", "arrietty", "from up on poppy hill",
        "the tale of princess kaguya", "when marnie was there", "earwig and the witch"
      ];
      
      for (const title of famousTitles.slice(0, 10)) { // Limit to avoid too many requests
        try {
          const titleQuery = `query { 
            Media(search: "${title}", type: ANIME) { 
              id title { romaji english native } description(asHtml:false) 
              startDate{ year } coverImage{ extraLarge large medium } 
              averageScore genres episodes duration status format
              studios { edges { node { name } isMain } }
              trailer { id site }
            } 
          }`;
          
          const titleRes = await fetchWithTimeout('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: titleQuery }),
            timeout: 5000
          });
          
          if (titleRes.ok) {
            const titleData = await titleRes.json();
            const media = titleData?.data?.Media;
            if (media) {
              const studios = media.studios?.edges?.map((edge: any) => edge.node.name.toLowerCase()) || [];
              if (studios.some((studio: string) => studio.includes('ghibli'))) {
                const anime = {
                  title: media.title?.english || media.title?.romaji || media.title?.native || 'Unknown',
                  description: media.description || '',
                  posterUrl: media.coverImage?.extraLarge || media.coverImage?.large || media.coverImage?.medium || '',
                  genres: media.genres || [],
                  year: media.startDate?.year || undefined,
                  rating: typeof media.averageScore === 'number' ? media.averageScore / 10 : undefined,
                  emotionalTags: [],
                  trailerUrl: media.trailer?.site === "youtube" && media.trailer?.id 
                    ? `https://www.youtube.com/watch?v=${media.trailer.id}` : '',
                  studios: media.studios?.edges?.map((edge: any) => edge.node.name).filter(Boolean) || ['Studio Ghibli'],
                  themes: [],
                  reasoning: `Magical Studio Ghibli masterpiece`,
                  moodMatchScore: media.averageScore ? media.averageScore / 10 : 8.0,
                  _id: undefined,
                  foundInDatabase: false,
                  anilistId: media.id
                } as AnimeRecommendation;
                
                addUniqueAnime([anime]);
              }
            }
          }
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (e) {
          console.log(`[Studio Ghibli] Failed to fetch ${title}:`, e);
        }
      }
      
    } catch (e: any) {
      console.error(`[Studio Ghibli] AniList error:`, e.message);
    }
    
    // 2. Jikan (MyAnimeList) API - Multiple approaches
    try {
      console.log(`[Studio Ghibli] Fetching from Jikan...`);
      
      // 2a. Search by producer (Studio Ghibli producer ID: 21)
      const jikanUrl1 = `https://api.jikan.moe/v4/anime?producer=21&order_by=score&sort=desc&limit=25`;
      const jikanRes1 = await fetchWithTimeout(jikanUrl1, { timeout: DEFAULT_TIMEOUT_MS });
      
      if (jikanRes1.ok) {
        const jikanData1 = await jikanRes1.json();
        const animeList1 = jikanData1?.data || [];
        
        const animes1 = animeList1.map((item: any) => ({
          title: item.title || item.title_english || item.title_japanese || 'Unknown',
          description: item.synopsis || '',
          posterUrl: selectBestImageUrl(item.images, 'jikan') || '',
          genres: getStringArray(item, 'genres', 'name') || [],
          year: item.year || (item.aired?.from ? new Date(item.aired.from).getFullYear() : undefined),
          rating: item.score || undefined,
          emotionalTags: [],
          trailerUrl: item.trailer?.url || '',
          studios: getStringArray(item, 'studios', 'name') || ['Studio Ghibli'],
          themes: getStringArray(item, 'themes', 'name') || [],
          reasoning: `Magical Studio Ghibli masterpiece`,
          moodMatchScore: item.score || 8.0,
          _id: undefined,
          foundInDatabase: false,
          malId: item.mal_id
        })) as AnimeRecommendation[];
        
        addUniqueAnime(animes1);
        console.log(`[Studio Ghibli] Jikan producer search found ${animes1.length} works`);
      }
      
      // 2b. Search by query
      const jikanUrl2 = `https://api.jikan.moe/v4/anime?q=ghibli&order_by=score&sort=desc&limit=25`;
      const jikanRes2 = await fetchWithTimeout(jikanUrl2, { timeout: DEFAULT_TIMEOUT_MS });
      
      if (jikanRes2.ok) {
        const jikanData2 = await jikanRes2.json();
        const animeList2 = jikanData2?.data || [];
        
        // Filter for actual Ghibli works
        const ghibliList2 = animeList2.filter((item: any) => {
          const studios = getStringArray(item, 'studios', 'name') || [];
          return studios.some((studio: string) => studio.toLowerCase().includes('ghibli'));
        });
        
        const animes2 = ghibliList2.map((item: any) => ({
          title: item.title || item.title_english || item.title_japanese || 'Unknown',
          description: item.synopsis || '',
          posterUrl: selectBestImageUrl(item.images, 'jikan') || '',
          genres: getStringArray(item, 'genres', 'name') || [],
          year: item.year || (item.aired?.from ? new Date(item.aired.from).getFullYear() : undefined),
          rating: item.score || undefined,
          emotionalTags: [],
          trailerUrl: item.trailer?.url || '',
          studios: getStringArray(item, 'studios', 'name') || ['Studio Ghibli'],
          themes: getStringArray(item, 'themes', 'name') || [],
          reasoning: `Magical Studio Ghibli masterpiece`,
          moodMatchScore: item.score || 8.0,
          _id: undefined,
          foundInDatabase: false,
          malId: item.mal_id
        })) as AnimeRecommendation[];
        
        addUniqueAnime(animes2);
        console.log(`[Studio Ghibli] Jikan query search found ${animes2.length} works`);
      }
      
    } catch (e: any) {
      console.error(`[Studio Ghibli] Jikan error:`, e.message);
    }
    
    // 3. Comprehensive hardcoded list of ALL Studio Ghibli works
    try {
      console.log(`[Studio Ghibli] Adding comprehensive hardcoded list...`);
      
      const completeGhibliList = [
        // Major Films
        { title: "Spirited Away", year: 2001, rating: 9.3, genres: ["Adventure", "Family", "Drama"], description: "A 10-year-old girl enters a world ruled by gods and witches where humans are changed into beasts." },
        { title: "Princess Mononoke", year: 1997, rating: 8.4, genres: ["Adventure", "Drama", "Fantasy"], description: "On a journey to find the cure for a Tatarigami's curse, Ashitaka finds himself in the middle of a war between the forest gods and Tatara." },
        { title: "My Neighbor Totoro", year: 1988, rating: 8.2, genres: ["Adventure", "Family", "Fantasy"], description: "When two girls move to the country to be near their ailing mother, they have adventures with the wondrous forest spirits who live nearby." },
        { title: "Howl's Moving Castle", year: 2004, rating: 8.2, genres: ["Adventure", "Family", "Fantasy"], description: "When an unconfident young woman is cursed with an old body by a spiteful witch, her only chance of breaking the spell lies with a self-indulgent yet insecure young wizard." },
        { title: "Castle in the Sky", year: 1986, rating: 8.0, genres: ["Adventure", "Family", "Fantasy"], description: "A young boy and a girl with a magic crystal must race against pirates and foreign agents in a search for a legendary floating castle." },
        { title: "Kiki's Delivery Service", year: 1989, rating: 7.8, genres: ["Adventure", "Family", "Drama"], description: "A young witch, on her mandatory year of independent life, finds fitting into a new community difficult while she supports herself by running an air courier service." },
        { title: "Ponyo", year: 2008, rating: 7.7, genres: ["Adventure", "Family", "Fantasy"], description: "A five-year-old boy develops a relationship with Ponyo, a young goldfish princess who longs to become a human after falling in love with him." },
        { title: "The Wind Rises", year: 2013, rating: 7.8, genres: ["Adventure", "Biography", "Drama"], description: "A look at the life of Jiro Horikoshi, the man who designed Japanese fighter planes during World War II." },
        { title: "Grave of the Fireflies", year: 1988, rating: 8.5, genres: ["Drama", "War"], description: "A teenage boy and his little sister struggle to survive in Japan during World War II." },
        { title: "The Tale of Princess Kaguya", year: 2013, rating: 8.0, genres: ["Adventure", "Drama", "Family"], description: "Found inside a shining stalk of bamboo by an old bamboo cutter and his wife, a tiny girl grows rapidly into an exquisite young lady." },
        
        // Additional Films
        { title: "Nausicaä of the Valley of the Wind", year: 1984, rating: 8.0, genres: ["Adventure", "Fantasy", "Sci-Fi"], description: "Warrior and pacifist Princess Nausicaä desperately struggles to prevent two warring nations from destroying themselves and their dying planet." },
        { title: "Porco Rosso", year: 1992, rating: 7.7, genres: ["Adventure", "Comedy", "Drama"], description: "In 1930s Italy, a veteran World War I pilot is cursed to look like an anthropomorphic pig." },
        { title: "Whisper of the Heart", year: 1995, rating: 7.8, genres: ["Drama", "Family", "Romance"], description: "A love story between a girl who loves reading books, and a boy who has previously checked out all of the library books she chooses." },
        { title: "The Cat Returns", year: 2002, rating: 7.1, genres: ["Adventure", "Comedy", "Family"], description: "After helping a cat, a seventeen-year-old girl finds herself involuntarily engaged to a cat Prince in a magical world where her only hope of freedom lies with a dapper cat statuette come to life." },
        { title: "Tales from Earthsea", year: 2006, rating: 6.4, genres: ["Adventure", "Fantasy"], description: "In a mythical land, a man and a young boy investigate a series of unusual occurrences." },
        { title: "The Secret World of Arrietty", year: 2010, rating: 7.6, genres: ["Adventure", "Family", "Fantasy"], description: "The Clock family are four-inch-tall people who live anonymously in another family's residence, borrowing simple items to make their home." },
        { title: "From Up on Poppy Hill", year: 2011, rating: 7.4, genres: ["Drama", "Romance"], description: "A group of Yokohama teens look to save their school's clubhouse from the wrecking ball in preparations for the 1964 Tokyo Olympics." },
        { title: "When Marnie Was There", year: 2014, rating: 7.7, genres: ["Drama", "Family", "Mystery"], description: "Anna, a shy 12-year-old girl, is sent to spend time with her aunt and uncle who live in the countryside, where she meets Marnie." },
        { title: "Earwig and the Witch", year: 2020, rating: 4.7, genres: ["Adventure", "Family", "Fantasy"], description: "An orphan girl, Earwig, is adopted by a witch and comes home to a spooky house filled with mystery and magic." },
        
        // TV Specials and Shorts
        { title: "Ocean Waves", year: 1993, rating: 6.7, genres: ["Drama", "Romance"], description: "As a young man returns home after his university studies, memories of his past flirt through his mind." },
        { title: "The Red Turtle", year: 2016, rating: 7.5, genres: ["Adventure", "Family", "Fantasy"], description: "A man is shipwrecked on a deserted island and encounters a red turtle, which changes his life." },
        { title: "Lupin III: The Castle of Cagliostro", year: 1979, rating: 7.6, genres: ["Adventure", "Comedy", "Crime"], description: "A dashing thief, his gang of desperadoes and an intrepid policeman struggle to free a princess from an evil count's clutches." },
        
        // Lesser Known Works
        { title: "Only Yesterday", year: 1991, rating: 7.6, genres: ["Drama", "Romance"], description: "A twenty-seven-year-old office worker travels to the countryside while reminiscing about her childhood in Tokyo." },
        { title: "Pom Poko", year: 1994, rating: 7.3, genres: ["Adventure", "Comedy", "Drama"], description: "A community of magical shape-shifting raccoon dogs struggle to prevent their forest home from being destroyed by urban development." },
        { title: "My Neighbors the Yamadas", year: 1999, rating: 7.2, genres: ["Comedy", "Family"], description: "The everyday adventures of the Yamada family." }
      ];
      
      const hardcodedAnimes = completeGhibliList.map((item) => ({
        title: item.title,
        description: item.description,
        posterUrl: `https://placehold.co/600x900/4ade80/1f2937/png?text=${encodeURIComponent(item.title.substring(0, 20))}&font=roboto`,
        genres: item.genres,
        year: item.year,
        rating: item.rating,
        emotionalTags: [],
        trailerUrl: '',
        studios: ['Studio Ghibli'],
        themes: [],
        reasoning: `Magical Studio Ghibli masterpiece`,
        moodMatchScore: item.rating,
        _id: undefined,
        foundInDatabase: false
      })) as AnimeRecommendation[];
      
      addUniqueAnime(hardcodedAnimes);
      console.log(`[Studio Ghibli] Added ${hardcodedAnimes.length} hardcoded works`);
      
    } catch (e: any) {
      console.error(`[Studio Ghibli] Hardcoded list error:`, e.message);
    }
    
    // Sort by rating and year, limit results
    allGhibliAnime.sort((a, b) => {
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      if (ratingA !== ratingB) return ratingB - ratingA; // Higher rating first
      return (b.year || 0) - (a.year || 0); // More recent first
    });
    
    const finalAnimes = allGhibliAnime.slice(0, limit);
    
    console.log(`[Studio Ghibli] ✅ Final collection: ${finalAnimes.length} unique Studio Ghibli works`);
    
    if (finalAnimes.length === 0) {
      return { 
        animes: [], 
        error: "Unable to fetch Studio Ghibli anime from any source. Please try again later." 
      };
    }
    
    return { animes: finalAnimes };
  }
});

export const fetchMappaAnime = action({
  args: { limit: v.optional(v.number()) },
  returns: v.object({
    animes: v.optional(v.array(v.any())),
    error: v.optional(v.string())
  }),
  handler: async (_ctx: ActionCtx, args) => {
    const limit = args.limit ?? 100;
    
    console.log(`[MAPPA] Starting comprehensive fetch with limit: ${limit}`);
    
    let allMappaAnime: AnimeRecommendation[] = [];
    const seenTitles = new Set<string>();
    
    // Helper function to add unique anime
    const addUniqueAnime = (animes: AnimeRecommendation[]) => {
      animes.forEach(anime => {
        const normalizedTitle = anime.title.toLowerCase().trim();
        if (!seenTitles.has(normalizedTitle)) {
          seenTitles.add(normalizedTitle);
          allMappaAnime.push(anime);
        }
      });
    };
    
    // 1. AniList - Search for famous MAPPA titles
    try {
      console.log(`[MAPPA] Fetching from AniList...`);
      
      const famousTitles = [
        "Attack on Titan", "Jujutsu Kaisen", "Chainsaw Man", "Hell's Paradise", 
        "Dororo", "Vinland Saga", "Terror in Resonance", "MAPPA", "Yuri on Ice",
        "The God of High School", "Banana Fish", "Kakegurui", "Rage of Bahamut"
      ];

      for (const title of famousTitles) {
        try {
          const titleQuery = `query ($search: String) { 
            Page(page: 1, perPage: 3) { 
              media(type: ANIME, search: $search, sort: [SCORE_DESC]) { 
                id title { romaji english native } description(asHtml:false) 
                startDate{ year month day } coverImage{ extraLarge large medium } 
                averageScore genres episodes duration status format
                studios { edges { node { name } isMain } }
                trailer { id site }
              } 
            } 
          }`;

          const titleRes = await fetchWithTimeout('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: titleQuery, variables: { search: title } }),
            timeout: DEFAULT_TIMEOUT_MS
          });

          if (titleRes.ok) {
            const titleData = await titleRes.json();
            const titleMedia = titleData?.data?.Page?.media || [];
            
            // Filter for MAPPA productions
            const mappaMedia = titleMedia.filter((item: any) => {
              const studios = item.studios?.edges?.map((edge: any) => edge.node.name.toLowerCase()) || [];
              return studios.some((studio: string) => studio.includes('mappa'));
            });

            const titleAnimes = mappaMedia.map((item: any) => ({
              title: item.title?.english || item.title?.romaji || item.title?.native || 'Unknown',
              description: item.description || '',
              posterUrl: item.coverImage?.extraLarge || item.coverImage?.large || item.coverImage?.medium || '',
              genres: item.genres || [],
              year: item.startDate?.year || undefined,
              rating: typeof item.averageScore === 'number' ? item.averageScore / 10 : undefined,
              emotionalTags: [],
              trailerUrl: item.trailer?.site === "youtube" && item.trailer?.id 
                ? `https://www.youtube.com/watch?v=${item.trailer.id}` : '',
              studios: item.studios?.edges?.map((edge: any) => edge.node.name).filter(Boolean) || ['MAPPA'],
              themes: [],
              reasoning: `High-quality MAPPA production`,
              moodMatchScore: item.averageScore ? item.averageScore / 10 : 8.0,
              _id: undefined,
              foundInDatabase: false,
              anilistId: item.id
            })) as AnimeRecommendation[];

            addUniqueAnime(titleAnimes);
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (e) {
          console.error(`[MAPPA] Error fetching ${title}:`, e);
        }
      }

      console.log(`[MAPPA] AniList search found ${allMappaAnime.length} works after individual searches`);
      
    } catch (e: any) {
      console.error(`[MAPPA] AniList error:`, e.message);
    }
    
    // 2. Jikan (MyAnimeList) API - Multiple MAPPA searches
    try {
      console.log(`[MAPPA] Fetching from Jikan...`);
      
      // Search 1: Producer ID for MAPPA (ID: 569)
      const jikanUrl1 = `https://api.jikan.moe/v4/anime?producers=569&order_by=score&sort=desc&limit=25`;
      const jikanRes1 = await fetchWithTimeout(jikanUrl1, { timeout: DEFAULT_TIMEOUT_MS });
      
      if (jikanRes1.ok) {
        const jikanData1 = await jikanRes1.json();
        const animeList1 = jikanData1?.data || [];
        
        const animes1 = animeList1.map((item: any) => ({
          title: item.title || item.title_english || item.title_japanese || 'Unknown',
          description: item.synopsis || '',
          posterUrl: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || item.images?.webp?.large_image_url || item.images?.webp?.image_url || '',
          genres: getStringArray(item, 'genres', 'name') || [],
          year: item.year || (item.aired?.from ? new Date(item.aired.from).getFullYear() : undefined),
          rating: item.score || undefined,
          emotionalTags: [],
          trailerUrl: item.trailer?.url || '',
          studios: getStringArray(item, 'studios', 'name') || ['MAPPA'],
          themes: getStringArray(item, 'themes', 'name') || [],
          reasoning: `High-quality MAPPA production`,
          moodMatchScore: item.score || 8.0,
          _id: undefined,
          foundInDatabase: false,
          malId: item.mal_id
        })) as AnimeRecommendation[];
        
        addUniqueAnime(animes1);
        console.log(`[MAPPA] Jikan producer search found ${animes1.length} works`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Search 2: Text search for "MAPPA"
      const jikanUrl2 = `https://api.jikan.moe/v4/anime?q=mappa&order_by=score&sort=desc&limit=25`;
      const jikanRes2 = await fetchWithTimeout(jikanUrl2, { timeout: DEFAULT_TIMEOUT_MS });
      
      if (jikanRes2.ok) {
        const jikanData2 = await jikanRes2.json();
        const animeList2 = jikanData2?.data || [];
        
        // Filter for actual MAPPA productions
        const mappaAnimes = animeList2.filter((item: any) => {
          const studios = getStringArray(item, 'studios', 'name') || [];
          return studios.some((studio: string) => studio.toLowerCase().includes('mappa'));
        });
        
        const animes2 = mappaAnimes.map((item: any) => ({
          title: item.title || item.title_english || item.title_japanese || 'Unknown',
          description: item.synopsis || '',
          posterUrl: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || item.images?.webp?.large_image_url || item.images?.webp?.image_url || '',
          genres: getStringArray(item, 'genres', 'name') || [],
          year: item.year || (item.aired?.from ? new Date(item.aired.from).getFullYear() : undefined),
          rating: item.score || undefined,
          emotionalTags: [],
          trailerUrl: item.trailer?.url || '',
          studios: getStringArray(item, 'studios', 'name') || ['MAPPA'],
          themes: getStringArray(item, 'themes', 'name') || [],
          reasoning: `High-quality MAPPA production`,
          moodMatchScore: item.score || 8.0,
          _id: undefined,
          foundInDatabase: false,
          malId: item.mal_id
        })) as AnimeRecommendation[];
        
        addUniqueAnime(animes2);
        console.log(`[MAPPA] Jikan query search found ${animes2.length} works`);
      }
      
    } catch (e: any) {
      console.error(`[MAPPA] Jikan error:`, e.message);
    }
    
    // 3. Hardcoded list of famous MAPPA anime
    try {
      console.log(`[MAPPA] Adding famous MAPPA works...`);
      
      const famousMappaList = [
        // Iconic Recent Series
        { title: "Attack on Titan", year: 2013, rating: 9.0, genres: ["Action", "Drama", "Fantasy"], description: "Humanity fights for survival against giant humanoid Titans in a walled city." },
        { title: "Jujutsu Kaisen", year: 2020, rating: 8.5, genres: ["Action", "Supernatural", "School"], description: "A high school student joins a secret organization to fight cursed spirits." },
        { title: "Chainsaw Man", year: 2022, rating: 8.7, genres: ["Action", "Horror", "Supernatural"], description: "A young man merges with his pet devil to become Chainsaw Man and hunt other devils." },
        { title: "Hell's Paradise", year: 2023, rating: 8.0, genres: ["Action", "Historical", "Supernatural"], description: "A ninja on death row is sent to a mysterious island to find the elixir of life." },
        { title: "Vinland Saga", year: 2019, rating: 8.8, genres: ["Action", "Adventure", "Drama"], description: "A young Viking seeks revenge against the man who killed his father." },
        { title: "Dororo", year: 2019, rating: 8.2, genres: ["Action", "Historical", "Supernatural"], description: "A young man born without limbs, organs, and skin fights demons to reclaim his body." },
        { title: "Terror in Resonance", year: 2014, rating: 8.1, genres: ["Drama", "Psychological", "Thriller"], description: "Two teenage terrorists try to wake up Japan with their dangerous games." },
        { title: "Yuri!!! on Ice", year: 2016, rating: 8.0, genres: ["Sports", "Drama", "Romance"], description: "A Japanese figure skater trains with a Russian coach to compete internationally." },
        { title: "The God of High School", year: 2020, rating: 7.1, genres: ["Action", "Martial Arts", "Supernatural"], description: "High school students compete in a fighting tournament with supernatural powers." },
        { title: "Banana Fish", year: 2018, rating: 8.3, genres: ["Action", "Drama", "Thriller"], description: "A young gang leader investigates a mysterious drug called Banana Fish." },
        
        // Action & Adventure
        { title: "Kakegurui", year: 2017, rating: 7.2, genres: ["Drama", "Psychological", "School"], description: "Students at an elite academy settle their differences through high-stakes gambling." },
        { title: "Rage of Bahamut: Genesis", year: 2014, rating: 7.4, genres: ["Action", "Adventure", "Fantasy"], description: "Humans, gods, and demons fight to prevent the resurrection of the ancient dragon Bahamut." },
        { title: "Kids on the Slope", year: 2012, rating: 8.2, genres: ["Drama", "Music", "Romance"], description: "A shy student discovers jazz music and friendship in 1960s Japan." },
        { title: "Punch Line", year: 2015, rating: 6.9, genres: ["Comedy", "Ecchi", "Supernatural"], description: "A high school boy's soul is separated from his body after seeing panties." },
        { title: "Teekyuu", year: 2012, rating: 6.7, genres: ["Comedy", "School", "Sports"], description: "Four high school girls in a tennis club engage in surreal everyday adventures." },
        { title: "Ushio and Tora", year: 2015, rating: 7.4, genres: ["Action", "Comedy", "Supernatural"], description: "A boy frees an ancient demon to fight other monsters threatening humanity." },
        { title: "In This Corner of the World", year: 2016, rating: 8.2, genres: ["Drama", "Historical"], description: "A young woman's life in Hiroshima during World War II." },
        { title: "Listeners", year: 2020, rating: 5.9, genres: ["Mecha", "Music", "Sci-Fi"], description: "A boy and a girl with a guitar-like appendage fight mysterious creatures with music." },
        { title: "Zombieland Saga", year: 2018, rating: 7.5, genres: ["Comedy", "Music", "Supernatural"], description: "Seven zombie girls form an idol group to save Saga Prefecture." },
        { title: "The Gymnastics Samurai", year: 2020, rating: 7.2, genres: ["Sports", "Drama"], description: "An aging gymnast faces retirement while caring for his daughter." },
        
        // Recent Works
        { title: "Takt Op. Destiny", year: 2021, rating: 7.0, genres: ["Action", "Music", "Supernatural"], description: "Humans fight alien invaders using the power of classical music." },
        { title: "Pluto", year: 2023, rating: 8.9, genres: ["Drama", "Mystery", "Sci-Fi"], description: "A detective investigates a series of murders involving both humans and robots." },
        { title: "Alice & Zoroku", year: 2017, rating: 6.9, genres: ["Supernatural", "Drama"], description: "A girl with psychic powers escapes from a research facility and meets a gruff old man." },
        { title: "Campfire Cooking in Another World", year: 2023, rating: 6.8, genres: ["Adventure", "Comedy", "Fantasy"], description: "A man summoned to another world uses modern cooking to tame legendary beasts." },
        { title: "Bucchigiri?!", year: 2024, rating: 6.5, genres: ["Action", "Comedy", "School"], description: "A high school delinquent gains supernatural power and faces gang rivalries." }
      ];
      
      const hardcodedAnimes = famousMappaList.map((item) => ({
        title: item.title,
        description: item.description,
        posterUrl: '', // Will be enhanced with real posters via external API
        genres: item.genres,
        year: item.year,
        rating: item.rating,
        emotionalTags: [],
        trailerUrl: '',
        studios: ['MAPPA'],
        themes: [],
        reasoning: `High-quality MAPPA production`,
        moodMatchScore: item.rating,
        _id: undefined,
        foundInDatabase: false
      })) as AnimeRecommendation[];

      // Enhance hardcoded entries with real posters from external APIs
      for (const anime of hardcodedAnimes) {
        try {
          const posterUrl = await fetchPosterWithFallbacks(anime.title, undefined, true);
          if (posterUrl) {
            anime.posterUrl = posterUrl;
          } else {
            // Fallback to placeholder only if no real poster found
            anime.posterUrl = `https://placehold.co/600x900/e74c3c/ffffff/png?text=${encodeURIComponent(anime.title.substring(0, 20))}&font=roboto`;
          }
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (e) {
          console.error(`[MAPPA] Error fetching poster for ${anime.title}:`, e);
          anime.posterUrl = `https://placehold.co/600x900/e74c3c/ffffff/png?text=${encodeURIComponent(anime.title.substring(0, 20))}&font=roboto`;
        }
      }
      
      addUniqueAnime(hardcodedAnimes);
      console.log(`[MAPPA] Added ${hardcodedAnimes.length} hardcoded works`);
      
    } catch (e: any) {
      console.error(`[MAPPA] Hardcoded list error:`, e.message);
    }
    
    // Sort by rating and year
    allMappaAnime.sort((a, b) => {
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      if (ratingA !== ratingB) return ratingB - ratingA;
      return (b.year || 0) - (a.year || 0);
    });
    
    const finalAnimes = allMappaAnime.slice(0, limit);
    
    console.log(`[MAPPA] ✅ Final collection: ${finalAnimes.length} unique MAPPA works`);
    
    if (finalAnimes.length === 0) {
      return { 
        animes: [], 
        error: "Unable to fetch MAPPA anime from any source. Please try again later." 
      };
    }
    
    return { animes: finalAnimes };
  }
});

// Internal function for cron job to refresh Bones cache
export const refreshBonesCache = internalAction({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    animeCount: v.number()
  }),
  handler: async (ctx, args): Promise<{ success: boolean; message: string; animeCount: number }> => {
    try {
      console.log('[Bones Cache] Starting scheduled refresh...');
      
      const result = await ctx.runAction(api.externalApis.fetchBonesAnime, { limit: 100 });
      
      if (result.error) {
        console.error('[Bones Cache] Refresh failed:', result.error);
        return {
          success: false,
          message: `Cache refresh failed: ${result.error}`,
          animeCount: 0
        };
      }
      
      const animeCount = result.animes?.length || 0;
      console.log(`[Bones Cache] Successfully refreshed cache with ${animeCount} anime`);
      
      return {
        success: true,
        message: `Successfully refreshed Bones cache with ${animeCount} anime`,
        animeCount
      };
      
    } catch (error: any) {
      console.error('[Bones Cache] Unexpected error:', error);
      return {
        success: false,
        message: `Cache refresh error: ${error.message}`,
        animeCount: 0
      };
    }
  }
});

export const fetchBonesAnime = action({
  args: { limit: v.optional(v.number()) },
  returns: v.object({
    animes: v.optional(v.array(v.any())),
    error: v.optional(v.string())
  }),
  handler: async (_ctx: ActionCtx, args): Promise<{ animes?: any[]; error?: string }> => {
    const limit = args.limit ?? 100;
    
    console.log(`[Bones] Starting comprehensive fetch with limit: ${limit}`);
    
    let allBonesAnime: AnimeRecommendation[] = [];
    const seenTitles = new Set<string>();
    
    // Helper function to add unique anime
    const addUniqueAnime = (animes: AnimeRecommendation[]) => {
      animes.forEach(anime => {
        const normalizedTitle = anime.title.toLowerCase().trim();
        if (!seenTitles.has(normalizedTitle)) {
          seenTitles.add(normalizedTitle);
          allBonesAnime.push(anime);
        }
      });
    };
    
    // 1. AniList - Search for famous Bones titles
    try {
      console.log(`[Bones] Fetching from AniList...`);
      
      const famousTitles = [
        "Fullmetal Alchemist", "My Hero Academia", "Soul Eater", "Mob Psycho 100", 
        "Ouran High School Host Club", "Noragami", "Kekkai Sensen", "Darker than Black",
        "Eureka Seven", "Wolf's Rain", "Scrapped Princess", "Carole & Tuesday",
        "Space Dandy", "Star Driver", "Concrete Revolutio", "Bungo Stray Dogs"
      ];

      for (const title of famousTitles) {
        try {
          const titleQuery = `query ($search: String) { 
            Page(page: 1, perPage: 3) { 
              media(type: ANIME, search: $search, sort: [SCORE_DESC]) { 
                id title { romaji english native } description(asHtml:false) 
                startDate{ year month day } coverImage{ extraLarge large medium } 
                averageScore genres episodes duration status format
                studios { edges { node { name } isMain } }
                trailer { id site }
              } 
            } 
          }`;

          const titleRes = await fetchWithTimeout('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: titleQuery, variables: { search: title } }),
            timeout: DEFAULT_TIMEOUT_MS
          });

          if (titleRes.ok) {
            const titleData = await titleRes.json();
            const titleMedia = titleData?.data?.Page?.media || [];
            
            // Filter for Bones productions
            const bonesMedia = titleMedia.filter((item: any) => {
              const studios = item.studios?.edges?.map((edge: any) => edge.node.name.toLowerCase()) || [];
              return studios.some((studio: string) => studio.includes('bones'));
            });

            const titleAnimes = bonesMedia.map((item: any) => ({
              title: item.title?.english || item.title?.romaji || item.title?.native || 'Unknown',
              description: item.description || '',
              posterUrl: item.coverImage?.extraLarge || item.coverImage?.large || item.coverImage?.medium || '',
              genres: item.genres || [],
              year: item.startDate?.year || undefined,
              rating: typeof item.averageScore === 'number' ? item.averageScore / 10 : undefined,
              emotionalTags: [],
              trailerUrl: item.trailer?.site === "youtube" && item.trailer?.id 
                ? `https://www.youtube.com/watch?v=${item.trailer.id}` : '',
              studios: item.studios?.edges?.map((edge: any) => edge.node.name).filter(Boolean) || ['Bones'],
              themes: [],
              reasoning: `High-quality Bones production`,
              moodMatchScore: item.averageScore ? item.averageScore / 10 : 8.0,
              _id: undefined,
              foundInDatabase: false,
              anilistId: item.id
            })) as AnimeRecommendation[];

            addUniqueAnime(titleAnimes);
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (e) {
          console.error(`[Bones] Error fetching ${title}:`, e);
        }
      }

      console.log(`[Bones] AniList search found ${allBonesAnime.length} works after individual searches`);
      
    } catch (e: any) {
      console.error(`[Bones] AniList error:`, e.message);
    }
    
    // 2. Jikan (MyAnimeList) API - Multiple Bones searches
    try {
      console.log(`[Bones] Fetching from Jikan...`);
      
      // Search 1: Producer ID for Bones (ID: 4)
      const jikanUrl1 = `https://api.jikan.moe/v4/anime?producers=4&order_by=score&sort=desc&limit=25`;
      const jikanRes1 = await fetchWithTimeout(jikanUrl1, { timeout: DEFAULT_TIMEOUT_MS });
      
      if (jikanRes1.ok) {
        const jikanData1 = await jikanRes1.json();
        const animeList1 = jikanData1?.data || [];
        
        const animes1 = animeList1.map((item: any) => ({
          title: item.title || item.title_english || item.title_japanese || 'Unknown',
          description: item.synopsis || '',
          posterUrl: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || item.images?.webp?.large_image_url || item.images?.webp?.image_url || '',
          genres: getStringArray(item, 'genres', 'name') || [],
          year: item.year || (item.aired?.from ? new Date(item.aired.from).getFullYear() : undefined),
          rating: item.score || undefined,
          emotionalTags: [],
          trailerUrl: item.trailer?.url || '',
          studios: getStringArray(item, 'studios', 'name') || ['Bones'],
          themes: getStringArray(item, 'themes', 'name') || [],
          reasoning: `High-quality Bones production`,
          moodMatchScore: item.score || 8.0,
          _id: undefined,
          foundInDatabase: false,
          malId: item.mal_id
        })) as AnimeRecommendation[];
        
        addUniqueAnime(animes1);
        console.log(`[Bones] Jikan producer search found ${animes1.length} works`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Search 2: Text search for "Bones"
      const jikanUrl2 = `https://api.jikan.moe/v4/anime?q=bones&order_by=score&sort=desc&limit=25`;
      const jikanRes2 = await fetchWithTimeout(jikanUrl2, { timeout: DEFAULT_TIMEOUT_MS });
      
      if (jikanRes2.ok) {
        const jikanData2 = await jikanRes2.json();
        const animeList2 = jikanData2?.data || [];
        
        // Filter for actual Bones productions
        const bonesAnimes = animeList2.filter((item: any) => {
          const studios = getStringArray(item, 'studios', 'name') || [];
          return studios.some((studio: string) => studio.toLowerCase().includes('bones'));
        });
        
        const animes2 = bonesAnimes.map((item: any) => ({
          title: item.title || item.title_english || item.title_japanese || 'Unknown',
          description: item.synopsis || '',
          posterUrl: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || item.images?.webp?.large_image_url || item.images?.webp?.image_url || '',
          genres: getStringArray(item, 'genres', 'name') || [],
          year: item.year || (item.aired?.from ? new Date(item.aired.from).getFullYear() : undefined),
          rating: item.score || undefined,
          emotionalTags: [],
          trailerUrl: item.trailer?.url || '',
          studios: getStringArray(item, 'studios', 'name') || ['Bones'],
          themes: getStringArray(item, 'themes', 'name') || [],
          reasoning: `High-quality Bones production`,
          moodMatchScore: item.score || 8.0,
          _id: undefined,
          foundInDatabase: false,
          malId: item.mal_id
        })) as AnimeRecommendation[];
        
        addUniqueAnime(animes2);
        console.log(`[Bones] Jikan query search found ${animes2.length} works`);
      }
      
    } catch (e: any) {
      console.error(`[Bones] Jikan error:`, e.message);
    }
    
    // 3. Hardcoded list of famous Bones anime
    try {
      console.log(`[Bones] Adding famous Bones works...`);
      
      const famousBonesList = [
        // Legendary Series
        { title: "Fullmetal Alchemist: Brotherhood", year: 2009, rating: 9.1, genres: ["Action", "Adventure", "Drama"], description: "Two brothers use alchemy to search for the Philosopher's Stone after a disastrous attempt to bring their mother back to life." },
        { title: "My Hero Academia", year: 2016, rating: 7.7, genres: ["Action", "School", "Superhero"], description: "A boy born without superpowers in a superhero society enrolls in a prestigious hero academy." },
        { title: "Soul Eater", year: 2008, rating: 7.9, genres: ["Action", "Comedy", "Supernatural"], description: "Students at Death Weapon Meister Academy train to become skilled weapon-meister pairs." },
        { title: "Mob Psycho 100", year: 2016, rating: 8.7, genres: ["Action", "Comedy", "Supernatural"], description: "A powerful psychic middle schooler tries to live a normal life while working for a fake psychic." },
        { title: "Ouran High School Host Club", year: 2006, rating: 8.2, genres: ["Comedy", "Romance", "School"], description: "A scholarship student accidentally breaks an expensive vase and must work for the school's host club." },
        { title: "Noragami", year: 2014, rating: 7.9, genres: ["Action", "Comedy", "Supernatural"], description: "A minor god does odd jobs for five yen while trying to build his own shrine." },
        { title: "Kekkai Sensen", year: 2015, rating: 7.4, genres: ["Action", "Comedy", "Supernatural"], description: "Humans and monsters coexist in a city where reality is constantly in flux." },
        { title: "Darker than Black", year: 2007, rating: 8.0, genres: ["Action", "Mystery", "Sci-Fi"], description: "Contractors with supernatural abilities emerge after a mysterious phenomenon changes the world." },
        { title: "Eureka Seven", year: 2005, rating: 8.1, genres: ["Adventure", "Drama", "Mecha"], description: "A boy joins a rebel group and pilots a mecha while falling in love with a mysterious girl." },
        { title: "Wolf's Rain", year: 2003, rating: 7.8, genres: ["Adventure", "Drama", "Fantasy"], description: "Wolves disguised as humans search for paradise in a post-apocalyptic world." },
        
        // Action & Adventure
        { title: "Scrapped Princess", year: 2003, rating: 7.2, genres: ["Adventure", "Fantasy", "Sci-Fi"], description: "A girl prophesied to destroy the world at age 16 travels with her adoptive siblings." },
        { title: "Carole & Tuesday", year: 2019, rating: 7.8, genres: ["Drama", "Music", "Sci-Fi"], description: "Two girls from different backgrounds form a music duo on Mars in the future." },
        { title: "Space Dandy", year: 2014, rating: 8.1, genres: ["Adventure", "Comedy", "Sci-Fi"], description: "A dandy alien hunter searches the galaxy for undiscovered species with his robot and cat-like alien." },
        { title: "Star Driver", year: 2010, rating: 7.3, genres: ["Action", "Mecha", "School"], description: "A boy transfers to an island school and becomes involved in battles with giant mechs called Cybodies." },
        { title: "Concrete Revolutio", year: 2015, rating: 6.9, genres: ["Action", "Mystery", "Superhero"], description: "A government agency monitors superhumans in an alternate history Japan." },
        { title: "Bungo Stray Dogs", year: 2016, rating: 7.8, genres: ["Action", "Mystery", "Supernatural"], description: "A boy with a mysterious power joins a detective agency of individuals with supernatural abilities." },
        { title: "RahXephon", year: 2002, rating: 7.2, genres: ["Drama", "Mecha", "Mystery"], description: "A boy pilots a giant mech to fight invaders while questioning the nature of reality." },
        { title: "Un-Go", year: 2011, rating: 7.2, genres: ["Mystery", "Supernatural", "Thriller"], description: "A detective and his supernatural partner solve mysteries in post-war Japan." },
        { title: "Captain Earth", year: 2014, rating: 6.1, genres: ["Action", "Mecha", "Sci-Fi"], description: "Teenagers pilot giant robots to protect Earth from alien invaders." },
        { title: "Psalms of Planets Eureka Seven", year: 2005, rating: 8.1, genres: ["Adventure", "Drama", "Mecha"], description: "A boy joins a rebel group and learns to pilot a mecha in a world of sky surfing." },
        
        // Comedy & Slice of Life
        { title: "Ouran High School Host Club", year: 2006, rating: 8.2, genres: ["Comedy", "Romance", "School"], description: "A scholarship student works for a host club after breaking an expensive vase." },
        { title: "Gosick", year: 2011, rating: 7.9, genres: ["Drama", "Mystery", "Romance"], description: "A Japanese exchange student in 1920s Europe solves mysteries with a brilliant but reclusive girl." },
        { title: "Zetsuen no Tempest", year: 2012, rating: 7.5, genres: ["Action", "Drama", "Mystery"], description: "Two friends become involved in a battle between two powerful mages that could determine the fate of the world." },
        { title: "Show By Rock!!", year: 2015, rating: 6.9, genres: ["Comedy", "Music", "Fantasy"], description: "A girl is transported to a world where music battles determine everything." },
        { title: "Chaika: The Coffin Princess", year: 2014, rating: 7.1, genres: ["Action", "Adventure", "Fantasy"], description: "A mysterious girl with a coffin hires saboteurs to help her collect the remains of a dead emperor." }
      ];
      
      const hardcodedAnimes = famousBonesList.map((item) => ({
        title: item.title,
        description: item.description,
        posterUrl: '', // Will be enhanced with real posters via external API
        genres: item.genres,
        year: item.year,
        rating: item.rating,
        emotionalTags: [],
        trailerUrl: '',
        studios: ['Bones'],
        themes: [],
        reasoning: `High-quality Bones production`,
        moodMatchScore: item.rating,
        _id: undefined,
        foundInDatabase: false
      })) as AnimeRecommendation[];

      // Enhance hardcoded entries with real posters from external APIs
      for (const anime of hardcodedAnimes) {
        try {
          const posterUrl = await fetchPosterWithFallbacks(anime.title, undefined, true);
          if (posterUrl) {
            anime.posterUrl = posterUrl;
          } else {
            // Fallback to placeholder only if no real poster found
            anime.posterUrl = `https://placehold.co/600x900/3498db/ffffff/png?text=${encodeURIComponent(anime.title.substring(0, 20))}&font=roboto`;
          }
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (e) {
          console.error(`[Bones] Error fetching poster for ${anime.title}:`, e);
          anime.posterUrl = `https://placehold.co/600x900/3498db/ffffff/png?text=${encodeURIComponent(anime.title.substring(0, 20))}&font=roboto`;
        }
      }
      
      addUniqueAnime(hardcodedAnimes);
      console.log(`[Bones] Added ${hardcodedAnimes.length} hardcoded works`);
      
    } catch (e: any) {
      console.error(`[Bones] Hardcoded list error:`, e.message);
    }
    
    // Sort by rating and year
    allBonesAnime.sort((a, b) => {
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      if (ratingA !== ratingB) return ratingB - ratingA;
      return (b.year || 0) - (a.year || 0);
    });
    
    const finalAnimes = allBonesAnime.slice(0, limit);
    
    console.log(`[Bones] ✅ Final collection: ${finalAnimes.length} unique Bones works`);
    
    if (finalAnimes.length === 0) {
      return { 
        animes: [], 
        error: "Unable to fetch Bones anime from any source. Please try again later." 
      };
    }
    
    return { animes: finalAnimes };
  }
});

export const fetchKyotoAnimationAnime = action({
  args: { limit: v.optional(v.number()) },
  returns: v.object({
    animes: v.optional(v.array(v.any())),
    error: v.optional(v.string())
  }),
  handler: async (_ctx, args) => {
    const limit = args.limit ?? 100;
    
    console.log(`[KyoAni] Starting comprehensive fetch with limit: ${limit}`);
    
    let allKyoAniAnime: AnimeRecommendation[] = [];
    const seenTitles = new Set<string>();
    
    // Helper function to add unique anime
    const addUniqueAnime = (animes: AnimeRecommendation[]) => {
      animes.forEach(anime => {
        const normalizedTitle = anime.title.toLowerCase().trim();
        if (!seenTitles.has(normalizedTitle)) {
          seenTitles.add(normalizedTitle);
          allKyoAniAnime.push(anime);
        }
      });
    };
    
    // 1. AniList - Search for famous Kyoto Animation titles
    try {
      console.log(`[KyoAni] Fetching from AniList...`);
      
      const famousTitles = [
        "K-On!", "Clannad", "Violet Evergarden", "A Silent Voice", "The Melancholy of Haruhi Suzumiya",
        "Lucky Star", "Hyouka", "Free!", "Tamako Market", "Beyond the Boundary", "Kyoto Animation",
        "Dragon Maid", "Nichijou", "Full Metal Panic", "Amagi Brilliant Park", "Phantom World"
      ];

      for (const title of famousTitles) {
        try {
          const titleQuery = `query ($search: String) { 
            Page(page: 1, perPage: 3) { 
              media(type: ANIME, search: $search, sort: [SCORE_DESC]) { 
                id title { romaji english native } description(asHtml:false) 
                startDate{ year month day } coverImage{ extraLarge large medium } 
                averageScore genres episodes duration status format
                studios { edges { node { name } isMain } }
                trailer { id site }
              } 
            } 
          }`;

          const titleRes = await fetchWithTimeout('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: titleQuery, variables: { search: title } }),
            timeout: DEFAULT_TIMEOUT_MS
          });

          if (titleRes.ok) {
            const titleData = await titleRes.json();
            const titleMedia = titleData?.data?.Page?.media || [];
            
            // Filter for Kyoto Animation productions
            const kyoaniMedia = titleMedia.filter((item: any) => {
              const studios = item.studios?.edges?.map((edge: any) => edge.node.name.toLowerCase()) || [];
              return studios.some((studio: string) => 
                studio.includes('kyoto animation') || studio.includes('kyoani')
              );
            });

            const titleAnimes = kyoaniMedia.map((item: any) => ({
              title: item.title?.english || item.title?.romaji || item.title?.native || 'Unknown',
              description: item.description || '',
              posterUrl: item.coverImage?.extraLarge || item.coverImage?.large || item.coverImage?.medium || '',
              genres: item.genres || [],
              year: item.startDate?.year || undefined,
              rating: typeof item.averageScore === 'number' ? item.averageScore / 10 : undefined,
              emotionalTags: [],
              trailerUrl: item.trailer?.site === "youtube" && item.trailer?.id 
                ? `https://www.youtube.com/watch?v=${item.trailer.id}` : '',
              studios: item.studios?.edges?.map((edge: any) => edge.node.name).filter(Boolean) || ['Kyoto Animation'],
              themes: [],
              reasoning: `High-quality Kyoto Animation production`,
              moodMatchScore: item.averageScore ? item.averageScore / 10 : 8.0,
              _id: undefined,
              foundInDatabase: false,
              anilistId: item.id
            })) as AnimeRecommendation[];

            addUniqueAnime(titleAnimes);
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (e) {
          console.error(`[KyoAni] Error fetching ${title}:`, e);
        }
      }

      console.log(`[KyoAni] AniList search found ${allKyoAniAnime.length} works after individual searches`);
      
    } catch (e: any) {
      console.error(`[KyoAni] AniList error:`, e.message);
    }
    
    // 2. Jikan (MyAnimeList) API - Multiple Kyoto Animation searches
    try {
      console.log(`[KyoAni] Fetching from Jikan...`);
      
      // Search 1: Producer ID for Kyoto Animation (ID: 2)
      const jikanUrl1 = `https://api.jikan.moe/v4/anime?producers=2&order_by=score&sort=desc&limit=25`;
      const jikanRes1 = await fetchWithTimeout(jikanUrl1, { timeout: DEFAULT_TIMEOUT_MS });
      
      if (jikanRes1.ok) {
        const jikanData1 = await jikanRes1.json();
        const animeList1 = jikanData1?.data || [];
        
        const animes1 = animeList1.map((item: any) => ({
          title: item.title || item.title_english || item.title_japanese || 'Unknown',
          description: item.synopsis || '',
          posterUrl: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || item.images?.webp?.large_image_url || item.images?.webp?.image_url || '',
          genres: getStringArray(item, 'genres', 'name') || [],
          year: item.year || (item.aired?.from ? new Date(item.aired.from).getFullYear() : undefined),
          rating: item.score || undefined,
          emotionalTags: [],
          trailerUrl: item.trailer?.url || '',
          studios: getStringArray(item, 'studios', 'name') || ['Kyoto Animation'],
          themes: getStringArray(item, 'themes', 'name') || [],
          reasoning: `High-quality Kyoto Animation production`,
          moodMatchScore: item.score || 8.0,
          _id: undefined,
          foundInDatabase: false,
          malId: item.mal_id
        })) as AnimeRecommendation[];
        
        addUniqueAnime(animes1);
        console.log(`[KyoAni] Jikan producer search found ${animes1.length} works`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Search 2: Text search for "Kyoto Animation"
      const jikanUrl2 = `https://api.jikan.moe/v4/anime?q=kyoto+animation&order_by=score&sort=desc&limit=25`;
      const jikanRes2 = await fetchWithTimeout(jikanUrl2, { timeout: DEFAULT_TIMEOUT_MS });
      
      if (jikanRes2.ok) {
        const jikanData2 = await jikanRes2.json();
        const animeList2 = jikanData2?.data || [];
        
        // Filter for actual Kyoto Animation productions
        const kyoaniAnimes = animeList2.filter((item: any) => {
          const studios = getStringArray(item, 'studios', 'name') || [];
          return studios.some((studio: string) => 
            studio.toLowerCase().includes('kyoto animation') || studio.toLowerCase().includes('kyoani')
          );
        });
        
        const animes2 = kyoaniAnimes.map((item: any) => ({
          title: item.title || item.title_english || item.title_japanese || 'Unknown',
          description: item.synopsis || '',
          posterUrl: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || item.images?.webp?.large_image_url || item.images?.webp?.image_url || '',
          genres: getStringArray(item, 'genres', 'name') || [],
          year: item.year || (item.aired?.from ? new Date(item.aired.from).getFullYear() : undefined),
          rating: item.score || undefined,
          emotionalTags: [],
          trailerUrl: item.trailer?.url || '',
          studios: getStringArray(item, 'studios', 'name') || ['Kyoto Animation'],
          themes: getStringArray(item, 'themes', 'name') || [],
          reasoning: `High-quality Kyoto Animation production`,
          moodMatchScore: item.score || 8.0,
          _id: undefined,
          foundInDatabase: false,
          malId: item.mal_id
        })) as AnimeRecommendation[];
        
        addUniqueAnime(animes2);
        console.log(`[KyoAni] Jikan query search found ${animes2.length} works`);
      }
      
    } catch (e: any) {
      console.error(`[KyoAni] Jikan error:`, e.message);
    }
    
    // 3. Hardcoded list of famous Kyoto Animation anime
    try {
      console.log(`[KyoAni] Adding famous Kyoto Animation works...`);
      
      const famousKyoAniList = [
        // Legendary Series
        { title: "Clannad", year: 2007, rating: 8.0, genres: ["Drama", "Romance", "School"], description: "A delinquent student meets a girl who wants to revive the school's drama club." },
        { title: "Clannad: After Story", year: 2008, rating: 9.0, genres: ["Drama", "Romance", "Slice of Life"], description: "The continuation of Clannad focusing on adult life and family." },
        { title: "Violet Evergarden", year: 2018, rating: 8.5, genres: ["Drama", "Fantasy", "Slice of Life"], description: "A former soldier works as an Auto Memory Doll, writing letters for others." },
        { title: "A Silent Voice", year: 2016, rating: 8.9, genres: ["Drama", "Romance", "School"], description: "A former bully seeks redemption by helping the deaf girl he once tormented." },
        { title: "The Melancholy of Haruhi Suzumiya", year: 2006, rating: 7.8, genres: ["Comedy", "Mystery", "School"], description: "A girl unknowingly has the power to change reality and forms a club to find supernatural phenomena." },
        { title: "K-On!", year: 2009, rating: 7.2, genres: ["Comedy", "Music", "School"], description: "High school girls form a light music club and learn to play instruments together." },
        { title: "K-On!!", year: 2010, rating: 8.2, genres: ["Comedy", "Music", "School"], description: "The continuation of K-On! following the girls through their final year of high school." },
        { title: "Hyouka", year: 2012, rating: 8.1, genres: ["Mystery", "School", "Slice of Life"], description: "A high school student reluctantly joins the Classic Literature Club and solves everyday mysteries." },
        { title: "Lucky Star", year: 2007, rating: 7.7, genres: ["Comedy", "School", "Slice of Life"], description: "Four high school girls discuss otaku culture and everyday life." },
        { title: "Free!", year: 2013, rating: 7.3, genres: ["Drama", "School", "Sports"], description: "High school boys reunite to form a swimming club and compete in tournaments." },
        
        // Drama & Romance
        { title: "Tamako Market", year: 2013, rating: 7.2, genres: ["Comedy", "Slice of Life"], description: "A girl helps run her family's mochi shop in a traditional shopping district." },
        { title: "Tamako Love Story", year: 2014, rating: 7.9, genres: ["Drama", "Romance"], description: "The movie continuation of Tamako Market focusing on a love story." },
        { title: "Beyond the Boundary", year: 2013, rating: 7.2, genres: ["Action", "Fantasy", "Supernatural"], description: "A half-human, half-youmu boy meets a girl who can manipulate her blood as a weapon." },
        { title: "Miss Kobayashi's Dragon Maid", year: 2017, rating: 7.9, genres: ["Comedy", "Fantasy", "Slice of Life"], description: "An office worker lives with a dragon who transforms into a maid." },
        { title: "Nichijou", year: 2011, rating: 8.4, genres: ["Comedy", "School", "Slice of Life"], description: "The daily lives of a group of high school students and their absurd situations." },
        { title: "Full Metal Panic!", year: 2002, rating: 7.6, genres: ["Action", "Comedy", "Mecha"], description: "A military specialist goes undercover as a high school student to protect a girl." },
        { title: "Full Metal Panic? Fumoffu", year: 2003, rating: 8.1, genres: ["Action", "Comedy", "School"], description: "The comedic side story of Full Metal Panic focusing on school life." },
        { title: "Full Metal Panic! The Second Raid", year: 2005, rating: 8.0, genres: ["Action", "Drama", "Mecha"], description: "The serious continuation of Full Metal Panic with more intense military action." },
        { title: "Amagi Brilliant Park", year: 2014, rating: 7.0, genres: ["Comedy", "Magic"], description: "A narcissistic boy must help save a magical theme park from closing down." },
        { title: "Phantom World", year: 2016, rating: 6.8, genres: ["Action", "Comedy", "Supernatural"], description: "Students with special abilities fight phantoms that have appeared in the world." },
        
        // Movies & Specials
        { title: "The Disappearance of Haruhi Suzumiya", year: 2010, rating: 8.7, genres: ["Drama", "Mystery", "Supernatural"], description: "Kyon wakes up in a world where Haruhi and the SOS Brigade never existed." },
        { title: "Liz and the Blue Bird", year: 2018, rating: 7.8, genres: ["Drama", "Music", "School"], description: "Two high school girls in a concert band face their changing friendship." },
        { title: "Free! Road to the World - The Dream", year: 2019, rating: 7.6, genres: ["Drama", "Sports"], description: "The movie continuation of the Free! series." },
        { title: "Violet Evergarden: The Movie", year: 2020, rating: 8.6, genres: ["Drama", "Fantasy"], description: "The movie conclusion to the Violet Evergarden series." },
        { title: "Tsurune", year: 2018, rating: 7.6, genres: ["Drama", "School", "Sports"], description: "High school boys practice Japanese archery and compete in tournaments." }
      ];
      
      const hardcodedAnimes = famousKyoAniList.map((item) => ({
        title: item.title,
        description: item.description,
        posterUrl: '', // Will be enhanced with real posters via external API
        genres: item.genres,
        year: item.year,
        rating: item.rating,
        emotionalTags: [],
        trailerUrl: '',
        studios: ['Kyoto Animation'],
        themes: [],
        reasoning: `High-quality Kyoto Animation production`,
        moodMatchScore: item.rating,
        _id: undefined,
        foundInDatabase: false
      })) as AnimeRecommendation[];

      // Enhance hardcoded entries with real posters from external APIs
      for (const anime of hardcodedAnimes) {
        try {
          const posterUrl = await fetchPosterWithFallbacks(anime.title, undefined, true);
          if (posterUrl) {
            anime.posterUrl = posterUrl;
          } else {
            // Fallback to placeholder only if no real poster found
            anime.posterUrl = `https://placehold.co/600x900/e74c3c/ffffff/png?text=${encodeURIComponent(anime.title.substring(0, 20))}&font=roboto`;
          }
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (e) {
          console.error(`[KyoAni] Error fetching poster for ${anime.title}:`, e);
          anime.posterUrl = `https://placehold.co/600x900/e74c3c/ffffff/png?text=${encodeURIComponent(anime.title.substring(0, 20))}&font=roboto`;
        }
      }
      
      addUniqueAnime(hardcodedAnimes);
      console.log(`[KyoAni] Added ${hardcodedAnimes.length} hardcoded works`);
      
    } catch (e: any) {
      console.error(`[KyoAni] Hardcoded list error:`, e.message);
    }
    
    // Sort by rating and year
    allKyoAniAnime.sort((a, b) => {
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      if (ratingA !== ratingB) return ratingB - ratingA;
      return (b.year || 0) - (a.year || 0);
    });
    
    const finalAnimes = allKyoAniAnime.slice(0, limit);
    
    console.log(`[KyoAni] ✅ Final collection: ${finalAnimes.length} unique Kyoto Animation works`);
    
    if (finalAnimes.length === 0) {
      return { 
        animes: [], 
        error: "Unable to fetch Kyoto Animation anime from any source. Please try again later." 
      };
    }
    
    return { animes: finalAnimes };
  }
});

// Refresh Kyoto Animation cache
export const refreshKyotoAnimationCache = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    try {
      console.log('[KyoAni Cache] Starting cache refresh...');
      
      const result = await ctx.runAction(api.externalApis.fetchKyotoAnimationAnime, { limit: 100 });
      
      if (result.error) {
        console.error('[KyoAni Cache] Cache refresh failed:', result.error);
        return null;
      }

      const animes = result.animes || [];
      console.log(`[KyoAni Cache] ✅ Successfully refreshed cache with ${animes.length} anime`);
      
      return null;
    } catch (error: any) {
      console.error('[KyoAni Cache] Cache refresh error:', error);
      return null;
    }
  }
});