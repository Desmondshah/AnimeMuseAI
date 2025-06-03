// src/hooks/useSmartContext.ts - FIXED VERSION
// Create this file in src/hooks/ folder (NOT in convex/ folder)

import { useState, useEffect, useCallback } from 'react';

interface UserContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: string;
  season: 'spring' | 'summer' | 'fall' | 'winter';
  isWeekend: boolean;
  weatherMood?: 'sunny' | 'cloudy' | 'rainy' | 'stormy';
  deviceType: 'mobile' | 'tablet' | 'desktop';
  networkSpeed: 'slow' | 'fast';
  batteryLevel?: 'low' | 'medium' | 'high';
}

interface AdvancedMoodPreset {
  id: string;
  name: string;
  emoji: string;
  description: string;
  cues: Array<{
    label: string;
    intensity: number;
    weight: number; // How important this cue is (0-1)
  }>;
  tags: string[];
  category: 'emotional' | 'atmospheric' | 'thematic' | 'experiential';
  targetAudience: 'beginner' | 'intermediate' | 'advanced' | 'all';
  seasonalRelevance?: 'spring' | 'summer' | 'fall' | 'winter';
  timeRelevance?: 'morning' | 'afternoon' | 'evening' | 'night';
  estimatedResults: number;
  complexity: 1 | 2 | 3 | 4 | 5;
}

const ADVANCED_MOOD_PRESETS: AdvancedMoodPreset[] = [
  {
    id: 'cozy_autumn_evening',
    name: 'Cozy Autumn Evening',
    emoji: '🍂',
    description: 'Perfect for crisp fall nights with warm drinks and soft lighting',
    cues: [
      { label: 'Nostalgic', intensity: 4, weight: 0.9 },
      { label: 'Heartwarming', intensity: 3, weight: 0.8 },
      { label: 'Slow Burn', intensity: 4, weight: 0.7 },
      { label: 'Chill Vibes', intensity: 3, weight: 0.6 }
    ],
    tags: ['cozy', 'seasonal', 'relaxing', 'introspective'],
    category: 'atmospheric',
    targetAudience: 'all',
    seasonalRelevance: 'fall',
    timeRelevance: 'evening',
    estimatedResults: 8,
    complexity: 2
  },
  {
    id: 'summer_adventure_marathon',
    name: 'Summer Adventure Marathon',
    emoji: '🌅',
    description: 'High-energy adventures perfect for long summer days',
    cues: [
      { label: 'Epic Adventure', intensity: 5, weight: 1.0 },
      { label: 'Strong Friendships', intensity: 4, weight: 0.8 },
      { label: 'Action Packed', intensity: 4, weight: 0.7 },
      { label: 'Inspiring', intensity: 3, weight: 0.6 }
    ],
    tags: ['energetic', 'friendship', 'adventure', 'marathon'],
    category: 'experiential',
    targetAudience: 'all',
    seasonalRelevance: 'summer',
    timeRelevance: 'afternoon',
    estimatedResults: 12,
    complexity: 3
  },
  {
    id: 'midnight_psychological_thriller',
    name: 'Midnight Psychological Thriller',
    emoji: '🌙',
    description: 'Dark, complex narratives for late-night viewing',
    cues: [
      { label: 'Dark & Gritty', intensity: 4, weight: 0.9 },
      { label: 'Mind-Bending', intensity: 5, weight: 0.8 },
      { label: 'Complex Characters', intensity: 4, weight: 0.8 },
      { label: 'Edge of Seat', intensity: 3, weight: 0.6 }
    ],
    tags: ['psychological', 'mature', 'complex', 'thriller'],
    category: 'thematic',
    targetAudience: 'advanced',
    timeRelevance: 'night',
    estimatedResults: 6,
    complexity: 5
  },
  {
    id: 'rainy_day_comfort',
    name: 'Rainy Day Comfort',
    emoji: '☔',
    description: 'Gentle, comforting anime for staying indoors',
    cues: [
      { label: 'Heartwarming', intensity: 4, weight: 0.9 },
      { label: 'Chill Vibes', intensity: 5, weight: 0.8 },
      { label: 'Melancholic', intensity: 2, weight: 0.5 },
      { label: 'Stunning Visuals', intensity: 3, weight: 0.7 }
    ],
    tags: ['comfort', 'indoor', 'gentle', 'peaceful'],
    category: 'emotional',
    targetAudience: 'all',
    estimatedResults: 10,
    complexity: 2
  },
  {
    id: 'artistic_masterpiece_dive',
    name: 'Artistic Masterpiece Dive',
    emoji: '🎨',
    description: 'Visually stunning anime that push artistic boundaries',
    cues: [
      { label: 'Stunning Visuals', intensity: 5, weight: 1.0 },
      { label: 'Unique Art Style', intensity: 5, weight: 0.9 },
      { label: 'Thought-Provoking', intensity: 4, weight: 0.7 },
      { label: 'Fantasy & Magical', intensity: 3, weight: 0.6 }
    ],
    tags: ['artistic', 'visual', 'masterpiece', 'boundary-pushing'],
    category: 'experiential',
    targetAudience: 'intermediate',
    estimatedResults: 5,
    complexity: 4
  },
  {
    id: 'wholesome_family_time',
    name: 'Wholesome Family Time',
    emoji: '👨‍👩‍👧‍👦',
    description: 'Family-friendly anime with positive messages',
    cues: [
      { label: 'Heartwarming', intensity: 5, weight: 0.9 },
      { label: 'Inspiring', intensity: 4, weight: 0.8 },
      { label: 'Strong Friendships', intensity: 4, weight: 0.7 },
      { label: 'Comedic', intensity: 3, weight: 0.6 }
    ],
    tags: ['family', 'wholesome', 'positive', 'uplifting'],
    category: 'emotional',
    targetAudience: 'beginner',
    estimatedResults: 15,
    complexity: 1
  }
];

