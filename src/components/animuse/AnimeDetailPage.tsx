import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import StyledButton from "./shared/StyledButton";
import { toast } from "sonner";
// import AnimeCard from "./AnimeCard"; // For similar anime, if needed

interface AnimeDetailPageProps {
  animeId: Id<"anime">;
  onBack: () => void; // Function to go back to the previous view
}

export default function AnimeDetailPage({ animeId, onBack }: AnimeDetailPageProps) {
  const anime = useQuery(api.anime.getAnimeById, { animeId });
  const watchlistEntry = useQuery(api.anime.getWatchlistItem, { animeId });
  const upsertToWatchlist = useMutation(api.anime.upsertToWatchlist);
  // const similarAnime = useQuery(api.anime.getSimilarAnime, { animeId }); // Placeholder for similar anime query

  if (anime === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan"></div>
      </div>
    );
  }

  if (anime === null) {
    return (
      <div className="text-center p-8 neumorphic-card">
        <h2 className="text-2xl font-orbitron text-sakura-pink mb-4">Anime Not Found</h2>
        <p className="text-brand-text-secondary mb-6">Sorry, we couldn't find details for this anime.</p>
        <StyledButton onClick={onBack} variant="primary">Go Back</StyledButton>
      </div>
    );
  }

  const handleWatchlistAction = async (status: string) => {
    try {
        toast.loading("Updating watchlist...", {id: `watchlist-detail-${anime._id}`});
        await upsertToWatchlist({ animeId: anime._id, status });
        toast.success(`Anime ${status === "Plan to Watch" ? "added to" : "updated in"} watchlist!`, {id: `watchlist-detail-${anime._id}`});
    } catch (error) {
        console.error("Failed to update watchlist:", error);
        toast.error("Could not update watchlist.", {id: `watchlist-detail-${anime._id}`});
    }
  };
  
  const currentWatchlistStatus = watchlistEntry?.status;


  return (
    <div className="neumorphic-card p-4 sm:p-6 max-w-3xl mx-auto">
      <StyledButton onClick={onBack} variant="secondary_small" className="mb-4">&larr; Back</StyledButton>
      <div className="relative mb-4">
        <img 
            src={anime.posterUrl || `https://via.placeholder.com/400x600.png?text=${encodeURIComponent(anime.title)}`} 
            alt={anime.title} 
            className="w-full h-64 sm:h-96 object-cover rounded-lg shadow-xl"
            onError={(e) => (e.currentTarget.src = `https://via.placeholder.com/400x600.png?text=${encodeURIComponent(anime.title)}`)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-transparent to-transparent opacity-70 rounded-lg"></div>
        <div className="absolute bottom-0 left-0 p-4 sm:p-6">
          <h1 className="text-3xl sm:text-4xl font-orbitron text-white drop-shadow-lg">{anime.title}</h1>
          {anime.year && <p className="text-lg text-neon-cyan font-semibold">{anime.year}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="md:col-span-2">
          <h2 className="text-xl font-orbitron text-sakura-pink mb-2">Synopsis</h2>
          <p className="text-brand-text-secondary leading-relaxed whitespace-pre-wrap">{anime.description}</p>
        </div>
        <div>
          {anime.genres && anime.genres.length > 0 && (
            <div className="mb-3">
              <h3 className="text-lg font-orbitron text-electric-blue mb-1">Genres</h3>
              <div className="flex flex-wrap gap-2">
                {anime.genres.map(genre => (
                  <span key={genre} className="bg-brand-surface px-2 py-1 text-xs text-neon-cyan rounded-full shadow-neumorphic-light-inset">{genre}</span>
                ))}
              </div>
            </div>
          )}
          {anime.emotionalTags && anime.emotionalTags.length > 0 && (
            <div className="mb-3">
              <h3 className="text-lg font-orbitron text-electric-blue mb-1">Emotional Tags</h3>
              <div className="flex flex-wrap gap-2">
                {anime.emotionalTags.map(tag => (
                  <span key={tag} className="bg-brand-surface px-2 py-1 text-xs text-sakura-pink rounded-full shadow-neumorphic-light-inset">{tag}</span>
                ))}
              </div>
            </div>
          )}
          {anime.rating && (
            <div>
              <h3 className="text-lg font-orbitron text-electric-blue mb-1">Rating</h3>
              <p className="text-2xl text-neon-cyan">{anime.rating}/10</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {currentWatchlistStatus === "Plan to Watch" ? (
            <StyledButton onClick={() => handleWatchlistAction("Watching")} variant="primary" className="flex-1 bg-green-500 hover:bg-green-600">
                Start Watching
            </StyledButton>
        ) : currentWatchlistStatus === "Watching" ? (
            <StyledButton onClick={() => handleWatchlistAction("Completed")} variant="primary" className="flex-1 bg-purple-500 hover:bg-purple-600">
                Mark Completed
            </StyledButton>
        ) : currentWatchlistStatus === "Completed" ? (
            <div className="flex-1 text-center p-3 rounded-lg bg-brand-dark text-green-400 shadow-neumorphic-light-inset">You've completed this anime!</div>
        ) : (
            <StyledButton onClick={() => handleWatchlistAction("Plan to Watch")} variant="primary" className="flex-1">
                Add to Watchlist
            </StyledButton>
        )}
        {anime.trailerUrl && (
          <a href={anime.trailerUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
            <StyledButton variant="secondary" className="w-full">
              Watch Trailer
            </StyledButton>
          </a>
        )}
      </div>

      {/* Placeholder for Similar Anime Section */}
      {/* <div className="mt-8">
        <h2 className="text-2xl font-orbitron text-electric-blue mb-4">Similar Anime</h2>
        {similarAnime && similarAnime.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {similarAnime.map(simAnime => (
              <AnimeCard key={simAnime._id} anime={simAnime} onViewDetails={(id) => console.log("Navigate to similar anime", id)} />
            ))}
          </div>
        ) : (
          <p className="text-brand-text-secondary">No similar anime found yet.</p>
        )}
      </div> */}
    </div>
  );
}
