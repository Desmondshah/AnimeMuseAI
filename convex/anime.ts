// File: convex/anime.ts
import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { PaginationOptions, PaginationResult } from "convex/server";

// ==== Queries ====

// Get a specific anime by its ID (Public)
export const getAnimeById = query({
  args: { animeId: v.id("anime") },
  handler: async (ctx, args): Promise<Doc<"anime"> | null> => {
    return await ctx.db.get(args.animeId);
  },
});

// Get a specific anime by its ID (Internal) - Added for externalApis.ts
export const getAnimeByIdInternal = internalQuery({
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
      return [];
    }
    const watchlistEntries = await ctx.db
      .query("watchlist")
      .withIndex("by_userId", (q) => q.eq("userId", userId as Id<"users">))
      .order("desc")
      .collect();

    const watchlistWithAnimeDetails = await Promise.all(
      watchlistEntries.map(async (entry) => {
        const anime = await ctx.db.get(entry.animeId);
        return {
          ...entry,
          anime: anime,
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

// Get all anime with pagination
export const getAllAnime = query({
  args: { paginationOpts: v.any() },
  handler: async (ctx, args): Promise<PaginationResult<Doc<"anime">>> => {
    return await ctx.db
      .query("anime")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});


// ==== Mutations ====

// Add/Update anime to watchlist
export const upsertToWatchlist = mutation({
  args: {
    animeId: v.id("anime"),
    status: v.string(),
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
    animeId: v.id("anime"),
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
    return false;
  },
});

// Internal mutation to add anime
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
        studios: v.optional(v.array(v.string())),
        themes: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.query("anime").withIndex("by_title", q => q.eq("title", args.title)).unique();
        if (existing) {
            return existing._id;
        }
        return await ctx.db.insert("anime", args);
    }
});

// Mutation to allow users to add anime
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
        studios: v.optional(v.array(v.string())),
        themes: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("User not authenticated");
        }
        const existing = await ctx.db.query("anime").withIndex("by_title", q => q.eq("title", args.title)).first();
        if (existing) {
            return existing._id;
        }
        return await ctx.db.insert("anime", args);
    }
});

// Internal mutation to update an anime record, typically with data from an external source
export const updateAnimeWithExternalData = internalMutation({
  args: {
    animeId: v.id("anime"),
    updates: v.object({
      description: v.optional(v.string()),
      posterUrl: v.optional(v.string()),
      genres: v.optional(v.array(v.string())),
      year: v.optional(v.number()),
      rating: v.optional(v.number()),
      emotionalTags: v.optional(v.array(v.string())),
      trailerUrl: v.optional(v.string()),
      studios: v.optional(v.array(v.string())),
      themes: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, args) => {
    const existingAnime = await ctx.db.get(args.animeId);
    if (!existingAnime) {
      console.error(`Cannot update anime ${args.animeId}: not found.`);
      return;
    }
    const definedUpdates: Partial<Doc<"anime">> = {};
    for (const key in args.updates) {
        if (args.updates[key as keyof typeof args.updates] !== undefined) {
            (definedUpdates as any)[key] = args.updates[key as keyof typeof args.updates];
        }
    }
    if (Object.keys(definedUpdates).length > 0) {
        await ctx.db.patch(args.animeId, definedUpdates);
        console.log(`Anime ${args.animeId} updated with external data.`);
    } else {
        console.log(`No defined updates for anime ${args.animeId}.`)
    }
  },
});