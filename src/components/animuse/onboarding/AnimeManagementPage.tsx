// src/components/animuse/onboarding/AnimeManagementPage.tsx
// (Assuming this is used as an Admin page, despite its original folder)
import React, { useState, useCallback, memo } from "react";
import { usePaginatedQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Doc, Id } from "../../../../convex/_generated/dataModel";
import StyledButton from "../shared/StyledButton";
import { toast } from "sonner";
import EditAnimeForm from "../../admin/EditAnimeForm"; // This will be refactored next

// Themed Loading Spinner (can be shared if moved to a common admin utils)
const AdminLoadingSpinner: React.FC<{ message?: string }> = memo(({ message }) => (
  <div className="flex flex-col justify-center items-center h-64 py-10 text-brand-text-primary/80">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-primary-action"></div>
    {message && <p className="mt-3 text-sm">{message}</p>}
  </div>
));

interface AnimeEditableFields {
  title?: string; description?: string; posterUrl?: string; genres?: string[];
  year?: number; rating?: number; emotionalTags?: string[];
  trailerUrl?: string; studios?: string[]; themes?: string[];
}

const AnimeManagementPageComponent: React.FC = () => {
  const {
    results: animeList,
    status,
    loadMore,
    isLoading: isLoadingList,
  } = usePaginatedQuery(
    api.admin.getAllAnimeForAdmin, {}, { initialNumItems: 10 }
  );

  const deleteAnimeMutation = useMutation(api.admin.adminDeleteAnime);
  const editAnimeMutation = useMutation(api.admin.adminEditAnime);

  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingAnime, setEditingAnime] = useState<Doc<"anime"> | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