export const useSmartContext = () => {
  const [context, setContext] = useState<UserContext | null>(null);

  useEffect(() => {
    const detectContext = () => {
      const now = new Date();
      const hour = now.getHours();
      const month = now.getMonth();
      const day = now.getDay();

      const timeOfDay: UserContext['timeOfDay'] = 
        hour < 6 ? 'night' :
        hour < 12 ? 'morning' :
        hour < 18 ? 'afternoon' :
        hour < 22 ? 'evening' : 'night';

      const season: UserContext['season'] = 
        month < 3 || month === 11 ? 'winter' :
        month < 6 ? 'spring' :
        month < 9 ? 'summer' : 'fall';

      const deviceType: UserContext['deviceType'] = 
        window.innerWidth < 768 ? 'mobile' :
        window.innerWidth < 1024 ? 'tablet' : 'desktop';

      // Detect network speed (simplified)
      const connection = (navigator as any).connection;
      const networkSpeed: UserContext['networkSpeed'] = 
        connection?.effectiveType?.includes('4g') ? 'fast' : 'slow';

      // Detect battery level (if available)
      let batteryLevel: UserContext['batteryLevel'] | undefined;
      if ('getBattery' in navigator) {
        (navigator as any).getBattery().then((battery: any) => {
          batteryLevel = 
            battery.level < 0.2 ? 'low' :
            battery.level < 0.5 ? 'medium' : 'high';
        });
      }

      setContext({
        timeOfDay,
        dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
        season,
        isWeekend: day === 0 || day === 6,
        deviceType,
        networkSpeed,
        batteryLevel
      });
    };

    detectContext();

    // Update context every hour
    const interval = setInterval(detectContext, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getContextualSuggestions = useCallback((): AdvancedMoodPreset[] => {
    if (!context) return [];

    return ADVANCED_MOOD_PRESETS.filter((preset: AdvancedMoodPreset) => {
      // Filter by time relevance
      if (preset.timeRelevance && preset.timeRelevance !== context.timeOfDay) {
        return false;
      }

      // Filter by seasonal relevance
      if (preset.seasonalRelevance && preset.seasonalRelevance !== context.season) {
        return false;
      }

      // Filter by device capabilities
      if (context.deviceType === 'mobile' && preset.complexity >= 4) {
        return false; // Skip complex presets on mobile
      }

      // Filter by network speed
      if (context.networkSpeed === 'slow' && preset.estimatedResults > 10) {
        return false; // Fewer results for slow connections
      }

      return true;
    });
  }, [context]);

  // FIXED: Return single preset, not array
  const getOptimalPresetForContext = useCallback((): AdvancedMoodPreset | null => {
    const suggestions = getContextualSuggestions();
    if (suggestions.length === 0) return null;

    // Score presets based on context match
    interface ScoredPreset {
      preset: AdvancedMoodPreset;
      score: number;
    }

    const scoredPresets: ScoredPreset[] = suggestions.map((preset: AdvancedMoodPreset) => {
      let score = 0;

      // Time match bonus
      if (preset.timeRelevance === context?.timeOfDay) score += 3;
      
      // Season match bonus
      if (preset.seasonalRelevance === context?.season) score += 2;
      
      // Weekend bonus for relaxed presets
      if (context?.isWeekend && preset.category === 'emotional') score += 1;
      
      // Weekday bonus for energetic presets
      if (!context?.isWeekend && preset.category === 'experiential') score += 1;

      return { preset, score };
    });

    // FIXED: Explicit types for sort function parameters
    scoredPresets.sort((a: ScoredPreset, b: ScoredPreset) => b.score - a.score);
    return scoredPresets[0]?.preset || null;
  }, [context, getContextualSuggestions]); // FIXED: Added getContextualSuggestions to dependencies

  return {
    context,
    getContextualSuggestions,
    getOptimalPresetForContext,
    // Export presets for use in components
    ADVANCED_MOOD_PRESETS
  };
};

// Export types for use in other components
export type { UserContext, AdvancedMoodPreset };