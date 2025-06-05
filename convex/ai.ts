// convex/ai.ts
import { action, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import OpenAI from "openai";
import { Id, Doc } from "./_generated/dataModel"; // Doc added for clarity
import { AnimeRecommendation } from "./types"; // Ensure this type is comprehensive

// Interface for debug anime addition response
interface DebugAnimeAdditionResponse {
  success: boolean;
  animeId?: Id<"anime">;
  message?: string;
  existing?: boolean;
  error?: string;
  validationErrors?: string[];
}

interface AnimeDocumentType {
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

// Interface for test anime addition response
interface TestAnimeAdditionResponse {
  success: boolean;
  animeId?: Id<"anime">;
  message?: string;
  existing?: boolean;
  error?: string;
}

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

// Enhanced character data interface for AI enrichment
interface EnrichedCharacterData {
  detailedBio?: string;
  personalityAnalysis?: string;
  keyRelationships?: Array<{
    relatedCharacterName: string;
    relationshipDescription: string;
    relationType: string;
  }>;
  detailedAbilities?: Array<{
    abilityName: string;
    abilityDescription: string;
    powerLevel?: string;
  }>;
  majorCharacterArcs?: string[];
  trivia?: string[];
  backstoryDetails?: string;
  characterDevelopment?: string;
  notableQuotes?: string[];
  symbolism?: string;
  fanReception?: string;
  culturalSignificance?: string;
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

const fetchRealAnimePosterWithRetry = async (
  ctx: any, // ActionCtx 
  animeTitle: string, 
  year?: number,
  maxRetries: number = 1
): Promise<string | null> => {
  console.log(`[AI Poster Enhancement] Starting best-of-breed poster search for: "${animeTitle}"`);
  
  try {
    // NEW: Use the specialized best quality poster fetching action
    const posterResult = await ctx.runAction(internal.externalApis.fetchBestQualityPoster, {
      title: animeTitle,
      year: year
    });
    
    if (posterResult.success && posterResult.posterUrl) {
      console.log(`[AI Poster Enhancement] ✅ Found high-quality poster from ${posterResult.source}: "${animeTitle}"`);
      return posterResult.posterUrl;
    }
    
    // Fallback: If specialized action fails, try the enhanced database-first approach
    console.log(`[AI Poster Enhancement] Specialized fetch failed, trying fallback for: "${animeTitle}"`);
    
    // Check database first for existing poster
    const dbAnime = await ctx.runQuery(internal.anime.getAnimeByTitleInternal, { 
      title: animeTitle 
    });
    
    if (dbAnime && isValidPosterUrl(dbAnime.posterUrl)) {
      console.log(`[AI Poster Enhancement] ✅ Found existing poster in database: "${animeTitle}"`);
      return dbAnime.posterUrl;
    }
    
    // If database doesn't have it, try individual specialized sources manually
    console.log(`[AI Poster Enhancement] Trying individual sources for: "${animeTitle}"`);
    
    // Try TMDB directly
    try {
      const tmdbResult = await ctx.runAction(internal.externalApis.fetchPosterFromTMDB, {
        title: animeTitle,
        year: year
      });
      
      if (tmdbResult.success && tmdbResult.posterUrl) {
        console.log(`[AI Poster Enhancement] ✅ TMDB direct fetch succeeded: "${animeTitle}"`);
        return tmdbResult.posterUrl;
      }
    } catch (tmdbError: any) {
      console.warn(`[AI Poster Enhancement] TMDB direct fetch failed for "${animeTitle}":`, tmdbError.message);
    }
    
    // Try AniList metadata fetch
    try {
      const anilistResult = await ctx.runAction(internal.externalApis.fetchCoreMetadataFromAniList, {
        title: animeTitle
      });
      
      if (anilistResult.success && anilistResult.metadata.anilistId) {
        // Use AniList ID to get poster with the original AniList function
        const anilistPoster = await fetchAniListPosterById(anilistResult.metadata.anilistId);
        if (anilistPoster) {
          console.log(`[AI Poster Enhancement] ✅ AniList direct fetch succeeded: "${animeTitle}"`);
          return anilistPoster;
        }
      }
    } catch (anilistError: any) {
      console.warn(`[AI Poster Enhancement] AniList direct fetch failed for "${animeTitle}":`, anilistError.message);
    }
    
    // Final fallback: Return a high-quality placeholder
    console.log(`[AI Poster Enhancement] 📝 All sources failed, using enhanced placeholder: "${animeTitle}"`);
    const encodedTitle = encodeURIComponent(animeTitle.substring(0, 30));
    return `https://placehold.co/600x900/ECB091/321D0B/png?text=${encodedTitle}&font=roboto`;
    
  } catch (error: any) {
    console.error(`[AI Poster Enhancement] Error for "${animeTitle}":`, error.message);
    
    // Emergency fallback
    const encodedTitle = encodeURIComponent(animeTitle.substring(0, 30));
    return `https://placehold.co/600x900/ECB091/321D0B/png?text=${encodedTitle}&font=roboto`;
  }
};

// Helper function to validate poster URLs
const isValidPosterUrl = (posterUrl: any): boolean => {
  if (!posterUrl || typeof posterUrl !== 'string') return false;
  if (posterUrl.includes('placehold.co') || posterUrl.includes('placeholder')) return false;
  if (!posterUrl.startsWith('https://')) return false;
  return true;
};

// Helper function to fetch poster directly from AniList by ID
const fetchAniListPosterById = async (anilistId: number): Promise<string | null> => {
  const anilistQuery = `
    query ($id: Int) {
      Media (id: $id, type: ANIME) {
        id
        coverImage { 
          extraLarge 
          large 
          medium 
        }
      }
    }
  `;
  
  try {
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ 
        query: anilistQuery, 
        variables: { id: anilistId }
      })
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const media = data?.data?.Media;
    
    if (media?.coverImage) {
      return media.coverImage.extraLarge || 
             media.coverImage.large || 
             media.coverImage.medium || 
             null;
    }
    
    return null;
  } catch (error) {
    console.error(`[AI Poster Enhancement] AniList by ID fetch failed for ${anilistId}:`, error);
    return null;
  }
};

// ENHANCED: Database-first enhancement that leverages specialized actions
const enhanceRecommendationsWithDatabaseFirst = async (
  ctx: any,
  recommendations: any[]
): Promise<any[]> => {
  const enhancedRecommendations = [];
  const concurrentLimit = 2; // Process only 2 at a time to avoid overwhelming APIs
  
  console.log(`[Database-First Enhancement] Processing ${recommendations.length} recommendations with specialized actions...`);
  
  // Process recommendations in batches
  for (let i = 0; i < recommendations.length; i += concurrentLimit) {
    const batch = recommendations.slice(i, i + concurrentLimit);
    
    const batchResults = await Promise.all(
      batch.map(async (rec, batchIndex) => {
        const globalIndex = i + batchIndex;
        let posterUrl = rec.posterUrl;
        let foundInDatabase = false;
        let enhancedWithSpecializedAction = false;
        
        console.log(`[Database-First Enhancement] Processing (${globalIndex + 1}/${recommendations.length}): ${rec.title}`);
        
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
              
              // Enhance other fields from database if they're better
              rec.description = rec.description || dbAnime.description;
              rec.genres = rec.genres?.length ? rec.genres : (dbAnime.genres || []);
              rec.year = rec.year || dbAnime.year;
              rec.rating = rec.rating || dbAnime.rating;
              rec.studios = rec.studios?.length ? rec.studios : (dbAnime.studios || []);
              
              // Add database ID for navigation
              rec._id = dbAnime._id;
            } else {
              console.log(`[Database-First Enhancement] Not found in DB or poster invalid: ${rec.title}`);
            }
          } catch (error: any) {
            console.warn(`[Database-First Enhancement] DB lookup error for "${rec.title}":`, error.message);
          }
        }
        
        // Step 2: If not found in DB or poster is invalid, use specialized poster fetching
        if (!foundInDatabase && (!posterUrl || posterUrl === "PLACEHOLDER" || !isValidPosterUrl(posterUrl))) {
          console.log(`[Database-First Enhancement] 🔍 Using specialized poster fetching for: ${rec.title}`);
          
          try {
            // NEW: Use the enhanced poster fetching with specialized actions
            const specializedPosterUrl = await fetchRealAnimePosterWithRetry(
              ctx, 
              rec.title, 
              rec.year, 
              0 // No retries for speed in AI context
            );
            
            if (specializedPosterUrl && isValidPosterUrl(specializedPosterUrl)) {
              posterUrl = specializedPosterUrl;
              enhancedWithSpecializedAction = true;
              console.log(`[Database-First Enhancement] ✅ Specialized action found poster: ${rec.title}`);
            } else {
              // Final fallback to enhanced placeholder
              const encodedTitle = encodeURIComponent((rec.title || "Anime").substring(0, 30));
              posterUrl = `https://placehold.co/600x900/ECB091/321D0B/png?text=${encodedTitle}&font=roboto`;
              console.log(`[Database-First Enhancement] 📝 Using enhanced placeholder: ${rec.title}`);
            }
          } catch (error: any) {
            console.error(`[Database-First Enhancement] Specialized fetch error for "${rec.title}":`, error.message);
            const encodedTitle = encodeURIComponent((rec.title || "Anime").substring(0, 30));
            posterUrl = `https://placehold.co/600x900/ECB091/321D0B/png?text=${encodedTitle}&font=roboto`;
          }
        }
        
        return {
          ...rec,
          posterUrl,
          title: rec.title || "Unknown Title",
          description: rec.description || "No description available.",
          reasoning: rec.reasoning || "AI recommendation.",
          foundInDatabase,
          enhancedWithSpecializedAction,
          // Ensure moodMatchScore is present for compatibility
          moodMatchScore: rec.moodMatchScore || 8
        };
      })
    );
    
    enhancedRecommendations.push(...batchResults);
    
    // Small delay between batches to avoid overwhelming the system
    if (i + concurrentLimit < recommendations.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  const dbHits = enhancedRecommendations.filter(rec => rec.foundInDatabase).length;
  const specializedHits = enhancedRecommendations.filter(rec => rec.enhancedWithSpecializedAction).length;
  const realPostersFound = enhancedRecommendations.filter(rec => 
    rec.posterUrl && isValidPosterUrl(rec.posterUrl)
  ).length;
  
  console.log(`[Database-First Enhancement] ✅ Complete! DB hits: ${dbHits}/${recommendations.length}, Specialized: ${specializedHits}/${recommendations.length}, Real posters: ${realPostersFound}/${recommendations.length}`);
  
  return enhancedRecommendations;
};

