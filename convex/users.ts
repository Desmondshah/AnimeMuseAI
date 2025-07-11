// convex/users.ts
import { v } from "convex/values";
import { mutation, query, internalMutation, internalAction } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

export const getMyUserProfile = query({
  handler: async (ctx): Promise<Doc<"userProfiles"> | null> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId as Id<"users">))
      .unique();
    return userProfile;
  },
});

export const updateUserProfilePreferences = mutation({
  args: {
    name: v.optional(v.string()),
    moods: v.optional(v.array(v.string())),
    genres: v.optional(v.array(v.string())),
    favoriteAnimes: v.optional(v.array(v.string())),
    experienceLevel: v.optional(v.string()),
    dislikedGenres: v.optional(v.array(v.string())),
    dislikedTags: v.optional(v.array(v.string())),
    // Phase 2: New granular preferences
    characterArchetypes: v.optional(v.array(v.string())),
    tropes: v.optional(v.array(v.string())),
    artStyles: v.optional(v.array(v.string())),
    narrativePacing: v.optional(v.string()),
    watchlistIsPublic: v.optional(v.boolean()),
    animationsEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated.");
    }

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId as Id<"users">))
      .unique();

    if (!userProfile) {
      throw new Error("User profile not found. Please complete onboarding first.");
    }

    const updates: Partial<Doc<"userProfiles">> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.moods !== undefined) updates.moods = args.moods;
    if (args.genres !== undefined) updates.genres = args.genres;
    if (args.favoriteAnimes !== undefined) updates.favoriteAnimes = args.favoriteAnimes;
    if (args.experienceLevel !== undefined) updates.experienceLevel = args.experienceLevel;
    if (args.dislikedGenres !== undefined) updates.dislikedGenres = args.dislikedGenres;
    if (args.dislikedTags !== undefined) updates.dislikedTags = args.dislikedTags;
    // Phase 2: Granular preferences
    if (args.characterArchetypes !== undefined) updates.characterArchetypes = args.characterArchetypes;
    if (args.tropes !== undefined) updates.tropes = args.tropes;
    if (args.artStyles !== undefined) updates.artStyles = args.artStyles;
    if (args.narrativePacing !== undefined) updates.narrativePacing = args.narrativePacing;
    if (args.watchlistIsPublic !== undefined) updates.watchlistIsPublic = args.watchlistIsPublic;
    if (args.animationsEnabled !== undefined) updates.animationsEnabled = args.animationsEnabled;

    if (Object.keys(updates).length === 0) {
      return { success: true, message: "No preferences updated." };
    }

    await ctx.db.patch(userProfile._id, updates);
    return { success: true, message: "Profile preferences updated successfully." };
  },
});

export const checkVerificationStatus = query({
  args: {},
  returns: v.object({
    isAuthenticated: v.boolean(),
    isVerified: v.boolean(),
    hasPendingVerification: v.optional(v.boolean()),
    pendingVerificationExpiresAt: v.optional(v.number()),
    identifier: v.optional(v.string()),
    emailFromAuth: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
  }),
  handler: async (ctx): Promise<{
    isAuthenticated: boolean;
    isVerified: boolean;
    hasPendingVerification?: boolean;
    pendingVerificationExpiresAt?: number;
    identifier?: string;
    emailFromAuth?: string;
    isAnonymous?: boolean;
  }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { isAuthenticated: false, isVerified: false, isAnonymous: false };
    }

    const userAuthRecord = await ctx.db.get(userId as Id<"users">);

    if (userAuthRecord?.isAnonymous) {
      return {
        isAuthenticated: true,
        isVerified: true, // Anonymous users bypass phone verification for app access
        isAnonymous: true,
        identifier: "Anonymous User",
        emailFromAuth: userAuthRecord?.email,
      };
    }

    const userProfile = await ctx.db.query("userProfiles")
      .withIndex("by_userId", q => q.eq("userId", userId as Id<"users">))
      .unique();

    const isVerified = userProfile?.phoneNumberVerified || false;
    const identifier = userProfile?.phoneNumber || userAuthRecord?.email;

    const pendingVerification = await ctx.db.query("phoneVerifications")
      .withIndex("by_userId", q => q.eq("userId", userId as Id<"users">))
      .filter(q => q.gt(q.field("expiresAt"), Date.now()))
      .first();

    return {
      isAuthenticated: true,
      isVerified,
      hasPendingVerification: !!pendingVerification,
      pendingVerificationExpiresAt: pendingVerification?.expiresAt,
      identifier: identifier,
      emailFromAuth: userAuthRecord?.email,
      isAnonymous: false,
    };
  },
});

