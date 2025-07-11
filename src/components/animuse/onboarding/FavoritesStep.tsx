// src/components/animuse/onboarding/FavoritesStep.tsx - Brutalist UI Version
import React, { useState, useEffect, useCallback } from "react";
import StyledButton from "../shared/StyledButton";

interface FavoritesStepProps {
  data: { favoriteAnimes: string[] };
  updateData: (data: { favoriteAnimes: string[] }) => void;
}

// Brutalist Geometric Element
const BrutalistBlock: React.FC<{ 
  size?: 'sm' | 'md' | 'lg';
  position?: string;
  delay?: number;
}> = ({ size = 'md', position = '', delay = 0 }) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16', 
    lg: 'w-24 h-24'
  };
  
  return (
    <div 
      className={`absolute ${sizes[size]} bg-red-600 transform rotate-45 opacity-20 ${position}`}
      style={{ 
        animationDelay: `${delay}s`,
        clipPath: 'polygon(0 0, 100% 0, 85% 100%, 15% 100%)'
      }}
    />
  );
};

// Brutalist Counter Badge
const BrutalistCounter: React.FC<{ count: number }> = ({ count }) => {
  return (
    <div className="relative">
      <div className="bg-black border-4 border-white p-4 transform -rotate-2 shadow-[8px_8px_0px_0px_#ff0000]">
        <div className="bg-red-600 text-white font-black text-2xl px-6 py-2 transform rotate-1">
          {count.toString().padStart(2, '0')}
        </div>
        <div className="bg-white text-black font-black text-xs px-2 py-1 mt-2 tracking-widest uppercase">
          SELECTIONS
        </div>
      </div>
    </div>
  );
};

// Brutalist Favorite Block
const BrutalistFavoriteBlock: React.FC<{
  anime: string;
  index: number;
  onRemove: (anime: string) => void;
}> = ({ anime, index, onRemove }) => {
  const [isPressed, setIsPressed] = useState(false);
  
  const colors = [
    { bg: 'bg-red-600', border: 'border-red-800', shadow: 'shadow-[6px_6px_0px_0px_#7f1d1d]' },
    { bg: 'bg-blue-600', border: 'border-blue-800', shadow: 'shadow-[6px_6px_0px_0px_#1e3a8a]' },
    { bg: 'bg-green-600', border: 'border-green-800', shadow: 'shadow-[6px_6px_0px_0px_#14532d]' },
    { bg: 'bg-yellow-500', border: 'border-yellow-700', shadow: 'shadow-[6px_6px_0px_0px_#a16207]' },
    { bg: 'bg-purple-600', border: 'border-purple-800', shadow: 'shadow-[6px_6px_0px_0px_#581c87]' },
    { bg: 'bg-pink-600', border: 'border-pink-800', shadow: 'shadow-[6px_6px_0px_0px_#831843]' },
    { bg: 'bg-cyan-600', border: 'border-cyan-800', shadow: 'shadow-[6px_6px_0px_0px_#155e75]' },
    { bg: 'bg-orange-600', border: 'border-orange-800', shadow: 'shadow-[6px_6px_0px_0px_#9a3412]' }
  ];
  
  const colorScheme = colors[index % colors.length];
  
  return (
    <div className="relative">
      {/* Geometric Background Elements */}
      <div className="absolute -top-2 -left-2 w-4 h-4 bg-black transform rotate-45"></div>
      <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-red-600 transform -rotate-12"></div>
      
      <div 
        className={`
          relative bg-white border-4 border-black transform transition-all duration-150
          ${isPressed ? 'translate-x-1 translate-y-1 shadow-[2px_2px_0px_0px_#000000]' : colorScheme.shadow}
          hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#000000]
          ${index % 2 === 0 ? 'rotate-1' : '-rotate-1'}
        `}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
      >
        {/* Header Bar */}
        <div className={`${colorScheme.bg} border-b-4 border-black p-2 flex items-center justify-between`}>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-black text-white font-black text-xs flex items-center justify-center">
              {(index + 1).toString().padStart(2, '0')}
            </div>
            <div className="text-white font-black text-xs tracking-widest uppercase">
              ANIME #{index + 1}
            </div>
          </div>
          <button 
            onClick={() => onRemove(anime)}
            className="w-6 h-6 bg-red-600 border-2 border-white text-white font-black text-xs hover:bg-red-800 transition-colors"
            aria-label={`Remove ${anime}`}
          >
            ×
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 bg-white">
          <div className="font-black text-black text-sm uppercase tracking-wide leading-tight">
            {anime}
          </div>
          
          {/* Decorative elements */}
          <div className="mt-2 flex space-x-1">
            <div className="w-2 h-2 bg-black"></div>
            <div className="w-4 h-2 bg-red-600"></div>
            <div className="w-2 h-2 bg-black"></div>
          </div>
        </div>
        
        {/* Bottom accent */}
        <div className={`h-2 ${colorScheme.bg}`}></div>
      </div>
    </div>
  );
};

