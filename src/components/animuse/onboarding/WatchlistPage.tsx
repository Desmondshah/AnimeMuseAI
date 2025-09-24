// src/components/animuse/onboarding/WatchlistPage.tsx - BRUTALIST AESTHETIC and Mobile-First Design
import React, { useState, useCallback, useEffect, memo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Doc, Id } from "../../../../convex/_generated/dataModel";

import StyledButton from "../shared/StyledButton";
import ProfileStats from "../onboarding/ProfileStats";
import { WatchlistStatusFilter } from "./watchlistTypes";
import { toast } from "sonner";
import VirtualizedWatchlist from "./VirtualizedWatchlist";

interface WatchlistPageProps {
  onViewDetails: (animeId: Id<"anime">) => void;
  onBack?: () => void;
  onNavigateToCustomLists?: () => void;
}

type WatchlistItemWithAnime = Doc<"watchlist"> & { anime: Doc<"anime"> | null };

// BRUTALIST LOADING SPINNER
const BrutalistWatchlistLoadingSpinner: React.FC<{ message?: string }> = memo(({ message = "LOADING..." }) => (
  <div className="flex flex-col justify-center items-center h-64 py-10">
    <div className="relative">
      <div className="w-20 h-20 border-4 border-black bg-brand-primary-action animate-spin"></div>
      <div className="absolute top-2 left-2 w-16 h-16 border-4 border-black bg-white animate-spin animate-reverse"></div>
      <div className="absolute top-6 left-6 w-8 h-8 bg-black animate-pulse"></div>
    </div>
    <p className="mt-4 text-lg text-black font-black uppercase tracking-wider bg-white px-4 py-2 border-4 border-black shadow-brutal">
      {message}
    </p>
  </div>
));

