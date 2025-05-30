// convex/ai.ts
import { action, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import OpenAI from "openai";
import { Id, Doc } from "./_generated/dataModel"; // Doc added for clarity
import { AnimeRecommendation } from "./types"; // Ensure this type is comprehensive


interface AnimeDocument {
    _id: Id<"anime">;
    title: string;
    description?: string;
    posterUrl?: string;
    genres?: string[];
    year?: number;
    rating?: number;
    emotionalTags?: string[];
    themes?: string[];
    studios?: string[];
}

// Enhanced user profile validator (ensure this matches your schema and needs)
const enhancedUserProfileValidator = v.object({
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

// Enhanced conversation context validator
const conversationContextValidator = v.object({
  messageHistory: v.array(v.object({
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    timestamp: v.number(),
    actionType: v.optional(v.string()),
  })),
  userPreferences: v.optional(v.object({
    genres: v.optional(v.array(v.string())),
    dislikedGenres: v.optional(v.array(v.string())),
    experienceLevel: v.optional(v.string()),
    recentFeedback: v.optional(v.array(v.object({
      recommendationTitle: v.string(),
      feedbackType: v.union(v.literal("up"), v.literal("down")),
      timestamp: v.number(),
    }))),
  })),
});

// Helper function for parsing AI responses
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
        console.warn(`[AI Response - ${actionName}] Parsed JSON not in expected format, got:`, typeof parsed, Object.keys(parsed));
        return null;
    } catch (error) {
        console.error(`[AI Response - ${actionName}] Failed to parse JSON:`, error, "\nOriginal String:", jsonString.substring(0, 500));
        return null;
    }
};

export const getAllAnimeInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("anime").collect();
  },
});

