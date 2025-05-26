// File: convex/ai.ts - Enhanced with Similar Anime Feature
"use node";
import OpenAI from "openai";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

// Initialize OpenAI client to use the proxy via CONVEX_OPENAI_BASE_URL
// This will be used by all actions in this file.
const openai = new OpenAI({
  apiKey: process.env.CONVEX_OPENAI_API_KEY,   // This key is for the proxy to use
});

// Optional: Test function to verify the proxy connection to OpenAI
export const testOpenAIProxyConnection = action({
  args: {},
  handler: async (_ctx) => {
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      return { success: false, error: "API key not found in environment variables for proxy." };
    }
    if (!process.env.CONVEX_OPENAI_BASE_URL) {
      return { success: false, error: "CONVEX_OPENAI_BASE_URL not configured." };
    }

    try {
      console.log(`Testing OpenAI connection via proxy: ${process.env.CONVEX_OPENAI_BASE_URL}`);
      // This call will go through your Convex HTTP proxy
      const result = await openai.chat.completions.create({
        model: "gpt-3.5-turbo", // Or "gpt-4o-mini"
        messages: [
          { role: "user", content: "Say hello from the proxy test" }
        ],
        max_tokens: 10
      });

      return {
        success: true,
        message: result.choices[0].message.content,
        modelUsed: result.model // The actual model that responded
      };
    } catch (err) {
      const error = err as any; // OpenAI errors can have more details
      console.error("OpenAI proxy test failed:", error);
      return {
        success: false,
        error: "OpenAI proxy connection test failed",
        details: {
          message: error.message || "Unknown error",
          status: error.status,       // HTTP status code if available
          type: error.type,         // OpenAI error type
          code: error.code,         // OpenAI error code
          rawError: error.toString(), // Raw error string
        }
      };
    }
  }
});

export const getAnimeRecommendation = action({
  args: {
    prompt: v.string(),
    userProfile: v.optional(v.object({
        moods: v.optional(v.array(v.string())),
        genres: v.optional(v.array(v.string())),
        favoriteAnimes: v.optional(v.array(v.string())),
        experienceLevel: v.optional(v.string()),
        dislikedGenres: v.optional(v.array(v.string())), // Added for Phase 2
        // dislikedTags: v.optional(v.array(v.string())), // Add if you implement this
    })),
  },
  handler: async (ctx, args) => {
    // ... (keep API key checks) ...

    let systemPrompt = `You are AniMuse, an AI anime concierge.
Your goal is to recommend anime based on the user's request.
Provide recommendations as a JSON array of objects. Each object should represent an anime and include:
- title (string, e.g., "Attack on Titan")
- description (string, a brief 2-3 sentence summary)
- reasoning (string, a brief explanation of why this anime fits the user's request and profile, max 1-2 sentences)
- posterUrl (string, a placeholder like "https://via.placeholder.com/200x300.png?text=Anime+Poster" if unknown, otherwise a real URL if you know one)
- genres (array of strings, e.g., ["Action", "Dark Fantasy", "Drama"])
- year (number, e.g., 2013)
- rating (number, e.g., 9.1, if known)
- emotionalTags (array of strings, e.g., ["High Stakes", "Tragic", "Intense"])
- trailerUrl (string, a placeholder like "https://www.youtube.com/watch?v=example" if unknown)
- studios (array of strings, e.g., ["MAPPA", "Wit Studio"], optional)
- themes (array of strings, e.g., ["Post-Apocalyptic", "Giant Monsters"], optional)

Consider the user's profile if provided:`;

    if (args.userProfile) {
        if (args.userProfile.moods && args.userProfile.moods.length > 0) {
            systemPrompt += `\n- Current Moods: ${args.userProfile.moods.join(", ")}`;
        }
        if (args.userProfile.genres && args.userProfile.genres.length > 0) {
            systemPrompt += `\n- Preferred Genres: ${args.userProfile.genres.join(", ")}`;
        }
        if (args.userProfile.dislikedGenres && args.userProfile.dislikedGenres.length > 0) { // Added for Phase 2
            systemPrompt += `\n- Disliked Genres (AVOID THESE): ${args.userProfile.dislikedGenres.join(", ")}`;
        }
        // Add similar for dislikedTags if implemented
        if (args.userProfile.favoriteAnimes && args.userProfile.favoriteAnimes.length > 0) {
            systemPrompt += `\n- Favorite Animes: ${args.userProfile.favoriteAnimes.join(", ")} (try to recommend something similar or different based on the prompt)`;
        }
        if (args.userProfile.experienceLevel) {
            systemPrompt += `\n- Experience Level: ${args.userProfile.experienceLevel}`;
        }
    }
    systemPrompt += `\nUser's request: "${args.prompt}"
Return ONLY the JSON array of objects. Do not include any other text, markdown, or explanations before or after the JSON.
If you cannot find suitable anime, return an empty array [].
Limit to 3-5 recommendations.
For posterUrl, if you don't have a real one, use "https://via.placeholder.com/200x300.png?text=[ANIME_TITLE]". Replace [ANIME_TITLE] with the actual anime title, URL encoded.
For trailerUrl, if you don't have a real one, use "https://www.youtube.com/results?search_query=[ANIME_TITLE]+trailer".
Example of a single anime object in the array:
{
  "title": "Kimi no Na wa.",
  "description": "Two teenagers share a profound, magical connection upon discovering they are swapping bodies. Things manage to become even more complicated when the boy and girl decide to meet in person.",
  "reasoning": "This matches your interest in romance and supernatural themes, and is highly acclaimed.",
  "posterUrl": "https://via.placeholder.com/200x300.png?text=Kimi+no+Na+wa.",
  "genres": ["Romance", "Supernatural", "Drama"],
  "year": 2016,
  "rating": 8.9,
  "emotionalTags": ["Heartfelt", "Bittersweet", "Beautiful Animation"],
  "trailerUrl": "https://www.youtube.com/results?search_query=Kimi+no+Na+wa.+trailer",
  "studios": ["CoMix Wave Films"],
  "themes": ["Body Swapping", "Time Travel"]
}
`;
    // ... (rest of the handler function remains the same) ...
    try {
      console.log(`Calling OpenAI via proxy: ${process.env.CONVEX_OPENAI_BASE_URL}/chat/completions for prompt: ${args.prompt}`);
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: args.prompt }
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        console.error("No content received from AI via proxy.");
        return { recommendations: [], error: "No content from AI." };
      }

      let parsedRecommendations = [];
      try {
        const jsonResponse = JSON.parse(content);
        if (Array.isArray(jsonResponse)) {
            parsedRecommendations = jsonResponse;
        } else if (jsonResponse && typeof jsonResponse === 'object' && Array.isArray(jsonResponse.recommendations)) {
            parsedRecommendations = jsonResponse.recommendations;
        }
        else {
            console.error("AI response via proxy is not a JSON array or expected object:", content);
             if (typeof jsonResponse === 'object' && jsonResponse !== null) {
                const potentialArrayKey = Object.keys(jsonResponse).find(key => Array.isArray((jsonResponse as any)[key]));
                if (potentialArrayKey) {
                    parsedRecommendations = (jsonResponse as any)[potentialArrayKey];
                } else {
                     return { recommendations: [], error: "AI response format error. Expected an array or {recommendations: []}." };
                }
            } else {
                 return { recommendations: [], error: "AI response format error. Expected an array or {recommendations: []}." };
            }
        }
      } catch (e) {
        const parseError = e as Error;
        console.error("Failed to parse AI response from proxy:", parseError.message, "\nContent:", content);
        return { recommendations: [], error: `Failed to parse AI response: ${parseError.message}` };
      }
      return { recommendations: parsedRecommendations, error: null };
    } catch (error) {
      const err = error as any;
      console.error("Error calling OpenAI via proxy:", err);
      return {
        recommendations: [],
        error: `Failed to get recommendations from AI via proxy: ${err.message || "Unknown error"}`,
        details: {
            status: err.status,
            type: err.type,
            code: err.code,
            rawError: err.toString(),
        }
      };
    }
  },
});

