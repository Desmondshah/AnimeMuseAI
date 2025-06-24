// src/components/animuse/MainApp.tsx - Fixed and Organized Version

import React, { useState, useEffect, useCallback, memo, useRef, useMemo } from "react";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id, Doc } from "../../../convex/_generated/dataModel";
import AnimeDetailPage from "./AnimeDetailPage";
import StyledButton from "./shared/StyledButton";
import WatchlistPage from "./onboarding/WatchlistPage";
import DiscoverPage from "./onboarding/DiscoverPage";

import { AnimeRecommendation } from "../../../convex/types";
import { toast } from "sonner";
import AnimeCard from "./AnimeCard";
import AdminDashboardPage from "../admin/AdminDashboardPage";
import ProfileSettingsPage from "./onboarding/ProfileSettingsPage";
import EnhancedAIAssistantPage from "./AIAssistantPage";
import BottomNavigationBar from "./BottomNavigationBar";
import MoodboardPage from "./onboarding/MoodboardPage";
import CharacterDetailPage from "./onboarding/CharacterDetailPage";
import StudioGhibliPage from "./StudioGhibliPage";
import MadhousePage from "./MadhousePage";
import MappaPage from "./MappaPage";
import BonesPage from "./BonesPage";
import KyotoAnimationPage from "./KyotoAnimationPage";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "./shared/PageTransition";
import Carousel from "./shared/Carousel";
import { useMobileOptimizations } from "../../../convex/useMobileOptimizations";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow } from "swiper/modules";


// ============================================================================
// SECTION 1: COMPONENTS AND CONSTANTS
// ============================================================================

const LoadingSpinnerComponent: React.FC<{ message?: string; className?: string }> = ({ 
  message = "Loading...", 
  className = "" 
}) => (
  <div className={`flex flex-col justify-center items-center py-10 ${className}`}>
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-primary-action"></div>
    {message && <p className="mt-3 text-sm text-white">{message}</p>}
  </div>
);

const LoadingSpinner = memo(LoadingSpinnerComponent);

const ensureCompleteRecommendations = (recommendations: any[]): AnimeRecommendation[] => {
  return recommendations.map((rec: any): AnimeRecommendation => {
    // Calculate moodMatchScore if missing
    const moodMatchScore = rec.moodMatchScore ?? 
                          rec.similarityScore ?? 
                          (typeof rec.rating === 'number' ? Math.min(10, Math.max(1, rec.rating)) : 7);

    return {
      title: rec.title || "Unknown Title",
      description: rec.description || "No description available.",
      posterUrl: rec.posterUrl || "",
      genres: Array.isArray(rec.genres) ? rec.genres : [],
      year: typeof rec.year === 'number' ? rec.year : undefined,
      rating: typeof rec.rating === 'number' ? rec.rating : undefined,
      emotionalTags: Array.isArray(rec.emotionalTags) ? rec.emotionalTags : [],
      trailerUrl: rec.trailerUrl || undefined,
      studios: Array.isArray(rec.studios) ? rec.studios : [],
      themes: Array.isArray(rec.themes) ? rec.themes : [],
      reasoning: rec.reasoning || "AI recommendation",
      moodMatchScore, // FIXED: Always present
      
      // Include optional properties if they exist
      ...(rec._id && { _id: rec._id }),
      ...(rec.characterHighlights && { characterHighlights: rec.characterHighlights }),
      ...(rec.plotTropes && { plotTropes: rec.plotTropes }),
      ...(rec.artStyleTags && { artStyleTags: rec.artStyleTags }),
      ...(rec.surpriseFactors && { surpriseFactors: rec.surpriseFactors }),
      ...(rec.foundInDatabase !== undefined && { foundInDatabase: rec.foundInDatabase }),
    };
  });
};

// ============================================================================
// SECTION 2: TYPES AND INTERFACES
// ============================================================================

export type ValidViewName =
  | "dashboard" | "ai_assistant" | "anime_detail" | "my_list"
  | "browse" | "admin_dashboard" | "profile_settings"
  | "custom_lists_overview" | "custom_list_detail" | "moodboard_page"
  | "character_detail" | "studio_ghibli" | "madhouse" | "mappa" | "bones" | "kyoto_animation"; // NEW: Add character detail view, Studio Ghibli page, Madhouse page, MAPPA page, Bones page, and Kyoto Animation page

export type CurrentView = ValidViewName;

interface EnhancedCharacter {
  id?: number;
  name: string;
  imageUrl?: string;
  role: string;
  description?: string;
  status?: string;
  gender?: string;
  age?: string;
  dateOfBirth?: {
    year?: number;
    month?: number;
    day?: number;
  };
  bloodType?: string;
  height?: string;
  weight?: string;
  species?: string;
  powersAbilities?: string[];
  weapons?: string[];
  nativeName?: string;
  siteUrl?: string;
  voiceActors?: {
    id?: number;
    name: string;
    language: string;
    imageUrl?: string;
  }[];
  relationships?: {
    relatedCharacterId?: number;
    relationType: string;
  }[];
}

interface WatchlistActivityItem { 
  animeTitle: string; 
  status: string; 
  userRating?: number; 
}

interface ForYouCategory {
  id: string; 
  title: string; 
  recommendations: AnimeRecommendation[];
  reason?: string; 
  isLoading: boolean; 
  error?: string | null;
  fetchFn?: (args: any) => Promise<{ 
    recommendations: AnimeRecommendation[]; // FIXED: Always properly typed
    error?: string | null; 
    details?: any 
  }>;
  fetchArgs?: any;
  lastFetched?: number;
}

// Add this interface for custom list type if not already defined
interface CustomListType {
  _id: Id<"customLists">;
  listName: string;
  description?: string;
  isPublic: boolean;
  animeIds: Id<"anime">[];
  // Add other properties as needed
}

// Add this interface for custom list with anime details
interface CustomListWithAnime {
  _id: Id<"customLists">;
  listName: string;
  description?: string;
  isPublic: boolean;
  anime: Doc<"anime">[];
  // Add other properties as needed
}


// ============================================================================
// SECTION 3: CONSTANTS
// ============================================================================



// 12 hours in milliseconds (FIXED: was 10 minutes)
const PERSONALIZED_REFRESH_INTERVAL = 12 * 60 * 60 * 1000;



// ============================================================================
// SECTION 4: MAIN COMPONENT
// ============================================================================