// Store AI feedback mutation
export const storeAiFeedback = mutation({
  args: {
    prompt: v.string(),
    aiAction: v.string(),
    aiResponseRecommendations: v.optional(v.array(v.any())),
    aiResponseText: v.optional(v.string()),
    feedbackType: v.union(v.literal("up"), v.literal("down"), v.literal("none")),
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
     await ctx.db.insert("aiInteractionFeedback", {
       userId: "system" as any, // Replace with actual userId if available and authenticated
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

export const enhanceRecommendationsPosters = action({
  args: {
    recommendations: v.array(v.any()),
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`[Poster Enhancement Action] Starting enhancement for ${args.recommendations.length} recommendations`);
    
    try {
      const enhancedRecommendations = await enhanceRecommendationsWithDatabaseFirst(ctx, args.recommendations);
      
      console.log(`[Poster Enhancement Action] Successfully enhanced ${enhancedRecommendations.length} recommendations`);
      
      // Store feedback about the enhancement
      await ctx.runMutation(api.ai.storeAiFeedback, {
        prompt: "Poster enhancement request",
        aiAction: "enhanceRecommendationsPosters",
        aiResponseRecommendations: enhancedRecommendations,
        feedbackType: "none",
        messageId: args.messageId,
      });
      
      return { 
        recommendations: enhancedRecommendations, 
        enhanced: enhancedRecommendations.length,
        error: undefined 
      };
    } catch (error: any) {
      console.error("[Poster Enhancement Action] Error:", error);
      return { 
        recommendations: args.recommendations, 
        enhanced: 0,
        error: `Enhancement failed: ${error.message}` 
      };
    }
  },
});

const fetchRealAnimePosterWithRetry = async (animeTitle: string, maxRetries: number = 2): Promise<string | null> => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Clean the title for better search results
      const cleanTitle = animeTitle
        .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();

      console.log(`[Real Poster Fetch] Attempt ${attempt + 1} for: "${cleanTitle}"`);

      // Try AniList first (highest quality images) with timeout
      const anilistQuery = `
        query ($search: String) {
          Media (search: $search, type: ANIME, sort: SEARCH_MATCH) {
            id
            title { romaji english native }
            coverImage { 
              extraLarge 
              large 
              medium 
            }
            averageScore
          }
        }
      `;

      try {
        const anilistController = new AbortController();
        const anilistTimeout = setTimeout(() => anilistController.abort(), 8000); // 8 second timeout

        const anilistResponse = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Accept': 'application/json',
            'User-Agent': 'AniMuse-App/1.0'
          },
          body: JSON.stringify({ 
            query: anilistQuery, 
            variables: { search: cleanTitle }
          }),
          signal: anilistController.signal
        });

        clearTimeout(anilistTimeout);

        if (anilistResponse.ok) {
          const anilistData = await anilistResponse.json();
          const media = anilistData?.data?.Media;
          if (media?.coverImage) {
            const posterUrl = media.coverImage.extraLarge || media.coverImage.large || media.coverImage.medium;
            if (posterUrl && posterUrl.startsWith('https://')) {
              console.log(`[Real Poster Fetch] ✅ Found AniList poster for: "${cleanTitle}" (ID: ${media.id})`);
              // Verify the URL is accessible
              try {
                const testController = new AbortController();
                const testTimeout = setTimeout(() => testController.abort(), 3000);
                const testResponse = await fetch(posterUrl, { 
                  method: 'HEAD', 
                  signal: testController.signal 
                });
                clearTimeout(testTimeout);
                if (testResponse.ok) {
                  return posterUrl;
                }
              } catch (testError) {
                console.warn(`[Real Poster Fetch] AniList URL test failed for: "${cleanTitle}"`);
              }
            }
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.warn(`[Real Poster Fetch] AniList timeout for: "${cleanTitle}"`);
        } else {
          console.warn(`[Real Poster Fetch] AniList error for: "${cleanTitle}":`, error.message);
        }
      }

      // Small delay before trying Jikan
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fallback to Jikan API with better error handling and timeout
      try {
        const encodedTitle = encodeURIComponent(cleanTitle);
        const jikanUrl = `https://api.jikan.moe/v4/anime?q=${encodedTitle}&limit=1&sfw`;
        
        const jikanController = new AbortController();
        const jikanTimeout = setTimeout(() => jikanController.abort(), 8000); // 8 second timeout
        
        const jikanResponse = await fetch(jikanUrl, {
          headers: { 
            'Accept': 'application/json',
            'User-Agent': 'AniMuse-App/1.0'
          },
          signal: jikanController.signal
        });
        
        clearTimeout(jikanTimeout);
        
        if (jikanResponse.ok) {
          const jikanData = await jikanResponse.json();
          const anime = jikanData?.data?.[0];
          if (anime?.images) {
            const posterUrl = anime.images.jpg?.large_image_url || 
                            anime.images.webp?.large_image_url || 
                            anime.images.jpg?.image_url || 
                            anime.images.webp?.image_url;
            
            if (posterUrl && posterUrl.startsWith('https://')) {
              console.log(`[Real Poster Fetch] ✅ Found Jikan poster for: "${cleanTitle}" (MAL ID: ${anime.mal_id})`);
              // Verify the URL is accessible
              try {
                const testController = new AbortController();
                const testTimeout = setTimeout(() => testController.abort(), 3000);
                const testResponse = await fetch(posterUrl, { 
                  method: 'HEAD', 
                  signal: testController.signal 
                });
                clearTimeout(testTimeout);
                if (testResponse.ok) {
                  return posterUrl;
                }
              } catch (testError) {
                console.warn(`[Real Poster Fetch] Jikan URL test failed for: "${cleanTitle}"`);
              }
            }
          }
        } else if (jikanResponse.status === 429) {
          // Rate limited, wait longer before retry
          const waitTime = (attempt + 1) * 2000;
          console.log(`[Real Poster Fetch] Rate limited, waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.warn(`[Real Poster Fetch] Jikan timeout for: "${cleanTitle}"`);
        } else {
          console.warn(`[Real Poster Fetch] Jikan error for: "${cleanTitle}":`, error.message);
        }
      }

      // If both APIs failed, return null for this attempt
      return null;

    } catch (error: any) {
      console.error(`[Real Poster Fetch] Attempt ${attempt + 1} failed for "${animeTitle}":`, error.message);
      
      if (attempt < maxRetries) {
        // Wait before retry, with exponential backoff
        const waitTime = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  console.warn(`[Real Poster Fetch] ❌ All attempts failed for: "${animeTitle}"`);
  return null;
};

 const isValidPosterUrl = (posterUrl: string | undefined): boolean => {
  if (!posterUrl) return false;
  if (posterUrl === "PLACEHOLDER") return false;
  if (posterUrl.includes('placehold.co')) return false;
  if (posterUrl.includes('placeholder')) return false;
  return posterUrl.startsWith('https://');
};
   


// Enhanced version that checks database first
const enhanceRecommendationsWithDatabaseFirst = async (
  ctx: any,
  recommendations: any[]
): Promise<any[]> => {
  const enhancedRecommendations = [];
  
  console.log(`[Database-First Enhancement] Processing ${recommendations.length} recommendations...`);
  
  for (let i = 0; i < recommendations.length; i++) {
    const rec = recommendations[i];
    let posterUrl = rec.posterUrl;
    let foundInDatabase = false;
    
    console.log(`[Database-First Enhancement] Processing (${i + 1}/${recommendations.length}): ${rec.title}`);
    
    // Step 1: Check database first
    if (rec.title) {
      try {
        const dbAnime = await ctx.runQuery(internal.anime.getAnimeByTitleInternal, { 
          title: rec.title 
        });
        
        if (dbAnime && isValidPosterUrl(dbAnime.posterUrl)) {
          posterUrl = dbAnime.posterUrl;
          foundInDatabase = true;
          console.log(`[Database-First Enhancement] ✅ Found in DB with valid poster: ${rec.title}`);
          
          // Also enhance other fields from database if they're better
          rec.description = rec.description || dbAnime.description;
          rec.genres = rec.genres?.length ? rec.genres : (dbAnime.genres || []);
          rec.year = rec.year || dbAnime.year;
          rec.rating = rec.rating || dbAnime.rating;
          rec.studios = rec.studios?.length ? rec.studios : (dbAnime.studios || []);
        } else if (dbAnime) {
          console.log(`[Database-First Enhancement] Found in DB but poster needs enhancement: ${rec.title}`);
        } else {
          console.log(`[Database-First Enhancement] Not found in DB: ${rec.title}`);
        }
      } catch (error: any) {
        console.warn(`[Database-First Enhancement] DB lookup error for "${rec.title}":`, error.message);
      }
    }
    
    // Step 2: If not found in DB or poster is invalid, use external APIs
    if (!foundInDatabase && (!posterUrl || !isValidPosterUrl(posterUrl))) {
      console.log(`[Database-First Enhancement] 🔍 Fetching external poster for: ${rec.title}`);
      
      try {
        const externalPosterUrl = await fetchRealAnimePosterWithRetry(rec.title, 1);
        
        if (externalPosterUrl) {
          posterUrl = externalPosterUrl;
          console.log(`[Database-First Enhancement] ✅ Found external poster: ${rec.title}`);
        } else {
          // Final fallback to placeholder
          const encodedTitle = encodeURIComponent((rec.title || "Anime").substring(0, 30));
          posterUrl = `https://placehold.co/600x900/ECB091/321D0B/png?text=${encodedTitle}&font=roboto`;
          console.log(`[Database-First Enhancement] 📝 Using fallback placeholder: ${rec.title}`);
        }
      } catch (error: any) {
        console.error(`[Database-First Enhancement] External fetch error for "${rec.title}":`, error.message);
        const encodedTitle = encodeURIComponent((rec.title || "Anime").substring(0, 30));
        posterUrl = `https://placehold.co/600x900/ECB091/321D0B/png?text=${encodedTitle}&font=roboto`;
      }
    }
    
    enhancedRecommendations.push({
      ...rec,
      posterUrl,
      title: rec.title || "Unknown Title",
      description: rec.description || "No description available.",
      reasoning: rec.reasoning || "AI recommendation.",
      foundInDatabase, // Add this flag for debugging
    });
    
    // Small delay between external API calls (not needed for DB lookups)
    if (!foundInDatabase && i < recommendations.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  const dbHits = enhancedRecommendations.filter(rec => rec.foundInDatabase).length;
  const realPostersFound = enhancedRecommendations.filter(rec => 
    rec.posterUrl && !rec.posterUrl.includes('placehold.co')
  ).length;
  
  console.log(`[Database-First Enhancement] ✅ Complete! DB hits: ${dbHits}/${recommendations.length}, Real posters: ${realPostersFound}/${recommendations.length}`);
  
  return enhancedRecommendations;
};


export const getAnimeRecommendationWithBetterLogging = action({
  args: {
    prompt: v.string(),
    userProfile: v.optional(enhancedUserProfileValidator),
    count: v.optional(v.number()),
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      return { recommendations: [], error: "OpenAI API key not configured." };
    }

    console.log(`[AI Recommendations] Starting recommendation generation for prompt: "${args.prompt}"`);

    let systemPrompt = `You are AniMuse AI, an expert anime recommendation assistant.
Your goal is to provide high-quality anime recommendations based on the user's prompt.
Consider the user's profile if provided to tailor suggestions.
Output a JSON object with a single key "recommendations", which is an array of 3-${args.count || 3} anime.

IMPORTANT: For posterUrl, please try to provide real anime poster URLs if you know them. 
If you don't know a real URL, just put "PLACEHOLDER" and the system will search for real posters.

Each anime object should have: 
- title (string, REQUIRED): The exact title of the anime
- description (string): A brief synopsis  
- reasoning (string): Why it matches the prompt/profile
- posterUrl (string): Real poster URL if known, otherwise "PLACEHOLDER"
- genres (array of strings): Key genres
- year (number): Release year if known
- rating (number 0-10): External average rating if known
- emotionalTags (array of strings): Emotional descriptors like "heartwarming", "intense"
- trailerUrl (string, optional): YouTube or official trailer URL if known
- studios (array of strings): Animation studios
- themes (array of strings): Major themes

Focus on providing diverse and relevant choices with accurate information.`;

    if (args.userProfile) {
      systemPrompt += "\n\nUser Profile Context:";
      if (args.userProfile.name) systemPrompt += `\n- Name: ${args.userProfile.name}`;
      if (args.userProfile.moods?.length) systemPrompt += `\n- Current Moods: ${args.userProfile.moods.join(", ")}`;
      if (args.userProfile.genres?.length) systemPrompt += `\n- Preferred Genres: ${args.userProfile.genres.join(", ")}`;
      if (args.userProfile.favoriteAnimes?.length) systemPrompt += `\n- Favorite Anime: ${args.userProfile.favoriteAnimes.join(", ")}`;
      if (args.userProfile.experienceLevel) systemPrompt += `\n- Experience Level: ${args.userProfile.experienceLevel}`;
      if (args.userProfile.dislikedGenres?.length) systemPrompt += `\n- Disliked Genres: ${args.userProfile.dislikedGenres.join(", ")}`;
    }

    let recommendations: any[] = [];
    let errorResult: string | undefined = undefined;

    try {
      console.log(`[AI Recommendations] Calling OpenAI API...`);
      const openai = new OpenAI({ apiKey: process.env.CONVEX_OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: args.prompt }
        ],
        response_format: { type: "json_object" },
      });

      console.log(`[AI Recommendations] OpenAI response received, parsing...`);
      const parsed = tryParseAIResponse(completion.choices[0].message.content, "getAnimeRecommendation");
      
      if (parsed) {
        const rawRecommendations = parsed.slice(0, args.count || 3);
        console.log(`[AI Recommendations] Raw recommendations:`, rawRecommendations.map(r => ({ title: r.title, posterUrl: r.posterUrl })));
        
        // Enhance recommendations with real posters
        console.log(`[AI Recommendations] Enhancing ${rawRecommendations.length} recommendations with real posters...`);
        const startTime = Date.now();
        recommendations = await enhanceRecommendationsWithDatabaseFirst(ctx, rawRecommendations);
        const enhancementTime = Date.now() - startTime;
        
        console.log(`[AI Recommendations] Poster enhancement completed in ${enhancementTime}ms`);
        console.log(`[AI Recommendations] Final recommendations:`, recommendations.map(r => ({ 
          title: r.title, 
          posterUrl: r.posterUrl?.substring(0, 50) + "...",
          isReal: !r.posterUrl?.includes('placehold.co')
        })));
        
        console.log(`[AI Recommendations] Successfully enhanced ${recommendations.length} recommendations`);
      } else {
        errorResult = "AI response format error or no recommendations found.";
        console.error(`[AI Recommendations] Parse error: ${errorResult}`);
      }
    } catch (err: any) {
      console.error("[AI Action - GetAnimeRecommendation] Error:", err);
      errorResult = `AI Error: ${err.message || "Unknown"}`;
    } finally {
      if (args.messageId) {
         await ctx.runMutation(api.ai.storeAiFeedback, {
          prompt: args.prompt,
          aiAction: "getAnimeRecommendation",
          aiResponseRecommendations: recommendations.length ? recommendations : undefined,
          aiResponseText: recommendations.length === 0 ? errorResult : undefined,
          feedbackType: "none",
          messageId: args.messageId,
        });
      }
    }
    return { recommendations, error: errorResult };
  },
});
// *******************************************************************
// END OF getAnimeRecommendation
// *******************************************************************


