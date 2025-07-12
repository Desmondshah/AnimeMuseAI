// convex/admin.ts
import { query, mutation, internalQuery, internalMutation, action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";
import { internal, api } from "./_generated/api";

// Helper function to assert admin privileges
const assertAdmin = async (ctx: { db: any, auth: any }): Promise<Id<"users">> => {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("User not authenticated.");
  }
  const userProfile = await ctx.db
    .query("userProfiles")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId as Id<"users">))
    .unique();

  if (!userProfile?.isAdmin) {
    throw new Error("User is not an admin.");
  }
  return userId as Id<"users">; // Return userId if admin for convenience
};

// Query to check if the current user is an admin (for UI rendering)
export const isCurrentUserAdmin = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx): Promise<boolean> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return false;
    }
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId as Id<"users">))
      .unique();
    return userProfile?.isAdmin === true;
  },
});

// --- Admin Queries ---

// Get all user profiles (admin only)
export const getAllUserProfilesForAdmin = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("userProfiles"),
    _creationTime: v.number(),
    userId: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    isAdmin: v.optional(v.boolean()),
    avatarUrl: v.optional(v.string()),
    preferences: v.optional(v.any()),
  })),
  handler: async (ctx): Promise<Doc<"userProfiles">[]> => {
    await assertAdmin(ctx); // Ensure caller is admin
    return await ctx.db.query("userProfiles").collect();
  },
});

// Get all anime entries (admin only) - MODIFIED for usePaginatedQuery
export const getAllAnimeForAdmin = query({
  args: { paginationOpts: v.any() }, // paginationOpts is required by usePaginatedQuery
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    return await ctx.db.query("anime").order("desc").paginate(args.paginationOpts);
  },
});

// Get a single anime with full details (admin only)
export const getAnimeForAdmin = query({
  args: { animeId: v.id("anime") },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    return await ctx.db.get(args.animeId);
  },
});

// Get all reviews (admin only, paginated)
export const getAllReviewsForAdmin = query({
  args: { paginationOpts: v.any() }, 
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    // Consider enriching with user/anime titles here or in a separate admin-specific action if needed for display
    return await ctx.db.query("reviews").order("desc").paginate(args.paginationOpts);
  },
});

// Query to get change history for an anime
export const getAnimeChangeHistory = query({
  args: { 
    animeId: v.id("anime"),
    paginationOpts: v.any() // Add paginationOpts to work with usePaginatedQuery
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    
    const changes = await ctx.db
      .query("changeTracking")
      .withIndex("by_entityType_entityId", (q) => 
        q.eq("entityType", "anime").eq("entityId", args.animeId)
      )
      .order("desc")
      .paginate(args.paginationOpts);
    
    return changes;
  },
});

