#!/usr/bin/env node

// scripts/migrate-character-enrichment.ts
import { ConvexHttpClient } from "convex/browser";
import { api } from "./_generated/api";

/**
 * Migration script to convert character isAIEnriched to enrichmentStatus
 * 
 * Usage:
 *   npx tsx scripts/migrate-character-enrichment.ts
 *   npx tsx scripts/migrate-character-enrichment.ts --dry-run
 *   npx tsx scripts/migrate-character-enrichment.ts --validate-only
 *   npx tsx scripts/migrate-character-enrichment.ts --quick-fix
 */

const CONVEX_URL = process.env.CONVEX_URL;

if (!CONVEX_URL) {
  console.error("❌ Error: CONVEX_URL environment variable is required");
  console.error("Make sure your .env.local file contains:");
  console.error("CONVEX_URL=https://your-deployment.convex.cloud");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

interface MigrationOptions {
  dryRun?: boolean;
  validateOnly?: boolean;
  quickFix?: boolean;
  batchSize?: number;
}

async function parseArgs(): Promise<MigrationOptions> {
  const args = process.argv.slice(2);
  
  return {
    dryRun: args.includes('--dry-run'),
    validateOnly: args.includes('--validate-only'),
    quickFix: args.includes('--quick-fix'),
    batchSize: 10,
  };
}

async function runValidation() {
  console.log("🔍 Running migration validation...");
  
  try {
    const result = await client.action(api.migrations.migrateCharacterEnrichmentStatus.validateCharacterMigration, {});
    
    console.log("\n📊 Validation Results:");
    console.log(`  Total anime documents: ${result.totalAnimeDocuments}`);
    console.log(`  Total characters: ${result.totalCharacters}`);
    console.log(`  Documents with old field: ${result.documentsWithOldField}`);
    console.log(`  Characters with old field: ${result.charactersWithOldField}`);
    console.log(`  Migration complete: ${result.migrationComplete ? '✅' : '❌'}`);
    
    console.log("\n📈 Status Distribution:");
    console.log(`  ⏳ Pending: ${result.statusDistribution.pending}`);
    console.log(`  ✅ Success: ${result.statusDistribution.success}`);
    console.log(`  ❌ Failed: ${result.statusDistribution.failed}`);
    console.log(`  ❔ Undefined: ${result.statusDistribution.undefined}`);
    
    if (result.problematicAnime.length > 0) {
      console.log("\n⚠️  Problematic Documents:");
      result.problematicAnime.forEach(anime => {
        console.log(`  - ${anime.title} (${anime.animeId})`);
        console.log(`    Characters: ${anime.charactersWithOldField.join(', ')}`);
      });
    }
    
    return result;
  } catch (error) {
    console.error("❌ Validation failed:", error);
    throw error;
  }
}

async function runMigration(dryRun: boolean, batchSize: number) {
  console.log(`🚀 Running migration (dry run: ${dryRun})...`);
  
  try {
    const result = await client.action(api.migrations.migrateCharacterEnrichmentStatus.migrateCharacterEnrichmentFields, {
      dryRun,
      batchSize,
    });
    
    console.log("\n📊 Migration Results:");
    console.log(`  Total anime: ${result.totalAnime}`);
    console.log(`  Processed: ${result.totalProcessed}`);
    console.log(`  Updated: ${result.totalUpdated}`);
    console.log(`  Errors: ${result.errorCount}`);
    console.log(`  Dry run: ${result.dryRun ? '✅' : '❌'}`);
    
    if (result.errors.length > 0) {
      console.log("\n❌ Errors:");
      result.errors.forEach(error => {
        console.log(`  - ${error}`);
      });
    }
    
    return result;
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

async function runQuickFix() {
  console.log("🔧 Running quick fix for problematic documents...");
  
  try {
    // First validate to find problematic documents
    const validation = await runValidation();
    
    if (validation.problematicAnime.length === 0) {
      console.log("✅ No problematic documents found!");
      return { fixed: 0 };
    }
    
    console.log(`\n🔧 Fixing ${validation.problematicAnime.length} problematic documents...`);
    
    let fixedCount = 0;
    
    for (const problematic of validation.problematicAnime) {
      try {
        await client.mutation(api.migrations.migrateCharacterEnrichmentStatus.fixSpecificAnime, {
          animeId: problematic.animeId as any,
        });
        
        fixedCount++;
        console.log(`  ✅ Fixed: ${problematic.title}`);
      } catch (error) {
        console.error(`  ❌ Failed to fix ${problematic.title}:`, error);
      }
    }
    
    console.log(`\n🎉 Fixed ${fixedCount} documents`);
    return { fixed: fixedCount };
  } catch (error) {
    console.error("❌ Quick fix failed:", error);
    throw error;
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("CHARACTER ENRICHMENT MIGRATION SCRIPT");
  console.log("=".repeat(60));
  
  const options = await parseArgs();
  
  try {
    if (options.validateOnly) {
      await runValidation();
      return;
    }
    
    if (options.quickFix) {
      await runQuickFix();
      return;
    }
    
    // Step 1: Always run validation first
    console.log("📋 Step 1: Initial validation");
    const initialValidation = await runValidation();
    
    if (initialValidation.migrationComplete) {
      console.log("\n✅ Migration already complete! No action needed.");
      return;
    }
    
    // Step 2: Run dry run if not already complete
    if (options.dryRun) {
      console.log("\n🔍 Step 2: Dry run (preview only)");
      await runMigration(true, options.batchSize || 10);
      console.log("\n💡 To apply changes, run without --dry-run flag");
      return;
    }
    
    // Step 3: Run actual migration
    console.log("\n🚀 Step 2: Running actual migration");
    const migrationResult = await runMigration(false, options.batchSize || 10);
    
    if (migrationResult.errorCount > 0) {
      console.log("\n⚠️  Migration completed with errors. Running quick fix...");
      await runQuickFix();
    }
    
    // Step 4: Final validation
    console.log("\n✅ Step 3: Final validation");
    const finalValidation = await runValidation();
    
    if (finalValidation.migrationComplete) {
      console.log("\n🎉 MIGRATION COMPLETED SUCCESSFULLY!");
      console.log(`✅ Migrated ${migrationResult.totalUpdated} anime documents`);
    } else {
      console.log("\n⚠️  Migration completed but some issues remain");
      console.log("Consider running with --quick-fix to resolve remaining issues");
    }
    
  } catch (error) {
    console.error("\n💥 Migration script failed:", error);
    process.exit(1);
  }
}

// Handle command line help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Character Enrichment Migration Script

Usage:
  npx tsx scripts/migrate-character-enrichment.ts [options]

Options:
  --dry-run        Preview changes without applying them
  --validate-only  Only run validation, don't migrate
  --quick-fix      Fix problematic documents found in validation
  --help, -h       Show this help message

Examples:
  # Preview what would be migrated
  npx tsx scripts/migrate-character-enrichment.ts --dry-run

  # Run the actual migration
  npx tsx scripts/migrate-character-enrichment.ts

  # Just check current migration status
  npx tsx scripts/migrate-character-enrichment.ts --validate-only

  # Fix any remaining problematic documents
  npx tsx scripts/migrate-character-enrichment.ts --quick-fix
`);
  process.exit(0);
}

main();