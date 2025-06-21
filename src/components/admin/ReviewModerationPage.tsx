// Enhanced ReviewModerationPage.tsx with dramatic visual upgrades
import React, { memo, useState } from "react";
import { usePaginatedQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import StyledButton from "../animuse/shared/StyledButton";
import { toast } from "sonner";
import { format } from 'date-fns';
import { useMobileOptimizations } from "../../../convex/useMobileOptimizations";

// Enhanced Loading Component
const FuturisticLoadingSpinner: React.FC<{ message?: string }> = memo(({ message }) => {
  const { shouldReduceAnimations } = useMobileOptimizations();
  
  return (
    <div className="flex flex-col justify-center items-center h-64 py-10">
      <div className="relative w-16 h-16 mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-amber-500/20"></div>
        <div className={`absolute inset-1 rounded-full border-4 border-orange-500/40 ${shouldReduceAnimations ? '' : 'animate-spin'}`} style={{ animationDuration: '3s' }}></div>
        <div className={`absolute inset-2 rounded-full border-4 border-red-500 ${shouldReduceAnimations ? '' : 'animate-spin'}`} style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}></div>
        <div className="absolute inset-4 w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 rounded-full"></div>
      </div>
      
      <h3 className="text-xl font-heading bg-gradient-to-r from-red-400 via-orange-400 to-amber-400 bg-clip-text text-transparent">
        {message || "Loading Review Database..."}
      </h3>
    </div>
  );
});

// Enhanced Star Rating Component
const EnhancedStarRating: React.FC<{ rating: number; maxStars?: number }> = memo(({ rating, maxStars = 5 }) => (
  <div className="flex items-center gap-1">
    {[...Array(maxStars)].map((_, i) => (
      <span 
        key={i} 
        className={`text-lg transition-all duration-200 ${
          i < Math.floor(rating) 
            ? "text-yellow-400 drop-shadow-lg" 
            : "text-gray-600"
        }`}
      >
        ★
      </span>
    ))}
    <span className="ml-2 text-sm font-medium bg-black/20 px-2 py-1 rounded-full text-white/80">
      {rating.toFixed(1)}/{maxStars}
    </span>
  </div>
));

