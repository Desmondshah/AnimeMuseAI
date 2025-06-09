// src/components/animuse/AnimeDetailPage.tsx - Complete iOS-Optimized Version with Extended Background
import React, { useState, useEffect, useCallback, memo, useRef, Component } from "react";
import { useQuery, useMutation, useAction, useConvexAuth, usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id, Doc } from "../../../convex/_generated/dataModel";
import StyledButton from "./shared/StyledButton";
import { toast } from "sonner";
import ReviewCard, { ReviewProps as ClientReviewProps } from "./onboarding/ReviewCard";
import ReviewForm from "./onboarding/ReviewForm";
import AnimeCard from "./AnimeCard";
import { AnimeRecommendation } from "../../../convex/types";
import { formatDistanceToNow } from 'date-fns';
import CharacterDetailPage from "./onboarding/CharacterDetailPage";
import { useMobileOptimizations } from "../../../convex/useMobileOptimizations";

// Error Boundary Component for Character Detail Page
class CharacterDetailErrorBoundary extends Component<
  { children: React.ReactNode; onError: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error("CharacterDetailPage Error:", error);
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("CharacterDetailPage Error Details:", error, errorInfo);
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-brand-background flex items-center justify-center p-6">
          <div className="bg-black/60 backdrop-blur-lg border border-white/20 rounded-3xl p-8 text-center max-w-md mx-auto">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-red-400 mb-4">Character Page Error</h2>
            <p className="mb-6 text-sm text-red-300">
              Unable to load character details. This might be due to incomplete character data.
            </p>
            <StyledButton 
              onClick={this.props.onError} 
              variant="primary"
              className="!bg-gradient-to-r !from-brand-primary-action !to-brand-accent-gold"
            >
              Back to Anime Details
            </StyledButton>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface BackendReviewProps extends Doc<"reviews"> {
  userName: string; userAvatarUrl?: string; upvotes: number; downvotes: number;
  currentUserVote: "up" | "down" | null; commentCount: number;
}

interface BackendCommentProps extends Doc<"reviewComments"> {
  userName: string; userAvatarUrl?: string;
  replies: (Doc<"reviewComments"> & { userName: string; userAvatarUrl?: string })[];
}

interface AnimeDetailPageProps {
  animeId: Id<"anime">; 
  onBack: () => void;
  navigateToDetail: (animeId: Id<"anime">) => void;
  onCharacterClick: (character: any, animeName: string) => void;
}

interface CustomListType {
  _id: Id<"customLists">;
  listName: string;
  description?: string;
  isPublic: boolean;
  animeIds: Id<"anime">[];
}

interface EnhancedCharacterType {
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
  isAIEnriched?: boolean;
  personalityAnalysis?: string;
  keyRelationships?: Array<{
    relatedCharacterName: string;
    relationshipDescription: string;
    relationType: string;
  }>;
  detailedAbilities?: Array<{
    abilityName: string;
    abilityDescription: string;
    powerLevel?: string;
  }>;
  majorCharacterArcs?: string[];
  trivia?: string[];
  backstoryDetails?: string;
  characterDevelopment?: string;
  notableQuotes?: string[];
  symbolism?: string;
  fanReception?: string;
  culturalSignificance?: string;
  enrichmentTimestamp?: number;
}

// Smart refresh indicator component
const DataFreshnessIndicator: React.FC<{ 
  freshnessScore: number; 
  priority: string; 
  lastFetched?: number; 
  isRefreshing?: boolean;
  onRefresh?: () => void;
}> = ({ freshnessScore, priority, lastFetched, isRefreshing, onRefresh }) => {
  const getStatusColor = () => {
    if (priority === "critical") return "text-red-400 bg-red-500/20 border-red-500/30";
    if (priority === "high") return "text-orange-400 bg-orange-500/20 border-orange-500/30";
    if (priority === "medium") return "text-yellow-400 bg-yellow-500/20 border-yellow-500/30";
    if (priority === "low") return "text-blue-400 bg-blue-500/20 border-blue-500/30";
    return "text-green-400 bg-green-500/20 border-green-500/30";
  };

  const getStatusIcon = () => {
    if (isRefreshing) return "🔄";
    if (priority === "critical") return "⚠️";
    if (priority === "high") return "📊";
    if (priority === "medium") return "📈";
    if (priority === "low") return "📉";
    return "✅";
  };

  const getStatusText = () => {
    if (isRefreshing) return "Updating...";
    if (priority === "critical") return "Critical Update Needed";
    if (priority === "high") return "Update Recommended";
    if (priority === "medium") return "Consider Updating";
    if (priority === "low") return "Minor Updates Available";
    return "Data is Fresh";
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs border backdrop-blur-sm ${getStatusColor()}`}>
      <span className={isRefreshing ? "animate-spin" : ""}>{getStatusIcon()}</span>
      <span className="font-medium">{getStatusText()}</span>
      {lastFetched && (
        <span className="opacity-75">
          • {formatDistanceToNow(new Date(lastFetched), { addSuffix: true })}
        </span>
      )}
      {onRefresh && priority !== "skip" && !isRefreshing && (
        <button
          onClick={onRefresh}
          className="ml-1 opacity-75 hover:opacity-100 transition-opacity"
          title="Refresh now"
        >
          🔄
        </button>
      )}
    </div>
  );
};

// iOS-style loading component
const IOSLoadingSpinner: React.FC<{ message?: string }> = memo(({ message = "Loading..." }) => (
  <div className="ios-loading-spinner flex flex-col justify-center items-center py-16">
    <div className="relative">
      <div className="w-20 h-20 border-4 border-transparent border-t-brand-primary-action border-r-brand-accent-gold rounded-full animate-spin"></div>
      <div className="absolute top-2 left-2 w-16 h-16 border-4 border-transparent border-b-brand-accent-peach border-l-white/50 rounded-full animate-spin animate-reverse"></div>
      <div className="absolute top-6 left-6 w-8 h-8 bg-gradient-to-r from-brand-primary-action to-brand-accent-gold rounded-full animate-pulse"></div>
    </div>
    <p className="mt-4 text-lg text-white/80 font-medium animate-pulse">{message}</p>
  </div>
));

// iOS-style tab bar component
const IOSTabBar: React.FC<{
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: Array<{ id: string; label: string; icon: string }>;
}> = ({ activeTab, onTabChange, tabs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  return (
    <div className="ios-tab-bar sticky top-0 z-50 bg-black/40 backdrop-blur-lg border-b border-white/20">
      <div 
        ref={scrollRef}
        className="flex overflow-x-auto scrollbar-hide px-4 py-3 gap-2"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`ios-tab-button flex-shrink-0 px-4 py-2 rounded-2xl text-sm font-medium transition-all duration-300 ${
              activeTab === tab.id 
                ? 'bg-gradient-to-r from-brand-primary-action to-brand-accent-gold text-white shadow-lg' 
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// Enhanced character card component
const CharacterCard: React.FC<{
  character: EnhancedCharacterType;
  onClick: () => void;
}> = memo(({ character, onClick }) => {
  // Safety check for character data
  if (!character || !character.name) {
    return null;
  }

  return (
    <div
      onClick={onClick}
      className="group relative bg-black/60 backdrop-blur-lg border border-white/20 rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 hover:scale-105"
    >
      {/* Character Image */}
      <div className="relative aspect-[3/4] overflow-hidden">
        {character.imageUrl ? (
          <img
            src={character.imageUrl}
            alt={character.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://placehold.co/300x400/ECB091/321D0B/png?text=${encodeURIComponent(character.name.charAt(0))}&font=poppins`;
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand-primary-action/30 to-brand-accent-gold/30 flex items-center justify-center">
            <span className="text-4xl font-bold text-white/60">
              {character.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Role badge */}
        <div className="absolute top-3 right-3">
          <span className={`text-xs px-2 py-1 rounded-full font-medium backdrop-blur-sm border ${
            character.role === "MAIN" 
              ? "bg-yellow-500/80 text-yellow-100 border-yellow-400/50" 
              : character.role === "SUPPORTING"
              ? "bg-blue-500/80 text-blue-100 border-blue-400/50"
              : "bg-gray-500/80 text-gray-100 border-gray-400/50"
          }`}>
            {character.role === "MAIN" && "⭐"}
            {character.role === "SUPPORTING" && "🎭"}
            {character.role === "BACKGROUND" && "👤"}
            <span className="ml-1">{character.role || "Unknown"}</span>
          </span>
        </div>

        {/* AI Enhancement badge */}
        {character.isAIEnriched && (
          <div className="absolute top-3 left-3">
            <span className="text-xs px-2 py-1 rounded-full font-medium backdrop-blur-sm bg-gradient-to-r from-purple-500/90 to-blue-500/90 text-purple-100 border border-purple-400/50">
              🤖 <span className="ml-1">AI</span>
            </span>
          </div>
        )}

        {/* Hover content */}
        <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2">
            {character.name}
          </h3>
          {character.description && (
            <p className="text-white/80 text-sm line-clamp-3 mb-3">
              {character.description}
            </p>
          )}
          <div className="flex items-center gap-2 text-xs text-white/70">
            {character.age && <span>Age: {character.age}</span>}
            {character.age && character.gender && <span>•</span>}
            {character.gender && <span>{character.gender}</span>}
          </div>
        </div>
      </div>
    </div>
  );
});

// Enhanced episode card component
const EpisodeCard: React.FC<{
  episode: any;
  index: number;
}> = memo(({ episode, index }) => (
  <div className="group bg-black/60 backdrop-blur-lg border border-white/20 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02]">
    {/* Episode thumbnail */}
    {episode.thumbnail && (
      <div className="relative aspect-video overflow-hidden">
        <img
          src={episode.thumbnail}
          alt={episode.title || `Episode ${index + 1}`}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Play button overlay */}
        {episode.url && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
              <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          </div>
        )}
      </div>
    )}

    {/* Episode info */}
    <div className="p-4">
      <h4 className="text-white font-medium text-sm mb-2 line-clamp-2">
        {episode.title || `Episode ${index + 1}`}
      </h4>
      
      {episode.site && (
        <div className="flex items-center gap-2 mb-3 text-xs text-white/60">
          <span className="w-2 h-2 bg-green-400 rounded-full"></span>
          <span>Available on {episode.site}</span>
        </div>
      )}

      {/* Watch button */}
      {episode.url ? (
        <a href={episode.url} target="_blank" rel="noopener noreferrer">
          <StyledButton
            variant="primary"
            className="w-full !text-xs !py-2 !bg-gradient-to-r !from-brand-primary-action !to-brand-accent-gold"
          >
            <span className="mr-2">▶️</span>
            Watch Now
          </StyledButton>
        </a>
      ) : (
        <div className="text-center py-2 text-xs text-white/50">
          No streaming link available
        </div>
      )}
    </div>
  </div>
));

// Custom hook for enriched characters
const useEnrichedCharacters = (
  characters: EnhancedCharacterType[],
  animeName: string,
  animeId?: Id<"anime">
) => {
  const [enrichedCharacters, setEnrichedCharacters] = useState<EnhancedCharacterType[]>(characters);
  const [isEnriching, setIsEnriching] = useState(false);
  const enrichCharacterDetails = useAction(api.ai.fetchEnrichedCharacterDetails);

  // Load cached characters on mount or when anime changes
  useEffect(() => {
    if (!animeId) return;
    const stored = localStorage.getItem(`anime_${animeId}_characters`);
    if (stored) {
      try { setEnrichedCharacters(JSON.parse(stored)); } catch { /* ignore */ }
    } else {
      setEnrichedCharacters(characters);
    }
  }, [animeId, characters]);

  // Persist characters to cache
  useEffect(() => {
    if (animeId && enrichedCharacters.length > 0) {
      localStorage.setItem(`anime_${animeId}_characters`, JSON.stringify(enrichedCharacters));
    }
  }, [animeId, enrichedCharacters]);

  const enrichMainCharacters = async () => {
    setIsEnriching(true);
    
    // Only enrich main characters to avoid rate limits
    const mainCharacters = characters.filter(char => char.role === 'MAIN');
    
    try {
      const enrichmentPromises = mainCharacters.map(async (character) => {
        const result = await enrichCharacterDetails({
          characterName: character.name,
          animeName: animeName,
          existingData: {
            description: character.description,
            role: character.role,
            gender: character.gender,
            age: character.age,
            species: character.species,
            powersAbilities: character.powersAbilities,
            voiceActors: character.voiceActors,
          },
          enrichmentLevel: 'basic' as const,
          messageId: `batch_enrich_${character.name}_${Date.now()}`,
        });
        
        return result.error ? character : { ...character, ...result.mergedCharacter, isAIEnriched: true };
      });
      
      const enrichedMains = await Promise.all(enrichmentPromises);
      
      // Merge enriched main characters with unchanged supporting characters
      const allEnriched = characters.map(char => {
        if (char.role === 'MAIN') {
          const enriched = enrichedMains.find(e => e.name === char.name);
          return enriched || char;
        }
        return char;
      });
      
      setEnrichedCharacters(allEnriched);
    } catch (error) {
      console.error('Batch enrichment failed:', error);
    } finally {
      setIsEnriching(false);
    }
  };

  return { enrichedCharacters, isEnriching, enrichMainCharacters };
};

type ReviewSortOption = "newest" | "oldest" | "highest_rating" | "lowest_rating" | "most_helpful";

export default function AnimeDetailPage({ 
  animeId, 
  onBack, 
  navigateToDetail, 
  onCharacterClick
}: AnimeDetailPageProps) {
  const anime = useQuery(api.anime.getAnimeById, animeId ? { animeId } : "skip");
  const watchlistEntry = useQuery(api.anime.getWatchlistItem, animeId ? { animeId } : "skip");
  const upsertToWatchlistMutation = useMutation(api.anime.upsertToWatchlist);
  
  const { isLoading: authIsLoading, isAuthenticated } = useConvexAuth();
  const loggedInUser = useQuery(api.auth.loggedInUser, isAuthenticated ? {} : "skip");
  const currentUserId = isAuthenticated && loggedInUser ? loggedInUser._id : null;
  
  // Mobile optimizations
  const mobileOpts = useMobileOptimizations();
  
  // Smart auto-refresh
  const smartAutoRefreshAction = useAction(api.autoRefresh.callSmartAutoRefreshAnime);
  const getRefreshRecommendationAction = useAction(api.autoRefresh.getRefreshRecommendation);
  const [refreshRecommendation, setRefreshRecommendation] = useState<any>(null);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [lastRefreshResult, setLastRefreshResult] = useState<any>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [showRefreshDetails, setShowRefreshDetails] = useState(false);
  // Track which anime has already triggered an automatic refresh
  const lastAutoRefreshedAnimeId = useRef<string | null>(null);

  // Character management
  const [selectedCharacter, setSelectedCharacter] = useState<any | null>(null);
  const [showCharacterDetail, setShowCharacterDetail] = useState(false);
  const {
    enrichedCharacters,
    isEnriching,
    enrichMainCharacters
  } = useEnrichedCharacters(anime?.characters || [], anime?.title || '', animeId);

  // Cached episodes and characters
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [charactersForDisplay, setCharactersForDisplay] = useState<EnhancedCharacterType[]>([]);

  // Load cached data on mount
  useEffect(() => {
    if (!animeId) return;
    const epStored = localStorage.getItem(`anime_${animeId}_episodes`);
    if (epStored) {
      try { setEpisodes(JSON.parse(epStored)); } catch { /* ignore */ }
    }
    const charStored = localStorage.getItem(`anime_${animeId}_characters`);
    if (charStored) {
      try { setCharactersForDisplay(JSON.parse(charStored)); } catch { /* ignore */ }
    }
  }, [animeId]);

  // Sync episodes from query
  useEffect(() => {
    if (animeId && anime?.streamingEpisodes) {
      setEpisodes(anime.streamingEpisodes);
      localStorage.setItem(
        `anime_${animeId}_episodes`,
        JSON.stringify(anime.streamingEpisodes)
      );
    }
  }, [animeId, anime?.streamingEpisodes]);

  // Sync characters from enrichment hook
  useEffect(() => {
    if (animeId && enrichedCharacters.length > 0) {
      setCharactersForDisplay(enrichedCharacters);
      localStorage.setItem(
        `anime_${animeId}_characters`,
        JSON.stringify(enrichedCharacters)
      );
    } else if (animeId && anime?.characters) {
      setCharactersForDisplay(anime.characters);
      localStorage.setItem(
        `anime_${animeId}_characters`,
        JSON.stringify(anime.characters)
      );
    }
  }, [animeId, enrichedCharacters, anime?.characters]);

  // State management
  const [activeTab, setActiveTab] = useState("overview");
  const [heroImageLoaded, setHeroImageLoaded] = useState(false);
  const [reviewSortOption, setReviewSortOption] = useState<ReviewSortOption>("newest");
  const [watchlistNotes, setWatchlistNotes] = useState(watchlistEntry?.notes || "");
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  
  // Reviews and comments
  const { results: reviewsFromBackend, status: reviewsStatus, loadMore: reviewsLoadMore, isLoading: reviewsIsLoadingInitial } = usePaginatedQuery(
    api.reviews.getReviewsForAnime, animeId ? { animeId, sortOption: reviewSortOption } : "skip", { initialNumItems: 3 }
  );
  const reviewsForDisplay: ClientReviewProps[] = (reviewsFromBackend || []).map(r => ({ ...r }));
  
  const userReviewDoc = useQuery(api.reviews.getUserReviewForAnime, animeId && currentUserId ? { animeId } : "skip");
  const addReviewMutation = useMutation(api.reviews.addReview);
  const editReviewMutation = useMutation(api.reviews.editReview);
  const deleteReviewInternalMutation = useMutation(api.reviews.deleteReview);
  const voteOnReviewMutation = useMutation(api.reviews.voteOnReview);
  const addReviewCommentMutation = useMutation(api.reviews.addReviewComment);
  
  const [activeReviewIdForComments, setActiveReviewIdForComments] = useState<Id<"reviews"> | null>(null);
  const { results: commentsDataForActiveReview, status: commentsPaginationStatus, loadMore: commentsLoadMore, isLoading: commentsIsLoading } = usePaginatedQuery(
    api.reviews.getReviewComments,
    activeReviewIdForComments ? { reviewId: activeReviewIdForComments } : "skip",
    { initialNumItems: 3 }
  );
  
  const [newCommentText, setNewCommentText] = useState<{[key: string]: string}>({});
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState<ClientReviewProps | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Similar anime
  const [similarAnime, setSimilarAnime] = useState<AnimeRecommendation[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [similarAnimeError, setSimilarAnimeError] = useState<string | null>(null);
  const [showSimilarAnime, setShowSimilarAnime] = useState(false);
  const getSimilarAnimeAction = useAction(api.ai.getSimilarAnimeRecommendationsFixed);
  const userProfile = useQuery(api.users.getMyUserProfile, isAuthenticated ? {} : "skip");
  const myCustomLists = useQuery(api.users.getMyCustomLists, isAuthenticated ? {} : "skip");
  const addToCustomListMutation = useMutation(api.users.addAnimeToCustomList);
  const removeFromCustomListMutation = useMutation(api.users.removeAnimeFromCustomList);

  const [isAddToCustomListModalOpen, setIsAddToCustomListModalOpen] = useState(false);

  const toggleAnimeInCustomList = useCallback(async (listId: Id<"customLists">, inList: boolean) => {
    if (!anime) return;
    try {
      if (inList) {
        await removeFromCustomListMutation({ listId, animeId: anime._id });
        toast.success("Removed from list.");
      } else {
        await addToCustomListMutation({ listId, animeId: anime._id });
        toast.success("Added to list.");
      }
    } catch (error: any) {
      toast.error("Failed to update list.");
    }
  }, [anime, addToCustomListMutation, removeFromCustomListMutation]);

  // Refs for smooth scrolling and parallax
  const heroRef = useRef<HTMLDivElement>(null);
  const scrollY = useRef(0);

  // Define tabs for navigation
  const tabs = [
    { id: "overview", label: "Overview", icon: "📖" },
    { id: "episodes", label: "Episodes", icon: "📺" },
    { id: "characters", label: "Characters", icon: "👥" },
    { id: "reviews", label: "Reviews", icon: "⭐" },
    { id: "similar", label: "Similar", icon: "🔍" },
  ];

  // Load refresh recommendation when anime loads
  useEffect(() => {
    if (anime && animeId) {
      getRefreshRecommendationAction({ animeId })
        .then(setRefreshRecommendation)
        .catch(console.error);
    }
  }, [anime, animeId, getRefreshRecommendationAction]);

  // Auto-refresh on page visit. The ref ensures each anime triggers at most once.
  useEffect(() => {
    if (
      anime &&
      animeId &&
      autoRefreshEnabled &&
      refreshRecommendation &&
      lastAutoRefreshedAnimeId.current !== animeId
    ) {
      const shouldAutoRefresh =
        refreshRecommendation.priority === "critical" ||
        refreshRecommendation.priority === "high" ||
        refreshRecommendation.freshnessScore < 50;

      if (shouldAutoRefresh && !isAutoRefreshing) {
        lastAutoRefreshedAnimeId.current = animeId;
        console.log(
          `[Auto-Refresh] Triggering auto-refresh for ${anime.title} (${refreshRecommendation.priority} priority)`
        );
        handleSmartRefresh("user_visit");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anime?._id, autoRefreshEnabled, refreshRecommendation]);

  // Sync watchlist notes
  useEffect(() => { 
    setWatchlistNotes(watchlistEntry?.notes || ""); 
  }, [watchlistEntry]);

  // Scroll handler for parallax effects
  useEffect(() => {
    const handleScroll = () => {
      if (mobileOpts.shouldReduceAnimations) return;
      
      scrollY.current = window.scrollY;
      
      if (heroRef.current) {
        const parallaxSpeed = 0.5;
        heroRef.current.style.transform = `translateY(${scrollY.current * parallaxSpeed}px)`;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [mobileOpts.shouldReduceAnimations]);

  // Smart refresh handler
  const handleSmartRefresh = useCallback(async (triggerType: "user_visit" | "manual" | "background" = "manual", forceRefresh = false) => {
    if (!anime || isAutoRefreshing) return;

    setIsAutoRefreshing(true);
    const toastId = `smart-refresh-${anime._id}`;
    
    if (triggerType === "manual") {
      toast.loading("Intelligently updating anime data...", { id: toastId });
    }

    try {
      const result = await smartAutoRefreshAction({
        animeId: anime._id,
        triggerType,
        forceRefresh
      });

      setLastRefreshResult(result);

      // Update recommendation after refresh
      const updatedRecommendation = await getRefreshRecommendationAction({ animeId: anime._id });
      setRefreshRecommendation(updatedRecommendation);

      if (triggerType === "manual") {
        if (result.refreshed) {
          if (result.dataChanged) {
            toast.success(
              `✨ Updated! ${result.message}`, 
              { id: toastId, duration: 4000 }
            );
          } else {
            toast.info(
              `✅ Refreshed - no new data found`, 
              { id: toastId }
            );
          }
        } else {
          toast.info(
            `ℹ️ ${result.message}`, 
            { id: toastId }
          );
        }
      } else if (triggerType === "user_visit" && result.refreshed && result.dataChanged) {
        toast.success(
          `📡 Fresh data loaded for ${anime.title}`, 
          { duration: 3000 }
        );
      }

    } catch (error: any) {
      console.error("Smart refresh error:", error);
      if (triggerType === "manual") {
        toast.error(`Failed to refresh: ${error.message}`, { id: toastId });
      }
    } finally {
      setIsAutoRefreshing(false);
    }
  }, [anime, isAutoRefreshing, smartAutoRefreshAction, getRefreshRecommendationAction]);

  // Handle character click with validation
  const handleCharacterClick = useCallback((character: any) => {
    // Validate character data before showing detail page
    if (!character || !character.name) {
      toast.error("Character data is incomplete. Cannot show details.");
      return;
    }

    console.log("Character clicked:", character); // Debug log
    
    // Ensure the character has minimum required data
    const validatedCharacter = {
      ...character,
      name: character.name || "Unknown Character",
      role: character.role || "BACKGROUND",
      description: character.description || "No description available.",
      imageUrl: character.imageUrl || null,
      // Add other fallback values as needed
    };

    setSelectedCharacter(validatedCharacter);
    setShowCharacterDetail(true);
  }, []);

  // Handle watchlist actions
  const handleWatchlistAction = useCallback(async (status: "Watching" | "Completed" | "Plan to Watch" | "Dropped") => {
    if (!isAuthenticated || !anime) {
      toast.error("Please log in to manage your watchlist.");
      return;
    }

    try {
      await upsertToWatchlistMutation({
        animeId: anime._id,
        status: status,
        notes: watchlistNotes || watchlistEntry?.notes || "",
        progress: watchlistEntry?.progress || 0,
        userRating: watchlistEntry?.userRating || undefined,
      });

      const actionMessages: Record<string, string> = {
        "Plan to Watch": "Added to Plan to Watch! 📚",
        "Watching": "Marked as Currently Watching! 🎬",
        "Completed": "Marked as Completed! ✅",
        "Dropped": "Moved to Dropped list. 📂",
      };

      toast.success(actionMessages[status] || `Status updated to ${status}!`);
    } catch (error: any) {
      toast.error("Failed to update watchlist status.");
    }
  }, [isAuthenticated, anime, upsertToWatchlistMutation, watchlistEntry, watchlistNotes]);

  // Save watchlist notes
  const handleSaveWatchlistNotes = useCallback(async () => {
    if (!isAuthenticated || !anime || !watchlistEntry) {
      toast.error("Please add this anime to your watchlist first.");
      return;
    }

    if (watchlistNotes === (watchlistEntry.notes || "")) {
      toast.info("No changes to save.");
      setShowNotesInput(false);
      return;
    }

    setIsSavingNotes(true);
    const toastId = `save-notes-${anime._id}`;
    toast.loading("Saving your notes...", { id: toastId });

    try {
      await upsertToWatchlistMutation({
        animeId: anime._id,
        status: watchlistEntry.status as "Watching" | "Completed" | "Plan to Watch" | "Dropped",
        notes: watchlistNotes.trim(),
        progress: watchlistEntry.progress || 0,
        userRating: watchlistEntry.userRating || undefined,
      });

      toast.success("Notes saved successfully!", { id: toastId });
      setShowNotesInput(false);

    } catch (error: any) {
      console.error("Save notes error:", error);
      toast.error("Failed to save notes.", { id: toastId });
    } finally {
      setIsSavingNotes(false);
    }
  }, [isAuthenticated, anime, watchlistEntry, watchlistNotes, upsertToWatchlistMutation]);

  // Handle review submission
  const handleReviewSubmit = useCallback(async (data: { 
    animeId: Id<"anime">; 
    rating: number; 
    reviewText?: string; 
    isSpoiler?: boolean; 
    reviewId?: Id<"reviews">
  }) => {
    if (!isAuthenticated || !anime) {
      toast.error("Please log in to submit a review.");
      return;
    }

    if (data.rating < 1 || data.rating > 5) {
      toast.error("Please provide a valid rating (1-5 stars).");
      return;
    }

    const isEditing = !!data.reviewId;
    setIsSubmittingReview(true);
    
    const toastId = `review-submit-${anime._id}`;
    toast.loading(isEditing ? "Updating your review..." : "Submitting your review...", { id: toastId });

    try {
      if (isEditing && data.reviewId) {
        await editReviewMutation({
          reviewId: data.reviewId,
          rating: data.rating,
          reviewText: data.reviewText?.trim() || "",
          isSpoiler: data.isSpoiler || false,
        });
        
        toast.success("Review updated successfully!", { id: toastId });
        setEditingReview(null);
      } else {
        await addReviewMutation({
          animeId: data.animeId,
          rating: data.rating,
          reviewText: data.reviewText?.trim() || "",
          isSpoiler: data.isSpoiler || false,
        });
        
        toast.success("Review submitted successfully!", { id: toastId });
      }

      setShowReviewForm(false);

    } catch (error: any) {
      console.error("Review submit error:", error);
      toast.error("Failed to submit review.", { id: toastId });
    } finally {
      setIsSubmittingReview(false);
    }
  }, [isAuthenticated, anime, addReviewMutation, editReviewMutation]);

  // Load similar anime
  const loadSimilarAnime = useCallback(async () => {
    if (!anime) return;
    setLoadingSimilar(true);
    setSimilarAnimeError(null);
    setSimilarAnime([]);
    
    try {
      const profileForAI = userProfile ? {
        name: userProfile.name, moods: userProfile.moods, genres: userProfile.genres,
        favoriteAnimes: userProfile.favoriteAnimes, experienceLevel: userProfile.experienceLevel,
        dislikedGenres: userProfile.dislikedGenres, dislikedTags: userProfile.dislikedTags,
        characterArchetypes: userProfile.characterArchetypes, tropes: userProfile.tropes,
        artStyles: userProfile.artStyles, narrativePacing: userProfile.narrativePacing
      } : undefined;
      
      const result = await getSimilarAnimeAction({
        animeId: anime._id,
        userProfile: profileForAI,
        count: 6,
        messageId: `similar-${anime._id}-${Date.now()}`
      });
      
      if (result.error) {
        setSimilarAnimeError(result.error);
        toast.error(`Could not find similar anime: ${result.error.substring(0, 60)}`);
      } else {
        const validRecommendations = (result.recommendations || []).filter(rec => rec && rec.title);
        setSimilarAnime(validRecommendations as AnimeRecommendation[]);
      }
      setShowSimilarAnime(true);
    } catch (e: any) {
      setSimilarAnimeError("Failed to load similar anime.");
      toast.error("An error occurred while finding similar anime.");
    } finally {
      setLoadingSimilar(false);
    }
  }, [anime, userProfile, getSimilarAnimeAction]);

  // Handle voting on reviews
  const handleVote = async (reviewId: Id<"reviews">, voteType: "up" | "down") => {
    if (!isAuthenticated || !currentUserId) {
      toast.error("Please log in to vote on reviews.");
      return;
    }

    try {
      await voteOnReviewMutation({ reviewId, voteType });
    } catch (error: any) {
      console.error("Vote error:", error);
      toast.error("Failed to record your vote.");
    }
  };

  // Toggle comments section for a review
  const handleToggleComments = (reviewId: Id<"reviews">) => {
    if (activeReviewIdForComments === reviewId) {
      setActiveReviewIdForComments(null);
    } else {
      setActiveReviewIdForComments(reviewId);
    }
  };

  // Add a comment to a review
  const handleAddComment = async (reviewId: Id<"reviews">) => {
    if (!isAuthenticated || !currentUserId) {
      toast.error("Please log in to comment.");
      return;
    }

    const commentText = newCommentText[reviewId] || "";
    
    if (!commentText.trim()) {
      toast.error("Please enter a comment.");
      return;
    }

    if (commentText.length > 1000) {
      toast.error("Comment is too long (max 1000 characters).");
      return;
    }

    setIsSubmittingComment(true);
    try {
      await addReviewCommentMutation({
        reviewId,
        commentText: commentText.trim(),
      });

      setNewCommentText(prev => ({ ...prev, [reviewId]: "" }));
      toast.success("Comment added!");
    } catch (error: any) {
      console.error("Add comment error:", error);
      toast.error("Failed to add comment.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Loading states
  if (animeId && anime === undefined && !authIsLoading) {
    return <IOSLoadingSpinner message="Loading anime details..." />;
  }
  
  if (authIsLoading && anime === undefined) {
    return <IOSLoadingSpinner message="Checking authentication..." />;
  }
  
  if (!anime) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-black/60 backdrop-blur-lg border border-white/20 rounded-3xl p-8 text-center max-w-md mx-auto">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-400 mb-4">Anime Not Found</h2>
          <p className="mb-6 text-sm text-red-300">
            This anime could not be loaded or doesn't exist.
          </p>
          <StyledButton onClick={onBack} variant="primary">
            Back to Collection
          </StyledButton>
        </div>
      </div>
    );
  }

  // Character detail modal with error handling
  if (showCharacterDetail && selectedCharacter) {
    return (
      <CharacterDetailErrorBoundary
        onError={() => {
          setShowCharacterDetail(false);
          setSelectedCharacter(null);
          toast.error("Unable to load character details. Returning to anime page.");
        }}
      >
        <CharacterDetailPage
          character={selectedCharacter}
          animeName={anime.title}
          onBack={() => {
            setShowCharacterDetail(false);
            setSelectedCharacter(null);
          }}
        />
      </CharacterDetailErrorBoundary>
    );
  }

  const placeholderPoster = `https://placehold.co/600x900/ECB091/321D0B/png?text=${encodeURIComponent(anime.title.substring(0, 10))}&font=poppins`;

  return (
    <div className="ios-character-page min-h-screen bg-brand-background relative overflow-hidden">
      {/* Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-80 h-80 bg-gradient-to-br from-brand-primary-action/12 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-32 right-16 w-96 h-96 bg-gradient-to-tr from-brand-accent-gold/10 to-transparent rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-gradient-to-l from-brand-accent-peach/8 to-transparent rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Hero Section */}
      <div className="character-hero relative">
        <div 
          ref={heroRef}
          className="character-hero-image fixed inset-0 w-full h-screen"
        >
          <img
            src={anime.posterUrl || placeholderPoster}
            alt={anime.title}
            className="w-full h-full object-cover"
            onLoad={() => setHeroImageLoaded(true)}
            onError={(e) => { (e.target as HTMLImageElement).src = placeholderPoster; }}
          />
        </div>
        
        <div className="character-hero-overlay absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        
        {/* Back button */}
        <div className="absolute top-safe-top left-4 z-20 pt-4">
          <button
            onClick={onBack}
            className="bg-black/60 backdrop-blur-lg border border-white/20 rounded-2xl p-3 transition-all duration-300 hover:scale-105"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Hero content */}
        <div className="character-hero-content absolute bottom-20 left-0 right-0 p-6 sm:p-8 md:p-12 z-10">
          <h1 className="character-name text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-heading text-white font-bold mb-4 drop-shadow-2xl">
            {anime.title}
          </h1>
          
          {/* Quick info badges */}
          <div className="flex flex-wrap gap-3 mb-6">
            {anime.year && (
              <span className="character-badge bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 text-white font-medium">
                📅 {anime.year}
              </span>
            )}
            {anime.rating && (
              <span className="character-badge bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 text-white font-medium">
                ⭐ {(anime.rating / 2).toFixed(1)}/5
              </span>
            )}
            {anime.totalEpisodes && (
              <span className="character-badge bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 text-white font-medium">
                📺 {anime.totalEpisodes} episodes
              </span>
            )}
            {anime.airingStatus && anime.airingStatus !== "FINISHED" && (
              <span className="character-badge bg-green-500/80 backdrop-blur-sm rounded-full px-4 py-2 text-white font-medium">
                🔴 {anime.airingStatus === "RELEASING" ? "Airing" : anime.airingStatus}
              </span>
            )}
          </div>

          {/* Genre tags */}
          {anime.genres && anime.genres.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {anime.genres.slice(0, 4).map((genre, idx) => (
                <span 
                  key={idx} 
                  className="character-badge bg-gradient-to-r from-brand-primary-action/80 to-brand-accent-gold/80 text-white px-3 py-1 rounded-full backdrop-blur-sm font-medium"
                >
                  {genre}
                </span>
              ))}
              {anime.genres.length > 4 && (
                <span className="character-badge bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 text-white font-medium">
                  +{anime.genres.length - 4} more
                </span>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 flex-wrap">
            {isAuthenticated ? (
              <>
                {watchlistEntry?.status === "Plan to Watch" ? (
                  <StyledButton 
                    onClick={() => handleWatchlistAction("Watching")} 
                    className="!bg-gradient-to-r !from-brand-accent-gold !to-brand-primary-action !text-white !font-semibold !px-6 !py-3 !rounded-2xl"
                  >
                    🎬 Start Watching
                  </StyledButton>
                ) : watchlistEntry?.status === "Watching" ? (
                  <StyledButton 
                    onClick={() => handleWatchlistAction("Completed")} 
                    className="!bg-gradient-to-r !from-green-500 !to-emerald-400 !text-white !font-semibold !px-6 !py-3 !rounded-2xl"
                  >
                    ✅ Mark Completed
                  </StyledButton>
                ) : watchlistEntry?.status === "Completed" ? (
                  <div className="bg-black/60 backdrop-blur-lg border border-white/20 px-6 py-3 rounded-2xl">
                    <span className="text-green-400 font-semibold flex items-center gap-2">
                      🏆 Completed
                    </span>
                  </div>
                ) : (
                  <StyledButton 
                    onClick={() => handleWatchlistAction("Plan to Watch")} 
                    variant="primary" 
                    className="!bg-gradient-to-r !from-brand-primary-action !to-brand-accent-gold !text-white !font-semibold !px-6 !py-3 !rounded-2xl"
                  >
                    📚 Add to Watchlist
                  </StyledButton>
                )}
              </>
            ) : (
              <div className="bg-black/60 backdrop-blur-lg border border-white/20 px-6 py-3 rounded-2xl">
                <span className="text-white/70 text-sm">Login to manage watchlist</span>
              </div>
            )}
            
            {/* Add to Custom List Button */}
            {isAuthenticated && (
              <StyledButton
                onClick={() => setIsAddToCustomListModalOpen(true)}
                variant="ghost"
                className="!bg-white/10 !backdrop-blur-lg !border-white/20 hover:!bg-white/20 !text-white/80 !px-4 !py-3 !rounded-2xl flex items-center gap-2"
              >
                <span className="text-lg">➕</span>
                <span className="font-medium">Custom Lists</span>
              </StyledButton>
            )}
            
            {/* Smart Refresh Button */}
            <StyledButton 
              onClick={() => handleSmartRefresh("manual", true)} 
              variant="ghost" 
              className="!bg-white/10 !backdrop-blur-lg !border-white/20 hover:!bg-white/20 !text-white/80 !px-4 !py-3 !rounded-2xl flex items-center gap-2"
              disabled={isAutoRefreshing}
            >
              <span className={`text-lg ${isAutoRefreshing ? "animate-spin" : ""}`}>🔄</span>
              <span className="font-medium">{isAutoRefreshing ? "Updating..." : "Refresh Data"}</span>
            </StyledButton>
          </div>

          {/* Scroll indicator */}
          <div className="scroll-indicator absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
            <div className="scroll-indicator-mouse w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
              <div className="scroll-indicator-dot w-1 h-1 bg-white/70 rounded-full mt-2 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Freshness Indicator */}
      {refreshRecommendation && (
        <div className="relative z-10 px-6 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-black/30 backdrop-blur-lg border border-white/20 rounded-2xl">
            <DataFreshnessIndicator
              freshnessScore={refreshRecommendation.freshnessScore}
              priority={refreshRecommendation.priority}
              lastFetched={refreshRecommendation.anime?.lastFetched}
              isRefreshing={isAutoRefreshing}
              onRefresh={() => handleSmartRefresh("manual")}
            />
            
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-white/70 text-sm">
                <input
                  type="checkbox"
                  checked={autoRefreshEnabled}
                  onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                  className="rounded border-white/30 bg-white/10 text-brand-primary-action focus:ring-brand-primary-action"
                />
                Auto-update
              </label>
              
              <StyledButton
                onClick={() => setShowRefreshDetails(!showRefreshDetails)}
                variant="ghost"
                className="!text-xs !py-1 !px-2 !bg-white/10 hover:!bg-white/20 !text-white/70"
              >
                {showRefreshDetails ? "Hide Details" : "Details"}
              </StyledButton>
            </div>
          </div>

          {/* Refresh Details Panel */}
          {showRefreshDetails && (
            <div className="mt-4 p-4 bg-black/40 backdrop-blur-lg border border-white/20 rounded-2xl">
              <h4 className="text-white font-medium mb-3">Data Status Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-white/60 mb-1">Freshness Score:</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/10 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                        style={{ width: `${refreshRecommendation.freshnessScore}%` }}
                      ></div>
                    </div>
                    <span className="text-white">{refreshRecommendation.freshnessScore}/100</span>
                  </div>
                </div>
                <div>
                  <p className="text-white/60 mb-1">Reason:</p>
                  <p className="text-white">{refreshRecommendation.reason}</p>
                </div>
                <div>
                  <p className="text-white/60 mb-1">Recommended Action:</p>
                  <p className="text-white capitalize">{refreshRecommendation.recommendedAction}</p>
                </div>
                <div>
                  <p className="text-white/60 mb-1">Last Refresh Result:</p>
                  <p className="text-white">
                    {lastRefreshResult ? lastRefreshResult.message : "No recent refresh"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      <IOSTabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={tabs}
      />

      {/* Content Sections */}
      <div className="relative z-10 pb-24 min-h-screen bg-gradient-to-t from-brand-background via-brand-background/95 to-transparent">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="ios-scroll-section px-6 py-8 space-y-8">
            {/* Synopsis */}
            <div className="section-card bg-black/60 backdrop-blur-lg border border-white/20 rounded-3xl p-6">
              <div className="section-card-header flex items-center gap-3 mb-6">
                <div className="section-card-icon bg-gradient-to-br from-brand-primary-action/30 to-brand-accent-gold/30 p-2 rounded-full">
                  📖
                </div>
                <h2 className="section-card-title text-2xl font-heading text-white font-bold">Synopsis</h2>
              </div>
              <p className="text-white/90 leading-relaxed selectable-text">
                {anime.description || "No synopsis available for this anime."}
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="section-card bg-black/60 backdrop-blur-lg border border-white/20 rounded-2xl p-4 text-center">
                <div className="text-2xl mb-2">📊</div>
                <div className="text-white/60 text-sm">Rating</div>
                <div className="text-white font-semibold">
                  {anime.rating ? `${(anime.rating / 2).toFixed(1)}/5` : "N/A"}
                </div>
              </div>
              <div className="section-card bg-black/60 backdrop-blur-lg border border-white/20 rounded-2xl p-4 text-center">
                <div className="text-2xl mb-2">📺</div>
                <div className="text-white/60 text-sm">Episodes</div>
                <div className="text-white font-semibold">
                  {anime.totalEpisodes || "N/A"}
                </div>
              </div>
              <div className="section-card bg-black/60 backdrop-blur-lg border border-white/20 rounded-2xl p-4 text-center">
                <div className="text-2xl mb-2">🎬</div>
                <div className="text-white/60 text-sm">Studio</div>
                <div className="text-white font-semibold text-xs">
                  {anime.studios?.[0] || "N/A"}
                </div>
              </div>
              <div className="section-card bg-black/60 backdrop-blur-lg border border-white/20 rounded-2xl p-4 text-center">
                <div className="text-2xl mb-2">📅</div>
                <div className="text-white/60 text-sm">Year</div>
                <div className="text-white font-semibold">
                  {anime.year || "N/A"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Episodes Tab */}
        {activeTab === "episodes" && (
          <div className="ios-scroll-section px-6 py-8">
             {episodes && episodes.length > 0 ? (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-white mb-4">
                  📺 Episodes ({episodes.length})
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {episodes.map((episode, index) => (
                    <EpisodeCard
                      key={`episode-${index}`}
                      episode={episode}
                      index={index}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="section-card bg-black/60 backdrop-blur-lg border border-white/20 rounded-3xl p-8 text-center">
                <div className="text-6xl mb-4 opacity-50">📺</div>
                <h3 className="text-xl text-white/70 mb-2">No Episodes Available</h3>
                <p className="text-white/50 text-sm">
                  Episode data is not yet available for this anime.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Characters Tab */}
        {activeTab === "characters" && (
          <div className="ios-scroll-section px-6 py-8">
            {charactersForDisplay && charactersForDisplay.length > 0 ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">
                    👥 Characters ({charactersForDisplay.length})
                  </h2>
                  
                  {/* AI Enrichment Status */}
                  {isEnriching && (
                    <div className="flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 rounded-full px-3 py-1">
                      <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-blue-300 text-xs font-medium">Enriching...</span>
                    </div>
                  )}
                  
                  {/* Manual Enrichment Button */}
                  {!isEnriching && charactersForDisplay.some(char => char.role === 'MAIN' && !char.isAIEnriched) && (
                    <button
                      onClick={enrichMainCharacters}
                      className="flex items-center gap-2 bg-gradient-to-r from-brand-primary-action/20 to-brand-accent-gold/20 border border-brand-primary-action/30 rounded-full px-3 py-1 hover:bg-brand-primary-action/30 transition-all duration-300"
                      title="Enhance main characters with AI"
                    >
                      <span className="text-sm">🤖</span>
                      <span className="text-brand-accent-gold text-xs font-medium">Enhance</span>
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {charactersForDisplay
                    .filter(character => character && character.name) // Filter out invalid characters
                    .map((character, index) => (
                    <CharacterCard
                      key={`character-${character.id || character.name || index}`}
                      character={character}
                      onClick={() => handleCharacterClick(character)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="section-card bg-black/60 backdrop-blur-lg border border-white/20 rounded-3xl p-8 text-center">
                <div className="text-6xl mb-4 opacity-50">👥</div>
                <h3 className="text-xl text-white/70 mb-2">No Character Data</h3>
                <p className="text-white/50 text-sm">
                  Character information is not yet available for this anime.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === "reviews" && (
          <div className="ios-scroll-section px-6 py-8">
            <div className="section-card bg-black/60 backdrop-blur-lg border border-white/20 rounded-3xl p-6">
              <div className="section-card-header flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="section-card-icon bg-gradient-to-br from-pink-500/30 to-purple-500/30 p-2 rounded-full">
                    ⭐
                  </div>
                  <h2 className="section-card-title text-2xl font-heading text-white font-bold">Reviews</h2>
                </div>
                {isAuthenticated && (
                  <StyledButton
                    onClick={() => setShowReviewForm(!showReviewForm)}
                    variant="primary"
                    className="!text-sm !px-4 !py-2 !rounded-xl !bg-gradient-to-r !from-brand-primary-action !to-brand-accent-gold"
                  >
                    {showReviewForm ? "Cancel" : "Write Review"}
                  </StyledButton>
                )}
              </div>

              {/* Review Form */}
              {showReviewForm && isAuthenticated && (
                <div className="mb-8">
                  <ReviewForm
                    animeId={anime._id}
                    existingReview={editingReview}
                    onSubmit={handleReviewSubmit}
                    onCancel={() => {
                      setShowReviewForm(false);
                      setEditingReview(null);
                    }}
                    isLoading={isSubmittingReview}
                  />
                </div>
              )}

              {/* Reviews List */}
              {reviewsIsLoadingInitial && reviewsForDisplay.length === 0 ? (
                <IOSLoadingSpinner message="Loading reviews..." />
              ) : reviewsForDisplay.length > 0 ? (
                <div className="space-y-6">
                  {reviewsForDisplay.map((review) => (
                    <div key={review._id} className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                      <ReviewCard
                        review={review}
                        currentUserId={currentUserId}
                        onEdit={(reviewToEdit) => {
                          if (reviewToEdit.userId === currentUserId) {
                            setEditingReview(reviewToEdit);
                            setShowReviewForm(true);
                          }
                        }}
                        onDelete={async (reviewId) => {
                          if (window.confirm("Are you sure you want to delete this review?")) {
                            try {
                              await deleteReviewInternalMutation({ reviewId });
                              toast.success("Review deleted successfully.");
                            } catch (error: any) {
                              toast.error("Failed to delete review.");
                            }
                          }
                        }}
                      />
                      
                      {/* Review Actions */}
                      <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <StyledButton
                              onClick={() => handleVote(review._id, "up")}
                              variant="ghost"
                              className={`!text-xs !px-2 !py-1 ${
                                review.currentUserVote === "up" 
                                  ? "!text-brand-primary-action !bg-brand-primary-action/10" 
                                  : "!text-white/70 hover:!text-brand-primary-action !bg-white/5 hover:!bg-white/10"
                              }`}
                              disabled={!isAuthenticated || review.userId === currentUserId}
                            >
                              👍 {review.upvotes || 0}
                            </StyledButton>
                            <StyledButton
                              onClick={() => handleVote(review._id, "down")}
                              variant="ghost"
                              className={`!text-xs !px-2 !py-1 ${
                                review.currentUserVote === "down" 
                                  ? "!text-red-500 !bg-red-500/10" 
                                  : "!text-white/70 hover:!text-red-500 !bg-white/5 hover:!bg-white/10"
                              }`}
                              disabled={!isAuthenticated || review.userId === currentUserId}
                            >
                              👎 {review.downvotes || 0}
                            </StyledButton>
                          </div>

                          <StyledButton
                            onClick={() => handleToggleComments(review._id)}
                            variant="ghost"
                            className="!text-xs !px-2 !py-1 !text-brand-accent-gold hover:!text-brand-primary-action !bg-white/5 hover:!bg-white/10"
                          >
                            💬 {review.commentCount || 0} Comments
                          </StyledButton>
                        </div>
                      </div>

                      {/* Comments Section */}
                      {activeReviewIdForComments === review._id && (
                        <div className="mt-6 pt-6 border-t border-white/10">
                          {isAuthenticated && (
                            <div className="mb-6">
                              <textarea
                                value={newCommentText[review._id] || ""}
                                onChange={(e) => setNewCommentText(prev => ({ ...prev, [review._id]: e.target.value }))}
                                rows={3}
                                maxLength={1000}
                                placeholder="Add a comment..."
                                className="w-full bg-black/40 backdrop-blur-sm border border-white/20 rounded-2xl p-4 text-white placeholder-white/60 focus:border-brand-primary-action focus:ring-2 focus:ring-brand-primary-action/50 focus:outline-none transition-all duration-300 resize-none mb-3"
                              />
                              <div className="flex justify-between items-center">
                                <p className="text-white/60 text-xs">
                                  {(newCommentText[review._id] || "").length}/1000
                                </p>
                                <StyledButton
                                  onClick={() => handleAddComment(review._id)}
                                  variant="primary"
                                  className="!text-xs !bg-gradient-to-r !from-brand-primary-action !to-brand-accent-gold hover:!from-brand-accent-gold hover:!to-brand-primary-action"
                                  disabled={isSubmittingComment || !(newCommentText[review._id] || "").trim()}
                                >
                                  {isSubmittingComment ? "Posting..." : "Post Comment"}
                                </StyledButton>
                              </div>
                            </div>
                          )}

                          {commentsIsLoading && (
                            <IOSLoadingSpinner message="Loading comments..." />
                          )}

                          {commentsDataForActiveReview && commentsDataForActiveReview.length > 0 ? (
                            <div className="space-y-4">
                              {commentsDataForActiveReview.map((comment) => (
                                <div key={comment._id} className="bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-white/5">
                                  <div className="flex items-start gap-3 mb-3">
                                    {comment.userAvatarUrl ? (
                                      <img 
                                        src={comment.userAvatarUrl} 
                                        alt={comment.userName} 
                                        className="w-8 h-8 rounded-full object-cover" 
                                      />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-brand-accent-gold text-brand-surface flex items-center justify-center text-xs font-semibold">
                                        {comment.userName?.charAt(0).toUpperCase() || "U"}
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between">
                                        <h5 className="font-medium text-white text-sm">
                                          {comment.userName}
                                        </h5>
                                        <p className="text-white/60 text-xs">
                                          {formatDistanceToNow(new Date(comment._creationTime), { addSuffix: true })}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap ml-11">
                                    {comment.commentText}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : !commentsIsLoading && (
                            <div className="text-center py-8">
                              <div className="text-4xl mb-2">💬</div>
                              <p className="text-white/60 text-sm">
                                No comments yet. {isAuthenticated ? "Be the first to comment!" : "Log in to comment."}
                              </p>
                            </div>
                          )}

                          {commentsPaginationStatus === "CanLoadMore" && (
                            <div className="text-center mt-6">
                              <StyledButton
                                onClick={() => commentsLoadMore(3)}
                                variant="ghost"
                                className="!text-xs !bg-white/10 !backdrop-blur-sm !border-white/20 hover:!bg-white/20 !text-white"
                                disabled={commentsIsLoading}
                              >
                                {commentsIsLoading ? "Loading..." : "Load More Comments"}
                              </StyledButton>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {reviewsStatus === "CanLoadMore" && (
                    <div className="text-center mt-8">
                      <StyledButton
                        onClick={() => reviewsLoadMore(3)}
                        variant="secondary"
                        className="!bg-black/30 !backdrop-blur-sm !border-white/20 hover:!bg-white/10 !text-white"
                        disabled={reviewsIsLoadingInitial}
                      >
                        {reviewsIsLoadingInitial ? "Loading..." : "Load More Reviews"}
                      </StyledButton>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-8xl mb-4">📝</div>
                  <h4 className="text-xl font-heading text-white mb-2">No Reviews Yet</h4>
                  <p className="text-white/70 mb-6">
                    {isAuthenticated 
                      ? "Be the first to share your thoughts about this anime!" 
                      : "Log in to write the first review!"
                    }
                  </p>
                  {isAuthenticated && (
                    <StyledButton
                      onClick={() => setShowReviewForm(true)}
                      variant="primary"
                      className="!bg-gradient-to-r !from-brand-primary-action !to-brand-accent-gold hover:!from-brand-accent-gold hover:!to-brand-primary-action"
                    >
                      Write the First Review
                    </StyledButton>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Similar Tab */}
        {activeTab === "similar" && (
          <div className="ios-scroll-section px-6 py-8">
            <div className="section-card bg-black/60 backdrop-blur-lg border border-white/20 rounded-3xl p-6">
              <div className="section-card-header flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="section-card-icon bg-gradient-to-br from-cyan-500/30 to-blue-500/30 p-2 rounded-full">
                    🔍
                  </div>
                  <h2 className="section-card-title text-2xl font-heading text-white font-bold">Similar Anime</h2>
                </div>
                <StyledButton
                  onClick={loadSimilarAnime}
                  variant="primary"
                  className="!text-sm !px-4 !py-2 !rounded-xl !bg-gradient-to-r !from-brand-primary-action !to-brand-accent-gold"
                  disabled={loadingSimilar}
                >
                  {loadingSimilar ? "Finding..." : "Find Similar"}
                </StyledButton>
              </div>
              
              {loadingSimilar && <IOSLoadingSpinner message="Finding similar anime..." />}
              {similarAnimeError && <p className="text-red-400 text-center py-8">{similarAnimeError}</p>}
              
              {!loadingSimilar && !similarAnimeError && showSimilarAnime && similarAnime.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
                  {similarAnime.map((rec, idx) => (
                    <div 
                      key={`similar-${idx}-${rec.title || idx}`} 
                      className="group relative transform transition-all duration-500 hover:scale-105"
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <div className="absolute -inset-2 bg-gradient-to-r from-brand-primary-action/30 to-brand-accent-gold/30 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative bg-black/20 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10 group-hover:border-white/30 transition-all duration-300">
                        <AnimeCard 
                          anime={rec} 
                          isRecommendation={true} 
                          onViewDetails={navigateToDetail}
                          className="w-full"
                        />
                        <div className="p-3 bg-gradient-to-t from-black/80 to-transparent">
                          <h4 className="text-sm font-medium text-white text-center truncate" title={rec.title}>
                            {rec.title || "Unknown Title"}
                          </h4>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {!loadingSimilar && !similarAnimeError && !showSimilarAnime && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4 opacity-50">🎯</div>
                  <h3 className="text-xl text-white/70 mb-2">Discover Similar Anime</h3>
                  <p className="text-white/50 text-sm mb-6">
                    Find anime with similar themes, genres, and storytelling.
                  </p>
                  <StyledButton
                    onClick={loadSimilarAnime}
                    variant="primary"
                    className="!bg-gradient-to-r !from-brand-primary-action !to-brand-accent-gold"
                    disabled={loadingSimilar}
                  >
                    🔍 Find Similar Anime
                  </StyledButton>
                </div>
              )}
              
              {!loadingSimilar && !similarAnimeError && showSimilarAnime && similarAnime.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🤔</div>
                  <p className="text-white/70">No similar anime found. Try refreshing or check back later!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Watchlist Notes Section - Only show if user has added to watchlist */}
      {watchlistEntry && (
        <div className="relative z-10 px-6 pb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-3xl blur-xl"></div>
            <div className="relative bg-black/60 backdrop-blur-lg border border-white/20 rounded-3xl p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full">
                    <span className="text-2xl">📝</span>
                  </div>
                  <h3 className="text-xl font-heading text-white font-bold">My Notes</h3>
                </div>
                <StyledButton
                  onClick={() => setShowNotesInput(!showNotesInput)}
                  variant="ghost"
                  className="!text-sm !bg-white/10 !backdrop-blur-sm !border-white/20 hover:!bg-white/20 !text-white"
                >
                  {showNotesInput ? "Cancel" : watchlistEntry.notes ? "Edit Notes" : "Add Notes"}
                </StyledButton>
              </div>
              
              {showNotesInput ? (
                <div className="space-y-4">
                  <textarea
                    value={watchlistNotes}
                    onChange={(e) => setWatchlistNotes(e.target.value)}
                    rows={4}
                    maxLength={500}
                    placeholder="Your private thoughts about this anime..."
                    className="w-full bg-black/40 backdrop-blur-sm border border-white/20 rounded-2xl p-4 text-white placeholder-white/60 focus:border-brand-primary-action focus:ring-2 focus:ring-brand-primary-action/50 focus:outline-none transition-all duration-300 resize-none"
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-white/60 text-xs">
                      {watchlistNotes.length}/500 characters
                    </p>
                    <div className="flex gap-3">
                      <StyledButton
                        onClick={() => {
                          setWatchlistNotes(watchlistEntry.notes || "");
                          setShowNotesInput(false);
                        }}
                        variant="ghost"
                        className="!text-sm !bg-white/10 !backdrop-blur-sm !border-white/20 hover:!bg-white/20 !text-white"
                        disabled={isSavingNotes}
                      >
                        Cancel
                      </StyledButton>
                      <StyledButton
                        onClick={handleSaveWatchlistNotes}
                        variant="primary"
                        className="!text-sm !bg-gradient-to-r !from-brand-primary-action !to-brand-accent-gold hover:!from-brand-accent-gold hover:!to-brand-primary-action"
                        disabled={isSavingNotes}
                      >
                        {isSavingNotes ? "Saving..." : "Save Notes"}
                      </StyledButton>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  {watchlistEntry.notes ? (
                    <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                      <p className="text-white/90 leading-relaxed whitespace-pre-wrap">
                        {watchlistEntry.notes}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2">💭</div>
                      <p className="text-white/60 text-sm">
                        No notes yet. Click "Add Notes" to record your thoughts!
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    {isAddToCustomListModalOpen && myCustomLists && anime && (
        <AddToCustomListModal
          isOpen={isAddToCustomListModalOpen}
          onClose={() => setIsAddToCustomListModalOpen(false)}
          lists={myCustomLists}
          animeId={anime._id}
          onToggle={toggleAnimeInCustomList}
        />
      )}
    </div>
  );
}

const AddToCustomListModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  lists: CustomListType[];
  animeId: Id<"anime">;
  onToggle: (listId: Id<"customLists">, inList: boolean) => void;
}> = ({ isOpen, onClose, lists, animeId, onToggle }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-brand-surface text-white p-5 rounded-xl shadow-xl w-full max-w-md space-y-4">
        <h3 className="text-lg font-heading">Manage Custom Lists</h3>
        {lists.length === 0 ? (
          <p className="text-sm text-center">No custom lists available.</p>
        ) : (
          <ul className="space-y-2">
            {lists.map(list => {
              const inList = list.animeIds.includes(animeId);
              return (
                <li key={list._id} className="flex items-center justify-between">
                  <span>{list.listName}</span>
                  <StyledButton
                    variant="secondary_small"
                    onClick={() => onToggle(list._id, inList)}
                  >
                    {inList ? "Remove" : "Add"}
                  </StyledButton>
                </li>
              );
            })}
          </ul>
        )}
        <div className="text-right pt-2">
          <StyledButton variant="secondary_small" onClick={onClose}>Close</StyledButton>
        </div>
      </div>
    </div>
  );
};