// NEW: Action to test the enhanced AI poster fetching system
export const testEnhancedAIPosterFetching = action({
  args: {
    animeTitles: v.array(v.string()),
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`[Test Enhanced AI Poster] Testing enhanced poster fetching for: ${args.animeTitles.join(", ")}`);

    const results: Array<{
      title: string;
      posterUrl: string | null;
      source: string;
      success: boolean;
      isReal: boolean;
      method: string;
      error?: string;
    }> = [];
    
    for (const title of args.animeTitles) {
      try {
        console.log(`[Test Enhanced AI Poster] Testing: ${title}`);
        
        const posterUrl = await fetchRealAnimePosterWithRetry(ctx, title, undefined, 1);
        
        const isReal = !!(posterUrl && isValidPosterUrl(posterUrl));
        
        results.push({
          title,
          posterUrl,
          source: "specialized_actions",
          success: !!posterUrl,
          isReal,
          method: "enhanced_fetchRealAnimePosterWithRetry"
        });
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        results.push({
          title,
          posterUrl: null,
          source: "error",
          success: false,
          isReal: false,
          method: "enhanced_fetchRealAnimePosterWithRetry",
          error: error.message
        });
      }
    }
    
    console.log(`[Test Enhanced AI Poster] Results:`, results);
    
    await ctx.runMutation(api.ai.storeAiFeedback, {
      prompt: `Enhanced AI poster test for: ${args.animeTitles.join(", ")}`,
      aiAction: "testEnhancedAIPosterFetching",
      aiResponseText: JSON.stringify(results),
      feedbackType: "none",
      messageId: args.messageId,
    });
    
    return { results };
  },
});

