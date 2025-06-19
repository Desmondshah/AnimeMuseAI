// convex/migrations/migrateCharacterEnrichmentStatus.ts
import { internalMutation, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

/**
 * Migration script to convert character `isAIEnriched` boolean field 
 * to the new `enrichmentStatus` enum field.
 */

// Step 1: Internal action to orchestrate the migration
export const migrateCharacterEnrichmentFields = internalAction({
  args: {
    batchSize: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 10;
    const dryRun = args.dryRun || false;
    
    console.log(`[Migration] Starting character enrichment migration (dryRun: ${dryRun}, batchSize: ${batchSize})`);
    
    // Get all anime documents that might need migration
    const allAnime = await ctx.runQuery(internal.anime.getAllAnimeForMigration, {});
    
    let totalProcessed = 0;
    let totalUpdated = 0;
    let errors: string[] = [];
    
    // Process anime in batches to avoid overwhelming the database
    for (let i = 0; i < allAnime.length; i += batchSize) {
      const batch = allAnime.slice(i, i + batchSize);
      
      console.log(`[Migration] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allAnime.length / batchSize)} (${batch.length} anime)`);
      
      for (const anime of batch) {
        try {
          totalProcessed++;
          
          // Check if this anime has characters that need migration
          if (!anime.characters || anime.characters.length === 0) {
            continue;
          }
          
          // Check if any characters have the old isAIEnriched field
          const needsMigration = anime.characters.some((char: any) => 
            'isAIEnriched' in char
          );
          
          if (!needsMigration) {
            continue;
          }
          
          console.log(`[Migration] Migrating characters for anime: "${anime.title}" (${anime.characters.length} characters)`);
          
          // Transform characters
          const migratedCharacters = anime.characters.map((char: any) => {
            const { isAIEnriched, ...characterWithoutOldField } = char;
            
            // Convert boolean to status enum
            let enrichmentStatus: "pending" | "success" | "failed" | undefined;
            
            if (typeof isAIEnriched === 'boolean') {
              if (isAIEnriched === true) {
                // If it was marked as enriched, set to success
                enrichmentStatus = "success";
              } else {
                // If it was false, we need to determine if it failed or is just pending
                // Check if character has AI-enriched fields to determine status
                const hasEnrichedData = char.personalityAnalysis || 
                                      char.backstoryDetails || 
                                      char.characterDevelopment ||
                                      (char.detailedAbilities && char.detailedAbilities.length > 0) ||
                                      (char.keyRelationships && char.keyRelationships.length > 0);
                
                if (hasEnrichedData) {
                  // Has enriched data but was marked false - likely a data inconsistency, mark as success
                  enrichmentStatus = "success";
                } else {
                  // No enriched data and was false - mark as pending for retry
                  enrichmentStatus = "pending";
                }
              }
            }
            
            return {
              ...characterWithoutOldField,
              ...(enrichmentStatus && { enrichmentStatus })
            };
          });
          
          if (!dryRun) {
            // Update the anime document with migrated characters
            await ctx.runMutation(internal.anime.updateAnimeCharacters, {
              animeId: anime._id,
              characters: migratedCharacters,
            });
          }
          
          totalUpdated++;
          
          // Log the changes for this anime
          const changesLog = migratedCharacters
            .map((char, index) => {
              const oldChar = anime.characters[index];
              if ('isAIEnriched' in oldChar) {
                return `  - ${char.name}: isAIEnriched(${oldChar.isAIEnriched}) → enrichmentStatus(${char.enrichmentStatus || 'undefined'})`;
              }
              return null;
            })
            .filter(Boolean);
          
          if (changesLog.length > 0) {
            console.log(`[Migration] Changes for "${anime.title}":\n${changesLog.join('\n')}`);
          }
          
        } catch (error) {
          const errorMsg = `Failed to migrate anime "${anime.title}" (${anime._id}): ${error}`;
          console.error(`[Migration] ${errorMsg}`);
          errors.push(errorMsg);
        }
      }
      
      // Small delay between batches to be gentle on the database
      if (i + batchSize < allAnime.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    const summary = {
      totalAnime: allAnime.length,
      totalProcessed,
      totalUpdated,
      errorCount: errors.length,
      errors: errors.slice(0, 10), // Limit error details in response
      dryRun,
    };
    
    console.log(`[Migration] Migration completed:`, summary);
    
    return summary;
  },
});

// Step 2: Validation function to check migration success
export const validateCharacterMigration = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log(`[Migration Validation] Starting validation check...`);
    
    const allAnime = await ctx.runQuery(internal.anime.getAllAnimeForMigration, {});
    
    let documentsWithOldField = 0;
    let charactersWithOldField = 0;
    let totalCharacters = 0;
    let statusDistribution = {
      pending: 0,
      success: 0,
      failed: 0,
      undefined: 0,
    };
    
    const problematicAnime: Array<{
      animeId: string;
      title: string;
      charactersWithOldField: string[];
    }> = [];
    
    for (const anime of allAnime) {
      if (!anime.characters || anime.characters.length === 0) {
        continue;
      }
      
      const charactersWithIssues: string[] = [];
      
      for (const char of anime.characters) {
        totalCharacters++;
        
        // Check for old field
        if ('isAIEnriched' in char) {
          charactersWithOldField++;
          charactersWithIssues.push(char.name);
        }
        
        // Count status distribution
        const status = (char as any).enrichmentStatus;
        if (status === "pending") statusDistribution.pending++;
        else if (status === "success") statusDistribution.success++;
        else if (status === "failed") statusDistribution.failed++;
        else statusDistribution.undefined++;
      }
      
      if (charactersWithIssues.length > 0) {
        documentsWithOldField++;
        problematicAnime.push({
          animeId: anime._id,
          title: anime.title,
          charactersWithOldField: charactersWithIssues,
        });
      }
    }
    
    const validationResult = {
      totalAnimeDocuments: allAnime.length,
      totalCharacters,
      documentsWithOldField,
      charactersWithOldField,
      statusDistribution,
      migrationComplete: documentsWithOldField === 0,
      problematicAnime: problematicAnime.slice(0, 5), // Show first 5 problematic documents
    };
    
    console.log(`[Migration Validation] Validation results:`, validationResult);
    
    return validationResult;
  },
});

