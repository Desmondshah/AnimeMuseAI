// convex/migrations/migrateCharacterEnrichment.ts - WORKING VERSION
import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

// Check how many characters need migration
export const checkMigrationNeeded = internalQuery({
  args: {},
  handler: async (ctx) => {
    const allAnime = await ctx.db
      .query("anime")
      .filter(q => q.neq(q.field("characters"), undefined))
      .collect();
    
    let totalCharactersWithOldField = 0;
    let animeWithOldData = 0;
    
    for (const anime of allAnime) {
      if (!anime.characters) continue;
      
      let animeHasOldData = false;
      for (const char of anime.characters) {
        if ((char as any).hasOwnProperty('isAIEnriched')) {
          totalCharactersWithOldField++;
          animeHasOldData = true;
        }
      }
      
      if (animeHasOldData) {
        animeWithOldData++;
      }
    }
    
    return {
      totalAnime: allAnime.length,
      animeWithOldData,
      totalCharactersWithOldField,
      migrationNeeded: totalCharactersWithOldField > 0
    };
  }
});

// Migration as a mutation (mutations have db access)
export const migrateCharacterEnrichmentFields = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("[Migration] Starting character enrichment field migration...");
    
    // Get all anime with characters
    const allAnime = await ctx.db
      .query("anime")
      .filter(q => q.neq(q.field("characters"), undefined))
      .collect();
    
    let totalAnimeProcessed = 0;
    let totalCharactersUpdated = 0;
    
    for (const anime of allAnime) {
      if (!anime.characters || anime.characters.length === 0) continue;
      
      let animeNeedsUpdate = false;
      const updatedCharacters = anime.characters.map((char: any) => {
        // Check if character has old isAIEnriched field
        if (char.hasOwnProperty('isAIEnriched')) {
          animeNeedsUpdate = true;
          totalCharactersUpdated++;
          
          // Convert isAIEnriched to enrichmentStatus
          const newChar = { ...char };
          
          if (char.isAIEnriched === true) {
            newChar.enrichmentStatus = "success";
            newChar.enrichmentTimestamp = newChar.enrichmentTimestamp || Date.now();
          } else {
            newChar.enrichmentStatus = "pending";
          }
          
          // Remove the old field
          delete newChar.isAIEnriched;
          
          console.log(`[Migration] Converted character ${char.name}: isAIEnriched(${char.isAIEnriched}) -> enrichmentStatus(${newChar.enrichmentStatus})`);
          
          return newChar;
        }
        
        return char;
      });
      
      // Update the anime if any characters were modified
      if (animeNeedsUpdate) {
        await ctx.db.patch(anime._id, {
          characters: updatedCharacters as any
        });
        totalAnimeProcessed++;
        console.log(`[Migration] Updated anime: ${anime.title} (${anime.characters.length} characters)`);
      }
    }
    
    console.log(`[Migration] Complete! Updated ${totalCharactersUpdated} characters across ${totalAnimeProcessed} anime`);
    
    return {
      animeProcessed: totalAnimeProcessed,
      charactersUpdated: totalCharactersUpdated
    };
  }
});