// Smart query analyzer - determines if query needs clarification
export const analyzeUserQuery = action({
  args: {
    query: v.string(),
    conversationContext: v.optional(conversationContextValidator),
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      return {
        needsClarification: false,
        suggestedAction: "getAnimeRecommendation",
        confidence: 0,
        error: "OpenAI API key not configured."
      };
    }

    let systemPrompt = `You are AniMuse Query Analyzer. Analyze user queries to determine:
1. Whether the query is clear enough for direct recommendations
2. What type of recommendation action would be best
3. If clarification is needed, what specific questions to ask

User Query: "${args.query}"

Conversation Context:`;

    if (args.conversationContext?.messageHistory.length) {
      systemPrompt += `\nRecent conversation:`;
      args.conversationContext.messageHistory.slice(-3).forEach(msg => {
        systemPrompt += `\n${msg.role}: ${msg.content}`;
      });
    }

    if (args.conversationContext?.userPreferences) {
      const prefs = args.conversationContext.userPreferences;
      if (prefs.genres?.length) systemPrompt += `\nUser likes: ${prefs.genres.join(", ")}`;
      if (prefs.dislikedGenres?.length) systemPrompt += `\nUser dislikes: ${prefs.dislikedGenres.join(", ")}`;
      if (prefs.experienceLevel) systemPrompt += `\nExperience: ${prefs.experienceLevel}`;
    }

    systemPrompt += `\n\nAvailable Actions:
- getAnimeRecommendation: General recommendations
- getCharacterBasedRecommendations: Character-focused
- getTropeBasedRecommendations: Plot/trope-based
- getArtStyleRecommendations: Visual style focused
- getComparativeAnalysis: Compare two anime
- getHiddenGemRecommendations: Surprise discoveries
- getFranchiseGuide: Watch order guides

Output JSON:
{
  "needsClarification": boolean,
  "confidence": 0.0-1.0,
  "suggestedAction": "action_name",
  "actionParams": {...}, // Extracted parameters if clear
  "clarificationQuestions": ["question1", "question2"], // If clarification needed
  "reasoning": "Why this analysis"
}

Rules:
- needsClarification = true if query is vague (e.g., "something good", "I'm bored")
- needsClarification = true if missing key info for specific actions
- High confidence (0.8+) for clear, specific queries
- Medium confidence (0.5-0.8) for mostly clear queries
- Low confidence (<0.5) needs clarification`;

    try {
      const openai = new OpenAI({ apiKey: process.env.CONVEX_OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: args.query }
        ],
        response_format: { type: "json_object" },
      });

      const analysis = JSON.parse(completion.choices[0].message.content || "{}");

      await ctx.runMutation(api.ai.storeAiFeedback, {
        prompt: args.query,
        aiAction: "analyzeUserQuery",
        aiResponseText: JSON.stringify(analysis),
        feedbackType: "none",
        messageId: args.messageId,
      });

      return {
        needsClarification: analysis.needsClarification || false,
        suggestedAction: analysis.suggestedAction || "getAnimeRecommendation",
        actionParams: analysis.actionParams || {},
        clarificationQuestions: analysis.clarificationQuestions || [],
        confidence: analysis.confidence || 0.5,
        reasoning: analysis.reasoning || "No specific reasoning provided",
      };

    } catch (err: any) {
      console.error("[AI Action - Query Analysis] Error:", err);
      return {
        needsClarification: true,
        suggestedAction: "getAnimeRecommendation",
        confidence: 0,
        error: `Analysis Error: ${err.message || "Unknown"}`,
        clarificationQuestions: [
          "What genre or type of anime are you in the mood for?",
          "Are you looking for something specific, like action, romance, or comedy?",
          "Any particular length preference - movie, short series, or long-running?"
        ]
      };
    }
  },
});

// Recommendation refinement - improve suggestions based on feedback
export const refineRecommendations = action({
  args: {
    originalQuery: v.string(),
    originalRecommendations: v.array(v.any()),
    refinementRequest: v.string(), // e.g., "more action", "less romance", "older anime"
    userProfile: v.optional(enhancedUserProfileValidator),
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      return { recommendations: [], error: "OpenAI API key not configured." };
    }

    let systemPrompt = `You are AniMuse Recommendation Refiner. The user received recommendations but wants adjustments.

ORIGINAL QUERY: "${args.originalQuery}"
REFINEMENT REQUEST: "${args.refinementRequest}"

ORIGINAL RECOMMENDATIONS:`;

    args.originalRecommendations.forEach((rec, idx) => {
      systemPrompt += `\n${idx + 1}. ${rec.title} - ${rec.reasoning || rec.description}`;
    });

    systemPrompt += `\n\nUser Profile:`;
    if (args.userProfile) {
      if (args.userProfile.genres?.length) systemPrompt += `\n- Preferred Genres: ${args.userProfile.genres.join(", ")}`;
      if (args.userProfile.dislikedGenres?.length) systemPrompt += `\n- Avoid: ${args.userProfile.dislikedGenres.join(", ")}`;
      if (args.userProfile.experienceLevel) systemPrompt += `\n- Experience: ${args.userProfile.experienceLevel}`;
    }

    systemPrompt += `\n\nRefinement Strategy:
1. Understand what the user wants to adjust (more/less of something, different direction)
2. Keep what they liked about the original recommendations
3. Apply the requested changes intelligently
4. Provide 3-5 new recommendations that better match their refined criteria
5. Explain why these are better fits for their refinement

Common Refinement Types:
- "More action/romance/comedy" - increase that element
- "Less X" - reduce or avoid that element
- "Older/newer anime" - adjust time period
- "Shorter/longer series" - adjust episode count
- "More mainstream/obscure" - adjust popularity level
- "Similar to #X but..." - use specific rec as base

Output JSON: {"recommendations": [...]}
Each recommendation: title, description, reasoning (explain how this addresses their refinement), posterUrl, genres, year, rating, refinementExplanation (why this is better than original suggestions).`;

    let recommendations: any[] = [];
    let errorResult: string | undefined = undefined;

    try {
      const openai = new OpenAI({ apiKey: process.env.CONVEX_OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: args.refinementRequest }
        ],
        response_format: { type: "json_object" },
      });

      const parsed = tryParseAIResponse(completion.choices[0].message.content, "refineRecommendations");
      if (parsed) recommendations = parsed.slice(0, 5);
      else errorResult = "AI response format error.";
    } catch (err: any) {
      console.error("[AI Action - Refinement] Error:", err);
      errorResult = `AI Error: ${err.message || "Unknown"}`;
    } finally {
      await ctx.runMutation(api.ai.storeAiFeedback, {
        prompt: `Refine: ${args.originalQuery} -> ${args.refinementRequest}`,
        aiAction: "refineRecommendations",
        aiResponseRecommendations: recommendations.length ? recommendations : undefined,
        aiResponseText: recommendations.length === 0 ? errorResult : undefined,
        feedbackType: "none",
        messageId: args.messageId,
      });
    }

    return { recommendations, error: errorResult };
  },
});