// Enhanced AI recommendation function that uses the new poster system
export const getEnhancedAnimeRecommendationsWithBestPosters = action({
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

    console.log(`[Enhanced AI Recommendations] Starting recommendation generation with best-of-breed poster fetching...`);

    // [Same system prompt logic as the original function]
    let systemPrompt = `You are AniMuse AI, an expert anime recommendation assistant.
Your goal is to provide high-quality anime recommendations based on the user's prompt.
Consider the user's profile if provided to tailor suggestions.
Output a JSON object with a single key "recommendations", which is an array of 3-${args.count || 3} anime.

IMPORTANT: For posterUrl, put "PLACEHOLDER" - our enhanced system will fetch the highest quality posters from multiple sources automatically.

Each anime object should have: 
- title (string, REQUIRED): The exact title of the anime
- description (string): A brief synopsis  
- reasoning (string): Why it matches the prompt/profile
- posterUrl: Always use "PLACEHOLDER" 
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
      console.log(`[Enhanced AI Recommendations] Calling OpenAI API...`);
      const openai = new OpenAI({ apiKey: process.env.CONVEX_OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: args.prompt }
        ],
        response_format: { type: "json_object" },
      });

      console.log(`[Enhanced AI Recommendations] OpenAI response received, parsing...`);
      const parsed = tryParseAIResponse(completion.choices[0].message.content, "getEnhancedAnimeRecommendationsWithBestPosters");
      
      if (parsed) {
        const rawRecommendations = parsed.slice(0, args.count || 3);
        console.log(`[Enhanced AI Recommendations] Raw recommendations:`, rawRecommendations.map(r => ({ title: r.title, posterUrl: r.posterUrl })));
        
        console.log(`[Enhanced AI Recommendations] Enhancing ${rawRecommendations.length} recommendations with specialized poster fetching...`);
        const startTime = Date.now();
        
        // NEW: Use the enhanced database-first approach with specialized actions
        recommendations = await enhanceRecommendationsWithDatabaseFirst(ctx, rawRecommendations);
        
        const enhancementTime = Date.now() - startTime;
        
        console.log(`[Enhanced AI Recommendations] Poster enhancement completed in ${enhancementTime}ms`);
        console.log(`[Enhanced AI Recommendations] Final recommendations:`, recommendations.map(r => ({ 
          title: r.title, 
          posterUrl: r.posterUrl?.substring(0, 50) + "...",
          isReal: isValidPosterUrl(r.posterUrl),
          foundInDatabase: r.foundInDatabase,
          enhancedWithSpecializedAction: r.enhancedWithSpecializedAction
        })));
        
        console.log(`[Enhanced AI Recommendations] Successfully enhanced ${recommendations.length} recommendations`);
      } else {
        errorResult = "AI response format error or no recommendations found.";
        console.error(`[Enhanced AI Recommendations] Parse error: ${errorResult}`);
      }
    } catch (err: any) {
      console.error("[Enhanced AI Recommendations] Error:", err);
      errorResult = `AI Error: ${err.message || "Unknown"}`;
    } finally {
      if (args.messageId) {
        try {
          await ctx.runMutation(api.ai.storeAiFeedback, {
            prompt: args.prompt,
            aiAction: "getEnhancedAnimeRecommendationsWithBestPosters",
            aiResponseRecommendations: recommendations.length ? recommendations : undefined,
            aiResponseText: recommendations.length === 0 ? errorResult : undefined,
            feedbackType: "none",
            messageId: args.messageId,
          });
        } catch (feedbackError) {
          console.warn("Failed to store feedback:", feedbackError);
        }
      }
    }
    
    return { 
      recommendations, 
      error: errorResult,
      debug: {
        dbHits: recommendations.filter(r => r.foundInDatabase).length,
        specializedHits: recommendations.filter(r => r.enhancedWithSpecializedAction).length,
        totalRecommendations: recommendations.length,
        realPosters: recommendations.filter(r => isValidPosterUrl(r.posterUrl)).length
      }
    };
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


// Enhanced AI backend improvements for convex/ai.ts
// Add these enhancements to your existing getRecommendationsByMoodTheme action

// Enhanced mood theme recommendation with intensity weighting and category analysis
export const getEnhancedRecommendationsByMoodTheme = action({
    args: {
        selectedCues: v.array(v.string()),
        cueIntensities: v.optional(v.object({})), // Dynamic object for intensities
        userProfile: v.optional(enhancedUserProfileValidator),
        count: v.optional(v.number()),
        messageId: v.string(),
        advancedMode: v.optional(v.boolean()),
        dominantCategory: v.optional(v.string()),
    },
    handler: async (ctx, args): Promise<{
        recommendations: any[];
        error?: string;
        moodAnalysis?: any;
        debug?: any;
    }> => {
        if (!process.env.CONVEX_OPENAI_API_KEY) {
            return { recommendations: [], error: "OpenAI API key not configured." };
        }
        if (args.selectedCues.length === 0) {
            return { recommendations: [], error: "No mood cues selected." };
        }

        console.log(`[Enhanced Mood AI] Processing ${args.selectedCues.length} cues with ${args.advancedMode ? 'advanced' : 'simple'} mode`);

        // Analyze mood cue patterns and intensities
        const moodAnalysis = analyzeMoodCombination(args.selectedCues, args.cueIntensities || {});
        
        let systemPrompt = `You are AniMuse, an expert AI specializing in mood-based anime recommendations.
The user has selected a specific combination of mood cues that creates a unique emotional profile.
Your task is to recommend anime that authentically captures this exact emotional blend.

SELECTED MOOD CUES: ${args.selectedCues.join(", ")}

MOOD ANALYSIS:
- Primary Emotional Tone: ${moodAnalysis.primaryTone}
- Energy Level: ${moodAnalysis.energyLevel}/5
- Complexity Score: ${moodAnalysis.complexityScore}/5
- Mood Categories: ${moodAnalysis.categories.join(", ")}
- Dominant Theme: ${moodAnalysis.dominantTheme}`;

        // Add intensity information if available
        if (args.cueIntensities && Object.keys(args.cueIntensities).length > 0) {
            systemPrompt += `\n\nCUE INTENSITIES (1=subtle, 5=overwhelming):`;
            Object.entries(args.cueIntensities).forEach(([cueId, intensity]) => {
                const cueName = findCueNameById(cueId);
                if (cueName) {
                    systemPrompt += `\n- ${cueName}: ${intensity}/5 (${getIntensityLabel(intensity as number)})`;
                }
            });
        }

        // Add advanced mode instructions
        if (args.advancedMode) {
            systemPrompt += `\n\nADVANCED MODE INSTRUCTIONS:
- Pay careful attention to the intensity levels specified
- High intensity (4-5) cues should be CENTRAL to the anime's identity
- Medium intensity (3) cues should be clearly present but balanced
- Low intensity (1-2) cues should be subtle undertones
- Prioritize anime that authentically blend these specific intensity levels`;
        }

        // Add user profile context
        if (args.userProfile) {
            systemPrompt += `\n\nUSER PROFILE CONTEXT:`;
            if (args.userProfile.experienceLevel) {
                systemPrompt += `\n- Experience Level: ${args.userProfile.experienceLevel}`;
                if (args.userProfile.experienceLevel === "beginner") {
                    systemPrompt += ` (Prioritize accessible anime with clear emotional beats)`;
                } else if (args.userProfile.experienceLevel === "veteran") {
                    systemPrompt += ` (Can handle complex, nuanced emotional narratives)`;
                }
            }
            if (args.userProfile.genres?.length) {
                systemPrompt += `\n- Preferred Genres: ${args.userProfile.genres.join(", ")} (Use as secondary filter)`;
            }
            if (args.userProfile.dislikedGenres?.length) {
                systemPrompt += `\n- Avoid Genres: ${args.userProfile.dislikedGenres.join(", ")} (Unless mood match is exceptional)`;
            }
            if (args.userProfile.moods?.length) {
                systemPrompt += `\n- General Mood Preferences: ${args.userProfile.moods.join(", ")}`;
            }
        }

        // Add mood-specific recommendation strategy
        systemPrompt += `\n\nRECOMMENDATION STRATEGY:
${getMoodStrategy(moodAnalysis)}

IMPORTANT GUIDELINES:
1. Each recommendation must authentically capture the selected mood combination
2. Provide diverse options that approach the mood from different angles
3. Consider both obvious and unexpected anime that fit the emotional profile
4. Balance popular accessibility with hidden gems
5. Ensure each recommendation genuinely evokes the specified emotional experience

OUTPUT REQUIREMENTS:
For posterUrl, try to provide real anime poster URLs if you know them. If unknown, use "PLACEHOLDER" for automatic enhancement.

Each recommendation must include:
- title (REQUIRED): Exact anime title
- description: Brief synopsis focusing on mood relevance
- reasoning (REQUIRED): Detailed explanation of how it matches the mood combination and intensities
- posterUrl: Real URL or "PLACEHOLDER"
- genres: Array of relevant genres
- year: Release year if known
- rating: External rating (0-10) if known
- emotionalTags: Specific emotional descriptors that match the mood
- moodMatchScore: 1-10 score for how well it matches the mood combination
- moodReasoningDetailed: Specific breakdown of how each major mood cue is represented
- themes: Major thematic elements
- studios: Animation studios
- targetEmotionalImpact: The primary emotional experience this anime delivers`;

        systemPrompt += `\n\nOutput JSON: {"recommendations": [...]}
        
Provide ${args.count || 6} carefully curated recommendations that create a cohesive mood journey.
Make each recommendation distinctive while staying true to the emotional profile.`;

        let recommendations: any[] = [];
        let errorResult: string | undefined = undefined;

        try {
            console.log(`[Enhanced Mood AI] Calling OpenAI with ${systemPrompt.length} character prompt...`);
            
            const openai = new OpenAI({ apiKey: process.env.CONVEX_OPENAI_API_KEY });
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Find anime that perfectly captures this mood combination: ${args.selectedCues.join(" + ")}. Focus on authentic emotional resonance.` }
                ],
                response_format: { type: "json_object" },
                temperature: 0.7, // Slightly higher for creative mood matching
            });

            const parsed = tryParseAIResponse(completion.choices[0].message.content, "getEnhancedRecommendationsByMoodTheme");
            if (parsed) {
                const rawRecommendations = parsed.slice(0, args.count || 6);
                
                console.log(`[Enhanced Mood AI] Enhancing ${rawRecommendations.length} mood-based recommendations...`);
                recommendations = await enhanceRecommendationsWithDatabaseFirst(ctx, rawRecommendations);
                
                // Add mood-specific metadata
                recommendations = recommendations.map((rec: any) => ({
                    ...rec,
                    moodCombination: args.selectedCues,
                    moodAnalysis: moodAnalysis,
                    isEnhancedMoodRecommendation: true,
                    recommendationMode: args.advancedMode ? 'advanced' : 'simple',
                    // Ensure moodMatchScore is present (required by AnimeRecommendation type)
                    moodMatchScore: rec.moodMatchScore || 7 // Default score if AI didn't provide one
                }));
                
                console.log(`[Enhanced Mood AI] Successfully processed ${recommendations.length} mood recommendations`);
            } else {
                errorResult = "AI response format error or no mood-based recommendations found.";
            }
        } catch (err: any) {
            console.error("[Enhanced Mood AI] Error:", err);
            errorResult = `Enhanced Mood AI Error: ${err.message || "Unknown"}`;
        } finally {
            if (args.messageId) {
                await ctx.runMutation(api.ai.storeAiFeedback, {
                    prompt: `Enhanced mood: ${args.selectedCues.join(", ")} (${args.advancedMode ? 'advanced' : 'simple'} mode)`,
                    aiAction: "getEnhancedRecommendationsByMoodTheme",
                    aiResponseRecommendations: recommendations.length ? recommendations : undefined,
                    aiResponseText: recommendations.length === 0 ? errorResult : JSON.stringify(moodAnalysis),
                    feedbackType: "none",
                    messageId: args.messageId,
                });
            }
        }
        
        return { 
            recommendations, 
            error: errorResult,
            moodAnalysis: moodAnalysis,
            debug: {
                cueCombination: args.selectedCues,
                intensityMode: args.advancedMode,
                analysisResult: moodAnalysis,
                totalRecommendations: recommendations.length,
                realPosters: recommendations.filter((r: any) => r.posterUrl && !r.posterUrl.includes('placehold.co')).length
            }
        };
    }
});

