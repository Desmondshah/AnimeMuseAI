// src/components/animuse/MainApp.tsx - Fixed and Organized Version

import React, { useState, useEffect, useCallback, memo, useRef } from "react";
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
import SideNavigationBar from "./SideNavigationBar";
import MoodboardPage from "./onboarding/MoodboardPage";
import CharacterDetailPage from "./onboarding/CharacterDetailPage";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "./shared/PageTransition";
import Carousel from "./shared/Carousel";
import { useMobileOptimizations } from "../../../convex/useMobileOptimizations";

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
  | "character_detail"; // NEW: Add character detail view

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
      } catch (e) {
        console.error("[MainApp] Failed fetching anime lists", e);
      }
    };

    fetchLists();
  }, [currentView, trendingAnime.length, topAnime.length, popularAnime.length, fetchTrendingAnimeAction, fetchTopRatedAnimeAction, fetchPopularAnimeAction]);


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
    <div className="relative min-h-screen">
      {/* Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-10 left-10 w-80 h-80 bg-gradient-to-br from-brand-primary-action/15 to-transparent rounded-full blur-3xl"
          animate={{ rotate: shouldReduceAnimations ? 0 : 360 }}
          transition={{ duration: shouldReduceAnimations ? 0 : 30, repeat: shouldReduceAnimations ? 0 : Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute bottom-20 right-16 w-96 h-96 bg-gradient-to-tr from-brand-accent-gold/12 to-transparent rounded-full blur-3xl"
          animate={{ rotate: shouldReduceAnimations ? 0 : -360 }}
          transition={{ duration: shouldReduceAnimations ? 0 : 45, repeat: shouldReduceAnimations ? 0 : Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute top-1/3 right-1/5 w-64 h-64 bg-gradient-to-l from-brand-accent-peach/10 to-transparent rounded-full blur-3xl"
          animate={{ rotate: shouldReduceAnimations ? 0 : 360 }}
          transition={{ duration: shouldReduceAnimations ? 0 : 35, repeat: shouldReduceAnimations ? 0 : Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute bottom-1/2 left-1/4 w-72 h-72 bg-gradient-to-r from-purple-500/8 to-transparent rounded-full blur-3xl"
          animate={{ rotate: shouldReduceAnimations ? 0 : -360 }}
          transition={{ duration: shouldReduceAnimations ? 0 : 40, repeat: shouldReduceAnimations ? 0 : Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute top-20 right-1/3 w-56 h-56 bg-gradient-to-bl from-cyan-400/8 to-transparent rounded-full blur-3xl"
          animate={{ rotate: shouldReduceAnimations ? 0 : 360 }}
          transition={{ duration: shouldReduceAnimations ? 0 : 50, repeat: shouldReduceAnimations ? 0 : Infinity, ease: "linear" }}
        />
        </div>

      {/* Main Content */}
      <div className="relative z-10 px-4 sm:px-6 py-8 space-y-12 md:max-w-5xl lg:max-w-6xl mx-auto">
        {/* Hero Welcome Section */}
         <motion.div
          className="text-center space-y-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceAnimations ? 0 : 0.8 }}
        >
          <motion.div
            className="inline-block group"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: shouldReduceAnimations ? 0 : 0.6 }}
          >
            <h1 className="hero-title font-heading font-bold bg-gradient-to-r from-white via-brand-accent-gold via-brand-primary-action to-white bg-clip-text text-transparent animate-pulse">
              Welcome, {userProfile?.name || "Explorer"}!
            </h1>
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-brand-primary-action via-brand-accent-gold to-transparent mt-4 animate-pulse group-hover:animate-none group-hover:opacity-100 opacity-80 transition-opacity duration-500"></div>
           
           </motion.div>
          <motion.p
            className="mobile-optimized-text text-white/80 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduceAnimations ? 0 : 0.8, delay: shouldReduceAnimations ? 0 : 0.3 }}
          >
            Your personalized anime universe awaits. Let's discover something extraordinary together.
         </motion.p>
        </motion.div>

        {popularAnime.length > 0 && (
  <div className="mb-6">
    <Carousel
      autoPlay
      autoPlayInterval={5000}
      className="px-2"
      enableInfiniteLoop={true}        // NEW: Enable infinite looping
      showPartialPreviews={true}       // NEW: Show partial previews of adjacent items
      onItemClick={(originalIndex) => {
        // Handle click on the original anime (not cloned ones)
        if (popularAnime[originalIndex]) {
          handleRecommendationClick(popularAnime[originalIndex]);
        }
      }}
    >
      {popularAnime.map((a, i) => (
        <div
          key={`featured-${i}`}
          className="w-full" // Removed fixed width - let the carousel handle sizing
        >
          <AnimeCard
            anime={a}
            isRecommendation
            onViewDetails={handleAnimeCardClick}
            className="w-full"
          />
        </div>
      ))}
    </Carousel>
  </div>
)}

        {/* AI Assistant CTA */}
        <div className="flex justify-center">
          <motion.div
            className="relative group"
            whileHover={shouldReduceAnimations ? undefined : { scale: 1.05, rotate: 2 }}
            transition={{ type: shouldReduceAnimations ? 'tween' : 'spring', stiffness: 300 }}
          >
            <div className="absolute -inset-2 bg-gradient-to-r from-brand-primary-action/50 to-brand-accent-gold/50 rounded-3xl blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <div className="relative bg-black/40 backdrop-blur-sm border border-white/20 rounded-3xl p-1 group-hover:border-white/40 transition-all duration-300">
              <StyledButton
                onClick={navigateToAIAssistant}
                variant="primary" 
                className="!text-lg sm:!text-xl !px-8 sm:!px-12 !py-4 sm:!py-6 !bg-gradient-to-r !from-brand-primary-action !to-brand-accent-gold hover:!from-brand-accent-gold hover:!to-brand-primary-action !transition-all !duration-500 !shadow-2xl hover:!shadow-brand-primary-action/25 !border-0"
              >
                <span className="flex items-center gap-3">
                  <span className="text-2xl animate-bounce">🤖</span>
                  <span className="font-heading">Talk to AniMuse AI</span>
                  <span className="text-lg opacity-80">✨</span>
                </span>
              </StyledButton>
            </div>
          </motion.div>
        </div>

        {/* Enhanced Personalized Recommendations Section */}
        {userProfile?.onboardingCompleted &&
          forYouCategories.filter(cat => cat.id === "generalPersonalized").map((category) => (
            <div key={category.id} className="space-y-8">
              {/* Enhanced Section Header with Refresh Button */}
              <div className="text-center space-y-4">
                <div className="inline-block">
                  <div className="flex items-center justify-center gap-4 mb-2">
                    <h2 className="section-title font-heading text-white font-bold whitespace-nowrap">
                      {category.title}
                    </h2>
                    {/* Refresh Button */}
                    <button
                      onClick={refreshPersonalizedRecommendations}
                      disabled={category.isLoading}
                      className="group flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full border border-white/20 hover:border-white/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={`Last updated: ${category.lastFetched ? new Date(category.lastFetched).toLocaleTimeString() : 'Never'}`}
                    >
                      <span className={`text-sm transition-transform duration-300 ${category.isLoading ? 'animate-spin' : 'group-hover:rotate-180'}`}>
                        🔄
                      </span>
                      <span className="text-xs text-white/80 font-medium">
                        {category.isLoading ? 'Updating...' : 'Refresh'}
                      </span>
                    </button>
                  </div>
                  <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-white/50 to-transparent animate-pulse"></div>
                </div>
                {category.reason && (
                  <div className="inline-flex items-center space-x-2 bg-black/30 backdrop-blur-sm rounded-full px-6 py-3 border border-white/10">
                    <span className="text-white/70 text-sm italic">{category.reason}</span>
                  </div>
                )}
              </div>

              {/* Loading State */}
              {category.isLoading && (
                <div className="flex justify-center py-16">
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-transparent border-t-brand-primary-action border-r-brand-accent-gold rounded-full animate-spin"></div>
                    <div className="absolute top-2 left-2 w-16 h-16 border-4 border-transparent border-b-brand-accent-peach border-l-white/50 rounded-full animate-spin animate-reverse"></div>
                    <div className="absolute top-6 left-6 w-8 h-8 bg-gradient-to-r from-brand-primary-action to-brand-accent-gold rounded-full animate-pulse"></div>
                  </div>
                  <div className="ml-6 flex flex-col justify-center">
                    <p className="text-xl text-white font-medium animate-pulse">Personalizing...</p>
                    <p className="text-sm text-white/60">Crafting your perfect recommendations</p>
                  </div>
                </div>
              )}

              {/* Error State */}
              {category.error && (
                <div className="text-center">
                  <div className="bg-red-900/20 backdrop-blur-sm border border-red-500/30 rounded-3xl p-8 max-w-md sm:max-w-lg md:max-w-xl mx-auto">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h3 className="text-xl font-heading text-red-400 mb-2">Oops!</h3>
                    <p className="text-red-300 text-sm mb-4">{category.error}</p>
                    <StyledButton 
                      onClick={refreshPersonalizedRecommendations}
                      variant="secondary"
                      className="!bg-red-500/20 !border-red-400 !text-red-300 hover:!bg-red-500/30"
                    >
                      Try Again
                    </StyledButton>
                  </div>
                </div>
              )}

              {/* Enhanced Recommendations Grid */}
              {!category.isLoading && !category.error && category.recommendations.length > 0 && (
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-brand-primary-action/20 via-transparent to-brand-accent-gold/20 rounded-3xl blur-xl"></div>
                  
                  <div className="relative bg-black/20 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-8">
                    <Carousel
                      variant="shuffle"
                      onItemClick={(i) =>
                        handleRecommendationClick(
                          category.recommendations[i]
                        )
                      }
                    >
  {category.recommendations.map((rec, index) => (
    <motion.div
      key={`${category.id}-${index}-${rec.title}`}
      className="group flex-shrink-0 w-32 xs:w-36 sm:w-40 transform cursor-pointer"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.1, rotate: 1 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className="absolute -inset-3 bg-gradient-to-r from-brand-primary-action/30 to-brand-accent-gold/30 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <div className="relative bg-black/30 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10 group-hover:border-white/30 transition-all duration-300">
        <div className="relative">
          <AnimeCard 
            anime={rec} 
            isRecommendation={true} 
            onViewDetails={handleAnimeCardClick}
            className="w-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="bg-black/70 backdrop-blur-sm rounded-full p-3 border border-white/30">
              <span className="text-white text-xl">👀</span>
            </div>
          </div>
        </div>
        
        <div className="p-3 bg-gradient-to-t from-black/80 to-transparent">
          <h4 
  className="text-sm font-medium text-white text-center title-truncate-1 group-hover:text-brand-accent-gold transition-colors duration-300"
  title={rec.title}
>
  {truncateTitle(rec.title, 25)}
</h4>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 mt-1">
            <p className="text-xs text-white/60 text-center">Click to explore</p>
            {rec.genres && rec.genres.length > 0 && (
              <p className="text-xs text-brand-accent-gold text-center truncate mt-0.5" title={rec.genres.join(", ")}>
                {rec.genres.slice(0, 2).join(", ")}
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  ))}
</Carousel>
                    
                    <div className="mt-4 text-center">
                      <span className="text-xs text-white/50 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1">
                        {category.recommendations.length} personalized recommendations
                        {category.lastFetched && (
                          <span className="ml-2 opacity-70">
                            • Updated {new Date(category.lastFetched).toLocaleTimeString()}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!category.isLoading && !category.error && category.recommendations.length === 0 && (
                <div className="text-center py-16">
                  <div className="bg-black/30 backdrop-blur-sm rounded-3xl p-12 border border-white/10 max-w-md sm:max-w-lg md:max-w-xl mx-auto">
                    <div className="text-8xl mb-6 animate-bounce">🎯</div>
                    <h3 className="text-2xl font-heading text-white mb-4">Getting Ready...</h3>
                    <p className="text-white/80 text-base leading-relaxed mb-6">
                      We're personalizing your feed! Check back soon or start exploring.
                    </p>
                    <div className="space-y-3">
                      <p className="text-sm text-white/60">Meanwhile, you can:</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        <StyledButton 
                          onClick={navigateToAIAssistant} 
                          variant="ghost"
                          className="!text-xs !bg-white/10 !backdrop-blur-sm !border-white/20 hover:!bg-white/20 !text-white"
                        >
                          🤖 Chat with AI
                        </StyledButton>
                        <StyledButton 
                          onClick={navigateToBrowse} 
                          variant="ghost"
                          className="!text-xs !bg-white/10 !backdrop-blur-sm !border-white/20 hover:!bg-white/20 !text-white"
                        >
                          🔍 Browse Anime
                        </StyledButton>
                        <StyledButton 
                          onClick={refreshPersonalizedRecommendations} 
                          variant="ghost"
                          className="!text-xs !bg-white/10 !backdrop-blur-sm !border-white/20 hover:!bg-white/20 !text-white"
                        >
                          🔄 Refresh Recommendations
                        </StyledButton>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        }

        {trendingAnime.length > 0 && (
          <div className="space-y-4">
            <div className="text-left">
              <h2 className="section-title font-heading text-white font-bold">🔥 Trending Now</h2>
              <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            </div>
            <Carousel>
              {trendingAnime.map((a, i) => (
                <div key={`trend-${i}`} className="w-32 xs:w-36 sm:w-40">
                  <AnimeCard anime={a} isRecommendation onViewDetails={handleAnimeCardClick} className="w-full" />
                </div>
              ))}
            </Carousel>
          </div>
        )}

        {topAnime.length > 0 && (
          <div className="space-y-4">
            <div className="text-left">
              <h2 className="section-title font-heading text-white font-bold">🏆 Top Ranked</h2>
              <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            </div>
            <Carousel>
              {topAnime.map((a, i) => (
                <div key={`top-${i}`} className="w-32 xs:w-36 sm:w-40">
                  <AnimeCard anime={a} isRecommendation onViewDetails={handleAnimeCardClick} className="w-full" />
                </div>
              ))}
            </Carousel>
          </div>
        )}

        {/* Admin Section */}
        {isUserAdmin && (
          <div className="text-center">
            <div className="relative inline-block group">
              <div className="absolute -inset-4 bg-gradient-to-r from-brand-accent-gold/40 to-brand-primary-action/40 rounded-3xl blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="relative bg-black/40 backdrop-blur-sm border border-brand-accent-gold/30 rounded-3xl p-6 group-hover:border-brand-accent-gold/60 transition-all duration-300">
                <div className="flex items-center justify-center space-x-3 mb-4">
                  <span className="text-3xl animate-pulse">🛡️</span>
                  <h3 className="text-xl font-heading text-brand-accent-gold">Admin Access</h3>
                  <span className="text-3xl animate-pulse">⚡</span>
                </div>
                <p className="text-white/70 text-sm mb-4">Manage users, anime database, and system settings</p>
                <StyledButton 
                  onClick={navigateToAdminDashboard} 
                  variant="secondary" 
                  className="!border-brand-accent-gold !text-brand-accent-gold hover:!bg-brand-accent-gold hover:!text-brand-surface !transition-all !duration-300 !shadow-lg hover:!shadow-brand-accent-gold/25"
                >
                  🚀 Enter Admin Dashboard
                </StyledButton>
              </div>
            </div>
          </div>
        )}

        <div className="h-24"></div>
      </div>
    </div>
  ), [userProfile, forYouCategories, isUserAdmin, navigateToAIAssistant, handleRecommendationClick, navigateToAdminDashboard, navigateToBrowse, refreshPersonalizedRecommendations]);

  
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
      <SideNavigationBar currentView={currentView} onTabChange={handleTabChange} />
      <div className="w-full md:pl-20 pb-20">
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