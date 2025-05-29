// src/components/animuse/AnimeDetailPage.tsx
import React, { useState, useEffect, useCallback, memo, FormEvent, JSX } from "react";
import { useQuery, useMutation, useAction, useConvexAuth, usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id, Doc } from "../../../convex/_generated/dataModel";
import StyledButton from "./shared/StyledButton";
import { toast } from "sonner";
import ReviewCard, { ReviewProps as ClientReviewProps } from "./onboarding/ReviewCard";
import ReviewForm from "./onboarding/ReviewForm";
import AnimeCard from "./AnimeCard"; // Renders poster + banner only
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
  navigateToDetail: (animeId: Id<"anime">) => void; // Add this prop
}

const LoadingSpinnerComponent: React.FC<{ message?: string; className?: string }> = ({ message = "Loading...", className = "" }) => (
    <div className={`flex flex-col justify-center items-center py-10 ${className}`}>
      <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:h-10 border-b-2 border-brand-primary-action"></div>
      {message && <p className="mt-2.5 sm:mt-3 text-xs sm:text-sm text-brand-text-primary/80">{message}</p>}
    </div>
);
const LoadingSpinner = memo(LoadingSpinnerComponent);

type ReviewSortOption = "newest" | "oldest" | "highest_rating" | "lowest_rating" | "most_helpful";

