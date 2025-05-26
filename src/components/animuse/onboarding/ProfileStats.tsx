// src/components/animuse/ProfileStats.tsx
import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export default function ProfileStats() {
  const stats = useQuery(api.users.getMyProfileStats);

  if (stats === undefined) {
    return <div className="p-2 text-sm text-brand-text-secondary">Loading stats...</div>;
  }
  if (stats === null) {
    return <div className="p-2 text-sm text-brand-text-secondary">Could not load stats.</div>;
  }

  return (
    <div className="neumorphic-card p-4 mt-6">
      <h3 className="text-xl font-orbitron text-neon-cyan mb-3">Your Watchlist Stats</h3>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <p><span className="font-semibold text-brand-text">{stats.watchingCount || 0}</span> Watching</p>
        <p><span className="font-semibold text-brand-text">{stats.completedCount || 0}</span> Completed</p>
        <p><span className="font-semibold text-brand-text">{stats.planToWatchCount || 0}</span> Plan to Watch</p>
        <p><span className="font-semibold text-brand-text">{stats.droppedCount || 0}</span> Dropped</p>
        <p className="col-span-2 mt-2">
          <span className="font-semibold text-brand-text">{stats.totalWatchlistItems || 0}</span> Total Anime in Watchlist
        </p>
      </div>
    </div>
  );
}