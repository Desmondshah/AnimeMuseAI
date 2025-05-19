import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";

// Query to get the current user's profile
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

// Mutation to complete onboarding and save/update user profile
export const completeOnboarding = mutation({
  args: {
    name: v.optional(v.string()),
    moods: v.optional(v.array(v.string())),
    genres: v.optional(v.array(v.string())),
    favoriteAnimes: v.optional(v.array(v.string())),
    experienceLevel: v.optional(v.string()),
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
      name: args.name ?? undefined, // Ensure optional fields are handled
      moods: args.moods ?? [],
      genres: args.genres ?? [],
      favoriteAnimes: args.favoriteAnimes ?? [],
      experienceLevel: args.experienceLevel ?? undefined,
      onboardingCompleted: true,
      avatarUrl: existingProfile?.avatarUrl ?? undefined, // Preserve existing avatar
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
