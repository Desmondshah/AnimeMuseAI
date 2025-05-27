// File: convex/ai.ts - Enhanced with MoodBoard Recommendations
"use node";
import OpenAI from "openai";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";

// Don't initialize OpenAI at module level - do it in functions
const getOpenAIClient = () => {
  const apiKey = process.env.CONVEX_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("CONVEX_OPENAI_API_KEY environment variable is not set");
  }
  return new OpenAI({ apiKey });
};

const watchlistActivityValidator = v.optional(v.array(v.object({
    animeTitle: v.string(),
    status: v.string(),
    userRating: v.optional(v.number())
})));

const userProfileValidatorForAI = v.object({
    name: v.optional(v.string()),
    moods: v.optional(v.array(v.string())),
    genres: v.optional(v.array(v.string())),
    favoriteAnimes: v.optional(v.array(v.string())),
    experienceLevel: v.optional(v.string()),
    dislikedGenres: v.optional(v.array(v.string())),
    dislikedTags: v.optional(v.array(v.string())),
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
      const openai = getOpenAIClient();
      const result = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "user", content: "Say hello from the proxy test" }
        ],
        max_tokens: 10
      });

      return {
        success: true,
        message: result.choices[0].message.content,
        modelUsed: result.model
      };
    } catch (err) {
      const error = err as any;
      console.error("OpenAI proxy test failed:", error);
      return {
        success: false,
        error: "OpenAI proxy connection test failed",
        details: {
          message: error.message || "Unknown error",
          status: error.status,
          type: error.type,
          code: error.code,
          rawError: error.toString(),
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
        dislikedGenres: v.optional(v.array(v.string())),
    })),
  },
  handler: async (ctx, args) => {
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      return { recommendations: [], error: "OpenAI API key not configured for proxy." };
    }

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
        if (args.userProfile.dislikedGenres && args.userProfile.dislikedGenres.length > 0) {
            systemPrompt += `\n- Disliked Genres (AVOID THESE): ${args.userProfile.dislikedGenres.join(", ")}`;
        }
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
    try {
      console.log(`Calling OpenAI via proxy for prompt: ${args.prompt}`);
      const openai = getOpenAIClient();
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
        // Try to find an array within the JSON response, accommodating various structures
        if (Array.isArray(jsonResponse)) {
            parsedRecommendations = jsonResponse;
        } else if (jsonResponse && typeof jsonResponse === 'object') {
            const arrayKey = Object.keys(jsonResponse).find(key => Array.isArray((jsonResponse as any)[key]));
            if (arrayKey) {
                parsedRecommendations = (jsonResponse as any)[arrayKey];
            } else {
                console.error("AI response via proxy is not a JSON array or expected object:", content);
                return { recommendations: [], error: "AI response format error. Expected an array or an object containing an array of recommendations." };
            }
        } else {
            console.error("AI response via proxy is not a JSON array or expected object:", content);
            return { recommendations: [], error: "AI response format error. Expected an array or an object containing an array of recommendations." };
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

export const getSimilarAnimeRecommendations = action({
  args: {
    animeId: v.optional(v.id("anime")),
    animeTitle: v.optional(v.string()),
    animeDetails: v.optional(v.object({
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
    count: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      return { recommendations: [], error: "OpenAI API key not configured." };
    }

    let targetAnime: any = null;

    if (args.animeId) {
      targetAnime = await ctx.runQuery(api.anime.getAnimeById, { animeId: args.animeId });
      if (!targetAnime) {
        return { recommendations: [], error: "Anime not found in database." };
      }
    } else if (args.animeDetails) {
      targetAnime = args.animeDetails;
    } else if (args.animeTitle) {
      targetAnime = await ctx.runQuery(api.anime.getAnimeByTitle, { title: args.animeTitle });
      if (!targetAnime) {
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
    if (targetAnime.description) systemPrompt += `\n- Description: "${targetAnime.description}"`;
    if (targetAnime.genres && targetAnime.genres.length > 0) systemPrompt += `\n- Genres: ${targetAnime.genres.join(", ")}`;
    if (targetAnime.themes && targetAnime.themes.length > 0) systemPrompt += `\n- Themes: ${targetAnime.themes.join(", ")}`;
    if (targetAnime.emotionalTags && targetAnime.emotionalTags.length > 0) systemPrompt += `\n- Emotional Tags: ${targetAnime.emotionalTags.join(", ")}`;
    if (targetAnime.year) systemPrompt += `\n- Year: ${targetAnime.year}`;

    systemPrompt += `\n\nFind ${count} anime that are similar to this one. Consider:
- Similar genres, themes, and emotional tones
- Similar storytelling style or narrative structure
- Similar target audience or demographic
- Similar visual style or production quality
- Anime that fans of the target anime would likely enjoy
`;

    if (args.userProfile) {
      systemPrompt += `\nUser preferences to consider:`;
      if (args.userProfile.genres && args.userProfile.genres.length > 0) systemPrompt += `\n- Preferred Genres: ${args.userProfile.genres.join(", ")}`;
      if (args.userProfile.dislikedGenres && args.userProfile.dislikedGenres.length > 0) systemPrompt += `\n- Disliked Genres (try to avoid): ${args.userProfile.dislikedGenres.join(", ")}`;
      if (args.userProfile.favoriteAnimes && args.userProfile.favoriteAnimes.length > 0) systemPrompt += `\n- User's Favorite Anime: ${args.userProfile.favoriteAnimes.join(", ")}`;
      if (args.userProfile.experienceLevel) systemPrompt += `\n- Experience Level: ${args.userProfile.experienceLevel}`;
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
      const openai = getOpenAIClient();
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

      parsedRecommendations.sort((a: any, b: any) => (b.similarityScore || 0) - (a.similarityScore || 0));

      return {
        recommendations: parsedRecommendations.slice(0, count),
        targetAnime: { title: targetAnime.title, _id: args.animeId || null },
        error: null
      };
    } catch (error) {
      const err = error as any;
      console.error("Error getting similar anime recommendations:", err);
      return {
        recommendations: [],
        error: `Failed to get similar anime recommendations: ${err.message || "Unknown error"}`,
        details: { status: err.status, type: err.type, code: err.code, rawError: err.toString() }
      };
    }
  },
});


// NEW: Get personalized recommendations for the "For You" section
export const getPersonalizedRecommendations = action({
  args: {
    userProfile: userProfileValidatorForAI,
    watchlistActivity: watchlistActivityValidator, // Pass recent watchlist activity
    count: v.optional(v.number()), // Number of recommendations
  },
  handler: async (ctx, args) => {
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      return { recommendations: [], error: "OpenAI API key not configured." };
    }

    const count = args.count || 5;

    let systemPrompt = `You are AniMuse, an AI expert at crafting deeply personalized anime recommendations.
Your goal is to generate a "For You" list of anime for a user based on their comprehensive profile and recent activity.
The user's name is ${args.userProfile.name || "User"}.

USER PROFILE:`;
    if (args.userProfile.moods && args.userProfile.moods.length > 0) {
        systemPrompt += `\n- Current Moods: ${args.userProfile.moods.join(", ")}`;
    }
    if (args.userProfile.genres && args.userProfile.genres.length > 0) {
        systemPrompt += `\n- Preferred Genres: ${args.userProfile.genres.join(", ")}`;
    }
    if (args.userProfile.dislikedGenres && args.userProfile.dislikedGenres.length > 0) {
        systemPrompt += `\n- Disliked Genres (Strictly AVOID THESE): ${args.userProfile.dislikedGenres.join(", ")}`;
    }
    if (args.userProfile.dislikedTags && args.userProfile.dislikedTags.length > 0) {
        systemPrompt += `\n- Disliked Tags (Strictly AVOID THESE): ${args.userProfile.dislikedTags.join(", ")}`;
    }
    if (args.userProfile.favoriteAnimes && args.userProfile.favoriteAnimes.length > 0) {
        systemPrompt += `\n- Favorite Animes: ${args.userProfile.favoriteAnimes.join(", ")}. Consider recommending anime that are similar in spirit, quality, or by the same creators/studios, OR anime that offer a fresh experience but align with their core tastes.`;
    }
    if (args.userProfile.experienceLevel) {
        systemPrompt += `\n- Anime Experience Level: ${args.userProfile.experienceLevel}. Tailor complexity and obscurity accordingly (e.g., more classics or gateways for Newbies, deeper cuts for Otaku Legends).`;
    }

    if (args.watchlistActivity && args.watchlistActivity.length > 0) {
        systemPrompt += `\n\nRECENT WATCHLIST ACTIVITY:`;
        const completed = args.watchlistActivity.filter(a => a.status === "Completed");
        const watching = args.watchlistActivity.filter(a => a.status === "Watching");

        if (completed.length > 0) {
            systemPrompt += `\n- Recently Completed: ${completed.map(a => `${a.animeTitle}${a.userRating ? ` (Rated ${a.userRating}/5)` : ''}`).join(", ")}. They might want something similar to what they loved, or something different if they rated an item low.`;
        }
        if (watching.length > 0) {
            systemPrompt += `\n- Currently Watching: ${watching.map(a => a.animeTitle).join(", ")}. Perhaps suggest anime that complement these.`;
        }
    }

    systemPrompt += `

RECOMMENDATION TASK:
Generate ${count} highly personalized anime recommendations.
Think about:
- Implicit connections: If they like A and B, they might like C.
- Discovery: Introduce them to gems they might not find themselves, but align with their profile.
- Variety: Offer a mix if their profile is diverse, unless they have a very specific current mood or request (though this function is for general "For You", not a direct prompt).
- Freshness: Consider newer releases if appropriate for their experience level, but don't neglect classics.
- Positive framing: Explain *why* each recommendation is a good fit for *this specific user*.

OUTPUT FORMAT:
Provide recommendations as a JSON array of objects. Each object should represent an anime and include:
- title (string)
- description (string, a captivating 2-3 sentence summary)
- reasoning (string, VERY IMPORTANT: a detailed explanation of why THIS specific anime is recommended for THIS user based on their profile and activity. Make it personal and insightful. 2-3 sentences.)
- posterUrl (string, use placeholder "https://via.placeholder.com/200x300.png?text=[ANIME_TITLE]" if unknown)
- genres (array of strings)
- year (number, if known)
- rating (number, external rating like MAL score, if known, scale 1-10)
- emotionalTags (array of strings, e.g., ["Thought-provoking", "Uplifting", "Mind-bending"])
- trailerUrl (string, use placeholder "https://www.youtube.com/results?search_query=[ANIME_TITLE]+trailer" if unknown)
- studios (array of strings, optional)
- themes (array of strings, optional)

Return ONLY the JSON array. No additional text, markdown, or explanations before or after the JSON.
If you cannot find suitable anime, return an empty array [].
For posterUrl, if you don't have a real one, use "https://via.placeholder.com/200x300.png?text=[ANIME_TITLE]". Replace [ANIME_TITLE] with the actual anime title, URL encoded.
For trailerUrl, if you don't have a real one, use "https://www.youtube.com/results?search_query=[ANIME_TITLE]+trailer".
Prioritize unique recommendations that are not explicitly in their 'favoriteAnimes' list, unless the goal is to find something *extremely* similar to a specific favorite.
`;

    try {
      console.log(`Generating personalized "For You" recommendations for user: ${args.userProfile.name || 'anonymous'}`);
      const openai = getOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Please generate my personalized "For You" anime list.`}
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        console.error("No content received from AI for personalized recommendations.");
        return { recommendations: [], error: "No content from AI." };
      }

      let parsedRecommendations = [];
      try {
        const jsonResponse = JSON.parse(content);
         if (Array.isArray(jsonResponse)) {
            parsedRecommendations = jsonResponse;
        } else if (jsonResponse && typeof jsonResponse === 'object') {
            const arrayKey = Object.keys(jsonResponse).find(key => Array.isArray((jsonResponse as any)[key]));
            if (arrayKey) {
                parsedRecommendations = (jsonResponse as any)[arrayKey];
            } else {
                return { recommendations: [], error: "AI response format error. Expected an array or {recommendations: []}." };
            }
        } else {
            return { recommendations: [], error: "AI response format error. Expected an array or {recommendations: []}." };
        }
      } catch (e) {
        const parseError = e as Error;
        console.error("Failed to parse AI response for personalized recommendations:", parseError.message, "\nContent:", content);
        return { recommendations: [], error: `Failed to parse AI response: ${parseError.message}` };
      }
      return { recommendations: parsedRecommendations.slice(0, count), error: null };
    } catch (error) {
      const err = error as any;
      console.error("Error generating personalized recommendations:", err);
      return {
        recommendations: [],
        error: `Failed to get personalized recommendations: ${err.message || "Unknown error"}`,
        details: { status: err.status, type: err.type, code: err.code, rawError: err.toString() }
      };
    }
  }
});

// NEW: Get recommendations based on selected moods or themes for Mood Board
export const getRecommendationsByMoodTheme = action({
  args: {
    selectedCues: v.array(v.string()), // e.g., ["Dark", "Psychological", "Rainy Day"]
    userProfile: v.optional(userProfileValidatorForAI), // Optional: for further personalization
    count: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      return { recommendations: [], error: "OpenAI API key not configured." };
    }
    if (args.selectedCues.length === 0) {
      return { recommendations: [], error: "No mood/theme cues selected." };
    }

    const count = args.count || 3; // Default to 3 recommendations for mood board display

    let systemPrompt = `You are AniMuse, an AI anime concierge specializing in mood and theme-based recommendations.
A user has selected the following mood/theme cues: "${args.selectedCues.join(", ")}".

Your task is to recommend ${count} anime that strongly match these cues.`;

    if (args.userProfile) {
      systemPrompt += `\n\nAdditionally, consider the user's general preferences if they help refine the selection (but the selected cues are primary):`;
      if (args.userProfile.genres && args.userProfile.genres.length > 0) {
        systemPrompt += `\n- Preferred Genres: ${args.userProfile.genres.join(", ")}`;
      }
      if (args.userProfile.dislikedGenres && args.userProfile.dislikedGenres.length > 0) {
        systemPrompt += `\n- Disliked Genres (try to AVOID these unless a selected cue strongly implies them): ${args.userProfile.dislikedGenres.join(", ")}`;
      }
      if (args.userProfile.dislikedTags && args.userProfile.dislikedTags.length > 0) {
        systemPrompt += `\n- Disliked Tags (try to AVOID these): ${args.userProfile.dislikedTags.join(", ")}`;
      }
      if (args.userProfile.experienceLevel) {
        systemPrompt += `\n- Experience Level: ${args.userProfile.experienceLevel}.`;
      }
    }

    systemPrompt += `

OUTPUT FORMAT:
Provide recommendations as a JSON array of objects. Each object should represent an anime and include:
- title (string)
- description (string, a brief 1-2 sentence summary highlighting its connection to the cues)
- reasoning (string, 1-2 sentences on why it fits the selected mood/theme cues: "${args.selectedCues.join(", ")}")
- posterUrl (string, placeholder "https://via.placeholder.com/200x300.png?text=[ANIME_TITLE]" if unknown)
- genres (array of strings)
- year (number, if known)
- emotionalTags (array of strings that align with the cues and anime)
- trailerUrl (string, placeholder "https://www.youtube.com/results?search_query=[ANIME_TITLE]+trailer" if unknown)

Return ONLY the JSON array. Do not include any other text.
If no suitable anime are found, return an empty array [].
Ensure the recommendations are distinct and genuinely reflect the selected cues.`;

    try {
      console.log(`Getting Mood Board recommendations for cues: ${args.selectedCues.join(", ")}`);
      const openai = getOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Find anime for these vibes: ${args.selectedCues.join(", ")}` }
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        return { recommendations: [], error: "No content from AI for mood board." };
      }

      let parsedRecommendations = [];
      try {
        const jsonResponse = JSON.parse(content);
        if (Array.isArray(jsonResponse)) {
          parsedRecommendations = jsonResponse;
        } else if (jsonResponse && typeof jsonResponse === 'object') {
          const arrayKey = Object.keys(jsonResponse).find(key => Array.isArray((jsonResponse as any)[key]));
          if (arrayKey) {
            parsedRecommendations = (jsonResponse as any)[arrayKey];
          } else {
            return { recommendations: [], error: "AI mood board response format error." };
          }
        } else {
          return { recommendations: [], error: "AI mood board response format error." };
        }
      } catch (e) {
        const parseError = e as Error;
        return { recommendations: [], error: `Failed to parse AI mood board response: ${parseError.message}` };
      }
      return { recommendations: parsedRecommendations.slice(0, count), error: null };

    } catch (error) {
      const err = error as any;
      console.error("Error getting Mood Board recommendations:", err);
      return {
        recommendations: [],
        error: `Failed to get Mood Board recommendations: ${err.message || "Unknown error"}`,
        details: { status: err.status, type: err.type, code: err.code, rawError: err.toString() }
      };
    }
  },
});