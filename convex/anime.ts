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
    // Remove common punctuation and special characters
    .replace(/[^\w\s]/gi, " ")
    // Replace multiple spaces with single space
    .replace(/\s+/g, " ")
    // Remove spaces entirely for final comparison
    .replace(/\s/g, "");
}

export async function findExistingAnimeByTitle(ctx: any, title: string): Promise<Doc<"anime"> | null> {
  const clean = normalizeTitle(title);

  // First try exact match
  let existing = await ctx.db
    .query("anime")
    .withIndex("by_title", (q: any) => q.eq("title", title))
    .first();

  if (!existing) {
    // Try search index
    const matches = await ctx.db
      .query("anime")
      .withSearchIndex("search_title", (q: any) => q.search("title", title))
      .take(50);
    
    existing = matches.find((a: any) => normalizeTitle(a.title) === clean) || null;
  }

  return existing;
}

// Enhanced function to find anime by multiple criteria (title variations, poster URL, etc.)
async function findExistingAnimeByMultipleCriteria(ctx: any, animeData: {
  title: string;
  posterUrl?: string;
  year?: number;
  anilistId?: number;
}): Promise<Doc<"anime"> | null> {
  // First check by title
  let existing = await findExistingAnimeByTitle(ctx, animeData.title);
  if (existing) return existing;

  // Check by AniList ID if available
  if (animeData.anilistId) {
    existing = await ctx.db
      .query("anime")
      .withIndex("by_anilistId", (q: any) => q.eq("anilistId", animeData.anilistId))
      .first();
    if (existing) return existing;
  }

  // Check by poster URL (same poster likely means same anime)
  if (animeData.posterUrl && !animeData.posterUrl.includes('placehold.co')) {
    existing = await ctx.db
      .query("anime")
      .filter((q: any) => q.eq(q.field("posterUrl"), animeData.posterUrl))
      .first();
    if (existing) return existing;
  }

  // Check by title + year combination for additional confidence
  if (animeData.year) {
    const allMatches = await ctx.db
      .query("anime")
      .withSearchIndex("search_title", (q: any) => q.search("title", animeData.title))
      .take(100);
    
    const yearMatches = allMatches.filter((a: any) => 
      a.year === animeData.year && 
      Math.abs(normalizeTitle(a.title).length - normalizeTitle(animeData.title).length) <= 5
    );
    
    if (yearMatches.length > 0) {
      return yearMatches[0];
    }
  }

  return null;
}

