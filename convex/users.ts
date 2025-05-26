// convex/users.ts - Complete version with cleanup functions
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

export const checkVerificationStatus = query({
  args: {},
  returns: v.object({
    isAuthenticated: v.boolean(),
    isVerified: v.boolean(),
    hasPendingVerification: v.optional(v.boolean()),
    pendingVerificationExpiresAt: v.optional(v.number()),
    email: v.optional(v.string()),
  }),
  handler: async (ctx): Promise<{
    isAuthenticated: boolean;
    isVerified: boolean;
    hasPendingVerification?: boolean;
    pendingVerificationExpiresAt?: number;
    email?: string;
  }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { isAuthenticated: false, isVerified: false };
    }

    const userProfile = await ctx.db.query("userProfiles")
      .withIndex("by_userId", q => q.eq("userId", userId as Id<"users">))
      .unique();

    const user = await ctx.db.get(userId);
    
    // Check emailVerified in userProfile or emailVerificationTime in user record
    const isVerified = userProfile?.emailVerified || !!user?.emailVerificationTime || false;
    
    // Check if there's a pending verification
    const pendingVerification = await ctx.db.query("emailVerifications")
      .withIndex("by_userId", q => q.eq("userId", userId as Id<"users">))
      .filter(q => q.gt(q.field("expiresAt"), Date.now()))
      .first();

    return {
      isAuthenticated: true,
      isVerified,
      hasPendingVerification: !!pendingVerification,
      pendingVerificationExpiresAt: pendingVerification?.expiresAt,
      email: user?.email,
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
      name: args.name ?? undefined,
      moods: args.moods ?? [],
      genres: args.genres ?? [],
      favoriteAnimes: args.favoriteAnimes ?? [],
      experienceLevel: args.experienceLevel ?? undefined,
      onboardingCompleted: true,
      avatarUrl: existingProfile?.avatarUrl ?? undefined,
      dislikedGenres: args.dislikedGenres ?? [],
    };

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, profileData);
      return existingProfile._id;
    } else {
      const profileId = await ctx.db.insert("userProfiles", profileData);
      return profileId;
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

// --- Email Verification Cleanup Functions ---

export const cleanupExpiredVerifications = internalMutation({
  args: {},
  returns: v.object({
    cleanedCount: v.number(),
  }),
  handler: async (ctx): Promise<{ cleanedCount: number }> => {
    const expiredVerifications = await ctx.db.query("emailVerifications")
      .filter(q => q.lt(q.field("expiresAt"), Date.now()))
      .collect();

    let cleanedCount = 0;
    for (const expired of expiredVerifications) {
      await ctx.db.delete(expired._id);
      cleanedCount++;
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired verification codes`);
    }

    return { cleanedCount };
  },
});

export const scheduledCleanupExpiredVerifications = internalAction({
  args: {},
  returns: v.object({
    cleanedCount: v.number(),
  }),
  handler: async (ctx): Promise<{ cleanedCount: number }> => {
    const result = await ctx.runMutation(internal.users.cleanupExpiredVerifications, {});
    console.log(`Scheduled cleanup completed: ${result.cleanedCount} expired codes removed`);
    return result;
  },
});