// convex/ai.ts
import OpenAI from "openai";
import { action, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server"; // Import the helper

const getOpenAIClient = () => {
  const apiKey = process.env.CONVEX_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("CONVEX_OPENAI_API_KEY environment variable is not set");
  }
  return new OpenAI({ apiKey });
};

const userProfileValidatorForAI = v.object({
    name: v.optional(v.string()),
    moods: v.optional(v.array(v.string())),
    genres: v.optional(v.array(v.string())),
    favoriteAnimes: v.optional(v.array(v.string())),
    experienceLevel: v.optional(v.string()),
    dislikedGenres: v.optional(v.array(v.string())),
    dislikedTags: v.optional(v.array(v.string())),
    characterArchetypes: v.optional(v.array(v.string())),
    tropes: v.optional(v.array(v.string())),
    artStyles: v.optional(v.array(v.string())),
    narrativePacing: v.optional(v.string()),
});

const watchlistActivityValidator = v.optional(v.array(v.object({
    animeTitle: v.string(),
    status: v.string(),
    userRating: v.optional(v.number())
})));

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
    // Use getAuthUserId to ensure we get the correct Id<"users">
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      console.warn("Attempted to store AI feedback for unauthenticated user. (storeAiFeedback)");
      return;
    }

    if (args.feedbackType === "down") {
        console.log(`[AI Feedback Analysis - Phase 2] User ${userId} downvoted action '${args.aiAction}' for prompt: "${args.prompt?.substring(0,50)}...". Response text: "${args.aiResponseText?.substring(0,50)}..."`);
    }

    await ctx.db.insert("aiInteractionFeedback", {
      userId: userId, // This is now correctly Id<"users">
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
        console.warn(`[AI Response - ${actionName}] Parsed JSON not in expected format. Content:`, jsonString.substring(0, 200));
        return null;
    } catch (error) {
        console.error(`[AI Response - ${actionName}] Failed to parse JSON. Error:`, error, "\nContent:", jsonString.substring(0,200));
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
      return { recommendations: [], error: "OpenAI API key not configured." , details: { reason: "API_KEY_MISSING" } };
    }

    let systemPrompt = `You are AniMuse, an AI anime concierge. Your goal is to recommend anime based on the user's request.
Provide recommendations as a JSON object containing a single key "recommendations", an array of anime objects. Each anime object must include:
title (string), description (string, 2-3 sentences), reasoning (string, why this fits the request/profile, 1-2 sentences), posterUrl (string, use "https://via.placeholder.com/200x300.png?text=[ANIME_TITLE_URL_ENCODED]" if unknown), genres (array of strings), year (number, optional), rating (number, 0-10, optional), emotionalTags (array of strings, optional), trailerUrl (string, use "https://www.youtube.com/results?search_query=[ANIME_TITLE]+trailer" if unknown, optional), studios (array of strings, optional), themes (array of strings, optional).

User profile:`;
    if (args.userProfile) {
        if (args.userProfile.moods?.length) systemPrompt += `\n- Moods: ${args.userProfile.moods.join(", ")}`;
        if (args.userProfile.genres?.length) systemPrompt += `\n- Pref Genres: ${args.userProfile.genres.join(", ")}`;
        if (args.userProfile.dislikedGenres?.length) systemPrompt += `\n- Disliked Genres (AVOID): ${args.userProfile.dislikedGenres.join(", ")}`;
        if (args.userProfile.dislikedTags?.length) systemPrompt += `\n- Disliked Tags (AVOID): ${args.userProfile.dislikedTags.join(", ")}`;
        if (args.userProfile.favoriteAnimes?.length) systemPrompt += `\n- Fav Animes (NO re-recommend): ${args.userProfile.favoriteAnimes.join(", ")}`;
        if (args.userProfile.experienceLevel) systemPrompt += `\n- Experience: ${args.userProfile.experienceLevel}`;
        if (args.userProfile.characterArchetypes?.length) systemPrompt += `\n- Liked Archetypes: ${args.userProfile.characterArchetypes.join(", ")}`;
        if (args.userProfile.tropes?.length) systemPrompt += `\n- Liked Tropes: ${args.userProfile.tropes.join(", ")}`;
        if (args.userProfile.artStyles?.length) systemPrompt += `\n- Liked Art Styles: ${args.userProfile.artStyles.join(", ")}`;
        if (args.userProfile.narrativePacing) systemPrompt += `\n- Pref Pacing: ${args.userProfile.narrativePacing}`;
    } else { systemPrompt += "\n- No specific profile provided."; }
    systemPrompt += `\nUser's request: "${args.prompt}"
Return ONLY JSON. Limit 3-5 recommendations. If none, {"recommendations": []}.`;

    let recommendations: any[] = [];
    let errorResult: string | undefined = undefined;
    let rawResponseContent: string | null = null;
    let errorDetails: any = undefined;

    try {
      const openai = getOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: args.prompt }], response_format: { type: "json_object" },
      });
      rawResponseContent = completion.choices[0].message.content;
      const parsedResult = tryParseAIResponse(rawResponseContent, "getAnimeRecommendation");
      if (parsedResult) recommendations = parsedResult;
      else errorResult = "AI response format error or no recommendations found.";
    } catch (err: any) {
      console.error("[AI Action - getAnimeRecommendation] Error:", err);
      errorResult = `AI Error: ${err.message || "Unknown"}`; errorDetails = { status: err.status, type: err.type };
    } finally {
        // The storeAiFeedback mutation will internally get the correct userId if the user is authenticated
        if (args.messageId) {
            await ctx.runMutation(api.ai.storeAiFeedback, {
                prompt: args.prompt,
                aiAction: "getAnimeRecommendation",
                aiResponseRecommendations: recommendations.length ? recommendations : undefined,
                aiResponseText: recommendations.length === 0 ? (rawResponseContent ?? errorResult) : undefined,
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
    animeDetails: v.optional(v.object({ title: v.string(), description: v.optional(v.string()), genres: v.optional(v.array(v.string())), themes: v.optional(v.array(v.string())), emotionalTags: v.optional(v.array(v.string())), year: v.optional(v.number()) })),
    userProfile: v.optional(userProfileValidatorForAI),
    count: v.optional(v.number()),
    messageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!process.env.CONVEX_OPENAI_API_KEY) return { recommendations: [], error: "OpenAI API key not configured.", details: { reason: "API_KEY_MISSING" } };

    let targetAnime: any = null;
    if (args.animeId) targetAnime = await ctx.runQuery(internal.anime.getAnimeByIdInternal, { animeId: args.animeId });
    else if (args.animeDetails) targetAnime = args.animeDetails;
    else if (args.animeTitle) targetAnime = await ctx.runQuery(internal.anime.getAnimeByTitleInternal, { title: args.animeTitle }) || { title: args.animeTitle };
    if (!targetAnime || !targetAnime.title) return { recommendations: [], error: "Target anime details not found.", details: args };

    const count = args.count || 5;
    let systemPrompt = `You are AniMuse AI. Find anime SIMILAR to TARGET: "${targetAnime.title}".
TARGET Details: Genres: ${targetAnime.genres?.join(", ") || "N/A"}, Themes: ${targetAnime.themes?.join(", ") || "N/A"}, Year: ${targetAnime.year || "N/A"}.
Find ${count} similar anime considering genres, themes, tone, storytelling.

User preferences to consider:`;
    if (args.userProfile) {
        if (args.userProfile.genres?.length) systemPrompt += `\n- Pref Genres: ${args.userProfile.genres.join(", ")}`;
        if (args.userProfile.dislikedGenres?.length) systemPrompt += `\n- Disliked Genres (AVOID): ${args.userProfile.dislikedGenres.join(", ")}`;
        if (args.userProfile.characterArchetypes?.length) systemPrompt += `\n- Liked Archetypes: ${args.userProfile.characterArchetypes.join(", ")}`;
    } else { systemPrompt += "\n- No specific user profile to consider beyond the target anime's nature."; }
    systemPrompt += `\n\nOutput JSON: {"recommendations": [...]}. Each object: title, description, reasoning (why similar), posterUrl, genres, year (opt), rating (opt), emotionalTags (opt), similarityScore (1-10).
ONLY JSON. No target re-recommend. If none, {"recommendations": []}.`;

    let recommendations: any[] = [];
    let errorResult: string | undefined = undefined;
    let rawResponseContent: string | null = null;
    let errorDetails: any = undefined;

    try {
      const openai = getOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `Find anime similar to "${targetAnime.title}"` }], response_format: { type: "json_object" },
      });
      rawResponseContent = completion.choices[0].message.content;
      const parsedResult = tryParseAIResponse(rawResponseContent, "getSimilarAnimeRecommendations");
      if (parsedResult) recommendations = parsedResult.sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0)).slice(0, count);
      else errorResult = "AI response format error or no similar found.";
    } catch (err: any) {
      console.error("[AI Action - getSimilarAnimeRecommendations] Error:", err);
      errorResult = `AI Error: ${err.message || "Unknown"}`; errorDetails = { status: err.status, code: err.code };
    } finally {
        if (args.messageId) {
            await ctx.runMutation(api.ai.storeAiFeedback, {
                prompt: `Find similar to: ${targetAnime.title}`,
                aiAction: "getSimilarAnimeRecommendations",
                aiResponseRecommendations: recommendations.length ? recommendations : undefined,
                aiResponseText: recommendations.length === 0 ? (rawResponseContent ?? errorResult) : undefined,
                feedbackType: "none",
                messageId: args.messageId,
            });
        }
    }
    return { recommendations, targetAnime: { title: targetAnime.title, _id: args.animeId || null }, error: errorResult, details: errorDetails };
  },
});


