// convex/anime.ts - Updated with server-side search

import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery, internalAction } from "./_generated/server";
import { Doc, Id, DataModel } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { PaginationResult, Query, OrderedQuery } from "convex/server";
import { internal } from "./_generated/api";
import OpenAI from "openai";

const FILTER_METADATA_IDENTIFIER = "singleton_filter_options_v1";

function normalizeTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, "");
}

async function findExistingAnimeByTitle(ctx: any, title: string): Promise<Doc<"anime"> | null> {
  const clean = normalizeTitle(title);

  let existing = await ctx.db
    .query("anime")
    .withIndex("by_title", (q: any) => q.eq("title", title))
    .first();

  if (!existing) {
    const matches = await ctx.db
      .query("anime")
      .withSearchIndex("search_title", (q: any) => q.search("title", title))
      .take(50);
    existing =
      matches.find((a: any) => normalizeTitle(a.title) === clean) || null;
  }

  return existing;
}

// Define types for better TypeScript support
type EnrichmentResult = {
  success: boolean;
  message?: string;
  error?: string;
  previewsAdded?: number;
  episodesProcessed?: number;
};

type BatchProcessingResult = {
  animeId: Id<"anime">;
  title: string;
  result: EnrichmentResult;
};

type StreamingEpisode = {
  title?: string;
  thumbnail?: string;
  url?: string;
  site?: string;
  previewUrl?: string;
};

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
  handler: async (ctx, args): Promise<Doc<"anime"> | null> => {
    return await findExistingAnimeByTitle(ctx, args.title);
  },
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

