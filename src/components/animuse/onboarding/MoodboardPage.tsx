// Enhanced MoodboardPage.tsx with expanded features
import React, { useState, useEffect, useCallback, memo, useMemo } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import StyledButton from "../shared/StyledButton";
import { toast } from "sonner";
import AnimeCard from "../AnimeCard";
import { AnimeRecommendation } from "../../../../convex/types";
import { Id } from "../../../../convex/_generated/dataModel";
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, FreeMode, Navigation, Pagination } from 'swiper/modules';

const HISTORY_KEY = "animuse-mood-rec-history";

function getHistoryTitles(): string[] {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addHistoryTitles(titles: string[]): void {
  try {
    const prev = getHistoryTitles();
    const updated = Array.from(new Set([...prev, ...titles])).slice(-50);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

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
  // Removed debug action - moved to admin dashboard

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
        count: 10,
        previousTitles: getHistoryTitles(), 
        messageId: `enhanced-mood-${Date.now()}`
      });
      
      if (result.error && result.error !== "OpenAI API key not configured.") {
        toast.error(`Mood board error: ${result.error.substring(0,100)}`);
      } else {
        const recs = result.recommendations || [];
        onRecommendationsChange(recs);
        addHistoryTitles(recs.map((r: { title: string }) => r.title));
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

  // Debug functions moved to admin dashboard

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* BRUTAL GEOMETRIC BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Harsh Grid Overlay */}
        <div className="absolute inset-0 opacity-10"
             style={{
               backgroundImage: `
                 linear-gradient(90deg, #FF6B35 1px, transparent 1px),
                 linear-gradient(0deg, #FF6B35 1px, transparent 1px)
               `,
               backgroundSize: '40px 40px'
             }}>
        </div>
        
        {/* Brutal Geometric Shapes */}
        <div className="absolute top-20 left-0 w-64 h-64 bg-brand-primary-action transform rotate-45 opacity-20"></div>
        <div className="absolute bottom-32 right-0 w-96 h-32 bg-brand-accent-gold opacity-15"></div>
        <div className="absolute top-1/3 right-16 w-32 h-96 bg-brand-accent-peach transform -rotate-12 opacity-10"></div>
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-brand-primary-action transform rotate-12 opacity-5"></div>
      </div>

      {/* MAIN BRUTAL CONTAINER */}
      <div className="relative z-10 p-4 space-y-8">
        
        {/* BRUTAL HERO SECTION */}
        <div className="bg-black border-4 border-white shadow-brutal-lg p-6 mb-8">
          <div className="bg-brand-primary-action border-4 border-black p-4 mb-4">
            <h1 className="text-2xl md:text-4xl font-black text-black uppercase tracking-wider text-center">
              MOOD DISCOVERY
            </h1>
          </div>
          
          <div className="bg-white border-4 border-black p-4 mb-4">
            <p className="text-black font-bold text-center text-sm md:text-base uppercase">
              {EXPANDED_MOOD_CUES.length} BRUTAL VIBES • {Object.keys(MOOD_CATEGORIES).length} CATEGORIES
            </p>
          </div>
          
          {/* BRUTAL MODE TOGGLE */}
          <div className="flex justify-center">
            <div className="bg-brand-accent-gold border-4 border-black shadow-brutal p-1 flex">
              <button
                onClick={() => setAdvancedMode(false)}
                className={`px-4 py-2 border-2 border-black font-black text-sm uppercase transition-all ${
                  !advancedMode 
                    ? 'bg-black text-white shadow-brutal' 
                    : 'bg-white text-black hover:bg-gray-200'
                }`}
              >
                SIMPLE
              </button>
              <button
                onClick={() => setAdvancedMode(true)}
                className={`px-4 py-2 border-2 border-black font-black text-sm uppercase transition-all ${
                  advancedMode 
                    ? 'bg-black text-white shadow-brutal' 
                    : 'bg-white text-black hover:bg-gray-200'
                }`}
              >
                ADVANCED
              </button>
            </div>
          </div>
        </div>

        {/* BRUTAL PRESET SELECTION */}
        <div className="bg-brand-accent-peach border-4 border-black shadow-brutal-lg p-6">
          <div className="bg-black border-4 border-white p-3 mb-4">
            <h2 className="text-white font-black text-lg uppercase text-center">QUICK PRESETS</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {MOOD_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset)}
                className="bg-white border-4 border-black shadow-brutal p-3 hover:bg-brand-accent-gold transition-all active:translate-x-1 active:translate-y-1 active:shadow-none touch-target"
                title={preset.description}
              >
                <div className="text-2xl mb-1">{preset.emoji}</div>
                <div className="text-black font-bold text-xs uppercase">{preset.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* BRUTAL SEARCH AND FILTERS */}
        <div className="space-y-4">
          {/* Search */}
          <div className="bg-brand-primary-action border-4 border-black shadow-brutal-lg p-4">
            <div className="relative">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="SEARCH MOODS..."
                className="w-full px-4 py-3 bg-white border-4 border-black text-black font-bold placeholder-gray-600 focus:outline-none focus:ring-4 focus:ring-brand-accent-gold text-sm uppercase"
              />
              <span className="absolute right-4 top-3 text-black font-black">🔍</span>
            </div>
          </div>
          
          {/* Category Filter */}
          <div className="bg-white border-4 border-black shadow-brutal-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`p-2 border-4 border-black font-black text-xs uppercase transition-all touch-target ${
                    selectedCategory === category
                      ? 'bg-brand-accent-gold text-black shadow-brutal'
                      : 'bg-brand-accent-peach text-black hover:bg-brand-accent-gold'
                  }`}
                >
                  {category.replace("Emotional Tones", "EMOTIONAL").replace("Character Dynamics", "CHARACTER")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* BRUTAL MOOD SELECTOR */}
        <div className="bg-black border-4 border-white shadow-brutal-lg p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="bg-brand-primary-action border-4 border-black p-3 flex-1 mr-4">
              <h2 className="text-black font-black text-lg uppercase text-center">
                CRAFT YOUR VIBE
                {selectedCategory !== "All" && (
                  <span className="block text-sm mt-1">({selectedCategory})</span>
                )}
              </h2>
            </div>
            <div className="bg-brand-accent-gold border-4 border-black p-3 shadow-brutal">
              <span className="text-black font-black text-sm uppercase">
                {selectedMoodCues.length} SELECTED
              </span>
            </div>
          </div>
          
                     {/* Mood Cues Grid - 2 Columns */}
           <div className="grid grid-cols-2 gap-4">
            {filteredCues.map(cue => {
              const isSelected = selectedMoodCues.includes(cue.label);
              const intensity = cueIntensities[cue.id] || cue.intensity || 3;
              
              return (
                <div key={cue.id} className="space-y-2">
                  <button
                    onClick={() => handleMoodCueToggle(cue.label)}
                    className={`w-full p-4 border-4 border-black transition-all touch-target ${
                      isSelected 
                        ? 'bg-brand-accent-gold shadow-brutal-lg transform -translate-y-1' 
                        : 'bg-white hover:bg-brand-accent-peach shadow-brutal'
                    } active:translate-x-1 active:translate-y-1 active:shadow-none`}
                    title={`${cue.label}: ${cue.description}`}
                  >
                    {/* Selected Indicator */}
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-black border-2 border-white rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-black">✓</span>
                      </div>
                    )}
                    
                    {/* Content */}
                    <div className="text-center space-y-2">
                      <div className="text-3xl">{cue.emoji}</div>
                      <div className="text-black font-black text-xs uppercase leading-tight">
                        {cue.label}
                      </div>
                      
                      {/* Category Badge for "All" view */}
                      {selectedCategory === "All" && (
                        <div className="bg-black text-white text-xs font-bold px-2 py-1 uppercase">
                          {cue.category.replace("Emotional Tones", "EMO").replace("Character Dynamics", "CHAR").substring(0, 8)}
                        </div>
                      )}
                    </div>
                  </button>
                  
                  {/* Advanced Mode: Intensity Slider */}
                  {advancedMode && isSelected && (
                    <div className="bg-brand-accent-peach border-4 border-black p-2 shadow-brutal">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black text-black uppercase w-8">LOW</span>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          value={intensity}
                          onChange={(e) => handleIntensityChange(cue.id, parseInt(e.target.value))}
                          className="flex-1 h-2 bg-white border-2 border-black appearance-none slider-brutal"
                          aria-label={`Intensity for ${cue.label}`}
                        />
                        <span className="text-xs font-black text-black uppercase w-8">HIGH</span>
                      </div>
                      <div className="text-center">
                        <span className="text-black font-black text-xs">{"★".repeat(intensity)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* No Results */}
          {filteredCues.length === 0 && (
            <div className="text-center py-8">
              <div className="bg-brand-accent-peach border-4 border-black p-6 shadow-brutal">
                <div className="text-4xl mb-4">🔍</div>
                <p className="text-black font-bold uppercase mb-4">NO MOODS MATCH</p>
                <button 
                  onClick={() => setSearchFilter("")}
                  className="bg-brand-primary-action border-4 border-black text-black font-black px-4 py-2 uppercase shadow-brutal hover:bg-brand-accent-gold transition-all"
                >
                  CLEAR SEARCH
                </button>
              </div>
            </div>
          )}
        </div>

        {/* BRUTAL SELECTED VIBES SUMMARY */}
        {selectedMoodCues.length > 0 && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-brand-accent-gold border-4 border-black shadow-brutal-lg p-6">
              <div className="bg-black border-4 border-white p-3 mb-4">
                <span className="text-white font-black text-sm uppercase text-center block">YOUR MOOD COMBINATION</span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {selectedCueObjects.map((cue, index) => {
                  const intensity = cueIntensities[cue.id] || cue.intensity || 3;
                  return (
                    <div key={cue.id} className="bg-white border-4 border-black p-2 shadow-brutal">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-xl">{cue.emoji}</span>
                        <span className="text-black font-black text-xs uppercase">{cue.label}</span>
                      </div>
                      {advancedMode && (
                        <div className="text-center mt-1">
                          <span className="text-xs text-black font-bold">{"★".repeat(intensity)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => {
                  // Clear cache and fetch fresh recommendations
                  localStorage.removeItem(HISTORY_KEY);
                  fetchMoodBoardRecommendations();
                }}
                disabled={isLoadingMoodBoard}
                className="bg-brand-primary-action border-4 border-black text-black font-black py-4 px-6 uppercase shadow-brutal hover:bg-brand-accent-gold transition-all active:translate-x-1 active:translate-y-1 active:shadow-none touch-target disabled:opacity-50"
              >
                {isLoadingMoodBoard ? "🔄 CRAFTING..." : "🎯 FRESH RECS"}
              </button>
              
              <button
                onClick={saveMoodboard}
                className="bg-brand-accent-peach border-4 border-black text-black font-black py-4 px-6 uppercase shadow-brutal hover:bg-brand-accent-gold transition-all active:translate-x-1 active:translate-y-1 active:shadow-none touch-target"
              >
                💾 SAVE BOARD
              </button>
              
              <button
                onClick={() => onMoodCuesChange([])}
                className="bg-white border-4 border-black text-black font-black py-4 px-6 uppercase shadow-brutal hover:bg-gray-200 transition-all active:translate-x-1 active:translate-y-1 active:shadow-none touch-target"
              >
                🗑️ CLEAR ALL
              </button>
            </div>

          </div>
        )}

        {/* BRUTAL SAVED MOOD BOARDS */}
        {savedMoodboards.length > 0 && (
          <div className="bg-brand-accent-peach border-4 border-black shadow-brutal-lg p-6">
            <div className="bg-black border-4 border-white p-3 mb-4">
              <h3 className="text-white font-black text-lg uppercase text-center">SAVED BOARDS</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {savedMoodboards.map(moodboard => (
                <button
                  key={moodboard.id}
                  onClick={() => loadMoodboard(moodboard)}
                  className="bg-white border-4 border-black p-3 shadow-brutal hover:bg-brand-accent-gold transition-all active:translate-x-1 active:translate-y-1 active:shadow-none touch-target"
                >
                  <div className="text-black font-bold text-xs uppercase text-center">
                    {moodboard.name}
                  </div>
                  <div className="text-xs text-gray-600 text-center mt-1">
                    ({moodboard.cues.length} VIBES)
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* BRUTAL LOADING STATE */}
        {isLoadingMoodBoard && (
          <div className="bg-black border-4 border-white shadow-brutal-lg p-12">
            <div className="text-center">
              <div className="bg-brand-primary-action border-4 border-black p-6 shadow-brutal mb-4 animate-pulse">
                <div className="text-4xl text-black mb-2">⚡</div>
                <div className="text-black font-black uppercase">CRAFTING BRUTALITY...</div>
              </div>
              <LoadingSpinnerComponent message="WEAVING ANIME TAPESTRY..." className="text-white font-black" />
            </div>
          </div>
        )}
        
        {/* BRUTAL RESULTS SECTION */}
        {!isLoadingMoodBoard && moodBoardRecommendations.length > 0 && (
          <div className="space-y-8">
            {/* Results Header */}
            <div className="bg-brand-accent-gold border-4 border-black shadow-brutal-lg p-6">
              <div className="bg-black border-4 border-white p-4 mb-4">
                <h3 className="text-white font-black text-2xl uppercase text-center">
                  CURATED COLLECTION
                </h3>
              </div>
              
              <div className="bg-white border-4 border-black p-3 shadow-brutal">
                <div className="text-center">
                  <span className="text-black font-bold text-sm uppercase block mb-2">MOOD BLEND:</span>
                  <div className="flex flex-wrap justify-center gap-1">
                    {selectedCueObjects.map(cue => (
                      <span key={cue.id} className="text-lg">{cue.emoji}</span>
                    ))}
                  </div>
                  <span className="text-black font-black text-xs uppercase">
                    {selectedCueObjects.map(cue => cue.label).join(" × ")}
                  </span>
                </div>
              </div>
            </div>
            
                         {/* BRUTAL CAROUSEL SWIPERS */}
             <div className="space-y-8">
               {/* Coverflow Carousel for Featured Recommendations */}
               <div className="bg-black border-4 border-white p-6 shadow-brutal-lg">
                 <div className="bg-brand-primary-action border-4 border-black p-3 mb-6">
                   <h4 className="text-black font-black text-lg uppercase text-center">FEATURED MOOD PICKS</h4>
                 </div>
                 
                 <Swiper
                   modules={[EffectCoverflow, Pagination, Navigation]}
                   effect="coverflow"
                   grabCursor={true}
                   centeredSlides={true}
                   slidesPerView="auto"
                   coverflowEffect={{
                     rotate: 50,
                     stretch: 0,
                     depth: 100,
                     modifier: 1,
                     slideShadows: false,
                   }}
                   pagination={{ 
                     clickable: true,
                     bulletClass: 'swiper-pagination-bullet brutal-bullet',
                     bulletActiveClass: 'brutal-bullet-active'
                   }}
                   navigation={{
                     nextEl: '.brutal-next-featured',
                     prevEl: '.brutal-prev-featured',
                   }}
                   className="brutal-coverflow-swiper"
                 >
                   {moodBoardRecommendations.slice(0, 5).map((rec, index) => (
                     <SwiperSlide key={`featured-${index}-${rec.title}`} className="brutal-swiper-slide">
                       <div className="bg-white border-4 border-black shadow-brutal hover:shadow-brutal-lg transition-all group">
                         {/* Brutal Anime Card Container */}
                         <div className="border-b-4 border-black">
                           <AnimeCard 
                             anime={rec} 
                             isRecommendation={true} 
                             onViewDetails={navigateToDetail}
                             className="w-full border-none shadow-none"
                           />
                         </div>
                         
                         {/* Brutal Info Section */}
                         <div className="p-3 bg-black">
                           <h4 className="text-white font-black text-xs uppercase text-center leading-tight mb-2 line-clamp-2">
                             {rec.title || "UNKNOWN TITLE"}
                           </h4>
                           {rec.genres && rec.genres.length > 0 && (
                             <div className="bg-brand-accent-gold border-2 border-white px-2 py-1">
                               <p className="text-black font-bold text-xs text-center uppercase">
                                 {rec.genres.slice(0, 2).join(" • ")}
                               </p>
                             </div>
                           )}
                         </div>
                       </div>
                     </SwiperSlide>
                   ))}
                 </Swiper>
                 
                 {/* Brutal Navigation Buttons */}
                 <div className="flex justify-center gap-4 mt-6">
                   <button className="brutal-prev-featured bg-brand-accent-peach border-4 border-black p-3 shadow-brutal hover:bg-brand-accent-gold transition-all active:translate-x-1 active:translate-y-1 active:shadow-none touch-target">
                     <span className="text-black font-black text-xl">←</span>
                   </button>
                   <button className="brutal-next-featured bg-brand-accent-peach border-4 border-black p-3 shadow-brutal hover:bg-brand-accent-gold transition-all active:translate-x-1 active:translate-y-1 active:shadow-none touch-target">
                     <span className="text-black font-black text-xl">→</span>
                   </button>
                 </div>
               </div>

               {/* Free Mode Horizontal Scroll for All Recommendations */}
               {moodBoardRecommendations.length > 5 && (
                 <div className="bg-brand-accent-peach border-4 border-black p-6 shadow-brutal-lg">
                   <div className="bg-black border-4 border-white p-3 mb-6">
                     <h4 className="text-white font-black text-lg uppercase text-center">MORE BRUTAL PICKS</h4>
                   </div>
                   
                   <Swiper
                     modules={[FreeMode]}
                     freeMode={{
                       enabled: true,
                       sticky: false,
                       momentumRatio: 0.25,
                       momentumVelocityRatio: 0.25,
                     }}
                     grabCursor={true}
                     slidesPerView="auto"
                     spaceBetween={16}
                     resistance={true}
                     resistanceRatio={0.85}
                     className="brutal-freemode-swiper"
                   >
                     {moodBoardRecommendations.map((rec, index) => (
                       <SwiperSlide key={`all-${index}-${rec.title}`} className="brutal-swiper-slide-small">
                         <div className="bg-white border-4 border-black shadow-brutal hover:shadow-brutal-lg transition-all group w-full">
                           {/* Brutal Anime Card Container */}
                           <div className="border-b-4 border-black">
                             <AnimeCard 
                               anime={rec} 
                               isRecommendation={true} 
                               onViewDetails={navigateToDetail}
                               className="w-full border-none shadow-none"
                             />
                           </div>
                           
                           {/* Brutal Info Section */}
                           <div className="p-2 bg-black">
                             <h4 className="text-white font-black text-xs uppercase text-center leading-tight mb-1 line-clamp-2">
                               {rec.title || "UNKNOWN TITLE"}
                             </h4>
                             {rec.genres && rec.genres.length > 0 && (
                               <div className="bg-brand-accent-gold border-2 border-white px-1 py-0.5">
                                 <p className="text-black font-bold text-xs text-center uppercase">
                                   {rec.genres.slice(0, 1).join("")}
                                 </p>
                               </div>
                             )}
                           </div>
                         </div>
                       </SwiperSlide>
                     ))}
                   </Swiper>
                 </div>
               )}
             </div>
          </div>
        )}
        
        {/* BRUTAL EMPTY STATES */}
        {!isLoadingMoodBoard && selectedMoodCues.length > 0 && moodBoardRecommendations.length === 0 && (
          <div className="bg-brand-accent-peach border-4 border-black shadow-brutal-lg p-8">
            <div className="text-center">
              <div className="text-6xl mb-4">🎭</div>
              <div className="bg-black border-4 border-white p-4 mb-4">
                <h3 className="text-white font-black text-xl uppercase">UNIQUE COMBINATION!</h3>
              </div>
              <p className="text-black font-bold text-sm uppercase mb-6">
                YOUR VIBES CREATE A VERY SPECIFIC MOOD
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setAdvancedMode(true)}
                  className="bg-brand-primary-action border-4 border-black text-black font-black py-3 px-4 uppercase shadow-brutal hover:bg-brand-accent-gold transition-all touch-target"
                >
                  🎛️ ADVANCED MODE
                </button>
                <button
                  onClick={() => onMoodCuesChange(selectedMoodCues.slice(0, 3))}
                  className="bg-white border-4 border-black text-black font-black py-3 px-4 uppercase shadow-brutal hover:bg-gray-200 transition-all touch-target"
                >
                  📉 SIMPLIFY
                </button>
              </div>
            </div>
          </div>
        )}

        {!isLoadingMoodBoard && selectedMoodCues.length === 0 && (
          <div className="bg-black border-4 border-white shadow-brutal-lg p-8">
            <div className="text-center">
              <div className="text-8xl mb-6">🎨</div>
              <div className="bg-brand-primary-action border-4 border-black p-4 mb-4">
                <h3 className="text-black font-black text-2xl uppercase">CREATE MOOD CANVAS</h3>
              </div>
              <div className="bg-white border-4 border-black p-4 mb-6">
                <p className="text-black font-bold uppercase">
                  {EXPANDED_MOOD_CUES.length} BRUTAL VIBES AVAILABLE
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="bg-brand-accent-gold border-4 border-black p-3">
                  <p className="text-black font-black text-sm uppercase">TRY A QUICK PRESET:</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {MOOD_PRESETS.slice(0, 3).map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => handlePresetSelect(preset)}
                      className="bg-brand-accent-peach border-4 border-black p-3 shadow-brutal hover:bg-brand-accent-gold transition-all active:translate-x-1 active:translate-y-1 active:shadow-none touch-target"
                    >
                      <div className="text-2xl mb-1">{preset.emoji}</div>
                      <div className="text-black font-black text-xs uppercase">{preset.name}</div>
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