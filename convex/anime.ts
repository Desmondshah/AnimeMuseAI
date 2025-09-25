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
  excludePlaceholders: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<PaginationResult<Doc<"anime">>> => {
  const { filters, sortBy = "newest", searchTerm, excludePlaceholders } = args;
    
    // NEW: If search term is provided, use search index instead of regular query
    if (searchTerm && searchTerm.trim()) {
      console.log(`[Search] Searching for: "${searchTerm}"`);
      // 1) Try to return ONLY exact title matches (case/spacing/punctuation-insensitive)
      const cleanTerm = normalizeTitle(searchTerm);
      // Try direct exact match via index first (case-sensitive exact)
      const directExact = await ctx.db
        .query("anime")
        .withIndex("by_title", (q: any) => q.eq("title", searchTerm))
        .first();

      if (directExact) {
        // Return the single exact match immediately
        return {
          page: [directExact],
          isDone: true,
          continueCursor: null,
          splitCursor: null,
          pageStatus: "Exhausted",
        } as unknown as PaginationResult<Doc<"anime">>;
      }

      // If not found via index, search and filter down to exact normalized matches
      const probeResults = await ctx.db
        .query("anime")
        .withSearchIndex("search_title", (q: any) => q.search("title", searchTerm))
        .take(200);
      const exactNormalizedMatches = probeResults.filter((a: any) => normalizeTitle(a.title) === cleanTerm || (Array.isArray(a.alternateTitles) && a.alternateTitles.some((t: string) => normalizeTitle(t) === cleanTerm)));

      if (exactNormalizedMatches.length > 0) {
        // Optionally apply filters to exact matches
        let exactFiltered = exactNormalizedMatches as Doc<"anime">[];
        if (filters) {
          exactFiltered = exactFiltered.filter((anime: Doc<"anime">) => {
            if (filters.yearRange?.min !== undefined && anime.year !== undefined && anime.year < filters.yearRange.min) return false;
            if (filters.yearRange?.max !== undefined && anime.year !== undefined && anime.year > filters.yearRange.max) return false;
            if (filters.ratingRange?.min !== undefined && anime.rating !== undefined && anime.rating < filters.ratingRange.min) return false;
            if (filters.ratingRange?.max !== undefined && anime.rating !== undefined && anime.rating > filters.ratingRange.max) return false;
            if (filters.userRatingRange?.min !== undefined && anime.averageUserRating !== undefined && anime.averageUserRating < filters.userRatingRange.min) return false;
            if (filters.userRatingRange?.max !== undefined && anime.averageUserRating !== undefined && anime.averageUserRating > filters.userRatingRange.max) return false;
            if (filters.minReviews !== undefined && filters.minReviews > 0) {
              if (!anime.reviewCount || anime.reviewCount < filters.minReviews) return false;
            } else if (filters.minReviews === 0) {
              if (anime.reviewCount && anime.reviewCount > 0) return false;
            }
            if (filters.genres?.length && (!anime.genres || !filters.genres.every(genre => anime.genres!.includes(genre)))) return false;
            if (filters.studios?.length && (!anime.studios || !filters.studios.some(studio => anime.studios!.includes(studio)))) return false;
            if (filters.themes?.length && (!anime.themes || !filters.themes.some(theme => anime.themes!.includes(theme)))) return false;
            if (filters.emotionalTags?.length && (!anime.emotionalTags || !filters.emotionalTags.some(tag => anime.emotionalTags!.includes(tag)))) return false;
            return true;
          });
        }

        // Sorting exact matches by title if requested, otherwise keep as-is
        if (sortBy === "title_asc") exactFiltered.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        if (sortBy === "title_desc") exactFiltered.sort((a, b) => (b.title || "").localeCompare(a.title || ""));

        return {
          page: exactFiltered,
          isDone: true,
          continueCursor: null,
          splitCursor: null,
          pageStatus: "Exhausted",
        } as unknown as PaginationResult<Doc<"anime">>;
      }
      
      // 2) No exact match -> Use fuzzy search (existing behavior)
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
    // Exclude placeholder posters (only when NOT doing a text search) unless explicitly disabled
    if (!searchTerm && (excludePlaceholders === undefined || excludePlaceholders)) {
      filteredPage = filteredPage.filter(a => !(a.posterUrl && /placehold\.co|placeholder/i.test(a.posterUrl)));
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
      // 1) Try to return ONLY exact title matches (case/spacing/punctuation-insensitive)
      const cleanTerm = normalizeTitle(searchTerm);
      // Try direct exact match via index first (case-sensitive exact)
      const directExact = await ctx.db
        .query("anime")
        .withIndex("by_title", (q: any) => q.eq("title", searchTerm))
        .first();

      if (directExact) {
        return {
          page: [directExact],
          isDone: true,
          continueCursor: null,
          splitCursor: null,
          pageStatus: "Exhausted",
        } as unknown as PaginationResult<Doc<"anime">>;
      }

      // If not found via index, search and filter down to exact normalized matches
      const probeResults = await ctx.db
        .query("anime")
        .withSearchIndex("search_title", (q: any) => q.search("title", searchTerm))
        .take(200);
      const exactNormalizedMatches = probeResults.filter((a: any) => normalizeTitle(a.title) === cleanTerm || (Array.isArray(a.alternateTitles) && a.alternateTitles.some((t: string) => normalizeTitle(t) === cleanTerm)));

      if (exactNormalizedMatches.length > 0) {
        // Optionally apply filters to exact matches
        let exactFiltered = exactNormalizedMatches as Doc<"anime">[];
        if (filters) {
          exactFiltered = exactFiltered.filter((anime: Doc<"anime">) => {
            if (filters.yearRange?.min !== undefined && anime.year !== undefined && anime.year < filters.yearRange.min) return false;
            if (filters.yearRange?.max !== undefined && anime.year !== undefined && anime.year > filters.yearRange.max) return false;
            if (filters.ratingRange?.min !== undefined && anime.rating !== undefined && anime.rating < filters.ratingRange.min) return false;
            if (filters.ratingRange?.max !== undefined && anime.rating !== undefined && anime.rating > filters.ratingRange.max) return false;
            if (filters.userRatingRange?.min !== undefined && anime.averageUserRating !== undefined && anime.averageUserRating < filters.userRatingRange.min) return false;
            if (filters.userRatingRange?.max !== undefined && anime.averageUserRating !== undefined && anime.averageUserRating > filters.userRatingRange.max) return false;
            if (filters.minReviews !== undefined && filters.minReviews > 0) {
              if (!anime.reviewCount || anime.reviewCount < filters.minReviews) return false;
            } else if (filters.minReviews === 0) {
              if (anime.reviewCount && anime.reviewCount > 0) return false;
            }
            if (filters.genres?.length && (!anime.genres || !filters.genres.every(genre => anime.genres!.includes(genre)))) return false;
            if (filters.studios?.length && (!anime.studios || !filters.studios.some(studio => anime.studios!.includes(studio)))) return false;
            if (filters.themes?.length && (!anime.themes || !filters.themes.some(theme => anime.themes!.includes(theme)))) return false;
            if (filters.emotionalTags?.length && (!anime.emotionalTags || !filters.emotionalTags.some(tag => anime.emotionalTags!.includes(tag)))) return false;
            return true;
          });
        }

        if (sortBy === "title_asc") exactFiltered.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        if (sortBy === "title_desc") exactFiltered.sort((a, b) => (b.title || "").localeCompare(a.title || ""));

        return {
          page: exactFiltered,
          isDone: true,
          continueCursor: null,
          splitCursor: null,
          pageStatus: "Exhausted",
        } as unknown as PaginationResult<Doc<"anime">>;
      }
      
      // 2) No exact match -> Use fuzzy search (existing behavior)
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

// Check if anime exists by external IDs
export const checkAnimeExistsByExternalIds = internalQuery({
  args: {
    anilistId: v.optional(v.number()),
    myAnimeListId: v.optional(v.number()),
    title: v.string(),
  },
  handler: async (ctx, args): Promise<Doc<"anime"> | null> => {
    // First check by AniList ID
    if (args.anilistId) {
      const byAnilistId = await ctx.db
        .query("anime")
        .withIndex("by_anilistId", (q) => q.eq("anilistId", args.anilistId))
        .first();
      if (byAnilistId) return byAnilistId;
    }

    // Then check by MyAnimeList ID
    if (args.myAnimeListId) {
      const byMalId = await ctx.db
        .query("anime")
        .filter((q) => q.eq(q.field("myAnimeListId"), args.myAnimeListId))
        .first();
      if (byMalId) return byMalId;
    }

    // Finally check by title
    return await findExistingAnimeByTitle(ctx, args.title);
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

    const newMetadataPayload: Omit<Doc<"filterMetadata">, "_id" | "_creationTime"> = {
      identifier: FILTER_METADATA_IDENTIFIER,
      // Coerce to string arrays to avoid inferred unknown[]
      genres: Array.from(genres).map(String).sort(),
      studios: Array.from(studios).map(String).sort(),
      themes: Array.from(themes).map(String).sort(),
      emotionalTags: Array.from(emotionalTags).map(String).sort(),
      yearRange,
      ratingRange,
      userRatingRange,
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
  // Determine admin status
  let isAdmin = false;
  try {
    const profile = await ctx.db.query('userProfiles').withIndex('by_userId', q => q.eq('userId', userId)).unique();
    isAdmin = !!profile?.isAdmin;
  } catch (e) {
    console.warn('[Add Anime] Failed to fetch user profile for admin check:', (e as any)?.message);
  }

  // Alias normalization reused from smartFindAnimeForNavigation (keep in sync if updated)
  const normalize = (s: string) => (s || '').toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/【.*?】/g, '')
    .replace(/[^a-z0-9]+/g, ' ') // collapse non-alphanumerics
    .trim();
  const ALIAS_MAP: Record<string, string[]> = {
    'attack on titan': ['shingeki no kyojin', '進撃の巨人', 'shingeki  no  kyojin', 'attack-on-titan'],
    'demon slayer': ['kimetsu no yaiba', '鬼滅の刃'],
    'my hero academia': ['boku no hero academia', '僕のヒーローアカデミア', 'boku no hero'],
    'jujutsu kaisen': ['呪術廻戦'],
    'one piece': ['ワンピース'],
  };
  const aliasToCanonical: Record<string, string> = {};
  for (const canonical in ALIAS_MAP) {
    const canonNorm = normalize(canonical);
    aliasToCanonical[canonNorm] = canonNorm;
    for (const alias of ALIAS_MAP[canonical]) aliasToCanonical[normalize(alias)] = canonNorm;
  }
  const inputNorm = normalize(args.title);
  const canonicalNorm = aliasToCanonical[inputNorm] || inputNorm;

  // Helper to find existing by normalized or alias canonical
  async function findByNormalizedOrAlias(): Promise<Doc<'anime'> | null> {
    let cursor: string | null = null;
    for (let pass = 0; pass < 6; pass++) {
      const { page, isDone, continueCursor } = await ctx.db.query('anime').paginate({ cursor, numItems: 50 });
      for (const a of page) {
        const aNorm = normalize(a.title);
        if (aNorm === inputNorm || aliasToCanonical[aNorm] === canonicalNorm) return a;
      }
      if (isDone) break;
      cursor = continueCursor;
    }
    return null;
  }

  // Check if this anime was previously deleted and is protected
  const isProtected = await ctx.runQuery(internal.anime.checkDeletedAnimeProtection, {
    title: args.title,
    anilistId: args.anilistId,
  });

  if (isProtected) {
    // Attempt alias resolution to existing canonical record instead of blocking
    const aliasExisting = await findByNormalizedOrAlias();
    if (aliasExisting) {
      console.log(`[Add Anime] Protected title '${args.title}' resolved to existing canonical '${aliasExisting.title}' (ID: ${aliasExisting._id}). Returning existing.`);
      return aliasExisting._id; // Route user to existing anime
    }
    if (!isAdmin) {
      console.log(`[Add Anime] User ${userId} blocked from re-adding previously deleted anime: "${args.title}"`);
      throw new Error(`This anime was previously deleted by an admin and cannot be re-added.`);
    }
    // Admin override – allow re-add but log explicitly
    console.log(`[Add Anime] ADMIN OVERRIDE: Admin ${userId} re-adding protected anime '${args.title}'.`);
  }

  // Existing direct (exact title) check
  const existing = await findExistingAnimeByTitle(ctx, args.title) || await findByNormalizedOrAlias();

  if (existing) {
    console.warn(
      `[Add Anime] User ${userId} existing anime: "${args.title}" (ID: ${existing._id}). Returning existing.`,
    );
    return existing._id;
  }

  console.log(`[Add Anime] User ${userId} adding new anime: "${args.title}"`);
  
  // Get admin user info for protection
  const adminUser = await ctx.db.get(userId);
  const adminUserName = adminUser?.name || "Unknown Admin";
  
  // Define all fields that should be protected initially
  const initialProtectedFields = [
    'title',
    'description', 
    'posterUrl',
    'genres',
    'year',
    'rating',
    'emotionalTags',
    'trailerUrl',
    'studios',
    'themes',
    'anilistId'
  ];
  
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
    // Set initial protection to prevent external API from overwriting user-added data
    lastManualEdit: {
      adminUserId: userId,
      timestamp: Date.now(),
      fieldsEdited: initialProtectedFields,
    },
  });

  console.log(`[Add Anime] Set initial protection for "${args.title}" - ${initialProtectedFields.length} fields protected from auto-refresh`);

  // Note: We're not automatically triggering external API fetch anymore
  // This prevents external data from overwriting the user's initial data
  // External data can still be fetched manually if needed

  return animeId;
}

// Smart navigation lookup: tries exact, normalized, search index, and anilistId
export const smartFindAnimeForNavigation = query({
  args: {
    title: v.string(),
    anilistId: v.optional(v.number()),
    allowFuzzy: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const rawTitle = args.title || "";
    const title = rawTitle.trim();
    if (!title) return null;

    const normalize = (s: string) => s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '') // strip diacritics
      .replace(/【.*?】/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
    const normTitle = normalize(title);

    // Alias dictionary for high-profile multi-language titles
    const ALIAS_MAP: Record<string, string[]> = {
      'attack on titan': ['shingeki no kyojin', '進撃の巨人', 'shingeki  no  kyojin', 'attack-on-titan'],
      'demon slayer': ['kimetsu no yaiba', '鬼滅の刃'],
      'my hero academia': ['boku no hero academia', '僕のヒーローアカデミア', 'boku no hero'],
      'jujutsu kaisen': ['呪術廻戦'],
      'one piece': ['ワンピース'],
    };

    // Reverse alias index
    const aliasToCanonical: Record<string, string> = {};
    for (const canonical in ALIAS_MAP) {
      const canonNorm = normalize(canonical);
      aliasToCanonical[canonNorm] = canonNorm;
      for (const alias of ALIAS_MAP[canonical]) {
        aliasToCanonical[normalize(alias)] = canonNorm;
      }
    }

    const canonicalNorm = aliasToCanonical[normTitle] || normTitle;

    // 1. Exact match
    const exact = await ctx.db.query("anime").filter(q => q.eq(q.field("title"), title)).first();
    if (exact) return { _id: exact._id, title: exact.title };

    // 2. Either perform a manual scan (non-fuzzy path) OR a search index fuzzy path, but NOT both.
    //    Convex only allows one paginated query per function execution.
    let loose: any = null;
    if (!args.allowFuzzy) {
      // Manual scan with a single paginated query loop.
      let cursor: string | null = null;
      for (let passes = 0; passes < 5 && !loose; passes++) {
        const { page, isDone, continueCursor } = await ctx.db.query("anime").paginate({ cursor, numItems: 50 });
        for (const a of page) {
          const aNorm = normalize(a.title);
          if (aNorm === normTitle || aliasToCanonical[aNorm] === canonicalNorm) {
            return { _id: a._id, title: a.title };
          }
          if (!loose) {
            if (
              aNorm.includes(normTitle) ||
              normTitle.includes(aNorm) ||
              (aliasToCanonical[aNorm] && aliasToCanonical[aNorm] === canonicalNorm)
            ) {
              loose = { _id: a._id, title: a.title };
            }
          }
        }
        if (isDone) break;
        cursor = continueCursor;
      }
      if (loose) return loose; // Return early for non-fuzzy path
    } else {
      // Fuzzy path: only use search index pagination (single paginated query).
      try {
        const { page } = await ctx.db.query("anime")
          .withSearchIndex("search_title", (q: any) => q.search("title", title))
          .paginate({ cursor: null, numItems: 20 });
        const scored = page.map((a: any) => {
          const na = normalize(a.title);
          const aliasMatch = aliasToCanonical[na] && aliasToCanonical[na] === canonicalNorm;
          let score = 0;
          if (na === normTitle || aliasMatch) score = 100;
          else if (na.startsWith(normTitle)) score = 90;
          else if (na.includes(normTitle)) score = 70;
          else if (normTitle.includes(na)) score = 60;
          return { a, score };
        }).filter(r => r.score > 0).sort((a,b)=>b.score-a.score);
        if (scored[0]) return { _id: scored[0].a._id, title: scored[0].a.title };
      } catch (e) {
        console.warn('[smartFindAnimeForNavigation] search index unavailable or failed:', (e as any)?.message);
      }
    }

    // 4. anilistId direct match if provided
    if (args.anilistId) {
      const byAniList = await ctx.db.query('anime')
        .withIndex('by_anilistId', q => q.eq('anilistId', args.anilistId!))
        .unique();
      if (byAniList) return { _id: byAniList._id, title: byAniList.title };
    }

    // Fallback to first loose match if found earlier
    return loose;
  }
});

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
        // Check if this anime was previously deleted and is protected
        const isProtected = await ctx.runQuery(internal.anime.checkDeletedAnimeProtection, {
          title: args.title,
          anilistId: args.anilistId,
        });
        
        if (isProtected) {
          console.log(`[Add Anime Internal] Blocked re-adding previously deleted anime: "${args.title}"`);
          throw new Error(`This anime was previously deleted by an admin and cannot be re-added automatically.`);
        }

        const existing = await findExistingAnimeByTitle(ctx, args.title);
        if (existing) return existing._id;
        
        // For internal operations, we'll create the anime without initial protection
        // Protection will be set when an actual admin edits the anime
        // This prevents the type issue and maintains the protection system's integrity
        const animeId = await ctx.db.insert("anime", args);
        
        console.log(`[Add Anime Internal] Created anime "${args.title}" without initial protection (will be set on first admin edit)`);
        
        // Note: We're not automatically triggering external API fetch anymore
        // This prevents external data from overwriting the initial data
        // External data can still be fetched manually if needed
        
        return animeId;
    }
});

