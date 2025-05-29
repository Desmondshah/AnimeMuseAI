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
  const getSimilarAnimeAction = useAction(api.ai.getSimilarAnimeRecommendations); // Using the corrected action name
  const userProfile = useQuery(api.users.getMyUserProfile, isAuthenticated ? {} : "skip");

  const canUserReview = isAuthenticated && !!currentUserId && !authIsLoading;
  const userHasExistingReview = !!userReviewDoc;

  useEffect(() => { setWatchlistNotes(watchlistEntry?.notes || ""); }, [watchlistEntry]);

  const handleWatchlistAction = useCallback(async (status: string) => { /* ... */ }, [isAuthenticated, anime, upsertToWatchlistMutation, watchlistEntry, watchlistNotes]);
  const handleSaveWatchlistNotes = useCallback(async () => { /* ... */ }, [isAuthenticated, anime, watchlistEntry, watchlistNotes, upsertToWatchlistMutation]);
  const handleFetchExternalData = useCallback(async () => { /* ... */ }, [anime, triggerFetchExternalDetailsAction]);
  const handleReviewSubmit = useCallback(async (data: { animeId: Id<"anime">; rating: number; reviewText?: string; isSpoiler?: boolean; reviewId?: Id<"reviews">}) => { /* ... */ }, [isAuthenticated, anime, addReviewMutation, editReviewMutation]);
  const handleEditReview = useCallback((reviewToEdit: ClientReviewProps) => { /* ... */ }, []);
  const handleDeleteReview = useCallback(async (reviewIdToDelete: Id<"reviews">) => { /* ... */ }, [isAuthenticated, deleteReviewInternalMutation, editingReview]);

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

  useEffect(() => { /* ... user review form logic ... */ }, [userReviewDoc, showReviewForm, loggedInUser, editingReview, userProfile]);
  const handleVote = async (reviewId: Id<"reviews">, voteType: "up" | "down") => { /* ... */ };
  const handleToggleComments = (reviewId: Id<"reviews">) => { /* ... */ };
  const handleAddComment = async (reviewId: Id<"reviews">, parentId?: Id<"reviewComments">) => { /* ... */ };
  const handleEditComment = (comment: BackendCommentProps) => { /* ... */ };
  const handleSaveEditComment = async (commentId: Id<"reviewComments">) => { /* ... */ };
  const handleDeleteComment = async (commentId: Id<"reviewComments">) => { /* ... */ };
  const renderComment = (comment: BackendCommentProps, reviewId: Id<"reviews">, depth = 0): JSX.Element => { /* ... */ return <></>}; // Placeholder

  if (animeId && anime === undefined && !authIsLoading) return <LoadingSpinner message="Loading anime details..." className="text-brand-text-primary/80" />;
  if (authIsLoading && anime === undefined) return <LoadingSpinner message="Checking authentication..." className="text-brand-text-primary/80" />;
  if (animeId && reviewsStatus === "LoadingFirstPage" && (!reviewsForDisplay || reviewsForDisplay.length === 0) && !anime) return <LoadingSpinner message="Loading content..." className="text-brand-text-primary/80" />;
  if (!anime) { return <div className="text-center p-6 sm:p-8 bg-brand-surface text-brand-text-primary rounded-xl shadow-xl"><p className="mb-4">Anime not found or error loading.</p><StyledButton onClick={onBack} variant="primary">Back</StyledButton></div>; }

  const posterPlaceholder = `https://placehold.co/600x900/${'ECB091'.substring(1)}/${'321D0B'.substring(1)}/png?text=%20&font=poppins`;

  function navigateToDetail(id: Id<"anime">): void {
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-5 sm:gap-x-4 sm:gap-y-6"> {/* Added gap-y */}
              {similarAnime.map((rec, idx) => (
                <div key={`similar-${idx}-${rec.title || idx}`} className="flex flex-col items-center">
                  <AnimeCard
                    anime={rec} // rec should be AnimeRecommendation type
                    isRecommendation={true} // Treat as recommendation for add-to-db logic in AnimeCard
                    onViewDetails={(id) => navigateToDetail(id)} // Pass navigateToDetail from MainApp
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
           {!loadingSimilar && !similarAnimeError && similarAnime.length === 0 && ( <p className="text-xs sm:text-sm text-brand-text-primary/70">No similar anime found by AI.</p> )}
        </div>
      )}

      {/* ... Watchlist Notes, Review Section, Comments (ensure text colors are correct for light bg) ... */}
      <div id="review-section" className="mt-4 sm:mt-6 border-t border-brand-accent-peach/30 pt-3 sm:pt-4">
        {/* ... Review form and list ... */}
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
