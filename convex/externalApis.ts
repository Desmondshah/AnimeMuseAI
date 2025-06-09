// convex/externalApis.ts - Enhanced version with episode data fetching

"use node";
import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { ActionCtx } from "./_generated/server";

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