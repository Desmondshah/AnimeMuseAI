// Enhanced MoodboardPage.tsx with expanded features
import React, { useState, useEffect, useCallback, memo, useMemo } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import StyledButton from "../shared/StyledButton";
import { toast } from "sonner";
import AnimeCard from "../AnimeCard";
import { AnimeRecommendation } from "../../../../convex/types";
import { Id } from "../../../../convex/_generated/dataModel";

// ============================================================================
// EXPANDED MOOD BOARD CUES - Organized by Categories
// ============================================================================

interface MoodCue {
  id: string;
  label: string;
  emoji: string;
  color: string;
  category: string;
  intensity?: number; // 1-5 scale for weighting
  description?: string;
  tags?: string[];
}

const MOOD_CATEGORIES = {
  EMOTIONAL_TONES: "Emotional Tones",
  VISUAL_STYLES: "Visual Styles", 
  PACING: "Pacing & Energy",
  THEMES: "Themes & Messages",
  ATMOSPHERE: "Atmosphere & Setting",
  CHARACTER_FOCUS: "Character Dynamics"
};

const EXPANDED_MOOD_CUES: MoodCue[] = [
  // EMOTIONAL TONES
  { 
    id: "dark_gritty", 
    label: "Dark & Gritty", 
    emoji: "💀", 
    color: "from-red-900 to-gray-900",
    category: MOOD_CATEGORIES.EMOTIONAL_TONES,
    intensity: 5,
    description: "Serious, mature, heavy themes",
    tags: ["mature", "serious", "psychological"]
  },
  { 
    id: "heartwarming", 
    label: "Heartwarming", 
    emoji: "🥰", 
    color: "from-pink-500 to-rose-400",
    category: MOOD_CATEGORIES.EMOTIONAL_TONES,
    intensity: 3,
    description: "Feel-good, uplifting, emotional",
    tags: ["wholesome", "emotional", "uplifting"]
  },
  { 
    id: "comedic_relief", 
    label: "Comedic", 
    emoji: "😂", 
    color: "from-green-400 to-emerald-400",
    category: MOOD_CATEGORIES.EMOTIONAL_TONES,
    intensity: 4,
    description: "Funny, lighthearted, humorous",
    tags: ["comedy", "funny", "lighthearted"]
  },
  { 
    id: "romantic", 
    label: "Romantic", 
    emoji: "💕", 
    color: "from-pink-400 to-red-400",
    category: MOOD_CATEGORIES.EMOTIONAL_TONES,
    intensity: 4,
    description: "Love stories, relationships, emotional connections",
    tags: ["love", "relationships", "emotional"]
  },
  { 
    id: "melancholic", 
    label: "Melancholic", 
    emoji: "🌧️", 
    color: "from-blue-600 to-indigo-800",
    category: MOOD_CATEGORIES.EMOTIONAL_TONES,
    intensity: 4,
    description: "Bittersweet, nostalgic, reflective sadness",
    tags: ["bittersweet", "sad", "reflective"]
  },
  { 
    id: "inspiring", 
    label: "Inspiring", 
    emoji: "⭐", 
    color: "from-yellow-400 to-orange-500",
    category: MOOD_CATEGORIES.EMOTIONAL_TONES,
    intensity: 5,
    description: "Motivational, uplifting, empowering",
    tags: ["motivational", "uplifting", "empowering"]
  },

  // VISUAL STYLES
  { 
    id: "stunning_visuals", 
    label: "Stunning Visuals", 
    emoji: "🎨", 
    color: "from-purple-500 to-pink-500",
    category: MOOD_CATEGORIES.VISUAL_STYLES,
    intensity: 4,
    description: "Beautiful animation, artistic excellence",
    tags: ["beautiful", "artistic", "visual"]
  },
  { 
    id: "retro_classic", 
    label: "Retro/Classic", 
    emoji: "📼", 
    color: "from-amber-600 to-orange-600",
    category: MOOD_CATEGORIES.VISUAL_STYLES,
    intensity: 3,
    description: "Vintage style, classic animation",
    tags: ["retro", "classic", "vintage"]
  },
  { 
    id: "modern_sleek", 
    label: "Modern & Sleek", 
    emoji: "🔮", 
    color: "from-cyan-500 to-blue-600",
    category: MOOD_CATEGORIES.VISUAL_STYLES,
    intensity: 3,
    description: "Contemporary animation style",
    tags: ["modern", "sleek", "contemporary"]
  },
  { 
    id: "unique_artstyle", 
    label: "Unique Art Style", 
    emoji: "🎭", 
    color: "from-purple-600 to-indigo-600",
    category: MOOD_CATEGORIES.VISUAL_STYLES,
    intensity: 5,
    description: "Distinctive, experimental visual approach",
    tags: ["unique", "experimental", "distinctive"]
  },

  // PACING & ENERGY
  { 
    id: "action_packed", 
    label: "Action Packed", 
    emoji: "💥", 
    color: "from-red-500 to-orange-500",
    category: MOOD_CATEGORIES.PACING,
    intensity: 5,
    description: "High energy, intense action sequences",
    tags: ["action", "intense", "fast-paced"]
  },
  { 
    id: "chill_vibes", 
    label: "Chill Vibes", 
    emoji: "😌", 
    color: "from-cyan-400 to-blue-400",
    category: MOOD_CATEGORIES.PACING,
    intensity: 2,
    description: "Relaxed, peaceful, slow-paced",
    tags: ["chill", "relaxing", "peaceful"]
  },
  { 
    id: "edge_of_seat", 
    label: "Edge of Seat", 
    emoji: "😰", 
    color: "from-orange-600 to-red-600",
    category: MOOD_CATEGORIES.PACING,
    intensity: 5,
    description: "Suspenseful, thrilling, tension-filled",
    tags: ["suspense", "thriller", "tense"]
  },
  { 
    id: "slow_burn", 
    label: "Slow Burn", 
    emoji: "🕯️", 
    color: "from-amber-500 to-yellow-600",
    category: MOOD_CATEGORIES.PACING,
    intensity: 3,
    description: "Gradual build-up, character development",
    tags: ["slow-burn", "gradual", "character-driven"]
  },

  // THEMES & MESSAGES
  { 
    id: "mind_bending", 
    label: "Mind-Bending", 
    emoji: "🧠", 
    color: "from-purple-600 to-indigo-500",
    category: MOOD_CATEGORIES.THEMES,
    intensity: 5,
    description: "Complex concepts, philosophical depth",
    tags: ["complex", "philosophical", "intellectual"]
  },
  { 
    id: "thought_provoking", 
    label: "Thought-Provoking", 
    emoji: "🤔", 
    color: "from-slate-400 to-gray-500",
    category: MOOD_CATEGORIES.THEMES,
    intensity: 4,
    description: "Deep themes, philosophical questions",
    tags: ["deep", "philosophical", "thoughtful"]
  },
  { 
    id: "coming_of_age", 
    label: "Coming of Age", 
    emoji: "🌱", 
    color: "from-green-500 to-emerald-500",
    category: MOOD_CATEGORIES.THEMES,
    intensity: 3,
    description: "Growing up, self-discovery, maturation",
    tags: ["growth", "self-discovery", "maturation"]
  },
  { 
    id: "social_commentary", 
    label: "Social Commentary", 
    emoji: "⚖️", 
    color: "from-gray-600 to-slate-600",
    category: MOOD_CATEGORIES.THEMES,
    intensity: 4,
    description: "Explores societal issues and human nature",
    tags: ["social", "commentary", "society"]
  },

  // ATMOSPHERE & SETTING
  { 
    id: "epic_adventure", 
    label: "Epic Adventure", 
    emoji: "🗺️", 
    color: "from-orange-500 to-amber-400",
    category: MOOD_CATEGORIES.ATMOSPHERE,
    intensity: 5,
    description: "Grand journeys, exploration, discovery",
    tags: ["adventure", "journey", "exploration"]
  },
  { 
    id: "nostalgic", 
    label: "Nostalgic", 
    emoji: "⏳", 
    color: "from-yellow-400 to-orange-300",
    category: MOOD_CATEGORIES.ATMOSPHERE,
    intensity: 3,
    description: "Reminiscent, wistful, memory-laden",
    tags: ["nostalgic", "memories", "wistful"]
  },
  { 
    id: "supernatural", 
    label: "Supernatural", 
    emoji: "👻", 
    color: "from-purple-700 to-indigo-800",
    category: MOOD_CATEGORIES.ATMOSPHERE,
    intensity: 4,
    description: "Paranormal, mystical, otherworldly",
    tags: ["supernatural", "paranormal", "mystical"]
  },
  { 
    id: "urban_modern", 
    label: "Urban & Modern", 
    emoji: "🏙️", 
    color: "from-gray-500 to-blue-600",
    category: MOOD_CATEGORIES.ATMOSPHERE,
    intensity: 3,
    description: "City life, contemporary settings",
    tags: ["urban", "modern", "city"]
  },
  { 
    id: "fantasy_magical", 
    label: "Fantasy & Magical", 
    emoji: "✨", 
    color: "from-purple-500 to-pink-600",
    category: MOOD_CATEGORIES.ATMOSPHERE,
    intensity: 4,
    description: "Magic systems, fantasy worlds",
    tags: ["fantasy", "magic", "magical"]
  },

  // CHARACTER DYNAMICS
  { 
    id: "strong_friendships", 
    label: "Strong Friendships", 
    emoji: "👥", 
    color: "from-blue-500 to-cyan-500",
    category: MOOD_CATEGORIES.CHARACTER_FOCUS,
    intensity: 4,
    description: "Bonds, teamwork, loyalty",
    tags: ["friendship", "bonds", "teamwork"]
  },
  { 
    id: "complex_characters", 
    label: "Complex Characters", 
    emoji: "🎭", 
    color: "from-indigo-600 to-purple-600",
    category: MOOD_CATEGORIES.CHARACTER_FOCUS,
    intensity: 5,
    description: "Multi-dimensional, morally gray characters",
    tags: ["complex", "multi-dimensional", "gray"]
  },
  { 
    id: "mentor_student", 
    label: "Mentor & Student", 
    emoji: "👨‍🏫", 
    color: "from-green-600 to-teal-600",
    category: MOOD_CATEGORIES.CHARACTER_FOCUS,
    intensity: 3,
    description: "Learning, guidance, wisdom transfer",
    tags: ["mentor", "learning", "guidance"]
  },
  { 
    id: "ensemble_cast", 
    label: "Ensemble Cast", 
    emoji: "👪", 
    color: "from-pink-500 to-purple-500",
    category: MOOD_CATEGORIES.CHARACTER_FOCUS,
    intensity: 4,
    description: "Multiple main characters, group dynamics",
    tags: ["ensemble", "group", "multiple-protagonists"]
  }
];