// Idempotent upsert for AI/Discovery recommendations
// Ensures a recommended anime exists in DB and returns its ID without duplicating entries
export const ensureAnimeFromRecommendation = internalMutation({
  args: {
    title: v.string(),
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
    recommendationReasoning: v.optional(v.string()),
    recommendationScore: v.optional(v.number()),
    sourceAction: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Deleted protection
    const isProtected = await ctx.runQuery(internal.anime.checkDeletedAnimeProtection, {
      title: args.title,
      anilistId: args.anilistId,
    });
    if (isProtected) {
      throw new Error(`This anime was previously deleted by an admin and cannot be re-added automatically.`);
    }

    // Try to find an existing anime via multiple criteria
    const existing = await findExistingAnimeByMultipleCriteria(ctx, {
      title: args.title,
      posterUrl: args.posterUrl,
      year: args.year,
      anilistId: args.anilistId,
    });
    if (existing) {
      return { animeId: existing._id, created: false };
    }

    // Insert minimal valid record with recommendation metadata
    const animeId = await ctx.db.insert("anime", {
      title: args.title,
      description: args.description || "No description available.",
      posterUrl: args.posterUrl || `https://placehold.co/600x900/ECB091/321D0B/png?text=${encodeURIComponent(args.title.substring(0, 30))}&font=roboto`,
      genres: Array.isArray(args.genres) ? args.genres : [],
      year: args.year,
      rating: args.rating,
      emotionalTags: Array.isArray(args.emotionalTags) ? args.emotionalTags : [],
      trailerUrl: args.trailerUrl,
      studios: Array.isArray(args.studios) ? args.studios : [],
      themes: Array.isArray(args.themes) ? args.themes : [],
      anilistId: args.anilistId,
      addedFromRecommendation: true,
      recommendationReasoning: args.recommendationReasoning,
      recommendationScore: args.recommendationScore,
      addedAt: Date.now(),
    });

    return { animeId, created: true };
  },
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
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    protectedFields: v.optional(v.array(v.string())),
  }),
  handler: async (ctx, args) => {
    const { animeId, updates } = args;

    // Get current anime data to check for protection
    const currentAnime = await ctx.db.get(animeId);
    if (!currentAnime) {
      throw new Error("Anime not found");
    }

    // Check if any fields are protected from auto-refresh
    const protectedFields = currentAnime.lastManualEdit?.fieldsEdited || [];
    
    if (protectedFields.length > 0) {
      console.log(`[Auto-Refresh Protection] Anime "${currentAnime.title}" has protected fields: ${protectedFields.join(', ')}`);
      
      // Filter out protected fields from updates
      const filteredUpdates: any = {};
      const skippedFields: string[] = [];
      
      for (const [field, value] of Object.entries(updates)) {
        if (protectedFields.includes(field)) {
          skippedFields.push(field);
          console.log(`[Auto-Refresh Protection] Skipping protected field: ${field}`);
        } else {
          filteredUpdates[field] = value;
        }
      }
      
      // Only update if there are fields to update
      if (Object.keys(filteredUpdates).length > 0) {
        await ctx.db.patch(animeId, filteredUpdates);
        
        const updatedFieldCount = Object.keys(filteredUpdates).length;
        const skippedFieldCount = skippedFields.length;
        
        return {
          success: true,
          message: `Anime updated successfully. ${updatedFieldCount} fields updated, ${skippedFieldCount} fields protected and skipped.`,
          protectedFields: skippedFields,
        };
      } else {
        return {
          success: true,
          message: `All fields are protected from auto-refresh. No updates applied.`,
          protectedFields: skippedFields,
        };
      }
    } else {
      // No protection, update all fields as normal
      await ctx.db.patch(animeId, updates);

      return {
        success: true,
        message: `Anime updated successfully.`,
      };
    }
  },
});

