// convex/characterEnrichment.ts - Fixed TypeScript issues
import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, action } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";

// Add normalized name function for better matching
function normalizeCharacterName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' '); // Normalize whitespace
}

// Enhanced character type with better error tracking
type CharacterType = {
  id?: number;
  name: string;
  imageUrl?: string;
  role: string;
  description?: string;
  status?: string;
  gender?: string;
  age?: string;
  dateOfBirth?: {
    year?: number;
    month?: number;
    day?: number;
  };
  bloodType?: string;
  height?: string;
  weight?: string;
  species?: string;
  powersAbilities?: string[];
  weapons?: string[];
  nativeName?: string;
  siteUrl?: string;
  voiceActors?: {
    id?: number;
    name: string;
    language: string;
    imageUrl?: string;
  }[];
  relationships?: {
    relatedCharacterId?: number;
    relationType: string;
  }[];
  // Enhanced tracking fields
  enrichmentStatus?: "pending" | "success" | "failed" | "skipped";
  enrichmentAttempts?: number;
  lastAttemptTimestamp?: number;
  lastErrorMessage?: string;
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
  enrichmentTimestamp?: number;
  
  // Manual admin enrichment protection
  manuallyEnrichedByAdmin?: boolean;
  manualEnrichmentTimestamp?: number;
  manualEnrichmentAdminId?: Id<"users">;
};

// ADD THE MISSING QUERY that was referenced in batchEnrichCharacters
export const getAnimeWithCharacters = internalQuery({
  args: {
    limit: v.number(),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get anime that have characters array
    const animes = await ctx.db
      .query("anime")
      .filter((q) => q.neq(q.field("characters"), undefined))
      .paginate({ 
        numItems: args.limit, 
        cursor: args.cursor !== undefined ? args.cursor : null 
      });
    
    return animes;
  },
});

// Enhanced query with better filtering
export const getUnenrichedCharactersFromAnime = internalQuery({
  args: {
    animeId: v.id("anime"),
    includeRetries: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const anime = await ctx.db.get(args.animeId);
    if (!anime || !anime.characters) return null;
    
    console.log(`[Debug] Checking anime: ${anime.title} with ${anime.characters.length} characters`);
    
    // Enhanced filtering with retry logic and manual enrichment protection
    const unenrichedCharacters = anime.characters.filter(
      (char: CharacterType) => {
        const status = char.enrichmentStatus;
        const attempts = char.enrichmentAttempts || 0;
        const lastAttempt = char.lastAttemptTimestamp || 0;
        const hoursSinceLastAttempt = (Date.now() - lastAttempt) / (1000 * 60 * 60);
        const manuallyEnriched = char.manuallyEnrichedByAdmin || false;
        
        // Skip characters that were manually enriched by admin (permanent protection)
        if (manuallyEnriched) {
          console.log(`[Debug] Skipping ${char.name}: Manually enriched by admin (permanent protection)`);
          return false;
        }
        
        // Include if no status or pending
        if (!status || status === "pending") {
          console.log(`[Debug] Including ${char.name}: No status or pending`);
          return true;
        }
        
        // Include failed characters for retry if enabled and conditions met
        if (args.includeRetries && status === "failed") {
          const shouldRetry = attempts < 3 && hoursSinceLastAttempt > 24; // Retry failed after 24 hours, max 3 attempts
          if (shouldRetry) {
            console.log(`[Debug] Including ${char.name} for retry: ${attempts} attempts, ${hoursSinceLastAttempt.toFixed(1)}h ago`);
          }
          return shouldRetry;
        }
        
        return false;
      }
    );
    
    console.log(`[Debug] Found ${unenrichedCharacters.length} unenriched characters in ${anime.title}`);
    
    return {
      anime: {
        _id: anime._id,
        title: anime.title,
        titleEnglish: anime.title,
      },
      characters: unenrichedCharacters,
    };
  },
});