export const completeOnboarding = mutation({
  args: {
    name: v.optional(v.string()),
    moods: v.optional(v.array(v.string())),
    genres: v.optional(v.array(v.string())),
    favoriteAnimes: v.optional(v.array(v.string())),
    experienceLevel: v.optional(v.string()),
    dislikedGenres: v.optional(v.array(v.string())),
    dislikedTags: v.optional(v.array(v.string())),
    // Phase 2: Granular preferences (optional during onboarding, user can fill later)
    characterArchetypes: v.optional(v.array(v.string())),
    tropes: v.optional(v.array(v.string())),
    artStyles: v.optional(v.array(v.string())),
    narrativePacing: v.optional(v.string()),
    watchlistIsPublic: v.optional(v.boolean()), // Default to private during onboarding
    animationsEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId as Id<"users">))
      .unique();

    const profileData = {
      userId: userId as Id<"users">,
      name: args.name ?? existingProfile?.name ?? undefined,
      moods: args.moods ?? existingProfile?.moods ?? [],
      genres: args.genres ?? existingProfile?.genres ?? [],
      favoriteAnimes: args.favoriteAnimes ?? existingProfile?.favoriteAnimes ?? [],
      experienceLevel: args.experienceLevel ?? existingProfile?.experienceLevel ?? undefined,
      onboardingCompleted: true,
      avatarUrl: existingProfile?.avatarUrl ?? undefined,
      dislikedGenres: args.dislikedGenres ?? existingProfile?.dislikedGenres ?? [],
      dislikedTags: args.dislikedTags ?? existingProfile?.dislikedTags ?? [],
      // Phase 2: Granular preferences
      characterArchetypes: args.characterArchetypes ?? existingProfile?.characterArchetypes ?? [],
      tropes: args.tropes ?? existingProfile?.tropes ?? [],
      artStyles: args.artStyles ?? existingProfile?.artStyles ?? [],
      narrativePacing: args.narrativePacing ?? existingProfile?.narrativePacing ?? undefined,
      watchlistIsPublic: args.watchlistIsPublic ?? existingProfile?.watchlistIsPublic ?? false, // Default to false
      animationsEnabled: args.animationsEnabled ?? existingProfile?.animationsEnabled ?? true,
      // Preserve phone details if they exist
      phoneNumber: existingProfile?.phoneNumber,
      phoneNumberVerified: existingProfile?.phoneNumberVerified,
      verifiedAt: existingProfile?.verifiedAt,
      isAdmin: existingProfile?.isAdmin ?? false,
    };

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, profileData);
      return existingProfile._id;
    } else {
       const userAuthRecord = await ctx.db.get(userId as Id<"users">);
       const newProfileData = {
        ...profileData,
        phoneNumber: profileData.phoneNumber ?? undefined,
        phoneNumberVerified: profileData.phoneNumberVerified ?? false,
        verifiedAt: profileData.verifiedAt ?? undefined,
       };
      if (userAuthRecord?.isAnonymous) {
         const profileId = await ctx.db.insert("userProfiles", newProfileData);
         return profileId;
      } else {
        // This case should ideally not happen if phone verification precedes onboarding for non-anon
        // Or if profile is created upon sign-up before verification.
        // For safety, we insert if no profile exists for a non-anon user.
        const profileId = await ctx.db.insert("userProfiles", newProfileData);
        return profileId;
      }
    }
  },
});

