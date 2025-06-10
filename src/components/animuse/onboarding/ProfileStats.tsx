// src/components/animuse/onboarding/ProfileStats.tsx - Advanced Artistic Version
import React, { memo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { WatchlistStatusFilter } from "../onboarding/watchlistTypes";

const StatsLoadingSpinner: React.FC = memo(() => (
  <div className="flex items-center justify-center p-8">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-transparent border-t-brand-primary-action border-r-brand-accent-gold rounded-full animate-spin"></div>
      <div className="absolute top-1 left-1 w-10 h-10 border-4 border-transparent border-b-brand-accent-peach border-l-white/50 rounded-full animate-spin animate-reverse"></div>
      <div className="absolute top-3 left-3 w-6 h-6 bg-gradient-to-r from-brand-primary-action to-brand-accent-gold rounded-full animate-pulse"></div>
    </div>
    <div className="ml-4 text-white/80 text-sm animate-pulse">Loading your anime journey...</div>
  </div>
));

interface ProfileStatsProps {
  filterStatus: WatchlistStatusFilter;
  onFilterChange: (status: WatchlistStatusFilter) => void;
}

const ProfileStatsComponent: React.FC<ProfileStatsProps> = ({
  filterStatus,
  onFilterChange,
}) => {
  const stats = useQuery(api.users.getMyProfileStats);

  if (stats === undefined) {
    return <StatsLoadingSpinner />;
  }
  
  if (stats === null) {
    return (
      <div className="bg-black/30 backdrop-blur-sm border border-red-500/30 rounded-3xl p-6 text-center">
        <div className="text-4xl mb-2">📊</div>
        <p className="text-red-400 text-sm">Could not load your watchlist stats.</p>
      </div>
    );
  }

  const statItems = [
    { 
      label: "Watching", 
      value: stats.watchingCount, 
      icon: "👁️", 
      color: "from-blue-500 to-cyan-400",
      description: "Currently enjoying"
    },
    { 
      label: "Completed", 
      value: stats.completedCount, 
      icon: "✅", 
      color: "from-green-500 to-emerald-400",
      description: "Finished series"
    },
    { 
      label: "Plan to Watch", 
      value: stats.planToWatchCount, 
      icon: "📝", 
      color: "from-yellow-500 to-orange-400",
      description: "In your queue"
    },
    { 
      label: "Dropped", 
      value: stats.droppedCount, 
      icon: "⏸️", 
      color: "from-red-500 to-pink-400",
      description: "Set aside"
    },
  ];

  return (
    <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-block">
          <h3 className="text-2xl sm:text-3xl font-heading text-white font-bold mb-2">
            Your Anime Journey
          </h3>
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-white/50 to-transparent animate-pulse"></div>
        </div>
        <p className="text-white/70 text-sm mt-3">Track your progress through the anime universe</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {statItems.map((item, index) => (
          <div
            key={item.label}
            onClick={() => onFilterChange(item.label as WatchlistStatusFilter)}
            className={`group relative transform transition-all duration-300 hover:scale-105 cursor-pointer ${
              filterStatus === item.label ? 'ring-2 ring-white/60 scale-105' : ''
            }`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Glow Effect */}
            <div className={`absolute -inset-2 bg-gradient-to-r ${item.color} rounded-2xl blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-300`}></div>
            
            <div
              className={`relative bg-black/40 backdrop-blur-sm border rounded-2xl p-4 sm:p-6 text-center group-hover:border-white/30 transition-all duration-300 ${
                filterStatus === item.label ? 'border-white/60' : 'border-white/10'
              }`}
            >
              {/* Icon */}
              <div className="text-3xl sm:text-4xl mb-3 group-hover:animate-bounce transition-all duration-300">
                {item.icon}
              </div>
              
              {/* Number */}
              <div className={`text-2xl sm:text-3xl font-bold bg-gradient-to-r ${item.color} bg-clip-text text-transparent mb-2`}>
                {item.value || 0}
              </div>
              
              {/* Label */}
              <div className="text-white font-medium text-sm sm:text-base mb-1">
                {item.label}
              </div>
              
              {/* Description */}
              <div className="text-white/60 text-xs">
                {item.description}
              </div>
              
              {/* Progress Bar */}
              <div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r ${item.color} transition-all duration-1000 ease-out`}
                  style={{ 
                    width: `${Math.min(100, ((item.value || 0) / Math.max(1, stats.totalWatchlistItems || 1)) * 100)}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Total Summary */}
      <div
        className="relative cursor-pointer"
        onClick={() => onFilterChange('All')}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-brand-primary-action/20 to-brand-accent-gold/20 rounded-2xl blur-xl"></div>
        <div
          className={`relative bg-black/40 backdrop-blur-sm border rounded-2xl p-6 text-center ${
            filterStatus === 'All' ? 'border-white/60' : 'border-white/20'
          }`}
        >
          <div className="flex items-center justify-center space-x-3 mb-3">
            <span className="text-2xl">🏆</span>
            <h4 className="text-xl font-heading text-white">Total Collection</h4>
            <span className="text-2xl">📚</span>
          </div>
          
          <div className="text-4xl font-bold bg-gradient-to-r from-brand-primary-action to-brand-accent-gold bg-clip-text text-transparent mb-2">
            {stats.totalWatchlistItems || 0}
          </div>
          
          <div className="text-white/80 text-sm">
            Anime in your personal library
          </div>
          
          {/* Achievement Level */}
          {(stats.totalWatchlistItems || 0) > 0 && (
            <div className="mt-4 inline-flex items-center space-x-2 bg-gradient-to-r from-brand-primary-action/20 to-brand-accent-gold/20 rounded-full px-4 py-2 border border-white/10">
              <span className="text-sm">
                {(stats.totalWatchlistItems || 0) >= 100 ? "🌟 Anime Connoisseur" :
                 (stats.totalWatchlistItems || 0) >= 50 ? "⭐ Dedicated Fan" :
                 (stats.totalWatchlistItems || 0) >= 20 ? "🎭 Rising Otaku" :
                 (stats.totalWatchlistItems || 0) >= 5 ? "📱 Getting Started" :
                 "🌱 New Explorer"
                }
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      {(stats.totalWatchlistItems || 0) === 0 && (
        <div className="mt-6 text-center">
          <div className="bg-gradient-to-r from-brand-accent-peach/20 to-brand-primary-action/20 rounded-2xl p-6 border border-white/10">
            <div className="text-6xl mb-4">🚀</div>
            <h4 className="text-lg font-heading text-white mb-2">Start Your Journey!</h4>
            <p className="text-white/70 text-sm mb-4">
              Discover amazing anime and build your personal collection
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-white text-xs hover:bg-white/20 transition-all duration-300">
                🔍 Browse Anime
              </button>
              <button className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-white text-xs hover:bg-white/20 transition-all duration-300">
                🤖 Get AI Recommendations
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(ProfileStatsComponent);