// src/components/animuse/onboarding/WatchlistPage.tsx - Advanced Artistic Version
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

const WatchlistLoadingSpinner: React.FC<{ message?: string }> = memo(({ message = "Loading your collection..." }) => (
  <div className="flex flex-col justify-center items-center h-64 py-10">
    <div className="relative">
      <div className="w-20 h-20 border-4 border-transparent border-t-brand-primary-action border-r-brand-accent-gold rounded-full animate-spin"></div>
      <div className="absolute top-2 left-2 w-16 h-16 border-4 border-transparent border-b-brand-accent-peach border-l-white/50 rounded-full animate-spin animate-reverse"></div>
      <div className="absolute top-6 left-6 w-8 h-8 bg-gradient-to-r from-brand-primary-action to-brand-accent-gold rounded-full animate-pulse"></div>
    </div>
    <p className="mt-4 text-lg text-white/80 font-medium animate-pulse">{message}</p>
  </div>
));

const NotesModal: React.FC<{
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      {/* Floating Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-br from-brand-primary-action/20 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-tl from-brand-accent-gold/15 to-transparent rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative">
        {/* Glow Effect */}
        <div className="absolute -inset-4 bg-gradient-to-r from-brand-primary-action/40 to-brand-accent-gold/40 rounded-3xl blur-xl opacity-60"></div>
        
        <div className="relative bg-black/80 backdrop-blur-xl border border-white/20 rounded-3xl p-6 sm:p-8 w-full max-w-lg sm:max-w-xl md:max-w-2xl">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-block p-3 bg-gradient-to-r from-brand-primary-action/20 to-brand-accent-gold/20 rounded-full mb-4">
              <span className="text-3xl">📝</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-heading text-white mb-2">Personal Notes</h3>
            <p className="text-brand-accent-gold text-base font-medium truncate" title={animeTitle}>
              {animeTitle}
            </p>
          </div>

          {/* Notes Input */}
          <div className="mb-6">
            <textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              rows={6} 
              maxLength={500} 
              placeholder="Share your thoughts, feelings, or memorable moments about this anime..."
              className="w-full bg-black/40 backdrop-blur-sm border border-white/20 rounded-2xl p-4 text-white placeholder-white/60 focus:border-brand-primary-action focus:ring-2 focus:ring-brand-primary-action/50 focus:outline-none transition-all duration-300 resize-none"
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-white/60 text-xs">Your private thoughts</p>
              <p className="text-white/60 text-xs">{notes.length}/500</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <StyledButton 
              onClick={onClose} 
              variant="ghost" 
              disabled={isSaving}
              className="!bg-white/10 !backdrop-blur-sm !border-white/20 hover:!bg-white/20 !text-white"
            >
              Cancel
            </StyledButton>
            <StyledButton 
              onClick={handleSave} 
              variant="primary" 
              disabled={isSaving}
              className="!bg-gradient-to-r !from-brand-primary-action !to-brand-accent-gold hover:!from-brand-accent-gold hover:!to-brand-primary-action"
            >
              {isSaving ? "Saving..." : "Save Notes"}
            </StyledButton>
          </div>
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
      // Type assertion to fix TypeScript error
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

  // Status configurations with colors and icons
  const statusConfig = {
    "All": { icon: "📚", color: "from-white to-gray-300", count: watchlistDataFull?.filter(i => i.anime)?.length || 0 },
    "Watching": { icon: "👁️", color: "from-blue-500 to-cyan-400", count: watchlistDataFull?.filter(i => i.status === "Watching" && i.anime)?.length || 0 },
    "Completed": { icon: "✅", color: "from-green-500 to-emerald-400", count: watchlistDataFull?.filter(i => i.status === "Completed" && i.anime)?.length || 0 },
    "Plan to Watch": { icon: "📝", color: "from-yellow-500 to-orange-400", count: watchlistDataFull?.filter(i => i.status === "Plan to Watch" && i.anime)?.length || 0 },
    "Dropped": { icon: "⏸️", color: "from-red-500 to-pink-400", count: watchlistDataFull?.filter(i => i.status === "Dropped" && i.anime)?.length || 0 }
  };

  if (watchlistDataFull === undefined) return <WatchlistLoadingSpinner />;

  return (
    <div className="relative min-h-screen">
      {/* Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-80 h-80 bg-gradient-to-br from-brand-primary-action/12 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-32 right-16 w-96 h-96 bg-gradient-to-tr from-brand-accent-gold/10 to-transparent rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-gradient-to-l from-brand-accent-peach/8 to-transparent rounded-full blur-3xl animate-pulse delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-gradient-to-r from-purple-500/8 to-transparent rounded-full blur-3xl animate-pulse delay-3000"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-4 sm:px-6 py-8 space-y-8 md:max-w-5xl lg:max-w-6xl mx-auto">
        {/* Hero Header */}
        <div className="text-center space-y-6">
          <div className="inline-block">
            <h1 className="hero-title font-heading text-white font-bold">
  📚 My Anime Collection
</h1>
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-brand-primary-action to-transparent mt-4 animate-pulse"></div>
          </div>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Your personal anime library - track, organize, and rediscover your favorites
          </p>
          
          {/* Navigation Actions */}
          <div className="flex flex-wrap gap-3 justify-center items-center">
            {onNavigateToCustomLists && (
              <div className="relative group">
                <div className="absolute -inset-2 bg-gradient-to-r from-brand-accent-peach/40 to-brand-primary-action/40 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <StyledButton 
                  onClick={onNavigateToCustomLists} 
                  variant="ghost"
                  className="relative !bg-black/30 !backdrop-blur-sm !border-white/20 hover:!bg-black/50 !text-white flex items-center gap-2"
                >
                  <span className="text-lg">📜</span>
                  Custom Lists
                </StyledButton>
              </div>
            )}
            {onBack && (
              <StyledButton 
                onClick={onBack} 
                variant="ghost" 
                className="!bg-white/10 !backdrop-blur-sm !border-white/20 hover:!bg-white/20 !text-white"
              >
                ← Back to Dashboard
              </StyledButton>
            )}
          </div>
        </div>
{/* Profile Stats Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-brand-accent-peach/20 via-transparent to-brand-primary-action/20 rounded-3xl blur-xl"></div>
          <div className="relative">
            <ProfileStats
              filterStatus={filterStatus}
              onFilterChange={setFilterStatus}
            />

          </div>
        </div>

        {/* Collection Grid */}
        {filteredWatchlist && filteredWatchlist.length > 0 ? (
          <div className="space-y-6">
            {/* Results Summary */}
            <div className="text-center">
              <div className="inline-flex items-center space-x-2 bg-black/30 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20">
                <span className="text-white/80 text-sm">
                  Showing <span className="text-brand-accent-gold font-bold">{filteredWatchlist.length}</span> anime
                  {filterStatus !== "All" && (
                    <span> in <span className="text-brand-primary-action font-medium">{filterStatus}</span></span>
                  )}
                </span>
              </div>
            </div>

            {/* Anime Grid */}
            {filteredWatchlist && (
              <VirtualizedWatchlist
                items={filteredWatchlist}
                statusConfig={statusConfig as any}
                onViewDetails={onViewDetails}
                onEditNotes={(item) => setEditingNotesFor(item)}
              />
            )}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="bg-black/30 backdrop-blur-sm rounded-3xl p-12 border border-white/10 max-w-lg sm:max-w-xl md:max-w-2xl mx-auto">
              <div className="text-8xl mb-6 animate-bounce">
                {filterStatus === "All" ? "📚" : statusConfig[filterStatus]?.icon || "📚"}
              </div>
              <h3 className="text-2xl font-heading text-white mb-4">
                {filterStatus === "All" ? "Your Collection Awaits" : `No ${filterStatus} Anime`}
              </h3>
              <p className="text-white/80 text-lg leading-relaxed mb-6">
                {filterStatus === "All" 
                  ? "Start building your personal anime library by discovering new series and adding them to your watchlist."
                  : `You haven't added any anime to "${filterStatus}" yet. Start exploring and organizing your collection!`
                }
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <StyledButton 
                  onClick={() => onBack ? onBack() : (window.location.href = '/')} 
                  variant="primary"
                  className="!bg-gradient-to-r !from-brand-primary-action !to-brand-accent-gold hover:!from-brand-accent-gold hover:!to-brand-primary-action"
                >
                  🔍 Discover Anime
                </StyledButton>
                {filterStatus !== "All" && (
                  <StyledButton 
                    onClick={() => setFilterStatus("All")} 
                    variant="ghost"
                    className="!bg-white/10 !backdrop-blur-sm !border-white/20 hover:!bg-white/20 !text-white"
                  >
                    View All Collection
                  </StyledButton>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Notes Modal */}
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
    </div>
  );
}