export default function AnimeDetailPage({ animeId, onBack }: AnimeDetailPageProps) {
  const anime = useQuery(api.anime.getAnimeById, animeId ? { animeId } : "skip");
  const watchlistEntry = useQuery(api.anime.getWatchlistItem, animeId ? { animeId } : "skip");
  const upsertToWatchlistMutation = useMutation(api.anime.upsertToWatchlist);
  const triggerFetchExternalDetailsAction = useAction(api.externalApis.callTriggerFetchExternalAnimeDetails);

  const { isLoading: authIsLoading, isAuthenticated } = useConvexAuth();
  const loggedInUser = useQuery(api.auth.loggedInUser, isAuthenticated ? {} : "skip");
  const currentUserId = isAuthenticated && loggedInUser ? loggedInUser._id : null;

  const [reviewSortOption, setReviewSortOption] = useState<ReviewSortOption>("newest");
  const [watchlistNotes, setWatchlistNotes] = useState(watchlistEntry?.notes || "");
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);

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
  const [isFetchingExternal, setIsFetchingExternal] = useState(false);

  const [similarAnime, setSimilarAnime] = useState<AnimeRecommendation[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [similarAnimeError, setSimilarAnimeError] = useState<string | null>(null);
  const [showSimilarAnime, setShowSimilarAnime] = useState(false);
  const getSimilarAnimeAction = useAction(api.ai.getSimilarAnimeRecommendations); // Using the corrected action name
  const userProfile = useQuery(api.users.getMyUserProfile, isAuthenticated ? {} : "skip");

  const canUserReview = isAuthenticated && !!currentUserId && !authIsLoading;
  const userHasExistingReview = !!userReviewDoc;

  useEffect(() => { setWatchlistNotes(watchlistEntry?.notes || ""); }, [watchlistEntry]);

  // Handle watchlist status changes (Plan to Watch, Watching, Completed, Dropped)
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

    // If they just started watching, could optionally show a tip about progress tracking
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

  // Check if notes actually changed
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
  const handleFetchExternalData = useCallback(async () => {
  if (!anime) return;
  
  setIsFetchingExternal(true);
  const toastId = `fetch-external-${anime._id}`;
  toast.loading("Enriching anime data...", { id: toastId });
  
  try {
    await triggerFetchExternalDetailsAction({ 
      animeIdInOurDB: anime._id,
      titleToSearch: anime.title
    });
    toast.success("Anime data updated successfully!", { id: toastId });
  } catch (error: any) {
    console.error("Failed to fetch external data:", error);
    toast.error(error.data?.message || "Failed to enrich anime data.", { id: toastId });
  } finally {
    setIsFetchingExternal(false);
  }
}, [anime, triggerFetchExternalDetailsAction]);

  // Handle review submission (both new reviews and edits)
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
      // Edit existing review
      await editReviewMutation({
        reviewId: data.reviewId,
        rating: data.rating,
        reviewText: data.reviewText?.trim() || "",
        isSpoiler: data.isSpoiler || false,
      });
      
      toast.success("Review updated successfully!", { id: toastId });
      setEditingReview(null);
    } else {
      // Add new review
      await addReviewMutation({
        animeId: data.animeId,
        rating: data.rating,
        reviewText: data.reviewText?.trim() || "",
        isSpoiler: data.isSpoiler || false,
      });
      
      toast.success("Review submitted successfully!", { id: toastId });
      
      // Show encouragement for first-time reviewers
      if (!userReviewDoc) {
        setTimeout(() => {
          toast.success("🎉 Thanks for your first review! Your thoughts help other anime fans.", {
            duration: 4000,
          });
        }, 1500);
      }
    }

    // Hide the review form
    setShowReviewForm(false);

  } catch (error: any) {
    console.error("Review submit error:", error);
    
    // Handle specific error cases
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

// Prepare a review for editing
const handleEditReview = useCallback((reviewToEdit: ClientReviewProps) => {
  if (!isAuthenticated) {
    toast.error("Please log in to edit reviews.");
    return;
  }

  // Check if this is the user's own review
  if (reviewToEdit.userId !== currentUserId) {
    toast.error("You can only edit your own reviews.");
    return;
  }

  // Set the review to be edited
  setEditingReview(reviewToEdit);
  setShowReviewForm(true);

  // Scroll to review form for better UX
  setTimeout(() => {
    const reviewSection = document.getElementById('review-section');
    if (reviewSection) {
      reviewSection.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  }, 100);

  toast.info("Review loaded for editing.");
}, [isAuthenticated, currentUserId, setEditingReview, setShowReviewForm]);

// Delete a review
const handleDeleteReview = useCallback(async (reviewIdToDelete: Id<"reviews">) => {
  if (!isAuthenticated) {
    toast.error("Please log in to delete reviews.");
    return;
  }

  // Find the review to check ownership
  const reviewToDelete = reviewsForDisplay.find(r => r._id === reviewIdToDelete);
  if (!reviewToDelete) {
    toast.error("Review not found.");
    return;
  }

  if (reviewToDelete.userId !== currentUserId) {
    toast.error("You can only delete your own reviews.");
    return;
  }

  // Confirm deletion
  const confirmMessage = reviewToDelete.reviewText && reviewToDelete.reviewText.length > 50
    ? "Are you sure you want to delete your review? This action cannot be undone."
    : "Delete your review? This cannot be undone.";
    
  if (!window.confirm(confirmMessage)) {
    return;
  }

  const toastId = `delete-review-${reviewIdToDelete}`;
  toast.loading("Deleting your review...", { id: toastId });

  try {
    await deleteReviewInternalMutation({ reviewId: reviewIdToDelete });
    
    toast.success("Review deleted successfully.", { id: toastId });
    
    // Clear editing state if we were editing this review
    if (editingReview && editingReview._id === reviewIdToDelete) {
      setEditingReview(null);
      setShowReviewForm(false);
    }

    // Show the review form again since they no longer have a review
    setTimeout(() => {
      toast.info("You can write a new review anytime!", {
        duration: 3000,
      });
    }, 1000);

  } catch (error: any) {
    console.error("Delete review error:", error);
    
    if (error.data?.message?.includes("not found")) {
      toast.error("Review not found or already deleted.", { id: toastId });
    } else if (error.data?.message?.includes("permission")) {
      toast.error("You don't have permission to delete this review.", { id: toastId });
    } else {
      toast.error(
        error.data?.message || error.message || "Failed to delete review.",
        { id: toastId }
      );
    }
  }
}, [isAuthenticated, currentUserId, reviewsForDisplay, deleteReviewInternalMutation, editingReview, setEditingReview, setShowReviewForm]);

  const loadSimilarAnime = useCallback(async () => {
    if (!anime) return;
    setLoadingSimilar(true);
    setSimilarAnimeError(null);
    setSimilarAnime([]); // Clear previous similar anime
    try {
        const profileForAI = userProfile ? {
            name: userProfile.name, moods: userProfile.moods, genres: userProfile.genres,
            favoriteAnimes: userProfile.favoriteAnimes, experienceLevel: userProfile.experienceLevel,
            dislikedGenres: userProfile.dislikedGenres, dislikedTags: userProfile.dislikedTags,
            characterArchetypes: userProfile.characterArchetypes, tropes: userProfile.tropes,
            artStyles: userProfile.artStyles, narrativePacing: userProfile.narrativePacing
        } : undefined;
        const result = await getSimilarAnimeAction({
          animeId: anime._id, // Pass the ID of the current anime
          userProfile: profileForAI,
          count: 3,
          messageId: `similar-${anime._id}-${Date.now()}`
        });
        if (result.error) {
            setSimilarAnimeError(result.error);
            toast.error(`Could not find similar anime: ${result.error.substring(0, 60)}`);
        } else {
            // Ensure results are actual AnimeRecommendation and have titles
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

  // User review form logic useEffect
useEffect(() => {
  // Much simpler logic - just clear editing state if needed
  if (editingReview && !reviewsForDisplay.find(r => r._id === editingReview._id)) {
    // The review being edited was deleted
    setEditingReview(null);
    setShowReviewForm(false);
  }
}, [editingReview, reviewsForDisplay, setEditingReview, setShowReviewForm]);

// Handle voting on reviews
const handleVote = async (reviewId: Id<"reviews">, voteType: "up" | "down") => {
  if (!isAuthenticated || !currentUserId) {
    toast.error("Please log in to vote on reviews.");
    return;
  }

  try {
    await voteOnReviewMutation({ reviewId, voteType });
    // The query will automatically update the UI
  } catch (error: any) {
    console.error("Vote error:", error);
    toast.error(error.data?.message || "Failed to record your vote.");
  }
};

// Toggle comments section for a review
const handleToggleComments = (reviewId: Id<"reviews">) => {
  if (activeReviewIdForComments === reviewId) {
    // Close comments
    setActiveReviewIdForComments(null);
  } else {
    // Open comments for this review
    setActiveReviewIdForComments(reviewId);
  }
};

// Start editing a comment
const handleEditComment = (comment: BackendCommentProps) => {
  setEditingCommentId(comment._id);
  setEditingCommentText(comment.commentText);
};

// Save edited comment
const handleSaveEditComment = async (commentId: Id<"reviewComments">) => {
  if (!editingCommentText.trim()) {
    toast.error("Comment cannot be empty.");
    return;
  }

  if (editingCommentText.length > 1000) {
    toast.error("Comment is too long (max 1000 characters).");
    return;
  }

  try {
    await editReviewCommentMutation({
      commentId,
      commentText: editingCommentText.trim(),
    });

    setEditingCommentId(null);
    setEditingCommentText("");
    toast.success("Comment updated!");
  } catch (error: any) {
    console.error("Edit comment error:", error);
    toast.error(error.data?.message || "Failed to update comment.");
  }
};

// Delete a comment
const handleDeleteComment = async (commentId: Id<"reviewComments">) => {
  if (!window.confirm("Are you sure you want to delete this comment?")) {
    return;
  }

  // Find the comment to verify ownership
  const findCommentInData = (comments: any[], targetId: string): any => {
    for (const comment of comments) {
      if (comment._id === targetId) return comment;
      if (comment.replies && comment.replies.length > 0) {
        const found = findCommentInData(comment.replies, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  const commentToDelete = findCommentInData(commentsDataForActiveReview || [], commentId);
  
  if (!commentToDelete) {
    toast.error("Comment not found.");
    return;
  }

  if (commentToDelete.userId !== currentUserId) {
    toast.error("You can only delete your own comments.");
    return;
  }

  // Confirm deletion
  const hasReplies = commentToDelete.replies && commentToDelete.replies.length > 0;
  const confirmMessage = hasReplies 
    ? "This comment has replies. Deleting it will also delete all replies. Are you sure?"
    : "Are you sure you want to delete this comment?";
    
  if (!window.confirm(confirmMessage)) {
    return;
  }

  const toastId = `delete-comment-${commentId}`;
  toast.loading("Deleting comment...", { id: toastId });

  try {
    await deleteReviewCommentMutation({ commentId });
    
    // Clear any editing state for this comment
    if (editingCommentId === commentId) {
      setEditingCommentId(null);
      setEditingCommentText("");
    }
    
    // Clear any reply state for this comment
    if (replyToCommentId === commentId) {
      setReplyToCommentId(null);
      setNewReplyText("");
    }
    
    toast.success("Comment deleted.", { id: toastId });
  } catch (error: any) {
    console.error("Delete comment error:", error);
    toast.error(error.data?.message || "Failed to delete comment.", { id: toastId });
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

    // Clear the input
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

// Update the renderComment function with better reply logic
const renderComment = (comment: BackendCommentProps, reviewId: Id<"reviews">, depth = 0): JSX.Element => {
  const isEditing = editingCommentId === comment._id;
  const isReplying = replyToCommentId === comment._id;
  const isOwner = currentUserId === comment.userId;
  const maxDepth = 3; // Limit nesting depth
  const canReply = isAuthenticated && depth < maxDepth;

  return (
    <div key={comment._id} className={`${depth > 0 ? 'ml-4 sm:ml-6 border-l-2 border-brand-accent-peach/30 pl-3 sm:pl-4' : ''} mb-3 sm:mb-4`}>
      <div className="bg-brand-accent-peach/10 p-2.5 sm:p-3 rounded-lg">
        {/* Comment Header */}
        <div className="flex items-start mb-1.5">
          {comment.userAvatarUrl ? (
            <img 
              src={comment.userAvatarUrl} 
              alt={comment.userName} 
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-full mr-2 object-cover flex-shrink-0" 
            />
          ) : (
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-brand-accent-gold text-brand-surface flex items-center justify-center text-xs font-semibold mr-2 flex-shrink-0">
              {comment.userName?.charAt(0).toUpperCase() || "U"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <h5 className="font-medium text-brand-text-primary text-xs sm:text-sm truncate">
                {comment.userName}
              </h5>
              <p className="text-[10px] sm:text-xs text-brand-text-primary/60 flex-shrink-0">
                {formatDistanceToNow(new Date(comment._creationTime), { addSuffix: true })}
                {comment.updatedAt && comment.updatedAt !== comment._creationTime && (
                  <span className="ml-1 italic">(edited)</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Comment Content */}
        {isEditing ? (
          <div className="mb-2">
            <textarea
              value={editingCommentText}
              onChange={(e) => setEditingCommentText(e.target.value)}
              rows={3}
              maxLength={1000}
              className="form-input w-full !text-xs sm:!text-sm resize-none"
              placeholder="Edit your comment..."
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-[10px] text-brand-text-primary/60">
                {editingCommentText.length}/1000
              </p>
              <div className="flex gap-1.5">
                <StyledButton
                  onClick={() => {
                    setEditingCommentId(null);
                    setEditingCommentText("");
                  }}
                  variant="ghost"
                  className="!text-[10px] !px-1.5 !py-0.5"
                >
                  Cancel
                </StyledButton>
                <StyledButton
                  onClick={() => handleSaveEditComment(comment._id)}
                  variant="primary_small"
                  className="!text-[10px] !px-1.5 !py-0.5"
                  disabled={!editingCommentText.trim()}
                >
                  Save
                </StyledButton>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs sm:text-sm text-brand-text-primary/90 mb-2 leading-relaxed whitespace-pre-wrap">
            {comment.commentText}
          </p>
        )}

        {/* Comment Actions */}
        {!isEditing && (
          <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs">
            {canReply && (
              <button
                onClick={() => {
                  if (isReplying) {
                    // Cancel reply
                    setReplyToCommentId(null);
                    setNewReplyText("");
                  } else {
                    // Start reply
                    setReplyToCommentId(comment._id);
                    setNewReplyText("");
                    // Cancel any other ongoing replies
                    setEditingCommentId(null);
                  }
                }}
                className="text-brand-accent-gold hover:text-brand-primary-action font-medium transition-colors"
              >
                {isReplying ? "Cancel" : "Reply"}
              </button>
            )}
            {isOwner && (
              <>
                <button
                  onClick={() => {
                    handleEditComment(comment);
                    // Cancel any ongoing replies when editing
                    setReplyToCommentId(null);
                    setNewReplyText("");
                  }}
                  className="text-brand-accent-gold hover:text-brand-primary-action font-medium transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteComment(comment._id)}
                  className="text-red-600 hover:text-red-700 font-medium transition-colors"
                >
                  Delete
                </button>
              </>
            )}
            {/* Optional: Like/Vote on individual comments */}
            {!isOwner && (
              <button
                onClick={() => toast.info("Comment voting coming soon!")}
                className="text-brand-text-primary/50 hover:text-brand-accent-gold font-medium transition-colors"
              >
                👍
              </button>
            )}
          </div>
        )}

        {/* Reply Form */}
        {isReplying && (
          <div className="mt-3 pt-2 border-t border-brand-accent-peach/30">
            <div className="flex items-start gap-2 mb-2">
              <div className="w-5 h-5 rounded-full bg-brand-primary-action/20 text-brand-primary-action flex items-center justify-center text-xs flex-shrink-0">
                ↳
              </div>
              <div className="flex-1">
                <p className="text-xs text-brand-text-primary/80 mb-1">
                  Replying to <span className="font-medium text-brand-accent-gold">{comment.userName}</span>
                </p>
                <textarea
                  value={newReplyText}
                  onChange={(e) => setNewReplyText(e.target.value)}
                  rows={2}
                  maxLength={1000}
                  placeholder={`Reply to ${comment.userName}...`}
                  className="form-input w-full !text-xs sm:!text-sm resize-none"
                  autoFocus
                />
                <div className="flex justify-between items-center mt-1.5">
                  <p className="text-[10px] text-brand-text-primary/60">
                    {newReplyText.length}/1000
                  </p>
                  <div className="flex gap-1.5">
                    <StyledButton
                      onClick={() => {
                        setReplyToCommentId(null);
                        setNewReplyText("");
                      }}
                      variant="ghost"
                      className="!text-[10px] !px-1.5 !py-0.5"
                    >
                      Cancel
                    </StyledButton>
                    <StyledButton
                      onClick={() => handleAddComment(reviewId, comment._id)}
                      variant="primary_small"
                      className="!text-[10px] !px-1.5 !py-0.5"
                      disabled={isSubmittingComment || !newReplyText.trim()}
                    >
                      {isSubmittingComment ? "Posting..." : "Reply"}
                    </StyledButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Nested Replies - Render recursively */}
      {comment.replies && comment.replies.length > 0 && depth < maxDepth && (
        <div className="mt-2">
          {comment.replies.map((reply) => 
            renderComment(reply as BackendCommentProps, reviewId, depth + 1)
          )}
        </div>
      )}

      {/* Show indicator if there are replies but we've hit max depth */}
      {comment.replies && comment.replies.length > 0 && depth >= maxDepth && (
        <div className="mt-2 ml-4 text-xs text-brand-text-primary/60 italic">
          ... {comment.replies.length} more {comment.replies.length === 1 ? 'reply' : 'replies'} (max depth reached)
        </div>
      )}
    </div>
  );
};

  if (animeId && anime === undefined && !authIsLoading) return <LoadingSpinner message="Loading anime details..." className="text-brand-text-primary/80" />;
  if (authIsLoading && anime === undefined) return <LoadingSpinner message="Checking authentication..." className="text-brand-text-primary/80" />;
  if (animeId && reviewsStatus === "LoadingFirstPage" && (!reviewsForDisplay || reviewsForDisplay.length === 0) && !anime) return <LoadingSpinner message="Loading content..." className="text-brand-text-primary/80" />;
  if (!anime) { return <div className="text-center p-6 sm:p-8 bg-brand-surface text-brand-text-primary rounded-xl shadow-xl"><p className="mb-4">Anime not found or error loading.</p><StyledButton onClick={onBack} variant="primary">Back</StyledButton></div>; }

  const posterPlaceholder = `https://placehold.co/600x900/${'ECB091'.substring(1)}/${'321D0B'.substring(1)}/png?text=%20&font=poppins`;

  function navigateToDetail(animeId: Id<"anime">): void {
    throw new Error("Function not implemented.");
  }

  return (
    <div className="bg-brand-surface text-brand-text-primary rounded-xl shadow-xl p-3 sm:p-4 md:p-5 max-w-3xl mx-auto">
      <StyledButton onClick={onBack} variant="ghost" className="mb-3 text-sm text-brand-accent-gold hover:text-brand-primary-action">
        ← Back
      </StyledButton>
      
      <div className="relative mb-4 sm:mb-6 rounded-lg overflow-hidden shadow-lg">
        <img src={anime.posterUrl || posterPlaceholder} alt={anime.title} className="w-full h-56 sm:h-72 md:h-80 object-cover" onError={(e)=>{(e.target as HTMLImageElement).src = posterPlaceholder}}/>
        <div className="absolute inset-0 bg-gradient-to-t from-brand-background/80 via-brand-background/40 to-transparent pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 p-3 sm:p-4 md:p-5">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-heading text-brand-surface drop-shadow-md">{anime.title}</h1>
            {anime.year && <p className="text-sm sm:text-base text-brand-primary-action font-semibold drop-shadow-sm">{anime.year}</p>}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="md:col-span-2">
            <h2 className="text-md sm:text-lg font-heading text-brand-primary-action mb-1">Synopsis</h2>
            <p className="text-xs sm:text-sm text-brand-text-primary/90 leading-normal whitespace-pre-wrap">{anime.description || "No synopsis available."}</p>
        </div>
        <div className="space-y-2.5">
            {/* ... Rating and Genres display ... */}
        </div>
      </div>

       <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4 sm:mb-6">
         {/* ... Watchlist buttons ... */}
         {isAuthenticated ? (<>{watchlistEntry?.status === "Plan to Watch" ? <StyledButton onClick={()=>handleWatchlistAction("Watching")} className="flex-1 !py-2 !text-sm !bg-brand-accent-gold hover:!bg-brand-accent-gold/80 !text-brand-surface">Start Watching</StyledButton> : watchlistEntry?.status === "Watching" ? <StyledButton onClick={()=>handleWatchlistAction("Completed")} className="flex-1 !py-2 !text-sm !bg-brand-accent-peach hover:!bg-brand-accent-peach/80 !text-brand-text-primary">Mark Completed</StyledButton> : watchlistEntry?.status === "Completed" ? <div className="flex-1 text-center text-xs sm:text-sm font-semibold text-brand-primary-action p-2 rounded-md bg-brand-primary-action/10 border border-brand-primary-action/30">✓ Completed</div> : <StyledButton onClick={()=>handleWatchlistAction("Plan to Watch")} className="flex-1 !py-2 !text-sm" variant="primary">Add to Watchlist</StyledButton>}</>) : (<p className="text-xs sm:text-sm text-brand-text-primary/70">Login to manage watchlist.</p>)}
         {anime.trailerUrl && <a href={anime.trailerUrl} target="_blank" rel="noopener noreferrer" className="flex-1"><StyledButton variant="secondary" className="w-full !py-2 !text-sm">Watch Trailer</StyledButton></a>}
         <StyledButton onClick={loadSimilarAnime} variant="secondary" className="flex-1 !py-2 !text-sm !border-brand-accent-peach !text-brand-accent-peach hover:!bg-brand-accent-peach hover:!text-brand-text-primary" disabled={loadingSimilar}>{loadingSimilar ? "Finding..." : "Find Similar"}</StyledButton>
      </div>

      {showSimilarAnime && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-brand-accent-peach/10 rounded-lg">
          <h3 className="text-sm sm:text-base font-heading text-brand-accent-gold mb-2 sm:mb-3">Similar Anime</h3>
          {loadingSimilar && <LoadingSpinner message="Loading similar anime..." className="text-brand-text-primary/80 !py-5"/>}
          {similarAnimeError && <p className="text-red-500 text-xs sm:text-sm">{similarAnimeError}</p>}
          {!loadingSimilar && !similarAnimeError && similarAnime.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-5 sm:gap-x-4 sm:gap-y-6">
              {similarAnime.map((rec, idx) => (
                <div key={`similar-${idx}-${rec.title || idx}`} className="flex flex-col items-center">
                  <AnimeCard
                    anime={rec}
                    isRecommendation={true}
                    onViewDetails={navigateToDetail} // This should now work
                    className="w-full"
                  />
                  <h4
                    className="mt-1.5 text-xs text-center text-brand-text-primary w-full truncate px-1"
                    title={rec.title}
                  >
                    {rec.title || "Unknown Title"}
                  </h4>
                </div>
              ))}
            </div>
          )}
          {!loadingSimilar && !similarAnimeError && similarAnime.length === 0 && (
            <p className="text-xs sm:text-sm text-brand-text-primary/70">No similar anime found by AI.</p>
          )}
        </div>
      )}

     {/* Watchlist Notes Section */}
      {watchlistEntry && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-brand-accent-peach/10 rounded-lg border border-brand-accent-peach/30">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm sm:text-base font-heading text-brand-accent-gold font-semibold">
              My Notes
            </h3>
            <StyledButton
              onClick={() => setShowNotesInput(!showNotesInput)}
              variant="ghost"
              className="!text-xs text-brand-accent-gold hover:!text-brand-primary-action"
            >
              {showNotesInput ? "Cancel" : watchlistEntry.notes ? "Edit Notes" : "Add Notes"}
            </StyledButton>
          </div>
          
          {showNotesInput ? (
            <div className="space-y-2">
              <textarea
                value={watchlistNotes}
                onChange={(e) => setWatchlistNotes(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Your private thoughts about this anime..."
                className="form-input w-full !text-sm !text-brand-text-primary resize-none"
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-brand-text-primary/60">
                  {watchlistNotes.length}/500 characters
                </p>
                <div className="flex gap-2">
                  <StyledButton
                    onClick={() => {
                      setWatchlistNotes(watchlistEntry.notes || "");
                      setShowNotesInput(false);
                    }}
                    variant="ghost"
                    className="!text-xs"
                    disabled={isSavingNotes}
                  >
                    Cancel
                  </StyledButton>
                  <StyledButton
                    onClick={handleSaveWatchlistNotes}
                    variant="primary_small"
                    className="!text-xs"
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
                <p className="text-sm text-brand-text-primary/90 leading-relaxed whitespace-pre-wrap bg-brand-surface p-2 rounded border border-brand-accent-peach/20">
                  {watchlistEntry.notes}
                </p>
              ) : (
                <p className="text-xs text-brand-text-primary/60 italic">
                  No notes yet. Click "Add Notes" to record your thoughts!
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Review Section - Allow Multiple Reviews */}
      <div id="review-section" className="mt-4 sm:mt-6 border-t border-brand-accent-peach/30 pt-3 sm:pt-4">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-heading text-brand-primary-action font-semibold">
            Reviews
          </h3>
          {/* Always show Write Review button for authenticated users */}
          {isAuthenticated && (
            <StyledButton
              onClick={() => setShowReviewForm(!showReviewForm)}
              variant="primary_small"
              className="!text-xs sm:!text-sm"
            >
              {showReviewForm ? "Cancel" : "Write Review"}
            </StyledButton>
          )}
        </div>

        {/* Review Form - Always allow new reviews */}
        {showReviewForm && isAuthenticated && (
          <div className="mb-4 sm:mb-6">
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

        {/* Review Sort Options */}
        {reviewsForDisplay.length > 1 && (
          <div className="mb-3 sm:mb-4 flex justify-end">
            <select
              value={reviewSortOption}
              onChange={(e) => setReviewSortOption(e.target.value as ReviewSortOption)}
              className="form-input !text-xs !py-1.5 !px-2 w-auto !text-brand-text-primary"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest_rating">Highest Rated</option>
              <option value="lowest_rating">Lowest Rated</option>
              <option value="most_helpful">Most Helpful</option>
            </select>
          </div>
        )}

        {/* All Reviews List (including user's reviews) */}
        {reviewsIsLoadingInitial && reviewsForDisplay.length === 0 ? (
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-primary-action mx-auto mb-2"></div>
            <p className="text-xs text-brand-text-primary/70">Loading reviews...</p>
          </div>
        ) : reviewsForDisplay.length > 0 ? (
          <div className="space-y-3 sm:space-y-4">
            {reviewsForDisplay.map((review) => (
              <div key={review._id} className="bg-brand-surface p-3 sm:p-4 rounded-lg shadow-sm border border-brand-accent-peach/30">
                <ReviewCard
                  review={review}
                  currentUserId={currentUserId}
                  onEdit={handleEditReview}
                  onDelete={handleDeleteReview}
                />
                
                {/* Review Actions (Vote and Comments) */}
                <div className="mt-3 pt-2 border-t border-brand-accent-peach/20 flex items-center justify-between">
                  <div className="flex items-center gap-3 sm:gap-4">
                    {/* Voting */}
                    <div className="flex items-center gap-1.5">
                      <StyledButton
                        onClick={() => handleVote(review._id, "up")}
                        variant="ghost"
                        className={`!text-xs !px-1.5 !py-0.5 ${
                          review.currentUserVote === "up" 
                            ? "!text-brand-primary-action !bg-brand-primary-action/10" 
                            : "!text-brand-text-primary/70 hover:!text-brand-primary-action"
                        }`}
                        disabled={!isAuthenticated || review.userId === currentUserId}
                      >
                        👍 {review.upvotes || 0}
                      </StyledButton>
                      <StyledButton
                        onClick={() => handleVote(review._id, "down")}
                        variant="ghost"
                        className={`!text-xs !px-1.5 !py-0.5 ${
                          review.currentUserVote === "down" 
                            ? "!text-red-500 !bg-red-500/10" 
                            : "!text-brand-text-primary/70 hover:!text-red-500"
                        }`}
                        disabled={!isAuthenticated || review.userId === currentUserId}
                      >
                        👎 {review.downvotes || 0}
                      </StyledButton>
                    </div>

                    {/* Comments Toggle */}
                    <StyledButton
                      onClick={() => handleToggleComments(review._id)}
                      variant="ghost"
                      className="!text-xs !px-1.5 !py-0.5 !text-brand-accent-gold hover:!text-brand-primary-action"
                    >
                      💬 {review.commentCount || 0} Comments
                    </StyledButton>
                  </div>
                </div>

                {/* Simple Comments Section */}
                {activeReviewIdForComments === review._id && (
                  <div className="mt-3 pt-3 border-t border-brand-accent-peach/30">
                    {/* Add Comment Form */}
                    {isAuthenticated && (
                      <div className="mb-3">
                        <textarea
                          value={newCommentText[review._id] || ""}
                          onChange={(e) => setNewCommentText(prev => ({ ...prev, [review._id]: e.target.value }))}
                          rows={2}
                          maxLength={1000}
                          placeholder="Add a comment..."
                          className="form-input w-full !text-xs sm:!text-sm !text-brand-text-primary mb-2"
                        />
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] text-brand-text-primary/60">
                            {(newCommentText[review._id] || "").length}/1000
                          </p>
                          <StyledButton
                            onClick={() => handleAddComment(review._id)}
                            variant="primary_small"
                            className="!text-xs"
                            disabled={isSubmittingComment || !(newCommentText[review._id] || "").trim()}
                          >
                            {isSubmittingComment ? "Posting..." : "Post Comment"}
                          </StyledButton>
                        </div>
                      </div>
                    )}

                    {/* Simple Comments List */}
                    {commentsIsLoading && (
                      <div className="text-center py-3">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-primary-action mx-auto mb-1"></div>
                        <p className="text-xs text-brand-text-primary/70">Loading comments...</p>
                      </div>
                    )}

                    {commentsDataForActiveReview && commentsDataForActiveReview.length > 0 ? (
                      <div className="space-y-2 sm:space-y-3">
                        {commentsDataForActiveReview.map((comment) => (
                          <div key={comment._id} className="bg-brand-accent-peach/10 p-2.5 sm:p-3 rounded-lg">
                            {/* Comment Header */}
                            <div className="flex items-start mb-1.5">
                              {comment.userAvatarUrl ? (
                                <img 
                                  src={comment.userAvatarUrl} 
                                  alt={comment.userName} 
                                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full mr-2 object-cover" 
                                />
                              ) : (
                                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-brand-accent-gold text-brand-surface flex items-center justify-center text-xs font-semibold mr-2">
                                  {comment.userName?.charAt(0).toUpperCase() || "U"}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                  <h5 className="font-medium text-brand-text-primary text-xs sm:text-sm">
                                    {comment.userName}
                                  </h5>
                                  <p className="text-[10px] sm:text-xs text-brand-text-primary/60">
                                    {formatDistanceToNow(new Date(comment._creationTime), { addSuffix: true })}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Comment Content */}
                            {editingCommentId === comment._id ? (
                              <div className="mb-2">
                                <textarea
                                  value={editingCommentText}
                                  onChange={(e) => setEditingCommentText(e.target.value)}
                                  rows={3}
                                  maxLength={1000}
                                  className="form-input w-full !text-xs sm:!text-sm"
                                  placeholder="Edit your comment..."
                                />
                                <div className="flex justify-end gap-1.5 mt-2">
                                  <StyledButton
                                    onClick={() => {
                                      setEditingCommentId(null);
                                      setEditingCommentText("");
                                    }}
                                    variant="ghost"
                                    className="!text-[10px] !px-1.5 !py-0.5"
                                  >
                                    Cancel
                                  </StyledButton>
                                  <StyledButton
                                    onClick={() => handleSaveEditComment(comment._id)}
                                    variant="primary_small"
                                    className="!text-[10px] !px-1.5 !py-0.5"
                                  >
                                    Save
                                  </StyledButton>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs sm:text-sm text-brand-text-primary/90 mb-2 leading-relaxed whitespace-pre-wrap">
                                {comment.commentText}
                              </p>
                            )}

                            {/* Comment Actions */}
                            {editingCommentId !== comment._id && currentUserId === comment.userId && (
                              <div className="flex items-center gap-2 text-[10px] sm:text-xs">
                                <button
                                  onClick={() => {
                                    setEditingCommentId(comment._id);
                                    setEditingCommentText(comment.commentText);
                                  }}
                                  className="text-brand-accent-gold hover:text-brand-primary-action font-medium"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteComment(comment._id)}
                                  className="text-red-600 hover:text-red-700 font-medium"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : !commentsIsLoading && (
                      <p className="text-xs text-brand-text-primary/60 text-center py-3 italic">
                        No comments yet. {isAuthenticated ? "Be the first to comment!" : "Log in to comment."}
                      </p>
                    )}

                    {/* Load More Comments */}
                    {commentsPaginationStatus === "CanLoadMore" && (
                      <div className="text-center mt-3">
                        <StyledButton
                          onClick={() => commentsLoadMore(3)}
                          variant="ghost"
                          className="!text-xs text-brand-accent-gold hover:!text-brand-primary-action"
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

            {/* Load More Reviews */}
            {reviewsStatus === "CanLoadMore" && (
              <div className="text-center mt-4 sm:mt-5">
                <StyledButton
                  onClick={() => reviewsLoadMore(3)}
                  variant="secondary"
                  disabled={reviewsIsLoadingInitial}
                >
                  {reviewsIsLoadingInitial ? "Loading..." : "Load More Reviews"}
                </StyledButton>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 sm:py-8 bg-brand-accent-peach/10 rounded-lg">
            <p className="text-sm text-brand-text-primary/80 mb-2">No reviews yet.</p>
            {isAuthenticated ? (
              <StyledButton
                onClick={() => setShowReviewForm(true)}
                variant="primary_small"
              >
                Write the First Review
              </StyledButton>
            ) : (
              <p className="text-xs text-brand-text-primary/60">
                Log in to write the first review!
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 sm:mt-6 border-t border-brand-accent-peach/30 pt-3 text-center">
        <StyledButton onClick={handleFetchExternalData} variant="ghost" className="!text-xs text-brand-accent-gold hover:!text-brand-primary-action" disabled={isFetchingExternal || !anime}>
          {isFetchingExternal ? "Fetching Details..." : "Refresh/Enrich Anime Data"}
        </StyledButton>
      </div>
    </div>
  );
}

// Helper function to navigate to detail page - this should be passed from MainApp
// const navigateToDetail = (animeId: Id<"anime">) => {
//   // This function would typically be part of MainApp's context or passed as a prop
//   console.log("Navigate to detail for:", animeId);
//   // Example: setCurrentView("anime_detail"); setSelectedAnimeId(animeId);
// };
