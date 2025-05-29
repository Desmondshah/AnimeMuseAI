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
      {message && <p className="mt-3 text-sm text-white">{message}</p>}
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
    <div className="relative min-h-screen">
      {/* Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-80 h-80 bg-gradient-to-br from-brand-primary-action/15 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-16 w-96 h-96 bg-gradient-to-tr from-brand-accent-gold/12 to-transparent rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/3 right-1/5 w-64 h-64 bg-gradient-to-l from-brand-accent-peach/10 to-transparent rounded-full blur-3xl animate-pulse delay-2000"></div>
        <div className="absolute bottom-1/2 left-1/4 w-72 h-72 bg-gradient-to-r from-purple-500/8 to-transparent rounded-full blur-3xl animate-pulse delay-3000"></div>
        <div className="absolute top-20 right-1/3 w-56 h-56 bg-gradient-to-bl from-cyan-400/8 to-transparent rounded-full blur-3xl animate-pulse delay-4000"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-4 sm:px-6 py-8 space-y-12">
        {/* Hero Welcome Section */}
        <div className="text-center space-y-6">
          <div className="inline-block group">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-bold bg-gradient-to-r from-white via-brand-accent-gold via-brand-primary-action to-white bg-clip-text text-transparent animate-pulse">
              Welcome, {userProfile?.name || "Explorer"}!
            </h1>
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-brand-primary-action via-brand-accent-gold to-transparent mt-4 animate-pulse group-hover:animate-none group-hover:opacity-100 opacity-80 transition-opacity duration-500"></div>
          </div>
          <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
            Your personalized anime universe awaits. Let's discover something extraordinary together.
          </p>
        </div>

        {/* AI Assistant CTA */}
        <div className="flex justify-center">
          <div className="relative group">
            {/* Glow Effect */}
            <div className="absolute -inset-2 bg-gradient-to-r from-brand-primary-action/50 to-brand-accent-gold/50 rounded-3xl blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            {/* Button */}
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
          </div>
        </div>

        {/* Personalized Recommendations Section */}
        {userProfile?.onboardingCompleted &&
          forYouCategories.filter(cat => cat.id === "generalPersonalized").map((category) => (
            <div key={category.id} className="space-y-8">
              {/* Section Header */}
              <div className="text-center space-y-4">
                <div className="inline-block">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading text-white font-bold mb-2">
                    {category.title}
                  </h2>
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
                  <div className="bg-red-900/20 backdrop-blur-sm border border-red-500/30 rounded-3xl p-8 max-w-md mx-auto">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h3 className="text-xl font-heading text-red-400 mb-2">Oops!</h3>
                    <p className="text-red-300 text-sm">{category.error}</p>
                  </div>
                </div>
              )}

              {/* Recommendations Grid */}
              {!category.isLoading && !category.error && category.recommendations.length > 0 && (
                <div className="relative">
                  {/* Gradient Borders */}
                  <div className="absolute inset-0 bg-gradient-to-r from-brand-primary-action/20 via-transparent to-brand-accent-gold/20 rounded-3xl blur-xl"></div>
                  
                  <div className="relative bg-black/20 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-8">
                    <div className="flex overflow-x-auto space-x-6 sm:space-x-8 py-4 custom-scrollbar horizontal-carousel -mx-2 px-2">
                      {category.recommendations.map((rec, index) => (
                        <div 
                          key={`${category.id}-${index}-${rec.title}`} 
                          className="group flex-shrink-0 w-32 xs:w-36 sm:w-40 transform transition-all duration-500 hover:scale-110"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          {/* Card Glow Effect */}
                          <div className="absolute -inset-3 bg-gradient-to-r from-brand-primary-action/30 to-brand-accent-gold/30 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          
                          <div className="relative bg-black/30 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10 group-hover:border-white/30 transition-all duration-300">
                            {/* Anime Poster */}
                            <div className="relative">
                              <AnimeCard 
                                anime={rec} 
                                isRecommendation={true} 
                                onViewDetails={navigateToDetail} 
                                className="w-full"
                              />
                              {/* Overlay Gradient */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            </div>
                            
                            {/* Title Section */}
                            <div className="p-3 bg-gradient-to-t from-black/80 to-transparent">
                              <h4 
                                className="text-sm font-medium text-white text-center truncate group-hover:text-brand-accent-gold transition-colors duration-300"
                                title={rec.title}
                              >
                                {rec.title}
                              </h4>
                              {/* Hover Action Hint */}
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 mt-1">
                                <p className="text-xs text-white/60 text-center">Click to explore</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!category.isLoading && !category.error && category.recommendations.length === 0 && (
                <div className="text-center py-16">
                  <div className="bg-black/30 backdrop-blur-sm rounded-3xl p-12 border border-white/10 max-w-md mx-auto">
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
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        }

        {/* Profile Stats Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-brand-accent-peach/20 via-transparent to-brand-primary-action/20 rounded-3xl blur-xl"></div>
          <div className="relative">
            <ProfileStats />
          </div>
        </div>

        {/* Admin Section */}
        {isUserAdmin && (
          <div className="text-center">
            <div className="relative inline-block group">
              {/* Admin Badge Glow */}
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

        {/* Bottom Spacer for Navigation */}
        <div className="h-24"></div>
      </div>
    </div>
  ), [userProfile, forYouCategories, isUserAdmin, navigateToAIAssistant, navigateToDetail, navigateToAdminDashboard, navigateToBrowse]);

  const CreateCustomListModal: React.FC<{ isOpen: boolean; onClose: () => void; onCreate: (name: string, description?: string, isPublic?: boolean) => Promise<void>; }> = ({ isOpen, onClose, onCreate }) => {
    const [name, setName] = useState(""); const [description, setDescription] = useState(""); const [isPublic, setIsPublic] = useState(false); const [isCreating, setIsCreating] = useState(false);
    useEffect(() => { if (isOpen) { setName(""); setDescription(""); setIsPublic(false); setIsCreating(false); } }, [isOpen]);
    if (!isOpen) return null;
    const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (!name.trim()) { toast.error("List name required."); return; } setIsCreating(true); await onCreate(name, description, isPublic); };
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
        <form onSubmit={handleSubmit} className="bg-brand-surface text-white p-5 sm:p-6 rounded-xl shadow-2xl w-full max-w-md space-y-4">
          <h3 className="text-xl font-heading text-brand-primary-action mb-2">Create New List</h3>
          <div><label htmlFor="newListName" className="block text-sm font-medium text-white mb-1">Name*</label><input type="text" id="newListName" value={name} onChange={e => setName(e.target.value)} className="form-input w-full" required/></div>
          <div><label htmlFor="newListDesc" className="block text-sm font-medium text-white mb-1">Description</label><textarea id="newListDesc" value={description} onChange={e => setDescription(e.target.value)} className="form-input w-full" rows={3}/></div>
          <div className="flex items-center gap-2"><input type="checkbox" id="newListPublic" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="form-checkbox accent-brand-primary-action h-4 w-4 rounded text-brand-primary-action focus:ring-brand-primary-action focus:ring-offset-brand-surface"/><label htmlFor="newListPublic" className="text-sm text-white">Make this list public</label></div>
          <div className="flex justify-end gap-3 pt-2"><StyledButton type="button" onClick={onClose} variant="secondary_small" disabled={isCreating}>Cancel</StyledButton><StyledButton type="submit" variant="primary_small" disabled={isCreating}>{isCreating ? "Creating..." : "Create List"}</StyledButton></div>
        </form>
      </div>);
   };
  const [isCreateListModalOpen, setIsCreateListModalOpen] = useState(false);
  const createCustomListMutation = useMutation(api.users.createCustomList);
  const handleCreateCustomList = async (name: string, description?: string, isPublic?:boolean) => { try { await createCustomListMutation({listName: name, description, isPublic: isPublic || false}); toast.success(`List "${name}" created!`); setIsCreateListModalOpen(false); } catch (error: any) { toast.error(error.data?.message || "Failed to create list."); }};

  const renderCustomListsOverview = useCallback(() => {
    return (
        <div className="bg-brand-surface text-white rounded-xl shadow-xl p-4 sm:p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl sm:text-2xl font-heading text-brand-primary-action">My Custom Lists</h2>
                <StyledButton onClick={() => setIsCreateListModalOpen(true)} variant="primary">Create New List</StyledButton>
            </div>
            {myCustomLists === undefined && <LoadingSpinner message="Loading lists..." className="text-white" />}
            {myCustomLists && myCustomLists.length === 0 && <p className="text-white text-center py-5">No custom lists yet. Create one to get started!</p>}
            {myCustomLists && myCustomLists.length > 0 && (
                <div className="space-y-3 sm:space-y-4">
                    {myCustomLists.map(list => (
                        <div key={list._id} className="p-3 sm:p-4 bg-brand-accent-peach/20 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:shadow-md transition-shadow">
                            <div className="flex-grow min-w-0"><h3 className="text-lg font-heading text-brand-primary-action cursor-pointer hover:underline" onClick={() => navigateToCustomListDetail(list._id)}>{list.listName}</h3><p className="text-xs text-white truncate" title={list.description}>{list.description || "No description"}</p><p className="text-xs text-white/70 mt-0.5">{list.animeIds.length} items • {list.isPublic ? "Public" : "Private"}</p></div>
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
      if (listDetails === undefined) return <LoadingSpinner message="Loading list details..." className="text-white"/>;
      if (listDetails === null) return <div className="bg-brand-surface text-white rounded-xl shadow-xl p-6 text-center"><p className="mb-4">List not found or private.</p><StyledButton onClick={onBackToLists} variant="primary">Back to Lists</StyledButton></div>;
      return (
          <div className="bg-brand-surface text-white rounded-xl shadow-xl p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-2"><h2 className="text-xl sm:text-2xl font-heading text-brand-primary-action">{listDetails.listName}</h2></div>
              <p className="text-sm text-white mb-1">{listDetails.description || "No description"}</p><p className="text-xs text-white/70 mb-6">{listDetails.isPublic ? "Public List" : "Private List"} • {listDetails.anime.length} items</p>
              {listDetails.anime.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-5 sm:gap-x-4 sm:gap-y-6">
                  {listDetails.anime.map(animeDoc => (
                    <div key={animeDoc._id} className="flex flex-col items-center">
                        <AnimeCard anime={animeDoc} onViewDetails={onViewAnime} className="w-full"/>
                        <h4
                          className="mt-1.5 text-xs text-center text-white w-full truncate px-1"
                          title={animeDoc.title}
                        >
                          {animeDoc.title}
                        </h4>
                    </div>
                  ))}
                </div>
              ) : (<p className="text-white text-center py-8">This list is empty. Add some anime!</p>)}
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
        ) : <LoadingSpinner className="text-white"/>;
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
        ) : <LoadingSpinner className="text-white"/>;
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