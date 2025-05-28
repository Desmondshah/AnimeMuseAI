// src/components/animuse/onboarding/NotificationsPanel.tsx
import React, { memo, useCallback } from "react";
import { usePaginatedQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Doc, Id } from "../../../../convex/_generated/dataModel";
import StyledButton from "../shared/StyledButton";
import { formatDistanceToNow } from 'date-fns';
import { toast } from "sonner";

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Themed NotificationItem
const NotificationItemComponent: React.FC<{
  notification: Doc<"notifications">,
  onMarkAsRead: (id: Id<"notifications">) => void,
  onClosePanel: () => void; // To close panel on item click
}> = ({ notification, onMarkAsRead, onClosePanel }) => {

  const handleNotificationClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification._id);
    }
    if (notification.link) {
      // Basic navigation for now, replace with router if available
      // For example, if link is /anime/someId, it would require router integration.
      // For external links, window.open(notification.link, '_blank') might be an option.
      toast.info(`Navigating to: ${notification.link} (stubbed)`);
      // Assuming for now that clicking a notification with a link also closes the panel.
      onClosePanel();
    }
  };

  return (
    <div
      className={`p-2.5 sm:p-3 border-b border-brand-accent-peach/20 last:border-b-0 transition-colors cursor-pointer ${
        notification.isRead
          ? "opacity-70 hover:bg-brand-accent-peach/10" // Subtle hover for read items
          : "bg-brand-accent-peach/10 hover:bg-brand-accent-peach/20 font-medium" // Highlight for unread
      }`}
      onClick={handleNotificationClick}
      role="listitem"
    >
      <p className="text-xs sm:text-sm text-brand-text-primary/90 mb-0.5 leading-snug">
        {notification.message}
      </p>
      <div className="flex justify-between items-center">
        <p className="text-[10px] sm:text-xs text-brand-text-primary/60">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
        {!notification.isRead && (
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent handleNotificationClick if only marking as read
              onMarkAsRead(notification._id);
            }}
            className="text-[10px] sm:text-xs text-brand-accent-gold hover:text-brand-primary-action hover:underline focus:outline-none font-semibold"
            aria-label="Mark as read"
          >
            Mark Read
          </button>
        )}
      </div>
    </div>
  );
};
const NotificationItem = memo(NotificationItemComponent);

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ isOpen, onClose }) => {
  const { isAuthenticated } = useConvexAuth();
  const {
    results: notifications,
    status,
    loadMore,
    isLoading, // This is true when loading first page or more items
  } = usePaginatedQuery(
    api.notifications.getMyNotifications,
    (isOpen && isAuthenticated) ? {} : "skip", // Query options
    { initialNumItems: 7 } // Pagination options
  );

  const markAsReadMutation = useMutation(api.notifications.markNotificationAsRead);
  const markAllAsReadMutation = useMutation(api.notifications.markAllNotificationsAsRead);

  const handleMarkAsRead = useCallback(async (notificationId: Id<"notifications">) => {
    try {
      await markAsReadMutation({ notificationId });
    } catch (error) {
      toast.error("Failed to mark as read.");
      console.error("Mark as read error:", error);
    }
  }, [markAsReadMutation]);

  const handleMarkAllAsRead = useCallback(async () => {
    const unreadCount = notifications ? notifications.filter(n => !n.isRead).length : 0;
    if (unreadCount === 0) {
        // toast.info("No unread notifications."); // Can be a bit noisy
        return;
    }
    try {
      toast.loading("Marking all as read...", {id: "mark-all-notifs"});
      const result = await markAllAsReadMutation({});
      toast.success(`Marked ${result.count} notifications as read.`, {id: "mark-all-notifs"});
    } catch (error) {
      toast.error("Failed to mark all as read.", {id: "mark-all-notifs"});
      console.error("Mark all as read error:", error);
    }
  }, [markAllAsReadMutation, notifications]);

  if (!isOpen) {
    return null;
  }

  return (
    // Panel container: bg-brand-surface (Cream), text-brand-text-primary (Dark Brown)
    <div
      className="absolute top-12 right-0 mt-1 w-72 sm:w-80 md:w-96 max-h-[calc(100vh-100px)] sm:max-h-[65vh]
                 bg-brand-surface rounded-lg shadow-2xl z-[100] border border-brand-accent-peach/40
                 flex flex-col overflow-hidden custom-scrollbar" // Added custom-scrollbar
        role="dialog"
        aria-modal="true"
        aria-labelledby="notifications-heading"
    >
      {/* Panel Header */}
      <div className="p-3 border-b border-brand-accent-peach/30 flex justify-between items-center sticky top-0 bg-brand-surface/90 backdrop-blur-sm z-10">
        <h3 id="notifications-heading" className="text-base sm:text-lg font-heading text-brand-primary-action">Notifications</h3>
        <StyledButton
            onClick={handleMarkAllAsRead}
            variant="ghost" // Use ghost for a less prominent action
            className="!text-xs !px-2 !py-1 text-brand-accent-gold hover:!text-brand-primary-action"
            disabled={isLoading || (notifications ? notifications.filter(n => !n.isRead).length : 0) === 0}
        >
            Mark All Read
        </StyledButton>
      </div>

      {/* Notifications List */}
      <div className="flex-grow overflow-y-auto custom-scrollbar"> {/* Scrollable area for notifications */}
        {isLoading && status === "LoadingFirstPage" && (
          <div className="p-4 text-center text-xs text-brand-text-primary/70">Loading notifications...</div>
        )}
        {!isLoading && (!notifications || notifications.length === 0) && (
          <div className="p-6 text-center text-sm text-brand-text-primary/70">
            You have no new notifications.
          </div>
        )}

        {notifications && notifications.length > 0 && (
          <div role="list">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onClosePanel={onClose} // Pass onClose to close panel on item click
              />
            ))}
          </div>
        )}
         {status === "CanLoadMore" && (
          <div className="p-2 text-center border-t border-brand-accent-peach/20">
            <StyledButton onClick={() => loadMore(5)} disabled={isLoading && status === "LoadingMore"} variant="secondary_small" className="w-full !text-xs">
              {isLoading && status === "LoadingMore" ? "Loading..." : "Load More"}
            </StyledButton>
          </div>
        )}
        {status === "Exhausted" && notifications && notifications.length > 0 && (
          <p className="p-2 text-[10px] text-center text-brand-text-primary/60">No more notifications.</p>
        )}
      </div>

      {/* Panel Footer (Close Button) */}
       <button
          onClick={onClose}
          className="sticky bottom-0 w-full p-2 bg-brand-background/90 hover:bg-brand-primary-action text-brand-text-on-dark/80 hover:text-brand-surface transition-colors text-xs sm:text-sm font-medium focus:outline-none border-t border-brand-accent-gold/20"
          aria-label="Close notifications panel"
        >
          Close
        </button>
    </div>
  );
};

export default memo(NotificationsPanel);