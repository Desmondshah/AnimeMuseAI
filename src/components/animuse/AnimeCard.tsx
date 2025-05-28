// src/components/animuse/AnimeCard.tsx - Memoized
import React, { memo } from "react"; // Import memo
import { Doc, Id } from "../../../convex/_generated/dataModel";
import StyledButton from "./shared/StyledButton";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { AnimeRecommendation } from "../../../convex/types";

interface AnimeCardProps {
  anime: AnimeRecommendation | Doc<"anime">;
  onAddToWatchlist?: (animeId: Id<"anime">, status: string) => void;
  onViewDetails?: (animeId: Id<"anime">) => void;
  isRecommendation?: boolean;
}

// Define the component as a const
const AnimeCardComponent: React.FC<AnimeCardProps> = ({
  anime,
  onAddToWatchlist,
  onViewDetails,
  isRecommendation = false
}) => {
  const upsertToWatchlist = useMutation(api.anime.upsertToWatchlist);
  const addAnimeByUser = useMutation(api.anime.addAnimeByUser);

  const existingAnimeInDB = useQuery(
    api.anime.getAnimeByTitle,
    anime.title ? { title: anime.title } : "skip"
  );
  
  const watchlistEntry = useQuery(
    api.anime.getWatchlistItem,
    existingAnimeInDB?._id ? { animeId: existingAnimeInDB._id } : "skip"
  );

  const handleAddToWatchlist = async (status: string) => {
    let animeIdToUse = (anime as Doc<"anime">)._id; // Assume it might be a Doc<"anime"> initially

    if (isRecommendation && !existingAnimeInDB) {
      try {
        toast.loading("Adding new anime to database...", { id: `add-${anime.title}`});
        // Ensure all necessary fields for addAnimeByUser are provided from anime (AnimeRecommendation)
        const newAnimeId = await addAnimeByUser({
          title: anime.title,
          description: anime.description || "No description available.",
          posterUrl: anime.posterUrl || `https://via.placeholder.com/200x300.png?text=${encodeURIComponent(anime.title)}`,
          genres: anime.genres || [],
          year: anime.year, // Ensure year is passed if available
          rating: anime.rating, // Ensure rating is passed if available
          emotionalTags: anime.emotionalTags || [],
          trailerUrl: anime.trailerUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(anime.title)}+trailer`, // Corrected placeholder
          studios: anime.studios || [],
          themes: anime.themes || []
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
    } else if (!animeIdToUse && !isRecommendation) {
        // This case implies anime is Doc<"anime"> but _id is somehow missing, which is unlikely if data is clean
        // Or if it's a recommendation flow that didn't get properly flagged
        console.error("Anime ID is missing for a non-recommendation card.", anime);
        toast.error("Cannot add to watchlist: Anime ID missing.");
        return;
    }


    if (!animeIdToUse) { // Final check for animeIdToUse
        toast.error("Could not determine anime ID to add to watchlist.");
        return;
    }
    
    // Call the prop if provided (e.g., from AnimeDetailPage context)
    if (onAddToWatchlist) {
        onAddToWatchlist(animeIdToUse, status);
    } else { // Default behavior: directly call the mutation
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
  const animeDocumentId = existingAnimeInDB?._id || (anime as Doc<"anime">)._id;


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
        {onViewDetails && animeDocumentId && (
          <StyledButton onClick={() => onViewDetails(animeDocumentId)} variant="secondary_small" className="w-full text-xs">
            View Details
          </StyledButton>
        )}
        
        {/* Logic for "Add to DB & Watchlist" button or regular watchlist buttons */}
        {isRecommendation && !existingAnimeInDB && (
             <StyledButton onClick={() => handleAddToWatchlist("Plan to Watch")} variant="primary_small" className="w-full text-xs">
                Add to DB & Watchlist
            </StyledButton>
        )}

        {/* This block shows watchlist status buttons if the anime is in DB (either originally or after being added) */}
        {animeDocumentId && (isRecommendation ? existingAnimeInDB : true) && ( // Show if anime is in DB
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
                ) : ( // Not on watchlist or status is "Dropped" or other
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
};

// Wrap the component with React.memo
export default memo(AnimeCardComponent);