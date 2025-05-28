// src/components/admin/ReviewModerationPage.tsx
import React, { memo } from "react"; // Added memo
import { usePaginatedQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel"; // Doc not directly used for props
import StyledButton from "../animuse/shared/StyledButton";
import { toast } from "sonner";
import { format } from 'date-fns';

// Themed Loading Spinner for Admin Pages
const AdminLoadingSpinner: React.FC<{ message?: string }> = memo(({ message }) => (
  <div className="flex flex-col justify-center items-center h-64 py-10 text-brand-text-primary/80">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-primary-action"></div>
    {message && <p className="mt-3 text-sm">{message}</p>}
  </div>
));

// Themed Star Rating Display for tables
const ThemedStarRatingDisplay: React.FC<{ rating: number; maxStars?: number }> = memo(({ rating, maxStars = 5 }) => (
  <div className="flex items-center">
    {[...Array(maxStars)].map((_, i) => (
      <span key={i} className={`text-xs sm:text-sm ${i < Math.floor(rating) ? "text-brand-primary-action" : "text-brand-accent-peach"}`}>★</span>
    ))}
    <span className="ml-1 text-[10px] sm:text-xs text-brand-text-primary/70">({rating.toFixed(1)}/{maxStars})</span>
  </div>
));

const ReviewModerationPageComponent: React.FC = () => {
  const {
    results: reviews,
    status,
    loadMore,
    isLoading, // This captures both initial and subsequent loading for pagination
  } = usePaginatedQuery(
    api.admin.getAllReviewsForAdmin,
    {},
    { initialNumItems: 10 }
  );

  const deleteReviewMutation = useMutation(api.admin.adminDeleteReview);

  const handleDeleteReview = async (reviewId: Id<"reviews">, reviewUser?: string) => {
    const reviewIdentifier = reviewUser ? `review by ${reviewUser.substring(0,15)}...` : `review ${reviewId.substring(0,5)}...`;
    if (window.confirm(`Are you sure you want to PERMANENTLY DELETE ${reviewIdentifier}? This action cannot be undone.`)) {
      try {
        toast.loading(`Deleting ${reviewIdentifier}`, { id: `delete-review-${reviewId}` });
        await deleteReviewMutation({ reviewId });
        toast.success(`${reviewIdentifier} deleted successfully.`, { id: `delete-review-${reviewId}` });
      } catch (error: any) {
        toast.error(error.data?.message || error.message || `Failed to delete ${reviewIdentifier}.`, { id: `delete-review-${reviewId}` });
        console.error("Failed to delete review:", error);
      }
    }
  };

  if (isLoading && status === "LoadingFirstPage" && (!reviews || reviews.length === 0)) {
    return <AdminLoadingSpinner message="Loading reviews for moderation..." />;
  }

  if (reviews === null) { // Explicit null check for critical errors like auth
      return <p className="text-brand-text-primary/70 p-4 text-center">Could not load reviews. Ensure you are an administrator.</p>;
  }

  return (
    // Page content within AdminDashboardPage's themed content area
    <div className="text-brand-text-primary">
      <h2 className="text-lg sm:text-xl font-heading text-brand-primary-action mb-3 sm:mb-4">Review Moderation</h2>
      {reviews.length === 0 && !isLoading ? (
        <p className="text-brand-text-primary/70 text-center py-5">No reviews found in the system.</p>
      ) : (
        <div className="overflow-x-auto bg-brand-surface rounded-lg shadow-md border border-brand-accent-peach/30">
          <table className="min-w-full divide-y divide-brand-accent-peach/20">
            <thead className="bg-brand-accent-peach/10">
              <tr>
                {["Anime ID", "User ID", "Rating", "Review (Excerpt)", "Created At", "Actions"].map(header => (
                    <th key={header} className="px-3 py-2 sm:px-4 sm:py-2.5 text-left text-[10px] sm:text-xs font-semibold font-heading text-brand-primary-action/80 uppercase tracking-wider">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-accent-peach/20">
              {reviews?.map((review) => (
                <tr key={review._id} className="hover:bg-brand-accent-peach/10 transition-colors duration-150">
                  <td className="px-3 py-2 sm:px-4 sm:py-2.5 whitespace-nowrap text-[10px] sm:text-xs text-brand-text-primary/70" title={review.animeId}>{review.animeId.substring(0,8)}...</td>
                  <td className="px-3 py-2 sm:px-4 sm:py-2.5 whitespace-nowrap text-[10px] sm:text-xs text-brand-text-primary/70" title={review.userId}>{review.userId.substring(0,8)}...</td>
                  <td className="px-3 py-2 sm:px-4 sm:py-2.5 whitespace-nowrap">
                    <ThemedStarRatingDisplay rating={review.rating} />
                  </td>
                  <td className="px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-brand-text-primary/80 max-w-xs sm:max-w-sm md:max-w-md">
                    <p className="truncate" title={review.reviewText || ""}>{review.reviewText?.substring(0, 50) || <span className="italic opacity-60">No text</span>}{review.reviewText && review.reviewText.length > 50 ? "..." : ""}</p>
                  </td>
                  <td className="px-3 py-2 sm:px-4 sm:py-2.5 whitespace-nowrap text-[10px] sm:text-xs text-brand-text-primary/70">
                    {format(new Date(review.createdAt), "MMM d, yyyy HH:mm")}
                  </td>
                  <td className="px-3 py-2 sm:px-4 sm:py-2.5 whitespace-nowrap text-center">
                    <StyledButton
                      onClick={() => handleDeleteReview(review._id, (review as any).userName)} // Assuming userName might be on extended review type
                      variant="primary_small"
                      className="!text-[10px] !py-1 !px-1.5 !bg-brand-primary-action/80 hover:!bg-brand-primary-action !text-brand-surface"
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
        <div className="mt-4 sm:mt-5 text-center">
          <StyledButton onClick={() => loadMore(10)} disabled={isLoading && status === "LoadingMore"} variant="secondary">
            {isLoading && status === "LoadingMore" ? "Loading More..." : "Load More Reviews"}
          </StyledButton>
        </div>
      )}
      {status === "Exhausted" && reviews && reviews.length > 0 && (
         <p className="mt-4 sm:mt-5 text-xs text-center text-brand-text-primary/60">All reviews loaded.</p>
       )}
    </div>
  );
};

export default memo(ReviewModerationPageComponent);