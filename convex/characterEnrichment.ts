// convex/characterEnrichment.ts
import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";

// Define the enhanced character type based on your existing structure
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
  // AI enrichment fields
  isAIEnriched?: boolean;
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
};

// Query to get all anime IDs that have characters
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

// Query to get unenriched characters from a specific anime
export const getUnenrichedCharactersFromAnime = internalQuery({
  args: {
    animeId: v.id("anime"),
  },
  handler: async (ctx, args) => {
    const anime = await ctx.db.get(args.animeId);
    if (!anime || !anime.characters) return null;
    
    // Filter characters that haven't been enriched
    const unenrichedCharacters = anime.characters.filter(
      (char: CharacterType) => !char.isAIEnriched
    );
    
    return {
      anime: {
        _id: anime._id,
        title: anime.title,
        titleEnglish: anime.title, // Use title if titleEnglish doesn't exist
      },
      characters: unenrichedCharacters,
    };
  },
});

// Mutation to update a specific character within an anime's characters array
export const updateCharacterInAnime = internalMutation({
  args: {
    animeId: v.id("anime"),
    characterName: v.string(),
    enrichedData: v.object({
      isAIEnriched: v.boolean(),
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
      enrichmentTimestamp: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const anime = await ctx.db.get(args.animeId);
    if (!anime || !anime.characters) return;
    
    // Update the specific character in the array
    const updatedCharacters = anime.characters.map((char: CharacterType) => {
      if (char.name === args.characterName) {
        return {
          ...char,
          ...args.enrichedData,
        };
      }
      return char;
    });
    
    // Update the anime document with type assertion
    await ctx.db.patch(args.animeId, {
      characters: updatedCharacters as any, // Type assertion for now
    });
  },
});

// Main action to enrich characters from a single anime
export const enrichCharactersForAnime = internalAction({
  args: {
    animeId: v.id("anime"),
    maxCharacters: v.optional(v.number()), // Limit how many to process
  },
  handler: async (ctx, args) => {
    const maxToProcess = args.maxCharacters || 5;
    
    // Get unenriched characters
    const data = await ctx.runQuery(
      internal.characterEnrichment.getUnenrichedCharactersFromAnime,
      { animeId: args.animeId }
    );
    
    if (!data || !data.anime || data.characters.length === 0) {
      console.log(`No unenriched characters found for anime ${args.animeId}`);
      return { processed: 0, succeeded: 0, failed: 0 };
    }
    
    console.log(`Found ${data.characters.length} unenriched characters for ${data.anime.title}`);
    
    // Process up to maxCharacters
    const charactersToProcess = data.characters.slice(0, maxToProcess);
    let succeeded = 0;
    let failed = 0;
    
    for (const character of charactersToProcess) {
      try {
        console.log(`Enriching character: ${character.name} from ${data.anime.title}`);
        
        // Call the AI enrichment function
        const enrichedResult = await ctx.runAction(api.ai.fetchEnrichedCharacterDetails, {
          characterName: character.name,
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
          messageId: `cron_enrich_${character.name}_${Date.now()}`,
        });
        
        if (!enrichedResult.error && enrichedResult.mergedCharacter) {
          // Update the character in the anime document
          await ctx.runMutation(internal.characterEnrichment.updateCharacterInAnime, {
            animeId: args.animeId,
            characterName: character.name,
            enrichedData: {
              isAIEnriched: true,
              personalityAnalysis: enrichedResult.mergedCharacter.personalityAnalysis,
              keyRelationships: enrichedResult.mergedCharacter.keyRelationships,
              detailedAbilities: enrichedResult.mergedCharacter.detailedAbilities,
              majorCharacterArcs: enrichedResult.mergedCharacter.majorCharacterArcs,
              trivia: enrichedResult.mergedCharacter.trivia,
              backstoryDetails: enrichedResult.mergedCharacter.backstoryDetails,
              characterDevelopment: enrichedResult.mergedCharacter.characterDevelopment,
              notableQuotes: enrichedResult.mergedCharacter.notableQuotes,
              symbolism: enrichedResult.mergedCharacter.symbolism,
              fanReception: enrichedResult.mergedCharacter.fanReception,
              culturalSignificance: enrichedResult.mergedCharacter.culturalSignificance,
              enrichmentTimestamp: Date.now(),
            },
          });
          
          succeeded++;
          console.log(`✅ Successfully enriched: ${character.name}`);
        } else {
          failed++;
          console.error(`❌ Failed to enrich ${character.name}: ${enrichedResult.error}`);
        }
        
        // Rate limiting - wait 2 seconds between characters
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        failed++;
        console.error(`Error enriching ${character.name}:`, error);
      }
    }
    
    console.log(`Anime ${data.anime.title} enrichment complete - Succeeded: ${succeeded}, Failed: ${failed}`);
    
    return {
      animeTitle: data.anime.title,
      processed: charactersToProcess.length,
      succeeded,
      failed,
    };
  },
});

// Batch processing action for cron jobs
export const batchEnrichCharacters = internalAction({
  args: {
    animeBatchSize: v.optional(v.number()), // How many anime to process
    charactersPerAnime: v.optional(v.number()), // How many characters per anime
  },
  handler: async (ctx, args) => {
    const animeBatchSize = args.animeBatchSize || 3;
    const charactersPerAnime = args.charactersPerAnime || 5;
    
    console.log(`[Batch Enrichment] Starting - Processing ${animeBatchSize} anime, ${charactersPerAnime} characters each`);
    
    // Get anime with characters
    const animePagination = await ctx.runQuery(
      internal.characterEnrichment.getAnimeWithCharacters,
      { limit: animeBatchSize }
    );
    
    if (animePagination.page.length === 0) {
      console.log("[Batch Enrichment] No anime found to process");
      return { totalProcessed: 0, totalSucceeded: 0, totalFailed: 0 };
    }
    
    let totalProcessed = 0;
    let totalSucceeded = 0;
    let totalFailed = 0;
    
    // Process each anime
    for (const anime of animePagination.page) {
      try {
        const result = await ctx.runAction(
          internal.characterEnrichment.enrichCharactersForAnime,
          {
            animeId: anime._id,
            maxCharacters: charactersPerAnime,
          }
        );
        
        totalProcessed += result.processed;
        totalSucceeded += result.succeeded;
        totalFailed += result.failed;
        
        // Wait between anime to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.error(`Failed to process anime ${anime._id}:`, error);
      }
    }
    
    console.log(`[Batch Enrichment] Complete - Processed: ${totalProcessed}, Succeeded: ${totalSucceeded}, Failed: ${totalFailed}`);
    
    return {
      totalProcessed,
      totalSucceeded,
      totalFailed,
    };
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
        enrichedCharacters += anime.characters.filter((c: CharacterType) => c.isAIEnriched === true).length;
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
        const hasUnenriched = anime.characters.some((c: CharacterType) => !c.isAIEnriched);
        if (hasUnenriched) {
          animesWithUnenriched.push(anime);
          if (animesWithUnenriched.length >= args.limit) break;
        }
      }
    }
    
    return animesWithUnenriched;
  },
});