// UPDATED: Modified to include server-side search functionality
export const getFilteredAnime = query({
  args: {
    paginationOpts: v.any(),
    searchTerm: v.optional(v.string()), // NEW: Added search term parameter
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
    const { filters, sortBy = "newest", searchTerm } = args;
    
    // NEW: If search term is provided, use search index instead of regular query
    if (searchTerm && searchTerm.trim()) {
      console.log(`[Search] Searching for: "${searchTerm}"`);
      
      // Use search index to find matching anime
      const searchResults = await ctx.db
        .query("anime")
        .withSearchIndex("search_title", (q) => q.search("title", searchTerm))
        .take(1000); // Get more results for better filtering/sorting
      
      // Also search in description for more comprehensive results
      const descriptionSearchResults = await ctx.db
        .query("anime")
        .withSearchIndex("search_description", (q) => q.search("description", searchTerm))
        .take(500);
      
      // Combine and deduplicate results
      const allSearchResults = [...searchResults];
      const existingIds = new Set(searchResults.map(anime => anime._id));
      
      descriptionSearchResults.forEach(anime => {
        if (!existingIds.has(anime._id)) {
          allSearchResults.push(anime);
        }
      });
      
      console.log(`[Search] Found ${allSearchResults.length} results for "${searchTerm}"`);
      
      // Apply filters to search results
      let filteredResults = allSearchResults;
      if (filters) {
        filteredResults = allSearchResults.filter((anime: Doc<"anime">) => {
          // Year range filter
          if (filters.yearRange?.min !== undefined && anime.year !== undefined && anime.year < filters.yearRange.min) return false;
          if (filters.yearRange?.max !== undefined && anime.year !== undefined && anime.year > filters.yearRange.max) return false;
          
          // Rating range filter
          if (filters.ratingRange?.min !== undefined && anime.rating !== undefined && anime.rating < filters.ratingRange.min) return false;
          if (filters.ratingRange?.max !== undefined && anime.rating !== undefined && anime.rating > filters.ratingRange.max) return false;
          
          // User rating range filter
          if (filters.userRatingRange?.min !== undefined && anime.averageUserRating !== undefined && anime.averageUserRating < filters.userRatingRange.min) return false;
          if (filters.userRatingRange?.max !== undefined && anime.averageUserRating !== undefined && anime.averageUserRating > filters.userRatingRange.max) return false;
          
          // Minimum reviews filter
          if (filters.minReviews !== undefined && filters.minReviews > 0) {
            if (!anime.reviewCount || anime.reviewCount < filters.minReviews) return false;
          } else if (filters.minReviews === 0) {
            if (anime.reviewCount && anime.reviewCount > 0) return false;
          }
          
          // Array-based filters
          if (filters.genres?.length && (!anime.genres || !filters.genres.every(genre => anime.genres!.includes(genre)))) return false;
          if (filters.studios?.length && (!anime.studios || !filters.studios.some(studio => anime.studios!.includes(studio)))) return false;
          if (filters.themes?.length && (!anime.themes || !filters.themes.some(theme => anime.themes!.includes(theme)))) return false;
          if (filters.emotionalTags?.length && (!anime.emotionalTags || !filters.emotionalTags.some(tag => anime.emotionalTags!.includes(tag)))) return false;
          
          return true;
        });
      }
      
      // Apply sorting to search results
      if (sortBy === "title_asc") {
        filteredResults.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
      } else if (sortBy === "title_desc") {
        filteredResults.sort((a, b) => (b.title || "").localeCompare(a.title || ""));
      } else if (sortBy === "year_desc") {
        filteredResults.sort((a, b) => (b.year || 0) - (a.year || 0));
      } else if (sortBy === "year_asc") {
        filteredResults.sort((a, b) => (a.year || 0) - (b.year || 0));
      } else if (sortBy === "rating_desc") {
        filteredResults.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      } else if (sortBy === "rating_asc") {
        filteredResults.sort((a, b) => (a.rating || 0) - (b.rating || 0));
      } else if (sortBy === "user_rating_desc") {
        filteredResults.sort((a, b) => (b.averageUserRating || 0) - (a.averageUserRating || 0));
      } else if (sortBy === "user_rating_asc") {
        filteredResults.sort((a, b) => (a.averageUserRating || 0) - (b.averageUserRating || 0));
      } else if (sortBy === "most_reviewed") {
        filteredResults.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
      } else if (sortBy === "least_reviewed") {
        filteredResults.sort((a, b) => (a.reviewCount || 0) - (b.reviewCount || 0));
      } else if (sortBy === "oldest") {
        filteredResults.sort((a, b) => a._creationTime - b._creationTime);
      } else {
        // newest (default) - sort by creation time descending
        filteredResults.sort((a, b) => b._creationTime - a._creationTime);
      }
      
      // Manual pagination for search results
      const { paginationOpts } = args;
      const startCursor = paginationOpts?.cursor ? parseInt(paginationOpts.cursor) : 0;
      const numItems = paginationOpts?.numItems || 20;
      
      const endIndex = startCursor + numItems;
      const paginatedResults = filteredResults.slice(startCursor, endIndex);
      const hasMore = endIndex < filteredResults.length;
      
      return {
        page: paginatedResults,
        isDone: !hasMore,
        continueCursor: hasMore ? endIndex.toString() : null,
        splitCursor: null,
        pageStatus: hasMore ? "CanLoadMore" : "Exhausted"
      } as unknown as PaginationResult<Doc<"anime">>;
    }
    
    // EXISTING: Regular filtering without search (keep existing logic)
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

const ALLOWED_WATCHLIST_STATUSES = [
  "Watching",
  "Completed",
  "Plan to Watch",
  "Dropped",
] as const;

export const upsertToWatchlist = mutation({
  args: {
    animeId: v.id("anime"),
    status: v.union(
      v.literal("Watching"),
      v.literal("Completed"),
      v.literal("Plan to Watch"),
      v.literal("Dropped")
    ),
    progress: v.optional(v.number()),
    userRating: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");
    if (!ALLOWED_WATCHLIST_STATUSES.includes(args.status)) {
      throw new Error(`Invalid watchlist status: ${args.status}`);
    }
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

export async function addAnimeByUserHandler(ctx: any, args: {
  title: string;
  description: string;
  posterUrl: string;
  genres: string[];
  year?: number;
  rating?: number;
  emotionalTags?: string[];
  trailerUrl?: string;
  studios?: string[];
  themes?: string[];
  anilistId?: number;
}) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("User not authenticated");

  const existing = await findExistingAnimeByTitle(ctx, args.title);

  if (existing) {
    console.warn(
      `[Add Anime] User ${userId} existing anime: "${args.title}" (ID: ${existing._id}). Returning existing.`,
    );
    return existing._id;
  }

  console.log(`[Add Anime] User ${userId} adding new anime: "${args.title}"`);
  const animeId = await ctx.db.insert("anime", {
    title: args.title,
    description: args.description,
    posterUrl: args.posterUrl,
    genres: args.genres,
    year: args.year,
    rating: args.rating,
    emotionalTags: args.emotionalTags,
    trailerUrl: args.trailerUrl,
    studios: args.studios,
    themes: args.themes,
    anilistId: args.anilistId,
  });

  ctx.scheduler.runAfter(0, internal.externalApis.triggerFetchExternalAnimeDetails, {
    animeIdInOurDB: animeId,
    titleToSearch: args.title,
  });

  return animeId;
}

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
    anilistId: v.optional(v.number()),
  },
  handler: addAnimeByUserHandler,
});

export const addAnimeInternal = internalMutation({
    args: {
      title: v.string(), description: v.string(), posterUrl: v.string(), genres: v.array(v.string()),
      year: v.optional(v.number()), rating: v.optional(v.number()), emotionalTags: v.optional(v.array(v.string())),
      trailerUrl: v.optional(v.string()), studios: v.optional(v.array(v.string())), themes: v.optional(v.array(v.string())),
      anilistId: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const existing = await findExistingAnimeByTitle(ctx, args.title);
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

// UPDATED: Enhanced mutation to handle episode data, additional fields, and character data
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
      anilistId: v.optional(v.number()),
      // Episode and streaming data fields
      streamingEpisodes: v.optional(v.array(v.object({
        title: v.optional(v.string()),
        thumbnail: v.optional(v.string()),
        url: v.optional(v.string()),
        site: v.optional(v.string()),
        previewUrl: v.optional(v.string()), // ADD THIS LINE
      }))),
      totalEpisodes: v.optional(v.number()),
      episodeDuration: v.optional(v.number()),
      airingStatus: v.optional(v.string()),
      nextAiringEpisode: v.optional(v.object({
        airingAt: v.optional(v.number()),
        episode: v.optional(v.number()),
        timeUntilAiring: v.optional(v.number()),
      })),
      // Character data (unchanged)
      characters: v.optional(v.array(v.object({
        id: v.optional(v.number()),
        name: v.string(),
        imageUrl: v.optional(v.string()),
        role: v.string(),
        description: v.optional(v.string()),
        status: v.optional(v.string()),
        gender: v.optional(v.string()),
        age: v.optional(v.string()),
        dateOfBirth: v.optional(v.object({
          year: v.optional(v.number()),
          month: v.optional(v.number()),
          day: v.optional(v.number()),
        })),
        bloodType: v.optional(v.string()),
        height: v.optional(v.string()),
        weight: v.optional(v.string()),
        species: v.optional(v.string()),
        powersAbilities: v.optional(v.array(v.string())),
        weapons: v.optional(v.array(v.string())),
        nativeName: v.optional(v.string()),
        siteUrl: v.optional(v.string()),
        voiceActors: v.optional(v.array(v.object({
          id: v.optional(v.number()),
          name: v.string(),
          language: v.string(),
          imageUrl: v.optional(v.string()),
        }))),
        relationships: v.optional(v.array(v.object({
          relatedCharacterId: v.optional(v.number()),
          relationType: v.string(),
        }))),
      }))),
    }),
    sourceApi: v.string(),
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
    
    // Track episode data and character data changes specifically
    let episodeDataChanged = false;
    let characterDataChanged = false;
    
    for (const key in args.updates) {
        const typedKey = key as keyof typeof args.updates;
        const newValue = args.updates[typedKey];
        const existingValue = existingAnime[typedKey];
        
        if (newValue !== undefined) {
            let applyChange = true;
            
            // Special handling for episode data
            if (typedKey === 'streamingEpisodes') {
                if (Array.isArray(newValue) && newValue.length > 0) {
                    const existingEpisodes = existingValue as any[] || [];
                    // Always update if we have new episode data and existing is empty or different
                    if (existingEpisodes.length === 0 || JSON.stringify(existingEpisodes) !== JSON.stringify(newValue)) {
                        applyChange = true;
                        episodeDataChanged = true;
                        console.log(`[Update Anime External] Episode data will be updated for ${existingAnime.title}: ${newValue.length} episodes`);
                    } else {
                        applyChange = false;
                    }
                } else {
                    applyChange = false; // Don't clear existing episode data with empty array
                }
            }
            // Special handling for character data
            else if (typedKey === 'characters') {
                if (Array.isArray(newValue) && newValue.length > 0) {
                    const existingCharacters = existingValue as any[] || [];
                    // Always update if we have new character data and existing is empty or different
                    if (existingCharacters.length === 0 || JSON.stringify(existingCharacters) !== JSON.stringify(newValue)) {
                        applyChange = true;
                        characterDataChanged = true;
                        console.log(`[Update Anime External] Character data will be updated for ${existingAnime.title}: ${newValue.length} characters`);
                    } else {
                        applyChange = false;
                    }
                } else {
                    applyChange = false; // Don't clear existing character data with empty array
                }
            }
            // Special handling for next airing episode (always update if different)
            else if (typedKey === 'nextAiringEpisode') {
                if (JSON.stringify(existingValue) !== JSON.stringify(newValue)) {
                    applyChange = true;
                    console.log(`[Update Anime External] Next airing episode updated for ${existingAnime.title}`);
                } else {
                    applyChange = false;
                }
            }
            // Standard validation for other fields
            else if (typeof existingValue === 'string' && existingValue.trim() !== "" && typeof newValue === 'string' && newValue.trim() === "") {
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
    const episodeMessage = episodeDataChanged ? ' (including episode data)' : '';
    const characterMessage = characterDataChanged ? ' (including character data)' : '';
    console.log(`[Update Anime External - ${args.sourceApi}] Patched ${args.animeId} with ${Object.keys(updatesToApply).length - 1} fields${episodeMessage}${characterMessage}.`);

    // If episode data changed, schedule enrichment for YouTube previews
    if (episodeDataChanged) {
        console.log(`[Update Anime External] Scheduling preview enrichment for ${args.animeId}`);
        ctx.scheduler.runAfter(5000, internal.anime.enrichEpisodesWithYouTubePreviews, {
            animeId: args.animeId,
        });
    }
} else {
    console.log(`[Update Anime External - ${args.sourceApi}] No new changes for ${args.animeId}.`);
}
  },
});

// NEW: Query to get anime that are currently airing
export const getCurrentlyAiringAnime = query({
  args: { paginationOpts: v.any() },
  handler: async (ctx, args): Promise<PaginationResult<Doc<"anime">>> => {
    return await ctx.db
      .query("anime")
      .withIndex("by_airingStatus", q => q.eq("airingStatus", "RELEASING"))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

// NEW: Internal query to get all anime (for batch operations)
export const getAllAnimeInternal = internalQuery({
  args: {},
  handler: async (ctx): Promise<Doc<"anime">[]> => {
    return await ctx.db.query("anime").collect();
  },
});

// Get all anime with a MyAnimeList ID
export const getAllAnimeWithMalId = internalQuery({
  args: {},
  handler: async (ctx): Promise<Doc<"anime">[]> => {
    return await ctx.db
      .query("anime")
      .filter(q => q.neq(q.field("myAnimeListId"), undefined))
      .collect();
  },
});

// NEW: Query to get anime with episode data
export const getAnimeWithEpisodes = query({
  args: { 
    paginationOpts: v.any(),
    hasEpisodes: v.optional(v.boolean())
  },
  handler: async (ctx, args): Promise<PaginationResult<Doc<"anime">>> => {
    const results = await ctx.db.query("anime").order("desc").paginate(args.paginationOpts);
    
    if (args.hasEpisodes !== undefined) {
      const filteredPage = results.page.filter((anime: Doc<"anime">) => {
        const hasEpisodeData = anime.streamingEpisodes && anime.streamingEpisodes.length > 0;
        return args.hasEpisodes ? hasEpisodeData : !hasEpisodeData;
      });
      
      return { ...results, page: filteredPage };
    }
    
    return results;
  },
});

export const mergeAnimeDuplicate = internalMutation({
  args: { targetId: v.id("anime"), duplicateId: v.id("anime") },
  handler: async (ctx, args) => {
    const targetId = args.targetId;
    const duplicateId = args.duplicateId;

    const duplicate = await ctx.db.get(duplicateId);
    const target = await ctx.db.get(targetId);
    if (!duplicate || !target) return;

    const watchlistItems = await ctx.db
      .query("watchlist")
      .filter(q => q.eq(q.field("animeId"), duplicateId))
      .collect();
    for (const item of watchlistItems) {
      await ctx.db.patch(item._id, { animeId: targetId });
    }

    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_animeId_createdAt", q => q.eq("animeId", duplicateId))
      .collect();
    for (const review of reviews) {
      await ctx.db.patch(review._id, { animeId: targetId });
    }

    const lists = await ctx.db.query("customLists").collect();
    for (const list of lists) {
      if (list.animeIds.includes(duplicateId)) {
        const updated = Array.from(
          new Set(list.animeIds.map(id => (id === duplicateId ? targetId : id)))
        );
        await ctx.db.patch(list._id, { animeIds: updated, updatedAt: Date.now() });
      }
    }

    const fieldsToMerge: (keyof Doc<"anime">)[] = [
      "description",
      "posterUrl",
      "genres",
      "year",
      "rating",
      "emotionalTags",
      "trailerUrl",
      "studios",
      "themes",
      "anilistId",
      "streamingEpisodes",
      "totalEpisodes",
      "episodeDuration",
      "airingStatus",
      "nextAiringEpisode",
      "characters",
    ];

    const updates: Partial<Doc<"anime">> = {};
    for (const field of fieldsToMerge) {
      const current = (target as any)[field];
      const incoming = (duplicate as any)[field];
      if ((current === undefined || (Array.isArray(current) && current.length === 0)) && incoming !== undefined) {
        (updates as any)[field] = incoming;
      }
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(targetId, updates);
    }

    await ctx.db.delete(duplicateId);
  }
});

// Export helper for testing
export { findExistingAnimeByTitle };

export const deduplicateAnimeDatabase = internalAction({
  args: {},
  handler: async (ctx) => {
    const allAnime = await ctx.runQuery(internal.anime.getAllAnimeInternal, {});
    const map = new Map<string, Doc<"anime">[]>();
    for (const anime of allAnime) {
      const key = normalizeTitle(anime.title);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(anime);
    }

    let duplicatesRemoved = 0;
    for (const group of map.values()) {
      if (group.length < 2) continue;
      group.sort((a, b) => a._creationTime - b._creationTime);
      const [target, ...dups] = group;
      for (const dup of dups) {
        await ctx.runMutation(internal.anime.mergeAnimeDuplicate, {
          targetId: target._id,
          duplicateId: dup._id,
        });
        duplicatesRemoved++;
      }
      await ctx.runMutation(internal.reviews.updateAnimeAverageRating, {
        animeId: target._id,
      });
    }

    console.log(`[Dedup] Removed ${duplicatesRemoved} duplicate anime entries`);
    return { removed: duplicatesRemoved };
  }
});

export const enrichEpisodesWithPreviews = internalAction({
  args: { animeId: v.id("anime"), myAnimeListId: v.number() },
  handler: async (ctx, args) => {
    const response = await fetch(
      `https://api.jikan.moe/v4/anime/${args.myAnimeListId}/videos`
    );
    if (!response.ok) {
      console.error(`Failed to fetch videos for MAL ID ${args.myAnimeListId}`);
      return;
    }
    const data = await response.json();
    const episodes = data?.data?.episodes || [];

    const anime = await ctx.runQuery(internal.anime.getAnimeByIdInternal, {
      animeId: args.animeId,
    });
    if (!anime || !anime.episodes) return;

    const updatedEpisodes = anime.episodes.map((ep) => {
      const match = episodes.find((e: any) => e.mal_id === ep.episodeNumber);
      if (match && match.url) {
        return { ...ep, previewUrl: match.url };
      }
      return ep;
    });

    await ctx.runMutation(internal.anime.updateAnimeEpisodesWithPreviews, {
  animeId: args.animeId,
  episodes: updatedEpisodes
});
  },
});

export const enrichEpisodesWithYouTubePreviews = internalAction({
  args: { animeId: v.id("anime") },
  handler: async (ctx, args): Promise<EnrichmentResult> => {
    console.log(`[YouTube Preview] Starting enrichment for anime ${args.animeId}`);
    
    const anime = await ctx.runQuery(internal.anime.getAnimeByIdInternal, {
      animeId: args.animeId,
    });
    
    if (!anime) {
      console.error(`[YouTube Preview] Anime ${args.animeId} not found`);
      return { success: false, error: "Anime not found" };
    }

    if (!anime.streamingEpisodes || anime.streamingEpisodes.length === 0) {
      console.log(`[YouTube Preview] No episodes found for ${anime.title}`);
      return { success: false, error: "No episodes found" };
    }

    // Check if we already have preview URLs
    const episodesWithPreviews = anime.streamingEpisodes.filter(ep => ep.previewUrl);
    if (episodesWithPreviews.length >= anime.streamingEpisodes.length * 0.5) {
      console.log(`[YouTube Preview] ${anime.title} already has sufficient preview data`);
      return { success: true, message: "Already has sufficient preview data" };
    }

    // YouTube API key - you'll need to set this in your environment
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    
    if (!YOUTUBE_API_KEY) {
      console.warn(`[YouTube Preview] No YouTube API key found, using placeholder previews`);
      const placeholderResult = await ctx.runMutation(internal.anime.addPlaceholderPreviews, {
        animeId: args.animeId
      });
      return placeholderResult || { success: false, error: "Failed to add placeholder previews" };
    }

    const updatedEpisodes: any[] = [];
    let successCount = 0;
    
    // Process up to 10 episodes to avoid hitting API limits
    const episodesToProcess = anime.streamingEpisodes.slice(0, 10);
    
    for (let i = 0; i < episodesToProcess.length; i++) {
      const episode = episodesToProcess[i];
      
      // Skip if already has preview
      if (episode.previewUrl) {
        updatedEpisodes.push(episode);
        continue;
      }

      try {
        const episodeTitle = episode.title || `Episode ${i + 1}`;
        const searchQueries = [
          `"${anime.title}" "${episodeTitle}" preview`,
          `"${anime.title}" episode ${i + 1} preview`,
          `${anime.title} ep ${i + 1} preview PV`,
          `${anime.title.replace(/[^\w\s]/gi, '')} episode ${i + 1}`
        ];

        let foundPreview = false;
        
        for (const searchQuery of searchQueries) {
          if (foundPreview) break;
          
          try {
            const response = await fetch(
              `https://www.googleapis.com/youtube/v3/search?` +
              `part=snippet&q=${encodeURIComponent(searchQuery)}&` +
              `type=video&maxResults=5&key=${YOUTUBE_API_KEY}&` +
              `order=relevance&videoDuration=short`
            );
            
            if (!response.ok) {
              console.error(`[YouTube API] Error ${response.status} for query: ${searchQuery}`);
              continue;
            }
            
            const data = await response.json();
            
            if (data.error) {
              console.error(`[YouTube API] API Error:`, data.error);
              continue;
            }
            
            const videos = data.items || [];
            
            // Look for official previews with better scoring
            const scoredVideos = videos.map((video: any) => {
              const channelTitle = video.snippet.channelTitle.toLowerCase();
              const videoTitle = video.snippet.title.toLowerCase();
              
              let score = 0;
              
              // Boost official channels
              if (channelTitle.includes('official') || 
                  channelTitle.includes(anime.title.toLowerCase().substring(0, 10))) {
                score += 50;
              }
              
              // Boost preview/PV keywords
              if (videoTitle.includes('preview') || videoTitle.includes('pv')) score += 30;
              if (videoTitle.includes('trailer')) score += 20;
              if (videoTitle.includes('episode') && videoTitle.includes((i + 1).toString())) score += 25;
              
              // Penalize fan content
              if (channelTitle.includes('fan') || videoTitle.includes('amv') || 
                  videoTitle.includes('compilation')) score -= 20;
              
              // Boost if anime title is in video title
              if (videoTitle.includes(anime.title.toLowerCase())) score += 15;
              
              return { ...video, score };
            });
            
            // Sort by score and get the best match
            scoredVideos.sort((a, b) => b.score - a.score);
            const bestVideo = scoredVideos[0];
            
            if (bestVideo && bestVideo.score > 10) {
              const previewUrl = `https://www.youtube.com/watch?v=${bestVideo.id.videoId}`;
              updatedEpisodes.push({
                ...episode,
                previewUrl: previewUrl
              });
              
              successCount++;
              foundPreview = true;
              
              console.log(`[YouTube Preview] Found preview for ${anime.title} ${episodeTitle}: ${previewUrl} (score: ${bestVideo.score})`);
              break;
            }
          } catch (searchError) {
            console.error(`[YouTube Preview] Search error for "${searchQuery}":`, searchError);
          }
          
          // Rate limiting - wait between searches
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // If no preview found, add episode without preview
        if (!foundPreview) {
          updatedEpisodes.push(episode);
          console.log(`[YouTube Preview] No preview found for ${anime.title} ${episodeTitle}`);
        }
        
        // Rate limiting between episodes
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.error(`[YouTube Preview] Error processing episode ${i + 1}:`, error);
        updatedEpisodes.push(episode);
      }
    }

    // Add remaining episodes without processing
    if (episodesToProcess.length < anime.streamingEpisodes.length) {
      updatedEpisodes.push(...anime.streamingEpisodes.slice(episodesToProcess.length));
    }

    // Update the anime with new episode data
    if (updatedEpisodes.length > 0) {
      await ctx.runMutation(internal.anime.updateAnimeWithExternalData, {
        animeId: args.animeId,
        updates: { streamingEpisodes: updatedEpisodes },
        sourceApi: "youtube"
      });
      
      console.log(`[YouTube Preview] Updated ${anime.title} with ${successCount} episode previews out of ${episodesToProcess.length} processed`);
    }
    
    return { 
      success: true, 
      message: `Added ${successCount} previews out of ${episodesToProcess.length} episodes`,
      previewsAdded: successCount,
      episodesProcessed: episodesToProcess.length
    };
  },
});

// Fallback: Add placeholder previews for testing
export const addPlaceholderPreviews = internalMutation({
  args: { animeId: v.id("anime") },
  handler: async (ctx, args): Promise<EnrichmentResult> => {
    const anime = await ctx.db.get(args.animeId);
    if (!anime || !anime.streamingEpisodes) {
      return { success: false, error: "No anime or episodes found" };
    }

    // Create placeholder preview URLs for testing
    const updatedEpisodes = anime.streamingEpisodes.map((episode, index) => {
      if (episode.previewUrl) return episode; // Keep existing previews
      
      // Use a sample preview video URL (replace with actual preview content)
      const placeholderPreviews = [
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // Rick Roll as placeholder
        "https://www.youtube.com/watch?v=9bZkp7q19f0", // Gangnam Style
        "https://www.youtube.com/watch?v=kJQP7kiw5Fk", // Despacito
        "https://www.youtube.com/watch?v=fJ9rUzIMcZQ", // Bohemian Rhapsody
        "https://www.youtube.com/watch?v=YQHsXMglC9A"  // Hello by Adele
      ];
      
      return {
        ...episode,
        previewUrl: placeholderPreviews[index % placeholderPreviews.length]
      };
    });

    await ctx.db.patch(args.animeId, { streamingEpisodes: updatedEpisodes });
    
    console.log(`[Placeholder Preview] Added placeholder previews for ${anime.title}`);
    return { 
      success: true, 
      message: "Added placeholder previews",
      previewsAdded: updatedEpisodes.filter(ep => ep.previewUrl).length,
      episodesProcessed: updatedEpisodes.length
    };
  },
});

// Manual trigger for testing previews (accessible from frontend)
export const triggerPreviewEnrichment = mutation({
  args: { animeId: v.id("anime") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required");
    
    // Check if user is admin (optional)
    const userProfile = await ctx.db.query("userProfiles")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();
    
    // For testing, allow any authenticated user. In production, restrict to admins
    // if (!userProfile?.isAdmin) throw new Error("Admin access required");
    
    console.log(`[Manual Trigger] User ${userId} triggered preview enrichment for anime ${args.animeId}`);
    
    // Schedule the enrichment action
    await ctx.scheduler.runAfter(0, internal.anime.enrichEpisodesWithYouTubePreviews, {
      animeId: args.animeId
    });
    
    return { success: true, message: "Preview enrichment scheduled" };
  },
});

// Query to check episode preview status
export const getEpisodePreviewStatus = query({
  args: { animeId: v.id("anime") },
  handler: async (ctx, args) => {
    const anime = await ctx.db.get(args.animeId);
    if (!anime || !anime.streamingEpisodes) {
      return {
        totalEpisodes: 0,
        episodesWithPreviews: 0,
        previewPercentage: 0,
        episodes: []
      };
    }
    
    const episodesWithPreviews = anime.streamingEpisodes.filter(ep => ep.previewUrl);
    
    return {
      totalEpisodes: anime.streamingEpisodes.length,
      episodesWithPreviews: episodesWithPreviews.length,
      previewPercentage: Math.round((episodesWithPreviews.length / anime.streamingEpisodes.length) * 100),
      episodes: anime.streamingEpisodes.map((ep, index) => ({
        index: index + 1,
        title: ep.title || `Episode ${index + 1}`,
        hasPreview: !!ep.previewUrl,
        previewUrl: ep.previewUrl
      }))
    };
  },
});

// Advanced: Scrape actual anime preview sites (example implementation)
export const enrichWithAnimePreviewSites = internalAction({
  args: { animeId: v.id("anime") },
  handler: async (ctx, args) => {
    // This is a more advanced implementation that could scrape
    // actual anime preview sites like Crunchyroll, Funimation, etc.
    // For now, we'll use the YouTube implementation
    
    return await ctx.runAction(internal.anime.enrichEpisodesWithYouTubePreviews, {
      animeId: args.animeId
    });
  },
});

// Batch processing with better error handling
export const batchEnrichEpisodesWithYouTubePreviews = internalAction({
  args: { 
    maxAnimeToProcess: v.optional(v.number()),
    onlyWithoutPreviews: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const maxToProcess = args.maxAnimeToProcess || 5; // Reduced for testing
    const onlyWithoutPreviews = args.onlyWithoutPreviews ?? true;
    
    console.log(`[Batch Preview] Starting batch enrichment (max: ${maxToProcess})`);
    
    const allAnime = await ctx.runQuery(internal.anime.getAllAnimeInternal, {});
    
    let animeNeedingPreviews = allAnime.filter(anime => {
      if (!anime.streamingEpisodes || anime.streamingEpisodes.length === 0) return false;
      
      if (onlyWithoutPreviews) {
        const episodesWithPreviews = anime.streamingEpisodes.filter(ep => ep.previewUrl);
        return episodesWithPreviews.length === 0;
      }
      
      return true;
    });
    
    // Sort by popularity/rating for better results
    animeNeedingPreviews.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    animeNeedingPreviews = animeNeedingPreviews.slice(0, maxToProcess);

    console.log(`[Batch Preview] Processing ${animeNeedingPreviews.length} anime`);

    const results: BatchProcessingResult[] = [];
    
    for (const anime of animeNeedingPreviews) {
      try {
        console.log(`[Batch Preview] Processing: ${anime.title}`);
        
        const result = await ctx.runAction(internal.anime.enrichEpisodesWithYouTubePreviews, {
          animeId: anime._id
        });
        
        results.push({
          animeId: anime._id,
          title: anime.title,
          result: result as EnrichmentResult
        });
        
        // Wait between anime to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error(`[Batch Preview] Error processing ${anime.title}:`, error);
        results.push({
          animeId: anime._id,
          title: anime.title,
          result: { success: false, error: errorMessage }
        });
      }
    }
    
    const successCount = results.filter(r => r.result.success).length;
    console.log(`[Batch Preview] Completed: ${successCount}/${results.length} successful`);
    
    return { 
      processed: animeNeedingPreviews.length,
      successful: successCount,
      results
    };
  },
});

// Also add a manual trigger function for testing
export const triggerYouTubePreviewEnrichment = internalAction({
  args: { animeId: v.id("anime") },
  handler: async (ctx, args) => {
    await ctx.runAction(internal.anime.enrichEpisodesWithYouTubePreviews, {
      animeId: args.animeId
    });
  },
});

export const enrichAnimeOSTWithAI = internalAction({
  args: { animeId: v.id("anime") },
  handler: async (ctx, args) => {
    // Use the correct Convex database API for actions
    const anime = await ctx.runQuery(internal.anime.getAnimeById, { animeId: args.animeId });
    if (!anime) throw new Error("Anime not found");
    if (anime.ost && Array.isArray(anime.ost) && anime.ost.length > 0) {
      return { success: true, message: "OST already present", ost: anime.ost };
    }

    if (!process.env.CONVEX_OPENAI_API_KEY) {
      return { success: false, error: "OpenAI API key not configured." };
    }

    const openai = new OpenAI({ apiKey: process.env.CONVEX_OPENAI_API_KEY });
    const systemPrompt = `You are an expert on anime music. For the anime titled "${anime.title}", provide a JSON array of its official soundtrack entries. Each entry should have:
- title (string)
- type (one of: OP, ED, insert, bgm)
- artist (string, if known)
- composer (string, if known)
- links (array of objects: {type: 'spotify'|'youtube'|'apple', url: string}, if known)

Include all opening (OP), ending (ED), iconic insert songs, and notable background music (bgm) if available. Only include tracks that are actually from this anime.`;

    const userPrompt = `List the official soundtracks for the anime "${anime.title}". Format as JSON.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    });

    let ost: any[] = [];
    try {
      const content = completion.choices[0].message.content;
      const parsed = JSON.parse(content || "[]");
      ost = Array.isArray(parsed) ? parsed : (parsed.ost || []);
    } catch (e) {
      return { success: false, error: "Failed to parse AI OST response." };
    }

    if (!Array.isArray(ost) || ost.length === 0) {
      return { success: false, error: "No OST data returned by AI." };
    }

    // Use the correct Convex database API for actions
    await ctx.runMutation(internal.anime.updateAnimeOST, { animeId: args.animeId, ost });
    return { success: true, ost };
  }
});