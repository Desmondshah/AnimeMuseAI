import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Doc, Id } from "../../../../convex/_generated/dataModel";
import AnimeCard from "../AnimeCard";
import StyledButton from "../shared/StyledButton";
import { toast } from "sonner";

interface WatchlistPageProps {
  onViewDetails: (animeId: Id<"anime">) => void;
}

type WatchlistStatusFilter = "All" | "Watching" | "Completed" | "Plan to Watch" | "Dropped";

export default function WatchlistPage({ onViewDetails }: WatchlistPageProps) {
  const watchlistDataFull = useQuery(api.anime.getMyWatchlist); // This fetches { ..., anime: Doc<"anime"> }
  const upsertToWatchlist = useMutation(api.anime.upsertToWatchlist); // Though AnimeCard might handle its own
  const [filterStatus, setFilterStatus] = useState<WatchlistStatusFilter>("All");

  // This handleStatusChange might not be directly used if AnimeCard handles its own status changes.
  // However, it's good to have if you want to change status from the watchlist page itself in other ways.
  const handleStatusChange = async (animeId: Id<"anime">, newStatus: string) => {
    try {
      toast.loading("Updating status...", { id: `watchlist-status-${animeId}` });
      await upsertToWatchlist({ animeId, status: newStatus });
      toast.success("Status updated!", { id: `watchlist-status-${animeId}` });
    } catch (error) {
      toast.error("Failed to update status.", { id: `watchlist-status-${animeId}` });
      console.error(error);
    }
  };

  const filteredWatchlist = watchlistDataFull?.filter(item =>
    filterStatus === "All" || item.status === filterStatus
  );

  if (watchlistDataFull === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan"></div>
        <p className="ml-3">Loading watchlist...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-orbitron text-sakura-pink">My Watchlist</h2>
         <StyledButton onClick={() => {/* Potentially navigate back or to dashboard */}} variant="secondary_small">
            &larr; Dashboard
        </StyledButton>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {(["All", "Watching", "Completed", "Plan to Watch", "Dropped"] as WatchlistStatusFilter[]).map(status => (
          <StyledButton
            key={status}
            variant={filterStatus === status ? "primary_small" : "secondary_small"}
            onClick={() => setFilterStatus(status)}
            className="text-xs sm:text-sm"
          >
            {status}
          </StyledButton>
        ))}
      </div>

      {filteredWatchlist && filteredWatchlist.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredWatchlist.map((item) => (
            item.anime ? (
              <AnimeCard
                key={item._id} // Use watchlist item's ID as key for the list
                anime={item.anime as Doc<"anime">} // Pass the embedded anime document
                onViewDetails={onViewDetails}
                // AnimeCard will use its internal existingAnimeInDB and watchlistEntry queries
                // to manage its own button states and actions for watchlist.
              />
            ) : (
              <div key={item._id} className="neumorphic-card p-3 text-brand-text-secondary">
                Anime data missing for watchlist item.
              </div>
            )
          ))}
        </div>
      ) : (
        <div className="text-center p-8 neumorphic-card">
          <p className="text-brand-text-secondary text-lg">
            {filterStatus === "All" ? "Your watchlist is empty." : `No anime found with status: "${filterStatus}".`}
          </p>
          <StyledButton onClick={() => {/* Navigate to Discover Page */}} variant="primary" className="mt-4">
            Discover Anime
          </StyledButton>
        </div>
      )}
    </div>
  );
}