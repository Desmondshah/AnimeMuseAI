// src/components/animuse/onboarding/FavoritesStep.tsx - Advanced Artistic Version
import React, { useState, useEffect, useCallback } from "react";
import StyledButton from "../shared/StyledButton";

interface FavoritesStepProps {
  data: { favoriteAnimes: string[] };
  updateData: (data: { favoriteAnimes: string[] }) => void;
}

// Floating Anime-themed Particle
const AnimeParticle: React.FC<{ 
  anime?: string; 
  delay?: number; 
  size?: string; 
  color?: string;
}> = ({ anime, delay = 0, size = "w-3 h-3", color = "bg-brand-accent-gold/40" }) => {
  const animeEmojis = ["📚", "⭐", "🎌", "✨", "🌟", "💫", "🎭", "🎨"];
  const emoji = animeEmojis[Math.floor(Math.random() * animeEmojis.length)];
  
  return (
    <div 
      className={`absolute animate-ping opacity-60 ${size}`}
      style={{ 
        animationDelay: `${delay}s`, 
        left: `${Math.random() * 100}%`, 
        top: `${Math.random() * 100}%`,
        animationDuration: `${3 + Math.random() * 2}s`
      }}
    >
      <span className="text-lg">{emoji}</span>
    </div>
  );
};

