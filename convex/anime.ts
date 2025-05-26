// convex/anime.ts
import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { PaginationResult } from "convex/server";
import { internal } from "./_generated/api";

// Unique identifier for the singleton document in filterMetadata table
const FILTER_METADATA_IDENTIFIER = "singleton_filter_options_v1";

// ==== Queries ====

export const getAnimeById = query({
  args: { animeId: v.id("anime") },
  handler: async (ctx, args): Promise<Doc<"anime"> | null> => {
    return await ctx.db.get(args.animeId);
  },
});

export const getAnimeByIdInternal = internalQuery({
  args: { animeId: v.id("anime") },
  handler: async (ctx, args): Promise<Doc<"anime"> | null> => {
    return await ctx.db.get(args.animeId);
  },
});

export const getAnimeByTitle = query({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("anime").withIndex("by_title", q => q.eq("title", args.title)).unique();
  }
});

export const getAnimeByTitleInternal = internalQuery({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("anime").withIndex("by_title", q => q.eq("title", args.title)).unique();
  }
});

export const getMyWatchlist = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }
    const watchlistEntries = await ctx.db
      .query("watchlist")
      .withIndex("by_userId", (q) => q.eq("userId", userId as Id<"users">))
      .collect();

    if (watchlistEntries.length === 0) {
      return [];
    }
    const animeIds = watchlistEntries.map(entry => entry.animeId);
    const animeDocsArray = await Promise.all(
      animeIds.map(id => ctx.db.get(id))
    );
    const animeMap = new Map<string, Doc<"anime">>();
    animeDocsArray.forEach(doc => {
      if (doc) {
        animeMap.set(doc._id.toString(), doc);
      }
    });
    return watchlistEntries.map(entry => ({
      ...entry,
      anime: animeMap.get(entry.animeId.toString()) || null,
    }));
  },
});

export const getWatchlistItem = query({
    args: { animeId: v.id("anime") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) { return null; }
        return await ctx.db.query("watchlist")
            .withIndex("by_user_anime", q => q.eq("userId", userId as Id<"users">).eq("animeId", args.animeId))
            .unique();
    }
});

export const getAllAnime = query({
  args: { paginationOpts: v.any() },
  handler: async (ctx, args): Promise<PaginationResult<Doc<"anime">>> => {
    return await ctx.db.query("anime").order("desc").paginate(args.paginationOpts);
  },
});

// Reads pre-computed filter options from filterMetadata table
export const getFilterOptions = query({
  args: {},
  handler: async (ctx): Promise<Partial<Omit<Doc<"filterMetadata">, "_id" | "_creationTime" | "identifier">>> => {
    // Note: `identifier` field in filterMetadata table is used to query the singleton.
    // The `FILTER_METADATA_IDENTIFIER` const holds the value of this identifier.
    const metadata = await ctx.db
      .query("filterMetadata")
      .withIndex("by_identifier", q => q.eq("identifier", FILTER_METADATA_IDENTIFIER))
      .unique();
    
    if (metadata) {
      // Exclude system fields and the identifier itself when returning options
      const { _id, _creationTime, identifier, ...options } = metadata;
      return options;
    }
    console.warn("Filter metadata not found. Returning empty options. Scheduled job should populate it.");
    return {
      genres: [], studios: [], themes: [], emotionalTags: [],
      yearRange: null, ratingRange: null, userRatingRange: null,
      lastUpdatedAt: 0,
    };
  },
});

