// src/components/animuse/onboarding/DislikedStep.tsx - Brutalist UI Version
import React, { useState, useEffect } from "react";
import StyledButton from "../shared/StyledButton";

const DISLIKED_GENRES_OPTIONS = [
  { id: "action", label: "ACTION", emoji: "⚔", color: "#FF0000", description: "BATTLES TOO INTENSE" },
  { id: "adventure", label: "ADVENTURE", emoji: "🗺", color: "#00FF00", description: "JOURNEYS TOO LONG" },
  { id: "comedy", label: "COMEDY", emoji: "😂", color: "#FFFF00", description: "NOT FUNNY TO ME" },
  { id: "drama", label: "DRAMA", emoji: "🎭", color: "#FF00FF", description: "TOO EMOTIONAL" },
  { id: "ecchi", label: "ECCHI", emoji: "😳", color: "#FF69B4", description: "SUGGESTIVE CONTENT" },
  { id: "fantasy", label: "FANTASY", emoji: "🧙", color: "#800080", description: "NO MAGIC INTEREST" },
  { id: "harem", label: "HAREM", emoji: "👥", color: "#FFC0CB", description: "MULTIPLE LOVE INTERESTS" },
  { id: "horror", label: "HORROR", emoji: "👻", color: "#000000", description: "TOO SCARY FOR ME" },
  { id: "isekai", label: "ISEKAI", emoji: "🌍", color: "#0066FF", description: "ANOTHER WORLD TROPE" },
  { id: "josei", label: "JOSEI", emoji: "👩", color: "#FF1493", description: "ADULT WOMEN FOCUS" },
  { id: "mecha", label: "MECHA", emoji: "🤖", color: "#808080", description: "GIANT ROBOTS" },
  { id: "mystery", label: "MYSTERY", emoji: "🔍", color: "#4B0082", description: "CONFUSING PLOTS" },
  { id: "psychological", label: "PSYCHOLOGICAL", emoji: "🧠", color: "#301934", description: "MIND GAMES" },
  { id: "romance", label: "ROMANCE", emoji: "💕", color: "#DC143C", description: "LOVE STORIES" },
  { id: "sciFi", label: "SCI-FI", emoji: "🚀", color: "#00FFFF", description: "FUTURISTIC TECH" },
  { id: "seinen", label: "SEINEN", emoji: "👨", color: "#191970", description: "ADULT MEN FOCUS" },
  { id: "shojo", label: "SHOJO", emoji: "🌸", color: "#FFB6C1", description: "YOUNG GIRLS FOCUS" },
  { id: "shonen", label: "SHONEN", emoji: "💪", color: "#FF4500", description: "YOUNG BOYS FOCUS" },
  { id: "sliceOfLife", label: "SLICE OF LIFE", emoji: "☕", color: "#32CD32", description: "TOO SLOW PACED" },
  { id: "sports", label: "SPORTS", emoji: "⚽", color: "#228B22", description: "ATHLETIC FOCUS" },
  { id: "supernatural", label: "SUPERNATURAL", emoji: "👁", color: "#2F1B69", description: "PARANORMAL ELEMENTS" },
  { id: "thriller", label: "THRILLER", emoji: "⚡", color: "#B22222", description: "TOO SUSPENSEFUL" },
];

interface DislikedStepProps {
  data: { dislikedGenres: string[]; dislikedTags?: string[] };
  updateData: (data: { dislikedGenres: string[]; dislikedTags?: string[] }) => void;
}

