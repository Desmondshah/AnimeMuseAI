// src/components/animuse/AnimeDetailPage.tsx - Optimized with useCallback
import React, { useState, useEffect, useCallback, memo } from "react";
import { useQuery, useMutation, useAction, useConvexAuth, usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id, Doc } from "../../../convex/_generated/dataModel";
import StyledButton from "./shared/StyledButton";
import { toast } from "sonner";
import ReviewCard, { ReviewProps } from "./onboarding/ReviewCard"; // Assumed memoized
import ReviewForm from "./onboarding/ReviewForm";
import AnimeCard from "./AnimeCard"; // Assumed memoized
import { AnimeRecommendation } from "./AIAssistantPage";

interface AnimeDetailPageProps {
  animeId: Id<"anime">;
  onBack: () => void;
}

// Simple Loading Spinner component (can be moved to a shared file)
const LoadingSpinnerComponent: React.FC<{ message?: string }> = ({ message = "Loading..." }) => {
  return (
    <div className="flex flex-col justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan"></div>
      <p className="mt-3 text-brand-text-secondary">{message}</p>
    </div>
  );
};
const LoadingSpinner = memo(LoadingSpinnerComponent);

export default function AnimeDetailPage({ animeId, onBack }: AnimeDetailPageProps) {
  const anime = useQuery(api.anime.getAnimeById, animeId ? { animeId } : "skip");
  const watchlistEntry = useQuery(api.anime.getWatchlistItem, animeId ? { animeId } : "skip");
  const upsertToWatchlistMutation = useMutation(api.anime.upsertToWatchlist);
  const triggerFetchExternalDetailsAction = useAction(api.externalApis.callTriggerFetchExternalAnimeDetails);

  const { isLoading: authIsLoading, isAuthenticated } = useConvexAuth();
  const loggedInUser = useQuery(api.auth.loggedInUser, isAuthenticated ? {} : "skip");
  const currentUserId = isAuthenticated && loggedInUser ? loggedInUser._id : null;
  const userProfile = useQuery(api.users.getMyUserProfile, isAuthenticated ? {} : "skip");

  const {
    results: reviews, status: reviewsStatus, loadMore: reviewsLoadMore, isLoading: reviewsIsLoading,
  } = usePaginatedQuery(
    api.reviews.getReviewsForAnime,
    animeId ? { animeId } : "skip",
    { initialNumItems: 5 }
  );

  const userReviewDoc = useQuery(
    api.reviews.getUserReviewForAnime,
    animeId && currentUserId ? { animeId } : "skip"
  );

  const addReviewMutation = useMutation(api.reviews.addReview);
  const editReviewMutation = useMutation(api.reviews.editReview);
  const deleteReviewInternalMutation = useMutation(api.reviews.deleteReview);

  const getSimilarAnimeAction = useAction(api.ai.getSimilarAnimeRecommendations);
  const [similarAnime, setSimilarAnime] = useState<AnimeRecommendation[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [similarAnimeError, setSimilarAnimeError] = useState<string | null>(null);
  const [showSimilarAnime, setShowSimilarAnime] = useState(false);

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState<ReviewProps | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isFetchingExternal, setIsFetchingExternal] = useState(false);

  const handleWatchlistAction = useCallback(async (status: string) => {
    if (!isAuthenticated) {
      toast.error("Please log in to manage your watchlist.");
      return;
    }
    if (!anime) return; // anime might be null or undefined initially
    try {
      toast.loading("Updating watchlist...", {id: `watchlist-detail-${anime._id}`});
      await upsertToWatchlistMutation({ animeId: anime._id, status });
      toast.success(`Anime ${status === "Plan to Watch" ? "added to" : "updated in"} watchlist!`, {id: `watchlist-detail-${anime._id}`});
    } catch (error: any) {
      toast.error(error.data?.message || error.message || "Could not update watchlist.", {id: `watchlist-detail-${anime._id}`});
      console.error("Watchlist action error:", error);
    }
  }, [isAuthenticated, anime, upsertToWatchlistMutation]);

  const handleFetchExternalData = useCallback(async () => {
    if (!anime) return;
    setIsFetchingExternal(true);
    toast.loading("Fetching more details...", { id: `external-${anime._id}` });
    try {
      const result = await triggerFetchExternalDetailsAction({ animeIdInOurDB: anime._id, titleToSearch: anime.title });
      if (result.success) {
        toast.success("Details updated! Data may refresh shortly.", { id: `external-${anime._id}` });
      } else {
        toast.error(result.message || "Could not fetch external details.", { id: `external-${anime._id}` });
      }
    } catch (error) {
      toast.error("Failed to trigger external data fetch.", { id: `external-${anime._id}` });
      console.error("External data fetch error:", error);
    } finally {
      setIsFetchingExternal(false);
    }
  }, [anime, triggerFetchExternalDetailsAction]);

  const handleReviewSubmit = useCallback(async (data: {
    animeId: Id<"anime">; rating: number; reviewText?: string; reviewId?: Id<"reviews">
  }) => {
    if (!isAuthenticated || !anime) { // Ensure anime is loaded
      toast.error("Please log in to submit a review.");
      return;
    }
    setIsSubmittingReview(true);
    const toastId = data.reviewId ? `edit-review-${data.reviewId}` : `add-review-${anime._id}`;
    toast.loading(data.reviewId ? "Updating review..." : "Submitting review...", { id: toastId });
    try {
      if (data.reviewId) {
        await editReviewMutation({ reviewId: data.reviewId, rating: data.rating, reviewText: data.reviewText });
        toast.success("Review updated!", { id: toastId });
      } else {
        // Ensure anime._id is available before calling addReviewMutation
        await addReviewMutation({ animeId: anime._id, rating: data.rating, reviewText: data.reviewText });
        toast.success("Review added!", { id: toastId });
      }
      setShowReviewForm(false);
      setEditingReview(null);
    } catch (error: any) {
      toast.error(error.data?.message || error.message || "Failed to submit review.", { id: toastId });
      console.error("Review submission error:", error);
    } finally {
      setIsSubmittingReview(false);
    }
  }, [isAuthenticated, anime, addReviewMutation, editReviewMutation]);

  const handleEditReview = useCallback((reviewToEdit: ReviewProps) => {
    setEditingReview(reviewToEdit);
    setShowReviewForm(true);
    // Scroll to review section for better UX
    const reviewSection = document.getElementById("review-section");
    reviewSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []); // No external dependencies needed for useState setters

  const handleDeleteReview = useCallback(async (reviewIdToDelete: Id<"reviews">) => {
    if (!isAuthenticated) {
      toast.error("Please log in to delete reviews.");
      return;
    }
    // Optional: Add a confirmation dialog
    if (window.confirm("Are you sure you want to delete your review? This cannot be undone.")) {
      const toastId = `delete-review-${reviewIdToDelete}`;
      toast.loading("Deleting review...", { id: toastId });
      try {
        await deleteReviewInternalMutation({ reviewId: reviewIdToDelete });
        toast.success("Review deleted.", { id: toastId });
        if (editingReview?._id === reviewIdToDelete) {
          setShowReviewForm(false);
          setEditingReview(null);
        }
      } catch (error: any) {
        toast.error(error.data?.message || error.message || "Failed to delete review.", { id: toastId });
        console.error("Review deletion error:", error);
      }
    }
  }, [isAuthenticated, deleteReviewInternalMutation, editingReview]);

  const loadSimilarAnime = useCallback(async () => {
    if (!anime) return;
    setLoadingSimilar(true);
    setSimilarAnimeError(null);
    try {
      const userProfileData = userProfile ? {
        moods: userProfile.moods || [],
        genres: userProfile.genres || [],
        favoriteAnimes: userProfile.favoriteAnimes || [],
        experienceLevel: userProfile.experienceLevel || "",
        dislikedGenres: userProfile.dislikedGenres || [],
      } : undefined;

      const result = await getSimilarAnimeAction({
        animeId: anime._id,
        userProfile: userProfileData,
        count: 6,
      });

      if (result.error) {
        setSimilarAnimeError(result.error);
        toast.error("Failed to load similar anime recommendations.");
      } else {
        setSimilarAnime(result.recommendations as AnimeRecommendation[]);
        setShowSimilarAnime(true);
        if (result.recommendations.length > 0) {
          toast.success(`Found ${result.recommendations.length} similar anime!`);
        } else {
          toast.info("No similar anime found for this title yet.");
        }
      }
    } catch (error) {
      console.error("Error loading similar anime:", error);
      setSimilarAnimeError("An unexpected error occurred while fetching similar anime.");
      toast.error("Failed to load similar anime.");
    } finally {
      setLoadingSimilar(false);
    }
  }, [anime, userProfile, getSimilarAnimeAction]);


  useEffect(() => {
    if (userReviewDoc && showReviewForm && !editingReview) {
      const mappedUserReview: ReviewProps = {
        _id: userReviewDoc._id,
        _creationTime: userReviewDoc._creationTime,
        animeId: userReviewDoc.animeId,
        userId: userReviewDoc.userId,
        rating: userReviewDoc.rating,
        reviewText: userReviewDoc.reviewText,
        createdAt: userReviewDoc.createdAt,
        updatedAt: userReviewDoc.updatedAt,
        userName: loggedInUser?.name || "You",
        userAvatarUrl: (loggedInUser as any)?.image || (loggedInUser as any)?.avatarUrl,
      };
      setEditingReview(mappedUserReview);
    } else if (!userReviewDoc && !showReviewForm && editingReview) {
      setEditingReview(null);
    }
  }, [userReviewDoc, showReviewForm, loggedInUser, editingReview]);

  // Loading states
  if (animeId && anime === undefined) return <LoadingSpinner message="Loading anime details..." />;
  if (authIsLoading) return <LoadingSpinner message="Checking authentication..." />;
  if (isAuthenticated && loggedInUser === undefined) return <LoadingSpinner message="Loading user profile..." />;
  if (animeId && reviewsIsLoading && reviewsStatus === "LoadingFirstPage") return <LoadingSpinner message="Loading reviews..." />;
  if (isAuthenticated && currentUserId && animeId && userReviewDoc === undefined) return <LoadingSpinner message="Checking your review..." />;


  if (!anime) { // Handles both anime === null (not found) and anime === undefined (still loading after skip)
    return (
      <div className="text-center p-8 neumorphic-card">
        <h2 className="text-2xl font-orbitron text-sakura-pink mb-4">Anime Not Found</h2>
        <p className="text-brand-text-secondary mb-6">
          Sorry, we couldn't find details for this anime, or it's still loading.
        </p>
        <StyledButton onClick={onBack} variant="primary">Go Back</StyledButton>
      </div>
    );
  }

  const currentWatchlistStatus = watchlistEntry?.status;
  const canUserReview = isAuthenticated && !!currentUserId && !authIsLoading;
  const userHasExistingReview = !!userReviewDoc;

  return (
    <div className="neumorphic-card p-4 sm:p-6 max-w-4xl mx-auto">
      <StyledButton onClick={onBack} variant="secondary_small" className="mb-4">&larr; Back</StyledButton>
      
      <div className="relative mb-4">
        <img
          src={anime.posterUrl || `https://via.placeholder.com/400x600.png?text=${encodeURIComponent(anime.title)}`}
          alt={anime.title}
          className="w-full h-64 sm:h-96 object-cover rounded-lg shadow-xl"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = `https://via.placeholder.com/400x600.png?text=${encodeURIComponent(anime.title)}`;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-transparent to-transparent opacity-70 rounded-lg"></div>
        <div className="absolute bottom-0 left-0 p-4 sm:p-6">
          <h1 className="text-3xl sm:text-4xl font-orbitron text-white drop-shadow-lg">{anime.title}</h1>
          {anime.year && <p className="text-lg text-neon-cyan font-semibold">{anime.year}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="md:col-span-2">
          <h2 className="text-xl font-orbitron text-sakura-pink mb-2">Synopsis</h2>
          <p className="text-brand-text-secondary leading-relaxed whitespace-pre-wrap">{anime.description}</p>
        </div>
        <div>
          {anime.averageUserRating !== undefined && anime.averageUserRating !== null && (
            <div className="mb-3">
              <h3 className="text-lg font-orbitron text-electric-blue mb-1">User Rating</h3>
              <div className="flex items-center">
                <span className="text-2xl text-yellow-400 mr-1">★</span>
                <span className="text-2xl text-neon-cyan">{anime.averageUserRating.toFixed(1)}</span>
                <span className="text-sm text-brand-text-secondary ml-1">/ 5</span>
              </div>
              <p className="text-xs text-brand-text-secondary">({anime.reviewCount || 0} review{(!anime.reviewCount || anime.reviewCount !== 1) ? 's' : ''})</p>
            </div>
          )}
          
          {anime.genres && anime.genres.length > 0 && (
            <div className="mb-3">
              <h3 className="text-sm font-orbitron text-electric-blue mb-1">Genres</h3>
              <div className="flex flex-wrap gap-1">
                {anime.genres.map(genre => (<span key={genre} className="text-xs bg-brand-dark px-2 py-1 rounded-full text-sakura-pink">{genre}</span>))}
              </div>
            </div>
          )}
          
          {anime.studios && anime.studios.length > 0 && (
            <div className="mb-3">
              <h3 className="text-sm font-orbitron text-electric-blue mb-1">Studios</h3>
              <p className="text-xs text-brand-text-secondary">{anime.studios.join(", ")}</p>
            </div>
          )}
          
          {anime.themes && anime.themes.length > 0 && (
            <div className="mb-3">
              <h3 className="text-sm font-orbitron text-electric-blue mb-1">Themes</h3>
              <div className="flex flex-wrap gap-1">
                {anime.themes.map(theme => (<span key={theme} className="text-xs bg-brand-dark px-2 py-1 rounded-full text-neon-cyan">{theme}</span>))}
              </div>
            </div>
          )}
          
          {anime.emotionalTags && anime.emotionalTags.length > 0 && (
            <div className="mb-3">
              <h3 className="text-sm font-orbitron text-electric-blue mb-1">Emotional Tags</h3>
              <div className="flex flex-wrap gap-1">
                {anime.emotionalTags.map(tag => (<span key={tag} className="text-xs bg-brand-dark px-2 py-1 rounded-full text-electric-blue">{tag}</span>))}
              </div>
            </div>
          )}
          
          {(anime.rating !== undefined && anime.rating !== null) && (anime.reviewCount === undefined || anime.reviewCount === 0) && (
            <div className="mt-3">
              <h3 className="text-sm font-orbitron text-electric-blue mb-1">External Rating</h3>
              <div className="flex items-center">
                <span className="text-lg text-yellow-400 mr-1">★</span>
                <span className="text-lg text-neon-cyan">{anime.rating.toFixed(1)}</span>
                <span className="text-xs text-brand-text-secondary ml-1">/ 10</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {isAuthenticated ? (
          <>
            {currentWatchlistStatus === "Plan to Watch" ? (
              <StyledButton onClick={() => handleWatchlistAction("Watching")} variant="primary">Start Watching</StyledButton>
            ) : currentWatchlistStatus === "Watching" ? (
              <StyledButton onClick={() => handleWatchlistAction("Completed")} variant="primary">Mark as Completed</StyledButton>
            ) : currentWatchlistStatus === "Completed" ? (
              <div className="flex gap-2 items-center"><StyledButton onClick={() => handleWatchlistAction("Watching")} variant="secondary">Rewatch</StyledButton> <p className="text-green-400 font-semibold">✓ Completed</p></div>
            ) : ( // Includes null, undefined, or "Dropped"
              <StyledButton onClick={() => handleWatchlistAction("Plan to Watch")} variant="primary">Add to Watchlist</StyledButton>
            )}
          </>
        ) : (
          <p className="text-brand-text-secondary self-center">Login to add to watchlist</p>
        )}
        
        {anime.trailerUrl && (
          <a href={anime.trailerUrl} target="_blank" rel="noopener noreferrer">
            <StyledButton variant="secondary">Watch Trailer</StyledButton>
          </a>
        )}
      </div>

      <div className="mt-8 border-t border-brand-surface pt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-orbitron text-sakura-pink">Similar Anime</h2>
          {!showSimilarAnime && (
            <StyledButton onClick={loadSimilarAnime} variant="secondary" disabled={loadingSimilar || !anime}>
              {loadingSimilar ? "Finding Similar..." : "Find Similar Anime"}
            </StyledButton>
          )}
        </div>
        {loadingSimilar && <LoadingSpinner message="AniMuse is analyzing similar anime..."/>}
        {similarAnimeError && <p className="text-red-400 text-center py-4">{similarAnimeError}</p>}
        {showSimilarAnime && similarAnime.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {similarAnime.map((simAnime, idx) => (
              <AnimeCard key={`similar-${idx}-${simAnime.title}`} anime={simAnime} isRecommendation={true} />
            ))}
          </div>
        )}
        {showSimilarAnime && similarAnime.length === 0 && !loadingSimilar && !similarAnimeError && (
             <p className="text-brand-text-secondary text-center py-4">No similar anime found for this title yet.</p>
        )}
         {showSimilarAnime && (
            <div className="text-center mt-4">
                <StyledButton onClick={() => { setShowSimilarAnime(false); setSimilarAnime([]); setSimilarAnimeError(null); }} variant="secondary_small"> Hide Similar</StyledButton>
            </div>
         )}
      </div>

      <div id="review-section" className="mt-8 border-t border-brand-surface pt-6">
        <h2 className="text-2xl font-orbitron text-sakura-pink mb-6">User Reviews</h2>
        {canUserReview && anime && ( // Ensure anime is loaded before allowing review form
          showReviewForm ? (
            <ReviewForm 
              animeId={anime._id} 
              existingReview={editingReview} 
              onSubmit={handleReviewSubmit} 
              onCancel={() => { setShowReviewForm(false); setEditingReview(null); }} 
              isLoading={isSubmittingReview} 
            />
          ) : (
            <div className="mb-6 text-center">
              <StyledButton 
                onClick={() => { 
                  setEditingReview(userReviewDoc ? { 
                    _id: userReviewDoc._id, _creationTime: userReviewDoc._creationTime, animeId: userReviewDoc.animeId,
                    userId: userReviewDoc.userId, rating: userReviewDoc.rating, reviewText: userReviewDoc.reviewText,
                    createdAt: userReviewDoc.createdAt, updatedAt: userReviewDoc.updatedAt,
                    userName: loggedInUser?.name || "You", 
                    userAvatarUrl: (loggedInUser as any)?.image || (loggedInUser as any)?.avatarUrl 
                  } : null); 
                  setShowReviewForm(true); 
                }} 
                variant="primary"
              >
                {userHasExistingReview ? "Edit Your Review" : "Add Your Review"}
              </StyledButton>
            </div>
          )
        )}
        {!isAuthenticated && !authIsLoading && (
          <p className="text-brand-text-secondary text-center mb-6">Login to add your review.</p>
        )}

        {(reviewsIsLoading && reviewsStatus === "LoadingFirstPage") && <LoadingSpinner message="Loading reviews..." />}
        
        {!reviewsIsLoading && (!reviews || reviews.length === 0) && (
          <p className="text-brand-text-secondary text-center">No reviews yet. Be the first to write one!</p>
        )}

        {reviews && reviews.length > 0 && (
          <div className="space-y-6">
            {reviews.map((review) => (
              <ReviewCard
                key={review._id}
                review={review as ReviewProps} // Cast assuming the structure matches after fetching user details
                currentUserId={currentUserId}
                onEdit={handleEditReview}
                onDelete={handleDeleteReview}
              />
            ))}
            {reviewsStatus === "CanLoadMore" && (
              <div className="text-center mt-4">
                <StyledButton onClick={() => reviewsLoadMore(5)} variant="secondary_small" disabled={reviewsIsLoading && reviewsStatus === "LoadingMore"}>
                  {(reviewsIsLoading && reviewsStatus === "LoadingMore") ? "Loading..." : "Load More Reviews"}
                </StyledButton>
              </div>
            )}
            {reviewsStatus === "Exhausted" && reviews.length > 0 && (
              <p className="text-brand-text-secondary text-center mt-4">No more reviews to load.</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 border-t border-brand-surface pt-4">
        <StyledButton onClick={handleFetchExternalData} variant="secondary_small" disabled={isFetchingExternal || !anime}>
          {isFetchingExternal ? "Fetching Details..." : "Fetch/Update More Details"}
        </StyledButton>
        <p className="text-xs text-brand-text-secondary mt-1">
          (Uses an external API to enrich anime data)
        </p>
      </div>
    </div>
  );
}