// Enhanced mutation with better character matching and error tracking
export const updateCharacterInAnime = internalMutation({
  args: {
    animeId: v.id("anime"),
    characterName: v.string(),
    updates: v.object({
      enrichmentStatus: v.optional(v.union(
        v.literal("success"), 
        v.literal("failed"), 
        v.literal("skipped"),
        v.literal("pending")
      )),
      enrichmentAttempts: v.optional(v.number()),
      lastAttemptTimestamp: v.optional(v.number()),
      lastErrorMessage: v.optional(v.string()),
      enrichmentTimestamp: v.optional(v.number()),
      
      // Manual admin enrichment protection
      manuallyEnrichedByAdmin: v.optional(v.boolean()),
      manualEnrichmentTimestamp: v.optional(v.number()),
      manualEnrichmentAdminId: v.optional(v.id("users")),
      personalityAnalysis: v.optional(v.string()),
      keyRelationships: v.optional(v.array(v.object({
        relatedCharacterName: v.string(),
        relationshipDescription: v.string(),
        relationType: v.string(),
      }))),
      detailedAbilities: v.optional(v.array(v.object({
        abilityName: v.string(),
        abilityDescription: v.string(),
        powerLevel: v.optional(v.string()),
      }))),
      majorCharacterArcs: v.optional(v.array(v.string())),
      trivia: v.optional(v.array(v.string())),
      backstoryDetails: v.optional(v.string()),
      characterDevelopment: v.optional(v.string()),
      notableQuotes: v.optional(v.array(v.string())),
      symbolism: v.optional(v.string()),
      fanReception: v.optional(v.string()),
      culturalSignificance: v.optional(v.string()),
      // Extended enrichment fields
      psychologicalProfile: v.optional(v.object({
        personalityType: v.optional(v.string()),
        coreFears: v.optional(v.array(v.string())),
        coreDesires: v.optional(v.array(v.string())),
        emotionalTriggers: v.optional(v.array(v.string())),
        copingMechanisms: v.optional(v.array(v.string())),
        mentalHealthAspects: v.optional(v.string()),
        traumaHistory: v.optional(v.string()),
        defenseMechanisms: v.optional(v.array(v.string())),
      })),
      combatProfile: v.optional(v.object({
        fightingStyle: v.optional(v.string()),
        preferredWeapons: v.optional(v.array(v.string())),
        combatStrengths: v.optional(v.array(v.string())),
        combatWeaknesses: v.optional(v.array(v.string())),
        battleTactics: v.optional(v.string()),
        powerScaling: v.optional(v.string()),
        specialTechniques: v.optional(v.array(v.object({
          name: v.string(),
          description: v.string(),
          powerLevel: v.optional(v.string()),
          limitations: v.optional(v.string()),
        }))),
      })),
      socialDynamics: v.optional(v.object({
        socialClass: v.optional(v.string()),
        culturalBackground: v.optional(v.string()),
        socialInfluence: v.optional(v.string()),
        leadershipStyle: v.optional(v.string()),
        communicationStyle: v.optional(v.string()),
        socialConnections: v.optional(v.array(v.string())),
        reputation: v.optional(v.string()),
        publicImage: v.optional(v.string()),
      })),
      characterArchetype: v.optional(v.object({
        primaryArchetype: v.optional(v.string()),
        secondaryArchetypes: v.optional(v.array(v.string())),
        characterTropes: v.optional(v.array(v.string())),
        subvertedTropes: v.optional(v.array(v.string())),
        characterRole: v.optional(v.string()),
        narrativeFunction: v.optional(v.string()),
      })),
      characterImpact: v.optional(v.object({
        influenceOnStory: v.optional(v.string()),
        influenceOnOtherCharacters: v.optional(v.string()),
        culturalImpact: v.optional(v.string()),
        fanbaseReception: v.optional(v.string()),
        merchandisePopularity: v.optional(v.string()),
        cosplayPopularity: v.optional(v.string()),
        memeStatus: v.optional(v.string()),
        legacyInAnime: v.optional(v.string()),
      })),
      advancedRelationships: v.optional(v.array(v.object({
        characterName: v.string(),
        relationshipType: v.string(),
        emotionalDynamics: v.string(),
        keyMoments: v.optional(v.array(v.string())),
        relationshipEvolution: v.optional(v.string()),
        impactOnStory: v.optional(v.string()),
      }))),
      developmentTimeline: v.optional(v.array(v.object({
        phase: v.string(),
        description: v.string(),
        characterState: v.string(),
        keyEvents: v.optional(v.array(v.string())),
        characterGrowth: v.optional(v.string()),
        challenges: v.optional(v.string()),
        relationships: v.optional(v.string()),
      }))),
    }),
  },
  handler: async (ctx, args) => {
    const anime = await ctx.db.get(args.animeId);
    if (!anime || !anime.characters) {
      console.error(`[Update Character] Anime ${args.animeId} not found or has no characters`);
      return;
    }
    
    const normalizedTargetName = normalizeCharacterName(args.characterName);
    let characterFound = false;
    
    console.log(`[Update Character] Looking for character: "${args.characterName}" (normalized: "${normalizedTargetName}")`);
    
    // Enhanced character matching with fuzzy logic
    const updatedCharacters = anime.characters.map((char: CharacterType, index: number) => {
      const normalizedCharName = normalizeCharacterName(char.name);
      
      // Try exact match first
      if (char.name === args.characterName) {
        console.log(`[Update Character] Exact match found at index ${index}: ${char.name}`);
        characterFound = true;
        return { ...char, ...args.updates };
      }
      
      // Try normalized match
      if (normalizedCharName === normalizedTargetName) {
        console.log(`[Update Character] Normalized match found at index ${index}: ${char.name} -> ${normalizedCharName}`);
        characterFound = true;
        return { ...char, ...args.updates };
      }
      
      // Try fuzzy match (for very close names)
      if (normalizedCharName.includes(normalizedTargetName) || normalizedTargetName.includes(normalizedCharName)) {
        const similarity = Math.max(
          normalizedCharName.length / normalizedTargetName.length,
          normalizedTargetName.length / normalizedCharName.length
        );
        if (similarity > 0.8) {
          console.log(`[Update Character] Fuzzy match found at index ${index}: ${char.name} (similarity: ${similarity.toFixed(2)})`);
          characterFound = true;
          return { ...char, ...args.updates };
        }
      }
      
      return char;
    });
    
    if (!characterFound) {
      console.error(`[Update Character] Character "${args.characterName}" not found in anime "${anime.title}"`);
      console.error(`[Update Character] Available characters:`, anime.characters.map(c => c.name));
      return;
    }
    
    // Update the anime document
    await ctx.db.patch(args.animeId, {
      characters: updatedCharacters as any,
    });
    
    console.log(`[Update Character] Successfully updated character: ${args.characterName}`);
  },
});