// Corrected getFilteredAnime (q.search removed from .filter callback, array filtering is JS-based)
export const getFilteredAnime = query({
  args: {
    paginationOpts: v.any(),
    filters: v.optional(v.object({
      genres: v.optional(v.array(v.string())),
      yearRange: v.optional(v.object({ min: v.optional(v.number()), max: v.optional(v.number()) })),
      ratingRange: v.optional(v.object({ min: v.optional(v.number()), max: v.optional(v.number()) })),
      userRatingRange: v.optional(v.object({ min: v.optional(v.number()), max: v.optional(v.number()) })),
      minReviews: v.optional(v.number()),
      studios: v.optional(v.array(v.string())),
      themes: v.optional(v.array(v.string())),
      emotionalTags: v.optional(v.array(v.string())),
    })),
    sortBy: v.optional(v.union(
      v.literal("newest"), v.literal("oldest"),
      v.literal("title_asc"), v.literal("title_desc"),
      v.literal("year_desc"), v.literal("year_asc"),
      v.literal("rating_desc"), v.literal("rating_asc"),
      v.literal("user_rating_desc"), v.literal("user_rating_asc"),
      v.literal("most_reviewed"), v.literal("least_reviewed")
    )),
  },
  handler: async (ctx, args): Promise<PaginationResult<Doc<"anime">>> => {
    const { filters, sortBy = "newest" } = args;
    
    let queryBuilder;
    switch (sortBy) {
      case "year_desc": queryBuilder = ctx.db.query("anime").withIndex("by_year").order("desc"); break;
      case "year_asc": queryBuilder = ctx.db.query("anime").withIndex("by_year").order("asc"); break;
      case "rating_desc": queryBuilder = ctx.db.query("anime").withIndex("by_rating").order("desc"); break;
      case "rating_asc": queryBuilder = ctx.db.query("anime").withIndex("by_rating").order("asc"); break;
      case "user_rating_desc": queryBuilder = ctx.db.query("anime").withIndex("by_averageUserRating").order("desc"); break;
      case "user_rating_asc": queryBuilder = ctx.db.query("anime").withIndex("by_averageUserRating").order("asc"); break;
      case "most_reviewed": queryBuilder = ctx.db.query("anime").withIndex("by_reviewCount").order("desc"); break;
      case "least_reviewed": queryBuilder = ctx.db.query("anime").withIndex("by_reviewCount").order("asc"); break;
      case "oldest": queryBuilder = ctx.db.query("anime").order("asc"); break;
      case "newest": 
      default: queryBuilder = ctx.db.query("anime").order("desc"); break;
    }

    if (filters) {
      queryBuilder = queryBuilder.filter((q) => {
        let condition = q.eq(q.field("_id"), q.field("_id")); 
        if (filters.yearRange?.min !== undefined) condition = q.and(condition, q.gte(q.field("year"), filters.yearRange.min));
        if (filters.yearRange?.max !== undefined) condition = q.and(condition, q.lte(q.field("year"), filters.yearRange.max));
        if (filters.ratingRange?.min !== undefined) condition = q.and(condition, q.gte(q.field("rating"), filters.ratingRange.min));
        if (filters.ratingRange?.max !== undefined) condition = q.and(condition, q.lte(q.field("rating"), filters.ratingRange.max));
        if (filters.userRatingRange?.min !== undefined) condition = q.and(condition, q.gte(q.field("averageUserRating"), filters.userRatingRange.min));
        if (filters.userRatingRange?.max !== undefined) condition = q.and(condition, q.lte(q.field("averageUserRating"), filters.userRatingRange.max));
        if (filters.minReviews !== undefined) condition = q.and(condition, q.gte(q.field("reviewCount"), filters.minReviews));
        return condition;
      });
    }

    const results = await queryBuilder.paginate(args.paginationOpts);

    let filteredPage = results.page;
    if (filters) {
      filteredPage = results.page.filter(anime => {
        if (filters.genres && filters.genres.length > 0) {
          if (!filters.genres.every(genre => anime.genres?.includes(genre))) return false;
        }
        if (filters.studios && filters.studios.length > 0) {
          if (!filters.studios.some(studio => anime.studios?.includes(studio))) return false;
        }
        if (filters.themes && filters.themes.length > 0) {
          if (!filters.themes.some(theme => anime.themes?.includes(theme))) return false;
        }
        if (filters.emotionalTags && filters.emotionalTags.length > 0) {
          if (!filters.emotionalTags.some(tag => anime.emotionalTags?.includes(tag))) return false;
        }
        return true;
      });
    }

    if (sortBy === "title_asc" || sortBy === "title_desc") {
      // Ensure titles are defined for localeCompare, provide a fallback empty string if null/undefined
      filteredPage.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
      if (sortBy === "title_desc") filteredPage.reverse(); // Reverse for descending order
    }

    return { ...results, page: filteredPage };
  },
});


// ==== Mutations ====

export const internalUpdateFilterMetadata = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("Attempting to update filter metadata with identifier:", FILTER_METADATA_IDENTIFIER);
    
    const allAnimeForArrays = await ctx.db.query("anime").collect();
    const genres = new Set<string>();
    const studios = new Set<string>();
    const themes = new Set<string>();
    const emotionalTags = new Set<string>();
    allAnimeForArrays.forEach(anime => {
      anime.genres?.forEach(genre => genres.add(genre));
      anime.studios?.forEach(studio => studios.add(studio));
      anime.themes?.forEach(theme => themes.add(theme));
      anime.emotionalTags?.forEach(tag => emotionalTags.add(tag));
    });
    const minYearDoc = await ctx.db.query("anime").withIndex("by_year").order("asc").first();
    const maxYearDoc = await ctx.db.query("anime").withIndex("by_year").order("desc").first();
    const yearRange = (minYearDoc?.year !== undefined && maxYearDoc?.year !== undefined)
                       ? { min: minYearDoc.year, max: maxYearDoc.year } : null;
    const minRatingDoc = await ctx.db.query("anime").withIndex("by_rating").order("asc").first();
    const maxRatingDoc = await ctx.db.query("anime").withIndex("by_rating").order("desc").first();
    const ratingRange = (minRatingDoc?.rating !== undefined && maxRatingDoc?.rating !== undefined)
                         ? { min: minRatingDoc.rating, max: maxRatingDoc.rating } : null;
    const minUserRatingDoc = await ctx.db.query("anime").withIndex("by_averageUserRating").order("asc").first();
    const maxUserRatingDoc = await ctx.db.query("anime").withIndex("by_averageUserRating").order("desc").first();
    const userRatingRange = (minUserRatingDoc?.averageUserRating !== undefined && maxUserRatingDoc?.averageUserRating !== undefined)
                             ? { min: minUserRatingDoc.averageUserRating, max: maxUserRatingDoc.averageUserRating } : null;

    const newMetadataPayload = {
      identifier: FILTER_METADATA_IDENTIFIER, // Ensure identifier is part of the data to be stored
      genres: Array.from(genres).sort(),
      studios: Array.from(studios).sort(),
      themes: Array.from(themes).sort(),
      emotionalTags: Array.from(emotionalTags).sort(),
      yearRange, ratingRange, userRatingRange,
      lastUpdatedAt: Date.now(),
    };

    const existingMetadata = await ctx.db
      .query("filterMetadata")
      .withIndex("by_identifier", q => q.eq("identifier", FILTER_METADATA_IDENTIFIER))
      .unique();

    if (existingMetadata) {
      // Pass the full payload including the identifier for replacement,
      // as schema expects identifier.
      await ctx.db.replace(existingMetadata._id, newMetadataPayload);
      console.log("Filter metadata updated for identifier:", FILTER_METADATA_IDENTIFIER);
    } else {
      await ctx.db.insert("filterMetadata", newMetadataPayload);
      console.log("Filter metadata created for the first time for identifier:", FILTER_METADATA_IDENTIFIER);
    }
  },
});