// ============================================================================
// PRESET COMBINATIONS - Popular mood combinations
// ============================================================================

interface MoodPreset {
  id: string;
  name: string;
  emoji: string;
  cues: string[];
  description: string;
}

const MOOD_PRESETS: MoodPreset[] = [
  {
    id: "feel_good_journey",
    name: "Feel-Good Journey",
    emoji: "🌈",
    cues: ["heartwarming", "inspiring", "strong_friendships", "coming_of_age"],
    description: "Uplifting adventures that warm your heart"
  },
  {
    id: "mind_bender", 
    name: "Mind Bender",
    emoji: "🌀",
    cues: ["mind_bending", "thought_provoking", "complex_characters", "unique_artstyle"],
    description: "Complex narratives that challenge your thinking"
  },
  {
    id: "action_spectacle",
    name: "Action Spectacle", 
    emoji: "⚡",
    cues: ["action_packed", "stunning_visuals", "edge_of_seat", "epic_adventure"],
    description: "High-octane thrills with amazing visuals"
  },
  {
    id: "cozy_comfort",
    name: "Cozy Comfort",
    emoji: "☕",
    cues: ["chill_vibes", "heartwarming", "slow_burn", "nostalgic"],
    description: "Relaxing, comforting anime for unwinding"
  },
  {
    id: "dark_mature",
    name: "Dark & Mature",
    emoji: "🌑", 
    cues: ["dark_gritty", "complex_characters", "social_commentary", "thought_provoking"],
    description: "Mature themes for experienced viewers"
  },
  {
    id: "visual_feast",
    name: "Visual Feast",
    emoji: "🎨",
    cues: ["stunning_visuals", "unique_artstyle", "fantasy_magical", "modern_sleek"],
    description: "Anime that prioritizes artistic excellence"
  }
];

