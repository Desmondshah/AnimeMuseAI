// src/components/animuse/onboarding/NotificationsBell.tsx
import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
// StyledButton is not strictly necessary here if we want a very custom icon-only button,
// but we can use its base structure for focus rings if desired, or just style a normal button.
// For simplicity, I'll style a normal button, leveraging Tailwind's group-hover.

interface NotificationsBellProps {
  onTogglePanel: () => void;
}

const NotificationsBell: React.FC<NotificationsBellProps> = ({ onTogglePanel }) => {
  const unreadCount = useQuery(api.notifications.getUnreadNotificationsCount);

  return (
    <button
      onClick={onTogglePanel}
      className="relative p-2 rounded-full group focus:outline-none focus:ring-2 focus:ring-brand-primary-action focus:ring-offset-2 focus:ring-offset-brand-background transition-colors duration-150 ease-in-out hover:bg-brand-accent-gold/10" // Themed focus and hover for dark header
      aria-label="Toggle notifications panel"
    >
      {/* Bell Icon SVG - Themed */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 sm:h-6 sm:h-6 text-brand-text-on-dark/80 group-hover:text-brand-primary-action transition-colors" // Themed icon color
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8} // Slightly thinner stroke for a cleaner look
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>

      {/* Notification Badge - Themed */}
      {unreadCount !== undefined && unreadCount > 0 && (
        <span
          className="absolute top-0.5 right-0.5 block h-4 w-4 sm:h-[18px] sm:w-[18px] transform translate-x-1/3 -translate-y-1/3 rounded-full ring-2 ring-brand-background bg-brand-primary-action text-brand-surface text-[9px] sm:text-[10px] font-bold flex items-center justify-center"
          aria-label={`${unreadCount} unread notifications`}
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
};

export default NotificationsBell;