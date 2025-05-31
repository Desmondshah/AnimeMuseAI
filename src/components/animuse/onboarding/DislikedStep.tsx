// src/components/animuse/onboarding/DislikedStep.tsx - Mobile-Optimized Version
import React, { useState, useEffect } from "react";
import StyledButton from "../shared/StyledButton";

const DISLIKED_GENRES_OPTIONS = [
  { id: "action", label: "Action", emoji: "⚔️", color: "from-red-500 to-orange-500", description: "Too intense battles" },
  { id: "adventure", label: "Adventure", emoji: "🗺️", color: "from-green-500 to-teal-500", description: "Long journeys" },
  { id: "comedy", label: "Comedy", emoji: "😂", color: "from-yellow-400 to-orange-400", description: "Not funny to me" },
  { id: "drama", label: "Drama", emoji: "🎭", color: "from-purple-500 to-pink-500", description: "Too emotional" },
  { id: "ecchi", label: "Ecchi", emoji: "😳", color: "from-pink-500 to-red-400", description: "Suggestive content" },
  { id: "fantasy", label: "Fantasy", emoji: "🧙‍♂️", color: "from-purple-600 to-indigo-600", description: "Not into magic" },
  { id: "harem", label: "Harem", emoji: "👥", color: "from-pink-400 to-rose-400", description: "Multiple love interests" },
  { id: "horror", label: "Horror", emoji: "👻", color: "from-gray-800 to-red-900", description: "Too scary" },
  { id: "isekai", label: "Isekai", emoji: "🌍", color: "from-blue-500 to-purple-500", description: "Another world trope" },
  { id: "josei", label: "Josei", emoji: "👩", color: "from-pink-400 to-rose-400", description: "Adult women focus" },
  { id: "mecha", label: "Mecha", emoji: "🤖", color: "from-gray-500 to-blue-600", description: "Giant robots" },
  { id: "mystery", label: "Mystery", emoji: "🔍", color: "from-indigo-600 to-purple-700", description: "Confusing plots" },
  { id: "psychological", label: "Psychological", emoji: "🧠", color: "from-purple-700 to-indigo-800", description: "Mind games" },
  { id: "romance", label: "Romance", emoji: "💕", color: "from-pink-500 to-red-400", description: "Love stories" },
  { id: "sciFi", label: "Sci-Fi", emoji: "🚀", color: "from-cyan-500 to-blue-600", description: "Futuristic tech" },
  { id: "seinen", label: "Seinen", emoji: "👨", color: "from-blue-600 to-indigo-600", description: "Adult men focus" },
  { id: "shojo", label: "Shojo", emoji: "🌸", color: "from-pink-300 to-rose-400", description: "Young girls focus" },
  { id: "shonen", label: "Shonen", emoji: "💪", color: "from-orange-500 to-red-500", description: "Young boys focus" },
  { id: "sliceOfLife", label: "Slice of Life", emoji: "☕", color: "from-green-400 to-teal-400", description: "Slow paced" },
  { id: "sports", label: "Sports", emoji: "⚽", color: "from-emerald-500 to-green-600", description: "Athletic focus" },
  { id: "supernatural", label: "Supernatural", emoji: "👁️", color: "from-purple-800 to-indigo-900", description: "Paranormal elements" },
  { id: "thriller", label: "Thriller", emoji: "⚡", color: "from-red-600 to-orange-700", description: "Too suspenseful" },
];

interface DislikedStepProps {
  data: { dislikedGenres: string[]; dislikedTags?: string[] };
  updateData: (data: { dislikedGenres: string[]; dislikedTags?: string[] }) => void;
}

