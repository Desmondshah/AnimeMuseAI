// src/components/animuse/AnimeDetailPage.tsx
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
import { GenericId } from "convex/values";

interface BackendReviewProps extends Doc<"reviews"> {
  userName: string; userAvatarUrl?: string; upvotes: number; downvotes: number;
  currentUserVote: "up" | "down" | null; commentCount: number;
}
interface BackendCommentProps extends Doc<"reviewComments"> {
    userName: string; userAvatarUrl?: string;
    replies: (Doc<"reviewComments"> & { userName: string; userAvatarUrl?: string })[];
}

interface AnimeDetailPageProps { animeId: Id<"anime">; onBack: () => void; }

const LoadingSpinnerComponent: React.FC<{ message?: string }> = ({ message = "Loading..." }) => (
    <div className="flex flex-col justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan"></div>
      <p className="mt-3 text-brand-text-secondary">{message}</p>
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

  const { results: reviewsFromBackend, status: reviewsStatus, loadMore: reviewsLoadMore, isLoading: reviewsIsLoading } = usePaginatedQuery(
    api.reviews.getReviewsForAnime, animeId ? { animeId, sortOption: reviewSortOption } : "skip", { initialNumItems: 5 }
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
  // `commentsDataForActiveReview` IS the page (array of comments)
  const { results: commentsDataForActiveReview, status: commentsPaginationStatus, loadMore: commentsLoadMore, isLoading: commentsIsLoading } = usePaginatedQuery(
      api.reviews.getReviewComments,
      activeReviewIdForComments ? { reviewId: activeReviewIdForComments } : "skip",
      { initialNumItems: 5 }
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
        const profile = userProfile ? { name: userProfile.name, moods: userProfile.moods, genres: userProfile.genres, favoriteAnimes: userProfile.favoriteAnimes, experienceLevel: userProfile.experienceLevel, dislikedGenres: userProfile.dislikedGenres, dislikedTags: userProfile.dislikedTags, characterArchetypes: userProfile.characterArchetypes, tropes: userProfile.tropes, artStyles: userProfile.artStyles, narrativePacing: userProfile.narrativePacing } : undefined;
        const result = await getSimilarAnimeAction({ animeId: anime._id, userProfile: profile, count: 3 });
        if (result.error) setSimilarAnimeError(result.error); else setSimilarAnime(result.recommendations as AnimeRecommendation[]);
        setShowSimilarAnime(true);
    } catch (e:any) { setSimilarAnimeError("Failed to load similar anime."); }
    finally { setLoadingSimilar(false); }
  }, [anime, userProfile, getSimilarAnimeAction]);

  useEffect(() => { if (userReviewDoc && showReviewForm && !editingReview) { const mapped: ClientReviewProps = {...userReviewDoc, userName: loggedInUser?.name || "You", userAvatarUrl: (loggedInUser as any)?.image || (loggedInUser as any)?.avatarUrl}; setEditingReview(mapped); } else if (!userReviewDoc && !showReviewForm && editingReview) { setEditingReview(null); } }, [userReviewDoc, showReviewForm, loggedInUser, editingReview]);


  const handleVote = async (reviewId: Id<"reviews">, voteType: "up" | "down") => {
    if (!isAuthenticated || !currentUserId) { toast.error("Login to vote."); return; }
    if (reviewsForDisplay.find(r => r._id === reviewId)?.userId === currentUserId) { toast.error("You cannot vote on your own review."); return; }
    try { await voteOnReviewMutation({ reviewId, voteType }); toast.success("Vote recorded!"); }
    catch (error: any) { toast.error(error.data?.message || "Failed to vote."); }
  };

  const handleToggleComments = (reviewId: Id<"reviews">) => {
    setActiveReviewIdForComments(prev => prev === reviewId ? null : reviewId);
    setReplyToCommentId(null); 
    setEditingCommentId(null);
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
    setEditingCommentId(comment._id);
    setEditingCommentText(comment.commentText);
    setReplyToCommentId(null); 
  };

  const handleSaveEditComment = async (commentId: Id<"reviewComments">) => {
    if (!editingCommentText.trim()) { toast.error("Comment cannot be empty."); return;}
    setIsSubmittingComment(true);
    try {
        await editReviewCommentMutation({commentId, commentText: editingCommentText });
        toast.success("Comment updated!");
        setEditingCommentId(null);
        setEditingCommentText("");
    } catch (error: any) {
        toast.error(error.data?.message || "Failed to update comment.");
    } finally {
        setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: Id<"reviewComments">) => {
    if (!isAuthenticated) { toast.error("Login to delete."); return; }
    if (window.confirm("Delete this comment and its replies?")) {
        setIsSubmittingComment(true); 
        try {
            await deleteReviewCommentMutation({ commentId });
            toast.success("Comment deleted.");
        } catch (error: any) {
            toast.error(error.data?.message || "Failed to delete comment.");
        } finally {
            setIsSubmittingComment(false);
        }
    }
  };


  const renderComment = (comment: BackendCommentProps, reviewId: Id<"reviews">, depth = 0): JSX.Element => (
    <div key={comment._id} className={`mt-2 p-2 bg-brand-dark rounded shadow-sm ${depth > 0 ? `ml-${depth * 2} sm:ml-${depth * 3}` : ''}`}>
        <div className="flex items-start mb-1">
            {comment.userAvatarUrl ? <img src={comment.userAvatarUrl} alt={comment.userName} className="w-6 h-6 rounded-full mr-2 object-cover"/> : <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-white text-xs mr-2">{comment.userName?.charAt(0).toUpperCase()}</div>}
            <div>
                <span className="text-sm font-semibold text-neon-cyan">{comment.userName}</span>
                <span className="text-xs text-gray-400 ml-2">{new Date(comment.createdAt).toLocaleDateString()} {comment.updatedAt && "(edited)"}</span>
            </div>
        </div>

        {editingCommentId === comment._id ? (
            <form onSubmit={(e) => {e.preventDefault(); handleSaveEditComment(comment._id);}} className="my-1 space-y-1">
                <textarea value={editingCommentText} onChange={(e) => setEditingCommentText(e.target.value)} className="neumorphic-input text-xs w-full p-1" rows={2} autoFocus/>
                <div className="flex gap-1">
                    <StyledButton type="submit" variant="primary_small" className="text-xs" disabled={isSubmittingComment}>{isSubmittingComment ? "..." : "Save"}</StyledButton>
                    <StyledButton type="button" onClick={() => setEditingCommentId(null)} variant="secondary_small" className="text-xs">Cancel</StyledButton>
                </div>
            </form>
        ) : (
            <p className="text-xs text-brand-text-secondary whitespace-pre-wrap py-1">{comment.commentText}</p>
        )}

        <div className="flex items-center gap-2 mt-1">
            <button onClick={() => { setReplyToCommentId(replyToCommentId === comment._id ? null : comment._id); setNewReplyText(""); setEditingCommentId(null);}} className="text-xs text-electric-blue hover:underline">
                {replyToCommentId === comment._id ? "Cancel" : "Reply"}
            </button>
            {isAuthenticated && currentUserId === comment.userId && editingCommentId !== comment._id && (
                <>
                    <span className="text-xs text-gray-500">•</span>
                    <button onClick={() => handleEditComment(comment)} className="text-xs text-yellow-400 hover:underline">Edit</button>
                    <span className="text-xs text-gray-500">•</span>
                    <button onClick={() => handleDeleteComment(comment._id)} className="text-xs text-sakura-pink hover:underline" disabled={isSubmittingComment}>Delete</button>
                </>
            )}
        </div>

        {replyToCommentId === comment._id && (
            <form onSubmit={(e) => { e.preventDefault(); handleAddComment(reviewId, comment._id); }} className="ml-4 mt-2 flex gap-1">
                <input type="text" value={newReplyText} onChange={(e) => setNewReplyText(e.target.value)} placeholder="Write a reply..." className="neumorphic-input text-xs flex-grow p-1" autoFocus/>
                <StyledButton type="submit" variant="secondary_small" className="text-xs" disabled={isSubmittingComment}>{isSubmittingComment ? "..." : "Post"}</StyledButton>
            </form>
        )}
        {comment.replies && comment.replies.length > 0 && (
            <div className="mt-2 pl-3 border-l-2 border-gray-700/50">
                {comment.replies.map(reply => renderComment(reply as BackendCommentProps, reviewId, depth + 1))}
            </div>
        )}
    </div>
  );


  if (animeId && anime === undefined && !authIsLoading) return <LoadingSpinner message="Loading anime details..." />;
  if (authIsLoading) return <LoadingSpinner message="Checking authentication..." />;
  if (animeId && reviewsIsLoading && reviewsStatus === "LoadingFirstPage" && (!reviewsForDisplay || reviewsForDisplay.length === 0)) return <LoadingSpinner message="Loading reviews..." />;
  if (!anime) { return <div className="text-center p-8"><p>Anime not found or error loading.</p><StyledButton onClick={onBack}>Back</StyledButton></div>; }

  return (
    <div className="neumorphic-card p-4 sm:p-6 max-w-4xl mx-auto">
      <StyledButton onClick={onBack} variant="secondary_small" className="mb-4">← Back</StyledButton>
      <div className="relative mb-4">
        <img src={anime.posterUrl || `https://via.placeholder.com/400x600.png?text=${encodeURIComponent(anime.title)}`} alt={anime.title} className="w-full h-64 sm:h-96 object-cover rounded-lg shadow-xl" onError={(e)=>{(e.target as HTMLImageElement).src = `https://via.placeholder.com/400x600.png?text=${encodeURIComponent(anime.title)}`}}/>
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-transparent to-transparent opacity-70 rounded-lg"></div>
        <div className="absolute bottom-0 left-0 p-4 sm:p-6"><h1 className="text-3xl sm:text-4xl font-orbitron text-white drop-shadow-lg">{anime.title}</h1>{anime.year && <p className="text-lg text-neon-cyan font-semibold">{anime.year}</p>}</div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="md:col-span-2"><h2 className="text-xl font-orbitron text-sakura-pink mb-2">Synopsis</h2><p className="text-brand-text-secondary leading-relaxed whitespace-pre-wrap">{anime.description}</p></div>
        <div>
            {anime.averageUserRating !== undefined && (<div className="mb-3"><h3 className="text-lg font-orbitron text-electric-blue mb-1">User Rating</h3><div className="flex items-center"><span className="text-2xl text-yellow-400 mr-1">★</span><span className="text-2xl text-neon-cyan">{anime.averageUserRating.toFixed(1)}</span><span className="text-sm text-brand-text-secondary ml-1">/ 5</span></div><p className="text-xs text-brand-text-secondary">({anime.reviewCount || 0} review{(!anime.reviewCount || anime.reviewCount !== 1) ? 's' : ''})</p></div>)}
            {anime.genres?.length > 0 && (<div className="mb-3"><h3 className="text-sm font-orbitron text-electric-blue mb-1">Genres</h3><div className="flex flex-wrap gap-1">{anime.genres.map(g => (<span key={g} className="text-xs bg-brand-dark px-2 py-1 rounded-full text-sakura-pink">{g}</span>))}</div></div>)}
        </div>
      </div>
       <div className="flex flex-col sm:flex-row gap-3 mb-6">
         {isAuthenticated ? (<>{watchlistEntry?.status === "Plan to Watch" ? <StyledButton onClick={()=>handleWatchlistAction("Watching")}>Start Watching</StyledButton> : watchlistEntry?.status === "Watching" ? <StyledButton onClick={()=>handleWatchlistAction("Completed")}>Mark Completed</StyledButton> : watchlistEntry?.status === "Completed" ? <p className="text-green-400">✓ Completed</p> : <StyledButton onClick={()=>handleWatchlistAction("Plan to Watch")}>Add to Watchlist</StyledButton>}</>) : (<p>Login to manage watchlist</p>)}
         {anime.trailerUrl && <a href={anime.trailerUrl} target="_blank" rel="noopener noreferrer"><StyledButton variant="secondary">Watch Trailer</StyledButton></a>}
         
         {/* Similar Anime Section */}
         <StyledButton 
           onClick={loadSimilarAnime} 
           variant="secondary" 
           disabled={loadingSimilar}
         >
           {loadingSimilar ? "Loading..." : "Find Similar"}
         </StyledButton>
      </div>

      {/* Similar Anime Results */}
      {showSimilarAnime && (
        <div className="mb-6 p-4 neumorphic-card bg-brand-dark shadow-neumorphic-light-inset">
          <h3 className="text-lg font-orbitron text-electric-blue mb-3">Similar Anime</h3>
          {similarAnimeError ? (
            <p className="text-red-400">{similarAnimeError}</p>
          ) : similarAnime.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {similarAnime.map((rec, idx) => (
                <AnimeCard 
                  key={`similar-${idx}`} 
                  anime={rec} 
                  isRecommendation={true} 
                  onViewDetails={(animeId) => {
                    // You could navigate to the detail page here
                    console.log("Navigate to anime:", animeId);
                  }}
                />
              ))}
            </div>
          ) : (
            <p className="text-brand-text-secondary">No similar anime found.</p>
          )}
        </div>
      )}

      {isAuthenticated && watchlistEntry && (
        <div className="mb-6 p-4 neumorphic-card bg-brand-dark shadow-neumorphic-light-inset">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-orbitron text-electric-blue">My Watchlist Notes</h3>
                <StyledButton onClick={() => setShowNotesInput(!showNotesInput)} variant="secondary_small" className="text-xs">{showNotesInput ? "Cancel" : (watchlistNotes ? "Edit Notes" : "Add Notes")}</StyledButton>
            </div>
            {showNotesInput ? (<div><textarea value={watchlistNotes} onChange={(e) => setWatchlistNotes(e.target.value)} rows={3} placeholder="Your private notes..." className="neumorphic-input w-full mb-2 text-sm" maxLength={500}/><StyledButton onClick={handleSaveWatchlistNotes} variant="primary_small" disabled={isSavingNotes}>{isSavingNotes ? "..." : "Save Notes"}</StyledButton></div>) : (watchlistNotes ? (<p className="text-sm text-brand-text-secondary whitespace-pre-wrap">{watchlistNotes}</p>) : (<p className="text-sm text-brand-text-secondary italic">No notes yet.</p>))}
        </div>
      )}

      <div id="review-section" className="mt-8 border-t border-brand-surface pt-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-2xl font-orbitron text-sakura-pink">User Reviews</h2>
            <div className="flex items-center gap-2">
                <label htmlFor="reviewSort" className="text-sm text-brand-text-secondary">Sort by:</label>
                <select id="reviewSort" value={reviewSortOption} onChange={(e) => setReviewSortOption(e.target.value as ReviewSortOption)} className="neumorphic-input text-sm p-1.5 rounded-md bg-brand-dark border-brand-surface focus:ring-electric-blue">
                    <option value="newest">Newest</option><option value="oldest">Oldest</option><option value="highest_rating">Highest Rating</option><option value="lowest_rating">Lowest Rating</option><option value="most_helpful">Most Helpful</option>
                </select>
            </div>
        </div>
        {canUserReview && anime && (showReviewForm ? (<div id="review-form-section"><ReviewForm animeId={anime._id} existingReview={editingReview as any} onSubmit={handleReviewSubmit} onCancel={() => { setShowReviewForm(false); setEditingReview(null); }} isLoading={isSubmittingReview} /></div>) : (<div className="mb-6 text-center"><StyledButton onClick={() => { setEditingReview(userReviewDoc ? { ...userReviewDoc, userName: loggedInUser?.name || "You", userAvatarUrl: (loggedInUser as any)?.image || (loggedInUser as any)?.avatarUrl} as any : null); setShowReviewForm(true); }} variant="primary">{userHasExistingReview ? "Edit Your Review" : "Add Your Review"}</StyledButton></div>) )}
        {!isAuthenticated && !authIsLoading && <p className="text-brand-text-secondary text-center mb-6">Login to add your review.</p>}

        {(reviewsIsLoading && reviewsStatus === "LoadingFirstPage" && (!reviewsForDisplay || reviewsForDisplay.length === 0)) && <LoadingSpinner message="Loading reviews..." />}
        {!reviewsIsLoading && (!reviewsForDisplay || reviewsForDisplay.length === 0) && <p className="text-brand-text-secondary text-center">No reviews yet. Be the first!</p>}

        {reviewsForDisplay && reviewsForDisplay.length > 0 && (
          <div className="space-y-4">
            {reviewsForDisplay.map((review) => (
              <div key={review._id} className="neumorphic-card bg-brand-surface p-3 rounded-md">
                <ReviewCard review={review} currentUserId={currentUserId as Id<"users"> | undefined} onEdit={handleEditReview} onDelete={handleDeleteReview} />
                <div className="mt-2 pt-2 border-t border-brand-dark flex items-center gap-2 flex-wrap">
                    <StyledButton onClick={() => handleVote(review._id, "up")} variant={(review as BackendReviewProps).currentUserVote === "up" ? "primary_small" : "secondary_small"} className="text-xs" disabled={!isAuthenticated || review.userId === currentUserId}>👍 Helpful ({(review as BackendReviewProps).upvotes || 0})</StyledButton>
                    <StyledButton onClick={() => handleVote(review._id, "down")} variant={(review as BackendReviewProps).currentUserVote === "down" ? "primary_small" : "secondary_small"} className="text-xs !bg-red-600/50 hover:!bg-red-700/60" disabled={!isAuthenticated || review.userId === currentUserId}>👎 ({(review as BackendReviewProps).downvotes || 0})</StyledButton>
                    <button onClick={() => handleToggleComments(review._id)} className="text-xs text-electric-blue hover:underline ml-auto">💬 Comments ({(review as BackendReviewProps).commentCount || 0}) {activeReviewIdForComments === review._id ? ' (Hide)' : ''}</button>
                </div>
                {activeReviewIdForComments === review._id && (
                     <div className="mt-3 pl-2 border-l-2 border-brand-dark/50">
                        {commentsIsLoading && activeReviewIdForComments === review._id && <p className="text-xs text-brand-text-secondary">Loading comments...</p>}
                        
                        {!commentsIsLoading && (!commentsDataForActiveReview || commentsDataForActiveReview.length === 0) && activeReviewIdForComments === review._id && (
                            <p className="text-xs text-brand-text-secondary italic">No comments yet.</p>
                        )}
                        {commentsDataForActiveReview?.map((comment: BackendCommentProps) => renderComment(comment, review._id))}
                        
                        {commentsPaginationStatus === "CanLoadMore" && activeReviewIdForComments === review._id && ( // Use commentsPaginationStatus here
                            <StyledButton onClick={() => commentsLoadMore(5)} variant="secondary_small" className="text-xs mt-2">
                                Load More Comments
                            </StyledButton>
                        )}

                        <form onSubmit={(e) => { e.preventDefault(); handleAddComment(review._id);}} className="mt-3 flex gap-2">
                            <input 
                                type="text" 
                                value={newCommentText[review._id.toString()] || ""} 
                                onChange={(e) => setNewCommentText(prev => ({...prev, [review._id.toString()]: e.target.value})) } 
                                placeholder="Add a public comment..." 
                                className="neumorphic-input text-sm flex-grow p-1.5"/>
                            <StyledButton 
                                type="submit" 
                                variant="primary_small" 
                                className="text-sm" 
                                disabled={isSubmittingComment}>
                                    {isSubmittingComment ? "..." : "Post"}
                            </StyledButton>
                        </form>
                    </div>
                )}
              </div>
            ))}
            {reviewsStatus === "CanLoadMore" && <div className="text-center mt-4"><StyledButton onClick={() => reviewsLoadMore(5)} variant="secondary_small" disabled={reviewsIsLoading && reviewsStatus === "LoadingMore"}>{(reviewsIsLoading && reviewsStatus === "LoadingMore") ? "Loading..." : "Load More Reviews"}</StyledButton></div>}
            {reviewsStatus === "Exhausted" && reviewsForDisplay.length > 0 && <p className="text-brand-text-secondary text-center mt-4 text-xs">No more reviews.</p>}
          </div>
        )}
      </div>
      <div className="mt-8 border-t border-brand-surface pt-4">
        <StyledButton onClick={handleFetchExternalData} variant="secondary_small" disabled={isFetchingExternal || !anime}>
          {isFetchingExternal ? "Fetching Details..." : "Fetch/Update More Details"}
        </StyledButton>
        <p className="text-xs text-brand-text-secondary mt-1">(Uses external APIs to enrich anime data)</p>
      </div>
    </div>
  );
}