// src/components/animuse/AnimeDetailPage.tsx - Complete iOS-Optimized Version with Extended Background
import React, { useState, useEffect, useCallback, memo, useRef } from "react";
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
}> = memo(({ character, onClick }) => (
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
          <span className="ml-1">{character.role}</span>
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
));

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
const useEnrichedCharacters = (characters: EnhancedCharacterType[], animeName: string) => {
  const [enrichedCharacters, setEnrichedCharacters] = useState<EnhancedCharacterType[]>(characters);
  const [isEnriching, setIsEnriching] = useState(false);
  const enrichCharacterDetails = useAction(api.ai.fetchEnrichedCharacterDetails);

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
  
  // Character management
  const [selectedCharacter, setSelectedCharacter] = useState<any | null>(null);
  const [showCharacterDetail, setShowCharacterDetail] = useState(false);
  const { 
    enrichedCharacters, 
    isEnriching, 
    enrichMainCharacters 
  } = useEnrichedCharacters(anime?.characters || [], anime?.title || '');

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

  // Auto-enrich characters
  useEffect(() => {
    if (anime?.characters?.some((char: any) => char.role === 'MAIN' && !char.isAIEnriched)) {
      enrichMainCharacters();
    }
  }, [anime?._id]);

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

  // Handle character click
  const handleCharacterClick = useCallback((character: any) => {
    setSelectedCharacter(character);
    setShowCharacterDetail(true);
  }, []);

  // Handle watchlist actions
  const handleWatchlistAction = useCallback(async (status: string) => {
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
        status: watchlistEntry.status,
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

  // Character detail modal
  if (showCharacterDetail && selectedCharacter) {
    return (
      <CharacterDetailPage
        character={selectedCharacter}
        animeName={anime.title}
        onBack={() => {
          setShowCharacterDetail(false);
          setSelectedCharacter(null);
        }}
      />
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
          <div className="flex gap-3">
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
          </div>

          {/* Scroll indicator */}
          <div className="scroll-indicator absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
            <div className="scroll-indicator-mouse w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
              <div className="scroll-indicator-dot w-1 h-1 bg-white/70 rounded-full mt-2 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

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
            {anime.streamingEpisodes && anime.streamingEpisodes.length > 0 ? (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-white mb-4">
                  📺 Episodes ({anime.streamingEpisodes.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {anime.streamingEpisodes.map((episode, index) => (
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
            {enrichedCharacters && enrichedCharacters.length > 0 ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">
                    👥 Characters ({enrichedCharacters.length})
                  </h2>
                  
                  {/* AI Enrichment Status */}
                  {isEnriching && (
                    <div className="flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 rounded-full px-3 py-1">
                      <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-blue-300 text-xs font-medium">Enriching...</span>
                    </div>
                  )}
                  
                  {/* Manual Enrichment Button */}
                  {!isEnriching && enrichedCharacters.some(char => char.role === 'MAIN' && !char.isAIEnriched) && (
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
                  {enrichedCharacters.map((character, index) => (
                    <CharacterCard
                      key={`character-${character.id || index}`}
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
    </div>
  );
}