// Enhanced Review Card Component
const ReviewCard: React.FC<{
  review: any;
  onDelete: () => void;
}> = memo(({ review, onDelete }) => {
  const { shouldReduceAnimations } = useMobileOptimizations();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getSentimentColor = (rating: number) => {
    if (rating >= 4) return "from-green-600 to-emerald-600";
    if (rating >= 3) return "from-yellow-600 to-orange-600";
    return "from-red-600 to-pink-600";
  };

  const getSentimentEmoji = (rating: number) => {
    if (rating >= 4.5) return "😍";
    if (rating >= 4) return "😊";
    if (rating >= 3) return "😐";
    if (rating >= 2) return "😞";
    return "😡";
  };

  return (
    <div className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${getSentimentColor(review.rating)} p-1
      ${shouldReduceAnimations ? 'hover:scale-105' : 'hover:scale-110'} transition-all duration-300 shadow-lg hover:shadow-2xl`}>
      
      {/* Glow effect */}
      <div className={`absolute inset-0 bg-gradient-to-br ${getSentimentColor(review.rating)} opacity-0 group-hover:opacity-30 transition-opacity duration-300 rounded-2xl`}></div>
      
      {/* Inner card */}
      <div className="relative bg-black/60 backdrop-blur-xl rounded-xl p-6 border border-white/10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* User Avatar */}
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getSentimentColor(review.rating)} flex items-center justify-center text-white font-bold shadow-lg`}>
              {review.userId.charAt(0).toUpperCase()}
            </div>
            
            <div>
              <p className="text-sm text-white/80 font-mono">
                User: {review.userId.substring(0, 8)}...
              </p>
              <p className="text-xs text-white/60">
                {format(new Date(review.createdAt), "MMM d, yyyy • HH:mm")}
              </p>
            </div>
          </div>
          
          {/* Sentiment emoji */}
          <div className="text-2xl">
            {getSentimentEmoji(review.rating)}
          </div>
        </div>

        {/* Rating */}
        <div className="mb-4">
          <EnhancedStarRating rating={review.rating} />
        </div>

        {/* Anime Reference */}
        <div className="mb-4 p-3 bg-black/20 rounded-lg border border-white/10">
          <p className="text-xs text-white/60 mb-1">Anime ID:</p>
          <p className="text-sm text-white/80 font-mono">{review.animeId}</p>
        </div>

        {/* Review Text */}
        <div className="mb-4">
          <div className="bg-black/20 rounded-lg p-4 border border-white/10">
            {review.reviewText ? (
              <div>
                <p className={`text-white/90 leading-relaxed ${!isExpanded && review.reviewText.length > 150 ? 'line-clamp-3' : ''}`}>
                  {review.reviewText}
                </p>
                {review.reviewText.length > 150 && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-brand-accent-gold text-sm mt-2 hover:text-brand-primary-action transition-colors"
                  >
                    {isExpanded ? "Show less" : "Show more"}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-white/50 italic">No review text provided</p>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-xs bg-white/10 text-white/70 px-2 py-1 rounded-full border border-white/20">
            📅 {format(new Date(review.createdAt), "MMM d")}
          </span>
          <span className="text-xs bg-white/10 text-white/70 px-2 py-1 rounded-full border border-white/20">
            🆔 Review #{review._id.substring(0, 6)}
          </span>
          {review.reviewText && (
            <span className="text-xs bg-white/10 text-white/70 px-2 py-1 rounded-full border border-white/20">
              📝 {review.reviewText.length} chars
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onDelete}
            className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 text-white py-2 px-4 rounded-xl hover:from-red-500 hover:to-pink-500 transition-all duration-200 border border-red-500/30 font-medium"
          >
            🗑️ Delete Review
          </button>
          <button
            className="px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors border border-white/20"
            title="View anime details"
          >
            👁️
          </button>
        </div>
      </div>
    </div>
  );
});

// Stats Card Component
const StatsCard: React.FC<{ 
  title: string; 
  value: string | number; 
  icon: string;
  gradient: string;
  change?: string;
}> = memo(({ title, value, icon, gradient, change }) => {
  const { shouldReduceAnimations } = useMobileOptimizations();
  
  return (
    <div className={`relative group overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-1
      ${shouldReduceAnimations ? 'hover:scale-105' : 'hover:scale-110'} transition-all duration-300`}>
      <div className="bg-black/40 backdrop-blur-xl rounded-xl p-4 h-full border border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="text-2xl">{icon}</div>
          {change && (
            <div className="text-xs text-green-400 bg-green-400/20 px-2 py-1 rounded-full">
              {change}
            </div>
          )}
        </div>
        <div className="text-2xl font-bold text-white mb-1">{value}</div>
        <div className="text-sm text-white/70">{title}</div>
      </div>
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
    return <FuturisticLoadingSpinner message="Loading review database..." />;
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
        <StatsCard
          title="Total Reviews"
          value={totalReviews}
          icon="📝"
          gradient="from-blue-600 to-cyan-600"
          change="+8.1%"
        />
        <StatsCard
          title="Avg Rating"
          value={averageRating}
          icon="⭐"
          gradient="from-yellow-600 to-orange-600"
        />
        <StatsCard
          title="Positive"
          value={positiveReviews}
          icon="😊"
          gradient="from-green-600 to-emerald-600"
          change={`${Math.round((positiveReviews/totalReviews)*100)}%`}
        />
        <StatsCard
          title="Negative"
          value={negativeReviews}
          icon="😞"
          gradient="from-red-600 to-pink-600"
          change={`${Math.round((negativeReviews/totalReviews)*100)}%`}
        />
        <StatsCard
          title="Today"
          value={todayReviews}
          icon="📅"
          gradient="from-purple-600 to-indigo-600"
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
            <ReviewCard
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