// BRUTALIST ANIME MANAGEMENT - EnhancedAnimeManagementPage.tsx
import React, { useState, useEffect, useMemo, memo } from "react";
import { usePaginatedQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useMobileOptimizations } from "../../hooks/useMobileOptimizations";
import StyledButton from "../animuse/shared/StyledButton";
import { toast } from "sonner";
import EditAnimeForm from "./EditAnimeForm";
import CharacterEditor from "./CharacterEditor";
import ChangeHistoryPanel from "./ChangeHistoryPanel";
import BatchImportAnime from "./BatchImportAnime";
import CreateAnimeForm from "./CreateAnimeForm";

// BRUTALIST loading component
const BrutalistLoading: React.FC = memo(() => {
  const { shouldReduceAnimations } = useMobileOptimizations();
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-black border-4 border-white">
      <div className="relative w-24 h-24 mb-8 border-4 border-white">
        <div className={`absolute inset-0 border-4 border-white ${shouldReduceAnimations ? '' : 'animate-spin'}`} style={{ animationDuration: '1s' }}></div>
        <div className="absolute inset-4 w-16 h-16 bg-white"></div>
      </div>
      
      <h3 className="text-4xl font-black text-white mb-6 uppercase tracking-wider">
        LOADING ANIME DATABASE
      </h3>
      
      <div className="flex gap-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 bg-white ${shouldReduceAnimations ? 'opacity-100' : 'animate-pulse'}`}
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
});

