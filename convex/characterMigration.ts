// convex/characterMigration.ts (completely separate file)
import { internalMutation, internalAction, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Internal queries and mutations (no imports from api)
export const getAllAnime = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("anime").collect();
  },
});

export const patchAnimeCharacters = internalMutation({
  args: {
    animeId: v.id("anime"),
    characters: v.any(),
  },
  handler: async (ctx, { animeId, characters }) => {
    await ctx.db.patch(animeId, { characters });
  },
});

// Main migration action
export const runCharacterMigration = internalAction({
  args: {
    dryRun: v.optional(v.boolean()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;
    const batchSize = args.batchSize ?? 10;
    
    console.log(`[Migration] Starting migration (dryRun: ${dryRun})`);
    
    // Get all anime
    const allAnime = await ctx.runQuery(internal.characterMigration.getAllAnime, {});
    
    let totalProcessed = 0;
    let totalUpdated = 0;
    const errors: string[] = [];
    
    // Process in batches
    for (let i = 0; i < allAnime.length; i += batchSize) {
      const batch = allAnime.slice(i, i + batchSize);
      
      for (const anime of batch) {
        try {
          totalProcessed++;
          
          // Skip if no characters
          if (!anime.characters || anime.characters.length === 0) {
            continue;
          }
          
          // Check if migration is needed
          const needsMigration = anime.characters.some((char: any) => 
            'isAIEnriched' in char
          );
          
          if (!needsMigration) {
            continue;
          }
          
          console.log(`[Migration] Processing: "${anime.title}"`);
          
          // Transform characters
          const migratedCharacters = anime.characters.map((char: any) => {
            // Remove the old field
            const { isAIEnriched, ...rest } = char;
            
            // Determine new status
            let enrichmentStatus: "pending" | "success" | "failed" | undefined;
            
            if (typeof isAIEnriched === 'boolean') {
              if (isAIEnriched === true) {
                enrichmentStatus = "success";
              } else {
                // Check if character has enriched data
                const hasEnrichedData = char.personalityAnalysis || 
                                      char.backstoryDetails || 
                                      char.characterDevelopment ||
                                      (char.detailedAbilities && char.detailedAbilities.length > 0);
                
                enrichmentStatus = hasEnrichedData ? "success" : "pending";
              }
            }
            
            return {
              ...rest,
              ...(enrichmentStatus && { enrichmentStatus })
            };
          });
          
          // Update the document (only if not dry run)
          if (!dryRun) {
            await ctx.runMutation(internal.characterMigration.patchAnimeCharacters, {
              animeId: anime._id,
              characters: migratedCharacters,
            });
          }
          
          totalUpdated++;
          
        } catch (error) {
          const errorMsg = `Error migrating "${anime.title}": ${error}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }
      
      // Small delay between batches
      if (i + batchSize < allAnime.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    const result = {
      totalAnime: allAnime.length,
      totalProcessed,
      totalUpdated,
      errorCount: errors.length,
      errors: errors.slice(0, 3), // First 3 errors
      dryRun
    };
    
    console.log("[Migration] Complete:", result);
    return result;
  },
});

export const validateMigration = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("[Validation] Starting validation...");
    
    const allAnime = await ctx.runQuery(internal.characterMigration.getAllAnime, {});
    
    let documentsWithOldField = 0;
    let charactersWithOldField = 0;
    let totalCharacters = 0;
    
    const statusDistribution = {
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
    
    const result = {
      totalAnimeDocuments: allAnime.length,
      totalCharacters,
      documentsWithOldField,
      charactersWithOldField,
      statusDistribution,
      migrationComplete: documentsWithOldField === 0,
      problematicAnime: problematicAnime.slice(0, 5),
    };
    
    console.log("[Validation] Results:", result);
    return result;
  },
});

export const fixAnime = internalMutation({
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
      
      const { isAIEnriched, ...rest } = char;
      
      let enrichmentStatus: "pending" | "success" | "failed";
      
      if (isAIEnriched === true) {
        enrichmentStatus = "success";
      } else {
        const hasEnrichedData = char.personalityAnalysis || 
                              char.backstoryDetails || 
                              char.characterDevelopment;
        enrichmentStatus = hasEnrichedData ? "success" : "pending";
      }
      
      return {
        ...rest,
        enrichmentStatus,
      };
    });
    
    await ctx.db.patch(args.animeId, { characters: migratedCharacters });
    
    console.log(`[Fix] Fixed anime: ${anime.title}`);
    return { 
      success: true, 
      migratedCharacterCount: migratedCharacters.length 
    };
  },
});