// Step 3: Cleanup function to remove any remaining old fields (use with caution)
export const cleanupOldEnrichmentFields = internalAction({
  args: {
    forceCleanup: v.boolean(), // Safety flag to prevent accidental execution
  },
  handler: async (ctx, args) => {
    if (!args.forceCleanup) {
      throw new Error("Must set forceCleanup: true to execute this operation");
    }
    
    console.log(`[Migration Cleanup] Starting cleanup of old isAIEnriched fields...`);
    
    const allAnime = await ctx.runQuery(internal.anime.getAllAnimeForMigration, {});
    let cleanedDocuments = 0;
    
    for (const anime of allAnime) {
      if (!anime.characters || anime.characters.length === 0) {
        continue;
      }
      
      const hasOldFields = anime.characters.some((char: any) => 'isAIEnriched' in char);
      
      if (hasOldFields) {
        const cleanedCharacters = anime.characters.map((char: any) => {
          const { isAIEnriched, ...cleanCharacter } = char;
          return cleanCharacter;
        });
        
        await ctx.runMutation(internal.anime.updateAnimeCharacters, {
          animeId: anime._id,
          characters: cleanedCharacters,
        });
        
        cleanedDocuments++;
        console.log(`[Migration Cleanup] Cleaned "${anime.title}"`);
      }
    }
    
    console.log(`[Migration Cleanup] Cleaned ${cleanedDocuments} documents`);
    return { cleanedDocuments };
  },
});

// Step 4: Helper function to fix specific anime by ID
export const fixSpecificAnime = internalMutation({
  args: {
    animeId: v.id("anime"),
  },
  handler: async (ctx, args) => {
    const anime = await ctx.db.get(args.animeId);
    if (!anime || !anime.characters) {
      throw new Error(`Anime not found or has no characters: ${args.animeId}`);
    }
    
    const migratedCharacters = anime.characters.map((char: any) => {
      if (!('isAIEnriched' in char)) {
        return char; // Already migrated
      }
      
      const { isAIEnriched, ...characterWithoutOldField } = char;
      
      let enrichmentStatus: "pending" | "success" | "failed";
      
      if (isAIEnriched === true) {
        enrichmentStatus = "success";
      } else {
        // Check for enriched data to determine actual status
        const hasEnrichedData = char.personalityAnalysis || 
                              char.backstoryDetails || 
                              char.characterDevelopment;
        enrichmentStatus = hasEnrichedData ? "success" : "pending";
      }
      
      return {
        ...characterWithoutOldField,
        enrichmentStatus,
      };
    });
    
    await ctx.db.patch(args.animeId, { characters: migratedCharacters });
    
    console.log(`[Migration] Fixed anime: ${anime.title} (${args.animeId})`);
    return { success: true, migratedCharacterCount: migratedCharacters.length };
  },
});