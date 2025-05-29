// convex/anime.ts
import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { Doc, Id, DataModel } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { PaginationResult, Query, OrderedQuery } from "convex/server";
import { internal } from "./_generated/api";

const FILTER_METADATA_IDENTIFIER = "singleton_filter_options_v1";

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
    if (!userId) return [];

    const userProfile = await ctx.db.query("userProfiles").withIndex("by_userId", q => q.eq("userId", userId as Id<"users">)).unique();
    // Phase 2: Watchlist privacy is primarily controlled by userProfile.watchlistIsPublic
    // If we needed to check individual watchlist item privacy, that logic would go here.
    // For now, if the user is requesting their own watchlist, privacy doesn't restrict them.

    const watchlistEntries = await ctx.db
      .query("watchlist")
      .withIndex("by_userId", q => q.eq("userId", userId as Id<"users">))
      .collect();

    if (watchlistEntries.length === 0) return [];

    const animeIds = watchlistEntries.map(entry => entry.animeId);
    const animeDocsArray = await Promise.all(animeIds.map(id => ctx.db.get(id)));
    
    const animeMap = new Map<string, Doc<"anime">>();
    animeDocsArray.forEach(doc => doc && animeMap.set(doc._id.toString(), doc));
    
    return watchlistEntries.map(entry => ({
      ...entry,
      anime: animeMap.get(entry.animeId.toString()) || null,
    }));
  },
});

// Phase 2: Query for public watchlists (example, needs refinement for pagination/filtering)
export const getPublicWatchlistForUser = query({
    args: { targetUserId: v.id("users") },
    handler: async (ctx, args) => {
        const targetUserProfile = await ctx.db.query("userProfiles").withIndex("by_userId", q => q.eq("userId", args.targetUserId)).unique();
        if (!targetUserProfile || !targetUserProfile.watchlistIsPublic) {
            // Only return if watchlist is set to public by the target user
            return null; 
        }
        const watchlistEntries = await ctx.db.query("watchlist").withIndex("by_userId", q => q.eq("userId", args.targetUserId)).collect();
        // ... (rest of the logic to fetch anime details as in getMyWatchlist)
        if (watchlistEntries.length === 0) return { userProfile: targetUserProfile, watchlist: [] };
        const animeIds = watchlistEntries.map(entry => entry.animeId);
        const animeDocsArray = await Promise.all(animeIds.map(id => ctx.db.get(id)));
        const animeMap = new Map<string, Doc<"anime">>();
        animeDocsArray.forEach(doc => doc && animeMap.set(doc._id.toString(), doc));
        const fullWatchlist = watchlistEntries.map(entry => ({
            ...entry,
            anime: animeMap.get(entry.animeId.toString()) || null,
        }));
        return { userProfile: targetUserProfile, watchlist: fullWatchlist };
    }
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

export const getFilterOptions = query({
  args: {},
  handler: async (ctx): Promise<Partial<Omit<Doc<"filterMetadata">, "_id" | "_creationTime" | "identifier">>> => {
    const metadata = await ctx.db
      .query("filterMetadata")
      .withIndex("by_identifier", q => q.eq("identifier", FILTER_METADATA_IDENTIFIER))
      .unique();
    
    if (metadata) {
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
    let queryBuilder: OrderedQuery<DataModel["anime"]> | Query<DataModel["anime"]>; 

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
        if (filters.minReviews !== undefined && filters.minReviews > 0) { 
            condition = q.and(condition, q.gte(q.field("reviewCount"), filters.minReviews));
        } else if (filters.minReviews === 0) { 
            condition = q.and(condition, q.or(q.eq(q.field("reviewCount"), undefined), q.eq(q.field("reviewCount"), 0)));
        }
        return condition;
      });
    }
    const results = await queryBuilder.paginate(args.paginationOpts);
    let filteredPage: Doc<"anime">[] = results.page;
    if (filters) {
      filteredPage = results.page.filter((anime: Doc<"anime">) => {
        if (filters.genres?.length && (!anime.genres || !filters.genres.every(genre => anime.genres!.includes(genre)))) return false;
        if (filters.studios?.length && (!anime.studios || !filters.studios.some(studio => anime.studios!.includes(studio)))) return false;
        if (filters.themes?.length && (!anime.themes || !filters.themes.some(theme => anime.themes!.includes(theme)))) return false;
        if (filters.emotionalTags?.length && (!anime.emotionalTags || !filters.emotionalTags.some(tag => anime.emotionalTags!.includes(tag)))) return false;
        return true;
      });
    }
    if (sortBy === "title_asc" || sortBy === "title_desc") {
      filteredPage.sort((a: Doc<"anime">, b: Doc<"anime">) => (a.title || "").localeCompare(b.title || ""));
      if (sortBy === "title_desc") filteredPage.reverse();
    }
    return { ...results, page: filteredPage };
  },
});

