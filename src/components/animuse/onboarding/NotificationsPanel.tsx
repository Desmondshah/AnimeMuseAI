// src/components/animuse/shared/NotificationsPanel.tsx - Update NotificationItem
import React, { memo, useCallback } from "react"; // Import memo and useCallback
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

// Define NotificationItem outside or ensure it's stable if defined inside.
// For memoization to be effective with props like onMarkAsRead,
// the function passed from the parent should be memoized with useCallback.
const NotificationItemComponent: React.FC<{
  notification: Doc<"notifications">,
  onMarkAsRead: (id: Id<"notifications">) => void,
  // Assuming onNavigate might be added if links become directly navigable
  // onNavigate: (link: string) => void 
}> = ({ notification, onMarkAsRead }) => {
  const handleNotificationClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification._id);
    }
    if (notification.link) {
      console.log("Navigate to:", notification.link);
      // For actual navigation, you'd use your routing solution here.
      // e.g., if using React Router: history.push(notification.link) or navigate(notification.link)
      toast.info(`Link clicked: ${notification.link} (navigation not fully implemented)`);
    }
  };

  return (
    <div
      className={`p-3 border-b border-brand-surface last:border-b-0 hover:bg-brand-dark transition-colors cursor-pointer ${
        notification.isRead ? "opacity-70" : "bg-brand-surface/30"
      }`}
      onClick={handleNotificationClick}
    >
      <p className="text-sm text-brand-text mb-1">{notification.message}</p>
      <div className="flex justify-between items-center">
        <p className="text-xs text-brand-text-secondary">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
        {!notification.isRead && (
          <button
            onClick={(e) => {
              e.stopPropagation(); 
              onMarkAsRead(notification._id);
            }}
            className="text-xs text-electric-blue hover:underline focus:outline-none"
            aria-label="Mark as read"
          >
            Mark read
          </button>
        )}
      </div>
    </div>
  );
};
const NotificationItem = memo(NotificationItemComponent); // Memoize NotificationItem

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ isOpen, onClose }) => {
  const { isAuthenticated } = useConvexAuth();
  const {
    results: notifications,
    status,
    loadMore,
    isLoading,
  } = usePaginatedQuery(
    api.notifications.getMyNotifications,
    (isOpen && isAuthenticated) ? {} : "skip",
    { initialNumItems: 7 }
  );

  const markAsReadMutation = useMutation(api.notifications.markNotificationAsRead);
  const markAllAsReadMutation = useMutation(api.notifications.markAllNotificationsAsRead);

  // Memoize handleMarkAsRead because it's passed to NotificationItem
  const handleMarkAsRead = useCallback(async (notificationId: Id<"notifications">) => {
    try {
      await markAsReadMutation({ notificationId });
      // No toast here to avoid noise for a common action, list will re-render
    } catch (error) {
      toast.error("Failed to mark notification as read.");
      console.error(error);
    }
  }, [markAsReadMutation]); // Dependency array for useCallback

  const handleMarkAllAsRead = useCallback(async () => {
    const unreadCount = notifications ? notifications.filter(n => !n.isRead).length : 0;
    if (unreadCount === 0) {
        toast.info("No unread notifications to mark.");
        return;
    }
    try {
      const result = await markAllAsReadMutation({});
      toast.success(`Marked ${result.count} notifications as read.`);
    } catch (error) {
      toast.error("Failed to mark all notifications as read.");
      console.error(error);
    }
  }, [markAllAsReadMutation, notifications]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="absolute top-14 right-0 mt-2 w-80 sm:w-96 max-h-[70vh] overflow-y-auto
                 bg-brand-surface rounded-lg shadow-xl z-50 border border-electric-blue/30
                 flex flex-col"
    >
      <div className="p-3 border-b border-brand-dark flex justify-between items-center sticky top-0 bg-brand-surface/80 backdrop-blur-sm z-10">
        <h3 className="text-lg font-orbitron text-neon-cyan">Notifications</h3>
        <StyledButton
            onClick={handleMarkAllAsRead}
            variant="secondary_small"
            className="text-xs"
            disabled={isLoading || (notifications ? notifications.filter(n => !n.isRead).length : 0) === 0}
        >
            Mark All Read
        </StyledButton>
      </div>

      {isLoading && status === "LoadingFirstPage" && (
        <div className="p-4 text-center text-brand-text-secondary">Loading notifications...</div>
      )}

      {!isLoading && (!notifications || notifications.length === 0) && (
        <div className="p-6 text-center text-brand-text-secondary">
          You have no notifications yet.
        </div>
      )}

      {notifications && notifications.length > 0 && (
        <div className="flex-grow overflow-y-auto">
          {notifications.map((notification) => (
            <NotificationItem 
              key={notification._id} 
              notification={notification} 
              onMarkAsRead={handleMarkAsRead} 
            />
          ))}
          {status === "CanLoadMore" && (
            <div className="p-3 text-center">
              <StyledButton onClick={() => loadMore(5)} disabled={isLoading} variant="primary_small">
                Load More
              </StyledButton>
            </div>
          )}
           {status === "Exhausted" && notifications.length > 0 && (
             <p className="p-3 text-xs text-center text-brand-text-secondary">No more notifications.</p>
           )}
        </div>
      )}
       <button
          onClick={onClose}
          className="sticky bottom-0 w-full p-2 bg-brand-dark hover:bg-electric-blue text-brand-text-secondary hover:text-white transition-colors text-sm focus:outline-none"
          aria-label="Close notifications panel"
        >
          Close
        </button>
    </div>
  );
};

export default memo(NotificationsPanel); // Also memoize NotificationsPanel if its props (isOpen, onClose) are stable