// Helper function to analyze mood combination
function analyzeMoodCombination(selectedCues: string[], intensities: Record<string, number>) {
    // Define mood characteristics and their emotional characteristics
    const MOOD_CHARACTERISTICS: Record<string, {
        energy: number;
        complexity: number;
        category: string;
        theme: string;
    }> = {
        // Emotional Tones
        'Dark & Gritty': { energy: 4, complexity: 5, category: 'emotional', theme: 'mature realism' },
        'Heartwarming': { energy: 2, complexity: 2, category: 'emotional', theme: 'human connection' },
        'Comedic': { energy: 4, complexity: 1, category: 'emotional', theme: 'joy and humor' },
        'Romantic': { energy: 3, complexity: 3, category: 'emotional', theme: 'love and relationships' },
        'Melancholic': { energy: 1, complexity: 4, category: 'emotional', theme: 'bittersweet reflection' },
        'Inspiring': { energy: 5, complexity: 2, category: 'emotional', theme: 'hope and growth' },
        
        // Visual Styles
        'Stunning Visuals': { energy: 3, complexity: 3, category: 'visual', theme: 'artistic excellence' },
        'Retro/Classic': { energy: 2, complexity: 2, category: 'visual', theme: 'nostalgic appeal' },
        'Modern & Sleek': { energy: 3, complexity: 2, category: 'visual', theme: 'contemporary aesthetics' },
        'Unique Art Style': { energy: 3, complexity: 4, category: 'visual', theme: 'artistic innovation' },
        
        // Pacing & Energy
        'Action Packed': { energy: 5, complexity: 2, category: 'pacing', theme: 'high intensity thrills' },
        'Chill Vibes': { energy: 1, complexity: 1, category: 'pacing', theme: 'peaceful relaxation' },
        'Edge of Seat': { energy: 5, complexity: 3, category: 'pacing', theme: 'suspenseful tension' },
        'Slow Burn': { energy: 2, complexity: 4, category: 'pacing', theme: 'gradual development' },
        
        // Themes & Messages
        'Mind-Bending': { energy: 3, complexity: 5, category: 'thematic', theme: 'intellectual complexity' },
        'Thought-Provoking': { energy: 2, complexity: 5, category: 'thematic', theme: 'philosophical depth' },
        'Coming of Age': { energy: 3, complexity: 3, category: 'thematic', theme: 'personal growth' },
        'Social Commentary': { energy: 3, complexity: 4, category: 'thematic', theme: 'societal examination' },
        
        // Atmosphere & Setting
        'Epic Adventure': { energy: 5, complexity: 3, category: 'atmospheric', theme: 'grand journeys' },
        'Nostalgic': { energy: 2, complexity: 3, category: 'atmospheric', theme: 'wistful memories' },
        'Supernatural': { energy: 4, complexity: 3, category: 'atmospheric', theme: 'otherworldly mystery' },
        'Urban & Modern': { energy: 3, complexity: 2, category: 'atmospheric', theme: 'contemporary life' },
        'Fantasy & Magical': { energy: 4, complexity: 3, category: 'atmospheric', theme: 'magical wonder' },
        
        // Character Dynamics
        'Strong Friendships': { energy: 3, complexity: 2, category: 'character', theme: 'bonds and loyalty' },
        'Complex Characters': { energy: 3, complexity: 5, category: 'character', theme: 'psychological depth' },
        'Mentor & Student': { energy: 2, complexity: 3, category: 'character', theme: 'wisdom and learning' },
        'Ensemble Cast': { energy: 4, complexity: 4, category: 'character', theme: 'group dynamics' }
    };

    let totalEnergy = 0;
    let totalComplexity = 0;
    let categories: string[] = [];
    let themes: string[] = [];
    let weightedValues: { energy: number; complexity: number; count: number } = { energy: 0, complexity: 0, count: 0 };

    selectedCues.forEach(cue => {
        const characteristics = MOOD_CHARACTERISTICS[cue];
        if (characteristics) {
            // Apply intensity weighting if available
            const cueId = findCueIdByName(cue);
            const intensity = (cueId && intensities[cueId]) || 3;
            const weight = intensity / 3; // Normalize around 3 (standard intensity)

            weightedValues.energy += characteristics.energy * weight;
            weightedValues.complexity += characteristics.complexity * weight;
            weightedValues.count += weight;

            if (!categories.includes(characteristics.category)) {
                categories.push(characteristics.category);
            }
            themes.push(characteristics.theme);
        }
    });

    const avgEnergy = weightedValues.count > 0 ? Math.round(weightedValues.energy / weightedValues.count) : 3;
    const avgComplexity = weightedValues.count > 0 ? Math.round(weightedValues.complexity / weightedValues.count) : 3;

    // Determine primary emotional tone
    let primaryTone = 'balanced';
    if (selectedCues.some(cue => ['Dark & Gritty', 'Melancholic'].includes(cue))) {
        primaryTone = 'dark/serious';
    } else if (selectedCues.some(cue => ['Heartwarming', 'Inspiring', 'Comedic'].includes(cue))) {
        primaryTone = 'uplifting/positive';
    } else if (selectedCues.some(cue => ['Action Packed', 'Edge of Seat', 'Epic Adventure'].includes(cue))) {
        primaryTone = 'intense/thrilling';
    } else if (selectedCues.some(cue => ['Chill Vibes', 'Nostalgic', 'Slow Burn'].includes(cue))) {
        primaryTone = 'calm/reflective';
    }

    // Determine dominant theme
    const themeFrequency: Record<string, number> = {};
    themes.forEach(theme => {
        themeFrequency[theme] = (themeFrequency[theme] || 0) + 1;
    });
    const dominantTheme = Object.entries(themeFrequency)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'diverse experience';

    return {
        energyLevel: Math.max(1, Math.min(5, avgEnergy)),
        complexityScore: Math.max(1, Math.min(5, avgComplexity)),
        categories: categories,
        primaryTone: primaryTone,
        dominantTheme: dominantTheme,
        cueCount: selectedCues.length,
        isIntenseWeighted: Object.values(intensities).some(i => i >= 4),
        isSubtleWeighted: Object.values(intensities).some(i => i <= 2)
    };
}

// Helper function to get mood strategy based on analysis
function getMoodStrategy(analysis: any): string {
    let strategy = "";

    // Energy-based strategy
    if (analysis.energyLevel >= 4) {
        strategy += "Focus on high-energy anime with dynamic pacing and exciting developments. ";
    } else if (analysis.energyLevel <= 2) {
        strategy += "Prioritize calm, contemplative anime with gentle pacing and introspective moments. ";
    } else {
        strategy += "Balance energy levels with moderate pacing that allows for both excitement and reflection. ";
    }

    // Complexity-based strategy
    if (analysis.complexityScore >= 4) {
        strategy += "Include anime with layered narratives, complex themes, and sophisticated storytelling. ";
    } else if (analysis.complexityScore <= 2) {
        strategy += "Focus on straightforward, accessible anime with clear emotional beats. ";
    }

    // Category-specific strategies
    if (analysis.categories.includes('emotional')) {
        strategy += "Emotional resonance is key - prioritize anime that create genuine feelings. ";
    }
    if (analysis.categories.includes('visual')) {
        strategy += "Visual presentation matters - include anime known for exceptional animation or art. ";
    }
    if (analysis.categories.includes('thematic')) {
        strategy += "Thematic depth is important - look for anime with meaningful messages. ";
    }

    // Primary tone strategy
    switch (analysis.primaryTone) {
        case 'dark/serious':
            strategy += "Embrace mature themes and serious subject matter while maintaining emotional authenticity.";
            break;
        case 'uplifting/positive':
            strategy += "Focus on feel-good anime that inspire and warm the heart.";
            break;
        case 'intense/thrilling':
            strategy += "Prioritize anime that create excitement and keep viewers engaged.";
            break;
        case 'calm/reflective':
            strategy += "Select anime that create a peaceful, meditative viewing experience.";
            break;
        default:
            strategy += "Create a well-rounded selection that balances different emotional experiences.";
    }

    return strategy;
}

// Helper functions for cue mapping
function findCueNameById(cueId: string): string | null {
    const EXPANDED_MOOD_CUES = [
        { id: "dark_gritty", label: "Dark & Gritty" },
        { id: "heartwarming", label: "Heartwarming" },
        { id: "comedic_relief", label: "Comedic" },
        { id: "romantic", label: "Romantic" },
        { id: "melancholic", label: "Melancholic" },
        { id: "inspiring", label: "Inspiring" },
        { id: "stunning_visuals", label: "Stunning Visuals" },
        { id: "retro_classic", label: "Retro/Classic" },
        { id: "modern_sleek", label: "Modern & Sleek" },
        { id: "unique_artstyle", label: "Unique Art Style" },
        { id: "action_packed", label: "Action Packed" },
        { id: "chill_vibes", label: "Chill Vibes" },
        { id: "edge_of_seat", label: "Edge of Seat" },
        { id: "slow_burn", label: "Slow Burn" },
        { id: "mind_bending", label: "Mind-Bending" },
        { id: "thought_provoking", label: "Thought-Provoking" },
        { id: "coming_of_age", label: "Coming of Age" },
        { id: "social_commentary", label: "Social Commentary" },
        { id: "epic_adventure", label: "Epic Adventure" },
        { id: "nostalgic", label: "Nostalgic" },
        { id: "supernatural", label: "Supernatural" },
        { id: "urban_modern", label: "Urban & Modern" },
        { id: "fantasy_magical", label: "Fantasy & Magical" },
        { id: "strong_friendships", label: "Strong Friendships" },
        { id: "complex_characters", label: "Complex Characters" },
        { id: "mentor_student", label: "Mentor & Student" },
        { id: "ensemble_cast", label: "Ensemble Cast" }
    ];
    
    const cue = EXPANDED_MOOD_CUES.find(c => c.id === cueId);
    return cue ? cue.label : null;
}

