// src/components/animuse/MainApp.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id, Doc } from "../../../convex/_generated/dataModel";
import AIAssistantPage from "./AIAssistantPage";
import AnimeDetailPage from "./AnimeDetailPage";
import StyledButton from "./shared/StyledButton";
import WatchlistPage from "./onboarding/WatchlistPage";
import DiscoverPage from "./onboarding/DiscoverPage";
import ProfileStats from "./onboarding/ProfileStats";
import { AnimeRecommendation } from "./AIAssistantPage"; 
import { toast } from "sonner";
import AnimeCard from "./AnimeCard";
import AdminDashboardPage from "../admin/AdminDashboardPage"; 
// PHASE 1: Import ProfileSettingsPage
import ProfileSettingsPage from "./onboarding/ProfileSettingsPage";


type CurrentView =
  | "dashboard"
  | "ai_assistant"
  | "anime_detail"
  | "watchlist"
  | "discover"
  | "admin_dashboard"
  // PHASE 1: Add new view for Profile Settings
  | "profile_settings";


interface WatchlistActivityItem {
  animeTitle: string;
  status: string;
  userRating?: number;
}

const MOOD_BOARD_CUES = [
  { id: "dark_gritty", label: "Dark & Gritty", emoji: "💀" },
  { id: "heartwarming", label: "Heartwarming", emoji: "🥰" },
  { id: "epic_adventure", label: "Epic Adventure", emoji: "🗺️" },
  { id: "mind_bending", label: "Mind-Bending", emoji: "🧠" },
  { id: "chill_vibes", label: "Chill Vibes", emoji: "😌" },
  { id: "nostalgic", label: "Nostalgic", emoji: "⏳" },
  { id: "action_packed", label: "Action Packed", emoji: "💥" },
  { id: "romantic", label: "Romantic", emoji: "💕" },
  { id: "comedic_relief", label: "Comedic Relief", emoji: "😂" },
  { id: "thought_provoking", label: "Thought-Provoking", emoji: "🤔" },
];