export const getPersonalizedRecommendations = action({
  args: { userProfile: userProfileValidatorForAI, watchlistActivity: watchlistActivityValidator, count: v.optional(v.number()), messageId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!process.env.CONVEX_OPENAI_API_KEY) return { recommendations: [], error: "OpenAI API key not configured.", details: { reason: "API_KEY_MISSING" } };
    const count = args.count || 5;

    let systemPrompt = `You are AniMuse AI. Craft personalized "For You" anime list for ${args.userProfile.name || "User"}.
USER PROFILE:`;
    if (args.userProfile.moods?.length) systemPrompt += `\n- Moods: ${args.userProfile.moods.join(", ")}`;
    if (args.userProfile.genres?.length) systemPrompt += `\n- Pref Genres: ${args.userProfile.genres.join(", ")}`;
    if (args.userProfile.dislikedGenres?.length) systemPrompt += `\n- Disliked Genres (AVOID): ${args.userProfile.dislikedGenres.join(", ")}`;
    if (args.userProfile.favoriteAnimes?.length) systemPrompt += `\n- Fav Animes (NO re-recommend): ${args.userProfile.favoriteAnimes.join(", ")}`;
    if (args.userProfile.experienceLevel) systemPrompt += `\n- Experience: ${args.userProfile.experienceLevel}`;
    if (args.userProfile.characterArchetypes?.length) systemPrompt += `\n- Liked Archetypes: ${args.userProfile.characterArchetypes.join(", ")}`;
    if (args.userProfile.tropes?.length) systemPrompt += `\n- Liked Tropes: ${args.userProfile.tropes.join(", ")}`;
    if (args.userProfile.artStyles?.length) systemPrompt += `\n- Liked Art: ${args.userProfile.artStyles.join(", ")}`;
    if (args.userProfile.narrativePacing) systemPrompt += `\n- Pref Pacing: ${args.userProfile.narrativePacing}`;

    if (args.watchlistActivity?.length) {
        systemPrompt += `\n\nRECENT WATCHLIST:`;
        const completed = args.watchlistActivity.filter(a => a.status === "Completed");
        const watching = args.watchlistActivity.filter(a => a.status === "Watching");
        if (completed.length) systemPrompt += `\n- Completed: ${completed.map(a => `${a.animeTitle}${a.userRating ? ` (Rated ${a.userRating}/5)` : ''}`).join(", ")}`;
        if (watching.length) systemPrompt += `\n- Watching: ${watching.map(a => a.animeTitle).join(", ")}`;
    }
    systemPrompt += `\n\nTASK: Generate ${count} personalized recommendations. Focus on implicit connections, discovery, variety, freshness.
Output JSON: {"recommendations": [...]}. Each object: title, description, reasoning (IMPORTANT: why for THIS user), posterUrl, genres, year (opt), rating (opt 0-10), emotionalTags (opt), trailerUrl (opt), studios (opt), themes (opt).
ONLY JSON. If none, {"recommendations": []}.`;

    let recommendations: any[] = [];
    let errorResult: string | undefined = undefined;
    let rawResponseContent: string | null = null;
    let errorDetails: any = undefined;

    try {
      const openai = getOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `My personalized "For You" list.` }], response_format: { type: "json_object" },
      });
      rawResponseContent = completion.choices[0].message.content;
      const parsedResult = tryParseAIResponse(rawResponseContent, "getPersonalizedRecommendations");
      if (parsedResult) recommendations = parsedResult.slice(0, count);
      else errorResult = "AI response format error or no personalized found.";
    } catch (err: any) {
      console.error("[AI Action - getPersonalizedRecommendations] Error:", err);
      errorResult = `AI Error: ${err.message || "Unknown"}`; errorDetails = { status: err.status, code: err.code };
    } finally {
        if (args.messageId) {
            await ctx.runMutation(api.ai.storeAiFeedback, {
                prompt: "Personalized 'For You' generation",
                aiAction: "getPersonalizedRecommendations",
                aiResponseRecommendations: recommendations.length ? recommendations : undefined,
                aiResponseText: recommendations.length === 0 ? (rawResponseContent ?? errorResult) : undefined,
                feedbackType: "none",
                messageId: args.messageId,
            });
        }
    }
    return { recommendations, error: errorResult, details: errorDetails };
  }
});

