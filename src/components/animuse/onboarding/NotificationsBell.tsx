 // src/components/animuse/shared/NotificationsBell.tsx
import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import StyledButton from "../shared/StyledButton"; // Assuming you might want to style it like a button

interface NotificationsBellProps {
  onTogglePanel: () => void; // Callback to open/close the notifications panel
}

const NotificationsBell: React.FC<NotificationsBellProps> = ({ onTogglePanel }) => {
  const unreadCount = useQuery(api.notifications.getUnreadNotificationsCount);

  return (
    <button
      onClick={onTogglePanel}
      className="relative p-2 rounded-full hover:bg-brand-surface focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:ring-opacity-50"
      aria-label="Toggle notifications panel"
    >
      {/* Bell Icon (using SVG for now, replace with an icon library if you have one) */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6 text-brand-text-secondary group-hover:text-neon-cyan"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>

      {unreadCount !== undefined && unreadCount > 0 && (
        <span
          className="absolute top-0 right-0 block h-5 w-5 transform -translate-y-1/2 translate-x-1/2 rounded-full ring-2 ring-brand-dark bg-sakura-pink text-white text-xs flex items-center justify-center"
          aria-label={`${unreadCount} unread notifications`}
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
};

export default NotificationsBell;