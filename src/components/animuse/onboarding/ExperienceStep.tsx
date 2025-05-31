// src/components/animuse/onboarding/ExperienceStep.tsx - Mobile-Optimized Version
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

// Mobile-optimized experience card
const ExperienceCard: React.FC<{
  experience: typeof EXPERIENCE_LEVELS[0]; // Make sure EXPERIENCE_LEVELS is defined
  isSelected: boolean;
  onSelect: () => void;
  index: number; // Assuming index is still passed for potential animation delays if any
  isMobile: boolean;
}> = ({ experience, isSelected, onSelect, index, isMobile }) => {
  const [isHovered, setIsHovered] = useState(false); // For desktop hover state

  // --- MOBILE CARD IMPLEMENTATION ---
  if (isMobile) {
    return (
      <div className="w-full">
        {/* Visual indicator for selection (e.g., glow), does not affect layout/interaction layer */}
        {isSelected && (
          <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-primary-action/40 to-brand-accent-gold/40 rounded-2xl blur-sm pointer-events-none"></div>
        )}
        <button
          onClick={onSelect}
          className={`
            relative w-full p-4 rounded-2xl border transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-brand-primary-action focus:ring-offset-2 focus:ring-offset-brand-background 
            /* --- Z-INDEX STRATEGY FOR MOBILE --- */
            ${isSelected
              ? 'z-0' // Selected card is at base interactive layer
              : 'z-10 active:z-20 active:scale-105' // Non-selected is above selected; active non-selected is highest & scales
            }
            /* --- STYLING BASED ON SELECTION --- */
            ${isSelected
              ? `bg-gradient-to-r ${experience.color} bg-opacity-20 border-white/40 text-white`
              : 'bg-black/40 border-white/20 text-white/90 hover:bg-black/50' // Subtle hover for non-selected
            }
          `}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          {/* Main content row (Emoji, Label, Badge, Level) */}
          <div className="flex items-center gap-3">
            <div className={`text-3xl flex-shrink-0 ${isSelected && !isHovered ? 'animate-pulse' : ''}`}>
              {experience.emoji}
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-heading font-bold text-base">
                    {experience.label}
                  </h4>
                  <p className="text-xs text-white/70 mt-0.5">
                    {experience.badge}
                  </p>
                </div>
                <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r ${experience.color} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                  Lv.{experience.level}
                </div>
              </div>
              <p className="text-xs text-white/80 mt-2 leading-relaxed">
                {experience.description}
              </p>
            </div>
          </div>

          {/* Expandable section for traits and recommendation (only if selected) */}
          {isSelected && (
            <div className="mt-3 pt-3 border-t border-white/20 space-y-2 animate-fade-in">
              <div className="flex flex-wrap gap-1">
                {experience.traits.map((trait) => (
                  <span
                    key={trait}
                    className="text-xs px-2 py-0.5 rounded-full bg-white/20 border border-white/30 text-white"
                  >
                    {trait}
                  </span>
                ))}
              </div>
              <p className="text-xs text-white/90 italic">
                💡 {experience.recommendation}
              </p>
            </div>
          )}

          {/* Selection Indicator Icon */}
          {isSelected && (
            <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-white rounded-full border-2 border-current flex items-center justify-center shadow-lg pointer-events-none">
              <svg className="w-3 h-3 text-current" fill="currentColor" viewBox="0 0 20 20">
                <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
              </svg>
            </div>
          )}
        </button>
      </div>
    );
  }

  // --- DESKTOP CARD IMPLEMENTATION ---
  return (
    <div className="group relative w-full">
      {/* Desktop glow effect (visual only, pointer-events-none) */}
      <div className={`absolute -inset-2 bg-gradient-to-r ${experience.color} rounded-3xl blur-xl transition-all duration-300 pointer-events-none ${
        (isSelected && !isHovered) // Persistent but subtle glow for selected
          ? 'opacity-50'
          : isHovered // Stronger glow on hover
          ? 'opacity-40 scale-105' // Match hover scale for glow
          : 'opacity-0'
      }`}></div>
      
      {/* Selection ring for selected items (visual cue without scaling, pointer-events-none) */}
      {isSelected && !isHovered && (
        <div className="absolute -inset-1 bg-gradient-to-r from-white/40 to-white/20 rounded-3xl pointer-events-none"></div>
      )}
      
      <button
        onClick={onSelect}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          relative w-full p-6 rounded-3xl border transition-all duration-300 transform 
          focus:outline-none focus:ring-2 focus:ring-brand-primary-action focus:ring-offset-2 focus:ring-offset-brand-background
          /* --- Z-INDEX STRATEGY FOR DESKTOP --- */
          ${isSelected
            ? 'z-0' // Selected card: base interactive layer
            : 'z-10 hover:z-20 hover:scale-105' // Non-selected: above selected; hovered non-selected is highest & scales
          }
          /* --- STYLING BASED ON SELECTION --- */
          ${isSelected 
            ? `bg-gradient-to-br ${experience.color} border-white/30 text-white shadow-xl`
            : 'bg-black/40 backdrop-blur-sm border-white/20 hover:border-white/40 hover:bg-black/60 text-white/90'
          }
        `}
      >
        {/* Desktop card content (Emoji, Label, Badge, Level, Description, Traits, Recommendation) */}
        <div className="relative z-10 space-y-4"> {/* Ensure content is above potential pseudo-elements if any */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className={`text-4xl flex-shrink-0 transition-transform duration-300 ${
                isSelected && !isHovered ? 'animate-bounce' : '' 
              }`}>
                {experience.emoji}
              </div>
              <div className="text-left min-w-0 flex-1">
                <h4 className="font-heading font-bold text-lg">
                  {experience.label}
                </h4>
                <p className="text-xs opacity-80">{experience.badge}</p>
              </div>
            </div>
            <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${experience.color} flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0`}>
              <span className="text-sm">{experience.level}</span>
            </div>
          </div>
          <p className="text-sm leading-relaxed opacity-80">
            {experience.description}
          </p>
          <div className="flex flex-wrap gap-2">
            {experience.traits.map((trait) => (
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
          </div>
          {isSelected && (
            <div className="pt-3 border-t border-white/20 animate-fade-in">
              <p className="text-xs opacity-80 italic leading-relaxed">
                💡 {experience.recommendation}
              </p>
            </div>
          )}
        </div>
        
        {/* Selection Indicator Icon */}
        {isSelected && (
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full border-4 border-current flex items-center justify-center shadow-lg pointer-events-none">
            <svg className="w-4 h-4 text-current" fill="currentColor" viewBox="0 0 20 20">
              <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
            </svg>
          </div>
        )}
      </button>
    </div>
  );
};

// Level Progress Bar Component
const LevelProgressBar: React.FC<{ currentLevel: number; maxLevel: number }> = ({ 
  currentLevel, 
  maxLevel 
}) => {
  return (
    <div className="relative w-full h-2 sm:h-3 bg-black/40 rounded-full overflow-hidden backdrop-blur-sm border border-white/20">
      <div
        className="h-full bg-gradient-to-r from-brand-primary-action via-brand-accent-gold to-brand-accent-peach transition-all duration-1000 ease-out"
        style={{ width: `${(currentLevel / maxLevel) * 100}%` }}
      />
      
      {/* Level markers */}
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

export default function ExperienceStep({ data, updateData }: ExperienceStepProps) {
  const [selectedExperience, setSelectedExperience] = useState<typeof EXPERIENCE_LEVELS[0] | null>(
    EXPERIENCE_LEVELS.find(exp => exp.label === data.experienceLevel) || null
  );
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 640);
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
      {/* Simplified background for mobile */}
      {!isMobile && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-8 left-12 w-24 h-24 bg-gradient-to-br from-brand-primary-action/20 to-transparent rounded-full blur-xl opacity-60"></div>
          <div className="absolute bottom-12 right-16 w-32 h-32 bg-gradient-to-tl from-brand-accent-gold/15 to-transparent rounded-full blur-xl opacity-60"></div>
        </div>
      )}

      <div className="relative z-10 space-y-4 sm:space-y-6 md:space-y-8">
        {/* Header Section - Mobile Optimized */}
        <div className="text-center space-y-3 sm:space-y-4">
          <div className="relative inline-block">
            <div className={`relative ${isMobile ? 'bg-black/60' : 'bg-black/30 backdrop-blur-sm'} border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6`}>
              <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                <span className="text-xl sm:text-2xl md:text-3xl">🎯</span>
                <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-heading font-bold">
                  <span className="bg-gradient-to-r from-brand-primary-action to-brand-accent-gold bg-clip-text text-transparent">
                    {isMobile ? "Experience Level" : "Your Anime Experience"}
                  </span>
                </h3>
                <span className="text-xl sm:text-2xl md:text-3xl">⚡</span>
              </div>
              <p className="text-white/80 text-xs sm:text-sm md:text-base leading-relaxed">
                {isMobile 
                  ? "How deep is your anime journey?"
                  : "Help us understand your anime journey so far."
                }
              </p>
            </div>
          </div>

          {/* Progress Indicator - Mobile Optimized */}
          {selectedExperience && (
            <div className="max-w-xs sm:max-w-md mx-auto space-y-2 sm:space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-white/80">Experience Level</span>
                <span className="text-xs sm:text-sm font-bold text-brand-accent-gold">
                  Level {selectedExperience.level}/4
                </span>
              </div>
              <LevelProgressBar currentLevel={selectedExperience.level} maxLevel={4} />
              <p className="text-xs text-white/60">
                {selectedExperience.badge} Status
              </p>
            </div>
          )}
        </div>

        {/* Experience Cards - Different layouts for mobile/desktop */}
        <div className={isMobile ? 'space-y-3' : 'grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6'}>
          {EXPERIENCE_LEVELS.map((experience, index) => (
            <ExperienceCard
              key={experience.id}
              experience={experience}
              isSelected={selectedExperience?.id === experience.id}
              onSelect={() => handleSelect(experience)}
              index={index}
              isMobile={isMobile}
            />
          ))}
        </div>

        {/* Selected Experience Summary - Mobile Optimized */}
        {selectedExperience && !isMobile && (
          <div className="relative animate-fade-in">
            <div className={`absolute -inset-3 bg-gradient-to-r ${selectedExperience.color} rounded-3xl blur-xl opacity-40`}></div>
            <div className={`relative bg-gradient-to-r ${selectedExperience.color} bg-opacity-20 backdrop-blur-sm border border-white/30 rounded-3xl p-6`}>
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center space-x-3">
                  <span className="text-4xl">{selectedExperience.emoji}</span>
                  <div>
                    <h4 className="text-xl font-heading text-white font-bold">
                      {selectedExperience.badge}
                    </h4>
                    <p className="text-white/80 text-sm">Level {selectedExperience.level} Anime Fan</p>
                  </div>
                  <span className="text-4xl">🎊</span>
                </div>
                
                <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                  <h5 className="text-lg font-heading text-brand-accent-gold mb-2">
                    Personalization Strategy
                  </h5>
                  <p className="text-white/90 text-sm leading-relaxed">
                    {selectedExperience.recommendation}
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-2 justify-center">
                  {selectedExperience.traits.map((trait) => (
                    <span
                      key={trait}
                      className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-3 py-1 text-white text-xs font-medium"
                    >
                      ✨ {trait}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick comparison on mobile */}
        {isMobile && (
          <div className="mt-6 p-4 bg-black/40 rounded-2xl border border-white/10">
            <h5 className="text-sm font-heading text-white/80 mb-3 text-center">Quick Level Guide</h5>
            <div className="space-y-2">
              {EXPERIENCE_LEVELS.map((exp) => (
                <div 
                  key={exp.id}
                  className={`flex items-center gap-2 text-xs ${
                    selectedExperience?.id === exp.id 
                      ? 'text-brand-accent-gold' 
                      : 'text-white/60'
                  }`}
                >
                  <span>{exp.emoji}</span>
                  <span className="font-medium">Lv.{exp.level}</span>
                  <span>-</span>
                  <span>{exp.shortLabel}</span>
                </div>
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
          animation: fade-in 0.4s ease-out forwards;
        }

        /* Touch feedback for mobile */
        @media (hover: none) and (pointer: coarse) {
          button:active {
            transform: scale(0.98) !important;
            opacity: 0.9 !important;
          }
        }
      `}</style>
    </div>
  );
}