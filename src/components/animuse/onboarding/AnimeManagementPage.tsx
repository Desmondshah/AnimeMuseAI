// src/components/admin/AnimeManagementPage.tsx
import React, { useState, useCallback } from "react";
import { usePaginatedQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Doc, Id } from "../../../../convex/_generated/dataModel";
import StyledButton from "../shared/StyledButton";
import { toast } from "sonner";
import EditAnimeForm from "../../admin/EditAnimeForm"; // Assuming EditAnimeForm.tsx is in the same directory

// This interface should match the one expected by adminEditAnime mutation's 'updates' arg
interface AnimeEditableFields {
  title?: string;
  description?: string;
  posterUrl?: string;
  genres?: string[];
  year?: number;
  rating?: number; // External rating
  emotionalTags?: string[];
  trailerUrl?: string;
  studios?: string[];
  themes?: string[];
}

const AnimeManagementPage: React.FC = () => {
  const {
    results: animeList,
    status,
    loadMore,
    isLoading: isLoadingList, // Renamed to avoid conflict with other loading states
  } = usePaginatedQuery(
    api.admin.getAllAnimeForAdmin,
    {}, // Args for getAllAnimeForAdmin (paginationOpts handled by the hook)
    { initialNumItems: 10 }
  );

  const deleteAnimeMutation = useMutation(api.admin.adminDeleteAnime);
  const editAnimeMutation = useMutation(api.admin.adminEditAnime);

  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingAnime, setEditingAnime] = useState<Doc<"anime"> | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  const handleDeleteAnime = useCallback(async (animeId: Id<"anime">, animeTitle: string) => {
    if (window.confirm(`Are you sure you want to delete "${animeTitle}"? This action cannot be undone and will also remove related reviews and watchlist entries.`)) {
      try {
        toast.loading(`Deleting ${animeTitle}...`, { id: `delete-anime-${animeId}` });
        await deleteAnimeMutation({ animeId });
        toast.success(`"${animeTitle}" deleted successfully.`, { id: `delete-anime-${animeId}` });
        // The list should update automatically due to Convex reactivity
      } catch (error: any) {
        toast.error(error.data?.message || error.message || `Failed to delete "${animeTitle}".`, { id: `delete-anime-${animeId}` });
        console.error("Failed to delete anime:", error);
      }
    }
  }, [deleteAnimeMutation]);

  const handleOpenEditModal = useCallback((anime: Doc<"anime">) => {
    setEditingAnime(anime);
    setIsEditModalOpen(true);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setEditingAnime(null);
  }, []);

  const handleSaveChanges = useCallback(async (animeId: Id<"anime">, updates: AnimeEditableFields) => {
    if (Object.keys(updates).length === 0) {
        toast.info("No changes were made.");
        handleCloseEditModal();
        return;
    }
    setIsSavingEdit(true);
    try {
      toast.loading("Saving changes...", { id: `edit-anime-${animeId}` });
      await editAnimeMutation({ animeId, updates });
      toast.success("Anime updated successfully!", { id: `edit-anime-${animeId}` });
      handleCloseEditModal();
    } catch (error: any) {
      toast.error(error.data?.message || error.message || "Failed to update anime.", { id: `edit-anime-${animeId}` });
      console.error("Failed to save anime changes:", error);
    } finally {
      setIsSavingEdit(false);
    }
  }, [editAnimeMutation, handleCloseEditModal]);


  if (isLoadingList && status === "LoadingFirstPage") {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan"></div>
        <p className="ml-3 text-brand-text-secondary">Loading anime entries...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-orbitron text-neon-cyan mb-6">Anime Management</h2>
      
      {isEditModalOpen && editingAnime && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="neumorphic-card bg-brand-surface p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-orbitron text-sakura-pink">Edit Anime: {editingAnime.title}</h3>
                <button 
                  onClick={handleCloseEditModal} 
                  className="text-2xl text-brand-text-secondary hover:text-sakura-pink p-1 leading-none"
                  aria-label="Close edit modal"
                >
                    &times;
                </button>
            </div>
            <EditAnimeForm
              anime={editingAnime}
              onSave={handleSaveChanges}
              onCancel={handleCloseEditModal}
              isSaving={isSavingEdit}
            />
          </div>
        </div>
      )}

      {(!animeList || animeList.length === 0) && !isLoadingList ? (
        <p className="text-brand-text-secondary p-4">
            {isLoadingList ? "Loading..." : "No anime entries found."}
        </p>
      ) : (
         <div className="overflow-x-auto neumorphic-card bg-brand-dark p-0 shadow-neumorphic-light-inset">
          <table className="min-w-full divide-y divide-brand-surface">
            <thead className="bg-brand-surface/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-orbitron text-sakura-pink uppercase tracking-wider">Poster</th>
                <th className="px-4 py-3 text-left text-xs font-orbitron text-sakura-pink uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-left text-xs font-orbitron text-sakura-pink uppercase tracking-wider">Year</th>
                <th className="px-4 py-3 text-left text-xs font-orbitron text-sakura-pink uppercase tracking-wider">Genres</th>
                <th className="px-4 py-3 text-left text-xs font-orbitron text-sakura-pink uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-dark">
              {animeList?.map((anime) => (
                <tr key={anime._id} className="hover:bg-brand-surface/20 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <img 
                        src={anime.posterUrl || `https://via.placeholder.com/50x75.png?text=${encodeURIComponent(anime.title)}`} 
                        alt={anime.title} 
                        className="w-12 h-[72px] object-cover rounded"
                        onError={(e) => (e.currentTarget.src = `https://via.placeholder.com/50x75.png?text=Error`)}
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-brand-text font-semibold">{anime.title}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-brand-text-secondary">{anime.year || "N/A"}</td>
                  <td className="px-4 py-3 text-sm text-brand-text-secondary max-w-xs truncate" title={anime.genres?.join(", ")}>{anime.genres?.join(", ") || "N/A"}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm space-x-2">
                    <StyledButton
                      onClick={() => handleOpenEditModal(anime)}
                      variant="secondary_small"
                      className="text-xs"
                    >
                      Edit
                    </StyledButton>
                    <StyledButton
                      onClick={() => handleDeleteAnime(anime._id, anime.title)}
                      variant="primary_small" 
                      className="text-xs !bg-red-500 hover:!bg-red-700 focus:!ring-red-500" // More distinct delete button
                    >
                      Delete
                    </StyledButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {status === "CanLoadMore" && (
        <div className="mt-6 text-center">
          <StyledButton onClick={() => loadMore(10)} disabled={isLoadingList} variant="primary">
            {isLoadingList ? "Loading More..." : "Load More Anime"}
          </StyledButton>
        </div>
      )}
       {status === "Exhausted" && animeList && animeList.length > 0 && (
         <p className="mt-6 text-xs text-center text-brand-text-secondary">All anime entries loaded.</p>
       )}
    </div>
  );
};

export default AnimeManagementPage;