export const getMyProfileStats = query({
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return null;
        }
        const user = userId as Id<"users">;
        const watchlistItems = await ctx.db.query("watchlist")
            .withIndex("by_userId", q => q.eq("userId", user))
            .collect();
        const stats = {
            watchingCount: watchlistItems.filter(i => i.status === "Watching").length,
            completedCount: watchlistItems.filter(i => i.status === "Completed").length,
            planToWatchCount: watchlistItems.filter(i => i.status === "Plan to Watch").length,
            droppedCount: watchlistItems.filter(i => i.status === "Dropped").length,
            totalWatchlistItems: watchlistItems.length,
        };
        return stats;
    }
});

// --- Phase 2: Custom Lists ---

// TESTABLE HANDLER FUNCTION
export async function createCustomListHandler(ctx: any, args: {
  listName: string;
  description?: string;
  isPublic: boolean;
  animeIds?: Id<"anime">[];
}): Promise<Id<"customLists">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("User not authenticated.");

  const normalizedListName = args.listName.toLowerCase();

  // Check for duplicate list names for the same user (case-insensitive)
  const existingList = await ctx.db
      .query("customLists")
      .withIndex(
        "by_userId_normalizedListName",
        (q: any) =>
          q
            .eq("userId", userId as Id<"users">)
            .eq("normalizedListName", normalizedListName)
      )
      .unique();
  if (existingList) {
      throw new Error("A list with this name already exists.");
  }

  return await ctx.db.insert("customLists", {
    userId: userId as Id<"users">,
    listName: args.listName,
    normalizedListName,
    description: args.description,
    isPublic: args.isPublic,
    animeIds: args.animeIds || [],
    createdAt: Date.now(),
  });
}

export const createCustomList = mutation({
  args: {
    listName: v.string(),
    description: v.optional(v.string()),
    isPublic: v.boolean(),
    animeIds: v.optional(v.array(v.id("anime"))),
  },
  handler: createCustomListHandler,
});

export const getMyCustomLists = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("customLists")
      .withIndex("by_userId_createdAt", q => q.eq("userId", userId as Id<"users">))
      .order("desc")
      .collect();
  },
});

export const getCustomListById = query({
    args: { listId: v.id("customLists") },
    handler: async (ctx, args) => {
        const list = await ctx.db.get(args.listId);
        if (!list) return null;

        const userId = await getAuthUserId(ctx);
        if (!list.isPublic && list.userId !== userId) {
            throw new Error("This list is private.");
        }
        // Fetch anime details for the list
        const animeDetails = await Promise.all(
            list.animeIds.map(animeId => ctx.db.get(animeId as Id<"anime">))
        );
        return { ...list, anime: animeDetails.filter(Boolean) as Doc<"anime">[] };
    }
});

export const updateCustomList = mutation({
  args: {
    listId: v.id("customLists"),
    listName: v.optional(v.string()),
    description: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    animeIds: v.optional(v.array(v.id("anime"))), // Can be used to add/remove/reorder
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated.");

    const list = await ctx.db.get(args.listId);
    if (!list || list.userId !== userId) throw new Error("List not found or not authorized.");

    const updates: Partial<Doc<"customLists">> = { updatedAt: Date.now() };
    if (args.listName !== undefined) {
      const normalizedListName = args.listName.toLowerCase();
      const existingList = await ctx.db
        .query("customLists")
        .withIndex(
          "by_userId_normalizedListName",
          q =>
            q
              .eq("userId", userId as Id<"users">)
              .eq("normalizedListName", normalizedListName)
        )
        .unique();
      if (existingList && existingList._id !== args.listId) {
        throw new Error("A list with this name already exists.");
      }
      updates.listName = args.listName;
      updates.normalizedListName = normalizedListName;
    }
    if (args.description !== undefined) updates.description = args.description;
    if (args.isPublic !== undefined) updates.isPublic = args.isPublic;
    if (args.animeIds !== undefined) updates.animeIds = args.animeIds;

    await ctx.db.patch(args.listId, updates);
    return args.listId;
  },
});

