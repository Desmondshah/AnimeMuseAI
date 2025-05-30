// src/components/animuse/onboarding/ExperienceStep.tsx - Mobile-First Optimized
import React, { useState, useEffect } from "react";
import StyledButton from "../shared/StyledButton";

const EXPERIENCE_LEVELS = [
  {
    id: "newbie",
    label: "Newbie",
    shortLabel: "Just starting!",
    emoji: "🌱",
    color: "from-green-400 to-emerald-500",
    description: "Ready to explore the amazing world of anime",
    level: 1,
    badge: "Seedling Explorer",
    traits: ["Curious", "Open-minded", "Fresh perspective"],
    recommendation: "We'll start with accessible, popular series!"
  },
  {
    id: "casual",
    label: "Casual Viewer",
    shortLabel: "Entertainment fan",
    emoji: "🎭",
    color: "from-blue-400 to-cyan-500",
    description: "Enjoying anime as entertainment",
    level: 2,
    badge: "Casual Enthusiast", 
    traits: ["Selective", "Balanced", "Mainstream taste"],
    recommendation: "Mix of popular hits and hidden gems!"
  },
  {
    id: "seasoned",
    label: "Seasoned Fan",
    shortLabel: "Genre expert",
    emoji: "⚡",
    color: "from-purple-500 to-indigo-600",
    description: "Deep appreciation for the medium",
    level: 3,
    badge: "Anime Veteran",
    traits: ["Knowledgeable", "Analytical", "Genre-aware"],
    recommendation: "Diverse genres and deeper storytelling!"
  },
  {
    id: "legend",
    label: "Otaku Legend",
    shortLabel: "Culture expert",
    emoji: "👑",
    color: "from-yellow-400 to-orange-500",
    description: "Living and breathing anime culture",
    level: 4,
    badge: "Master Otaku",
    traits: ["Expert", "Passionate", "Culture-immersed"],
    recommendation: "Obscure classics and avant-garde series!"
  }
];

interface ExperienceStepProps {
  data: { experienceLevel: string };
  updateData: (data: { experienceLevel: string }) => void;
}

// Simplified floating orb for mobile
const ExperienceOrb: React.FC<{ 
  level: number; 
  delay?: number;
  shouldShow: boolean;
}> = ({ level, delay = 0, shouldShow }) => {
  if (!shouldShow) return null;
  
  const orbs = ["✨", "⭐", "🌟", "💫"];
  const orb = orbs[(level - 1) % orbs.length];
  
  return (
    <div 
      className="absolute w-3 h-3 opacity-40 animate-pulse hidden sm:block"
      style={{ 
        animationDelay: `${delay}s`, 
        left: `${20 + Math.random() * 60}%`, 
        top: `${20 + Math.random() * 60}%`,
        animationDuration: `${3 + Math.random()}s`
      }}
    >
      <span className="text-sm">{orb}</span>
    </div>
  );
};

