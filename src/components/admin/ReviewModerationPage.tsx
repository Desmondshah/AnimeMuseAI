// src/components/admin/ReviewModerationPage.tsx
import React from "react";
import { usePaginatedQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import StyledButton from "../animuse/shared/StyledButton";
import { toast } from "sonner";
import { format } from 'date-fns';

// For displaying review cards, we can reuse or adapt ReviewCard props/structure if helpful
// For now, we'll display inline in a table.

const ReviewModerationPage: React.FC = () => {
  const {
    results: reviews,
    status,
    loadMore,
    isLoading,
  } = usePaginatedQuery(
    api.admin.getAllReviewsForAdmin, // Using the admin query
    {}, // No specific args other than pagination for this query
    { initialNumItems: 10 }
  );

  const deleteReviewMutation = useMutation(api.admin.adminDeleteReview);

  const handleDeleteReview = async (reviewId: Id<"reviews">) => {
    if (window.confirm(`Are you sure you want to delete this review? This action cannot be undone.`)) {
      try {
        toast.loading(`Deleting review ${reviewId}...`, { id: `delete-review-${reviewId}` });
        await deleteReviewMutation({ reviewId });
        toast.success(`Review ${reviewId} deleted successfully.`, { id: `delete-review-${reviewId}` });
        // List should update due to Convex reactivity
      } catch (error: any) {
        toast.error(error.data?.message || error.message || `Failed to delete review ${reviewId}.`, { id: `delete-review-${reviewId}` });
        console.error("Failed to delete review:", error);
      }
    }
  };

  // Helper to render star ratings (can be extracted to a shared component)
  const StarRatingDisplay: React.FC<{ rating: number; maxStars?: number }> = ({ rating, maxStars = 5 }) => (
    <div className="flex">
      {[...Array(maxStars)].map((_, i) => (
        <span key={i} className={i < rating ? "text-yellow-400" : "text-gray-500"}>★</span>
      ))}
       <span className="ml-1 text-xs">({rating}/{maxStars})</span>
    </div>
  );


  if (isLoading && status === "LoadingFirstPage") {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan"></div>
        <p className="ml-3 text-brand-text-secondary">Loading reviews...</p>
      </div>
    );
  }
  
  // Error handling note: getAllReviewsForAdmin throws on auth failure, which should be caught by an ErrorBoundary.
  // If it returns null/empty on other "expected" failures, handle animeList being null/empty.

  return (
    <div>
      <h2 className="text-2xl font-orbitron text-neon-cyan mb-6">Review Moderation</h2>
      {(!reviews || reviews.length === 0) && !isLoading ? (
        <p className="text-brand-text-secondary p-4">No reviews found.</p>
      ) : (
        <div className="overflow-x-auto neumorphic-card bg-brand-dark p-0 shadow-neumorphic-light-inset">
          <table className="min-w-full divide-y divide-brand-surface">
            <thead className="bg-brand-surface/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-orbitron text-sakura-pink uppercase tracking-wider">Anime ID</th>
                <th className="px-4 py-3 text-left text-xs font-orbitron text-sakura-pink uppercase tracking-wider">User ID</th>
                <th className="px-4 py-3 text-left text-xs font-orbitron text-sakura-pink uppercase tracking-wider">Rating</th>
                <th className="px-4 py-3 text-left text-xs font-orbitron text-sakura-pink uppercase tracking-wider">Review Text</th>
                <th className="px-4 py-3 text-left text-xs font-orbitron text-sakura-pink uppercase tracking-wider">Created At</th>
                <th className="px-4 py-3 text-left text-xs font-orbitron text-sakura-pink uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-dark">
              {reviews?.map((review) => (
                <tr key={review._id} className="hover:bg-brand-surface/20 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-brand-text-secondary" title={review.animeId}>{review.animeId.substring(0,5)}...</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-brand-text-secondary" title={review.userId}>{review.userId.substring(0,5)}...</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-brand-text">
                    <StarRatingDisplay rating={review.rating} />
                  </td>
                  <td className="px-4 py-3 text-sm text-brand-text-secondary max-w-md">
                    <p className="truncate" title={review.reviewText || ""}>{review.reviewText || <span className="italic">No text</span>}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-brand-text-secondary">
                    {format(new Date(review.createdAt), "MMM d, yyyy HH:mm")}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <StyledButton
                      onClick={() => handleDeleteReview(review._id)}
                      variant="primary_small"
                      className="text-xs !bg-red-600 hover:!bg-red-700 focus:!ring-red-500"
                    >
                      Delete
                    </StyledButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {status === "CanLoadMore" && (
        <div className="mt-6 text-center">
          <StyledButton onClick={() => loadMore(10)} disabled={isLoading} variant="primary">
            {isLoading ? "Loading More..." : "Load More Reviews"}
          </StyledButton>
        </div>
      )}
      {status === "Exhausted" && reviews && reviews.length > 0 && (
         <p className="mt-6 text-xs text-center text-brand-text-secondary">All reviews loaded.</p>
       )}
    </div>
  );
};

export default ReviewModerationPage;