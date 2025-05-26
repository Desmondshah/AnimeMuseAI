// File: convex/externalApis.ts
"use node";
import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { ActionCtx } from "./_generated/server"; // Import ActionCtx for context typing

// --- Helper Functions (getString, getNumber, getStringArray) ---
// (These remain the same as in the previous correct version, ensure they are present)
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
// --- End Helper Functions ---


// Define a common return type for these actions
interface ExternalApiResult {
  success: boolean;
  message: string;
}

// Your existing INTERNAL action with explicit return type
export const triggerFetchExternalAnimeDetails = internalAction({
  args: {
    animeIdInOurDB: v.id("anime"),
    titleToSearch: v.string(),
  },
  handler: async (ctx: ActionCtx, args): Promise<ExternalApiResult> => { // Added ActionCtx and Promise<ExternalApiResult>
    console.log(`[External API] Request to fetch details for: "${args.titleToSearch}" (DB ID: ${args.animeIdInOurDB})`);

    const existingAnime = await ctx.runQuery(internal.anime.getAnimeByIdInternal, { animeId: args.animeIdInOurDB });

    const encodedTitle = encodeURIComponent(args.titleToSearch);
    const externalApiUrl = `https://api.jikan.moe/v4/anime?q=${encodedTitle}&limit=1`;

    try {
      const response = await fetch(externalApiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[External API] Request failed for "${args.titleToSearch}": ${response.status} ${response.statusText}`, errorBody);
        // Ensure a consistent return structure for errors too
        return { success: false, message: `External API request failed: ${response.status} ${response.statusText}` };
      }

      const externalResponse = await response.json();
      const animeData = externalResponse?.data?.[0];

      if (animeData) {
        console.log(`[External API] Data found for "${args.titleToSearch}".`);

        const mappedData: Partial<Doc<"anime">> = {
          description: getString(animeData, 'synopsis', existingAnime?.description),
          posterUrl: getString(animeData, 'images.jpg.large_image_url', existingAnime?.posterUrl),
          genres: getStringArray(animeData, 'genres', 'name') || existingAnime?.genres,
          year: getNumber(animeData, 'year', existingAnime?.year),
          rating: getNumber(animeData, 'score', existingAnime?.rating),
          emotionalTags: getStringArray(animeData, 'themes', 'name') || existingAnime?.emotionalTags,
          trailerUrl: getString(animeData, 'trailer.url', existingAnime?.trailerUrl),
          studios: getStringArray(animeData, 'studios', 'name') || existingAnime?.studios,
          themes: getStringArray(animeData, 'themes', 'name') || existingAnime?.themes,
        };

        const updatesToSend: Partial<Doc<"anime">> = {};
        for (const key in mappedData) {
            const typedKey = key as keyof typeof mappedData;
            const newValue = mappedData[typedKey];
            if (newValue !== undefined && newValue !== null) {
                const existingValue = existingAnime ? existingAnime[typedKey] : undefined;
                let changed = existingValue !== newValue;
                if (Array.isArray(newValue) && Array.isArray(existingValue)) {
                    changed = JSON.stringify(newValue.slice().sort()) !== JSON.stringify(existingValue.slice().sort());
                }
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
            console.log(`[External API] Successfully triggered update for "${args.titleToSearch}" with ${Object.keys(updatesToSend).length} fields updated.`);
            return { success: true, message: "Data fetched and update triggered." };
        } else {
            console.log(`[External API] No new valuable data found for "${args.titleToSearch}" to update.`);
            return { success: true, message: "No new data to update." };
        }

      } else {
        console.warn(`[External API] No data array found for "${args.titleToSearch}" in external API response.`);
        return { success: false, message: "No data found in external API response." };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[External API] Error fetching data for "${args.titleToSearch}":`, errorMessage);
      return { success: false, message: `Error fetching data: ${errorMessage}` };
    }
  },
});


// PUBLIC WRAPPER ACTION with explicit return type
export const callTriggerFetchExternalAnimeDetails = action({
  args: {
    animeIdInOurDB: v.id("anime"),
    titleToSearch: v.string(),
  },
  handler: async (ctx: ActionCtx, args): Promise<ExternalApiResult> => { // Added ActionCtx and Promise<ExternalApiResult>
    // This public action can perform validation or checks if needed before
    // calling the internal action.
    // For now, it will directly call the internal action.
    const result: ExternalApiResult = await ctx.runAction(internal.externalApis.triggerFetchExternalAnimeDetails, {
      animeIdInOurDB: args.animeIdInOurDB,
      titleToSearch: args.titleToSearch,
    });
    return result; // Pass the result from the internal action back to the client
  },
});