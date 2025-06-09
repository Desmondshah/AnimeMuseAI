// convex/notifications.ts
import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { PaginationResult } from "convex/server";

// --- Internal Mutations ---
// Used by other backend functions to create notifications for users.
export const internalAddNotification = internalMutation({
  args: {
    userId: v.id("users"),
    message: v.string(),
    link: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", {
      userId: args.userId,
      message: args.message,
      link: args.link,
      isRead: false,
      createdAt: Date.now(),
    });
    console.log(`Notification created for user ${args.userId}: "${args.message}"`);
  },
});

// --- Queries ---

// Get the count of unread notifications for the logged-in user.
export const getUnreadNotificationsCount = query({
  handler: async (ctx): Promise<number> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return 0;
    }

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId_isRead", (q) =>
        q.eq("userId", userId as Id<"users">).eq("isRead", false)
      )
      .collect();

    return unreadNotifications.length;
  },
});

// Get all notifications for the logged-in user, paginated, newest first.
export const getMyNotifications = query({
  args: {
    paginationOpts: v.any(), // Standard Convex pagination options
  },
  handler: async (ctx, args): Promise<PaginationResult<Doc<"notifications">>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      // Return an empty PaginationResult if user is not logged in
      return {
        page: [],
        isDone: true,
        continueCursor: null as any,
        splitCursor: null as any,
      };
    }

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId_createdAt", (q) => q.eq("userId", userId as Id<"users">))
      .order("desc") // Newest first
      .paginate(args.paginationOpts);

    return notifications;
  },
});

// --- Mutations ---

// Mark a specific notification as read.
export const markNotificationAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated.");
    }

    const notification = await ctx.db.get(args.notificationId);

    if (!notification) {
      throw new Error("Notification not found.");
    }

    if (notification.userId !== userId) {
      throw new Error("Not authorized to mark this notification as read.");
    }

    if (notification.isRead) {
      return; // Already read, no change needed
    }

    await ctx.db.patch(args.notificationId, { isRead: true });
  },
});

// Mark all unread notifications for the logged-in user as read.
export const markAllNotificationsAsRead = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated.");
    }

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId_isRead", (q) =>
        q.eq("userId", userId as Id<"users">).eq("isRead", false)
      )
      .collect();

    if (unreadNotifications.length === 0) {
      return { count: 0 }; // No notifications to mark as read
    }

    for (const notification of unreadNotifications) {
      await ctx.db.patch(notification._id, { isRead: true });
    }

    return { count: unreadNotifications.length };
  },
});