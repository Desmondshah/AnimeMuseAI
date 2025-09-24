// convex/reels.ts
import { action, mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id, Doc } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

export const generateUploadUrl = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const createReel = mutation({
  args: {
    storageId: v.id("_storage"),
    mediaType: v.union(v.literal("video"), v.literal("image")),
    caption: v.optional(v.string()),
    aspectRatio: v.optional(v.number()),
    durationMs: v.optional(v.number()),
    thumbnailStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const docId = await ctx.db.insert("reels", {
      userId: userId as Id<"users">,
      storageId: args.storageId,
      mediaType: args.mediaType,
      caption: args.caption,
      createdAt: Date.now(),
      likesCount: 0,
      viewsCount: 0,
      aspectRatio: args.aspectRatio,
      durationMs: args.durationMs,
      thumbnailStorageId: args.thumbnailStorageId,
    });

    return docId;
  },
});

export const getFeed = query({
  args: {
    cursor: v.optional(v.number()), // createdAt cursor for pagination (older)
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { cursor, limit }) => {
    const PAGE = Math.min(Math.max(limit ?? 10, 1), 30);
    const q = ctx.db.query("reels").withIndex("by_createdAt", (q) =>
      cursor ? q.lt("createdAt", cursor) : q
    );
    const items = await q.order("desc").take(PAGE);
    return {
      items,
      nextCursor: items.length === PAGE ? items[items.length - 1].createdAt : null,
    };
  },
});

export const getUserReels = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("reels")
      .withIndex("by_userId_createdAt", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const toggleLike = mutation({
  args: { reelId: v.id("reels") },
  handler: async (ctx, { reelId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("reelLikes")
      .withIndex("by_reel_user", (q) => q.eq("reelId", reelId).eq("userId", userId as Id<"users">))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      const reel = await ctx.db.get(reelId);
      if (reel) await ctx.db.patch(reelId, { likesCount: Math.max(0, (reel.likesCount ?? 1) - 1) });
      return { liked: false };
    } else {
      await ctx.db.insert("reelLikes", {
        reelId,
        userId: userId as Id<"users">,
        createdAt: Date.now(),
      });
      const reel = await ctx.db.get(reelId);
      if (reel) await ctx.db.patch(reelId, { likesCount: (reel.likesCount ?? 0) + 1 });
      return { liked: true };
    }
  },
});

export const addView = mutation({
  args: { reelId: v.id("reels") },
  handler: async (ctx, { reelId }) => {
    const reel = await ctx.db.get(reelId);
    if (!reel) throw new Error("Reel not found");
    await ctx.db.patch(reelId, { viewsCount: (reel.viewsCount ?? 0) + 1 });
  },
});

export const getSignedUrl = action({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    // Provide a temporary URL to access media
    return await ctx.storage.getUrl(storageId);
  },
});

export const deleteReel = mutation({
  args: { reelId: v.id("reels") },
  handler: async (ctx, { reelId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const reel = await ctx.db.get(reelId);
    if (!reel) throw new Error("Reel not found");
    if (reel.userId !== (userId as Id<"users">)) {
      throw new Error("Not authorized to delete this reel");
    }

    // Delete likes associated with this reel
    const likes = await ctx.db
      .query("reelLikes")
      .withIndex("by_reel_user", (q) => q.eq("reelId", reelId))
      .collect();
    await Promise.all(likes.map((l) => ctx.db.delete(l._id)));

    // Delete stored media (thumbnail first, then original)
    try {
      if (reel.thumbnailStorageId) {
        await ctx.storage.delete(reel.thumbnailStorageId);
      }
      if (reel.storageId) {
        await ctx.storage.delete(reel.storageId);
      }
    } catch (e) {
      // Proceed even if storage delete fails; log in server console
      console.error("Storage delete error:", e);
    }

    // Finally, delete the reel document
    await ctx.db.delete(reelId);
    return { success: true };
  },
});