// Context-aware follow-up suggestions
export const generateFollowUpSuggestions = action({
  args: {
    lastRecommendations: v.array(v.any()),
    userInteractions: v.array(v.object({
      recommendationTitle: v.string(),
      action: v.union(v.literal("liked"), v.literal("disliked"), v.literal("added_to_watchlist"), v.literal("viewed_details")),
      timestamp: v.number(),
    })),
    userProfile: v.optional(enhancedUserProfileValidator),
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      return { suggestions: [], error: "OpenAI API key not configured." };
    }

    let systemPrompt = `You are AniMuse Follow-up Suggester. Based on user interactions with recommendations, suggest next steps.

LAST RECOMMENDATIONS:`;

    args.lastRecommendations.forEach((rec, idx) => {
      systemPrompt += `\n${idx + 1}. ${rec.title} (${rec.genres?.join(", ") || "No genres"})`;
    });

    systemPrompt += `\n\nUSER INTERACTIONS:`;
    args.userInteractions.forEach(interaction => {
      systemPrompt += `\n- ${interaction.action.toUpperCase()}: ${interaction.recommendationTitle}`;
    });

    systemPrompt += `\n\nGenerate 3-4 follow-up suggestions based on their behavior:

1. If they liked specific recommendations -> suggest similar anime
2. If they added things to watchlist -> suggest complementary picks
3. If they disliked recommendations -> pivot to different approach
4. If they viewed details -> they're interested, suggest related content

Suggestion Types:
- "more_like_this": Similar to what they liked
- "complementary": Good to watch alongside their picks
- "pivot": Different direction if they didn't like suggestions
- "deep_dive": Explore specific aspect (director, studio, theme) they seemed interested in
- "next_steps": What to watch after they finish current picks

Output JSON: {
  "suggestions": [
    {
      "type": "suggestion_type",
      "title": "Suggestion title",
      "description": "Why this makes sense",
      "actionPrompt": "Suggested user query to explore this"
    }
  ]
}`;

    try {
      const openai = new OpenAI({ apiKey: process.env.CONVEX_OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate follow-up suggestions based on my interactions" }
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");

      await ctx.runMutation(api.ai.storeAiFeedback, {
        prompt: "Follow-up suggestions generation",
        aiAction: "generateFollowUpSuggestions",
        aiResponseText: JSON.stringify(result),
        feedbackType: "none",
        messageId: args.messageId,
      });

      return {
        suggestions: result.suggestions || [],
        error: undefined,
      };

    } catch (err: any) {
      console.error("[AI Action - Follow-up] Error:", err);
      return {
        suggestions: [],
        error: `AI Error: ${err.message || "Unknown"}`,
      };
    }
  },
});

// Enhanced feedback learning system
export const learnFromFeedback = action({
  args: {
    timeRange: v.optional(v.object({
      startDate: v.number(),
      endDate: v.number(),
    })),
    analysisType: v.optional(v.union(
      v.literal("negative_patterns"),
      v.literal("positive_patterns"),
      v.literal("improvement_suggestions"),
      v.literal("user_preference_insights")
    )),
  },
  handler: async (ctx, args) => {
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      return { insights: null, error: "OpenAI API key not configured." };
    }

    let systemPrompt = `You are AniMuse Learning Analyzer. Analyze user feedback patterns to improve recommendations.

ANALYSIS TYPE: ${args.analysisType || "general_insights"}

Based on feedback data, identify:
1. Common reasons for negative feedback
2. Patterns in successful recommendations
3. User preference trends
4. Recommendation strategy improvements

FEEDBACK PATTERNS:
[This would be populated from actual feedback data from the database]

Output JSON based on analysis type:

For "negative_patterns":
{
  "negativePatterns": [
    {
      "pattern": "Description of pattern",
      "frequency": number,
      "examples": ["example1", "example2"],
      "suggestedFix": "How to avoid this"
    }
  ]
}

For "positive_patterns":
{
  "positivePatterns": [
    {
      "pattern": "What works well",
      "frequency": number,
      "examples": ["example1", "example2"],
      "amplificationStrategy": "How to do more of this"
    }
  ]
}

For "improvement_suggestions":
{
  "improvements": [
    {
      "area": "Area to improve",
      "currentIssue": "What's not working",
      "proposedSolution": "How to fix it",
      "priority": "high|medium|low"
    }
  ]
}`;

    try {
      const openai = new OpenAI({ apiKey: process.env.CONVEX_OPENAI_API_KEY });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze feedback for ${args.analysisType || "general insights"}` }
        ],
        response_format: { type: "json_object" },
      });

      const insights = JSON.parse(completion.choices[0].message.content || "{}");

      return { insights, error: undefined };

    } catch (err: any) {
      console.error("[AI Action - Learning] Error:", err);
      return {
        insights: null,
        error: `Learning Error: ${err.message || "Unknown"}`,
      };
    }
  },
});

const getAdvancedSystemPrompt = (role: string, context: any) => {
  const roles: Record<string, string> = {
    "anime_historian": `You are an Anime Historian with deep knowledge of anime evolution from the 1960s to present. You understand:
- Historical context and cultural significance
- How anime styles and themes evolved over decades
- Influence of manga, light novels, and cultural events
- Studio evolution and director signatures
- Genre development and cross-cultural impact

Speak with authority about anime history while making connections to user preferences.`,

    "casual_blogger": `You are a friendly Anime Blogger who writes for everyday fans. You:
- Use conversational, accessible language
- Focus on emotional impact and relatability
- Make pop culture references and comparisons
- Emphasize why anime matters to real people
- Share personal enthusiasm while staying helpful

Write like you're talking to a friend about anime they'd love.`,

    "genre_specialist": `You are a Genre Specialist with deep expertise in anime categorization and cross-genre pollination. You understand:
- Subtle genre differences and subgenres
- How genres blend and evolve
- Cultural contexts that shape genre conventions
- Why certain combinations work or don't work
- How to find the "right" version of any genre for different viewers

Provide nuanced genre guidance that goes beyond surface-level categorization.`,

    "discovery_guide": `You are an Anime Discovery Guide focused on expanding horizons and finding hidden connections. You excel at:
- Finding unexpected connections between different anime
- Suggesting "bridge" anime to help users explore new territories
- Identifying emotional through-lines that transcend genre
- Curating journeys of discovery rather than just individual picks
- Helping users articulate what they didn't know they wanted

Guide users toward meaningful discoveries that surprise and delight.`
  };

  return roles[role] || roles["casual_blogger"];
};

export const getRoleBasedRecommendations = action({
  args: {
    query: v.string(),
    aiRole: v.optional(v.union(
      v.literal("anime_historian"),
      v.literal("casual_blogger"),
      v.literal("genre_specialist"),
      v.literal("discovery_guide")
    )),
    userProfile: v.optional(enhancedUserProfileValidator),
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      return { recommendations: [], error: "OpenAI API key not configured." };
    }

    const role = args.aiRole || "casual_blogger";
    let systemPrompt = getAdvancedSystemPrompt(role, { userProfile: args.userProfile });

    systemPrompt += `\n\nUser Query: "${args.query}"`;

    if (args.userProfile) {
      systemPrompt += `\n\nUser Context:`;
      if (args.userProfile.experienceLevel) systemPrompt += `\n- Experience: ${args.userProfile.experienceLevel}`;
      if (args.userProfile.genres?.length) systemPrompt += `\n- Likes: ${args.userProfile.genres.join(", ")}`;
      if (args.userProfile.dislikedGenres?.length) systemPrompt += `\n- Avoids: ${args.userProfile.dislikedGenres.join(", ")}`;
    }

    systemPrompt += `\n\nProvide recommendations in your role as ${role.replace("_", " ")}. Use your expertise and voice while being helpful.

Output JSON: {"recommendations": [...]}
Each recommendation: title, description, reasoning (in your role's voice/perspective), posterUrl, genres, year, rating, roleSpecificInsight (unique perspective from your role).`;

    let recommendations: any[] = [];
    let errorResult: string | undefined = undefined;

    try {
      const openai = new OpenAI({ apiKey: process.env.CONVEX_OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: args.query }
        ],
        response_format: { type: "json_object" },
      });

      const parsed = tryParseAIResponse(completion.choices[0].message.content, "getRoleBasedRecommendations");
      if (parsed) recommendations = parsed.slice(0, 4);
      else errorResult = "AI response format error.";
    } catch (err: any) {
      console.error("[AI Action - Role-Based] Error:", err);
      errorResult = `AI Error: ${err.message || "Unknown"}`;
    } finally {
      await ctx.runMutation(api.ai.storeAiFeedback, {
        prompt: `${role}: ${args.query}`,
        aiAction: "getRoleBasedRecommendations",
        aiResponseRecommendations: recommendations.length ? recommendations : undefined,
        aiResponseText: recommendations.length === 0 ? errorResult : undefined,
        feedbackType: "none",
        messageId: args.messageId,
      });
    }

    return { recommendations, role, error: errorResult };
  },
});

export const getCharacterBasedRecommendations = action({
  args: {
    characterDescription: v.string(),
    referenceAnime: v.optional(v.string()),
    userProfile: v.optional(enhancedUserProfileValidator),
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      return { recommendations: [], error: "OpenAI API key not configured." };
    }

    let systemPrompt = `You are AniMuse AI, specializing in character-driven anime recommendations.

USER REQUEST: Find anime with characters similar to: "${args.characterDescription}"`;

    if (args.referenceAnime) {
      systemPrompt += `\nReference anime mentioned: "${args.referenceAnime}"`;
    }

    systemPrompt += `\n\nUser Profile:`;
    if (args.userProfile) {
      if (args.userProfile.characterArchetypes?.length) {
        systemPrompt += `\n- Liked Character Types: ${args.userProfile.characterArchetypes.join(", ")}`;
      }
      if (args.userProfile.genres?.length) {
        systemPrompt += `\n- Preferred Genres: ${args.userProfile.genres.join(", ")}`;
      }
      if (args.userProfile.dislikedGenres?.length) {
        systemPrompt += `\n- Avoid Genres: ${args.userProfile.dislikedGenres.join(", ")}`;
      }
      if (args.userProfile.narrativePacing) {
        systemPrompt += `\n- Preferred Pacing: ${args.userProfile.narrativePacing}`;
      }
    }

    systemPrompt += `\n\nFocus on:
1. Character personality traits and development arcs
2. Similar character dynamics and relationships
3. How characters drive the narrative
4. Character design and archetypes

Output JSON: {"recommendations": [...]}
Each recommendation: title, description, reasoning (focus on character similarities), posterUrl, genres, year, rating, emotionalTags, characterHighlights (new field for key character traits).`;

    let recommendations: any[] = [];
    let errorResult: string | undefined = undefined;

    try {
      const openai = new OpenAI({ apiKey: process.env.CONVEX_OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: args.characterDescription }
        ],
        response_format: { type: "json_object" },
      });

      const parsed = tryParseAIResponse(completion.choices[0].message.content, "getCharacterBasedRecommendations");
      if (parsed) recommendations = parsed.slice(0, 4);
      else errorResult = "AI response format error.";
    } catch (err: any) {
      console.error("[AI Action - Character-Based] Error:", err);
      errorResult = `AI Error: ${err.message || "Unknown"}`;
    } finally {
      if (args.messageId) {
        await ctx.runMutation(api.ai.storeAiFeedback, {
          prompt: args.characterDescription,
          aiAction: "getCharacterBasedRecommendations",
          aiResponseRecommendations: recommendations.length ? recommendations : undefined,
          aiResponseText: recommendations.length === 0 ? errorResult : undefined,
          feedbackType: "none",
          messageId: args.messageId,
        });
      }
    }

    return { recommendations, error: errorResult };
  },
});

