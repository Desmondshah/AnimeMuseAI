// convex/retryEnrichment.ts - Functions to retry character enrichment
// @ts-nocheck
import { mutation, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";

// Define clear return type interfaces to avoid deep type recursion
interface CharacterResetResult {
  success: boolean;
  charactersReset: number;
  resetTo: string;
}

interface AnimeRetryInfo {
  animeId: Id<"anime">;
  title: string;
  totalCharacters: number;
  pendingCharacters: number;
  failedCharacters: number;
  successfulCharacters: number;
  charactersByStatus: Record<string, string[]>;
}

interface AdminRetryResult {
  success: boolean;
  message: string;
  resetFirst?: boolean;
}

interface BatchRetryResult {
  success: boolean;
  message: string;
  estimatedCompletionTime: string;
}

// Reset character enrichment status (useful for forcing re-enrichment)
export const resetCharacterEnrichmentStatus = internalMutation({
  args: {
    animeId: v.id("anime"),
    characterNames: v.optional(v.array(v.string())), // If not provided, resets all characters
    resetTo: v.optional(v.union(v.literal("pending"), v.literal("failed"))), // Default: "pending"
  },
  returns: v.object({
    success: v.boolean(),
    charactersReset: v.number(),
    resetTo: v.string()
  }),
  handler: async (ctx, args): Promise<CharacterResetResult> => {
    const anime = await ctx.db.get(args.animeId);
    if (!anime || !anime.characters) {
      throw new Error("Anime not found or has no characters");
    }

    const resetTo = args.resetTo || "pending";
    const targetCharacters = args.characterNames || anime.characters.map((c: any) => c.name);

    console.log(`[Reset] Resetting ${targetCharacters.length} characters to ${resetTo} status`);

    const updatedCharacters = anime.characters.map((char: any) => {
      if (targetCharacters.includes(char.name)) {
        const resetChar = { ...char };
        
        // Reset enrichment tracking fields
        resetChar.enrichmentStatus = resetTo;
        resetChar.enrichmentAttempts = 0;
        resetChar.lastAttemptTimestamp = undefined;
        resetChar.lastErrorMessage = undefined;
        
        // Keep existing enriched content but allow re-enrichment
        console.log(`[Reset] Reset ${char.name} to ${resetTo}`);
        return resetChar;
      }
      return char;
    });

    await ctx.db.patch(args.animeId, {
      characters: updatedCharacters as any
    });

    return {
      success: true,
      charactersReset: targetCharacters.length,
      resetTo
    };
  }
});

// Admin function to reset and retry enrichment for specific anime
export const adminRetryAnimeEnrichment = mutation({
  args: {
    animeId: v.id("anime"),
    resetFirst: v.optional(v.boolean()), // Whether to reset status first
    maxCharacters: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    resetFirst: v.optional(v.boolean())
  }),
  handler: async (ctx, args): Promise<AdminRetryResult> => {
    // Check if user is admin (optional security)
    const userId = await getAuthUserId(ctx);
    if (userId) {
      const userProfile = await ctx.db.query("userProfiles")
        .withIndex("by_userId", q => q.eq("userId", userId))
        .unique();
      
      if (!userProfile?.isAdmin) {
        throw new Error("Admin access required");
      }
    }

    console.log(`[Admin Retry] Starting retry for anime ${args.animeId}`);

    // Reset characters first if requested
    if (args.resetFirst) {
      await ctx.scheduler.runAfter(0, internal.retryEnrichment.resetCharacterEnrichmentStatus, {
        animeId: args.animeId,
        resetTo: "pending"
      });
      
      // Wait a bit for the reset to complete
      await ctx.scheduler.runAfter(2000, internal.characterEnrichment.enrichCharactersForAnime, {
        animeId: args.animeId,
        maxCharacters: args.maxCharacters || 10,
        includeRetries: true
      });
    } else {
      // Just retry existing failed/pending characters
      await ctx.scheduler.runAfter(0, internal.characterEnrichment.enrichCharactersForAnime, {
        animeId: args.animeId,
        maxCharacters: args.maxCharacters || 10,
        includeRetries: true
      });
    }

    return {
      success: true,
      message: "Enrichment retry scheduled",
      resetFirst: args.resetFirst
    };
  }
});