// Animated Achievement Badge
const AchievementBadge: React.FC<{ count: number }> = ({ count }) => {
  const getBadgeInfo = (count: number) => {
    if (count >= 10) return { emoji: "🏆", title: "Anime Connoisseur", color: "from-yellow-400 to-orange-500" };
    if (count >= 7) return { emoji: "⭐", title: "Devoted Fan", color: "from-purple-500 to-pink-500" };
    if (count >= 5) return { emoji: "🎭", title: "True Otaku", color: "from-blue-500 to-cyan-400" };
    if (count >= 3) return { emoji: "📚", title: "Growing Collection", color: "from-green-500 to-emerald-400" };
    if (count >= 1) return { emoji: "🌱", title: "Getting Started", color: "from-brand-accent-peach to-brand-accent-gold" };
    return null;
  };

  const badge = getBadgeInfo(count);
  if (!badge) return null;

  return (
    <div className="relative animate-fade-in">
      <div className={`absolute -inset-2 bg-gradient-to-r ${badge.color} rounded-2xl blur-lg opacity-60 animate-pulse`}></div>
      <div className={`relative bg-gradient-to-r ${badge.color} backdrop-blur-sm border border-white/30 rounded-2xl px-4 py-2`}>
        <div className="flex items-center space-x-2">
          <span className="text-xl animate-bounce">{badge.emoji}</span>
          <div className="text-center">
            <p className="text-white font-bold text-sm">{badge.title}</p>
            <p className="text-white/90 text-xs">{count} favorite{count !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Favorite Card
const FavoriteCard: React.FC<{
  anime: string;
  index: number;
  onRemove: (anime: string) => void;
}> = ({ anime, index, onRemove }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const gradients = [
    "from-red-500 to-pink-500",
    "from-blue-500 to-cyan-400", 
    "from-green-500 to-emerald-400",
    "from-purple-500 to-indigo-500",
    "from-yellow-500 to-orange-400",
    "from-pink-500 to-rose-400",
    "from-cyan-500 to-teal-400",
    "from-indigo-500 to-purple-500",
    "from-orange-500 to-red-500",
    "from-emerald-500 to-green-400"
  ];
  
  const gradient = gradients[index % gradients.length];
  
  return (
    <div 
      className="group relative transform transition-all duration-300 hover:scale-105"
      style={{ animationDelay: `${index * 100}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Card Glow */}
      <div className={`absolute -inset-1 bg-gradient-to-r ${gradient} rounded-2xl blur-md transition-all duration-300 ${
        isHovered ? 'opacity-60 scale-105' : 'opacity-0'
      }`}></div>
      
      <div className={`relative bg-black/60 backdrop-blur-sm border border-white/20 rounded-2xl p-4 transition-all duration-300 group-hover:border-white/40 group-hover:bg-black/70 overflow-hidden`}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent transform rotate-45"></div>
        </div>
        
        <div className="relative z-10 flex items-center justify-between">
          {/* Rank Badge */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r ${gradient} flex items-center justify-center mr-3 shadow-lg`}>
            <span className="text-white font-bold text-sm">#{index + 1}</span>
          </div>
          
          {/* Anime Title */}
          <span className="flex-1 text-white/90 font-medium text-sm group-hover:text-white transition-colors duration-300 truncate">
            {anime}
          </span>
          
          {/* Remove Button */}
          <button 
            onClick={() => onRemove(anime)} 
            className="flex-shrink-0 ml-3 w-7 h-7 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/40 hover:text-red-300 transition-all duration-200 flex items-center justify-center text-sm font-bold group-hover:scale-110"
            aria-label={`Remove ${anime}`}
          >
            ×
          </button>
        </div>
        
        {/* Hover Animation */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/50 to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
      </div>
    </div>
  );
};

export default function FavoritesStep({ data, updateData }: FavoritesStepProps) {
  const [currentFavorite, setCurrentFavorite] = useState("");
  const [particles, setParticles] = useState<string[]>([]);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Popular anime suggestions
  const suggestions = [
    "Attack on Titan", "Demon Slayer", "My Hero Academia", "One Piece", "Naruto",
    "Death Note", "Fullmetal Alchemist", "Dragon Ball Z", "One Punch Man", "Jujutsu Kaisen",
    "Hunter x Hunter", "Mob Psycho 100", "Your Name", "Spirited Away", "Cowboy Bebop"
  ];

  const filteredSuggestions = suggestions
    .filter(anime => 
      anime.toLowerCase().includes(currentFavorite.toLowerCase()) && 
      !data.favoriteAnimes.includes(anime) &&
      currentFavorite.length > 0
    )
    .slice(0, 5);

  useEffect(() => {
    // Generate particles based on favorites
    setParticles([...data.favoriteAnimes, ...data.favoriteAnimes]);
  }, [data.favoriteAnimes]);

  const addFavorite = useCallback((animeTitle?: string) => {
    const titleToAdd = animeTitle || currentFavorite.trim();
    if (titleToAdd && !data.favoriteAnimes.includes(titleToAdd) && data.favoriteAnimes.length < 10) {
      updateData({ favoriteAnimes: [...data.favoriteAnimes, titleToAdd] });
      setCurrentFavorite("");
      setShowSuggestions(false);
    } else if (data.favoriteAnimes.length >= 10) {
      // Visual feedback for limit reached
      const input = document.querySelector('input[placeholder*="favorite"]') as HTMLInputElement;
      if (input) {
        input.style.borderColor = '#ef4444';
        setTimeout(() => input.style.borderColor = '', 500);
      }
    }
  }, [currentFavorite, data.favoriteAnimes, updateData]);

  const removeFavorite = useCallback((animeToRemove: string) => {
    updateData({ favoriteAnimes: data.favoriteAnimes.filter(anime => anime !== animeToRemove) });
  }, [data.favoriteAnimes, updateData]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addFavorite();
    }
  };

  return (
    <div className="relative min-h-[500px] space-y-8">
      {/* Floating Background Particles - Reduced on mobile via CSS */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none anime-particles">
        {/* Base ambient effects */}
        <div className="absolute top-6 left-8 w-20 h-20 bg-gradient-to-br from-brand-primary-action/15 to-transparent rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-8 right-12 w-24 h-24 bg-gradient-to-tl from-brand-accent-gold/12 to-transparent rounded-full blur-xl animate-pulse delay-1000"></div>
        
        {/* Dynamic anime particles - Will be hidden on mobile */}
        {particles.map((anime, index) => (
          <AnimeParticle key={`${anime}-${index}`} anime={anime} delay={index * 0.3} />
        ))}
      </div>

      {/* Header Section */}
      <div className="text-center space-y-6">
        <div className="relative inline-block">
          <div className="absolute -inset-4 bg-gradient-to-r from-brand-primary-action/30 to-brand-accent-gold/30 rounded-2xl blur-lg opacity-60 animate-pulse"></div>
          <div className="relative bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-center space-x-3 mb-3">
              <span className="text-3xl animate-bounce">⭐</span>
              <h3 className="text-2xl sm:text-3xl font-heading font-bold">
                <span className="bg-gradient-to-r from-brand-primary-action to-brand-accent-gold bg-clip-text text-transparent">
                  All-Time Favorites
                </span>
              </h3>
              <span className="text-3xl animate-bounce delay-200">📚</span>
            </div>
            <p className="text-white/80 text-sm sm:text-base leading-relaxed">
              Share the anime that left a lasting impression on you.
              <br />
              <span className="text-brand-accent-gold font-medium">These help us understand your taste perfectly!</span>
            </p>
          </div>
        </div>

        {/* Achievement Badge */}
        {data.favoriteAnimes.length > 0 && (
          <div className="flex justify-center">
            <AchievementBadge count={data.favoriteAnimes.length} />
          </div>
        )}
      </div>

      {/* Enhanced Input Section */}
      <div className="relative">
        <div className={`absolute -inset-2 bg-gradient-to-r from-brand-primary-action/40 to-brand-accent-gold/40 rounded-3xl blur-lg transition-opacity duration-300 ${
          isInputFocused ? 'opacity-100' : 'opacity-0'
        }`}></div>
        
        <div className="relative bg-black/40 backdrop-blur-sm border border-white/20 rounded-2xl p-4 group-hover:border-white/30 transition-all duration-300">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <span className="text-xl">🔍</span>
              </div>
              <input
                type="text"
                placeholder="e.g., Attack on Titan, Your Name..."
                value={currentFavorite}
                onChange={(e) => {
                  setCurrentFavorite(e.target.value);
                  setShowSuggestions(e.target.value.length > 0);
                }}
                onFocus={() => {
                  setIsInputFocused(true);
                  setShowSuggestions(currentFavorite.length > 0);
                }}
                onBlur={() => {
                  setIsInputFocused(false);
                  // Delay hiding suggestions to allow clicks
                  setTimeout(() => setShowSuggestions(false), 150);
                }}
                onKeyPress={handleKeyPress}
                className="w-full bg-black/60 backdrop-blur-sm border border-white/20 rounded-xl pl-12 pr-4 py-3 text-white placeholder-white/60 focus:border-brand-primary-action focus:ring-2 focus:ring-brand-primary-action/50 focus:outline-none transition-all duration-300"
                disabled={data.favoriteAnimes.length >= 10}
              />
              
              {/* Suggestions Dropdown */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-black/90 backdrop-blur-xl border border-white/20 rounded-xl overflow-hidden z-10 shadow-2xl">
                  {filteredSuggestions.map((suggestion, index) => (
                    <button
                      key={suggestion}
                      onClick={() => addFavorite(suggestion)}
                      className="w-full text-left px-4 py-3 text-white/90 hover:bg-white/10 hover:text-white transition-colors duration-200 text-sm border-b border-white/10 last:border-b-0 flex items-center space-x-2"
                    >
                      <span className="text-brand-accent-gold">⭐</span>
                      <span>{suggestion}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <StyledButton 
              onClick={() => addFavorite()} 
              variant="primary" 
              disabled={!currentFavorite.trim() || data.favoriteAnimes.length >= 10}
              className="!bg-gradient-to-r !from-brand-primary-action !to-brand-accent-gold hover:!from-brand-accent-gold hover:!to-brand-primary-action !transition-all !duration-300 !shadow-lg hover:!shadow-brand-primary-action/25 flex-shrink-0"
            >
              {data.favoriteAnimes.length >= 10 ? "Full" : "Add"}
            </StyledButton>
          </div>
          
          {/* Limit Indicator */}
          <div className="flex justify-between items-center mt-3">
            <p className="text-xs text-white/60">
              {data.favoriteAnimes.length >= 10 
                ? "You've reached the maximum of 10 favorites!" 
                : `Add up to ${10 - data.favoriteAnimes.length} more favorites`
              }
            </p>
            <div className="flex space-x-1">
              {Array.from({ length: 10 }, (_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i < data.favoriteAnimes.length 
                      ? 'bg-gradient-to-r from-brand-primary-action to-brand-accent-gold scale-110' 
                      : 'bg-white/20'
                  }`}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Favorites Collection */}
      <div className="space-y-6">
        {data.favoriteAnimes.length > 0 ? (
          <>
            <div className="text-center">
              <h4 className="text-xl font-heading text-white mb-2">Your Collection</h4>
              <div className="inline-flex items-center space-x-2 bg-black/30 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
                <span className="text-brand-accent-gold font-medium text-sm">
                  {data.favoriteAnimes.length} Favorite{data.favoriteAnimes.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto custom-scrollbar pr-2">
              {data.favoriteAnimes.map((anime, index) => (
                <FavoriteCard
                  key={anime}
                  anime={anime}
                  index={index}
                  onRemove={removeFavorite}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="bg-black/30 backdrop-blur-sm rounded-3xl p-8 border border-white/10 max-w-md mx-auto">
              <div className="text-6xl mb-4 animate-bounce">📚</div>
              <h4 className="text-xl font-heading text-white mb-2">Start Your Collection</h4>
              <p className="text-white/70 text-sm leading-relaxed mb-4">
                Add anime that mean something special to you. These favorites will help us find similar masterpieces you'll love.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestions.slice(0, 3).map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => addFavorite(suggestion)}
                    className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1 text-white/80 text-xs hover:bg-white/20 hover:text-white transition-all duration-300 hover:scale-105"
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pro Tip */}
      {data.favoriteAnimes.length > 0 && data.favoriteAnimes.length < 5 && (
        <div className="relative animate-fade-in">
          <div className="absolute -inset-2 bg-gradient-to-r from-blue-500/20 to-indigo-400/20 rounded-2xl blur-lg opacity-60"></div>
          <div className="relative bg-gradient-to-r from-blue-500/10 to-indigo-400/10 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-4">
            <div className="flex items-center justify-center space-x-3">
              <span className="text-2xl">💡</span>
              <div className="text-center">
                <p className="text-white font-medium text-sm">
                  Add a few more favorites for even better recommendations!
                </p>
                <p className="text-white/70 text-xs mt-1">
                  The more you share, the better we can understand your taste.
                </p>
              </div>
              <span className="text-2xl">🎯</span>
            </div>
          </div>
        </div>
      )}

      {/* Custom CSS for mobile optimization */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }

        /* Mobile optimizations */
        @media (max-width: 768px), 
               (prefers-reduced-motion: reduce),
               .low-bandwidth,
               .mobile-device {
          .anime-particles > div:not(:first-child):not(:nth-child(2)) {
            display: none !important;
          }
          
          .animate-pulse,
          .animate-bounce {
            animation-duration: 3s;
          }
          
          .blur-xl,
          .blur-lg {
            backdrop-filter: none;
            filter: none;
          }
        }

        /* iOS specific optimizations */
        @media (max-width: 768px) and (-webkit-min-device-pixel-ratio: 2) {
          .backdrop-blur-sm,
          .backdrop-blur-xl {
            backdrop-filter: none;
            background-color: rgba(0, 0, 0, 0.8);
          }
        }
      `}</style>
    </div>
  );
}