// Enhanced enrichment action with better error handling and tracking
export const enrichCharactersForAnime = internalAction({
  args: {
    animeId: v.id("anime"),
    maxCharacters: v.optional(v.number()),
    includeRetries: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const maxToProcess = args.maxCharacters || 5;
    const includeRetries = args.includeRetries || false;
    
    console.log(`[Enrich Anime] Starting enrichment for anime ${args.animeId} (max: ${maxToProcess}, retries: ${includeRetries})`);
    
    // Get unenriched characters
    const data = await ctx.runQuery(
      internal.characterEnrichment.getUnenrichedCharactersFromAnime,
      { animeId: args.animeId, includeRetries }
    );
    
    if (!data || !data.anime || data.characters.length === 0) {
      console.log(`[Enrich Anime] No unenriched characters found for anime ${args.animeId}`);
      return { processed: 0, succeeded: 0, failed: 0, skipped: 0 };
    }
    
    console.log(`[Enrich Anime] Found ${data.characters.length} unenriched characters for ${data.anime.title}`);
    
    // Process up to maxCharacters
    const charactersToProcess = data.characters.slice(0, maxToProcess);
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;
    
    for (const character of charactersToProcess) {
      const characterName = character.name;
      const attempts = (character.enrichmentAttempts || 0) + 1;
      
      console.log(`[Enrich Character] Processing: ${characterName} (attempt ${attempts}) from ${data.anime.title}`);
      
      try {
        // Skip characters that don't meet minimum requirements
        if (!characterName || characterName.trim().length < 2) {
          console.log(`[Enrich Character] Skipping ${characterName}: Name too short`);
          await ctx.runMutation(internal.characterEnrichment.updateCharacterInAnime, {
            animeId: args.animeId,
            characterName: characterName,
            updates: {
              enrichmentStatus: "skipped",
              enrichmentAttempts: attempts,
              lastAttemptTimestamp: Date.now(),
              lastErrorMessage: "Character name too short",
            },
          });
          skipped++;
          continue;
        }
        
        // Update attempt tracking first
        await ctx.runMutation(internal.characterEnrichment.updateCharacterInAnime, {
          animeId: args.animeId,
          characterName: characterName,
          updates: {
            enrichmentStatus: "pending",
            enrichmentAttempts: attempts,
            lastAttemptTimestamp: Date.now(),
          },
        });
        
        // Call the AI enrichment function with better error handling
        console.log(`[Enrich Character] Calling AI for: ${characterName}`);
        const enrichedResult = await ctx.runAction(api.ai.fetchComprehensiveCharacterDetails, {
          characterName: characterName,
          animeName: data.anime.title || "",
          existingData: {
            description: character.description,
            role: character.role,
            gender: character.gender,
            age: character.age,
            species: character.species,
            powersAbilities: character.powersAbilities,
            voiceActors: character.voiceActors,
          },
          messageId: `cron_enrich_${characterName.replace(/[^\w]/g, '_')}_${Date.now()}`,
        });
        
        console.log(`[Enrich Character] AI response for ${characterName}:`, {
          hasError: !!enrichedResult.error,
          hasComprehensiveCharacter: !!enrichedResult.comprehensiveCharacter,
          error: enrichedResult.error
        });
        
        if (!enrichedResult.error && enrichedResult.comprehensiveCharacter) {
          // Success case - update with comprehensive data
          await ctx.runMutation(internal.characterEnrichment.updateCharacterInAnime, {
            animeId: args.animeId,
            characterName: characterName,
            updates: {
              enrichmentStatus: "success",
              enrichmentAttempts: attempts,
              lastAttemptTimestamp: Date.now(),
              // Basic enrichment fields
              personalityAnalysis: enrichedResult.comprehensiveCharacter.personalityAnalysis,
              keyRelationships: enrichedResult.comprehensiveCharacter.keyRelationships,
              detailedAbilities: enrichedResult.comprehensiveCharacter.detailedAbilities,
              majorCharacterArcs: enrichedResult.comprehensiveCharacter.majorCharacterArcs,
              trivia: enrichedResult.comprehensiveCharacter.trivia,
              backstoryDetails: enrichedResult.comprehensiveCharacter.backstoryDetails,
              characterDevelopment: enrichedResult.comprehensiveCharacter.characterDevelopment,
              notableQuotes: enrichedResult.comprehensiveCharacter.notableQuotes,
              symbolism: enrichedResult.comprehensiveCharacter.symbolism,
              fanReception: enrichedResult.comprehensiveCharacter.fanReception,
              culturalSignificance: enrichedResult.comprehensiveCharacter.culturalSignificance,
              // Extended enrichment fields
              psychologicalProfile: enrichedResult.comprehensiveCharacter.psychologicalProfile,
              combatProfile: enrichedResult.comprehensiveCharacter.combatProfile,
              socialDynamics: enrichedResult.comprehensiveCharacter.socialDynamics,
              characterArchetype: enrichedResult.comprehensiveCharacter.characterArchetype,
              characterImpact: enrichedResult.comprehensiveCharacter.characterImpact,
              enrichmentTimestamp: Date.now(),
            },
          });
          
          succeeded++;
          console.log(`✅ Successfully enriched: ${characterName} with comprehensive data`);
        } else {
          // Fallback to basic enrichment if comprehensive fails
          console.log(`[Enrich Character] Comprehensive enrichment failed, trying basic enrichment for: ${characterName}`);
          const basicEnrichedResult = await ctx.runAction(api.ai.fetchEnrichedCharacterDetails, {
            characterName: characterName,
            animeName: data.anime.title || "",
            existingData: {
              description: character.description,
              role: character.role,
              gender: character.gender,
              age: character.age,
              species: character.species,
              powersAbilities: character.powersAbilities,
              voiceActors: character.voiceActors,
            },
            enrichmentLevel: 'detailed' as const,
            messageId: `cron_enrich_basic_${characterName.replace(/[^\w]/g, '_')}_${Date.now()}`,
            includeAdvancedAnalysis: true,
          });
          
          if (!basicEnrichedResult.error && basicEnrichedResult.mergedCharacter) {
            // Success with basic enrichment
            await ctx.runMutation(internal.characterEnrichment.updateCharacterInAnime, {
              animeId: args.animeId,
              characterName: characterName,
              updates: {
                enrichmentStatus: "success",
                enrichmentAttempts: attempts,
                lastAttemptTimestamp: Date.now(),
                personalityAnalysis: basicEnrichedResult.mergedCharacter.personalityAnalysis,
                keyRelationships: basicEnrichedResult.mergedCharacter.keyRelationships,
                detailedAbilities: basicEnrichedResult.mergedCharacter.detailedAbilities,
                majorCharacterArcs: basicEnrichedResult.mergedCharacter.majorCharacterArcs,
                trivia: basicEnrichedResult.mergedCharacter.trivia,
                backstoryDetails: basicEnrichedResult.mergedCharacter.backstoryDetails,
                characterDevelopment: basicEnrichedResult.mergedCharacter.characterDevelopment,
                notableQuotes: basicEnrichedResult.mergedCharacter.notableQuotes,
                symbolism: basicEnrichedResult.mergedCharacter.symbolism,
                fanReception: basicEnrichedResult.mergedCharacter.fanReception,
                culturalSignificance: basicEnrichedResult.mergedCharacter.culturalSignificance,
                advancedRelationships: basicEnrichedResult.mergedCharacter.advancedRelationships,
                developmentTimeline: basicEnrichedResult.mergedCharacter.developmentTimeline,
                enrichmentTimestamp: Date.now(),
              },
            });
            
            succeeded++;
            console.log(`✅ Successfully enriched: ${characterName} with basic data`);
          } else {
            // Failure case with detailed error tracking
            const errorMessage = basicEnrichedResult.error || enrichedResult.error || "Unknown AI response error";
            
            await ctx.runMutation(internal.characterEnrichment.updateCharacterInAnime, {
              animeId: args.animeId,
              characterName: characterName,
              updates: {
                enrichmentStatus: "failed",
                enrichmentAttempts: attempts,
                lastAttemptTimestamp: Date.now(),
                lastErrorMessage: errorMessage,
              },
            });
            
            failed++;
            console.error(`❌ Failed to enrich ${characterName}: ${errorMessage}`);
          }
        }
        
        // Rate limiting - wait between characters
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error: any) {
        // Handle unexpected errors with detailed logging
        const errorMessage = error?.message || error?.toString() || "Unexpected error occurred";
        
        console.error(`[Enrich Character] Unexpected error for ${characterName}:`, {
          error: errorMessage,
          stack: error?.stack,
          type: typeof error,
        });
        
        await ctx.runMutation(internal.characterEnrichment.updateCharacterInAnime, {
          animeId: args.animeId,
          characterName: characterName,
          updates: {
            enrichmentStatus: "failed",
            enrichmentAttempts: attempts,
            lastAttemptTimestamp: Date.now(),
            lastErrorMessage: `Unexpected error: ${errorMessage}`,
          },
        });
        
        failed++;
      }
    }
    
    const result = {
      animeTitle: data.anime.title,
      processed: charactersToProcess.length,
      succeeded,
      failed,
      skipped,
    };
    
    console.log(`[Enrich Anime] ${data.anime.title} enrichment complete:`, result);
    
    return result;
  },
});

