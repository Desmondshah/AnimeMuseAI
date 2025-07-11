// convex/schema.ts - Updated with all missing enrichment fields
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
    // Admin edit protection
    lastManualEdit: v.optional(v.object({
        adminUserId: v.id("users"),
        timestamp: v.number(),
        fieldsEdited: v.array(v.string()),
    })),
    // Recommendation tracking fields
    addedFromRecommendation: v.optional(v.boolean()),
    recommendationReasoning: v.optional(v.string()),
    recommendationScore: v.optional(v.number()),
    addedAt: v.optional(v.number()),
    // Episode and streaming data
    streamingEpisodes: v.optional(v.array(v.object({
      title: v.optional(v.string()),
      thumbnail: v.optional(v.string()),
      url: v.optional(v.string()),
      site: v.optional(v.string()),
      previewUrl: v.optional(v.string()),
    }))),
    episodes: v.optional(
      v.array(
        v.object({
          episodeNumber: v.number(),
          title: v.string(),
          airDate: v.optional(v.string()),
          duration: v.optional(v.number()),
          thumbnailUrl: v.optional(v.string()),
          previewUrl: v.optional(v.string()),
        })
      )
    ),
    myAnimeListId: v.optional(v.number()),
    totalEpisodes: v.optional(v.number()),
    episodeDuration: v.optional(v.number()), // in minutes
    airingStatus: v.optional(v.string()), // "RELEASING", "FINISHED", "NOT_YET_RELEASED", "CANCELLED"
    nextAiringEpisode: v.optional(v.object({
      airingAt: v.optional(v.number()), // timestamp
      episode: v.optional(v.number()),
      timeUntilAiring: v.optional(v.number()), // seconds
    })),
    // COMPLETE Character data with ALL enrichment fields
    characters: v.optional(v.array(v.object({
      // Basic info (existing)
      id: v.optional(v.number()), // AniList character ID
      name: v.string(),
      imageUrl: v.optional(v.string()),
      role: v.string(), // "MAIN", "SUPPORTING", "BACKGROUND"
      
      // Character details
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
      height: v.optional(v.string()),
      weight: v.optional(v.string()),
      species: v.optional(v.string()),
      
      // Abilities and equipment
      powersAbilities: v.optional(v.array(v.string())),
      weapons: v.optional(v.array(v.string())),
      
      // Additional info
      nativeName: v.optional(v.string()),
      siteUrl: v.optional(v.string()),
      
      // Voice actors
      voiceActors: v.optional(v.array(v.object({ 
        id: v.optional(v.number()),
        name: v.string(), 
        language: v.string(),
        imageUrl: v.optional(v.string()) 
      }))),
      
      // Character relationships
      relationships: v.optional(v.array(v.object({
        relatedCharacterId: v.optional(v.number()),
        relationType: v.string()
      }))),

      // ===== AI ENRICHMENT FIELDS =====
      // Legacy field (for backward compatibility)
      
      // Enrichment tracking
      enrichmentStatus: v.optional(v.union(
        v.literal("pending"),
        v.literal("success"),
        v.literal("failed"),
        v.literal("skipped") // ADD THIS - it was missing from your schema
      )),
      enrichmentAttempts: v.optional(v.number()), // ADD THIS - missing field
      lastAttemptTimestamp: v.optional(v.number()), // ADD THIS - missing field
      lastErrorMessage: v.optional(v.string()), // ADD THIS - missing field
      enrichmentTimestamp: v.optional(v.number()),
      
      // Enriched content
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
    }))),
    ost: v.optional(v.array(v.object({
      title: v.string(),
      type: v.union(
        v.literal("OP"),
        v.literal("ED"),
        v.literal("insert"),
        v.literal("bgm")
      ),
      artist: v.optional(v.string()),
      composer: v.optional(v.string()),
      links: v.optional(v.array(v.object({
        type: v.string(), // e.g., 'spotify', 'youtube', 'apple'
        url: v.string(),
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
  .index("by_airingStatus", ["airingStatus"])
  .index("by_anilistId", ["anilistId"])
  .index("by_addedFromRecommendation", ["addedFromRecommendation"])
  .searchIndex("search_title", { searchField: "title", filterFields: ["genres", "year", "rating", "studios"] })
  .searchIndex("search_description", { searchField: "description", filterFields: ["genres", "year", "rating", "studios"] })
  .searchIndex("search_genres", { searchField: "genres" })
  .searchIndex("search_studios", { searchField: "studios" })
  .searchIndex("search_themes", { searchField: "themes" })
  .searchIndex("search_emotionalTags", { searchField: "emotionalTags" }),

  // Rest of your tables remain the same...
  watchlist: defineTable({
    userId: v.id("users"),
    animeId: v.id("anime"),
    status: v.string(),
    progress: v.optional(v.number()),
    userRating: v.optional(v.number()),
    notes: v.optional(v.string()),
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
    upvotes: v.optional(v.number()),
    downvotes: v.optional(v.number()),
    helpfulScore: v.optional(v.number()),
  })
  .index("by_animeId_userId", ["animeId", "userId"])
  .index("by_animeId_createdAt", ["animeId", "createdAt"])
  .index("by_animeId_rating", ["animeId", "rating"])
  .index("by_animeId_upvotes", ["animeId", "upvotes"]),

  reviewVotes: defineTable({
    reviewId: v.id("reviews"),
    userId: v.id("users"),
    voteType: v.union(v.literal("up"), v.literal("down")),
  }).index("by_review_user", ["reviewId", "userId"]),

  reviewComments: defineTable({
    reviewId: v.id("reviews"),
    userId: v.id("users"),
    commentText: v.string(),
    parentId: v.optional(v.id("reviewComments")),
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

  customLists: defineTable({
    userId: v.id("users"),
    listName: v.string(),
    normalizedListName: v.string(),
    description: v.optional(v.string()),
    isPublic: v.boolean(),
    animeIds: v.array(v.id("anime")),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
  .index("by_userId_createdAt", ["userId", "createdAt"])
  .index("by_userId_listName", ["userId", "listName"])
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

  aiCache: defineTable({
    cacheKey: v.string(),
    value: v.any(),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
  })
    .index("by_cacheKey", ["cacheKey"]),

  // Change tracking for admin operations
  changeTracking: defineTable({
    // Who made the change
    adminUserId: v.id("users"),
    adminUserName: v.string(),
    
    // What was changed
    entityType: v.union(v.literal("anime"), v.literal("character"), v.literal("user")),
    entityId: v.id("anime"), // For anime changes, this is the anime ID
    entityTitle: v.string(), // Human-readable title (anime title, character name, etc.)
    
    // Change details
    changeType: v.union(
      v.literal("create"),
      v.literal("update"),
      v.literal("delete"),
      v.literal("enrich"),
      v.literal("bulk_update")
    ),
    
    // Detailed change information
    changes: v.array(v.object({
      field: v.string(), // Field name that was changed
      oldValue: v.optional(v.any()), // Previous value
      newValue: v.optional(v.any()), // New value
      changeDescription: v.string(), // Human-readable description
    })),
    
    // Additional context
    characterIndex: v.optional(v.number()), // For character-specific changes
    characterName: v.optional(v.string()), // For character-specific changes
    batchId: v.optional(v.string()), // For bulk operations
    
    // Metadata
    timestamp: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    
    // Status tracking
    isReverted: v.optional(v.boolean()),
    revertedAt: v.optional(v.number()),
    revertedBy: v.optional(v.id("users")),
    revertedByUserName: v.optional(v.string()),
  })
    .index("by_entityType_entityId", ["entityType", "entityId"])
    .index("by_adminUserId_timestamp", ["adminUserId", "timestamp"])
    .index("by_timestamp", ["timestamp"])
    .index("by_changeType", ["changeType"])
    .index("by_batchId", ["batchId"])
    .index("by_entityType_timestamp", ["entityType", "timestamp"]),

  // Security tables for enhanced authentication
  authAttempts: defineTable({
    identifier: v.string(), // email or IP address
    attemptType: v.union(v.literal("login"), v.literal("signup")),
    timestamp: v.number(),
  })
    .index("by_identifier_timestamp", ["identifier", "timestamp"]),

  securityLogs: defineTable({
    userId: v.optional(v.id("users")),
    event: v.string(),
    details: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_userId_timestamp", ["userId", "timestamp"])
    .index("by_timestamp", ["timestamp"]),

  accountLocks: defineTable({
    userId: v.id("users"),
    reason: v.string(),
    lockedUntil: v.number(),
    lockedBy: v.optional(v.id("users")), // admin who locked the account
  })
    .index("by_userId", ["userId"]),

  twoFactorAuth: defineTable({
    userId: v.id("users"),
    secret: v.string(),
    backupCodes: v.array(v.string()),
    isEnabled: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"]),

  userSessions: defineTable({
    userId: v.id("users"),
    sessionToken: v.string(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    lastActivity: v.number(),
    expiresAt: v.number(),
    isActive: v.boolean(),
  })
    .index("by_userId", ["userId"])
    .index("by_sessionToken", ["sessionToken"]),

  passwordResets: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
    isUsed: v.boolean(),
    requestedAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_userId", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});