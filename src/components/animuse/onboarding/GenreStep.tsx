// src/components/animuse/onboarding/GenreStep.tsx - Mobile-Optimized Version
import React, { useState, useEffect } from "react";
import StyledButton from "../shared/StyledButton";

const GENRES_OPTIONS = [
  { id: "action", label: "Action", emoji: "⚔️", color: "from-red-500 to-orange-500", description: "High-energy battles" },
  { id: "adventure", label: "Adventure", emoji: "🗺️", color: "from-green-500 to-teal-500", description: "Epic journeys" },
  { id: "comedy", label: "Comedy", emoji: "😂", color: "from-yellow-400 to-orange-400", description: "Laugh-out-loud fun" },
  { id: "drama", label: "Drama", emoji: "🎭", color: "from-purple-500 to-pink-500", description: "Emotional stories" },
  { id: "fantasy", label: "Fantasy", emoji: "🧙‍♂️", color: "from-purple-600 to-indigo-600", description: "Magical worlds" },
  { id: "horror", label: "Horror", emoji: "👻", color: "from-gray-800 to-red-900", description: "Spine-chilling tales" },
  { id: "isekai", label: "Isekai", emoji: "🌍", color: "from-blue-500 to-purple-500", description: "Another world" },
  { id: "josei", label: "Josei", emoji: "👩", color: "from-pink-400 to-rose-400", description: "Adult women stories" },
  { id: "mecha", label: "Mecha", emoji: "🤖", color: "from-gray-500 to-blue-600", description: "Giant robots" },
  { id: "mystery", label: "Mystery", emoji: "🔍", color: "from-indigo-600 to-purple-700", description: "Puzzles & secrets" },
  { id: "psychological", label: "Psychological", emoji: "🧠", color: "from-purple-700 to-indigo-800", description: "Mind-bending" },
  { id: "romance", label: "Romance", emoji: "💕", color: "from-pink-500 to-red-400", description: "Love stories" },
  { id: "sciFi", label: "Sci-Fi", emoji: "🚀", color: "from-cyan-500 to-blue-600", description: "Futuristic tech" },
  { id: "seinen", label: "Seinen", emoji: "👨", color: "from-blue-600 to-indigo-600", description: "Adult men stories" },
  { id: "shojo", label: "Shojo", emoji: "🌸", color: "from-pink-300 to-rose-400", description: "Young girls stories" },
  { id: "shonen", label: "Shonen", emoji: "💪", color: "from-orange-500 to-red-500", description: "Young boys stories" },
  { id: "sliceOfLife", label: "Slice of Life", emoji: "☕", color: "from-green-400 to-teal-400", description: "Everyday moments" },
  { id: "sports", label: "Sports", emoji: "⚽", color: "from-emerald-500 to-green-600", description: "Athletic competition" },
  { id: "supernatural", label: "Supernatural", emoji: "👁️", color: "from-purple-800 to-indigo-900", description: "Beyond reality" },
  { id: "thriller", label: "Thriller", emoji: "⚡", color: "from-red-600 to-orange-700", description: "Edge-of-seat suspense" },
];

interface GenreStepProps {
  data: { genres: string[] };
  updateData: (data: { genres: string[] }) => void;
}