const importTrendingAnimeAction = useAction(api.externalApis.callImportTrendingAnime);
  const [isImportingTrending, setIsImportingTrending] = useState(false);
   const handleDeleteAnime = useCallback(async (animeId: Id<"anime">, animeTitle: string) => {
    if (window.confirm(`PERMANENTLY DELETE "${animeTitle}" and all its reviews/watchlist entries? This cannot be undone.`)) {
      try {
        toast.loading(`Deleting ${animeTitle}...`, { id: `delete-anime-${animeId}` });
        await deleteAnimeMutation({ animeId });
        toast.success(`"${animeTitle}" deleted.`, { id: `delete-anime-${animeId}` });
      } catch (error: any) {
        toast.error(error.data?.message || `Failed to delete "${animeTitle}".`, { id: `delete-anime-${animeId}` });
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
      toast.loading("Saving anime changes...", { id: `edit-anime-${animeId}` });
      await editAnimeMutation({ animeId, updates });
      toast.success("Anime updated successfully!", { id: `edit-anime-${animeId}` });
      handleCloseEditModal();
    } catch (error: any) {
      toast.error(error.data?.message || "Failed to update anime.", { id: `edit-anime-${animeId}` });
    } finally {
      setIsSavingEdit(false);
    }
  }, [editAnimeMutation, handleCloseEditModal]);

  const handleImportTrending = useCallback(async () => {
    setIsImportingTrending(true);
    const toastId = "import-trending";
    toast.loading("Importing trending anime...", { id: toastId });
    try {
      const result = await importTrendingAnimeAction({ limit: 10 });
      if (result.error) {
        toast.error(result.error, { id: toastId });
      } else {
        toast.success(`Imported ${result.imported} new anime`, { id: toastId });
        window.location.reload();
      }
    } catch (error: any) {
      toast.error(`Import failed: ${error.message}`, { id: toastId });
    } finally {
      setIsImportingTrending(false);
    }
  }, [importTrendingAnimeAction]);

  const placeholderPoster = (title: string) => `https://placehold.co/80x120/${'ECB091'.substring(1)}/${'321D0B'.substring(1)}/png?text=${encodeURIComponent(title.substring(0,3))}&font=poppins`;


  if (isLoadingList && status === "LoadingFirstPage" && (!animeList || animeList.length === 0)) {
    return <AdminLoadingSpinner message="Loading anime entries..." />;
  }
   if (animeList === null) {
      return <p className="text-brand-text-primary/70 p-4 text-center">Could not load anime. Ensure you are an administrator.</p>;
  }


  return (
    <div className="text-brand-text-primary">
      <h2 className="text-lg sm:text-xl font-heading text-brand-primary-action mb-3 sm:mb-4">Anime Database Management</h2>
      <div className="mb-4">
        <StyledButton onClick={handleImportTrending} variant="primary_small" disabled={isImportingTrending}>
          {isImportingTrending ? 'Importing...' : 'Import Trending Anime'}
        </StyledButton>
      </div>
      
      {isEditModalOpen && editingAnime && (
        // Modal Overlay and Panel
        <div className="fixed inset-0 bg-brand-background/70 backdrop-blur-sm flex items-center justify-center z-[101] p-4"> {/* Higher z-index for modal */}
          <div className="bg-brand-surface text-brand-text-primary p-4 sm:p-5 rounded-xl shadow-2xl w-full max-w-lg sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar border border-brand-accent-peach/30">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-base sm:text-lg font-heading text-brand-primary-action">Edit Anime: {editingAnime.title}</h3>
                <button onClick={handleCloseEditModal} className="text-2xl text-brand-text-primary/70 hover:text-brand-primary-action p-1 leading-none focus:outline-none" aria-label="Close edit modal">&times;</button>
            </div>
            <EditAnimeForm anime={editingAnime} onSave={handleSaveChanges} onCancel={handleCloseEditModal} isSaving={isSavingEdit} />
          </div>
        </div>
      )}

      {animeList.length === 0 && !isLoadingList ? (
        <p className="text-brand-text-primary/70 text-center py-5">No anime entries found. Add some!</p>
      ) : (
         <div className="overflow-x-auto bg-brand-surface rounded-lg shadow-md border border-brand-accent-peach/30">
          <table className="min-w-full divide-y divide-brand-accent-peach/20">
            <thead className="bg-brand-accent-peach/10">
              <tr>
                {["Poster", "Title", "Year", "Genres", "Actions"].map(header => (
                     <th key={header} className="px-3 py-2 sm:px-4 sm:py-2.5 text-left text-[10px] sm:text-xs font-semibold font-heading text-brand-primary-action/80 uppercase tracking-wider">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-accent-peach/20">
              {animeList?.map((anime) => (
                <tr key={anime._id} className="hover:bg-brand-accent-peach/10 transition-colors duration-150">
                  <td className="px-3 py-1.5 sm:px-4 sm:py-2 whitespace-nowrap">
                    <img src={anime.posterUrl || placeholderPoster(anime.title)} alt={anime.title} className="w-10 h-[60px] sm:w-12 sm:h-[72px] object-cover rounded-sm shadow-sm" onError={(e) => (e.currentTarget.src = placeholderPoster(anime.title))}/>
                  </td>
                  <td className="px-3 py-2 sm:px-4 sm:py-2.5 whitespace-nowrap text-xs sm:text-sm font-medium text-brand-text-primary">{anime.title}</td>
                  <td className="px-3 py-2 sm:px-4 sm:py-2.5 whitespace-nowrap text-xs sm:text-sm text-brand-text-primary/80">{anime.year || "N/A"}</td>
                  <td className="px-3 py-2 sm:px-4 sm:py-2.5 text-xs text-brand-text-primary/70 max-w-[150px] sm:max-w-xs truncate" title={anime.genres?.join(", ")}>{anime.genres?.slice(0,3).join(", ") || "N/A"}{anime.genres && anime.genres.length > 3 ? "..." : ""}</td>
                  <td className="px-3 py-2 sm:px-4 sm:py-2.5 whitespace-nowrap text-xs space-x-1 sm:space-x-1.5">
                    <StyledButton onClick={() => handleOpenEditModal(anime)} variant="secondary_small" className="!text-[10px] !py-1 !px-1.5">Edit</StyledButton>
                    <StyledButton onClick={() => handleDeleteAnime(anime._id, anime.title)} variant="primary_small" className="!text-[10px] !py-1 !px-1.5 !bg-brand-primary-action/80 hover:!bg-brand-primary-action !text-brand-surface">Delete</StyledButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {status === "CanLoadMore" && (
        <div className="mt-4 sm:mt-5 text-center">
          <StyledButton onClick={() => loadMore(10)} disabled={isLoadingList && status === "LoadingMore"} variant="secondary">
            {isLoadingList && status === "LoadingMore" ? "Loading..." : "Load More Anime"}
          </StyledButton>
        </div>
      )}
       {status === "Exhausted" && animeList && animeList.length > 0 && (
         <p className="mt-4 sm:mt-5 text-xs text-center text-brand-text-primary/60">All anime entries loaded.</p>
       )}
    </div>
  );
};

export default memo(AnimeManagementPageComponent);