// Check if anime was previously deleted (for deletion protection)
export const checkDeletedAnimeProtection = internalQuery({
  args: {
    title: v.string(),
    anilistId: v.optional(v.number()),
    myAnimeListId: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<boolean> => {
    // Check by title
    const byTitle = await ctx.db
      .query("deletedAnimeProtection")
      .withIndex("by_title", (q) => q.eq("title", args.title))
      .first();
    if (byTitle) return true;

    // Check by AniList ID
    if (args.anilistId) {
      const byAnilistId = await ctx.db
        .query("deletedAnimeProtection")
        .withIndex("by_anilistId", (q) => q.eq("anilistId", args.anilistId))
        .first();
      if (byAnilistId) return true;
    }

    // Check by MyAnimeList ID
    if (args.myAnimeListId) {
      const byMalId = await ctx.db
        .query("deletedAnimeProtection")
        .filter((q) => q.eq(q.field("myAnimeListId"), args.myAnimeListId))
        .first();
      if (byMalId) return true;
    }

    return false;
  },
});

// Episode Preview Status and Enrichment Functions
export const getEpisodePreviewStatus = query({
  args: { animeId: v.id("anime") },
  handler: async (ctx, args) => {
    const anime = await ctx.db.get(args.animeId);
    if (!anime) {
      throw new Error("Anime not found");
    }

    const episodes = anime.episodes || [];
    const streamingEpisodes = anime.streamingEpisodes || [];
    
    // Count episodes with preview URLs from both sources
    const episodesWithPreviews = episodes.filter(ep => ep.previewUrl).length +
                                 streamingEpisodes.filter(ep => ep.previewUrl).length;
    
    const totalEpisodes = Math.max(episodes.length, streamingEpisodes.length, anime.totalEpisodes || 0);
    
    const previewPercentage = totalEpisodes > 0 ? Math.round((episodesWithPreviews / totalEpisodes) * 100) : 0;

    return {
      episodesWithPreviews,
      totalEpisodes,
      previewPercentage,
      lastEnrichment: anime.lastManualEdit?.timestamp,
    };
  },
});

export const triggerPreviewEnrichment = mutation({
  args: { animeId: v.id("anime") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const anime = await ctx.db.get(args.animeId);
    if (!anime) {
      throw new Error("Anime not found");
    }

    try {
      // Schedule the enrichment action
      await ctx.scheduler.runAfter(0, internal.anime.enrichEpisodePreviews, {
        animeId: args.animeId,
        userId,
      });

      return {
        success: true,
        message: "Episode preview enrichment started successfully",
        animeTitle: anime.title,
      };
    } catch (error: any) {
      console.error("Failed to trigger preview enrichment:", error);
      throw new Error(`Failed to trigger preview enrichment: ${error.message}`);
    }
  },
});

export const enrichEpisodePreviews = internalAction({
  args: { 
    animeId: v.id("anime"), 
    userId: v.id("users") 
  },
  handler: async (ctx, args) => {
    const anime = await ctx.runQuery(internal.anime.getAnimeByIdInternal, { animeId: args.animeId });
    if (!anime) {
      console.error("Anime not found for preview enrichment:", args.animeId);
      return { success: false, error: "Anime not found" };
    }

    console.log(`Starting episode preview enrichment for: ${anime.title}`);

    try {
      // Use OpenAI to generate preview URLs for episodes that don't have them
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const episodes = anime.episodes || [];
      const enrichedEpisodes: Array<{
        episodeNumber: number;
        title: string;
        airDate?: string;
        duration?: number;
        thumbnailUrl?: string;
        previewUrl?: string;
      }> = [];

      for (const episode of episodes) {
        if (!episode.previewUrl) {
          try {
            // Generate a placeholder preview URL or description
            const response = await openai.chat.completions.create({
              model: "gpt-3.5-turbo",
              messages: [
                {
                  role: "system",
                  content: "You are helping generate episode preview content for an anime database. Generate a brief preview description for the episode.",
                },
                {
                  role: "user",
                  content: `Generate a brief preview description for episode ${episode.episodeNumber} titled "${episode.title}" from the anime "${anime.title}". Keep it under 100 words and avoid spoilers.`,
                },
              ],
              max_tokens: 150,
              temperature: 0.7,
            });

            const previewDescription = response.choices[0]?.message?.content?.trim();
            
            enrichedEpisodes.push({
              ...episode,
              previewUrl: `data:text/plain;base64,${Buffer.from(previewDescription || "Preview not available").toString('base64')}`,
            });
          } catch (episodeError: any) {
            console.error(`Failed to enrich episode ${episode.episodeNumber}:`, episodeError);
            enrichedEpisodes.push(episode); // Keep original episode data
          }
        } else {
          enrichedEpisodes.push(episode); // Keep episodes that already have previews
        }
      }

      // Update the anime with enriched episodes
      await ctx.runMutation(internal.anime.updateAnimeWithEnrichedEpisodes, {
        animeId: args.animeId,
        episodes: enrichedEpisodes,
        userId: args.userId,
      });

      console.log(`Successfully enriched ${enrichedEpisodes.length} episodes for: ${anime.title}`);
      
      return {
        success: true,
        enrichedCount: enrichedEpisodes.filter((ep) => ep.previewUrl).length,
        totalEpisodes: episodes.length,
      };
    } catch (error: any) {
      console.error("Episode preview enrichment failed:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },
});

export const updateAnimeWithEnrichedEpisodes = internalMutation({
  args: {
    animeId: v.id("anime"),
    episodes: v.array(v.object({
      episodeNumber: v.number(),
      title: v.string(),
      airDate: v.optional(v.string()),
      duration: v.optional(v.number()),
      thumbnailUrl: v.optional(v.string()),
      previewUrl: v.optional(v.string()),
    })),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.animeId, {
      episodes: args.episodes,
      lastManualEdit: {
        adminUserId: args.userId,
        timestamp: Date.now(),
        fieldsEdited: ["episodes"],
      },
    });
  },
});

// Query to fetch a specific character from an anime by its ID and character name
export const getCharacterFromAnime = query({
  args: {
    animeId: v.id("anime"),
    characterName: v.string(),
  },
  handler: async (ctx, args) => {
    const anime = await ctx.db.get(args.animeId);
    if (!anime || !anime.characters) {
      throw new Error("Anime or characters not found.");
    }

    const character = anime.characters.find(
      (char) => char.name.toLowerCase() === args.characterName.toLowerCase()
    );

    if (!character) {
      throw new Error(`Character ${args.characterName} not found in anime ${anime.title}`);
    }

    return character;
  },
});