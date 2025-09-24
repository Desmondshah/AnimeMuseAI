// convex/externalApis.ts - Enhanced version with episode data fetching
// @ts-nocheck

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
  protectedFields?: string[];
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

// FIXED: Simplified return types to avoid deep type instantiation
interface SimpleAnimeData {
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
}

interface SmartAutoFillResult {
  success: boolean;
  data?: SimpleAnimeData;
  message: string;
  source?: string;
}

interface BatchSmartAutoFillResult {
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
}

interface EpisodeBatchUpdateResult {
  success: boolean;
  message: string;
  totalProcessed: number;
  totalEnhanced: number;
  errors: string[];
}

// ---------------------------------------------
// Anime News fetching (RSS-based, no API key)
// ---------------------------------------------
export const fetchAnimeNews = action({
  args: {},
  handler: async (ctx) => {
    // Lightweight RSS fetch from known anime sources
    const sources = [
      // Anime News Network (RSS)
      "https://www.animenewsnetwork.com/all/rss.xml",
      // MyAnimeList news (RSS)
      "https://myanimelist.net/rss/news.xml"
    ];

    type NewsItem = {
      id: string;
      title: string;
      link: string;
      source: string;
      publishedAt?: number;
      description?: string;
      imageUrl?: string;
    };

    const parseRss = async (xml: string, source: string): Promise<NewsItem[]> => {
      const items: NewsItem[] = [];
      try {
        // Very small XML parsing via regex for common tags; robust enough for these feeds
        const channelTitleMatch = xml.match(/<title>([^<]+)<\/title>/i);
        const sourceName = channelTitleMatch?.[1] || source;
        const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
        let match: RegExpExecArray | null;
        while ((match = itemRegex.exec(xml))) {
          const block = match[1];
          const title = (block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/i)?.[1] ||
                         block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ||
                         "Untitled").trim();
          const link = (block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || "").trim();
          const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || "").trim();
          const description = (block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/i)?.[1] || "").trim();
          // Try to find an <enclosure url="..."> or first img src in description
          const enclosure = block.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*>/i)?.[1];
          const imgInDesc = description.match(/<img[^>]*src=["']([^"']+)["']/i)?.[1];
          const imageUrl = enclosure || imgInDesc;

          const id = `${sourceName}-${link || title}`;
          const publishedAt = pubDate ? Date.parse(pubDate) : undefined;

          items.push({ id, title: decodeHtml(title), link, source: sourceName, publishedAt, description: stripHtml(description), imageUrl });
        }
      } catch (e) {
        console.error("[fetchAnimeNews] Failed to parse RSS for", source, e);
      }
      return items;
    };

    const decodeHtml = (text: string) => {
      return text
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
    };

    const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").trim();

    const allItems: NewsItem[] = [];
    for (const url of sources) {
      try {
        const res = await fetchWithTimeout(url, { timeout: 6000 });
        if (!res.ok) continue;
        const xml = await res.text();
        const items = await parseRss(xml, url);
        allItems.push(...items);
      } catch (e) {
        console.error("[fetchAnimeNews] Failed fetching", url, e);
      }
    }

    // Deduplicate by link/title and sort by date desc
    const dedup = new Map<string, NewsItem>();
    for (const item of allItems) {
      const key = item.link || item.title;
      if (!dedup.has(key)) dedup.set(key, item);
    }
    const news = Array.from(dedup.values()).sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0)).slice(0, 20);

    return { success: true, news } as any;
  }
});

// Lightweight metadata fetcher for article preview (OG tags only)
export const fetchArticleMetadata = action({
  args: { url: v.string() },
  handler: async (_ctx, args) => {
    try {
      const res = await fetchWithTimeout(args.url, { timeout: 7000 });
      if (!res.ok) return { success: false };
      const html = await res.text();

      const getMeta = (name: string, attr: string = "property") => {
        const re = new RegExp(`<meta[^>]+${attr}=["']${name}["'][^>]*content=["']([^"']+)["'][^>]*>`, "i");
        return html.match(re)?.[1];
      };

      const rawTitle =
        getMeta("og:title") ||
        (html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "").trim();

      const desc = getMeta("og:description") || getMeta("description", "name");
      const imageUrl = getMeta("og:image") || getMeta("twitter:image");
      const siteName = getMeta("og:site_name") || new URL(args.url).hostname.replace(/^www\./, "");

      const strip = (s?: string) => (s ? s.replace(/<[^>]*>/g, "").trim() : undefined);
      const title = strip(rawTitle);
      const description = strip(desc)?.slice(0, 300);

      return { success: true, title, description, imageUrl, siteName } as const;
    } catch (e) {
      console.error("[fetchArticleMetadata] Failed:", e);
      return { success: false } as const;
    }
  }
});

// Enhanced timeout and fallback functionality
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

