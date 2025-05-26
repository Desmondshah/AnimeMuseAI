// convex/users.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";

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

export const completeOnboarding = mutation({
  args: {
    name: v.optional(v.string()),
    moods: v.optional(v.array(v.string())),
    genres: v.optional(v.array(v.string())),
    favoriteAnimes: v.optional(v.array(v.string())),
    experienceLevel: v.optional(v.string()),
    dislikedGenres: v.optional(v.array(v.string())), // Added for Phase 2
    // dislikedTags: v.optional(v.array(v.string())), // Add if you implement dislikedTags step
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
      dislikedGenres: args.dislikedGenres ?? [], // Added for Phase 2
      // dislikedTags: args.dislikedTags ?? [], // Add if you implement dislikedTags step
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

// Added for Phase 2 - User Profile Stats
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
        // More complex stats like "most watched genre" would require fetching anime details for completed items
        // and then aggregating genre counts. This can be added later if desired.
        return stats;
    }
});