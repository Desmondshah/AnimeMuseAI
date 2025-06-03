// data/advancedPresets.ts
export interface AdvancedMoodPreset {
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

export const ADVANCED_MOOD_PRESETS: AdvancedMoodPreset[] = [
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