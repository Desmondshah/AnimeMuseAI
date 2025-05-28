// src/components/animuse/onboarding/WatchlistPage.tsx
import React, { useState, useCallback, useEffect, memo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Doc, Id } from "../../../../convex/_generated/dataModel";
import AnimeCard from "../AnimeCard"; // Already refactored
import StyledButton from "../shared/StyledButton";
import { toast } from "sonner";

interface WatchlistPageProps {
  onViewDetails: (animeId: Id<"anime">) => void;
  onBack?: () => void;
  onNavigateToCustomLists?: () => void;
}

type WatchlistStatusFilter = "All" | "Watching" | "Completed" | "Plan to Watch" | "Dropped";
type WatchlistItemWithAnime = Doc<"watchlist"> & { anime: Doc<"anime"> | null }; // Assuming anime can't be null if it's in watchlist effectively

// Themed Loading Spinner
const WatchlistLoadingSpinner: React.FC<{ message?: string }> = memo(({ message = "Loading watchlist..." }) => (
  <div className="flex flex-col justify-center items-center h-64 py-10 text-brand-text-primary/80">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-primary-action"></div>
    <p className="mt-3 text-sm">{message}</p>
  </div>
));

// Themed Notes Modal
const NotesModal: React.FC<{
  isOpen: boolean;
  currentNotes: string;
  onSave: (newNotes: string) => Promise<void>;
  onClose: () => void;
  animeTitle: string;
}> = ({ isOpen, currentNotes, onSave, onClose, animeTitle }) => {
  const [notes, setNotes] = useState(currentNotes);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { if (isOpen) { setNotes(currentNotes); setIsSaving(false); } }, [currentNotes, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(notes);
    // setIsSaving(false); // onClose will likely trigger re-render or unmount, resetting state
  };

  return (
    <div className="fixed inset-0 bg-brand-background/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-brand-surface text-brand-text-primary p-5 sm:p-6 rounded-xl shadow-2xl w-full max-w-md">
        <h3 className="text-lg sm:text-xl font-heading text-brand-primary-action mb-1">Notes for:</h3>
        <p className="text-base sm:text-lg text-brand-accent-gold mb-3 sm:mb-4 truncate" title={animeTitle}>{animeTitle}</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          maxLength={500}
          placeholder="Your private thoughts on this anime..."
          className="form-input w-full mb-4 !text-sm" // Themed input
        />
        <div className="flex justify-end gap-2 sm:gap-3">
          <StyledButton onClick={onClose} variant="secondary_small" disabled={isSaving}>Cancel</StyledButton>
          <StyledButton onClick={handleSave} variant="primary_small" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Notes"}
          </StyledButton>
        </div>
      </div>
    </div>
  );
};