// Mobile-optimized progress bar
const LevelProgressBar: React.FC<{ currentLevel: number; maxLevel: number }> = ({ 
  currentLevel, 
  maxLevel 
}) => {
  return (
    <div className="relative w-full h-2 sm:h-3 bg-black/40 rounded-full overflow-hidden backdrop-blur-sm border border-white/20">
      <div
        className="h-full bg-gradient-to-r from-brand-primary-action via-brand-accent-gold to-brand-accent-peach transition-all duration-1000 ease-out"
        style={{ width: `${(currentLevel / maxLevel) * 100}%` }}
      >
      </div>
      
      {/* Level markers - hidden on small mobile */}
      <div className="hidden xs:block">
        {Array.from({ length: maxLevel }, (_, i) => (
          <div
            key={i}
            className={`absolute top-0 bottom-0 w-0.5 ${
              i < currentLevel ? 'bg-white/60' : 'bg-white/20'
            }`}
            style={{ left: `${((i + 1) / maxLevel) * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
};

// Mobile-first experience card
const ExperienceCard: React.FC<{
  experience: typeof EXPERIENCE_LEVELS[0];
  isSelected: boolean;
  onSelect: () => void;
  index: number;
}> = ({ experience, isSelected, onSelect, index }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div className="group relative w-full">
      {/* Simplified glow effect - hidden on mobile */}
      <div className={`absolute -inset-1 sm:-inset-2 bg-gradient-to-r ${experience.color} rounded-2xl sm:rounded-3xl blur-sm sm:blur-xl transition-all duration-300 ${
        isSelected 
          ? 'opacity-60 sm:opacity-80' 
          : isHovered 
          ? 'opacity-30 sm:opacity-40' 
          : 'opacity-0'
      } hidden sm:block`}></div>
      
      {/* Selection ring - simplified for mobile */}
      {isSelected && (
        <div className="absolute -inset-0.5 sm:-inset-1 bg-gradient-to-r from-white/40 to-white/20 rounded-2xl sm:rounded-3xl"></div>
      )}
      
      <button
        onClick={onSelect}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`relative w-full p-3 sm:p-4 md:p-6 rounded-2xl sm:rounded-3xl border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-brand-primary-action/50 touch-manipulation ${
          isSelected 
            ? `bg-gradient-to-br ${experience.color} border-white/40 text-white shadow-lg` 
            : 'bg-black/40 backdrop-blur-sm border-white/20 hover:border-white/40 hover:bg-black/60 text-white/90'
        }`}
      >
        <div className="relative z-10 space-y-2 sm:space-y-3 md:space-y-4">
          {/* Header - mobile optimized */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
              <div className={`text-2xl sm:text-3xl md:text-4xl flex-shrink-0 transition-transform duration-300 ${
                isSelected ? 'animate-bounce' : ''
              }`}>
                {experience.emoji}
              </div>
              <div className="text-left min-w-0 flex-1">
                <h4 className="font-heading font-bold text-sm sm:text-base md:text-lg truncate">
                  <span className="sm:hidden">{experience.shortLabel}</span>
                  <span className="hidden sm:inline">{experience.label}</span>
                </h4>
                <p className="text-xs opacity-80 truncate">{experience.badge}</p>
              </div>
            </div>
            
            {/* Level Badge */}
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r ${experience.color} flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0`}>
              <span className="text-xs sm:text-sm">{experience.level}</span>
            </div>
          </div>
          
          {/* Description - hidden on very small screens */}
          <p className="text-xs sm:text-sm leading-relaxed opacity-80 hidden xs:block">
            {experience.description}
          </p>
          
          {/* Traits - simplified for mobile */}
          <div className="flex flex-wrap gap-1 sm:gap-2">
            {experience.traits.slice(0, 2).map((trait, i) => (
              <span
                key={trait}
                className={`text-xs px-2 py-1 rounded-full border transition-all duration-300 ${
                  isSelected 
                    ? 'bg-white/20 border-white/40 text-white' 
                    : 'bg-white/10 border-white/20 text-white/80'
                }`}
              >
                {trait}
              </span>
            ))}
            {/* Show third trait only on larger screens */}
            <span className="hidden sm:inline-block">
              {experience.traits[2] && (
                <span
                  className={`text-xs px-2 py-1 rounded-full border transition-all duration-300 ${
                    isSelected 
                      ? 'bg-white/20 border-white/40 text-white' 
                      : 'bg-white/10 border-white/20 text-white/80'
                  }`}
                >
                  {experience.traits[2]}
                </span>
              )}
            </span>
          </div>
          
          {/* Recommendation - only show when selected on mobile */}
          {isSelected && (
            <div className="pt-2 sm:pt-3 border-t border-white/20 animate-fade-in">
              <p className="text-xs opacity-80 italic leading-relaxed">
                💡 {experience.recommendation}
              </p>
            </div>
          )}
        </div>
        
        {/* Selection Indicator - smaller on mobile */}
        {isSelected && (
          <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-full border-2 sm:border-4 border-current flex items-center justify-center shadow-lg">
            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-current" fill="currentColor" viewBox="0 0 20 20">
              <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
            </svg>
          </div>
        )}
      </button>
    </div>
  );
};

export default function ExperienceStep({ data, updateData }: ExperienceStepProps) {
  const [selectedExperience, setSelectedExperience] = useState<typeof EXPERIENCE_LEVELS[0] | null>(
    EXPERIENCE_LEVELS.find(exp => exp.label === data.experienceLevel) || null
  );
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSelect = (experience: typeof EXPERIENCE_LEVELS[0]) => {
    setSelectedExperience(experience);
    updateData({ experienceLevel: experience.label });
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto px-2 sm:px-4">
      {/* Simplified background particles - fewer on mobile */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Base ambient effects - simplified for mobile */}
        <div className="absolute top-4 sm:top-8 left-4 sm:left-12 w-12 sm:w-16 md:w-24 h-12 sm:h-16 md:h-24 bg-gradient-to-br from-brand-primary-action/10 sm:from-brand-primary-action/20 to-transparent rounded-full blur-lg sm:blur-xl opacity-60"></div>
        <div className="absolute bottom-4 sm:bottom-12 right-4 sm:right-16 w-16 sm:w-20 md:w-32 h-16 sm:h-20 md:h-32 bg-gradient-to-tl from-brand-accent-gold/8 sm:from-brand-accent-gold/15 to-transparent rounded-full blur-lg sm:blur-xl opacity-60"></div>
        
        {/* Dynamic experience particles - only on larger screens */}
        {selectedExperience && !isMobile && (
          <>
            <ExperienceOrb level={selectedExperience.level} delay={0} shouldShow={true} />
            <ExperienceOrb level={selectedExperience.level} delay={0.5} shouldShow={true} />
            <ExperienceOrb level={selectedExperience.level} delay={1} shouldShow={true} />
          </>
        )}
      </div>

      <div className="relative z-10 space-y-4 sm:space-y-6 md:space-y-8">
        {/* Header Section - mobile optimized */}
        <div className="text-center space-y-3 sm:space-y-4 md:space-y-6">
          <div className="relative inline-block">
            <div className="relative bg-black/30 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                <span className="text-xl sm:text-2xl md:text-3xl">🎯</span>
                <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-heading font-bold">
                  <span className="bg-gradient-to-r from-brand-primary-action to-brand-accent-gold bg-clip-text text-transparent">
                    Your Anime Experience
                  </span>
                </h3>
                <span className="text-xl sm:text-2xl md:text-3xl">⚡</span>
              </div>
              <p className="text-white/80 text-xs sm:text-sm md:text-base leading-relaxed">
                Help us understand your anime journey so far.
                <br className="hidden sm:block" />
                <span className="text-brand-accent-gold font-medium">Each level unlocks different styles!</span>
              </p>
            </div>
          </div>

          {/* Progress Indicator - mobile optimized */}
          {selectedExperience && (
            <div className="max-w-xs sm:max-w-md mx-auto space-y-2 sm:space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-white/80">Experience Level</span>
                <span className="text-xs sm:text-sm font-bold text-brand-accent-gold">
                  {selectedExperience.level}/4
                </span>
              </div>
              <LevelProgressBar currentLevel={selectedExperience.level} maxLevel={4} />
              <p className="text-xs text-white/60 truncate">
                {selectedExperience.badge} Status Unlocked!
              </p>
            </div>
          )}
        </div>

        {/* Experience Cards Grid - mobile-first layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
          {EXPERIENCE_LEVELS.map((experience, index) => (
            <ExperienceCard
              key={experience.id}
              experience={experience}
              isSelected={selectedExperience?.id === experience.id}
              onSelect={() => handleSelect(experience)}
              index={index}
            />
          ))}
        </div>

        {/* Selected Experience Summary - mobile optimized */}
        {selectedExperience && (
          <div className="relative animate-fade-in">
            <div className={`absolute -inset-1 sm:-inset-2 md:-inset-3 bg-gradient-to-r ${selectedExperience.color} rounded-2xl sm:rounded-3xl blur-sm sm:blur-xl opacity-20 sm:opacity-40`}></div>
            <div className={`relative bg-gradient-to-r ${selectedExperience.color} bg-opacity-20 backdrop-blur-sm border border-white/30 rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6`}>
              <div className="text-center space-y-3 sm:space-y-4">
                <div className="flex items-center justify-center space-x-2 sm:space-x-3">
                  <span className="text-2xl sm:text-3xl md:text-4xl">{selectedExperience.emoji}</span>
                  <div>
                    <h4 className="text-base sm:text-lg md:text-xl font-heading text-white font-bold">
                      {selectedExperience.badge}
                    </h4>
                    <p className="text-white/80 text-xs sm:text-sm">Level {selectedExperience.level} Anime Fan</p>
                  </div>
                  <span className="text-2xl sm:text-3xl md:text-4xl">🎊</span>
                </div>
                
                <div className="bg-black/30 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-white/20">
                  <h5 className="text-sm sm:text-base md:text-lg font-heading text-brand-accent-gold mb-2">
                    Personalization Strategy
                  </h5>
                  <p className="text-white/90 text-xs sm:text-sm leading-relaxed">
                    {selectedExperience.recommendation}
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-1 sm:gap-2 justify-center">
                  {selectedExperience.traits.map((trait) => (
                    <span
                      key={trait}
                      className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-2 sm:px-3 py-1 text-white text-xs font-medium"
                    >
                      ✨ {trait}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Experience Benefits - mobile grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          {EXPERIENCE_LEVELS.map((exp, index) => (
            <div 
              key={exp.id}
              className={`text-center p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all duration-300 ${
                selectedExperience?.id === exp.id
                  ? `bg-gradient-to-br ${exp.color} bg-opacity-20 border-white/40 scale-105`
                  : 'bg-black/20 border-white/10 hover:bg-black/30 hover:border-white/20'
              }`}
            >
              <div className="text-lg sm:text-xl md:text-2xl mb-1 sm:mb-2">{exp.emoji}</div>
              <h6 className="font-heading text-white font-medium text-xs sm:text-sm mb-1">
                Level {exp.level}
              </h6>
              <p className="text-white/70 text-xs leading-tight">
                {exp.badge}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile-optimized CSS */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.4s ease-out forwards;
        }

        /* Ensure no overflow on mobile */
        @media (max-width: 640px) {
          .animate-bounce {
            animation-duration: 2s;
          }
          
          .animate-pulse {
            animation-duration: 3s;
          }
          
          /* Prevent any potential overflow */
          * {
            max-width: 100%;
            box-sizing: border-box;
          }
        }

        /* Very small screens optimization */
        @media (max-width: 375px) {
          .blur-xl,
          .blur-lg {
            filter: blur(4px);
          }
          
          .backdrop-blur-sm {
            backdrop-filter: blur(2px);
          }
        }

        /* Reduce motion for better performance */
        @media (prefers-reduced-motion: reduce) {
          .animate-bounce,
          .animate-pulse {
            animation: none;
          }
          
          .transition-all,
          .transition-transform {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}