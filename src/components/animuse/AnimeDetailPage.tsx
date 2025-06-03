// src/components/animuse/AnimeDetailPage.tsx - Enhanced with Smart Auto-Refresh
import React, { useState, useEffect, useCallback, memo, FormEvent, JSX } from "react";
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

const LoadingSpinnerComponent: React.FC<{ message?: string; className?: string }> = ({ message = "Loading...", className = "" }) => (
    <div className={`flex flex-col justify-center items-center py-16 ${className}`}>
      <div className="relative">
        <div className="w-20 h-20 border-4 border-transparent border-t-brand-primary-action border-r-brand-accent-gold rounded-full animate-spin"></div>
        <div className="absolute top-2 left-2 w-16 h-16 border-4 border-transparent border-b-brand-accent-peach border-l-white/50 rounded-full animate-spin animate-reverse"></div>
        <div className="absolute top-6 left-6 w-8 h-8 bg-gradient-to-r from-brand-primary-action to-brand-accent-gold rounded-full animate-pulse"></div>
      </div>
      {message && <p className="mt-4 text-lg text-white/80 font-medium animate-pulse">{message}</p>}
    </div>
);
const LoadingSpinner = memo(LoadingSpinnerComponent);

type ReviewSortOption = "newest" | "oldest" | "highest_rating" | "lowest_rating" | "most_helpful";

