// src/components/animuse/onboarding/ReviewCard.tsx
import React, { memo, useState } from "react";
import { Id } from "../../../../convex/_generated/dataModel";
import { formatDistanceToNow } from 'date-fns';
import StyledButton from "../shared/StyledButton"; // Ensure this path is correct

// Props interface remains the same as it's tied to backend data structure
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
  upvotes?: number;
  downvotes?: number;
  currentUserVote?: "up" | "down" | null;
  commentCount?: number;
}

interface ReviewCardProps {
  review: ReviewProps;
  currentUserId?: Id<"users"> | null;
  onEdit?: (review: ReviewProps) => void;
  onDelete?: (reviewId: Id<"reviews">) => void;
  // onVote and onToggleComments are handled by AnimeDetailPage directly
}

const ThemedStarRatingComponent: React.FC<{ rating: number; maxStars?: number }> = ({ rating, maxStars = 5 }) => {
  // Assuming rating is 1-5 scale as per ReviewForm
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5; // Optional: for half-star display
  const emptyStars = maxStars - fullStars - (halfStar ? 1 : 0);

  return (
    <div className="flex items-center">
      {[...Array(fullStars)].map((_, i) => <span key={`full-${i}`} className="text-brand-primary-action text-sm sm:text-base">★</span>)}
      {/* Add half star logic if desired */}
      {[...Array(emptyStars)].map((_, i) => <span key={`empty-${i}`} className="text-brand-accent-peach text-sm sm:text-base">☆</span>)}
      <span className="ml-1.5 text-xs text-brand-text-primary/70">({rating.toFixed(1)}/{maxStars})</span>
    </div>
  );
};
const ThemedStarRating = memo(ThemedStarRatingComponent);

const ReviewCardComponent: React.FC<ReviewCardProps> = ({ review, currentUserId, onEdit, onDelete }) => {
  const displayDate = review.updatedAt || review.createdAt;
  const timeAgo = formatDistanceToNow(new Date(displayDate), { addSuffix: true });
  const [showSpoiler, setShowSpoiler] = useState(false);
  const reviewContent = review.reviewText || "";
  const isPotentiallySpoiler = review.isSpoiler && reviewContent.length > 0;

  return (
    // The ReviewCard itself is not a "card" but content within AnimeDetailPage's review item card.
    // Parent container in AnimeDetailPage already provides bg-brand-surface, p-3, rounded-lg, shadow-sm, border.
    <div>
      <div className="flex items-start mb-2">
        {review.userAvatarUrl ? (
          <img src={review.userAvatarUrl} alt={review.userName} className="w-8 h-8 sm:w-9 sm:h-9 rounded-full mr-2 sm:mr-2.5 object-cover shadow-sm" />
        ) : (
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-brand-accent-gold text-brand-surface flex items-center justify-center text-sm sm:text-base font-semibold mr-2 sm:mr-2.5 shadow-sm">
            {review.userName?.charAt(0).toUpperCase() || "A"}
          </div>
        )}
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center">
            <h4 className="font-heading text-sm sm:text-base text-brand-primary-action font-semibold">{review.userName}</h4>
            <ThemedStarRating rating={review.rating} />
          </div>
          <p className="text-[10px] sm:text-xs text-brand-text-primary/60">{timeAgo}{review.updatedAt && " (edited)"}</p>
        </div>
      </div>

      {reviewContent && (
        <div className="mt-1.5 text-xs sm:text-sm leading-relaxed text-brand-text-primary/90">
          {isPotentiallySpoiler && !showSpoiler ? (
            <div className="p-2 my-1 bg-brand-accent-peach/20 rounded-md">
              <p className="italic text-brand-accent-gold">This review may contain spoilers.</p>
              <StyledButton onClick={() => setShowSpoiler(true)} variant="ghost" className="!text-[10px] !px-1.5 !py-0.5 mt-1 !text-brand-accent-gold hover:!text-brand-primary-action">Show Spoiler</StyledButton>
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{reviewContent}</p>
          )}
        </div>
      )}

      {/* Votes and comment count are displayed in AnimeDetailPage directly after this card */}
      {/* For internal consistency if this card were used elsewhere, you might include: */}
      {/*
      <div className="mt-2 flex items-center gap-2.5 text-[10px] sm:text-xs text-brand-text-primary/70">
        <span>👍 {review.upvotes || 0}</span>
        <span>👎 {review.downvotes || 0}</span>
        <span>💬 {review.commentCount || 0}</span>
      </div>
      */}


      {currentUserId && review.userId === currentUserId && onEdit && onDelete && (
        <div className="mt-2 pt-1.5 border-t border-brand-accent-peach/30 flex justify-end space-x-2">
          <StyledButton onClick={() => onEdit(review)} variant="ghost" className="!text-[10px] sm:!text-xs !px-1.5 !py-0.5 !text-brand-accent-gold hover:!text-brand-primary-action">Edit</StyledButton>
          <StyledButton onClick={() => onDelete(review._id)} variant="ghost" className="!text-[10px] sm:!text-xs !px-1.5 !py-0.5 !text-red-600 hover:!text-red-700">Delete</StyledButton>
        </div>
      )}
    </div>
  );
};

export default memo(ReviewCardComponent);