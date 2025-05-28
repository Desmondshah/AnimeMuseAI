// src/components/animuse/AnimeDetailPage.tsx
import React, { useState, useEffect, useCallback, memo, FormEvent, JSX } from "react";
import { useQuery, useMutation, useAction, useConvexAuth, usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id, Doc } from "../../../convex/_generated/dataModel";
import StyledButton from "./shared/StyledButton";
import { toast } from "sonner";
import ReviewCard, { ReviewProps as ClientReviewProps } from "./onboarding/ReviewCard"; // Themed
import ReviewForm from "./onboarding/ReviewForm"; // Themed
import AnimeCard from "./AnimeCard"; // Themed
import { AnimeRecommendation } from "../../../convex/types";

interface BackendReviewProps extends Doc<"reviews"> {
  userName: string; userAvatarUrl?: string; upvotes: number; downvotes: number;
  currentUserVote: "up" | "down" | null; commentCount: number;
}
interface BackendCommentProps extends Doc<"reviewComments"> {
    userName: string; userAvatarUrl?: string;
    replies: (Doc<"reviewComments"> & { userName: string; userAvatarUrl?: string })[];
}

interface AnimeDetailPageProps { animeId: Id<"anime">; onBack: () => void; }

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
  const getSimilarAnimeAction = useAction(api.ai.getSimilarAnimeRecommendations);
  const userProfile = useQuery(api.users.getMyUserProfile, isAuthenticated ? {} : "skip");

  const canUserReview = isAuthenticated && !!currentUserId && !authIsLoading;
  const userHasExistingReview = !!userReviewDoc;

  useEffect(() => { setWatchlistNotes(watchlistEntry?.notes || ""); }, [watchlistEntry]);

  const handleWatchlistAction = useCallback(async (status: string) => {
    if (!isAuthenticated || !anime) { toast.error("Login required."); return; }
    try {
        await upsertToWatchlistMutation({ animeId: anime._id, status, notes: watchlistNotes, progress: watchlistEntry?.progress, userRating: watchlistEntry?.userRating });
        toast.success("Watchlist updated!");
    } catch (e: any) { toast.error(e.data?.message || "Failed to update watchlist."); }
  }, [isAuthenticated, anime, upsertToWatchlistMutation, watchlistEntry, watchlistNotes]);

  const handleSaveWatchlistNotes = useCallback(async () => {
    if (!isAuthenticated || !anime || !watchlistEntry) { toast.error("Login & add to watchlist first."); return; }
    setIsSavingNotes(true);
    try {
        await upsertToWatchlistMutation({ animeId: anime._id, status: watchlistEntry.status, notes: watchlistNotes, progress: watchlistEntry.progress, userRating: watchlistEntry.userRating });
        toast.success("Notes saved!"); setShowNotesInput(false);
    } catch (e: any) { toast.error(e.data?.message || "Failed to save notes."); }
    finally { setIsSavingNotes(false); }
  }, [isAuthenticated, anime, watchlistEntry, watchlistNotes, upsertToWatchlistMutation]);

  const handleFetchExternalData = useCallback(async () => {
    if (!anime) return;
    setIsFetchingExternal(true); toast.loading("Fetching details...", {id: `ext-${anime._id}`});
    try {
        const result = await triggerFetchExternalDetailsAction({ animeIdInOurDB: anime._id, titleToSearch: anime.title });
        if (result.success) toast.success("Details updated!", {id: `ext-${anime._id}`});
        else toast.error(result.message || "Could not fetch details.", {id: `ext-${anime._id}`});
    } catch (e: any) { toast.error("Failed to trigger fetch.", {id: `ext-${anime._id}`}); }
    finally { setIsFetchingExternal(false); }
  }, [anime, triggerFetchExternalDetailsAction]);

  const handleReviewSubmit = useCallback(async (data: { animeId: Id<"anime">; rating: number; reviewText?: string; isSpoiler?: boolean; reviewId?: Id<"reviews">}) => {
    if (!isAuthenticated || !anime) { toast.error("Login to review."); return; }
    setIsSubmittingReview(true);
    try {
        if (data.reviewId) await editReviewMutation({ reviewId: data.reviewId, rating: data.rating, reviewText: data.reviewText, isSpoiler: data.isSpoiler });
        else await addReviewMutation({ animeId: anime._id, rating: data.rating, reviewText: data.reviewText, isSpoiler: data.isSpoiler });
        toast.success(data.reviewId ? "Review updated!" : "Review added!");
        setShowReviewForm(false); setEditingReview(null);
    } catch (e:any) { toast.error(e.data?.message || "Failed to submit review."); }
    finally { setIsSubmittingReview(false); }
  }, [isAuthenticated, anime, addReviewMutation, editReviewMutation]);

  const handleEditReview = useCallback((reviewToEdit: ClientReviewProps) => { setEditingReview(reviewToEdit); setShowReviewForm(true); document.getElementById("review-form-section")?.scrollIntoView({behavior: "smooth"}); }, []);
  const handleDeleteReview = useCallback(async (reviewIdToDelete: Id<"reviews">) => {
    if (!isAuthenticated) { toast.error("Login to delete."); return; }
      if (window.confirm("Delete this review? This will also delete its comments and votes.")) {
          try { await deleteReviewInternalMutation({ reviewId: reviewIdToDelete }); toast.success("Review deleted."); if (editingReview?._id === reviewIdToDelete) { setShowReviewForm(false); setEditingReview(null);}}
          catch (e:any) { toast.error(e.data?.message || "Failed to delete."); }
      }
  }, [isAuthenticated, deleteReviewInternalMutation, editingReview]);

  const loadSimilarAnime = useCallback(async () => {
    if (!anime) return; setLoadingSimilar(true); setSimilarAnimeError(null);
    try {
        const profileForAI = userProfile ? { name: userProfile.name, moods: userProfile.moods, genres: userProfile.genres, favoriteAnimes: userProfile.favoriteAnimes, experienceLevel: userProfile.experienceLevel, dislikedGenres: userProfile.dislikedGenres, dislikedTags: userProfile.dislikedTags, characterArchetypes: userProfile.characterArchetypes, tropes: userProfile.tropes, artStyles: userProfile.artStyles, narrativePacing: userProfile.narrativePacing } : undefined;
        const result = await getSimilarAnimeAction({
          animeId: anime._id, userProfile: profileForAI, count: 3,
          messageId: `similar-${anime._id}-${Date.now()}`
        });
        if (result.error) setSimilarAnimeError(result.error); else setSimilarAnime(result.recommendations as AnimeRecommendation[]);
        setShowSimilarAnime(true);
    } catch (e:any) { setSimilarAnimeError("Failed to load similar anime."); }
    finally { setLoadingSimilar(false); }
  }, [anime, userProfile, getSimilarAnimeAction]);

  useEffect(() => {
    if (userReviewDoc && showReviewForm && !editingReview) {
      const mapped: ClientReviewProps = {
        ...userReviewDoc,
        userName: loggedInUser?.name || "You",
        userAvatarUrl: (userProfile as any)?.avatarUrl // Assuming avatarUrl is on userProfile
      };
      setEditingReview(mapped);
    } else if (!userReviewDoc && !showReviewForm && editingReview) {
      setEditingReview(null);
    }
  }, [userReviewDoc, showReviewForm, loggedInUser, editingReview, userProfile]);


  const handleVote = async (reviewId: Id<"reviews">, voteType: "up" | "down") => {
    if (!isAuthenticated || !currentUserId) { toast.error("Login to vote."); return; }
    if (reviewsForDisplay.find(r => r._id === reviewId)?.userId === currentUserId) { toast.error("You cannot vote on your own review."); return; }
    try { await voteOnReviewMutation({ reviewId, voteType }); toast.success("Vote recorded!"); }
    catch (error: any) { toast.error(error.data?.message || "Failed to vote."); }
  };
  const handleToggleComments = (reviewId: Id<"reviews">) => {
    setActiveReviewIdForComments(prev => prev === reviewId ? null : reviewId);
    setReplyToCommentId(null); setEditingCommentId(null);
  };
  const handleAddComment = async (reviewId: Id<"reviews">, parentId?: Id<"reviewComments">) => {
    if (!isAuthenticated) { toast.error("Login to comment."); return; }
    const text = parentId ? newReplyText : (newCommentText[reviewId.toString()] || "");
    if (!text.trim()) { toast.error("Comment cannot be empty."); return; }
    setIsSubmittingComment(true);
    try {
      await addReviewCommentMutation({ reviewId, commentText: text, parentId });
      toast.success("Comment added!");
      if (parentId) setNewReplyText(""); else setNewCommentText(prev => ({...prev, [reviewId.toString()]: ""}));
      setReplyToCommentId(null);
    } catch (error: any) { toast.error(error.data?.message || "Failed to add comment."); }
    finally { setIsSubmittingComment(false); }
  };
  const handleEditComment = (comment: BackendCommentProps) => {
    setEditingCommentId(comment._id); setEditingCommentText(comment.commentText); setReplyToCommentId(null);
  };
  const handleSaveEditComment = async (commentId: Id<"reviewComments">) => {
    if (!editingCommentText.trim()) { toast.error("Comment cannot be empty."); return;}
    setIsSubmittingComment(true);
    try {
        await editReviewCommentMutation({commentId, commentText: editingCommentText });
        toast.success("Comment updated!"); setEditingCommentId(null); setEditingCommentText("");
    } catch (error: any) { toast.error(error.data?.message || "Failed to update comment."); }
    finally { setIsSubmittingComment(false); }
  };
  const handleDeleteComment = async (commentId: Id<"reviewComments">) => {
    if (!isAuthenticated) { toast.error("Login to delete."); return; }
    if (window.confirm("Delete this comment and its replies?")) {
        setIsSubmittingComment(true);
        try {
            await deleteReviewCommentMutation({ commentId });
            toast.success("Comment deleted.");
        } catch (error: any) { toast.error(error.data?.message || "Failed to delete comment."); }
        finally { setIsSubmittingComment(false); }
    }
  };

  const commentInputBase = "form-input !text-xs !py-1.5 !px-2 w-full"; // For light backgrounds
  const commentInputDarkBg = `${commentInputBase} !bg-brand-background !border-brand-accent-gold/70 !text-brand-text-on-dark !placeholder-brand-text-on-dark/50 focus:!border-brand-primary-action focus:!ring-brand-primary-action`; // For dark backgrounds (like inside comment thread)

  const renderComment = (comment: BackendCommentProps, reviewId: Id<"reviews">, depth = 0): JSX.Element => (
    <div key={comment._id} className={`mt-2 p-2 bg-brand-background/20 text-brand-text-on-dark rounded-md shadow-sm ${depth > 0 ? `ml-2 sm:ml-3` : ''}`}> {/* Slightly darker bubbles for comments */}
        <div className="flex items-start mb-1">
            {comment.userAvatarUrl ? <img src={comment.userAvatarUrl} alt={comment.userName} className="w-5 h-5 rounded-full mr-1.5 object-cover shadow-sm"/> : <div className="w-5 h-5 rounded-full bg-brand-accent-gold text-brand-surface flex items-center justify-center text-[10px] mr-1.5 shadow-sm">{comment.userName?.charAt(0).toUpperCase()}</div>}
            <div>
                <span className="text-xs font-semibold text-brand-primary-action">{comment.userName}</span>
                <span className="text-[10px] text-brand-text-on-dark/70 ml-1.5">{new Date(comment.createdAt).toLocaleDateString()} {comment.updatedAt && "(edited)"}</span>
            </div>
        </div>

        {editingCommentId === comment._id ? (
            <form onSubmit={(e) => {e.preventDefault(); handleSaveEditComment(comment._id);}} className="my-1 space-y-1">
                <textarea value={editingCommentText} onChange={(e) => setEditingCommentText(e.target.value)} className={commentInputDarkBg} rows={2} autoFocus/>
                <div className="flex gap-1">
                    <StyledButton type="submit" variant="primary_small" className="!text-[10px] !px-2 !py-1" disabled={isSubmittingComment}>{isSubmittingComment ? "Saving..." : "Save"}</StyledButton>
                    <StyledButton type="button" onClick={() => setEditingCommentId(null)} variant="secondary_small" className="!text-[10px] !px-2 !py-1" disabled={isSubmittingComment}>Cancel</StyledButton>
                </div>
            </form>
        ) : ( <p className="text-xs text-brand-text-on-dark/90 whitespace-pre-wrap py-1">{comment.commentText}</p> )}

        <div className="flex items-center gap-1.5 mt-1">
            <button onClick={() => { setReplyToCommentId(replyToCommentId === comment._id ? null : comment._id); setNewReplyText(""); setEditingCommentId(null);}} className="text-[10px] text-brand-accent-gold hover:underline focus:outline-none">Reply</button>
            {isAuthenticated && currentUserId === comment.userId && editingCommentId !== comment._id && (
                <>
                    <span className="text-[10px] text-brand-text-on-dark/50">•</span>
                    <button onClick={() => handleEditComment(comment)} className="text-[10px] text-brand-accent-peach hover:underline focus:outline-none">Edit</button>
                    <span className="text-[10px] text-brand-text-on-dark/50">•</span>
                    <button onClick={() => handleDeleteComment(comment._id)} className="text-[10px] text-red-400 hover:text-red-500 hover:underline focus:outline-none" disabled={isSubmittingComment}>Delete</button>
                </>
            )}
        </div>

        {replyToCommentId === comment._id && (
            <form onSubmit={(e) => { e.preventDefault(); handleAddComment(reviewId, comment._id); }} className={`mt-1.5 flex gap-1 ${depth > 0 ? 'ml-1' : ''}`}> {/* Reduced margin for replies */}
                <input type="text" value={newReplyText} onChange={(e) => setNewReplyText(e.target.value)} placeholder="Write a reply..." className={`${commentInputDarkBg} flex-grow`} autoFocus/>
                <StyledButton type="submit" variant="secondary_small" className="!text-[10px] !px-2 !py-1" disabled={isSubmittingComment}>{isSubmittingComment ? "..." : "Post"}</StyledButton>
            </form>
        )}
        {comment.replies && comment.replies.length > 0 && (
            <div className="mt-1.5 pl-1.5 sm:pl-2 border-l-2 border-brand-accent-gold/30">
                {comment.replies.map(reply => renderComment(reply as BackendCommentProps, reviewId, depth + 1))}
            </div>
        )}
    </div>
  );

  // Initial loading checks
  if (animeId && anime === undefined && !authIsLoading) return <LoadingSpinner message="Loading anime details..." className="text-brand-text-primary/80" />;
  if (authIsLoading && anime === undefined) return <LoadingSpinner message="Checking authentication..." className="text-brand-text-primary/80" />;
  if (animeId && reviewsStatus === "LoadingFirstPage" && (!reviewsForDisplay || reviewsForDisplay.length === 0) && !anime) return <LoadingSpinner message="Loading content..." className="text-brand-text-primary/80" />;
  if (!anime) { return <div className="text-center p-6 sm:p-8 bg-brand-surface text-brand-text-primary rounded-xl shadow-xl"><p className="mb-4">Anime not found or error loading.</p><StyledButton onClick={onBack} variant="primary">Back</StyledButton></div>; }

  const posterPlaceholder = `https://placehold.co/600x900/${'ECB091'.substring(1)}/${'321D0B'.substring(1)}/png?text=${encodeURIComponent(anime.title.substring(0,15))}&font=poppins`;

  function onViewDetails(animeId: Id<"anime">): void {
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
            {anime.averageUserRating !== undefined && (
            <div>
                <h3 className="text-xs sm:text-sm font-heading text-brand-accent-gold mb-0.5">User Rating</h3>
                <div className="flex items-center">
                    <svg className="w-4 h-4 text-brand-primary-action mr-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                    <span className="text-md sm:text-lg text-brand-primary-action font-semibold">{anime.averageUserRating.toFixed(1)}</span>
                    <span className="text-[10px] sm:text-xs text-brand-text-primary/70 ml-1">/ 5 ({anime.reviewCount || 0} review{(!anime.reviewCount || anime.reviewCount !== 1) ? 's' : ''})</span>
                </div>
            </div>
            )}
            {anime.genres && anime.genres.length > 0 && (
            <div>
                <h3 className="text-xs sm:text-sm font-heading text-brand-accent-gold mb-0.5">Genres</h3>
                <div className="flex flex-wrap gap-1">
                {anime.genres.slice(0, 4).map(g => (<span key={g} className="text-[9px] sm:text-[10px] bg-brand-accent-gold/20 text-brand-accent-gold font-medium px-1.5 py-0.5 rounded-full">{g}</span>))}
                {anime.genres.length > 4 && <span className="text-[9px] sm:text-[10px] text-brand-text-primary/60 self-center">+{anime.genres.length-4} more</span>}
                </div>
            </div>
            )}
        </div>
      </div>

       <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4 sm:mb-6">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-2.5">
              {similarAnime.map((rec, idx) => ( <AnimeCard key={`similar-${idx}`} anime={rec} isRecommendation={true} onViewDetails={onViewDetails} /> ))}
            </div>
          )}
           {!loadingSimilar && !similarAnimeError && similarAnime.length === 0 && ( <p className="text-xs sm:text-sm text-brand-text-primary/70">No similar anime found by AI.</p> )}
        </div>
      )}

      {isAuthenticated && watchlistEntry && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-brand-background/5 rounded-lg text-brand-text-on-dark">
            <div className="flex justify-between items-center mb-1.5">
                <h3 className="text-sm sm:text-base font-heading text-brand-accent-gold">My Watchlist Notes</h3>
                <StyledButton onClick={() => setShowNotesInput(!showNotesInput)} variant="ghost" className="!text-xs !text-brand-accent-peach hover:!text-brand-primary-action">{showNotesInput ? "Cancel" : (watchlistNotes ? "Edit Notes" : "Add Notes")}</StyledButton>
            </div>
            {showNotesInput ? (<div><textarea value={watchlistNotes} onChange={(e) => setWatchlistNotes(e.target.value)} rows={3} placeholder="Your private notes for this anime..." className={`${commentInputDarkBg} !text-xs sm:!text-sm`} maxLength={500}/><StyledButton onClick={handleSaveWatchlistNotes} variant="primary_small" disabled={isSavingNotes} className="mt-1.5 !text-xs">{isSavingNotes ? "Saving..." : "Save Notes"}</StyledButton></div>) : (watchlistNotes ? (<p className="text-xs sm:text-sm text-brand-text-on-dark/80 whitespace-pre-wrap">{watchlistNotes}</p>) : (<p className="text-xs sm:text-sm text-brand-text-on-dark/70 italic">No notes yet.</p>))}
        </div>
      )}

      <div id="review-section" className="mt-4 sm:mt-6 border-t border-brand-accent-peach/30 pt-3 sm:pt-4">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-3 sm:mb-4 gap-2">
            <h2 className="text-md sm:text-lg font-heading text-brand-primary-action">User Reviews</h2>
            <div className="flex items-center gap-1.5 self-end sm:self-center">
                <label htmlFor="reviewSort" className="text-xs text-brand-text-primary/80">Sort:</label>
                <select id="reviewSort" value={reviewSortOption} onChange={(e) => setReviewSortOption(e.target.value as ReviewSortOption)} className="form-input !text-xs !py-1 !px-1.5 w-auto">
                    <option value="newest">Newest</option><option value="oldest">Oldest</option>
                    <option value="highest_rating">Highest Rated</option><option value="lowest_rating">Lowest Rated</option>
                    <option value="most_helpful">Most Helpful</option>
                </select>
            </div>
        </div>
        {canUserReview && anime && (showReviewForm ? (<div id="review-form-section" className="mb-3 sm:mb-4"><ReviewForm animeId={anime._id} existingReview={editingReview} onSubmit={handleReviewSubmit} onCancel={() => { setShowReviewForm(false); setEditingReview(null); }} isLoading={isSubmittingReview} /></div>) : (<div className="mb-3 sm:mb-4 text-center"><StyledButton onClick={() => { setEditingReview(userReviewDoc ? { ...userReviewDoc, userName: loggedInUser?.name || "You", userAvatarUrl: (userProfile as any)?.avatarUrl} : null); setShowReviewForm(true); }} variant="primary" className="!px-4 !py-2 !text-sm">{userHasExistingReview ? "Edit Your Review" : "Add Your Review"}</StyledButton></div>) )}
        {!isAuthenticated && !authIsLoading && <p className="text-xs sm:text-sm text-brand-text-primary/70 text-center mb-3 sm:mb-4">Login to add your review.</p>}

        {(reviewsIsLoadingInitial && (!reviewsForDisplay || reviewsForDisplay.length === 0)) && <LoadingSpinner message="Loading reviews..." className="text-brand-text-primary/80"/>}
        {!reviewsIsLoadingInitial && (!reviewsForDisplay || reviewsForDisplay.length === 0) && <p className="text-xs sm:text-sm text-brand-text-primary/70 text-center py-4">No reviews yet. Be the first!</p>}

        {reviewsForDisplay && reviewsForDisplay.length > 0 && (
          <div className="space-y-3">
            {reviewsForDisplay.map((review) => (
              <div key={review._id} className="bg-brand-surface p-2.5 sm:p-3 rounded-lg shadow-sm border border-brand-accent-peach/20"> {/* Review item card */}
                <ReviewCard review={review} currentUserId={currentUserId as Id<"users"> | undefined} onEdit={handleEditReview} onDelete={handleDeleteReview} />
                <div className="mt-1.5 pt-1.5 border-t border-brand-accent-peach/20 flex items-center gap-1 sm:gap-1.5 flex-wrap">
                    <StyledButton onClick={() => handleVote(review._id, "up")} variant={(review as BackendReviewProps).currentUserVote === "up" ? "primary_small" : "secondary_small"} className="!text-[9px] sm:!text-[10px] !px-1.5 !py-0.5" disabled={!isAuthenticated || review.userId === currentUserId}>👍 Helpful ({(review as BackendReviewProps).upvotes || 0})</StyledButton>
                    <StyledButton onClick={() => handleVote(review._id, "down")} variant={(review as BackendReviewProps).currentUserVote === "down" ? "primary_small" : "secondary_small"} className="!text-[9px] sm:!text-[10px] !px-1.5 !py-0.5 !bg-red-500/10 hover:!bg-red-500/20 !text-red-600 !border-red-500/20" disabled={!isAuthenticated || review.userId === currentUserId}>👎 ({(review as BackendReviewProps).downvotes || 0})</StyledButton>
                    <button onClick={() => handleToggleComments(review._id)} className="text-[9px] sm:text-xs text-brand-accent-gold hover:text-brand-primary-action hover:underline ml-auto focus:outline-none">💬 Comments ({(review as BackendReviewProps).commentCount || 0}) {activeReviewIdForComments === review._id ? '(Hide)' : ''}</button>
                </div>
                {activeReviewIdForComments === review._id && (
                     <div className="mt-1.5 pl-1 sm:pl-1.5 border-l-2 border-brand-accent-gold/20">
                        {commentsIsLoading && activeReviewIdForComments === review._id && <p className="text-xs text-brand-text-primary/70 py-1.5">Loading comments...</p>}
                        {!commentsIsLoading && (!commentsDataForActiveReview || commentsDataForActiveReview.length === 0) && activeReviewIdForComments === review._id && (<p className="text-xs text-brand-text-primary/70 italic py-1.5">No comments yet.</p>)}
                        {commentsDataForActiveReview?.map((comment: BackendCommentProps) => renderComment(comment, review._id))}
                        {commentsPaginationStatus === "CanLoadMore" && activeReviewIdForComments === review._id && (
                            <StyledButton onClick={() => commentsLoadMore(3)} variant="secondary_small" className="!text-[10px] mt-1.5">Load More Comments</StyledButton>
                        )}
                        <form onSubmit={(e) => { e.preventDefault(); handleAddComment(review._id);}} className="mt-2 flex gap-1">
                            <input type="text" value={newCommentText[review._id.toString()] || ""} onChange={(e) => setNewCommentText(prev => ({...prev, [review._id.toString()]: e.target.value})) } placeholder="Add a comment..." className={`${commentInputBase} flex-grow !py-1`} /> {/* Use form-input for light bg */}
                            <StyledButton type="submit" variant="primary_small" className="!text-xs !px-2.5 !py-1" disabled={isSubmittingComment}>{isSubmittingComment ? "..." : "Post"}</StyledButton>
                        </form>
                    </div>
                )}
              </div>
            ))}
            {reviewsStatus === "CanLoadMore" && <div className="text-center mt-3"><StyledButton onClick={() => reviewsLoadMore(3)} variant="secondary" disabled={reviewsIsLoadingInitial && reviewsStatus === "LoadingMore"}>{(reviewsIsLoadingInitial && reviewsStatus === "LoadingMore") ? "Loading..." : "Load More Reviews"}</StyledButton></div>}
            {reviewsStatus === "Exhausted" && reviewsForDisplay.length > 0 && <p className="text-brand-text-primary/70 text-center mt-3 text-xs">All reviews loaded.</p>}
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