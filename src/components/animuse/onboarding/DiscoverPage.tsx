import React from "react";
import { usePaginatedQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id, Doc } from "../../../../convex/_generated/dataModel";
import AnimeCard from "../AnimeCard";
import StyledButton from "../shared/StyledButton";

interface DiscoverPageProps {
  onViewDetails: (animeId: Id<"anime">) => void;
}

export default function DiscoverPage({ onViewDetails }: DiscoverPageProps) {
  const {
    results: animeList,
    status,
    loadMore,
    isLoading, // Use this for more specific loading states
  } = usePaginatedQuery(
    api.anime.getAllAnime,
    {}, // Initial args for the query (e.g., filters, though none are implemented here yet)
    { initialNumItems: 12 } // Number of items to fetch initially
  );

  return (
    <div className="p-4 sm:p-6">
       <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-orbitron text-electric-blue">Discover Anime</h2>
         <StyledButton onClick={() => {/* Potentially navigate back or to dashboard */}} variant="secondary_small">
            &larr; Dashboard
        </StyledButton>
      </div>


      {status === "LoadingFirstPage" && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan"></div>
          <p className="ml-3">Loading anime...</p>
        </div>
      )}

      {animeList && animeList.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {animeList.map((anime) => (
              <AnimeCard
                key={anime._id}
                anime={anime as Doc<"anime">} // Anime data from getAllAnime query
                onViewDetails={onViewDetails}
                // AnimeCard will use its internal queries for watchlist status for its buttons
              />
            ))}
          </div>
          {status === "CanLoadMore" && (
            <div className="mt-8 text-center">
              <StyledButton onClick={() => loadMore(12)} disabled={isLoading}>
                {isLoading ? "Loading..." : "Load More Anime"}
              </StyledButton>
            </div>
          )}
          {status === "Exhausted" && animeList.length > 0 && (
             <p className="text-center mt-8 text-brand-text-secondary">You've reached the end of the list!</p>
          )}
        </>
      ) : (
        status !== "LoadingFirstPage" && (
          <div className="text-center p-8 neumorphic-card">
            <p className="text-brand-text-secondary text-lg">No anime found in the database yet.</p>
            {/* You might want a button to suggest adding anime or link to AI assistant */}
          </div>
        )
      )}
    </div>
  );
}