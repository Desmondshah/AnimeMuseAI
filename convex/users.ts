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

// ---- PHASE 1: New Mutation to Update User Preferences ----
export const updateUserProfilePreferences = mutation({
  args: {
    // All fields are optional, only provided fields will be updated
    name: v.optional(v.string()),
    moods: v.optional(v.array(v.string())),
    genres: v.optional(v.array(v.string())),
    favoriteAnimes: v.optional(v.array(v.string())),
    experienceLevel: v.optional(v.string()),
    dislikedGenres: v.optional(v.array(v.string())),
    dislikedTags: v.optional(v.array(v.string())),
    // avatarUrl can also be updated here if you have a mechanism for it
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

    // Construct an updates object with only the fields that were actually passed in args
    const updates: Partial<Doc<"userProfiles">> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.moods !== undefined) updates.moods = args.moods;
    if (args.genres !== undefined) updates.genres = args.genres;
    if (args.favoriteAnimes !== undefined) updates.favoriteAnimes = args.favoriteAnimes;
    if (args.experienceLevel !== undefined) updates.experienceLevel = args.experienceLevel;
    if (args.dislikedGenres !== undefined) updates.dislikedGenres = args.dislikedGenres;
    if (args.dislikedTags !== undefined) updates.dislikedTags = args.dislikedTags;

    if (Object.keys(updates).length === 0) {
      // No actual changes were provided
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
        isVerified: true,
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
    dislikedTags: v.optional(v.array(v.string())), // Added dislikedTags
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
      name: args.name ?? existingProfile?.name ?? undefined, // Use existing name if not provided
      moods: args.moods ?? existingProfile?.moods ?? [],
      genres: args.genres ?? existingProfile?.genres ?? [],
      favoriteAnimes: args.favoriteAnimes ?? existingProfile?.favoriteAnimes ?? [],
      experienceLevel: args.experienceLevel ?? existingProfile?.experienceLevel ?? undefined,
      onboardingCompleted: true,
      avatarUrl: existingProfile?.avatarUrl ?? undefined,
      dislikedGenres: args.dislikedGenres ?? existingProfile?.dislikedGenres ?? [],
      dislikedTags: args.dislikedTags ?? existingProfile?.dislikedTags ?? [], // Add dislikedTags
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