// convex/externalApis.ts - Enhanced version with better image quality

"use node";
import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
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

interface ExternalApiResult {
  success: boolean;
  message: string;
  details?: any;
  source?: string;
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

export const triggerFetchExternalAnimeDetails = internalAction({
  args: { animeIdInOurDB: v.id("anime"), titleToSearch: v.string() },
  handler: async (ctx: ActionCtx, args): Promise<ExternalApiResult> => {
    const existingAnime = await ctx.runQuery(internal.anime.getAnimeByIdInternal, { animeId: args.animeIdInOurDB });
    if (!existingAnime) return { success: false, message: "Internal: Anime not found." };

    let apiData: any = null;
    let sourceApiUsed: string = "none";

    // Try AniList first (higher quality images)
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
            console.log(`[External API - AniList] Mapped data for (AniList ID: ${apiData.id}). Title in DB: "${existingAnime.title}"`);
        }

        const updatesForMutation: Partial<Omit<Doc<"anime">, "title" | "_id" | "_creationTime">> = { ...mappedData };

        if (Object.keys(updatesForMutation).length > 0) {
            await ctx.runMutation(internal.anime.updateAnimeWithExternalData, {
              animeId: args.animeIdInOurDB,
              updates: updatesForMutation,
              sourceApi: sourceApiUsed,
            });
            return { success: true, message: `High-quality data from ${sourceApiUsed} applied.`, source: sourceApiUsed };
        } else {
            return { success: true, message: `No new data from ${sourceApiUsed} to update.`, source: sourceApiUsed };
        }
    } else {
        return { success: false, message: `No data found from any external API for "${args.titleToSearch}".`, source: sourceApiUsed };
    }
  },
});

// Add scheduled enhancement for existing anime with low-quality posters
export const enhanceExistingAnimePosters = internalAction({
  args: {},
  handler: async (ctx: ActionCtx) => {
    console.log("[Poster Enhancement] Starting batch enhancement of existing anime posters...");
    
    // Get anime with potentially low-quality posters
    const allAnime = await ctx.runQuery(internal.ai.getAllAnimeInternal, {});
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