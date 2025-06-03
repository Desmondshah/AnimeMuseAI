// services/moodSuggestionEngine.ts
interface UserMoodHistory {
  timestamp: number;
  selectedCues: string[];
  resultsSatisfaction: number; // 1-5 rating
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: string;
  season: 'spring' | 'summer' | 'fall' | 'winter';
}

interface MoodSuggestion {
  cues: string[];
  confidence: number;
  reason: string;
  category: 'trending' | 'personal' | 'seasonal' | 'contextual';
}

export class MoodSuggestionEngine {
  private history: UserMoodHistory[] = [];
  
  constructor() {
    this.loadHistory();
  }

  private loadHistory(): void {
    const stored = localStorage.getItem('mood-board-history');
    if (stored) {
      this.history = JSON.parse(stored);
    }
  }

  private saveHistory(): void {
    // Keep only last 50 mood board sessions
    const recentHistory = this.history.slice(-50);
    localStorage.setItem('mood-board-history', JSON.stringify(recentHistory));
  }

  recordMoodSession(
    selectedCues: string[], 
    satisfaction: number,
    resultCount: number
  ): void {
    const now = new Date();
    const timeOfDay = this.getTimeOfDay(now.getHours());
    const season = this.getSeason(now.getMonth());

    this.history.push({
      timestamp: Date.now(),
      selectedCues,
      resultsSatisfaction: satisfaction,
      timeOfDay,
      dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
      season
    });

    this.saveHistory();
  }

  generateSuggestions(): MoodSuggestion[] {
    const suggestions: MoodSuggestion[] = [];
    
    // Personal pattern suggestions
    suggestions.push(...this.getPersonalPatternSuggestions());
    
    // Contextual suggestions (time/season based)
    suggestions.push(...this.getContextualSuggestions());
    
    // Mood completion suggestions
    suggestions.push(...this.getMoodCompletionSuggestions());
    
    // Sort by confidence and return top 5
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }

  private getPersonalPatternSuggestions(): MoodSuggestion[] {
    if (this.history.length < 3) return [];

    // Find most successful mood combinations (high satisfaction)
    const successfulSessions = this.history.filter(h => h.resultsSatisfaction >= 4);
    const cueFrequency: Record<string, number> = {};

    successfulSessions.forEach(session => {
      session.selectedCues.forEach(cue => {
        cueFrequency[cue] = (cueFrequency[cue] || 0) + 1;
      });
    });

    const popularCues = Object.entries(cueFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 4)
      .map(([cue]) => cue);

    if (popularCues.length >= 2) {
      return [{
        cues: popularCues.slice(0, 3),
        confidence: 0.8,
        reason: "Based on your most satisfying mood combinations",
        category: 'personal'
      }];
    }

    return [];
  }

  private getContextualSuggestions(): MoodSuggestion[] {
    const now = new Date();
    const currentTimeOfDay = this.getTimeOfDay(now.getHours());
    const currentSeason = this.getSeason(now.getMonth());
    const suggestions: MoodSuggestion[] = [];

    // Time-based suggestions
    const timeBasedMoods = {
      morning: ['Inspiring', 'Chill Vibes', 'Heartwarming'],
      afternoon: ['Action Packed', 'Epic Adventure', 'Thought-Provoking'],
      evening: ['Nostalgic', 'Romantic', 'Slow Burn'],
      night: ['Dark & Gritty', 'Mind-Bending', 'Supernatural']
    };

    if (timeBasedMoods[currentTimeOfDay]) {
      suggestions.push({
        cues: timeBasedMoods[currentTimeOfDay],
        confidence: 0.6,
        reason: `Perfect for ${currentTimeOfDay} viewing`,
        category: 'contextual'
      });
    }

    // Seasonal suggestions
    const seasonalMoods = {
      spring: ['Coming of Age', 'Inspiring', 'Heartwarming'],
      summer: ['Epic Adventure', 'Strong Friendships', 'Chill Vibes'],
      fall: ['Nostalgic', 'Melancholic', 'Thought-Provoking'],
      winter: ['Heartwarming', 'Dark & Gritty', 'Fantasy & Magical'] // Fixed: Changed 'Cozy Comfort' to valid cue
    };

    if (seasonalMoods[currentSeason]) {
      suggestions.push({
        cues: seasonalMoods[currentSeason],
        confidence: 0.5,
        reason: `${currentSeason.charAt(0).toUpperCase() + currentSeason.slice(1)} vibes`,
        category: 'seasonal'
      });
    }

    return suggestions;
  }

  private getMoodCompletionSuggestions(): MoodSuggestion[] {
    // Suggest complementary moods based on common successful combinations
    const moodSynergies = {
      'Dark & Gritty': ['Complex Characters', 'Thought-Provoking', 'Social Commentary'],
      'Heartwarming': ['Strong Friendships', 'Coming of Age', 'Inspiring'],
      'Action Packed': ['Stunning Visuals', 'Epic Adventure', 'Edge of Seat'],
      'Chill Vibes': ['Nostalgic', 'Slow Burn', 'Heartwarming'],
      'Mind-Bending': ['Unique Art Style', 'Complex Characters', 'Thought-Provoking']
    };

    // This would be called when user has selected some cues already
    // For now, return a general completion suggestion
    return [{
      cues: ['Stunning Visuals', 'Unique Art Style', 'Fantasy & Magical'],
      confidence: 0.7,
      reason: "Complete your mood with visual excellence",
      category: 'trending'
    }];
  }

  private getTimeOfDay(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    if (hour < 22) return 'evening';
    return 'night';
  }

  private getSeason(month: number): 'spring' | 'summer' | 'fall' | 'winter' {
    if (month < 3 || month === 11) return 'winter';
    if (month < 6) return 'spring';
    if (month < 9) return 'summer';
    return 'fall';
  }
}

