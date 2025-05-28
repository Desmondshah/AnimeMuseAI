// convex/ai.ts
import OpenAI from "openai";
import { action, mutation } from "./_generated/server"; // No internalMutation needed here now
import { v } from "convex/values";
import { api } from "./_generated/api"; // Removed 'internal' as it's not used here
import { Doc, Id } from "./_generated/dataModel";

// Helper to get OpenAI client
const getOpenAIClient = () => {
  const apiKey = process.env.CONVEX_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("CONVEX_OPENAI_API_KEY environment variable is not set");
  }
  return new OpenAI({ apiKey });
};

// Validator for user profile data passed to AI functions
const userProfileValidatorForAI = v.object({
    name: v.optional(v.string()),
    moods: v.optional(v.array(v.string())),
    genres: v.optional(v.array(v.string())),
    favoriteAnimes: v.optional(v.array(v.string())),
    experienceLevel: v.optional(v.string()),
    dislikedGenres: v.optional(v.array(v.string())),
    dislikedTags: v.optional(v.array(v.string())),
});

// Validator for watchlist activity data
const watchlistActivityValidator = v.optional(v.array(v.object({
    animeTitle: v.string(),
    status: v.string(),
    userRating: v.optional(v.number())
})));

// ---- PHASE 1: AI Interaction Feedback Storage (Public mutation) ----
export const storeAiFeedback = mutation({
  args: {
    prompt: v.optional(v.string()),
    aiAction: v.string(),
    aiResponseRecommendations: v.optional(v.array(v.any())),
    aiResponseText: v.optional(v.string()),
    feedbackType: v.union(v.literal("up"), v.literal("down"), v.literal("none")),
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    const userIdentity = await ctx.auth.getUserIdentity();
    if (!userIdentity) {
      console.warn("Attempted to store AI feedback for unauthenticated user.");
      // Optionally throw new Error("User not authenticated to store AI feedback.");
      return; 
    }

    await ctx.db.insert("aiInteractionFeedback", {
      userId: userIdentity.subject as Id<"users">, 
      prompt: args.prompt,
      aiAction: args.aiAction,
      aiResponseRecommendations: args.aiResponseRecommendations,
      aiResponseText: args.aiResponseText,
      feedbackType: args.feedbackType,
      messageId: args.messageId,
      timestamp: Date.now(),
    });
  },
});


// ---- PHASE 1: Prompt Refinements & Error Handling ----

/**
 * Tries to parse a JSON string, with more robust error handling.
 * @param jsonString The JSON string to parse.
 * @param actionName Name of the AI action for logging.
 * @returns Parsed object or null if parsing fails.
 */
const tryParseAIResponse = (jsonString: string | null, actionName: string): any[] | null => {
    if (!jsonString) {
        console.warn(`[AI Response - ${actionName}] AI returned null or empty content.`);
        return null;
    }
    try {
        const parsed = JSON.parse(jsonString);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            const keys = Object.keys(parsed);
            if (keys.length === 1 && Array.isArray(parsed[keys[0]])) {
                return parsed[keys[0]]; 
            } else if (Array.isArray(parsed.recommendations)) { 
                return parsed.recommendations;
            }
        }
        if (Array.isArray(parsed)) {
            return parsed;
        }
        console.warn(`[AI Response - ${actionName}] Parsed JSON is not in the expected format (object with an array or direct array). Content:`, jsonString);
        return null;
    } catch (error) {
        console.error(`[AI Response - ${actionName}] Failed to parse JSON from AI. Error:`, error, "\nContent:", jsonString);
        return null;
    }
};