// Enhanced batch processing with retry logic - FIXED TYPESCRIPT ISSUES
export const batchEnrichCharacters = internalAction({
  args: {
    animeBatchSize: v.optional(v.number()),
    charactersPerAnime: v.optional(v.number()),
    includeRetries: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const animeBatchSize = args.animeBatchSize || 3;
    const charactersPerAnime = args.charactersPerAnime || 5;
    const includeRetries = args.includeRetries || false;
    
    console.log(`[Batch Enrichment] Starting - Processing ${animeBatchSize} anime, ${charactersPerAnime} characters each (retries: ${includeRetries})`);
    
    // Get anime with characters
    const animePagination = await ctx.runQuery(
      internal.characterEnrichment.getAnimeWithCharacters,
      { limit: animeBatchSize * 2 } // Get more to filter
    );
    
    if (animePagination.page.length === 0) {
      console.log("[Batch Enrichment] No anime found to process");
      return { totalProcessed: 0, totalSucceeded: 0, totalFailed: 0, totalSkipped: 0 };
    }
    
    // Filter anime that actually have unenriched characters
    const viableAnime: Doc<"anime">[] = []; // FIXED: Explicit typing
    for (const anime of animePagination.page) {
      const data = await ctx.runQuery(
        internal.characterEnrichment.getUnenrichedCharactersFromAnime,
        { animeId: anime._id, includeRetries }
      );
      if (data && data.characters.length > 0) {
        viableAnime.push(anime);
        if (viableAnime.length >= animeBatchSize) break;
      }
    }
    
    console.log(`[Batch Enrichment] Found ${viableAnime.length} anime with unenriched characters`);
    
    let totalProcessed = 0;
    let totalSucceeded = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    
    // Process each anime
    for (const anime of viableAnime) {
      try {
        const result = await ctx.runAction(
          internal.characterEnrichment.enrichCharactersForAnime,
          {
            animeId: anime._id,
            maxCharacters: charactersPerAnime,
            includeRetries,
          }
        );
        
        totalProcessed += result.processed;
        totalSucceeded += result.succeeded;
        totalFailed += result.failed;
        totalSkipped += result.skipped || 0;
        
        // Wait between anime to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.error(`[Batch Enrichment] Failed to process anime ${anime._id}:`, error);
      }
    }
    
    const finalResult = {
      totalProcessed,
      totalSucceeded,
      totalFailed,
      totalSkipped,
    };
    
    console.log(`[Batch Enrichment] Complete:`, finalResult);
    
    return finalResult;
  },
});