// BRUTALIST character card component with inline editing
const BrutalistCharacterCard: React.FC<{
  character: any;
  index: number;
  isEditing: boolean;
  onEdit: (character: any, index: number) => void;
  onSave: (character: any, index: number) => void;
  onCancel: () => void;
  onEnrich: (index: number) => void;
  onDelete: (index: number) => void;
  isEnriching: boolean;
}> = memo(({ character, index, isEditing, onEdit, onSave, onCancel, onEnrich, onDelete, isEnriching }) => {
  const [editData, setEditData] = useState(character);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [showEnrichedData, setShowEnrichedData] = useState(false);
  const [descriptionSize, setDescriptionSize] = useState({ width: '100%', height: '80px' });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string>('');

  const handleSave = () => {
    onSave(editData, index);
  };

  const handleCancel = () => {
    setEditData(character);
    onCancel();
  };

  const handleResizeDescription = (e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setResizeDirection(direction);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = parseInt(descriptionSize.width);
    const startHeight = parseInt(descriptionSize.height);
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      
      if (direction.includes('right')) {
        newWidth = Math.max(200, startWidth + deltaX);
      }
      if (direction.includes('left')) {
        newWidth = Math.max(200, startWidth - deltaX);
      }
      if (direction.includes('bottom')) {
        newHeight = Math.max(60, startHeight + deltaY);
      }
      if (direction.includes('top')) {
        newHeight = Math.max(60, startHeight - deltaY);
      }
      
      setDescriptionSize({
        width: `${newWidth}px`,
        height: `${newHeight}px`
      });
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeDirection('');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (isEditing) {
    return (
      <div className="bg-black border-4 border-white p-6 shadow-lg relative overflow-hidden">
        {/* Resize indicator overlay */}
        {isResizing && (
          <div className="absolute inset-0 bg-white/10 border-4 border-white pointer-events-none z-10 flex items-center justify-center">
            <div className="bg-black text-white px-4 py-2 font-black uppercase tracking-wide">
              RESIZING: {descriptionSize.width} × {descriptionSize.height}
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-white font-black uppercase tracking-wide mb-2">NAME</label>
            <input
              type="text"
              value={editData.name || ''}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              className="w-full bg-white text-black border-4 border-black px-4 py-3 font-black uppercase tracking-wide focus:outline-none focus:border-gray-500 transition-colors"
            />
          </div>
          
          <div>
            <label className="block text-white font-black uppercase tracking-wide mb-2">ROLE</label>
            <input
              type="text"
              value={editData.role || ''}
              onChange={(e) => setEditData({ ...editData, role: e.target.value })}
              className="w-full bg-white text-black border-4 border-black px-4 py-3 font-black uppercase tracking-wide focus:outline-none focus:border-gray-500 transition-colors"
            />
          </div>
        </div>
        
        {/* Expandable Advanced Fields */}
        <div className="mb-6">
          <button
            onClick={() => setShowAdvancedFields(!showAdvancedFields)}
            className="flex items-center gap-3 text-white font-black uppercase tracking-wide hover:bg-white hover:text-black transition-colors p-3 border-4 border-white"
          >
            <span className={`transition-transform duration-200 ${showAdvancedFields ? 'rotate-90' : ''}`}>
              ▶
            </span>
            ADVANCED FIELDS
            <span className="text-sm">
              {showAdvancedFields ? 'HIDE' : 'SHOW'} ADDITIONAL DETAILS
            </span>
          </button>
          
          {showAdvancedFields && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white font-black uppercase tracking-wide mb-2">GENDER</label>
                  <input
                    type="text"
                    value={editData.gender || ''}
                    onChange={(e) => setEditData({ ...editData, gender: e.target.value })}
                    className="w-full bg-white text-black border-4 border-black px-4 py-3 font-black uppercase tracking-wide focus:outline-none focus:border-gray-500 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-white font-black uppercase tracking-wide mb-2">STATUS</label>
                  <input
                    type="text"
                    value={editData.status || ''}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                    className="w-full bg-white text-black border-4 border-black px-4 py-3 font-black uppercase tracking-wide focus:outline-none focus:border-gray-500 transition-colors"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-white font-black uppercase tracking-wide mb-2">IMAGE URL</label>
                <input
                  type="url"
                  value={editData.imageUrl || ''}
                  onChange={(e) => setEditData({ ...editData, imageUrl: e.target.value })}
                  className="w-full bg-white text-black border-4 border-black px-4 py-3 font-black uppercase tracking-wide focus:outline-none focus:border-gray-500 transition-colors"
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-white font-black uppercase tracking-wide">DESCRIPTION</label>
                  <div className="flex items-center gap-2 text-sm text-white font-bold">
                    <span>DRAG HANDLES TO RESIZE</span>
                  </div>
                </div>
                
                <div className="relative">
                  <textarea
                    value={editData.description || ''}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    style={descriptionSize}
                    className="w-full bg-white text-black border-4 border-black px-4 py-3 font-black uppercase tracking-wide focus:outline-none focus:border-gray-500 transition-colors resize-none"
                  />
                  
                  {/* Resize handles */}
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-white cursor-se-resize"
                       onMouseDown={(e) => handleResizeDescription(e, 'bottom-right')}></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 bg-white cursor-sw-resize"
                       onMouseDown={(e) => handleResizeDescription(e, 'bottom-left')}></div>
                  <div className="absolute top-0 right-0 w-4 h-4 bg-white cursor-ne-resize"
                       onMouseDown={(e) => handleResizeDescription(e, 'top-right')}></div>
                  <div className="absolute top-0 left-0 w-4 h-4 bg-white cursor-nw-resize"
                       onMouseDown={(e) => handleResizeDescription(e, 'top-left')}></div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            className="flex-1 bg-green-500 text-white hover:bg-green-600 border-4 border-green-500 px-4 py-3 font-black uppercase tracking-wide transition-colors"
          >
            SAVE
          </button>
          <button
            onClick={handleCancel}
            className="flex-1 bg-white text-black hover:bg-gray-100 border-4 border-black px-4 py-3 font-black uppercase tracking-wide transition-colors"
          >
            CANCEL
          </button>
          <button
            onClick={() => onEnrich(index)}
            disabled={isEnriching}
            className="bg-blue-500 text-white hover:bg-blue-600 border-4 border-blue-500 px-4 py-3 font-black uppercase tracking-wide transition-colors disabled:opacity-50"
          >
            {isEnriching ? 'ENRICHING...' : 'ENRICH'}
          </button>
          <button
            onClick={() => onDelete(index)}
            className="bg-red-500 text-white hover:bg-red-600 border-4 border-red-500 px-4 py-3 font-black uppercase tracking-wide transition-colors"
          >
            DELETE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black border-4 border-white p-6 hover:bg-white hover:text-black transition-all duration-200">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 bg-white text-black flex items-center justify-center border-4 border-black font-black text-2xl">
            {character.name?.charAt(0)?.toUpperCase() || 'C'}
          </div>
        
        <div className="flex-1">
          <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-wider">
            {character.name || 'UNNAMED CHARACTER'}
          </h3>
          <p className="text-lg text-white font-bold uppercase tracking-wide">
            {character.role || 'NO ROLE'}
          </p>
          
          {/* Enrichment Status */}
          {character.enrichmentStatus && (
            <div className="mt-2">
              {character.enrichmentStatus === 'success' && (
                <span className="bg-green-500 text-white px-2 py-1 border-2 border-green-500 font-black text-xs uppercase tracking-wide">
                  ✅ AI ENRICHED
                </span>
              )}
              {character.enrichmentStatus === 'pending' && (
                <span className="bg-yellow-500 text-black px-2 py-1 border-2 border-yellow-500 font-black text-xs uppercase tracking-wide">
                  ⏳ ENRICHING...
                </span>
              )}
              {character.enrichmentStatus === 'failed' && (
                <span className="bg-red-500 text-white px-2 py-1 border-2 border-red-500 font-black text-xs uppercase tracking-wide">
                  ❌ ENRICHMENT FAILED
                </span>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 bg-green-500"></div>
          <span className="text-lg font-black text-white uppercase tracking-wide">
            ACTIVE
            </span>
        </div>
      </div>
      
      {character.description && (
        <div className="mb-4">
          <div className="text-white font-bold uppercase tracking-wide mb-2">DESCRIPTION</div>
          <div className="text-white font-black">
            {character.description}
          </div>
        </div>
      )}

      {/* AI Enriched Data Section */}
      {character.enrichmentStatus === 'success' && (
        <div className="mb-4">
          <button
            onClick={() => setShowEnrichedData(!showEnrichedData)}
            className="w-full bg-blue-500 text-white border-4 border-blue-500 px-4 py-3 font-black uppercase tracking-wide hover:bg-blue-600 transition-colors mb-4"
          >
            <span className={`transition-transform duration-200 ${showEnrichedData ? 'rotate-90' : ''}`}>
              ▶
            </span>
            {showEnrichedData ? 'HIDE' : 'SHOW'} AI ENRICHED DATA
          </button>
          
          {showEnrichedData && (
            <div className="space-y-4 bg-white text-black p-4 border-4 border-black">
              {/* Personality Analysis */}
              {character.personalityAnalysis && (
                <div>
                  <h4 className="font-black uppercase tracking-wide mb-2 text-lg">🧠 PERSONALITY ANALYSIS</h4>
                  <p className="font-medium leading-relaxed">{character.personalityAnalysis}</p>
                </div>
              )}

              {/* Key Relationships */}
              {character.keyRelationships && character.keyRelationships.length > 0 && (
                <div>
                  <h4 className="font-black uppercase tracking-wide mb-2 text-lg">👥 KEY RELATIONSHIPS</h4>
                  <div className="space-y-2">
                    {character.keyRelationships.map((rel: any, idx: number) => (
                      <div key={idx} className="bg-black text-white p-3 border-2 border-white">
                        <div className="font-black uppercase tracking-wide text-sm">{rel.relatedCharacterName}</div>
                        <div className="font-medium text-sm">{rel.relationshipDescription}</div>
                        <div className="text-xs opacity-80">{rel.relationType}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detailed Abilities */}
              {character.detailedAbilities && character.detailedAbilities.length > 0 && (
                <div>
                  <h4 className="font-black uppercase tracking-wide mb-2 text-lg">⚡ DETAILED ABILITIES</h4>
                  <div className="space-y-2">
                    {character.detailedAbilities.map((ability: any, idx: number) => (
                      <div key={idx} className="bg-black text-white p-3 border-2 border-white">
                        <div className="font-black uppercase tracking-wide text-sm">{ability.abilityName}</div>
                        <div className="font-medium text-sm">{ability.abilityDescription}</div>
                        {ability.powerLevel && (
                          <div className="text-xs opacity-80">Power Level: {ability.powerLevel}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trivia */}
              {character.trivia && character.trivia.length > 0 && (
                <div>
                  <h4 className="font-black uppercase tracking-wide mb-2 text-lg">🎯 TRIVIA</h4>
                  <div className="space-y-1">
                    {character.trivia.map((fact: string, idx: number) => (
                      <div key={idx} className="bg-black text-white p-2 border-2 border-white">
                        <span className="font-medium text-sm">• {fact}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Character Development */}
              {character.characterDevelopment && (
                <div>
                  <h4 className="font-black uppercase tracking-wide mb-2 text-lg">📈 CHARACTER DEVELOPMENT</h4>
                  <p className="font-medium leading-relaxed">{character.characterDevelopment}</p>
                </div>
              )}

              {/* Notable Quotes */}
              {character.notableQuotes && character.notableQuotes.length > 0 && (
                <div>
                  <h4 className="font-black uppercase tracking-wide mb-2 text-lg">💬 NOTABLE QUOTES</h4>
                  <div className="space-y-2">
                    {character.notableQuotes.map((quote: string, idx: number) => (
                      <div key={idx} className="bg-black text-white p-3 border-2 border-white italic">
                        "{quote}"
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cultural Significance */}
              {character.culturalSignificance && (
                <div>
                  <h4 className="font-black uppercase tracking-wide mb-2 text-lg">🌍 CULTURAL SIGNIFICANCE</h4>
                  <p className="font-medium leading-relaxed">{character.culturalSignificance}</p>
                </div>
              )}

              {/* Advanced Relationships Analysis */}
              {character.advancedRelationships && character.advancedRelationships.length > 0 && (
                <div>
                  <h4 className="font-black uppercase tracking-wide mb-2 text-lg">🔗 ADVANCED RELATIONSHIP ANALYSIS</h4>
                  <div className="space-y-3">
                    {character.advancedRelationships.map((rel: any, idx: number) => (
                      <div key={idx} className="bg-black text-white p-4 border-2 border-white">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-black uppercase tracking-wide text-sm">{rel.characterName}</div>
                          <div className="bg-blue-500 text-white px-2 py-1 text-xs font-black uppercase">
                            {rel.relationshipType}
                          </div>
                        </div>
                        <div className="font-medium text-sm mb-2">{rel.emotionalDynamics}</div>
                        {rel.keyMoments && rel.keyMoments.length > 0 && (
                          <div className="mb-2">
                            <div className="text-xs opacity-80 mb-1">KEY MOMENTS:</div>
                            <div className="space-y-1">
                              {rel.keyMoments.map((moment: string, momentIdx: number) => (
                                <div key={momentIdx} className="text-xs">• {moment}</div>
                              ))}
                            </div>
                          </div>
                        )}
                        {rel.relationshipEvolution && (
                          <div className="text-xs opacity-80">
                            <div className="mb-1">EVOLUTION:</div>
                            <div>{rel.relationshipEvolution}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Development Timeline */}
              {character.developmentTimeline && character.developmentTimeline.length > 0 && (
                <div>
                  <h4 className="font-black uppercase tracking-wide mb-2 text-lg">📈 CHARACTER DEVELOPMENT TIMELINE</h4>
                  <div className="space-y-3">
                    {character.developmentTimeline.map((phase: any, idx: number) => (
                      <div key={idx} className="bg-black text-white p-4 border-2 border-white">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-black uppercase tracking-wide text-sm">{phase.phase}</div>
                          <div className="bg-green-500 text-white px-2 py-1 text-xs font-black uppercase">
                            PHASE {idx + 1}
                          </div>
                        </div>
                        <div className="font-medium text-sm mb-2">{phase.description}</div>
                        <div className="text-xs opacity-80 mb-2">
                          <div className="mb-1">CHARACTER STATE:</div>
                          <div>{phase.characterState}</div>
                        </div>
                        {phase.keyEvents && phase.keyEvents.length > 0 && (
                          <div className="mb-2">
                            <div className="text-xs opacity-80 mb-1">KEY EVENTS:</div>
                            <div className="space-y-1">
                              {phase.keyEvents.map((event: string, eventIdx: number) => (
                                <div key={eventIdx} className="text-xs">• {event}</div>
                              ))}
                            </div>
                          </div>
                        )}
                        {phase.characterGrowth && (
                          <div className="text-xs opacity-80">
                            <div className="mb-1">GROWTH:</div>
                            <div>{phase.characterGrowth}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      <div className="flex gap-4">
        <button
          onClick={() => onEdit(character, index)}
          className="flex-1 bg-white text-black hover:bg-gray-100 border-4 border-black px-4 py-3 font-black uppercase tracking-wide transition-colors"
        >
          EDIT
        </button>
        <button
          onClick={() => onEnrich(index)}
          disabled={isEnriching}
          className="bg-blue-500 text-white hover:bg-blue-600 border-4 border-blue-500 px-4 py-3 font-black uppercase tracking-wide transition-colors disabled:opacity-50"
        >
          {isEnriching ? 'ENRICHING...' : 'ENRICH'}
        </button>
        <button
          onClick={() => onDelete(index)}
          className="bg-red-500 text-white hover:bg-red-600 border-4 border-red-500 px-4 py-3 font-black uppercase tracking-wide transition-colors"
        >
          DELETE
        </button>
      </div>
    </div>
  );
});

// Simplified character management modal component
const CharacterManagementModal: React.FC<{
  anime: any;
  onClose: () => void;
  onSave: (characters: any[]) => void;
  onEnrich: (index: number) => void;
  isEnriching: boolean;
}> = memo(({ anime, onClose, onSave, onEnrich, isEnriching }) => {
  const [characters, setCharacters] = useState<any[]>(anime.characters || []);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [descriptionSize, setDescriptionSize] = useState({ width: '100%', height: '120px' });
  const [isResizing, setIsResizing] = useState(false);
  const [newCharacter, setNewCharacter] = useState({
    name: '',
    role: '',
    imageUrl: '',
    gender: '',
    description: '',
    status: ''
  });

  const handleAddCharacter = () => {
    if (newCharacter.name.trim()) {
      setCharacters([...characters, { ...newCharacter, enrichmentStatus: 'pending' }]);
      setNewCharacter({
        name: '',
        role: '',
        imageUrl: '',
        gender: '',
        description: '',
        status: ''
      });
      setShowAddForm(false);
      setShowAdvancedFields(false);
      setDescriptionSize({ width: '100%', height: '120px' });
    }
  };

  const handleEditCharacter = (character: any, index: number) => {
    setEditingIndex(index);
  };

  const handleSaveCharacterEdit = (updatedCharacter: any, index: number) => {
    const updatedCharacters = [...characters];
    updatedCharacters[index] = updatedCharacter;
    setCharacters(updatedCharacters);
    setEditingIndex(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
  };

  const handleDeleteCharacter = (index: number) => {
    const updatedCharacters = characters.filter((_, i) => i !== index);
    setCharacters(updatedCharacters);
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const handleSaveAll = () => {
    onSave(characters);
  };

  const handleResizeDescription = (e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = parseInt(descriptionSize.width);
    const startHeight = parseInt(descriptionSize.height);
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      
      if (direction.includes('right')) {
        newWidth = Math.max(300, startWidth + deltaX);
      }
      if (direction.includes('left')) {
        newWidth = Math.max(300, startWidth - deltaX);
      }
      if (direction.includes('bottom')) {
        newHeight = Math.max(80, startHeight + deltaY);
      }
      if (direction.includes('top')) {
        newHeight = Math.max(80, startHeight - deltaY);
      }
      
      setDescriptionSize({
        width: `${newWidth}px`,
        height: `${newHeight}px`
      });
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-black/90 to-black/80 backdrop-blur-xl rounded-3xl border border-white/10 p-8 w-full max-w-7xl max-h-[95vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-2xl font-heading text-white mb-2">
              Character Management
            </h3>
            <p className="text-white/60 text-sm">
              {anime.title} • {characters.length} characters
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-3 rounded-xl hover:bg-white/10 transition-all"
          >
            <div className="w-6 h-6 flex items-center justify-center">✕</div>
          </button>
        </div>

        {/* Add Character Button */}
        <div className="mb-8">
          <StyledButton
            onClick={() => setShowAddForm(true)}
            variant="primary"
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-medium shadow-lg"
          >
            <span className="mr-2">✨</span>
            Add New Character
          </StyledButton>
        </div>

        {/* Add Character Form */}
        {showAddForm && (
          <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-8 shadow-lg relative overflow-hidden">
            {/* Resize indicator overlay */}
            {isResizing && (
              <div className="absolute inset-0 bg-purple-500/10 border-2 border-purple-400/50 rounded-2xl pointer-events-none z-10 flex items-center justify-center">
                <div className="bg-black/80 text-white px-4 py-2 rounded-lg text-sm font-medium">
                  Resizing: {descriptionSize.width} × {descriptionSize.height}
                </div>
              </div>
            )}
            
            <h4 className="text-lg font-heading text-white mb-6 flex items-center">
              <span className="mr-2">🎭</span>
              Add New Character
            </h4>
            
            {/* Basic Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-white/80 text-sm mb-2 font-medium">Name *</label>
                <input
                  type="text"
                  value={newCharacter.name}
                  onChange={(e) => setNewCharacter({ ...newCharacter, name: e.target.value })}
                  className="w-full bg-black/40 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/30 transition-all"
                  placeholder="Character name"
                />
              </div>
              
              <div>
                <label className="block text-white/80 text-sm mb-2 font-medium">Role</label>
                <input
                  type="text"
                  value={newCharacter.role}
                  onChange={(e) => setNewCharacter({ ...newCharacter, role: e.target.value })}
                  className="w-full bg-black/40 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/30 transition-all"
                  placeholder="Main, Supporting, etc."
                />
              </div>
            </div>

            {/* Expandable Advanced Fields */}
            <div className="mb-6">
              <button
                onClick={() => setShowAdvancedFields(!showAdvancedFields)}
                className="flex items-center gap-3 text-white/80 text-sm font-medium hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
              >
                <span className={`transition-transform duration-200 ${showAdvancedFields ? 'rotate-90' : ''}`}>
                  ▶
                </span>
                Advanced Fields
                <span className="text-xs text-white/50">
                  {showAdvancedFields ? 'Hide' : 'Show'} additional details
                </span>
              </button>
              
              {showAdvancedFields && (
                <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white/80 text-sm mb-2 font-medium">Image URL</label>
                      <input
                        type="url"
                        value={newCharacter.imageUrl}
                        onChange={(e) => setNewCharacter({ ...newCharacter, imageUrl: e.target.value })}
                        className="w-full bg-black/40 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/30 transition-all"
                        placeholder="Character image URL"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-white/80 text-sm mb-2 font-medium">Gender</label>
                      <input
                        type="text"
                        value={newCharacter.gender}
                        onChange={(e) => setNewCharacter({ ...newCharacter, gender: e.target.value })}
                        className="w-full bg-black/40 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/30 transition-all"
                        placeholder="Male, Female, etc."
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm mb-2 font-medium">Status</label>
                    <input
                      type="text"
                      value={newCharacter.status}
                      onChange={(e) => setNewCharacter({ ...newCharacter, status: e.target.value })}
                      className="w-full bg-black/40 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/30 transition-all"
                      placeholder="Alive, Deceased, etc."
                    />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-white/80 text-sm font-medium">Description</label>
                      <div className="flex items-center gap-2 text-xs text-white/50">
                        <span>Drag handles to resize</span>
                        <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                      </div>
                    </div>
                    <div 
                      className="relative border-2 border-dashed border-purple-400/30 rounded-xl transition-all duration-200 hover:border-purple-400/50"
                      style={{ width: descriptionSize.width, height: descriptionSize.height }}
                    >
                      <textarea
                        value={newCharacter.description}
                        onChange={(e) => setNewCharacter({ ...newCharacter, description: e.target.value })}
                        className="w-full h-full bg-black/40 backdrop-blur-sm border-0 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-purple-400/30 transition-all resize-none"
                        placeholder="Character description..."
                        style={{ width: '100%', height: '100%' }}
                      />
                      
                      {/* Corner resize handles */}
                      <div
                        className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize bg-gradient-to-br from-purple-500 to-purple-600 rounded-tl-xl border border-purple-300/50 hover:from-purple-400 hover:to-purple-500 transition-all shadow-lg"
                        onMouseDown={(e) => handleResizeDescription(e, 'top-left')}
                        title="Drag to resize from top-left"
                      />
                      <div
                        className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize bg-gradient-to-br from-purple-500 to-purple-600 rounded-tr-xl border border-purple-300/50 hover:from-purple-400 hover:to-purple-500 transition-all shadow-lg"
                        onMouseDown={(e) => handleResizeDescription(e, 'top-right')}
                        title="Drag to resize from top-right"
                      />
                      <div
                        className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize bg-gradient-to-br from-purple-500 to-purple-600 rounded-bl-xl border border-purple-300/50 hover:from-purple-400 hover:to-purple-500 transition-all shadow-lg"
                        onMouseDown={(e) => handleResizeDescription(e, 'bottom-left')}
                        title="Drag to resize from bottom-left"
                      />
                      <div
                        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-gradient-to-br from-purple-500 to-purple-600 rounded-br-xl border border-purple-300/50 hover:from-purple-400 hover:to-purple-500 transition-all shadow-lg"
                        onMouseDown={(e) => handleResizeDescription(e, 'bottom-right')}
                        title="Drag to resize from bottom-right"
                      />
                      
                      {/* Edge resize handles */}
                      <div
                        className="absolute top-0 left-1/2 transform -translate-x-1/2 w-4 h-4 cursor-n-resize bg-gradient-to-b from-blue-500 to-blue-600 rounded-t-xl border border-blue-300/50 hover:from-blue-400 hover:to-blue-500 transition-all shadow-lg"
                        onMouseDown={(e) => handleResizeDescription(e, 'top')}
                        title="Drag to resize height from top"
                      />
                      <div
                        className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-4 h-4 cursor-s-resize bg-gradient-to-t from-blue-500 to-blue-600 rounded-b-xl border border-blue-300/50 hover:from-blue-400 hover:to-blue-500 transition-all shadow-lg"
                        onMouseDown={(e) => handleResizeDescription(e, 'bottom')}
                        title="Drag to resize height from bottom"
                      />
                      <div
                        className="absolute left-0 top-1/2 transform -translate-y-1/2 w-4 h-4 cursor-w-resize bg-gradient-to-r from-blue-500 to-blue-600 rounded-l-xl border border-blue-300/50 hover:from-blue-400 hover:to-blue-500 transition-all shadow-lg"
                        onMouseDown={(e) => handleResizeDescription(e, 'left')}
                        title="Drag to resize width from left"
                      />
                      <div
                        className="absolute right-0 top-1/2 transform -translate-y-1/2 w-4 h-4 cursor-e-resize bg-gradient-to-l from-blue-500 to-blue-600 rounded-r-xl border border-blue-300/50 hover:from-blue-400 hover:to-blue-500 transition-all shadow-lg"
                        onMouseDown={(e) => handleResizeDescription(e, 'right')}
                        title="Drag to resize width from right"
                      />
                      
                      {/* Size indicator */}
                      <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                        {descriptionSize.width} × {descriptionSize.height}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <StyledButton
                onClick={() => {
                  setShowAddForm(false);
                  setShowAdvancedFields(false);
                  setDescriptionSize({ width: '100%', height: '120px' });
                }}
                variant="secondary_small"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 px-6 py-3 rounded-xl font-medium"
              >
                Cancel
              </StyledButton>
              <StyledButton
                onClick={handleAddCharacter}
                variant="primary"
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-medium"
                disabled={!newCharacter.name.trim()}
              >
                Add Character
              </StyledButton>
            </div>
          </div>
        )}

        {/* Characters List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-xl font-heading text-white flex items-center">
              <span className="mr-3">👥</span>
              Characters ({characters.length})
            </h4>
            {characters.length > 0 && (
              <div className="text-sm text-white/60">
                Click "Edit" on any character to modify details
              </div>
            )}
          </div>
          
          {characters.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎭</div>
              <h3 className="text-xl font-heading text-white mb-2">
                No characters yet
              </h3>
              <p className="text-white/60">
                Add your first character to get started
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {characters.map((character, index) => (
                <BrutalistCharacterCard
                  key={index}
                  character={character}
                  index={index}
                  isEditing={editingIndex === index}
                  onEdit={handleEditCharacter}
                  onSave={handleSaveCharacterEdit}
                  onCancel={handleCancelEdit}
                  onEnrich={onEnrich}
                  onDelete={handleDeleteCharacter}
                  isEnriching={isEnriching}
                />
              ))}
            </div>
          )}
        </div>

        {/* Save/Cancel Buttons */}
        <div className="flex gap-4 mt-8 pt-8 border-t border-white/10">
          <StyledButton
            onClick={onClose}
            variant="secondary_small"
            className="flex-1 bg-white/10 hover:bg-white/20 text-white border-white/20 px-6 py-3 rounded-xl font-medium"
          >
            Cancel
          </StyledButton>
          <StyledButton
            onClick={handleSaveAll}
            variant="primary"
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-medium shadow-lg"
          >
            Save All Changes
          </StyledButton>
        </div>
      </div>
    </div>
  );
});

// BRUTALIST Simple Filter Component
const BrutalistSimpleFilter: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}> = memo(({ value, onChange, placeholder }) => {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white text-black border-4 border-black px-6 py-4 font-black uppercase tracking-wide focus:outline-none focus:border-gray-500 transition-colors"
    />
  );
});

// BRUTALIST Simple Anime Card Component
const BrutalistSimpleAnimeCard: React.FC<{
  anime: any;
  onEdit: (anime: any) => void;
  onDelete: (animeId: string) => void;
  onManageCharacters: (anime: any) => void;
  onViewHistory: () => void;
}> = memo(({ anime, onEdit, onDelete, onManageCharacters, onViewHistory }) => {
  return (
    <div className="bg-black border-4 border-white p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-start gap-4 mb-4">
          <div className="w-24 flex-shrink-0">
            <div className="w-full bg-white border-4 border-black overflow-hidden aspect-[2/3]">
              {anime.posterUrl ? (
                <img
                  src={anime.posterUrl}
                  alt={anime.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    (target.nextElementSibling as HTMLElement).style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`w-full h-full items-center justify-center text-4xl ${anime.posterUrl ? 'hidden' : 'flex'}`}>
                🎬
              </div>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black text-white uppercase tracking-wide mb-2 line-clamp-2">
              {anime.title || 'UNTITLED ANIME'}
            </h3>
            <div className="text-xs text-white uppercase tracking-wide mb-2">
              <span className="bg-white text-black px-1 py-0.5 border-2 border-black font-black mr-2">
                {anime.type || 'UNKNOWN TYPE'}
              </span>
              <span className="bg-white text-black px-1 py-0.5 border-2 border-black font-black">
                {anime.airingStatus || 'UNKNOWN'}
              </span>
            </div>
            <p className="text-sm text-white/80 font-bold mb-3 line-clamp-3">
              {anime.description || 'NO DESCRIPTION AVAILABLE'}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-white text-black px-2 py-1 border-2 border-black">
            <div className="text-xs font-black uppercase tracking-wide">YEAR</div>
            <div className="font-black text-sm">{anime.year || 'N/A'}</div>
          </div>
          <div className="bg-white text-black px-2 py-1 border-2 border-black">
            <div className="text-xs font-black uppercase tracking-wide">RATING</div>
            <div className="font-black text-sm">{anime.rating || 'N/A'}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={() => onEdit(anime)}
          className="bg-green-500 text-white border-2 border-green-500 px-2 py-2 font-black uppercase tracking-wide hover:bg-green-600 transition-colors text-xs"
        >
          EDIT
        </button>
        <button
          onClick={() => onManageCharacters(anime)}
          className="bg-blue-500 text-white border-2 border-blue-500 px-2 py-2 font-black uppercase tracking-wide hover:bg-blue-600 transition-colors text-xs"
        >
          CHARS
        </button>
        <button
          onClick={onViewHistory}
          className="bg-purple-500 text-white border-2 border-purple-500 px-2 py-2 font-black uppercase tracking-wide hover:bg-purple-600 transition-colors text-xs"
        >
          HISTORY
        </button>
        <button
          onClick={() => onDelete(anime._id)}
          className="bg-red-500 text-white border-2 border-red-500 px-2 py-2 font-black uppercase tracking-wide hover:bg-red-600 transition-colors text-xs"
        >
          DEL
        </button>
      </div>
    </div>
  );
});

const EnhancedAnimeManagementPageComponent: React.FC = () => {
  const { shouldReduceAnimations, isMobile } = useMobileOptimizations();
  const { results: animeResults, status, loadMore } = usePaginatedQuery(
    api.admin.getAllAnimeForAdmin,
    {},
    { initialNumItems: isMobile ? 10 : 20 }
  );
  const deleteAnimeMutation = useMutation(api.admin.adminDeleteAnime);
  const saveAnimeMutation = useMutation(api.admin.adminEditAnime);
  const saveCharactersMutation = useMutation(api.admin.adminUpdateAnimeCharacters);
  const bulkProtectMutation = useMutation(api.admin.adminBulkProtectAllAnimeFields);
  
  // Character enrichment action
  const enrichSingleAnime = useAction(api.characterEnrichment.enrichAnimeCharacters);
  const enrichCharacterRealTime = useAction(api.characterEnrichment.enrichCharacterRealTime);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showBatchImport, setShowBatchImport] = useState(false);
  const [selectedAnime, setSelectedAnime] = useState<any | null>(null);
  const [managingCharacters, setManagingCharacters] = useState<{ anime: any; characters: any[] } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterByGenre, setFilterByGenre] = useState<string>("");
  const [confirmDelete, setConfirmDelete] = useState<{ animeId: string; title: string } | null>(null);
  const [savingAnime, setSavingAnime] = useState<string | null>(null);
  const [viewingHistory, setViewingHistory] = useState<Id<"anime"> | null>(null);
  const [showGlobalChangeHistory, setShowGlobalChangeHistory] = useState(false);
  const [enrichingCharacterIndex, setEnrichingCharacterIndex] = useState<number | null>(null);
  const [editingCharacter, setEditingCharacter] = useState<{ character: any; index: number } | null>(null);
  const [savingCharacter, setSavingCharacter] = useState<number | null>(null);
  const [isBulkProtecting, setIsBulkProtecting] = useState(false);

  const {
    results: animeList,
    status: animeListStatus,
    loadMore: loadMoreAnimeList,
    isLoading: isLoadingList,
  } = usePaginatedQuery(
    api.admin.getAllAnimeForAdmin, {}, { initialNumItems: 12 }
  );
  
  const filteredAnimes = useMemo(() => {
    return animeList?.filter((anime: any) => {
      const matchesSearch = anime.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           anime.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterByGenre === "" || anime.type === filterByGenre;
      return matchesSearch && matchesType;
    }) || [];
  }, [animeList, searchTerm, filterByGenre]);

  const stats = useMemo(() => {
    const total = animeList?.length || 0;
    const tv = animeList?.filter(a => a.type === 'TV').length || 0;
    const movie = animeList?.filter(a => a.type === 'Movie').length || 0;
    const ongoing = animeList?.filter(a => a.airingStatus === 'Currently Airing').length || 0;
    
    return { total, tv, movie, ongoing };
  }, [animeList]);

  const handleEditAnime = (anime: any) => {
    setSelectedAnime(anime);
  };

  const handleDeleteAnime = (animeId: string) => {
    setConfirmDelete({ animeId, title: animeList.find(a => a._id === animeId)?.title || 'Untitled Anime' });
  };

  const handleManageCharacters = (anime: any) => {
    setManagingCharacters({ anime, characters: anime.characters || [] });
  };

  const handleSaveCharacters = async (characters: any[]) => {
    if (!managingCharacters) return;
    
    try {
      await saveCharactersMutation({ 
        animeId: managingCharacters.anime._id, 
        characters 
      });
      toast.success("Characters saved successfully!");
      setManagingCharacters(null);
    } catch (error) {
      toast.error("Failed to save characters");
    }
  };

  const handleSaveAnime = async (animeId: Id<"anime">, updates: any) => {
    setSavingAnime(animeId);
    try {
      await saveAnimeMutation({ animeId, updates });
      toast.success("Anime updated successfully!");
      setSelectedAnime(null);
    } catch (error: any) {
      console.error("Failed to update anime:", error);
      toast.error(error?.message || "Failed to update anime");
    } finally {
      setSavingAnime(null);
    }
  };

  const handleAddCharacter = () => {
    if (!managingCharacters) return;
    
    const newCharacter = {
      id: Date.now(), // Temporary ID for new character
      name: "New Character",
      role: "Supporting",
      description: "",
      status: "Alive",
      gender: "",
      age: "",
      imageUrl: "",
      enrichmentStatus: "pending"
    };
    
    setSelectedAnime({
      ...managingCharacters.anime,
      characters: [...managingCharacters.characters, newCharacter]
    });
  };

  const handleDeleteCharacter = (index: number) => {
    if (!managingCharacters) return;
    
    const updatedCharacters = managingCharacters.characters.filter((_, i) => i !== index);
    setManagingCharacters({
      ...managingCharacters,
      characters: updatedCharacters
    });
  };

  const confirmDeleteAnime = async () => {
    if (confirmDelete) {
      try {
        await deleteAnimeMutation({ animeId: confirmDelete.animeId });
        toast.success("Anime deleted successfully!");
        setConfirmDelete(null);
      } catch (error) {
        console.error("Failed to delete anime:", error);
        toast.error("Failed to delete anime");
      }
    }
  };

  const handleEditCharacter = (character: any, index: number) => {
    setEditingCharacter({ character, index });
  };

  const handleBulkProtectAllFields = async () => {
    if (!window.confirm("This will protect ALL fields for ALL anime from auto-refresh. This is a one-time fix for the protection bug. Continue?")) {
      return;
    }
    
    setIsBulkProtecting(true);
    const toastId = "bulk-protect";
    toast.loading("Protecting all anime fields...", { id: toastId });
    
    try {
      const result = await bulkProtectMutation({});
      toast.success(result.message, { id: toastId, duration: 8000 });
    } catch (error: any) {
      toast.error(error?.message || "Failed to bulk protect fields", { id: toastId });
    } finally {
      setIsBulkProtecting(false);
    }
  };

  const handleSaveCharacterEdit = async (updatedCharacter: any) => {
    if (!editingCharacter || !managingCharacters) return;
    
    try {
      setSavingCharacter(editingCharacter.index);
      
      // Update the character in local state
      const updatedCharacters = [...managingCharacters.characters];
      updatedCharacters[editingCharacter.index] = updatedCharacter;
      
      setManagingCharacters({
        ...managingCharacters,
        characters: updatedCharacters
      });
      
      toast.success(`Character "${updatedCharacter.name}" updated successfully!`);
      setEditingCharacter(null);
      
    } catch (error) {
      console.error("Failed to save character:", error);
      toast.error(`Failed to save character: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSavingCharacter(null);
    }
  };

  const handleCancelCharacterEdit = () => {
    setEditingCharacter(null);
  };

  const handleEnrichCharacter = async (index: number) => {
    if (!managingCharacters || enrichingCharacterIndex !== null) return;
    
    const character = managingCharacters.characters[index];
    if (!character) {
      toast.error("Character not found");
      return;
    }

    try {
      setEnrichingCharacterIndex(index);
      toast.info(`🤖 Starting real-time AI enrichment for ${character.name}...`);
      
      // Update the character status to pending in local state
      const updatedCharacters = [...managingCharacters.characters];
      updatedCharacters[index] = {
        ...character,
        enrichmentStatus: 'pending',
        enrichmentAttempts: (character.enrichmentAttempts || 0) + 1,
        lastAttemptTimestamp: Date.now()
      };
      
      setManagingCharacters({
        ...managingCharacters,
        characters: updatedCharacters
      });
      
      // Call the real-time character enrichment API
      const result = await enrichCharacterRealTime({
        animeId: managingCharacters.anime._id,
        characterName: character.name,
        includeAdvancedAnalysis: true,
      });

      if (result.error) {
        toast.error(`❌ AI enrichment failed for ${character.name}: ${result.error}`);
        
        // Update local state to show failure
        const failedCharacters = [...managingCharacters.characters];
        failedCharacters[index] = {
          ...failedCharacters[index],
          enrichmentStatus: 'failed',
          lastErrorMessage: result.error
        };
        
        setManagingCharacters({
          ...managingCharacters,
          characters: failedCharacters
        });
        
      } else if (result.result) {
        const wasCached = result.progress?.cached;
        const cacheMessage = wasCached ? " (Retrieved from cache - no tokens used!)" : " (Fresh AI analysis completed)";
        
        toast.success(`🎉 Successfully enriched ${character.name} with AI data!${cacheMessage} The character now has enhanced personality analysis, relationships, abilities, and more.`);
        
        // Update local state to show success with the actual enriched data
        const successCharacters = [...managingCharacters.characters];
        successCharacters[index] = {
          ...successCharacters[index],
          enrichmentStatus: 'success',
          enrichmentTimestamp: Date.now(),
          personalityAnalysis: result.result.enrichmentData.personalityAnalysis,
          keyRelationships: result.result.enrichmentData.keyRelationships,
          detailedAbilities: result.result.enrichmentData.detailedAbilities,
          majorCharacterArcs: result.result.enrichmentData.majorCharacterArcs,
          trivia: result.result.enrichmentData.trivia,
          backstoryDetails: result.result.enrichmentData.backstoryDetails,
          characterDevelopment: result.result.enrichmentData.characterDevelopment,
          notableQuotes: result.result.enrichmentData.notableQuotes,
          symbolism: result.result.enrichmentData.symbolism,
          fanReception: result.result.enrichmentData.fanReception,
          culturalSignificance: result.result.enrichmentData.culturalSignificance,
        };
        
        setManagingCharacters({
          ...managingCharacters,
          characters: successCharacters
        });
        
        // Show additional info if advanced analysis was included
        if (result.progress?.hasAdvancedAnalysis) {
          toast.info(`📊 Advanced relationship and timeline analysis also completed for ${character.name}!`);
        }
        
      } else {
        toast.warning(`⚠️ AI enrichment completed but no changes were made for ${character.name}. Character may already be fully enriched.`);
        
        // Update local state to show skipped
        const skippedCharacters = [...managingCharacters.characters];
        skippedCharacters[index] = {
          ...skippedCharacters[index],
          enrichmentStatus: 'skipped'
        };
        
        setManagingCharacters({
          ...managingCharacters,
          characters: skippedCharacters
        });
      }
      
    } catch (error) {
      console.error("Character enrichment failed:", error);
      toast.error(`❌ Failed to enrich ${character.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Update local state to show failure
      const errorCharacters = [...managingCharacters.characters];
      errorCharacters[index] = {
        ...errorCharacters[index],
        enrichmentStatus: 'failed',
        lastErrorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
      
      setManagingCharacters({
        ...managingCharacters,
        characters: errorCharacters
      });
      
    } finally {
      setEnrichingCharacterIndex(null);
    }
  };

  if (isLoadingList && status === "LoadingFirstPage" && (!animeList || animeList.length === 0)) {
    return <BrutalistLoading />;
  }

  return (
    <div className="w-full h-full min-h-screen space-y-12"> {/* ENHANCED full-height container with generous spacing */}
      {/* BRUTALIST HEADER - Full Width Utilization */}
      <div className="bg-white border-4 border-black p-12"> {/* INCREASED padding for full-width sections */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8"> {/* INCREASED gap */}
          <div>
            <h1 className="text-6xl font-black text-black mb-6 uppercase tracking-wider"> {/* LARGER title */}
              ANIME MANAGEMENT
            </h1>
            <p className="text-3xl text-black font-bold uppercase tracking-wide"> {/* LARGER subtitle */}
              MANAGE ANIME DATABASE, CHARACTERS, AND CONTENT
            </p>
          </div>
          
          <div className="flex items-center gap-8"> {/* INCREASED gap */}
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-purple-500 text-white hover:bg-purple-600 border-4 border-purple-500 px-12 py-6 font-black uppercase tracking-wide transition-colors text-xl" // LARGER buttons
            >
              + CREATE ANIME
            </button>
            <button
              onClick={() => setShowBatchImport(true)}
              className="bg-blue-500 text-white hover:bg-blue-600 border-4 border-blue-500 px-12 py-6 font-black uppercase tracking-wide transition-colors text-xl" // LARGER buttons
            >
              📦 BATCH IMPORT
            </button>
            <button
              onClick={handleBulkProtectAllFields}
              disabled={isBulkProtecting}
              className="bg-red-500 text-white hover:bg-red-600 border-4 border-red-500 px-12 py-6 font-black uppercase tracking-wide transition-colors text-xl disabled:opacity-50" // LARGER buttons
            >
              {isBulkProtecting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⚙️</span>
                  PROTECTING...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  🛡️ BULK PROTECT ALL
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* BRUTALIST Stats - Enhanced Full-Width */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 mb-12"> {/* INCREASED gaps and margin */}
        {[
          { label: 'TOTAL ANIME', value: stats.total, icon: '🎬' },
          { label: 'TV SERIES', value: stats.tv, icon: '📺' },
          { label: 'MOVIES', value: stats.movie, icon: '🎥' },
          { label: 'ONGOING', value: stats.ongoing, icon: '⏳' },
        ].map((stat, index) => (
          <div key={index} className="bg-white border-4 border-black p-10"> {/* INCREASED padding */}
            <div className="flex items-center justify-between mb-6"> {/* INCREASED margin */}
              <div className="text-6xl">{stat.icon}</div> {/* LARGER icon */}
            </div>
            <div className="text-6xl font-black text-black mb-4">{stat.value}</div> {/* LARGER text */}
            <div className="text-xl font-black text-black uppercase tracking-wide">{stat.label}</div> {/* LARGER label */}
          </div>
        ))}
      </div>

      {/* BRUTALIST Filters - Full-Width Enhanced */}
      <div className="bg-white border-4 border-black p-10 mb-12"> {/* INCREASED padding and margin */}
        <h3 className="text-3xl font-black text-black mb-8 uppercase tracking-wide border-b-4 border-black pb-6"> {/* LARGER text and spacing */}
          FILTERS & SEARCH
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8"> {/* INCREASED gap */}
          <BrutalistSimpleFilter
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="SEARCH ANIME BY TITLE OR DESCRIPTION..."
          />
          
          <select
            value={filterByGenre}
            onChange={(e) => setFilterByGenre(e.target.value)}
            className="w-full bg-white text-black border-4 border-black px-6 py-4 font-black uppercase tracking-wide focus:outline-none focus:border-gray-500 transition-colors"
          >
            <option value="">ALL TYPES</option>
            <option value="TV">TV SERIES</option>
            <option value="Movie">MOVIES</option>
            <option value="OVA">OVA</option>
            <option value="Special">SPECIAL</option>
          </select>
          
          <div className="flex items-center justify-center">
            <span className="text-black text-lg font-black uppercase tracking-wide">
              {filteredAnimes.length} OF {animeList?.length || 0} ANIME
            </span>
          </div>
        </div>
      </div>

      {/* BRUTALIST Anime Grid - CORRECTED for proper sizing */}
      <div className="grid w-full gap-8" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))' }}>
        {filteredAnimes.map((anime) => (
          <BrutalistSimpleAnimeCard
            key={anime._id}
            anime={anime}
            onEdit={handleEditAnime}
            onDelete={handleDeleteAnime}
            onManageCharacters={handleManageCharacters}
            onViewHistory={() => setViewingHistory(anime._id as Id<"anime">)}
          />
        ))}
      </div>

      {/* BRUTALIST Load More Button */}
      {animeListStatus === "CanLoadMore" && filteredAnimes.length > 0 && (
        <div className="text-center">
          <button
            onClick={() => loadMoreAnimeList(12)}
            disabled={isLoadingList}
            className="bg-blue-500 text-white border-4 border-blue-500 px-12 py-6 font-black uppercase tracking-wide hover:bg-blue-600 transition-colors disabled:opacity-50 text-xl"
          >
            LOAD MORE ANIME
          </button>
        </div>
      )}

      {/* BRUTALIST Empty State */}
      {filteredAnimes.length === 0 && !isLoadingList && (
        <div className="text-center py-16 bg-white border-4 border-black">
          <div className="text-8xl mb-6">🎬</div>
          <h3 className="text-3xl font-black text-black mb-4 uppercase tracking-wider">
            NO ANIME FOUND
          </h3>
          <p className="text-black text-xl uppercase tracking-wide">
            TRY ADJUSTING YOUR SEARCH OR FILTER CRITERIA
          </p>
        </div>
      )}

      {/* BRUTALIST Edit Anime Modal */}
      {selectedAnime && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-black p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-3xl font-black text-black mb-6 uppercase tracking-wider border-b-4 border-black pb-4">
              EDIT ANIME: {selectedAnime.title}
            </h3>
            <EditAnimeForm 
              anime={selectedAnime}
              onSave={handleSaveAnime} 
              onCancel={() => setSelectedAnime(null)} 
              isSaving={savingAnime === selectedAnime._id} 
            />
          </div>
        </div>
      )}

      {/* BRUTALIST Character Management Modal */}
      {managingCharacters && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-black p-8 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-3xl font-black text-black mb-6 uppercase tracking-wider border-b-4 border-black pb-4">
              MANAGE CHARACTERS: {managingCharacters.anime.title}
            </h3>
            
            {/* Character Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-black text-white px-4 py-3 border-4 border-black">
                <div className="text-2xl font-black mb-2">{managingCharacters.characters?.length || 0}</div>
                <div className="text-xs font-black uppercase tracking-wide">TOTAL CHARACTERS</div>
              </div>
              <div className="bg-black text-white px-4 py-3 border-4 border-black">
                <div className="text-2xl font-black mb-2">
                  {managingCharacters.characters?.filter((c: any) => c.role === 'Main').length || 0}
                </div>
                <div className="text-xs font-black uppercase tracking-wide">MAIN CHARACTERS</div>
              </div>
              <div className="bg-black text-white px-4 py-3 border-4 border-black">
                <div className="text-2xl font-black mb-2">
                  {managingCharacters.characters?.filter((c: any) => c.enrichmentStatus === 'success').length || 0}
                </div>
                <div className="text-xs font-black uppercase tracking-wide">ENRICHED</div>
              </div>
              <div className="bg-black text-white px-4 py-3 border-4 border-black">
                <div className="text-2xl font-black mb-2">
                  {managingCharacters.characters?.filter((c: any) => c.enrichmentStatus === 'pending').length || 0}
                </div>
                <div className="text-xs font-black uppercase tracking-wide">PENDING</div>
              </div>
            </div>
            
            {/* AI Enrichment Info */}
            <div className="bg-blue-500 text-white border-4 border-blue-500 p-4 mb-6">
              <h4 className="font-black uppercase text-sm mb-2">🤖 AI CHARACTER ENRICHMENT</h4>
              <p className="text-xs font-bold uppercase">
                Click the AI button on any character to enhance them with detailed personality analysis, relationships, abilities, character arcs, trivia, and cultural significance using advanced AI models.
              </p>
            </div>
            
            {/* Character Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
              {managingCharacters.characters?.map((character: any, index: number) => (
                <div key={character.id || character._id || index} className="bg-black border-4 border-white p-4 aspect-square flex flex-col">
                  {/* Character Image */}
                  <div className="flex-shrink-0 mb-3">
                    <div className="w-full h-24 bg-white border-4 border-black overflow-hidden">
                      {character.imageUrl ? (
                        <img
                          src={character.imageUrl}
                          alt={character.name || 'Character'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full flex items-center justify-center text-3xl ${character.imageUrl ? 'hidden' : ''}`}>
                        👤
                      </div>
                    </div>
                  </div>
                  
                  {/* Character Info */}
                  <div className="flex-1 flex flex-col">
                    <h4 className="text-sm font-black text-white uppercase tracking-wide mb-2 line-clamp-2">
                      {character.name || 'UNNAMED CHARACTER'}
                    </h4>
                    
                    <div className="text-xs text-white uppercase tracking-wide mb-2 flex items-center justify-between">
                      <span className="bg-white text-black px-1 py-0.5 border-2 border-black font-black">
                        {character.role || 'UNKNOWN'}
                      </span>
                      {character.enrichmentStatus === 'success' && (
                        <span className="bg-green-500 text-white px-1 py-0.5 border-2 border-green-500 font-black text-xs">
                          ✅ ENRICHED
                        </span>
                      )}
                      {character.enrichmentStatus === 'pending' && (
                        <span className="bg-yellow-500 text-black px-1 py-0.5 border-2 border-yellow-500 font-black text-xs">
                          ⏳ PENDING
                        </span>
                      )}
                      {character.enrichmentStatus === 'failed' && (
                        <span className="bg-red-500 text-white px-1 py-0.5 border-2 border-red-500 font-black text-xs">
                          ❌ FAILED
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-white uppercase tracking-wide mb-3 line-clamp-2 flex-1">
                      {character.description || 'NO DESCRIPTION'}
                    </p>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditCharacter(character, index)}
                        className="flex-1 bg-blue-500 text-white border-2 border-blue-500 px-1 py-1 font-black uppercase tracking-wide hover:bg-blue-600 transition-colors text-xs"
                      >
                        EDIT
                      </button>
                      <button
                        onClick={() => handleEnrichCharacter(index)}
                        disabled={enrichingCharacterIndex === index}
                        className={`flex-1 border-2 px-1 py-1 font-black uppercase tracking-wide transition-colors text-xs ${
                          enrichingCharacterIndex === index 
                            ? 'bg-yellow-500 text-black border-yellow-500 cursor-not-allowed' 
                            : character.enrichmentStatus === 'success'
                            ? 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                            : character.enrichmentStatus === 'failed'
                            ? 'bg-red-600 text-white border-red-600 hover:bg-green-500 hover:border-green-500'
                            : 'bg-green-500 text-white border-green-500 hover:bg-green-600'
                        }`}
                      >
                        {enrichingCharacterIndex === index 
                          ? '🤖...' 
                          : character.enrichmentStatus === 'success'
                          ? '✅ AI'
                          : character.enrichmentStatus === 'failed'
                          ? '❌ AI'
                          : '🤖 AI'
                        }
                      </button>
                      <button
                        onClick={() => handleDeleteCharacter(index)}
                        className="flex-1 bg-red-500 text-white border-2 border-red-500 px-1 py-1 font-black uppercase tracking-wide hover:bg-red-600 transition-colors text-xs"
                      >
                        DEL
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Add Character Button */}
            <div className="text-center mb-6">
              <button
                onClick={handleAddCharacter}
                className="bg-green-500 text-white border-4 border-green-500 px-8 py-4 font-black uppercase tracking-wide hover:bg-green-600 transition-colors"
              >
                + ADD NEW CHARACTER
              </button>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-6">
              <button
                onClick={() => setManagingCharacters(null)}
                className="flex-1 bg-white text-black border-4 border-black px-8 py-4 font-black uppercase tracking-wide hover:bg-gray-100 transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={() => handleSaveCharacters(managingCharacters.characters)}
                className="flex-1 bg-green-500 text-white border-4 border-green-500 px-8 py-4 font-black uppercase tracking-wide hover:bg-green-600 transition-colors"
              >
                SAVE CHARACTERS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BRUTALIST Character Editor Modal */}
      {editingCharacter && managingCharacters && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-black p-8 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <CharacterEditor
              character={editingCharacter.character}
              characterIndex={editingCharacter.index}
              animeId={managingCharacters.anime._id}
              onSave={handleSaveCharacterEdit}
              onCancel={handleCancelCharacterEdit}
              onEnrich={(characterIndex) => handleEnrichCharacter(characterIndex)}
              isSaving={savingCharacter === editingCharacter.index}
              isEnriching={enrichingCharacterIndex === editingCharacter.index}
            />
          </div>
        </div>
      )}

      {/* BRUTALIST Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-black p-8 w-full max-w-md">
            <h3 className="text-2xl font-black text-black mb-6 uppercase tracking-wider border-b-4 border-black pb-4">
              CONFIRM DELETE
            </h3>
            <p className="text-black text-lg mb-8 uppercase tracking-wide">
              ARE YOU SURE YOU WANT TO DELETE "{confirmDelete.title}"? THIS ACTION CANNOT BE UNDONE.
            </p>
            
            <div className="flex gap-4">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-white text-black border-4 border-black px-6 py-4 font-black uppercase tracking-wide hover:bg-gray-100 transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={confirmDeleteAnime}
                className="flex-1 bg-red-500 text-white border-4 border-red-500 px-6 py-4 font-black uppercase tracking-wide hover:bg-red-600 transition-colors"
              >
                DELETE ANIME
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change History Panel */}
      {viewingHistory && (
        <ChangeHistoryPanel
          animeId={viewingHistory}
          onClose={() => setViewingHistory(null)}
        />
      )}

      {/* Global Change History Panel */}
      {showGlobalChangeHistory && (
        <ChangeHistoryPanel
          onClose={() => setShowGlobalChangeHistory(false)}
        />
      )}

      {/* Create Form */}
      {showCreateForm && (
        <div className="mb-8">
          <CreateAnimeForm
            onSuccess={() => setShowCreateForm(false)}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      {/* Batch Import Form */}
      {showBatchImport && (
        <div className="mb-8">
          <BatchImportAnime
            onSuccess={() => setShowBatchImport(false)}
            onCancel={() => setShowBatchImport(false)}
          />
        </div>
      )}
    </div>
  );
};

export default memo(EnhancedAnimeManagementPageComponent);