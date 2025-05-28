// convex/reviews.ts
import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { Doc, Id, DataModel } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { OrderedQuery, PaginationResult } from "convex/server";


export const getReviewsForAnime = query({
  args: {
    animeId: v.id("anime"),
    paginationOpts: v.any(),
    sortOption: v.optional(v.union(
        v.literal("newest"), v.literal("oldest"),
        v.literal("highest_rating"), v.literal("lowest_rating"),
        v.literal("most_helpful") // Phase 2: Sort by helpful
    ))
  },
  handler: async (ctx, args) => {
    let queryBuilder: OrderedQuery<DataModel["reviews"]>;
    const authUserId = await getAuthUserId(ctx); // Get auth user ID once

    switch (args.sortOption) {
        case "oldest":
            queryBuilder = ctx.db.query("reviews").withIndex("by_animeId_createdAt", q => q.eq("animeId", args.animeId)).order("asc");
            break;
        case "highest_rating":
            queryBuilder = ctx.db.query("reviews").withIndex("by_animeId_rating", q => q.eq("animeId", args.animeId)).order("desc");
            break;
        case "lowest_rating":
            queryBuilder = ctx.db.query("reviews").withIndex("by_animeId_rating", q => q.eq("animeId", args.animeId)).order("asc");
            break;
        case "most_helpful":
            queryBuilder = ctx.db.query("reviews").withIndex("by_animeId_upvotes", q => q.eq("animeId", args.animeId)).order("desc");
            break;
        case "newest":
        default:
            queryBuilder = ctx.db.query("reviews").withIndex("by_animeId_createdAt", q => q.eq("animeId", args.animeId)).order("desc");
            break;
    }

    const reviewsPaginated = await queryBuilder.paginate(args.paginationOpts);
    const reviewsOnPage: Doc<"reviews">[] = reviewsPaginated.page;

    if (reviewsOnPage.length === 0) {
      return { ...reviewsPaginated, page: [] };
    }

    const userIdsFromReviews = Array.from(new Set(reviewsOnPage.map(review => review.userId)));
    const userProfilesPromises = userIdsFromReviews.map(uid =>
      ctx.db.query("userProfiles").withIndex("by_userId", q => q.eq("userId", uid as Id<"users">)).unique()
    );
    const userProfilesArray = await Promise.all(userProfilesPromises);

    const userProfilesMap = new Map<string, Doc<"userProfiles"> | null>();
    userProfilesArray.forEach(profile => profile && userProfilesMap.set(profile.userId.toString(), profile));

    const reviewsWithDetailsPromises = reviewsOnPage.map(async (review) => {
      const userProfile = userProfilesMap.get(review.userId.toString());
      const votes = await ctx.db.query("reviewVotes").withIndex("by_review_user", q => q.eq("reviewId", review._id)).collect();
      const comments = await ctx.db.query("reviewComments").withIndex("by_review_createdAt", q => q.eq("reviewId", review._id)).collect();
      const currentUserVoteDoc = authUserId ? votes.find(v => v.userId === authUserId) : null;

      return {
        ...review,
        userName: userProfile?.name || "Anonymous",
        userAvatarUrl: userProfile?.avatarUrl,
        upvotes: review.upvotes ?? votes.filter(v => v.voteType === "up").length,
        downvotes: review.downvotes ?? votes.filter(v => v.voteType === "down").length,
        currentUserVote: currentUserVoteDoc?.voteType || null,
        commentCount: comments.length,
      };
    });

    const reviewsWithDetails = await Promise.all(reviewsWithDetailsPromises);

    return {
      ...reviewsPaginated,
      page: reviewsWithDetails,
    };
  },
});

export const getUserReviewForAnime = query({
  args: { animeId: v.id("anime") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("reviews")
      .withIndex("by_animeId_userId", q => q.eq("animeId", args.animeId).eq("userId", userId as Id<"users">))
      .unique();
  },
});

