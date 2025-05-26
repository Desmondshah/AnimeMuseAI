// convex/reviews.ts - Optimized
import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { PaginationResult } from "convex/server";

// --- Queries ---

// Get all reviews for a specific anime, optionally paginated and sorted (Optimized N+1)
export const getReviewsForAnime = query({
  args: {
    animeId: v.id("anime"),
    paginationOpts: v.any(),
  },
  handler: async (ctx, args) => {
    const reviewsPaginated = await ctx.db
      .query("reviews")
      .withIndex("by_animeId_createdAt", (q) => q.eq("animeId", args.animeId))
      .order("desc") // Show newest reviews first
      .paginate(args.paginationOpts);

    const reviewsOnPage = reviewsPaginated.page;

    if (reviewsOnPage.length === 0) {
      return {
        ...reviewsPaginated,
        page: [], // Ensure page is an empty array
      };
    }

    // Collect unique user IDs from the current page of reviews
    const userIds = Array.from(new Set(reviewsOnPage.map(review => review.userId)));

    // Fetch user profiles for these user IDs in a more batched way
    const userProfilesPromises = userIds.map(userId =>
      ctx.db
        .query("userProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", userId as Id<"users">)) // Cast needed if userId from map isn't Id<"users">
        .unique()
    );
    const userProfilesArray = await Promise.all(userProfilesPromises);
    
    const userProfilesMap = new Map<string, Doc<"userProfiles"> | null>();
    userProfilesArray.forEach(profile => {
      if (profile) {
        userProfilesMap.set(profile.userId.toString(), profile);
      }
    });

    const reviewsWithUserDetails = reviewsOnPage.map((review) => {
      const userProfile = userProfilesMap.get(review.userId.toString());
      return {
        ...review,
        userName: userProfile?.name || "Anonymous",
        userAvatarUrl: userProfile?.avatarUrl, // Or a default avatar
      };
    });

    return {
      ...reviewsPaginated,
      page: reviewsWithUserDetails,
    };
  },
});

// Get a specific review by a user for an anime
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


// --- Mutations ---
export const addReview = mutation({
  args: {
    animeId: v.id("anime"),
    rating: v.number(), // Ensure rating is within 1-5 or 1-10 based on your frontend ReviewForm
    reviewText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }
    // Validate rating, e.g., if your system is 1-5
    if (args.rating < 1 || args.rating > 5) { // Adjusted based on ReviewForm using MAX_RATING = 5
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
    rating: v.number(), // Ensure rating is within 1-5 or 1-10
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
    // Validate rating, e.g., if your system is 1-5
    if (args.rating < 1 || args.rating > 5) { // Adjusted based on ReviewForm using MAX_RATING = 5
        throw new Error("Rating must be between 1 and 5.");
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