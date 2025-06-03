// components/MoodCueCard.tsx
import React, { memo, useState } from 'react';

interface MoodCue {
  id: string;
  label: string;
  emoji: string;
  color: string;
  category: string;
  intensity?: number;
  description?: string;
  tags?: string[];
}

interface MoodCueCardProps {
  cue: MoodCue;
  isSelected: boolean;
  onToggle: (label: string) => void;
  intensity: number;
  onIntensityChange: (cueId: string, intensity: number) => void;
  showIntensity: boolean;
  className?: string;
}

const MoodCueCard: React.FC<MoodCueCardProps> = ({
  cue,
  isSelected,
  onToggle,
  intensity,
  onIntensityChange,
  showIntensity,
  className = ''
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle(cue.label);
    }
  };

  return (
    <div className={`group relative ${className}`}>
      <button
        onClick={() => onToggle(cue.label)}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`w-full relative overflow-hidden rounded-2xl p-2 sm:p-3 md:p-4 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-brand-primary-action focus:ring-offset-2 ${
          isSelected 
            ? 'shadow-2xl shadow-brand-primary-action/50 scale-105' 
            : 'hover:shadow-xl hover:shadow-white/20'
        }`}
        aria-pressed={isSelected}
        aria-describedby={`${cue.id}-description`}
        title={`${cue.label}: ${cue.description}`}
      >
        {/* Background Gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${cue.color} ${
          isSelected ? 'opacity-80' : 'opacity-40'
        } transition-opacity duration-300`}></div>
        
        {/* Selected Ring */}
        {isSelected && (
          <div className="absolute inset-0 ring-2 ring-white/60 rounded-2xl animate-pulse"></div>
        )}
        
        {/* Content */}
        <div className="relative z-10 text-center space-y-1">
          <div className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl transition-transform duration-300 ${
            isSelected ? 'animate-bounce' : 'group-hover:animate-pulse'
          }`}>
            {cue.emoji}
          </div>
          <div className={`text-xs sm:text-sm font-medium transition-colors duration-300 leading-tight ${
            isSelected ? 'text-white' : 'text-white/90'
          }`}>
            {cue.label}
          </div>
          
          {/* Category Badge (when not filtering by category) */}
          <div className="text-xs text-white/60 opacity-0 group-hover:opacity-100 transition-opacity">
            {cue.category.replace(/\s+/g, ' ').substring(0, 12)}
          </div>
        </div>
        
        {/* Hover Effect */}
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
      </button>

      {/* Tooltip */}
      {showTooltip && cue.description && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-xs rounded-lg whitespace-nowrap z-50 max-w-xs">
          {cue.description}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black/90"></div>
        </div>
      )}

      {/* Intensity Slider */}
      {showIntensity && isSelected && (
        <div className="mt-2 transition-opacity duration-200">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/60 w-8">Low</span>
            <input
              type="range"
              min="1"
              max="5"
              value={intensity}
              onChange={(e) => onIntensityChange(cue.id, parseInt(e.target.value))}
              className="flex-1 h-1 bg-white/20 rounded-lg appearance-none slider"
              style={{
                background: `linear-gradient(to right, #FF6B35 0%, #FF6B35 ${(intensity - 1) * 25}%, rgba(255,255,255,0.2) ${(intensity - 1) * 25}%, rgba(255,255,255,0.2) 100%)`
              }}
              aria-label={`Intensity for ${cue.label}`}
            />
            <span className="text-xs text-white/60 w-8">High</span>
          </div>
          <div className="text-center mt-1">
            <span className="text-xs text-brand-accent-gold">{"★".repeat(intensity)}</span>
          </div>
        </div>
      )}

      {/* Screen reader description */}
      <div id={`${cue.id}-description`} className="sr-only">
        {cue.description}. Currently {isSelected ? 'selected' : 'not selected'}.
        {showIntensity && isSelected && ` Intensity level ${intensity} out of 5.`}
        {cue.tags && ` Tags: ${cue.tags.join(', ')}.`}
      </div>
    </div>
  );
};

export default memo(MoodCueCard);