// New query to get detailed enrichment status
export const getDetailedEnrichmentStatus = internalQuery({
  args: {
    animeId: v.optional(v.id("anime")),
  },
  handler: async (ctx, args) => {
    let animes;
    
    if (args.animeId) {
      const anime = await ctx.db.get(args.animeId);
      animes = anime ? [anime] : [];
    } else {
      // Get sample of anime for overall stats
      animes = await ctx.db
        .query("anime")
        .filter((q) => q.neq(q.field("characters"), undefined))
        .take(50);
    }
    
    const stats = {
      totalAnime: animes.length,
      totalCharacters: 0,
      enrichedCharacters: 0,
      failedCharacters: 0,
      skippedCharacters: 0,
      pendingCharacters: 0,
      characterDetails: [] as Array<{
        animeName: string;
        characterName: string;
        status: string;
        attempts: number;
        lastError?: string;
        lastAttempt?: string;
      }>,
    };
    
    for (const anime of animes) {
      if (anime.characters && Array.isArray(anime.characters)) {
        stats.totalCharacters += anime.characters.length;
        
        for (const character of anime.characters) {
          const char = character as CharacterType;
          const status = char.enrichmentStatus || "unknown";
          
          switch (status) {
            case "success":
              stats.enrichedCharacters++;
              break;
            case "failed":
              stats.failedCharacters++;
              break;
            case "skipped":
              stats.skippedCharacters++;
              break;
            case "pending":
            case "unknown":
            default:
              stats.pendingCharacters++;
              break;
          }
          
          if (args.animeId) {
            // Include detailed info for single anime queries
            stats.characterDetails.push({
              animeName: anime.title,
              characterName: char.name,
              status,
              attempts: char.enrichmentAttempts || 0,
              lastError: char.lastErrorMessage,
              lastAttempt: char.lastAttemptTimestamp 
                ? new Date(char.lastAttemptTimestamp).toISOString()
                : undefined,
            });
          }
        }
      }
    }
    
    return stats;
  },
});

