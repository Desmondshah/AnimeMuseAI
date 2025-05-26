// convex/anime.ts - Enhanced version with filtering
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

// NEW: Advanced filtering query for discover page
export const getFilteredAnime = query({
  args: {
    paginationOpts: v.any(),
    filters: v.optional(v.object({
      genres: v.optional(v.array(v.string())), // Filter by genres (must include all selected)
      yearRange: v.optional(v.object({
        min: v.optional(v.number()),
        max: v.optional(v.number())
      })),
      ratingRange: v.optional(v.object({
        min: v.optional(v.number()),
        max: v.optional(v.number())
      })),
      userRatingRange: v.optional(v.object({
        min: v.optional(v.number()),
        max: v.optional(v.number())
      })),
      minReviews: v.optional(v.number()), // Minimum number of reviews
      studios: v.optional(v.array(v.string())), // Filter by studios
      themes: v.optional(v.array(v.string())), // Filter by themes
      emotionalTags: v.optional(v.array(v.string())), // Filter by emotional tags
    })),
    sortBy: v.optional(v.union(
      v.literal("newest"), // By creation time (default)
      v.literal("oldest"),
      v.literal("title_asc"),
      v.literal("title_desc"),
      v.literal("year_desc"),
      v.literal("year_asc"),
      v.literal("rating_desc"),
      v.literal("rating_asc"),
      v.literal("user_rating_desc"),
      v.literal("user_rating_asc"),
      v.literal("most_reviewed"),
      v.literal("least_reviewed")
    )),
  },
  handler: async (ctx, args): Promise<PaginationResult<Doc<"anime">>> => {
    const { filters, sortBy = "newest" } = args;
    
    // Build query with appropriate sorting
    let query;
    switch (sortBy) {
      case "year_desc":
        query = ctx.db.query("anime").withIndex("by_year").order("desc");
        break;
      case "year_asc":
        query = ctx.db.query("anime").withIndex("by_year").order("asc");
        break;
      case "rating_desc":
        query = ctx.db.query("anime").withIndex("by_rating").order("desc");
        break;
      case "rating_asc":
        query = ctx.db.query("anime").withIndex("by_rating").order("asc");
        break;
      case "user_rating_desc":
        query = ctx.db.query("anime").withIndex("by_averageUserRating").order("desc");
        break;
      case "user_rating_asc":
        query = ctx.db.query("anime").withIndex("by_averageUserRating").order("asc");
        break;
      case "most_reviewed":
        query = ctx.db.query("anime").withIndex("by_reviewCount").order("desc");
        break;
      case "least_reviewed":
        query = ctx.db.query("anime").withIndex("by_reviewCount").order("asc");
        break;
      case "oldest":
        query = ctx.db.query("anime").order("asc");
        break;
      case "title_asc":
      case "title_desc":
      case "newest":
      default:
        query = ctx.db.query("anime").order("desc");
        break;
    }

    // Apply filters that can be done at the database level
    if (filters) {
      query = query.filter((q) => {
        // Start with a base condition that's always true
        let condition = q.eq(q.field("_id"), q.field("_id")); // Always true condition

        // Year range filter
        if (filters.yearRange?.min !== undefined) {
          condition = q.and(condition, q.gte(q.field("year"), filters.yearRange.min));
        }
        if (filters.yearRange?.max !== undefined) {
          condition = q.and(condition, q.lte(q.field("year"), filters.yearRange.max));
        }

        // External rating range filter
        if (filters.ratingRange?.min !== undefined) {
          condition = q.and(condition, q.gte(q.field("rating"), filters.ratingRange.min));
        }
        if (filters.ratingRange?.max !== undefined) {
          condition = q.and(condition, q.lte(q.field("rating"), filters.ratingRange.max));
        }

        // User rating range filter
        if (filters.userRatingRange?.min !== undefined) {
          condition = q.and(condition, q.gte(q.field("averageUserRating"), filters.userRatingRange.min));
        }
        if (filters.userRatingRange?.max !== undefined) {
          condition = q.and(condition, q.lte(q.field("averageUserRating"), filters.userRatingRange.max));
        }

        // Minimum reviews filter
        if (filters.minReviews !== undefined) {
          condition = q.and(condition, q.gte(q.field("reviewCount"), filters.minReviews));
        }

        return condition;
      });
    }

    // Get paginated results
    const results = await query.paginate(args.paginationOpts);

    // Post-process for complex filters that can't be done in the query
    let filteredPage = results.page;

    if (filters) {
      filteredPage = results.page.filter(anime => {
        // Genre filter (AND logic - anime must have ALL selected genres)
        if (filters.genres && filters.genres.length > 0) {
          const hasAllGenres = filters.genres.every(genre => 
            anime.genres?.includes(genre)
          );
          if (!hasAllGenres) return false;
        }

        // Studio filter (OR logic - anime must have at least one matching studio)
        if (filters.studios && filters.studios.length > 0) {
          const hasMatchingStudio = filters.studios.some(studio => 
            anime.studios?.includes(studio)
          );
          if (!hasMatchingStudio) return false;
        }

        // Theme filter (OR logic - anime must have at least one matching theme)
        if (filters.themes && filters.themes.length > 0) {
          const hasMatchingTheme = filters.themes.some(theme => 
            anime.themes?.includes(theme)
          );
          if (!hasMatchingTheme) return false;
        }

        // Emotional tags filter (OR logic - anime must have at least one matching tag)
        if (filters.emotionalTags && filters.emotionalTags.length > 0) {
          const hasMatchingTag = filters.emotionalTags.some(tag => 
            anime.emotionalTags?.includes(tag)
          );
          if (!hasMatchingTag) return false;
        }

        return true;
      });

      // Apply title sorting if needed (can't be done with indexes efficiently)
      if (sortBy === "title_asc" || sortBy === "title_desc") {
        filteredPage.sort((a, b) => {
          const comparison = a.title.localeCompare(b.title);
          return sortBy === "title_asc" ? comparison : -comparison;
        });
      }
    } else {
      // Apply title sorting even when no filters are applied
      if (sortBy === "title_asc" || sortBy === "title_desc") {
        filteredPage = [...results.page].sort((a, b) => {
          const comparison = a.title.localeCompare(b.title);
          return sortBy === "title_asc" ? comparison : -comparison;
        });
      }
    }

    return {
      ...results,
      page: filteredPage,
    };
  },
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

// Get all anime with pagination (kept for backward compatibility)
export const getAllAnime = query({
  args: { paginationOpts: v.any() },
  handler: async (ctx, args): Promise<PaginationResult<Doc<"anime">>> => {
    return await ctx.db
      .query("anime")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

// NEW: Get unique values for filter options
export const getFilterOptions = query({
  args: {},
  handler: async (ctx) => {
    const allAnime = await ctx.db.query("anime").collect();
    
    const genres = new Set<string>();
    const studios = new Set<string>();
    const themes = new Set<string>();
    const emotionalTags = new Set<string>();
    let minYear = Infinity;
    let maxYear = -Infinity;
    let minRating = Infinity;
    let maxRating = -Infinity;
    let minUserRating = Infinity;
    let maxUserRating = -Infinity;

    allAnime.forEach(anime => {
      // Collect genres
      anime.genres?.forEach(genre => genres.add(genre));
      
      // Collect studios
      anime.studios?.forEach(studio => studios.add(studio));
      
      // Collect themes
      anime.themes?.forEach(theme => themes.add(theme));
      
      // Collect emotional tags
      anime.emotionalTags?.forEach(tag => emotionalTags.add(tag));
      
      // Track year range
      if (anime.year) {
        minYear = Math.min(minYear, anime.year);
        maxYear = Math.max(maxYear, anime.year);
      }
      
      // Track rating range
      if (anime.rating) {
        minRating = Math.min(minRating, anime.rating);
        maxRating = Math.max(maxRating, anime.rating);
      }
      
      // Track user rating range
      if (anime.averageUserRating) {
        minUserRating = Math.min(minUserRating, anime.averageUserRating);
        maxUserRating = Math.max(maxUserRating, anime.averageUserRating);
      }
    });

    return {
      genres: Array.from(genres).sort(),
      studios: Array.from(studios).sort(),
      themes: Array.from(themes).sort(),
      emotionalTags: Array.from(emotionalTags).sort(),
      yearRange: minYear === Infinity ? null : { min: minYear, max: maxYear },
      ratingRange: minRating === Infinity ? null : { min: minRating, max: maxRating },
      userRatingRange: minUserRating === Infinity ? null : { min: minUserRating, max: maxUserRating },
    };
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