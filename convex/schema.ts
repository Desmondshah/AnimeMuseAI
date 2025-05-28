// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  userProfiles: defineTable({
    userId: v.id("users"),
    name: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    phoneNumberVerified: v.optional(v.boolean()),
    verifiedAt: v.optional(v.number()),
    moods: v.optional(v.array(v.string())),
    genres: v.optional(v.array(v.string())),
    favoriteAnimes: v.optional(v.array(v.string())),
    experienceLevel: v.optional(v.string()),
    onboardingCompleted: v.boolean(),
    avatarUrl: v.optional(v.string()),
    dislikedGenres: v.optional(v.array(v.string())),
    dislikedTags: v.optional(v.array(v.string())), // Keep this if you plan to use it
    isAdmin: v.optional(v.boolean()),
  })
  .index("by_userId", ["userId"])
  .index("by_phoneNumber", ["phoneNumber"]),

  anime: defineTable({
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
    averageUserRating: v.optional(v.number()),
    reviewCount: v.optional(v.number()),
    // Potentially add a field to track last admin edit if complex data update strategy is needed later
    // lastAdminEditTimestamp: v.optional(v.number()),
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
    notes: v.optional(v.string()), // <-- PHASE 1: Added watchlist notes
  })
  .index("by_user_anime", ["userId", "animeId"])
  .index("by_userId", ["userId"]),

  reviews: defineTable({
    userId: v.id("users"),
    animeId: v.id("anime"),
    rating: v.number(),
    reviewText: v.optional(v.string()),
    isSpoiler: v.optional(v.boolean()), // <-- PHASE 1: Added spoiler tag
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
  .index("by_animeId_userId", ["animeId", "userId"])
  .index("by_animeId_createdAt", ["animeId", "createdAt"]) // Existing index, good for default sort
  .index("by_animeId_rating", ["animeId", "rating"]), // <-- PHASE 1: Added for sorting by rating

  notifications: defineTable({
    userId: v.id("users"),
    message: v.string(),
    link: v.optional(v.string()),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
  .index("by_userId_createdAt", ["userId", "createdAt"])
  .index("by_userId_isRead", ["userId", "isRead"]),

  filterMetadata: defineTable({
    identifier: v.string(),
    genres: v.array(v.string()),
    studios: v.array(v.string()),
    themes: v.array(v.string()),
    emotionalTags: v.array(v.string()),
    yearRange: v.union(v.null(), v.object({ min: v.number(), max: v.number() })),
    ratingRange: v.union(v.null(), v.object({ min: v.number(), max: v.number() })),
    userRatingRange: v.union(v.null(), v.object({ min: v.number(), max: v.number() })),
    lastUpdatedAt: v.number(),
  }).index("by_identifier", ["identifier"]),

  phoneVerifications: defineTable({
    phoneNumber: v.string(),
    userId: v.id("users"),
    hashedCode: v.string(),
    expiresAt: v.number(),
    attempts: v.optional(v.number()),
    requestedAt: v.optional(v.number()),
  })
  .index("by_userId", ["userId"])
  .index("by_phoneNumber_expiresAt", ["phoneNumber", "expiresAt"])
  .index("by_expiresAt", ["expiresAt"]),

  // <-- PHASE 1: New table for AI Interaction Feedback -->
  aiInteractionFeedback: defineTable({
    userId: v.id("users"),
    prompt: v.optional(v.string()), // The user's prompt to the AI
    aiAction: v.string(), // e.g., "getAnimeRecommendation", "getSimilarAnime", "getPersonalized"
    aiResponseRecommendations: v.optional(v.array(v.any())), // Store the recommendations JSON if applicable
    aiResponseText: v.optional(v.string()), // Store general AI text response if no structured recommendations
    feedbackType: v.union(v.literal("up"), v.literal("down"), v.literal("none")), // User feedback
    messageId: v.string(), // Link to the message ID from the frontend chat if applicable
    timestamp: v.number(),
  }).index("by_userId", ["userId"])
    .index("by_aiAction", ["aiAction"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});