// src/components/animuse/onboarding/MoodStep.tsx - Mobile-Optimized Version
import React, { useState, useEffect } from "react";
import StyledButton from "../shared/StyledButton";

const MOODS_OPTIONS = [
  { id: "happy", label: "Happy", emoji: "😊", color: "from-yellow-400 to-orange-400", description: "Uplifting & joyful" },
  { id: "sad", label: "Sad", emoji: "😢", color: "from-blue-400 to-indigo-500", description: "Emotional & touching" },
  { id: "chill", label: "Chill", emoji: "😌", color: "from-green-400 to-teal-400", description: "Relaxed & peaceful" },
  { id: "dark", label: "Dark", emoji: "🌑", color: "from-gray-600 to-black", description: "Intense & mysterious" },
  { id: "excited", label: "Excited", emoji: "🤩", color: "from-pink-400 to-red-400", description: "Thrilling & energetic" },
  { id: "nostalgic", label: "Nostalgic", emoji: "⏳", color: "from-purple-400 to-pink-400", description: "Wistful & reflective" },
  { id: "thoughtProvoking", label: "Thought-Provoking", emoji: "🤔", color: "from-indigo-400 to-purple-500", description: "Deep & meaningful" },
  { id: "intense", label: "Intense", emoji: "🔥", color: "from-red-500 to-orange-600", description: "Powerful & gripping" },
  { id: "mysterious", label: "Mysterious", emoji: "🕵️", color: "from-purple-600 to-indigo-700", description: "Enigmatic & intriguing" },
];

interface MoodStepProps {
  data: { moods: string[] };
  updateData: (data: { moods: string[] }) => void;
}