// Batch migration (processes anime in smaller batches to avoid timeouts)
export const migrateBatch = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
    startIndex: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 10;
    const startIndex = args.startIndex || 0;
    
    console.log(`[Batch Migration] Starting batch ${startIndex} with size ${batchSize}`);
    
    // Get anime with characters, using pagination
    const allAnime = await ctx.db
      .query("anime")
      .filter(q => q.neq(q.field("characters"), undefined))
      .collect();
    
    const batch = allAnime.slice(startIndex, startIndex + batchSize);
    
    let totalAnimeProcessed = 0;
    let totalCharactersUpdated = 0;
    
    for (const anime of batch) {
      if (!anime.characters || anime.characters.length === 0) continue;
      
      let animeNeedsUpdate = false;
      const updatedCharacters = anime.characters.map((char: any) => {
        if (char.hasOwnProperty('isAIEnriched')) {
          animeNeedsUpdate = true;
          totalCharactersUpdated++;
          
          const newChar = { ...char };
          
          if (char.isAIEnriched === true) {
            newChar.enrichmentStatus = "success";
            newChar.enrichmentTimestamp = newChar.enrichmentTimestamp || Date.now();
          } else {
            newChar.enrichmentStatus = "pending";
          }
          
          delete newChar.isAIEnriched;
          return newChar;
        }
        return char;
      });
      
      if (animeNeedsUpdate) {
        await ctx.db.patch(anime._id, {
          characters: updatedCharacters as any
        });
        totalAnimeProcessed++;
        console.log(`[Batch Migration] Updated: ${anime.title}`);
      }
    }
    
    const hasMore = startIndex + batchSize < allAnime.length;
    
    console.log(`[Batch Migration] Batch ${startIndex} complete. Processed: ${totalAnimeProcessed}, Characters: ${totalCharactersUpdated}, Has more: ${hasMore}`);
    
    return {
      animeProcessed: totalAnimeProcessed,
      charactersUpdated: totalCharactersUpdated,
      hasMore,
      nextIndex: hasMore ? startIndex + batchSize : null,
      totalRemaining: hasMore ? allAnime.length - (startIndex + batchSize) : 0
    };
  }
});

// Emergency rollback
export const rollbackCharacterEnrichmentFields = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("[Rollback] Starting character enrichment field rollback...");
    
    const allAnime = await ctx.db
      .query("anime")
      .filter(q => q.neq(q.field("characters"), undefined))
      .collect();
    
    let totalAnimeProcessed = 0;
    let totalCharactersUpdated = 0;
    
    for (const anime of allAnime) {
      if (!anime.characters || anime.characters.length === 0) continue;
      
      let animeNeedsUpdate = false;
      const updatedCharacters = anime.characters.map((char: any) => {
        if (char.hasOwnProperty('enrichmentStatus')) {
          animeNeedsUpdate = true;
          totalCharactersUpdated++;
          
          const newChar = { ...char };
          
          // Convert enrichmentStatus back to isAIEnriched
          newChar.isAIEnriched = char.enrichmentStatus === "success";
          
          // Remove new fields
          delete newChar.enrichmentStatus;
          delete newChar.enrichmentAttempts;
          delete newChar.lastAttemptTimestamp;
          delete newChar.lastErrorMessage;
          
          return newChar;
        }
        
        return char;
      });
      
      if (animeNeedsUpdate) {
        await ctx.db.patch(anime._id, {
          characters: updatedCharacters as any
        });
        totalAnimeProcessed++;
      }
    }
    
    console.log(`[Rollback] Complete! Updated ${totalCharactersUpdated} characters across ${totalAnimeProcessed} anime`);
    
    return {
      animeProcessed: totalAnimeProcessed,
      charactersUpdated: totalCharactersUpdated
    };
  }
});

// Get list of anime that need migration (for debugging)
export const getAnimeNeedingMigration = internalQuery({
  args: {},
  handler: async (ctx): Promise<Array<{
    animeId: string;
    title: string;
    totalCharacters: number;
    charactersNeedingMigration: number;
    characterNames: string[];
  }>> => {
    const allAnime = await ctx.db
      .query("anime")
      .filter(q => q.neq(q.field("characters"), undefined))
      .collect();
    
    const animeNeedingMigration: Array<{
      animeId: string;
      title: string;
      totalCharacters: number;
      charactersNeedingMigration: number;
      characterNames: string[];
    }> = [];
    
    for (const anime of allAnime) {
      if (!anime.characters) continue;
      
      const charactersWithOldField = anime.characters.filter(
        (char: any) => char.hasOwnProperty('isAIEnriched')
      );
      
      if (charactersWithOldField.length > 0) {
        animeNeedingMigration.push({
          animeId: anime._id,
          title: anime.title,
          totalCharacters: anime.characters.length,
          charactersNeedingMigration: charactersWithOldField.length,
          characterNames: charactersWithOldField.map((c: any) => c.name)
        });
      }
    }
    
    return animeNeedingMigration;
  }
});