// Declare the findExistingAnimeByNames function
async function findExistingAnimeByNames(ctx: any, englishName: string, japaneseName?: string): Promise<Doc<"anime"> | null> {
  const normalizedEnglishName = normalizeTitle(englishName);
  const normalizedJapaneseName = japaneseName ? normalizeTitle(japaneseName) : null;

  let existing = await ctx.db
    .query("anime")
    .withIndex("by_title", (q: any) => q.eq("title", englishName))
    .first();

  if (!existing && japaneseName) {
    existing = await ctx.db
      .query("anime")
      .withIndex("by_title", (q: any) => q.eq("title", japaneseName))
      .first();
  }

  if (!existing) {
    const matches = await ctx.db
      .query("anime")
      .withSearchIndex("search_title", (q: any) => q.search("title", englishName))
      .take(50);

    existing = matches.find(
      (anime: any) =>
        normalizeTitle(anime.title) === normalizedEnglishName ||
        (normalizedJapaneseName && normalizeTitle(anime.title) === normalizedJapaneseName)
    ) || null;
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

// Add the missing getAllAnimeWithCharacters function
export const getAllAnimeWithCharacters = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
    includeEnrichmentStats: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    // Get anime that have characters array
    const result = await ctx.db
      .query("anime")
      .filter((q) => q.neq(q.field("characters"), undefined))
      .paginate({ 
        numItems: limit, 
        cursor: args.cursor !== undefined ? args.cursor : null 
      });
    
    // If enrichment stats are requested, calculate them for each anime
    if (args.includeEnrichmentStats) {
      const animeWithStats = result.page.map(anime => {
        if (!anime.characters) return anime;
        
        const stats = anime.characters.reduce((acc: any, char: any) => {
          acc.totalCharacters++;
          switch (char.enrichmentStatus) {
            case "success":
              acc.enrichedCharacters++;
              break;
            case "pending":
              acc.pendingCharacters++;
              break;
            case "failed":
              acc.failedCharacters++;
              break;
            case "skipped":
              acc.skippedCharacters++;
              break;
          }
          return acc;
        }, {
          totalCharacters: 0,
          enrichedCharacters: 0,
          pendingCharacters: 0,
          failedCharacters: 0,
          skippedCharacters: 0,
        });
        
        stats.enrichmentPercentage = stats.totalCharacters > 0 
          ? (stats.enrichedCharacters / stats.totalCharacters) * 100 
          : 0;
        
        return {
          ...anime,
          enrichmentStats: stats,
        };
      });
      
      return {
        ...result,
        page: animeWithStats,
      };
    }
    
    return result;
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

// Internal version of getFilteredAnime for use within other functions
export const getFilteredAnimeInternal = internalQuery({
  args: {
    paginationOpts: v.any(),
    searchTerm: v.optional(v.string()),
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
    
    // If search term is provided, use search index instead of regular query
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
    
    // Regular filtering without search (keep existing logic)
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
      // Additional fields from external APIs
      anilistId: v.optional(v.number()),
      myAnimeListId: v.optional(v.number()),
      totalEpisodes: v.optional(v.number()),
      episodeDuration: v.optional(v.number()),
      airingStatus: v.optional(v.string()),
      nextAiringEpisode: v.optional(v.object({
        airingAt: v.optional(v.number()),
        episode: v.optional(v.number()),
        timeUntilAiring: v.optional(v.number()),
      })),
      streamingEpisodes: v.optional(v.array(v.object({
        title: v.optional(v.string()),
        thumbnail: v.optional(v.string()),
        url: v.optional(v.string()),
        site: v.optional(v.string()),
        previewUrl: v.optional(v.string()),
      }))),
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
          day: v.optional(v.number()) 
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
          imageUrl: v.optional(v.string()) 
        }))),
        relationships: v.optional(v.array(v.object({
          relatedCharacterId: v.optional(v.number()),
          relationType: v.string()
        }))),
        enrichmentStatus: v.optional(v.union(
          v.literal("pending"),
          v.literal("success"),
          v.literal("failed"),
          v.literal("skipped")
        )),
        enrichmentAttempts: v.optional(v.number()),
        lastAttemptTimestamp: v.optional(v.number()),
        lastErrorMessage: v.optional(v.string()),
        enrichmentTimestamp: v.optional(v.number()),
        manuallyEnrichedByAdmin: v.optional(v.boolean()),
        manualEnrichmentTimestamp: v.optional(v.number()),
        manualEnrichmentAdminId: v.optional(v.id("users")),
        personalityAnalysis: v.optional(v.string()),
        keyRelationships: v.optional(v.array(v.object({
          relatedCharacterName: v.string(),
          relationshipDescription: v.string(),
          relationType: v.string(),
        }))),
        detailedAbilities: v.optional(v.array(v.object({
          abilityName: v.string(),
          abilityDescription: v.string(),
          powerLevel: v.optional(v.string()),
        }))),
        majorCharacterArcs: v.optional(v.array(v.string())),
        trivia: v.optional(v.array(v.string())),
        backstoryDetails: v.optional(v.string()),
        characterDevelopment: v.optional(v.string()),
        notableQuotes: v.optional(v.array(v.string())),
        symbolism: v.optional(v.string()),
        fanReception: v.optional(v.string()),
        culturalSignificance: v.optional(v.string()),
        psychologicalProfile: v.optional(v.object({
          personalityType: v.optional(v.string()),
          coreFears: v.optional(v.array(v.string())),
          coreDesires: v.optional(v.array(v.string())),
          emotionalTriggers: v.optional(v.array(v.string())),
          copingMechanisms: v.optional(v.array(v.string())),
          mentalHealthAspects: v.optional(v.string()),
          traumaHistory: v.optional(v.string()),
          defenseMechanisms: v.optional(v.array(v.string())),
        })),
        combatProfile: v.optional(v.object({
          fightingStyle: v.optional(v.string()),
          preferredWeapons: v.optional(v.array(v.string())),
          combatStrengths: v.optional(v.array(v.string())),
          combatWeaknesses: v.optional(v.array(v.string())),
          battleTactics: v.optional(v.string()),
          powerScaling: v.optional(v.string()),
          specialTechniques: v.optional(v.array(v.object({
            name: v.string(),
            description: v.string(),
            powerLevel: v.optional(v.string()),
            limitations: v.optional(v.string()),
          }))),
        })),
        socialDynamics: v.optional(v.object({
          socialClass: v.optional(v.string()),
          culturalBackground: v.optional(v.string()),
          socialInfluence: v.optional(v.string()),
          leadershipStyle: v.optional(v.string()),
          communicationStyle: v.optional(v.string()),
          socialConnections: v.optional(v.array(v.string())),
          reputation: v.optional(v.string()),
          publicImage: v.optional(v.string()),
        })),
        characterArchetype: v.optional(v.object({
          primaryArchetype: v.optional(v.string()),
          secondaryArchetypes: v.optional(v.array(v.string())),
          characterTropes: v.optional(v.array(v.string())),
          subvertedTropes: v.optional(v.array(v.string())),
          characterRole: v.optional(v.string()),
          narrativeFunction: v.optional(v.string()),
        })),
      }))),
      lastFetchedFromExternal: v.optional(v.object({
        source: v.string(),
        timestamp: v.number(),
      })),
    }),
  },
  handler: async (ctx, args) => {
    const { animeId, updates } = args;

    await ctx.db.patch(animeId, updates);

    return {
      success: true,
      message: `Anime updated successfully.`,
    };
  },
});