export default function DislikedStep({ data, updateData }: DislikedStepProps) {
  const [hoveredGenre, setHoveredGenre] = useState<string | null>(null);
  const [showOptional, setShowOptional] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleDislikedGenre = (genre: string) => {
    const newDislikedGenres = data.dislikedGenres.includes(genre)
      ? data.dislikedGenres.filter((g) => g !== genre)
      : [...data.dislikedGenres, genre];
    updateData({ ...data, dislikedGenres: newDislikedGenres });
  };

  const selectedCount = data.dislikedGenres.length;

  return (
    <div className="relative min-h-[400px] space-y-4 sm:space-y-6">
      {/* Simplified floating background for mobile */}
      {!isMobile && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-4 left-8 w-20 h-20 bg-gradient-to-br from-red-500/15 to-transparent rounded-full blur-xl animate-pulse"></div>
          <div className="absolute bottom-6 right-12 w-24 h-24 bg-gradient-to-tl from-orange-500/10 to-transparent rounded-full blur-xl animate-pulse delay-1000"></div>
        </div>
      )}

      {/* Header Section - Mobile Optimized */}
      <div className="step-header-section text-center space-y-3 sm:space-y-4">
        <div className="relative inline-block">
          <div className={`relative ${isMobile ? 'bg-black/60' : 'bg-black/30 backdrop-blur-sm'} border border-red-500/20 rounded-2xl p-4 sm:p-6`}>
            <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
              <span className="text-2xl sm:text-3xl">🚫</span>
              <h3 className="step-title text-xl sm:text-2xl md:text-3xl font-heading font-bold">
                <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                  {isMobile ? "Genres to Avoid?" : "Any Genres to Avoid?"}
                </span>
              </h3>
              <span className="text-2xl sm:text-3xl">⚠️</span>
            </div>
            <p className="step-subtitle text-white/80 text-sm sm:text-base leading-relaxed">
              {isMobile 
                ? "Help us filter out what you don't enjoy"
                : "Knowing what you *don't* like is just as important for filtering your recommendations."
              }
            </p>
          </div>
        </div>

        {/* Skip Option / Counter - Mobile Layout */}
        <div className="flex flex-col items-center gap-3">
          {selectedCount === 0 ? (
            <div className="selection-counter inline-flex items-center space-x-2 bg-gradient-to-r from-green-500/20 to-emerald-400/20 backdrop-blur-sm rounded-full px-4 sm:px-6 py-2 border border-green-500/20">
              <span className="text-base sm:text-lg">😊</span>
              <span className="text-white font-medium text-xs sm:text-sm">
                {isMobile ? "Open to most!" : "I'm open to most genres!"}
              </span>
            </div>
          ) : (
            <div className="selection-counter inline-flex items-center space-x-2 bg-gradient-to-r from-red-500/20 to-orange-500/20 backdrop-blur-sm rounded-full px-4 sm:px-6 py-2 border border-red-500/20">
              <span className="text-base sm:text-lg">🛡️</span>
              <span className="text-white font-medium text-xs sm:text-sm">
                {selectedCount} to avoid
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Disliked Genres Grid - Mobile Optimized */}
      <div className={`genre-selection-grid ${isMobile ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-3 lg:grid-cols-4 gap-3'} ${!isMobile && 'max-h-[280px] overflow-y-auto custom-scrollbar pr-2'}`}>
        {DISLIKED_GENRES_OPTIONS.map((genre, index) => {
          const isSelected = data.dislikedGenres.includes(genre.label);
          const isHovered = hoveredGenre === genre.id;
          
          return (
            <div
              key={genre.id}
              className="relative group"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Selection Glow with warning colors - Hidden on mobile */}
              {!isMobile && (
                <div className={`absolute -inset-1 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl blur-md transition-all duration-300 ${
                  isSelected ? 'opacity-60 scale-105' : isHovered ? 'opacity-20' : 'opacity-0'
                }`}></div>
              )}
              
              {/* Genre Card */}
              <button
                onClick={() => toggleDislikedGenre(genre.label)}
                onMouseEnter={() => !isMobile && setHoveredGenre(genre.id)}
                onMouseLeave={() => !isMobile && setHoveredGenre(null)}
                className={`genre-card relative w-full p-3 rounded-xl border transition-all duration-200 ${
                  isSelected 
                    ? isMobile
                      ? 'selected bg-gradient-to-br from-red-500/20 to-orange-500/20 border-red-500 text-white'
                      : 'bg-gradient-to-br from-red-500/80 to-orange-500/80 border-red-300/50 text-white shadow-xl scale-102'
                    : 'bg-black/40 backdrop-blur-sm border-white/10 hover:border-red-300/30 hover:bg-black/60 text-white/90'
                } ${!isMobile && 'transform hover:scale-105'}`}
              >
                <div className="theme-card-content relative z-10 text-center space-y-1">
                  {/* Emoji with Animation */}
                  <div className={`genre-emoji text-2xl ${!isMobile && 'transition-transform duration-300'} ${
                    isSelected && !isMobile ? 'animate-bounce' : ''
                  }`}>
                    {isSelected ? '🚫' : genre.emoji}
                  </div>
                  
                  {/* Label */}
                  <div className="genre-label font-medium text-xs">
                    {genre.label}
                  </div>
                  
                  {/* Description - Hidden on mobile */}
                  {!isMobile && (
                    <div className={`genre-description text-xs leading-tight transition-all duration-300 ${
                      isSelected || isHovered ? 'opacity-100 max-h-10' : 'opacity-0 max-h-0'
                    }`}>
                      {genre.description}
                    </div>
                  )}
                </div>
                
                {/* Selection Indicator with X */}
                {isSelected && (
                  <div className="selection-indicator absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full border-2 border-red-500 flex items-center justify-center animate-pulse">
                    <svg className="w-2.5 h-2.5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Quick Skip Button - Mobile Friendly */}
      {selectedCount === 0 && (
        <div className="text-center">
          <div className="relative inline-block group">
            <button
              onClick={() => updateData({ ...data, dislikedGenres: [] })}
              className={`relative ${isMobile ? 'bg-green-500/20' : 'bg-gradient-to-r from-green-500/20 to-emerald-400/20'} hover:from-green-500/30 hover:to-emerald-400/30 backdrop-blur-sm border border-green-500/30 rounded-2xl px-4 sm:px-6 py-2.5 sm:py-3 text-white transition-all duration-300`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-base sm:text-lg">✨</span>
                <span className="font-medium text-sm sm:text-base">{isMobile ? "Skip this!" : "I'm open to everything!"}</span>
                <span className="text-base sm:text-lg">🌟</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Feedback Messages - Mobile Optimized */}
      {selectedCount > 0 && selectedCount <= 3 && (
        <div className="feedback-message relative animate-fade-in">
          <div className={`relative ${isMobile ? 'bg-blue-500/20' : 'bg-gradient-to-r from-blue-500/10 to-indigo-400/10 backdrop-blur-sm'} border border-blue-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-4`}>
            <div className="flex items-center justify-center space-x-2 sm:space-x-3">
              <span className="text-xl sm:text-2xl">👍</span>
              <div className="text-center">
                <p className="text-white font-medium text-xs sm:text-sm">
                  {isMobile ? "We'll filter these out!" : "Good choices! We'll make sure to filter out these genres from your recommendations."}
                </p>
              </div>
              <span className="text-xl sm:text-2xl">🎯</span>
            </div>
          </div>
        </div>
      )}

      {selectedCount > 3 && !isMobile && (
        <div className="feedback-message relative animate-fade-in">
          <div className="relative bg-gradient-to-r from-yellow-500/10 to-orange-400/10 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-4">
            <div className="flex items-center justify-center space-x-3">
              <span className="text-2xl">⚠️</span>
              <div className="text-center">
                <p className="text-white font-medium text-sm">
                  That's quite a few genres to avoid! Make sure you still have plenty of options left to explore.
                </p>
              </div>
              <span className="text-2xl">🤔</span>
            </div>
          </div>
        </div>
      )}

      {/* Optional: Additional Filters - Mobile Optimized */}
      <div className="text-center">
        <button
          onClick={() => setShowOptional(!showOptional)}
          className="text-white/60 hover:text-white text-xs sm:text-sm underline decoration-1 underline-offset-2 transition-colors duration-200"
        >
          {showOptional ? 'Hide' : 'Show'} {isMobile ? 'more' : 'additional content'} filters
        </button>
        
        {showOptional && (
          <div className={`mt-4 p-3 sm:p-4 ${isMobile ? 'bg-black/40' : 'bg-black/20 backdrop-blur-sm'} border border-white/10 rounded-xl sm:rounded-2xl`}>
            <p className="text-white/80 text-xs sm:text-sm mb-3">{isMobile ? "Avoid:" : "Specific content you'd rather avoid:"}</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {['Excessive Violence', 'Fan Service', 'Dark Themes', 'Complex Plots', 'Long Series'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    const currentTags = data.dislikedTags || [];
                    const newTags = currentTags.includes(tag) 
                      ? currentTags.filter(t => t !== tag)
                      : [...currentTags, tag];
                    updateData({ ...data, dislikedTags: newTags });
                  }}
                  className={`text-xs px-2.5 sm:px-3 py-1 rounded-full border transition-all duration-200 ${
                    (data.dislikedTags || []).includes(tag)
                      ? 'bg-red-500/20 border-red-500/40 text-red-300'
                      : 'bg-white/10 border-white/20 text-white/80 hover:bg-white/20'
                  }`}
                >
                  {(data.dislikedTags || []).includes(tag) ? '🚫 ' : ''}{isMobile && tag.length > 12 ? tag.substring(0, 12) + '...' : tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Custom CSS */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
        
        .scale-102 {
          transform: scale(1.02);
        }

        /* Touch feedback for mobile */
        @media (hover: none) and (pointer: coarse) {
          .genre-card:active {
            transform: scale(0.98) !important;
            opacity: 0.9 !important;
          }
        }
      `}</style>
    </div>
  );
}