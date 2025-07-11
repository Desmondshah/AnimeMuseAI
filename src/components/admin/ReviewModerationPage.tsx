// BRUTALIST REVIEW MODERATION - ReviewModerationPage.tsx
import React, { memo, useState } from "react";
import { usePaginatedQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import StyledButton from "../animuse/shared/StyledButton";
import { toast } from "sonner";
import { format } from 'date-fns';
import { useMobileOptimizations } from "../../hooks/useMobileOptimizations";

// BRUTALIST Loading Component
const BrutalistLoadingSpinner: React.FC<{ message?: string }> = memo(({ message }) => {
  const { shouldReduceAnimations } = useMobileOptimizations();
  
  return (
    <div className="flex flex-col justify-center items-center h-64 py-10 bg-black border-4 border-white">
      <div className="relative w-24 h-24 mb-8">
        <div className="absolute inset-0 border-4 border-white"></div>
        <div className={`absolute inset-2 border-4 border-white ${shouldReduceAnimations ? '' : 'animate-spin'}`} style={{ animationDuration: '1s' }}></div>
        <div className="absolute inset-4 w-16 h-16 bg-white"></div>
      </div>
      
      <h3 className="text-4xl font-black text-white mb-6 uppercase tracking-wider">
        {message || "LOADING REVIEW DATABASE"}
      </h3>
      
      <div className="flex gap-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 bg-white ${shouldReduceAnimations ? 'opacity-100' : 'animate-pulse'}`}
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
});

// BRUTALIST Star Rating Component
const BrutalistStarRating: React.FC<{ rating: number; maxStars?: number }> = memo(({ rating, maxStars = 5 }) => (
  <div className="flex items-center gap-2">
    {[...Array(maxStars)].map((_, i) => (
      <span 
        key={i} 
        className={`text-2xl font-black transition-all duration-200 ${
          i < Math.floor(rating) 
            ? "text-yellow-500" 
            : "text-white"
        }`}
      >
        ★
      </span>
    ))}
    <span className="ml-4 text-lg font-black bg-white text-black px-4 py-2 border-4 border-black uppercase tracking-wide">
      {rating.toFixed(1)}/{maxStars}
    </span>
  </div>
));

// BRUTALIST Review Card Component
const BrutalistReviewCard: React.FC<{
  review: any;
  onDelete: () => void;
}> = memo(({ review, onDelete }) => {
  const { shouldReduceAnimations } = useMobileOptimizations();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getSentimentColor = (rating: number) => {
    if (rating >= 4) return "bg-green-500";
    if (rating >= 3) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getSentimentEmoji = (rating: number) => {
    if (rating >= 4.5) return "😍";
    if (rating >= 4) return "😊";
    if (rating >= 3) return "😐";
    if (rating >= 2) return "😞";
    return "😡";
  };

  return (
    <div className="bg-black border-4 border-white p-6 hover:bg-white hover:text-black transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          {/* User Avatar */}
          <div className={`w-16 h-16 ${getSentimentColor(review.rating)} text-white flex items-center justify-center border-4 border-black font-black text-2xl`}>
            {review.userId.charAt(0).toUpperCase()}
          </div>
          
          <div>
            <p className="text-lg text-white font-black uppercase tracking-wide">
              USER: {review.userId.substring(0, 8)}...
            </p>
            <p className="text-sm text-white font-bold uppercase tracking-wide">
              {format(new Date(review.createdAt), "MMM D, YYYY • HH:MM")}
            </p>
          </div>
        </div>
        
        {/* Sentiment emoji */}
        <div className="text-4xl">
          {getSentimentEmoji(review.rating)}
        </div>
      </div>

      {/* Rating */}
      <div className="mb-6">
        <BrutalistStarRating rating={review.rating} />
      </div>

      {/* Anime Reference */}
      <div className="mb-6 p-4 bg-white text-black border-4 border-black">
        <p className="text-sm font-black uppercase tracking-wide mb-2">ANIME ID:</p>
        <p className="text-lg font-black uppercase tracking-wide">{review.animeId}</p>
      </div>

      {/* Review Text */}
      <div className="mb-6">
        <div className="bg-white text-black p-4 border-4 border-black">
          {review.reviewText ? (
            <div>
              <p className={`font-black uppercase tracking-wide leading-relaxed ${!isExpanded && review.reviewText.length > 150 ? 'line-clamp-3' : ''}`}>
                {review.reviewText}
              </p>
              {review.reviewText.length > 150 && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-black font-black uppercase tracking-wide mt-4 hover:bg-black hover:text-white px-4 py-2 border-4 border-black transition-colors"
                >
                  {isExpanded ? "SHOW LESS" : "SHOW MORE"}
                </button>
              )}
            </div>
          ) : (
            <p className="font-black uppercase tracking-wide italic">NO REVIEW TEXT PROVIDED</p>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap gap-4 mb-6">
        <span className="text-sm bg-white text-black px-4 py-2 border-4 border-black font-black uppercase tracking-wide">
          📅 {format(new Date(review.createdAt), "MMM D")}
        </span>
        <span className="text-sm bg-white text-black px-4 py-2 border-4 border-black font-black uppercase tracking-wide">
          🆔 REVIEW #{review._id.substring(0, 6)}
        </span>
        {review.reviewText && (
          <span className="text-sm bg-white text-black px-4 py-2 border-4 border-black font-black uppercase tracking-wide">
            📝 {review.reviewText.length} CHARS
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={onDelete}
          className="flex-1 bg-red-500 text-white hover:bg-red-600 border-4 border-red-500 px-6 py-3 font-black uppercase tracking-wide transition-colors"
        >
          🗑️ DELETE REVIEW
        </button>
        <button
          className="bg-white text-black hover:bg-gray-100 border-4 border-black px-6 py-3 font-black uppercase tracking-wide transition-colors"
          title="View anime details"
        >
          👁️ VIEW
        </button>
      </div>
    </div>
  );
});

// BRUTALIST Stats Card Component
const BrutalistStatsCard: React.FC<{ 
  title: string; 
  value: string | number; 
  icon: string;
  color: string;
  change?: string;
}> = memo(({ title, value, icon, color, change }) => {
  const { shouldReduceAnimations } = useMobileOptimizations();
  
  return (
    <div className="bg-black border-4 border-white p-6 hover:bg-white hover:text-black transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className="text-4xl">{icon}</div>
        {change && (
          <div className="text-sm bg-green-500 text-black px-3 py-1 font-black uppercase tracking-wide">
            {change}
          </div>
        )}
      </div>
      <div className="text-4xl font-black text-white mb-2">{value}</div>
      <div className="text-lg text-white font-bold uppercase tracking-wide">{title}</div>
    </div>
  );
});

const ReviewModerationPageComponent: React.FC = () => {
  const { isMobile, shouldReduceAnimations } = useMobileOptimizations();
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState<'all' | '1' | '2' | '3' | '4' | '5'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  const {
    results: reviews,
    status,
    loadMore,
    isLoading,
  } = usePaginatedQuery(
    api.admin.getAllReviewsForAdmin,
    {},
    { initialNumItems: 12 }
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
    return <BrutalistLoadingSpinner message="Loading review database..." />;
  }

  if (reviews === null) {
    return (
      <div className="text-center p-8">
        <div className="text-6xl mb-4">🚫</div>
        <h3 className="text-xl text-red-400 mb-2">Access Denied</h3>
        <p className="text-white/70">Could not load reviews. Ensure you are an administrator.</p>
      </div>
    );
  }

  // Calculate stats
  const totalReviews = reviews?.length || 0;
  const averageRating = reviews?.length 
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : "0.0";
  const positiveReviews = reviews?.filter(r => r.rating >= 4).length || 0;
  const negativeReviews = reviews?.filter(r => r.rating <= 2).length || 0;
  const todayReviews = reviews?.filter(r => {
    const today = new Date();
    const reviewDate = new Date(r.createdAt);
    return reviewDate.toDateString() === today.toDateString();
  }).length || 0;

  // Filter and sort reviews
  let filteredReviews = reviews?.filter(review => {
    const matchesSearch = !searchTerm || 
      review.reviewText?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.animeId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRating = ratingFilter === 'all' || Math.floor(review.rating) === parseInt(ratingFilter);
    
    return matchesSearch && matchesRating;
  }) || [];

  // Sort reviews
  filteredReviews.sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'highest':
        return b.rating - a.rating;
      case 'lowest':
        return a.rating - b.rating;
      default:
        return 0;
    }
  });

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-900/50 via-red-900/50 to-pink-900/50 p-6 border border-white/10">
        <div className="relative z-10">
          <h2 className="text-3xl font-heading bg-gradient-to-r from-white via-orange-200 to-red-200 bg-clip-text text-transparent mb-4">
            📝 Review Moderation Center
          </h2>
          <p className="text-white/70 mb-4">Monitor and moderate user reviews to maintain community standards.</p>
        </div>
        
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/20 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <BrutalistStatsCard
          title="Total Reviews"
          value={totalReviews}
          icon="📝"
          color="from-blue-600 to-cyan-600"
          change="+8.1%"
        />
        <BrutalistStatsCard
          title="Avg Rating"
          value={averageRating}
          icon="⭐"
          color="from-yellow-600 to-orange-600"
        />
        <BrutalistStatsCard
          title="Positive"
          value={positiveReviews}
          icon="😊"
          color="from-green-600 to-emerald-600"
          change={`${Math.round((positiveReviews/totalReviews)*100)}%`}
        />
        <BrutalistStatsCard
          title="Negative"
          value={negativeReviews}
          icon="😞"
          color="from-red-600 to-pink-600"
          change={`${Math.round((negativeReviews/totalReviews)*100)}%`}
        />
        <BrutalistStatsCard
          title="Today"
          value={todayReviews}
          icon="📅"
          color="from-purple-600 to-indigo-600"
        />
      </div>

      {/* Filters Section */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search Bar */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-white/40">🔍</span>
          </div>
          <input
            type="text"
            placeholder="Search reviews, users, or anime..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/20 backdrop-blur-sm border border-white/20 rounded-xl py-3 pl-10 pr-4 text-white placeholder-white/50 focus:border-orange-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Rating Filter */}
        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value as any)}
          className="bg-black/20 backdrop-blur-sm border border-white/20 rounded-xl py-3 px-4 text-white focus:border-orange-500 focus:outline-none transition-colors"
        >
          <option value="all">All Ratings</option>
          <option value="5">⭐⭐⭐⭐⭐ (5 stars)</option>
          <option value="4">⭐⭐⭐⭐ (4 stars)</option>
          <option value="3">⭐⭐⭐ (3 stars)</option>
          <option value="2">⭐⭐ (2 stars)</option>
          <option value="1">⭐ (1 star)</option>
        </select>

        {/* Sort Filter */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="bg-black/20 backdrop-blur-sm border border-white/20 rounded-xl py-3 px-4 text-white focus:border-orange-500 focus:outline-none transition-colors"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="highest">Highest Rating</option>
          <option value="lowest">Lowest Rating</option>
        </select>
      </div>

      {/* Reviews Grid */}
      {filteredReviews.length === 0 && !isLoading ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-xl text-white/70 mb-2">No reviews found</h3>
          <p className="text-white/50">No reviews match your current filters or search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredReviews.map((review) => (
            <BrutalistReviewCard
              key={review._id}
              review={review}
              onDelete={() => handleDeleteReview(review._id, review.userId)}
            />
          ))}
        </div>
      )}

      {/* Load More Button */}
      {status === "CanLoadMore" && (
        <div className="text-center pt-8">
          <button
            onClick={() => loadMore(12)}
            disabled={isLoading && status === "LoadingMore"}
            className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-8 py-3 rounded-xl hover:shadow-lg transition-all duration-200 border border-white/20 disabled:opacity-50"
          >
            {isLoading && status === "LoadingMore" ? "Loading..." : "Load More Reviews"}
          </button>
        </div>
      )}
      
      {status === "Exhausted" && reviews && reviews.length > 0 && (
        <p className="text-center text-white/60 py-4">All reviews loaded.</p>
      )}

      {/* Summary Footer */}
      <div className="bg-black/20 backdrop-blur-sm border border-white/20 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-white/70">
          <span>Showing {filteredReviews.length} of {totalReviews} reviews</span>
          <div className="flex gap-4">
            <span>⭐ Avg: {averageRating}</span>
            <span>😊 {positiveReviews} positive</span>
            <span>😞 {negativeReviews} negative</span>
            <span>📅 {todayReviews} today</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(ReviewModerationPageComponent);