export const getAnimeRecommendation = action({
  args: {
    prompt: v.string(),
    userProfile: v.optional(userProfileValidatorForAI), 
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    const userIdentity = await ctx.auth.getUserIdentity(); 
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      return { recommendations: [], error: "OpenAI API key not configured for proxy." , details: { reason: "API_KEY_MISSING" } };
    }

    let systemPrompt = `You are AniMuse, an AI anime concierge.
Your goal is to recommend anime based on the user's request.
Provide recommendations as a JSON object containing a single key "recommendations", where the value is an array of anime objects. Each anime object should include:
- title (string, e.g., "Attack on Titan")
- description (string, a brief 2-3 sentence summary)
- reasoning (string, a brief explanation of why this anime fits the user's request and profile, max 1-2 sentences)
- posterUrl (string, a placeholder like "https://via.placeholder.com/200x300.png?text=Anime+Poster" if unknown, otherwise a real URL if you know one)
- genres (array of strings, e.g., ["Action", "Dark Fantasy", "Drama"])
- year (number, e.g., 2013, optional)
- rating (number, e.g., 9.1, if known, optional)
- emotionalTags (array of strings, e.g., ["High Stakes", "Tragic", "Intense"], optional)
- trailerUrl (string, a placeholder like "https://www.youtube.com/watch?v=example" if unknown, optional)
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
            systemPrompt += `\n- Disliked Genres (STRICTLY AVOID recommending anime primarily in these genres): ${args.userProfile.dislikedGenres.join(", ")}. If a show has multiple genres and one is disliked, be very cautious.`;
        }
        if (args.userProfile.dislikedTags && args.userProfile.dislikedTags.length > 0) {
            systemPrompt += `\n- Disliked Tags (STRICTLY AVOID recommending anime with these tags): ${args.userProfile.dislikedTags.join(", ")}.`;
        }
        if (args.userProfile.favoriteAnimes && args.userProfile.favoriteAnimes.length > 0) {
            systemPrompt += `\n- Favorite Animes: ${args.userProfile.favoriteAnimes.join(", ")} (try to recommend something similar or different based on the prompt, but avoid re-recommending these exact titles unless specifically asked to elaborate on one)`;
        }
        if (args.userProfile.experienceLevel) {
            systemPrompt += `\n- Experience Level: ${args.userProfile.experienceLevel}`;
        }
    }
    systemPrompt += `\nUser's request: "${args.prompt}"
Return ONLY the JSON object. Do not include any other text, markdown, or explanations before or after the JSON.
If you cannot find suitable anime, return an object like {"recommendations": []}.
Limit to 3-5 recommendations.
For posterUrl, if you don't have a real one, use "https://via.placeholder.com/200x300.png?text=[ANIME_TITLE]". Replace [ANIME_TITLE] with the actual anime title, URL encoded.
For trailerUrl, if you don't have a real one, use "https://www.youtube.com/results?search_query=[ANIME_TITLE]+trailer".
Example of the JSON output:
{
  "recommendations": [{
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
  }]
}
`;
    let recommendations: any[] = [];
    let errorResult: string | undefined = undefined;
    let rawResponseContent: string | null = null;
    let errorDetails: any = undefined;

    try {
      console.log(`[AI Action - getAnimeRecommendation] Calling OpenAI for prompt: ${args.prompt}`);
      const openai = getOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", 
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: args.prompt }
        ],
        response_format: { type: "json_object" },
      });

      rawResponseContent = completion.choices[0].message.content;
      const parsedResult = tryParseAIResponse(rawResponseContent, "getAnimeRecommendation");

      if (parsedResult) {
        recommendations = parsedResult;
      } else {
        errorResult = "AI response format error or no recommendations found.";
        if (!rawResponseContent || rawResponseContent.trim() === "" || rawResponseContent.trim() === "[]" || rawResponseContent.trim() === "{}") {
             errorResult = "AI returned no recommendations or an empty response.";
        }
      }
    } catch (error) {
      const err = error as any;
      console.error("[AI Action - getAnimeRecommendation] Error calling OpenAI:", err);
      errorResult = `Failed to get recommendations from AI: ${err.message || "Unknown error"}`;
      errorDetails = { status: err.status, type: err.type, code: err.code, rawError: err.toString() };
    } finally {
        if (userIdentity) {
            await ctx.runMutation(api.ai.storeAiFeedback, { 
                prompt: args.prompt,
                aiAction: "getAnimeRecommendation",
                aiResponseRecommendations: recommendations.length > 0 ? recommendations : undefined,
                aiResponseText: recommendations.length === 0 ? (rawResponseContent ?? errorResult ?? undefined) : undefined,
                feedbackType: "none", 
                messageId: args.messageId,
            });
        }
    }
    return { recommendations, error: errorResult, details: errorDetails };
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
    userProfile: v.optional(userProfileValidatorForAI),
    count: v.optional(v.number()),
    messageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userIdentity = await ctx.auth.getUserIdentity();
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      return { recommendations: [], error: "OpenAI API key not configured.", details: { reason: "API_KEY_MISSING" } };
    }

    let targetAnime: any = null;

    if (args.animeId) {
      targetAnime = await ctx.runQuery(api.anime.getAnimeById, { animeId: args.animeId });
      if (!targetAnime) {
        return { recommendations: [], error: "Target anime not found in database.", details: { animeId: args.animeId } };
      }
    } else if (args.animeDetails) {
      targetAnime = args.animeDetails;
    } else if (args.animeTitle) {
      targetAnime = await ctx.runQuery(api.anime.getAnimeByTitle, { title: args.animeTitle });
      if (!targetAnime) {
        targetAnime = { title: args.animeTitle, description: "", genres: [], themes: [], emotionalTags: [], year: undefined };
      }
    } else {
      return { recommendations: [], error: "Must provide either animeId, animeTitle, or animeDetails.", details: { reason: "MISSING_TARGET_ANIME_IDENTIFIER"} };
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
- Similar genres, themes, and emotional tones.
- Similar storytelling style or narrative structure.
- Similar target audience or demographic.
- Similar visual style or production quality.
- Anime that fans of the target anime would likely enjoy.
`;

    if (args.userProfile) {
      systemPrompt += `\nUser preferences to consider:`;
      if (args.userProfile.genres && args.userProfile.genres.length > 0) systemPrompt += `\n- Preferred Genres: ${args.userProfile.genres.join(", ")}`;
      if (args.userProfile.dislikedGenres && args.userProfile.dislikedGenres.length > 0) {
          systemPrompt += `\n- Disliked Genres (STRICTLY AVOID recommending anime primarily in these genres): ${args.userProfile.dislikedGenres.join(", ")}.`;
      }
      if (args.userProfile.dislikedTags && args.userProfile.dislikedTags.length > 0) {
          systemPrompt += `\n- Disliked Tags (STRICTLY AVOID recommending anime with these tags): ${args.userProfile.dislikedTags.join(", ")}.`;
      }
      if (args.userProfile.favoriteAnimes && args.userProfile.favoriteAnimes.length > 0) systemPrompt += `\n- User's Favorite Anime: ${args.userProfile.favoriteAnimes.join(", ")}`;
      if (args.userProfile.experienceLevel) systemPrompt += `\n- Experience Level: ${args.userProfile.experienceLevel}`;
    }

    systemPrompt += `\n\nProvide recommendations as a JSON object containing a single key "recommendations", where the value is an array of anime objects. Each object should include:
- title (string)
- description (string, brief 2-3 sentence summary)
- reasoning (string, explain WHY this anime is similar to "${targetAnime.title}", max 2 sentences)
- posterUrl (string, use placeholder "https://via.placeholder.com/200x300.png?text=[ANIME_TITLE]" if unknown)
- genres (array of strings)
- year (number, if known, optional)
- rating (number, if known, scale 1-10, optional)
- emotionalTags (array of strings, optional)
- trailerUrl (string, use placeholder "https://www.youtube.com/results?search_query=[ANIME_TITLE]+trailer" if unknown, optional)
- studios (array of strings, optional)
- themes (array of strings, optional)
- similarityScore (number, 1-10, how similar is this to the target anime?)

Return ONLY the JSON object. No additional text or formatting.
Avoid recommending the exact same anime that was provided as the target. If no truly similar anime are found, return {"recommendations": []}.`;

    let recommendations: any[] = [];
    let errorResult: string | undefined = undefined;
    let rawResponseContent: string | null = null;
    let errorDetails: any = undefined;


    try {
      console.log(`[AI Action - getSimilarAnimeRecommendations] Getting similar anime for: ${targetAnime.title}`);
      const openai = getOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Find anime similar to "${targetAnime.title}"` }
        ],
        response_format: { type: "json_object" },
      });

      rawResponseContent = completion.choices[0].message.content;
      const parsedResult = tryParseAIResponse(rawResponseContent, "getSimilarAnimeRecommendations");

      if (parsedResult) {
        recommendations = parsedResult.sort((a: any, b: any) => (b.similarityScore || 0) - (a.similarityScore || 0)).slice(0, count);
      } else {
        errorResult = "AI response format error or no similar recommendations found.";
      }
    } catch (error) {
      const err = error as any;
      console.error("[AI Action - getSimilarAnimeRecommendations] Error calling OpenAI:", err);
      errorResult = `Failed to get similar recommendations: ${err.message || "Unknown error"}`;
      errorDetails = { status: err.status, type: err.type, code: err.code, rawError: err.toString() };
    } finally {
        if (userIdentity && args.messageId) { 
             await ctx.runMutation(api.ai.storeAiFeedback, {
                prompt: `Find similar to: ${targetAnime.title}`,
                aiAction: "getSimilarAnimeRecommendations",
                aiResponseRecommendations: recommendations.length > 0 ? recommendations : undefined,
                aiResponseText: recommendations.length === 0 ? (rawResponseContent ?? errorResult ?? undefined) : undefined,
                feedbackType: "none",
                messageId: args.messageId,
            });
        }
    }
    return { recommendations, targetAnime: { title: targetAnime.title, _id: args.animeId || null }, error: errorResult, details: errorDetails };
  },
});


export const getPersonalizedRecommendations = action({
  args: {
    userProfile: userProfileValidatorForAI,
    watchlistActivity: watchlistActivityValidator,
    count: v.optional(v.number()),
    messageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userIdentity = await ctx.auth.getUserIdentity();
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      return { recommendations: [], error: "OpenAI API key not configured.", details: { reason: "API_KEY_MISSING" } };
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
        systemPrompt += `\n- Disliked Genres (STRICTLY AVOID recommending anime primarily in these genres): ${args.userProfile.dislikedGenres.join(", ")}. If a show has multiple genres and one is disliked, be very cautious unless other profile aspects strongly suggest it.`;
    }
    if (args.userProfile.dislikedTags && args.userProfile.dislikedTags.length > 0) {
        systemPrompt += `\n- Disliked Tags (STRICTLY AVOID recommending anime with these tags): ${args.userProfile.dislikedTags.join(", ")}.`;
    }
    if (args.userProfile.favoriteAnimes && args.userProfile.favoriteAnimes.length > 0) {
        systemPrompt += `\n- Favorite Animes: ${args.userProfile.favoriteAnimes.join(", ")}. Consider recommending anime that are similar in spirit, quality, or by the same creators/studios, OR anime that offer a fresh experience but align with their core tastes. Do NOT re-recommend these exact titles.`;
    }
    if (args.userProfile.experienceLevel) {
        systemPrompt += `\n- Anime Experience Level: ${args.userProfile.experienceLevel}. Tailor complexity and obscurity accordingly (e.g., more classics or gateways for Newbies, deeper cuts for Otaku Legends).`;
    }

    if (args.watchlistActivity && args.watchlistActivity.length > 0) {
        systemPrompt += `\n\nRECENT WATCHLIST ACTIVITY (Consider this for recent taste signals):`;
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
- Variety: Offer a mix if their profile is diverse, unless they have a very specific current mood.
- Freshness: Consider newer releases if appropriate for their experience level, but don't neglect classics.
- Positive framing: Explain *why* each recommendation is a good fit for *this specific user*.

OUTPUT FORMAT:
Provide recommendations as a JSON object containing a single key "recommendations", where the value is an array of anime objects. Each object should include:
- title (string)
- description (string, a captivating 2-3 sentence summary)
- reasoning (string, VERY IMPORTANT: a detailed explanation of why THIS specific anime is recommended for THIS user based on their profile and activity. Make it personal and insightful. 2-3 sentences.)
- posterUrl (string, use placeholder "https://via.placeholder.com/200x300.png?text=[ANIME_TITLE]" if unknown)
- genres (array of strings)
- year (number, if known, optional)
- rating (number, external rating like MAL score, if known, scale 1-10, optional)
- emotionalTags (array of strings, e.g., ["Thought-provoking", "Uplifting", "Mind-bending"], optional)
- trailerUrl (string, use placeholder "https://www.youtube.com/results?search_query=[ANIME_TITLE]+trailer" if unknown, optional)
- studios (array of strings, optional)
- themes (array of strings, optional)

Return ONLY the JSON object. No additional text, markdown, or explanations.
If you cannot find suitable anime, return {"recommendations": []}.
Prioritize unique recommendations that are not explicitly in their 'favoriteAnimes' list.
`;

    let recommendations: any[] = [];
    let errorResult: string | undefined = undefined;
    let rawResponseContent: string | null = null;
    let errorDetails: any = undefined;


    try {
      console.log(`[AI Action - getPersonalizedRecommendations] Generating for user: ${args.userProfile.name || 'anonymous'}`);
      const openai = getOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Please generate my personalized "For You" anime list.`}
        ],
        response_format: { type: "json_object" },
      });

      rawResponseContent = completion.choices[0].message.content;
      const parsedResult = tryParseAIResponse(rawResponseContent, "getPersonalizedRecommendations");
      
      if (parsedResult) {
        recommendations = parsedResult.slice(0, count);
      } else {
        errorResult = "AI response format error or no personalized recommendations found.";
      }
    } catch (error) {
      const err = error as any;
      console.error("[AI Action - getPersonalizedRecommendations] Error calling OpenAI:", err);
      errorResult = `Failed to get personalized recommendations: ${err.message || "Unknown error"}`;
      errorDetails = { status: err.status, type: err.type, code: err.code, rawError: err.toString() };
    } finally {
        if (userIdentity && args.messageId) { 
             await ctx.runMutation(api.ai.storeAiFeedback, {
                prompt: "Personalized 'For You' generation",
                aiAction: "getPersonalizedRecommendations",
                aiResponseRecommendations: recommendations.length > 0 ? recommendations : undefined,
                aiResponseText: recommendations.length === 0 ? (rawResponseContent ?? errorResult ?? undefined) : undefined,
                feedbackType: "none",
                messageId: args.messageId,
            });
        }
    }
    return { recommendations, error: errorResult, details: errorDetails };
  }
});


export const getRecommendationsByMoodTheme = action({
  args: {
    selectedCues: v.array(v.string()),
    userProfile: v.optional(userProfileValidatorForAI),
    count: v.optional(v.number()),
    messageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userIdentity = await ctx.auth.getUserIdentity();
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      return { recommendations: [], error: "OpenAI API key not configured.", details: { reason: "API_KEY_MISSING" } };
    }
    if (args.selectedCues.length === 0) {
      return { recommendations: [], error: "No mood/theme cues selected.", details: { reason: "NO_CUES_SELECTED" } };
    }

    const count = args.count || 3;

    let systemPrompt = `You are AniMuse, an AI anime concierge specializing in mood and theme-based recommendations.
A user has selected the following mood/theme cues: "${args.selectedCues.join(", ")}".

Your task is to recommend ${count} anime that strongly match these cues.`;

    if (args.userProfile) {
      systemPrompt += `\n\nAdditionally, consider the user's general preferences if they help refine the selection (but the selected cues are primary):`;
      if (args.userProfile.genres && args.userProfile.genres.length > 0) {
        systemPrompt += `\n- Preferred Genres: ${args.userProfile.genres.join(", ")}`;
      }
      if (args.userProfile.dislikedGenres && args.userProfile.dislikedGenres.length > 0) {
        systemPrompt += `\n- Disliked Genres (STRICTLY AVOID recommending anime primarily in these genres unless a selected cue OVERWHELMINGLY implies them, and even then, acknowledge it): ${args.userProfile.dislikedGenres.join(", ")}.`;
      }
      if (args.userProfile.dislikedTags && args.userProfile.dislikedTags.length > 0) {
        systemPrompt += `\n- Disliked Tags (STRICTLY AVOID recommending anime with these tags unless a selected cue OVERWHELMINGLY implies them): ${args.userProfile.dislikedTags.join(", ")}.`;
      }
      if (args.userProfile.experienceLevel) {
        systemPrompt += `\n- Experience Level: ${args.userProfile.experienceLevel}.`;
      }
    }

    systemPrompt += `

OUTPUT FORMAT:
Provide recommendations as a JSON object containing a single key "recommendations", where the value is an array of anime objects. Each object should include:
- title (string)
- description (string, a brief 1-2 sentence summary highlighting its connection to the cues)
- reasoning (string, 1-2 sentences on why it fits the selected mood/theme cues: "${args.selectedCues.join(", ")}")
- posterUrl (string, placeholder "https://via.placeholder.com/200x300.png?text=[ANIME_TITLE]" if unknown)
- genres (array of strings)
- year (number, if known, optional)
- emotionalTags (array of strings that align with the cues and anime, optional)
- trailerUrl (string, placeholder "https://www.youtube.com/results?search_query=[ANIME_TITLE]+trailer" if unknown, optional)

Return ONLY the JSON object. Do not include any other text.
If no suitable anime are found, return {"recommendations": []}.
Ensure the recommendations are distinct and genuinely reflect the selected cues.`;

    let recommendations: any[] = [];
    let errorResult: string | undefined = undefined;
    let rawResponseContent: string | null = null;
    let errorDetails: any = undefined;

    try {
      console.log(`[AI Action - getRecommendationsByMoodTheme] Getting for cues: ${args.selectedCues.join(", ")}`);
      const openai = getOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Find anime for these vibes: ${args.selectedCues.join(", ")}` }
        ],
        response_format: { type: "json_object" },
      });

      rawResponseContent = completion.choices[0].message.content;
      const parsedResult = tryParseAIResponse(rawResponseContent, "getRecommendationsByMoodTheme");

      if (parsedResult) {
        recommendations = parsedResult.slice(0, count);
      } else {
        errorResult = "AI response format error or no mood board recommendations found.";
      }
    } catch (error) {
      const err = error as any;
      console.error("[AI Action - getRecommendationsByMoodTheme] Error calling OpenAI:", err);
      errorResult = `Failed to get Mood Board recommendations: ${err.message || "Unknown error"}`;
      errorDetails = { status: err.status, type: err.type, code: err.code, rawError: err.toString() };
    } finally {
        if (userIdentity && args.messageId) { 
             await ctx.runMutation(api.ai.storeAiFeedback, {
                prompt: `Mood board cues: ${args.selectedCues.join(", ")}`,
                aiAction: "getRecommendationsByMoodTheme",
                aiResponseRecommendations: recommendations.length > 0 ? recommendations : undefined,
                aiResponseText: recommendations.length === 0 ? (rawResponseContent ?? errorResult ?? undefined) : undefined,
                feedbackType: "none",
                messageId: args.messageId,
            });
        }
    }
    return { recommendations, error: errorResult, details: errorDetails };
  },
});