export const deleteCustomList = mutation({
  args: { listId: v.id("customLists") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated.");

    const list = await ctx.db.get(args.listId);
    if (!list || list.userId !== userId) throw new Error("List not found or not authorized.");

    await ctx.db.delete(args.listId);
    return true;
  },
});

export const addAnimeToCustomList = mutation({
    args: { listId: v.id("customLists"), animeId: v.id("anime") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("User not authenticated.");
        const list = await ctx.db.get(args.listId);
        if (!list || list.userId !== userId) throw new Error("List not found or not authorized.");
        if (!list.animeIds.includes(args.animeId)) {
            await ctx.db.patch(args.listId, { animeIds: [...list.animeIds, args.animeId], updatedAt: Date.now() });
        }
        return args.listId;
    }
});

export const removeAnimeFromCustomList = mutation({
    args: { listId: v.id("customLists"), animeId: v.id("anime") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("User not authenticated.");
        const list = await ctx.db.get(args.listId);
        if (!list || list.userId !== userId) throw new Error("List not found or not authorized.");
        if (list.animeIds.includes(args.animeId)) {
            await ctx.db.patch(args.listId, { animeIds: list.animeIds.filter(id => id !== args.animeId), updatedAt: Date.now() });
        }
        return args.listId;
    }
});

// --- Watchlist Privacy Toggle (global setting on user profile) ---
export const setWatchlistPrivacy = mutation({
    args: { isPublic: v.boolean() },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("User not authenticated.");
        const userProfile = await ctx.db.query("userProfiles").withIndex("by_userId", q => q.eq("userId", userId as Id<"users">)).unique();
        if (!userProfile) throw new Error("User profile not found.");
        await ctx.db.patch(userProfile._id, { watchlistIsPublic: args.isPublic });
        return { success: true };
    }
});

export const cleanupExpiredPhoneVerifications = internalMutation({
  args: {},
  returns: v.object({
    cleanedCount: v.number(),
  }),
  handler: async (ctx): Promise<{ cleanedCount: number }> => {
    const expiredVerifications = await ctx.db.query("phoneVerifications")
      .withIndex("by_expiresAt")
      .filter(q => q.lt(q.field("expiresAt"), Date.now()))
      .collect();
    let cleanedCount = 0;
    for (const expired of expiredVerifications) {
      await ctx.db.delete(expired._id);
      cleanedCount++;
    }
    if (cleanedCount > 0) {
      console.log(`[Phone Verification Cleanup] Cleaned up ${cleanedCount} expired phone verification codes`);
    }
    return { cleanedCount };
  },
});

export const scheduledCleanupExpiredPhoneVerifications = internalAction({
  args: {},
  returns: v.object({
    cleanedCount: v.number(),
  }),
  handler: async (ctx): Promise<{ cleanedCount: number }> => {
    const result = await ctx.runMutation(internal.users.cleanupExpiredPhoneVerifications, {});
    console.log(`[Phone Verification Cleanup] Scheduled task completed: ${result.cleanedCount} expired codes removed`);
    return result;
  },
});

export const createUserProfile = mutation({
  args: {
    name: v.string(),
    favoriteGenres: v.optional(v.array(v.string())),
    mood: v.optional(v.string()),
    experience: v.optional(v.string()),
    favoriteAnime: v.optional(v.array(v.string())),
    dislikedGenres: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated.");
    }

    // Check if user profile already exists
    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId as Id<"users">))
      .unique();

    if (existingProfile) {
      throw new Error("User profile already exists.");
    }

    // Create new user profile
    const profileId = await ctx.db.insert("userProfiles", {
      userId: userId as Id<"users">,
      name: args.name,
      genres: args.favoriteGenres || [],
      moods: args.mood ? [args.mood] : [],
      experienceLevel: args.experience,
      favoriteAnimes: args.favoriteAnime || [],
      dislikedGenres: args.dislikedGenres || [],
      onboardingCompleted: true,
    });

    return profileId;
  },
});