// Get anime with failed or pending characters
export const getAnimeNeedingRetry = internalQuery({
  args: {
    includeOnlyFailed: v.optional(v.boolean()), // If true, only shows anime with failed characters
  },
  returns: v.array(v.object({
    animeId: v.id("anime"),
    title: v.string(),
    totalCharacters: v.number(),
    pendingCharacters: v.number(),
    failedCharacters: v.number(),
    successfulCharacters: v.number(),
    charactersByStatus: v.any() // Use v.any() to avoid deep type recursion
  })),
  handler: async (ctx, args): Promise<AnimeRetryInfo[]> => {
    // FIXED: Query only anime table specifically
    const allAnime = await ctx.db
      .query("anime")
      .filter(q => q.neq(q.field("characters"), undefined))
      .collect();

    const animeNeedingRetry: AnimeRetryInfo[] = [];

    for (const anime of allAnime) {
      // FIXED: Type guard to ensure we have an anime document with characters
      if (!anime.characters || !Array.isArray(anime.characters)) continue;

      const charactersByStatus: Record<string, string[]> = {
        pending: [],
        failed: [],
        success: [],
        skipped: [],
        unknown: []
      };

      let pendingCount = 0;
      let failedCount = 0;
      let successCount = 0;

      anime.characters.forEach((char: any) => {
        const status = char.enrichmentStatus || "unknown";
        charactersByStatus[status] = charactersByStatus[status] || [];
        charactersByStatus[status].push(char.name);

        switch (status) {
          case "pending":
          case "unknown":
            pendingCount++;
            break;
          case "failed":
            failedCount++;
            break;
          case "success":
            successCount++;
            break;
        }
      });

      // Include anime that has pending or failed characters
      const needsRetry = pendingCount > 0 || failedCount > 0;
      const shouldInclude = args.includeOnlyFailed ? failedCount > 0 : needsRetry;

      if (shouldInclude) {
        animeNeedingRetry.push({
          animeId: anime._id,
          title: anime.title,
          totalCharacters: anime.characters.length,
          pendingCharacters: pendingCount,
          failedCharacters: failedCount,
          successfulCharacters: successCount,
          charactersByStatus
        });
      }
    }

    return animeNeedingRetry.sort((a, b) => 
      (b.failedCharacters + b.pendingCharacters) - (a.failedCharacters + a.pendingCharacters)
    );
  }
});

// Batch retry for all anime with failed/pending characters
export const batchRetryAllFailedEnrichments = mutation({
  args: {
    maxAnimeToProcess: v.optional(v.number()),
    charactersPerAnime: v.optional(v.number()),
    onlyFailed: v.optional(v.boolean()), // If true, only retry failed, not pending
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    estimatedCompletionTime: v.string()
  }),
  handler: async (ctx, args): Promise<BatchRetryResult> => {
    // Check if user is admin
    const userId = await getAuthUserId(ctx);
    if (userId) {
      const userProfile = await ctx.db.query("userProfiles")
        .withIndex("by_userId", q => q.eq("userId", userId))
        .unique();
      
      if (!userProfile?.isAdmin) {
        throw new Error("Admin access required for batch retry");
      }
    }

    const maxToProcess = args.maxAnimeToProcess || 5;
    const charactersPerAnime = args.charactersPerAnime || 10;

    console.log(`[Batch Retry] Starting batch retry for up to ${maxToProcess} anime`);

    // Get anime that need retry
    const animeNeedingRetry = await ctx.runQuery(internal.retryEnrichment.getAnimeNeedingRetry, {
      includeOnlyFailed: args.onlyFailed || false
    });

    // Schedule enrichment for each anime (with delays to avoid overwhelming)
    let delay = 0;
    const animeToProcess = Math.min(maxToProcess, animeNeedingRetry.length, 50); // Safety limit

    for (let i = 0; i < animeToProcess; i++) {
      delay += 3000; // 3 second delay between each anime
      
      // FIXED: Use actual anime IDs from the query results
      const animeToRetry = animeNeedingRetry[i];
      if (animeToRetry) {
        await ctx.scheduler.runAfter(delay, internal.characterEnrichment.enrichCharactersForAnime, {
          animeId: animeToRetry.animeId,
          maxCharacters: charactersPerAnime,
          includeRetries: true
        });
      }
    }

    return {
      success: true,
      message: `Scheduled retry for ${animeToProcess} anime`,
      estimatedCompletionTime: `${delay / 1000 / 60} minutes`
    };
  }
});