export default function WatchlistPage({ onViewDetails, onBack, onNavigateToCustomLists }: WatchlistPageProps) {
  // Ensure WatchlistItemWithAnime correctly reflects that anime should exist
  const watchlistDataFull = useQuery(api.anime.getMyWatchlist) as WatchlistItemWithAnime[] | undefined;
  const upsertToWatchlist = useMutation(api.anime.upsertToWatchlist);
  const [filterStatus, setFilterStatus] = useState<WatchlistStatusFilter>("All");
  const [editingNotesFor, setEditingNotesFor] = useState<WatchlistItemWithAnime | null>(null);

  const handleSaveNotes = useCallback(async (newNotes: string) => {
    if (!editingNotesFor || !editingNotesFor.anime) {
      toast.error("Selected item data is missing.");
      setEditingNotesFor(null);
      return;
    }
    const { animeId, status, progress, userRating } = editingNotesFor;
    try {
      toast.loading("Saving notes...", {id: `save-notes-${animeId}`});
      await upsertToWatchlist({ animeId, status, notes: newNotes, progress, userRating });
      toast.success("Notes saved successfully!", {id: `save-notes-${animeId}`});
      setEditingNotesFor(null); // Close modal on success
    } catch (error: any) {
      toast.error(error.data?.message || "Failed to save notes.", {id: `save-notes-${animeId}`});
    }
  }, [upsertToWatchlist, editingNotesFor]);

  const filteredWatchlist = watchlistDataFull?.filter(item =>
    item.anime && (filterStatus === "All" || item.status === filterStatus)
  );

  if (watchlistDataFull === undefined) return <WatchlistLoadingSpinner />;

  return (
    <div className="p-3 sm:p-4 md:p-0 text-brand-text-primary"> {/* Page on brand-surface, text primary is dark brown */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-5 gap-2">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-heading text-brand-primary-action">My Watchlist</h2>
        <div className="flex gap-2 flex-wrap items-center self-start sm:self-center">
            {onNavigateToCustomLists && (
                <StyledButton onClick={onNavigateToCustomLists} variant="secondary" className="!text-xs sm:!text-sm !py-1.5">
                    📜 Custom Lists
                </StyledButton>
            )}
            {onBack && (<StyledButton onClick={onBack} variant="ghost" className="text-sm text-brand-accent-gold hover:text-brand-primary-action">← Dashboard</StyledButton>)}
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="mb-4 sm:mb-5 flex flex-wrap gap-1.5 sm:gap-2 p-2 sm:p-3 bg-brand-surface rounded-lg shadow border border-brand-accent-peach/20">
        {(["All", "Watching", "Completed", "Plan to Watch", "Dropped"] as WatchlistStatusFilter[]).map(status => {
          const count = status === "All"
            ? watchlistDataFull.filter(i => i.anime).length
            : watchlistDataFull.filter(i => i.status === status && i.anime).length;
          return (
            <StyledButton
              key={status}
              variant={filterStatus === status ? "primary_small" : "secondary_small"}
              selected={filterStatus === status}
              onClick={() => setFilterStatus(status)}
              className="!text-[10px] sm:!text-xs !px-2 !py-1 sm:!px-2.5"
            >
              {status} <span className={`ml-1 text-[9px] sm:text-[10px] ${filterStatus === status ? 'opacity-80' : 'opacity-60'}`}>({count})</span>
            </StyledButton>
          );
        })}
      </div>

      {/* Anime Grid */}
      {filteredWatchlist && filteredWatchlist.length > 0 ? (
        <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3 md:gap-4">
          {filteredWatchlist.map((item) => (
            <div key={item._id} className="flex flex-col bg-brand-surface rounded-lg shadow-sm overflow-hidden border border-brand-accent-peach/20 hover:shadow-md transition-shadow"> {/* Each item is a light card */}
              <AnimeCard anime={item.anime!} onViewDetails={onViewDetails} />
              <div className="p-2 pt-1.5 border-t border-brand-accent-peach/20">
                <StyledButton
                    onClick={() => setEditingNotesFor(item)}
                    variant="ghost" // Use ghost for less prominent notes button
                    className="w-full !text-[10px] sm:!text-xs !py-1 !text-brand-accent-gold hover:!text-brand-primary-action"
                >
                    {item.notes ? "View/Edit Notes" : "Add Notes"}
                </StyledButton>
                {item.notes && (<p className="mt-1 text-[10px] text-brand-text-primary/70 italic truncate p-1 bg-brand-accent-peach/20 rounded" title={item.notes}>{item.notes}</p>)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center p-6 sm:p-8 bg-brand-accent-peach/10 rounded-lg mt-4">
          <p className="text-brand-text-primary/80 text-sm sm:text-base mb-3">
            {filterStatus === "All" ? "Your watchlist is empty." : `No anime with status: "${filterStatus}".`}
          </p>
          <StyledButton onClick={() => onBack ? onBack() : (window.location.href = '/')} variant="primary_small">
            Discover Anime
          </StyledButton>
        </div>
      )}

      {editingNotesFor && editingNotesFor.anime && (
        <NotesModal
          isOpen={!!editingNotesFor}
          currentNotes={editingNotesFor.notes || ""}
          animeTitle={editingNotesFor.anime.title || "Selected Anime"}
          onSave={handleSaveNotes}
          onClose={() => setEditingNotesFor(null)}
        />
      )}
    </div>
  );
}