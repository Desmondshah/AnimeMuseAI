// src/components/animuse/MainApp.tsx
import React, { useState, useEffect, useCallback, memo } from "react";
import { useQuery, useAction, useConvexAuth, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id, Doc } from "../../../convex/_generated/dataModel";
import AIAssistantPage from "./AIAssistantPage"; // Will need its own styling pass
import AnimeDetailPage from "./AnimeDetailPage"; // Will need its own styling pass
import StyledButton from "./shared/StyledButton";
import WatchlistPage from "./onboarding/WatchlistPage"; // Will need its own styling pass
import DiscoverPage from "./onboarding/DiscoverPage";   // Will need its own styling pass
import ProfileStats from "./onboarding/ProfileStats";   // Will need its own styling pass
import { AnimeRecommendation } from "../../../convex/types";
import { toast } from "sonner";
import AnimeCard from "./AnimeCard"; // Already refactored
import AdminDashboardPage from "../admin/AdminDashboardPage"; // Will need its own styling pass
import ProfileSettingsPage from "./onboarding/ProfileSettingsPage"; // Will need its own styling pass
import EnhancedAIAssistantPage from "./AIAssistantPage";

const LoadingSpinnerComponent: React.FC<{ message?: string; className?: string }> = ({ message = "Loading...", className = "" }) => (
    <div className={`flex flex-col justify-center items-center py-10 ${className}`}> {/* Added py-10 */}
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-primary-action"></div>
      {message && <p className="mt-3 text-sm text-brand-text-on-dark/80">{message}</p>}
    </div>
);
const LoadingSpinner = memo(LoadingSpinnerComponent);

type CurrentView =
  | "dashboard" | "ai_assistant" | "anime_detail" | "watchlist"
  | "discover" | "admin_dashboard" | "profile_settings"
  | "custom_lists_overview" | "custom_list_detail";

interface WatchlistActivityItem { animeTitle: string; status: string; userRating?: number; }
interface ForYouCategory {
  id: string; title: string; recommendations: AnimeRecommendation[];
  reason?: string; isLoading: boolean; error?: string | null;
  fetchFn?: (args: any) => Promise<{ recommendations: AnimeRecommendation[]; error?: string | null; details?: any }>;
  fetchArgs?: any;
}

const MOOD_BOARD_CUES = [
  { id: "dark_gritty", label: "Dark & Gritty", emoji: "💀" }, { id: "heartwarming", label: "Heartwarming", emoji: "🥰" },
  { id: "epic_adventure", label: "Epic Adventure", emoji: "🗺️" }, { id: "mind_bending", label: "Mind-Bending", emoji: "🧠" },
  { id: "chill_vibes", label: "Chill Vibes", emoji: "😌" }, { id: "nostalgic", label: "Nostalgic", emoji: "⏳" },
  { id: "action_packed", label: "Action Packed", emoji: "💥" }, { id: "romantic", label: "Romantic", emoji: "💕" },
  { id: "comedic_relief", label: "Comedic Relief", emoji: "😂" }, { id: "thought_provoking", label: "Thought-Provoking", emoji: "🤔" },
];