function findCueIdByName(cueName: string): string | null {
    const EXPANDED_MOOD_CUES = [
        { id: "dark_gritty", label: "Dark & Gritty" },
        { id: "heartwarming", label: "Heartwarming" },
        { id: "comedic_relief", label: "Comedic" },
        { id: "romantic", label: "Romantic" },
        { id: "melancholic", label: "Melancholic" },
        { id: "inspiring", label: "Inspiring" },
        { id: "stunning_visuals", label: "Stunning Visuals" },
        { id: "retro_classic", label: "Retro/Classic" },
        { id: "modern_sleek", label: "Modern & Sleek" },
        { id: "unique_artstyle", label: "Unique Art Style" },
        { id: "action_packed", label: "Action Packed" },
        { id: "chill_vibes", label: "Chill Vibes" },
        { id: "edge_of_seat", label: "Edge of Seat" },
        { id: "slow_burn", label: "Slow Burn" },
        { id: "mind_bending", label: "Mind-Bending" },
        { id: "thought_provoking", label: "Thought-Provoking" },
        { id: "coming_of_age", label: "Coming of Age" },
        { id: "social_commentary", label: "Social Commentary" },
        { id: "epic_adventure", label: "Epic Adventure" },
        { id: "nostalgic", label: "Nostalgic" },
        { id: "supernatural", label: "Supernatural" },
        { id: "urban_modern", label: "Urban & Modern" },
        { id: "fantasy_magical", label: "Fantasy & Magical" },
        { id: "strong_friendships", label: "Strong Friendships" },
        { id: "complex_characters", label: "Complex Characters" },
        { id: "mentor_student", label: "Mentor & Student" },
        { id: "ensemble_cast", label: "Ensemble Cast" }
    ];
    
    const cue = EXPANDED_MOOD_CUES.find(c => c.label === cueName);
    return cue ? cue.id : null;
}

function getIntensityLabel(intensity: number): string {
    switch (intensity) {
        case 1: return "subtle";
        case 2: return "light";
        case 3: return "moderate";
        case 4: return "strong";
        case 5: return "overwhelming";
        default: return "moderate";
    }
}

export const getMoodPresetRecommendations = action({
    args: {
        presetId: v.string(),
        userProfile: v.optional(enhancedUserProfileValidator),
        messageId: v.string(),
    },
    handler: async (ctx, args): Promise<{
        recommendations: any[];
        error?: string;
        moodAnalysis?: any;
        debug?: any;
    }> => {
        if (!process.env.CONVEX_OPENAI_API_KEY) {
            return { recommendations: [], error: "OpenAI API key not configured." };
        }

        // Define presets with their mood combinations
        const PRESET_COMBINATIONS: Record<string, { cues: string[], description: string, strategy: string }> = {
            feel_good_journey: {
                cues: ["Heartwarming", "Inspiring", "Strong Friendships", "Coming of Age"],
                description: "Uplifting adventures that warm your heart and inspire personal growth",
                strategy: "Focus on anime that combine emotional warmth with character development and meaningful relationships"
            },
            mind_bender: {
                cues: ["Mind-Bending", "Thought-Provoking", "Complex Characters", "Unique Art Style"],
                description: "Complex narratives that challenge your thinking and expand your perspective",
                strategy: "Prioritize anime with layered storytelling, psychological depth, and distinctive visual presentation"
            },
            action_spectacle: {
                cues: ["Action Packed", "Stunning Visuals", "Edge of Seat", "Epic Adventure"],
                description: "High-octane thrills with amazing visuals and epic scope",
                strategy: "Select anime known for exceptional action choreography, visual spectacle, and thrilling pacing"
            },
            cozy_comfort: {
                cues: ["Chill Vibes", "Heartwarming", "Slow Burn", "Nostalgic"],
                description: "Relaxing, comforting anime perfect for unwinding and feeling at peace",
                strategy: "Focus on gentle pacing, comfort food anime that create a safe, warm emotional space"
            },
            dark_mature: {
                cues: ["Dark & Gritty", "Complex Characters", "Social Commentary", "Thought-Provoking"],
                description: "Mature themes and complex narratives for experienced viewers",
                strategy: "Include anime that tackle serious subjects with sophistication and emotional intelligence"
            },
            visual_feast: {
                cues: ["Stunning Visuals", "Unique Art Style", "Fantasy & Magical", "Modern & Sleek"],
                description: "Anime that prioritizes artistic excellence and visual innovation",
                strategy: "Prioritize anime celebrated for their visual artistry, animation quality, and aesthetic innovation"
            }
        };

        const preset = PRESET_COMBINATIONS[args.presetId];
        if (!preset) {
            return { recommendations: [], error: "Unknown preset ID" };
        }

        // Use the enhanced mood recommendation system
        const result = await ctx.runAction(api.ai.getEnhancedRecommendationsByMoodTheme, {
            selectedCues: preset.cues,
            cueIntensities: {}, // Default intensities for presets
            userProfile: args.userProfile,
            count: 6,
            messageId: args.messageId,
            advancedMode: false,
            dominantCategory: "preset"
        });

        return result;
    }
});