export default function GenreStep({ data, updateData }: GenreStepProps) {
  const [hoveredGenre, setHoveredGenre] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleGenre = (genre: string) => {
    const newGenres = data.genres.includes(genre)
      ? data.genres.filter((g) => g !== genre)
      : [...data.genres, genre];
    updateData({ genres: newGenres });
  };

  const filteredGenres = GENRES_OPTIONS.filter(genre => 
    genre.label.toLowerCase().includes(searchFilter.toLowerCase()) ||
    genre.description.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const selectedCount = data.genres.length;

  return (
    <div className="relative min-h-[400px] space-y-4 sm:space-y-6">
      {/* Simplified floating background for mobile */}
      {!isMobile && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-4 left-8 w-24 h-24 bg-gradient-to-br from-brand-primary-action/20 to-transparent rounded-full blur-xl animate-pulse"></div>
          <div className="absolute bottom-6 right-12 w-32 h-32 bg-gradient-to-tl from-brand-accent-gold/15 to-transparent rounded-full blur-xl animate-pulse delay-1000"></div>
        </div>
      )}

      {/* Header Section - Mobile Optimized */}
      <div className="step-header-section text-center space-y-3 sm:space-y-4">
        <div className="relative inline-block">
          <div className={`relative ${isMobile ? 'bg-black/60' : 'bg-black/30 backdrop-blur-sm'} border border-white/10 rounded-2xl p-4 sm:p-6`}>
            <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
              <span className="text-2xl sm:text-3xl">🎭</span>
              <h3 className="step-title text-xl sm:text-2xl md:text-3xl font-heading font-bold">
                <span className="bg-gradient-to-r from-brand-primary-action to-brand-accent-gold bg-clip-text text-transparent">
                  {isMobile ? "Pick Genres" : "Favorite Genres?"}
                </span>
              </h3>
              <span className="text-2xl sm:text-3xl">✨</span>
            </div>
            <p className="step-subtitle text-white/80 text-sm sm:text-base leading-relaxed">
              {isMobile 
                ? "Select your favorite story types"
                : "Pick your most-loved story types for spot-on recommendations!"
              }
            </p>
          </div>
        </div>

        {/* Stats & Search - Mobile Layout */}
        <div className="flex flex-col items-center gap-3">
          {/* Selection Counter */}
          {selectedCount > 0 && (
            <div className="selection-counter inline-flex items-center space-x-2 bg-gradient-to-r from-brand-primary-action/20 to-brand-accent-gold/20 backdrop-blur-sm rounded-full px-4 sm:px-6 py-2 border border-white/10 animate-fade-in">
              <span className="text-base sm:text-lg">📊</span>
              <span className="text-white font-medium text-xs sm:text-sm">
                {selectedCount} genre{selectedCount > 1 ? 's' : ''} selected
              </span>
            </div>
          )}

          {/* Search Filter - Full width on mobile */}
          <div className="relative w-full max-w-xs">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search genres..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="search-filter-input bg-black/40 backdrop-blur-sm border border-white/20 rounded-full pl-10 pr-4 py-2 text-white text-sm placeholder-white/60 focus:border-brand-primary-action focus:ring-2 focus:ring-brand-primary-action/50 focus:outline-none transition-all duration-300 w-full"
            />
          </div>
        </div>
      </div>

      {/* Genre Grid - Mobile Optimized */}
      <div className={`genre-selection-grid ${isMobile ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-3 lg:grid-cols-4 gap-3'} ${!isMobile && 'max-h-[300px] overflow-y-auto custom-scrollbar pr-2'}`}>
        {filteredGenres.map((genre, index) => {
          const isSelected = data.genres.includes(genre.label);
          const isHovered = hoveredGenre === genre.id;
          
          return (
            <div
              key={genre.id}
              className="relative group"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Selection Glow - Hidden on mobile */}
              {!isMobile && (
                <div className={`absolute -inset-1 bg-gradient-to-r ${genre.color} rounded-2xl blur-md transition-all duration-300 ${
                  isSelected ? 'opacity-60 scale-105' : isHovered ? 'opacity-30' : 'opacity-0'
                }`}></div>
              )}
              
              {/* Genre Card */}
              <button
                onClick={() => toggleGenre(genre.label)}
                onMouseEnter={() => !isMobile && setHoveredGenre(genre.id)}
                onMouseLeave={() => !isMobile && setHoveredGenre(null)}
                className={`genre-card relative w-full p-3 rounded-xl border transition-all duration-200 ${
                  isSelected 
                    ? isMobile
                      ? 'selected bg-gradient-to-br from-brand-primary-action/20 to-brand-accent-gold/20 border-brand-primary-action text-white'
                      : `bg-gradient-to-br ${genre.color} border-white/30 text-white shadow-xl scale-102`
                    : 'bg-black/40 backdrop-blur-sm border-white/10 hover:border-white/30 hover:bg-black/60 text-white/90'
                } ${!isMobile && 'transform hover:scale-105'}`}
              >
                <div className="theme-card-content relative z-10 text-center space-y-1">
                  {/* Emoji */}
                  <div className={`genre-emoji text-2xl ${!isMobile && 'transition-transform duration-300'} ${
                    isSelected && !isMobile ? 'animate-bounce' : ''
                  }`}>
                    {genre.emoji}
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
                
                {/* Selection Indicator */}
                {isSelected && (
                  <div className="selection-indicator absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full border-2 border-current flex items-center justify-center animate-pulse">
                    <svg className="w-2.5 h-2.5 text-current" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                    </svg>
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Quick Selection Helpers - Mobile Optimized */}
      {selectedCount === 0 && (
        <div className="text-center space-y-3">
          <p className="text-white/60 text-xs sm:text-sm">{isMobile ? "Try these combos:" : "Not sure where to start? Try these popular combinations:"}</p>
          <div className="quick-selection-presets flex flex-wrap gap-2 justify-center">
            {[
              { label: isMobile ? "Action" : "Action Fan", genres: ["Action", "Adventure", "Shonen"] },
              { label: isMobile ? "Drama" : "Drama Lover", genres: ["Drama", "Romance", "Slice of Life"] },
              { label: isMobile ? "Fantasy" : "Fantasy Explorer", genres: ["Fantasy", "Isekai", "Adventure"] },
              { label: isMobile ? "All!" : "Everything!", genres: ["Action", "Adventure", "Comedy", "Drama", "Fantasy"] }
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => updateData({ genres: preset.genres })}
                className="preset-button bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-full transition-colors duration-200 border border-white/20 hover:border-white/40"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Genre Diversity Feedback - Mobile Friendly */}
      {selectedCount >= 3 && (
        <div className="feedback-message relative animate-fade-in">
          {!isMobile && (
            <div className="absolute -inset-2 bg-gradient-to-r from-green-500/20 to-emerald-400/20 rounded-2xl blur-lg opacity-60"></div>
          )}
          <div className={`relative ${isMobile ? 'bg-green-500/20' : 'bg-gradient-to-r from-green-500/10 to-emerald-400/10 backdrop-blur-sm'} border border-green-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-4`}>
            <div className="flex items-center justify-center space-x-2 sm:space-x-3">
              <span className="text-xl sm:text-2xl">🎯</span>
              <div className="text-center">
                <p className="text-white font-medium text-xs sm:text-sm">
                  {isMobile 
                    ? "Great diversity!"
                    : "Perfect! Your diverse genre selection will help us find amazing recommendations."
                  }
                </p>
                {isMobile && selectedCount > 5 && (
                  <p className="text-xs text-white/70 mt-1">
                    {selectedCount} genres selected
                  </p>
                )}
              </div>
              <span className="text-xl sm:text-2xl">🌟</span>
            </div>
          </div>
        </div>
      )}

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