export const getTropeBasedRecommendations = action({
  args: {
    plotDescription: v.string(),
    specificTropes: v.optional(v.array(v.string())),
    userProfile: v.optional(enhancedUserProfileValidator),
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      return { recommendations: [], error: "OpenAI API key not configured." };
    }

    let systemPrompt = `You are AniMuse AI, expert in anime narrative structures and tropes.

USER REQUEST: "${args.plotDescription}"`;

    if (args.specificTropes?.length) {
      systemPrompt += `\nSpecific tropes mentioned: ${args.specificTropes.join(", ")}`;
    }

    systemPrompt += `\n\nUser Profile:`;
    if (args.userProfile) {
      if (args.userProfile.tropes?.length) {
        systemPrompt += `\n- Enjoyed Tropes: ${args.userProfile.tropes.join(", ")}`;
      }
      if (args.userProfile.narrativePacing) {
        systemPrompt += `\n- Preferred Pacing: ${args.userProfile.narrativePacing}`;
      }
      if (args.userProfile.genres?.length) {
        systemPrompt += `\n- Preferred Genres: ${args.userProfile.genres.join(", ")}`;
      }
    }

    systemPrompt += `\n\nAnalyze the request for:
1. Core narrative tropes and plot devices
2. Story structure preferences
3. Thematic elements
4. Narrative complexity level

Output JSON: {"recommendations": [...]}
Each recommendation: title, description, reasoning (focus on plot/trope similarities), posterUrl, genres, year, rating, plotTropes (array of key tropes), narrativeComplexity (1-5 scale).`;

    let recommendations: any[] = [];
    let errorResult: string | undefined = undefined;

    try {
      const openai = new OpenAI({ apiKey: process.env.CONVEX_OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: args.plotDescription }
        ],
        response_format: { type: "json_object" },
      });

      const parsed = tryParseAIResponse(completion.choices[0].message.content, "getTropeBasedRecommendations");
      if (parsed) recommendations = parsed.slice(0, 4);
      else errorResult = "AI response format error.";
    } catch (err: any) {
      console.error("[AI Action - Trope-Based] Error:", err);
      errorResult = `AI Error: ${err.message || "Unknown"}`;
    } finally {
      if (args.messageId) {
        await ctx.runMutation(api.ai.storeAiFeedback, {
          prompt: args.plotDescription,
          aiAction: "getTropeBasedRecommendations",
          aiResponseRecommendations: recommendations.length ? recommendations : undefined,
          aiResponseText: recommendations.length === 0 ? errorResult : undefined,
          feedbackType: "none",
          messageId: args.messageId,
        });
      }
    }

    return { recommendations, error: errorResult };
  },
});

export const getArtStyleRecommendations = action({
  args: {
    artStyleDescription: v.string(),
    preferredStudios: v.optional(v.array(v.string())),
    userProfile: v.optional(enhancedUserProfileValidator),
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      return { recommendations: [], error: "OpenAI API key not configured." };
    }

    let systemPrompt = `You are AniMuse AI, expert in anime visual aesthetics and studio styles.

USER REQUEST: "${args.artStyleDescription}"`;

    if (args.preferredStudios?.length) {
      systemPrompt += `\nPreferred Studios: ${args.preferredStudios.join(", ")}`;
    }

    systemPrompt += `\n\nUser Profile:`;
    if (args.userProfile) {
      if (args.userProfile.artStyles?.length) {
        systemPrompt += `\n- Preferred Art Styles: ${args.userProfile.artStyles.join(", ")}`;
      }
      if (args.userProfile.genres?.length) {
        systemPrompt += `\n- Preferred Genres: ${args.userProfile.genres.join(", ")}`;
      }
    }

    systemPrompt += `\n\nFocus on:
1. Visual aesthetics and animation quality
2. Character design philosophy
3. Color palettes and artistic direction
4. Animation techniques and studio signatures
5. Era-specific art styles (if mentioned)

Output JSON: {"recommendations": [...]}
Each recommendation: title, description, reasoning (focus on visual/studio aspects), posterUrl, genres, year, rating, studios, artStyleTags (visual characteristics), animationQuality (1-5 scale).`;

    let recommendations: any[] = [];
    let errorResult: string | undefined = undefined;

    try {
      const openai = new OpenAI({ apiKey: process.env.CONVEX_OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: args.artStyleDescription }
        ],
        response_format: { type: "json_object" },
      });

      const parsed = tryParseAIResponse(completion.choices[0].message.content, "getArtStyleRecommendations");
      if (parsed) recommendations = parsed.slice(0, 4);
      else errorResult = "AI response format error.";
    } catch (err: any) {
      console.error("[AI Action - Art Style] Error:", err);
      errorResult = `AI Error: ${err.message || "Unknown"}`;
    } finally {
      if (args.messageId) {
        await ctx.runMutation(api.ai.storeAiFeedback, {
          prompt: args.artStyleDescription,
          aiAction: "getArtStyleRecommendations",
          aiResponseRecommendations: recommendations.length ? recommendations : undefined,
          aiResponseText: recommendations.length === 0 ? errorResult : undefined,
          feedbackType: "none",
          messageId: args.messageId,
        });
      }
    }

    return { recommendations, error: errorResult };
  },
});

export const getComparativeAnalysis = action({
  args: {
    animeA: v.string(),
    animeB: v.string(),
    analysisType: v.optional(v.union(
      v.literal("similarities"),
      v.literal("differences"),
      v.literal("detailed_comparison")
    )),
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      return { analysis: "", error: "OpenAI API key not configured." };
    }

    const analysisType = args.analysisType || "detailed_comparison";

    let systemPrompt = `You are AniMuse AI, expert anime analyst specializing in comparative analysis.

TASK: ${analysisType === "similarities" ? "Compare similarities between" :
           analysisType === "differences" ? "Analyze key differences between" :
           "Provide detailed comparison of"} "${args.animeA}" and "${args.animeB}".

Analysis Framework:
1. Plot Structure & Themes
2. Character Development & Archetypes
3. Art Style & Animation
4. Tone & Atmosphere
5. Target Audience & Genre
6. Cultural Impact & Reception
7. Strengths & Weaknesses

Output JSON: {
  "comparison": {
    "animeA": "${args.animeA}",
    "animeB": "${args.animeB}",
    "analysisType": "${analysisType}",
    "plotComparison": "...",
    "characterComparison": "...",
    "visualComparison": "...",
    "toneComparison": "...",
    "overallSummary": "...",
    "recommendations": ["If you like X aspect of A, try...", "If you prefer Y aspect of B, consider..."]
  }
}`;

    let analysis: any = {};
    let errorResult: string | undefined = undefined;

    try {
      const openai = new OpenAI({ apiKey: process.env.CONVEX_OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Compare ${args.animeA} and ${args.animeB}` }
        ],
        response_format: { type: "json_object" },
      });

      const parsed = JSON.parse(completion.choices[0].message.content || "{}");
      analysis = parsed.comparison || parsed;
    } catch (err: any) {
      console.error("[AI Action - Comparative Analysis] Error:", err);
      errorResult = `AI Error: ${err.message || "Unknown"}`;
    } finally {
      if (args.messageId) {
        await ctx.runMutation(api.ai.storeAiFeedback, {
          prompt: `Compare ${args.animeA} vs ${args.animeB}`,
          aiAction: "getComparativeAnalysis",
          aiResponseText: JSON.stringify(analysis),
          feedbackType: "none",
          messageId: args.messageId,
        });
      }
    }

    return { analysis, error: errorResult };
  },
});

export const getHiddenGemRecommendations = action({
  args: {
    surpriseLevel: v.optional(v.union(v.literal("mild"), v.literal("moderate"), v.literal("wild"))),
    avoidPopular: v.optional(v.boolean()),
    userProfile: v.optional(enhancedUserProfileValidator),
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      return { recommendations: [], error: "OpenAI API key not configured." };
    }

    const surpriseLevel = args.surpriseLevel || "moderate";
    const avoidPopular = args.avoidPopular || false;

    let systemPrompt = `You are AniMuse AI, curator of hidden anime gems and unexpected discoveries.

MISSION: Find ${surpriseLevel} surprises - anime that are:
- ${surpriseLevel === "mild" ? "Slightly off the beaten path but accessible" :
    surpriseLevel === "moderate" ? "Genuinely surprising but not too obscure" :
    "Completely unexpected and wonderfully weird"}
- ${avoidPopular ? "NOT mainstream or widely known" : "Can include some lesser-known gems from popular franchises"}

User Profile Context:`;

    if (args.userProfile) {
      if (args.userProfile.experienceLevel) {
        systemPrompt += `\n- Experience Level: ${args.userProfile.experienceLevel}`;
      }
      if (args.userProfile.genres?.length) {
        systemPrompt += `\n- Usually Likes: ${args.userProfile.genres.join(", ")}`;
      }
      if (args.userProfile.favoriteAnimes?.length) {
        systemPrompt += `\n- Favorites (avoid similar): ${args.userProfile.favoriteAnimes.slice(0, 3).join(", ")}`;
      }
    }

    systemPrompt += `\n\nStrategy: ${surpriseLevel === "mild" ?
      "Recommend quality anime from adjacent genres or underappreciated classics" :
      surpriseLevel === "moderate" ?
      "Mix familiar elements with unexpected twists, or explore niche but excellent shows" :
      "Go for the wonderfully bizarre, experimental, or completely genre-defying"}

Output JSON: {"recommendations": [...]}
Each recommendation: title, description, reasoning (why this is a perfect surprise), posterUrl, genres, year, rating, surpriseFactors (what makes it unexpected), hiddenGemRating (1-5, how hidden it is).`;

    let recommendations: any[] = [];
    let errorResult: string | undefined = undefined;

    try {
      const openai = new OpenAI({ apiKey: process.env.CONVEX_OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Surprise me with ${surpriseLevel} hidden gems!` }
        ],
        response_format: { type: "json_object" },
      });

      const parsed = tryParseAIResponse(completion.choices[0].message.content, "getHiddenGemRecommendations");
      if (parsed) recommendations = parsed.slice(0, 3);
      else errorResult = "AI response format error.";
    } catch (err: any) {
      console.error("[AI Action - Hidden Gems] Error:", err);
      errorResult = `AI Error: ${err.message || "Unknown"}`;
    } finally {
      if (args.messageId) {
        await ctx.runMutation(api.ai.storeAiFeedback, {
          prompt: `Hidden gems (${surpriseLevel} level)`,
          aiAction: "getHiddenGemRecommendations",
          aiResponseRecommendations: recommendations.length ? recommendations : undefined,
          aiResponseText: recommendations.length === 0 ? errorResult : undefined,
          feedbackType: "none",
          messageId: args.messageId,
        });
      }
    }

    return { recommendations, error: errorResult };
  },
});

