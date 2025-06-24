// src/components/animuse/onboarding/ProfileStats.tsx - BRUTALIST AESTHETIC Version
import React, { memo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { WatchlistStatusFilter } from "../onboarding/watchlistTypes";

// BRUTALIST LOADING SPINNER
const BrutalistStatsLoadingSpinner: React.FC = memo(() => (
  <div className="flex items-center justify-center p-8">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-black bg-brand-primary-action animate-spin"></div>
      <div className="absolute top-1 left-1 w-10 h-10 border-4 border-black bg-white animate-spin animate-reverse"></div>
      <div className="absolute top-3 left-3 w-6 h-6 bg-black animate-pulse"></div>
    </div>
    <div className="ml-4 bg-white border-2 border-black px-3 py-1">
      <span className="text-black font-black text-sm uppercase">LOADING STATS...</span>
    </div>
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
    return <BrutalistStatsLoadingSpinner />;
  }
  
  if (stats === null) {
    return (
      <div className="bg-red-500 border-4 border-black shadow-brutal-lg p-6 text-center">
        <div className="bg-white border-4 border-black p-4">
          <div className="text-4xl mb-2">📊</div>
          <p className="text-black font-black text-sm uppercase">COULD NOT LOAD STATS</p>
        </div>
      </div>
    );
  }

  const statItems = [
    { 
      label: "Watching", 
      value: stats.watchingCount, 
      icon: "👁️", 
      color: "bg-blue-500",
      textColor: "text-white"
    },
    { 
      label: "Completed", 
      value: stats.completedCount, 
      icon: "✅", 
      color: "bg-green-500",
      textColor: "text-white"
    },
    { 
      label: "Plan to Watch", 
      value: stats.planToWatchCount, 
      icon: "📝", 
      color: "bg-yellow-500",
      textColor: "text-black"
    },
    { 
      label: "Dropped", 
      value: stats.droppedCount, 
      icon: "⏸️", 
      color: "bg-red-500",
      textColor: "text-white"
    },
  ];

  return (
    <div className="space-y-6">
      {/* BRUTAL HEADER */}
      <div className="text-center">
        <div className="bg-brand-primary-action border-4 border-black p-4 mb-4">
          <h3 className="text-2xl font-black text-black uppercase tracking-wider">
            YOUR ANIME JOURNEY
          </h3>
        </div>
        <div className="bg-white border-4 border-black p-3">
          <p className="text-black font-bold text-sm uppercase">TRACK YOUR PROGRESS THROUGH THE ANIME UNIVERSE</p>
        </div>
      </div>

      {/* BRUTAL STATS GRID */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {statItems.map((item, index) => (
          <button
            key={item.label}
            onClick={() => onFilterChange(item.label as WatchlistStatusFilter)}
            className={`transform transition-all duration-200 active:scale-95 ${
              filterStatus === item.label ? 'scale-105' : ''
            }`}
          >
            <div className={`bg-black border-4 border-white shadow-brutal-lg p-4 hover:border-brand-primary-action transition-all duration-200 ${
              filterStatus === item.label ? 'border-brand-primary-action' : ''
            }`}>
              
              {/* Icon */}
              <div className="bg-white border-4 border-black p-3 mb-3 text-center">
                <div className="text-2xl">{item.icon}</div>
              </div>
              
              {/* Number */}
              <div className={`${item.color} border-4 border-black p-3 mb-2 text-center shadow-brutal`}>
                <div className={`text-2xl font-black ${item.textColor}`}>
                  {item.value || 0}
                </div>
              </div>
              
              {/* Label */}
              <div className="bg-white border-2 border-black p-2 text-center">
                <div className="text-black font-black text-xs uppercase tracking-wider">
                  {item.label}
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-3 bg-white border-2 border-black p-1">
                <div className="h-2 bg-gray-300 border border-black">
                  <div 
                    className={`h-full ${item.color} transition-all duration-1000 ease-out`}
                    style={{ 
                      width: `${Math.min(100, ((item.value || 0) / Math.max(1, stats.totalWatchlistItems || 1)) * 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* BRUTAL TOTAL SUMMARY */}
      <button
        className="w-full transform transition-all duration-200 active:scale-95"
        onClick={() => onFilterChange('All')}
      >
        <div className={`bg-black border-4 border-white shadow-brutal-lg p-6 hover:border-brand-primary-action transition-all duration-200 ${
          filterStatus === 'All' ? 'border-brand-primary-action' : ''
        }`}>
          
          {/* Header */}
          <div className="bg-brand-accent-gold border-4 border-black p-4 mb-4">
            <div className="flex items-center justify-center space-x-3">
              <span className="text-2xl">🏆</span>
              <h4 className="text-xl font-black text-black uppercase tracking-wider">TOTAL COLLECTION</h4>
              <span className="text-2xl">📚</span>
            </div>
          </div>
          
          {/* Total Number */}
          <div className="bg-white border-4 border-black p-4 mb-4">
            <div className="text-4xl font-black text-black">
              {stats.totalWatchlistItems || 0}
            </div>
          </div>
          
          {/* Description */}
          <div className="bg-gray-200 border-2 border-black p-3 mb-4">
            <div className="text-black font-bold text-sm uppercase">
              ANIME IN YOUR PERSONAL LIBRARY
            </div>
          </div>
          
          {/* Achievement Level */}
          {(stats.totalWatchlistItems || 0) > 0 && (
            <div className="bg-brand-primary-action border-4 border-black p-3">
              <span className="text-black font-black text-sm uppercase">
                {(stats.totalWatchlistItems || 0) >= 100 ? "🌟 ANIME CONNOISSEUR" :
                 (stats.totalWatchlistItems || 0) >= 50 ? "⭐ DEDICATED FAN" :
                 (stats.totalWatchlistItems || 0) >= 20 ? "🎭 RISING OTAKU" :
                 (stats.totalWatchlistItems || 0) >= 5 ? "📱 GETTING STARTED" :
                 "🌱 NEW EXPLORER"
                }
              </span>
            </div>
          )}
        </div>
      </button>

      {/* BRUTAL QUICK ACTIONS FOR EMPTY STATE */}
      {(stats.totalWatchlistItems || 0) === 0 && (
        <div className="bg-black border-4 border-white shadow-brutal-lg p-6">
          <div className="bg-white border-4 border-black p-6 mb-4 text-center">
            <div className="text-6xl mb-4">🚀</div>
            <h4 className="text-lg font-black text-black uppercase mb-2">START YOUR JOURNEY!</h4>
            <p className="text-black font-bold text-sm uppercase">
              DISCOVER AMAZING ANIME AND BUILD YOUR COLLECTION
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3 justify-center">
            <button className="bg-brand-primary-action border-4 border-black px-4 py-2 font-black text-black text-xs uppercase tracking-wider shadow-brutal hover:bg-blue-400 transition-all active:scale-95">
              🔍 BROWSE ANIME
            </button>
            <button className="bg-brand-accent-gold border-4 border-black px-4 py-2 font-black text-black text-xs uppercase tracking-wider shadow-brutal hover:bg-yellow-400 transition-all active:scale-95">
              🤖 AI RECOMMENDATIONS
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileStatsComponent;