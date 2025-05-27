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

// Updated to check phone verification status
export const checkVerificationStatus = query({
  args: {},
  returns: v.object({
    isAuthenticated: v.boolean(),
    isVerified: v.boolean(), // This now refers to phone verification
    hasPendingVerification: v.optional(v.boolean()), // If there's an active OTP code
    pendingVerificationExpiresAt: v.optional(v.number()),
    identifier: v.optional(v.string()), // This could be phone number or email from auth table
    // We still might want to show the user's email from the main auth.users table if they signed up with it
    emailFromAuth: v.optional(v.string()),
  }),
  handler: async (ctx): Promise<{
    isAuthenticated: boolean;
    isVerified: boolean;
    hasPendingVerification?: boolean;
    pendingVerificationExpiresAt?: number;
    identifier?: string; // Will be the phone number if available and relevant
    emailFromAuth?: string;
  }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { isAuthenticated: false, isVerified: false };
    }

    const userAuthRecord = await ctx.db.get(userId); // Get the record from auth.users table

    const userProfile = await ctx.db.query("userProfiles")
      .withIndex("by_userId", q => q.eq("userId", userId as Id<"users">))
      .unique();

    const isVerified = userProfile?.phoneNumberVerified || false;
    const identifier = userProfile?.phoneNumber || userAuthRecord?.email; // Prioritize phone number

    // Check if there's a pending phone verification code for this user
    const pendingVerification = await ctx.db.query("phoneVerifications")
      .withIndex("by_userId", q => q.eq("userId", userId as Id<"users">))
      .filter(q => q.gt(q.field("expiresAt"), Date.now())) // Check for unexpired codes
      .first();

    return {
      isAuthenticated: true,
      isVerified,
      hasPendingVerification: !!pendingVerification,
      pendingVerificationExpiresAt: pendingVerification?.expiresAt,
      identifier: identifier,
      emailFromAuth: userAuthRecord?.email, // Pass email from main auth table if needed by UI
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
    // phoneNumber is not typically set here, but during verification.
    // If you collect it during onboarding before verification, handle accordingly.
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

    // Ensure phoneNumber and phoneNumberVerified status are preserved if they exist
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
      // Preserve phone details if already set
      phoneNumber: existingProfile?.phoneNumber,
      phoneNumberVerified: existingProfile?.phoneNumberVerified,
      verifiedAt: existingProfile?.verifiedAt,
      isAdmin: existingProfile?.isAdmin ?? false,
    };

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, profileData);
      return existingProfile._id;
    } else {
      // This case should be less common if verification step creates a basic profile
      const profileId = await ctx.db.insert("userProfiles", {
        ...profileData,
        // Ensure new profiles also initialize phone fields appropriately if not set
        phoneNumber: profileData.phoneNumber ?? undefined,
        phoneNumberVerified: profileData.phoneNumberVerified ?? false,
        verifiedAt: profileData.verifiedAt ?? undefined,
      });
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

// --- Phone Verification Cleanup Functions ---
export const cleanupExpiredPhoneVerifications = internalMutation({
  args: {},
  returns: v.object({
    cleanedCount: v.number(),
  }),
  handler: async (ctx): Promise<{ cleanedCount: number }> => {
    const expiredVerifications = await ctx.db.query("phoneVerifications")
      .withIndex("by_expiresAt") // Ensure this index exists on phoneVerifications table
      .filter(q => q.lt(q.field("expiresAt"), Date.now()))
      .collect();

    let cleanedCount = 0;
    for (const expired of expiredVerifications) {
      await ctx.db.delete(expired._id);
      cleanedCount++;
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired phone verification codes`);
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
    console.log(`Scheduled phone verification cleanup completed: ${result.cleanedCount} expired codes removed`);
    return result;
  },
});