export const getFranchiseGuide = action({
  args: {
    franchiseName: v.string(),
    userExperience: v.optional(v.string()),
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      return { guide: null, error: "OpenAI API key not configured." };
    }

    let systemPrompt = `You are AniMuse AI, expert guide for anime franchise navigation.

FRANCHISE: "${args.franchiseName}"
USER EXPERIENCE: ${args.userExperience || "Unknown"}

Create a comprehensive franchise guide including:
1. Chronological watch order (if complex)
2. Recommended watch order for newcomers
3. Essential vs. optional content
4. Brief description of each entry
5. Difficulty/accessibility ratings
6. Alternative entry points

Output JSON: {
  "franchiseGuide": {
    "franchiseName": "${args.franchiseName}",
    "overview": "Brief franchise overview",
    "complexity": "simple|moderate|complex",
    "recommendedOrder": [
      {
        "title": "...",
        "type": "TV|Movie|OVA|Special",
        "year": 2020,
        "description": "...",
        "importance": "essential|recommended|optional|skippable",
        "accessibilityRating": "1-5 (1=beginner friendly, 5=fans only)",
        "notes": "Any special viewing notes"
      }
    ],
    "alternativeOrders": [
      {
        "orderName": "Chronological",
        "description": "...",
        "items": ["title1", "title2", ...]
      }
    ],
    "entryPoints": ["Best starting points for newcomers"],
    "tips": ["General viewing tips"]
  }
}`;

    let guide: any = null;
    let errorResult: string | undefined = undefined;

    try {
      const openai = new OpenAI({ apiKey: process.env.CONVEX_OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Guide me through the ${args.franchiseName} franchise` }
        ],
        response_format: { type: "json_object" },
      });

      const parsed = JSON.parse(completion.choices[0].message.content || "{}");
      guide = parsed.franchiseGuide || parsed;
    } catch (err: any) {
      console.error("[AI Action - Franchise Guide] Error:", err);
      errorResult = `AI Error: ${err.message || "Unknown"}`;
    } finally {
      if (args.messageId) {
        await ctx.runMutation(api.ai.storeAiFeedback, {
          prompt: `Franchise guide: ${args.franchiseName}`,
          aiAction: "getFranchiseGuide",
          aiResponseText: JSON.stringify(guide),
          feedbackType: "none",
          messageId: args.messageId,
        });
      }
    }

    return { guide, error: errorResult };
  },
});

// Fixed getSimilarAnimeFromDB function
export const getSimilarAnimeFromDB = action({
    args: {
        animeId: v.id("anime"),
        userProfile: v.optional(enhancedUserProfileValidator),
        count: v.optional(v.number()),
        messageId: v.string(),
    },
    handler: async (ctx, args): Promise<{ recommendations: any[]; error: string | undefined }> => {
        const targetAnime = await ctx.runQuery(internal.anime.getAnimeByIdInternal, { animeId: args.animeId }) as AnimeDocument | null;
        if (!targetAnime) return { recommendations: [], error: "Target anime not found." };

        // For now, let's use AI to find similar anime instead of querying all anime
        // This is more efficient and can provide better recommendations
        
        const aiRecommendations = await ctx.runAction(api.ai.getAnimeRecommendationWithBetterLogging, {
            prompt: `Find anime similar to ${targetAnime.title}. Looking for anime with similar genres: ${targetAnime.genres?.join(", ") || "N/A"}, themes: ${targetAnime.themes?.join(", ") || "N/A"}, and tone.`,
            userProfile: args.userProfile,
            count: args.count || 5,
            messageId: args.messageId,
        });

        if (aiRecommendations.error) {
            return { recommendations: [], error: aiRecommendations.error };
        }

        const recommendations = (aiRecommendations.recommendations || []).map((anime: any) => ({
            ...anime,
            reasoning: anime.reasoning || `Similar to ${targetAnime.title} based on AI analysis`,
        }));
        
        if (args.messageId) {
            await ctx.runMutation(api.ai.storeAiFeedback, {
              prompt: `Similar to DB anime: ${targetAnime.title}`,
              aiAction: "getSimilarAnimeFromDB",
              aiResponseRecommendations: recommendations,
              feedbackType: "none",
              messageId: args.messageId,
            });
        }
        return { recommendations, error: undefined };
    }
});

// --- NEW: getPersonalizedRecommendations (can call other AI actions or fetch from DB) ---
export const getPersonalizedRecommendationsWithDatabaseFirst = action({
    args: {
        userProfile: enhancedUserProfileValidator,
        watchlistActivity: v.optional(v.array(v.object({
            animeTitle: v.string(),
            status: v.string(),
            userRating: v.optional(v.number()),
        }))),
        count: v.optional(v.number()),
        messageId: v.string(),
    },
    handler: async (ctx, args) => {
        if (!process.env.CONVEX_OPENAI_API_KEY) {
            return { recommendations: [], error: "OpenAI API key not configured." };
        }

        // ... (same system prompt logic as original)
        let systemPrompt = `You are AniMuse, an AI that provides highly personalized anime recommendations.
Based on the user's detailed profile and recent watchlist activity, suggest ${args.count || 3} anime they might enjoy.
Provide diverse recommendations that touch upon different aspects of their profile.

IMPORTANT: For posterUrl, try to provide real anime poster URLs if you know them. 
If you don't know a real URL, just put "PLACEHOLDER" and the system will search for real posters.

Each recommendation MUST include: 
- title (string, REQUIRED): Exact anime title
- description (string): Brief synopsis  
- posterUrl (string): Real poster URL if known, otherwise "PLACEHOLDER"
- genres (array of strings): Key genres
- year (number): Release year if known
- rating (number 0-10): External rating if known
- emotionalTags (array of strings): Emotional descriptors
- studios (array of strings): Animation studios
- themes (array of strings): Major themes
- reasoning (string, REQUIRED): DETAILED reasoning explaining *why* this specific anime is a good fit for THIS user

The "reasoning" field is crucial for personalization. Make it insightful and specific to the user.`;

        systemPrompt += "\n\nUSER PROFILE:";
        systemPrompt += `\n- Name: ${args.userProfile.name || "N/A"}`;
        if (args.userProfile.moods?.length) systemPrompt += `\n- Current Moods: ${args.userProfile.moods.join(", ")}`;
        if (args.userProfile.genres?.length) systemPrompt += `\n- Preferred Genres: ${args.userProfile.genres.join(", ")}`;
        if (args.userProfile.favoriteAnimes?.length) systemPrompt += `\n- Favorite Anime: ${args.userProfile.favoriteAnimes.join(", ")}`;
        if (args.userProfile.experienceLevel) systemPrompt += `\n- Experience Level: ${args.userProfile.experienceLevel}`;
        if (args.userProfile.dislikedGenres?.length) systemPrompt += `\n- Disliked Genres: ${args.userProfile.dislikedGenres.join(", ")}`;
        if (args.userProfile.characterArchetypes?.length) systemPrompt += `\n- Liked Character Archetypes: ${args.userProfile.characterArchetypes.join(", ")}`;
        if (args.userProfile.tropes?.length) systemPrompt += `\n- Liked Tropes: ${args.userProfile.tropes.join(", ")}`;
        if (args.userProfile.artStyles?.length) systemPrompt += `\n- Liked Art Styles: ${args.userProfile.artStyles.join(", ")}`;
        if (args.userProfile.narrativePacing) systemPrompt += `\n- Preferred Pacing: ${args.userProfile.narrativePacing}`;

        if (args.watchlistActivity?.length) {
            systemPrompt += "\n\nRECENT WATCHLIST ACTIVITY (last 5 items):";
            args.watchlistActivity.slice(0, 5).forEach(item => {
                systemPrompt += `\n- "${item.animeTitle}": ${item.status}${item.userRating ? ` (Rated: ${item.userRating}/5)` : ''}`;
            });
        }
        
        systemPrompt += `\n\nOutput JSON: {"recommendations": [...]}`;

        let recommendations: any[] = [];
        let errorResult: string | undefined = undefined;

        try {
            const openai = new OpenAI({ apiKey: process.env.CONVEX_OPENAI_API_KEY });
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: "Generate personalized anime recommendations based on my profile and activity." }
                ],
                response_format: { type: "json_object" },
            });

            const parsed = tryParseAIResponse(completion.choices[0].message.content, "getPersonalizedRecommendationsWithDatabaseFirst");
            if (parsed) {
                const rawRecommendations = parsed.slice(0, args.count || 3);
                
                // Use database-first enhancement
                console.log(`[Personalized Recommendations] Enhancing ${rawRecommendations.length} recommendations with database-first approach...`);
                recommendations = await enhanceRecommendationsWithDatabaseFirst(ctx, rawRecommendations);
                
                console.log(`[Personalized Recommendations] Successfully enhanced ${recommendations.length} recommendations`);
            } else {
                errorResult = "AI response format error or no recommendations found.";
            }
        } catch (err: any) {
            console.error("[AI Action - GetPersonalizedRecommendationsWithDatabaseFirst] Error:", err);
            errorResult = `AI Error: ${err.message || "Unknown"}`;
        } finally {
             if (args.messageId) {
                await ctx.runMutation(api.ai.storeAiFeedback, {
                    prompt: "Personalized recommendations request (DB-first)",
                    aiAction: "getPersonalizedRecommendationsWithDatabaseFirst",
                    aiResponseRecommendations: recommendations.length ? recommendations : undefined,
                    aiResponseText: recommendations.length === 0 ? errorResult : JSON.stringify(recommendations),
                    feedbackType: "none",
                    messageId: args.messageId,
                });
            }
        }
        return { 
            recommendations, 
            error: errorResult,
            debug: {
                dbHits: recommendations.filter(r => r.foundInDatabase).length,
                totalRecommendations: recommendations.length,
                realPosters: recommendations.filter(r => r.posterUrl && !r.posterUrl.includes('placehold.co')).length
            }
        };
    }
});


// --- NEW: getRecommendationsByMoodTheme (for Mood Board on Dashboard) ---
export const getRecommendationsByMoodTheme = action({
    args: {
        selectedCues: v.array(v.string()),
        userProfile: v.optional(enhancedUserProfileValidator),
        count: v.optional(v.number()),
        messageId: v.string(),
    },
    handler: async (ctx, args) => {
        if (!process.env.CONVEX_OPENAI_API_KEY) {
            return { recommendations: [], error: "OpenAI API key not configured." };
        }
        if (args.selectedCues.length === 0) {
            return { recommendations: [], error: "No mood cues selected." };
        }

        let systemPrompt = `You are AniMuse, an AI specializing in recommending anime based on mood, themes, and vibes.
The user has selected the following mood/theme cues: ${args.selectedCues.join(", ")}.
Suggest ${args.count || 3} anime that strongly evoke these combined vibes.

IMPORTANT: For posterUrl, try to provide real anime poster URLs if you know them. 
If you don't know a real URL, just put "PLACEHOLDER" and the system will search for real posters.

Each recommendation MUST include: 
- title (string, REQUIRED): Exact anime title
- description (string): Brief synopsis
- posterUrl (string): Real poster URL if known, otherwise "PLACEHOLDER"
- genres (array of strings): Key genres
- year (number): Release year if known
- rating (number 0-10): External rating if known
- emotionalTags (array of strings): Emotional descriptors
- studios (array of strings): Animation studios
- themes (array of strings): Major themes
- reasoning (string, REQUIRED): DETAILED reasoning explaining *why* this anime fits the selected mood cues

If user profile data is available, subtly weave it into the reasoning if it aligns, but prioritize the mood cues.`;

        if (args.userProfile) {
            systemPrompt += "\n\nUser Profile Context (use for subtle tie-ins if relevant):";
            if (args.userProfile.genres?.length) systemPrompt += `\n- Preferred Genres: ${args.userProfile.genres.join(", ")}`;
            if (args.userProfile.dislikedGenres?.length) systemPrompt += `\n- Disliked Genres: ${args.userProfile.dislikedGenres.join(", ")}`;
             if (args.userProfile.moods?.length) systemPrompt += `\n- General Moods Liked: ${args.userProfile.moods.join(", ")}`;
        }
         systemPrompt += `\n\nOutput JSON: {"recommendations": [...]}`;

        let recommendations: any[] = [];
        let errorResult: string | undefined = undefined;

        try {
            const openai = new OpenAI({ apiKey: process.env.CONVEX_OPENAI_API_KEY });
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Find anime for vibes: ${args.selectedCues.join(" & ")}.` }
                ],
                response_format: { type: "json_object" },
            });

            const parsed = tryParseAIResponse(completion.choices[0].message.content, "getRecommendationsByMoodTheme");
            if (parsed) {
                const rawRecommendations = parsed.slice(0, args.count || 3);
                
                // Use the new database-first enhancement logic
                console.log(`[Mood Recommendations] Enhancing ${rawRecommendations.length} recommendations with database-first approach...`);
                recommendations = await enhanceRecommendationsWithDatabaseFirst(ctx, rawRecommendations);
                
                console.log(`[Mood Recommendations] Successfully enhanced ${recommendations.length} recommendations`);
            } else {
                errorResult = "AI response format error or no mood-based recommendations found.";
            }
        } catch (err: any) {
            console.error("[AI Action - GetRecommendationsByMoodTheme] Error:", err);
            errorResult = `AI Error: ${err.message || "Unknown"}`;
        } finally {
            if (args.messageId) {
                await ctx.runMutation(api.ai.storeAiFeedback, {
                    prompt: `Mood board: ${args.selectedCues.join(", ")}`,
                    aiAction: "getRecommendationsByMoodTheme",
                    aiResponseRecommendations: recommendations.length ? recommendations : undefined,
                    aiResponseText: recommendations.length === 0 ? errorResult : JSON.stringify(recommendations),
                    feedbackType: "none",
                    messageId: args.messageId,
                });
            }
        }
        return { 
            recommendations, 
            error: errorResult,
            // Add debug info for monitoring
            debug: {
                dbHits: recommendations.filter(r => r.foundInDatabase).length,
                totalRecommendations: recommendations.length,
                realPosters: recommendations.filter(r => r.posterUrl && !r.posterUrl.includes('placehold.co')).length
            }
        };
    }
});