// Query to get all change history (paginated)
export const getAllChangeHistory = query({
  args: { paginationOpts: v.any() },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    
    return await ctx.db
      .query("changeTracking")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

// Query to get change history by admin user
export const getChangeHistoryByAdmin = query({
  args: { adminUserId: v.id("users"), paginationOpts: v.any() },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    
    return await ctx.db
      .query("changeTracking")
      .withIndex("by_adminUserId_timestamp", (q) => 
        q.eq("adminUserId", args.adminUserId)
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

// --- Admin Mutations ---

// Get user profile by ID (helper function)
export const getUserProfileById = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

// Track changes (internal mutation)
export const trackChangeMutation = internalMutation({
  args: {
    adminUserId: v.id("users"),
    adminUserName: v.string(),
    entityType: v.union(v.literal("anime"), v.literal("character"), v.literal("user")),
    entityId: v.id("anime"),
    entityTitle: v.string(),
    changeType: v.union(v.literal("create"), v.literal("update"), v.literal("delete"), v.literal("enrich"), v.literal("bulk_update")),
    changes: v.array(v.object({
      field: v.string(),
      oldValue: v.optional(v.any()),
      newValue: v.optional(v.any()),
      changeDescription: v.string(),
    })),
    additionalData: v.optional(v.object({
      characterIndex: v.optional(v.number()),
      characterName: v.optional(v.string()),
      batchId: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("changeTracking", {
      adminUserId: args.adminUserId,
      adminUserName: args.adminUserName,
      entityType: args.entityType,
      entityId: args.entityId,
      entityTitle: args.entityTitle,
      changeType: args.changeType,
      changes: args.changes,
      characterIndex: args.additionalData?.characterIndex,
      characterName: args.additionalData?.characterName,
      batchId: args.additionalData?.batchId,
      timestamp: Date.now(),
    });
  },
});

// Utility function to track changes (legacy - for backward compatibility)
const trackChange = async (
  ctx: any,
  adminUserId: Id<"users">,
  adminUserName: string,
  entityType: "anime" | "character" | "user",
  entityId: Id<"anime">,
  entityTitle: string,
  changeType: "create" | "update" | "delete" | "enrich" | "bulk_update",
  changes: Array<{
    field: string;
    oldValue?: any;
    newValue?: any;
    changeDescription: string;
  }>,
  additionalData?: {
    characterIndex?: number;
    characterName?: string;
    batchId?: string;
  }
) => {
  await ctx.db.insert("changeTracking", {
    adminUserId,
    adminUserName,
    entityType,
    entityId,
    entityTitle,
    changeType,
    changes,
    characterIndex: additionalData?.characterIndex,
    characterName: additionalData?.characterName,
    batchId: additionalData?.batchId,
    timestamp: Date.now(),
  });
};

// Enhanced anime editing with change tracking
export const adminEditAnime = mutation({
  args: {
    animeId: v.id("anime"),
    updates: v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      posterUrl: v.optional(v.string()),
      genres: v.optional(v.array(v.string())),
      year: v.optional(v.number()),
      rating: v.optional(v.number()),
      emotionalTags: v.optional(v.array(v.string())),
      trailerUrl: v.optional(v.string()),
      studios: v.optional(v.array(v.string())),
      themes: v.optional(v.array(v.string())),
      averageUserRating: v.optional(v.number()),
      reviewCount: v.optional(v.number()),
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
      episodes: v.optional(v.array(v.object({
        episodeNumber: v.number(),
        title: v.string(),
        airDate: v.optional(v.string()),
        duration: v.optional(v.number()),
        thumbnailUrl: v.optional(v.string()),
        previewUrl: v.optional(v.string()),
      }))),
      ost: v.optional(v.array(v.object({
        title: v.string(),
        type: v.union(v.literal("OP"), v.literal("ED"), v.literal("insert"), v.literal("bgm")),
        artist: v.optional(v.string()),
        composer: v.optional(v.string()),
        links: v.optional(v.array(v.object({
          type: v.string(),
          url: v.string(),
        })))
      }))),
    }),
  },
  handler: async (ctx, args) => {
    const adminUserId = await assertAdmin(ctx);
    const { animeId, updates } = args;
    
    // Get the current anime data for comparison
    const currentAnime = await ctx.db.get(animeId);
    if (!currentAnime) {
      throw new Error("Anime not found.");
    }
    
    // Get admin user info
    const adminUser = await ctx.db.get(adminUserId);
    const adminUserName = adminUser?.name || "Unknown Admin";
    
    // Track changes
    const changes: Array<{
      field: string;
      oldValue?: any;
      newValue?: any;
      changeDescription: string;
    }> = [];
    
    const definedUpdates: Partial<Doc<"anime">> = {};
    for (const key in updates) {
        const typedKey = key as keyof typeof updates;
        if (updates[typedKey] !== undefined) {
            const oldValue = (currentAnime as any)[typedKey];
            const newValue = updates[typedKey];
            
            // Only track if there's an actual change
            if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
              changes.push({
                field: typedKey,
                oldValue,
                newValue,
                changeDescription: `Updated ${typedKey} from "${oldValue}" to "${newValue}"`
              });
            }
            
            (definedUpdates as any)[typedKey] = newValue;
        }
    }
    
    if (Object.keys(definedUpdates).length === 0) {
        throw new Error("No updates provided.");
    }
    
    // Add protection against auto-refresh overwriting manual edits
    const fieldsEdited = changes.map(change => change.field);
    if (fieldsEdited.length > 0) {
      (definedUpdates as any).lastManualEdit = {
        adminUserId,
        timestamp: Date.now(),
        fieldsEdited,
      };
    }
    
    // Apply the updates
    await ctx.db.patch(animeId, definedUpdates);
    
    // Log the changes if any were made
    if (changes.length > 0) {
      await trackChange(
        ctx,
        adminUserId,
        adminUserName,
        "anime",
        animeId,
        currentAnime.title || "Unknown Anime",
        "update",
        changes
      );
    }
    
    return animeId;
  },
});

// Update characters for an anime
export const adminUpdateAnimeCharacters = mutation({
  args: {
    animeId: v.id("anime"),
    characters: v.array(v.object({
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
    })),
  },
  handler: async (ctx, args) => {
    const adminUserId = await assertAdmin(ctx);
    const { animeId, characters } = args;
    
    // Get the current anime data for comparison
    const currentAnime = await ctx.db.get(animeId);
    if (!currentAnime) {
      throw new Error("Anime not found.");
    }
    
    // Get admin user info
    const adminUser = await ctx.db.get(adminUserId);
    const adminUserName = adminUser?.name || "Unknown Admin";
    
    // Track character changes
    const changes: Array<{
      field: string;
      oldValue?: any;
      newValue?: any;
      changeDescription: string;
    }> = [];
    
    const oldCharacters = currentAnime.characters || [];
    const newCharacters = characters;
    
    // Compare character arrays
    if (JSON.stringify(oldCharacters) !== JSON.stringify(newCharacters)) {
      changes.push({
        field: "characters",
        oldValue: oldCharacters.length,
        newValue: newCharacters.length,
        changeDescription: `Updated character list from ${oldCharacters.length} to ${newCharacters.length} characters`
      });
    }
    
    // Apply the updates
    await ctx.db.patch(animeId, { characters });
    
    // Log the changes
    if (changes.length > 0) {
      await trackChange(
        ctx,
        adminUserId,
        adminUserName,
        "anime",
        animeId,
        currentAnime.title || "Unknown Anime",
        "update",
        changes,
        { batchId: `characters_${Date.now()}` }
      );
    }
    
    return animeId;
  },
});

// Manually trigger character enrichment for a specific character
export const adminEnrichCharacter = mutation({
  args: {
    animeId: v.id("anime"),
    characterIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const adminUserId = await assertAdmin(ctx);
    const { animeId, characterIndex } = args;
    
    const anime = await ctx.db.get(animeId);
    if (!anime || !anime.characters || characterIndex >= anime.characters.length) {
      throw new Error("Anime or character not found.");
    }
    
    const character = anime.characters[characterIndex];
    if (!character) {
      throw new Error("Character not found at specified index.");
    }
    
    // Get admin user info
    const adminUser = await ctx.db.get(adminUserId);
    const adminUserName = adminUser?.name || "Unknown Admin";
    
    // Update character enrichment status to pending
    const updatedCharacters = [...anime.characters];
    updatedCharacters[characterIndex] = {
      ...character,
      enrichmentStatus: "pending",
      enrichmentAttempts: (character.enrichmentAttempts || 0) + 1,
      lastAttemptTimestamp: Date.now(),
    };
    
    await ctx.db.patch(animeId, { characters: updatedCharacters });
    
    // Track the enrichment attempt
    await trackChange(
      ctx,
      adminUserId,
      adminUserName,
      "character",
      animeId,
      anime.title || "Unknown Anime",
      "enrich",
      [{
        field: "enrichmentStatus",
        oldValue: character.enrichmentStatus || "none",
        newValue: "pending",
        changeDescription: `Triggered AI enrichment for character "${character.name}"`
      }],
      {
        characterIndex,
        characterName: character.name
      }
    );
    
    // Trigger the enrichment process
    await ctx.scheduler.runAfter(0, internal.characterEnrichment.enrichCharacter, {
      animeId,
      characterIndex,
    });
    
    return { success: true, message: "Character enrichment triggered." };
  },
});

// Create a new anime entry
export const adminCreateAnime = mutation({
  args: {
    animeData: v.object({
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
      myAnimeListId: v.optional(v.number()),
      totalEpisodes: v.optional(v.number()),
      episodeDuration: v.optional(v.number()),
      airingStatus: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const { animeData } = args;
    
    const animeId = await ctx.db.insert("anime", animeData);
    return animeId;
  },
});

// Delete an anime entry (admin only)
export const adminDeleteAnime = mutation({
  args: { animeId: v.id("anime") },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    
    const animeToDelete = await ctx.db.get(args.animeId);
    if (!animeToDelete) throw new Error("Anime not found");

    // Potential cascading deletes:
    // 1. Reviews associated with this anime
    const relatedReviews = await ctx.db.query("reviews").withIndex("by_animeId_createdAt", q => q.eq("animeId", args.animeId)).collect();
    for (const review of relatedReviews) {
      await ctx.db.delete(review._id);
    }

    // 2. Watchlist entries associated with this anime
    // Watchlist items don't have a direct index on just animeId, so this is less efficient.
    // An index on animeId for the watchlist table would be needed for large scale cleanup.
    // For now, this might be slow if many users have this anime on their watchlist.
    // A better approach for large scale would be a batch delete or a scheduled cleanup.
    const relatedWatchlistItems = await ctx.db.query("watchlist")
        .filter(q => q.eq(q.field("animeId"), args.animeId))
        .collect();
    for (const item of relatedWatchlistItems) {
      await ctx.db.delete(item._id);
    }

    // Finally, delete the anime itself
    await ctx.db.delete(args.animeId);
    console.log(`Admin deleted anime ${args.animeId} and its associated reviews/watchlist items.`);
    return true;
  },
});

// Delete any review (admin only)
export const adminDeleteReview = mutation({
  args: { reviewId: v.id("reviews") },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      throw new Error("Review not found.");
    }
    
    const animeId = review.animeId; // Store animeId before deleting review
    await ctx.db.delete(args.reviewId);

    // After deleting a review, trigger an update for the anime's average rating and review count
    await ctx.scheduler.runAfter(0, internal.reviews.updateAnimeAverageRating, { animeId: animeId });
    
    console.log(`Admin deleted review ${args.reviewId}`);
    return true;
  },
});

// Set/Unset admin status for a user
export const adminSetUserAdminStatus = mutation({
    args: { targetUserId: v.id("users"), isAdmin: v.boolean() },
    handler: async (ctx, args) => {
        const currentAdminUserId = await assertAdmin(ctx); // The user performing the action must be an admin

        const targetUserProfile = await ctx.db.query("userProfiles")
            .withIndex("by_userId", q => q.eq("userId", args.targetUserId))
            .unique();

        if (!targetUserProfile) {
            throw new Error(`User profile for target user ${args.targetUserId} not found.`);
        }

        // Safety check: Prevent admin from removing their own admin status if they are the only admin
        if (currentAdminUserId === args.targetUserId && !args.isAdmin) {
            const adminUsers = await ctx.db.query("userProfiles").filter(q => q.eq(q.field("isAdmin"), true)).collect();
            if (adminUsers.length === 1) { // The current user is the only admin
                throw new Error("Cannot remove admin status from the only admin.");
            }
        }

        await ctx.db.patch(targetUserProfile._id, { isAdmin: args.isAdmin });
        console.log(`Admin status for user ${args.targetUserId} set to ${args.isAdmin} by admin ${currentAdminUserId}.`);
        return { success: true, message: `User admin status updated.` };
    }
});

// Reset auto-refresh protection for specific fields (allow auto-refresh to update them again)
export const adminResetAutoRefreshProtection = mutation({
  args: {
    animeId: v.id("anime"),
    fieldsToReset: v.optional(v.array(v.string())), // If not provided, resets all protection
  },
  handler: async (ctx, args) => {
    const adminUserId = await assertAdmin(ctx);
    const { animeId, fieldsToReset } = args;

    const anime = await ctx.db.get(animeId);
    if (!anime) {
      throw new Error("Anime not found.");
    }

    const currentManualEdit = anime.lastManualEdit;
    if (!currentManualEdit) {
      // No protection to reset - return success
      return {
        success: true,
        message: "No protection to reset - all fields are already open to auto-refresh",
        stillProtectedFields: []
      };
    }

    let updatedFieldsEdited: string[];

    if (fieldsToReset && fieldsToReset.length > 0) {
      // Reset protection for specific fields only
      updatedFieldsEdited = currentManualEdit.fieldsEdited.filter(
        field => !fieldsToReset.includes(field)
      );
    } else {
      // Reset all protection
      updatedFieldsEdited = [];
    }

    if (updatedFieldsEdited.length === 0) {
      // Remove protection entirely
      await ctx.db.patch(animeId, { 
        lastManualEdit: undefined 
      });
      console.log(`[Admin] Removed all auto-refresh protection for ${anime.title}`);
    } else {
      // Update with remaining protected fields
      await ctx.db.patch(animeId, {
        lastManualEdit: {
          ...currentManualEdit,
          fieldsEdited: updatedFieldsEdited,
          timestamp: Date.now(), // Update timestamp
        }
      });
      console.log(`[Admin] Updated auto-refresh protection for ${anime.title}. Still protected: ${updatedFieldsEdited.join(', ')}`);
    }

    // Get admin user info for logging
    const adminUser = await ctx.db.get(adminUserId);
    const adminUserName = adminUser?.name || "Unknown Admin";

    // Log the change
    await trackChange(
      ctx,
      adminUserId,
      adminUserName,
      "anime",
      animeId,
      anime.title || "Unknown Anime",
      "update",
      [{
        field: "lastManualEdit",
        oldValue: currentManualEdit.fieldsEdited,
        newValue: updatedFieldsEdited,
        changeDescription: fieldsToReset && fieldsToReset.length > 0 
          ? `Reset auto-refresh protection for fields: ${fieldsToReset.join(', ')}`
          : "Reset all auto-refresh protection"
      }]
    );

    return {
      success: true,
      message: fieldsToReset && fieldsToReset.length > 0
        ? `Reset protection for ${fieldsToReset.length} fields`
        : "Reset all auto-refresh protection",
      stillProtectedFields: updatedFieldsEdited
    };
  },
});

// Manual admin character enrichment with permanent protection
export const adminManualCharacterEnrichment = action({
  args: {
    characterName: v.string(),
    animeName: v.string(),
    existingData: v.object({
      description: v.optional(v.string()),
      role: v.optional(v.string()),
      gender: v.optional(v.string()),
      age: v.optional(v.string()),
      species: v.optional(v.string()),
      powersAbilities: v.optional(v.array(v.string())),
      voiceActors: v.optional(v.array(v.object({
        id: v.optional(v.number()),
        name: v.string(),
        language: v.string(),
        imageUrl: v.optional(v.string()),
      }))),
    }),
  },
  returns: v.object({
    error: v.union(v.string(), v.null()),
    success: v.boolean(),
    message: v.string(),
    enrichedData: v.optional(v.any()), // Add the enriched data to the response
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        error: "User not authenticated",
        success: false,
        message: "Authentication required",
        enrichedData: undefined
      };
    }
    
    const userProfile = await ctx.runQuery(internal.admin.getUserProfileById, { userId });
    if (!userProfile?.isAdmin) {
      return {
        error: "User is not an admin",
        success: false,
        message: "Admin privileges required",
        enrichedData: undefined
      };
    }
    
    const adminUserId = userId;
    
    try {
      // Find the anime by name to get the anime ID
      const anime = await ctx.runQuery(internal.anime.getAnimeByTitleInternal, { 
        title: args.animeName 
      });
      
      if (!anime) {
        return {
          error: "Anime not found in database",
          success: false,
          message: `Could not find anime "${args.animeName}" in the database`,
          enrichedData: undefined
        };
      }
      
      const animeId = anime._id;
      
      // Call the AI enrichment
      const result = await ctx.runAction(api.ai.fetchComprehensiveCharacterDetails, {
        characterName: args.characterName,
        animeName: args.animeName,
        existingData: args.existingData,
        messageId: `admin_manual_enrich_${args.characterName.replace(/[^\w]/g, '_')}_${Date.now()}`,
      });

      if (result.error) {
        return {
          error: result.error,
          success: false,
          message: `AI enrichment failed: ${result.error}`,
          enrichedData: undefined
        };
      }

      if (!result.comprehensiveCharacter) {
        return {
          error: "No character data generated",
          success: false,
          message: "AI enrichment completed but no data was generated",
          enrichedData: undefined
        };
      }

      // Update the character with comprehensive data AND mark as manually enriched
      await ctx.runMutation(internal.characterEnrichment.updateCharacterInAnime, {
        animeId: animeId,
        characterName: args.characterName,
        updates: {
          enrichmentStatus: "success",
          enrichmentAttempts: 1,
          lastAttemptTimestamp: Date.now(),
          enrichmentTimestamp: Date.now(),
          
          // Mark as manually enriched by admin (permanent protection)
          manuallyEnrichedByAdmin: true,
          manualEnrichmentTimestamp: Date.now(),
          manualEnrichmentAdminId: adminUserId,
          
          // Basic enrichment fields
          personalityAnalysis: result.comprehensiveCharacter.personalityAnalysis,
          keyRelationships: result.comprehensiveCharacter.keyRelationships,
          detailedAbilities: result.comprehensiveCharacter.detailedAbilities,
          majorCharacterArcs: result.comprehensiveCharacter.majorCharacterArcs,
          trivia: result.comprehensiveCharacter.trivia,
          backstoryDetails: result.comprehensiveCharacter.backstoryDetails,
          characterDevelopment: result.comprehensiveCharacter.characterDevelopment,
          notableQuotes: result.comprehensiveCharacter.notableQuotes,
          symbolism: result.comprehensiveCharacter.symbolism,
          fanReception: result.comprehensiveCharacter.fanReception,
          culturalSignificance: result.comprehensiveCharacter.culturalSignificance,
          
          // Extended enrichment fields
          psychologicalProfile: result.comprehensiveCharacter.psychologicalProfile,
          combatProfile: result.comprehensiveCharacter.combatProfile,
          socialDynamics: result.comprehensiveCharacter.socialDynamics,
          characterArchetype: result.comprehensiveCharacter.characterArchetype,
          characterImpact: result.comprehensiveCharacter.characterImpact,
        },
      });

      // Get admin user info for logging
      const adminUser = await ctx.runQuery(internal.admin.getUserProfileById, { userId: adminUserId });
      const adminUserName = adminUser?.name || "Unknown Admin";

      // Track the manual enrichment
      await ctx.runMutation(internal.admin.trackChangeMutation, {
        adminUserId,
        adminUserName,
        entityType: "character",
        entityId: animeId,
        entityTitle: args.animeName,
        changeType: "enrich",
        changes: [{
          field: "manuallyEnrichedByAdmin",
          oldValue: false,
          newValue: true,
          changeDescription: `Manually enriched character "${args.characterName}" with comprehensive AI data (permanent protection enabled)`
        }],
        additionalData: {
          characterName: args.characterName
        }
      });

      return {
        error: null,
        success: true,
        message: `Successfully enriched "${args.characterName}" with comprehensive AI data and enabled permanent protection against automatic override`,
        enrichedData: result.comprehensiveCharacter // Include the enriched data in the response
      };

    } catch (error: any) {
      return {
        error: error.message || "Unknown error",
        success: false,
        message: `Failed to enrich character: ${error.message || "Unknown error"}`,
        enrichedData: undefined
      };
    }
  },
});

// Clear AI cache for character enrichment (admin only)
export const clearCharacterEnrichmentCache = action({
  args: {
    characterName: v.string(),
    animeName: v.string(),
  },
  returns: v.object({
    error: v.union(v.string(), v.null()),
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        error: "User not authenticated",
        success: false,
        message: "Authentication required"
      };
    }
    
    const userProfile = await ctx.runQuery(internal.admin.getUserProfileById, { userId });
    if (!userProfile?.isAdmin) {
      return {
        error: "User is not an admin",
        success: false,
        message: "Admin privileges required"
      };
    }
    
    try {
      const cacheKey = `comprehensive_character:${args.animeName}:${args.characterName}`;
      await ctx.runMutation(internal.aiCache.invalidateCache, { key: cacheKey });
      
      return {
        error: null,
        success: true,
        message: `Cleared AI cache for "${args.characterName}" from "${args.animeName}". You can now re-run enrichment.`
      };
    } catch (error: any) {
      return {
        error: error.message || "Unknown error",
        success: false,
        message: `Failed to clear cache: ${error.message || "Unknown error"}`
      };
    }
  },
});