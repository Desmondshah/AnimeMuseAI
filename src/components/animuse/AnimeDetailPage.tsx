// src/components/animuse/AnimeDetailPage.tsx
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useAction, useConvexAuth, usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id, Doc } from "../../../convex/_generated/dataModel";
import StyledButton from "./shared/StyledButton";
import { toast } from "sonner";
// Ensure these import paths are correct for your project structure!
// Assuming ReviewCard.tsx and ReviewForm.tsx are in the same directory as AnimeDetailPage.tsx
import ReviewCard, { ReviewProps } from "./onboarding/ReviewCard";
import ReviewForm from "./onboarding/ReviewForm";

interface AnimeDetailPageProps {
  animeId: Id<"anime">;
  onBack: () => void;
}

export default function AnimeDetailPage({ animeId, onBack }: AnimeDetailPageProps) {
  // For queries that take arguments, always pass the query reference.
  // Pass the arguments object or "skip" if the query should not run.
  const anime = useQuery(api.anime.getAnimeById, animeId ? { animeId } : "skip");

  const watchlistEntry = useQuery(
    api.anime.getWatchlistItem,
    animeId ? { animeId } : "skip"
  );
  const upsertToWatchlist = useMutation(api.anime.upsertToWatchlist);
  const triggerFetchExternalDetails = useAction(api.externalApis.callTriggerFetchExternalAnimeDetails);

  const { isLoading: authIsLoading, isAuthenticated } = useConvexAuth();
  // For api.auth.loggedInUser (takes no args): pass {} if authenticated, else "skip".
  const loggedInUser = useQuery(
    api.auth.loggedInUser,
    isAuthenticated ? {} : "skip"
  );
  const currentUserId = isAuthenticated && loggedInUser ? loggedInUser._id : null;

  const {
    results: reviews, // This is the array of review items for the current page
    status: reviewsStatus, // "LoadingFirstPage", "LoadingMore", "CanLoadMore", "Exhausted"
    loadMore: reviewsLoadMore,
    isLoading: reviewsIsLoading, // True if status is "LoadingFirstPage" or "LoadingMore"
  } = usePaginatedQuery(
    api.reviews.getReviewsForAnime,
    animeId ? { animeId } : "skip",
    { initialNumItems: 5 }
  );

  const userReviewDoc = useQuery(
    api.reviews.getUserReviewForAnime,
    animeId && currentUserId ? { animeId } : "skip"
  );

  const addReview = useMutation(api.reviews.addReview);
  const editReview = useMutation(api.reviews.editReview);
  const deleteReviewMutation = useMutation(api.reviews.deleteReview);

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState<ReviewProps | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isFetchingExternal, setIsFetchingExternal] = React.useState(false);

  useEffect(() => {
    if (userReviewDoc && showReviewForm && !editingReview) {
      const mappedUserReview: ReviewProps = {
        ...(userReviewDoc as any), // Cast might be needed if types aren't perfectly aligned
        userName: loggedInUser?.name || "You",
        // Ensure loggedInUser or userAppProfile has a consistent avatar field
        userAvatarUrl: (loggedInUser as any)?.image || (loggedInUser as any)?.avatarUrl,
      };
      setEditingReview(mappedUserReview);
    } else if (!userReviewDoc && !showReviewForm) {
        setEditingReview(null);
    }
  }, [userReviewDoc, showReviewForm, loggedInUser, editingReview]);


  // Overall loading state for the page before rendering main content
  if (anime === undefined && animeId) return <LoadingSpinner message="Loading anime details..." />;
  if (authIsLoading) return <LoadingSpinner message="Checking authentication..." />;
  if (isAuthenticated && loggedInUser === undefined) return <LoadingSpinner message="Loading user profile..." />;
  // For reviews, only block initial render if it's the very first page load and animeId is present
  if (animeId && reviewsIsLoading && reviewsStatus === "LoadingFirstPage") return <LoadingSpinner message="Loading reviews..." />;
  // If user is authenticated and we expect their review, wait for it (it could be null if no review)
  if (isAuthenticated && currentUserId && userReviewDoc === undefined && animeId) return <LoadingSpinner message="Checking your review..." />;


  if (anime === null && animeId) { // animeId check ensures query was attempted and returned null
    return (
      <div className="text-center p-8 neumorphic-card">
        <h2 className="text-2xl font-orbitron text-sakura-pink mb-4">Anime Not Found</h2>
        <p className="text-brand-text-secondary mb-6">Sorry, we couldn't find details for this anime.</p>
        <StyledButton onClick={onBack} variant="primary">Go Back</StyledButton>
      </div>
    );
  }

  // If anime is still undefined here, it means animeId was likely not provided, so we can't show details.
  if (!anime) {
      return <LoadingSpinner message="Waiting for anime information..." />;
  }


  const handleWatchlistAction = async (status: string) => {
    if (!isAuthenticated) {
        toast.error("Please log in to manage your watchlist.");
        return;
    }
    if (!anime) return;
    try {
        toast.loading("Updating watchlist...", {id: `watchlist-detail-${anime._id}`});
        await upsertToWatchlist({ animeId: anime._id, status });
        toast.success(`Anime ${status === "Plan to Watch" ? "added to" : "updated in"} watchlist!`, {id: `watchlist-detail-${anime._id}`});
    } catch (error: any) {
        console.error("Failed to update watchlist:", error);
        toast.error(error.data?.message || error.message || "Could not update watchlist.", {id: `watchlist-detail-${anime._id}`});
    }
  };

  const handleFetchExternalData = async () => {
    if (!anime) return;
    setIsFetchingExternal(true);
    toast.loading("Fetching more details...", { id: `Workspace-external-${anime._id}` });
    try {
      const result = await triggerFetchExternalDetails({ animeIdInOurDB: anime._id, titleToSearch: anime.title });
      if (result.success) {
        toast.success("Details updated! The page will refresh with new data shortly (if any).", { id: `Workspace-external-${anime._id}` });
      } else {
        toast.error(result.message || "Could not fetch external details.", { id: `Workspace-external-${anime._id}` });
      }
    } catch (error) {
      toast.error("Failed to trigger external data fetch.", { id: `Workspace-external-${anime._id}` });
      console.error(error);
    } finally {
      setIsFetchingExternal(false);
    }
  };

  const handleReviewSubmit = async (data: { animeId: Id<"anime">; rating: number; reviewText?: string; reviewId?: Id<"reviews"> }) => {
    if (!isAuthenticated || !anime) {
        toast.error("Please log in to submit a review.");
        return;
    }
    setIsSubmittingReview(true);
    const toastId = data.reviewId ? `edit-review-${data.reviewId}` : `add-review-${anime._id}`; // Use anime._id if it's a new review
    toast.loading(data.reviewId ? "Updating your review..." : "Submitting your review...", { id: toastId });

    try {
      if (data.reviewId) {
        await editReview({ reviewId: data.reviewId, rating: data.rating, reviewText: data.reviewText });
        toast.success("Review updated successfully!", { id: toastId });
      } else {
        await addReview({ animeId: anime._id, rating: data.rating, reviewText: data.reviewText });
        toast.success("Review added successfully!", { id: toastId });
      }
      setShowReviewForm(false);
      setEditingReview(null);
    } catch (error: any) {
      toast.error(error.data?.message || error.message || "Failed to submit review.", { id: toastId });
      console.error("Review submission error:", error);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleEditReview = (reviewToEdit: ReviewProps) => {
    setEditingReview(reviewToEdit);
    setShowReviewForm(true);
    const reviewSection = document.getElementById("review-section");
    reviewSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleDeleteReview = async (reviewIdToDelete: Id<"reviews">) => {
    if (!isAuthenticated) {
        toast.error("Please log in to delete reviews.");
        return;
    }
    if (window.confirm("Are you sure you want to delete your review? This cannot be undone.")) {
      const toastId = `delete-review-${reviewIdToDelete}`;
      toast.loading("Deleting your review...", { id: toastId });
      try {
        await deleteReviewMutation({ reviewId: reviewIdToDelete });
        toast.success("Review deleted successfully!", { id: toastId });
        if (editingReview?._id === reviewIdToDelete) {
            setShowReviewForm(false);
            setEditingReview(null);
        }
      } catch (error: any) {
        toast.error(error.data?.message || error.message || "Failed to delete review.", { id: toastId });
        console.error("Review deletion error:", error);
      }
    }
  };

  const currentWatchlistStatus = watchlistEntry?.status;
  const canUserReview = isAuthenticated && !!currentUserId && !authIsLoading;
  const userHasExistingReview = !!userReviewDoc;

  return (
    <div className="neumorphic-card p-4 sm:p-6 max-w-3xl mx-auto">
      <StyledButton onClick={onBack} variant="secondary_small" className="mb-4">&larr; Back</StyledButton>
      {/* --- Anime Poster and Main Details --- */}
      <div className="relative mb-4">
        <img
            src={anime.posterUrl || `https://via.placeholder.com/400x600.png?text=${encodeURIComponent(anime.title)}`}
            alt={anime.title}
            className="w-full h-64 sm:h-96 object-cover rounded-lg shadow-xl"
            onError={(e) => (e.currentTarget.src = `https://via.placeholder.com/400x600.png?text=${encodeURIComponent(anime.title)}`)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-transparent to-transparent opacity-70 rounded-lg"></div>
        <div className="absolute bottom-0 left-0 p-4 sm:p-6">
          <h1 className="text-3xl sm:text-4xl font-orbitron text-white drop-shadow-lg">{anime.title}</h1>
          {anime.year && <p className="text-lg text-neon-cyan font-semibold">{anime.year}</p>}
        </div>
      </div>

      {/* --- Synopsis and Other Details Grid --- */}
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
            <div className="mb-3"> {/* Genres */} </div>
          )}
          {anime.studios && anime.studios.length > 0 && (
            <div className="mb-3"> {/* Studios */} </div>
          )}
          {anime.themes && anime.themes.length > 0 && (
            <div className="mb-3"> {/* Themes */} </div>
          )}
          {anime.emotionalTags && anime.emotionalTags.length > 0 && (
            <div className="mb-3"> {/* Emotional Tags */} </div>
          )}
          {anime.rating !== undefined && anime.rating !== null && (anime.reviewCount === undefined || anime.reviewCount === 0) && (
             <div className="mt-3"> {/* External Rating */} </div>
           )}
        </div>
      </div>
      {/* --- Watchlist and Trailer Buttons --- */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* ... Watchlist Buttons ... */}
      </div>

      {/* --- Reviews Section --- */}
      <div id="review-section" className="mt-8 border-t border-brand-surface pt-6">
        <h2 className="text-2xl font-orbitron text-sakura-pink mb-6">User Reviews</h2>
        {canUserReview && (
            showReviewForm ? ( /* Review Form */ <ReviewForm animeId={anime._id} existingReview={editingReview} onSubmit={handleReviewSubmit} onCancel={() => { setShowReviewForm(false); setEditingReview(null); }} isLoading={isSubmittingReview} />
            ) : ( /* Add/Edit Review Button */ <div className="mb-6 text-center"> <StyledButton onClick={() => { setEditingReview(userReviewDoc ? { ...(userReviewDoc as any), userName: loggedInUser?.name || "You", userAvatarUrl: (loggedInUser as any)?.image || (loggedInUser as any)?.avatarUrl } : null); setShowReviewForm(true); }} variant="primary" > {userHasExistingReview ? "Edit Your Review" : "Add Your Review"} </StyledButton> </div>
            )
        )}
        {!isAuthenticated && !authIsLoading && <p className="text-brand-text-secondary text-center mb-6">Login to add your review.</p>}

        {/* Display logic for reviews list */}
        {(reviewsIsLoading && reviewsStatus === "LoadingFirstPage") && (
             <p className="text-brand-text-secondary text-center">Loading reviews...</p>
        )}
        {/* Show "No reviews" only if not loading first page AND the list is confirmed empty */}
        {!(reviewsIsLoading && reviewsStatus === "LoadingFirstPage") && (!reviews || reviews.length === 0) && (
             <p className="text-brand-text-secondary text-center">No reviews yet. Be the first to write one!</p>
        )}

        {reviews && reviews.length > 0 && (
          <div className="space-y-6">
            {reviews.map((review) => (
              <ReviewCard
                key={review._id}
                review={review as ReviewProps}
                currentUserId={currentUserId}
                onEdit={handleEditReview}
                onDelete={handleDeleteReview}
              />
            ))}
            {reviewsStatus === "CanLoadMore" && (
                 <div className="text-center mt-4">
                    <StyledButton
                        onClick={() => reviewsLoadMore(5)}
                        variant="secondary_small"
                        disabled={reviewsIsLoading && reviewsStatus === "LoadingMore"}
                    >
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

      {/* --- External Data Fetch Button --- */}
      <div className="mt-8 border-t border-brand-surface pt-4">
           <StyledButton
              onClick={handleFetchExternalData}
              variant="secondary_small"
              disabled={isFetchingExternal}
            >
              {isFetchingExternal ? "Fetching Details..." : "Fetch/Update More Details"}
            </StyledButton>
            <p className="text-xs text-brand-text-secondary mt-1">
              (Uses an example to simulate fetching from an external API)
            </p>
      </div>
    </div>
  );
}

// Simple Loading Spinner component
const LoadingSpinner: React.FC<{ message?: string }> = ({ message = "Loading..." }) => {
  return (
    <div className="flex flex-col justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan"></div>
      <p className="mt-3 text-brand-text-secondary">{message}</p> {/* Removed ml-2 for centering text under spinner */}
    </div>
  );
};