// Enhanced poster fetching with multiple fallbacks (FIXED)
const fetchPosterWithFallbacks = async (
  searchTerm: string, 
  existingUrl?: string,
  allowUpgrade: boolean = true
): Promise<string | null> => {
    console.log(`[Enhanced Poster Fetch] Searching for poster: "${searchTerm}"`);

    if (!allowUpgrade && existingUrl && !existingUrl.includes('placehold') && !existingUrl.includes('placeholder')) {
        console.log(`[Enhanced Poster Fetch] Skipping - good poster exists and upgrades disabled`);
        return existingUrl;
    }

    const isLowQuality = !existingUrl || 
                        existingUrl.includes('placehold') || 
                        existingUrl.includes('placeholder') ||
                        existingUrl.includes('300x450') ||
                        existingUrl.includes('small') ||
                        existingUrl.includes('medium');

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
            console.log(`[Enhanced Poster Fetch] Attempting TMDB...`);
            
            const tmdbUrl = `https://api.themoviedb.org/3/search/tv?api_key=${tmdbKey}&query=${encodeURIComponent(searchTerm)}`;
            const res = await fetchWithTimeout(tmdbUrl, { timeout: DEFAULT_TIMEOUT_MS });
            
            if (res.ok) {
                const data = await res.json();
                const posterPath = data?.results?.[0]?.poster_path;
                if (posterPath) {
                    const poster = `https://image.tmdb.org/t/p/w500${posterPath}`;
                    console.log(`[Enhanced Poster Fetch] ✅ Found TMDb poster: ${poster}`);
                    return poster;
                }
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
    
    // AniList fallback code
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

    // 4. Jikan fallback
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

    // 5. Kitsu fallback
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
    forceUpgrade: v.optional(v.boolean())
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    details: v.optional(v.any()),
    source: v.optional(v.string())
  }),
  handler: async (ctx: ActionCtx, args): Promise<ExternalApiResult> => {
    const existingAnime = await ctx.runQuery(internal.anime.getAnimeByIdInternal, { animeId: args.animeIdInOurDB });
    if (!existingAnime) return { success: false, message: "Internal: Anime not found." };

    console.log(`[Enhanced External API] Processing: "${existingAnime.title}"`);

    const enhancedPosterUrl = await fetchPosterWithFallbacks(
        args.titleToSearch, 
        existingAnime.posterUrl,
        args.forceUpgrade || true
    );
    
    const updates: Partial<Omit<Doc<"anime">, "title" | "_id" | "_creationTime">> = {};
    let enhancementCount = 0;
    const sources: string[] = [];

    if (enhancedPosterUrl && enhancedPosterUrl !== existingAnime.posterUrl) {
        updates.posterUrl = enhancedPosterUrl;
        enhancementCount++;
        sources.push('poster');
    }

    if (Object.keys(updates).length > 0) {
        updates.lastFetchedFromExternal = {
            timestamp: Date.now(),
            source: 'enhanced_fallback_apis',
        };

        const updateResult = await ctx.runMutation(internal.anime.updateAnimeWithExternalData, {
            animeId: args.animeIdInOurDB,
            updates,
        });

        let protectionMessage = '';
        if (updateResult.protectedFields && updateResult.protectedFields.length > 0) {
          protectionMessage = ` (${updateResult.protectedFields.length} protected fields skipped)`;
        }

        return {
            success: true,
            message: `Enhanced ${enhancementCount} data fields: ${sources.join(', ')}${protectionMessage}`,
            source: 'enhanced_fallback_apis',
            details: { enhanced: sources, posterUpgraded: enhancedPosterUrl !== existingAnime.posterUrl },
            protectedFields: updateResult.protectedFields
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
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    details: v.optional(v.any()),
    source: v.optional(v.string())
  }),
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
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    totalProcessed: v.number(),
    totalEnhanced: v.number(),
    errors: v.array(v.string())
  }),
  handler: async (ctx: ActionCtx, args): Promise<EnhancedBatchResult> => {
    const batchSize = args.batchSize || 3;
    const maxAnimeToProcess = args.maxAnimeToProcess || 15;
    
    console.log(`[Enhanced Batch Processing] Starting enhanced batch processing...`);
    
    const allAnime: Doc<"anime">[] = await ctx.runQuery(internal.ai.getAllAnimeInternal, {});
    
    const animeNeedingEnhancement = allAnime
      .filter((anime: Doc<"anime">) => {
          const missingPoster = !anime.posterUrl || anime.posterUrl.includes('placeholder');
          const oldData = !anime.lastFetchedFromExternal || 
                         (Date.now() - anime.lastFetchedFromExternal.timestamp) > (7 * 24 * 60 * 60 * 1000);
          
        return missingPoster || oldData;
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
    
    let totalProcessed = 0;
    let totalEnhanced = 0;
    const errors: string[] = [];

    for (let i = 0; i < animeNeedingEnhancement.length; i += batchSize) {
      const batch = animeNeedingEnhancement.slice(i, i + batchSize);

      for (const anime of batch) {
        try {
          const result = await ctx.runAction(internal.externalApis.triggerFetchExternalAnimeDetailsEnhanced, {
            animeIdInOurDB: anime._id,
            titleToSearch: anime.title
          });
          
          totalProcessed++;
          
          if (result.success && result.details?.enhanced?.length > 0) {
            totalEnhanced++;
          }
          
          await new Promise(resolve => setTimeout(resolve, 3000));
          
        } catch (error: any) {
          totalProcessed++;
          errors.push(`${anime.title}: ${error.message}`);
        }
      }
      
      if (i + batchSize < animeNeedingEnhancement.length) {
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
    
    return {
      success: true,
      message: `Enhanced batch processing completed! Processed: ${totalProcessed}, Enhanced: ${totalEnhanced}`,
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
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    totalProcessed: v.number(),
    totalEnhanced: v.number(),
    errors: v.array(v.string())
  }),
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
  processed?: number;
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
      
      characters(sort: [ROLE, RELEVANCE, ID], page: 1, perPage: 20) {
        edges {
          role
          voiceActors {
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
      
      return {
        id: character.id || undefined,
        name: character.name.full || character.name.userPreferred,
        imageUrl: character.image?.large || undefined,
        role: edge.role || "BACKGROUND",
        description: character.description || undefined,
        gender: character.gender || undefined,
        age: character.age || undefined,
        dateOfBirth: character.dateOfBirth ? {
          year: character.dateOfBirth.year || undefined,
          month: character.dateOfBirth.month || undefined,
          day: character.dateOfBirth.day || undefined,
        } : undefined,
        bloodType: character.bloodType || undefined,
        nativeName: character.name.native || undefined,
        siteUrl: character.siteUrl || undefined,
        voiceActors: voiceActors.map((va: any) => ({
          id: va.id || undefined,
          name: va.name?.full || va.name?.userPreferred || "Unknown",
          language: va.languageV2 || "Unknown",
          imageUrl: va.image?.large || undefined,
        })).filter((va: any) => va.name !== "Unknown"),
      };
    })
    .slice(0, 25);
};

// NEW: Helper function to map episode data from AniList  
const mapEpisodeData = (streamingEpisodes: any[]): any[] => {
    if (!Array.isArray(streamingEpisodes)) return [];
    
    return streamingEpisodes
        .filter(ep => ep && (ep.title || ep.url))
        .map(ep => ({
            title: ep.title || `Episode ${streamingEpisodes.indexOf(ep) + 1}`,
            thumbnail: ep.thumbnail || undefined,
            url: ep.url || undefined,
            site: ep.site || undefined,
        }))
        .slice(0, 50);
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
            const updateResult = await ctx.runMutation(internal.anime.updateAnimeWithExternalData, {
              animeId: args.animeIdInOurDB,
              updates: updatesForMutation,
            });
            
            const episodeCount = mappedData.streamingEpisodes?.length || 0;
            const characterCount = mappedData.characters?.length || 0;
            const episodeMessage = episodeCount > 0 ? ` (${episodeCount} episodes)` : '';
            const characterMessage = characterCount > 0 ? ` (${characterCount} characters)` : '';
            
            // Include protection information in the response
            let protectionMessage = '';
            if (updateResult.protectedFields && updateResult.protectedFields.length > 0) {
              protectionMessage = ` (${updateResult.protectedFields.length} protected fields skipped)`;
            }
            
            return { 
              success: true, 
              message: `High-quality data from ${sourceApiUsed} applied${episodeMessage}${characterMessage}${protectionMessage}.`, 
              source: sourceApiUsed,
              protectedFields: updateResult.protectedFields 
            };
        } else {
            return { success: true, message: `No new data from ${sourceApiUsed} to update.`, source: sourceApiUsed };
        }
    } else {
        return { success: false, message: `No data found from any external API for "${args.titleToSearch}".`, source: sourceApiUsed };
    }
  },
});

