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
    dislikedTags: v.optional(v.array(v.string())),
    isAdmin: v.optional(v.boolean()),
    // Phase 2: Granular Preferences & Watchlist Privacy
    characterArchetypes: v.optional(v.array(v.string())), // e.g., "Tsundere", "Stoic Hero"
    tropes: v.optional(v.array(v.string())), // e.g., "Found Family", "Time Loop"
    artStyles: v.optional(v.array(v.string())), // e.g., "Retro", "Photorealistic", "Minimalist"
    narrativePacing: v.optional(v.string()), // e.g., "Slow Burn", "Fast-Paced"
    watchlistIsPublic: v.optional(v.boolean()), // User's general preference for watchlist privacy
    animationsEnabled: v.optional(v.boolean()), // User toggle for animated UI
  })
  .index("by_userId", ["userId"])
  .index("by_phoneNumber", ["phoneNumber"]),

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
    // Phase 2: For alternative data sources - an example, might need more generic structure
    anilistId: v.optional(v.number()), 
    lastFetchedFromExternal: v.optional(v.object({
        source: v.string(), // e.g., "jikan", "anilist"
        timestamp: v.number(),
    })),
    // Episode and streaming data
    streamingEpisodes: v.optional(v.array(v.object({
      title: v.optional(v.string()),
      thumbnail: v.optional(v.string()),
      url: v.optional(v.string()),
      site: v.optional(v.string()),
    }))),
    totalEpisodes: v.optional(v.number()),
    episodeDuration: v.optional(v.number()), // in minutes
    airingStatus: v.optional(v.string()), // "RELEASING", "FINISHED", "NOT_YET_RELEASED", "CANCELLED"
    nextAiringEpisode: v.optional(v.object({
      airingAt: v.optional(v.number()), // timestamp
      episode: v.optional(v.number()),
      timeUntilAiring: v.optional(v.number()), // seconds
    })),
    // NEW: Character data
    characters: v.optional(v.array(v.object({
  // Basic info (existing)
  id: v.optional(v.number()), // AniList character ID
  name: v.string(),
  imageUrl: v.optional(v.string()),
  role: v.string(), // "MAIN", "SUPPORTING", "BACKGROUND"
  
  // NEW DETAILED FIELDS:
  description: v.optional(v.string()), // Character background, personality, traits
  status: v.optional(v.string()), // "Alive", "Deceased", "Unknown"
  gender: v.optional(v.string()),
  age: v.optional(v.string()), // Often provided as string like "17 years old"
  
  // Birth details
  dateOfBirth: v.optional(v.object({ 
    year: v.optional(v.number()), 
    month: v.optional(v.number()), 
    day: v.optional(v.number()) 
  })),
  
  // Physical characteristics
  bloodType: v.optional(v.string()),
  height: v.optional(v.string()), // e.g., "175 cm" - often not available in AniList
  weight: v.optional(v.string()), // often not available in AniList
  species: v.optional(v.string()), // Human, Demon, Elf, etc. - derived from description/tags
  
  // Abilities and equipment
  powersAbilities: v.optional(v.array(v.string())), // extracted from description
  weapons: v.optional(v.array(v.string())), // extracted from description
  
  // Additional info
  nativeName: v.optional(v.string()),
  siteUrl: v.optional(v.string()), // link to character page on AniList
  
  // Voice actors for this character in this specific anime
  voiceActors: v.optional(v.array(v.object({ 
    id: v.optional(v.number()),
    name: v.string(), 
    language: v.string(), // "Japanese", "English", etc.
    imageUrl: v.optional(v.string()) 
  }))),
  
  // Character relationships (if available)
  relationships: v.optional(v.array(v.object({ 
    relatedCharacterId: v.optional(v.number()), 
    relationType: v.string() // "Father", "Sister", "Friend", "Rival", etc.
  })))
}))),
  })
  .index("by_title", ["title"])
  .index("by_year", ["year"])
  .index("by_rating", ["rating"])
  .index("by_averageUserRating", ["averageUserRating"])
  .index("by_year_rating", ["year", "rating"])
  .index("by_year_averageUserRating", ["year", "averageUserRating"])
  .index("by_reviewCount", ["reviewCount"])
  .index("by_airingStatus", ["airingStatus"]) // For querying currently airing anime
  .searchIndex("search_title", { searchField: "title", filterFields: ["genres", "year", "rating", "studios"] })
  .searchIndex("search_description", { searchField: "description", filterFields: ["genres", "year", "rating", "studios"] })
  .searchIndex("search_genres", { searchField: "genres" })
  .searchIndex("search_studios", { searchField: "studios" })
  .searchIndex("search_themes", { searchField: "themes" })
  .searchIndex("search_emotionalTags", { searchField: "emotionalTags" }),

  watchlist: defineTable({
    userId: v.id("users"),
    animeId: v.id("anime"),
    status: v.string(), // "Watching", "Completed", "Plan to Watch", "Dropped"
    progress: v.optional(v.number()),
    userRating: v.optional(v.number()),
    notes: v.optional(v.string()),
    // Phase 2: isPublic on individual watchlist entries might be redundant if global userProfile.watchlistIsPublic is used.
    // However, it could allow specific entries to override the global setting if needed in the future.
    // For Phase 2, we'll rely on the global setting primarily.
    isPublic: v.optional(v.boolean()), 
  })
  .index("by_user_anime", ["userId", "animeId"])
  .index("by_userId", ["userId"]),

  reviews: defineTable({
    userId: v.id("users"),
    animeId: v.id("anime"),
    rating: v.number(),
    reviewText: v.optional(v.string()),
    isSpoiler: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    // Phase 2: For review voting
    upvotes: v.optional(v.number()),
    downvotes: v.optional(v.number()),
     helpfulScore: v.optional(v.number()), // Could be calculated: upvotes - downvotes
  })
  .index("by_animeId_userId", ["animeId", "userId"])
  .index("by_animeId_createdAt", ["animeId", "createdAt"])
  .index("by_animeId_rating", ["animeId", "rating"])
  .index("by_animeId_upvotes", ["animeId", "upvotes"]), // For sorting by most helpful

  // Phase 2: New table for Review Votes
  reviewVotes: defineTable({
    reviewId: v.id("reviews"),
    userId: v.id("users"),
    voteType: v.union(v.literal("up"), v.literal("down")),
  }).index("by_review_user", ["reviewId", "userId"]),

  // Phase 2: New table for Review Comments
  reviewComments: defineTable({
    reviewId: v.id("reviews"),
    userId: v.id("users"),
    commentText: v.string(),
    parentId: v.optional(v.id("reviewComments")), // For replies
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
  .index("by_review_createdAt", ["reviewId", "createdAt"])
  .index("by_parent_createdAt", ["parentId", "createdAt"]),

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

  aiInteractionFeedback: defineTable({
    userId: v.union(v.id("users"), v.literal("system")),
    prompt: v.optional(v.string()),
    aiAction: v.string(),
    aiResponseRecommendations: v.optional(v.array(v.any())),
    aiResponseText: v.optional(v.string()),
    feedbackType: v.union(v.literal("up"), v.literal("down"), v.literal("none")),
    messageId: v.string(),
    timestamp: v.number(),
  }).index("by_userId", ["userId"])
    .index("by_aiAction", ["aiAction"]),

  // Phase 2: New table for Custom User Lists
  customLists: defineTable({
    userId: v.id("users"),
    listName: v.string(),
    normalizedListName: v.string(),
    description: v.optional(v.string()),
    isPublic: v.boolean(),
    animeIds: v.array(v.id("anime")), // Array of anime IDs in this list
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
  .index("by_userId_createdAt", ["userId", "createdAt"])
  .index("by_userId_listName", ["userId", "listName"]) // For uniqueness if desired
  .index("by_userId_normalizedListName", ["userId", "normalizedListName"]),

aiFeedback: defineTable({
    prompt: v.string(),
    aiAction: v.string(),
    aiResponseRecommendations: v.optional(v.array(v.any())),
    aiResponseText: v.optional(v.string()),
    feedbackType: v.union(v.literal("up"), v.literal("down"), v.literal("none")),
    messageId: v.string(),
    userFeedback: v.optional(v.string()),
    additionalContext: v.optional(v.any()),
    timestamp: v.number()
  })
    .index("by_messageId", ["messageId"])
    .index("by_aiAction", ["aiAction"])
    .index("by_feedbackType", ["feedbackType"])
    .index("by_timestamp", ["timestamp"]),
    
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});