export const addReview = mutation({
  args: {
    animeId: v.id("anime"),
    rating: v.number(),
    reviewText: v.optional(v.string()),
    isSpoiler: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");
    if (args.rating < 1 || args.rating > 5) throw new Error("Rating must be between 1 and 5.");

    const existingReview = await ctx.db.query("reviews")
      .withIndex("by_animeId_userId", q => q.eq("animeId", args.animeId).eq("userId", userId as Id<"users">))
      .unique();
    if (existingReview) throw new Error("You have already reviewed this anime. Edit your existing review.");

    const reviewId = await ctx.db.insert("reviews", {
      userId: userId as Id<"users">,
      animeId: args.animeId,
      rating: args.rating,
      reviewText: args.reviewText,
      isSpoiler: args.isSpoiler ?? false,
      createdAt: Date.now(),
      upvotes: 0,
      downvotes: 0,
    });
    await ctx.scheduler.runAfter(0, internal.reviews.updateAnimeAverageRating, { animeId: args.animeId });
    await ctx.scheduler.runAfter(0, internal.reviews.updateReviewVoteCounts, { reviewId });
    return reviewId;
  },
});

export const editReview = mutation({
  args: {
    reviewId: v.id("reviews"),
    rating: v.number(),
    reviewText: v.optional(v.string()),
    isSpoiler: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");
    const existingReview = await ctx.db.get(args.reviewId);
    if (!existingReview) throw new Error("Review not found.");
    if (existingReview.userId !== userId) throw new Error("You can only edit your own reviews.");
    if (args.rating < 1 || args.rating > 5) throw new Error("Rating must be between 1 and 5.");

    await ctx.db.patch(args.reviewId, {
      rating: args.rating,
      reviewText: args.reviewText,
      isSpoiler: args.isSpoiler ?? existingReview.isSpoiler ?? false,
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.reviews.updateAnimeAverageRating, { animeId: existingReview.animeId });
    return args.reviewId;
  },
});

export const deleteReview = mutation({
  args: { reviewId: v.id("reviews") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");
    const existingReview = await ctx.db.get(args.reviewId);
    if (!existingReview) throw new Error("Review not found.");

    const userProfile = await ctx.db.query("userProfiles").withIndex("by_userId", q => q.eq("userId", userId as Id<"users">)).unique();
    if (existingReview.userId !== userId && !userProfile?.isAdmin) {
      throw new Error("You can only delete your own reviews or an admin must perform this action.");
    }

    const animeId = existingReview.animeId;

    const votesToDelete = await ctx.db.query("reviewVotes").withIndex("by_review_user", q => q.eq("reviewId", args.reviewId)).collect();
    for (const vote of votesToDelete) { await ctx.db.delete(vote._id); }

    const commentsToDelete = await ctx.db.query("reviewComments").withIndex("by_review_createdAt", q => q.eq("reviewId", args.reviewId)).collect();
    for (const comment of commentsToDelete) {
        const replies = await ctx.db.query("reviewComments").withIndex("by_parent_createdAt", q => q.eq("parentId", comment._id)).collect();
        for (const reply of replies) { await ctx.db.delete(reply._id); }
        await ctx.db.delete(comment._id);
    }

    await ctx.db.delete(args.reviewId);
    await ctx.scheduler.runAfter(0, internal.reviews.updateAnimeAverageRating, { animeId });
    return true;
  },
});

export const updateAnimeAverageRating = internalMutation({
  args: { animeId: v.id("anime") },
  handler: async (ctx, args) => {
    const reviewsForAnime = await ctx.db.query("reviews").withIndex("by_animeId_createdAt", q => q.eq("animeId", args.animeId)).collect();
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
        console.error(`[Rating Update] Failed to patch anime ${args.animeId}:`, e)
    }
  },
});