// Helper functions for character data extraction
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
    
    const allAnime: Doc<"anime">[] = await ctx.runQuery(internal.ai.getAllAnimeInternal, {});
    
    const animeNeedingEpisodeUpdate = allAnime
      .filter((anime: Doc<"anime">) => {
        if (!anime.streamingEpisodes || anime.streamingEpisodes.length === 0) return true;
        
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

    for (let i = 0; i < animeNeedingEpisodeUpdate.length; i += batchSize) {
      const batch = animeNeedingEpisodeUpdate.slice(i, i + batchSize);
      
      console.log(`[Episode Batch Update] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(animeNeedingEpisodeUpdate.length / batchSize)}`);

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
      
      await Promise.all(batchPromises);
      
      if (i + batchSize < animeNeedingEpisodeUpdate.length) {
        console.log(`[Episode Batch Update] Waiting 8 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 8000));
      }
    }
    
    const message = `Episode batch update completed! Processed: ${totalProcessed}, Enhanced: ${totalEnhanced}, Errors: ${errors.length}`;
    console.log(`[Episode Batch Update] ${message}`);
    
    return {
      success: true,
      message,
      totalProcessed,
      totalEnhanced,
      errors: errors.slice(0, 10)
    };
  },
});

// Add scheduled enhancement for existing anime with low-quality posters
export const enhanceExistingAnimePosters = internalAction({
  args: {},
  handler: async (ctx: ActionCtx) => {
    console.log("[Poster Enhancement] Starting batch enhancement of existing anime posters...");
    
    // Get anime with potentially low-quality posters
    const allAnime: Doc<"anime">[] = await ctx.runQuery(internal.ai.getAllAnimeInternal, {});
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
    const batchSize = 3;
    
    for (let i = 0; i < args.animeIds.length; i += batchSize) {
      const batchIds = args.animeIds.slice(i, i + batchSize);
      
      const batchPromises = batchIds.map(async (animeId: Id<"anime">): Promise<boolean> => {
        try {
          const anime: Doc<"anime"> | null = await ctx.runQuery(internal.anime.getAnimeByIdInternal, { animeId });
          if (!anime) {
            console.warn(`[Batch Poster Enhancement] Anime ${animeId} not found`);
            return false;
          }

          const needsEnhancement = !anime.posterUrl || 
                                 anime.posterUrl.includes('placehold.co') || 
                                 anime.posterUrl.includes('placeholder') ||
                                 anime.posterUrl.includes('300x450') ||
                                 !anime.lastFetchedFromExternal ||
                                 (Date.now() - anime.lastFetchedFromExternal.timestamp) > (7 * 24 * 60 * 60 * 1000);

          if (needsEnhancement) {
            console.log(`[Batch Poster Enhancement] Enhancing poster for: ${anime.title}`);
            
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

      const batchResults = await Promise.all(batchPromises);
      enhancedCount += batchResults.filter(result => result === true).length;

      if (i + batchSize < args.animeIds.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      console.log(`[Batch Poster Enhancement] Batch ${Math.floor(i / batchSize) + 1} complete. Enhanced: ${batchResults.filter(r => r).length}/${batchResults.length}`);
    }

    console.log(`[Batch Poster Enhancement] Complete! Enhanced ${enhancedCount} out of ${args.animeIds.length} anime.`);

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
    
    const allAnime: Doc<"anime">[] = await ctx.runQuery(internal.ai.getAllAnimeInternal, {});
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
    const allAnime: Doc<"anime">[] = await ctx.runQuery(internal.ai.getAllAnimeInternal, {});
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
      const allAnime: Doc<"anime">[] = await ctx.runQuery(internal.ai.getAllAnimeInternal, {});
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
        const allAnime: Doc<"anime">[] = await ctx.runQuery(internal.ai.getAllAnimeInternal, {});
    
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
    
    const allAnime: Doc<"anime">[] = await ctx.runQuery(internal.ai.getAllAnimeInternal, {});
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
    
    const allAnime: Doc<"anime">[] = await ctx.runQuery(internal.ai.getAllAnimeInternal, {});
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
});

// Import trending anime from AniList and add to database
export const fetchTrendingAnime = action({
  args: { limit: v.optional(v.number()) },
  returns: v.object({
    imported: v.number(),
    added: v.array(v.string()),
    error: v.optional(v.string())
  }),
  handler: async (ctx: ActionCtx, args) => {
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
        
        // Check if this anime was previously deleted and is protected
        const isProtected = await ctx.runQuery(internal.anime.checkDeletedAnimeProtection, {
          title,
          anilistId: item.id,
        });
        
        if (isProtected) {
          console.log(`[Trending Import] Skipping previously deleted anime: "${title}"`);
          continue;
        }
        
        await ctx.runMutation(internal.anime.addAnimeInternal, {
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
  returns: v.object({
    imported: v.number(),
    added: v.array(v.string()),
    error: v.optional(v.string())
  }),
  handler: async (ctx: ActionCtx, args) => {
    return await ctx.runAction(api.externalApis.fetchTrendingAnime, args);
  }
});

// Helper function for AniList queries
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

// Studio-specific functions using database-only approach
export const fetchStudioGhibliAnime = action({
  args: { limit: v.optional(v.number()) },
  returns: v.object({
    animes: v.optional(v.array(v.any())),
    error: v.optional(v.string())
  }),
  handler: async (ctx: ActionCtx, args) => {
    const limit = args.limit ?? 100;
    
    const allAnime = await ctx.runQuery(internal.ai.getAllAnimeInternal, {});
    
    const ghibliAnime = allAnime.filter(anime => {
      const studios = anime.studios || [];
      const title = anime.title.toLowerCase();
      
      const isGhibliStudio = studios.some(studio => 
        studio.toLowerCase().includes('ghibli')
      );
      
      const knownGhibliTitles = [
        'spirited away', 'princess mononoke', 'my neighbor totoro', 'howl\'s moving castle',
        'castle in the sky', 'kiki\'s delivery service', 'ponyo', 'the wind rises'
      ];
      
      const isTitleMatch = knownGhibliTitles.some(ghibliTitle => 
        title.includes(ghibliTitle)
      );
      
      return isGhibliStudio || isTitleMatch;
    });
    
    const recommendations = ghibliAnime.slice(0, limit).map(anime => ({
      title: anime.title,
      description: anime.description || '',
      posterUrl: anime.posterUrl || '',
      genres: anime.genres || [],
      year: anime.year,
      rating: anime.rating,
      emotionalTags: anime.emotionalTags || [],
      trailerUrl: anime.trailerUrl || '',
      studios: anime.studios || ['Studio Ghibli'],
      themes: anime.themes || [],
      reasoning: 'Magical Studio Ghibli masterpiece from your collection',
      moodMatchScore: anime.rating || 8.5,
      _id: anime._id,
      foundInDatabase: true,
      anilistId: anime.anilistId
    }));
    
    return { animes: recommendations };
  }
});

export const fetchMadhouseAnime = action({
  args: { limit: v.optional(v.number()) },
  returns: v.object({
    animes: v.optional(v.array(v.any())),
    error: v.optional(v.string())
  }),
  handler: async (ctx: ActionCtx, args) => {
    const limit = args.limit ?? 100;
    
    console.log(`[Madhouse] Fetching from database only...`);
    
    // Get all anime from database
    const allAnime = await ctx.runQuery(internal.ai.getAllAnimeInternal, {});
    
    // Filter for Madhouse works
    const madhouseAnime = allAnime.filter(anime => {
      const studios = anime.studios || [];
      const title = anime.title.toLowerCase();
      
      // Check if studio contains "madhouse"
      const isMadhouseStudio = studios.some(studio => 
        studio.toLowerCase().includes('madhouse')
      );
      
      // Known Madhouse titles (backup check)
      const knownMadhouseTitles = [
        'one punch man', 'death note', 'hunter x hunter', 'parasyte',
        'overlord', 'black lagoon', 'trigun', 'monster', 'hellsing',
        'vampire knight', 'chobits', 'cardcaptor sakura', 'perfect blue',
        'paprika', 'millennium actress', 'tokyo godfathers', 'satoshi kon',
        'ninja scroll', 'vampire hunter d', 'redline', 'summer wars'
      ];
      
      const isTitleMatch = knownMadhouseTitles.some(madhouseTitle => 
        title.includes(madhouseTitle)
      );
      
      return isMadhouseStudio || isTitleMatch;
    });
    
    // Convert to AnimeRecommendation format
    const recommendations = madhouseAnime.slice(0, limit).map(anime => ({
      title: anime.title,
      description: anime.description || '',
      posterUrl: anime.posterUrl || '',
      genres: anime.genres || [],
      year: anime.year,
      rating: anime.rating,
      emotionalTags: anime.emotionalTags || [],
      trailerUrl: anime.trailerUrl || '',
      studios: anime.studios || ['Madhouse'],
      themes: anime.themes || [],
      reasoning: 'Legendary Madhouse production from your collection',
      moodMatchScore: anime.rating || 8.4,
      _id: anime._id,
      foundInDatabase: true,
      anilistId: anime.anilistId
    }));
    
    console.log(`[Madhouse] Found ${recommendations.length} Madhouse works in database`);
    
    return { animes: recommendations };
  }
});

export const fetchMappaAnime = action({
  args: { limit: v.optional(v.number()) },
  returns: v.object({
    animes: v.optional(v.array(v.any())),
    error: v.optional(v.string())
  }),
  handler: async (ctx: ActionCtx, args) => {
    const limit = args.limit ?? 100;
    
    console.log(`[MAPPA] Fetching from database only...`);
    
    // Get all anime from database
    const allAnime = await ctx.runQuery(internal.ai.getAllAnimeInternal, {});
    
    // Filter for MAPPA works
    const mappaAnime = allAnime.filter(anime => {
      const studios = anime.studios || [];
      const title = anime.title.toLowerCase();
      
      // Check if studio contains "mappa"
      const isMappaStudio = studios.some(studio => 
        studio.toLowerCase().includes('mappa')
      );
      
      // Known MAPPA titles (backup check)
      const knownMappaTitles = [
        'attack on titan', 'jujutsu kaisen', 'chainsaw man', 'hell\'s paradise',
        'zombie land saga', 'dororo', 'banana fish', 'kakegurui', 'yuri on ice',
        'terror in resonance', 'kids on the slope', 'rage of bahamut', 'garo',
        'shingeki no kyojin', 'jigokuraku', 'sakamichi no apollon'
      ];
      
      const isTitleMatch = knownMappaTitles.some(mappaTitle => 
        title.includes(mappaTitle)
      );
      
      return isMappaStudio || isTitleMatch;
    });
    
    // Convert to AnimeRecommendation format
    const recommendations = mappaAnime.slice(0, limit).map(anime => ({
      title: anime.title,
      description: anime.description || '',
      posterUrl: anime.posterUrl || '',
      genres: anime.genres || [],
      year: anime.year,
      rating: anime.rating,
      emotionalTags: anime.emotionalTags || [],
      trailerUrl: anime.trailerUrl || '',
      studios: anime.studios || ['MAPPA'],
      themes: anime.themes || [],
      reasoning: 'Modern MAPPA masterpiece from your collection',
      moodMatchScore: anime.rating || 8.2,
      _id: anime._id,
      foundInDatabase: true,
      anilistId: anime.anilistId
    }));
    
    console.log(`[MAPPA] Found ${recommendations.length} MAPPA works in database`);
    
    return { animes: recommendations };
  }
});

export const fetchBonesAnime = action({
  args: { limit: v.optional(v.number()) },
  returns: v.object({
    animes: v.optional(v.array(v.any())),
    error: v.optional(v.string())
  }),
  handler: async (ctx: ActionCtx, args) => {
    const limit = args.limit ?? 100;
    
    console.log(`[Bones] Fetching from database only...`);
    
    // Get all anime from database
    const allAnime = await ctx.runQuery(internal.ai.getAllAnimeInternal, {});
    
    // Filter for Bones works
    const bonesAnime = allAnime.filter(anime => {
      const studios = anime.studios || [];
      const title = anime.title.toLowerCase();
      
      // Check if studio contains "bones"
      const isBonesStudio = studios.some(studio => 
        studio.toLowerCase().includes('bones')
      );
      
      // Known Bones titles (backup check)
      const knownBonesTitles = [
        'fullmetal alchemist', 'my hero academia', 'mob psycho', 'soul eater',
        'ouran high school host club', 'darker than black', 'star driver',
        'eureka seven', 'space dandy', 'noragami', 'bungo stray dogs',
        'boku no hero academia', 'concrete revolutio', 'blood blockade battlefront',
        'kekkai sensen', 'rahxephon', 'wolf\'s rain', 'scrapped princess'
      ];
      
      const isTitleMatch = knownBonesTitles.some(bonesTitle => 
        title.includes(bonesTitle)
      );
      
      return isBonesStudio || isTitleMatch;
    });
    
    // Convert to AnimeRecommendation format
    const recommendations = bonesAnime.slice(0, limit).map(anime => ({
      title: anime.title,
      description: anime.description || '',
      posterUrl: anime.posterUrl || '',
      genres: anime.genres || [],
      year: anime.year,
      rating: anime.rating,
      emotionalTags: anime.emotionalTags || [],
      trailerUrl: anime.trailerUrl || '',
      studios: anime.studios || ['Bones'],
      themes: anime.themes || [],
      reasoning: 'High-quality Bones production from your collection',
      moodMatchScore: anime.rating || 8.3,
      _id: anime._id,
      foundInDatabase: true,
      anilistId: anime.anilistId
    }));
    
    console.log(`[Bones] Found ${recommendations.length} Bones works in database`);
    
    return { animes: recommendations };
  }
});

export const fetchKyotoAnimationAnime = action({
  args: { limit: v.optional(v.number()) },
  returns: v.object({
    animes: v.optional(v.array(v.any())),
    error: v.optional(v.string())
  }),
  handler: async (ctx: ActionCtx, args) => {
    const limit = args.limit ?? 100;
    
    console.log(`[Kyoto Animation] Fetching from database only...`);
    
    // Get all anime from database
    const allAnime = await ctx.runQuery(internal.ai.getAllAnimeInternal, {});
    
    // Filter for Kyoto Animation works
    const kyoaniAnime = allAnime.filter(anime => {
      const studios = anime.studios || [];
      const title = anime.title.toLowerCase();
      
      // Check if studio contains "kyoto animation" or "kyoani"
      const isKyoaniStudio = studios.some(studio => {
        const studioLower = studio.toLowerCase();
        return studioLower.includes('kyoto animation') || 
               studioLower.includes('kyoani') ||
               studioLower.includes('kyoto ani');
      });
      
      // Known Kyoto Animation titles (backup check)
      const knownKyoaniTitles = [
        'k-on', 'clannad', 'violet evergarden', 'a silent voice', 'your name',
        'the melancholy of haruhi suzumiya', 'lucky star', 'tamako market',
        'free!', 'sound! euphonium', 'hibike! euphonium', 'dragon maid',
        'miss kobayashi\'s dragon maid', 'hyouka', 'nichijou', 'kanon',
        'air', 'phantom world', 'amagi brilliant park', 'beyond the boundary',
        'kyoukai no kanata', 'love, chunibyo', 'tamako love story',
        'liz and the blue bird', 'tsurune', 'kobayashi-san'
      ];
      
      const isTitleMatch = knownKyoaniTitles.some(kyoaniTitle => 
        title.includes(kyoaniTitle)
      );
      
      return isKyoaniStudio || isTitleMatch;
    });
    
    // Convert to AnimeRecommendation format
    const recommendations = kyoaniAnime.slice(0, limit).map(anime => ({
      title: anime.title,
      description: anime.description || '',
      posterUrl: anime.posterUrl || '',
      genres: anime.genres || [],
      year: anime.year,
      rating: anime.rating,
      emotionalTags: anime.emotionalTags || [],
      trailerUrl: anime.trailerUrl || '',
      studios: anime.studios || ['Kyoto Animation'],
      themes: anime.themes || [],
      reasoning: 'Beautiful Kyoto Animation masterpiece from your collection',
      moodMatchScore: anime.rating || 8.6,
      _id: anime._id,
      foundInDatabase: true,
      anilistId: anime.anilistId
    }));
    
    console.log(`[Kyoto Animation] Found ${recommendations.length} KyoAni works in database`);
    
    return { animes: recommendations };
  }
  });

// Smart Auto-Fill System - Fetch anime data by AniList or MyAnimeList ID
export const smartAutoFillByExternalId = action({
  args: {
    anilistId: v.optional(v.number()),
    myAnimeListId: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<SmartAutoFillResult> => {
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
      let mappedData: SimpleAnimeData;

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

      } else {
        // MyAnimeList mapping
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
          episodeDuration: parseInt(apiData.duration) || undefined,
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
    createNew: v.boolean(),
  },
  handler: async (ctx, args): Promise<BatchSmartAutoFillResult> => {
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
    const batchSize = 3;

    console.log(`[Batch Smart Auto-Fill] Processing ${args.ids.length} anime IDs...`);

    // Process in batches
    for (let i = 0; i < args.ids.length; i += batchSize) {
      const batch = args.ids.slice(i, i + batchSize);
      
      // Process batch in parallel
      const batchPromises = batch.map(async (idPair) => {
        try {
          const result = await ctx.runAction(api.externalApis.smartAutoFillByExternalId, idPair);
          
          if (result.success && result.data && args.createNew) {
            // Check if anime already exists
            const existingAnime = await ctx.runQuery(internal.anime.checkAnimeExistsByExternalIds, {
              anilistId: result.data.anilistId,
              myAnimeListId: result.data.myAnimeListId,
              title: result.data.title
            });

            if (!existingAnime) {
              // Check if this anime was previously deleted and is protected
              const isProtected = await ctx.runQuery(internal.anime.checkDeletedAnimeProtection, {
                title: result.data.title,
                anilistId: result.data.anilistId,
                myAnimeListId: result.data.myAnimeListId,
              });
              
              if (isProtected) {
                console.log(`[Batch Smart Auto-Fill] Skipping previously deleted anime: "${result.data.title}"`);
                return {
                  success: false,
                  error: "Anime was previously deleted by admin",
                  data: result.data,
                  anilistId: idPair.anilistId,
                  myAnimeListId: idPair.myAnimeListId
                };
              }
              
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
        await new Promise(resolve => setTimeout(resolve, 2000));
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

// Additional genre-specific fetch functions
export const fetchSliceOfLifeAnime = action({
  args: { limit: v.optional(v.number()) },
  returns: v.object({
    animes: v.optional(v.array(v.any())),
    error: v.optional(v.string())
  }),
  handler: async (_ctx: ActionCtx, args) => {
    const limit = args.limit ?? 10;
    
    const query = `query ($page:Int,$perPage:Int) { 
      Page(page:$page, perPage:$perPage){ 
        media(
          type: ANIME, 
          sort: [SCORE_DESC, POPULARITY_DESC],
          genre_in: ["Slice of Life", "Drama", "School"],
          averageScore_greater: 65,
          genre_not_in: ["Hentai", "Action", "Adventure"]
        ) { 
          id 
          title { romaji } 
          description(asHtml:false) 
          startDate{ year } 
          coverImage{ extraLarge } 
          averageScore 
          genres 
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
        reasoning: `Peaceful slice of life anime`,
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

export const fetchSportsAnime = action({
  args: { limit: v.optional(v.number()) },
  returns: v.object({
    animes: v.optional(v.array(v.any())),
    error: v.optional(v.string())
  }),
  handler: async (_ctx: ActionCtx, args) => {
    const limit = args.limit ?? 10;
    
    const query = `query ($page:Int,$perPage:Int) { 
      Page(page:$page, perPage:$perPage){ 
        media(
          type: ANIME, 
          sort: [SCORE_DESC, POPULARITY_DESC],
          genre_in: ["Sports"],
          averageScore_greater: 65,
          genre_not_in: ["Hentai"]
        ) { 
          id 
          title { romaji } 
          description(asHtml:false) 
          startDate{ year } 
          coverImage{ extraLarge } 
          averageScore 
          genres 
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
        reasoning: `Inspiring sports anime`,
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

export const fetchMusicAnime = action({
  args: { limit: v.optional(v.number()) },
  returns: v.any(), // Simplified to avoid deep type recursion
  handler: async (_ctx: ActionCtx, args) => {
    const limit = args.limit ?? 10;
    
    const query = `query ($page:Int,$perPage:Int) { 
      Page(page:$page, perPage:$perPage){ 
        media(
          type: ANIME, 
          sort: [SCORE_DESC, POPULARITY_DESC],
          genre_in: ["Music"],
          averageScore_greater: 65,
          genre_not_in: ["Hentai"]
        ) { 
          id 
          title { romaji } 
          description(asHtml:false) 
          startDate{ year } 
          coverImage{ extraLarge } 
          averageScore 
          genres 
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
        reasoning: `Melodic music anime`,
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

export const fetchMechaAnime = action({
  args: { limit: v.optional(v.number()) },
  returns: v.object({
    animes: v.optional(v.array(v.any())),
    error: v.optional(v.string())
  }),
  handler: async (_ctx: ActionCtx, args) => {
    const limit = args.limit ?? 10;
    
    const query = `query ($page:Int,$perPage:Int) { 
      Page(page:$page, perPage:$perPage){ 
        media(
          type: ANIME, 
          sort: [SCORE_DESC, POPULARITY_DESC],
          genre_in: ["Mecha"],
          averageScore_greater: 65,
          genre_not_in: ["Hentai"]
        ) { 
          id 
          title { romaji } 
          description(asHtml:false) 
          startDate{ year } 
          coverImage{ extraLarge } 
          averageScore 
          genres 
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
        reasoning: `Epic mecha anime`,
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

export const fetchIsekaiAnime = action({
  args: { limit: v.optional(v.number()) },
  returns: v.object({
    animes: v.optional(v.array(v.any())),
    error: v.optional(v.string())
  }),
  handler: async (_ctx: ActionCtx, args) => {
    const limit = args.limit ?? 10;
    
    // Isekai is more of a theme than a genre, so we search by keywords
    const query = `query ($page:Int,$perPage:Int) { 
      Page(page:$page, perPage:$perPage){ 
        media(
          type: ANIME, 
          sort: [SCORE_DESC, POPULARITY_DESC],
          genre_in: ["Fantasy", "Adventure"],
          averageScore_greater: 65,
          genre_not_in: ["Hentai"]
        ) { 
          id 
          title { romaji } 
          description(asHtml:false) 
          startDate{ year } 
          coverImage{ extraLarge } 
          averageScore 
          genres 
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
      
      // Filter for isekai content
      const isekaiMedia = media.filter((item: any) => {
        const description = (item.description || '').toLowerCase();
        const title = (item.title?.romaji || '').toLowerCase();
        
        const isekaiKeywords = [
          'another world', 'transported', 'reincarnated', 'summoned', 'isekai', 
          'different world', 'parallel world', 'fantasy world', 'game world'
        ];
        
        return isekaiKeywords.some(keyword => 
          description.includes(keyword) || title.includes(keyword)
        );
      }).slice(0, limit);
      
      const animes = isekaiMedia.map((item: any) => ({
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
        reasoning: `Thrilling isekai adventure`,
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

export const fetchPopularAnime = action({
  args: { limit: v.optional(v.number()) },
  returns: v.object({
    animes: v.optional(v.array(v.any())),
    error: v.optional(v.string())
  }),
  handler: async (_ctx: ActionCtx, args) => {
    const limit = args.limit ?? 10;
    
    const query = `query ($page:Int,$perPage:Int) { 
      Page(page:$page, perPage:$perPage){ 
        media(
          type: ANIME, 
          sort: [POPULARITY_DESC],
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
        reasoning: `Popular anime with high ratings`,
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

export const fetchTopRatedAnime = action({
  args: { limit: v.optional(v.number()) },
  returns: v.object({
    animes: v.optional(v.array(v.any())),
    error: v.optional(v.string())
  }),
  handler: async (_ctx: ActionCtx, args) => {
    const limit = args.limit ?? 10;
    
    const query = `query ($page:Int,$perPage:Int) { 
      Page(page:$page, perPage:$perPage){ 
        media(
          type: ANIME, 
          sort: [SCORE_DESC],
          averageScore_greater: 80,
          genre_not_in: ["Hentai"]
        ) { 
          id 
          title { romaji } 
          description(asHtml:false) 
          startDate{ year } 
          coverImage{ extraLarge } 
          averageScore 
          genres 
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
        reasoning: `Critically acclaimed top-rated anime`,
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

export const fetchBingeableAnime = action({
  args: { limit: v.optional(v.number()) },
  returns: v.object({
    animes: v.optional(v.array(v.any())),
    error: v.optional(v.string())
  }),
  handler: async (_ctx: ActionCtx, args) => {
    const limit = args.limit ?? 10;
    
    const query = `query ($page:Int,$perPage:Int) { 
      Page(page:$page, perPage:$perPage){ 
        media(
          type: ANIME, 
          sort: [POPULARITY_DESC],
          episodes_greater: 12,
          episodes_lesser: 50,
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
        reasoning: `Perfect for binge-watching (${item.episodes || 'Unknown'} episodes)`,
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