export const getRecommendationsByMoodTheme = action({
  args: { selectedCues: v.array(v.string()), userProfile: v.optional(userProfileValidatorForAI), count: v.optional(v.number()), messageId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!process.env.CONVEX_OPENAI_API_KEY) return { recommendations: [], error: "OpenAI API key not configured.", details: { reason: "API_KEY_MISSING" } };
    if (!args.selectedCues.length) return { recommendations: [], error: "No mood/theme cues selected.", details: { reason: "NO_CUES_SELECTED" } };
    const count = args.count || 3;

    let systemPrompt = `You are AniMuse AI. User selected mood/theme cues: "${args.selectedCues.join(", ")}".
Recommend ${count} anime matching these cues.`;
    if (args.userProfile) {
      systemPrompt += `\n\nUser preferences (secondary):`;
      if (args.userProfile.genres?.length) systemPrompt += `\n- Pref Genres: ${args.userProfile.genres.join(", ")}`;
      if (args.userProfile.dislikedGenres?.length) systemPrompt += `\n- Disliked Genres (AVOID): ${args.userProfile.dislikedGenres.join(", ")}`;
      if (args.userProfile.narrativePacing) systemPrompt += `\n- Pref Pacing: ${args.userProfile.narrativePacing}`;
    }
    systemPrompt += `\n\nOutput JSON: {"recommendations": [...]}. Each object: title, description (link to cues), reasoning (why fits cues), posterUrl, genres, year (opt), emotionalTags (align with cues, opt), trailerUrl (opt).
ONLY JSON. If none, {"recommendations": []}.`;

    let recommendations: any[] = [];
    let errorResult: string | undefined = undefined;
    let rawResponseContent: string | null = null;
    let errorDetails: any = undefined;

    try {
      const openai = getOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `Anime for vibes: ${args.selectedCues.join(", ")}` }], response_format: { type: "json_object" },
      });
      rawResponseContent = completion.choices[0].message.content;
      const parsedResult = tryParseAIResponse(rawResponseContent, "getRecommendationsByMoodTheme");
      if (parsedResult) recommendations = parsedResult.slice(0, count);
      else errorResult = "AI response format error or no mood board found.";
    } catch (err: any) {
      console.error("[AI Action - getRecommendationsByMoodTheme] Error:", err);
      errorResult = `AI Error: ${err.message || "Unknown"}`; errorDetails = { status: err.status, code: err.code };
    } finally {
        if (args.messageId) {
            await ctx.runMutation(api.ai.storeAiFeedback, {
                prompt: `Mood cues: ${args.selectedCues.join(", ")}`,
                aiAction: "getRecommendationsByMoodTheme",
                aiResponseRecommendations: recommendations.length ? recommendations : undefined,
                aiResponseText: recommendations.length === 0 ? (rawResponseContent ?? errorResult) : undefined,
                feedbackType: "none",
                messageId: args.messageId,
            });
        }
    }
    return { recommendations, error: errorResult, details: errorDetails };
  },
});