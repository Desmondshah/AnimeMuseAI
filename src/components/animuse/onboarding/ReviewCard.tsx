// src/components/animuse/onboarding/ReviewCard.tsx - Memoized
import React, { memo } from "react"; // Import memo
import { Id } from "../../../../convex/_generated/dataModel";
import { formatDistanceToNow } from 'date-fns';

// Assuming the structure from getReviewsForAnime query in convex/reviews.ts
export interface ReviewProps {
  _id: Id<"reviews">;
  _creationTime: number;
  animeId: Id<"anime">;
  userId: Id<"users">;
  rating: number;
  reviewText?: string;
  createdAt: number;
  updatedAt?: number;
  userName: string;
  userAvatarUrl?: string;
}

interface ReviewCardProps {
  review: ReviewProps;
  currentUserId?: Id<"users"> | null;
  onEdit?: (review: ReviewProps) => void;
  onDelete?: (reviewId: Id<"reviews">) => void;
}

const StarRatingComponent: React.FC<{ rating: number; maxStars?: number }> = ({ rating, maxStars = 5 }) => {
  const fullStars = Math.floor(rating);
  const emptyStars = maxStars - fullStars;

  return (
    <div className="flex items-center">
      {[...Array(fullStars)].map((_, i) => (
        <span key={`full-${i}`} className="text-yellow-400 text-lg">★</span>
      ))}
      {[...Array(emptyStars)].map((_, i) => (
        <span key={`empty-${i}`} className="text-gray-400 text-lg">☆</span>
      ))}
       <span className="ml-2 text-sm text-brand-text-secondary">({rating}/{maxStars})</span>
    </div>
  );
};
const StarRating = memo(StarRatingComponent); // Memoize StarRating as well if it's complex or re-renders often

const ReviewCardComponent: React.FC<ReviewCardProps> = ({ review, currentUserId, onEdit, onDelete }) => {
  const displayDate = review.updatedAt ? review.updatedAt : review.createdAt;
  const timeAgo = formatDistanceToNow(new Date(displayDate), { addSuffix: true });

  return (
    <div className="neumorphic-card bg-brand-surface p-4 rounded-lg shadow-md mb-4">
      <div className="flex items-start mb-2">
        {review.userAvatarUrl ? (
          <img src={review.userAvatarUrl} alt={review.userName} className="w-10 h-10 rounded-full mr-3" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-electric-blue flex items-center justify-center text-white font-semibold mr-3">
            {review.userName?.charAt(0).toUpperCase() || "A"}
          </div>
        )}
        <div className="flex-1">
          <div className="flex justify-between items-center">
            <h4 className="font-orbitron text-md text-neon-cyan">{review.userName}</h4>
            <StarRating rating={review.rating} />
          </div>
          <p className="text-xs text-brand-text-secondary">{timeAgo}</p>
        </div>
      </div>
      {review.reviewText && (
        <p className="text-brand-text text-sm leading-relaxed whitespace-pre-wrap">
          {review.reviewText}
        </p>
      )}
      {currentUserId && review.userId === currentUserId && onEdit && onDelete && (
        <div className="mt-3 pt-3 border-t border-brand-dark flex justify-end space-x-2">
          <button
            onClick={() => onEdit(review)} // If onEdit is stable (e.g., via useCallback), this is fine
            className="text-xs text-electric-blue hover:underline"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(review._id)} // If onDelete is stable, this is fine
            className="text-xs text-sakura-pink hover:underline"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default memo(ReviewCardComponent);