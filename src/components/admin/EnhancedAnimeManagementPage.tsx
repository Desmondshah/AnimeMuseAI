// Enhanced EnhancedAnimeManagementPage.tsx with dramatic visual upgrades
import React, { useState, useCallback, memo } from "react";
import { usePaginatedQuery, useMutation, useAction, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import StyledButton from "../animuse/shared/StyledButton";
import { toast } from "sonner";
import EditAnimeForm from "./EditAnimeForm";
import CharacterEditor from "./CharacterEditor";
import CreateAnimeForm from "./CreateAnimeForm";
import { useMobileOptimizations } from "../../../convex/useMobileOptimizations";

// Futuristic Loading Component
const FuturisticLoadingSpinner: React.FC<{ message?: string }> = memo(({ message }) => {
  const { shouldReduceAnimations } = useMobileOptimizations();
  
  return (
    <div className="flex flex-col justify-center items-center h-64 py-10">
      {/* Multi-layer loading rings */}
      <div className="relative w-16 h-16 mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-purple-500/20"></div>
        <div className={`absolute inset-1 rounded-full border-4 border-blue-500/40 ${shouldReduceAnimations ? '' : 'animate-spin'}`} style={{ animationDuration: '3s' }}></div>
        <div className={`absolute inset-2 rounded-full border-4 border-brand-primary-action ${shouldReduceAnimations ? '' : 'animate-spin'}`} style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}></div>
        <div className="absolute inset-4 w-8 h-8 bg-gradient-to-br from-brand-primary-action to-purple-500 rounded-full"></div>
      </div>
      
      <div className="text-center">
        <h3 className="text-xl font-heading bg-gradient-to-r from-brand-primary-action via-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
          {message || "Loading Anime Database..."}
        </h3>
        
        {/* Animated progress dots */}
        <div className="flex justify-center gap-1 mt-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`w-2 h-2 bg-brand-primary-action rounded-full ${shouldReduceAnimations ? 'opacity-50' : 'animate-pulse'}`}
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

// Enhanced Stats Card Component
const StatsCard: React.FC<{ 
  title: string; 
  value: string | number; 
  change?: string; 
  icon: string;
  gradient: string;
}> = memo(({ title, value, change, icon, gradient }) => {
  const { shouldReduceAnimations } = useMobileOptimizations();
  
  return (
    <div className={`relative group overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-1
      ${shouldReduceAnimations ? 'hover:scale-105' : 'hover:scale-110'} transition-all duration-300`}>
      <div className="bg-black/40 backdrop-blur-xl rounded-xl p-4 h-full border border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="text-2xl">{icon}</div>
          {change && (
            <div className="text-xs text-green-400 bg-green-400/20 px-2 py-1 rounded-full">
              {change}
            </div>
          )}
        </div>
        <div className="text-2xl font-bold text-white mb-1">{value}</div>
        <div className="text-sm text-white/70">{title}</div>
      </div>
    </div>
  );
});

// Enhanced Anime Card Component
const AnimeCard: React.FC<{
  anime: Doc<"anime">;
  onEdit: () => void;
  onDelete: () => void;
  onEditCharacter: (index: number) => void;
}> = memo(({ anime, onEdit, onDelete, onEditCharacter }) => {
  const { shouldReduceAnimations, isMobile } = useMobileOptimizations();
  const placeholderPoster = `https://placehold.co/200x300/1a1a1a/FF6B35/png?text=${encodeURIComponent(anime.title.substring(0,3))}&font=roboto`;

  return (
    <div className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900/50 via-blue-900/50 to-indigo-900/50 p-1
      ${shouldReduceAnimations ? 'hover:scale-105' : 'hover:scale-110 hover:rotate-1'} transition-all duration-500 shadow-lg hover:shadow-2xl`}>
      
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
      
      {/* Inner card */}
      <div className="relative bg-black/60 backdrop-blur-xl rounded-xl overflow-hidden border border-white/10">
        {/* Poster Section */}
        <div className="relative h-48 overflow-hidden">
          <img 
            src={anime.posterUrl || placeholderPoster} 
            alt={anime.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={(e) => (e.currentTarget.src = placeholderPoster)}
          />
          
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
          
          {/* Year badge */}
          {anime.year && (
            <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full border border-white/20">
              {anime.year}
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-4">
          <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-brand-accent-gold transition-colors">
            {anime.title}
          </h3>
          
          {/* Genres */}
          <div className="flex flex-wrap gap-1 mb-3">
            {anime.genres?.slice(0, 3).map((genre, index) => (
              <span key={index} className="text-xs bg-white/10 text-white/80 px-2 py-1 rounded-full border border-white/20">
                {genre}
              </span>
            ))}
            {anime.genres && anime.genres.length > 3 && (
              <span className="text-xs text-white/60">+{anime.genres.length - 3}</span>
            )}
          </div>

          {/* Characters Preview */}
          <div className="mb-4">
            <div className="text-xs text-white/70 mb-2">{anime.characters?.length || 0} characters</div>
            {anime.characters && anime.characters.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {anime.characters.slice(0, 2).map((char: any, index: number) => (
                  <button
                    key={index}
                    onClick={() => onEditCharacter(index)}
                    className="text-xs bg-gradient-to-r from-brand-primary-action/20 to-brand-accent-gold/20 text-white px-2 py-1 rounded-full border border-brand-primary-action/30 hover:border-brand-primary-action transition-colors"
                  >
                    {char.name}
                  </button>
                ))}
                {anime.characters.length > 2 && (
                  <span className="text-xs text-white/50 px-2 py-1">
                    +{anime.characters.length - 2} more
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs py-2 px-3 rounded-lg hover:from-blue-500 hover:to-purple-500 transition-all duration-200 border border-white/20"
            >
              ✏️ Edit
            </button>
            <button
              onClick={onDelete}
              className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 text-white text-xs py-2 px-3 rounded-lg hover:from-red-500 hover:to-pink-500 transition-all duration-200 border border-white/20"
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

const EnhancedAnimeManagementPageComponent: React.FC = () => {
  const { isMobile, shouldReduceAnimations } = useMobileOptimizations();
  
  const {
    results: animeList,
    status,
    loadMore,
    isLoading: isLoadingList,
  } = usePaginatedQuery(
    api.admin.getAllAnimeForAdmin, {}, { initialNumItems: 12 }
  );

  const deleteAnimeMutation = useMutation(api.admin.adminDeleteAnime);
  const editAnimeMutation = useMutation(api.admin.adminEditAnime);
  const updateCharactersMutation = useMutation(api.admin.adminUpdateAnimeCharacters);
  const enrichCharacterMutation = useMutation(api.admin.adminEnrichCharacter);
  const importTrendingAnimeAction = useAction(api.externalApis.callImportTrendingAnime);

  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingAnime, setEditingAnime] = useState<Doc<"anime"> | null>(null);
  const [editingCharacterIndex, setEditingCharacterIndex] = useState<number>(-1);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [isSavingCharacter, setIsSavingCharacter] = useState<boolean>(false);
  const [isEnrichingCharacter, setIsEnrichingCharacter] = useState<boolean>(false);
  const [isImportingTrending, setIsImportingTrending] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');

  const fullAnimeDetails = useQuery(
    api.admin.getAnimeForAdmin,
    editingAnime ? { animeId: editingAnime._id } : "skip"
  );

  // Event handlers (keeping your existing logic)
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

  const handleOpenCharacterModal = useCallback((anime: Doc<"anime">, characterIndex: number) => {
    setEditingAnime(anime);
    setEditingCharacterIndex(characterIndex);
    setIsCharacterModalOpen(true);
  }, []);

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

  const handleSaveAnime = useCallback(async (animeId: Id<"anime">, updates: any) => {
    setIsSavingEdit(true);
    const toastId = `save-anime-${animeId}`;
    toast.loading("Saving anime changes...", { id: toastId });
    try {
      await editAnimeMutation({ animeId, updates });
      toast.success("Anime updated successfully!", { id: toastId });
      setIsEditModalOpen(false);
      setEditingAnime(null);
    } catch (error: any) {
      toast.error(error.data?.message || "Failed to update anime.", { id: toastId });
    } finally {
      setIsSavingEdit(false);
    }
  }, [editAnimeMutation]);

  const handleSaveCharacter = useCallback(async (character: any) => {
    if (!editingAnime) return;
    
    setIsSavingCharacter(true);
    const toastId = `save-character-${editingCharacterIndex}`;
    toast.loading("Saving character changes...", { id: toastId });
    try {
      await updateCharactersMutation({ 
        animeId: editingAnime._id, 
        characterIndex: editingCharacterIndex, 
        updates: character 
      });
      toast.success("Character updated successfully!", { id: toastId });
      setIsCharacterModalOpen(false);
      setEditingAnime(null);
      setEditingCharacterIndex(-1);
    } catch (error: any) {
      toast.error(error.data?.message || "Failed to update character.", { id: toastId });
    } finally {
      setIsSavingCharacter(false);
    }
  }, [updateCharactersMutation, editingAnime, editingCharacterIndex]);

  const handleEnrichCharacter = useCallback(async (characterIndex: number) => {
    if (!editingAnime) return;
    
    setIsEnrichingCharacter(true);
    const toastId = `enrich-character-${characterIndex}`;
    toast.loading("Enriching character with AI...", { id: toastId });
    try {
      await enrichCharacterMutation({ 
        animeId: editingAnime._id, 
        characterIndex: characterIndex 
      });
      toast.success("Character enriched successfully!", { id: toastId });
    } catch (error: any) {
      toast.error(error.data?.message || "Failed to enrich character.", { id: toastId });
    } finally {
      setIsEnrichingCharacter(false);
    }
  }, [enrichCharacterMutation, editingAnime]);

  // Filter anime based on search
  const filteredAnime = animeList?.filter(anime => 
    anime.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    anime.genres?.some((genre: string) => genre.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  if (isLoadingList && status === "LoadingFirstPage" && (!animeList || animeList.length === 0)) {
    return <FuturisticLoadingSpinner message="Loading anime database..." />;
  }
  
  if (animeList === null) {
    return (
      <div className="text-center p-8">
        <div className="text-6xl mb-4">🚫</div>
        <h3 className="text-xl text-red-400 mb-2">Access Denied</h3>
        <p className="text-white/70">Could not load anime. Ensure you are an administrator.</p>
      </div>
    );
  }

  const currentCharacter = fullAnimeDetails?.characters?.[editingCharacterIndex];

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900/50 via-blue-900/50 to-indigo-900/50 p-6 border border-white/10">
        <div className="relative z-10">
          <h2 className="text-3xl font-heading bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent mb-4">
            🎬 Anime Database Management
          </h2>
          <p className="text-white/70 mb-6">Manage your anime collection with advanced tools and AI-powered features.</p>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl hover:from-green-500 hover:to-emerald-500 transition-all duration-200 border border-white/20 shadow-lg"
            >
              ➕ Create New Anime
            </button>
            <button
              onClick={handleImportTrending}
              disabled={isImportingTrending}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-200 border border-white/20 shadow-lg disabled:opacity-50"
            >
              {isImportingTrending ? '⏳ Importing...' : '📥 Import Trending'}
            </button>
          </div>
        </div>
        
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Anime"
          value={animeList?.length || 0}
          change="+12%"
          icon="🎭"
          gradient="from-purple-600 to-pink-600"
        />
        <StatsCard
          title="Characters"
          value={animeList?.reduce((acc, anime) => acc + (anime.characters?.length || 0), 0) || 0}
          change="+8%"
          icon="👥"
          gradient="from-blue-600 to-cyan-600"
        />
        <StatsCard
          title="Genres"
          value={new Set(animeList?.flatMap(anime => anime.genres || [])).size || 0}
          icon="🏷️"
          gradient="from-green-600 to-teal-600"
        />
        <StatsCard
          title="Avg Rating"
          value="8.7"
          change="+0.3"
          icon="⭐"
          gradient="from-yellow-600 to-orange-600"
        />
      </div>

      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-white/40">🔍</span>
          </div>
          <input
            type="text"
            placeholder="Search anime..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/20 backdrop-blur-sm border border-white/20 rounded-xl py-3 pl-10 pr-4 text-white placeholder-white/50 focus:border-brand-primary-action focus:outline-none transition-colors"
          />
        </div>

        {/* View Mode Toggle */}
        <div className="flex bg-black/20 backdrop-blur-sm border border-white/20 rounded-xl p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-4 py-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-brand-primary-action text-white' : 'text-white/70 hover:text-white'}`}
          >
            ⊞ Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-brand-primary-action text-white' : 'text-white/70 hover:text-white'}`}
          >
            ☰ List
          </button>
        </div>
      </div>

      {/* Anime Grid/List */}
      {filteredAnime.length === 0 && !isLoadingList ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl text-white/70 mb-2">No anime found</h3>
          <p className="text-white/50">Create your first anime or adjust your search criteria.</p>
        </div>
      ) : (
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
          : "space-y-4"
        }>
          {filteredAnime?.map((anime) => (
            <AnimeCard
              key={anime._id}
              anime={anime}
              onEdit={() => handleOpenEditModal(anime)}
              onDelete={() => handleDeleteAnime(anime._id, anime.title)}
              onEditCharacter={(index) => handleOpenCharacterModal(anime, index)}
            />
          ))}
        </div>
      )}
      
      {/* Load More Button */}
      {status === "CanLoadMore" && (
        <div className="text-center pt-8">
          <button
            onClick={() => loadMore(12)}
            disabled={isLoadingList && status === "LoadingMore"}
            className="bg-gradient-to-r from-brand-primary-action to-brand-accent-gold text-white px-8 py-3 rounded-xl hover:shadow-lg transition-all duration-200 border border-white/20 disabled:opacity-50"
          >
            {isLoadingList && status === "LoadingMore" ? "Loading..." : "Load More Anime"}
          </button>
        </div>
      )}
      
      {status === "Exhausted" && animeList && animeList.length > 0 && (
        <p className="text-center text-white/60 py-4">All anime entries loaded.</p>
      )}

      {/* Modals - Enhanced with new styling */}
      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center z-[101] p-4">
          <div className="bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-white/20">
              <h3 className="text-xl font-heading bg-gradient-to-r from-white to-brand-accent-gold bg-clip-text text-transparent">
                Create New Anime
              </h3>
              <button 
                onClick={() => setIsCreateModalOpen(false)} 
                className="text-2xl text-white/70 hover:text-white p-2 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <CreateAnimeForm 
                onSuccess={() => setIsCreateModalOpen(false)} 
                onCancel={() => setIsCreateModalOpen(false)} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingAnime && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center z-[101] p-4">
          <div className="bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-white/20">
              <h3 className="text-xl font-heading bg-gradient-to-r from-white to-brand-accent-gold bg-clip-text text-transparent">
                Edit: {editingAnime.title}
              </h3>
              <button 
                onClick={() => setIsEditModalOpen(false)} 
                className="text-2xl text-white/70 hover:text-white p-2 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <EditAnimeForm
                anime={editingAnime}
                onSave={handleSaveAnime}
                onCancel={() => setIsEditModalOpen(false)}
                isSaving={isSavingEdit}
              />
            </div>
          </div>
        </div>
      )}

      {/* Character Modal */}
      {isCharacterModalOpen && editingAnime && currentCharacter && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center z-[101] p-4">
          <div className="bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-white/20">
              <h3 className="text-xl font-heading bg-gradient-to-r from-white to-brand-accent-gold bg-clip-text text-transparent">
                Edit Character: {currentCharacter.name}
              </h3>
              <button 
                onClick={() => setIsCharacterModalOpen(false)} 
                className="text-2xl text-white/70 hover:text-white p-2 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <CharacterEditor
                character={currentCharacter}
                characterIndex={editingCharacterIndex}
                animeId={editingAnime._id}
                onSave={handleSaveCharacter}
                onCancel={() => setIsCharacterModalOpen(false)}
                onEnrich={handleEnrichCharacter}
                isSaving={isSavingCharacter}
                isEnriching={isEnrichingCharacter}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(EnhancedAnimeManagementPageComponent);