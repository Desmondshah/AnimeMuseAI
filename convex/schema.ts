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
    isAdmin: v.optional(v.boolean()), // For Admin Features
    emailVerified: v.optional(v.boolean()), // For Email Verification flow
  }).index("by_userId", ["userId"]),

  anime: defineTable({
    title: v.string(),
    description: v.string(),
    posterUrl: v.string(),
    genres: v.array(v.string()),
    year: v.optional(v.number()),
    rating: v.optional(v.number()), // External rating
    emotionalTags: v.optional(v.array(v.string())),
    trailerUrl: v.optional(v.string()),
    studios: v.optional(v.array(v.string())),
    themes: v.optional(v.array(v.string())),
    averageUserRating: v.optional(v.number()),
    reviewCount: v.optional(v.number()),
  })
  .index("by_title", ["title"])
  .index("by_year", ["year"])
  .index("by_rating", ["rating"])
  .index("by_averageUserRating", ["averageUserRating"])
  .index("by_year_rating", ["year", "rating"])
  .index("by_year_averageUserRating", ["year", "averageUserRating"])
  .index("by_reviewCount", ["reviewCount"])
  .searchIndex("search_title", { searchField: "title" })
  .searchIndex("search_description", { searchField: "description" })
  .searchIndex("search_genres", { searchField: "genres" })
  .searchIndex("search_studios", { searchField: "studios" })
  .searchIndex("search_themes", { searchField: "themes" })
  .searchIndex("search_emotionalTags", { searchField: "emotionalTags" }),

  watchlist: defineTable({
    userId: v.id("users"),
    animeId: v.id("anime"),
    status: v.string(),
    progress: v.optional(v.number()),
    userRating: v.optional(v.number()),
  })
  .index("by_user_anime", ["userId", "animeId"])
  .index("by_userId", ["userId"]),

  reviews: defineTable({
    userId: v.id("users"),
    animeId: v.id("anime"),
    rating: v.number(),
    reviewText: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
  .index("by_animeId_userId", ["animeId", "userId"])
  .index("by_animeId_createdAt", ["animeId", "createdAt"]),

  notifications: defineTable({
    userId: v.id("users"),
    message: v.string(),
    link: v.optional(v.string()),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
  .index("by_userId_createdAt", ["userId", "createdAt"])
  .index("by_userId_isRead", ["userId", "isRead"]),

  filterMetadata: defineTable({ // For "caching" filter options
    identifier: v.string(), // For singleton identification, e.g., "singleton_options"
    genres: v.array(v.string()),
    studios: v.array(v.string()),
    themes: v.array(v.string()),
    emotionalTags: v.array(v.string()),
    yearRange: v.union(v.null(), v.object({ min: v.number(), max: v.number() })),
    ratingRange: v.union(v.null(), v.object({ min: v.number(), max: v.number() })),
    userRatingRange: v.union(v.null(), v.object({ min: v.number(), max: v.number() })),
    lastUpdatedAt: v.number(),
  }).index("by_identifier", ["identifier"]),

  emailVerifications: defineTable({ // For Email Verification flow
    email: v.string(), // The email being verified
    userId: v.id("users"), // The user this verification is for
    hashedCode: v.string(), // Store hashed codes, not plain text
    expiresAt: v.number(), // Timestamp for code expiration
    attempts: v.optional(v.number()), // To track verification attempts
    // isUsed: v.boolean(), // No longer needed if we delete upon successful verification or rely on emailVerified flag on userProfile
  })
  .index("by_userId", ["userId"]) // To find a user's pending verification
  .index("by_email_expiresAt", ["email", "expiresAt"]), // For cleanup or lookup
};

export default defineSchema({
  ...authTables, // Includes the 'users' table managed by @convex-dev/auth
  ...applicationTables,
});