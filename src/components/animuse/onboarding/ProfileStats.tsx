// src/components/animuse/onboarding/ProfileStats.tsx
import React, { memo } from "react"; // Added memo
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

// Simple themed loading spinner for this component
const StatsLoadingSpinner: React.FC = memo(() => (
  <div className="flex items-center justify-center p-4 text-xs text-brand-text-primary/70">
    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-primary-action mr-2"></div>
    Loading stats...
  </div>
));

const ProfileStatsComponent: React.FC = () => {
  const stats = useQuery(api.users.getMyProfileStats);

  if (stats === undefined) {
    return <StatsLoadingSpinner />;
  }
  if (stats === null) {
    return <div className="bg-brand-accent-peach/20 p-3 sm:p-4 rounded-lg text-brand-text-primary text-xs sm:text-sm text-center">Could not load your watchlist stats.</div>;
  }

  const statItems = [
    { label: "Watching", value: stats.watchingCount },
    { label: "Completed", value: stats.completedCount },
    { label: "Plan to Watch", value: stats.planToWatchCount },
    { label: "Dropped", value: stats.droppedCount },
  ];

  return (
    // Card styled with a subtle background to stand out on a brand-surface page
    <div className="bg-brand-accent-peach/10 text-brand-text-primary p-3 sm:p-4 rounded-lg shadow-sm border border-brand-accent-peach/30 mt-4 sm:mt-6">
      <h3 className="text-sm sm:text-base font-heading text-brand-primary-action mb-2 sm:mb-3 font-semibold">
        Your Watchlist Snapshot
      </h3>
      <div className="grid grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-1.5 sm:gap-y-2 text-xs sm:text-sm">
        {statItems.map(item => (
          <p key={item.label} className="text-brand-text-primary/90">
            <span className="font-bold text-brand-accent-gold">{item.value || 0}</span> {item.label}
          </p>
        ))}
        <p className="col-span-2 mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-brand-accent-peach/30 text-brand-text-primary/90">
          <span className="font-bold text-brand-accent-gold">{stats.totalWatchlistItems || 0}</span> Total in Watchlist
        </p>
      </div>
    </div>
  );
}

export default memo(ProfileStatsComponent);