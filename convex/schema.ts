// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  userProfiles: defineTable({
    userId: v.id("users"),
    name: v.optional(v.string()),
    moods: v.optional(v.array(v.string())),
    genres: v.optional(v.array(v.string())),
    favoriteAnimes: v.optional(v.array(v.string())),
    experienceLevel: v.optional(v.string()),
    onboardingCompleted: v.boolean(),
    avatarUrl: v.optional(v.string()),
    dislikedGenres: v.optional(v.array(v.string())),
    dislikedTags: v.optional(v.array(v.string())),
  }).index("by_userId", ["userId"]),

  anime: defineTable({
    title: v.string(),
    description: v.string(),
    posterUrl: v.string(),
    genres: v.array(v.string()),
    year: v.optional(v.number()),
    rating: v.optional(v.number()), // This might be an external rating (e.g., from Jikan)
    emotionalTags: v.optional(v.array(v.string())),
    trailerUrl: v.optional(v.string()),
    studios: v.optional(v.array(v.string())),
    themes: v.optional(v.array(v.string())),
    // Added for Phase 3 - User Reviews and Ratings
    averageUserRating: v.optional(v.number()), // Calculated average of user ratings
    reviewCount: v.optional(v.number()),     // Total number of user reviews
  })
  .index("by_title", ["title"])
  .index("by_year", ["year"]) // New: For year filtering
  .index("by_rating", ["rating"]) // New: For external rating sorting
  .index("by_averageUserRating", ["averageUserRating"]) // New: For user rating sorting
  .index("by_year_rating", ["year", "rating"]) // New: Compound index for year + rating sorting
  .index("by_year_averageUserRating", ["year", "averageUserRating"]) // New: Compound index
  .index("by_reviewCount", ["reviewCount"]) // New: For popularity sorting
  .searchIndex("search_title", { searchField: "title" })
  .searchIndex("search_description", { searchField: "description" })
  .searchIndex("search_genres", { searchField: "genres", filterFields: ["title"] }),

  watchlist: defineTable({
    userId: v.id("users"),
    animeId: v.id("anime"),
    status: v.string(),
    progress: v.optional(v.number()),
    userRating: v.optional(v.number()), // User's personal rating on their watchlist item
  })
  .index("by_user_anime", ["userId", "animeId"])
  .index("by_userId", ["userId"]),

  // Added for Phase 3 - Reviews Table
  reviews: defineTable({
    userId: v.id("users"),
    animeId: v.id("anime"),
    rating: v.number(), // User's rating for this review (e.g., 1-10 or 1-5)
    reviewText: v.optional(v.string()),
    createdAt: v.number(), // Store as timestamp for sorting
    updatedAt: v.optional(v.number()),
  })
  .index("by_animeId_userId", ["animeId", "userId"]) // Unique reviews per user per anime
  .index("by_animeId_createdAt", ["animeId", "createdAt"]), // For fetching reviews for an anime, sorted by date
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});