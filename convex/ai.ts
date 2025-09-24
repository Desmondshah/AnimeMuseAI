// convex/ai.ts
import { action, mutation, internalQuery, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import OpenAI from "openai";
import { Id, Doc } from "./_generated/dataModel"; // Doc added for clarity
import { AnimeRecommendation } from "./types"; // Ensure this type is comprehensive

// Use cheaper model by default for general tasks, can be overridden via env
const OPENAI_MODEL = process.env.CONVEX_OPENAI_CHEAP_MODEL || "gpt-3.5-turbo-0125";
// Dedicated, higher-quality model for character enrichment flows
// Default to gpt-4o-mini for: overview, relationships, and growth
// Can be overridden via CONVEX_OPENAI_CHARACTER_MODEL
const ENRICHMENT_MODEL =
  process.env.CONVEX_OPENAI_CHARACTER_MODEL ||
  "gpt-4o-mini";

function formatUserProfile(profile: any | undefined): string {
  if (!profile) return "";
  const parts: string[] = [];
  if (profile.name) parts.push(`Name: ${profile.name}`);
  if (profile.moods?.length) parts.push(`Moods: ${profile.moods.join("/")}`);
  if (profile.genres?.length) parts.push(`Genres: ${profile.genres.join("/")}`);
  if (profile.favoriteAnimes?.length) parts.push(`Fav: ${profile.favoriteAnimes.slice(0,3).join("/")}`);
  if (profile.experienceLevel) parts.push(`Exp: ${profile.experienceLevel}`);
  if (profile.dislikedGenres?.length) parts.push(`Dislikes: ${profile.dislikedGenres.join("/")}`);
  if (profile.characterArchetypes?.length) parts.push(`Chars: ${profile.characterArchetypes.join("/")}`);
  if (profile.tropes?.length) parts.push(`Tropes: ${profile.tropes.join("/")}`);
  if (profile.artStyles?.length) parts.push(`Art: ${profile.artStyles.join("/")}`);
  if (profile.narrativePacing) parts.push(`Pacing: ${profile.narrativePacing}`);
  return parts.length ? "\nUser: " + parts.join("; ") : "";
}

// Interface for debug anime addition response
interface DebugAnimeAdditionResponse {
  success: boolean;
  animeId?: Id<"anime">;
  message?: string;
  existing?: boolean;
  error?: string;
  validationErrors?: string[];
}

interface RecommendationWithDatabase extends AnimeRecommendation {
  foundInDatabase?: boolean;
  _id?: Id<"anime">;
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
    const result = await ctx.db.insert("aiInteractionFeedback", {
      userId: "system" as any, // Replace with actual userId if available and authenticated
      prompt: args.prompt,
      aiAction: args.aiAction,
      aiResponseRecommendations: args.aiResponseRecommendations,
      aiResponseText: args.aiResponseText,
      feedbackType: args.feedbackType,
      messageId: args.messageId,
      timestamp: Date.now(),
    });
    
    // Return the inserted ID if you need to use it in a condition
    return result;
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

const fetchRealAnimePosterWithRetry = async (animeTitle: string, maxRetries: number = 1): Promise<string | null> => {
  // Pre-defined mappings for common titles that have API naming differences
  const titleMappings: { [key: string]: string[] } = {
    "Demon Slayer": ["Kimetsu no Yaiba", "Demon Slayer: Kimetsu no Yaiba"],
    "Attack on Titan": ["Shingeki no Kyojin", "Attack on Titan"],
    "Dr. Stone": ["Dr. Stone", "Doctor Stone"],
    "My Hero Academia": ["Boku no Hero Academia", "My Hero Academia"],
    "One Piece": ["One Piece"],
    "Jujutsu Kaisen": ["Jujutsu Kaisen"],
    "Tokyo Ghoul": ["Tokyo Ghoul"],
    "Death Note": ["Death Note"],
    "Fullmetal Alchemist": ["Fullmetal Alchemist: Brotherhood", "Fullmetal Alchemist"],
    "Your Name": ["Kimi no Na wa", "Your Name"],
    "Spirited Away": ["Sen to Chihiro no Kamikakushi", "Spirited Away"]
  };

  // Get possible titles to search
  const searchTitles = titleMappings[animeTitle] || [animeTitle];
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Real Poster Fetch] Attempt ${attempt + 1} for: "${animeTitle}"`);

      // Try each possible title variant
      for (const searchTitle of searchTitles) {
        console.log(`[Real Poster Fetch] Trying variant: "${searchTitle}"`);
        
        // Clean the title for better search results
        const cleanTitle = searchTitle
          .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
          .replace(/\s+/g, ' ') // Normalize spaces
          .trim();

        // Try AniList first with shorter timeout for faster failure
        try {
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

          const anilistController = new AbortController();
          const anilistTimeout = setTimeout(() => anilistController.abort(), 4000); // Reduced to 4 seconds

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
                console.log(`[Real Poster Fetch] ✅ AniList success for: "${searchTitle}" (ID: ${media.id})`);
                
                // Quick URL validation (no HEAD request to save time)
                if (posterUrl.includes('anilist.co') || posterUrl.includes('media.anilist.co')) {
                  return posterUrl;
                }
              }
            }
          }
        } catch (error: any) {
          if (error.name === 'AbortError') {
            console.warn(`[Real Poster Fetch] AniList timeout for: "${searchTitle}"`);
          } else {
            console.warn(`[Real Poster Fetch] AniList error for: "${searchTitle}":`, error.message);
          }
        }

        // Small delay before trying Jikan
        await new Promise(resolve => setTimeout(resolve, 200));

        // Try Jikan API with shorter timeout
        try {
          const encodedTitle = encodeURIComponent(cleanTitle);
          const jikanUrl = `https://api.jikan.moe/v4/anime?q=${encodedTitle}&limit=1&sfw`;
          
          const jikanController = new AbortController();
          const jikanTimeout = setTimeout(() => jikanController.abort(), 4000); // Reduced to 4 seconds
          
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
                console.log(`[Real Poster Fetch] ✅ Jikan success for: "${searchTitle}" (MAL ID: ${anime.mal_id})`);
                return posterUrl;
              }
            }
          } else if (jikanResponse.status === 429) {
            console.log(`[Real Poster Fetch] Rate limited on Jikan, skipping retries for: "${searchTitle}"`);
            break; // Skip remaining variants if rate limited
          }
        } catch (error: any) {
          if (error.name === 'AbortError') {
            console.warn(`[Real Poster Fetch] Jikan timeout for: "${searchTitle}"`);
          } else {
            console.warn(`[Real Poster Fetch] Jikan error for: "${searchTitle}":`, error.message);
          }
        }

        // Delay between title variants
        if (searchTitles.indexOf(searchTitle) < searchTitles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      // If we reach here, all title variants failed for this attempt
      if (attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 500; // Reduced wait time
        console.log(`[Real Poster Fetch] All variants failed, waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

    } catch (error: any) {
      console.error(`[Real Poster Fetch] Attempt ${attempt + 1} failed for "${animeTitle}":`, error.message);
    }
  }

  console.warn(`[Real Poster Fetch] ❌ All attempts failed for: "${animeTitle}"`);
  return null;
};

// Enhanced version that checks database first with better concurrency control
const enhanceRecommendationsWithDatabaseFirst = async (
  ctx: any,
  recommendations: any[]
): Promise<RecommendationWithDatabase[]> => {
  const enhancedRecommendations: RecommendationWithDatabase[] = [];
  const concurrentLimit = 2;
  
  console.log(`[Database-First Enhancement] Processing ${recommendations.length} recommendations with concurrency limit ${concurrentLimit}...`);
  
  // Process recommendations in batches to avoid connection timeouts
  for (let i = 0; i < recommendations.length; i += concurrentLimit) {
    const batch = recommendations.slice(i, i + concurrentLimit);
    
    const batchResults = await Promise.all(
      batch.map(async (rec: any, batchIndex: number): Promise<RecommendationWithDatabase> => {
        const globalIndex = i + batchIndex;
        let posterUrl = rec.posterUrl;
        let foundInDatabase = false;
        
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
              rec._id = dbAnime._id.toString(); // Convert to string for frontend compatibility
              console.log(`[Database-First Enhancement] ✅ Found in DB with valid poster: ${rec.title}`);
              
              // Enhance other fields from database if they're better
              rec.description = rec.description || dbAnime.description;
              rec.genres = rec.genres?.length ? rec.genres : (dbAnime.genres || []);
              rec.year = rec.year || dbAnime.year;
              rec.rating = rec.rating || dbAnime.rating;
              rec.studios = rec.studios?.length ? rec.studios : (dbAnime.studios || []);
              rec.anilistId = rec.anilistId || dbAnime.anilistId;
            } else {
              console.log(`[Database-First Enhancement] Not found in DB or poster invalid: ${rec.title}`);
            }
          } catch (error: any) {
            console.warn(`[Database-First Enhancement] DB lookup error for "${rec.title}":`, error.message);
          }
        }
        
        // Step 2: If not found in DB or poster is invalid, use external APIs
        if (!foundInDatabase && (!posterUrl || posterUrl === "PLACEHOLDER" || posterUrl.includes('placehold.co') || posterUrl.includes('placeholder') || !posterUrl.startsWith('https://'))) {
          console.log(`[Database-First Enhancement] 🔍 Fetching external poster for: ${rec.title}`);
          
          try {
            const externalPosterUrl = await fetchRealAnimePosterWithRetry(rec.title, 0);
            
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
        
        return {
          ...rec,
          posterUrl,
          title: rec.title || "Unknown Title",
          description: rec.description || "No description available.",
          reasoning: rec.reasoning || "AI recommendation.",
          foundInDatabase,
          // Ensure required fields are present
          moodMatchScore: rec.moodMatchScore || 7,
          genres: Array.isArray(rec.genres) ? rec.genres : [],
          emotionalTags: Array.isArray(rec.emotionalTags) ? rec.emotionalTags : [],
          studios: Array.isArray(rec.studios) ? rec.studios : [],
          themes: Array.isArray(rec.themes) ? rec.themes : [],
        } as RecommendationWithDatabase;
      })
    );
    
    enhancedRecommendations.push(...batchResults);
    
    // Small delay between batches to avoid overwhelming the system
    if (i + concurrentLimit < recommendations.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  const dbHits = enhancedRecommendations.filter((rec: RecommendationWithDatabase) => rec.foundInDatabase).length;
  const realPostersFound = enhancedRecommendations.filter((rec: RecommendationWithDatabase) => 
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

    systemPrompt += formatUserProfile(args.userProfile);

    let recommendations: any[] = [];
    let errorResult: string | undefined = undefined;

    try {
      console.log(`[AI Recommendations] Calling OpenAI API...`);
      const openai = new OpenAI({ apiKey: process.env.CONVEX_OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
         model: OPENAI_MODEL,
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
        
        console.log(`[AI Recommendations] Enhancing ${rawRecommendations.length} recommendations with database-first approach...`);
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
      // FIXED: Don't use the result of runMutation in a condition
      if (args.messageId) {
        try {
          await ctx.runMutation(api.ai.storeAiFeedback, {
            prompt: args.prompt,
            aiAction: "getAnimeRecommendation",
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
        model: OPENAI_MODEL,
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

    systemPrompt += formatUserProfile(args.userProfile);

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
        model: OPENAI_MODEL,
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
        model: OPENAI_MODEL,
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
        model: OPENAI_MODEL,
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

    systemPrompt += formatUserProfile(args.userProfile);

    systemPrompt += `\n\nProvide recommendations in your role as ${role.replace("_", " ")}. Use your expertise and voice while being helpful.

Output JSON: {"recommendations": [...]}
Each recommendation: title, description, reasoning (in your role's voice/perspective), posterUrl, genres, year, rating, roleSpecificInsight (unique perspective from your role).`;

    let recommendations: any[] = [];
    let errorResult: string | undefined = undefined;

    try {
      const openai = new OpenAI({ apiKey: process.env.CONVEX_OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
         model: OPENAI_MODEL,
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

    systemPrompt += formatUserProfile(args.userProfile);


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
        model: OPENAI_MODEL,
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

    systemPrompt += formatUserProfile(args.userProfile);


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
       model: OPENAI_MODEL,
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

    systemPrompt += formatUserProfile(args.userProfile);

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
        model: OPENAI_MODEL,
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
         model: OPENAI_MODEL,
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
        model: OPENAI_MODEL,
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

export const analyzeWhatIfScenario = action({
  args: {
    whatIfScenario: v.string(),
    userProfile: v.optional(enhancedUserProfileValidator),
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      return { analysis: null, error: "OpenAI API key not configured." };
    }

    console.log(`[What If Analysis] Processing scenario: "${args.whatIfScenario}"`);

    let systemPrompt = `You are AniMuse AI, an expert anime analyst specializing in hypothetical scenario analysis.

Your task is to thoughtfully analyze "what if" scenarios related to anime characters, worlds, or events. Provide detailed, engaging analysis that explores the implications and consequences of the hypothetical situation.

USER SCENARIO: "${args.whatIfScenario}"`;

    systemPrompt += formatUserProfile(args.userProfile);

    systemPrompt += `\n\nAnalysis Framework:
1. **Initial Impact**: What would immediately change?
2. **Character Development**: How would characters evolve differently?
3. **Plot Implications**: How would the story unfold differently?
4. **World/Setting Changes**: How would the anime world be affected?
5. **Thematic Impact**: How would themes and messages change?
6. **Ripple Effects**: What unexpected consequences might occur?
7. **Alternative Outcomes**: What different endings or developments might happen?

Provide a thoughtful, detailed analysis that:
- Explores multiple angles and consequences
- Considers character psychology and motivations
- Examines how relationships would change
- Discusses plot and world-building implications
- Maintains the tone and logic of the original anime
- Offers creative but plausible interpretations

Output JSON: {
  "analysis": {
    "scenario": "${args.whatIfScenario}",
    "immediateImpact": "What changes right away...",
    "characterImpact": "How characters would be affected...",
    "plotChanges": "How the story would unfold differently...",
    "worldImpact": "How the anime world/setting would change...",
    "relationshipChanges": "How character relationships would evolve...",
    "thematicShift": "How themes and messages would change...",
    "rippleEffects": "Unexpected consequences and chain reactions...",
    "alternativeOutcomes": "Different possible endings or developments...",
    "overallAssessment": "Summary of the complete scenario analysis...",
    "creativePossibilities": "Interesting creative directions this could lead..."
  },
  "confidence": 0.0-1.0,
  "analysisDepth": "surface|detailed|comprehensive"
}

Make your analysis engaging, thoughtful, and true to the source material while exploring creative possibilities.`;

    let analysis: any = null;
    let errorResult: string | undefined = undefined;

    try {
      console.log(`[What If Analysis] Calling OpenAI API for scenario analysis...`);
      const openai = new OpenAI({ apiKey: process.env.CONVEX_OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: args.whatIfScenario }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8, // Higher creativity for hypothetical analysis
      });

      console.log(`[What If Analysis] OpenAI response received, parsing...`);
      const parsed = JSON.parse(completion.choices[0].message.content || "{}");
      
      if (parsed.analysis) {
        analysis = {
          ...parsed.analysis,
          scenario: args.whatIfScenario,
          analysisTimestamp: Date.now(),
          analysisType: "what_if_scenario"
        };
        console.log(`[What If Analysis] Successfully generated analysis for scenario`);
      } else {
        errorResult = "AI response format error - no analysis generated.";
        console.error(`[What If Analysis] Parse error: ${errorResult}`);
      }
    } catch (err: any) {
      console.error("[What If Analysis] Error:", err);
      errorResult = `What If Analysis Error: ${err.message || "Unknown"}`;
    } finally {
      if (args.messageId) {
        try {
          await ctx.runMutation(api.ai.storeAiFeedback, {
            prompt: args.whatIfScenario,
            aiAction: "analyzeWhatIfScenario",
            aiResponseText: analysis ? JSON.stringify(analysis) : errorResult,
            feedbackType: "none",
            messageId: args.messageId,
          });
        } catch (feedbackError) {
          console.warn("[What If Analysis] Failed to store feedback:", feedbackError);
        }
      }
    }

    console.log(`[What If Analysis] Returning result:`, { 
      hasAnalysis: !!analysis, 
      hasError: !!errorResult 
    });

    return { analysis, error: errorResult };
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
         model: OPENAI_MODEL,
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

        systemPrompt += formatUserProfile(args.userProfile);

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
            const openaiTemperature = 0.8 + Math.random() * 0.2;
            const completion = await openai.chat.completions.create({
                model: OPENAI_MODEL,
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
        previousTitles: v.optional(v.array(v.string())),
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

if (args.previousTitles && args.previousTitles.length > 0) {
            systemPrompt += `\n\nPreviously recommended titles to avoid: ${args.previousTitles.join(', ')}`;
        }

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
        systemPrompt += formatUserProfile(args.userProfile);

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

const recommendationCount = Math.min(args.count ?? 10, 10);

        systemPrompt += `\n\nOutput JSON: {"recommendations": [...]}
        
Provide ${recommendationCount} carefully curated recommendations that create a cohesive mood journey.
        Make each recommendation distinctive while staying true to the emotional profile.`;

        let recommendations: any[] = [];
        let errorResult: string | undefined = undefined;

        try {
            console.log(`[Enhanced Mood AI] Calling OpenAI with ${systemPrompt.length} character prompt...`);
            
            const openai = new OpenAI({ apiKey: process.env.CONVEX_OPENAI_API_KEY });
            const openaiTemperature = 0.8 + Math.random() * 0.2;
            const completion = await openai.chat.completions.create({
                 model: OPENAI_MODEL,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Find anime that perfectly captures this mood combination: ${args.selectedCues.join(" + ")}. Focus on authentic emotional resonance.` }
                ],
                response_format: { type: "json_object" },
                temperature: openaiTemperature,
            });

            const parsed = tryParseAIResponse(completion.choices[0].message.content, "getEnhancedRecommendationsByMoodTheme");
            if (parsed) {
                const rawRecommendations = parsed.slice(0, recommendationCount);
                
                console.log(`[Enhanced Mood AI] Enhancing ${rawRecommendations.length} mood-based recommendations with database first...`);
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

                recommendations = shuffleArray(recommendations);
                
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

function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
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
- similarityScore: (number, optional) Alternative similarity metric
- anilistId: (number, optional) AniList ID if known`;

        systemPrompt += formatUserProfile(args.userProfile);
        systemPrompt += `\n\nOutput JSON: {"recommendations": [...]}`;

        let recommendations: any[] = [];
        let errorResult: string | undefined = undefined;

        try {
            const openai = new OpenAI({ apiKey: process.env.CONVEX_OPENAI_API_KEY });
            const completion = await openai.chat.completions.create({
                 model: OPENAI_MODEL,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Find anime similar to "${targetAnime.title}". Focus on strong thematic and genre similarities.` }
                ],
                response_format: { type: "json_object" },
            });

            const parsedResponse = tryParseAIResponse(completion.choices[0].message.content, "getSimilarAnimeRecommendationsFixed");
            
            if (parsedResponse) {
                const rawRecommendations = parsedResponse.slice(0, args.count || 3);
                
                console.log(`[Similar Recommendations] Enhancing ${rawRecommendations.length} recommendations with auto-add feature...`);
                const enhancedRecommendations = await enhanceRecommendationsWithAutoAdd(ctx, rawRecommendations);
                
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
                    anilistId: typeof rec.anilistId === 'number' ? rec.anilistId : undefined,
                    // FIXED: Ensure moodMatchScore is always present
                    moodMatchScore: typeof rec.moodMatchScore === 'number' ? rec.moodMatchScore : (rec.similarityScore || 8),
                    // Database-related fields
                    _id: rec._id, // Set by enhancement process
                    foundInDatabase: rec.foundInDatabase,
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

// Enhanced function that automatically adds missing anime to database
const enhanceRecommendationsWithAutoAdd = async (
  ctx: any,
  recommendations: any[]
): Promise<RecommendationWithDatabase[]> => {
  const enhancedRecommendations: RecommendationWithDatabase[] = [];
  const concurrentLimit = 2;
  
  console.log(`[Auto-Add Enhancement] Processing ${recommendations.length} recommendations with auto-add feature...`);
  
  // Process recommendations in batches to avoid connection timeouts
  for (let i = 0; i < recommendations.length; i += concurrentLimit) {
    const batch = recommendations.slice(i, i + concurrentLimit);
    
    const batchResults = await Promise.all(
      batch.map(async (rec: any, batchIndex: number): Promise<RecommendationWithDatabase> => {
        const globalIndex = i + batchIndex;
        let posterUrl = rec.posterUrl;
        let foundInDatabase = false;
        
        console.log(`[Better Database Matching] Processing (${globalIndex + 1}/${recommendations.length}): ${rec.title}`);
        
        // Step 1: Try multiple title variations for better matching
        if (rec.title) {
          const titleVariations = [
            rec.title,
            rec.title.replace(/[^\w\s]/g, ''), // Remove special characters
            rec.title.replace(/\s+/g, ' ').trim(), // Normalize whitespace
            rec.title.toLowerCase(),
            rec.title.replace(':', '').replace('!', '').replace('?', ''), // Remove punctuation
          ];
          
          let dbAnime: any = null;
          
          // Try exact matches first
          for (const titleVar of titleVariations) {
            try {
              dbAnime = await ctx.runQuery(internal.anime.getAnimeByTitleInternal, { 
                title: titleVar 
              });
              if (dbAnime) {
                console.log(`[Better Database Matching] ✅ Exact match found for "${rec.title}" using variation "${titleVar}"`);
                break;
              }
            } catch (error: any) {
              console.warn(`[Better Database Matching] Error with title "${titleVar}":`, error.message);
            }
          }
          
          // If no exact match, try fuzzy search
          if (!dbAnime) {
            try {
              const searchResults = await ctx.runQuery(internal.anime.getFilteredAnimeInternal, {
                paginationOpts: { numItems: 20, cursor: null },
                searchTerm: rec.title
              });
              
              // Look for close matches
              const closeMatch = searchResults.page.find((anime: any) => {
                const titleLower = anime.title.toLowerCase();
                const recTitleLower = rec.title.toLowerCase();
                
                return titleLower.includes(recTitleLower) || 
                       recTitleLower.includes(titleLower) ||
                       titleLower.replace(/[^\w]/g, '') === recTitleLower.replace(/[^\w]/g, '');
              });
              
              if (closeMatch) {
                dbAnime = closeMatch;
                console.log(`[Better Database Matching] ✅ Fuzzy match found: "${rec.title}" -> "${closeMatch.title}"`);
              }
            } catch (error: any) {
              console.warn(`[Better Database Matching] Search error for "${rec.title}":`, error.message);
            }
          }
          
          if (dbAnime && isValidPosterUrl(dbAnime.posterUrl)) {
            posterUrl = dbAnime.posterUrl;
            foundInDatabase = true;
            rec._id = dbAnime._id;
            
            // Enhance other fields from database
            rec.description = rec.description || dbAnime.description;
            rec.genres = rec.genres?.length ? rec.genres : (dbAnime.genres || []);
            rec.year = rec.year || dbAnime.year;
            rec.rating = rec.rating || dbAnime.rating;
            rec.studios = rec.studios?.length ? rec.studios : (dbAnime.studios || []);
            
            console.log(`[Better Database Matching] ✅ Enhanced "${rec.title}" with database data`);
          } else {
            console.log(`[Better Database Matching] ❌ No database match found for: ${rec.title}`);
          }
        }
        
        // Step 2: If not found in DB, use external APIs (same as before)
        if (!foundInDatabase && (!posterUrl || posterUrl === "PLACEHOLDER" || posterUrl.includes('placehold.co') || posterUrl.includes('placeholder') || !posterUrl.startsWith('https://'))) {
          console.log(`[Better Database Matching] 🔍 Fetching external poster for: ${rec.title}`);
          
          try {
            const externalPosterUrl = await fetchRealAnimePosterWithRetry(rec.title, 0);
            
            if (externalPosterUrl) {
              posterUrl = externalPosterUrl;
              console.log(`[Better Database Matching] ✅ Found external poster: ${rec.title}`);
            } else {
              const encodedTitle = encodeURIComponent((rec.title || "Anime").substring(0, 30));
              posterUrl = `https://placehold.co/600x900/ECB091/321D0B/png?text=${encodedTitle}&font=roboto`;
              console.log(`[Better Database Matching] 📝 Using fallback placeholder: ${rec.title}`);
            }
          } catch (error: any) {
            console.error(`[Better Database Matching] External fetch error for "${rec.title}":`, error.message);
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
          moodMatchScore: rec.moodMatchScore || 7,
          genres: Array.isArray(rec.genres) ? rec.genres : [],
          emotionalTags: Array.isArray(rec.emotionalTags) ? rec.emotionalTags : [],
          studios: Array.isArray(rec.studios) ? rec.studios : [],
          themes: Array.isArray(rec.themes) ? rec.themes : [],
        } as RecommendationWithDatabase;
      })
    );
    
    enhancedRecommendations.push(...batchResults);
    
    if (i + concurrentLimit < recommendations.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  const dbHits = enhancedRecommendations.filter((rec: RecommendationWithDatabase) => rec.foundInDatabase).length;
  const realPostersFound = enhancedRecommendations.filter((rec: RecommendationWithDatabase) => 
    rec.posterUrl && !rec.posterUrl.includes('placehold.co')
  ).length;
  
  console.log(`[Better Database Matching] ✅ Complete! DB hits: ${dbHits}/${recommendations.length}, Real posters: ${realPostersFound}/${recommendations.length}`);
  
  return enhancedRecommendations;
};

// Update the getEnhancedRecommendationsByMoodTheme to use better matching
// ... existing code ...

// Utility function to validate poster URLs
function isValidPosterUrl(posterUrl: string | undefined | null): boolean {
  if (!posterUrl) return false;
  if (posterUrl.includes('placehold.co')) return false;
  if (posterUrl.includes('placeholder')) return false;
  if (!posterUrl.startsWith('https://')) return false;
  if (posterUrl === "PLACEHOLDER") return false;
  return true;
}

// --- AI Character Enrichment Action ---

// Helper: simple HTML stripper for AniList descriptions
function stripHtmlToText(html?: string): string | undefined {
  if (!html) return undefined;
  return html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

// Helper: normalize names for fuzzy matching
function normalizeName(s?: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

type GroundTruth = {
  title?: string;
  descriptionText?: string;
  characters: Array<{
    id?: number;
    name?: string;
    role?: string;
    description?: string;
    age?: string;
    gender?: string;
  }>;
};

// Fetch minimal ground truth from AniList by anime title
async function fetchAniListGroundTruth(animeName: string): Promise<GroundTruth | null> {
  try {
    const query = `query ($search: String) {
      Media(search: $search, type: ANIME) {
        title { userPreferred }
        description
        characters(sort: [ROLE, RELEVANCE, ID], page: 1, perPage: 25) {
          edges {
            role
            node { id name { userPreferred full } description age gender }
          }
        }
      }
    }`;
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { search: animeName } }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const media = data?.data?.Media;
    if (!media) return null;
    const descriptionText = stripHtmlToText(media.description);
    const characters = (media?.characters?.edges || []).map((e: any) => ({
      id: e?.node?.id,
      name: e?.node?.name?.userPreferred || e?.node?.name?.full,
      role: e?.role,
      description: stripHtmlToText(e?.node?.description),
      age: e?.node?.age,
      gender: e?.node?.gender,
    }));
    return { title: media?.title?.userPreferred, descriptionText, characters };
  } catch (e) {
    console.error('[GroundTruth] AniList fetch failed:', e);
    return null;
  }
}

function findCharacterTruth(gt: GroundTruth | null, characterName: string) {
  if (!gt) return undefined;
  const target = normalizeName(characterName);
  let best: any;
  for (const c of gt.characters) {
    const n = normalizeName(c.name);
    if (n === target) return c;
    if (!best && (n.includes(target) || target.includes(n))) best = c;
  }
  return best;
}

// Lightweight web context: fetch character info via Jikan (MAL)
async function fetchWebCharacterContext(characterName: string, animeName?: string): Promise<{ source: string; snippets: string[] } | null> {
  try {
    const res = await fetch(`https://api.jikan.moe/v4/characters?q=${encodeURIComponent(characterName)}&limit=5&sfw`);
    if (!res.ok) return null;
    const data = await res.json();
    const entries: any[] = data?.data || [];
    const normalizedAnime = normalizeName(animeName);
    const pick = entries.find(e => {
      const about = (e?.about || "") as string;
      const titles = [e?.name, ...(e?.nicknames || [])].filter(Boolean).join(" ");
      const mediaRefs = (e?.anime || []).map((a: any) => a?.anime?.title).filter(Boolean) as string[];
      const inAnime = normalizedAnime ? mediaRefs.some(t => normalizeName(t).includes(normalizedAnime)) : true;
      return inAnime || normalizeName(titles).includes(normalizedAnime);
    }) || entries[0];

    if (!pick) return null;
    const about = (pick?.about || "").toString();
    const mediaRefs = (pick?.anime || []).map((a: any) => a?.anime?.title).filter(Boolean) as string[];
    const snippets: string[] = [];
    if (about) snippets.push(about.slice(0, 1800));
    if (mediaRefs?.length) snippets.push(`Known anime: ${mediaRefs.slice(0, 10).join(", ")}`);
    return { source: "jikan", snippets };
  } catch (e) {
    console.error('[WebContext] Jikan fetch failed:', e);
    return null;
  }
}

// Open web-first context: prefer Wikipedia summaries (public encyclopedic content)
// Returns short text snippets to ground AI prompts without embedding copyrighted full texts
async function fetchOpenWebCharacterContext(characterName: string, animeName?: string): Promise<{ source: string; snippets: string[] } | null> {
  try {
    const query = `${characterName} ${animeName ? animeName + ' ' : ''}character`;
    // 1) Search Wikipedia for the most relevant page
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srprop=snippet&utf8=1&format=json&srlimit=3&srsearch=${encodeURIComponent(query)}`;
    const searchRes = await fetch(searchUrl, { method: 'GET', headers: { 'Accept': 'application/json' } });
    if (!searchRes.ok) return null;
    const searchJson: any = await searchRes.json();
    const hits: any[] = searchJson?.query?.search || [];
    if (!hits.length) return null;

    // Heuristic: pick the first hit that mentions the anime or the word "character"
    const normalizedAnime = normalizeName(animeName);
    const pick = hits.find(h => {
      const title = normalizeName(h?.title);
      const snippet = normalizeName(h?.snippet);
      const hasAnime = normalizedAnime ? (title.includes(normalizedAnime) || snippet.includes(normalizedAnime)) : true;
      return hasAnime && (title.includes(normalizeName(characterName)) || snippet.includes('character'));
    }) || hits[0];

    if (!pick?.pageid) return null;

    // 2) Fetch plaintext extract for the selected page
    const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&format=json&pageids=${pick.pageid}`;
    const extractRes = await fetch(extractUrl, { method: 'GET', headers: { 'Accept': 'application/json' } });
    if (!extractRes.ok) return null;
    const extractJson: any = await extractRes.json();
    const page = extractJson?.query?.pages?.[pick.pageid];
    const extract: string = (page?.extract || '').toString().trim();
    if (!extract) return null;

    // Limit to a safe snippet length to avoid long prompts and respect fair use
    const maxLen = 1800;
    const snippet = extract.length > maxLen ? extract.slice(0, maxLen) : extract;
    const snippets = [snippet];
    return { source: 'wikipedia', snippets };
  } catch (e) {
    console.error('[WebContext] Wikipedia fetch failed:', e);
    return null;
  }
}

export const fetchEnrichedCharacterDetails = action({
  args: {
    characterName: v.string(),
    animeName: v.string(),
    existingData: v.object({
      description: v.optional(v.string()),
      role: v.optional(v.string()),
      gender: v.optional(v.string()),
      age: v.optional(v.string()),
      species: v.optional(v.string()),
      powersAbilities: v.optional(v.array(v.string())),
      voiceActors: v.optional(v.array(v.object({
        id: v.optional(v.number()),
        name: v.string(),
        language: v.string(),
        imageUrl: v.optional(v.string()),
      }))),
    }),
    enrichmentLevel: v.union(v.literal("basic"), v.literal("detailed")),
    messageId: v.string(),
    includeAdvancedAnalysis: v.optional(v.boolean()),
  },
  returns: v.object({
    error: v.union(v.string(), v.null()),
    // Simplified to avoid deep type instantiation issues in TS
    mergedCharacter: v.union(v.any(), v.null()),
  }),
  handler: async (ctx, args) => {
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      return { error: "OpenAI API key not configured.", mergedCharacter: null };
    }

    // Create cache key based on character and anime
  const cacheKey = `character_enrichment:${args.animeName}:${args.characterName}:${args.enrichmentLevel}:${args.includeAdvancedAnalysis ? 'advanced' : 'basic'}:groundedV1`;
    
    console.log(`[Character Enrichment] Checking cache for: ${cacheKey}`);
    
    // Check cache first
    const cachedResult = await ctx.runQuery(internal.aiCache.getCache, { key: cacheKey });
    if (cachedResult) {
      console.log(`[Character Enrichment] Cache hit for ${args.characterName} from ${args.animeName}`);
      return { 
        error: null, 
        mergedCharacter: { 
          ...cachedResult,
          cached: true 
        } 
      };
    }

    console.log(`[Character Enrichment] Cache miss, preparing ground truth for ${args.characterName} from ${args.animeName}`);

    // Fetch ground truth from AniList to reduce hallucinations
    const groundTruth = await fetchAniListGroundTruth(args.animeName);
    const characterTruth = findCharacterTruth(groundTruth, args.characterName);
    const allowedNames = new Set((groundTruth?.characters || []).map(c => c.name).filter(Boolean));
    if (groundTruth && (groundTruth.characters?.length || 0) > 0 && !characterTruth) {
      console.warn(`[Character Enrichment] Abort: character not found in AniList for anime.`, { anime: args.animeName, character: args.characterName });
      return { error: "Character not found for this anime (AniList grounds).", mergedCharacter: null };
    }

    // Enhanced system prompt for comprehensive character enrichment
    let systemPrompt = `You are AniMuse AI, an expert anime character analyst and database curator. Your task is to create ACCURATE, NON-FABRICATED character data for "${args.characterName}" from "${args.animeName}".

GROUND_TRUTH (authoritative facts; do not invent beyond these):
${JSON.stringify({
  anime: groundTruth?.title || args.animeName,
  animeSynopsis: groundTruth?.descriptionText?.slice(0, 1200),
  character: characterTruth || { name: args.characterName },
  knownCharacters: (groundTruth?.characters || []).map(c => ({ name: c.name, role: c.role }))
}, null, 2)}

STRICT RULES:
- Do NOT add facts not supported by GROUND_TRUTH or existingData.
- If a specific detail is unknown, use "Unknown" or omit that detail.
- Relationships may ONLY reference characters in knownCharacters by exact name.
- Avoid fabricating quotes, dates, abilities, or events.
- Keep analysis grounded in the synopsis and character description.

Your analysis should be thoughtful yet strictly factual. If content would be speculative, keep it general and avoid specifics.

ENRICHMENT LEVEL: ${args.enrichmentLevel}
ANIME CONTEXT: ${args.animeName}
CHARACTER: ${args.characterName}
EXISTING DATA: ${JSON.stringify(args.existingData, null, 2)}

REQUIRED OUTPUT FORMAT (JSON object with ALL fields filled comprehensively):

{
  "personalityAnalysis": "EXTENSIVE personality analysis (minimum 150 words) covering: character traits, behavioral patterns, psychological motivations, emotional intelligence, social dynamics, decision-making style, fears and desires, moral compass, communication style, and unique personality quirks. Be thorough and insightful.",
  
  "keyRelationships": [
    {
      "relatedCharacterName": "Character name",
      "relationshipDescription": "Detailed description of the relationship dynamics, emotional connection, and interaction patterns (minimum 80 words per relationship)",
      "relationType": "friend/enemy/lover/mentor/student/family/rival/ally/mentor/mentee/etc"
    }
  ],
  
  "detailedAbilities": [
    {
      "abilityName": "Specific ability name",
      "abilityDescription": "Comprehensive description of the ability including: how it works, limitations, power level, usage conditions, development over time, and strategic applications (minimum 100 words per ability)",
      "powerLevel": "Novice/Average/Skilled/Expert/Master/Legendary/God-tier"
    }
  ],
  
  "majorCharacterArcs": [
    "Detailed description of major story arcs involving this character (minimum 60 words per arc)"
  ],
  
  "trivia": [
    "Interesting fact 1 (detailed explanation)",
    "Interesting fact 2 (detailed explanation)", 
    "Interesting fact 3 (detailed explanation)",
    "Interesting fact 4 (detailed explanation)",
    "Interesting fact 5 (detailed explanation)",
    "Interesting fact 6 (detailed explanation)",
    "Interesting fact 7 (detailed explanation)",
    "Interesting fact 8 (detailed explanation)"
  ],
  
  "backstoryDetails": "COMPREHENSIVE backstory analysis (minimum 200 words) covering: origin story, family background, formative experiences, traumatic events, achievements, failures, relationships that shaped them, and how their past influences their present behavior and motivations.",
  
  "characterDevelopment": "EXTENSIVE character development analysis (minimum 150 words) covering: growth trajectory, key turning points, lessons learned, changes in worldview, skill development, relationship evolution, and how they've changed from beginning to end.",
  
  "notableQuotes": [
    "Memorable quote 1 with context",
    "Memorable quote 2 with context",
    "Memorable quote 3 with context",
    "Memorable quote 4 with context",
    "Memorable quote 5 with context"
  ],
  
  "symbolism": "Detailed analysis of what this character represents symbolically, including: themes they embody, metaphors they represent, cultural significance, and deeper meanings in the story (minimum 120 words).",
  
  "fanReception": "Comprehensive analysis of how fans perceive this character, including: popularity trends, fan theories, controversies, memes, cosplay popularity, and cultural impact (minimum 100 words).",
  
  "culturalSignificance": "Detailed analysis of the character's cultural impact and significance, including: influence on anime culture, representation of certain archetypes, impact on storytelling, and broader cultural relevance (minimum 120 words)."
}

CRITICAL REQUIREMENTS:
1. EVERY field must be filled with substantial, detailed content
2. Minimum word counts must be met for all text fields
3. Provide at least 5-8 detailed trivia facts
4. Include at least 3-5 detailed abilities for every character
5. Cover at least 3-5 major character arcs
6. Include at least 5 notable quotes with context
7. Be specific, insightful, and avoid generic descriptions
8. Use the anime context to make content relevant and accurate
9. Even for minor characters, provide comprehensive analysis
10. Focus on unique aspects that make this character memorable

For abilities analysis:
- Combat characters: Include fighting techniques, special powers, weapons mastery, strategic thinking
- Non-combat characters: Include intellectual abilities, social skills, talents, leadership qualities, emotional intelligence
- Every character has abilities worth analyzing in detail
- Rate power levels accurately based on their demonstrated capabilities

Output ONLY the JSON object, no extra text or explanations.`;

  const userPrompt = `Create grounded character data for "${args.characterName}" from "${args.animeName}". Only use facts present in GROUND_TRUTH or existingData; otherwise, keep content high-level and non-specific.`;

    try {
      const openai = new OpenAI({ apiKey: process.env.CONVEX_OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: ENRICHMENT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
  temperature: 0
      });
      const content = completion.choices[0].message.content;
      console.log(`[Character Enrichment] AI Response length: ${content?.length || 0} characters`);
      
      let mergedCharacter: any = null;
      try {
        mergedCharacter = JSON.parse(content || "null");
        console.log(`[Character Enrichment] Successfully parsed AI response for ${args.characterName}`);
        console.log(`[Character Enrichment] Generated fields: ${Object.keys(mergedCharacter || {}).join(', ')}`);
        
        // Enhanced field validation and logging
        const fieldsCheck = {
          hasPersonalityAnalysis: !!mergedCharacter?.personalityAnalysis,
          personalityLength: mergedCharacter?.personalityAnalysis?.length || 0,
          hasTrivia: Array.isArray(mergedCharacter?.trivia) && mergedCharacter.trivia.length > 0,
          triviaCount: mergedCharacter?.trivia?.length || 0,
          hasDetailedAbilities: Array.isArray(mergedCharacter?.detailedAbilities) && mergedCharacter.detailedAbilities.length > 0,
          abilitiesCount: mergedCharacter?.detailedAbilities?.length || 0,
          hasBackstory: !!mergedCharacter?.backstoryDetails,
          backstoryLength: mergedCharacter?.backstoryDetails?.length || 0,
          hasCharacterDevelopment: !!mergedCharacter?.characterDevelopment,
          developmentLength: mergedCharacter?.characterDevelopment?.length || 0,
          hasQuotes: Array.isArray(mergedCharacter?.notableQuotes) && mergedCharacter.notableQuotes.length > 0,
          quotesCount: mergedCharacter?.notableQuotes?.length || 0,
          hasArcs: Array.isArray(mergedCharacter?.majorCharacterArcs) && mergedCharacter.majorCharacterArcs.length > 0,
          arcsCount: mergedCharacter?.majorCharacterArcs?.length || 0,
          abilityNames: mergedCharacter?.detailedAbilities?.map((a: any) => a.abilityName) || []
        };
        console.log(`[Character Enrichment] Comprehensive field check for ${args.characterName}:`, fieldsCheck);
        
  // Enhanced validation warnings
        if (!mergedCharacter?.detailedAbilities || mergedCharacter.detailedAbilities.length === 0) {
          console.warn(`[Character Enrichment] WARNING: No detailed abilities generated for ${args.characterName}`);
        }
        if (!mergedCharacter?.trivia || mergedCharacter.trivia.length < 5) {
          console.warn(`[Character Enrichment] WARNING: Insufficient trivia generated for ${args.characterName} (${mergedCharacter?.trivia?.length || 0} items)`);
        }
        if (!mergedCharacter?.personalityAnalysis || mergedCharacter.personalityAnalysis.length < 150) {
          console.warn(`[Character Enrichment] WARNING: Personality analysis too short for ${args.characterName} (${mergedCharacter?.personalityAnalysis?.length || 0} chars)`);
        }
        
      } catch (e) {
        console.error(`[Character Enrichment] JSON parse error for ${args.characterName}:`, e);
        console.error(`[Character Enrichment] Raw content:`, content);
        return { error: "Failed to parse AI response as JSON.", mergedCharacter: null };
      }

      // Filter relationships to known characters only (from ground truth)
      if (mergedCharacter && Array.isArray(mergedCharacter.keyRelationships)) {
        mergedCharacter.keyRelationships = mergedCharacter.keyRelationships.filter((rel: any) => rel?.relatedCharacterName && allowedNames.has(rel.relatedCharacterName));
      }

      // If advanced analysis is requested, add relationship and timeline data
      if (args.includeAdvancedAnalysis && mergedCharacter) {
        try {
          // Get relationship analysis (with separate caching)
          const relationshipResult = await ctx.runAction(api.ai.analyzeCharacterRelationships, {
            characterName: args.characterName,
            animeName: args.animeName,
            messageId: `${args.messageId}_relationships`,
          });

          // Get timeline analysis (with separate caching)
          const timelineResult = await ctx.runAction(api.ai.getCharacterDevelopmentTimeline, {
            characterName: args.characterName,
            animeName: args.animeName,
            includeArcs: true,
            messageId: `${args.messageId}_timeline`,
          });

          // Add the advanced analysis data to the merged character
          if (!relationshipResult.error && relationshipResult.relationships) {
            (mergedCharacter as any).advancedRelationships = relationshipResult.relationships;
          }

          if (!timelineResult.error && timelineResult.timeline) {
            (mergedCharacter as any).developmentTimeline = timelineResult.timeline;
          }
        } catch (advancedError) {
          console.warn("Advanced analysis failed, continuing with basic enrichment:", advancedError);
        }
      }

      // Cache the result for 7 days (604800000 ms)
      if (mergedCharacter) {
        await ctx.runMutation(internal.aiCache.setCache, {
          key: cacheKey,
          value: mergedCharacter,
          ttl: 604800000, // 7 days
        });
        console.log(`[Character Enrichment] Cached result for ${args.characterName} from ${args.animeName}`);
      }

      return { error: null, mergedCharacter: { ...mergedCharacter, cached: false } };
    } catch (err: any) {
      return { error: err.message || "OpenAI error.", mergedCharacter: null };
    }
  },
});

// AI Character Relationship Analysis
export const analyzeCharacterRelationships = action({
  args: {
    characterName: v.string(),
    animeName: v.string(),
    messageId: v.string(),
  },
  returns: v.object({
    relationships: v.array(v.object({
      characterName: v.string(),
      relationshipType: v.string(),
      emotionalDynamics: v.string(),
      keyMoments: v.optional(v.array(v.string())),
      relationshipEvolution: v.optional(v.string()),
      impactOnStory: v.optional(v.string()),
    })),
    error: v.union(v.string(), v.null()),
    cached: v.optional(v.boolean()),
  }),
  handler: async (ctx, args) => {
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      return { relationships: [], error: "OpenAI API key not configured." };
    }

    // Create cache key for relationships
    const cacheKey = `character_relationships:${args.animeName}:${args.characterName}:groundedV1`;
    console.log(`[Character Relationships] Checking cache for: ${cacheKey}`);

    // Check cache first
    const cachedResult = await ctx.runQuery(internal.aiCache.getCache, { key: cacheKey });
    if (cachedResult) {
      console.log(`[Character Relationships] Cache hit for ${args.characterName} from ${args.animeName}`);
      return { relationships: cachedResult, error: null, cached: true };
    }

    // Cache miss: queue background generation
    console.log(`[Character Relationships] Cache miss; queuing background generation and returning instantly`);
    await ctx.scheduler.runAfter(0, internal.ai.generateCharacterRelationshipsInBackground, {
      characterName: args.characterName,
      animeName: args.animeName,
      cacheKey,
    });

    // Briefly poll cache for a short window so first call can get results if fast
    const start = Date.now();
    const timeoutMs = 2500; // up to ~2.5s
    const intervalMs = 300;
    try {
      while (Date.now() - start < timeoutMs) {
        await new Promise((r) => setTimeout(r, intervalMs));
        const polled = await ctx.runQuery(internal.aiCache.getCache, { key: cacheKey });
        if (polled && Array.isArray(polled) && polled.length > 0) {
          return { relationships: polled, error: null, cached: true };
        }
      }
    } catch {}
    return { relationships: [], error: null, cached: false };
  },
});

// Background worker to generate and cache relationships for all users
export const generateCharacterRelationshipsInBackground = internalAction({
  args: { characterName: v.string(), animeName: v.string(), cacheKey: v.string() },
  handler: async (ctx, args) => {
    try {
      console.log(`[Character Relationships BG] Generating in background for ${args.characterName} / ${args.animeName}`);
      const groundTruth = await fetchAniListGroundTruth(args.animeName);
      const knownCharacters = (groundTruth?.characters || []).map(c => c.name).filter(Boolean) as string[];
      // Web-first context: prefer open web (Wikipedia), then fall back to external APIs
      const webCtx = (await fetchOpenWebCharacterContext(args.characterName, args.animeName))
        || (await fetchWebCharacterContext(args.characterName, args.animeName));

      const systemPrompt = `You are AniMuse AI, an expert at analyzing anime character relationships and dynamics. Do not fabricate.

KNOWN_CHARACTERS (the only allowed relationship targets):
${JSON.stringify(knownCharacters, null, 2)}

WEB CONTEXT (supplemental):
${JSON.stringify(webCtx, null, 2)}

TASK: Create a COMPREHENSIVE and DETAILED analysis of the relationships of "${args.characterName}" from "${args.animeName}".

Focus on providing EXTENSIVE insights into:
1. Key relationships with other characters (both major and minor)
2. Complex emotional dynamics and power balances
3. Character development through relationships
4. Impact of relationships on the overall story and plot
5. Character chemistry and interaction patterns
6. Relationship conflicts and resolutions
7. Trust dynamics and loyalty patterns
8. Communication styles between characters
9. Shared experiences and bonding moments
10. Relationship influence on character decisions

Output JSON: {
  "relationships": [
    {
      "characterName": "Name of related character",
      "relationshipType": "friend/enemy/lover/mentor/student/family/rival/ally/mentor/mentee/comrade/partner/guardian/ward/etc",
      "emotionalDynamics": "COMPREHENSIVE description of emotional relationship including: trust levels, emotional dependency, conflict patterns, mutual understanding, and psychological impact (minimum 120 words)",
      "keyMoments": ["Detailed important moment 1", "Detailed important moment 2", "Detailed important moment 3", "Detailed important moment 4"],
      "relationshipEvolution": "DETAILED analysis of how the relationship changes throughout the story, including: initial impressions, development phases, turning points, and final state (minimum 100 words)",
      "impactOnStory": "COMPREHENSIVE analysis of how this relationship affects the plot, including: plot developments, character motivations, story conflicts, and narrative progression (minimum 100 words)"
    }
  ]
}

RESTRICTIONS:
- You MUST only use names from KNOWN_CHARACTERS. Do NOT invent, alias, or introduce characters not in this list.
- If uncertain, keep descriptions high-level and avoid specifics.
Be specific, insightful, and provide deep psychological analysis while staying factual.`;

      const userPrompt = `Create a COMPREHENSIVE analysis of the relationships of "${args.characterName}" from "${args.animeName}". Focus on the most significant relationships and provide detailed insights into emotional dynamics, character development, and story impact.`;

      const openai = new OpenAI({ apiKey: process.env.CONVEX_OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: ENRICHMENT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2
      });
      const content = completion.choices[0].message.content;
      const result = JSON.parse(content || "{}");
      let relationships = result.relationships || [];
      // Strict filtering to AniList-known characters with normalization mapping
      const canonicalByNorm = new Map<string, string>(
        knownCharacters.map((n) => [normalizeName(n), n])
      );
      relationships = (relationships as any[])
        .filter((rel) => rel && typeof rel.characterName === 'string')
        .map((rel) => {
          const norm = normalizeName(rel.characterName);
          const canonical = canonicalByNorm.get(norm);
          return canonical ? { ...rel, characterName: canonical } : null;
        })
        .filter((rel): rel is any => !!rel);

      if (relationships.length > 0) {
        await ctx.runMutation(internal.aiCache.setCache, { key: args.cacheKey, value: relationships, ttl: 604800000 });
        console.log(`[Character Relationships BG] Cached relationships for ${args.characterName}`);
      }
    } catch (e) {
      console.error('[Character Relationships BG] Failed:', e);
    }
  },
});

// AI Character Development Timeline
export const getCharacterDevelopmentTimeline = action({
  args: {
    characterName: v.string(),
    animeName: v.string(),
    includeArcs: v.optional(v.boolean()),
    messageId: v.string(),
  },
  returns: v.object({
    timeline: v.array(v.object({
      phase: v.string(),
      description: v.string(),
      characterState: v.string(),
      keyEvents: v.optional(v.array(v.string())),
      characterGrowth: v.optional(v.string()),
      challenges: v.optional(v.string()),
      relationships: v.optional(v.string()),
    })),
    error: v.union(v.string(), v.null()),
    cached: v.optional(v.boolean()),
  }),
  handler: async (ctx, args) => {
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      return { timeline: [], error: "OpenAI API key not configured." };
    }

    // Create cache key for timeline
    const cacheKey = `character_timeline:${args.animeName}:${args.characterName}:${args.includeArcs ? 'arcs' : 'basic'}:groundedV1`;
    console.log(`[Character Timeline] Checking cache for: ${cacheKey}`);

    // Check cache first
    const cachedResult = await ctx.runQuery(internal.aiCache.getCache, { key: cacheKey });
    if (cachedResult) {
      console.log(`[Character Timeline] Cache hit for ${args.characterName} from ${args.animeName}`);
      return { timeline: cachedResult, error: null, cached: true };
    }

    // Cache miss: queue background generation
    console.log(`[Character Timeline] Cache miss; queuing background generation and returning instantly`);
    await ctx.scheduler.runAfter(0, internal.ai.generateCharacterTimelineInBackground, {
      characterName: args.characterName,
      animeName: args.animeName,
      includeArcs: !!args.includeArcs,
      cacheKey,
    });

    // Briefly poll cache for a short window so first call can get results if fast
    const start = Date.now();
    const timeoutMs = 2500; // up to ~2.5s
    const intervalMs = 300;
    try {
      while (Date.now() - start < timeoutMs) {
        await new Promise((r) => setTimeout(r, intervalMs));
        const polled = await ctx.runQuery(internal.aiCache.getCache, { key: cacheKey });
        if (polled && Array.isArray(polled) && polled.length > 0) {
          return { timeline: polled, error: null, cached: true };
        }
      }
    } catch {}
    return { timeline: [], error: null, cached: false };
  },
});

// Background worker to generate and cache timeline for all users
export const generateCharacterTimelineInBackground = internalAction({
  args: { characterName: v.string(), animeName: v.string(), includeArcs: v.boolean(), cacheKey: v.string() },
  handler: async (ctx, args) => {
    try {
      console.log(`[Character Timeline BG] Generating in background for ${args.characterName} / ${args.animeName}`);
  const groundTruth = await fetchAniListGroundTruth(args.animeName);
  const synopsis = groundTruth?.descriptionText?.slice(0, 1500) || '';
  const knownCharacters = (groundTruth?.characters || []).map(c => c.name).filter(Boolean) as string[];
      // Web-first context: prefer open web (Wikipedia), then fall back to external APIs
      const webCtx = (await fetchOpenWebCharacterContext(args.characterName, args.animeName))
        || (await fetchWebCharacterContext(args.characterName, args.animeName));

      const systemPrompt = `You are AniMuse AI, an expert at analyzing character development and story arcs. Do not fabricate events beyond trusted sources.

OFFICIAL SYNOPSIS (AniList):
${synopsis}

WEB CONTEXT (supplemental):
${JSON.stringify(webCtx, null, 2)}

KNOWN CHARACTERS (AniList):
${JSON.stringify(knownCharacters, null, 2)}

TASK: Create a COMPREHENSIVE and DETAILED character development timeline for "${args.characterName}" from "${args.animeName}".

Focus on providing EXTENSIVE insights into:
1. Character's initial state, introduction, and first impressions
2. Key development moments and major turning points
3. Character growth, changes, and evolution throughout the story
4. Major challenges, obstacles, and how they're overcome
5. Final character state, resolution, and ultimate transformation
6. Character arcs and story progression (if requested)
7. Psychological development and mindset changes
8. Skill development and capability growth
9. Relationship development and social growth
10. Moral and ethical development
11. Personal goals and motivations evolution
12. Character's impact on the world around them

Output JSON: {
  "timeline": [
    {
      "phase": "Introduction/Early Story/Mid-Story/Climax/Resolution/etc",
      "description": "COMPREHENSIVE description of what happens in this phase, including major events, plot developments, and character actions (minimum 120 words)",
      "characterState": "DETAILED analysis of how the character is at this point, including: personality traits, emotional state, skills, relationships, motivations, and worldview (minimum 100 words)",
      "keyEvents": ["Detailed event 1", "Detailed event 2", "Detailed event 3", "Detailed event 4", "Detailed event 5"],
      "characterGrowth": "EXTENSIVE analysis of how the character develops in this phase, including: lessons learned, skills gained, relationships formed, mindset changes, and personal evolution (minimum 100 words)",
      "challenges": "COMPREHENSIVE description of challenges faced in this phase, including: internal struggles, external obstacles, conflicts, failures, and how they're addressed (minimum 80 words)",
      "relationships": "DETAILED analysis of how relationships develop in this phase, including: new connections, relationship changes, conflicts, resolutions, and social dynamics (minimum 80 words)"
    }
  ]
}

RESTRICTIONS:
- Keep events consistent with OFFICIAL SYNOPSIS and WEB CONTEXT. If details are unclear or conflicting, prefer synopsis and keep statements high-level.
- Only reference character names from KNOWN_CHARACTERS. Do NOT invent or alias names not present in the list.
- Do not invent specific scenes, dates, or quotes.
Be specific, insightful, and provide deep analysis while remaining factual.`;

      const userPrompt = `Create a COMPREHENSIVE character development timeline for "${args.characterName}" from "${args.animeName}". Focus on detailed phases that show the character's complete journey from introduction to resolution, including all major developments and transformations.`;

      const openai = new OpenAI({ apiKey: process.env.CONVEX_OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: ENRICHMENT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2
      });
      const content = completion.choices[0].message.content;
      const parsed = JSON.parse(content || "{}");
      let timeline = parsed.timeline || [];
      // Defensive filtering: if the model returns a relatedCharacters array per phase, restrict it to known AniList names
      if (Array.isArray(timeline) && knownCharacters.length) {
        const canonicalByNorm = new Map<string, string>(
          knownCharacters.map((n) => [normalizeName(n), n])
        );
        timeline = timeline.map((phase: any) => {
          if (phase && Array.isArray(phase.relatedCharacters)) {
            phase.relatedCharacters = phase.relatedCharacters
              .map((n: string) => canonicalByNorm.get(normalizeName(n)) ?? null)
              .filter(Boolean);
          }
          // Backward/UI compatibility: expose keyDevelopments if only keyEvents provided
          if (Array.isArray(phase?.keyEvents) && !Array.isArray(phase?.keyDevelopments)) {
            phase.keyDevelopments = phase.keyEvents;
          }
          return phase;
        });
      }
      if (timeline.length > 0) {
        await ctx.runMutation(internal.aiCache.setCache, { key: args.cacheKey, value: timeline, ttl: 604800000 });
        console.log(`[Character Timeline BG] Cached timeline for ${args.characterName}`);
      }
    } catch (e) {
      console.error('[Character Timeline BG] Failed:', e);
    }
  },
});

// --- Comprehensive Character Enrichment Action ---
export const fetchComprehensiveCharacterDetails = action({
  args: {
    characterName: v.string(),
    animeName: v.string(),
    existingData: v.object({
      description: v.optional(v.string()),
      role: v.optional(v.string()),
      gender: v.optional(v.string()),
      age: v.optional(v.string()),
      species: v.optional(v.string()),
      powersAbilities: v.optional(v.array(v.string())),
      voiceActors: v.optional(v.array(v.object({
        id: v.optional(v.number()),
        name: v.string(),
        language: v.string(),
        imageUrl: v.optional(v.string()),
      }))),
    }),
    messageId: v.string(),
  },
  returns: v.object({
    error: v.union(v.string(), v.null()),
    // Use any to avoid excessive type instantiation depth for this very large structure
    comprehensiveCharacter: v.union(v.any(), v.null()),
  }),
  handler: async (ctx, args) => {
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      return { error: "OpenAI API key not configured.", comprehensiveCharacter: null };
    }

  // Create cache key for comprehensive enrichment
  const cacheKey = `comprehensive_character:${args.animeName}:${args.characterName}:groundedV1`;
    
    console.log(`[Comprehensive Character] Checking cache for: ${cacheKey}`);
    
    // Check cache first
    const cachedResult = await ctx.runQuery(internal.aiCache.getCache, { key: cacheKey });
    if (cachedResult) {
      console.log(`[Comprehensive Character] Cache hit for ${args.characterName} from ${args.animeName}`);
      return { 
        error: null, 
        comprehensiveCharacter: { 
          ...cachedResult,
          cached: true 
        } 
      };
    }

    console.log(`[Comprehensive Character] Cache miss, preparing ground truth for ${args.characterName} from ${args.animeName}`);

    // Fetch ground truth to constrain comprehensive enrichment
    const groundTruth = await fetchAniListGroundTruth(args.animeName);
    const characterTruth = findCharacterTruth(groundTruth, args.characterName);
    const allowedNames = new Set((groundTruth?.characters || []).map(c => c.name).filter(Boolean));
    if (groundTruth && (groundTruth.characters?.length || 0) > 0 && !characterTruth) {
      return { error: "Character not found for this anime (AniList grounds).", comprehensiveCharacter: null };
    }

    // Comprehensive system prompt for all character aspects
  const systemPrompt: string = `You are AniMuse AI, an expert anime character analyst and database curator. Provide comprehensive, accurate, and non-fabricated analysis for "${args.characterName}" from "${args.animeName}".

GROUND_TRUTH (authoritative facts; do not invent beyond these):
${JSON.stringify({
  anime: groundTruth?.title || args.animeName,
  animeSynopsis: groundTruth?.descriptionText?.slice(0, 1200),
  character: characterTruth || { name: args.characterName },
  knownCharacters: (groundTruth?.characters || []).map(c => ({ name: c.name, role: c.role }))
}, null, 2)}

This will be the definitive character profile for a comprehensive anime database. Generate EXTENSIVE data covering every aspect of the character, while staying within GROUND_TRUTH and EXISTING DATA. If details are unclear, keep them high-level and avoid specifics.

ANIME CONTEXT: ${args.animeName}
CHARACTER: ${args.characterName}
EXISTING DATA: ${JSON.stringify(args.existingData, null, 2)}

REQUIRED OUTPUT FORMAT (JSON object with ALL fields filled comprehensively):

{
  "personalityAnalysis": "EXTENSIVE personality analysis (minimum 200 words) covering: character traits, behavioral patterns, psychological motivations, emotional intelligence, social dynamics, decision-making style, fears and desires, moral compass, communication style, and unique personality quirks.",
  
  "keyRelationships": [
    {
      "relatedCharacterName": "Character name",
      "relationshipDescription": "Detailed description of the relationship dynamics, emotional connection, and interaction patterns (minimum 100 words per relationship)",
      "relationType": "friend/enemy/lover/mentor/student/family/rival/ally/mentor/mentee/etc"
    }
  ],
  
  "detailedAbilities": [
    {
      "abilityName": "Specific ability name",
      "abilityDescription": "Comprehensive description of the ability including: how it works, limitations, power level, usage conditions, development over time, and strategic applications (minimum 120 words per ability)",
      "powerLevel": "Novice/Average/Skilled/Expert/Master/Legendary/God-tier"
    }
  ],
  
  "majorCharacterArcs": [
    "Detailed description of major story arcs involving this character (minimum 80 words per arc)"
  ],
  
  "trivia": [
    "Interesting fact 1 (detailed explanation)",
    "Interesting fact 2 (detailed explanation)", 
    "Interesting fact 3 (detailed explanation)",
    "Interesting fact 4 (detailed explanation)",
    "Interesting fact 5 (detailed explanation)",
    "Interesting fact 6 (detailed explanation)",
    "Interesting fact 7 (detailed explanation)",
    "Interesting fact 8 (detailed explanation)",
    "Interesting fact 9 (detailed explanation)",
    "Interesting fact 10 (detailed explanation)"
  ],
  
  "backstoryDetails": "COMPREHENSIVE backstory analysis (minimum 250 words) covering: origin story, family background, formative experiences, traumatic events, achievements, failures, relationships that shaped them, and how their past influences their present behavior and motivations.",
  
  "characterDevelopment": "EXTENSIVE character development analysis (minimum 200 words) covering: growth trajectory, key turning points, lessons learned, changes in worldview, skill development, relationship evolution, and how they've changed from beginning to end.",
  
  "notableQuotes": [
    "Memorable quote 1 with context",
    "Memorable quote 2 with context",
    "Memorable quote 3 with context",
    "Memorable quote 4 with context",
    "Memorable quote 5 with context",
    "Memorable quote 6 with context"
  ],
  
  "symbolism": "Detailed analysis of what this character represents symbolically, including: themes they embody, metaphors they represent, cultural significance, and deeper meanings in the story (minimum 150 words).",
  
  "fanReception": "Comprehensive analysis of how fans perceive this character, including: popularity trends, fan theories, controversies, memes, cosplay popularity, and cultural impact (minimum 150 words).",
  
  "culturalSignificance": "Detailed analysis of the character's cultural impact and significance, including: influence on anime culture, representation of certain archetypes, impact on storytelling, and broader cultural relevance (minimum 150 words).",
  
  "psychologicalProfile": {
    "personalityType": "MBTI type, Enneagram, or other personality classification",
    "coreFears": ["Fear 1", "Fear 2", "Fear 3", "Fear 4"],
    "coreDesires": ["Desire 1", "Desire 2", "Desire 3", "Desire 4"],
    "emotionalTriggers": ["Trigger 1", "Trigger 2", "Trigger 3"],
    "copingMechanisms": ["Mechanism 1", "Mechanism 2", "Mechanism 3"],
    "mentalHealthAspects": "Detailed analysis of mental health aspects, psychological challenges, and emotional well-being (minimum 100 words)",
    "traumaHistory": "Comprehensive analysis of traumatic experiences and their impact on character development (minimum 120 words)",
    "defenseMechanisms": ["Mechanism 1", "Mechanism 2", "Mechanism 3"]
  },
  
  "combatProfile": {
    "fightingStyle": "Detailed description of fighting style and approach to combat (minimum 80 words)",
    "preferredWeapons": ["Weapon 1", "Weapon 2", "Weapon 3"],
    "combatStrengths": ["Strength 1", "Strength 2", "Strength 3", "Strength 4"],
    "combatWeaknesses": ["Weakness 1", "Weakness 2", "Weakness 3"],
    "battleTactics": "Comprehensive analysis of battle strategies and tactical approach (minimum 100 words)",
    "powerScaling": "Detailed analysis of character's power level within the anime universe (minimum 80 words)",
    "specialTechniques": [
      {
        "name": "Technique name",
        "description": "Detailed description of the technique (minimum 60 words)",
        "powerLevel": "Power level rating",
        "limitations": "Technique limitations and drawbacks"
      }
    ]
  },
  
  "socialDynamics": {
    "socialClass": "Character's social class and economic status",
    "culturalBackground": "Cultural heritage and background",
    "socialInfluence": "Level of social influence and impact on others (minimum 80 words)",
    "leadershipStyle": "Leadership approach and style (minimum 80 words)",
    "communicationStyle": "How the character communicates and interacts (minimum 80 words)",
    "socialConnections": ["Connection 1", "Connection 2", "Connection 3", "Connection 4"],
    "reputation": "How the character is perceived by others (minimum 80 words)",
    "publicImage": "Public persona and image projection (minimum 80 words)"
  },
  
  "characterArchetype": {
    "primaryArchetype": "Main character archetype",
    "secondaryArchetypes": ["Archetype 1", "Archetype 2", "Archetype 3"],
    "characterTropes": ["Trope 1", "Trope 2", "Trope 3", "Trope 4"],
    "subvertedTropes": ["Subverted trope 1", "Subverted trope 2"],
    "characterRole": "Hero/Anti-hero/Villain/Supporting/etc",
    "narrativeFunction": "Character's function in the story (minimum 80 words)"
  },
  
  "characterImpact": {
    "influenceOnStory": "How the character drives the plot and story progression (minimum 100 words)",
    "influenceOnOtherCharacters": "Impact on other characters' development and actions (minimum 100 words)",
    "culturalImpact": "Cultural influence and significance (minimum 100 words)",
    "fanbaseReception": "How fans receive and perceive this character (minimum 100 words)",
    "merchandisePopularity": "Popularity in merchandise and collectibles",
    "cosplayPopularity": "Popularity among cosplayers",
    "memeStatus": "Meme potential and internet presence",
    "legacyInAnime": "Character's lasting impact on anime culture (minimum 100 words)"
  }
}

CRITICAL REQUIREMENTS:
1. EVERY field must be filled with substantial, detailed content
2. Minimum word counts must be met for all text fields
3. Provide at least 8-10 detailed trivia facts
4. Include at least 4-6 detailed abilities for every character
5. Cover at least 4-6 major character arcs
6. Include at least 6 notable quotes with context
7. Be specific, insightful, and avoid generic descriptions
8. Use the anime context to make content relevant and accurate
9. Even for minor characters, provide comprehensive analysis
10. Focus on unique aspects that make this character memorable
11. Include psychological depth and character complexity
12. Cover both strengths and weaknesses
13. Analyze character from multiple perspectives

Output ONLY the JSON object, no extra text or explanations.`;

  const userPrompt: string = `Create the MOST COMPREHENSIVE and DETAILED character analysis possible for "${args.characterName}" from "${args.animeName}". Generate extensive data covering every aspect of the character including psychological profile, combat analysis, social dynamics, and cultural impact.`;

    try {
      const openai = new OpenAI({ apiKey: process.env.CONVEX_OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: ENRICHMENT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2
      });
  const content: string = completion.choices[0].message.content ?? "";
      console.log(`[Comprehensive Character] AI Response length: ${content?.length || 0} characters`);
      
      let comprehensiveCharacter: any = null;
      try {
        comprehensiveCharacter = JSON.parse(content || "null");
        console.log(`[Comprehensive Character] Successfully parsed AI response for ${args.characterName}`);
        console.log(`[Comprehensive Character] Generated fields: ${Object.keys(comprehensiveCharacter || {}).join(', ')}`);
        
        // Comprehensive field validation and logging
        const fieldsCheck = {
          hasPersonalityAnalysis: !!comprehensiveCharacter?.personalityAnalysis,
          personalityLength: comprehensiveCharacter?.personalityAnalysis?.length || 0,
          hasTrivia: Array.isArray(comprehensiveCharacter?.trivia) && comprehensiveCharacter.trivia.length > 0,
          triviaCount: comprehensiveCharacter?.trivia?.length || 0,
          hasDetailedAbilities: Array.isArray(comprehensiveCharacter?.detailedAbilities) && comprehensiveCharacter.detailedAbilities.length > 0,
          abilitiesCount: comprehensiveCharacter?.detailedAbilities?.length || 0,
          hasBackstory: !!comprehensiveCharacter?.backstoryDetails,
          backstoryLength: comprehensiveCharacter?.backstoryDetails?.length || 0,
          hasCharacterDevelopment: !!comprehensiveCharacter?.characterDevelopment,
          developmentLength: comprehensiveCharacter?.characterDevelopment?.length || 0,
          hasQuotes: Array.isArray(comprehensiveCharacter?.notableQuotes) && comprehensiveCharacter.notableQuotes.length > 0,
          quotesCount: comprehensiveCharacter?.notableQuotes?.length || 0,
          hasArcs: Array.isArray(comprehensiveCharacter?.majorCharacterArcs) && comprehensiveCharacter.majorCharacterArcs.length > 0,
          arcsCount: comprehensiveCharacter?.majorCharacterArcs?.length || 0,
          hasPsychologicalProfile: !!comprehensiveCharacter?.psychologicalProfile,
          hasCombatProfile: !!comprehensiveCharacter?.combatProfile,
          hasSocialDynamics: !!comprehensiveCharacter?.socialDynamics,
          hasCharacterArchetype: !!comprehensiveCharacter?.characterArchetype,
          hasCharacterImpact: !!comprehensiveCharacter?.characterImpact,
          abilityNames: comprehensiveCharacter?.detailedAbilities?.map((a: any) => a.abilityName) || []
        };
        console.log(`[Comprehensive Character] Complete field check for ${args.characterName}:`, fieldsCheck);
        
        // Enhanced validation warnings
        if (!comprehensiveCharacter?.detailedAbilities || comprehensiveCharacter.detailedAbilities.length < 4) {
          console.warn(`[Comprehensive Character] WARNING: Insufficient abilities generated for ${args.characterName} (${comprehensiveCharacter?.detailedAbilities?.length || 0} items)`);
        }
        if (!comprehensiveCharacter?.trivia || comprehensiveCharacter.trivia.length < 8) {
          console.warn(`[Comprehensive Character] WARNING: Insufficient trivia generated for ${args.characterName} (${comprehensiveCharacter?.trivia?.length || 0} items)`);
        }
        if (!comprehensiveCharacter?.personalityAnalysis || comprehensiveCharacter.personalityAnalysis.length < 200) {
          console.warn(`[Comprehensive Character] WARNING: Personality analysis too short for ${args.characterName} (${comprehensiveCharacter?.personalityAnalysis?.length || 0} chars)`);
        }
        if (!comprehensiveCharacter?.psychologicalProfile) {
          console.warn(`[Comprehensive Character] WARNING: Missing psychological profile for ${args.characterName}`);
        }
        if (!comprehensiveCharacter?.combatProfile) {
          console.warn(`[Comprehensive Character] WARNING: Missing combat profile for ${args.characterName}`);
        }
        
      } catch (e) {
        console.error(`[Comprehensive Character] JSON parse error for ${args.characterName}:`, e);
        console.error(`[Comprehensive Character] Raw content:`, content);
        return { error: "Failed to parse AI response as JSON.", comprehensiveCharacter: null };
      }

      // Filter relationships to known characters only (from ground truth)
      if (comprehensiveCharacter && Array.isArray(comprehensiveCharacter.keyRelationships)) {
        comprehensiveCharacter.keyRelationships = comprehensiveCharacter.keyRelationships.filter((rel: any) => rel?.relatedCharacterName && allowedNames.has(rel.relatedCharacterName));
      }

      // Cache the result for 7 days (604800000 ms)
      if (comprehensiveCharacter) {
        await ctx.runMutation(internal.aiCache.setCache, {
          key: cacheKey,
          value: comprehensiveCharacter,
          ttl: 604800000, // 7 days
        });
        console.log(`[Comprehensive Character] Cached result for ${args.characterName} from ${args.animeName}`);
      }

      return { error: null, comprehensiveCharacter: { ...comprehensiveCharacter, cached: false } };
    } catch (err: any) {
      return { error: err.message || "OpenAI error.", comprehensiveCharacter: null };
    }
  },
});