// convex/migrations.ts
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Main migration runner - easier to call from CLI
export const runCharacterSchemaMigration = internalAction({
  handler: async (ctx) => {
    console.log("🚀 Starting character schema migration process...");
    
    // Step 1: Run the migration
    const migrationResult = await ctx.runAction(internal.admin.migrateCharactersSchema);
    
    // Step 2: Validate the results
    console.log("🔍 Validating migration results...");
    const validationResult = await ctx.runAction(internal.admin.validateCharacterMigration);
    
    const finalResult = {
      migration: migrationResult,
      validation: validationResult,
      overallSuccess: migrationResult.success && validationResult.migrationComplete
    };
    
    if (finalResult.overallSuccess) {
      console.log("🎉 Migration completed successfully!");
    } else {
      console.log("⚠️  Migration completed with issues. Check the results.");
    }
    
    return finalResult;
  },
});