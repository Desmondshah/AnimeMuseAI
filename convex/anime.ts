import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

// ==== Queries ====

// Get a specific anime by its ID
export const getAnimeById = query({
  args: { animeId: v.id("anime") },
  handler: async (ctx, args): Promise<Doc<"anime"> | null> => {
    return await ctx.db.get(args.animeId);
  },
});

// Public query to check if anime exists by title
export const getAnimeByTitle = query({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("anime").withIndex("by_title", q => q.eq("title", args.title)).unique();
  }
});

// Internal query to check if anime exists by title (used by AI action potentially)
export const getAnimeByTitleInternal = internalQuery({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("anime").withIndex("by_title", q => q.eq("title", args.title)).unique();
  }
});


// Get user's watchlist
export const getMyWatchlist = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return []; // Or throw error: throw new Error("User not authenticated");
    }
    const watchlistEntries = await ctx.db
      .query("watchlist")
      .withIndex("by_userId", (q) => q.eq("userId", userId as Id<"users">))
      .collect();

    const watchlistWithAnimeDetails = await Promise.all(
      watchlistEntries.map(async (entry) => {
        const anime = await ctx.db.get(entry.animeId);
        return {
          ...entry,
          anime: anime, // Embed anime details
        };
      })
    );
    return watchlistWithAnimeDetails;
  },
});

// Get a specific watchlist item
export const getWatchlistItem = query({
    args: { animeId: v.id("anime") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return null;
        }
        return await ctx.db.query("watchlist")
            .withIndex("by_user_anime", q => q.eq("userId", userId as Id<"users">).eq("animeId", args.animeId))
            .unique();
    }
});


// ==== Mutations ====

// Add/Update anime to watchlist
export const upsertToWatchlist = mutation({
  args: {
    animeId: v.id("anime"),
    status: v.string(), // "Watching", "Completed", "Dropped", "Plan to Watch"
    progress: v.optional(v.number()),
    userRating: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const existingEntry = await ctx.db
      .query("watchlist")
      .withIndex("by_user_anime", (q) =>
        q.eq("userId", userId as Id<"users">).eq("animeId", args.animeId)
      )
      .unique();

    if (existingEntry) {
      await ctx.db.patch(existingEntry._id, {
        status: args.status,
        progress: args.progress,
        userRating: args.userRating,
      });
      return existingEntry._id;
    } else {
      return await ctx.db.insert("watchlist", {
        userId: userId as Id<"users">,
        animeId: args.animeId,
        status: args.status,
        progress: args.progress,
        userRating: args.userRating,
      });
    }
  },
});

// Remove anime from watchlist
export const removeFromWatchlist = mutation({
  args: {
    animeId: v.id("anime"), // or v.id("watchlist") if you pass the watchlist item's ID
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }
    const watchlistEntry = await ctx.db
      .query("watchlist")
      .withIndex("by_user_anime", (q) =>
        q.eq("userId", userId as Id<"users">).eq("animeId", args.animeId)
      )
      .unique();

    if (watchlistEntry) {
      await ctx.db.delete(watchlistEntry._id);
      return true;
    }
    return false; // Entry not found
  },
});

// Internal mutation to add anime (used by AI action potentially)
export const addAnimeInternal = internalMutation({
    args: {
        title: v.string(),
        description: v.string(),
        posterUrl: v.string(),
        genres: v.array(v.string()),
        year: v.optional(v.number()),
        rating: v.optional(v.number()),
        emotionalTags: v.optional(v.array(v.string())),
        trailerUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Check if anime already exists by title to prevent duplicates from internal calls
        const existing = await ctx.db.query("anime").withIndex("by_title", q => q.eq("title", args.title)).unique();
        if (existing) {
            // Optionally update existing entry or just return its ID
            // For now, we'll assume if it exists, we don't need to re-insert from an internal call
            return existing._id;
        }
        return await ctx.db.insert("anime", args);
    }
});

// Mutation to allow users to add anime if it's not found (e.g. from an external API search)
// This should be more restricted or have admin approval in a real app
export const addAnimeByUser = mutation({
    args: {
        title: v.string(),
        description: v.string(),
        posterUrl: v.string(),
        genres: v.array(v.string()),
        year: v.optional(v.number()),
        rating: v.optional(v.number()),
        emotionalTags: v.optional(v.array(v.string())),
        trailerUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("User not authenticated");
        }
        // Basic check for existing title to avoid obvious duplicates by users
        const existing = await ctx.db.query("anime").withIndex("by_title", q => q.eq("title", args.title)).first();
        if (existing) {
            // Could throw an error or return existing anime's ID
            // throw new Error("Anime with this title already exists.");
            return existing._id;
        }
        return await ctx.db.insert("anime", args);
    }
});