export default function MoodStep({ data, updateData }: MoodStepProps) {
  const [hoveredMood, setHoveredMood] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleMood = (mood: string) => {
    const newMoods = data.moods.includes(mood)
      ? data.moods.filter((m) => m !== mood)
      : [...data.moods, mood];
    updateData({ moods: newMoods });
  };

  const selectedCount = data.moods.length;

  return (
    <div className="relative min-h-[400px] space-y-4 sm:space-y-8">
      {/* Simplified floating background for mobile */}
      {!isMobile && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-4 left-8 w-20 h-20 bg-gradient-to-br from-brand-accent-gold/20 to-transparent rounded-full blur-xl animate-pulse"></div>
          <div className="absolute bottom-6 right-12 w-24 h-24 bg-gradient-to-tl from-brand-primary-action/15 to-transparent rounded-full blur-xl animate-pulse delay-1000"></div>
        </div>
      )}

      {/* Header Section - Mobile Optimized */}
      <div className="step-header-section text-center space-y-3 sm:space-y-4">
        <div className="relative inline-block">
          <div className={`relative ${isMobile ? 'bg-black/60' : 'bg-black/30 backdrop-blur-sm'} border border-white/10 rounded-2xl p-4 sm:p-6`}>
            <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
              <span className="text-2xl sm:text-3xl">😌</span>
              <h3 className="step-title text-xl sm:text-2xl md:text-3xl font-heading font-bold">
                <span className="bg-gradient-to-r from-brand-primary-action to-brand-accent-gold bg-clip-text text-transparent">
                  {isMobile ? "Your Vibe?" : "What's your current vibe?"}
                </span>
              </h3>
              <span className="text-2xl sm:text-3xl">✨</span>
            </div>
            <p className="step-subtitle text-white/80 text-sm sm:text-base leading-relaxed">
              {isMobile 
                ? "Pick moods that match your feeling"
                : "Select one or more moods that match how you're feeling right now."
              }
            </p>
          </div>
        </div>

        {/* Selection Counter - Mobile Friendly */}
        {selectedCount > 0 && (
          <div className="selection-counter inline-flex items-center space-x-2 bg-gradient-to-r from-brand-primary-action/20 to-brand-accent-gold/20 backdrop-blur-sm rounded-full px-4 sm:px-6 py-2 border border-white/10 animate-fade-in">
            <span className="text-base sm:text-lg">🎯</span>
            <span className="text-white font-medium text-xs sm:text-sm">
              {selectedCount} mood{selectedCount > 1 ? 's' : ''} selected
            </span>
          </div>
        )}
      </div>

      {/* Mood Grid - Mobile Optimized */}
      <div className={`mood-selection-grid ${isMobile ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-3 gap-4'} ${!isMobile && 'max-h-[300px] overflow-y-auto custom-scrollbar pr-2'}`}>
        {MOODS_OPTIONS.map((mood, index) => {
          const isSelected = data.moods.includes(mood.label);
          const isHovered = hoveredMood === mood.id;
          
          return (
            <div
              key={mood.id}
              className="relative group"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Selection Glow - Hidden on mobile */}
              {!isMobile && (
                <div className={`absolute -inset-2 bg-gradient-to-r ${mood.color} rounded-2xl blur-lg transition-all duration-300 ${
                  isSelected ? 'opacity-60 scale-105' : isHovered ? 'opacity-30' : 'opacity-0'
                }`}></div>
              )}
              
              {/* Mood Card */}
              <button
                onClick={() => toggleMood(mood.label)}
                onMouseEnter={() => !isMobile && setHoveredMood(mood.id)}
                onMouseLeave={() => !isMobile && setHoveredMood(null)}
                className={`mood-card relative w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all duration-200 ${
                  isSelected 
                    ? isMobile
                      ? 'selected bg-gradient-to-br from-brand-primary-action/20 to-brand-accent-gold/20 border-brand-primary-action text-white'
                      : `bg-gradient-to-br ${mood.color} border-white/30 text-white shadow-2xl scale-105`
                    : 'bg-black/40 backdrop-blur-sm border-white/10 hover:border-white/30 hover:bg-black/60 text-white/90'
                } ${!isMobile && 'transform hover:scale-105'}`}
              >
                <div className="theme-card-content relative z-10 text-center space-y-1 sm:space-y-2">
                  {/* Emoji */}
                  <div className={`mood-emoji text-2xl sm:text-3xl ${!isMobile && 'transition-transform duration-300'} ${
                    isSelected && !isMobile ? 'animate-bounce' : ''
                  }`}>
                    {mood.emoji}
                  </div>
                  
                  {/* Label */}
                  <div className="mood-label font-medium text-xs sm:text-sm">
                    {mood.label}
                  </div>
                  
                  {/* Description - Hidden on mobile */}
                  {!isMobile && (
                    <div className={`mood-description text-xs leading-relaxed transition-opacity duration-300 ${
                      isSelected || isHovered ? 'opacity-100' : 'opacity-70'
                    }`}>
                      {mood.description}
                    </div>
                  )}
                </div>
                
                {/* Selection Indicator */}
                {isSelected && (
                  <div className="selection-indicator absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-4 h-4 sm:w-6 sm:h-6 bg-white rounded-full border-2 border-current flex items-center justify-center animate-pulse">
                    <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-current" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                    </svg>
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Mood Combination Feedback - Mobile Friendly */}
      {selectedCount > 1 && (
        <div className="feedback-message relative animate-fade-in">
          {!isMobile && (
            <div className="absolute -inset-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl blur-lg opacity-60"></div>
          )}
          <div className={`relative ${isMobile ? 'bg-purple-500/20' : 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-sm'} border border-purple-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-4`}>
            <div className="flex items-center justify-center space-x-2 sm:space-x-3">
              <span className="text-xl sm:text-2xl">🎭</span>
              <div className="text-center">
                <p className="text-white font-medium text-xs sm:text-sm">
                  {isMobile 
                    ? "Great combo!"
                    : "Great combo! Your mood blend will help us find the perfect anime atmosphere."
                  }
                </p>
                {!isMobile && (
                  <div className="flex flex-wrap gap-1 justify-center mt-2">
                    {data.moods.map((mood) => (
                      <span key={mood} className="text-xs bg-white/20 text-white rounded-full px-2 py-1">
                        {mood}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-xl sm:text-2xl">✨</span>
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

        /* Touch feedback for mobile */
        @media (hover: none) and (pointer: coarse) {
          .mood-card:active {
            transform: scale(0.98) !important;
            opacity: 0.9 !important;
          }
        }
      `}</style>
    </div>
  );
}