// NEW: Get similar anime recommendations based on a specific anime
export const getSimilarAnimeRecommendations = action({
  args: {
    animeId: v.optional(v.id("anime")), // Either provide animeId
    animeTitle: v.optional(v.string()),  // Or provide anime title
    animeDetails: v.optional(v.object({  // Or provide full anime details
      title: v.string(),
      description: v.optional(v.string()),
      genres: v.optional(v.array(v.string())),
      themes: v.optional(v.array(v.string())),
      emotionalTags: v.optional(v.array(v.string())),
      year: v.optional(v.number()),
    })),
    userProfile: v.optional(v.object({
      moods: v.optional(v.array(v.string())),
      genres: v.optional(v.array(v.string())),
      favoriteAnimes: v.optional(v.array(v.string())),
      experienceLevel: v.optional(v.string()),
      dislikedGenres: v.optional(v.array(v.string())),
    })),
    count: v.optional(v.number()), // Number of recommendations (default 5)
  },
  handler: async (ctx, args) => {
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      return { recommendations: [], error: "OpenAI API key not configured." };
    }

    let targetAnime: any = null;

    // Get anime details from database if animeId is provided
    if (args.animeId) {
      targetAnime = await ctx.runQuery(api.anime.getAnimeById, { animeId: args.animeId });
      if (!targetAnime) {
        return { recommendations: [], error: "Anime not found in database." };
      }
    } else if (args.animeDetails) {
      targetAnime = args.animeDetails;
    } else if (args.animeTitle) {
      // Try to find anime by title in database first
      targetAnime = await ctx.runQuery(api.anime.getAnimeByTitle, { title: args.animeTitle });
      if (!targetAnime) {
        // If not found, create a minimal object with just the title
        targetAnime = { title: args.animeTitle };
      }
    } else {
      return { recommendations: [], error: "Must provide either animeId, animeTitle, or animeDetails." };
    }

    const count = args.count || 5;

    let systemPrompt = `You are AniMuse, an expert anime recommendation AI.
Your task is to find anime similar to the one provided and recommend them to the user.

TARGET ANIME:
- Title: "${targetAnime.title}"`;

    if (targetAnime.description) {
      systemPrompt += `\n- Description: "${targetAnime.description}"`;
    }
    if (targetAnime.genres && targetAnime.genres.length > 0) {
      systemPrompt += `\n- Genres: ${targetAnime.genres.join(", ")}`;
    }
    if (targetAnime.themes && targetAnime.themes.length > 0) {
      systemPrompt += `\n- Themes: ${targetAnime.themes.join(", ")}`;
    }
    if (targetAnime.emotionalTags && targetAnime.emotionalTags.length > 0) {
      systemPrompt += `\n- Emotional Tags: ${targetAnime.emotionalTags.join(", ")}`;
    }
    if (targetAnime.year) {
      systemPrompt += `\n- Year: ${targetAnime.year}`;
    }

    systemPrompt += `\n\nFind ${count} anime that are similar to this one. Consider:
- Similar genres, themes, and emotional tones
- Similar storytelling style or narrative structure
- Similar target audience or demographic
- Similar visual style or production quality
- Anime that fans of the target anime would likely enjoy

`;

    if (args.userProfile) {
      systemPrompt += `\nUser preferences to consider:`;
      if (args.userProfile.genres && args.userProfile.genres.length > 0) {
        systemPrompt += `\n- Preferred Genres: ${args.userProfile.genres.join(", ")}`;
      }
      if (args.userProfile.dislikedGenres && args.userProfile.dislikedGenres.length > 0) {
        systemPrompt += `\n- Disliked Genres (try to avoid): ${args.userProfile.dislikedGenres.join(", ")}`;
      }
      if (args.userProfile.favoriteAnimes && args.userProfile.favoriteAnimes.length > 0) {
        systemPrompt += `\n- User's Favorite Anime: ${args.userProfile.favoriteAnimes.join(", ")}`;
      }
      if (args.userProfile.experienceLevel) {
        systemPrompt += `\n- Experience Level: ${args.userProfile.experienceLevel}`;
      }
    }

    systemPrompt += `\n\nProvide recommendations as a JSON array of objects. Each object should include:
- title (string)
- description (string, brief 2-3 sentence summary)
- reasoning (string, explain WHY this anime is similar to "${targetAnime.title}", max 2 sentences)
- posterUrl (string, use placeholder "https://via.placeholder.com/200x300.png?text=[ANIME_TITLE]" if unknown)
- genres (array of strings)
- year (number, if known)
- rating (number, if known, scale 1-10)
- emotionalTags (array of strings)
- trailerUrl (string, use placeholder "https://www.youtube.com/results?search_query=[ANIME_TITLE]+trailer" if unknown)
- studios (array of strings, optional)
- themes (array of strings, optional)
- similarityScore (number, 1-10, how similar is this to the target anime?)

Return ONLY the JSON array. No additional text or formatting.
Avoid recommending the exact same anime that was provided as the target.`;

    try {
      console.log(`Getting similar anime recommendations for: ${targetAnime.title}`);
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Find anime similar to "${targetAnime.title}"` }
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        console.error("No content received from AI for similar anime recommendations.");
        return { recommendations: [], error: "No content from AI." };
      }

      let parsedRecommendations = [];
      try {
        const jsonResponse = JSON.parse(content);
        if (Array.isArray(jsonResponse)) {
          parsedRecommendations = jsonResponse;
        } else if (jsonResponse && typeof jsonResponse === 'object' && Array.isArray(jsonResponse.recommendations)) {
          parsedRecommendations = jsonResponse.recommendations;
        } else {
          console.error("AI response for similar anime is not a JSON array or expected object:", content);
          if (typeof jsonResponse === 'object' && jsonResponse !== null) {
            const potentialArrayKey = Object.keys(jsonResponse).find(key => Array.isArray((jsonResponse as any)[key]));
            if (potentialArrayKey) {
              parsedRecommendations = (jsonResponse as any)[potentialArrayKey];
            } else {
              return { recommendations: [], error: "AI response format error. Expected an array or {recommendations: []}." };
            }
          } else {
            return { recommendations: [], error: "AI response format error. Expected an array or {recommendations: []}." };
          }
        }
      } catch (e) {
        const parseError = e as Error;
        console.error("Failed to parse AI response for similar anime:", parseError.message, "\nContent:", content);
        return { recommendations: [], error: `Failed to parse AI response: ${parseError.message}` };
      }

      // Sort by similarity score if available
      parsedRecommendations.sort((a: any, b: any) => {
        const scoreA = a.similarityScore || 0;
        const scoreB = b.similarityScore || 0;
        return scoreB - scoreA; // Descending order
      });

      return { 
        recommendations: parsedRecommendations.slice(0, count), // Limit to requested count
        targetAnime: {
          title: targetAnime.title,
          _id: args.animeId || null,
        },
        error: null 
      };
    } catch (error) {
      const err = error as any;
      console.error("Error getting similar anime recommendations:", err);
      return {
        recommendations: [],
        error: `Failed to get similar anime recommendations: ${err.message || "Unknown error"}`,
        details: {
          status: err.status,
          type: err.type,
          code: err.code,
          rawError: err.toString(),
        }
      };
    }
  },
});