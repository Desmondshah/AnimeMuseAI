// scripts/migrate-character-enrichment.ts
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const CONVEX_URL = process.env.CONVEX_URL;

if (!CONVEX_URL) {
  console.error("❌ Error: CONVEX_URL environment variable is required");
  console.error("Make sure your .env.local file contains:");
  console.error("CONVEX_URL=https://your-deployment.convex.cloud");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function runValidation() {
  console.log("🔍 Running migration validation...");
  
  try {
    const result = await client.action(api.characterMigration.validateMigration, {});
    
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
      result.problematicAnime.forEach((anime: any) => {
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

async function runMigration(dryRun: boolean) {
  console.log(`🚀 Running migration (dry run: ${dryRun})...`);
  
  try {
    const result = await client.action(api.characterMigration.runCharacterMigration, {
      dryRun,
      batchSize: 10,
    });
    
    console.log("\n📊 Migration Results:");
    console.log(`  Total anime: ${result.totalAnime}`);
    console.log(`  Processed: ${result.totalProcessed}`);
    console.log(`  Updated: ${result.totalUpdated}`);
    console.log(`  Errors: ${result.errorCount}`);
    console.log(`  Dry run: ${result.dryRun ? '✅' : '❌'}`);
    
    if (result.errors && result.errors.length > 0) {
      console.log("\n❌ Errors:");
      result.errors.forEach((error: string) => {
        console.log(`  - ${error}`);
      });
    }
    
    return result;
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const validateOnly = args.includes('--validate-only');
  
  console.log("=".repeat(60));
  console.log("CHARACTER ENRICHMENT MIGRATION SCRIPT");
  console.log("=".repeat(60));
  
  try {
    if (validateOnly) {
      await runValidation();
      return;
    }
    
    // Step 1: Validation
    console.log("📋 Step 1: Initial validation");
    const validation = await runValidation();
    
    if (validation.migrationComplete) {
      console.log("\n✅ Migration already complete! No action needed.");
      return;
    }
    
    // Step 2: Migration
    console.log(`\n🚀 Step 2: ${isDryRun ? 'Dry run (preview only)' : 'Running actual migration'}`);
    const migrationResult = await runMigration(isDryRun);
    
    if (isDryRun) {
      console.log("\n💡 To apply changes, run without --dry-run flag");
      return;
    }
    
    // Step 3: Final validation
    console.log("\n✅ Step 3: Final validation");
    const finalValidation = await runValidation();
    
    if (finalValidation.migrationComplete) {
      console.log("\n🎉 MIGRATION COMPLETED SUCCESSFULLY!");
      console.log(`✅ Migrated ${migrationResult.totalUpdated} anime documents`);
    } else {
      console.log("\n⚠️  Migration completed but some issues remain");
      console.log(`${finalValidation.documentsWithOldField} documents still need fixing`);
    }
    
  } catch (error) {
    console.error("\n💥 Migration script failed:", error);
    process.exit(1);
  }
}

// Show help
if (process.argv.includes('--help')) {
  console.log(`
Usage: npx tsx scripts/migrate-character-enrichment.ts [options]

Options:
  --dry-run        Preview changes without applying them
  --validate-only  Only run validation, don't migrate
  --help          Show this help

Examples:
  npx tsx scripts/migrate-character-enrichment.ts --dry-run
  npx tsx scripts/migrate-character-enrichment.ts --validate-only
  npx tsx scripts/migrate-character-enrichment.ts
`);
  process.exit(0);
}

main();