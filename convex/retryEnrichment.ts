// convex/retryEnrichment.ts - Functions to retry character enrichment
import { mutation, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Reset character enrichment status (useful for forcing re-enrichment)
export const resetCharacterEnrichmentStatus = internalMutation({
  args: {
    animeId: v.id("anime"),
    characterNames: v.optional(v.array(v.string())), // If not provided, resets all characters
    resetTo: v.optional(v.union(v.literal("pending"), v.literal("failed"))), // Default: "pending"
  },
  handler: async (ctx, args) => {
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
  handler: async (ctx, args) => {
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
  handler: async (ctx, args) => {
    const allAnime = await ctx.db
      .query("anime")
      .filter(q => q.neq(q.field("characters"), undefined))
      .collect();

    const animeNeedingRetry: Array<{
      animeId: string;
      title: string;
      totalCharacters: number;
      pendingCharacters: number;
      failedCharacters: number;
      successfulCharacters: number;
      charactersByStatus: Record<string, string[]>;
    }> = [];

    for (const anime of allAnime) {
      if (!anime.characters) continue;

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
  handler: async (ctx, args) => {
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
    const animeNeedingRetry = await ctx.scheduler.runAfter(0, internal.retryEnrichment.getAnimeNeedingRetry, {
      includeOnlyFailed: args.onlyFailed || false
    });

    // Schedule enrichment for each anime (with delays to avoid overwhelming)
    let delay = 0;
    const animeToProcess = Math.min(maxToProcess, 50); // Safety limit

    for (let i = 0; i < animeToProcess; i++) {
      delay += 3000; // 3 second delay between each anime
      
      await ctx.scheduler.runAfter(delay, internal.characterEnrichment.enrichCharactersForAnime, {
        animeId: `anime_${i}` as any, // This will be replaced with actual IDs
        maxCharacters: charactersPerAnime,
        includeRetries: true
      });
    }

    return {
      success: true,
      message: `Scheduled retry for up to ${maxToProcess} anime`,
      estimatedCompletionTime: `${delay / 1000 / 60} minutes`
    };
  }
});