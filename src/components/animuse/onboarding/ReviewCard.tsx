// src/components/animuse/onboarding/ReviewCard.tsx
import React, { memo, useState } from "react"; 
import { Id } from "../../../../convex/_generated/dataModel";
import { formatDistanceToNow } from 'date-fns';
import StyledButton from "../shared/StyledButton"; 

// This interface is used by AnimeDetailPage and ReviewCard.
// AnimeDetailPage's getReviewsForAnime query will provide these fields.
export interface ReviewProps {
  _id: Id<"reviews">;
  _creationTime: number;
  animeId: Id<"anime">;
  userId: Id<"users">;
  rating: number;
  reviewText?: string;
  isSpoiler?: boolean; 
  createdAt: number;
  updatedAt?: number;
  userName: string;
  userAvatarUrl?: string;
  // Phase 2: Added for displaying votes
  upvotes?: number;
  downvotes?: number;
  currentUserVote?: "up" | "down" | null; // Handled in AnimeDetailPage for interaction
  commentCount?: number; // For display
}

interface ReviewCardProps {
  review: ReviewProps;
  currentUserId?: Id<"users"> | null; // Make currentUserId optional as it might not always be available
  onEdit?: (review: ReviewProps) => void;
  onDelete?: (reviewId: Id<"reviews">) => void;
  // Phase 2: Callbacks for voting and comments (handled in AnimeDetailPage)
   onVote?: (reviewId: Id<"reviews">, voteType: "up" | "down") => void;
   onToggleComments?: (reviewId: Id<"reviews">) => void;
}

const StarRatingComponent: React.FC<{ rating: number; maxStars?: number }> = ({ /* ... */ rating, maxStars = 5 }) => (
    <div className="flex items-center">
      {[...Array(Math.floor(rating))].map((_, i) => <span key={`full-${i}`} className="text-yellow-400 text-lg">★</span>)}
      {[...Array(maxStars - Math.floor(rating))].map((_, i) => <span key={`empty-${i}`} className="text-gray-400 text-lg">☆</span>)}
      <span className="ml-2 text-sm text-brand-text-secondary">({rating}/{maxStars})</span>
    </div>
);
const StarRating = memo(StarRatingComponent);

const ReviewCardComponent: React.FC<ReviewCardProps> = ({ review, currentUserId, onEdit, onDelete }) => {
  const displayDate = review.updatedAt || review.createdAt;
  const timeAgo = formatDistanceToNow(new Date(displayDate), { addSuffix: true });
  const [showSpoiler, setShowSpoiler] = useState(false);
  const reviewContent = review.reviewText || "";
  const isPotentiallySpoiler = review.isSpoiler && reviewContent.length > 0;

  return (
    <div className="neumorphic-card bg-brand-surface p-3 sm:p-4 rounded-lg shadow-md"> {/* Removed mb-4, parent will handle spacing */}
      <div className="flex items-start mb-2">
        {review.userAvatarUrl ? (
          <img src={review.userAvatarUrl} alt={review.userName} className="w-10 h-10 rounded-full mr-3 object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-electric-blue flex items-center justify-center text-white font-semibold mr-3">
            {review.userName?.charAt(0).toUpperCase() || "A"}
          </div>
        )}
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center">
            <h4 className="font-orbitron text-md text-neon-cyan">{review.userName}</h4>
            <StarRating rating={review.rating} />
          </div>
          <p className="text-xs text-brand-text-secondary">{timeAgo}{review.updatedAt && " (edited)"}</p>
        </div>
      </div>

      {reviewContent && (
        <div className="mt-2">
          {isPotentiallySpoiler && !showSpoiler ? (
            <div className="p-3 bg-brand-dark rounded-md shadow-neumorphic-light-inset">
              <p className="text-sm text-yellow-400 italic">This review contains spoilers.</p>
              <StyledButton onClick={() => setShowSpoiler(true)} variant="secondary_small" className="mt-2 text-xs">Show Spoiler</StyledButton>
            </div>
          ) : (
            <p className="text-brand-text text-sm leading-relaxed whitespace-pre-wrap">{reviewContent}</p>
          )}
        </div>
      )}
      
      {/* Display votes and comment count - interactions handled in AnimeDetailPage */}
      <div className="mt-2 flex items-center gap-3 text-xs text-brand-text-secondary">
        <span>👍 {review.upvotes || 0}</span>
        <span>👎 {review.downvotes || 0}</span>
        <span>💬 {review.commentCount || 0} Comments</span>
      </div>

      {currentUserId && review.userId === currentUserId && onEdit && onDelete && (
        <div className="mt-3 pt-2 border-t border-brand-dark flex justify-end space-x-2">
          <button onClick={() => onEdit(review)} className="text-xs text-electric-blue hover:underline">Edit</button>
          <button onClick={() => onDelete(review._id)} className="text-xs text-sakura-pink hover:underline">Delete</button>
        </div>
      )}
    </div>
  );
};

export default memo(ReviewCardComponent);