export const getSimilarAnimeRecommendationsFixed = action({
    args: {
        animeId: v.id("anime"),
        userProfile: v.optional(enhancedUserProfileValidator),
        count: v.optional(v.number()),
        messageId: v.string(),
    },
    handler: async (ctx, args): Promise<{ 
        recommendations: any[]; 
        error?: string 
    }> => {
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
- moodMatchScore: (number, REQUIRED) 1-10 score for similarity to the target anime
- similarityScore: (number, optional) Alternative similarity metric`;

        if (args.userProfile) {
            systemPrompt += "\n\nUser Profile Context (use to refine similarity focus):";
            if (args.userProfile.genres?.length) systemPrompt += `\n- Preferred Genres: ${args.userProfile.genres.join(", ")}`;
            if (args.userProfile.dislikedGenres?.length) systemPrompt += `\n- Disliked Genres: ${args.userProfile.dislikedGenres.join(", ")} (try to avoid these in suggestions if possible, unless a core aspect of similarity)`;
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
                    { role: "user", content: `Find anime similar to "${targetAnime.title}". Focus on strong thematic and genre similarities.` }
                ],
                response_format: { type: "json_object" },
            });

            const parsedResponse = tryParseAIResponse(completion.choices[0].message.content, "getSimilarAnimeRecommendationsFixed");
            
            if (parsedResponse) {
                const rawRecommendations = parsedResponse.slice(0, args.count || 3);
                
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
                    // FIXED: Ensure moodMatchScore is always present
                    moodMatchScore: typeof rec.moodMatchScore === 'number' ? rec.moodMatchScore : (rec.similarityScore || 8)
                })).filter((rec: any) => rec.title && rec.title !== "Unknown Title" && rec.posterUrl);
                
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
            console.error("[AI Action - GetSimilarAnimeRecommendationsFixed] Error:", err);
            errorResult = `AI Error: ${err.message || "Unknown"}`;
        } finally {
            if (args.messageId) {
                 await ctx.runMutation(api.ai.storeAiFeedback, {
                    prompt: `Similar to: ${targetAnime.title} (ID: ${targetAnime._id.toString()})`,
                    aiAction: "getSimilarAnimeRecommendationsFixed",
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

// This adds a database lookup to attach real IDs to test recommendations

export const debugPersonalizedRecommendations = action({
    args: {
        userProfile: enhancedUserProfileValidator,
        count: v.optional(v.number()),
        messageId: v.string(),
    },
    handler: async (ctx, args) => {
        console.log(`[DEBUG Personalized] Starting debug personalized recommendations`);

        if (!process.env.CONVEX_OPENAI_API_KEY) {
            return { recommendations: [], error: "OpenAI API key not configured." };
        }

        // Test recommendations with potential database matches
        const testRecommendations = [
            { title: "Attack on Titan", description: "Humanity fights for survival against giant humanoid Titans.", posterUrl: "PLACEHOLDER", genres: ["Action", "Drama", "Fantasy"], year: 2013, rating: 9.0, emotionalTags: ["intense", "dramatic"], studios: ["Studio Pierrot"], themes: ["survival", "freedom"], reasoning: "Perfect for testing poster fetching and navigation" },
            { title: "Demon Slayer", description: "A young boy becomes a demon slayer to save his sister.", posterUrl: "PLACEHOLDER", genres: ["Action", "Supernatural"], year: 2019, rating: 8.7, emotionalTags: ["emotional", "action-packed"], studios: ["Ufotable"], themes: ["family", "determination"], reasoning: "Another test anime for poster enhancement" },
            { title: "Your Name", description: "Two teenagers share a profound, magical connection.", posterUrl: "PLACEHOLDER", genres: ["Romance", "Drama", "Supernatural"], year: 2016, rating: 8.4, emotionalTags: ["romantic", "beautiful"], studios: ["CoMix Wave Films"], themes: ["love", "destiny"], reasoning: "Movie test for poster system" },
            { title: "Spirited Away", description: "A girl enters a world ruled by gods and witches.", posterUrl: "PLACEHOLDER", genres: ["Adventure", "Family", "Fantasy"], year: 2001, rating: 9.3, emotionalTags: ["magical", "heartwarming"], studios: ["Studio Ghibli"], themes: ["courage", "growth"], reasoning: "Classic Ghibli for diverse testing" },
            { title: "Death Note", description: "A student gains the power to kill with a supernatural notebook.", posterUrl: "PLACEHOLDER", genres: ["Thriller", "Psychological", "Supernatural"], year: 2006, rating: 9.0, emotionalTags: ["dark", "intense"], studios: ["Madhouse"], themes: ["justice", "morality"], reasoning: "Psychological thriller for variety" },
            { title: "One Piece", description: "A pirate crew searches for the ultimate treasure.", posterUrl: "PLACEHOLDER", genres: ["Adventure", "Comedy", "Shounen"], year: 1999, rating: 8.9, emotionalTags: ["adventurous", "friendship"], studios: ["Toei Animation"], themes: ["friendship", "adventure"], reasoning: "Long-running series for testing" },
            { title: "My Hero Academia", description: "Students train to become professional superheroes.", posterUrl: "PLACEHOLDER", genres: ["Action", "School", "Superhero"], year: 2016, rating: 8.6, emotionalTags: ["inspiring", "heroic"], studios: ["Studio Bones"], themes: ["heroism", "growth"], reasoning: "Modern shounen for testing" },
            { title: "Naruto", description: "A young ninja seeks recognition and dreams of becoming Hokage.", posterUrl: "PLACEHOLDER", genres: ["Action", "Martial Arts", "Shounen"], year: 2002, rating: 8.4, emotionalTags: ["determined", "friendship"], studios: ["Studio Pierrot"], themes: ["perseverance", "friendship"], reasoning: "Classic shounen for testing" },
            { title: "Princess Mononoke", description: "A young warrior gets involved in a struggle between forest gods and humans.", posterUrl: "PLACEHOLDER", genres: ["Adventure", "Drama", "Fantasy"], year: 1997, rating: 8.9, emotionalTags: ["epic", "thought-provoking"], studios: ["Studio Ghibli"], themes: ["nature", "conflict"], reasoning: "Environmental epic for testing" },
            { title: "Fullmetal Alchemist: Brotherhood", description: "Brothers use alchemy to search for the Philosopher's Stone.", posterUrl: "PLACEHOLDER", genres: ["Action", "Adventure", "Drama"], year: 2009, rating: 9.5, emotionalTags: ["emotional", "epic"], studios: ["Studio Bones"], themes: ["sacrifice", "truth"], reasoning: "Highly rated series for testing" }
        ];

        try {
            const requestedCount = args.count || 10;
            let selectedRecommendations = testRecommendations.slice(0, requestedCount);
            
            // QUICK FIX: Try to attach real database IDs to test recommendations
            console.log(`[DEBUG Personalized] Looking up database IDs for ${selectedRecommendations.length} recommendations...`);
            
            const enhancedWithIds = await Promise.all(
                selectedRecommendations.map(async (rec) => {
                    try {
                        // Try to find this anime in the database
                        const dbAnime = await ctx.runQuery(internal.anime.getAnimeByTitleInternal, { title: rec.title });
                        
                        if (dbAnime) {
                            console.log(`[DEBUG Personalized] Found database match for "${rec.title}" with ID: ${dbAnime._id}`);
                            // Attach the real database ID
                            return {
                                ...rec,
                                _id: dbAnime._id, // This will make navigation work!
                                // Also use database data if it's better
                                description: dbAnime.description || rec.description,
                                posterUrl: dbAnime.posterUrl || rec.posterUrl,
                                genres: dbAnime.genres || rec.genres,
                                year: dbAnime.year || rec.year,
                                rating: dbAnime.rating || rec.rating,
                                foundInDatabase: true
                            };
                        } else {
                            console.log(`[DEBUG Personalized] No database match for "${rec.title}"`);
                            return { ...rec, foundInDatabase: false };
                        }
                    } catch (error) {
                        console.warn(`[DEBUG Personalized] Error looking up "${rec.title}":`, error);
                        return { ...rec, foundInDatabase: false };
                    }
                })
            );
            
            // Now enhance with posters (this will skip database lookup for items that already have IDs)
            console.log(`[DEBUG Personalized] Enhancing posters for recommendations...`);
            const finalRecommendations = await enhanceRecommendationsWithDatabaseFirst(ctx, enhancedWithIds);
            
            const dbMatches = finalRecommendations.filter(r => r._id).length;
            const realPosters = finalRecommendations.filter(r => r.posterUrl && !r.posterUrl.includes('placehold.co')).length;
            
            console.log(`[DEBUG Personalized] Final results: ${dbMatches}/${finalRecommendations.length} have database IDs, ${realPosters}/${finalRecommendations.length} have real posters`);

            await ctx.runMutation(api.ai.storeAiFeedback, {
                prompt: "Debug personalized recommendations with database lookup",
                aiAction: "debugPersonalizedRecommendations",
                aiResponseRecommendations: finalRecommendations,
                feedbackType: "none",
                messageId: args.messageId,
            });

            return { 
                recommendations: finalRecommendations, 
                debug: {
                    originalCount: testRecommendations.length,
                    requestedCount: requestedCount,
                    finalCount: finalRecommendations.length,
                    databaseMatches: dbMatches,
                    realPostersFound: realPosters
                },
                error: undefined 
            };
        } catch (err: any) {
            console.error("[DEBUG Personalized] Error:", err);
            return { 
                recommendations: testRecommendations.slice(0, args.count || 10), 
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

export const debugAnimeAddition = action({
  args: {
    animeData: v.object({
      title: v.string(),
      description: v.optional(v.string()),
      posterUrl: v.optional(v.string()),
      genres: v.optional(v.array(v.string())),
      year: v.optional(v.number()),
      rating: v.optional(v.number()),
      emotionalTags: v.optional(v.array(v.string())),
      trailerUrl: v.optional(v.string()),
      studios: v.optional(v.array(v.string())),
      themes: v.optional(v.array(v.string()))
    }),
    messageId: v.string(),
  },
  handler: async (ctx, args): Promise<DebugAnimeAdditionResponse> => {
    console.log(`[Debug Anime Addition] Attempting to add:`, args.animeData);
    
    try {
      // Check if anime already exists
      const existingAnime: any = await ctx.runQuery(internal.anime.getAnimeByTitleInternal, { 
        title: args.animeData.title 
      });
      
      if (existingAnime) {
        console.log(`[Debug Anime Addition] Anime already exists with ID: ${existingAnime._id}`);
        return { 
          success: true, 
          animeId: existingAnime._id, 
          message: "Anime already exists in database",
          existing: true 
        };
      }
      
      // Validate the anime data
      const validationErrors: string[] = [];
      
      if (!args.animeData.title || args.animeData.title.trim().length === 0) {
        validationErrors.push("Title is required and cannot be empty");
      }
      
      if (args.animeData.year && (args.animeData.year < 1900 || args.animeData.year > new Date().getFullYear() + 5)) {
        validationErrors.push(`Invalid year: ${args.animeData.year}`);
      }
      
      if (args.animeData.rating && (args.animeData.rating < 0 || args.animeData.rating > 10)) {
        validationErrors.push(`Invalid rating: ${args.animeData.rating}`);
      }
      
      if (validationErrors.length > 0) {
        console.error(`[Debug Anime Addition] Validation errors:`, validationErrors);
        return { 
          success: false, 
          error: `Validation failed: ${validationErrors.join(', ')}`,
          validationErrors 
        };
      }
      
      // Try to add the anime
      console.log(`[Debug Anime Addition] Adding new anime to database...`);
      
      // FIXED: Transform the data to match mutation requirements
      const animeDataForMutation = {
        title: args.animeData.title,
        description: args.animeData.description || "No description available.",
        posterUrl: args.animeData.posterUrl || `https://placehold.co/600x900/ECB091/321D0B/png?text=${encodeURIComponent(args.animeData.title.substring(0, 20))}&font=roboto`,
        genres: args.animeData.genres || [], // FIXED: Always array
        year: args.animeData.year,
        rating: args.animeData.rating,
        emotionalTags: args.animeData.emotionalTags || [], // FIXED: Always array
        trailerUrl: args.animeData.trailerUrl,
        studios: args.animeData.studios || [], // FIXED: Always array
        themes: args.animeData.themes || [], // FIXED: Always array
      };
      
      const newAnimeId: Id<"anime"> = await ctx.runMutation(api.anime.addAnimeByUser, animeDataForMutation);
      
      if (!newAnimeId) {
        console.error(`[Debug Anime Addition] Mutation returned null/undefined ID`);
        return { 
          success: false, 
          error: "Database mutation completed but returned no ID" 
        };
      }
      
      console.log(`[Debug Anime Addition] Successfully added anime with ID: ${newAnimeId}`);
      
      // Store debug feedback
      await ctx.runMutation(api.ai.storeAiFeedback, {
        prompt: `Debug anime addition: ${args.animeData.title}`,
        aiAction: "debugAnimeAddition",
        aiResponseText: JSON.stringify({ 
          success: true, 
          animeId: newAnimeId, 
          animeData: args.animeData 
        }),
        feedbackType: "none",
        messageId: args.messageId,
      });
      
      return { 
        success: true, 
        animeId: newAnimeId, 
        message: "Successfully added new anime to database",
        existing: false 
      };
      
    } catch (error: any) {
      console.error(`[Debug Anime Addition] Error:`, error);
      
      // Store error feedback
      await ctx.runMutation(api.ai.storeAiFeedback, {
        prompt: `Debug anime addition failed: ${args.animeData.title}`,
        aiAction: "debugAnimeAddition",
        aiResponseText: JSON.stringify({ 
          success: false, 
          error: error.message,
          animeData: args.animeData 
        }),
        feedbackType: "down",
        messageId: args.messageId,
      });
      
      return { 
        success: false, 
        error: error.message || "Unknown error during anime addition" 
      };
    }
  },
});