export default function FavoritesStep({ data, updateData }: FavoritesStepProps) {
  const [currentFavorite, setCurrentFavorite] = useState("");
  const [isInputActive, setIsInputActive] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Brutalist anime suggestions
  const suggestions = [
    "ATTACK ON TITAN", "DEMON SLAYER", "MY HERO ACADEMIA", "ONE PIECE", "NARUTO",
    "DEATH NOTE", "FULLMETAL ALCHEMIST", "DRAGON BALL Z", "ONE PUNCH MAN", "JUJUTSU KAISEN",
    "HUNTER X HUNTER", "MOB PSYCHO 100", "YOUR NAME", "SPIRITED AWAY", "COWBOY BEBOP"
  ];

  const filteredSuggestions = suggestions
    .filter(anime => 
      anime.toLowerCase().includes(currentFavorite.toLowerCase()) && 
      !data.favoriteAnimes.map(a => a.toUpperCase()).includes(anime) &&
      currentFavorite.length > 0
    )
    .slice(0, 5);

  const addFavorite = useCallback((animeTitle?: string) => {
    const titleToAdd = animeTitle || currentFavorite.trim();
    if (titleToAdd && !data.favoriteAnimes.includes(titleToAdd) && data.favoriteAnimes.length < 10) {
      updateData({ favoriteAnimes: [...data.favoriteAnimes, titleToAdd] });
      setCurrentFavorite("");
      setShowSuggestions(false);
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
    <div className="relative min-h-[600px] bg-gray-100 p-4 md:p-8">
      {/* Brutalist Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <BrutalistBlock size="lg" position="top-10 left-10" delay={0} />
        <BrutalistBlock size="md" position="top-20 right-20" delay={0.5} />
        <BrutalistBlock size="sm" position="bottom-20 left-20" delay={1} />
        <BrutalistBlock size="md" position="bottom-10 right-10" delay={1.5} />
      </div>

      {/* Header Section - Brutalist Style */}
      <div className="relative z-10 mb-8 md:mb-12">
        <div className="bg-black border-4 md:border-8 border-white p-4 md:p-8 transform rotate-1 shadow-[6px_6px_0px_0px_#ef4444] md:shadow-[12px_12px_0px_0px_#ef4444]">
          <div className="bg-red-600 border-2 md:border-4 border-white p-3 md:p-6 transform -rotate-2">
            <h3 className="text-white font-black text-2xl md:text-4xl lg:text-6xl tracking-tighter uppercase text-center leading-none">
              FAVORITE
              <br />
              ANIME
            </h3>
            <div className="mt-3 md:mt-4 bg-white border border-black md:border-2 p-2 md:p-3">
              <p className="text-black font-bold text-xs md:text-sm uppercase tracking-widest text-center">
                SELECT YOUR TOP CHOICES
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Counter Display */}
      {data.favoriteAnimes.length > 0 && (
        <div className="flex justify-center mb-6 md:mb-8">
          <BrutalistCounter count={data.favoriteAnimes.length} />
        </div>
      )}

      {/* Input Section - Brutalist */}
      <div className="relative mb-8 md:mb-12">
        <div className={`
          bg-white border-4 md:border-8 border-black transform transition-all duration-200
          ${isInputActive ? 'rotate-1 shadow-[4px_4px_0px_0px_#3b82f6] md:shadow-[8px_8px_0px_0px_#3b82f6]' : '-rotate-1 shadow-[6px_6px_0px_0px_#000000] md:shadow-[12px_12px_0px_0px_#000000]'}
        `}>
          <div className="bg-black border-b-2 md:border-b-4 border-white p-2">
            <div className="text-white font-black text-xs uppercase tracking-widest text-center">
              ADD NEW ENTRY
            </div>
          </div>
          
          <div className="p-3 md:p-6">
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="TYPE ANIME NAME..."
                  value={currentFavorite}
                  onChange={(e) => {
                    setCurrentFavorite(e.target.value);
                    setShowSuggestions(e.target.value.length > 0);
                  }}
                  onFocus={() => {
                    setIsInputActive(true);
                    setShowSuggestions(currentFavorite.length > 0);
                  }}
                  onBlur={() => {
                    setIsInputActive(false);
                    setTimeout(() => setShowSuggestions(false), 150);
                  }}
                  onKeyPress={handleKeyPress}
                  className="w-full bg-black text-white font-bold text-sm md:text-lg uppercase tracking-wide border-2 md:border-4 border-gray-400 p-3 md:p-4 focus:border-red-600 focus:outline-none placeholder-gray-400"
                  disabled={data.favoriteAnimes.length >= 10}
                />
                
                {/* Suggestions Dropdown - Brutalist */}
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-black border-2 md:border-4 border-white z-20 shadow-[4px_4px_0px_0px_#000000] md:shadow-[8px_8px_0px_0px_#000000]">
                    {filteredSuggestions.map((suggestion, index) => (
                      <button
                        key={suggestion}
                        onClick={() => addFavorite(suggestion)}
                        className="w-full text-left p-3 md:p-4 text-white font-bold text-xs md:text-sm uppercase tracking-wide hover:bg-red-600 border-b border-gray-600 last:border-b-0 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <button
                onClick={() => addFavorite()} 
                disabled={!currentFavorite.trim() || data.favoriteAnimes.length >= 10}
                className={`
                  px-4 md:px-8 py-3 md:py-4 font-black text-sm md:text-lg uppercase tracking-wide border-2 md:border-4 transition-all duration-150 flex-shrink-0
                  ${!currentFavorite.trim() || data.favoriteAnimes.length >= 10
                    ? 'bg-gray-400 border-gray-600 text-gray-700 cursor-not-allowed'
                    : 'bg-green-600 border-green-800 text-white hover:bg-green-700 active:translate-x-1 active:translate-y-1 active:shadow-[2px_2px_0px_0px_#000000] shadow-[3px_3px_0px_0px_#000000] md:shadow-[6px_6px_0px_0px_#000000]'
                  }
                `}
              >
                {data.favoriteAnimes.length >= 10 ? "FULL" : "ADD"}
              </button>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-3 md:mt-4 bg-gray-300 border border-black md:border-2 h-3 md:h-4">
              <div 
                className="bg-red-600 h-full transition-all duration-300"
                style={{ width: `${(data.favoriteAnimes.length / 10) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-2 text-xs md:text-sm">
              <span className="font-bold uppercase tracking-wide">
                {data.favoriteAnimes.length}/10 SELECTED
              </span>
              <span className="font-bold uppercase tracking-wide text-right">
                {data.favoriteAnimes.length >= 10 ? 'MAX REACHED' : `${10 - data.favoriteAnimes.length} LEFT`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Favorites Grid - Brutalist */}
      <div className="space-y-8">
        {data.favoriteAnimes.length > 0 ? (
          <>
            <div className="bg-yellow-400 border-4 border-black p-4 transform -rotate-1 shadow-[8px_8px_0px_0px_#000000]">
              <h4 className="text-black font-black text-2xl uppercase tracking-wider text-center">
                YOUR COLLECTION
              </h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-96 overflow-y-auto">
              {data.favoriteAnimes.map((anime, index) => (
                <BrutalistFavoriteBlock
                  key={anime}
                  anime={anime}
                  index={index}
                  onRemove={removeFavorite}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="bg-white border-4 md:border-8 border-black p-6 md:p-12 transform rotate-2 shadow-[8px_8px_0px_0px_#000000] md:shadow-[16px_16px_0px_0px_#000000]">
              <div className="bg-black border-2 md:border-4 border-white p-4 md:p-8 transform -rotate-3">
                <div className="text-white font-black text-4xl md:text-8xl mb-2 md:mb-4">∅</div>
                <h4 className="text-white font-black text-sm md:text-xl uppercase tracking-widest mb-2 md:mb-4">
                  EMPTY COLLECTION
                </h4>
                <p className="text-white font-bold text-xs md:text-sm uppercase tracking-wide">
                  START ADDING FAVORITES
                </p>
              </div>
              
              <div className="mt-4 md:mt-8 space-y-2">
                <div className="font-black text-xs uppercase tracking-widest text-black mb-2 md:mb-4">
                  QUICK ADD:
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestions.slice(0, 3).map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => addFavorite(suggestion)}
                      className="bg-blue-600 border border-black md:border-2 text-white font-bold text-xs px-2 py-1 md:px-3 md:py-2 uppercase tracking-wide hover:bg-blue-700 active:translate-x-1 active:translate-y-1 transition-all"
                    >
                      + {suggestion.split(' ').slice(0, 2).join(' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Motivation Section */}
      {data.favoriteAnimes.length > 0 && data.favoriteAnimes.length < 5 && (
        <div className="mt-12">
          <div className="bg-orange-500 border-4 border-black p-6 transform rotate-1 shadow-[8px_8px_0px_0px_#000000]">
            <div className="bg-black border-2 border-white p-4 transform -rotate-1">
              <div className="text-center">
                <div className="text-white font-black text-4xl mb-2">!</div>
                <p className="text-white font-black text-sm uppercase tracking-widest">
                  ADD MORE FOR BETTER RESULTS
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}