export const internalUpdateFilterMetadata = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("[Filter Metadata] Attempting update:", FILTER_METADATA_IDENTIFIER);
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
      identifier: FILTER_METADATA_IDENTIFIER,
      genres: Array.from(genres).sort(),
      studios: Array.from(studios).sort(),
      themes: Array.from(themes).sort(),
      emotionalTags: Array.from(emotionalTags).sort(),
      yearRange, ratingRange, userRatingRange,
      lastUpdatedAt: Date.now(),
    };
    const existingMetadata = await ctx.db.query("filterMetadata").withIndex("by_identifier", q => q.eq("identifier", FILTER_METADATA_IDENTIFIER)).unique();
    if (existingMetadata) {
      await ctx.db.replace(existingMetadata._id, newMetadataPayload);
      console.log("[Filter Metadata] Updated:", FILTER_METADATA_IDENTIFIER);
    } else {
      await ctx.db.insert("filterMetadata", newMetadataPayload);
      console.log("[Filter Metadata] Created:", FILTER_METADATA_IDENTIFIER);
    }
  },
});

export const upsertToWatchlist = mutation({
  args: {
    animeId: v.id("anime"),
    status: v.string(),
    progress: v.optional(v.number()),
    userRating: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");
    const anime = await ctx.db.get(args.animeId);
    if (!anime) throw new Error("Anime not found");
    const existingEntry = await ctx.db.query("watchlist")
      .withIndex("by_user_anime", q => q.eq("userId", userId as Id<"users">).eq("animeId", args.animeId))
      .unique();
    let entryId;
    const updateData: Partial<Doc<"watchlist">> = {
        status: args.status, progress: args.progress, userRating: args.userRating, notes: args.notes,
    };
    const definedUpdateData = Object.fromEntries(Object.entries(updateData).filter(([_, v]) => v !== undefined));
    if (existingEntry) {
      await ctx.db.patch(existingEntry._id, definedUpdateData);
      entryId = existingEntry._id;
    } else {
      entryId = await ctx.db.insert("watchlist", {
        userId: userId as Id<"users">, animeId: args.animeId, status: args.status,
        progress: args.progress, userRating: args.userRating, notes: args.notes,
      });
    }
    if (args.status === "Completed" && (!existingEntry || existingEntry.status !== "Completed")) {
      const message = `🎉 Congrats on completing "${anime.title}"! Consider rating it or writing a review.`;
      await ctx.scheduler.runAfter(0, internal.notifications.internalAddNotification, { userId: userId as Id<"users">, message, link: `/anime/${args.animeId}` });
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
      .withIndex("by_user_anime", q => q.eq("userId", userId as Id<"users">).eq("animeId", args.animeId))
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
        anilistId: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("User not authenticated");
        
        const existing = await ctx.db.query("anime").withIndex("by_title", q => q.eq("title", args.title)).first();
        if (existing) {
            console.warn(`[Add Anime] User ${userId} existing anime: "${args.title}" (ID: ${existing._id}). Returning existing.`);
            return existing._id;
        }
        
        console.log(`[Add Anime] User ${userId} adding new anime: "${args.title}"`);
        const animeId = await ctx.db.insert("anime", {
            title: args.title, description: args.description, posterUrl: args.posterUrl, genres: args.genres,
            year: args.year, rating: args.rating, emotionalTags: args.emotionalTags, trailerUrl: args.trailerUrl,
            studios: args.studios, themes: args.themes,
            anilistId: args.anilistId,
        });
        
        // Auto-fetch external data to improve poster quality and metadata
        ctx.scheduler.runAfter(0, internal.externalApis.triggerFetchExternalAnimeDetails, {
            animeIdInOurDB: animeId,
            titleToSearch: args.title
        });
        
        return animeId;
    }
});

export const addAnimeInternal = internalMutation({
    args: {
      title: v.string(), description: v.string(), posterUrl: v.string(), genres: v.array(v.string()),
      year: v.optional(v.number()), rating: v.optional(v.number()), emotionalTags: v.optional(v.array(v.string())),
      trailerUrl: v.optional(v.string()), studios: v.optional(v.array(v.string())), themes: v.optional(v.array(v.string())),
      anilistId: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.query("anime").withIndex("by_title", q => q.eq("title", args.title)).unique();
        if (existing) return existing._id;
        
        const animeId = await ctx.db.insert("anime", args);
        
        // Auto-fetch external data for better poster quality
        ctx.scheduler.runAfter(0, internal.externalApis.triggerFetchExternalAnimeDetails, {
            animeIdInOurDB: animeId,
            titleToSearch: args.title
        });
        
        return animeId;
    }
});

export const updateAnimeWithExternalData = internalMutation({
  args: {
    animeId: v.id("anime"),
    updates: v.object({ 
      description: v.optional(v.string()), posterUrl: v.optional(v.string()), genres: v.optional(v.array(v.string())),
      year: v.optional(v.number()), rating: v.optional(v.number()), emotionalTags: v.optional(v.array(v.string())),
      trailerUrl: v.optional(v.string()), studios: v.optional(v.array(v.string())), themes: v.optional(v.array(v.string())),
      anilistId: v.optional(v.number()), // Phase 2
    }),
    sourceApi: v.string(), // Phase 2: e.g., "jikan", "anilist"
  },
  handler: async (ctx, args) => {
    const existingAnime = await ctx.db.get(args.animeId);
    if (!existingAnime) {
        console.error(`[Update Anime External] Cannot update ${args.animeId}: not found.`);
        return;
    }
    const updatesToApply: Partial<Doc<"anime">> = {
        lastFetchedFromExternal: { source: args.sourceApi, timestamp: Date.now() } // Phase 2
    };
    for (const key in args.updates) {
        const typedKey = key as keyof typeof args.updates;
        const newValue = args.updates[typedKey];
        const existingValue = existingAnime[typedKey];
        if (newValue !== undefined) {
            let applyChange = true;
            if (typeof existingValue === 'string' && existingValue.trim() !== "" && typeof newValue === 'string' && newValue.trim() === "") {
                applyChange = false;
            } else if (Array.isArray(existingValue) && Array.isArray(newValue) && JSON.stringify(existingValue.slice().sort()) === JSON.stringify(newValue.slice().sort())) {
                applyChange = false;
            } else if (JSON.stringify(existingValue) === JSON.stringify(newValue)) {
                applyChange = false;
            }
            if (applyChange) (updatesToApply as any)[typedKey] = newValue;
        }
    }
    if (Object.keys(updatesToApply).length > 1) { // Greater than 1 because lastFetchedFromExternal is always added
        await ctx.db.patch(args.animeId, updatesToApply);
        console.log(`[Update Anime External - ${args.sourceApi}] Patched ${args.animeId} with ${Object.keys(updatesToApply).length -1} fields.`);
    } else {
        console.log(`[Update Anime External - ${args.sourceApi}] No new changes for ${args.animeId}.`);
    }
  },
});