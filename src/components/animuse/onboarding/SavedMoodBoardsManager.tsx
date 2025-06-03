// components/SavedMoodBoardsManager.tsx
import React, { useState } from 'react';
import StyledButton from '../shared/StyledButton';

interface SavedMoodboard {
  id: string;
  name: string;
  cues: string[];
  intensities: Record<string, number>;
  createdAt: number;
}

interface SavedMoodBoardsManagerProps {
  savedMoodboards: SavedMoodboard[];
  onLoad: (moodboard: SavedMoodboard) => void;
  onDelete: (moodboardId: string) => void;
  onSave: (name: string, description?: string) => boolean;
  currentSelection: string[];
  className?: string;
}

const SavedMoodBoardsManager: React.FC<SavedMoodBoardsManagerProps> = ({
  savedMoodboards,
  onLoad,
  onDelete,
  onSave,
  currentSelection,
  className = ''
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newMoodboardName, setNewMoodboardName] = useState('');
  const [expandedMoodboard, setExpandedMoodboard] = useState<string | null>(null);

  const handleSave = () => {
    if (!newMoodboardName.trim()) {
      return;
    }
    
    const success = onSave(newMoodboardName.trim());
    if (success) {
      setNewMoodboardName('');
      setIsCreateModalOpen(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (savedMoodboards.length === 0 && currentSelection.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Save Current Selection Button */}
      {currentSelection.length > 0 && (
        <div className="text-center">
          <StyledButton 
            onClick={() => setIsCreateModalOpen(true)}
            variant="ghost"
            className="!bg-white/10 !backdrop-blur-sm !border-white/20 hover:!bg-white/20 !text-white"
          >
            💾 Save Current Mood Board
          </StyledButton>
        </div>
      )}

      {/* Saved Mood Boards List */}
      {savedMoodboards.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-heading text-white text-center">Saved Mood Boards</h3>
          <div className="grid gap-2">
            {savedMoodboards.map(moodboard => (
              <div
                key={moodboard.id}
                className="bg-black/30 backdrop-blur-sm border border-white/20 rounded-xl p-3 hover:bg-white/10 transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-white truncate">
                      {moodboard.name}
                    </h4>
                    <p className="text-xs text-white/60">
                      {moodboard.cues.length} vibes • {formatDate(moodboard.createdAt)}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-3">
                    <button
                      onClick={() => setExpandedMoodboard(
                        expandedMoodboard === moodboard.id ? null : moodboard.id
                      )}
                      className="text-xs text-white/60 hover:text-white transition-colors"
                      aria-label="Toggle details"
                    >
                      {expandedMoodboard === moodboard.id ? '▲' : '▼'}
                    </button>
                    
                    <StyledButton
                      onClick={() => onLoad(moodboard)}
                      variant="secondary_small"
                      className="!text-xs !px-2 !py-1"
                    >
                      Load
                    </StyledButton>
                    
                    <button
                      onClick={() => onDelete(moodboard.id)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors px-1"
                      aria-label="Delete mood board"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedMoodboard === moodboard.id && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs text-white/60">Mood Cues:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {moodboard.cues.map((cue, index) => (
                            <span
                              key={index}
                              className="text-xs bg-brand-primary-action/20 text-brand-accent-gold rounded-full px-2 py-0.5"
                            >
                              {cue}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {Object.keys(moodboard.intensities).length > 0 && (
                        <div>
                          <span className="text-xs text-white/60">Intensities:</span>
                          <div className="text-xs text-white/50 mt-1">
                            {Object.entries(moodboard.intensities).map(([cueId, intensity]) => (
                              <span key={cueId} className="mr-2">
                                {"★".repeat(intensity as number)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Mood Board Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-brand-surface text-white p-6 rounded-xl shadow-2xl w-full max-w-md">
            <h3 className="text-xl font-heading text-brand-primary-action mb-4">Save Mood Board</h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="moodboardName" className="block text-sm font-medium text-white mb-2">
                  Name your mood board
                </label>
                <input
                  type="text"
                  id="moodboardName"
                  value={newMoodboardName}
                  onChange={(e) => setNewMoodboardName(e.target.value)}
                  className="form-input w-full"
                  placeholder="e.g., Cozy Sunday Vibes"
                  maxLength={50}
                  autoFocus
                />
              </div>

              <div>
                <span className="text-sm text-white/70">Current Selection:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {currentSelection.slice(0, 5).map((cue, index) => (
                    <span
                      key={index}
                      className="text-xs bg-brand-primary-action/20 text-brand-accent-gold rounded-full px-2 py-0.5"
                    >
                      {cue}
                    </span>
                  ))}
                  {currentSelection.length > 5 && (
                    <span className="text-xs text-white/50">
                      +{currentSelection.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <StyledButton
                onClick={() => setIsCreateModalOpen(false)}
                variant="secondary_small"
              >
                Cancel
              </StyledButton>
              <StyledButton
                onClick={handleSave}
                variant="primary_small"
                disabled={!newMoodboardName.trim()}
              >
                Save Mood Board
              </StyledButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedMoodBoardsManager;