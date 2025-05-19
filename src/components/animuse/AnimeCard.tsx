import React from "react";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import StyledButton from "./shared/StyledButton";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { AnimeRecommendation } from "./AIAssistantPage"; // Re-use this type

interface AnimeCardProps {
  anime: AnimeRecommendation | Doc<"anime">; // Can be a recommendation or a stored anime
  onAddToWatchlist?: (animeId: Id<"anime">, status: string) => void; // For direct DB anime
  onViewDetails?: (animeId: Id<"anime">) => void;
  isRecommendation?: boolean; // True if this card is from an AI recommendation
}

export default function AnimeCard({ anime, onAddToWatchlist, onViewDetails, isRecommendation = false }: AnimeCardProps) {
  const upsertToWatchlist = useMutation(api.anime.upsertToWatchlist);
  const addAnimeByUser = useMutation(api.anime.addAnimeByUser); // To add AI recs to DB

  // Check if this anime (from recommendation) is already in our DB
  const existingAnimeInDB = useQuery(
    api.anime.getAnimeByTitle, // Use the public query here
    anime.title ? { title: anime.title } : "skip"
  );
  
  const watchlistEntry = useQuery(
    api.anime.getWatchlistItem,
    existingAnimeInDB?._id ? { animeId: existingAnimeInDB._id } : "skip"
  );


  const handleAddToWatchlist = async (status: string) => {
    let animeIdToUse = (anime as Doc<"anime">)._id;

    if (isRecommendation && !existingAnimeInDB) {
      // If it's a recommendation and not in DB, add it first
      try {
        toast.loading("Adding new anime to database...", { id: `add-${anime.title}`});
        const newAnimeId = await addAnimeByUser({
          title: anime.title,
          description: anime.description || "No description available.",
          posterUrl: anime.posterUrl || `https://via.placeholder.com/200x300.png?text=${encodeURIComponent(anime.title)}`,
          genres: anime.genres || [],
          year: anime.year,
          rating: anime.rating,
          emotionalTags: anime.emotionalTags || [],
          trailerUrl: anime.trailerUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(anime.title)}+trailer`
        });
        if (newAnimeId) {
          animeIdToUse = newAnimeId;
          toast.success("Anime added to database!", { id: `add-${anime.title}`});
        } else {
          throw new Error("Failed to get ID for new anime.");
        }
      } catch (error) {
        console.error("Failed to add recommended anime to DB:", error);
        toast.error("Could not add this anime to the database.", { id: `add-${anime.title}`});
        return;
      }
    } else if (existingAnimeInDB) {
      animeIdToUse = existingAnimeInDB._id;
    }


    if (!animeIdToUse) {
        toast.error("Could not determine anime ID to add to watchlist.");
        return;
    }
    
    if (onAddToWatchlist) {
        onAddToWatchlist(animeIdToUse, status);
    } else {
        try {
            toast.loading("Updating watchlist...", { id: `watchlist-${animeIdToUse}`});
            await upsertToWatchlist({ animeId: animeIdToUse, status });
            toast.success(`Anime ${status === "Plan to Watch" ? "added to" : "updated in"} watchlist!`, { id: `watchlist-${animeIdToUse}`});
        } catch (error) {
            console.error("Failed to update watchlist:", error);
            toast.error("Could not update watchlist.", { id: `watchlist-${animeIdToUse}`});
        }
    }
  };
  
  const currentWatchlistStatus = watchlistEntry?.status;

  return (
    <div className="neumorphic-card bg-brand-surface p-3 flex flex-col justify-between h-full">
      <div>
        <img 
            src={anime.posterUrl || `https://via.placeholder.com/200x300.png?text=${encodeURIComponent(anime.title)}`} 
            alt={anime.title} 
            className="w-full h-48 object-cover rounded-md mb-2 shadow-md" 
            onError={(e) => (e.currentTarget.src = `https://via.placeholder.com/200x300.png?text=${encodeURIComponent(anime.title)}`)}
        />
        <h3 className="text-md font-orbitron text-neon-cyan truncate" title={anime.title}>{anime.title}</h3>
        {anime.year && <p className="text-xs text-brand-text-secondary mb-1">{anime.year}</p>}
        <p className="text-xs text-brand-text-secondary line-clamp-2 mb-1" title={anime.description}>{anime.description}</p>
        {anime.genres && anime.genres.length > 0 && (
          <p className="text-xs text-sakura-pink/80 line-clamp-1 mb-1">
            {anime.genres.join(", ")}
          </p>
        )}
        {anime.emotionalTags && anime.emotionalTags.length > 0 && (
          <p className="text-xs italic text-electric-blue/80 line-clamp-1 mb-2">
            Tags: {anime.emotionalTags.join(", ")}
          </p>
        )}
      </div>
      <div className="mt-auto space-y-1.5">
        {onViewDetails && (anime as Doc<"anime">)._id && (
          <StyledButton onClick={() => onViewDetails((anime as Doc<"anime">)._id!)} variant="secondary_small" className="w-full text-xs">
            View Details
          </StyledButton>
        )}
        {/* If it's a recommendation, it might not have an _id until added to DB */}
        {isRecommendation && !existingAnimeInDB?._id && (
             <StyledButton onClick={() => handleAddToWatchlist("Plan to Watch")} variant="primary_small" className="w-full text-xs">
                Add to DB & Watchlist
            </StyledButton>
        )}
        {(existingAnimeInDB?._id || (anime as Doc<"anime">)._id) && (
            <>
                {currentWatchlistStatus === "Plan to Watch" ? (
                    <StyledButton onClick={() => handleAddToWatchlist("Watching")} variant="primary_small" className="w-full text-xs bg-green-500 hover:bg-green-600">
                        Start Watching
                    </StyledButton>
                ) : currentWatchlistStatus === "Watching" ? (
                     <StyledButton onClick={() => handleAddToWatchlist("Completed")} variant="primary_small" className="w-full text-xs bg-purple-500 hover:bg-purple-600">
                        Mark Completed
                    </StyledButton>
                ) : currentWatchlistStatus === "Completed" ? (
                    <p className="text-xs text-center text-green-400 p-1.5 rounded bg-brand-dark">Completed!</p>
                ) : (
                    <StyledButton onClick={() => handleAddToWatchlist("Plan to Watch")} variant="primary_small" className="w-full text-xs">
                        Add to Watchlist
                    </StyledButton>
                )}
            </>
        )}
         {anime.trailerUrl && (
          <a href={anime.trailerUrl} target="_blank" rel="noopener noreferrer" className="block w-full">
            <StyledButton variant="secondary_small" className="w-full text-xs">
              Watch Trailer
            </StyledButton>
          </a>
        )}
      </div>
    </div>
  );
}