export const upsertToWatchlist = mutation({
  args: {
    animeId: v.id("anime"), status: v.string(), progress: v.optional(v.number()), userRating: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");
    const anime = await ctx.db.get(args.animeId);
    if (!anime) throw new Error("Anime not found");
    const existingEntry = await ctx.db.query("watchlist")
      .withIndex("by_user_anime", (q) => q.eq("userId", userId as Id<"users">).eq("animeId", args.animeId))
      .unique();
    let entryId;
    if (existingEntry) {
      await ctx.db.patch(existingEntry._id, { status: args.status, progress: args.progress, userRating: args.userRating });
      entryId = existingEntry._id;
    } else {
      entryId = await ctx.db.insert("watchlist", { userId: userId as Id<"users">, animeId: args.animeId, status: args.status, progress: args.progress, userRating: args.userRating });
    }
    if (args.status === "Completed") {
      const message = `🎉 Congratulations on completing "${anime.title}"! How about rating it or writing a review?`;
      const link = `/anime/${args.animeId}`; // Ensure this link structure matches your frontend routing
      await ctx.scheduler.runAfter(0, internal.notifications.internalAddNotification, { userId: userId as Id<"users">, message: message, link: link });
    }
    return entryId;
  },
});

export const removeFromWatchlist = mutation({
  args: { animeId: v.id("anime") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");
    const watchlistEntry = await ctx.db.query("watchlist")
      .withIndex("by_user_anime", (q) => q.eq("userId", userId as Id<"users">).eq("animeId", args.animeId))
      .unique();
    if (watchlistEntry) {
      await ctx.db.delete(watchlistEntry._id);
      return true;
    }
    return false;
  },
});

export const addAnimeByUser = mutation({
    args: {
        title: v.string(), description: v.string(), posterUrl: v.string(), genres: v.array(v.string()),
        year: v.optional(v.number()), rating: v.optional(v.number()), emotionalTags: v.optional(v.array(v.string())),
        trailerUrl: v.optional(v.string()), studios: v.optional(v.array(v.string())), themes: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("User not authenticated");
        const existing = await ctx.db.query("anime").withIndex("by_title", q => q.eq("title", args.title)).first();
        if (existing) return existing._id;
        return await ctx.db.insert("anime", args);
    }
});

export const addAnimeInternal = internalMutation({
    args: {
      title: v.string(), description: v.string(), posterUrl: v.string(), genres: v.array(v.string()),
      year: v.optional(v.number()), rating: v.optional(v.number()), emotionalTags: v.optional(v.array(v.string())),
      trailerUrl: v.optional(v.string()), studios: v.optional(v.array(v.string())), themes: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.query("anime").withIndex("by_title", q => q.eq("title", args.title)).unique();
        if (existing) return existing._id;
        return await ctx.db.insert("anime", args);
    }
});

export const updateAnimeWithExternalData = internalMutation({
  args: {
    animeId: v.id("anime"),
    updates: v.object({
      description: v.optional(v.string()), posterUrl: v.optional(v.string()), genres: v.optional(v.array(v.string())),
      year: v.optional(v.number()), rating: v.optional(v.number()), emotionalTags: v.optional(v.array(v.string())),
      trailerUrl: v.optional(v.string()), studios: v.optional(v.array(v.string())), themes: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, args) => {
    const existingAnime = await ctx.db.get(args.animeId);
    if (!existingAnime) { console.error(`Cannot update anime ${args.animeId}: not found.`); return; }
    const definedUpdates: Partial<Doc<"anime">> = {};
    for (const key in args.updates) {
        const typedKey = key as keyof typeof args.updates;
        if (args.updates[typedKey] !== undefined) { (definedUpdates as any)[typedKey] = args.updates[typedKey]; }
    }
    if (Object.keys(definedUpdates).length > 0) {
        await ctx.db.patch(args.animeId, definedUpdates);
    }
  },
});