// BRUTALIST NOTES MODAL
const BrutalistNotesModal: React.FC<{
  isOpen: boolean;
  currentNotes: string;
  onSave: (newNotes: string) => Promise<void>;
  onClose: () => void;
  animeTitle: string;
}> = ({ isOpen, currentNotes, onSave, onClose, animeTitle }) => {
  const [notes, setNotes] = useState(currentNotes);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { 
    if (isOpen) { 
      setNotes(currentNotes); 
      setIsSaving(false); 
    } 
  }, [currentNotes, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(notes);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
      {/* BRUTAL GEOMETRIC BACKGROUND */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-brand-primary-action border-4 border-black transform rotate-45 opacity-30"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-brand-accent-gold border-4 border-black opacity-20"></div>
      </div>

      <div className="relative bg-white border-4 border-black shadow-brutal-lg p-6 w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="bg-black border-4 border-white p-3 mb-4">
            <span className="text-3xl">📝</span>
          </div>
          <div className="bg-brand-primary-action border-4 border-black p-3 mb-2">
            <h3 className="text-xl font-black text-black uppercase tracking-wider">PERSONAL NOTES</h3>
          </div>
          <div className="bg-black border-2 border-white p-2">
            <p className="text-white font-bold text-sm uppercase truncate" title={animeTitle}>
              {animeTitle}
            </p>
          </div>
        </div>

        {/* Notes Input */}
        <div className="mb-6">
          <div className="bg-gray-100 border-4 border-black p-1">
            <textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              rows={6} 
              maxLength={500} 
              placeholder="YOUR THOUGHTS, FEELINGS, MEMORABLE MOMENTS..."
              className="w-full bg-gray-100 border-none outline-none p-3 text-black font-bold placeholder-gray-600 resize-none text-sm uppercase"
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <div className="bg-black text-white px-2 py-1 text-xs font-black uppercase">
              PRIVATE THOUGHTS
            </div>
            <div className="bg-white border-2 border-black px-2 py-1 text-xs font-black text-black">
              {notes.length}/500
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 bg-white border-4 border-black px-4 py-3 font-black text-black uppercase tracking-wider shadow-brutal hover:bg-gray-200 transition-all active:scale-95"
          >
            CANCEL
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex-1 border-4 border-black px-4 py-3 font-black uppercase tracking-wider shadow-brutal transition-all active:scale-95 ${
              isSaving 
                ? 'bg-gray-400 text-gray-700' 
                : 'bg-brand-primary-action text-black hover:bg-blue-400'
            }`}
          >
            {isSaving ? "SAVING..." : "SAVE NOTES"}
          </button>
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
    if (!editingNotesFor || !editingNotesFor.anime) {
      toast.error("Selected item data is missing.");
      setEditingNotesFor(null);
      return;
    }
    const { animeId, status, progress, userRating } = editingNotesFor;
    try {
      toast.loading("Saving notes...", {id: `save-notes-${animeId}`});
      await upsertToWatchlist({ 
        animeId, 
        status: status as "Watching" | "Completed" | "Plan to Watch" | "Dropped", 
        notes: newNotes, 
        progress, 
        userRating 
      });
      toast.success("Notes saved successfully!", {id: `save-notes-${animeId}`});
      setEditingNotesFor(null);
    } catch (error: any) {
      toast.error(error.data?.message || "Failed to save notes.", {id: `save-notes-${animeId}`});
    }
  }, [upsertToWatchlist, editingNotesFor]);

  const filteredWatchlist = watchlistDataFull?.filter(item =>
    item.anime && (filterStatus === "All" || item.status === filterStatus)
  );

  // Status configurations with brutal styling
  const statusConfig = {
    "All": { icon: "📚", color: "bg-white text-black", count: watchlistDataFull?.filter(i => i.anime)?.length || 0 },
    "Watching": { icon: "👁️", color: "bg-blue-500 text-white", count: watchlistDataFull?.filter(i => i.status === "Watching" && i.anime)?.length || 0 },
    "Completed": { icon: "✅", color: "bg-green-500 text-white", count: watchlistDataFull?.filter(i => i.status === "Completed" && i.anime)?.length || 0 },
    "Plan to Watch": { icon: "📝", color: "bg-yellow-500 text-black", count: watchlistDataFull?.filter(i => i.status === "Plan to Watch" && i.anime)?.length || 0 },
    "Dropped": { icon: "⏸️", color: "bg-red-500 text-white", count: watchlistDataFull?.filter(i => i.status === "Dropped" && i.anime)?.length || 0 }
  };

  if (watchlistDataFull === undefined) return <BrutalistWatchlistLoadingSpinner />;

  return (
    <div className="relative min-h-screen bg-white">
      
      {/* BRUTAL GEOMETRIC BACKGROUND */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        
        {/* Floating geometric shapes */}
        <div className="absolute top-20 left-4 w-32 h-32 bg-black border-4 border-brand-primary-action transform rotate-45 opacity-20"></div>
        <div className="absolute top-40 right-8 w-24 h-24 bg-brand-accent-gold border-4 border-black opacity-30"></div>
        <div className="absolute bottom-32 left-8 w-40 h-20 bg-brand-primary-action border-4 border-black transform -rotate-12 opacity-25"></div>
        <div className="absolute bottom-20 right-4 w-28 h-28 bg-black border-4 border-white transform rotate-12 opacity-20"></div>
        
        {/* Diagonal stripes */}
        <div className="absolute top-0 left-0 w-full h-2 bg-black transform -skew-y-12 opacity-30"></div>
        <div className="absolute bottom-0 right-0 w-full h-2 bg-brand-primary-action transform skew-y-12 opacity-30"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 p-4 space-y-6">
        
        {/* BRUTAL HERO HEADER */}
        <div className="bg-black border-4 border-white shadow-brutal-lg p-6 mb-6">
          <div className="bg-brand-primary-action border-4 border-black p-4 mb-4">
            <h1 className="text-2xl md:text-4xl font-black text-black uppercase tracking-wider text-center">
              📚 MY ANIME COLLECTION
            </h1>
          </div>
          
          <div className="bg-white border-4 border-black p-4 mb-4">
            <p className="text-black font-bold text-center text-sm md:text-base uppercase">
              TRACK • ORGANIZE • REDISCOVER YOUR FAVORITES
            </p>
          </div>
          
          {/* Navigation Actions */}
          <div className="flex flex-wrap gap-3 justify-center">
            {onNavigateToCustomLists && (
              <button
                onClick={onNavigateToCustomLists}
                className="bg-brand-accent-gold border-4 border-black px-6 py-3 font-black text-black uppercase tracking-wider shadow-brutal hover:bg-yellow-400 transition-all active:scale-95 flex items-center gap-2"
              >
                <span className="text-lg">📜</span>
                CUSTOM LISTS
              </button>
            )}
          </div>
        </div>

        {/* BRUTAL PROFILE STATS SECTION */}
        <div className="bg-black border-4 border-white shadow-brutal-lg p-6">
          <ProfileStats
            filterStatus={filterStatus}
            onFilterChange={setFilterStatus}
          />
        </div>

        {/* COLLECTION GRID */}
        {filteredWatchlist && filteredWatchlist.length > 0 ? (
          <div className="space-y-6">
            
            {/* Results Summary */}
            <div className="text-center">
              <div className="inline-block bg-black border-4 border-white px-6 py-3">
                <span className="text-white font-black uppercase text-sm">
                  SHOWING <span className="text-brand-accent-gold">{filteredWatchlist.length}</span> ANIME
                  {filterStatus !== "All" && (
                    <span> IN <span className="text-brand-primary-action">{filterStatus.toUpperCase()}</span></span>
                  )}
                </span>
              </div>
            </div>

            {/* ANIME GRID - MOBILE-FIRST 2-COLUMN LAYOUT */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {filteredWatchlist.map((item, index) => {
                if (!item.anime) return null;
                return (
                  <div key={item._id} className="group relative">
                    {/* Brutal frame for anime card */}
                    <div className="bg-black border-4 border-white shadow-brutal-lg p-2 hover:border-brand-primary-action transition-all duration-200 active:scale-95">
                      
                      {/* Status Badge */}
                      <div className="absolute top-4 right-4 z-10">
                        <div className={`px-2 py-1 border-2 border-black shadow-brutal ${statusConfig[item.status as keyof typeof statusConfig]?.color || 'bg-white text-black'}`}>
                          <span className="text-xs font-black">{statusConfig[item.status as keyof typeof statusConfig]?.icon || "📚"}</span>
                        </div>
                      </div>

                      {/* Anime Card */}
                      <div className="bg-white border-2 border-black p-1 mb-2">
                        <div 
                          onClick={() => onViewDetails(item.anime!._id)}
                          className="cursor-pointer touch-target"
                        >
                          <img
                            src={item.anime.posterUrl || `https://placehold.co/300x450/ECB091/321D0B/png?text=${encodeURIComponent(item.anime.title.substring(0,10))}&font=roboto`}
                            alt={item.anime.title}
                            className="w-full aspect-[3/4] object-cover"
                            loading="lazy"
                          />
                        </div>
                      </div>
                      
                      {/* Title */}
                      <div className="bg-black border-2 border-white p-2 mb-2">
                        <h4 
                          className="text-xs font-black text-white text-center leading-tight uppercase tracking-wider"
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            lineHeight: '1.2',
                            maxHeight: '2.4em',
                          }}
                          title={item.anime.title}
                        >
                          {item.anime.title.toUpperCase()}
                        </h4>
                      </div>

                      {/* Notes Button */}
                      <button
                        onClick={() => setEditingNotesFor(item)}
                        className="w-full bg-brand-accent-gold border-2 border-black px-2 py-2 font-black text-black text-xs uppercase tracking-wider shadow-brutal hover:bg-yellow-400 transition-all active:scale-95 flex items-center justify-center gap-1 touch-target"
                      >
                        <span className="text-sm">📝</span>
                        {item.notes ? "EDIT NOTES" : "ADD NOTES"}
                      </button>

                      {/* Notes Preview */}
                      {item.notes && (
                        <div className="mt-2 bg-gray-200 border-2 border-black p-2">
                          <p className="text-xs text-black font-bold line-clamp-2 leading-tight uppercase" title={item.notes}>
                            {item.notes.toUpperCase()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
  ) : null}

        {/* NOTES MODAL */}
        {editingNotesFor && editingNotesFor.anime && (
          <BrutalistNotesModal 
            isOpen={!!editingNotesFor} 
            currentNotes={editingNotesFor.notes || ""} 
            animeTitle={editingNotesFor.anime.title || "Selected Anime"} 
            onSave={handleSaveNotes} 
            onClose={() => setEditingNotesFor(null)} 
          />
        )}
      </div>
    </div>
  );
}