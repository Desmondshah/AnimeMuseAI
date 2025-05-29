// src/components/animuse/MainApp.tsx
import React, { useState, useEffect, useCallback, memo } from "react";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id, Doc } from "../../../convex/_generated/dataModel";
import AnimeDetailPage from "./AnimeDetailPage";
import StyledButton from "./shared/StyledButton";
import WatchlistPage from "./onboarding/WatchlistPage";
import DiscoverPage from "./onboarding/DiscoverPage";
import ProfileStats from "./onboarding/ProfileStats";
import { AnimeRecommendation } from "../../../convex/types";
import { toast } from "sonner";
import AnimeCard from "./AnimeCard"; // Renders poster + banner only
import AdminDashboardPage from "../admin/AdminDashboardPage";
import ProfileSettingsPage from "./onboarding/ProfileSettingsPage";
import EnhancedAIAssistantPage from "./AIAssistantPage";
import BottomNavigationBar from "./BottomNavigationBar";
import MoodboardPage from "./onboarding/MoodboardPage";

const LoadingSpinnerComponent: React.FC<{ message?: string; className?: string }> = ({ message = "Loading...", className = "" }) => (
    <div className={`flex flex-col justify-center items-center py-10 ${className}`}>
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-primary-action"></div>
      {message && <p className="mt-3 text-sm text-brand-text-on-dark/80">{message}</p>}
    </div>
);
const LoadingSpinner = memo(LoadingSpinnerComponent);

export type ValidViewName =
  | "dashboard" | "ai_assistant" | "anime_detail" | "my_list"
  | "browse" | "admin_dashboard" | "profile_settings"
  | "custom_lists_overview" | "custom_list_detail" | "moodboard_page";

export type CurrentView = ValidViewName;

interface WatchlistActivityItem { animeTitle: string; status: string; userRating?: number; }
interface ForYouCategory {
  id: string; title: string; recommendations: AnimeRecommendation[];
  reason?: string; isLoading: boolean; error?: string | null;
  fetchFn?: (args: any) => Promise<{ recommendations: AnimeRecommendation[]; error?: string | null; details?: any }>;
  fetchArgs?: any;
}

