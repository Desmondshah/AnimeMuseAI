// convex/externalApis.ts
"use node";
import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { ActionCtx } from "./_generated/server";

// Helper Functions (getString, getNumber, getStringArray)
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
        const mappedArr = arr.map(item => getString(item, nameField)).filter(Boolean) as string[];
        return mappedArr.length > 0 ? mappedArr : undefined;
    }
    return undefined;
};

interface ExternalApiResult {
  success: boolean;
  message: string;
  details?: any; // For additional error details or API response info
}

// ---- PHASE 1: Strengthened External API Integration ----
const MAX_RETRIES = 1; // Retry once on specific errors
const RETRY_DELAY_MS = 1000; // Delay 1 second before retrying

export const triggerFetchExternalAnimeDetails = internalAction({
  args: {
    animeIdInOurDB: v.id("anime"),
    titleToSearch: v.string(),
  },
  handler: async (ctx: ActionCtx, args): Promise<ExternalApiResult> => {
    console.log(`[External API - Jikan] Request to fetch details for: "${args.titleToSearch}" (DB ID: ${args.animeIdInOurDB})`);

    const existingAnime = await ctx.runQuery(internal.anime.getAnimeByIdInternal, { animeId: args.animeIdInOurDB });
    if (!existingAnime) {
        console.error(`[External API - Jikan] Anime with ID ${args.animeIdInOurDB} not found in our DB. Cannot fetch external details.`);
        return { success: false, message: "Internal: Anime not found in database." };
    }

    const encodedTitle = encodeURIComponent(args.titleToSearch);
    const externalApiUrl = `https://api.jikan.moe/v4/anime?q=${encodedTitle}&limit=1`; // Jikan specific

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`[External API - Jikan] Attempt ${attempt + 1} for "${args.titleToSearch}"`);
            const response = await fetch(externalApiUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) {
                const errorBodyText = await response.text(); // Read error body as text
                console.error(`[External API - Jikan] Request failed for "${args.titleToSearch}": ${response.status} ${response.statusText}. Body: ${errorBodyText}`);

                // Retry for specific server-side errors or rate limits (429)
                if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES) {
                    console.log(`[External API - Jikan] Retrying after ${RETRY_DELAY_MS}ms...`);
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                    continue; // Next attempt
                }
                return { success: false, message: `Jikan API request failed: ${response.status} ${response.statusText}`, details: { statusCode: response.status, body: errorBodyText } };
            }

            const externalResponse = await response.json();
            const animeData = externalResponse?.data?.[0];

            if (animeData) {
                console.log(`[External API - Jikan] Data found for "${args.titleToSearch}". MAL ID: ${animeData.mal_id}`);

                const mappedData: Partial<Doc<"anime">> = {
                  description: getString(animeData, 'synopsis', existingAnime?.description),
                  posterUrl: getString(animeData, 'images.jpg.large_image_url', getString(animeData, 'images.webp.large_image_url', existingAnime?.posterUrl)),
                  genres: getStringArray(animeData, 'genres', 'name') || existingAnime?.genres,
                  year: getNumber(animeData, 'year', existingAnime?.year) || (animeData.aired?.from ? new Date(animeData.aired.from).getFullYear() : undefined),
                  rating: getNumber(animeData, 'score', existingAnime?.rating),
                  emotionalTags: getStringArray(animeData, 'themes', 'name')?.concat(getStringArray(animeData, 'demographics', 'name') || []) || existingAnime?.emotionalTags, // Combining themes and demographics as potential emotional tags
                  trailerUrl: getString(animeData, 'trailer.url', existingAnime?.trailerUrl),
                  studios: getStringArray(animeData, 'studios', 'name') || existingAnime?.studios,
                  themes: getStringArray(animeData, 'themes', 'name') || existingAnime?.themes, // Jikan has 'themes' which is good
                };

                const updatesToSend: Partial<Doc<"anime">> = {};
                for (const key in mappedData) {
                    const typedKey = key as keyof typeof mappedData;
                    const newValue = mappedData[typedKey];
                    if (newValue !== undefined) { // Allow null to be set if API returns it and field is optional
                        const existingValue = existingAnime ? existingAnime[typedKey] : undefined;
                        let changed = JSON.stringify(existingValue) !== JSON.stringify(newValue); // Simple compare for arrays/objects
                        
                        // Don't update if new value is empty string and existing had content (for strings)
                        if (typeof newValue === 'string' && newValue.trim() === "" && typeof existingValue === 'string' && existingValue.trim() !== "") {
                            changed = false;
                        }
                        if (changed) {
                            updatesToSend[typedKey] = newValue as any;
                        }
                    }
                }
                
                if (Object.keys(updatesToSend).length > 0) {
                    await ctx.runMutation(internal.anime.updateAnimeWithExternalData, {
                      animeId: args.animeIdInOurDB,
                      updates: updatesToSend,
                    });
                    console.log(`[External API - Jikan] Successfully triggered update for "${args.titleToSearch}" with ${Object.keys(updatesToSend).length} fields updated.`);
                    return { success: true, message: "Data fetched and update triggered." };
                } else {
                    console.log(`[External API - Jikan] No new valuable data found for "${args.titleToSearch}" to update.`);
                    return { success: true, message: "No new data to update." };
                }
            } else {
                console.warn(`[External API - Jikan] No data array found for "${args.titleToSearch}" in external API response. Response:`, JSON.stringify(externalResponse).substring(0, 500));
                return { success: false, message: "No data found in Jikan API response." };
            }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[External API - Jikan] Error during attempt ${attempt + 1} for "${args.titleToSearch}":`, errorMessage);
          if (attempt >= MAX_RETRIES) {
            return { success: false, message: `Error fetching data from Jikan: ${errorMessage}` };
          }
          // If it's not the last attempt, it will loop and retry after delay (if applicable) or fail out
        }
    }
    // Should not be reached if MAX_RETRIES is >= 0, but as a fallback:
    return { success: false, message: "Exhausted retries for Jikan API." };
  },
});


// Public wrapper action (remains the same)
export const callTriggerFetchExternalAnimeDetails = action({
  args: {
    animeIdInOurDB: v.id("anime"),
    titleToSearch: v.string(),
  },
  handler: async (ctx: ActionCtx, args): Promise<ExternalApiResult> => {
    const result: ExternalApiResult = await ctx.runAction(internal.externalApis.triggerFetchExternalAnimeDetails, {
      animeIdInOurDB: args.animeIdInOurDB,
      titleToSearch: args.titleToSearch,
    });
    return result;
  },
});