// Get enrichment statistics
export const getEnrichmentStats = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Sample 100 anime to get statistics
    const animes = await ctx.db
      .query("anime")
      .filter((q) => q.neq(q.field("characters"), undefined))
      .take(100);
    
    let totalCharacters = 0;
    let enrichedCharacters = 0;
    
    for (const anime of animes) {
      if (anime.characters && Array.isArray(anime.characters)) {
        totalCharacters += anime.characters.length;
        enrichedCharacters += anime.characters.filter(
          (c: CharacterType) => c.enrichmentStatus === "success"
        ).length;
      }
    }
    
    return {
      sampledAnime: animes.length,
      totalCharacters,
      enrichedCharacters,
      unenrichedCharacters: totalCharacters - enrichedCharacters,
      percentageComplete: totalCharacters > 0 
        ? Math.round((enrichedCharacters / totalCharacters) * 100)
        : 0,
    };
  },
});

// Priority enrichment for currently popular or trending anime
export const enrichPopularAnimeCharacters = internalAction({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 5;
    
    // Get popular anime (you can adjust this query based on your popularity metrics)
    const popularAnime = await ctx.runQuery(
      internal.characterEnrichment.getPopularAnimeWithUnenrichedCharacters,
      { limit }
    );
    
    console.log(`[Priority Enrichment] Processing ${popularAnime.length} popular anime`);
    
    let totalProcessed = 0;
    let totalSucceeded = 0;
    
    for (const anime of popularAnime) {
      const result = await ctx.runAction(
        internal.characterEnrichment.enrichCharactersForAnime,
        {
          animeId: anime._id,
          maxCharacters: 10, // More characters for popular anime
        }
      );
      
      totalProcessed += result.processed;
      totalSucceeded += result.succeeded;
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`[Priority Enrichment] Complete - Processed: ${totalProcessed}, Succeeded: ${totalSucceeded}`);
    
    return { totalProcessed, totalSucceeded };
  },
});

