// src/components/animuse/onboarding/ReviewForm.tsx
import React, { useState, useEffect } from "react";
import { Id } from "../../../../convex/_generated/dataModel";
import StyledButton from "../shared/StyledButton";
import { ReviewProps } from "./ReviewCard"; // Assuming ReviewProps is exported from ReviewCard
import { toast } from "sonner";

interface ReviewFormProps {
  animeId: Id<"anime">;
  existingReview?: ReviewProps | null;
  onSubmit: (data: {
    animeId: Id<"anime">;
    rating: number;
    reviewText?: string;
    isSpoiler?: boolean;
    reviewId?: Id<"reviews">
  }) => Promise<void>;
  onCancel?: () => void;
  isLoading: boolean;
}

const MAX_RATING = 5; // Standard 5-star rating

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
  const [isSpoiler, setIsSpoiler] = useState(existingReview?.isSpoiler || false);

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setReviewText(existingReview.reviewText || "");
      setIsSpoiler(existingReview.isSpoiler || false);
    } else {
      // Reset form for new review
      setRating(0);
      setReviewText("");
      setIsSpoiler(false);
    }
  }, [existingReview]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Please select a rating before submitting.");
      return;
    }
    onSubmit({
      animeId,
      rating,
      reviewText: reviewText.trim(), // Trim whitespace
      isSpoiler,
      reviewId: existingReview?._id,
    });
  };

  const characterLimit = 5000;

  return (
    // Form container with new theme: bg-brand-surface (Cream), text-brand-text-primary (Dark Brown)
    <form onSubmit={handleSubmit} className="bg-brand-surface text-brand-text-primary p-4 sm:p-5 rounded-xl shadow-lg border border-brand-accent-peach/30">
      <h3 className="text-lg sm:text-xl font-heading text-brand-primary-action mb-3 sm:mb-4">
        {existingReview ? "Edit Your Review" : "Write a Review"}
      </h3>

      {/* Rating Section */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-brand-text-primary/80 mb-1.5">Your Rating*</label>
        <div className="flex items-center space-x-1">
          {[...Array(MAX_RATING)].map((_, index) => {
            const starValue = index + 1;
            return (
              <button
                type="button"
                key={starValue}
                className={`text-2xl sm:text-3xl transition-colors duration-150 ease-in-out focus:outline-none ${
                  starValue <= (hoverRating || rating) ? "text-brand-primary-action" : "text-brand-accent-peach/70"
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
          {rating > 0 && <span className="ml-2 text-brand-text-primary/90 text-sm">({rating}/{MAX_RATING})</span>}
        </div>
      </div>

      {/* Review Text Area */}
      <div className="mb-4">
        <label htmlFor="reviewText" className="block text-sm font-medium text-brand-text-primary/80 mb-1">
          Your Review (Optional)
        </label>
        <textarea
          id="reviewText"
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          rows={4} // Slightly fewer rows for mobile, can expand
          maxLength={characterLimit}
          placeholder="Share your thoughts about this anime..."
          className="form-input w-full !text-sm" // Use themed form-input
        />
        <p className="text-xs text-brand-text-primary/70 mt-1 text-right">
          {reviewText.length}/{characterLimit}
        </p>
      </div>

      {/* Spoiler Checkbox */}
      <div className="mb-5">
        <label htmlFor="isSpoiler" className="flex items-center space-x-2 cursor-pointer group">
          <input
            type="checkbox"
            id="isSpoiler"
            checked={isSpoiler}
            onChange={(e) => setIsSpoiler(e.target.checked)}
            // Basic theming for checkbox, full customization is harder with pure Tailwind
            className="form-checkbox h-4 w-4 rounded border-brand-accent-peach text-brand-primary-action focus:ring-brand-primary-action focus:ring-offset-brand-surface accent-brand-primary-action"
          />
          <span className="text-sm text-brand-text-primary/90 group-hover:text-brand-primary-action transition-colors">
            This review contains spoilers
          </span>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end space-x-2 sm:space-x-3">
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