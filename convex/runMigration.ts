// convex/migrations/runMigration.ts
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Master migration runner - execute this to run the character enrichment migration
 * 
 * Usage from Convex dashboard or a scheduled function:
 * 1. First run with dryRun: true to see what would be changed
 * 2. Then run with dryRun: false to apply the changes
 * 3. Finally run validation to confirm success
 */

export const executeCharacterMigration = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("=".repeat(60));
    console.log("STARTING CHARACTER ENRICHMENT MIGRATION");
    console.log("=".repeat(60));
    
    try {
      // Step 1: Run a dry run first to see what would change
      console.log("\n🔍 Step 1: Dry run to preview changes...");
      const dryRunResult = await ctx.runAction(
        internal.migrations.migrateCharacterEnrichmentStatus.migrateCharacterEnrichmentFields,
        {
          batchSize: 5,
          dryRun: true,
        }
      );
      
      console.log("📊 Dry run results:", dryRunResult);
      
      if (dryRunResult.totalUpdated === 0) {
        console.log("✅ No documents need migration!");
        return { status: "no_migration_needed", dryRunResult };
      }
      
      // Step 2: Run the actual migration
      console.log("\n🚀 Step 2: Running actual migration...");
      const migrationResult = await ctx.runAction(
        internal.migrations.migrateCharacterEnrichmentStatus.migrateCharacterEnrichmentFields,
        {
          batchSize: 10,
          dryRun: false,
        }
      );
      
      console.log("📊 Migration results:", migrationResult);
      
      // Step 3: Validate the migration
      console.log("\n✅ Step 3: Validating migration...");
      const validationResult = await ctx.runAction(
        internal.migrations.migrateCharacterEnrichmentStatus.validateCharacterMigration,
        {}
      );
      
      console.log("📊 Validation results:", validationResult);
      
      // Step 4: Determine if migration was successful
      const success = validationResult.migrationComplete && migrationResult.errorCount === 0;
      
      if (success) {
        console.log("\n🎉 MIGRATION COMPLETED SUCCESSFULLY!");
        console.log(`✅ Migrated ${migrationResult.totalUpdated} anime documents`);
        console.log(`✅ Status distribution:`, validationResult.statusDistribution);
      } else {
        console.log("\n⚠️  MIGRATION COMPLETED WITH ISSUES");
        if (!validationResult.migrationComplete) {
          console.log(`❌ ${validationResult.documentsWithOldField} documents still have old fields`);
        }
        if (migrationResult.errorCount > 0) {
          console.log(`❌ ${migrationResult.errorCount} errors occurred during migration`);
        }
      }
      
      return {
        status: success ? "success" : "partial_success",
        dryRunResult,
        migrationResult,
        validationResult,
      };
      
    } catch (error) {
      console.error("💥 MIGRATION FAILED:", error);
      throw error;
    }
  },
});

// Emergency rollback function (if needed)
export const emergencyRollbackMigration = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("⚠️  EMERGENCY ROLLBACK - This will attempt to restore isAIEnriched fields");
    console.log("Note: This may not be 100% accurate as we're inferring from enrichmentStatus");
    
    // Implementation note: A true rollback would require backing up data before migration
    // This is a best-effort restoration based on current enrichmentStatus values
    
    throw new Error("Rollback not implemented - restore from backup if available");
  },
});

// Quick fix for individual problematic documents
export const quickFixProblematicDocuments = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("🔧 Quick fix: Finding and fixing problematic documents...");
    
    const validation = await ctx.runAction(
      internal.migrations.migrateCharacterEnrichmentStatus.validateCharacterMigration,
      {}
    );
    
    if (validation.problematicAnime.length === 0) {
      console.log("✅ No problematic documents found!");
      return { fixed: 0 };
    }
    
    let fixedCount = 0;
    
    for (const problematic of validation.problematicAnime) {
      try {
        await ctx.runMutation(
          internal.migrations.migrateCharacterEnrichmentStatus.fixSpecificAnime,
          { animeId: problematic.animeId as any }
        );
        fixedCount++;
        console.log(`✅ Fixed: ${problematic.title}`);
      } catch (error) {
        console.error(`❌ Failed to fix ${problematic.title}:`, error);
      }
    }
    
    console.log(`🎉 Fixed ${fixedCount} documents`);
    return { fixed: fixedCount };
  },
});