export default function MainApp() {
  const userProfile = useQuery(api.users.getMyUserProfile);
  const fullWatchlist = useQuery(api.anime.getMyWatchlist);
  const isUserAdmin = useQuery(api.admin.isCurrentUserAdmin);

  const [currentView, setCurrentView] = useState<CurrentView>("dashboard");
  const [selectedAnimeId, setSelectedAnimeId] = useState<Id<"anime"> | null>(null);
  const [previousView, setPreviousView] = useState<CurrentView>("dashboard");

  const [forYouRecommendations, setForYouRecommendations] = useState<AnimeRecommendation[]>([]);
  const [isLoadingForYou, setIsLoadingForYou] = useState(false);
  const getPersonalizedRecommendations = useAction(api.ai.getPersonalizedRecommendations);

  const [selectedMoodCues, setSelectedMoodCues] = useState<string[]>([]);
  const [moodBoardRecommendations, setMoodBoardRecommendations] = useState<AnimeRecommendation[]>([]);
  const [isLoadingMoodBoard, setIsLoadingMoodBoard] = useState(false);
  const getRecommendationsByMoodTheme = useAction(api.ai.getRecommendationsByMoodTheme);

  const navigateToDetail = useCallback((animeId: Id<"anime">) => {
    setPreviousView(currentView);
    setSelectedAnimeId(animeId);
    setCurrentView("anime_detail");
  }, [currentView]);

  const navigateToDashboard = useCallback(() => {
    setCurrentView("dashboard");
    setSelectedAnimeId(null); 
  }, []);
  
  const navigateToDiscover = useCallback(() => {
    setPreviousView(currentView);
    setCurrentView("discover");
  }, [currentView]);

  const navigateToWatchlist = useCallback(() => {
    setPreviousView(currentView);
    setCurrentView("watchlist");
  }, [currentView]);

  const navigateToAIAssistant = useCallback(() => {
    setPreviousView(currentView);
    setCurrentView("ai_assistant");
  }, [currentView]);

  const navigateToAdminDashboard = useCallback(() => {
    setPreviousView(currentView);
    setCurrentView("admin_dashboard");
  }, [currentView]);
  
  // PHASE 1: Navigation to Profile Settings
  const navigateToProfileSettings = useCallback(() => {
    setPreviousView(currentView); 
    setCurrentView("profile_settings");
  }, [currentView]);


  const navigateBack = useCallback(() => {
    if (currentView === "profile_settings" && previousView === "anime_detail" && selectedAnimeId) {
        setCurrentView("anime_detail");
    } else if (previousView && previousView !== currentView) { 
        setCurrentView(previousView);
        if (previousView !== "anime_detail") { 
          setSelectedAnimeId(null);
        }
    } else {
        setCurrentView("dashboard"); 
        setSelectedAnimeId(null);
    }
  }, [previousView, currentView, selectedAnimeId]);


  useEffect(() => {
    const fetchForYouRecommendations = async () => {
      if (
        currentView === "dashboard" && 
        userProfile &&
        userProfile.onboardingCompleted &&
        forYouRecommendations.length === 0 && 
        !isLoadingForYou 
      ) {
        setIsLoadingForYou(true);
        const toastId = "for-you-loading";
        toast.loading("AniMuse is crafting your 'For You' list...", { id: toastId });
        
        const watchlistActivity: WatchlistActivityItem[] = fullWatchlist
          ? fullWatchlist
              .filter((item) => item.anime) 
              .map((item) => ({
                animeTitle: item.anime!.title, 
                status: item.status,
                userRating: item.userRating,
              }))
              .slice(0, 10) 
          : [];

        try {
          // Assuming getPersonalizedRecommendations might return a 'details' field on error
          const result: { recommendations: AnimeRecommendation[]; error?: string | null; details?: any } = 
            await getPersonalizedRecommendations({
              userProfile: {
                name: userProfile.name,
                moods: userProfile.moods,
                genres: userProfile.genres,
                favoriteAnimes: userProfile.favoriteAnimes,
                experienceLevel: userProfile.experienceLevel,
                dislikedGenres: userProfile.dislikedGenres,
                dislikedTags: userProfile.dislikedTags,
              },
              watchlistActivity,
              count: 3, 
            });

          if (result.error) {
            toast.error(
              `Could not load 'For You' list: ${result.error}`,
              { id: toastId }
            );
            // ---- PHASE 1: Corrected result.details access ----
            console.error("For You error:", result.error, result.details ?? "No additional details.");
          } else {
            setForYouRecommendations(
              result.recommendations as AnimeRecommendation[]
            );
            if (result.recommendations.length > 0) {
              toast.success("Your 'For You' list is ready!", {
                id: toastId,
              });
            } else {
              toast.info(
                "Could not find any 'For You' recommendations at this time.",
                { id: toastId }
              );
            }
          }
        } catch (e: any) {
          console.error("Failed to fetch 'For You' recommendations:", e);
          toast.error(
            `An unexpected error occurred: ${e.message || "Unknown error"}`,
            { id: toastId }
          );
        } finally {
          setIsLoadingForYou(false);
        }
      }
    };
    fetchForYouRecommendations(); 
  }, [ 
    currentView,
    userProfile,
    fullWatchlist,
    getPersonalizedRecommendations,
    forYouRecommendations.length, 
    isLoadingForYou,
  ]);

  const handleMoodCueToggle = useCallback((cueLabel: string) => {
    setSelectedMoodCues((prev) =>
      prev.includes(cueLabel)
        ? prev.filter((c) => c !== cueLabel)
        : [...prev, cueLabel]
    );
  }, []);

  const fetchMoodBoardRecommendations = useCallback(async () => {
    if (selectedMoodCues.length === 0) {
      setMoodBoardRecommendations([]);
      return;
    }
    setIsLoadingMoodBoard(true);
    setMoodBoardRecommendations([]);
    const toastId = "mood-board-loading";
    toast.loading("Finding anime for your mood...", { id: toastId });
    try {
      // Assuming getRecommendationsByMoodTheme might return a 'details' field on error
      const result: { recommendations: AnimeRecommendation[]; error?: string | null; details?: any } = 
        await getRecommendationsByMoodTheme({
          selectedCues: selectedMoodCues,
          userProfile: userProfile
            ? {
                name: userProfile.name,
                moods: userProfile.moods,
                genres: userProfile.genres,
                favoriteAnimes: userProfile.favoriteAnimes,
                experienceLevel: userProfile.experienceLevel,
                dislikedGenres: userProfile.dislikedGenres,
                dislikedTags: userProfile.dislikedTags,
              }
            : undefined,
          count: 3,
        });

      if (result.error) {
        toast.error(`Mood board error: ${result.error}`, {
          id: toastId,
        });
        // ---- PHASE 1: Corrected result.details access (example) ----
        console.error("Mood board error:", result.error, result.details ?? "No additional details.");
      } else {
        setMoodBoardRecommendations(
          result.recommendations as AnimeRecommendation[]
        );
        if (result.recommendations.length > 0) {
          toast.success("Found some anime for your mood!", {
            id: toastId,
          });
        } else {
          toast.info(
            "Couldn't find specific recommendations for this mood combination.",
            { id: toastId }
          );
        }
      }
    } catch (e: any) {
      toast.error(`Error fetching mood board recommendations: ${e.message || "Unknown error"}`, {
        id: toastId,
      });
    } finally {
      setIsLoadingMoodBoard(false);
    }
  }, [selectedMoodCues, userProfile, getRecommendationsByMoodTheme]);

  useEffect(() => {
    if (selectedMoodCues.length > 0 && currentView === 'dashboard') {
      const handler = setTimeout(() => {
        fetchMoodBoardRecommendations();
      }, 500); 
      return () => clearTimeout(handler);
    } else if (selectedMoodCues.length === 0) {
      setMoodBoardRecommendations([]); 
    }
  }, [selectedMoodCues, fetchMoodBoardRecommendations, currentView]);


  const renderDashboard = useCallback(() => (
    <div className="p-4 neumorphic-card">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-orbitron text-sakura-pink text-center flex-grow">
          Welcome, {userProfile?.name || "Explorer"}!
        </h1>
        {/* PHASE 1: Button to navigate to Profile Settings */}
        <StyledButton onClick={navigateToProfileSettings} variant="secondary_small" title="Profile Settings" className="ml-2">
          ⚙️
        </StyledButton>
      </div>
      <p className="text-brand-text-secondary mb-6 text-center">
        Your personalized anime journey begins now.
      </p>

      <div className="text-center mb-8">
        <StyledButton
          onClick={navigateToAIAssistant}
          variant="primary"
          className="text-lg px-8 py-4"
        >
          🤖 Talk to AniMuse AI
        </StyledButton>
      </div>

      <div className="mt-8 mb-8">
        <h2 className="text-2xl font-orbitron text-electric-blue mb-4 text-center">
          🎭 For You
        </h2>
        {isLoadingForYou && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-cyan mr-3"></div>
            <p className="text-brand-text-secondary">Loading recommendations...</p>
          </div>
        )}
        {!isLoadingForYou && forYouRecommendations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {forYouRecommendations.map((rec, index) => (
              <AnimeCard
                key={`for-you-${index}-${rec.title}`}
                anime={rec}
                isRecommendation={true}
                onViewDetails={navigateToDetail}
              />
            ))}
          </div>
        )}
        {!isLoadingForYou &&
          forYouRecommendations.length === 0 &&
          userProfile?.onboardingCompleted && (
            <div className="text-center p-6 neumorphic-card bg-brand-dark shadow-neumorphic-light-inset">
              <p className="text-brand-text-secondary">
                AniMuse is still getting to know you! Explore, review, or use the AI assistant.
              </p>
            </div>
          )}
      </div>

      <div className="mt-8 mb-8">
        <h2 className="text-2xl font-orbitron text-sakura-pink mb-4 text-center">
          🎨 Mood Board
        </h2>
        <p className="text-brand-text-secondary text-center mb-4">
          Select one or more vibes to get recommendations!
        </p>
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          {MOOD_BOARD_CUES.map((cue) => (
            <StyledButton
              key={cue.id}
              onClick={() => handleMoodCueToggle(cue.label)}
              variant={
                selectedMoodCues.includes(cue.label) ? "primary_small" : "secondary_small"
              }
              className="text-sm"
            >
              {cue.emoji} {cue.label}
            </StyledButton>
          ))}
        </div>

        {isLoadingMoodBoard && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-cyan mr-3"></div>
            <p className="text-brand-text-secondary">
              Brewing mood-based suggestions...
            </p>
          </div>
        )}

        {!isLoadingMoodBoard && moodBoardRecommendations.length > 0 && (
          <div>
            <h3 className="text-xl font-orbitron text-neon-cyan mb-3 text-center">
              Vibes for: {selectedMoodCues.join(" & ")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {moodBoardRecommendations.map((rec, index) => (
                <AnimeCard
                  key={`mood-${index}-${rec.title}`}
                  anime={rec}
                  isRecommendation={true}
                  onViewDetails={navigateToDetail}
                />
              ))}
            </div>
          </div>
        )}
        {!isLoadingMoodBoard &&
          selectedMoodCues.length > 0 &&
          moodBoardRecommendations.length === 0 && (
            <div className="text-center p-4 neumorphic-card bg-brand-dark shadow-neumorphic-light-inset">
              <p className="text-brand-text-secondary">
                No specific anime found for this mood combination. Try selecting
                fewer or different cues!
              </p>
            </div>
          )}
      </div>

      <div className="mt-6">
        <h2 className="text-2xl font-orbitron text-electric-blue mb-4 text-center">
          Explore
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            className="p-4 bg-brand-dark rounded-lg shadow-neumorphic-light-inset cursor-pointer hover:shadow-neumorphic-light transition-shadow text-center"
            onClick={navigateToDiscover}
          >
            <h3 className="font-orbitron text-neon-cyan mb-2">🔍 Discover</h3>
            <p className="text-xs text-brand-text-secondary">
              Browse & filter anime
            </p>
          </div>
          <div
            className="p-4 bg-brand-dark rounded-lg shadow-neumorphic-light-inset cursor-pointer hover:shadow-neumorphic-light transition-shadow text-center"
            onClick={navigateToWatchlist}
          >
            <h3 className="font-orbitron text-neon-cyan mb-2">📚 Watchlist</h3>
            <p className="text-xs text-brand-text-secondary">
              Your saved anime
            </p>
          </div>
        </div>
      </div>
      <ProfileStats />

      {isUserAdmin && (
        <div className="mt-8 pt-6 border-t border-brand-surface text-center">
          <StyledButton
            onClick={navigateToAdminDashboard}
            variant="secondary"
            className="text-base"
          >
            🛡️ Admin Dashboard
          </StyledButton>
        </div>
      )}
    </div>
  ), [
      userProfile, isLoadingForYou, forYouRecommendations, isLoadingMoodBoard, 
      moodBoardRecommendations, selectedMoodCues, isUserAdmin,
      navigateToAIAssistant, navigateToDetail, navigateToDiscover,
      navigateToWatchlist, handleMoodCueToggle, navigateToAdminDashboard,
      navigateToProfileSettings 
    ]
  );

  const renderContent = useCallback(() => {
    switch (currentView) {
      case "ai_assistant":
        return <AIAssistantPage />;
      case "anime_detail":
        if (selectedAnimeId) {
          return (
            <AnimeDetailPage
              animeId={selectedAnimeId}
              onBack={navigateBack}
            />
          );
        }
        setCurrentView(previousView || "dashboard"); 
        return null;
      case "watchlist":
        return (
          <WatchlistPage
            onViewDetails={navigateToDetail}
            onBack={navigateBack}
          />
        );
      case "discover":
        return (
          <DiscoverPage
            onViewDetails={navigateToDetail}
            onBack={navigateBack}
          />
        );
      case "admin_dashboard":
        return <AdminDashboardPage onNavigateBack={navigateToDashboard} />;
      // PHASE 1: Render ProfileSettingsPage
      case "profile_settings":
        return <ProfileSettingsPage onBack={navigateBack} />;
      case "dashboard":
      default:
        return renderDashboard();
    }
  }, [currentView, selectedAnimeId, previousView, navigateToDetail, navigateBack, renderDashboard, navigateToDashboard]);

  const getDisplayViewName = useCallback((view: CurrentView): string => {
    switch (view) {
      case "ai_assistant": return "🤖 AI Assistant";
      case "anime_detail": return "📺 Anime Details";
      case "discover": return "🔍 Discover";
      case "watchlist": return "📚 Watchlist";
      case "admin_dashboard": return "🛡️ Admin Dashboard";
      // PHASE 1: Add display name for profile settings
      case "profile_settings": return "⚙️ Profile Settings";
      case "dashboard": return "🏠 Dashboard";
      default:
        const _exhaustiveCheck: never = view; 
        return String(view); 
    }
  }, []);
  
  return (
    <div className="w-full max-w-5xl mx-auto"> 
      {currentView !== "dashboard" && (
        <div className="mb-4 p-2 text-sm text-brand-text-secondary bg-brand-surface/50 rounded-lg flex items-center flex-wrap">
          <button
            onClick={navigateToDashboard}
            className="hover:text-neon-cyan transition-colors"
          >
            🏠 Dashboard
          </button>
          {(currentView === "anime_detail" || currentView === "profile_settings") &&
            previousView !== "dashboard" &&
            previousView !== currentView && 
            previousView && 
             (
              <>
                <span className="mx-2">•</span>
                <button
                  onClick={() => {
                    if (currentView === "profile_settings" && previousView === "anime_detail" && selectedAnimeId) {
                       setCurrentView("anime_detail");
                    } else if (previousView) {
                       setCurrentView(previousView);
                       if (previousView !== "anime_detail") setSelectedAnimeId(null); 
                    }
                  }}
                  className="hover:text-neon-cyan transition-colors capitalize"
                >
                  {getDisplayViewName(previousView)}
                </button>
              </>
            )}
          <span className="mx-2">•</span>
          <span className="text-neon-cyan capitalize">
            {getDisplayViewName(currentView)}
          </span>
        </div>
      )}
      {renderContent()}
    </div>
  );
}
