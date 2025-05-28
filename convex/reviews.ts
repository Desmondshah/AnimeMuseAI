// convex/reviews.ts
import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { Doc, Id, DataModel } from "./_generated/dataModel"; // Added DataModel
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { PaginationResult, Query, OrderedQuery } from "convex/server"; // Added OrderedQuery

// ---- PHASE 1: Added sorting options to getReviewsForAnime ----
export const getReviewsForAnime = query({
  args: {
    animeId: v.id("anime"),
    paginationOpts: v.any(),
    // PHASE 1: Add sortOption argument
    sortOption: v.optional(v.union(
        v.literal("newest"),
        v.literal("oldest"),
        v.literal("highest_rating"),
        v.literal("lowest_rating")
    ))
  },
  handler: async (ctx, args) => {
    let queryBuilder: OrderedQuery<DataModel["reviews"]>; // Correctly typed

    // Determine the index and order based on sortOption
    switch (args.sortOption) {
        case "oldest":
            queryBuilder = ctx.db
                .query("reviews")
                .withIndex("by_animeId_createdAt", (q) => q.eq("animeId", args.animeId))
                .order("asc");
            break;
        case "highest_rating":
            queryBuilder = ctx.db
                .query("reviews")
                .withIndex("by_animeId_rating", (q) => q.eq("animeId", args.animeId))
                .order("desc"); // Highest rating first
            break;
        case "lowest_rating":
            queryBuilder = ctx.db
                .query("reviews")
                .withIndex("by_animeId_rating", (q) => q.eq("animeId", args.animeId))
                .order("asc"); // Lowest rating first
            break;
        case "newest":
        default: // Default to newest first
            queryBuilder = ctx.db
                .query("reviews")
                .withIndex("by_animeId_createdAt", (q) => q.eq("animeId", args.animeId))
                .order("desc");
            break;
    }

    const reviewsPaginated = await queryBuilder.paginate(args.paginationOpts);
    const reviewsOnPage: Doc<"reviews">[] = reviewsPaginated.page; // Explicitly type

    if (reviewsOnPage.length === 0) {
      return { ...reviewsPaginated, page: [] };
    }

    const userIds = Array.from(new Set(reviewsOnPage.map(review => review.userId)));
    const userProfilesPromises = userIds.map(userId =>
      ctx.db
        .query("userProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", userId as Id<"users">))
        .unique()
    );
    const userProfilesArray = await Promise.all(userProfilesPromises);
    
    const userProfilesMap = new Map<string, Doc<"userProfiles"> | null>();
    userProfilesArray.forEach(profile => {
      if (profile) {
        userProfilesMap.set(profile.userId.toString(), profile);
      }
    });

    const reviewsWithUserDetails = reviewsOnPage.map((review: Doc<"reviews">) => { // Explicitly type 'review' here
      const userProfile = userProfilesMap.get(review.userId.toString());
      return {
        ...review, // Spread 'review' which is now correctly typed
        userName: userProfile?.name || "Anonymous",
        userAvatarUrl: userProfile?.avatarUrl,
      };
    });

    return {
      ...reviewsPaginated,
      page: reviewsWithUserDetails,
    };
  },
});

export const getUserReviewForAnime = query({
  args: { animeId: v.id("anime") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    return await ctx.db
      .query("reviews")
      .withIndex("by_animeId_userId", (q) =>
        q.eq("animeId", args.animeId).eq("userId", userId as Id<"users">)
      )
      .unique();
  },
});