export default function AnimeDetailPage({ animeId, onBack, navigateToDetail }: AnimeDetailPageProps) {
  const anime = useQuery(api.anime.getAnimeById, animeId ? { animeId } : "skip");
  const watchlistEntry = useQuery(api.anime.getWatchlistItem, animeId ? { animeId } : "skip");
  const upsertToWatchlistMutation = useMutation(api.anime.upsertToWatchlist);
  
  // Smart auto-refresh actions
  const smartAutoRefreshAction = useAction(api.autoRefresh.callSmartAutoRefreshAnime);
  const getRefreshRecommendationAction = useAction(api.autoRefresh.getRefreshRecommendation);

  const { isLoading: authIsLoading, isAuthenticated } = useConvexAuth();
  const loggedInUser = useQuery(api.auth.loggedInUser, isAuthenticated ? {} : "skip");
  const currentUserId = isAuthenticated && loggedInUser ? loggedInUser._id : null;

  const [reviewSortOption, setReviewSortOption] = useState<ReviewSortOption>("newest");
  const [watchlistNotes, setWatchlistNotes] = useState(watchlistEntry?.notes || "");
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Smart refresh state
  const [refreshRecommendation, setRefreshRecommendation] = useState<any>(null);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [lastRefreshResult, setLastRefreshResult] = useState<any>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [showRefreshDetails, setShowRefreshDetails] = useState(false);

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
  const editReviewCommentMutation = useMutation(api.reviews.editReviewComment);
  const deleteReviewCommentMutation = useMutation(api.reviews.deleteReviewComment);

  const [activeReviewIdForComments, setActiveReviewIdForComments] = useState<Id<"reviews"> | null>(null);
  const { results: commentsDataForActiveReview, status: commentsPaginationStatus, loadMore: commentsLoadMore, isLoading: commentsIsLoading } = usePaginatedQuery(
      api.reviews.getReviewComments,
      activeReviewIdForComments ? { reviewId: activeReviewIdForComments } : "skip",
      { initialNumItems: 3 }
  );

  const [newCommentText, setNewCommentText] = useState<{[key: string]: string}>({});
  const [replyToCommentId, setReplyToCommentId] = useState<Id<"reviewComments"> | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<Id<"reviewComments"> | null>(null);
  const [editingCommentText, setEditingCommentText] = useState<string>("");
  const [newReplyText, setNewReplyText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState<ClientReviewProps | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const [similarAnime, setSimilarAnime] = useState<AnimeRecommendation[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [similarAnimeError, setSimilarAnimeError] = useState<string | null>(null);
  const [showSimilarAnime, setShowSimilarAnime] = useState(false);
  const getSimilarAnimeAction = useAction(api.ai.getSimilarAnimeRecommendationsFixed);
  const userProfile = useQuery(api.users.getMyUserProfile, isAuthenticated ? {} : "skip");

  const canUserReview = isAuthenticated && !!currentUserId && !authIsLoading;
  const userHasExistingReview = !!userReviewDoc;

  // Load refresh recommendation when anime loads
  useEffect(() => {
    if (anime && animeId) {
      getRefreshRecommendationAction({ animeId })
        .then(setRefreshRecommendation)
        .catch(console.error);
    }
  }, [anime, animeId, getRefreshRecommendationAction]);

  // Auto-refresh on page visit (smart logic)
  useEffect(() => {
    if (anime && animeId && autoRefreshEnabled && refreshRecommendation) {
      const shouldAutoRefresh = refreshRecommendation.priority === "critical" || 
                               refreshRecommendation.priority === "high" ||
                               refreshRecommendation.freshnessScore < 50; // More aggressive for missing episodes
      
      if (shouldAutoRefresh && !isAutoRefreshing) {
        console.log(`[Auto-Refresh] Triggering auto-refresh for ${anime.title} (${refreshRecommendation.priority} priority)`);
        handleSmartRefresh("user_visit");
      }
    }
  }, [anime, animeId, autoRefreshEnabled, refreshRecommendation, isAutoRefreshing]);

  useEffect(() => { setWatchlistNotes(watchlistEntry?.notes || ""); }, [watchlistEntry]);

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
        // Show subtle notification for background refreshes with new data
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

  // Handle watchlist status changes
  const handleWatchlistAction = useCallback(async (status: string) => {
    if (!isAuthenticated) {
      toast.error("Please log in to manage your watchlist.");
      return;
    }

    if (!anime) {
      toast.error("Anime data not available.");
      return;
    }

    const toastId = `watchlist-${anime._id}-${status}`;
    toast.loading(`${status === "Dropped" ? "Removing from" : "Adding to"} ${status}...`, { id: toastId });

    try {
      await upsertToWatchlistMutation({
        animeId: anime._id,
        status: status,
        notes: watchlistNotes || watchlistEntry?.notes || "",
        progress: watchlistEntry?.progress || 0,
        userRating: watchlistEntry?.userRating || undefined,
      });

      const actionMessages: Record<string, string> = {
        "Plan to Watch": "Added to Plan to Watch!",
        "Watching": "Marked as Currently Watching!",
        "Completed": "Marked as Completed!",
        "Dropped": "Moved to Dropped list.",
      };

      toast.success(actionMessages[status] || `Status updated to ${status}!`, { id: toastId });

      if (status === "Watching" && !watchlistEntry) {
        setTimeout(() => {
          toast.info("💡 Tip: You can add notes and track your progress from your watchlist!", {
            duration: 4000,
          });
        }, 1500);
      }

    } catch (error: any) {
      console.error("Watchlist action error:", error);
      toast.error(
        error.data?.message || error.message || `Failed to update watchlist status.`,
        { id: toastId }
      );
    }
  }, [isAuthenticated, anime, upsertToWatchlistMutation, watchlistEntry, watchlistNotes]);

  // Save notes for the anime in the user's watchlist
  const handleSaveWatchlistNotes = useCallback(async () => {
    if (!isAuthenticated) {
      toast.error("Please log in to save notes.");
      return;
    }

    if (!anime) {
      toast.error("Anime data not available.");
      return;
    }

    if (!watchlistEntry) {
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
      toast.error(
        error.data?.message || error.message || "Failed to save notes.",
        { id: toastId }
      );
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
    if (!isAuthenticated) {
      toast.error("Please log in to submit a review.");
      return;
    }

    if (!anime) {
      toast.error("Anime data not available.");
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
        
        if (!userReviewDoc) {
          setTimeout(() => {
            toast.success("🎉 Thanks for your first review! Your thoughts help other anime fans.", {
              duration: 4000,
            });
          }, 1500);
        }
      }

      setShowReviewForm(false);

    } catch (error: any) {
      console.error("Review submit error:", error);
      
      if (error.data?.message?.includes("already reviewed")) {
        toast.error("You have already reviewed this anime. Try editing your existing review instead.", { id: toastId });
      } else if (error.data?.message?.includes("rating")) {
        toast.error("Please provide a valid rating between 1-5 stars.", { id: toastId });
      } else {
        toast.error(
          error.data?.message || error.message || `Failed to ${isEditing ? "update" : "submit"} review.`,
          { id: toastId }
        );
      }
    } finally {
      setIsSubmittingReview(false);
    }
  }, [isAuthenticated, anime, addReviewMutation, editReviewMutation, userReviewDoc, setShowReviewForm, setEditingReview, setIsSubmittingReview]);

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
          count: 3,
          messageId: `similar-${anime._id}-${Date.now()}`
        });
        if (result.error) {
            setSimilarAnimeError(result.error);
            toast.error(`Could not find similar anime: ${result.error.substring(0, 60)}`);
        } else {
            const validRecommendations = (result.recommendations || []).filter(rec => rec && rec.title);
            setSimilarAnime(validRecommendations as AnimeRecommendation[]);
            if (validRecommendations.length === 0 && (!result.recommendations || result.recommendations.length > 0)) {
                toast.info("AI found some suggestions, but they seem incomplete for display.");
            }
        }
        setShowSimilarAnime(true);
    } catch (e:any) {
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
      toast.error(error.data?.message || "Failed to record your vote.");
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
  const handleAddComment = async (reviewId: Id<"reviews">, parentId?: Id<"reviewComments">) => {
    if (!isAuthenticated || !currentUserId) {
      toast.error("Please log in to comment.");
      return;
    }

    const commentText = parentId ? newReplyText : newCommentText[reviewId] || "";
    
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
        parentId: parentId,
      });

      if (parentId) {
        setNewReplyText("");
        setReplyToCommentId(null);
      } else {
        setNewCommentText(prev => ({ ...prev, [reviewId]: "" }));
      }

      toast.success("Comment added!");
    } catch (error: any) {
      console.error("Add comment error:", error);
      toast.error(error.data?.message || "Failed to add comment.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (animeId && anime === undefined && !authIsLoading) return <LoadingSpinner message="Loading anime details..." className="text-white/80" />;
  if (authIsLoading && anime === undefined) return <LoadingSpinner message="Checking authentication..." className="text-white/80" />;
  if (!anime) { 
    return (
      <div className="relative min-h-screen flex items-center justify-center px-4">
        <div className="bg-black/30 backdrop-blur-sm border border-red-500/30 rounded-3xl p-8 text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-heading text-red-400 mb-4">Anime Not Found</h2>
          <p className="mb-4 text-sm text-red-300">This anime could not be loaded or doesn't exist.</p>
          <StyledButton onClick={onBack} variant="primary">Back to Collection</StyledButton>
        </div>
      </div>
    );
  }

  const placeholderPoster = `https://placehold.co/600x900/ECB091/321D0B/png?text=%20&font=poppins`;

  return (
    <div className="relative min-h-screen">
      {/* Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-80 h-80 bg-gradient-to-br from-brand-primary-action/12 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-32 right-16 w-96 h-96 bg-gradient-to-tr from-brand-accent-gold/10 to-transparent rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-gradient-to-l from-brand-accent-peach/8 to-transparent rounded-full blur-3xl animate-pulse delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-gradient-to-r from-purple-500/8 to-transparent rounded-full blur-3xl animate-pulse delay-3000"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-4 sm:px-6 py-8 max-w-6xl mx-auto space-y-8">
        {/* Back Button */}
        <div className="mb-6">
          <StyledButton 
            onClick={onBack} 
            variant="ghost" 
            className="!bg-white/10 !backdrop-blur-sm !border-white/20 hover:!bg-white/20 !text-white flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Collection
          </StyledButton>
        </div>

        {/* Data Freshness Indicator */}
        {refreshRecommendation && (
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-black/20 backdrop-blur-sm border border-white/10 rounded-2xl">
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
        )}

        {/* Refresh Details Panel */}
        {showRefreshDetails && refreshRecommendation && (
          <div className="p-4 bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl">
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

        {/* Hero Section with Poster and Info */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-primary-action/20 via-transparent to-brand-accent-gold/20 rounded-3xl blur-xl"></div>
          <div className="relative bg-black/40 backdrop-blur-sm border border-white/10 rounded-3xl overflow-hidden">
            {/* Hero Image with Overlay */}
            <div className="relative h-80 sm:h-96 md:h-[500px] overflow-hidden">
              <img 
                src={anime.posterUrl || placeholderPoster} 
                alt={anime.title} 
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = placeholderPoster; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
              
              {/* Title and Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 md:p-12">
                <div className="max-w-4xl">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-heading text-white font-bold mb-4 drop-shadow-2xl">
                    {anime.title}
                  </h1>
                  {anime.year && (
                    <div className="inline-flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 mb-4">
                      <span className="text-lg">📅</span>
                      <span className="text-white font-medium">{anime.year}</span>
                    </div>
                  )}
                  
                  {/* Quick Stats */}
                  <div className="flex flex-wrap gap-3 mb-6">
                    {anime.rating && (
                      <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
                        <span className="text-lg">⭐</span>
                        <span className="text-white font-medium">{(anime.rating / 2).toFixed(1)}/5</span>
                      </div>
                    )}
                    {anime.totalEpisodes && (
                      <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
                        <span className="text-lg">📺</span>
                        <span className="text-white font-medium">{anime.totalEpisodes} episodes</span>
                      </div>
                    )}
                    {anime.airingStatus && anime.airingStatus !== "FINISHED" && (
                      <div className="bg-green-500/80 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
                        <span className="text-lg">🔴</span>
                        <span className="text-white font-medium">
                          {anime.airingStatus === "RELEASING" ? "Airing" : anime.airingStatus}
                        </span>
                      </div>
                    )}
                    {anime.genres && anime.genres.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {anime.genres.slice(0, 3).map((genre, idx) => (
                          <span key={idx} className="bg-gradient-to-r from-brand-primary-action/80 to-brand-accent-gold/80 text-white text-sm font-medium px-3 py-1 rounded-full backdrop-blur-sm">
                            {genre}
                          </span>
                        ))}
                        {anime.genres.length > 3 && (
                          <span className="bg-black/60 backdrop-blur-sm text-white text-sm font-medium px-3 py-1 rounded-full">
                            +{anime.genres.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Synopsis Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-blue-500/10 rounded-3xl blur-xl"></div>
          <div className="relative bg-black/30 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-brand-primary-action/20 to-brand-accent-gold/20 rounded-full">
                <span className="text-2xl">📖</span>
              </div>
              <h2 className="text-2xl font-heading text-white font-bold">Synopsis</h2>
            </div>
            <p className="text-base sm:text-lg text-white/90 leading-relaxed whitespace-pre-wrap">
              {anime.description || "No synopsis available for this anime."}
            </p>
          </div>
        </div>

        {/* Episodes & Streaming Section */}
        {anime.streamingEpisodes && anime.streamingEpisodes.length > 0 && (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-3xl blur-xl"></div>
            <div className="relative bg-black/30 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-full">
                    <span className="text-2xl">📺</span>
                  </div>
                  <h3 className="text-2xl font-heading text-white font-bold">Episodes & Streaming</h3>
                </div>
                <div className="text-sm text-white/60">
                  {anime.streamingEpisodes.length} episodes available
                </div>
              </div>

              {/* Episode Grid */}
              <div className="max-h-96 overflow-y-auto custom-scrollbar pr-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {anime.streamingEpisodes.map((episode, index) => (
                    <div
                      key={`episode-${index}`}
                      className="group relative bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover:border-white/30 transition-all duration-300"
                    >
                      {/* Episode Thumbnail */}
                      {episode.thumbnail && (
                        <div className="relative aspect-video overflow-hidden">
                          <img
                            src={episode.thumbnail}
                            alt={episode.title || `Episode ${index + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          
                          {/* Play Icon Overlay */}
                          {episode.url && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <div className="w-12 h-12 bg-brand-primary-action/90 backdrop-blur-sm rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z"/>
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Episode Info */}
                      <div className="p-4">
                        <h4 className="text-white font-medium text-sm mb-2 line-clamp-2">
                          {episode.title || `Episode ${index + 1}`}
                        </h4>
                        
                        {episode.site && (
                          <div className="text-xs text-white/60 mb-3 flex items-center gap-1">
                            <span className="text-sm">🌐</span>
                            <span>Available on {episode.site}</span>
                          </div>
                        )}

                        {/* Watch Button */}
                        {episode.url ? (
                          <a
                            href={episode.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <StyledButton
                              variant="primary"
                              className="w-full !text-xs !py-2 !bg-gradient-to-r !from-brand-primary-action !to-brand-accent-gold hover:!from-brand-accent-gold hover:!to-brand-primary-action"
                            >
                              Watch on {episode.site || 'External Site'}
                            </StyledButton>
                          </a>
                        ) : (
                          <div className="text-center py-2 text-xs text-white/50">
                            No streaming link available
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Next Airing Episode Info */}
              {anime.nextAiringEpisode && (
                <div className="mt-6 p-4 bg-gradient-to-r from-green-500/20 to-emerald-400/20 border border-green-500/30 rounded-2xl">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl">⏰</span>
                    <h4 className="text-white font-medium">Next Episode</h4>
                  </div>
                  <p className="text-white/80 text-sm">
                    Episode {anime.nextAiringEpisode.episode} airs{' '}
                    {anime.nextAiringEpisode.airingAt && 
                      formatDistanceToNow(new Date(anime.nextAiringEpisode.airingAt * 1000), { addSuffix: true })
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No Episode Data Message */}
        {(!anime.streamingEpisodes || anime.streamingEpisodes.length === 0) && (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-500/10 to-slate-500/10 rounded-3xl blur-xl"></div>
            <div className="relative bg-black/30 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-gray-500/20 to-slate-500/20 rounded-full">
                  <span className="text-2xl">📺</span>
                </div>
                <h3 className="text-2xl font-heading text-white font-bold">Episodes & Streaming</h3>
              </div>
              
              <div className="text-center py-8">
                <div className="text-6xl mb-4 opacity-50">📺</div>
                <h4 className="text-xl text-white/70 mb-2">No Episode Information</h4>
                <p className="text-white/50 text-sm max-w-md mx-auto">
                  Episode streaming data is not yet available for this anime. 
                  {refreshRecommendation?.priority === "critical" && refreshRecommendation.reason.includes("episode") ? (
                    <span className="block mt-2 text-brand-accent-gold">
                      💡 Try refreshing to check for new episode data!
                    </span>
                  ) : (
                    " Check back later as we continue to update our database."
                  )}
                </p>
                {anime.totalEpisodes && (
                  <p className="text-white/60 text-sm mt-3">
                    This anime has {anime.totalEpisodes} episodes total.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

         {/* 🆕 Characters Section - Place here, after Episodes but before Action Buttons */}
        {anime.characters && anime.characters.length > 0 && (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-3xl blur-xl"></div>
            <div className="relative bg-black/30 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-full">
                    <span className="text-2xl">👥</span>
                  </div>
                  <h3 className="text-2xl font-heading text-white font-bold">Characters</h3>
                </div>
                <div className="text-sm text-white/60">
                  {anime.characters.length} characters
                </div>
              </div>

              {/* Characters Grid */}
              <div className="max-h-96 overflow-y-auto custom-scrollbar pr-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {anime.characters.map((character, index) => (
                    <div
                      key={`character-${character.id || index}`}
                      className="group relative bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover:border-white/30 transition-all duration-300 hover:scale-105"
                    >
                      {/* Character Image */}
                      <div className="relative aspect-[3/4] overflow-hidden">
                        {character.imageUrl ? (
                          <img
                            src={character.imageUrl}
                            alt={character.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              // Fallback to a placeholder if image fails to load
                              (e.target as HTMLImageElement).src = `https://placehold.co/300x400/ECB091/321D0B/png?text=${encodeURIComponent(character.name.charAt(0))}&font=poppins`;
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-brand-primary-action/20 to-brand-accent-gold/20 flex items-center justify-center">
                            <div className="text-4xl font-bold text-white/60">
                              {character.name.charAt(0).toUpperCase()}
                            </div>
                          </div>
                        )}
                        
                        {/* Role Badge */}
                        <div className="absolute top-2 right-2">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium backdrop-blur-sm ${
                            character.role === "MAIN" 
                              ? "bg-yellow-500/80 text-yellow-100" 
                              : character.role === "SUPPORTING"
                              ? "bg-blue-500/80 text-blue-100"
                              : "bg-gray-500/80 text-gray-100"
                          }`}>
                            {character.role === "MAIN" && "⭐"}
                            {character.role === "SUPPORTING" && "🎭"}
                            {character.role === "BACKGROUND" && "👤"}
                            {character.role === "MAIN" ? "Main" : character.role === "SUPPORTING" ? "Support" : "Background"}
                          </span>
                        </div>

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>

                      {/* Character Info */}
                      <div className="p-3">
                        <h4 className="text-white font-medium text-sm text-center leading-tight" title={character.name}>
                          <span className="line-clamp-2">
                            {character.name}
                          </span>
                        </h4>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Character Role Legend */}
              <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs">
                <div className="flex items-center gap-1 text-yellow-400">
                  <span>⭐</span>
                  <span>Main Characters</span>
                </div>
                <div className="flex items-center gap-1 text-blue-400">
                  <span>🎭</span>
                  <span>Supporting Characters</span>
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <span>👤</span>
                  <span>Background Characters</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Character Data Message */}
        {(!anime.characters || anime.characters.length === 0) && (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-500/10 to-slate-500/10 rounded-3xl blur-xl"></div>
            <div className="relative bg-black/30 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-gray-500/20 to-slate-500/20 rounded-full">
                  <span className="text-2xl">👥</span>
                </div>
                <h3 className="text-2xl font-heading text-white font-bold">Characters</h3>
              </div>
              
              <div className="text-center py-8">
                <div className="text-6xl mb-4 opacity-50">👥</div>
                <h4 className="text-xl text-white/70 mb-2">No Character Information</h4>
                <p className="text-white/50 text-sm max-w-md mx-auto">
                  Character data is not yet available for this anime. 
                  {refreshRecommendation?.priority === "critical" && refreshRecommendation.reason.includes("character") ? (
                    <span className="block mt-2 text-brand-accent-gold">
                      💡 Try refreshing to check for new character data!
                    </span>
                  ) : (
                    " Check back later as we continue to update our database."
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Watchlist Actions */}
          {isAuthenticated ? (
            <>
              {watchlistEntry?.status === "Plan to Watch" ? (
                <div className="relative group">
                  <div className="absolute -inset-2 bg-gradient-to-r from-brand-accent-gold/40 to-brand-primary-action/40 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <StyledButton 
                    onClick={() => handleWatchlistAction("Watching")} 
                    className="relative w-full !py-3 !bg-gradient-to-r !from-brand-accent-gold !to-brand-primary-action hover:!from-brand-primary-action hover:!to-brand-accent-gold !text-white !font-medium"
                  >
                    🎬 Start Watching
                  </StyledButton>
                </div>
              ) : watchlistEntry?.status === "Watching" ? (
                <div className="relative group">
                  <div className="absolute -inset-2 bg-gradient-to-r from-green-500/40 to-emerald-400/40 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <StyledButton 
                    onClick={() => handleWatchlistAction("Completed")} 
                    className="relative w-full !py-3 !bg-gradient-to-r !from-green-500 !to-emerald-400 hover:!from-emerald-400 hover:!to-green-500 !text-white !font-medium"
                  >
                    ✅ Mark Completed
                  </StyledButton>
                </div>
              ) : watchlistEntry?.status === "Completed" ? (
                <div className="bg-black/30 backdrop-blur-sm border border-green-500/30 rounded-2xl p-3 text-center">
                  <div className="text-green-400 font-medium flex items-center justify-center gap-2">
                    <span className="text-xl">🏆</span>
                    Completed
                  </div>
                </div>
              ) : (
                <div className="relative group">
                  <div className="absolute -inset-2 bg-gradient-to-r from-brand-primary-action/40 to-brand-accent-gold/40 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <StyledButton 
                    onClick={() => handleWatchlistAction("Plan to Watch")} 
                    variant="primary" 
                    className="relative w-full !py-3 !bg-gradient-to-r !from-brand-primary-action !to-brand-accent-gold hover:!from-brand-accent-gold hover:!to-brand-primary-action"
                  >
                    📚 Add to Watchlist
                  </StyledButton>
                </div>
              )}
            </>
          ) : (
            <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl p-3 text-center">
              <p className="text-white/70 text-sm">Login to manage watchlist</p>
            </div>
          )}

          {/* Other Action Buttons */}
          {anime.trailerUrl && (
            <a href={anime.trailerUrl} target="_blank" rel="noopener noreferrer" className="block">
              <StyledButton 
                variant="secondary" 
                className="w-full !py-3 !bg-black/30 !backdrop-blur-sm !border-white/20 hover:!bg-white/10 !text-white flex items-center justify-center gap-2"
              >
                <span className="text-lg">🎥</span>
                Watch Trailer
              </StyledButton>
            </a>
          )}

          <StyledButton 
            onClick={loadSimilarAnime} 
            variant="secondary" 
            className="w-full !py-3 !bg-black/30 !backdrop-blur-sm !border-white/20 hover:!bg-white/10 !text-white flex items-center justify-center gap-2"
            disabled={loadingSimilar}
          >
            <span className="text-lg">🔍</span>
            {loadingSimilar ? "Finding..." : "Find Similar"}
          </StyledButton>

          <StyledButton 
            onClick={() => handleSmartRefresh("manual", true)} 
            variant="ghost" 
            className="w-full !py-3 !bg-white/5 !backdrop-blur-sm !border-white/10 hover:!bg-white/10 !text-white/80 flex items-center justify-center gap-2"
            disabled={isAutoRefreshing}
          >
            <span className={`text-lg ${isAutoRefreshing ? "animate-spin" : ""}`}>🔄</span>
            {isAutoRefreshing ? "Updating..." : "Smart Refresh"}
          </StyledButton>
        </div>

        {/* Similar Anime Section */}
        {showSimilarAnime && (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-3xl blur-xl"></div>
            <div className="relative bg-black/30 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full">
                  <span className="text-2xl">🎯</span>
                </div>
                <h3 className="text-2xl font-heading text-white font-bold">Similar Anime</h3>
              </div>
              
              {loadingSimilar && <LoadingSpinner message="Finding similar anime..." className="text-white/80 !py-8" />}
              {similarAnimeError && <p className="text-red-400 text-center py-8">{similarAnimeError}</p>}
              
              {!loadingSimilar && !similarAnimeError && similarAnime.length > 0 && (
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
              
              {!loadingSimilar && !similarAnimeError && similarAnime.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🤔</div>
                  <p className="text-white/70">No similar anime found. Try refreshing or check back later!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Watchlist Notes Section */}
        {watchlistEntry && (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-3xl blur-xl"></div>
            <div className="relative bg-black/30 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-8">
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
        )}

        {/* Reviews Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-3xl blur-xl"></div>
          <div className="relative bg-black/30 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-8">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-full">
                  <span className="text-2xl">⭐</span>
                </div>
                <h3 className="text-2xl font-heading text-white font-bold">Reviews</h3>
              </div>
              {isAuthenticated && (
                <StyledButton
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  variant="primary"
                  className="!text-sm !bg-gradient-to-r !from-brand-primary-action !to-brand-accent-gold hover:!from-brand-accent-gold hover:!to-brand-primary-action"
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
              <LoadingSpinner message="Loading reviews..." className="text-white/80 !py-8" />
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
                          <LoadingSpinner message="Loading comments..." className="text-white/80 !py-4" />
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

        {/* Bottom Spacer */}
        <div className="h-24"></div>
      </div>
    </div>
  );
}