// ============================================================================
// COMPONENT INTERFACES
// ============================================================================

interface MoodboardPageProps {
  navigateToDetail: (animeId: Id<"anime">) => void;
  selectedMoodCues: string[];
  onMoodCuesChange: (cues: string[]) => void;
  moodBoardRecommendations: AnimeRecommendation[];
  onRecommendationsChange: (recs: AnimeRecommendation[]) => void;
  isLoadingMoodBoard: boolean;
  onLoadingChange: (loading: boolean) => void;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const LoadingSpinnerComponent: React.FC<{ message?: string; className?: string }> = ({ 
  message = "Loading...", 
  className = "" 
}) => (
  <div className={`flex flex-col justify-center items-center py-10 ${className}`}>
    <div className="relative">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-transparent border-t-brand-primary-action border-r-brand-accent-gold"></div>
      <div className="animate-ping absolute top-2 left-2 h-8 w-8 rounded-full bg-brand-primary-action opacity-20"></div>
    </div>
    {message && <p className="mt-4 text-base text-white/80 font-medium">{message}</p>}
  </div>
);

const LoadingSpinner = memo(LoadingSpinnerComponent);

// Category Filter Component
const CategoryFilter: React.FC<{
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}> = ({ categories, selectedCategory, onCategoryChange }) => (
  <div className="flex flex-wrap gap-2 justify-center mb-6">
    {categories.map(category => (
      <button
        key={category}
        onClick={() => onCategoryChange(category)}
        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
          selectedCategory === category
            ? 'bg-brand-primary-action text-white border border-brand-primary-action'
            : 'bg-black/30 text-white/70 border border-white/20 hover:bg-white/10'
        }`}
      >
        {category}
      </button>
    ))}
  </div>
);

// Intensity Slider Component
const IntensitySlider: React.FC<{
  cueId: string;
  intensity: number;
  onIntensityChange: (cueId: string, intensity: number) => void;
  isSelected: boolean;
}> = ({ cueId, intensity, onIntensityChange, isSelected }) => (
  <div className={`mt-2 transition-opacity duration-200 ${isSelected ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
    <div className="flex items-center gap-2">
      <span className="text-xs text-white/60 w-8">Low</span>
      <input
        type="range"
        min="1"
        max="5"
        value={intensity}
        onChange={(e) => onIntensityChange(cueId, parseInt(e.target.value))}
        className="flex-1 h-1 bg-white/20 rounded-lg appearance-none slider"
        style={{
          background: `linear-gradient(to right, #FF6B35 0%, #FF6B35 ${(intensity - 1) * 25}%, rgba(255,255,255,0.2) ${(intensity - 1) * 25}%, rgba(255,255,255,0.2) 100%)`
        }}
      />
      <span className="text-xs text-white/60 w-8">High</span>
    </div>
    <div className="text-center">
      <span className="text-xs text-brand-accent-gold">{"★".repeat(intensity)}</span>
    </div>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const EnhancedMoodboardPageComponent: React.FC<MoodboardPageProps> = ({ 
  navigateToDetail, 
  selectedMoodCues, 
  onMoodCuesChange, 
  moodBoardRecommendations, 
  onRecommendationsChange,
  isLoadingMoodBoard,
  onLoadingChange
}) => {
  const userProfile = useQuery(api.users.getMyUserProfile);
  const getRecommendationsByMoodTheme = useAction(api.ai.getEnhancedRecommendationsByMoodTheme);

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [cueIntensities, setCueIntensities] = useState<Record<string, number>>({});
  const [advancedMode, setAdvancedMode] = useState<boolean>(false);
  const [savedMoodboards, setSavedMoodboards] = useState<Array<{
    id: string;
    name: string;
    cues: string[];
    intensities: Record<string, number>;
  }>>([]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const categories = useMemo(() => {
    const cats = ["All", ...Object.values(MOOD_CATEGORIES)];
    return cats;
  }, []);

  const filteredCues = useMemo(() => {
    let cues = EXPANDED_MOOD_CUES;
    
    if (selectedCategory !== "All") {
      cues = cues.filter(cue => cue.category === selectedCategory);
    }
    
    if (searchFilter) {
      const search = searchFilter.toLowerCase();
      cues = cues.filter(cue => 
        cue.label.toLowerCase().includes(search) ||
        cue.description?.toLowerCase().includes(search) ||
        cue.tags?.some(tag => tag.toLowerCase().includes(search))
      );
    }
    
    return cues;
  }, [selectedCategory, searchFilter]);

  const selectedCueObjects = useMemo(() => {
    return EXPANDED_MOOD_CUES.filter(cue => selectedMoodCues.includes(cue.label));
  }, [selectedMoodCues]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleMoodCueToggle = useCallback((cueLabel: string) => {
    const cue = EXPANDED_MOOD_CUES.find(c => c.label === cueLabel);
    if (!cue) return;

    const newCues = selectedMoodCues.includes(cueLabel) 
      ? selectedMoodCues.filter(c => c !== cueLabel) 
      : [...selectedMoodCues, cueLabel];
    
    onMoodCuesChange(newCues);

    // Initialize intensity if not set
    if (!selectedMoodCues.includes(cueLabel) && !cueIntensities[cue.id]) {
      setCueIntensities(prev => ({
        ...prev,
        [cue.id]: cue.intensity || 3
      }));
    }
  }, [selectedMoodCues, onMoodCuesChange, cueIntensities]);

  const handleIntensityChange = useCallback((cueId: string, intensity: number) => {
    setCueIntensities(prev => ({
      ...prev,
      [cueId]: intensity
    }));
  }, []);

  const handlePresetSelect = useCallback((preset: MoodPreset) => {
    onMoodCuesChange(preset.cues);
    
    // Set default intensities for preset cues
    const newIntensities: Record<string, number> = {};
    preset.cues.forEach(cueLabel => {
      const cue = EXPANDED_MOOD_CUES.find(c => c.label === cueLabel);
      if (cue) {
        newIntensities[cue.id] = cue.intensity || 3;
      }
    });
    setCueIntensities(newIntensities);
    
    toast.success(`Applied "${preset.name}" preset!`);
  }, [onMoodCuesChange]);

  const saveMoodboard = useCallback(() => {
    if (selectedMoodCues.length === 0) {
      toast.error("Select some mood cues first!");
      return;
    }

    const name = prompt("Name your mood board:");
    if (!name) return;

    const newMoodboard = {
      id: Date.now().toString(),
      name,
      cues: selectedMoodCues,
      intensities: { ...cueIntensities }
    };

    setSavedMoodboards(prev => [...prev, newMoodboard]);
    toast.success(`Mood board "${name}" saved!`);
  }, [selectedMoodCues, cueIntensities]);

  const loadMoodboard = useCallback((moodboard: typeof savedMoodboards[0]) => {
    onMoodCuesChange(moodboard.cues);
    setCueIntensities(moodboard.intensities);
    toast.success(`Loaded "${moodboard.name}"!`);
  }, [onMoodCuesChange]);

  const fetchMoodBoardRecommendations = useCallback(async () => {
    if (selectedMoodCues.length === 0) {
      onRecommendationsChange([]);
      return;
    }
    
    onLoadingChange(true);
    onRecommendationsChange([]);
    
    try {
      const profileForAI = userProfile ? {
        name: userProfile.name, 
        moods: userProfile.moods, 
        genres: userProfile.genres, 
        favoriteAnimes: userProfile.favoriteAnimes, 
        experienceLevel: userProfile.experienceLevel, 
        dislikedGenres: userProfile.dislikedGenres, 
        dislikedTags: userProfile.dislikedTags, 
        characterArchetypes: userProfile.characterArchetypes, 
        tropes: userProfile.tropes, 
        artStyles: userProfile.artStyles, 
        narrativePacing: userProfile.narrativePacing
      } : undefined;

      // Enhanced cues with intensity weighting
      const enhancedCues = selectedMoodCues.map(cueLabel => {
        const cue = EXPANDED_MOOD_CUES.find(c => c.label === cueLabel);
        const intensity = cue ? cueIntensities[cue.id] || cue.intensity || 3 : 3;
        const weight = intensity >= 4 ? "strong" : intensity >= 3 ? "moderate" : "light";
        return `${weight} ${cueLabel}`;
      });
      
      const result = await getRecommendationsByMoodTheme({ 
        selectedCues: enhancedCues, 
        userProfile: profileForAI, 
        count: 8, 
        messageId: `enhanced-mood-${Date.now()}`
      });
      
      if (result.error && result.error !== "OpenAI API key not configured.") {
        toast.error(`Mood board error: ${result.error.substring(0,100)}`);
      } else {
        onRecommendationsChange(result.recommendations || []);
      }
    } catch (e: any) {
      toast.error(`Error fetching mood board: ${e.message}`);
    } finally {
      onLoadingChange(false);
    }
  }, [selectedMoodCues, cueIntensities, userProfile, getRecommendationsByMoodTheme, onRecommendationsChange, onLoadingChange]);

  // Auto-fetch when mood cues change
  useEffect(() => {
    if (selectedMoodCues.length > 0 && moodBoardRecommendations.length === 0 && !isLoadingMoodBoard) {
      fetchMoodBoardRecommendations();
    } else if (selectedMoodCues.length === 0) {
      onRecommendationsChange([]);
    }
  }, [selectedMoodCues, moodBoardRecommendations.length, isLoadingMoodBoard, fetchMoodBoardRecommendations, onRecommendationsChange]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="relative min-h-screen">
      {/* Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-br from-brand-primary-action/10 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-32 right-16 w-96 h-96 bg-gradient-to-tr from-brand-accent-gold/10 to-transparent rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-r from-brand-accent-peach/5 to-transparent rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-4 sm:px-6 py-8 space-y-10">
        
        {/* Enhanced Hero Section */}
        <div className="text-center space-y-6">
          <div className="inline-block">
            <h1 className="hero-title font-heading text-white font-bold bg-gradient-to-r from-white via-brand-accent-gold to-white bg-clip-text text-transparent animate-pulse">
              🎨 Enhanced Mood Discovery
            </h1>
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-brand-primary-action to-transparent mt-4 animate-pulse"></div>
          </div>
          <p className="text-base sm:text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
            Create the perfect anime experience with our expanded mood system. Choose from {EXPANDED_MOOD_CUES.length} carefully crafted vibes across {Object.keys(MOOD_CATEGORIES).length} categories.
          </p>
          
          {/* Mode Toggle */}
          <div className="flex justify-center">
            <div className="bg-black/30 backdrop-blur-sm rounded-full p-1 border border-white/20">
              <button
                onClick={() => setAdvancedMode(false)}
                className={`px-4 py-2 rounded-full text-sm transition-all duration-200 ${
                  !advancedMode ? 'bg-brand-primary-action text-white' : 'text-white/70 hover:text-white'
                }`}
              >
                Simple Mode
              </button>
              <button
                onClick={() => setAdvancedMode(true)}
                className={`px-4 py-2 rounded-full text-sm transition-all duration-200 ${
                  advancedMode ? 'bg-brand-primary-action text-white' : 'text-white/70 hover:text-white'
                }`}
              >
                Advanced Mode
              </button>
            </div>
          </div>
        </div>

        {/* Quick Preset Selection */}
        <div className="text-center space-y-4">
          <h2 className="text-lg font-heading text-white/90">Quick Start Presets</h2>
          <div className="flex flex-wrap gap-2 justify-center">
            {MOOD_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset)}
                className="group bg-black/30 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 hover:bg-white/10 transition-all duration-200"
                title={preset.description}
              >
                <span className="text-lg mr-2">{preset.emoji}</span>
                <span className="text-sm text-white/80 group-hover:text-white">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search and Category Filters */}
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="relative max-w-md w-full">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search moods, themes, or styles..."
                className="w-full px-4 py-2 bg-black/30 backdrop-blur-sm border border-white/20 rounded-full text-white placeholder-white/50 focus:border-brand-primary-action focus:outline-none"
              />
              <span className="absolute right-3 top-2.5 text-white/40">🔍</span>
            </div>
          </div>
          
          <CategoryFilter 
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
        </div>

        {/* Enhanced Mood Selector */}
<div className="relative moodboard-container">
  <div className="absolute inset-0 bg-gradient-to-r from-brand-primary-action/20 via-transparent to-brand-accent-gold/20 rounded-3xl blur-xl"></div>
  <div className="relative bg-black/30 backdrop-blur-sm border border-white/10 rounded-3xl p-4 sm:p-6 md:p-8 mood-cues-section">
    
    {/* Section Header with Counter */}
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl sm:text-2xl md:text-3xl font-heading text-white">
        Craft Your Vibe
        {selectedCategory !== "All" && (
          <span className="text-sm ml-2 text-brand-accent-gold">({selectedCategory})</span>
        )}
      </h2>
      <div className="bg-brand-primary-action/20 backdrop-blur-sm rounded-full px-3 py-1 border border-brand-primary-action/30">
        <span className="text-sm text-brand-accent-gold font-medium">
          {selectedMoodCues.length} selected
        </span>
      </div>
    </div>
    
    {/* FIXED: Properly contained mood cues grid */}
    <div className={`moodboard-vibes-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4 ${
      advancedMode ? 'advanced-mode' : ''
    }`}>
      {filteredCues.map(cue => {
        const isSelected = selectedMoodCues.includes(cue.label);
        const intensity = cueIntensities[cue.id] || cue.intensity || 3;
        
        return (
          <div key={cue.id} className="mood-cue-wrapper">
            <button
              onClick={() => handleMoodCueToggle(cue.label)}
              className={`w-full relative overflow-hidden rounded-2xl p-2 sm:p-3 md:p-4 transition-all duration-300 transform hover:scale-105 ${
                isSelected 
                  ? 'shadow-2xl shadow-brand-primary-action/50 scale-105' 
                  : 'hover:shadow-xl hover:shadow-white/20'
              }`}
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
                
                {/* Category Badge */}
                {selectedCategory === "All" && (
                  <div className="text-xs text-white/60 opacity-0 group-hover:opacity-100 transition-opacity">
                    {cue.category.replace("Emotional Tones", "Emotional").replace("Character Dynamics", "Character")}
                  </div>
                )}
              </div>
              
              {/* Hover Effect */}
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
            </button>
            
            {/* Advanced Mode: Intensity Slider - FIXED CONTAINER */}
            {advancedMode && isSelected && (
              <div className="intensity-slider-container">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60 w-8 flex-shrink-0">Low</span>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={intensity}
                    onChange={(e) => handleIntensityChange(cue.id, parseInt(e.target.value))}
                    className="flex-1 h-1 bg-white/20 rounded-lg appearance-none slider intensity-slider"
                    style={{
                      background: `linear-gradient(to right, #FF6B35 0%, #FF6B35 ${(intensity - 1) * 25}%, rgba(255,255,255,0.2) ${(intensity - 1) * 25}%, rgba(255,255,255,0.2) 100%)`
                    }}
                    aria-label={`Intensity for ${cue.label}`}
                  />
                  <span className="text-xs text-white/60 w-8 flex-shrink-0">High</span>
                </div>
                <div className="intensity-stars">
                  <span className="text-xs text-brand-accent-gold">{"★".repeat(intensity)}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>

    {/* No Results Message */}
    {filteredCues.length === 0 && (
      <div className="text-center py-8">
        <div className="text-4xl mb-2">🔍</div>
        <p className="text-white/70">No moods match your search.</p>
        <button 
          onClick={() => setSearchFilter("")}
          className="text-brand-accent-gold hover:underline text-sm mt-2"
        >
          Clear search
        </button>
      </div>
    )}
  </div>
</div>

        {/* Selected Vibes Summary & Controls */}
        {selectedMoodCues.length > 0 && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="text-center">
              <div className="inline-flex flex-col items-center space-y-2 bg-black/30 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/20">
                <span className="text-white/80 text-sm">Your Mood Combination:</span>
                <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
                  {selectedCueObjects.map((cue, index) => {
                    const intensity = cueIntensities[cue.id] || cue.intensity || 3;
                    return (
                      <span key={cue.id} className="flex items-center gap-1 bg-brand-primary-action/20 rounded-full px-3 py-1 border border-brand-primary-action/30">
                        <span>{cue.emoji}</span>
                        <span className="text-brand-accent-gold font-medium text-sm">{cue.label}</span>
                        {advancedMode && (
                          <span className="text-xs text-white/60">{"★".repeat(intensity)}</span>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 justify-center">
              <StyledButton 
                onClick={fetchMoodBoardRecommendations} 
                variant="primary"
                disabled={isLoadingMoodBoard}
                className="!bg-gradient-to-r !from-brand-primary-action !to-brand-accent-gold hover:!from-brand-accent-gold hover:!to-brand-primary-action"
              >
                {isLoadingMoodBoard ? "✨ Crafting Magic..." : "🎯 Get Recommendations"}
              </StyledButton>
              
              <StyledButton 
                onClick={saveMoodboard} 
                variant="ghost"
                className="!bg-white/10 !backdrop-blur-sm !border-white/20 hover:!bg-white/20 !text-white"
              >
                💾 Save Mood Board
              </StyledButton>
              
              <StyledButton 
                onClick={() => onMoodCuesChange([])} 
                variant="ghost"
                className="!bg-white/10 !backdrop-blur-sm !border-white/20 hover:!bg-white/20 !text-white"
              >
                🗑️ Clear All
              </StyledButton>
            </div>
          </div>
        )}

        {/* Saved Mood Boards */}
        {savedMoodboards.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-heading text-white text-center">Saved Mood Boards</h3>
            <div className="flex flex-wrap gap-2 justify-center">
              {savedMoodboards.map(moodboard => (
                <button
                  key={moodboard.id}
                  onClick={() => loadMoodboard(moodboard)}
                  className="bg-black/30 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 hover:bg-white/10 transition-all duration-200 group"
                >
                  <span className="text-sm text-white/80 group-hover:text-white">{moodboard.name}</span>
                  <span className="text-xs text-white/50 ml-2">({moodboard.cues.length} vibes)</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoadingMoodBoard && (
          <div className="text-center py-16">
            <LoadingSpinner message="Weaving your perfect anime tapestry..." className="text-white" />
          </div>
        )}
        
        {/* Enhanced Results Section */}
        {!isLoadingMoodBoard && moodBoardRecommendations.length > 0 && (
          <div className="space-y-8">
            <div className="text-center">
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-heading text-white mb-4">
                Your Curated Collection
              </h3>
              <div className="inline-flex flex-col items-center space-y-2 bg-gradient-to-r from-brand-primary-action/20 to-brand-accent-gold/20 rounded-2xl px-6 py-3 backdrop-blur-sm border border-white/10">
                <span className="text-white/80 text-sm">Mood Blend:</span>
                <span className="text-brand-accent-gold font-medium text-sm">
                  {selectedCueObjects.map(cue => cue.emoji).join(" × ")} {selectedCueObjects.map(cue => cue.label).join(" × ")}
                </span>
              </div>
            </div>
            
            <div className="moodboard-results-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
              {moodBoardRecommendations.map((rec, index) => (
                <div 
                  key={`enhanced-mood-${index}-${rec.title}`} 
                  className="group relative transform transition-all duration-300 hover:scale-105"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="absolute -inset-1 sm:-inset-2 bg-gradient-to-r from-brand-primary-action/30 to-brand-accent-gold/30 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  <div className="relative bg-black/20 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10 group-hover:border-white/30 transition-all duration-300">
                    <AnimeCard 
                      anime={rec} 
                      isRecommendation={true} 
                      onViewDetails={navigateToDetail}
                      className="w-full"
                    />
                    <div className="p-1.5 sm:p-2 md:p-3 bg-gradient-to-t from-black/80 to-transparent">
                      <h4 
                        className="text-xs sm:text-sm font-medium text-white text-center leading-tight mb-1"
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: '1.2',
                          maxHeight: '2.4em',
                        }}
                        title={rec.title}
                      >
                        {rec.title || "Unknown Title"}
                      </h4>
                      {rec.genres && rec.genres.length > 0 && (
                        <p className="text-xs text-brand-accent-gold/80 text-center truncate">
                          {rec.genres.slice(0, 2).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Enhanced Empty States */}
        {!isLoadingMoodBoard && selectedMoodCues.length > 0 && moodBoardRecommendations.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-black/30 backdrop-blur-sm rounded-3xl p-8 border border-white/10 max-w-md mx-auto">
              <div className="text-6xl mb-4">🎭</div>
              <h3 className="text-xl font-heading text-white mb-2">Unique Combination!</h3>
              <p className="text-white/70 text-sm mb-4">
                Your selected vibes create a very specific mood. Try adjusting intensities, removing a few cues, or exploring our presets.
              </p>
              <div className="space-y-2">
                <StyledButton 
                  onClick={() => setAdvancedMode(true)} 
                  variant="ghost"
                  className="!text-sm !bg-white/10 !backdrop-blur-sm !border-white/20 hover:!bg-white/20 !text-white"
                >
                  🎛️ Try Advanced Mode
                </StyledButton>
                <StyledButton 
                  onClick={() => onMoodCuesChange(selectedMoodCues.slice(0, 3))} 
                  variant="ghost"
                  className="!text-sm !bg-white/10 !backdrop-blur-sm !border-white/20 hover:!bg-white/20 !text-white"
                >
                  📉 Simplify Selection
                </StyledButton>
              </div>
            </div>
          </div>
        )}

        {!isLoadingMoodBoard && selectedMoodCues.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-black/30 backdrop-blur-sm rounded-3xl p-8 border border-white/10 max-w-lg mx-auto">
              <div className="text-8xl mb-6 animate-bounce">🎨</div>
              <h3 className="text-2xl font-heading text-white mb-4">Create Your Mood Canvas</h3>
              <p className="text-white/80 text-lg leading-relaxed mb-6">
                Select from {EXPANDED_MOOD_CUES.length} carefully crafted mood cues to discover anime that perfectly matches your current emotional state.
              </p>
              <div className="space-y-2">
                <p className="text-sm text-white/60">Try a quick preset to get started:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {MOOD_PRESETS.slice(0, 3).map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => handlePresetSelect(preset)}
                      className="text-xs bg-brand-primary-action/20 hover:bg-brand-primary-action/30 text-brand-accent-gold border border-brand-primary-action/30 rounded-full px-3 py-1 transition-colors"
                    >
                      {preset.emoji} {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(EnhancedMoodboardPageComponent);