// Query for popular anime with unenriched characters
export const getPopularAnimeWithUnenrichedCharacters = internalQuery({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    // Get anime sorted by rating or view count
    const animes = await ctx.db
      .query("anime")
      .filter((q) => q.neq(q.field("characters"), undefined))
      .order("desc") // This will use the default index order
      .take(args.limit * 3); // Get more to filter
    
    // Filter to only anime with unenriched characters
    const animesWithUnenriched: Doc<"anime">[] = [];
    for (const anime of animes) {
      if (anime.characters && Array.isArray(anime.characters)) {
        const hasUnenriched = anime.characters.some(
          (c: CharacterType) => !c.enrichmentStatus || c.enrichmentStatus === "pending"
        );
        if (hasUnenriched) {
          animesWithUnenriched.push(anime);
          if (animesWithUnenriched.length >= args.limit) break;
        }
      }
    }
    
    return animesWithUnenriched;
  },
});

// Public action for enriching characters in a single anime (admin dashboard)
export const enrichAnimeCharacters = action({
  args: {
    animeId: v.id("anime"),
    maxCharacters: v.optional(v.number()),
    includeRetries: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.runAction(internal.characterEnrichment.enrichCharactersForAnime, {
      animeId: args.animeId,
      maxCharacters: args.maxCharacters,
      includeRetries: args.includeRetries,
    });
  },
});

// Public action for batch enrichment (admin dashboard)
export const batchEnrichAnimeCharacters = action({
  args: {
    animeBatchSize: v.optional(v.number()),
    charactersPerAnime: v.optional(v.number()),
    includeRetries: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.runAction(internal.characterEnrichment.batchEnrichCharacters, {
      animeBatchSize: args.animeBatchSize,
      charactersPerAnime: args.charactersPerAnime,
      includeRetries: args.includeRetries,
    });
  },
});

// Public actions for admin dashboard
export const enrichCharacterRealTime = action({
  args: {
    animeId: v.id("anime"),
    characterName: v.string(),
    includeAdvancedAnalysis: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.runAction(internal.characterEnrichment.enrichCharacterRealTime, {
      animeId: args.animeId,
      characterName: args.characterName,
      includeAdvancedAnalysis: args.includeAdvancedAnalysis,
    });
  },
});

export const getCacheStatistics = action({
  args: {},
  handler: async (ctx) => {
    return await ctx.runQuery(internal.characterEnrichment.getCacheStatistics, {});
  },
});

export const clearExpiredCache = action({
  args: {},
  handler: async (ctx) => {
    return await ctx.runMutation(internal.characterEnrichment.clearExpiredCache, {});
  },
});