// ---- PHASE 1: Updated addReview to include isSpoiler ----
export const addReview = mutation({
  args: {
    animeId: v.id("anime"),
    rating: v.number(),
    reviewText: v.optional(v.string()),
    isSpoiler: v.optional(v.boolean()), // New field
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }
    if (args.rating < 1 || args.rating > 5) {
        throw new Error("Rating must be between 1 and 5.");
    }
    const existingReview = await ctx.db
      .query("reviews")
      .withIndex("by_animeId_userId", (q) =>
        q.eq("animeId", args.animeId).eq("userId", userId as Id<"users">)
      )
      .unique();
    if (existingReview) {
      throw new Error("You have already reviewed this anime. You can edit your existing review.");
    }
    const reviewId = await ctx.db.insert("reviews", {
      userId: userId as Id<"users">,
      animeId: args.animeId,
      rating: args.rating,
      reviewText: args.reviewText,
      isSpoiler: args.isSpoiler ?? false, // Default to false if not provided
      createdAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.reviews.updateAnimeAverageRating, {
      animeId: args.animeId,
    });
    return reviewId;
  },
});

// ---- PHASE 1: Updated editReview to include isSpoiler ----
export const editReview = mutation({
  args: {
    reviewId: v.id("reviews"),
    rating: v.number(),
    reviewText: v.optional(v.string()),
    isSpoiler: v.optional(v.boolean()), // New field
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }
    const existingReview = await ctx.db.get(args.reviewId);
    if (!existingReview) {
      throw new Error("Review not found.");
    }
    if (existingReview.userId !== userId) {
      throw new Error("You can only edit your own reviews.");
    }
    if (args.rating < 1 || args.rating > 5) {
        throw new Error("Rating must be between 1 and 5.");
    }
    await ctx.db.patch(args.reviewId, {
      rating: args.rating,
      reviewText: args.reviewText,
      isSpoiler: args.isSpoiler ?? existingReview.isSpoiler ?? false, // Preserve existing if not provided, else default
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.reviews.updateAnimeAverageRating, {
      animeId: existingReview.animeId,
    });
    return args.reviewId;
  },
});

export const deleteReview = mutation({
  args: { reviewId: v.id("reviews") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }
    const existingReview = await ctx.db.get(args.reviewId);
    if (!existingReview) {
      throw new Error("Review not found.");
    }
    // Admins can delete any review, users can only delete their own.
    // This logic is handled in admin.ts for admin deletions.
    // Here, we only allow users to delete their own.
    if (existingReview.userId !== userId) {
      const userProfile = await ctx.db.query("userProfiles").withIndex("by_userId", q => q.eq("userId", userId as Id<"users">)).unique();
      if(!userProfile?.isAdmin){ // Check if current user is NOT an admin
        throw new Error("You can only delete your own reviews.");
      }
      // If admin, allow deletion (though adminDeleteReview is preferred for admins)
    }

    const animeId = existingReview.animeId;
    await ctx.db.delete(args.reviewId);
    await ctx.scheduler.runAfter(0, internal.reviews.updateAnimeAverageRating, {
      animeId: animeId,
    });
    return true;
  },
});

export const updateAnimeAverageRating = internalMutation({
  args: { animeId: v.id("anime") },
  handler: async (ctx, args) => {
    const reviewsForAnime = await ctx.db
      .query("reviews")
      .withIndex("by_animeId_createdAt", q => q.eq("animeId", args.animeId)) // Can use any index that filters by animeId
      .collect();
    const reviewCount = reviewsForAnime.length;
    let averageUserRating = 0;
    if (reviewCount > 0) {
      const totalRatingSum = reviewsForAnime.reduce((sum, review) => sum + review.rating, 0);
      averageUserRating = parseFloat((totalRatingSum / reviewCount).toFixed(2)); // Keep 2 decimal places
    }
    try {
        await ctx.db.patch(args.animeId, {
            averageUserRating: reviewCount > 0 ? averageUserRating : undefined, // Set to undefined if no reviews
            reviewCount: reviewCount,
          });
    } catch (e) {
        console.error(`[Rating Update] Failed to patch anime ${args.animeId} with new average rating:`, e)
    }
    console.log(`[Rating Update] Updated average rating for anime ${args.animeId}: ${averageUserRating} from ${reviewCount} reviews.`);
  },
});