export default function MainApp() {
  const userProfile = useQuery(api.users.getMyUserProfile);
  const fullWatchlist = useQuery(api.anime.getMyWatchlist);
  const isUserAdmin = useQuery(api.admin.isCurrentUserAdmin);
  const myCustomLists = useQuery(api.users.getMyCustomLists);
  const getPersonalizedRecommendationsAction = useAction(api.ai.getPersonalizedRecommendations);
  const getRecommendationsByMoodTheme = useAction(api.ai.getRecommendationsByMoodTheme);

  const [currentView, setCurrentView] = useState<CurrentView>("dashboard");
  const [selectedAnimeId, setSelectedAnimeId] = useState<Id<"anime"> | null>(null);
  const [selectedCustomListId, setSelectedCustomListId] = useState<Id<"customLists"> | null>(null);
  const [previousView, setPreviousView] = useState<CurrentView>("dashboard");

  const [forYouCategories, setForYouCategories] = useState<ForYouCategory[]>([]);
  const [selectedMoodCues, setSelectedMoodCues] = useState<string[]>([]);
  const [moodBoardRecommendations, setMoodBoardRecommendations] = useState<AnimeRecommendation[]>([]);
  const [isLoadingMoodBoard, setIsLoadingMoodBoard] = useState(false);

  const navigateTo = useCallback((view: CurrentView, prevViewOverride?: CurrentView) => {
    window.scrollTo(0, 0); // Scroll to top on view change
    setPreviousView(prevViewOverride || currentView);
    setCurrentView(view);
    if (view !== "anime_detail") setSelectedAnimeId(null);
    if (view !== "custom_list_detail") setSelectedCustomListId(null);
  }, [currentView]);

  const navigateToDetail = useCallback((animeId: Id<"anime">) => { navigateTo("anime_detail"); setSelectedAnimeId(animeId); }, [navigateTo]);
  const navigateToDashboard = useCallback(() => navigateTo("dashboard"), [navigateTo]);
  const navigateToDiscover = useCallback(() => navigateTo("discover"), [navigateTo]);
  const navigateToWatchlist = useCallback(() => navigateTo("watchlist"), [navigateTo]);
  const navigateToAIAssistant = useCallback(() => navigateTo("ai_assistant"), [navigateTo]);
  const navigateToAdminDashboard = useCallback(() => navigateTo("admin_dashboard"), [navigateTo]);
  const navigateToProfileSettings = useCallback(() => navigateTo("profile_settings"), [navigateTo]);
  const navigateToCustomListsOverview = useCallback(() => navigateTo("custom_lists_overview"), [navigateTo]);
  const navigateToCustomListDetail = useCallback((listId: Id<"customLists">) => { navigateTo("custom_list_detail"); setSelectedCustomListId(listId); }, [navigateTo]);
  const navigateBack = useCallback(() => { const targetView = previousView || "dashboard"; navigateTo(targetView, "dashboard"); }, [previousView, navigateTo]);


  useEffect(() => {
    const fetchForYouCategory = async (categoryIndex: number) => {
      // ... (fetch logic remains largely the same, ensure profileDataForAI matches expected structure)
      // Ensure userProfile fields passed to AI actions match the `enhancedUserProfileValidator` in `convex/ai.ts`
      const category = forYouCategories[categoryIndex];
      if (!category || !category.fetchFn || !userProfile) return;

      setForYouCategories(prev => prev.map((cat, i) => i === categoryIndex ? { ...cat, isLoading: true, error: null } : cat));
      try {
        const profileDataForAI = { // Ensure this matches the validator
            name: userProfile.name, moods: userProfile.moods, genres: userProfile.genres,
            favoriteAnimes: userProfile.favoriteAnimes, experienceLevel: userProfile.experienceLevel,
            dislikedGenres: userProfile.dislikedGenres, dislikedTags: userProfile.dislikedTags,
            characterArchetypes: userProfile.characterArchetypes, tropes: userProfile.tropes,
            artStyles: userProfile.artStyles, narrativePacing: userProfile.narrativePacing,
            // watchlistIsPublic is part of userProfile but might not be needed by all AI actions
        };
        const watchlistActivity: WatchlistActivityItem[] = fullWatchlist?.filter(item => item.anime).map(item => ({ animeTitle: item.anime!.title, status: item.status, userRating: item.userRating })).slice(0, 10) || [];
        const result = await category.fetchFn({ ...category.fetchArgs, userProfile: profileDataForAI, watchlistActivity });
        setForYouCategories(prev => prev.map((cat, i) => i === categoryIndex ? { ...cat, recommendations: result.recommendations || [], isLoading: false, error: result.error } : cat));
        if (result.error && result.error !== "OpenAI API key not configured.") toast.error(`Error fetching "${category.title}": ${result.error.substring(0,100)}`);
      } catch (e: any) {
        setForYouCategories(prev => prev.map((cat, i) => i === categoryIndex ? { ...cat, isLoading: false, error: e.message || "Unknown error" } : cat));
        toast.error(`Failed to fetch "${category.title}".`);
      }
    };
    // ... (rest of useEffect logic remains the same)
    if (currentView === "dashboard" && userProfile?.onboardingCompleted && forYouCategories.length === 0) {
        const initialCategoriesSetup: ForYouCategory[] = [
            {
                id: "generalPersonalized", title: "✨ Personalized For You", recommendations: [], isLoading: false, error: null,
                fetchFn: getPersonalizedRecommendationsAction,
                fetchArgs: { count: 3, messageId: `foryou-general-${Date.now()}` },
                reason: "Tailored based on your profile and activity."
            },
        ];
        setForYouCategories(initialCategoriesSetup);
        initialCategoriesSetup.forEach((_cat, idx) => fetchForYouCategory(idx));
    } else if (currentView === "dashboard" && userProfile?.onboardingCompleted && forYouCategories.length > 0) {
        forYouCategories.forEach((cat, idx) => {
            if (cat.recommendations.length === 0 && !cat.isLoading && !cat.error) {
                fetchForYouCategory(idx);
            }
        });
    }
  }, [currentView, userProfile, fullWatchlist, getPersonalizedRecommendationsAction, forYouCategories]); // Removed forYouCategories from dep array if it causes re-fetch loops, or manage it carefully


  const handleMoodCueToggle = useCallback((cueLabel: string) => { setSelectedMoodCues(prev => prev.includes(cueLabel) ? prev.filter(c => c !== cueLabel) : [...prev, cueLabel]);}, []);
  const fetchMoodBoardRecommendations = useCallback(async () => {
    if (selectedMoodCues.length === 0) { setMoodBoardRecommendations([]); return; }
    setIsLoadingMoodBoard(true); setMoodBoardRecommendations([]);
    try {
        const profileForAI = userProfile ? {
            name: userProfile.name, moods: userProfile.moods, genres: userProfile.genres, favoriteAnimes: userProfile.favoriteAnimes, experienceLevel: userProfile.experienceLevel, dislikedGenres: userProfile.dislikedGenres, dislikedTags: userProfile.dislikedTags, characterArchetypes: userProfile.characterArchetypes, tropes: userProfile.tropes, artStyles: userProfile.artStyles, narrativePacing: userProfile.narrativePacing
        } : undefined;
        const result = await getRecommendationsByMoodTheme({ selectedCues: selectedMoodCues, userProfile: profileForAI, count: 3, messageId: `mood-${Date.now()}`});
        if (result.error && result.error !== "OpenAI API key not configured.") toast.error(`Mood board error: ${result.error.substring(0,100)}`); else setMoodBoardRecommendations(result.recommendations || []);
    } catch (e: any) { toast.error(`Error fetching mood board: ${e.message}`); }
    finally { setIsLoadingMoodBoard(false); }
  }, [selectedMoodCues, userProfile, getRecommendationsByMoodTheme]);

  useEffect(() => { if (selectedMoodCues.length > 0 && currentView === 'dashboard') { const h = setTimeout(() => { fetchMoodBoardRecommendations(); }, 500); return () => clearTimeout(h); } else if (selectedMoodCues.length === 0) { setMoodBoardRecommendations([]); } }, [selectedMoodCues, fetchMoodBoardRecommendations, currentView]);

  const renderDashboard = useCallback(() => (
    // Dashboard main card: bg-brand-surface (Cream), text-brand-text-primary (Dark Brown)
    <div className="bg-brand-surface text-brand-text-primary rounded-xl shadow-xl p-4 sm:p-6 space-y-8 md:space-y-10">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl sm:text-3xl font-heading text-brand-primary-action">
          Welcome, {userProfile?.name || "Explorer"}!
        </h1>
        <StyledButton onClick={navigateToProfileSettings} variant="ghost" title="Profile Settings" className="text-brand-accent-gold hover:text-brand-primary-action">
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
        </StyledButton>
      </div>
      <div className="text-center">
        <StyledButton onClick={navigateToAIAssistant} variant="primary" className="text-base sm:text-lg px-6 py-3 sm:px-8 sm:py-3.5 shadow-lg">
          🤖 Talk to AniMuse AI
        </StyledButton>
      </div>

      {userProfile?.onboardingCompleted && forYouCategories.map((category) => (
        <div key={category.id} className="mt-2">
          <h2 className="text-xl sm:text-2xl font-heading text-brand-accent-gold mb-1 text-center">{category.title}</h2>
          {category.reason && <p className="text-xs sm:text-sm text-brand-text-primary/70 text-center mb-3 sm:mb-4 italic">{category.reason}</p>}
          {category.isLoading && <LoadingSpinner className="text-brand-text-primary/80" />}
          {category.error && <p className="text-red-500 text-center py-4 text-sm">{category.error}</p>}
          {!category.isLoading && !category.error && category.recommendations.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {category.recommendations.map((rec, index) => (
                <AnimeCard key={`${category.id}-${index}-${rec.title}`} anime={rec} isRecommendation={true} onViewDetails={navigateToDetail} />
              ))}
            </div>
          )}
          {!category.isLoading && !category.error && category.recommendations.length === 0 && (
             <div className="text-center p-4 mt-2 bg-brand-accent-peach/20 rounded-lg"><p className="text-sm text-brand-text-primary/80">No recommendations for "{category.title}" right now.</p></div>
          )}
        </div>
      ))}

      <div className="mt-4 sm:mt-6"> {/* Mood Board Section */}
        <h2 className="text-xl sm:text-2xl font-heading text-brand-accent-gold mb-3 sm:mb-4 text-center">🎨 Mood Board</h2>
        <p className="text-sm text-brand-text-primary/70 text-center mb-4 sm:mb-5">Select vibes for instant recommendations!</p>
        <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5 mb-5 sm:mb-6">
          {MOOD_BOARD_CUES.map(cue => <StyledButton key={cue.id} onClick={() => handleMoodCueToggle(cue.label)} selected={selectedMoodCues.includes(cue.label)} variant={selectedMoodCues.includes(cue.label) ? "primary_small" : "secondary_small"} className="text-xs px-2.5 py-1.5 sm:px-3 sm:py-2">{cue.emoji} {cue.label}</StyledButton>)}
        </div>
        {isLoadingMoodBoard && <LoadingSpinner message="Brewing suggestions..." className="text-brand-text-primary/80" />}
        {!isLoadingMoodBoard && moodBoardRecommendations.length > 0 && (
          <div>
            <h3 className="text-lg sm:text-xl font-heading text-brand-primary-action mb-3 text-center">Vibes for: {selectedMoodCues.join(" & ")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {moodBoardRecommendations.map((rec, index) => <AnimeCard key={`mood-${index}-${rec.title}`} anime={rec} isRecommendation={true} onViewDetails={navigateToDetail} />)}
            </div>
          </div>
        )}
         {!isLoadingMoodBoard && selectedMoodCues.length > 0 && moodBoardRecommendations.length === 0 && (
            <div className="text-center p-4 mt-2 bg-brand-accent-peach/20 rounded-lg"><p className="text-sm text-brand-text-primary/80">No specific matches for these vibes. Try adjusting!</p></div>
         )}
      </div>

      <div className="mt-4 sm:mt-6"> {/* Explore Section */}
        <h2 className="text-xl sm:text-2xl font-heading text-brand-accent-gold mb-3 sm:mb-4 text-center">Explore More</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Explore items: bg-brand-background (Dark Brown for contrast on cream), text-brand-text-on-dark (Cream) */}
          <div className="bg-brand-background p-4 rounded-lg shadow-md hover:shadow-lg cursor-pointer transition-shadow text-center text-brand-text-on-dark" onClick={navigateToDiscover}>
            <h3 className="font-heading text-brand-primary-action text-lg mb-1">🔍 Discover</h3><p className="text-xs text-brand-text-on-dark/80">Browse & Filter All</p>
          </div>
          <div className="bg-brand-background p-4 rounded-lg shadow-md hover:shadow-lg cursor-pointer transition-shadow text-center text-brand-text-on-dark" onClick={navigateToWatchlist}>
            <h3 className="font-heading text-brand-primary-action text-lg mb-1">📚 My Watchlist</h3><p className="text-xs text-brand-text-on-dark/80">Your Saved Anime</p>
          </div>
          <div className="bg-brand-background p-4 rounded-lg shadow-md hover:shadow-lg cursor-pointer transition-shadow text-center text-brand-text-on-dark" onClick={navigateToCustomListsOverview}>
            <h3 className="font-heading text-brand-primary-action text-lg mb-1">📜 Custom Lists</h3><p className="text-xs text-brand-text-on-dark/80">Curate & Share</p>
          </div>
        </div>
      </div>
      <ProfileStats /> {/* Assumes ProfileStats will be themed separately */}
      {isUserAdmin && <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-brand-accent-peach/30 text-center">
        <StyledButton onClick={navigateToAdminDashboard} variant="secondary" className="!border-brand-accent-gold !text-brand-accent-gold hover:!bg-brand-accent-gold hover:!text-brand-surface">
            🛡️ Admin Dashboard
        </StyledButton>
      </div>}
    </div>
  ), [userProfile, forYouCategories, isLoadingMoodBoard, moodBoardRecommendations, selectedMoodCues, isUserAdmin, navigateToAIAssistant, navigateToDetail, navigateToDiscover, navigateToWatchlist, handleMoodCueToggle, navigateToAdminDashboard, navigateToProfileSettings, navigateToCustomListsOverview, fullWatchlist]); // Added fullWatchlist

  // --- CreateCustomListModal ---
  const CreateCustomListModal: React.FC<{ isOpen: boolean; onClose: () => void; onCreate: (name: string, description?: string, isPublic?: boolean) => Promise<void>; }> = ({ isOpen, onClose, onCreate }) => {
    const [name, setName] = useState(""); const [description, setDescription] = useState(""); const [isPublic, setIsPublic] = useState(false); const [isCreating, setIsCreating] = useState(false);
    useEffect(() => { if (isOpen) { setName(""); setDescription(""); setIsPublic(false); setIsCreating(false); } }, [isOpen]);
    if (!isOpen) return null;
    const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (!name.trim()) { toast.error("List name required."); return; } setIsCreating(true); await onCreate(name, description, isPublic); /* State reset handled by useEffect on isOpen */ };
    return (
      <div className="fixed inset-0 bg-brand-background/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
        <form onSubmit={handleSubmit} className="bg-brand-surface text-brand-text-primary p-5 sm:p-6 rounded-xl shadow-2xl w-full max-w-md space-y-4">
          <h3 className="text-xl font-heading text-brand-primary-action mb-2">Create New List</h3>
          <div>
            <label htmlFor="newListName" className="block text-sm font-medium text-brand-text-primary/80 mb-1">Name*</label>
            <input type="text" id="newListName" value={name} onChange={e => setName(e.target.value)} className="form-input w-full" required/>
          </div>
          <div>
            <label htmlFor="newListDesc" className="block text-sm font-medium text-brand-text-primary/80 mb-1">Description</label>
            <textarea id="newListDesc" value={description} onChange={e => setDescription(e.target.value)} className="form-input w-full" rows={3}/>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="newListPublic" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="form-checkbox accent-brand-primary-action h-4 w-4 rounded text-brand-primary-action focus:ring-brand-primary-action focus:ring-offset-brand-surface"/>
            <label htmlFor="newListPublic" className="text-sm text-brand-text-primary/90">Make this list public</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <StyledButton type="button" onClick={onClose} variant="secondary_small" disabled={isCreating}>Cancel</StyledButton>
            <StyledButton type="submit" variant="primary_small" disabled={isCreating}>{isCreating ? "Creating..." : "Create List"}</StyledButton>
          </div>
        </form>
      </div>
    );
  };
  const [isCreateListModalOpen, setIsCreateListModalOpen] = useState(false);
  const createCustomListMutation = useMutation(api.users.createCustomList);
  const handleCreateCustomList = async (name: string, description?: string, isPublic?:boolean) => { try { await createCustomListMutation({listName: name, description, isPublic: isPublic || false}); toast.success(`List "${name}" created!`); setIsCreateListModalOpen(false); } catch (error: any) { toast.error(error.data?.message || "Failed to create list."); }};

  // --- Custom Lists Overview View ---
  const renderCustomListsOverview = useCallback(() => {
    return (
        <div className="bg-brand-surface text-brand-text-primary rounded-xl shadow-xl p-4 sm:p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl sm:text-2xl font-heading text-brand-primary-action">My Custom Lists</h2>
                <StyledButton onClick={() => setIsCreateListModalOpen(true)} variant="primary">Create New List</StyledButton>
            </div>
            {myCustomLists === undefined && <LoadingSpinner message="Loading lists..." className="text-brand-text-primary/80" />}
            {myCustomLists && myCustomLists.length === 0 && <p className="text-brand-text-primary/70 text-center py-5">No custom lists yet. Create one to get started!</p>}
            {myCustomLists && myCustomLists.length > 0 && (
                <div className="space-y-3 sm:space-y-4">
                    {myCustomLists.map(list => (
                        <div key={list._id} className="p-3 sm:p-4 bg-brand-accent-peach/20 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:shadow-md transition-shadow">
                            <div className="flex-grow min-w-0">
                                <h3 className="text-lg font-heading text-brand-primary-action cursor-pointer hover:underline" onClick={() => navigateToCustomListDetail(list._id)}>{list.listName}</h3>
                                <p className="text-xs text-brand-text-primary/70 truncate" title={list.description}>{list.description || "No description"}</p>
                                <p className="text-xs text-brand-text-primary/60 mt-0.5">{list.animeIds.length} items • {list.isPublic ? "Public" : "Private"}</p>
                            </div>
                            <StyledButton onClick={() => navigateToCustomListDetail(list._id)} variant="secondary_small" className="mt-2 sm:mt-0 flex-shrink-0">View/Edit</StyledButton>
                        </div>
                    ))}
                </div>
            )}
            <CreateCustomListModal isOpen={isCreateListModalOpen} onClose={() => setIsCreateListModalOpen(false)} onCreate={handleCreateCustomList} />
            <StyledButton onClick={navigateToDashboard} variant="ghost" className="mt-6 text-brand-accent-gold hover:text-brand-primary-action text-sm">
                ← Back to Dashboard
            </StyledButton>
        </div>);
  }, [myCustomLists, navigateToCustomListDetail, isCreateListModalOpen, handleCreateCustomList, navigateToDashboard]);


  // --- Custom List Detail View ---
  const CustomListDetailView: React.FC<{listId: Id<"customLists">, onBackToLists: () => void, onViewAnime: (animeId: Id<"anime">) => void}> = ({listId, onBackToLists, onViewAnime}) => {
      const listDetails = useQuery(api.users.getCustomListById, {listId});
      // TODO: Add functions for editing list name/desc/privacy, adding/removing anime
      if (listDetails === undefined) return <LoadingSpinner message="Loading list details..." className="text-brand-text-primary/80"/>;
      if (listDetails === null) return <div className="bg-brand-surface text-brand-text-primary rounded-xl shadow-xl p-6 text-center"><p className="mb-4">List not found or private.</p><StyledButton onClick={onBackToLists} variant="primary">Back to Lists</StyledButton></div>;
      return (
          <div className="bg-brand-surface text-brand-text-primary rounded-xl shadow-xl p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-2">
                <h2 className="text-xl sm:text-2xl font-heading text-brand-primary-action">{listDetails.listName}</h2>
                <StyledButton variant="secondary_small" onClick={onBackToLists}>← Back to Lists</StyledButton>
              </div>
              <p className="text-sm text-brand-text-primary/80 mb-1">{listDetails.description || "No description"}</p>
              <p className="text-xs text-brand-text-primary/60 mb-6">{listDetails.isPublic ? "Public List" : "Private List"} • {listDetails.anime.length} items</p>
              {/* TODO: Edit list details UI (e.g., a small "Edit" button here) */}
              {/* TODO: UI to add anime to this list (e.g., a search bar + add button) */}

              {listDetails.anime.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {listDetails.anime.map(anime => (<AnimeCard key={anime._id} anime={anime} onViewDetails={onViewAnime} /> ))}
                </div>
              ) : (
                <p className="text-brand-text-primary/70 text-center py-8">This list is empty. Add some anime!</p>
              )}
          </div>);
  };

  const renderContent = useCallback(() => {
    // All page components will need their own theming pass eventually
    switch (currentView) {
      // Inside MainApp.tsx, in the renderContent function's switch case
case "ai_assistant": return <EnhancedAIAssistantPage navigateToDetail={navigateToDetail} />;
      case "anime_detail": return selectedAnimeId ? <AnimeDetailPage animeId={selectedAnimeId} onBack={navigateBack} /> : <LoadingSpinner className="text-brand-text-primary/80"/>;
      case "watchlist": return <WatchlistPage onViewDetails={navigateToDetail} onBack={navigateBack} onNavigateToCustomLists={navigateToCustomListsOverview} />;
      case "discover": return <DiscoverPage onViewDetails={navigateToDetail} onBack={navigateBack} />;
      case "admin_dashboard": return <AdminDashboardPage onNavigateBack={navigateToDashboard} />;
      case "profile_settings": return <ProfileSettingsPage onBack={navigateBack} />;
      case "custom_lists_overview": return renderCustomListsOverview();
      case "custom_list_detail": return selectedCustomListId ? <CustomListDetailView listId={selectedCustomListId} onBackToLists={() => navigateTo("custom_lists_overview", "dashboard")} onViewAnime={navigateToDetail}/> : <LoadingSpinner className="text-brand-text-primary/80"/>;
      case "dashboard": default: return renderDashboard();
      
    }
  }, [currentView, selectedAnimeId, selectedCustomListId, navigateBack, navigateToDetail, navigateToDashboard, renderDashboard, renderCustomListsOverview, navigateToCustomListsOverview]);

  const getDisplayViewName = useCallback((view: CurrentView): string => {
    const names: Record<CurrentView, string> = {
      ai_assistant: "🤖 AI Assistant", anime_detail: "📺 Anime Details", discover: "🔍 Discover",
      watchlist: "📚 Watchlist", admin_dashboard: "🛡️ Admin", profile_settings: "⚙️ Settings",
      custom_lists_overview: "📜 My Lists", custom_list_detail: "📝 List Details", dashboard: "🏠 Dashboard",
    };
    return names[view] || String(view).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }, []);

  return (
    // MainApp content area within App.tsx's max-w-5xl. No specific background here, inherits from body/App.tsx.
    <div className="w-full pb-8">
      {currentView !== "dashboard" && (
        // Breadcrumb styling: bg-brand-background (Dark Brown), text-brand-text-on-dark (Cream) for contrast
        <div className="mb-4 p-2.5 sm:p-3 text-xs sm:text-sm text-brand-text-on-dark/90 bg-brand-background/60 backdrop-blur-sm rounded-lg shadow flex items-center flex-wrap gap-x-2 sticky top-[60px] sm:top-[68px] z-40"> {/* Adjust top based on header height */}
          <button onClick={navigateToDashboard} className="hover:text-brand-primary-action font-medium">🏠 Dashboard</button>
          { previousView && previousView !== "dashboard" && previousView !== currentView && (
              <> <span className="opacity-50">&bull;</span> <button onClick={navigateBack} className="hover:text-brand-primary-action capitalize">{getDisplayViewName(previousView)}</button> </>
          )}
          <span className="opacity-50">&bull;</span>
          <span className="text-brand-primary-action font-semibold capitalize">{getDisplayViewName(currentView)}</span>
        </div>
      )}
      {renderContent()}
    </div>
  );
}