// Test comprehensive character enrichment for a specific character
export const testComprehensiveEnrichment = action({
  args: {
    animeId: v.id("anime"),
    characterName: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`[Test Comprehensive] Starting comprehensive enrichment test for ${args.characterName} from anime ${args.animeId}`);
    
    try {
      // Get the anime data
      const anime = await ctx.runQuery(internal.characterEnrichment.getUnenrichedCharactersFromAnime, {
        animeId: args.animeId,
        includeRetries: true
      });
      
      if (!anime || !anime.characters) {
        return { error: "Anime not found or has no characters", success: false };
      }
      
      // Find the specific character
      const character = anime.characters.find((char: any) => 
        char.name.toLowerCase().includes(args.characterName.toLowerCase()) ||
        args.characterName.toLowerCase().includes(char.name.toLowerCase())
      );
      
      if (!character) {
        return { 
          error: `Character "${args.characterName}" not found in anime "${anime.anime.title}"`, 
          success: false,
          availableCharacters: anime.characters.map((c: any) => c.name)
        };
      }
      
      console.log(`[Test Comprehensive] Found character: ${character.name}`);
      
      // Call comprehensive enrichment
      const result = await ctx.runAction(api.ai.fetchComprehensiveCharacterDetails, {
        characterName: character.name,
        animeName: anime.anime.title,
        existingData: {
          description: character.description,
          role: character.role,
          gender: character.gender,
          age: character.age,
          species: character.species,
          powersAbilities: character.powersAbilities,
          voiceActors: character.voiceActors,
        },
        messageId: `test_comprehensive_${character.name.replace(/[^\w]/g, '_')}_${Date.now()}`,
      });
      
      if (result.error) {
        return { error: result.error, success: false };
      }
      
      if (!result.comprehensiveCharacter) {
        return { error: "No comprehensive character data generated", success: false };
      }
      
      // Update the character with comprehensive data
      await ctx.runMutation(internal.characterEnrichment.updateCharacterInAnime, {
        animeId: args.animeId,
        characterName: character.name,
        updates: {
          enrichmentStatus: "success",
          enrichmentAttempts: (character.enrichmentAttempts || 0) + 1,
          lastAttemptTimestamp: Date.now(),
          // Basic enrichment fields
          personalityAnalysis: result.comprehensiveCharacter.personalityAnalysis,
          keyRelationships: result.comprehensiveCharacter.keyRelationships,
          detailedAbilities: result.comprehensiveCharacter.detailedAbilities,
          majorCharacterArcs: result.comprehensiveCharacter.majorCharacterArcs,
          trivia: result.comprehensiveCharacter.trivia,
          backstoryDetails: result.comprehensiveCharacter.backstoryDetails,
          characterDevelopment: result.comprehensiveCharacter.characterDevelopment,
          notableQuotes: result.comprehensiveCharacter.notableQuotes,
          symbolism: result.comprehensiveCharacter.symbolism,
          fanReception: result.comprehensiveCharacter.fanReception,
          culturalSignificance: result.comprehensiveCharacter.culturalSignificance,
          // Extended enrichment fields
          psychologicalProfile: result.comprehensiveCharacter.psychologicalProfile,
          combatProfile: result.comprehensiveCharacter.combatProfile,
          socialDynamics: result.comprehensiveCharacter.socialDynamics,
          characterArchetype: result.comprehensiveCharacter.characterArchetype,
          characterImpact: result.comprehensiveCharacter.characterImpact,
          enrichmentTimestamp: Date.now(),
        },
      });
      
      // Return success with data summary
      const dataSummary = {
        characterName: character.name,
        animeTitle: anime.anime.title,
        hasPersonalityAnalysis: !!result.comprehensiveCharacter.personalityAnalysis,
        personalityLength: result.comprehensiveCharacter.personalityAnalysis?.length || 0,
        triviaCount: result.comprehensiveCharacter.trivia?.length || 0,
        abilitiesCount: result.comprehensiveCharacter.detailedAbilities?.length || 0,
        quotesCount: result.comprehensiveCharacter.notableQuotes?.length || 0,
        arcsCount: result.comprehensiveCharacter.majorCharacterArcs?.length || 0,
        hasPsychologicalProfile: !!result.comprehensiveCharacter.psychologicalProfile,
        hasCombatProfile: !!result.comprehensiveCharacter.combatProfile,
        hasSocialDynamics: !!result.comprehensiveCharacter.socialDynamics,
        hasCharacterArchetype: !!result.comprehensiveCharacter.characterArchetype,
        hasCharacterImpact: !!result.comprehensiveCharacter.characterImpact,
        cached: result.comprehensiveCharacter.cached || false,
      };
      
      console.log(`[Test Comprehensive] Successfully enriched ${character.name}:`, dataSummary);
      
      return { 
        success: true, 
        dataSummary,
        message: `Successfully enriched ${character.name} with comprehensive data`
      };
      
    } catch (error: any) {
      console.error(`[Test Comprehensive] Error:`, error);
      return { 
        error: error.message || "Unknown error occurred", 
        success: false 
      };
    }
  },
});