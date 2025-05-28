// src/components/animuse/onboarding/WatchlistPage.tsx
import React, { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Doc, Id } from "../../../../convex/_generated/dataModel";
import AnimeCard from "../AnimeCard";
import StyledButton from "../shared/StyledButton";
import { toast } from "sonner";

interface WatchlistPageProps {
  onViewDetails: (animeId: Id<"anime">) => void;
  onBack?: () => void;
  onNavigateToCustomLists?: () => void;
}

type WatchlistStatusFilter = "All" | "Watching" | "Completed" | "Plan to Watch" | "Dropped";
type WatchlistItemWithAnime = Doc<"watchlist"> & { anime: Doc<"anime"> | null };

const NotesModal: React.FC<{ isOpen: boolean; currentNotes: string; onSave: (newNotes: string) => Promise<void>; onClose: () => void; animeTitle: string; }> = ({ isOpen, currentNotes, onSave, onClose, animeTitle }) => {
  const [notes, setNotes] = useState(currentNotes);
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => { if (isOpen) { setNotes(currentNotes); } }, [currentNotes, isOpen]);
  if (!isOpen) return null;
  const handleSave = async () => { setIsSaving(true); await onSave(notes); setIsSaving(false); };
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className="neumorphic-card bg-brand-surface p-6 rounded-lg w-full max-w-md">
        <h3 className="text-xl font-orbitron text-sakura-pink mb-1">Notes for:</h3>
        <p className="text-md text-neon-cyan mb-4 truncate" title={animeTitle}>{animeTitle}</p>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} maxLength={500} placeholder="Your private notes..." className="neumorphic-input w-full mb-4 text-sm"/>
        <div className="flex justify-end gap-3">
          <StyledButton onClick={onClose} variant="secondary_small" disabled={isSaving}>Cancel</StyledButton>
          <StyledButton onClick={handleSave} variant="primary_small" disabled={isSaving}>{isSaving ? "Saving..." : "Save"}</StyledButton>
        </div>
      </div>
    </div>
  );
};

export default function WatchlistPage({ onViewDetails, onBack, onNavigateToCustomLists }: WatchlistPageProps) {
  const watchlistDataFull = useQuery(api.anime.getMyWatchlist) as WatchlistItemWithAnime[] | undefined;
  const upsertToWatchlist = useMutation(api.anime.upsertToWatchlist);
  const [filterStatus, setFilterStatus] = useState<WatchlistStatusFilter>("All");
  const [editingNotesFor, setEditingNotesFor] = useState<WatchlistItemWithAnime | null>(null);

  const handleSaveNotes = useCallback(async (newNotes: string) => {
    if (!editingNotesFor || !editingNotesFor.anime) { toast.error("Item data missing."); setEditingNotesFor(null); return; }
    const { _id: watchlistItemId, animeId, status, progress, userRating } = editingNotesFor; // Use watchlistItemId
    try {
      await upsertToWatchlist({ animeId, status, notes: newNotes, progress, userRating });
      toast.success("Notes saved!"); setEditingNotesFor(null);
    } catch (error: any) { toast.error(error.data?.message || "Failed to save notes."); }
  }, [upsertToWatchlist, editingNotesFor]);

  const filteredWatchlist = watchlistDataFull?.filter(item => (filterStatus === "All" || item.status === filterStatus) && item.anime);

  if (watchlistDataFull === undefined) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan"></div><p className="ml-3">Loading watchlist...</p></div>;

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-2">
        <h2 className="text-3xl font-orbitron text-sakura-pink">My Watchlist</h2>
        <div className="flex gap-2 flex-wrap">
            {onNavigateToCustomLists && (
                <StyledButton onClick={onNavigateToCustomLists} variant="primary" className="text-sm">
                    📜 My Custom Lists
                </StyledButton>
            )}
            {onBack && (<StyledButton onClick={onBack} variant="secondary_small" className="text-sm">← Dashboard</StyledButton>)}
        </div>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {(["All", "Watching", "Completed", "Plan to Watch", "Dropped"] as WatchlistStatusFilter[]).map(status => (
          <StyledButton key={status} variant={filterStatus === status ? "primary_small" : "secondary_small"} onClick={() => setFilterStatus(status)} className="text-xs sm:text-sm">
            {status} <span className="ml-1">({status === "All" ? watchlistDataFull.filter(i=>i.anime).length : watchlistDataFull.filter(i => i.status === status && i.anime).length})</span>
          </StyledButton>
        ))}
      </div>
      {filteredWatchlist && filteredWatchlist.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredWatchlist.map((item) => (
            <div key={item._id} className="flex flex-col">
              <AnimeCard anime={item.anime!} onViewDetails={onViewDetails} />
              <StyledButton onClick={() => setEditingNotesFor(item)} variant="secondary_small" className="mt-1.5 text-xs w-full">{item.notes ? "View/Edit Notes" : "Add Notes"}</StyledButton>
              {item.notes && (<p className="mt-1 text-xs text-brand-text-secondary italic truncate p-1 bg-brand-dark rounded" title={item.notes}>Note: {item.notes}</p>)}
            </div>
          ))}
        </div>
      ) : (<div className="text-center p-8 neumorphic-card"><p className="text-brand-text-secondary text-lg">{filterStatus === "All" ? "Your watchlist is empty." : `No anime with status: "${filterStatus}".`}</p><StyledButton onClick={onBack || (() => {})} variant="primary" className="mt-4">Discover Anime</StyledButton></div>)}
      {editingNotesFor && (<NotesModal isOpen={!!editingNotesFor} currentNotes={editingNotesFor.notes || ""} animeTitle={editingNotesFor.anime?.title || "Selected Anime"} onSave={handleSaveNotes} onClose={() => setEditingNotesFor(null)} />)}
    </div>
  );
}