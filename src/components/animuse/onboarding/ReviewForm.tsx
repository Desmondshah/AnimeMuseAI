// src/components/animuse/ReviewForm.tsx
import React, { useState, useEffect } from "react";
import { Id } from "../../../../convex/_generated/dataModel";
import StyledButton from "../shared/StyledButton";
import { ReviewProps } from "./ReviewCard"; // Assuming ReviewProps is exported from ReviewCard

interface ReviewFormProps {
  animeId: Id<"anime">;
  existingReview?: ReviewProps | null; // Pass existing review data for editing
  onSubmit: (data: { animeId: Id<"anime">; rating: number; reviewText?: string; reviewId?: Id<"reviews"> }) => Promise<void>;
  onCancel?: () => void;
  isLoading: boolean;
}

const MAX_RATING = 5;

export default function ReviewForm({
  animeId,
  existingReview,
  onSubmit,
  onCancel,
  isLoading,
}: ReviewFormProps) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [reviewText, setReviewText] = useState(existingReview?.reviewText || "");
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setReviewText(existingReview.reviewText || "");
    } else {
      // Reset for new review form
      setRating(0);
      setReviewText("");
    }
  }, [existingReview]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      // Or use a toast to notify user
      alert("Please select a rating.");
      return;
    }
    onSubmit({
      animeId,
      rating,
      reviewText,
      reviewId: existingReview?._id,
    });
  };

  const characterLimit = 5000;

  return (
    <form onSubmit={handleSubmit} className="neumorphic-card bg-brand-surface p-4 sm:p-6 rounded-lg shadow-lg">
      <h3 className="text-xl font-orbitron text-sakura-pink mb-4">
        {existingReview ? "Edit Your Review" : "Write a Review"}
      </h3>

      {/* Star Rating Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-brand-text-secondary mb-1">Your Rating*</label>
        <div className="flex items-center space-x-1">
          {[...Array(MAX_RATING)].map((_, index) => {
            const starValue = index + 1;
            return (
              <button
                type="button"
                key={starValue}
                className={`text-2xl transition-colors duration-150 ease-in-out ${
                  starValue <= (hoverRating || rating) ? "text-yellow-400" : "text-gray-500"
                }`}
                onClick={() => setRating(starValue)}
                onMouseEnter={() => setHoverRating(starValue)}
                onMouseLeave={() => setHoverRating(0)}
                aria-label={`Rate ${starValue} out of ${MAX_RATING}`}
              >
                ★
              </button>
            );
          })}
          {rating > 0 && <span className="ml-2 text-brand-text">({rating}/{MAX_RATING})</span>}
        </div>
      </div>

      {/* Review Text Input */}
      <div className="mb-4">
        <label htmlFor="reviewText" className="block text-sm font-medium text-brand-text-secondary mb-1">
          Your Review (Optional)
        </label>
        <textarea
          id="reviewText"
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          rows={5}
          maxLength={characterLimit}
          placeholder="Share your thoughts about this anime..."
          className="neumorphic-input w-full focus:ring-electric-blue focus:border-electric-blue"
        />
        <p className="text-xs text-brand-text-secondary mt-1 text-right">
          {reviewText.length}/{characterLimit}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end space-x-3">
        {onCancel && (
          <StyledButton type="button" onClick={onCancel} variant="secondary_small" disabled={isLoading}>
            Cancel
          </StyledButton>
        )}
        <StyledButton type="submit" variant="primary_small" disabled={isLoading || rating === 0}>
          {isLoading ? (existingReview ? "Updating..." : "Submitting...") : (existingReview ? "Update Review" : "Submit Review")}
        </StyledButton>
      </div>
    </form>
  );
}