// Test function to verify anime addition workflow
export const testAnimeAddition = action({
  args: {
    testTitle: v.string(),
    messageId: v.string(),
  },
  handler: async (ctx, args): Promise<TestAnimeAdditionResponse> => {
    // FIXED: Ensure all array fields are provided as arrays, not undefined
    const testAnime = {
      title: args.testTitle,
      description: "Test anime for debugging addition issues",
      posterUrl: `https://placehold.co/600x900/ECB091/321D0B/png?text=${encodeURIComponent(args.testTitle)}&font=roboto`,
      genres: ["Test", "Debug"], // FIXED: Always an array
      year: 2024,
      rating: 7.5,
      emotionalTags: ["test"], // FIXED: Always an array
      studios: ["Test Studio"], // FIXED: Always an array
      themes: ["debugging"] // FIXED: Always an array
    };
    
    console.log(`[Test Anime Addition] Testing with:`, testAnime);
    
    try {
      const result: DebugAnimeAdditionResponse = await ctx.runAction(api.ai.debugAnimeAddition, {
        animeData: testAnime,
        messageId: args.messageId
      });
      
      return {
        success: result.success,
        animeId: result.animeId,
        message: result.message,
        existing: result.existing,
        error: result.error
      };
    } catch (error: any) {
      console.error(`[Test Anime Addition] Error:`, error);
      return {
        success: false,
        error: error.message || "Unknown error during test"
      };
    }
  },
});

// Main character enrichment action
export const fetchEnrichedCharacterDetails = action({
  args: {
    characterName: v.string(),
    animeName: v.string(),
    existingData: v.optional(v.object({
      description: v.optional(v.string()),
      role: v.optional(v.string()),
      gender: v.optional(v.string()),
      age: v.optional(v.string()),
      species: v.optional(v.string()),
      powersAbilities: v.optional(v.array(v.string())),
      voiceActors: v.optional(v.array(v.any())),
    })),
    enrichmentLevel: v.optional(v.union(
      v.literal("basic"),
      v.literal("detailed"), 
      v.literal("comprehensive")
    )),
    messageId: v.string(),
  },
  handler: async (ctx, args): Promise<{
    enrichedData: EnrichedCharacterData;
    mergedCharacter: any;
    error?: string;
    sources?: string[];
  }> => {
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      return { 
        enrichedData: {}, 
        mergedCharacter: args.existingData || {},
        error: "OpenAI API key not configured." 
      };
    }

    const enrichmentLevel = args.enrichmentLevel || "detailed";
    
    console.log(`[Character AI Enrichment] Enriching ${args.characterName} from ${args.animeName} (${enrichmentLevel} level)`);

    let systemPrompt = `You are an expert anime character researcher and analyst with access to comprehensive databases including Fandom wikis, MyAnimeList, character analysis sites, and official sources.

Your task is to provide ${enrichmentLevel} character information for "${args.characterName}" from "${args.animeName}".

EXISTING DATA (from AniList):`;

    if (args.existingData) {
      systemPrompt += `
- Basic Description: ${args.existingData.description || "Not provided"}
- Role: ${args.existingData.role || "Not provided"}
- Gender: ${args.existingData.gender || "Not provided"}
- Age: ${args.existingData.age || "Not provided"}
- Species: ${args.existingData.species || "Not provided"}
- Known Abilities: ${args.existingData.powersAbilities?.join(", ") || "Not provided"}`;
    } else {
      systemPrompt += "\n- No existing structured data provided";
    }

    systemPrompt += `\n\nENRICHMENT LEVEL: ${enrichmentLevel.toUpperCase()}`;

    // Customize depth based on enrichment level
    if (enrichmentLevel === "basic") {
      systemPrompt += `
FOCUS: Enhance and expand the basic information with 2-3 well-sourced details per category.`;
    } else if (enrichmentLevel === "detailed") {
      systemPrompt += `
FOCUS: Provide comprehensive character analysis with detailed explanations and multiple examples.`;
    } else { // comprehensive
      systemPrompt += `
FOCUS: Deep-dive analysis with extensive details, cultural context, fan theories, and scholarly perspectives.`;
    }

    systemPrompt += `

RESEARCH PRIORITIES:
1. **Detailed Biography**: Expand beyond basic descriptions with rich backstory details, childhood, formative experiences
2. **Personality Analysis**: Deep psychological profile, motivations, fears, growth patterns, contradictions
3. **Relationships**: Detailed analysis of connections with other characters, how relationships evolve
4. **Abilities & Powers**: Comprehensive breakdown of abilities with explanations of how they work, limitations, evolution
5. **Character Development**: How the character changes throughout the series, major growth moments
6. **Cultural & Thematic Significance**: What the character represents, symbolism, cultural context
7. **Fan Reception & Analysis**: How fans interpret the character, popular theories, community insights

IMPORTANT GUIDELINES:
- Use multiple sources (Fandom wikis, official guides, fan analyses, reviews)
- Prioritize official and well-documented information
- When including fan theories or interpretations, clearly mark them as such
- Avoid spoilers beyond what's commonly known
- Be specific with examples from the source material
- If existing data conflicts with your research, note the discrepancy

OUTPUT REQUIREMENTS:
Return a JSON object with the following structure:

{
  "enrichedData": {
    "detailedBio": "Comprehensive biography expanding on basic info...",
    "personalityAnalysis": "Deep psychological analysis...",
    "keyRelationships": [
      {
        "relatedCharacterName": "Character Name",
        "relationshipDescription": "Detailed explanation of their relationship dynamics...",
        "relationType": "friend/rival/mentor/family/romantic/etc"
      }
    ],
    "detailedAbilities": [
      {
        "abilityName": "Ability Name",
        "abilityDescription": "Detailed explanation of how it works, its limits, evolution...",
        "powerLevel": "weak/moderate/strong/legendary"
      }
    ],
    "majorCharacterArcs": [
      "Arc 1: Description of character development...",
      "Arc 2: How they evolved..."
    ],
    "trivia": [
      "Interesting fact 1...",
      "Fun detail 2..."
    ],
    "backstoryDetails": "Rich background information not in basic bio...",
    "characterDevelopment": "How the character evolves throughout the series...",
    "notableQuotes": [
      "\"Memorable quote 1\"",
      "\"Iconic line 2\""
    ],
    "symbolism": "What this character represents thematically...",
    "fanReception": "How the character is received by fans, popular interpretations...",
    "culturalSignificance": "Cultural context, real-world inspirations..."
  },
  "sources": ["Source 1", "Source 2", "Source 3"],
  "confidence": 0.0-1.0,
  "spoilerLevel": "none/mild/moderate/major"
}

Make this character profile comprehensive and engaging while maintaining accuracy.`;

    let enrichedData: EnrichedCharacterData = {};
    let sources: string[] = [];
    let errorResult: string | undefined = undefined;

    try {
      const openai = new OpenAI({ apiKey: process.env.CONVEX_OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Research and provide ${enrichmentLevel} enriched details for ${args.characterName} from ${args.animeName}. Focus on information that goes beyond what's typically available in structured databases.` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3, // Lower temperature for more factual responses
      });

      const parsed = JSON.parse(completion.choices[0].message.content || "{}");
      
      if (parsed.enrichedData) {
        enrichedData = parsed.enrichedData;
        sources = parsed.sources || [];
        
        console.log(`[Character AI Enrichment] Successfully enriched ${args.characterName} with ${Object.keys(enrichedData).length} data fields`);
      } else {
        errorResult = "AI response format error - no enriched data found.";
      }
    } catch (err: any) {
      console.error("[Character AI Enrichment] Error:", err);
      errorResult = `Character AI Error: ${err.message || "Unknown"}`;
    }

    // Merge existing data with enriched data
    const mergedCharacter = mergeCharacterData(args.existingData || {}, enrichedData);

    // Store feedback
    if (args.messageId) {
      await ctx.runMutation(api.ai.storeAiFeedback, {
        prompt: `Character enrichment: ${args.characterName} from ${args.animeName} (${enrichmentLevel})`,
        aiAction: "fetchEnrichedCharacterDetails",
        aiResponseText: JSON.stringify({ enrichedData, sources }),
        feedbackType: "none",
        messageId: args.messageId,
      });
    }

    return { 
      enrichedData, 
      mergedCharacter, 
      error: errorResult,
      sources 
    };
  },
});

