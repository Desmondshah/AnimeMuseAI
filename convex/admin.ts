// convex/admin.ts
import { query, mutation, internalQuery } from "./_generated/server"; // ensure internalQuery is imported if used, though not in this final version
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api"; // For potential calls to internal functions like updateAnimeAverageRating

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

// Get all reviews (admin only, paginated)
export const getAllReviewsForAdmin = query({
  args: { paginationOpts: v.any() }, 
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    // Consider enriching with user/anime titles here or in a separate admin-specific action if needed for display
    return await ctx.db.query("reviews").order("desc").paginate(args.paginationOpts);
  },
});


// --- Admin Mutations ---

// Edit an anime entry (admin only)
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
    }),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const { animeId, updates } = args;
    
    const definedUpdates: Partial<Doc<"anime">> = {};
    for (const key in updates) {
        const typedKey = key as keyof typeof updates;
        if (updates[typedKey] !== undefined) {
            (definedUpdates as any)[typedKey] = updates[typedKey];
        }
    }
    if (Object.keys(definedUpdates).length === 0) {
        throw new Error("No updates provided.");
    }
    await ctx.db.patch(animeId, definedUpdates);
    // Consider if average rating needs recalculation if user-facing fields change (unlikely for these fields)
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