export default function DislikedStep({ data, updateData }: DislikedStepProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [glitchEffect, setGlitchEffect] = useState(false);
  const [resetFlash, setResetFlash] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Periodic glitch effect
    const glitchInterval = setInterval(() => {
      setGlitchEffect(true);
      setTimeout(() => setGlitchEffect(false), 200);
    }, 8000);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      clearInterval(glitchInterval);
    };
  }, []);

  const toggleDislikedGenre = (genre: string) => {
    const newDislikedGenres = data.dislikedGenres.includes(genre)
      ? data.dislikedGenres.filter((g) => g !== genre)
      : [...data.dislikedGenres, genre];
    updateData({ ...data, dislikedGenres: newDislikedGenres });
  };

  const handleReset = () => {
    setResetFlash(true);
    updateData({ 
      dislikedGenres: [], 
      dislikedTags: [] 
    });
    setTimeout(() => setResetFlash(false), 500);
  };

  const handleAcceptAll = () => {
    updateData({ 
      dislikedGenres: [], 
      dislikedTags: data.dislikedTags || [] 
    });
  };

  const handleSelectAll = () => {
    const allGenres = DISLIKED_GENRES_OPTIONS.map(genre => genre.label);
    updateData({ 
      ...data, 
      dislikedGenres: allGenres 
    });
  };

  const selectedCount = data.dislikedGenres.length;

  return (
    <div className="brutalist-container w-full min-h-screen bg-black text-white overflow-hidden">
      {/* Brutalist Grid Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="grid grid-cols-8 gap-0 h-full">
          {Array.from({ length: 64 }).map((_, i) => (
            <div 
              key={i} 
              className="border border-white/10"
              style={{ 
                animationDelay: `${i * 0.1}s`,
                animation: Math.random() > 0.8 ? 'flash 3s infinite' : 'none'
              }}
            />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 p-4 sm:p-8">
        {/* Brutalist Header */}
        <div className="mb-8 sm:mb-12">
          <div className={`brutalist-header ${glitchEffect ? 'glitch' : ''}`}>
            <h1 className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tighter leading-none mb-4">
              <span className="block text-red-500">REJECT</span>
              <span className="block text-white -mt-2">GENRES</span>
            </h1>
            <div className="brutalist-line bg-white h-1 w-32 mb-4"></div>
            <p className="text-lg sm:text-xl font-bold text-white/80 max-w-lg">
              FILTER OUT WHAT YOU DON'T WANT TO SEE
            </p>
          </div>

          {/* Status Counter */}
          <div className="mt-6 inline-block">
            <div className="brutalist-counter bg-red-500 text-black px-6 py-3 transform -skew-x-12">
              <span className="font-black text-xl transform skew-x-12 block">
                {selectedCount === 0 ? "OPEN TO ALL" : `${selectedCount} REJECTED`}
              </span>
            </div>
          </div>
        </div>

        {/* Brutalist Genre Grid */}
        <div className={`genre-grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'} grid gap-4 mb-12`}>
          {DISLIKED_GENRES_OPTIONS.map((genre, index) => {
            const isSelected = data.dislikedGenres.includes(genre.label);
            
            return (
              <div
                key={genre.id}
                className="brutalist-genre-card group"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <button
                  onClick={() => toggleDislikedGenre(genre.label)}
                  className={`
                    w-full h-24 sm:h-32 border-4 border-white transition-all duration-200 transform
                    ${isSelected 
                      ? 'bg-red-500 text-black border-red-500 scale-95' 
                      : 'bg-black text-white hover:bg-white hover:text-black hover:scale-105'
                    }
                    active:scale-90
                  `}
                  style={{
                    clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))'
                  }}
                >
                  <div className="brutalist-content h-full flex flex-col justify-center items-center p-2">
                    {/* Emoji */}
                    <div className="text-2xl sm:text-3xl mb-1">
                      {isSelected ? '✖' : genre.emoji}
                    </div>
                    
                    {/* Label */}
                    <div className="font-black text-xs sm:text-sm text-center leading-tight">
                      {genre.label}
                    </div>
                    
                    {/* Selected indicator */}
                    {isSelected && (
                      <div className="absolute top-0 right-0 w-0 h-0 border-l-[20px] border-l-transparent border-t-[20px] border-t-black" />
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {selectedCount === 0 && (
            <button
              onClick={handleAcceptAll}
              className="brutalist-button bg-green-500 text-black border-4 border-green-500 px-8 py-4 font-black text-lg transform hover:scale-105 active:scale-95 transition-transform"
              style={{
                clipPath: 'polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)'
              }}
            >
              ACCEPT ALL GENRES
            </button>
          )}
          
          {selectedCount > 0 && selectedCount < DISLIKED_GENRES_OPTIONS.length && (
            <button
              onClick={handleSelectAll}
              className="brutalist-button bg-red-500 text-white border-4 border-red-500 px-8 py-4 font-black text-lg transform hover:scale-105 active:scale-95 transition-transform"
              style={{
                clipPath: 'polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)'
              }}
            >
              REJECT ALL
            </button>
          )}
          
          <button
            onClick={handleReset}
            className={`brutalist-button bg-white text-black border-4 border-white px-8 py-4 font-black text-lg transform hover:scale-105 active:scale-95 transition-transform ${resetFlash ? 'reset-flash' : ''}`}
            style={{
              clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))'
            }}
          >
            RESET SELECTION
          </button>
        </div>

        {/* Feedback Messages */}
        {selectedCount > 0 && (
          <div className="mt-8 text-center">
            <div className="brutalist-message bg-yellow-500 text-black px-6 py-3 inline-block transform -skew-x-6">
              <span className="font-black transform skew-x-6 block">
                {selectedCount > 5 
                  ? "MANY RESTRICTIONS APPLIED" 
                  : "FILTERS ACTIVATED"
                }
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Brutalist CSS */}
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&display=swap');
        
        .brutalist-container {
          font-family: 'JetBrains Mono', 'Courier New', monospace;
          position: relative;
        }
        
        .brutalist-header {
          position: relative;
        }
        
        .brutalist-line {
          animation: expand 0.5s ease-out;
        }
        
        .brutalist-counter {
          position: relative;
          box-shadow: 5px 5px 0 rgba(255, 255, 255, 0.3);
        }
        
        .brutalist-genre-card {
          position: relative;
          animation: slideInUp 0.6s ease-out forwards;
          opacity: 0;
          transform: translateY(20px);
        }
        
        .brutalist-content {
          position: relative;
        }
        
        .brutalist-button {
          position: relative;
          box-shadow: 5px 5px 0 rgba(255, 255, 255, 0.3);
        }
        
        .brutalist-message {
          box-shadow: 5px 5px 0 rgba(0, 0, 0, 0.3);
        }
        
        .glitch {
          animation: glitch 0.2s ease-in-out;
        }
        
        .reset-flash {
          animation: resetPulse 0.5s ease-out;
        }
        
        @keyframes slideInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes expand {
          from { width: 0; }
          to { width: 8rem; }
        }
        
        @keyframes flash {
          0%, 100% { background-color: transparent; }
          50% { background-color: rgba(255, 0, 0, 0.1); }
        }
        
        @keyframes glitch {
          0% { transform: translateX(0); }
          20% { transform: translateX(-2px); }
          40% { transform: translateX(2px); }
          60% { transform: translateX(-1px); }
          80% { transform: translateX(1px); }
          100% { transform: translateX(0); }
        }
        
        @keyframes resetPulse {
          0% { 
            background-color: white; 
            transform: scale(1);
          }
          50% { 
            background-color: #ff0000; 
            color: white;
            transform: scale(1.05);
          }
          100% { 
            background-color: white; 
            color: black;
            transform: scale(1);
          }
        }
        
        /* Mobile touch feedback */
        @media (hover: none) and (pointer: coarse) {
          .brutalist-genre-card button:active {
            transform: scale(0.9) !important;
          }
          
          .brutalist-button:active {
            transform: scale(0.95) !important;
          }
        }
        
        /* High contrast mode */
        @media (prefers-contrast: high) {
          .brutalist-container {
            background: #000000;
          }
          
          .brutalist-genre-card button {
            border-width: 6px;
          }
        }
        
        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .brutalist-genre-card {
            animation: none;
            opacity: 1;
            transform: none;
          }
          
          .glitch {
            animation: none;
          }
          
          * {
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}