export const voteOnReview = mutation({
  args: { reviewId: v.id("reviews"), voteType: v.union(v.literal("up"), v.literal("down")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated.");
    const review = await ctx.db.get(args.reviewId);
    if (!review) throw new Error("Review not found.");
    if (review.userId === userId) throw new Error("You cannot vote on your own review.");

    const existingVote = await ctx.db.query("reviewVotes")
      .withIndex("by_review_user", q => q.eq("reviewId", args.reviewId).eq("userId", userId as Id<"users">))
      .unique();

    if (existingVote) {
      if (existingVote.voteType === args.voteType) {
        await ctx.db.delete(existingVote._id);
      } else {
        await ctx.db.patch(existingVote._id, { voteType: args.voteType });
      }
    } else {
      await ctx.db.insert("reviewVotes", { reviewId: args.reviewId, userId: userId as Id<"users">, voteType: args.voteType });
    }
    await ctx.scheduler.runAfter(0, internal.reviews.updateReviewVoteCounts, { reviewId: args.reviewId });
    return true;
  },
});

export const updateReviewVoteCounts = internalMutation({
    args: { reviewId: v.id("reviews") },
    handler: async (ctx, args) => {
        const votes = await ctx.db.query("reviewVotes").withIndex("by_review_user", q => q.eq("reviewId", args.reviewId)).collect();
        const upvotes = votes.filter(v => v.voteType === "up").length;
        const downvotes = votes.filter(v => v.voteType === "down").length;
        try {
            await ctx.db.patch(args.reviewId, { upvotes, downvotes });
        } catch(e) {
            console.error(`[Vote Count Update] Failed for review ${args.reviewId}:`, e);
        }
    }
});

export const addReviewComment = mutation({
  args: { reviewId: v.id("reviews"), commentText: v.string(), parentId: v.optional(v.id("reviewComments")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated.");
    if (args.commentText.trim() === "") throw new Error("Comment cannot be empty.");
    const review = await ctx.db.get(args.reviewId);
    if (!review) throw new Error("Review not found.");

    return await ctx.db.insert("reviewComments", {
      reviewId: args.reviewId, userId: userId as Id<"users">, commentText: args.commentText, parentId: args.parentId, createdAt: Date.now(),
    });
  },
});

export const getReviewComments = query({
    args: { reviewId: v.id("reviews"), paginationOpts: v.any() },
    handler: async (ctx, args) => {
        const commentsPaginated = await ctx.db.query("reviewComments")
            .withIndex("by_review_createdAt", q => q.eq("reviewId", args.reviewId))
            .filter(q => q.eq(q.field("parentId"), undefined))
            .order("asc")
            .paginate(args.paginationOpts);

        const commentsWithDetailsPromises = commentsPaginated.page.map(async (comment) => {
            const userProfile = await ctx.db.query("userProfiles").withIndex("by_userId", q => q.eq("userId", comment.userId as Id<"users">)).unique();
            const repliesRaw = await ctx.db.query("reviewComments")
                .withIndex("by_parent_createdAt", q => q.eq("parentId", comment._id)) // Query for replies to this comment
                .order("asc").collect();

            const repliesWithDetailsPromises = repliesRaw.map(async reply => {
                const replyUserProfile = await ctx.db.query("userProfiles").withIndex("by_userId", q => q.eq("userId", reply.userId as Id<"users">)).unique();
                return {...reply, userName: replyUserProfile?.name || "User", userAvatarUrl: replyUserProfile?.avatarUrl };
            });
            const repliesWithDetails = await Promise.all(repliesWithDetailsPromises);

            return { ...comment, userName: userProfile?.name || "User", userAvatarUrl: userProfile?.avatarUrl, replies: repliesWithDetails };
        });
        const commentsWithDetails = await Promise.all(commentsWithDetailsPromises);
        return {...commentsPaginated, page: commentsWithDetails };
    }
});

export const editReviewComment = mutation({
  args: {
    commentId: v.id("reviewComments"),
    commentText: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated.");
    if (args.commentText.trim() === "") throw new Error("Comment cannot be empty.");

    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found.");
    if (comment.userId !== userId) throw new Error("Not authorized to edit this comment.");

    await ctx.db.patch(args.commentId, {
      commentText: args.commentText,
      updatedAt: Date.now(),
    });
    return args.commentId;
  },
});

export const deleteReviewComment = mutation({
  args: {
    commentId: v.id("reviewComments"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated.");

    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found.");

    // Check if user is the author or an admin
    const userProfile = await ctx.db.query("userProfiles").withIndex("by_userId", q => q.eq("userId", userId as Id<"users">)).unique();
    if (comment.userId !== userId && !userProfile?.isAdmin) {
      throw new Error("Not authorized to delete this comment.");
    }

    // Recursively delete replies first
    const replies = await ctx.db.query("reviewComments")
      .withIndex("by_parent_createdAt", q => q.eq("parentId", args.commentId))
      .collect();

    for (const reply of replies) {
      // For deep replies, this would need to be a recursive call or a loop that processes children first.
      // For simplicity, assuming only one level of replies for now or that deleteReviewComment is called for each.
      // A more robust solution would be a separate internal helper function for recursive deletion.
      const nestedReplies = await ctx.db.query("reviewComments")
          .withIndex("by_parent_createdAt", q => q.eq("parentId", reply._id))
          .collect();
      for (const nestedReply of nestedReplies) {
          await ctx.db.delete(nestedReply._id); // Delete grandchildren
      }
      await ctx.db.delete(reply._id); // Delete direct children
    }

    // Delete the main comment
    await ctx.db.delete(args.commentId);
    return true;
  },
});