export const getSimilarAnimeRecommendations = action({
    args: {
        animeId: v.id("anime"),
        userProfile: v.optional(enhancedUserProfileValidator),
        count: v.optional(v.number()),
        messageId: v.string(),
    },
    handler: async (ctx, args): Promise<{ recommendations: AnimeRecommendation[]; error?: string }> => {
        if (!process.env.CONVEX_OPENAI_API_KEY) {
            return { recommendations: [], error: "OpenAI API key not configured." };
        }

        const targetAnime = await ctx.runQuery(internal.anime.getAnimeByIdInternal, { animeId: args.animeId });
        if (!targetAnime) {
            return { recommendations: [], error: "Target anime not found in database." };
        }

        let systemPrompt = `You are AniMuse, an AI that finds anime similar to a given title.
The user is looking for anime similar to "${targetAnime.title}" (Year: ${targetAnime.year || 'N/A'}, Genres: ${targetAnime.genres?.join(", ") || 'N/A'}).
Description of target anime: "${targetAnime.description?.substring(0, 200) || 'N/A'}..."

Suggest ${args.count || 3} anime that share significant similarities in terms of genre, themes, tone, plot structure, or character archetypes.

IMPORTANT: For posterUrl, try to provide real anime poster URLs if you know them. 
If you don't know a real URL, just put "PLACEHOLDER" and the system will search for real posters.

For each recommendation, provide:
- title: (string, REQUIRED) The exact title of the anime
- description: (string) A brief synopsis
- posterUrl: (string) Real poster URL if known, otherwise "PLACEHOLDER"
- genres: (array of strings) Key genres
- year: (number, optional) Release year
- rating: (number, optional, 0-10 scale) External average rating
- reasoning: (string, REQUIRED) Detailed explanation of how it is similar to "${targetAnime.title}"
- emotionalTags: (array of strings, optional)
- studios: (array of strings, optional)
- themes: (array of strings, optional)

If user profile data is available, use it to refine the type of similarities highlighted or to filter out suggestions the user might dislike.
Ensure the output is a JSON object with a single key "recommendations".
Prioritize well-known anime if they are good fits, but also include lesser-known gems if highly relevant.
MAKE SURE 'title' and 'posterUrl' fields are ALWAYS present and correctly formatted for each recommendation.`;

        if (args.userProfile) {
            systemPrompt += "\n\nUser Profile Context (use to refine similarity focus):";
            if (args.userProfile.genres?.length) systemPrompt += `\n- Preferred Genres: ${args.userProfile.genres.join(", ")}`;
            if (args.userProfile.dislikedGenres?.length) systemPrompt += `\n- Disliked Genres: ${args.userProfile.dislikedGenres.join(", ")} (try to avoid these in suggestions if possible, unless a core aspect of similarity)`;
        }
        systemPrompt += `\n\nOutput JSON: {"recommendations": [...]}`;

        let recommendations: AnimeRecommendation[] = [];
        let errorResult: string | undefined = undefined;

        try {
            const openai = new OpenAI({ apiKey: process.env.CONVEX_OPENAI_API_KEY });
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Find anime similar to "${targetAnime.title}". Focus on strong thematic and genre similarities.` }
                ],
                response_format: { type: "json_object" },
            });

            const parsedResponse = tryParseAIResponse(completion.choices[0].message.content, "getSimilarAnimeRecommendations");
            
            if (parsedResponse) {
                const rawRecommendations = parsedResponse.slice(0, args.count || 3);
                
                // Enhance recommendations with real posters
                console.log(`[Similar Recommendations] Enhancing ${rawRecommendations.length} recommendations with real posters...`);
                const enhancedRecommendations = await enhanceRecommendationsWithDatabaseFirst(ctx, rawRecommendations);
                
                recommendations = enhancedRecommendations.map((rec: any) => ({
                    title: rec.title || "Unknown Title",
                    description: rec.description || "No description available.",
                    posterUrl: rec.posterUrl,
                    genres: Array.isArray(rec.genres) ? rec.genres : [],
                    year: typeof rec.year === 'number' ? rec.year : undefined,
                    rating: typeof rec.rating === 'number' ? rec.rating : undefined,
                    reasoning: rec.reasoning || `Similar to ${targetAnime.title}.`,
                    emotionalTags: Array.isArray(rec.emotionalTags) ? rec.emotionalTags : [],
                    studios: Array.isArray(rec.studios) ? rec.studios : [],
                    themes: Array.isArray(rec.themes) ? rec.themes : [],
                    characterHighlights: Array.isArray(rec.characterHighlights) ? rec.characterHighlights : undefined,
                    plotTropes: Array.isArray(rec.plotTropes) ? rec.plotTropes : undefined,
                    artStyleTags: Array.isArray(rec.artStyleTags) ? rec.artStyleTags : undefined,
                    surpriseFactors: Array.isArray(rec.surpriseFactors) ? rec.surpriseFactors : undefined,
                    similarityScore: typeof rec.similarityScore === 'number' ? rec.similarityScore : undefined,
                })).filter(rec => rec.title && rec.title !== "Unknown Title" && rec.posterUrl);
                
                console.log(`[Similar Recommendations] Successfully enhanced ${recommendations.length} recommendations`);

                if (recommendations.length === 0 && parsedResponse.length > 0) {
                     errorResult = "AI provided suggestions, but they were missing critical information.";
                } else if (recommendations.length === 0) {
                    errorResult = "AI could not find suitable similar anime.";
                }

            } else {
                errorResult = "AI response format error or no similar anime found by AI.";
            }
        } catch (err: any) {
            console.error("[AI Action - GetSimilarAnimeRecommendations] Error:", err);
            errorResult = `AI Error: ${err.message || "Unknown"}`;
        } finally {
            if (args.messageId) {
                 await ctx.runMutation(api.ai.storeAiFeedback, {
                    prompt: `Similar to: ${targetAnime.title} (ID: ${targetAnime._id.toString()})`,
                    aiAction: "getSimilarAnimeRecommendations",
                    aiResponseRecommendations: recommendations.length ? recommendations : undefined,
                    aiResponseText: recommendations.length === 0 ? errorResult : JSON.stringify(recommendations),
                    feedbackType: "none",
                    messageId: args.messageId,
                });
            }
        }
        return { recommendations, error: errorResult };
    }

    
});

export const testPosterFetching = action({
  args: {
    animeTitles: v.array(v.string()),
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`[Debug Poster Test] Testing poster fetching for: ${args.animeTitles.join(", ")}`);

    const results: Array<{
  title: string;
  posterUrl: string | null;
  success: boolean;
  isReal?: boolean;
  error?: string;
}> = [];
    
    for (const title of args.animeTitles) {
      try {
        console.log(`[Debug Poster Test] Testing: ${title}`);
        const posterUrl = await fetchRealAnimePosterWithRetry(title, 1);
        
        results.push({
          title,
          posterUrl,
          success: !!posterUrl,
          isReal: !!(posterUrl && !posterUrl.includes('placehold.co'))
        });
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error: any) {
        results.push({
          title,
          posterUrl: null,
          success: false,
          error: error.message
        });
      }
    }
    
    console.log(`[Debug Poster Test] Results:`, results);
    
    await ctx.runMutation(api.ai.storeAiFeedback, {
      prompt: `Poster test for: ${args.animeTitles.join(", ")}`,
      aiAction: "testPosterFetching",
      aiResponseText: JSON.stringify(results),
      feedbackType: "none",
      messageId: args.messageId,
    });
    
    return { results };
  },
});

// Debug version of getPersonalizedRecommendations with extra logging
export const debugPersonalizedRecommendations = action({
    args: {
        userProfile: enhancedUserProfileValidator,
        count: v.optional(v.number()),
        messageId: v.string(),
    },
    handler: async (ctx, args) => {
        console.log(`[DEBUG Personalized] Starting debug personalized recommendations`);
        console.log(`[DEBUG Personalized] User profile:`, {
            name: args.userProfile.name,
            genres: args.userProfile.genres,
            favoriteAnimes: args.userProfile.favoriteAnimes,
            experienceLevel: args.userProfile.experienceLevel
        });

        if (!process.env.CONVEX_OPENAI_API_KEY) {
            return { recommendations: [], error: "OpenAI API key not configured." };
        }

        // Simplified test recommendations for debugging
        const testRecommendations = [
            {
                title: "Attack on Titan",
                description: "Humanity fights for survival against giant humanoid Titans.",
                posterUrl: "PLACEHOLDER",
                genres: ["Action", "Drama", "Fantasy"],
                year: 2013,
                rating: 9.0,
                emotionalTags: ["intense", "dramatic"],
                studios: ["Studio Pierrot"],
                themes: ["survival", "freedom"],
                reasoning: "Perfect for testing poster fetching and navigation"
            },
            {
                title: "Demon Slayer",
                description: "A young boy becomes a demon slayer to save his sister.",
                posterUrl: "PLACEHOLDER", 
                genres: ["Action", "Supernatural"],
                year: 2019,
                rating: 8.7,
                emotionalTags: ["emotional", "action-packed"],
                studios: ["Ufotable"],
                themes: ["family", "determination"],
                reasoning: "Another test anime for poster enhancement"
            },
            {
                title: "Your Name",
                description: "Two teenagers share a profound, magical connection.",
                posterUrl: "PLACEHOLDER",
                genres: ["Romance", "Drama", "Supernatural"],
                year: 2016,
                rating: 8.4,
                emotionalTags: ["romantic", "beautiful"],
                studios: ["CoMix Wave Films"],
                themes: ["love", "destiny"],
                reasoning: "Movie test for poster system"
            }
        ];

        console.log(`[DEBUG Personalized] Using test recommendations:`, testRecommendations.map(r => r.title));

        try {
            // Enhance with real posters
            console.log(`[DEBUG Personalized] Enhancing ${testRecommendations.length} test recommendations with real posters...`);
            const enhancedRecommendations = await enhanceRecommendationsWithDatabaseFirst(ctx, testRecommendations);
            
            console.log(`[DEBUG Personalized] Enhanced recommendations:`, enhancedRecommendations.map(r => ({
                title: r.title,
                posterUrl: r.posterUrl?.substring(0, 50) + "...",
                isReal: !r.posterUrl?.includes('placehold.co')
            })));

            await ctx.runMutation(api.ai.storeAiFeedback, {
                prompt: "Debug personalized recommendations test",
                aiAction: "debugPersonalizedRecommendations",
                aiResponseRecommendations: enhancedRecommendations,
                feedbackType: "none",
                messageId: args.messageId,
            });

            return { 
                recommendations: enhancedRecommendations, 
                debug: {
                    originalCount: testRecommendations.length,
                    enhancedCount: enhancedRecommendations.length,
                    realPostersFound: enhancedRecommendations.filter(r => !r.posterUrl?.includes('placehold.co')).length
                },
                error: undefined 
            };
        } catch (err: any) {
            console.error("[DEBUG Personalized] Error:", err);
            return { 
                recommendations: testRecommendations, 
                debug: { error: err.message },
                error: `Debug Error: ${err.message}` 
            };
        }
    }
});

export const debugPosterUrls = action({
  args: {
    titles: v.array(v.string()),
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`[Debug Poster URLs] Testing ${args.titles.length} titles...`);
    
    const results: Array<{
  title: string;
  posterUrl: string | null;
  success: boolean;
  isReal?: boolean;
  accessible?: boolean;
  error?: string;
}> = [];
    
    for (const title of args.titles) {
      try {
        console.log(`[Debug Poster URLs] Testing: ${title}`);
        
        // Test the poster fetching function
        const posterUrl = await fetchRealAnimePosterWithRetry(title, 1);
        
        const result = {
          title,
          posterUrl,
          success: !!posterUrl,
          // FIX: Ensure isReal is always boolean
          isReal: !!(posterUrl && !posterUrl.includes('placehold.co')),
          accessible: false
        };

        // Test if the URL is actually accessible
        if (posterUrl && posterUrl.startsWith('https://')) {
          try {
            const testResponse = await fetch(posterUrl, { method: 'HEAD' });
            result.accessible = testResponse.ok;
            console.log(`[Debug Poster URLs] URL test for "${title}": ${testResponse.ok ? 'OK' : 'FAILED'} (${testResponse.status})`);
          } catch (error: any) {
            console.log(`[Debug Poster URLs] URL test failed for "${title}":`, error.message);
            result.accessible = false;
          }
        }
        
        results.push(result);
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error: any) {
        results.push({
          title,
          posterUrl: null,
          success: false,
          error: error.message,
          accessible: false
        });
      }
    }
    
    console.log(`[Debug Poster URLs] Results:`, results);
    
    await ctx.runMutation(api.ai.storeAiFeedback, {
      prompt: `Debug poster URLs for: ${args.titles.join(", ")}`,
      aiAction: "debugPosterUrls",
      aiResponseText: JSON.stringify(results),
      feedbackType: "none",
      messageId: args.messageId,
    });
    
    return { results };
  },
});