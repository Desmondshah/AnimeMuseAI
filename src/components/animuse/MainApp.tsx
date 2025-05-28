// src/components/animuse/MainApp.tsx
import React, { useState, useEffect, useCallback, memo } from "react";
import { useQuery, useAction, useConvexAuth, useMutation } from "convex/react";
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
import ProfileSettingsPage from "./onboarding/ProfileSettingsPage";

// Define LoadingSpinner here or import from a shared location
const LoadingSpinnerComponent: React.FC<{ message?: string }> = ({ message = "Loading..." }) => (
    <div className="flex flex-col justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan"></div>
      <p className="mt-3 text-brand-text-secondary">{message}</p>
    </div>
);
const LoadingSpinner = memo(LoadingSpinnerComponent);


type CurrentView =
  | "dashboard"
  | "ai_assistant"
  | "anime_detail"
  | "watchlist"
  | "discover"
  | "admin_dashboard"
  | "profile_settings"
  | "custom_lists_overview"
  | "custom_list_detail";


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
  
  const [currentView, setCurrentView] = useState<CurrentView>("dashboard");
  const [selectedAnimeId, setSelectedAnimeId] = useState<Id<"anime"> | null>(null);
  const [selectedCustomListId, setSelectedCustomListId] = useState<Id<"customLists"> | null>(null);
  const [previousView, setPreviousView] = useState<CurrentView>("dashboard");

  const [forYouCategories, setForYouCategories] = useState<ForYouCategory[]>([]);

  const [selectedMoodCues, setSelectedMoodCues] = useState<string[]>([]);
  const [moodBoardRecommendations, setMoodBoardRecommendations] = useState<AnimeRecommendation[]>([]);
  const [isLoadingMoodBoard, setIsLoadingMoodBoard] = useState(false);
  const getRecommendationsByMoodTheme = useAction(api.ai.getRecommendationsByMoodTheme);

  const navigateTo = useCallback((view: CurrentView, prevViewOverride?: CurrentView) => {
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

  const navigateBack = useCallback(() => {
    const targetView = previousView || "dashboard";
    setCurrentView(targetView);
    if (targetView !== "anime_detail") setSelectedAnimeId(null);
    if (targetView !== "custom_list_detail") setSelectedCustomListId(null);
  }, [previousView]);


  useEffect(() => {
    const fetchForYouCategory = async (categoryIndex: number) => {
      const category = forYouCategories[categoryIndex];
      if (!category || !category.fetchFn || !userProfile) return;

      setForYouCategories(prev => prev.map((cat, i) => i === categoryIndex ? { ...cat, isLoading: true, error: null } : cat));
      try {
        const profileDataForAI = {
            name: userProfile.name, moods: userProfile.moods, genres: userProfile.genres, favoriteAnimes: userProfile.favoriteAnimes,
            experienceLevel: userProfile.experienceLevel, dislikedGenres: userProfile.dislikedGenres, dislikedTags: userProfile.dislikedTags,
            characterArchetypes: userProfile.characterArchetypes, tropes: userProfile.tropes, artStyles: userProfile.artStyles, narrativePacing: userProfile.narrativePacing,
        };
        const watchlistActivity: WatchlistActivityItem[] = fullWatchlist?.filter(item => item.anime).map(item => ({ animeTitle: item.anime!.title, status: item.status, userRating: item.userRating })).slice(0, 10) || [];
        const result = await category.fetchFn({ ...category.fetchArgs, userProfile: profileDataForAI, watchlistActivity });
        setForYouCategories(prev => prev.map((cat, i) => i === categoryIndex ? { ...cat, recommendations: result.recommendations || [], isLoading: false, error: result.error } : cat));
        if (result.error) toast.error(`Error fetching "${category.title}": ${result.error}`);
      } catch (e: any) {
        setForYouCategories(prev => prev.map((cat, i) => i === categoryIndex ? { ...cat, isLoading: false, error: e.message || "Unknown error" } : cat));
        toast.error(`Failed to fetch "${category.title}".`);
      }
    };

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
        // Optionally re-fetch or check if data is stale
        forYouCategories.forEach((cat, idx) => {
            if (cat.recommendations.length === 0 && !cat.isLoading && !cat.error) {
                fetchForYouCategory(idx);
            }
        });
    }
  }, [currentView, userProfile, fullWatchlist, getPersonalizedRecommendationsAction, forYouCategories]);


  const handleMoodCueToggle = useCallback((cueLabel: string) => { setSelectedMoodCues(prev => prev.includes(cueLabel) ? prev.filter(c => c !== cueLabel) : [...prev, cueLabel]);}, []);
  const fetchMoodBoardRecommendations = useCallback(async () => {   if (selectedMoodCues.length === 0) { setMoodBoardRecommendations([]); return; }
    setIsLoadingMoodBoard(true); setMoodBoardRecommendations([]);
    try {
        const result = await getRecommendationsByMoodTheme({ selectedCues: selectedMoodCues, userProfile: userProfile ? {name: userProfile.name, moods: userProfile.moods, genres: userProfile.genres, favoriteAnimes: userProfile.favoriteAnimes, experienceLevel: userProfile.experienceLevel, dislikedGenres: userProfile.dislikedGenres, dislikedTags: userProfile.dislikedTags, characterArchetypes: userProfile.characterArchetypes, tropes: userProfile.tropes, artStyles: userProfile.artStyles, narrativePacing: userProfile.narrativePacing } : undefined, count: 3, messageId: `mood-${Date.now()}`});
        if (result.error) toast.error(`Mood board error: ${result.error}`); else setMoodBoardRecommendations(result.recommendations);
    } catch (e: any) { toast.error(`Error fetching mood board: ${e.message}`); }
    finally { setIsLoadingMoodBoard(false); }
  }, [selectedMoodCues, userProfile, getRecommendationsByMoodTheme]);

  useEffect(() => { if (selectedMoodCues.length > 0 && currentView === 'dashboard') { const h = setTimeout(() => { fetchMoodBoardRecommendations(); }, 500); return () => clearTimeout(h); } else if (selectedMoodCues.length === 0) { setMoodBoardRecommendations([]); } }, [selectedMoodCues, fetchMoodBoardRecommendations, currentView]);


  const renderDashboard = useCallback(() => (
    <div className="p-4 neumorphic-card space-y-10">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-orbitron text-sakura-pink text-center flex-grow">Welcome, {userProfile?.name || "Explorer"}!</h1>
        <StyledButton onClick={navigateToProfileSettings} variant="secondary_small" title="Profile Settings" className="ml-2">⚙️</StyledButton>
      </div>
      <div className="text-center"><StyledButton onClick={navigateToAIAssistant} variant="primary" className="text-lg px-8 py-4">🤖 Talk to AniMuse AI</StyledButton></div>

      {userProfile?.onboardingCompleted && forYouCategories.map((category) => (
        <div key={category.id} className="mt-2">
          <h2 className="text-2xl font-orbitron text-electric-blue mb-1 text-center">{category.title}</h2>
          {category.reason && <p className="text-sm text-brand-text-secondary text-center mb-3 italic">{category.reason}</p>}
          {category.isLoading && <div className="flex justify-center items-center py-6"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-cyan mr-3"></div>Loading...</div>}
          {category.error && <p className="text-red-400 text-center py-4">{category.error}</p>}
          {!category.isLoading && !category.error && category.recommendations.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.recommendations.map((rec, index) => (
                <AnimeCard key={`${category.id}-${index}-${rec.title}`} anime={rec} isRecommendation={true} onViewDetails={navigateToDetail} />
              ))}
            </div>
          )}
          {!category.isLoading && !category.error && category.recommendations.length === 0 && (
            <div className="text-center p-4 mt-2 neumorphic-card bg-brand-dark shadow-neumorphic-light-inset"><p className="text-brand-text-secondary">No specific recommendations for "{category.title}" right now.</p></div>
          )}
        </div>
      ))}

      <div className="mt-6"> {/* Mood Board Section */}
        <h2 className="text-2xl font-orbitron text-sakura-pink mb-4 text-center">🎨 Mood Board</h2>
        <p className="text-brand-text-secondary text-center mb-4">Select vibes for recommendations!</p>
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          {MOOD_BOARD_CUES.map(cue => <StyledButton key={cue.id} onClick={() => handleMoodCueToggle(cue.label)} variant={selectedMoodCues.includes(cue.label) ? "primary_small" : "secondary_small"} className="text-sm">{cue.emoji} {cue.label}</StyledButton>)}
        </div>
        {isLoadingMoodBoard && <div className="flex justify-center items-center py-6"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-cyan mr-3"></div>Brewing suggestions...</div>}
        {!isLoadingMoodBoard && moodBoardRecommendations.length > 0 && (
          <div>
            <h3 className="text-xl font-orbitron text-neon-cyan mb-3 text-center">Vibes for: {selectedMoodCues.join(" & ")}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {moodBoardRecommendations.map((rec, index) => <AnimeCard key={`mood-${index}-${rec.title}`} anime={rec} isRecommendation={true} onViewDetails={navigateToDetail} />)}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6"> {/* Explore Section */}
        <h2 className="text-2xl font-orbitron text-electric-blue mb-4 text-center">Explore</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-brand-dark rounded-lg shadow-neumorphic-light-inset cursor-pointer hover:shadow-neumorphic-light" onClick={navigateToDiscover}><h3 className="font-orbitron text-neon-cyan mb-2 text-center">🔍 Discover</h3><p className="text-xs text-brand-text-secondary text-center">Browse & filter</p></div>
          <div className="p-4 bg-brand-dark rounded-lg shadow-neumorphic-light-inset cursor-pointer hover:shadow-neumorphic-light" onClick={navigateToWatchlist}><h3 className="font-orbitron text-neon-cyan mb-2 text-center">📚 Watchlist</h3><p className="text-xs text-brand-text-secondary text-center">Your saved anime</p></div>
          <div className="p-4 bg-brand-dark rounded-lg shadow-neumorphic-light-inset cursor-pointer hover:shadow-neumorphic-light" onClick={navigateToCustomListsOverview}><h3 className="font-orbitron text-neon-cyan mb-2 text-center">📜 Custom Lists</h3><p className="text-xs text-brand-text-secondary text-center">Curate & share</p></div>
        </div>
      </div>
      <ProfileStats />
      {isUserAdmin && <div className="mt-8 pt-6 border-t border-brand-surface text-center"><StyledButton onClick={navigateToAdminDashboard} variant="secondary">🛡️ Admin Dashboard</StyledButton></div>}
    </div>
  ), [userProfile, forYouCategories, isLoadingMoodBoard, moodBoardRecommendations, selectedMoodCues, isUserAdmin, navigateToAIAssistant, navigateToDetail, navigateToDiscover, navigateToWatchlist, handleMoodCueToggle, navigateToAdminDashboard, navigateToProfileSettings, navigateToCustomListsOverview]);

  const CreateCustomListModal: React.FC<{ isOpen: boolean; onClose: () => void; onCreate: (name: string, description?: string, isPublic?: boolean) => Promise<void>; }> = ({ isOpen, onClose, onCreate }) => {
    const [name, setName] = useState(""); const [description, setDescription] = useState(""); const [isPublic, setIsPublic] = useState(false); const [isCreating, setIsCreating] = useState(false);
    if (!isOpen) return null;
    const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (!name.trim()) { toast.error("List name required."); return; } setIsCreating(true); await onCreate(name, description, isPublic); setIsCreating(false); setName(""); setDescription(""); setIsPublic(false); };
    return (<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 backdrop-blur-sm"><form onSubmit={handleSubmit} className="neumorphic-card bg-brand-surface p-6 rounded-lg w-full max-w-md space-y-4"><h3 className="text-xl font-orbitron text-sakura-pink mb-1">Create New List</h3><div><label htmlFor="newListName" className="block text-sm text-brand-text-secondary mb-1">Name*</label><input type="text" id="newListName" value={name} onChange={e => setName(e.target.value)} className="neumorphic-input w-full" required/></div><div><label htmlFor="newListDesc" className="block text-sm text-brand-text-secondary mb-1">Description</label><textarea id="newListDesc" value={description} onChange={e => setDescription(e.target.value)} className="neumorphic-input w-full" rows={3}/></div><div className="flex items-center gap-2"><input type="checkbox" id="newListPublic" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="form-checkbox accent-electric-blue h-4 w-4"/><label htmlFor="newListPublic" className="text-sm text-brand-text-secondary">Public</label></div><div className="flex justify-end gap-3 pt-2"><StyledButton type="button" onClick={onClose} variant="secondary_small" disabled={isCreating}>Cancel</StyledButton><StyledButton type="submit" variant="primary_small" disabled={isCreating}>{isCreating ? "..." : "Create"}</StyledButton></div></form></div>);
  };
  const [isCreateListModalOpen, setIsCreateListModalOpen] = useState(false);
  const createCustomListMutation = useMutation(api.users.createCustomList);
  const handleCreateCustomList = async (name: string, description?: string, isPublic?:boolean) => { try { await createCustomListMutation({listName: name, description, isPublic: isPublic || false}); toast.success(`List "${name}" created!`); setIsCreateListModalOpen(false); } catch (error: any) { toast.error(error.data?.message || "Failed to create list."); }};

  const renderCustomListsOverview = useCallback(() => {
    return (
        <div className="p-4 neumorphic-card">
            <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-orbitron text-sakura-pink">My Custom Lists</h2><StyledButton onClick={() => setIsCreateListModalOpen(true)} variant="primary">Create New List</StyledButton></div>
            {myCustomLists === undefined && <LoadingSpinner message="Loading lists..."/>}
            {myCustomLists && myCustomLists.length === 0 && <p className="text-brand-text-secondary text-center">No custom lists yet.</p>}
            {myCustomLists && myCustomLists.length > 0 && (<div className="space-y-3">{myCustomLists.map(list => (<div key={list._id} className="p-3 bg-brand-dark rounded shadow-sm flex justify-between items-center hover:shadow-neumorphic-light"><div><h3 className="text-lg text-neon-cyan cursor-pointer hover:underline" onClick={() => navigateToCustomListDetail(list._id)}>{list.listName}</h3><p className="text-xs text-brand-text-secondary truncate max-w-xs" title={list.description}>{list.description || "No description"}</p><p className="text-xs text-brand-text-secondary">{list.animeIds.length} items | {list.isPublic ? "Public" : "Private"}</p></div><StyledButton onClick={() => navigateToCustomListDetail(list._id)} variant="secondary_small">View/Edit</StyledButton></div>))}</div>)}
            <CreateCustomListModal isOpen={isCreateListModalOpen} onClose={() => setIsCreateListModalOpen(false)} onCreate={handleCreateCustomList} />
        </div>);
  }, [myCustomLists, navigateToCustomListDetail, isCreateListModalOpen, handleCreateCustomList]);

  const CustomListDetailView: React.FC<{listId: Id<"customLists">, onBackToLists: () => void, onViewAnime: (animeId: Id<"anime">) => void}> = ({listId, onBackToLists, onViewAnime}) => {
      const listDetails = useQuery(api.users.getCustomListById, {listId});
      // TODO: Add functions for editing list name/desc/privacy, adding/removing anime
      if (listDetails === undefined) return <LoadingSpinner message="Loading list details..."/>;
      if (listDetails === null) return <div className="text-center p-4">List not found or private. <StyledButton onClick={onBackToLists}>Back to Lists</StyledButton></div>;
      return (
          <div className="p-4 neumorphic-card">
              <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-orbitron text-sakura-pink">{listDetails.listName}</h2><StyledButton variant="secondary_small" onClick={onBackToLists}>← Back to Lists</StyledButton></div>
              <p className="text-sm text-brand-text-secondary mb-1">{listDetails.description || "No description"}</p>
              <p className="text-xs text-brand-text-secondary mb-4">{listDetails.isPublic ? "Public List" : "Private List"} | {listDetails.anime.length} items</p>
              {/* TODO: Edit list details UI */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {listDetails.anime.map(anime => (<AnimeCard key={anime._id} anime={anime} onViewDetails={onViewAnime} /> ))}
              </div>
              {listDetails.anime.length === 0 && <p className="text-brand-text-secondary text-center py-4">This list is empty.</p>}
              {/* TODO: UI to add anime to this list */}
          </div>);
  };

  const renderContent = useCallback(() => {
    switch (currentView) {
      case "ai_assistant": return <AIAssistantPage />;
      case "anime_detail": return selectedAnimeId ? <AnimeDetailPage animeId={selectedAnimeId} onBack={navigateBack} /> : null;
      case "watchlist": return <WatchlistPage onViewDetails={navigateToDetail} onBack={navigateBack} onNavigateToCustomLists={navigateToCustomListsOverview} />;
      case "discover": return <DiscoverPage onViewDetails={navigateToDetail} onBack={navigateBack} />;
      case "admin_dashboard": return <AdminDashboardPage onNavigateBack={navigateToDashboard} />;
      case "profile_settings": return <ProfileSettingsPage onBack={navigateBack} />;
      case "custom_lists_overview": return renderCustomListsOverview();
      case "custom_list_detail": return selectedCustomListId ? <CustomListDetailView listId={selectedCustomListId} onBackToLists={() => navigateTo("custom_lists_overview")} onViewAnime={navigateToDetail}/> : null;
      case "dashboard": default: return renderDashboard();
    }
  }, [currentView, selectedAnimeId, selectedCustomListId, navigateBack, navigateToDetail, navigateToDashboard, renderDashboard, renderCustomListsOverview, navigateToCustomListsOverview]);

  const getDisplayViewName = useCallback((view: CurrentView): string => {
    switch (view) {
      case "ai_assistant": return "🤖 AI Assistant"; case "anime_detail": return "📺 Anime Details"; case "discover": return "🔍 Discover";
      case "watchlist": return "📚 Watchlist"; case "admin_dashboard": return "🛡️ Admin"; case "profile_settings": return "⚙️ Settings";
      case "custom_lists_overview": return "📜 My Lists"; case "custom_list_detail": return "📝 List Details"; case "dashboard": return "🏠 Dashboard";
      default: const _exhaustiveCheck: never = view; return String(view);
    }
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto pb-8">
      {currentView !== "dashboard" && (
        <div className="mb-4 p-2 text-sm text-brand-text-secondary bg-brand-surface/50 rounded-lg flex items-center flex-wrap gap-x-2">
          <button onClick={navigateToDashboard} className="hover:text-neon-cyan">🏠 Dashboard</button>
          { previousView && previousView !== "dashboard" && previousView !== currentView && (
              <> <span className="opacity-50">•</span> <button onClick={navigateBack} className="hover:text-neon-cyan capitalize">{getDisplayViewName(previousView)}</button> </>
          )}
          <span className="opacity-50">•</span>
          <span className="text-neon-cyan capitalize">{getDisplayViewName(currentView)}</span>
        </div>
      )}
      {renderContent()}
    </div>
  );
}