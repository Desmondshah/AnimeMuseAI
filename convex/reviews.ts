// convex/reviews.ts
import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
// Import PaginationResult if you're using it explicitly for return types for paginated queries
import { PaginationResult } from "convex/server";

// --- Queries ---

// Get all reviews for a specific anime, optionally paginated and sorted
export const getReviewsForAnime = query({
  args: {
    animeId: v.id("anime"),
    // paginationOpts now required by usePaginatedQuery.
    // The hook will pass the correct PaginationOptions object.
    paginationOpts: v.any(),
  },
  handler: async (ctx, args) => {
    // The type for reviews will be PaginationResult<{ review_fields..., userName, userAvatarUrl }>
    const reviewsPaginated = await ctx.db
      .query("reviews")
      .withIndex("by_animeId_createdAt", (q) => q.eq("animeId", args.animeId))
      .order("desc") // Show newest reviews first
      .paginate(args.paginationOpts); // Pass the paginationOpts directly

    const reviewsWithUserDetails = await Promise.all(
      reviewsPaginated.page.map(async (review) => {
        const userProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_userId", (q) => q.eq("userId", review.userId))
          .unique();
        return {
          ...review,
          userName: userProfile?.name || "Anonymous",
          userAvatarUrl: userProfile?.avatarUrl,
        };
      })
    );
    return {
      ...reviewsPaginated, // includes page, isDone, continueCursor
      page: reviewsWithUserDetails, // replace original page with enriched one
    };
  },
});

// Get a specific review by a user for an anime (to check if they've already reviewed)
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


// --- Mutations --- (addReview, editReview, deleteReview remain the same)
export const addReview = mutation({
  args: {
    animeId: v.id("anime"),
    rating: v.number(),
    reviewText: v.optional(v.string()),
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
      createdAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.reviews.updateAnimeAverageRating, {
      animeId: args.animeId,
    });
    return reviewId;
  },
});

export const editReview = mutation({
  args: {
    reviewId: v.id("reviews"),
    rating: v.number(),
    reviewText: v.optional(v.string()),
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
    if (args.rating < 1 || args.rating > 10) {
        throw new Error("Rating must be between 1 and 10.");
    }
    await ctx.db.patch(args.reviewId, {
      rating: args.rating,
      reviewText: args.reviewText,
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
    if (existingReview.userId !== userId) {
      throw new Error("You can only delete your own reviews.");
    }
    const animeId = existingReview.animeId;
    await ctx.db.delete(args.reviewId);
    await ctx.scheduler.runAfter(0, internal.reviews.updateAnimeAverageRating, {
      animeId: animeId,
    });
    return true;
  },
});

// --- Internal Mutations ---
export const updateAnimeAverageRating = internalMutation({
  args: { animeId: v.id("anime") },
  handler: async (ctx, args) => {
    const reviewsForAnime = await ctx.db
      .query("reviews")
      .withIndex("by_animeId_createdAt", q => q.eq("animeId", args.animeId))
      .collect();
    const reviewCount = reviewsForAnime.length;
    let averageUserRating = 0;
    if (reviewCount > 0) {
      const totalRatingSum = reviewsForAnime.reduce((sum, review) => sum + review.rating, 0);
      averageUserRating = parseFloat((totalRatingSum / reviewCount).toFixed(2));
    }
    try {
        await ctx.db.patch(args.animeId, {
            averageUserRating: reviewCount > 0 ? averageUserRating : undefined,
            reviewCount: reviewCount,
          });
    } catch (e) {
        console.error(`Failed to patch anime ${args.animeId} with new average rating:`, e)
    }
    console.log(`Updated average rating for anime ${args.animeId}: ${averageUserRating} from ${reviewCount} reviews.`);
  },
});