export default function MainApp() {
  
  // --------------------------------------------------------------------------
  // SUBSECTION 4.1: HOOKS AND STATE
  // --------------------------------------------------------------------------
  
  // Convex Queries and Actions
  const userProfile = useQuery(api.users.getMyUserProfile);
  const fullWatchlist = useQuery(api.anime.getMyWatchlist);
  const isUserAdmin = useQuery(api.admin.isCurrentUserAdmin);
  const myCustomLists = useQuery(api.users.getMyCustomLists);
  const getPersonalizedRecommendationsAction = useAction(api.ai.getPersonalizedRecommendationsWithDatabaseFirst);

  const watchlistActivity: WatchlistActivityItem[] | undefined = fullWatchlist
    ? (fullWatchlist as any[]).slice(0, 5).map((item: any) => ({
        animeTitle: item.anime?.title || 'Unknown',
        status: item.status,
        userRating: item.userRating ?? undefined,
      }))
    : undefined;
  const createCustomListMutation = useMutation(api.users.createCustomList);
  const addAnimeByUserMutation = useMutation(api.anime.addAnimeByUser);
  const fetchTrendingAnimeAction = useAction(api.externalApis.fetchTrendingAnime);
  const fetchTopRatedAnimeAction = useAction(api.externalApis.fetchTopRatedAnime);
  const fetchPopularAnimeAction = useAction(api.externalApis.fetchPopularAnime);
  const fetchBingeableAnimeAction = useAction(api.externalApis.fetchBingeableAnime);
  const fetchRetroClassicAnimeAction = useAction(api.externalApis.fetchRetroClassicAnime);
  const fetchHorrorAnimeAction = useAction(api.externalApis.fetchHorrorAnime);
  const fetchTrueCrimeAnimeAction = useAction(api.externalApis.fetchTrueCrimeAnime);


  const { shouldReduceAnimations } = useMobileOptimizations();

  
  
  // Navigation State
  const [currentView, setCurrentView] = useState<CurrentView>("dashboard");
  const [selectedAnimeId, setSelectedAnimeId] = useState<Id<"anime"> | null>(null);
  const [selectedCustomListId, setSelectedCustomListId] = useState<Id<"customLists"> | null>(null);
  const [historyStack, setHistoryStack] = useState<CurrentView[]>(["dashboard"]);

  const handleTransitionEnd = useCallback(() => {
    window.scrollTo(0, 0);
  }, []);

  // Recommendations State
  const [forYouCategories, setForYouCategories] = useState<ForYouCategory[]>([]);
  const [hasFetchedForYou, setHasFetchedForYou] = useState(false);

  // Persist personalized recommendations across refreshes
  useEffect(() => {
    const stored = localStorage.getItem('forYouCategories');
    if (stored) {
      try {
        const parsed: ForYouCategory[] = JSON.parse(stored);
        setForYouCategories(parsed);
        if (parsed.length > 0) setHasFetchedForYou(true);
      } catch (e) {
        console.error('[MainApp] Failed to parse stored recommendations', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('forYouCategories', JSON.stringify(forYouCategories));
  }, [forYouCategories]);

  // Modal State
  const [isCreateListModalOpen, setIsCreateListModalOpen] = useState(false);

  // Moodboard State
  const [moodboardState, setMoodboardState] = useState({
    selectedMoodCues: [] as string[],
    recommendations: [] as AnimeRecommendation[],
    isLoading: false,
  });

  const [trendingAnime, setTrendingAnime] = useState<AnimeRecommendation[]>([]);
  const [topAnime, setTopAnime] = useState<AnimeRecommendation[]>([]);
  const [popularAnime, setPopularAnime] = useState<AnimeRecommendation[]>([]);
  const [bingeableAnime, setBingeableAnime] = useState<AnimeRecommendation[]>([]);
  const [retroClassicAnime, setRetroClassicAnime] = useState<AnimeRecommendation[]>([]);
  const [horrorAnime, setHorrorAnime] = useState<AnimeRecommendation[]>([]);
  const [trueCrimeAnime, setTrueCrimeAnime] = useState<AnimeRecommendation[]>([]);
  const loopedPopularAnime = useMemo(
    () => popularAnime.length ? [...popularAnime, ...popularAnime, ...popularAnime] : [],
    [popularAnime]
  );

  // NEW CHARACTER STATE:
  const [selectedCharacterData, setSelectedCharacterData] = useState<EnhancedCharacter | null>(null);
  const [selectedAnimeNameForCharacter, setSelectedAnimeNameForCharacter] = useState<string>("");

  // FIXED: Move useRef hooks INSIDE the component
  const fetchInProgressRef = useRef<boolean>(false);
  const debouncedFetchRef = useRef<NodeJS.Timeout | null>(null);
  // Track previous profile to detect changes
  const previousProfileRef = useRef<any>(null);

  // --------------------------------------------------------------------------
  // SUBSECTION 4.2: HELPER FUNCTIONS
  // --------------------------------------------------------------------------

  // Helper function to check if recommendations need refreshing
  const needsRefresh = useCallback((category: ForYouCategory) => {
  if (!category.lastFetched) return true;
  const hoursSinceLastFetch = (Date.now() - category.lastFetched) / (1000 * 60 * 60);
  return hoursSinceLastFetch >= 12; // Exactly 12 hours
}, []);

  // --------------------------------------------------------------------------
  // SUBSECTION 4.3: NAVIGATION FUNCTIONS
  // --------------------------------------------------------------------------

  const navigateTo = useCallback((view: CurrentView, options?: { replace?: boolean; data?: any }) => {
    
    if (options?.replace) {
      setHistoryStack(prev => {
        const newStack = [...prev.slice(0, -1), view];
        return newStack.length > 0 ? newStack : [view];
      });
    } else if (historyStack.length === 0 || historyStack[historyStack.length - 1] !== view) {
      setHistoryStack(prev => [...prev, view]);
    }
    setCurrentView(view);
    if (view !== "anime_detail" && view !== "character_detail") setSelectedAnimeId(null);
    if (view !== "custom_list_detail") setSelectedCustomListId(null);
    // NEW: Clear character data when not on character detail page
    if (view !== "character_detail") {
      setSelectedCharacterData(null);
      setSelectedAnimeNameForCharacter("");
    }
  }, [historyStack]);

  const navigateBack = useCallback(() => {
    if (historyStack.length > 1) {
      const newStack = historyStack.slice(0, -1);
      const previousView = newStack[newStack.length - 1];
      setHistoryStack(newStack);
      setCurrentView(previousView);
      
      if (previousView !== "anime_detail") setSelectedAnimeId(null);
      if (previousView !== "custom_list_detail") setSelectedCustomListId(null);
      // NEW: Clear character data when going back
      if (previousView !== "character_detail") {
        setSelectedCharacterData(null);
        setSelectedAnimeNameForCharacter("");
      }
    } else {
      navigateTo("dashboard", { replace: true });
    }
  }, [historyStack, navigateTo]);

  // Specific navigation functions
  const navigateToDetail = useCallback((animeId: Id<"anime">) => { 
    navigateTo("anime_detail"); 
    setSelectedAnimeId(animeId); 
  }, [navigateTo]);

  const navigateToCharacterDetail = useCallback((character: EnhancedCharacter, animeName: string) => {
    navigateTo("character_detail");
    setSelectedCharacterData(character);
    setSelectedAnimeNameForCharacter(animeName);
  }, [navigateTo]);
  
  const navigateToDashboard = useCallback(() => navigateTo("dashboard"), [navigateTo]);
  const navigateToBrowse = useCallback(() => navigateTo("browse"), [navigateTo]);
  const navigateToMyList = useCallback(() => navigateTo("my_list"), [navigateTo]);
  const navigateToAIAssistant = useCallback(() => navigateTo("ai_assistant"), [navigateTo]);
  const navigateToAdminDashboard = useCallback(() => navigateTo("admin_dashboard"), [navigateTo]);
  const navigateToProfileSettings = useCallback(() => navigateTo("profile_settings"), [navigateTo]);
  const navigateToCustomListsOverview = useCallback(() => navigateTo("custom_lists_overview"), [navigateTo]);
  const navigateToCustomListDetail = useCallback((listId: Id<"customLists">) => { 
    navigateTo("custom_list_detail"); 
    setSelectedCustomListId(listId); 
  }, [navigateTo]);
  const navigateToStudioGhibli = useCallback(() => navigateTo("studio_ghibli"), [navigateTo]);
  const navigateToMadhouse = useCallback(() => navigateTo("madhouse"), [navigateTo]);
  const navigateToMappa = useCallback(() => navigateTo("mappa"), [navigateTo]);
  const navigateToBones = useCallback(() => navigateTo("bones"), [navigateTo]);
  const navigateToKyotoAnimation = useCallback(() => navigateTo("kyoto_animation"), [navigateTo]);

  const handleTabChange = (view: ValidViewName) => {
    // Character detail should not be accessible via bottom tabs
    if (view === "character_detail") return;
    navigateTo(view);
  };

  // --------------------------------------------------------------------------
  // SUBSECTION 4.4: MOODBOARD HANDLERS
  // --------------------------------------------------------------------------

  const handleMoodCuesChange = useCallback((cues: string[]) => {
    setMoodboardState(prev => ({ 
      ...prev, 
      selectedMoodCues: cues,
      recommendations: cues.length === 0 ? [] : prev.recommendations
    }));
  }, []);

  const handleMoodboardRecommendationsChange = useCallback((recs: AnimeRecommendation[]) => {
    setMoodboardState(prev => ({ ...prev, recommendations: recs }));
  }, []);

  const handleMoodboardLoadingChange = useCallback((loading: boolean) => {
    setMoodboardState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  // --------------------------------------------------------------------------
  // SUBSECTION 4.5: RECOMMENDATION INTERACTION FUNCTIONS
  // --------------------------------------------------------------------------

  // Enhanced function to handle recommendation clicks
  const handleRecommendationClick = useCallback(async (recommendation: AnimeRecommendation) => {
  const existingId = (recommendation as any)._id || (recommendation as any).id;

    if (existingId) {
      navigateToDetail(existingId as Id<"anime">);
      return;
    }

    const toastId = `add-recommendation-${recommendation.title?.replace(/[^a-zA-Z0-9]/g, '') || 'anime'}`;
    toast.loading('Adding anime to your universe...', { id: toastId });

    const animeToAdd = {
      title: recommendation.title?.trim() || 'Unknown Title',
      description: recommendation.description?.trim() || 'No description available.',
      posterUrl:
        recommendation.posterUrl && !recommendation.posterUrl.includes('placeholder')
          ? recommendation.posterUrl
          : `https://placehold.co/600x900/ECB091/321D0B/png?text=${encodeURIComponent(
              recommendation.title?.substring(0, 20) || 'Anime',
            )}&font=roboto`,
      genres: Array.isArray(recommendation.genres) ? recommendation.genres.filter((g) => g && g.trim()) : [],
      year: typeof recommendation.year === 'number' && recommendation.year > 1900 ? recommendation.year : undefined,
      rating:
        typeof recommendation.rating === 'number' && recommendation.rating >= 0 && recommendation.rating <= 10
          ? recommendation.rating
          : undefined,
      emotionalTags: Array.isArray(recommendation.emotionalTags)
        ? recommendation.emotionalTags.filter((tag) => tag && tag.trim())
        : [],
      trailerUrl: recommendation.trailerUrl && recommendation.trailerUrl.trim() ? recommendation.trailerUrl : undefined,
      studios: Array.isArray(recommendation.studios) ? recommendation.studios.filter((s) => s && s.trim()) : [],
      themes: Array.isArray(recommendation.themes) ? recommendation.themes.filter((t) => t && t.trim()) : [],
      anilistId: (recommendation as any).anilistId ?? undefined,
    };

    try {
      const newAnimeId = await addAnimeByUserMutation(animeToAdd);
      toast.success('Anime added!', { id: toastId });
      navigateToDetail(newAnimeId);
    } catch (error: any) {
      console.error('[MainApp] Failed to add recommendation:', error);
      toast.error(`Failed to add anime: ${error.message || 'Unknown error'}`, { id: toastId });
    }
  }, [addAnimeByUserMutation, navigateToDetail]);

// Also add a fallback navigation function
const handleAnimeCardClick = useCallback((animeId: Id<"anime">) => {
  if (!animeId) {
    console.error('[MainApp] Invalid anime ID provided to handleAnimeCardClick');
    toast.error('Invalid anime selection');
    return;
  }
  
  console.log(`[MainApp] AnimeCard navigation request for ID: ${animeId}`);
  navigateToDetail(animeId);
}, [navigateToDetail]);

  // Manual refresh function for personalized recommendations
  const refreshPersonalizedRecommendations = useCallback(async () => {
    if (fetchInProgressRef.current) {
      console.log('[MainApp] Refresh already in progress, skipping...');
      toast.info('Refresh already in progress...');
      return;
    }

    const personalizedCategory = forYouCategories.find(cat => cat.id === "generalPersonalized");
    if (!personalizedCategory || !userProfile) {
      toast.error('Unable to refresh at this time');
      return;
    }

    console.log('[MainApp] Starting manual refresh...');
    fetchInProgressRef.current = true;

    setForYouCategories((prev: ForYouCategory[]) => prev.map((c: ForYouCategory) => 
      c.id === "generalPersonalized" 
        ? { ...c, isLoading: true, error: null }
        : c
    ));

    try {
      const profileDataForAI = {
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
        narrativePacing: userProfile.narrativePacing,
      };

      const result = await getPersonalizedRecommendationsAction({
        userProfile: profileDataForAI,
        watchlistActivity,
        count: 10,
        messageId: `manual-refresh-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      });

      // FIXED: Ensure all recommendations have moodMatchScore
      const completeRecommendations = ensureCompleteRecommendations(result.recommendations || []);

      setForYouCategories((prev: ForYouCategory[]) => prev.map((c: ForYouCategory) => 
        c.id === "generalPersonalized" 
          ? { 
              ...c, 
              recommendations: completeRecommendations, 
              isLoading: false, 
              error: result.error,
              lastFetched: Date.now()
            }
          : c
      ));

      if (result.error && result.error !== "OpenAI API key not configured.") {
        toast.error(`Refresh failed: ${result.error.substring(0, 60)}`);
      } else if (completeRecommendations.length > 0) {
        toast.success(`Updated with ${completeRecommendations.length} fresh recommendations!`);
      } else {
        toast.info('Refresh completed, but no new recommendations found');
      }
    } catch (error: any) {
      console.error('[MainApp] Manual refresh error:', error);
      setForYouCategories((prev: ForYouCategory[]) => prev.map((c: ForYouCategory) => 
        c.id === "generalPersonalized" 
          ? { ...c, isLoading: false, error: error.message || "Refresh failed" }
          : c
      ));
      toast.error('Failed to refresh recommendations');
    } finally {
      fetchInProgressRef.current = false;
    }
  }, [forYouCategories, userProfile, watchlistActivity, getPersonalizedRecommendationsAction]);

  // --------------------------------------------------------------------------
  // SUBSECTION 4.6: CUSTOM LIST FUNCTIONS
  // --------------------------------------------------------------------------

  const handleCreateCustomList = async (name: string, description?: string, isPublic?: boolean) => { 
    try { 
      await createCustomListMutation({
        listName: name, 
        description, 
        isPublic: isPublic || false
      }); 
      toast.success(`List "${name}" created!`); 
      setIsCreateListModalOpen(false); 
    } catch (error: any) { 
      toast.error(error.data?.message || "Failed to create list."); 
    }
  };

  // --------------------------------------------------------------------------
  // SUBSECTION 4.7: EFFECTS
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (currentView !== "dashboard") return;

    const fetchLists = async () => {
      try {
        if (trendingAnime.length === 0) {
          const res = await fetchTrendingAnimeAction({ limit: 10 });
          setTrendingAnime(res.animes || []);
        }
        if (topAnime.length === 0) {
          const res = await fetchTopRatedAnimeAction({ limit: 10 });
          setTopAnime(res.animes || []);
        }
        if (popularAnime.length === 0) {
          const res = await fetchPopularAnimeAction({ limit: 10 });
          setPopularAnime(res.animes || []);
        }
        if (bingeableAnime.length === 0) {
          const res = await fetchBingeableAnimeAction({ limit: 10 });
          setBingeableAnime(res.animes || []);
        }
        if (retroClassicAnime.length === 0) {
          const res = await fetchRetroClassicAnimeAction({ limit: 10 });
          setRetroClassicAnime(res.animes || []);
        }
        if (horrorAnime.length === 0) {
          const res = await fetchHorrorAnimeAction({ limit: 10 });
          setHorrorAnime(res.animes || []);
        }
        if (trueCrimeAnime.length === 0) {
          const res = await fetchTrueCrimeAnimeAction({ limit: 10 });
          setTrueCrimeAnime(res.animes || []);
        }
      } catch (e) {
        console.error("[MainApp] Failed fetching anime lists", e);
      }
    };

    fetchLists();
  }, [currentView, trendingAnime.length, topAnime.length, popularAnime.length, bingeableAnime.length, retroClassicAnime.length, horrorAnime.length, trueCrimeAnime.length, fetchTrendingAnimeAction, fetchTopRatedAnimeAction, fetchPopularAnimeAction, fetchBingeableAnimeAction, fetchRetroClassicAnimeAction, fetchHorrorAnimeAction, fetchTrueCrimeAnimeAction]);


  // Enhanced useEffect with better duplicate prevention
  useEffect(() => {
  if (debouncedFetchRef.current) {
    clearTimeout(debouncedFetchRef.current);
  }

  debouncedFetchRef.current = setTimeout(() => {
    // Only proceed if user has completed onboarding and we're on dashboard
    if (!userProfile || !userProfile.onboardingCompleted || currentView !== "dashboard") {
      return;
    }

    const existingCategory = forYouCategories.find(cat => cat.id === "generalPersonalized");
    
    // Check if we need to fetch (more strict conditions)
    const shouldFetch = (() => {
      // Never fetched before
      if (!hasFetchedForYou) {
        console.log('[MainApp] Initial fetch needed - never fetched before');
        return true;
      }
      
      // No existing category data
      if (!existingCategory) {
        console.log('[MainApp] Initial fetch needed - no existing category');
        return true;
      }
      
      // Check if data is stale (12 hours)
      if (existingCategory.lastFetched && needsRefresh(existingCategory)) {
        console.log(`[MainApp] Data is stale - last fetched: ${new Date(existingCategory.lastFetched).toLocaleString()}`);
        return true;
      }
      
      // If we have recent data, don't fetch
      if (existingCategory.lastFetched) {
        const hoursSinceLastFetch = (Date.now() - existingCategory.lastFetched) / (1000 * 60 * 60);
        console.log(`[MainApp] Data is fresh - fetched ${hoursSinceLastFetch.toFixed(1)} hours ago`);
        return false;
      }
      
      return false;
    })();
    
    const isCurrentlyLoading = existingCategory?.isLoading;
    const hasRecentData = existingCategory?.lastFetched && 
      (Date.now() - existingCategory.lastFetched) < 5 * 60 * 1000; // 5 minutes buffer
    
    // Exit early if we shouldn't fetch
    if (!shouldFetch || isCurrentlyLoading || fetchInProgressRef.current || hasRecentData) {
      if (!shouldFetch) {
        console.log('[MainApp] Skipping fetch - data is still fresh');
      }
      if (isCurrentlyLoading) {
        console.log('[MainApp] Skipping fetch - already loading');
      }
      if (fetchInProgressRef.current) {
        console.log('[MainApp] Skipping fetch - fetch in progress');
      }
      if (hasRecentData) {
        console.log('[MainApp] Skipping fetch - very recent data exists');
      }
      return;
    }

    const fetchCategoryData = async (categoryToUpdate: ForYouCategory) => {
      if (fetchInProgressRef.current) {
        console.log('[MainApp] Fetch already in progress, skipping...');
        return;
      }

      if (!userProfile || !categoryToUpdate.fetchFn) {
        setForYouCategories((prev: ForYouCategory[]) => prev.map((c: ForYouCategory) => 
          c.id === categoryToUpdate.id ? {
            ...c, 
            isLoading: false, 
            error: "User profile not ready or fetch function missing."
          } : c
        ));
        return;
      }

      fetchInProgressRef.current = true;
      
      setForYouCategories((prev: ForYouCategory[]) => prev.map((c: ForYouCategory) => 
        c.id === categoryToUpdate.id ? { 
          ...c, 
          isLoading: true, 
          error: null 
        } : c
      ));

      try {
        const profileDataForAI = {
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
          narrativePacing: userProfile.narrativePacing,
        };

        console.log(`[MainApp] Starting fetch for personalized recommendations...`);
        
        const result = await categoryToUpdate.fetchFn({ 
          ...categoryToUpdate.fetchArgs, 
          userProfile: profileDataForAI 
        });

        console.log(`[MainApp] Fetch completed:`, {
          recommendations: result.recommendations?.length,
          error: result.error
        });

        const completeRecommendations = ensureCompleteRecommendations(result.recommendations || []);

        setForYouCategories((prev: ForYouCategory[]) => prev.map((c: ForYouCategory) => 
          c.id === categoryToUpdate.id ? { 
            ...c, 
            recommendations: completeRecommendations, 
            isLoading: false, 
            error: result.error,
            lastFetched: Date.now() // IMPORTANT: Set the timestamp
          } : c
        ));

        if (result.error && result.error !== "OpenAI API key not configured.") { 
          toast.error(`Personalized: ${result.error.substring(0,60)}`); 
        }
      } catch (e: any) {
        console.error('[MainApp] Fetch error:', e);
        setForYouCategories((prev: ForYouCategory[]) => prev.map((c: ForYouCategory) => 
          c.id === categoryToUpdate.id ? { 
            ...c, 
            isLoading: false, 
            error: e.message || "Unknown fetch error" 
          } : c
        ));
        toast.error(`Failed personalized fetch for "${categoryToUpdate.title}".`);
      } finally {
        fetchInProgressRef.current = false;
      }
    };

    console.log(`[MainApp] ${!hasFetchedForYou ? 'Initial fetch' : '12-hour refresh'} for personalized recommendations`);
    
    const personalizedCategorySetup: ForYouCategory = {
      id: "generalPersonalized", 
      title: "✨ Personalized For You", 
      recommendations: existingCategory?.recommendations || [], 
      isLoading: true, 
      error: null,
      lastFetched: existingCategory?.lastFetched,
      fetchFn: async (args: any): Promise<{ 
        recommendations: AnimeRecommendation[]; 
        error?: string | null; 
        details?: any 
      }> => {
        console.log(`[MainApp] Executing personalized fetch with args:`, {
          userProfile: !!args.userProfile,
          count: args.count,
          messageId: args.messageId
        });
        
        try {
          const result = await getPersonalizedRecommendationsAction({
            userProfile: args.userProfile,
            watchlistActivity,
            count: args.count || 10,
            messageId: args.messageId
          });
          
          console.log(`[MainApp] Personalized fetch completed:`, {
            count: result.recommendations?.length,
            error: result.error,
            hasDebugInfo: !!result.debug
          });
          
          const completeRecommendations = ensureCompleteRecommendations(result.recommendations || []);
          
          return {
            recommendations: completeRecommendations,
            error: result.error,
            details: result.debug
          };
        } catch (error: any) {
          console.error(`[MainApp] Personalized fetch error:`, error);
          return {
            recommendations: [],
            error: error.message || "Unknown error",
            details: { error: error.message }
          };
        }
      },
      fetchArgs: { 
        count: 10, 
        messageId: `foryou-optimized-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
      },
      reason: "Tailored based on your profile and activity • Refreshes every 12 hours"
    };

    if (!existingCategory) {
      setForYouCategories([personalizedCategorySetup]);
    }
    
    fetchCategoryData(personalizedCategorySetup);
    setHasFetchedForYou(true);
  }, 500);


  return () => {
    if (debouncedFetchRef.current) {
      clearTimeout(debouncedFetchRef.current);
    }
  };
}, [userProfile, currentView, hasFetchedForYou, getPersonalizedRecommendationsAction, fullWatchlist, watchlistActivity, forYouCategories, needsRefresh]);


  // Trigger refresh when profile preferences change
  useEffect(() => {
    if (currentView !== "dashboard") return;
    if (previousProfileRef.current && userProfile) {
      const prev = JSON.stringify(previousProfileRef.current);
      const curr = JSON.stringify(userProfile);
      if (prev !== curr) {
        console.log('[MainApp] Detected profile update, refreshing recommendations...');
        refreshPersonalizedRecommendations();
      }
    }
    if (userProfile) previousProfileRef.current = userProfile;
  }, [userProfile, currentView, refreshPersonalizedRecommendations]);


  // --------------------------------------------------------------------------
  // SUBSECTION 4.8: RENDER FUNCTIONS
  // --------------------------------------------------------------------------

  // Dashboard render function

  // Add this helper function to truncate titles intelligently
const truncateTitle = (title: string, maxLength: number = 25): string => {
  if (!title) return "Unknown";
  if (title.length <= maxLength) return title;
  
  // Smart truncation - try to break at word boundaries
  const truncated = title.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.6) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
};

  const renderDashboard = useCallback(() => (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* ARTISTIC BRUTALIST GRID OVERLAY */}
      <div className="fixed inset-0 pointer-events-none opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_49%,#fff_50%,#fff_51%,transparent_52%),linear-gradient(180deg,transparent_49%,#fff_50%,#fff_51%,transparent_52%)] bg-[length:20px_20px]"></div>
        {/* ARTISTIC NOISE TEXTURE */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent opacity-30"></div>
        </div>

      {/* ARTISTIC GEOMETRIC SHAPES */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-brand-primary-action to-red-600 transform rotate-45 -translate-x-16 -translate-y-16 opacity-80"></div>
        <div className="absolute top-20 right-0 w-24 h-48 bg-gradient-to-l from-white to-gray-200 transform -translate-y-12 translate-x-12 opacity-90"></div>
        <div className="absolute bottom-40 left-4 w-16 h-16 bg-gradient-to-tr from-brand-accent-gold to-yellow-400 opacity-85"></div>
        <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-tl from-brand-primary-action to-pink-500 transform rotate-12 translate-x-20 translate-y-20 opacity-75"></div>
        <div className="absolute top-1/3 left-1/4 w-8 h-64 bg-gradient-to-b from-white to-blue-200 transform rotate-12 opacity-60"></div>
        {/* ARTISTIC FLOATING ELEMENTS */}
        <div className="absolute top-1/2 right-1/3 w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full opacity-70 animate-pulse"></div>
        <div className="absolute bottom-1/3 left-1/3 w-20 h-20 bg-gradient-to-tr from-green-400 to-teal-400 transform rotate-45 opacity-60"></div>
      </div>

      {/* MAIN BRUTALIST CONTENT */}
      <div className="relative z-10 px-4 py-8 space-y-8">
        {/* ENHANCED BRUTALIST HERO SECTION */}
        <div className="space-y-6">
          {/* ARTISTIC TYPOGRAPHY BLOCK */}
          <div className="relative bg-white text-black p-6 border-4 border-black shadow-[8px_8px_0px_0px_#FF6B35] mb-8 overflow-hidden">
            {/* ARTISTIC BACKGROUND PATTERN */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-yellow-100/30 to-orange-100/20"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-brand-primary-action/10 to-transparent transform rotate-45"></div>
            
            <div className="relative z-10">
              <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-2">
                ANIME
            </h1>
              <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none text-transparent bg-gradient-to-r from-brand-primary-action to-red-600 bg-clip-text">
                MUSE
              </h1>
              <div className="mt-4 h-2 bg-gradient-to-r from-black via-brand-primary-action to-black"></div>
              <p className="text-lg font-bold uppercase mt-2 tracking-wide">
                {userProfile?.name || "USER"} / DASHBOARD
              </p>
            </div>
          </div>

          {/* ARTISTIC STATS GRID */}
          <div className="grid grid-cols-2 gap-4">
            <div className="relative bg-gradient-to-br from-brand-primary-action to-red-600 text-white p-4 border-4 border-black shadow-[4px_4px_0px_0px_#000] overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_40%,rgba(255,255,255,0.1)_50%,transparent_60%)]"></div>
              <div className="relative z-10">
                <div className="text-2xl font-black">{fullWatchlist?.length || 0}</div>
                <div className="text-sm font-bold uppercase">ANIME</div>
              </div>
            </div>
            <div className="relative bg-white text-black p-4 border-4 border-black shadow-[4px_4px_0px_0px_#FF6B35] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-gray-100/50 to-blue-100/30"></div>
              <div className="relative z-10">
                <div className="text-2xl font-black">AI</div>
                <div className="text-sm font-bold uppercase">READY</div>
              </div>
            </div>
          </div>
        </div>

        {/* ARTISTIC AI ASSISTANT CTA */}
        <div className="mt-8">
          <button
            onClick={navigateToAIAssistant}
            className="w-full relative bg-black text-white p-6 border-4 border-white shadow-[8px_8px_0px_0px_#B08968] active:shadow-[4px_4px_0px_0px_#B08968] active:translate-x-1 active:translate-y-1 transition-all duration-75 overflow-hidden group"
          >
            {/* ARTISTIC HOVER EFFECT */}
            <div className="absolute inset-0 bg-gradient-to-r from-brand-accent-gold/20 to-brand-primary-action/20 opacity-0 group-active:opacity-100 transition-opacity duration-150"></div>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
            
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-left">
                <div className="text-2xl font-black uppercase tracking-tight">
                  AI ASSISTANT
                </div>
                <div className="text-sm font-bold opacity-80 uppercase">
                  GET RECOMMENDATIONS
                </div>
              </div>
              <div className="text-4xl group-active:scale-110 transition-transform duration-75">🤖</div>
            </div>
          </button>
        </div>

        {/* ARTISTIC POPULAR ANIME CAROUSEL */}
        {loopedPopularAnime.length > 0 && (
          <div className="mt-8">
            <div className="relative bg-gradient-to-r from-brand-accent-gold to-yellow-500 text-black p-4 border-4 border-black shadow-[4px_4px_0px_0px_#000] mb-4 overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_40%,rgba(0,0,0,0.1)_50%,transparent_60%)]"></div>
              <h2 className="relative z-10 text-xl font-black uppercase tracking-tight">POPULAR NOW</h2>
            </div>
            
            {/* ENHANCED SWIPER CAROUSEL */}
            <div className="relative">
    <Swiper
  modules={[EffectCoverflow]}
  effect="coverflow"
  centeredSlides={true}
  slidesPerView="auto"
                spaceBetween={20}
  loop={true}
  grabCursor={true}
  speed={400}
  resistance={true}
  resistanceRatio={0.85}
  coverflowEffect={{ 
                  rotate: 20,
    stretch: 0,
                  depth: 100,
                  modifier: 1.5,
    slideShadows: false,
    scale: 0.9
  }}
                className="w-full"
  style={{
    overflow: 'visible',
                  padding: '20px 0',
    willChange: 'transform',
  }}
>
                {loopedPopularAnime.slice(0, 8).map((anime, index) => (
        <SwiperSlide
                    key={`artistic-${index}`}
                    className="w-[280px] sm:w-[320px]"
          style={{
                      height: 'auto',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            willChange: 'transform',
                    }}
                  >
                    <div
                      onClick={() => handleRecommendationClick(anime)}
                      className="relative bg-white border-4 border-black shadow-[8px_8px_0px_0px_#FF6B35] cursor-pointer active:shadow-[4px_4px_0px_0px_#FF6B35] active:translate-x-1 active:translate-y-1 transition-all duration-75 overflow-hidden group"
                    >
                      {/* ARTISTIC CARD EFFECTS */}
                      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-orange-100/20 to-red-100/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                      
                      {anime.posterUrl ? (
                        <div className="relative overflow-hidden">
                          <img
                            src={anime.posterUrl}
                            alt={anime.title}
                            className="w-full aspect-[3/4] object-cover border-b-4 border-black group-hover:scale-105 transition-transform duration-300"
                          />
                          {/* ARTISTIC OVERLAY */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                        </div>
                      ) : (
                        <div className="w-full aspect-[3/4] bg-gradient-to-br from-brand-primary-action to-red-600 border-b-4 border-black flex items-center justify-center">
                          <span className="text-6xl opacity-80">📺</span>
                        </div>
                      )}
                      
                      <div className="relative p-4 bg-gradient-to-t from-white to-gray-50">
                        <h3 className="font-black text-sm uppercase leading-tight truncate mb-1">
                          {anime.title}
                        </h3>
                        {anime.year && (
                          <div className="inline-block bg-black text-white px-2 py-1 text-xs font-bold uppercase">
                            {anime.year}
                          </div>
                        )}
                        {anime.genres && anime.genres.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {anime.genres.slice(0, 2).map((genre, i) => (
                              <span key={i} className="text-[10px] bg-gray-200 text-black px-2 py-1 font-bold uppercase rounded-none">
                                {genre}
                              </span>
                            ))}
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

        {/* ENHANCED ARTISTIC STUDIO SECTION */}
        <div className="mt-8">
          <div className="relative bg-gradient-to-r from-black to-gray-900 text-white p-4 border-4 border-white shadow-[4px_4px_0px_0px_#B08968] mb-4 overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_40%,rgba(255,255,255,0.05)_50%,transparent_60%)]"></div>
            <h2 className="relative z-10 text-xl font-black uppercase tracking-tight">LEGENDARY STUDIOS</h2>
        </div>

          <div className="grid grid-cols-1 gap-3">
            <button
                onClick={navigateToStudioGhibli}
              className="relative bg-gradient-to-r from-green-500 to-emerald-600 text-black p-4 border-4 border-black shadow-[4px_4px_0px_0px_#000] active:shadow-[2px_2px_0px_0px_#000] active:translate-x-1 active:translate-y-1 transition-all duration-75 overflow-hidden group"
            >
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_40%,rgba(255,255,255,0.2)_50%,transparent_60%)] opacity-0 group-active:opacity-100 transition-opacity duration-150"></div>
              <div className="relative z-10 flex items-center justify-between">
                <span className="font-black uppercase text-lg">STUDIO GHIBLI</span>
                <span className="text-2xl group-active:rotate-12 transition-transform duration-75">🌿</span>
                </div>
            </button>
              
            <button
                onClick={navigateToMadhouse}
              className="relative bg-gradient-to-r from-red-500 to-rose-600 text-white p-4 border-4 border-black shadow-[4px_4px_0px_0px_#000] active:shadow-[2px_2px_0px_0px_#000] active:translate-x-1 active:translate-y-1 transition-all duration-75 overflow-hidden group"
            >
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_40%,rgba(255,255,255,0.2)_50%,transparent_60%)] opacity-0 group-active:opacity-100 transition-opacity duration-150"></div>
              <div className="relative z-10 flex items-center justify-between">
                <span className="font-black uppercase text-lg">MADHOUSE</span>
                <span className="text-2xl group-active:rotate-12 transition-transform duration-75">🏠</span>
                </div>
            </button>
              
            <button
                onClick={navigateToMappa}
              className="relative bg-gradient-to-r from-purple-500 to-violet-600 text-white p-4 border-4 border-black shadow-[4px_4px_0px_0px_#000] active:shadow-[2px_2px_0px_0px_#000] active:translate-x-1 active:translate-y-1 transition-all duration-75 overflow-hidden group"
            >
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_40%,rgba(255,255,255,0.2)_50%,transparent_60%)] opacity-0 group-active:opacity-100 transition-opacity duration-150"></div>
              <div className="relative z-10 flex items-center justify-between">
                <span className="font-black uppercase text-lg">MAPPA</span>
                <span className="text-2xl group-active:rotate-12 transition-transform duration-75">⚡</span>
                </div>
            </button>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={navigateToBones}
                className="relative bg-gradient-to-r from-blue-500 to-cyan-600 text-white p-4 border-4 border-black shadow-[4px_4px_0px_0px_#000] active:shadow-[2px_2px_0px_0px_#000] active:translate-x-1 active:translate-y-1 transition-all duration-75 overflow-hidden group"
              >
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_40%,rgba(255,255,255,0.2)_50%,transparent_60%)] opacity-0 group-active:opacity-100 transition-opacity duration-150"></div>
                <div className="relative z-10 text-center">
                  <div className="font-black uppercase text-sm">BONES</div>
                  <div className="text-xl group-active:scale-110 transition-transform duration-75">🦴</div>
                </div>
              </button>
              
              <button
                onClick={navigateToKyotoAnimation}
                className="relative bg-gradient-to-r from-yellow-500 to-amber-600 text-black p-4 border-4 border-black shadow-[4px_4px_0px_0px_#000] active:shadow-[2px_2px_0px_0px_#000] active:translate-x-1 active:translate-y-1 transition-all duration-75 overflow-hidden group"
              >
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_40%,rgba(0,0,0,0.1)_50%,transparent_60%)] opacity-0 group-active:opacity-100 transition-opacity duration-150"></div>
                <div className="relative z-10 text-center">
                  <div className="font-black uppercase text-sm">KYOTO</div>
                  <div className="text-xl group-active:scale-110 transition-transform duration-75">🏛️</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* ARTISTIC PERSONALIZED RECOMMENDATIONS CAROUSEL */}
        {userProfile?.onboardingCompleted &&
          forYouCategories.filter(cat => cat.id === "generalPersonalized").map((category) => (
            <div key={category.id} className="mt-8">
              <div className="relative bg-gradient-to-r from-brand-primary-action to-red-600 text-white p-4 border-4 border-black shadow-[4px_4px_0px_0px_#000] mb-4 flex items-center justify-between overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_40%,rgba(255,255,255,0.1)_50%,transparent_60%)]"></div>
                <h2 className="relative z-10 text-xl font-black uppercase tracking-tight">FOR YOU</h2>
                <div className="relative z-10 flex items-center gap-2">
                  {/* ADMIN ACCESS BRUTALIST BUTTON - Only visible to admins */}
                  {isUserAdmin && (
                    <button
                      onClick={() => setCurrentView("admin_dashboard")}
                      className="bg-black text-white border-2 border-white px-3 py-1 font-black text-xs uppercase tracking-wider hover:bg-red-600 hover:border-black transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(255,255,255,0.3)]"
                      title="Admin Dashboard Access"
                    >
                      🔧 ADMIN
                    </button>
                  )}
                  <button
                    onClick={refreshPersonalizedRecommendations}
                    disabled={category.isLoading}
                    className="bg-white text-black px-3 py-1 border-2 border-black font-bold text-xs uppercase disabled:opacity-50 active:translate-x-0.5 active:translate-y-0.5 transition-transform duration-75"
                  >
                    {category.isLoading ? 'LOADING...' : 'REFRESH'}
                  </button>
                </div>
              </div>

              {category.isLoading ? (
                <div className="relative bg-white border-4 border-black p-8 text-center overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-100 to-white"></div>
                  <div className="relative z-10">
                    <div className="text-2xl font-black text-black animate-pulse">LOADING...</div>
                    <div className="mt-2 w-16 h-1 bg-brand-primary-action mx-auto animate-pulse"></div>
                  </div>
                  </div>
              ) : category.error ? (
                <div className="relative bg-gradient-to-r from-red-500 to-red-600 text-white border-4 border-black p-4 overflow-hidden">
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_40%,rgba(255,255,255,0.1)_50%,transparent_60%)]"></div>
                  <div className="relative z-10">
                    <div className="font-black uppercase">ERROR</div>
                    <div className="text-sm">{category.error}</div>
                </div>
                  </div>
              ) : category.recommendations.length > 0 ? (
                <div className="relative">
            <Swiper
              slidesPerView="auto"
                    spaceBetween={16}
              grabCursor={true}
              speed={300}
                    resistance={true}
                    resistanceRatio={0.85}
              freeMode={true}
              className="w-full"
              style={{
                overflow: 'visible',
                      padding: '0 0 20px 0',
                willChange: 'transform',
              }}
            >
                    {category.recommendations.slice(0, 8).map((rec, index) => (
                <SwiperSlide
                        key={`rec-${index}`}
                        className="w-[200px] sm:w-[220px]"
                  style={{
                          height: 'auto',
                        }}
                      >
                        <div
                          onClick={() => handleRecommendationClick(rec)}
                          className="relative bg-white border-4 border-black shadow-[4px_4px_0px_0px_#B08968] cursor-pointer active:shadow-[2px_2px_0px_0px_#B08968] active:translate-x-1 active:translate-y-1 transition-all duration-75 overflow-hidden group"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-gold-100/20 to-yellow-100/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                          
                          {rec.posterUrl ? (
                            <div className="relative overflow-hidden">
                              <img
                                src={rec.posterUrl}
                                alt={rec.title}
                                className="w-full aspect-[3/4] object-cover border-b-4 border-black group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            </div>
                          ) : (
                            <div className="w-full aspect-[3/4] bg-gradient-to-br from-brand-accent-gold to-yellow-500 border-b-4 border-black flex items-center justify-center">
                              <span className="text-5xl opacity-80">🎭</span>
          </div>
        )}

                          <div className="relative p-3 bg-gradient-to-t from-white to-gray-50">
                            <h3 className="font-black text-xs uppercase leading-tight truncate mb-2">
                              {rec.title}
                            </h3>
                            {rec.moodMatchScore && (
                              <div className="inline-block bg-gradient-to-r from-black to-gray-800 text-white px-2 py-1 text-[10px] font-bold uppercase">
                                {Math.round(rec.moodMatchScore)}/10
          </div>
        )}
            </div>
                        </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
              ) : (
                <div className="relative bg-gradient-to-r from-gray-300 to-gray-400 border-4 border-black p-8 text-center overflow-hidden">
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_40%,rgba(0,0,0,0.05)_50%,transparent_60%)]"></div>
                  <div className="relative z-10">
                    <div className="text-xl font-black text-black uppercase">NO RECOMMENDATIONS</div>
                    <div className="text-sm font-bold text-black mt-2">Complete onboarding first</div>
            </div>
          </div>
        )}
            </div>
          ))}

        {/* BOTTOM SPACER FOR MOBILE NAVIGATION */}
        <div className="h-24"></div>
      </div>
    </div>
  ), [
    userProfile,
    fullWatchlist,
    loopedPopularAnime,
    navigateToAIAssistant,
    handleAnimeCardClick,
    navigateToStudioGhibli,
    navigateToMadhouse,
    navigateToMappa,
    navigateToBones,
    navigateToKyotoAnimation,
    forYouCategories,
    refreshPersonalizedRecommendations
  ]);

  
  // --------------------------------------------------------------------------
  // SUBSECTION 4.9: MODAL COMPONENTS
  // --------------------------------------------------------------------------

  const CreateCustomListModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    onCreate: (name: string, description?: string, isPublic?: boolean) => Promise<void>; 
  }> = ({ isOpen, onClose, onCreate }) => {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isPublic, setIsPublic] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
      if (isOpen) {
        setName("");
        setDescription("");
        setIsPublic(false);
        setIsCreating(false);
      }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) {
        toast.error("List name required.");
        return;
      }
      setIsCreating(true);
      await onCreate(name, description, isPublic);
    };

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
        <form onSubmit={handleSubmit} className="bg-brand-surface text-white p-5 sm:p-6 rounded-xl shadow-2xl w-full max-w-md sm:max-w-lg md:max-w-xl space-y-4">
          <h3 className="text-xl font-heading text-brand-primary-action mb-2">Create New List</h3>
          <div>
            <label htmlFor="newListName" className="block text-sm font-medium text-white mb-1">Name*</label>
            <input 
              type="text" 
              id="newListName" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="form-input w-full" 
              required
            />
          </div>
          <div>
            <label htmlFor="newListDesc" className="block text-sm font-medium text-white mb-1">Description</label>
            <textarea 
              id="newListDesc" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              className="form-input w-full" 
              rows={3}
            />
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="newListPublic" 
              checked={isPublic} 
              onChange={e => setIsPublic(e.target.checked)} 
              className="form-checkbox accent-brand-primary-action h-4 w-4 rounded text-brand-primary-action focus:ring-brand-primary-action focus:ring-offset-brand-surface"
            />
            <label htmlFor="newListPublic" className="text-sm text-white">Make this list public</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <StyledButton type="button" onClick={onClose} variant="secondary_small" disabled={isCreating}>
              Cancel
            </StyledButton>
            <StyledButton type="submit" variant="primary_small" disabled={isCreating}>
              {isCreating ? "Creating..." : "Create List"}
            </StyledButton>
          </div>
        </form>
      </div>
    );
  };

  // --------------------------------------------------------------------------
  // SUBSECTION 4.10: OTHER RENDER FUNCTIONS
  // --------------------------------------------------------------------------

  const renderCustomListsOverview = useCallback(() => {
    return (
      <div className="bg-brand-surface text-white rounded-xl shadow-xl p-4 sm:p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl sm:text-2xl font-heading text-brand-primary-action">My Custom Lists</h2>
          <StyledButton onClick={() => setIsCreateListModalOpen(true)} variant="primary">
            Create New List
          </StyledButton>
        </div>
        
        {myCustomLists === undefined && <LoadingSpinner message="Loading lists..." className="text-white" />}
        
        {myCustomLists && myCustomLists.length === 0 && (
          <p className="text-white text-center py-5">No custom lists yet. Create one to get started!</p>
        )}
        
        {myCustomLists && myCustomLists.length > 0 && (
          <div className="space-y-3 sm:space-y-4">
            {/* FIXED: Add explicit type annotation for 'list' parameter */}
            {myCustomLists.map((list: CustomListType) => (
              <div key={list._id} className="p-3 sm:p-4 bg-brand-accent-peach/20 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:shadow-md transition-shadow">
                <div className="flex-grow min-w-0">
                  <h3 className="text-lg font-heading text-brand-primary-action cursor-pointer hover:underline" onClick={() => navigateToCustomListDetail(list._id)}>
                    {list.listName}
                  </h3>
                  <p className="text-xs text-white truncate" title={list.description}>
                    {list.description || "No description"}
                  </p>
                  <p className="text-xs text-white/70 mt-0.5">
                    {list.animeIds.length} items • {list.isPublic ? "Public" : "Private"}
                  </p>
                </div>
                <StyledButton onClick={() => navigateToCustomListDetail(list._id)} variant="secondary_small" className="mt-2 sm:mt-0 flex-shrink-0">
                  View/Edit
                </StyledButton>
              </div>
            ))}
          </div>
        )}
        
        <CreateCustomListModal 
          isOpen={isCreateListModalOpen} 
          onClose={() => setIsCreateListModalOpen(false)} 
          onCreate={handleCreateCustomList} 
        />
      </div>
    );
  }, [myCustomLists, navigateToCustomListDetail, isCreateListModalOpen, handleCreateCustomList]);

  const CustomListDetailView: React.FC<{
    listId: Id<"customLists">, 
    onBackToLists: () => void, 
    onViewAnime: (animeId: Id<"anime">) => void
  }> = ({ listId, onBackToLists, onViewAnime }) => {
    const listDetails = useQuery(api.users.getCustomListById, { listId });
    
    if (listDetails === undefined) return <LoadingSpinner message="Loading list details..." className="text-white" />;
    
    if (listDetails === null) return (
      <div className="bg-brand-surface text-white rounded-xl shadow-xl p-6 text-center">
        <p className="mb-4">List not found or private.</p>
        <StyledButton onClick={onBackToLists} variant="primary">Back to Lists</StyledButton>
      </div>
    );
    
    return (
      <div className="bg-brand-surface text-white rounded-xl shadow-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-2">
          <h2 className="text-xl sm:text-2xl font-heading text-brand-primary-action">{listDetails.listName}</h2>
        </div>
        <p className="text-sm text-white mb-1">{listDetails.description || "No description"}</p>
        <p className="text-xs text-white/70 mb-6">
          {listDetails.isPublic ? "Public List" : "Private List"} • {listDetails.anime.length} items
        </p>
        {listDetails.anime.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-5 sm:gap-x-4 sm:gap-y-6">
            {/* FIXED: Add explicit type annotation for 'animeDoc' parameter */}
            {listDetails.anime.map((animeDoc: Doc<"anime">) => (
              <div key={animeDoc._id} className="flex flex-col items-center">
                <AnimeCard anime={animeDoc} onViewDetails={onViewAnime} className="w-full" />
                <h4
                  className="mt-1.5 text-xs text-center text-white w-full truncate px-1"
                  title={animeDoc.title}
                >
                  {animeDoc.title}
                </h4>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-white text-center py-8">This list is empty. Add some anime!</p>
        )}
      </div>
    );
  };

  // --------------------------------------------------------------------------
  // SUBSECTION 4.11: MAIN CONTENT RENDERER
  // --------------------------------------------------------------------------

  const renderContent = useCallback(() => {
    const previousViewForBack = historyStack.length > 1 ? historyStack[historyStack.length - 2] : "dashboard";
    
    switch (currentView) {
      case "ai_assistant": 
        return <EnhancedAIAssistantPage navigateToDetail={navigateToDetail} />;
      
      case "anime_detail": 
        return selectedAnimeId ? (
          <AnimeDetailPage 
            animeId={selectedAnimeId} 
            onBack={navigateBack} 
            navigateToDetail={navigateToDetail}
            onCharacterClick={navigateToCharacterDetail} // NEW: Pass character click handler
          />
        ) : <LoadingSpinner className="text-white" />;

      // NEW: CHARACTER DETAIL CASE
      case "character_detail":
        return selectedCharacterData ? (
          <CharacterDetailPage
            character={selectedCharacterData}
            animeName={selectedAnimeNameForCharacter}
            onBack={navigateBack}
          />
        ) : <LoadingSpinner className="text-white" />;

      // NEW: STUDIO GHIBLI CASE
      case "studio_ghibli":
        return (
          <StudioGhibliPage 
            onViewAnimeDetail={navigateToDetail}
            onBack={navigateBack}
          />
        );

      // NEW: MADHOUSE CASE
      case "madhouse":
        return (
          <MadhousePage 
            onViewAnimeDetail={navigateToDetail}
            onBack={navigateBack}
          />
        );

      // NEW: MAPPA CASE
      case "mappa":
        return (
          <MappaPage 
            onViewAnimeDetail={navigateToDetail}
            onBack={navigateBack}
          />
        );

      // NEW: BONES CASE
      case "bones":
        return (
          <BonesPage 
            onViewAnimeDetail={navigateToDetail}
            onBack={navigateBack}
          />
        );

      // NEW: KYOTO ANIMATION CASE
      case "kyoto_animation":
        return (
          <KyotoAnimationPage 
            onViewAnimeDetail={navigateToDetail}
            onBack={navigateBack}
          />
        );
      
      case "my_list": 
        return (
          <WatchlistPage 
            onViewDetails={navigateToDetail} 
            onBack={() => navigateTo(previousViewForBack, { replace: true })} 
            onNavigateToCustomLists={navigateToCustomListsOverview} 
          />
        );
      
      case "browse": 
        return (
          <DiscoverPage 
            onViewDetails={navigateToDetail} 
            onBack={() => navigateTo(previousViewForBack, { replace: true })} 
          />
        );
      
      case "admin_dashboard": 
        return <AdminDashboardPage onNavigateBack={navigateToDashboard} />;
      
      case "profile_settings": 
        return <ProfileSettingsPage onBack={() => navigateTo(previousViewForBack, { replace: true })} />;
      
      case "custom_lists_overview": 
        return renderCustomListsOverview();
      
      case "custom_list_detail": 
        return selectedCustomListId ? (
          <CustomListDetailView 
            listId={selectedCustomListId} 
            onBackToLists={() => navigateTo("my_list")} 
            onViewAnime={navigateToDetail}
          />
        ) : <LoadingSpinner className="text-white" />;
      
      case "moodboard_page": 
        return (
          <MoodboardPage 
            navigateToDetail={navigateToDetail}
            selectedMoodCues={moodboardState.selectedMoodCues}
            onMoodCuesChange={handleMoodCuesChange}
            moodBoardRecommendations={moodboardState.recommendations}
            onRecommendationsChange={handleMoodboardRecommendationsChange}
            isLoadingMoodBoard={moodboardState.isLoading}
            onLoadingChange={handleMoodboardLoadingChange}
          />
        );
      
      case "dashboard":
      default: 
        return renderDashboard();
    }
  }, [
    currentView, 
    selectedAnimeId, 
    selectedCustomListId, 
    selectedCharacterData, // NEW: Add character data
    selectedAnimeNameForCharacter, // NEW: Add anime name for character
    navigateBack, 
    navigateToDetail, 
    navigateToCharacterDetail, // NEW: Add character navigation
    navigateToDashboard, 
    renderDashboard, 
    renderCustomListsOverview, 
    navigateToCustomListsOverview, 
    historyStack,
    moodboardState,
    handleMoodCuesChange,
    handleMoodboardRecommendationsChange,
    handleMoodboardLoadingChange
  ]);

  // --------------------------------------------------------------------------
  // SUBSECTION 4.12: FINAL RENDER
  // --------------------------------------------------------------------------

  return (
    <>
      <div className="w-full pb-20">
        <AnimatePresence mode="sync" onExitComplete={handleTransitionEnd}>
          <PageTransition key={currentView} className="pt-0">
            {renderContent()}
          </PageTransition>
        </AnimatePresence>
        <div className="md:hidden">
          <BottomNavigationBar currentView={currentView} onTabChange={handleTabChange} />
        </div>
      </div>
    </>
  );
}