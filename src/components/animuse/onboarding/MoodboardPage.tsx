// Enhanced MoodboardPage.tsx with expanded features
import React, { useState, useEffect, useCallback, memo, useMemo } from "react";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import StyledButton from "../shared/StyledButton";
import { toast } from "sonner";
import AnimeCard from "../AnimeCard";
import { AnimeRecommendation } from "../../../../convex/types";
import { Id } from "../../../../convex/_generated/dataModel";
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, FreeMode, Navigation, Pagination } from 'swiper/modules';

// Import custom brutalist styles
import './MoodboardBrutalist.css';

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
  const addAnimeByUserMutation = useMutation(api.anime.addAnimeByUser);
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

  // Handler for adding anime recommendation to database and navigating
  const handleAddAnimeAndNavigate = useCallback(async (recommendation: AnimeRecommendation) => {
    if (recommendation._id) {
      // If anime already exists in database, navigate directly
      navigateToDetail(recommendation._id as Id<"anime">);
      return;
    }

    const toastId = `add-anime-${recommendation.title?.replace(/[^a-zA-Z0-9]/g, '') || 'new-anime'}`;
    toast.loading('Adding anime to your collection...', { id: toastId });

    const animeToAdd = {
      title: recommendation.title?.trim() || "Unknown Title",
      description: recommendation.description?.trim() || "No description available.",
      posterUrl: recommendation.posterUrl || "",
      genres: Array.isArray(recommendation.genres) ? recommendation.genres.filter(g => g && g.trim()) : [],
      year: typeof recommendation.year === 'number' && recommendation.year > 1900 ? recommendation.year : undefined,
      rating: typeof recommendation.rating === 'number' && recommendation.rating >= 0 && recommendation.rating <= 10 ? recommendation.rating : undefined,
      emotionalTags: Array.isArray(recommendation.emotionalTags) ? recommendation.emotionalTags.filter(tag => tag && tag.trim()) : [],
      trailerUrl: recommendation.trailerUrl && recommendation.trailerUrl.trim() ? recommendation.trailerUrl : undefined,
      studios: Array.isArray(recommendation.studios) ? recommendation.studios.filter(s => s && s.trim()) : [],
      themes: Array.isArray(recommendation.themes) ? recommendation.themes.filter(t => t && t.trim()) : [],
    };

    try {
      const newAnimeId = await addAnimeByUserMutation(animeToAdd);
      toast.success('Anime added!', { id: toastId });
      navigateToDetail(newAnimeId);
    } catch (error: any) {
      console.error('[MoodboardPage] Failed to add recommendation:', error);
      toast.error(`Failed to add anime: ${error.message || 'Unknown error'}`, { id: toastId });
    }
  }, [addAnimeByUserMutation, navigateToDetail]);

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
      {/* ADVANCED BRUTAL GEOMETRIC BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Multi-Layer Grid System */}
        <div className="absolute inset-0 opacity-5"
             style={{
               backgroundImage: `
                 linear-gradient(90deg, #FF6B35 2px, transparent 2px),
                 linear-gradient(0deg, #FF6B35 2px, transparent 2px),
                 linear-gradient(45deg, #FFD93D 1px, transparent 1px),
                 linear-gradient(-45deg, #FFD93D 1px, transparent 1px)
               `,
               backgroundSize: '60px 60px, 60px 60px, 120px 120px, 120px 120px'
             }}>
        </div>
        
        {/* Dynamic Brutalist Architecture */}
        <div className="absolute top-0 left-0 w-full h-full">
          {/* Primary Monuments */}
          <div className="absolute top-20 -left-32 w-96 h-96 bg-brand-primary-action transform rotate-45 opacity-15 
                          border-8 border-brand-accent-gold/20 shadow-[0_0_100px_rgba(255,107,53,0.3)]"></div>
          <div className="absolute bottom-20 -right-40 w-[32rem] h-48 bg-brand-accent-gold transform -rotate-12 opacity-20
                          border-8 border-brand-primary-action/30 shadow-[0_0_120px_rgba(255,217,61,0.4)]"></div>
          <div className="absolute top-1/3 right-8 w-24 h-[40rem] bg-brand-accent-peach transform rotate-6 opacity-12
                          border-6 border-white/20 shadow-[0_0_80px_rgba(255,183,152,0.2)]"></div>
          
          {/* Secondary Structures */}
          <div className="absolute top-1/2 left-8 w-64 h-64 bg-brand-primary-action/60 transform -rotate-30 opacity-8
                          border-4 border-brand-accent-gold/40 clip-path-triangle"></div>
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-brand-accent-gold/40 transform rotate-12 opacity-6
                          border-6 border-brand-accent-peach/30 rounded-full"></div>
          
          {/* Micro Details */}
          <div className="absolute top-32 right-1/4 w-16 h-16 bg-brand-accent-gold border-4 border-black transform rotate-45 opacity-30"></div>
          <div className="absolute bottom-48 left-1/5 w-12 h-32 bg-brand-primary-action border-2 border-white transform -rotate-12 opacity-25"></div>
          <div className="absolute top-2/3 right-1/3 w-20 h-20 bg-brand-accent-peach border-3 border-brand-primary-action 
                          transform rotate-60 opacity-20 rounded-full"></div>
        </div>
        
        {/* Noise Texture Overlay */}
        <div className="absolute inset-0 opacity-[0.02] mix-blend-multiply"
             style={{
               backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
             }}>
        </div>
      </div>

      {/* MAIN BRUTAL CONTAINER */}
      <div className="relative z-10 p-3 md:p-6 space-y-6 md:space-y-12">
        
        {/* REVOLUTIONARY HERO SECTION */}
        <div className="relative overflow-hidden">
          {/* Main Hero Block */}
          <div className="bg-gradient-to-br from-black via-gray-900 to-black border-8 border-white 
                          shadow-[0_0_0_4px_#000,0_0_0_8px_#FF6B35,0_20px_40px_rgba(0,0,0,0.8)] 
                          transform hover:scale-[1.02] transition-all duration-500 p-8 md:p-12">
            
            {/* Floating Header Element */}
            <div className="relative mb-8">
              <div className="absolute -top-6 -left-6 w-24 h-24 bg-brand-accent-gold border-4 border-black 
                              transform rotate-45 opacity-60 animate-pulse"></div>
              <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-brand-primary-action border-4 border-white 
                              transform -rotate-12 opacity-40"></div>
              
              <div className="relative bg-brand-primary-action border-6 border-black 
                              shadow-[inset_0_0_0_4px_#FFD93D,0_8px_0_#000,0_12px_20px_rgba(0,0,0,0.6)] 
                              p-6 md:p-8 transform hover:translate-y-[-4px] transition-all duration-300">
                <h1 className="text-3xl md:text-6xl lg:text-7xl font-black text-black uppercase tracking-[0.2em] 
                               text-center leading-none relative">
                  <span className="block text-shadow-brutal">MOOD</span>
                  <span className="block text-shadow-brutal transform scale-110 origin-center">ARCHITECT</span>
                  
                  {/* Decorative Elements */}
                  <div className="absolute -top-2 -left-2 w-4 h-4 bg-black border-2 border-brand-accent-gold"></div>
                  <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-brand-accent-gold border-2 border-black transform rotate-45"></div>
                </h1>
              </div>
            </div>
            
            {/* Stats Banner */}
            <div className="relative mb-8">
              <div className="bg-white border-6 border-black 
                              shadow-[0_0_0_2px_#FF6B35,0_0_0_6px_#000,0_8px_16px_rgba(0,0,0,0.4)] 
                              p-4 md:p-6 transform skew-x-[-2deg]">
                <div className="transform skew-x-[2deg]">
                  <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
                    <div className="text-center">
                      <span className="block text-4xl md:text-5xl font-black text-brand-primary-action">
                        {EXPANDED_MOOD_CUES.length}
                      </span>
                      <span className="block text-xs md:text-sm font-bold text-black uppercase tracking-wider">
                        VIBES
                      </span>
                    </div>
                    
                    <div className="hidden md:block w-2 h-16 bg-brand-primary-action transform rotate-12"></div>
                    
                    <div className="text-center">
                      <span className="block text-4xl md:text-5xl font-black text-brand-accent-gold">
                        {Object.keys(MOOD_CATEGORIES).length}
                      </span>
                      <span className="block text-xs md:text-sm font-bold text-black uppercase tracking-wider">
                        CATEGORIES
                      </span>
                    </div>
                    
                    <div className="hidden md:block w-2 h-16 bg-brand-accent-gold transform -rotate-12"></div>
                    
                    <div className="text-center">
                      <span className="block text-4xl md:text-5xl font-black text-brand-accent-peach">
                        ∞
                      </span>
                      <span className="block text-xs md:text-sm font-bold text-black uppercase tracking-wider">
                        COMBINATIONS
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Enhanced Mode Toggle */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute -inset-2 bg-brand-accent-gold border-4 border-black transform rotate-1"></div>
                <div className="relative bg-black border-6 border-brand-accent-gold 
                                shadow-[0_0_0_2px_#000,0_8px_16px_rgba(0,0,0,0.5)] 
                                p-2 flex transform hover:rotate-0 transition-all duration-300">
                  <button
                    onClick={() => setAdvancedMode(false)}
                    className={`relative px-6 py-3 border-4 border-brand-accent-gold font-black text-sm uppercase 
                               tracking-wider transition-all duration-300 transform hover:scale-105 ${
                      !advancedMode 
                        ? 'bg-brand-primary-action text-black shadow-[inset_0_0_0_2px_#FFD93D]' 
                        : 'bg-white text-black hover:bg-brand-accent-peach'
                    }`}
                  >
                    <span className="relative z-10">SIMPLE</span>
                    {!advancedMode && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand-accent-gold border border-black transform rotate-45"></div>
                    )}
                  </button>
                  <button
                    onClick={() => setAdvancedMode(true)}
                    className={`relative px-6 py-3 border-4 border-brand-accent-gold font-black text-sm uppercase 
                               tracking-wider transition-all duration-300 transform hover:scale-105 ${
                      advancedMode 
                        ? 'bg-brand-primary-action text-black shadow-[inset_0_0_0_2px_#FFD93D]' 
                        : 'bg-white text-black hover:bg-brand-accent-peach'
                    }`}
                  >
                    <span className="relative z-10">ADVANCED</span>
                    {advancedMode && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand-accent-gold border border-black transform rotate-45"></div>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ARTISTIC PRESET GALLERY */}
        <div className="relative">
          {/* Floating Title */}
          <div className="absolute -top-8 left-8 z-20">
            <div className="bg-brand-accent-peach border-4 border-black 
                            shadow-[0_0_0_2px_#FF6B35,0_8px_16px_rgba(0,0,0,0.6)] 
                            px-6 py-2 transform -rotate-2 hover:rotate-0 transition-all duration-300">
              <span className="text-black font-black text-sm uppercase tracking-wider">QUICK START</span>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-brand-accent-peach via-brand-accent-gold to-brand-accent-peach 
                          border-8 border-black shadow-[0_0_0_4px_#FF6B35,0_20px_40px_rgba(0,0,0,0.7)] 
                          p-8 md:p-12 transform hover:scale-[1.01] transition-all duration-500">
            
            {/* Header with Decorative Elements */}
            <div className="relative mb-8">
              <div className="absolute -top-4 left-0 w-full h-2 bg-black"></div>
              <div className="absolute -bottom-4 right-0 w-3/4 h-2 bg-brand-primary-action"></div>
              
              <div className="bg-black border-6 border-white 
                              shadow-[inset_0_0_0_4px_#FFD93D,0_8px_0_#FF6B35] 
                              p-4 md:p-6 text-center">
                <h2 className="text-white font-black text-xl md:text-3xl uppercase tracking-[0.15em] 
                               text-shadow-[2px_2px_0_#FF6B35,4px_4px_0_#000]">
                  PRESET ARSENAL
                </h2>
                <div className="mt-2 text-brand-accent-gold font-bold text-xs md:text-sm uppercase">
                  CURATED MOOD COMBINATIONS
                </div>
              </div>
            </div>
            
            {/* Compact Horizontal Preset Scroller */}
            <div className="relative">
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-track-black scrollbar-thumb-brand-accent-gold">
                {MOOD_PRESETS.map((preset, index) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetSelect(preset)}
                    className="group relative bg-white border-4 border-black flex-shrink-0 w-48
                              shadow-[0_0_0_2px_#FF6B35,0_6px_0_#000,0_10px_15px_rgba(0,0,0,0.4)] 
                              p-4 hover:bg-brand-accent-gold transition-all duration-300 
                              transform hover:translate-y-[-2px] hover:scale-105
                              touch-target"
                    title={preset.description}
                  >
                    {/* Compact Content */}
                    <div className="text-center space-y-2">
                      <div className="text-2xl transform group-hover:scale-110 transition-all duration-300">
                        {preset.emoji}
                      </div>
                      <div className="text-black font-black text-xs uppercase leading-tight tracking-wider">
                        {preset.name}
                      </div>
                      <div className="bg-black text-white text-xs font-bold px-2 py-1 uppercase">
                        {preset.cues.length} VIBES
                      </div>
                    </div>
                    
                    {/* Corner Decoration */}
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand-primary-action border border-black 
                                    transform rotate-45 group-hover:rotate-90 transition-all duration-300"></div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ADVANCED SEARCH & FILTER SYSTEM */}
        <div className="space-y-6">
          {/* Search Interface */}
          <div className="relative">
            <div className="absolute -top-6 right-8 z-20">
              <div className="bg-brand-primary-action border-4 border-black 
                              shadow-[0_0_0_2px_#FFD93D,0_6px_12px_rgba(0,0,0,0.5)] 
                              px-4 py-2 transform rotate-2 hover:rotate-0 transition-all duration-300">
                <span className="text-black font-black text-xs uppercase">SEARCH ENGINE</span>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-brand-primary-action via-brand-accent-gold to-brand-primary-action 
                            border-8 border-black shadow-[0_0_0_4px_#000,0_16px_32px_rgba(0,0,0,0.6)] 
                            p-6 md:p-8">
              
              <div className="relative group">
                {/* Search Input Container */}
                <div className="relative">
                  <div className="absolute -inset-1 bg-black transform rotate-1 group-focus-within:rotate-0 transition-all duration-300"></div>
                  <div className="relative bg-white border-6 border-black 
                                  shadow-[inset_0_0_0_2px_#FF6B35,0_0_0_4px_#000] 
                                  focus-within:shadow-[inset_0_0_0_2px_#FFD93D,0_0_0_4px_#FF6B35]">
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="SEARCH MOOD UNIVERSE..."
                      className="w-full px-6 py-4 bg-transparent text-black font-bold placeholder-black/50 
                                focus:outline-none text-base md:text-lg uppercase tracking-wider
                                focus:placeholder-black/70 transition-all duration-300"
                    />
                    
                    {/* Search Icon */}
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <div className="bg-black text-white p-2 border-2 border-brand-accent-gold 
                                      transform group-focus-within:scale-110 transition-all duration-300">
                        <span className="font-black text-lg">🔍</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Search Results Count */}
                {searchFilter && (
                  <div className="mt-4 text-center">
                    <div className="bg-black text-white border-4 border-brand-accent-gold 
                                    px-4 py-2 inline-block transform hover:scale-105 transition-all duration-300">
                      <span className="font-black text-xs uppercase">
                        {filteredCues.length} MATCHES FOUND
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Category Filter Matrix */}
          <div className="relative">
            <div className="absolute -top-6 left-8 z-20">
              <div className="bg-white border-4 border-black 
                              shadow-[0_0_0_2px_#FF6B35,0_6px_12px_rgba(0,0,0,0.5)] 
                              px-4 py-2 transform -rotate-2 hover:rotate-0 transition-all duration-300">
                <span className="text-black font-black text-xs uppercase">CATEGORY MATRIX</span>
              </div>
            </div>
            
            <div className="bg-white border-8 border-black 
                            shadow-[0_0_0_4px_#FF6B35,0_20px_40px_rgba(0,0,0,0.7)] 
                            p-6 md:p-8">
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {categories.map((category, index) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`group relative p-4 border-4 border-black font-black text-xs md:text-sm uppercase 
                               tracking-wider transition-all duration-300 transform hover:scale-105 touch-target ${
                      selectedCategory === category
                        ? 'bg-brand-accent-gold text-black shadow-[0_0_0_2px_#FF6B35,0_8px_0_#000,0_12px_20px_rgba(0,0,0,0.4)] translate-y-[-4px]'
                        : 'bg-brand-accent-peach text-black hover:bg-brand-accent-gold shadow-[0_4px_0_#000,0_8px_16px_rgba(0,0,0,0.3)]'
                    }`}
                  >
                    {/* Active Indicator */}
                    {selectedCategory === category && (
                      <div className="absolute -top-2 -right-2 w-4 h-4 bg-brand-primary-action border-2 border-black 
                                      transform rotate-45 animate-pulse"></div>
                    )}
                    
                    {/* Category Text */}
                    <span className="relative z-10">
                      {category.replace("Emotional Tones", "EMOTIONAL").replace("Character Dynamics", "CHARACTER")}
                    </span>
                    
                    {/* Hover Effect */}
                    <div className="absolute inset-0 bg-brand-primary-action/20 opacity-0 group-hover:opacity-100 
                                    transition-all duration-300 border-4 border-transparent"></div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ARTISTIC MOOD LABORATORY */}
        <div className="relative">
          {/* Laboratory Title */}
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 z-20">
            <div className="bg-black border-4 border-brand-accent-gold 
                            shadow-[0_0_0_2px_#FF6B35,0_8px_16px_rgba(0,0,0,0.6)] 
                            px-8 py-3 transform hover:scale-105 transition-all duration-300">
              <span className="text-white font-black text-sm uppercase tracking-wider">MOOD LABORATORY</span>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-black via-gray-900 to-black border-8 border-white 
                          shadow-[0_0_0_4px_#000,0_0_0_8px_#FF6B35,0_24px_48px_rgba(0,0,0,0.8)] 
                          p-8 md:p-12">
            
            {/* Lab Header */}
            <div className="relative mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex-1 mr-4">
                  <div className="bg-brand-primary-action border-6 border-black 
                                  shadow-[inset_0_0_0_4px_#FFD93D,0_8px_0_#000,0_12px_20px_rgba(0,0,0,0.5)] 
                                  p-4 md:p-6 transform hover:translate-y-[-2px] transition-all duration-300">
                    <h2 className="text-black font-black text-lg md:text-2xl uppercase text-center leading-none">
                      <span className="block">CRAFT YOUR</span>
                      <span className="block text-2xl md:text-3xl">VIBE MATRIX</span>
                      {selectedCategory !== "All" && (
                        <span className="block text-sm mt-2 text-black/80">
                          [{selectedCategory.toUpperCase()}]
                        </span>
                      )}
                    </h2>
                  </div>
                </div>
                
                {/* Selection Counter */}
                <div className="relative">
                  <div className="absolute -inset-2 bg-brand-accent-gold border-4 border-black transform rotate-3"></div>
                  <div className="relative bg-black border-6 border-brand-accent-gold 
                                  shadow-[0_0_0_2px_#000,0_8px_16px_rgba(0,0,0,0.4)] 
                                  p-4 text-center transform hover:rotate-0 transition-all duration-300">
                    <div className="text-brand-accent-gold font-black text-2xl md:text-3xl">
                      {selectedMoodCues.length}
                    </div>
                    <div className="text-white font-bold text-xs uppercase tracking-wider">
                      SELECTED
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Compact Mood Grid - Auto Layout */}
            <div className="flex flex-wrap gap-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-track-black scrollbar-thumb-brand-accent-gold">
              {filteredCues.map((cue, index) => {
                const isSelected = selectedMoodCues.includes(cue.label);
                const intensity = cueIntensities[cue.id] || cue.intensity || 3;
                
                return (
                  <div key={cue.id} className="flex flex-col gap-2">
                    <button
                      onClick={() => handleMoodCueToggle(cue.label)}
                      className={`group relative w-40 p-3 border-4 border-black transition-all duration-300 touch-target ${
                        isSelected 
                          ? 'bg-brand-accent-gold shadow-[0_0_0_2px_#FF6B35,0_6px_0_#000,0_10px_15px_rgba(0,0,0,0.6)] transform translate-y-[-4px] scale-105' 
                          : 'bg-white hover:bg-brand-accent-peach shadow-[0_3px_0_#000,0_6px_12px_rgba(0,0,0,0.4)] hover:shadow-[0_4px_0_#000,0_8px_16px_rgba(0,0,0,0.5)] hover:translate-y-[-1px]'
                      }`}
                      title={`${cue.label}: ${cue.description}`}
                    >
                      {/* Selection Indicator */}
                      {isSelected && (
                        <div className="absolute -top-2 -right-2 w-5 h-5 bg-brand-primary-action border-2 border-white 
                                        rounded-full flex items-center justify-center z-10">
                          <span className="text-white text-xs font-black">✓</span>
                        </div>
                      )}
                      
                      {/* Compact Content */}
                      <div className="text-center space-y-1">
                        <div className="text-2xl transform group-hover:scale-110 transition-all duration-300">
                          {cue.emoji}
                        </div>
                        <div className="text-black font-black text-xs uppercase leading-tight">
                          {cue.label}
                        </div>
                        
                        {/* Category Badge for "All" view - Smaller */}
                        {selectedCategory === "All" && (
                          <div className="bg-black text-white text-xs font-bold px-1 py-0.5 uppercase text-center">
                            {cue.category.replace("Emotional Tones", "EMO").replace("Character Dynamics", "CHAR").substring(0, 4)}
                          </div>
                        )}
                      </div>
                    </button>
                    
                    {/* Compact Advanced Mode: Intensity Control */}
                    {advancedMode && isSelected && (
                      <div className="bg-brand-accent-peach border-2 border-black p-2 w-40">
                        <div className="text-center mb-1">
                          <div className="bg-black text-white text-xs font-bold px-1 py-0.5 uppercase">
                            INTENSITY
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={intensity}
                            onChange={(e) => handleIntensityChange(cue.id, parseInt(e.target.value))}
                            className="w-full h-2 bg-white border-2 border-black appearance-none cursor-pointer"
                            style={{
                              background: `linear-gradient(to right, #FF6B35 0%, #FF6B35 ${(intensity - 1) * 25}%, #ffffff ${(intensity - 1) * 25}%, #ffffff 100%)`
                            }}
                            aria-label={`Intensity for ${cue.label}`}
                          />
                          <div className="text-center">
                            <span className="text-black font-bold text-xs">
                              {"★".repeat(intensity)}{"☆".repeat(5 - intensity)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* No Results State */}
            {filteredCues.length === 0 && (
              <div className="text-center py-12">
                <div className="bg-brand-accent-peach border-6 border-black 
                                shadow-[0_0_0_4px_#FF6B35,0_16px_32px_rgba(0,0,0,0.6)] 
                                p-8 md:p-12 transform hover:scale-105 transition-all duration-300">
                  
                  <div className="text-6xl md:text-8xl mb-6">🔍</div>
                  
                  <div className="bg-black border-4 border-white p-4 mb-6">
                    <h3 className="text-white font-black text-xl md:text-2xl uppercase">
                      NO VIBES DISCOVERED
                    </h3>
                  </div>
                  
                  <p className="text-black font-bold text-sm md:text-base uppercase mb-8">
                    YOUR SEARCH PARAMETERS ARE TOO SPECIFIC
                  </p>
                  
                  <button 
                    onClick={() => setSearchFilter("")}
                    className="bg-brand-primary-action border-6 border-black text-black font-black 
                              px-6 py-4 uppercase shadow-[0_0_0_2px_#FFD93D,0_8px_0_#000,0_12px_20px_rgba(0,0,0,0.4)] 
                              hover:bg-brand-accent-gold hover:translate-y-[-4px] transition-all duration-300"
                  >
                    🎯 RESET SEARCH
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ARTISTIC VIBE SYNTHESIS */}
        {selectedMoodCues.length > 0 && (
          <div className="space-y-8">
            {/* Vibe Matrix Display */}
            <div className="relative">
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 z-20">
                <div className="bg-brand-accent-gold border-4 border-black 
                                shadow-[0_0_0_2px_#FF6B35,0_8px_16px_rgba(0,0,0,0.6)] 
                                px-6 py-3 transform hover:scale-105 transition-all duration-300">
                  <span className="text-black font-black text-sm uppercase tracking-wider">VIBE SYNTHESIS</span>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-brand-accent-gold via-brand-accent-peach to-brand-accent-gold 
                              border-8 border-black shadow-[0_0_0_4px_#FF6B35,0_24px_48px_rgba(0,0,0,0.8)] 
                              p-8 md:p-12">
                
                {/* Matrix Header */}
                <div className="relative mb-8">
                  <div className="bg-black border-6 border-white 
                                  shadow-[inset_0_0_0_4px_#FFD93D,0_8px_0_#FF6B35] 
                                  p-4 md:p-6 text-center">
                    <h3 className="text-white font-black text-xl md:text-3xl uppercase tracking-[0.15em] 
                                   text-shadow-[2px_2px_0_#FF6B35,4px_4px_0_#000]">
                      YOUR MOOD MATRIX
                    </h3>
                    <div className="mt-2 text-brand-accent-gold font-bold text-sm uppercase">
                      {selectedMoodCues.length} VIBES SYNTHESIZED
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Vibe Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {selectedCueObjects.map((cue, index) => {
                    const intensity = cueIntensities[cue.id] || cue.intensity || 3;
                    return (
                      <div key={cue.id} className="group relative bg-white border-6 border-black 
                                                   shadow-[0_0_0_2px_#FF6B35,0_8px_0_#000,0_12px_20px_rgba(0,0,0,0.4)] 
                                                   p-4 md:p-6 hover:bg-brand-accent-peach 
                                                   transform hover:translate-y-[-4px] hover:scale-105 
                                                   transition-all duration-300">
                        
                        {/* Index Number */}
                        <div className="absolute -top-3 -left-3 w-8 h-8 bg-brand-primary-action border-3 border-black 
                                        rounded-full flex items-center justify-center z-10">
                          <span className="text-black text-sm font-black">{index + 1}</span>
                        </div>
                        
                        {/* Content */}
                        <div className="text-center space-y-3">
                          <div className="text-3xl md:text-4xl transform group-hover:scale-110 transition-all duration-300">
                            {cue.emoji}
                          </div>
                          <div className="text-black font-black text-sm md:text-base uppercase leading-tight">
                            {cue.label}
                          </div>
                          
                          {/* Intensity Display for Advanced Mode */}
                          {advancedMode && (
                            <div className="space-y-2">
                              <div className="bg-black text-brand-accent-gold border-2 border-brand-accent-gold 
                                              px-3 py-1 text-xs font-bold uppercase inline-block">
                                INTENSITY: {intensity}/5
                              </div>
                              <div className="text-center">
                                <span className="text-black font-black text-lg">
                                  {"★".repeat(intensity)}{"☆".repeat(5 - intensity)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Hover Decoration */}
                        <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-brand-accent-gold border-2 border-black 
                                        transform rotate-45 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Command Center */}
            <div className="relative">
              <div className="absolute -top-8 right-8 z-20">
                <div className="bg-brand-primary-action border-4 border-black 
                                shadow-[0_0_0_2px_#FFD93D,0_8px_16px_rgba(0,0,0,0.6)] 
                                px-6 py-3 transform rotate-2 hover:rotate-0 transition-all duration-300">
                  <span className="text-black font-black text-sm uppercase tracking-wider">COMMAND CENTER</span>
                </div>
              </div>
              
              <div className="bg-black border-8 border-white 
                              shadow-[0_0_0_4px_#FF6B35,0_24px_48px_rgba(0,0,0,0.8)] 
                              p-8 md:p-12">
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Generate Button */}
                  <button
                    onClick={() => {
                      localStorage.removeItem(HISTORY_KEY);
                      fetchMoodBoardRecommendations();
                    }}
                    disabled={isLoadingMoodBoard}
                    className="group relative bg-brand-primary-action border-6 border-black text-black font-black 
                              py-6 px-8 uppercase tracking-wider shadow-[0_0_0_2px_#FFD93D,0_12px_0_#000,0_16px_24px_rgba(0,0,0,0.6)] 
                              hover:bg-brand-accent-gold hover:translate-y-[-8px] 
                              active:translate-y-0 active:shadow-[0_0_0_2px_#FFD93D,0_4px_0_#000,0_8px_12px_rgba(0,0,0,0.4)]
                              transition-all duration-300 touch-target disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {/* Loading Animation */}
                    {isLoadingMoodBoard && (
                      <div className="absolute inset-0 bg-brand-accent-gold/50 border-6 border-transparent 
                                      flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                    
                    <div className="relative z-10 text-center">
                      <div className="text-2xl md:text-3xl mb-2">
                        {isLoadingMoodBoard ? "🔄" : "🎯"}
                      </div>
                      <div className="text-sm md:text-base">
                        {isLoadingMoodBoard ? "CRAFTING..." : "FRESH RECS"}
                      </div>
                    </div>
                    
                    {/* Corner Decoration */}
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-brand-accent-gold border-2 border-black 
                                    transform rotate-45 group-hover:rotate-90 transition-all duration-300"></div>
                  </button>
                  
                  {/* Save Button */}
                  <button
                    onClick={saveMoodboard}
                    className="group relative bg-brand-accent-peach border-6 border-black text-black font-black 
                              py-6 px-8 uppercase tracking-wider shadow-[0_0_0_2px_#FF6B35,0_12px_0_#000,0_16px_24px_rgba(0,0,0,0.6)] 
                              hover:bg-brand-accent-gold hover:translate-y-[-8px] 
                              active:translate-y-0 active:shadow-[0_0_0_2px_#FF6B35,0_4px_0_#000,0_8px_12px_rgba(0,0,0,0.4)]
                              transition-all duration-300 touch-target"
                  >
                    <div className="relative z-10 text-center">
                      <div className="text-2xl md:text-3xl mb-2">💾</div>
                      <div className="text-sm md:text-base">SAVE BOARD</div>
                    </div>
                    
                    <div className="absolute -top-2 -left-2 w-6 h-6 bg-brand-primary-action border-2 border-black 
                                    transform rotate-45 group-hover:rotate-90 transition-all duration-300"></div>
                  </button>
                  
                  {/* Clear Button */}
                  <button
                    onClick={() => onMoodCuesChange([])}
                    className="group relative bg-white border-6 border-black text-black font-black 
                              py-6 px-8 uppercase tracking-wider shadow-[0_0_0_2px_#666,0_12px_0_#000,0_16px_24px_rgba(0,0,0,0.6)] 
                              hover:bg-gray-200 hover:translate-y-[-8px] 
                              active:translate-y-0 active:shadow-[0_0_0_2px_#666,0_4px_0_#000,0_8px_12px_rgba(0,0,0,0.4)]
                              transition-all duration-300 touch-target"
                  >
                    <div className="relative z-10 text-center">
                      <div className="text-2xl md:text-3xl mb-2">🗑️</div>
                      <div className="text-sm md:text-base">CLEAR ALL</div>
                    </div>
                    
                    <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-red-500 border-2 border-black 
                                    transform rotate-45 group-hover:rotate-90 transition-all duration-300"></div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ARCHIVE GALLERY */}
        {savedMoodboards.length > 0 && (
          <div className="relative">
            <div className="absolute -top-8 left-8 z-20">
              <div className="bg-brand-accent-peach border-4 border-black 
                              shadow-[0_0_0_2px_#FF6B35,0_8px_16px_rgba(0,0,0,0.6)] 
                              px-6 py-3 transform -rotate-2 hover:rotate-0 transition-all duration-300">
                <span className="text-black font-black text-sm uppercase tracking-wider">MOOD ARCHIVE</span>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-brand-accent-peach via-brand-accent-gold to-brand-accent-peach 
                            border-8 border-black shadow-[0_0_0_4px_#FF6B35,0_20px_40px_rgba(0,0,0,0.7)] 
                            p-8 md:p-12">
              
              {/* Archive Header */}
              <div className="relative mb-8">
                <div className="bg-black border-6 border-white 
                                shadow-[inset_0_0_0_4px_#FFD93D,0_8px_0_#FF6B35] 
                                p-4 md:p-6 text-center">
                  <h3 className="text-white font-black text-xl md:text-2xl uppercase tracking-[0.15em]">
                    SAVED COLLECTIONS
                  </h3>
                  <div className="mt-2 text-brand-accent-gold font-bold text-sm uppercase">
                    {savedMoodboards.length} ARCHIVED BOARDS
                  </div>
                </div>
              </div>
              
              {/* Archive Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedMoodboards.map((moodboard, index) => (
                  <button
                    key={moodboard.id}
                    onClick={() => loadMoodboard(moodboard)}
                    className="group relative bg-white border-6 border-black 
                              shadow-[0_0_0_2px_#FF6B35,0_8px_0_#000,0_12px_20px_rgba(0,0,0,0.4)] 
                              p-6 hover:bg-brand-accent-gold 
                              transform hover:translate-y-[-4px] hover:scale-105 
                              active:translate-y-0 active:scale-100 
                              transition-all duration-300 touch-target"
                  >
                    {/* Archive Number */}
                    <div className="absolute -top-3 -left-3 w-8 h-8 bg-brand-primary-action border-3 border-black 
                                    rounded-full flex items-center justify-center z-10">
                      <span className="text-black text-sm font-black">{index + 1}</span>
                    </div>
                    
                    {/* Content */}
                    <div className="text-center space-y-4">
                      <div className="text-3xl mb-2">📁</div>
                      
                      <div className="text-black font-black text-sm md:text-base uppercase leading-tight">
                        {moodboard.name}
                      </div>
                      
                      <div className="bg-black text-white border-2 border-brand-accent-gold 
                                      px-3 py-1 text-xs font-bold uppercase inline-block">
                        {moodboard.cues.length} VIBES
                      </div>
                      
                      {/* Cue Preview */}
                      <div className="flex flex-wrap justify-center gap-1 mt-2">
                        {moodboard.cues.slice(0, 4).map(cueLabel => {
                          const cue = EXPANDED_MOOD_CUES.find(c => c.label === cueLabel);
                          return cue ? (
                            <span key={cue.id} className="text-lg">{cue.emoji}</span>
                          ) : null;
                        })}
                        {moodboard.cues.length > 4 && (
                          <span className="text-black/60 text-sm font-bold">+{moodboard.cues.length - 4}</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Hover Decorations */}
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-brand-accent-gold border-2 border-black 
                                    transform rotate-45 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                    <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-brand-primary-action border-2 border-black 
                                    transform rotate-45 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                  </button>
                ))}
              </div>
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
            
                         {/* BRUTAL CAROUSEL SWIPER */}
             <div className="bg-black border-4 border-white p-4 md:p-6 shadow-brutal-lg">
               <div className="bg-brand-primary-action border-4 border-black p-3 mb-6">
                 <h4 className="text-black font-black text-lg uppercase text-center">FEATURED MOOD PICKS</h4>
               </div>
               
               <Swiper
                 slidesPerView="auto"
                 spaceBetween={16}
                 grabCursor={true}
                 allowTouchMove={true}
                 touchStartPreventDefault={false}
                 className="w-full"
                 style={{ overflow: 'visible' }}
               >
                 {moodBoardRecommendations.map((rec, index) => (
                   <SwiperSlide key={`featured-${index}-${rec.title}`} className="!w-[250px]" style={{ pointerEvents: 'auto' }}>
                     <div className="bg-white border-4 border-black shadow-brutal hover:shadow-brutal-lg transition-all group cursor-pointer"
                          style={{ touchAction: 'pan-y pinch-zoom' }}
                          onClick={() => handleAddAnimeAndNavigate(rec)}>
                       {/* Brutal Anime Card Container */}
                       <div className="border-b-4 border-black" style={{ pointerEvents: 'auto' }}>
                         <AnimeCard 
                           anime={rec} 
                           isRecommendation={true} 
                           onViewDetails={navigateToDetail}
                           className="w-full border-none shadow-none pointer-events-none"
                         />
                       </div>
                       
                       {/* Brutal Info Section */}
                       <div className="p-3 bg-black" style={{ pointerEvents: 'auto' }}>
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
      </div>
    </div>
  );
};

export default memo(EnhancedMoodboardPageComponent);