// Character relationship analyzer
export const analyzeCharacterRelationships = action({
  args: {
    characterName: v.string(),
    animeName: v.string(),
    focusCharacters: v.optional(v.array(v.string())),
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      return { relationships: [], error: "OpenAI API key not configured." };
    }

    let systemPrompt = `You are an expert anime relationship analyst. Analyze the relationships of "${args.characterName}" from "${args.animeName}".

Focus on providing nuanced relationship analysis that goes beyond basic labels.`;

    if (args.focusCharacters?.length) {
      systemPrompt += `\n\nPay special attention to relationships with: ${args.focusCharacters.join(", ")}`;
    }

    systemPrompt += `

For each significant relationship, provide:
1. **Relationship Evolution**: How it develops over time
2. **Emotional Dynamics**: The underlying emotional currents
3. **Conflict & Resolution**: Major tensions and how they're addressed
4. **Mutual Influence**: How each character affects the other
5. **Symbolic Significance**: What the relationship represents thematically

Output JSON: {
  "relationships": [
    {
      "characterName": "Name",
      "relationshipType": "detailed type",
      "emotionalDynamics": "analysis...",
      "evolution": "how it changes...",
      "significance": "thematic importance...",
      "keyMoments": ["moment 1", "moment 2"],
      "mutualInfluence": "how they affect each other..."
    }
  ]
}`;

    try {
      const openai = new OpenAI({ apiKey: process.env.CONVEX_OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze the relationships of ${args.characterName} from ${args.animeName}` }
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");

      await ctx.runMutation(api.ai.storeAiFeedback, {
        prompt: `Relationship analysis: ${args.characterName} from ${args.animeName}`,
        aiAction: "analyzeCharacterRelationships",
        aiResponseText: JSON.stringify(result),
        feedbackType: "none",
        messageId: args.messageId,
      });

      return { relationships: result.relationships || [], error: undefined };
    } catch (err: any) {
      console.error("[Character Relationship Analysis] Error:", err);
      return { relationships: [], error: `Analysis Error: ${err.message}` };
    }
  },
});

// Character development timeline analyzer
export const getCharacterDevelopmentTimeline = action({
  args: {
    characterName: v.string(),
    animeName: v.string(),
    includeArcs: v.optional(v.boolean()),
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      return { timeline: [], error: "OpenAI API key not configured." };
    }

    let systemPrompt = `You are an expert at analyzing character development arcs in anime. Create a detailed development timeline for "${args.characterName}" from "${args.animeName}".

Focus on:
1. **Key Growth Moments**: Specific events that changed the character
2. **Internal Conflicts**: Psychological struggles and resolutions
3. **Skill/Power Development**: How abilities evolved
4. **Relationship Milestones**: Important relationship developments
5. **Personality Changes**: How their core personality shifted

${args.includeArcs ? "Include major story arc contexts for each development phase." : "Focus on character-specific development independent of plot structure."}

Output JSON: {
  "timeline": [
    {
      "phase": "Early Series/Arc Name",
      "timeframe": "Episodes/Chapters X-Y",
      "keyDevelopments": ["development 1", "development 2"],
      "internalConflicts": "main psychological struggles...",
      "growthTriggers": ["event that caused growth"],
      "skillEvolution": "how abilities/skills changed...",
      "personalityShifts": "how they changed as a person...",
      "relationshipChanges": "key relationship developments..."
    }
  ],
  "overallArc": "summary of complete character journey...",
  "majorTurningPoints": ["event 1", "event 2"]
}`;

    try {
      const openai = new OpenAI({ apiKey: process.env.CONVEX_OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Create a character development timeline for ${args.characterName}` }
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");

      await ctx.runMutation(api.ai.storeAiFeedback, {
        prompt: `Character timeline: ${args.characterName} from ${args.animeName}`,
        aiAction: "getCharacterDevelopmentTimeline",
        aiResponseText: JSON.stringify(result),
        feedbackType: "none",
        messageId: args.messageId,
      });

      return { 
        timeline: result.timeline || [], 
        overallArc: result.overallArc,
        majorTurningPoints: result.majorTurningPoints || [],
        error: undefined 
      };
    } catch (err: any) {
      console.error("[Character Development Timeline] Error:", err);
      return { timeline: [], error: `Timeline Error: ${err.message}` };
    }
  },
});

// Helper function to merge character data intelligently
function mergeCharacterData(existingData: any, enrichedData: EnrichedCharacterData): any {
  const merged = { ...existingData };

  // Enhance description with detailed bio if available
  if (enrichedData.detailedBio) {
    merged.description = enrichedData.detailedBio;
    merged.originalDescription = existingData.description; // Keep original as backup
  }

  // Add enriched fields
  merged.personalityAnalysis = enrichedData.personalityAnalysis;
  merged.keyRelationships = enrichedData.keyRelationships;
  merged.backstoryDetails = enrichedData.backstoryDetails;
  merged.characterDevelopment = enrichedData.characterDevelopment;
  merged.symbolism = enrichedData.symbolism;
  merged.fanReception = enrichedData.fanReception;
  merged.culturalSignificance = enrichedData.culturalSignificance;
  merged.trivia = enrichedData.trivia;
  merged.notableQuotes = enrichedData.notableQuotes;
  merged.majorCharacterArcs = enrichedData.majorCharacterArcs;

  // Enhance abilities with detailed analysis
  if (enrichedData.detailedAbilities?.length) {
    if (existingData.powersAbilities?.length) {
      // Merge existing abilities with detailed explanations
      merged.detailedAbilities = enrichedData.detailedAbilities;
      merged.powersAbilities = existingData.powersAbilities; // Keep simple list
    } else {
      // Use AI abilities as primary source
      merged.detailedAbilities = enrichedData.detailedAbilities;
      merged.powersAbilities = enrichedData.detailedAbilities.map(a => a.abilityName);
    }
  }

  // Mark as AI-enriched
  merged.isAIEnriched = true;
  merged.enrichmentTimestamp = Date.now();

  return merged;
}