export default function MainApp() {
  const userProfile = useQuery(api.users.getMyUserProfile);
  const fullWatchlist = useQuery(api.anime.getMyWatchlist);
  const isUserAdmin = useQuery(api.admin.isCurrentUserAdmin);
  const myCustomLists = useQuery(api.users.getMyCustomLists);
  const getPersonalizedRecommendationsAction = useAction(api.ai.getPersonalizedRecommendations);

  const [currentView, setCurrentView] = useState<CurrentView>("dashboard");
  const [selectedAnimeId, setSelectedAnimeId] = useState<Id<"anime"> | null>(null);
  const [selectedCustomListId, setSelectedCustomListId] = useState<Id<"customLists"> | null>(null);
  const [historyStack, setHistoryStack] = useState<CurrentView[]>(["dashboard"]);

  const [forYouCategories, setForYouCategories] = useState<ForYouCategory[]>([]);
  const [hasFetchedForYou, setHasFetchedForYou] = useState(false);

  // Add moodboard state
  const [moodboardState, setMoodboardState] = useState({
    selectedMoodCues: [] as string[],
    recommendations: [] as AnimeRecommendation[],
    isLoading: false,
  });

  // Moodboard state handlers
  const handleMoodCuesChange = useCallback((cues: string[]) => {
    setMoodboardState(prev => ({ 
      ...prev, 
      selectedMoodCues: cues,
      // Clear recommendations when cues change to force re-fetch
      recommendations: cues.length === 0 ? [] : prev.recommendations
    }));
  }, []);

  const handleMoodboardRecommendationsChange = useCallback((recs: AnimeRecommendation[]) => {
    setMoodboardState(prev => ({ ...prev, recommendations: recs }));
  }, []);

  const handleMoodboardLoadingChange = useCallback((loading: boolean) => {
    setMoodboardState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  // ... existing navigation functions ...
  const navigateTo = useCallback((view: CurrentView, options?: { replace?: boolean; data?: any }) => {
    window.scrollTo(0, 0);
    if (options?.replace) {
        setHistoryStack(prev => {
            const newStack = [...prev.slice(0, -1), view];
            return newStack.length > 0 ? newStack : [view];
        });
    } else if (historyStack.length === 0 || historyStack[historyStack.length - 1] !== view) {
        setHistoryStack(prev => [...prev, view]);
    }
    setCurrentView(view);
    if (view !== "anime_detail") setSelectedAnimeId(null);
    if (view !== "custom_list_detail") setSelectedCustomListId(null);
  }, [historyStack]);

  const navigateBack = useCallback(() => {
    if (historyStack.length > 1) {
      const newStack = historyStack.slice(0, -1);
      const previousView = newStack[newStack.length - 1];
      setHistoryStack(newStack);
      setCurrentView(previousView);
      window.scrollTo(0,0);
      if (previousView !== "anime_detail") setSelectedAnimeId(null);
      if (previousView !== "custom_list_detail") setSelectedCustomListId(null);
    } else {
      navigateTo("dashboard", {replace: true});
    }
  }, [historyStack, navigateTo]);

  const navigateToDetail = useCallback((animeId: Id<"anime">) => { navigateTo("anime_detail"); setSelectedAnimeId(animeId); }, [navigateTo]);
  const navigateToDashboard = useCallback(() => navigateTo("dashboard"), [navigateTo]);
  const navigateToBrowse = useCallback(() => navigateTo("browse"), [navigateTo]);
  const navigateToMyList = useCallback(() => navigateTo("my_list"), [navigateTo]);
  const navigateToAIAssistant = useCallback(() => navigateTo("ai_assistant"), [navigateTo]);
  const navigateToAdminDashboard = useCallback(() => navigateTo("admin_dashboard"), [navigateTo]);
  const navigateToProfileSettings = useCallback(() => navigateTo("profile_settings"), [navigateTo]);
  const navigateToCustomListsOverview = useCallback(() => navigateTo("custom_lists_overview"), [navigateTo]);
  const navigateToCustomListDetail = useCallback((listId: Id<"customLists">) => { navigateTo("custom_list_detail"); setSelectedCustomListId(listId); }, [navigateTo]);

  const handleTabChange = (view: ValidViewName) => {
    navigateTo(view);
  };

  useEffect(() => {
    const fetchCategoryData = async (categoryToUpdate: ForYouCategory) => {
      if (!userProfile || !categoryToUpdate.fetchFn) {
        setForYouCategories(prev => prev.map(c => c.id === categoryToUpdate.id ? {...c, isLoading: false, error: "User profile not ready or fetch function missing."} : c));
        return;
      }
      setForYouCategories(prev => prev.map(c => c.id === categoryToUpdate.id ? { ...c, isLoading: true, error: null } : c));
      try {
        const profileDataForAI = {
            name: userProfile.name, moods: userProfile.moods, genres: userProfile.genres,
            favoriteAnimes: userProfile.favoriteAnimes, experienceLevel: userProfile.experienceLevel,
            dislikedGenres: userProfile.dislikedGenres, dislikedTags: userProfile.dislikedTags,
            characterArchetypes: userProfile.characterArchetypes, tropes: userProfile.tropes,
            artStyles: userProfile.artStyles, narrativePacing: userProfile.narrativePacing,
        };
        const watchlistActivity: WatchlistActivityItem[] = fullWatchlist?.filter(item => item.anime).map(item => ({ animeTitle: item.anime!.title, status: item.status, userRating: item.userRating })).slice(0, 10) || [];
        const result = await categoryToUpdate.fetchFn({ ...categoryToUpdate.fetchArgs, userProfile: profileDataForAI, watchlistActivity });
        setForYouCategories(prev => prev.map(c => c.id === categoryToUpdate.id ? { ...c, recommendations: result.recommendations || [], isLoading: false, error: result.error } : c));
        if (result.error && result.error !== "OpenAI API key not configured.") { toast.error(`Personalized: ${result.error.substring(0,60)}`); }
      } catch (e: any) {
        setForYouCategories(prev => prev.map(c => c.id === categoryToUpdate.id ? { ...c, isLoading: false, error: e.message || "Unknown fetch error" } : c));
        toast.error(`Failed personalized fetch for "${categoryToUpdate.title}".`);
      }
    };

    if (userProfile && userProfile.onboardingCompleted && !hasFetchedForYou && currentView === "dashboard") {
      const personalizedCategorySetup: ForYouCategory = {
          id: "generalPersonalized", title: "✨ Personalized For You", recommendations: [], isLoading: true, error: null,
          fetchFn: getPersonalizedRecommendationsAction,
          fetchArgs: { count: 7, messageId: `foryou-general-${Date.now()}` },
          reason: "Tailored based on your profile and activity."
      };
      setForYouCategories([personalizedCategorySetup]); // Initialize with the category
      fetchCategoryData(personalizedCategorySetup);     // Then fetch data for it
      setHasFetchedForYou(true); // Mark as fetched to prevent re-fetching on navigation
    }
  }, [userProfile, currentView, hasFetchedForYou, getPersonalizedRecommendationsAction, fullWatchlist]);


  const renderDashboard = useCallback(() => (
    <div className="bg-brand-surface text-brand-text-on-dark rounded-xl shadow-xl p-4 sm:p-6 space-y-8 md:space-y-10">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl sm:text-3xl font-heading text-brand-primary-action">
          Welcome, {userProfile?.name || "Explorer"}!
        </h1>
      </div>
      <div className="text-center">
        <StyledButton onClick={navigateToAIAssistant} variant="primary" className="text-base sm:text-lg px-6 py-3 sm:px-8 sm:py-3.5 shadow-lg">
          🤖 Talk to AniMuse AI
        </StyledButton>
      </div>

      {userProfile?.onboardingCompleted &&
        forYouCategories.filter(cat => cat.id === "generalPersonalized").map((category) => (
          <div key={category.id} className="mt-2">
            <h2 className="text-xl sm:text-2xl font-heading text-brand-accent-gold mb-1 text-center">{category.title}</h2>
            {category.reason && <p className="text-xs sm:text-sm text-brand-text-on-dark/70 text-center mb-3 sm:mb-4 italic">{category.reason}</p>}
            {category.isLoading && <LoadingSpinner message="Personalizing..." className="text-brand-text-on-dark/80" />}
            {category.error && <div className="text-center p-4 mt-2 bg-red-900/20 border border-red-500/20 rounded-lg"><p className="text-sm text-red-400">Could not load recommendations: {category.error}</p></div>}
            {!category.isLoading && !category.error && category.recommendations.length > 0 && (
              <div className="flex overflow-x-auto space-x-2.5 sm:space-x-3 py-2 custom-scrollbar horizontal-carousel -mx-4 px-4 sm:-mx-6 sm:px-6">
                {category.recommendations.map((rec, index) => (
                  <div key={`${category.id}-${index}-${rec.title}`} className="flex-shrink-0 w-28 xs:w-32 sm:w-36 flex flex-col items-center">
                    <AnimeCard anime={rec} isRecommendation={true} onViewDetails={navigateToDetail} className="w-full"/>
                    {/* Title rendered below the poster, on the dashboard's dark background */}
                    <h4
                      className="mt-1.5 text-xs text-center text-brand-text-on-dark w-full truncate px-1"
                      title={rec.title}
                    >
                      {rec.title}
                    </h4>
                  </div>
                ))}
              </div>
            )}
            {!category.isLoading && !category.error && category.recommendations.length === 0 && (
               <div className="text-center p-4 mt-2 bg-brand-accent-peach/20 rounded-lg">
                 <p className="text-sm text-brand-text-on-dark/80">We're personalizing your feed! Check back soon.<br/><span className="text-xs">(Or try exploring!)</span></p>
               </div>
            )}
          </div>
      ))}
      <ProfileStats />
      {isUserAdmin && <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-brand-accent-peach/30 text-center">
        <StyledButton onClick={navigateToAdminDashboard} variant="secondary" className="!border-brand-accent-gold !text-brand-accent-gold hover:!bg-brand-accent-gold hover:!text-brand-surface">
            🛡️ Admin Dashboard
        </StyledButton>
      </div>}
    </div>
  ), [userProfile, forYouCategories, isUserAdmin, navigateToAIAssistant, navigateToDetail, navigateToAdminDashboard, navigateToProfileSettings]);

  const CreateCustomListModal: React.FC<{ isOpen: boolean; onClose: () => void; onCreate: (name: string, description?: string, isPublic?: boolean) => Promise<void>; }> = ({ isOpen, onClose, onCreate }) => {
    const [name, setName] = useState(""); const [description, setDescription] = useState(""); const [isPublic, setIsPublic] = useState(false); const [isCreating, setIsCreating] = useState(false);
    useEffect(() => { if (isOpen) { setName(""); setDescription(""); setIsPublic(false); setIsCreating(false); } }, [isOpen]);
    if (!isOpen) return null;
    const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (!name.trim()) { toast.error("List name required."); return; } setIsCreating(true); await onCreate(name, description, isPublic); };
    return (
      <div className="fixed inset-0 bg-brand-background/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
        <form onSubmit={handleSubmit} className="bg-brand-surface text-brand-text-on-dark p-5 sm:p-6 rounded-xl shadow-2xl w-full max-w-md space-y-4">
          <h3 className="text-xl font-heading text-brand-primary-action mb-2">Create New List</h3>
          <div><label htmlFor="newListName" className="block text-sm font-medium text-brand-text-on-dark/80 mb-1">Name*</label><input type="text" id="newListName" value={name} onChange={e => setName(e.target.value)} className="form-input w-full" required/></div>
          <div><label htmlFor="newListDesc" className="block text-sm font-medium text-brand-text-on-dark/80 mb-1">Description</label><textarea id="newListDesc" value={description} onChange={e => setDescription(e.target.value)} className="form-input w-full" rows={3}/></div>
          <div className="flex items-center gap-2"><input type="checkbox" id="newListPublic" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="form-checkbox accent-brand-primary-action h-4 w-4 rounded text-brand-primary-action focus:ring-brand-primary-action focus:ring-offset-brand-surface"/><label htmlFor="newListPublic" className="text-sm text-brand-text-on-dark/90">Make this list public</label></div>
          <div className="flex justify-end gap-3 pt-2"><StyledButton type="button" onClick={onClose} variant="secondary_small" disabled={isCreating}>Cancel</StyledButton><StyledButton type="submit" variant="primary_small" disabled={isCreating}>{isCreating ? "Creating..." : "Create List"}</StyledButton></div>
        </form>
      </div>);
   };
  const [isCreateListModalOpen, setIsCreateListModalOpen] = useState(false);
  const createCustomListMutation = useMutation(api.users.createCustomList);
  const handleCreateCustomList = async (name: string, description?: string, isPublic?:boolean) => { try { await createCustomListMutation({listName: name, description, isPublic: isPublic || false}); toast.success(`List "${name}" created!`); setIsCreateListModalOpen(false); } catch (error: any) { toast.error(error.data?.message || "Failed to create list."); }};

  const renderCustomListsOverview = useCallback(() => {
    return (
        <div className="bg-brand-surface text-brand-text-on-dark rounded-xl shadow-xl p-4 sm:p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl sm:text-2xl font-heading text-brand-primary-action">My Custom Lists</h2>
                <StyledButton onClick={() => setIsCreateListModalOpen(true)} variant="primary">Create New List</StyledButton>
            </div>
            {myCustomLists === undefined && <LoadingSpinner message="Loading lists..." className="text-brand-text-on-dark/80" />}
            {myCustomLists && myCustomLists.length === 0 && <p className="text-brand-text-on-dark/70 text-center py-5">No custom lists yet. Create one to get started!</p>}
            {myCustomLists && myCustomLists.length > 0 && (
                <div className="space-y-3 sm:space-y-4">
                    {myCustomLists.map(list => (
                        <div key={list._id} className="p-3 sm:p-4 bg-brand-accent-peach/20 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:shadow-md transition-shadow">
                            <div className="flex-grow min-w-0"><h3 className="text-lg font-heading text-brand-primary-action cursor-pointer hover:underline" onClick={() => navigateToCustomListDetail(list._id)}>{list.listName}</h3><p className="text-xs text-brand-text-on-dark/70 truncate" title={list.description}>{list.description || "No description"}</p><p className="text-xs text-brand-text-on-dark/60 mt-0.5">{list.animeIds.length} items • {list.isPublic ? "Public" : "Private"}</p></div>
                            <StyledButton onClick={() => navigateToCustomListDetail(list._id)} variant="secondary_small" className="mt-2 sm:mt-0 flex-shrink-0">View/Edit</StyledButton>
                        </div>
                    ))}
                </div>
            )}
            <CreateCustomListModal isOpen={isCreateListModalOpen} onClose={() => setIsCreateListModalOpen(false)} onCreate={handleCreateCustomList} />
        </div>);
  }, [myCustomLists, navigateToCustomListDetail, isCreateListModalOpen, handleCreateCustomList]);

  const CustomListDetailView: React.FC<{listId: Id<"customLists">, onBackToLists: () => void, onViewAnime: (animeId: Id<"anime">) => void}> = ({listId, onBackToLists, onViewAnime}) => {
      const listDetails = useQuery(api.users.getCustomListById, {listId});
      if (listDetails === undefined) return <LoadingSpinner message="Loading list details..." className="text-brand-text-on-dark/80"/>;
      if (listDetails === null) return <div className="bg-brand-surface text-brand-text-on-dark rounded-xl shadow-xl p-6 text-center"><p className="mb-4">List not found or private.</p><StyledButton onClick={onBackToLists} variant="primary">Back to Lists</StyledButton></div>;
      return (
          <div className="bg-brand-surface text-brand-text-on-dark rounded-xl shadow-xl p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-2"><h2 className="text-xl sm:text-2xl font-heading text-brand-primary-action">{listDetails.listName}</h2></div>
              <p className="text-sm text-brand-text-on-dark/80 mb-1">{listDetails.description || "No description"}</p><p className="text-xs text-brand-text-on-dark/60 mb-6">{listDetails.isPublic ? "Public List" : "Private List"} • {listDetails.anime.length} items</p>
              {listDetails.anime.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-5 sm:gap-x-4 sm:gap-y-6">
                  {listDetails.anime.map(animeDoc => (
                    <div key={animeDoc._id} className="flex flex-col items-center">
                        <AnimeCard anime={animeDoc} onViewDetails={onViewAnime} className="w-full"/>
                        <h4
                          className="mt-1.5 text-xs text-center text-brand-text-on-dark w-full truncate px-1"
                          title={animeDoc.title}
                        >
                          {animeDoc.title}
                        </h4>
                    </div>
                  ))}
                </div>
              ) : (<p className="text-brand-text-on-dark/70 text-center py-8">This list is empty. Add some anime!</p>)}
          </div>);
  };

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
          />
        ) : <LoadingSpinner className="text-brand-text-on-dark/80"/>;
      case "my_list": 
        return <WatchlistPage onViewDetails={navigateToDetail} onBack={() => navigateTo(previousViewForBack, {replace: true})} onNavigateToCustomLists={navigateToCustomListsOverview} />;
      case "browse": 
        return <DiscoverPage onViewDetails={navigateToDetail} onBack={() => navigateTo(previousViewForBack, {replace: true})} />;
      case "admin_dashboard": 
        return <AdminDashboardPage onNavigateBack={navigateToDashboard} />;
      case "profile_settings": 
        return <ProfileSettingsPage onBack={() => navigateTo(previousViewForBack, {replace: true})} />;
      case "custom_lists_overview": 
        return renderCustomListsOverview();
      case "custom_list_detail": 
        return selectedCustomListId ? (
          <CustomListDetailView 
            listId={selectedCustomListId} 
            onBackToLists={() => navigateTo("my_list")} 
            onViewAnime={navigateToDetail}
          />
        ) : <LoadingSpinner className="text-brand-text-on-dark/80"/>;
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
    navigateBack, 
    navigateToDetail, 
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

  return (
    <div className="w-full pb-20">
       <div className="pt-0">
         {renderContent()}
       </div>
      <BottomNavigationBar currentView={currentView} onTabChange={handleTabChange} />
    </div>
  );
}